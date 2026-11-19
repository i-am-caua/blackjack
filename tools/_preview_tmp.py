from PIL import Image

names = [
    ("assets/ui/abil_boss_passiva.png", 128),
    ("assets/ui/abil_cyber_ativa.png", 128),
    ("assets/ui/abil_outlaw_ativa.png", 128),
    ("assets/ui/abil_phantom_ativa.png", 128),
    ("assets/ui/abil_duchess_carga.png", 128),
    ("assets/ui/icon_ficha.png", 128),
    ("assets/ui/icon_marca.png", 128),
    ("assets/ui/icon_status_espectro.png", 128),
    ("assets/fx/target_reticle.png", 128),
    ("assets/ui/icon_status_setes.png", 128),
    ("assets/portrait_boss.png", 128),
]

tiles = []
for path, size in names:
    im = Image.open(path).convert("RGBA")
    im = im.resize((size, size), Image.NEAREST)
    t = Image.new("RGBA", (size, size), (255, 0, 255, 255))
    t.alpha_composite(im)
    tiles.append(t)

sheet = Image.new("RGBA", (128 * 6, 256), (20, 22, 32, 255))
for i, t in enumerate(tiles):
    sheet.alpha_composite(t, ((i % 6) * 128, (i // 6) * 128))
out = r"C:\Users\Joelc\AppData\Local\Temp\opencode\sprite_test\abils2.png"
sheet.convert("RGB").save(out)
print(out)
