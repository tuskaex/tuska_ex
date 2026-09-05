#!/usr/bin/env python3
"""Recolour the baked card artwork from the old brand red/orange to SpeedTrade blue.

Two assets are baked images with no vector source, so their colour is changed
by rotating hue rather than by re-exporting from a design file:

  * `card.png`        — the account card (wave pattern + silver chip)
  * `fund_banner.png` — the Funds screen banner (orange card, coins, gold chip)

Three rules keep this faithful rather than crude:

  * Saturation and lightness are left untouched, so every fold and highlight
    keeps its exact contrast. Only the hue moves.
  * Low-saturation pixels are skipped, which protects the silver coins, the
    chip contacts and the soft black edges. Rotating those would tint them
    blue and make the art look like a printing error.
  * Only the RED-ORANGE band is rotated. Yellows and golds are left alone, so
    the gold EMV chip on the banner stays gold — a blue chip reads as a
    mistake, and the warm accent gives the blue something to sit against.

The originals are kept alongside as `*-source-*.png` so this is repeatable:
`tuska_app/` is not in git, so an overwritten asset is otherwise unrecoverable.

    python scripts/recolor-card.py
"""
import colorsys
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parents[1] / "assets" / "images"

# (source, target) pairs. The source is the untouched original.
JOBS = [
    ("card-source-red.png", "card.png"),
    ("fund_banner-source-orange.png", "fund_banner.png"),
]

# SpeedTrade brand blue (#1B4DFF) as a hue in the 0..1 range colorsys uses.
BRAND_HUE = colorsys.rgb_to_hls(27 / 255, 77 / 255, 255 / 255)[0]

# Below this saturation a pixel is treated as neutral (silver coins, chip
# contacts, edges, shadow) and left exactly as it is.
SATURATION_FLOOR = 0.18

# Only hues inside this band are rotated, in colorsys' 0..1 range. 0.0-0.11 is
# roughly 0-40 degrees: reds through orange. Gold and cream sit above it and
# are deliberately preserved.
RED_ORANGE_MAX = 0.11


def recolour(source: Path, target: Path) -> None:
    img = Image.open(source).convert("RGBA")
    pixels = img.load()
    width, height = img.size
    touched = 0

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if s < SATURATION_FLOOR:
                continue  # neutral — coins, contacts, border, shadow
            # Hue wraps at 1.0, so deep reds sit at BOTH ends of the range.
            if not (h <= RED_ORANGE_MAX or h >= 1.0 - RED_ORANGE_MAX):
                continue  # gold / cream — deliberately preserved
            nr, ng, nb = colorsys.hls_to_rgb(BRAND_HUE, l, s)
            pixels[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
            touched += 1

    img.save(target)
    total = width * height
    print(f"  {target.name}  {width}x{height} — recoloured {touched / total:.0%}")


def main() -> None:
    for src_name, dst_name in JOBS:
        source, target = ASSETS / src_name, ASSETS / dst_name
        if not source.exists():
            raise SystemExit(
                f"source artwork not found: {source}\n"
                "Expected the untouched original to be preserved there."
            )
        recolour(source, target)


if __name__ == "__main__":
    main()
