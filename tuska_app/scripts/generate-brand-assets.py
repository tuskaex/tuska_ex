#!/usr/bin/env python3
"""Derive every SpeedTrade app asset from the one master wordmark.

The only SpeedTrade artwork that exists is the 2100x460 "SPEED TRADER"
wordmark (speedtrade_landing/public/images/logo.png). There is no square
icon, no white cut-out and no splash art, so this script cuts the "ST"
monogram out of the wordmark and builds the rest from it.

Run it again after replacing the master, and every derived asset is
regenerated consistently:

    python scripts/generate-brand-assets.py

Why a script and not five hand-made PNGs: the icon is a *crop*, and a crop
has to be re-cut by hand every time the wordmark changes. Keeping the cut
coordinates in code means a new wordmark is a one-command refresh instead of
an afternoon in an image editor with nobody remembering the numbers.

── The crop, explained ───────────────────────────────────────────────────
The monogram and the word "TRADER" overlap horizontally: the mark's red T
crossbar reaches x=901, while TRADER's own T starts at x=847 — but only
below y=232. So a rectangular crop cannot separate them. MARK_BOX takes the
full monogram including the crossbar, and TRADER_CUT then erases the
lower-right corner where TRADER intrudes. Both were measured off the alpha
channel, not eyeballed; re-measure them if the master art changes.
"""
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[2]
MASTER = REPO / "speedtrade_landing" / "public" / "images" / "logo.png"
OUT = Path(__file__).resolve().parents[1] / "assets" / "brand"

# SpeedTrade ink — the app's darkest surface. Icons sit on this, never on
# pure black, so the icon matches the app's own background.
INK = (10, 14, 23, 255)

# Monogram bounds in master-image pixels (see module docstring).
MARK_BOX = (0, 20, 910, 400)
# Region inside that crop where the word TRADER bleeds in, in crop-local
# coordinates. The monogram's own stem never passes x=774 below y=180.
TRADER_CUT = (820, 160, 910, 380)


def mark(master: Image.Image) -> Image.Image:
    """The ST monogram alone, tightly trimmed, transparent background."""
    m = master.crop(MARK_BOX).copy()
    # Erase the TRADER fragment, then re-trim so the result is flush.
    m.paste((0, 0, 0, 0), TRADER_CUT)
    return m.crop(m.getbbox())


def on_square(art: Image.Image, size: int, *, bg, scale: float) -> Image.Image:
    """Center `art` on a square canvas, occupying `scale` of the width."""
    canvas = Image.new("RGBA", (size, size), bg)
    target_w = int(size * scale)
    ratio = target_w / art.width
    target_h = max(1, int(art.height * ratio))
    if target_h > size * scale:  # tall art — fit by height instead
        target_h = int(size * scale)
        target_w = max(1, int(art.width * target_h / art.height))
    resized = art.resize((target_w, target_h), Image.LANCZOS)
    canvas.alpha_composite(
        resized, ((size - target_w) // 2, (size - target_h) // 2)
    )
    return canvas


def whiten(art: Image.Image) -> Image.Image:
    """Flat white silhouette, alpha preserved — the dark-theme cut-out."""
    white = Image.new("RGBA", art.size, (255, 255, 255, 0))
    white.putalpha(art.split()[3])
    return white


def main() -> None:
    if not MASTER.exists():
        raise SystemExit(f"master wordmark not found: {MASTER}")
    OUT.mkdir(parents=True, exist_ok=True)

    master = Image.open(MASTER).convert("RGBA")
    m = mark(master)
    wordmark = master.crop(master.getbbox())

    written = []

    def write(name: str, img: Image.Image) -> None:
        path = OUT / name
        img.save(path)
        written.append(f"  {name}  {img.size[0]}x{img.size[1]}")

    # App icon — solid ink ground. iOS composites transparency onto black and
    # would show a hairline against the mark, so this one is never transparent.
    write("speedtrade-icon.png", on_square(m, 1024, bg=INK, scale=0.82))

    # Android adaptive foreground. The outer 1/3 of an adaptive icon can be
    # masked away by the launcher, so the mark stays well inside the safe zone.
    write(
        "speedtrade-adaptive-icon.png",
        on_square(m, 1024, bg=(0, 0, 0, 0), scale=0.62),
    )

    # Splash + auth screens — the full wordmark, transparent.
    write("speedtrade-logo.png", wordmark)

    # Square monogram for the biometric lock screen (dark theme).
    write(
        "speedtrade-favicon.png",
        on_square(m, 1080, bg=(0, 0, 0, 0), scale=0.82),
    )

    # Tab-bar / card logos. Brand-coloured for the light theme, white cut-out
    # for the dark theme — the blue reads as muddy on the dark surfaces.
    write("speedtrade-homebar.png", on_square(m, 1024, bg=(0, 0, 0, 0), scale=0.86))
    write(
        "speedtrade-homebar-white.png",
        on_square(whiten(m), 1024, bg=(0, 0, 0, 0), scale=0.86),
    )

    # Tightly-cropped white monogram, no square padding.
    #
    # The `homebar` pair above sit on a square canvas, which is right for a
    # tab-bar slot but wrong anywhere the space is wide and short. The mark is
    # ~5x wider than it is tall, so `resizeMode="contain"` inside a wide box
    # fits it by HEIGHT and leaves most of the width empty — on the account
    # card that rendered the mark at roughly a third of its intended size.
    # This version has no padding, so a wide box is filled by a wide mark.
    write("speedtrade-mark-white.png", whiten(m))

    print(f"wrote {len(written)} assets to {OUT}:")
    print("\n".join(written))


if __name__ == "__main__":
    main()
