#!/usr/bin/env python3
"""Recolour the Lottie animations from the old brand red to SpeedTrade blue.

The `*-active.json` set (avatar, funds, market, trade) had SwissCresta's
`#F04024` baked into their colour stops. Nothing in the JS could reach it:
these are data files, so the theme tokens and every hex sweep over `src/`
missed them entirely, and the default profile avatar kept rendering as a red
figure long after the rest of the app had turned blue.

Lottie stores a solid colour as `{"c": {"k": [r, g, b, a]}}` with the channels
as floats in 0..1, which is why a plain text search for "F04024" finds
nothing either — the value on disk is `[0.941, 0.251, 0.141, 1]`.

Matching is exact against the old brand red and the replacement is the brand
blue, so the script is idempotent: a second run finds nothing left to change.
That exact-match mapping is also the record of what the original value was,
which matters because `tuska_app/` is not in git.

    python scripts/recolor-animations.py
"""
import json
from pathlib import Path

ANIMATIONS = Path(__file__).resolve().parents[1] / "assets" / "animations"

# SwissCresta brand red -> SpeedTrade brand blue (#1B4DFF).
OLD_RGB = (0xF0 / 255, 0x40 / 255, 0x24 / 255)
NEW_RGB = (0x1B / 255, 0x4D / 255, 0xFF / 255)

# Lottie writes floats with limited precision, so compare with a tolerance
# rather than for equality.
TOLERANCE = 0.004


def is_old_red(channels) -> bool:
    return all(
        abs(float(channels[i]) - OLD_RGB[i]) <= TOLERANCE for i in range(3)
    )


def recolour(node) -> int:
    """Walk the document, rewriting every solid colour stop. Returns the count."""
    changed = 0
    if isinstance(node, dict):
        for key, value in node.items():
            if (
                key == "c"
                and isinstance(value, dict)
                and isinstance(value.get("k"), list)
                and len(value["k"]) >= 3
                and all(isinstance(x, (int, float)) for x in value["k"][:3])
                and is_old_red(value["k"])
            ):
                value["k"][0:3] = list(NEW_RGB)
                changed += 1
            changed += recolour(value)
    elif isinstance(node, list):
        for item in node:
            changed += recolour(item)
    return changed


def main() -> None:
    total = 0
    for path in sorted(ANIMATIONS.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        n = recolour(doc)
        if n:
            # separators: keep the file compact — these ship in the bundle.
            path.write_text(
                json.dumps(doc, separators=(",", ":")), encoding="utf-8"
            )
            print(f"  {path.name:24} {n} colour stops")
            total += n
    print(f"recoloured {total} stops" if total else "nothing to change")


if __name__ == "__main__":
    main()
