#!/usr/bin/env python3
"""Generate the original CodePath-Academy brand assets (PNG / ICO / OG card).

Pure Pillow - no design tools and no external services. Every shape mirrors
frontend/public/favicon.svg (rounded tile + "</>" glyph), so the favicon set,
the web-manifest icons, the apple touch icon, and the 1200x630 Open Graph card
all come from one source of truth and stay visually identical.

Usage:
    python scripts/generate_brand_assets.py

Outputs (all under frontend/public/):
    favicon-16x16.png, favicon-32x32.png, favicon.ico,
    apple-touch-icon.png (180x180, full bleed),
    icon-192x192.png, icon-512x512.png,
    icon-192x192-maskable.png, icon-512x512-maskable.png (safe-zone glyph),
    images/og/codepath-academy-og.png (1200x630 social sharing card)
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "frontend" / "public"

# Brand palette - keep in sync with frontend/src/styles/tokens.css.
NAVY_900 = (40, 36, 95)        # #28245f
NAVY_950 = (23, 22, 63)        # #17163f
INDIGO_600 = (79, 70, 229)     # #4f46e5
INDIGO_400 = (129, 140, 248)   # #818cf8
INDIGO_200 = (199, 210, 254)   # #c7d2fe
WHITE = (255, 255, 255)

FONT_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")
FONT_REGULAR = Path(r"C:\Windows\Fonts\segoeui.ttf")

# Glyph geometry in the 64-unit design space of favicon.svg.
DESIGN = 64
GLYPH_STROKE = 5.5
GLYPH_PATHS = [
    [(24, 20), (14, 32), (24, 44)],   # <
    [(37, 17), (27, 47)],             # /
    [(40, 20), (50, 32), (40, 44)],   # >
]
TILE_RADIUS = 14  # rx of the rounded tile in design units


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def diagonal_gradient(size: tuple[int, int], top_left, bottom_right) -> Image.Image:
    """Linear RGB gradient from the top-left corner to the bottom-right corner."""
    w, h = size
    steps = 1024
    lut = [lerp(top_left, bottom_right, i / (steps - 1)) for i in range(steps)]
    inv_w = 1 / (w - 1) if w > 1 else 0.0
    inv_h = 1 / (h - 1) if h > 1 else 0.0
    rows = []
    for y in range(h):
        t0 = (y * inv_h) * 0.5
        row = bytearray()
        for x in range(w):
            t = t0 + x * inv_w * 0.5
            row += bytes(lut[min(steps - 1, int(t * steps))])
        rows.append(bytes(row))
    return Image.frombytes("RGB", size, b"".join(rows))


def _scaled(points, scale: float, origin: float = DESIGN / 2):
    """Scale glyph points toward (or away from) the design-space center."""
    return [(origin + (x - origin) * scale, origin + (y - origin) * scale) for x, y in points]


def _draw_glyph(draw: ImageDraw.ImageDraw, scale: float, stroke: float) -> None:
    """Draw the "</>" glyph: polylines with round caps and round joins."""
    width = max(1, round(stroke * scale))
    for path in GLYPH_PATHS:
        pts = _scaled(path, scale)
        draw.line(pts, fill=WHITE + (255,), width=width, joint="curve")
        radius = width / 2
        for x, y in (pts[0], pts[-1]):
            draw.ellipse([x - radius, y - radius, x + radius, y + radius],
                         fill=WHITE + (255,))


def render_icon(size: int, *, maskable: bool = False, glyph_scale: float = 1.0) -> Image.Image:
    """Render one square brand icon at `size` px with antialiased edges.

    Regular icons are the rounded tile from favicon.svg. Maskable icons are
    full-bleed (the OS applies its own crop shape) with the glyph shrunk into
    the central safe zone so no launcher mask clips it.
    """
    factor = max(2, min(8, 1024 // size))  # supersample, cap the canvas at 1024
    work = size * factor
    scale = work / DESIGN

    gradient = diagonal_gradient((256, 256), NAVY_900, INDIGO_600).resize(
        (work, work), Image.Resampling.LANCZOS).convert("RGBA")

    if maskable:
        canvas = gradient  # full bleed, no rounding
    else:
        mask = Image.new("L", (work, work), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, work - 1, work - 1], radius=round(TILE_RADIUS * scale), fill=255)
        canvas = Image.composite(gradient, Image.new("RGBA", (work, work), (0, 0, 0, 0)), mask)

    glyph = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    _draw_glyph(ImageDraw.Draw(glyph), glyph_scale * scale, GLYPH_STROKE * scale)
    canvas = Image.alpha_composite(canvas, glyph)

    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def render_apple_touch(size: int = 180) -> Image.Image:
    """iOS applies its own corner mask: full-bleed square, glyph at full size."""
    factor = max(2, min(8, 1024 // size))
    work = size * factor
    scale = work / DESIGN
    canvas = diagonal_gradient((256, 256), NAVY_900, INDIGO_600).resize(
        (work, work), Image.Resampling.LANCZOS).convert("RGBA")
    glyph = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    _draw_glyph(ImageDraw.Draw(glyph), scale, GLYPH_STROKE * scale)
    return Image.alpha_composite(canvas, glyph).resize((size, size), Image.Resampling.LANCZOS)


def render_og_card() -> Image.Image:
    """The 1200x630 Open Graph card: gradient, circuit decoration, mark, text."""
    width, height = 1200, 630
    card = diagonal_gradient((width, height), NAVY_950, INDIGO_600).convert("RGBA")
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Right-half decoration: circuit traces, junction nodes, soft light points.
    traces = [
        [(742, 92), (900, 92), (960, 152), (1132, 152)],
        [(742, 214), (858, 214), (918, 274), (1140, 274)],
        [(788, 424), (940, 424), (1000, 364), (1136, 364)],
        [(742, 542), (918, 542), (978, 482), (1130, 482)],
        [(1058, 60), (1058, 214)],
        [(860, 470), (860, 570)],
    ]
    for trace in traces:
        draw.line(trace, fill=INDIGO_400 + (70,), width=3, joint="curve")
    for x, y in [(900, 92), (960, 152), (858, 214), (918, 274),
                 (940, 424), (1000, 364), (918, 542), (978, 482),
                 (1058, 214), (860, 470)]:
        draw.ellipse([x - 7, y - 7, x + 7, y + 7], fill=INDIGO_200 + (120,))
    for x, y, r in [(1096, 96, 84), (712, 566, 66), (986, 588, 48)]:
        draw.ellipse([x - r, y - r, x + r, y + r], fill=INDIGO_200 + (14,))
    card = Image.alpha_composite(card, overlay)

    # Brand mark: the favicon tile, scaled up.
    mark = render_icon(112).convert("RGBA")
    card.alpha_composite(mark, (72, 170))

    # Text block, left column only (kept clear of the decoration).
    draw = ImageDraw.Draw(card)
    title_font = ImageFont.truetype(str(FONT_BOLD), 60)
    tagline_font = ImageFont.truetype(str(FONT_REGULAR), 28)
    draw.text((72, 350), "CodePath-Academy", font=title_font, fill=WHITE, anchor="lm")
    draw.text((72, 404), "Learn. Build. Innovate. Become.",
              font=tagline_font, fill=INDIGO_200, anchor="lm")
    draw.rounded_rectangle([72, 438, 162, 444], radius=3, fill=INDIGO_400)

    return card.convert("RGB")


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def main() -> int:
    for font in (FONT_BOLD, FONT_REGULAR):
        if not font.exists():
            print(f"error: required font not found: {font}", file=sys.stderr)
            return 1

    outputs: list[tuple[Image.Image, Path]] = [
        (render_icon(16), PUBLIC / "favicon-16x16.png"),
        (render_icon(32), PUBLIC / "favicon-32x32.png"),
        (render_icon(192), PUBLIC / "icon-192x192.png"),
        (render_icon(512), PUBLIC / "icon-512x512.png"),
        (render_icon(192, maskable=True, glyph_scale=0.78),
         PUBLIC / "icon-192x192-maskable.png"),
        (render_icon(512, maskable=True, glyph_scale=0.78),
         PUBLIC / "icon-512x512-maskable.png"),
        (render_apple_touch(180), PUBLIC / "apple-touch-icon.png"),
        (render_og_card(), PUBLIC / "images" / "og" / "codepath-academy-og.png"),
    ]

    for image, path in outputs:
        save_png(image, path)

    # favicon.ico: one crisp 256px render, resampled to the classic sizes.
    ico_path = PUBLIC / "favicon.ico"
    render_icon(256).save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    outputs.append((render_icon(256), ico_path))

    print(f"{'asset':46} {'dimensions':12} {'bytes':>10}")
    for _, path in outputs:
        with Image.open(path) as img:
            dims = f"{img.width}x{img.height}"
        print(f"{path.relative_to(ROOT).as_posix():46} {dims:12} {path.stat().st_size:>10}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
