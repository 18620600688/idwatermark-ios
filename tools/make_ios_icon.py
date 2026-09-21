# -*- coding: utf-8 -*-
"""生成 iOS 桌面图标（120 / 180 / 1024），纯 Pillow 绘制，无需外部素材。

用法： python tools/make_ios_icon.py
输出： Resources/AppIcon60x60@2x.png (120)、AppIcon60x60@3x.png (180)、AppIcon1024.png
"""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "Resources")
S = 1024
R = 180  # 圆角


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def build():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 卡片底
    d.rounded_rectangle([40, 40, S - 40, S - 40], radius=R, fill=(255, 255, 255, 255),
                        outline=(206, 213, 224, 255), width=10)

    # 证件照小框
    d.rounded_rectangle([120, 200, 400, 620], radius=24, fill=(150, 165, 186, 255))
    d.ellipse([225, 280, 295, 350], fill=(220, 228, 240, 255))
    d.rounded_rectangle([185, 380, 335, 560], radius=60, fill=(220, 228, 240, 255))

    # 信息横线
    for i, y in enumerate((220, 330, 440, 550)):
        w = 470 - i * 60
        d.rounded_rectangle([460, y, 460 + w, y + 46], radius=14, fill=(214, 220, 230, 255))

    # 斜向红色水印带（画竖条再整体旋转，避免手算多边形）
    band = Image.new("RGBA", (S * 2, S * 2), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    for x0 in (620, 1180):
        bd.rectangle([x0, 0, x0 + 175, S * 2], fill=(225, 29, 72, 105))
    band = band.rotate(30, resample=Image.BICUBIC, center=(S, S))
    band = band.crop((S // 2, S // 2, S // 2 + S, S // 2 + S))
    img = Image.alpha_composite(img, band)

    # 整体裁圆角 + 加一点渐变底色衬托
    base = Image.new("RGBA", (S, S), (240, 244, 250, 255))
    base.paste(img, (0, 0), rounded_mask(S, R + 18))
    return base


def main():
    icon = build()
    targets = [("AppIcon60x60@2x.png", 120), ("AppIcon60x60@3x.png", 180),
               ("AppIcon152x152@2x.png", 152), ("AppIcon1024.png", 1024)]
    for name, size in targets:
        out = os.path.join(OUT, name)
        icon.resize((size, size), Image.LANCZOS).save(out, "PNG")
        print("icon ->", out, size)


if __name__ == "__main__":
    main()
