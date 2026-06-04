#!/usr/bin/env python3
"""Generate the app icon / adaptive icon / splash: a basketball with a big "21"."""
import math
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
SIZE = 1024
DARK = (11, 16, 24, 255)
ORANGE = (226, 104, 42, 255)
ORANGE_HI = (240, 140, 70, 255)
SEAM = (24, 16, 12, 255)
WHITE = (248, 250, 252, 255)

FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Black.ttf"


def draw_ball(img, cx, cy, R):
    d = ImageDraw.Draw(img)
    # ball
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=ORANGE)
    # soft highlight (top-left)
    hi = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(hi).ellipse(
        [cx - R * 0.75, cy - R * 0.85, cx + R * 0.15, cy + R * 0.05], fill=(255, 180, 120, 60)
    )
    img.alpha_composite(hi)

    w = max(6, int(R * 0.03))
    # horizontal + vertical seams
    d.line([(cx - R * 0.99, cy), (cx + R * 0.99, cy)], fill=SEAM, width=w)
    d.line([(cx, cy - R * 0.99), (cx, cy + R * 0.99)], fill=SEAM, width=w)
    # two curved side seams
    top = cy - R * 0.985
    bot = cy + R * 0.985
    N = 80
    for side in (1, -1):
        pts = []
        for i in range(N + 1):
            u = i / N
            y = top + (bot - top) * u
            x = cx + side * 0.5 * R * math.sin(math.pi * u)
            pts.append((x, y))
        d.line(pts, fill=SEAM, width=w, joint="curve")


def draw_21(img, cx, cy, fontsize):
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype(FONT_PATH, fontsize)
    except OSError:
        font = ImageFont.load_default()
    text = "21"
    bbox = d.textbbox((0, 0), text, font=font, stroke_width=int(fontsize * 0.04))
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = cx - tw / 2 - bbox[0]
    y = cy - th / 2 - bbox[1]
    d.text(
        (x, y),
        text,
        font=font,
        fill=WHITE,
        stroke_width=int(fontsize * 0.06),
        stroke_fill=DARK,
    )


def make(filename, bg, R_frac, font_frac, ball_dy=0.0):
    img = Image.new("RGBA", (SIZE, SIZE), bg)
    cx = cy = SIZE / 2
    R = SIZE / 2 * R_frac
    draw_ball(img, cx, cy + SIZE * ball_dy, R)
    draw_21(img, cx, cy + SIZE * ball_dy, int(SIZE * font_frac))
    img.save(os.path.join(OUT, filename))
    print("wrote", filename)


# Full-bleed app icon (dark corners behind the ball)
make("icon.png", DARK, R_frac=0.94, font_frac=0.5)
# Android adaptive foreground: content kept inside the safe zone, transparent bg
make("adaptive-icon.png", (0, 0, 0, 0), R_frac=0.62, font_frac=0.34)
# Splash: ball + 21 centered on transparent (splash bg colour shows behind)
make("splash-icon.png", (0, 0, 0, 0), R_frac=0.5, font_frac=0.28)

print("done")
