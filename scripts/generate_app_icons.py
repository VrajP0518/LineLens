"""Generate original LineLens Sports app icons for Tauri."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "src-tauri" / "icons"
SOURCE_PATH = ICON_DIR / "icon-1024.png"


def build_source_icon(size: int = 1024) -> Image.Image:
    image = Image.new("RGBA", (size, size), (7, 16, 30, 255))
    draw = ImageDraw.Draw(image)

    for y in range(size):
        blend = y / max(1, size - 1)
        color = (
            int(7 + (16 - 7) * blend),
            int(16 + (37 - 16) * blend),
            int(30 + (54 - 30) * blend),
            255,
        )
        draw.line([(0, y), (size, y)], fill=color)

    accent = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    adraw = ImageDraw.Draw(accent)
    adraw.ellipse(
        (size * 0.08, size * 0.08, size * 0.92, size * 0.92),
        outline=(25, 210, 196, 110),
        width=max(8, size // 64),
    )
    adraw.rounded_rectangle(
        (size * 0.17, size * 0.17, size * 0.83, size * 0.83),
        radius=size * 0.18,
        outline=(91, 200, 255, 120),
        width=max(8, size // 60),
    )
    accent = accent.filter(ImageFilter.GaussianBlur(radius=size // 90))
    image.alpha_composite(accent)

    grid_color = (255, 255, 255, 34)
    margin = size * 0.2
    width = size * 0.6
    top = size * 0.24
    bottom = size * 0.76
    draw.rounded_rectangle((margin, top, margin + width, bottom), radius=size * 0.08, outline=(255, 255, 255, 70), width=max(5, size // 120))
    for step in range(1, 4):
        x = margin + width * step / 4
        draw.line((x, top, x, bottom), fill=grid_color, width=max(2, size // 256))
    for step in range(1, 4):
        y = top + (bottom - top) * step / 4
        draw.line((margin, y, margin + width, y), fill=grid_color, width=max(2, size // 256))

    chart_points = [
        (size * 0.26, size * 0.62),
        (size * 0.38, size * 0.54),
        (size * 0.5, size * 0.58),
        (size * 0.63, size * 0.39),
        (size * 0.75, size * 0.32),
    ]
    draw.line(chart_points, fill=(25, 210, 196, 255), width=max(12, size // 48), joint="curve")
    for x, y in chart_points:
        draw.ellipse((x - size * 0.018, y - size * 0.018, x + size * 0.018, y + size * 0.018), fill=(244, 203, 106, 255))

    try:
        font = ImageFont.truetype("arialbd.ttf", size=int(size * 0.23))
    except OSError:
        font = ImageFont.load_default()
    text = "LL"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) / 2
    ty = size * 0.67 - th / 2
    draw.text((tx + size * 0.008, ty + size * 0.008), text, font=font, fill=(0, 0, 0, 90))
    draw.text((tx, ty), text, font=font, fill=(244, 248, 255, 255))

    return image


def save_png(source: Image.Image, size: int, path: Path) -> None:
    source.resize((size, size), Image.LANCZOS).save(path, format="PNG")


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    source = build_source_icon()
    source.save(SOURCE_PATH, format="PNG")

    save_png(source, 32, ICON_DIR / "32x32.png")
    save_png(source, 128, ICON_DIR / "128x128.png")
    save_png(source, 256, ICON_DIR / "128x128@2x.png")

    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    source.save(ICON_DIR / "icon.ico", sizes=ico_sizes)
    source.save(ICON_DIR / "icon.icns")

    print("Generated LineLens Sports app icons:")
    for filename in ["32x32.png", "128x128.png", "128x128@2x.png", "icon.ico", "icon.icns", "icon-1024.png"]:
        print(f" - src-tauri/icons/{filename}")


if __name__ == "__main__":
    main()
