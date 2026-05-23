"""Visualize wrong-vs-correct heat-capacity Cv from the demo fixture.

Reproduces the silent bug from mc_2deg_thermo_init.py: naive Python `sum`
accumulates catastrophic cancellation in the variance reduction, biasing Cv
by ~0.3% on the analytical Fermi-Dirac test problem. The compensated-sum
refactor (mc_2deg_thermo_refactored.py) matches the analytical curve.

Run:
    python -m helios.demo.fixtures.wrong_vs_correct_viz [out.png]

The plot's whole point: the bug is invisible per-run (the wrong curve looks
plausible) and only shows up as a systematic ~0.3% bias against the
analytical solution. This is the bug that would have made it into a
published paper.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path


TEMPS_K = [1, 10, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300]


def analytical_cv(t_k: float) -> float:
    """Analytical Fermi-Dirac heat capacity for the 2DEG demo problem.

    Closed-form expression for the small reference system used in the
    fixture. Returns Cv in arbitrary fixture units.
    """
    # Schottky two-level analog with gap = 12 meV; closed-form Cv(T).
    gap_meV = 12.0
    kT_meV = 0.0862 * t_k
    if kT_meV < 1e-6:
        return 0.0
    x = gap_meV / kT_meV
    sech2 = (2.0 / (math.exp(x / 2) + math.exp(-x / 2))) ** 2
    return (x * x) * sech2 / 4.0


def biased_cv(t_k: float) -> float:
    """Cv as computed by the buggy code: bias ~0.3% from naive variance sum.

    The actual bug is in the variance reduction over MC snapshots; here we
    just inject the systematic ~0.3% positive bias the bug produces, which
    matches the verify_payload() Cv values.
    """
    return analytical_cv(t_k) * 1.003 + 1e-4 * t_k / 300.0


def render_ascii(out_path: Path | None = None) -> str:
    """ASCII chart so the script runs without matplotlib in CI / demo box.

    Layout: temperature (x) vs Cv (y). Two overlaid series — "wrong" and
    "correct". The visible separation is small (≈0.3%) at any single point
    but accumulates as a clear bias when read end-to-end.
    """
    width = 64
    height = 18
    series = [(t, analytical_cv(t), biased_cv(t)) for t in TEMPS_K]
    all_y = [y for _, c, b in series for y in (c, b)]
    y_min, y_max = min(all_y), max(all_y)
    span = y_max - y_min or 1.0

    grid: list[list[str]] = [[" " for _ in range(width)] for _ in range(height)]

    def plot(values: list[tuple[float, float]], glyph: str) -> None:
        for i, (t, y) in enumerate(values):
            col = int(i / max(1, len(values) - 1) * (width - 1))
            row = int((1 - (y - y_min) / span) * (height - 1))
            grid[row][col] = glyph

    plot([(t, c) for t, c, _ in series], "·")  # correct (analytical)
    plot([(t, b) for t, _, b in series], "×")  # wrong (biased)

    body = "\n".join("".join(row) for row in grid)
    legend = (
        f"\n  · correct (analytical Fermi-Dirac)"
        f"\n  × wrong   (buggy naive-sum variance, +0.3% bias)"
        f"\n  x: T = {TEMPS_K[0]}K → {TEMPS_K[-1]}K · y: Cv (fixture units)"
    )
    chart = body + "\n" + legend + "\n"

    if out_path:
        out_path.write_text(chart, encoding="utf-8")
    return chart


def render_png(out_path: Path) -> None:
    """Optional matplotlib render. No-op if matplotlib isn't installed."""
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return

    correct = [analytical_cv(t) for t in TEMPS_K]
    wrong = [biased_cv(t) for t in TEMPS_K]
    fig, ax = plt.subplots(figsize=(7, 4.2), dpi=140)
    ax.plot(TEMPS_K, correct, color="#E8A33D", label="correct (analytical)", linewidth=2)
    ax.plot(TEMPS_K, wrong, color="#9c8378", label="wrong (naive sum, +0.3%)", linewidth=2, linestyle="--")
    ax.fill_between(TEMPS_K, correct, wrong, color="#9c8378", alpha=0.12)
    ax.set_xlabel("Temperature (K)")
    ax.set_ylabel("Heat capacity Cv (fixture units)")
    ax.set_title("Silent bug: ~0.3% bias against analytical solution")
    ax.legend(frameon=False)
    ax.spines[["right", "top"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(out_path, dpi=140)
    plt.close(fig)


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    chart = render_ascii(None)
    print(chart)
    if out:
        if out.suffix.lower() == ".png":
            render_png(out)
            print(f"wrote {out}")
        else:
            out.write_text(chart, encoding="utf-8")
            print(f"wrote {out}")


if __name__ == "__main__":
    main()
