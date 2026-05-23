"""Verifier: compare original vs fixed code on a set of inputs.

Two backends, selectable via settings.verifier_backend:

  * ``subprocess`` — local sandboxed execution (uses helios.execution.sandbox).
    Deterministic, offline, low blast-radius. The path used for the live
    demo and CI.

  * ``managed_agent`` — delegates to a Gemini managed agent (google.genai).
    The agent receives the two code blobs + test inputs, executes both
    (model-side tool use), compares outputs, and returns a JSON verdict.
    Requires GEMINI_API_KEY. Falls back to ``subprocess`` on any error
    so the API contract is preserved.

Both backends produce the same VerifierResult shape so callers (api/verify.py
or future ones) don't have to branch.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from .config import settings
from .execution.compare import compare_case, preview
from .execution.sandbox import run_function


log = logging.getLogger(__name__)


@dataclass
class VerifierCase:
    index: int
    input_preview: str
    original_output_preview: str
    fix_output_preview: str
    agreed: bool
    original_ms: float = 0.0
    fix_ms: float = 0.0
    notes: str | None = None


@dataclass
class VerifierResult:
    backend: str
    passed: int
    failed: int
    verdict: str  # all_agree | partial_disagree | all_disagree | error
    cases: list[VerifierCase] = field(default_factory=list)
    notes: str | None = None


def _verdict(passed: int, failed: int) -> str:
    if passed == 0 and failed == 0:
        return "error"
    if failed == 0:
        return "all_agree"
    if passed == 0:
        return "all_disagree"
    return "partial_disagree"


def verify_pair(
    original_code: str,
    fixed_code: str,
    function_name: str,
    inputs: list[Any],
    *,
    backend: str | None = None,
) -> VerifierResult:
    """Run the configured verifier backend; fall back to subprocess on error."""
    chosen = backend or settings.verifier_backend
    if chosen == "managed_agent":
        try:
            return _verify_managed_agent(original_code, fixed_code, function_name, inputs)
        except Exception as exc:
            log.warning("managed_agent verifier failed (%s); falling back to subprocess", exc)
            result = _verify_subprocess(original_code, fixed_code, function_name, inputs)
            result.notes = f"managed_agent unavailable ({exc.__class__.__name__}); used subprocess fallback"
            return result
    return _verify_subprocess(original_code, fixed_code, function_name, inputs)


# ---- subprocess backend --------------------------------------------------

def _verify_subprocess(
    original_code: str,
    fixed_code: str,
    function_name: str,
    inputs: list[Any],
) -> VerifierResult:
    orig_run = run_function(original_code, function_name, inputs)
    fix_run = run_function(fixed_code, function_name, inputs)

    cases: list[VerifierCase] = []
    passed = failed = 0
    n = min(len(orig_run.cases), len(fix_run.cases), len(inputs))
    for i in range(n):
        o = orig_run.cases[i]
        f = fix_run.cases[i]
        agreed, note = compare_case(o, f)
        if agreed:
            passed += 1
        else:
            failed += 1
        cases.append(
            VerifierCase(
                index=i,
                input_preview=preview(inputs[i]),
                original_output_preview=preview(o.get("output") if not o.get("exception") else o.get("exception")),
                fix_output_preview=preview(f.get("output") if not f.get("exception") else f.get("exception")),
                agreed=agreed,
                original_ms=float(o.get("elapsed_ms", 0.0)),
                fix_ms=float(f.get("elapsed_ms", 0.0)),
                notes=note,
            )
        )

    return VerifierResult(
        backend="subprocess",
        passed=passed,
        failed=failed,
        verdict=_verdict(passed, failed),
        cases=cases,
    )


# ---- managed-agent backend (google.genai) --------------------------------

_VERIFIER_INSTRUCTION = """You are the Verifier in a multi-agent code-review system.

You will receive two Python implementations of the same function (the
"original" and the "fix"), the function name, and a list of test inputs.

Task:
  1. Mentally execute each implementation on every input. If running code
     tools are available, use them; otherwise reason symbolically.
  2. For each input, decide whether the outputs agree at rtol=1e-9 (or
     match exactly for non-numeric outputs).
  3. Note any cases where the fix changes observable behavior — even
     subtly. Numerical bias and silent type promotions count as disagreement.

Return a single JSON object — no prose, no markdown — matching this schema:

{
  "passed": <int>,
  "failed": <int>,
  "cases": [
    {
      "index": <int>,
      "agreed": <bool>,
      "original_output_preview": "<short string>",
      "fix_output_preview": "<short string>",
      "notes": "<short string or null>"
    }
  ],
  "notes": "<overall summary or null>"
}

Indices must be 0-based and cover every input. If you cannot evaluate a
case, mark agreed=false and put the reason in notes.
"""


def _verify_managed_agent(
    original_code: str,
    fixed_code: str,
    function_name: str,
    inputs: list[Any],
) -> VerifierResult:
    """Call the Gemini managed agent and parse its JSON verdict.

    Lazy-import google.genai so the subprocess path stays usable in
    environments without the SDK installed.
    """
    try:
        from google import genai
        from google.genai import types as genai_types
    except ImportError as exc:
        raise RuntimeError("google.genai SDK not installed") from exc

    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY not configured")

    client = genai.Client(api_key=settings.gemini_api_key)

    inputs_json = json.dumps(inputs, default=str)[:8000]
    user_prompt = (
        f"Function name: {function_name}\n\n"
        f"--- ORIGINAL ---\n{original_code}\n\n"
        f"--- FIX ---\n{fixed_code}\n\n"
        f"--- INPUTS (JSON list) ---\n{inputs_json}\n"
    )

    response = client.models.generate_content(
        model=settings.gemini_verifier_model,
        contents=user_prompt,
        config=genai_types.GenerateContentConfig(
            system_instruction=_VERIFIER_INSTRUCTION,
            response_mime_type="application/json",
            temperature=0.0,
        ),
    )

    text = (response.text or "").strip()
    if not text:
        raise RuntimeError("empty response from gemini verifier")
    parsed = json.loads(text)

    cases = []
    for c in parsed.get("cases", []):
        idx = int(c.get("index", len(cases)))
        cases.append(
            VerifierCase(
                index=idx,
                input_preview=preview(inputs[idx]) if idx < len(inputs) else "",
                original_output_preview=str(c.get("original_output_preview", "")),
                fix_output_preview=str(c.get("fix_output_preview", "")),
                agreed=bool(c.get("agreed", False)),
                notes=c.get("notes"),
            )
        )

    passed = int(parsed.get("passed", sum(1 for c in cases if c.agreed)))
    failed = int(parsed.get("failed", sum(1 for c in cases if not c.agreed)))
    return VerifierResult(
        backend="managed_agent",
        passed=passed,
        failed=failed,
        verdict=_verdict(passed, failed),
        cases=cases,
        notes=parsed.get("notes"),
    )
