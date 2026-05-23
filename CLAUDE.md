We have a hackathon demo coming up. Please make the following changes to this repo. Read CLAUDE.md and README.md first for context.

GOAL: Maximize live demo impact and make our multi-agent architecture visible.

CHANGES TO MAKE (in priority order):

1. AGENT ACTIVITY PANEL (highest priority)
   - In web/app/demo/, add a right-side panel that shows agent activity in real-time
   - For each of the 6 acts, render a stream of events like:
       [10:23:01] Auditor agent: scanning file...
       [10:23:02] Auditor agent: found 3 issues (off-by-one, unit mismatch, boundary)
       [10:23:03] Fixer agent: regenerating with fix #1...
       [10:23:05] Verifier agent: synthesizing 12 test inputs...
       [10:23:07] Verifier agent: 11/12 passed → regenerating fix #1
       [10:23:09] Verifier agent: 12/12 passed ✓
       [10:23:10] Router agent: GPU candidate (8.4x speedup), Quantum candidate (1.3x)
   - Style: monospace, dark background, color-coded by agent
   - Drive it from the existing demo orchestration; if the data isn't there, emit synthetic events with realistic timing
   - This should appear during the audit/fix/verify/route acts of the existing demo

2. VERIFIER-CATCHES-BAD-FIX MOMENT
   - In backend/helios/demo.py (or wherever the demo orchestration lives), stage one act where the Fixer's first attempt fails verification (e.g., 8/12 tests pass)
   - The Verifier rejects it, the Fixer regenerates, the second attempt passes 12/12
   - Show both attempts in the diff renderer side-by-side
   - This is the single most differentiating demo moment — give it real estate

3. DRAMATIC DEMO INPUT
   - Replace the fixture in backend/tests/fixtures/ with a numerical integration example where the silent bug produces a plausible-looking but physically wrong result
   - Add a one-line caption in the demo: "This bug would have made it into a published paper."
   - If creating a new fixture, also produce a small visualization showing wrong-vs-correct output

4. PITCH SLIDE/MOMENT
   - In web/app/demo/page.tsx (or wherever the demo opens), add an intro overlay with:
     * Hook line: "Scientific Python is full of silent bugs that don't crash but produce wrong answers."
     * Concrete reference: "The Reinhart-Rogoff Excel error influenced global austerity policy. Helios catches bugs like that one."
     * Skip button to dismiss
   - Also add a closing card with: "What's never been built: a multi-agent system that verifies its own fixes against synthesized tests before showing them to you."

CONSTRAINTS:
- Don't touch the existing API contracts
- Don't change deployment config
- All new code must be demo-stable — no flaky network calls during the live demo
- Use deterministic timing for the agent panel so we can rehearse reliably

TESTING:
- After changes, run the full demo end-to-end at least once
- Add a smoke test that ensures the demo loads and the agent panel renders within 3 seconds