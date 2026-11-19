"""Remove o fundo falso (xadrez) dos sprites entregues pela IA.

Como funciona
-------------
Todas as PNGs entregues vem com a "transparencia" *desenhada*: um xadrez de
dois tons claros/medios, alternando a cada ~64px. Nao da para usar chroma key
porque algumas artes usam exatamente o mesmo branco do xadrez.

A separacao se apoia em duas coisas que valem para todos os arquivos:

1. a arte sempre tem contorno escuro, entao o fundo e a area *clara e neutra*
   alcancavel a partir da borda da imagem;
2. o anti-alias do contorno cria uma rampa de cinzas que liga o fundo ao
   interior da arte. Para o flood nao "vazar" por essa rampa, protegemos uma
   banda de alguns pixels em volta de todo pixel escuro/saturado.

Depois do flood, buracos fechados (o miolo da mira, por exemplo) sobram como
areas claras cercadas. Eles sao removidos quando a textura local mostra o
xadrez (variancia alta); areas lisas da arte (carta branca, corpo do fantasma)
tem variancia ~zero e ficam.

Uso
---
    python tools/process_sprites.py --src "C:\\caminho\\Sprites"
    python tools/process_sprites.py --src ... --only icon_ficha target_reticle

Gera os arquivos finais em assets/ui, assets/fx e assets/.
"""

from __future__ import annotations

import argparse
import os
import shutil

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

WORK = 512          # resolucao de trabalho (entrada e 2048, sobra folga)
BAND = 3            # banda protegida em volta da arte (px em WORK)
DARK = 105          # abaixo disso = contorno/arte escura
SAT = 46            # acima disso = arte colorida
TEXTURE = 40        # variancia minima para considerar xadrez


# --------------------------------------------------------------------------- #
# utilidades
# --------------------------------------------------------------------------- #

def variance_map(im: Image.Image, r: int = 3) -> Image.Image:
    """Variancia exata em janela (2r+1)^2, via imagem integral."""
    w, h = im.size
    px = im.load()
    iv = [[0] * (w + 1) for _ in range(h + 1)]
    iv2 = [[0] * (w + 1) for _ in range(h + 1)]
    for y in range(h):
        rv, rv2 = iv[y + 1], iv2[y + 1]
        pv, pv2 = iv[y], iv2[y]
        run = run2 = 0
        for x in range(w):
            v = px[x, y]
            run += v
            run2 += v * v
            rv[x + 1] = pv[x + 1] + run
            rv2[x + 1] = pv2[x + 1] + run2
    out = Image.new("L", (w, h))
    op = out.load()
    for y in range(h):
        y0, y1 = max(0, y - r), min(h, y + r + 1)
        for x in range(w):
            x0, x1 = max(0, x - r), min(w, x + r + 1)
            n = (y1 - y0) * (x1 - x0)
            s = iv[y1][x1] - iv[y0][x1] - iv[y1][x0] + iv[y0][x0]
            s2 = iv2[y1][x1] - iv2[y0][x1] - iv2[y1][x0] + iv2[y0][x0]
            op[x, y] = max(0, min(255, int(round(s2 / n - (s / n) ** 2))))
    return out


def art_core_mask(small: Image.Image, lo, hi) -> Image.Image:
    """Pixels claramente fora da faixa de cor do fundo (contorno e cor chapada)."""
    w, h = small.size
    px = small.load()
    m = Image.new("L", (w, h), 0)
    mp = m.load()
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            inside = all(lo[i] <= c[i] <= hi[i] for i in range(3))
            if not inside or (max(c) - min(c)) > SAT:
                mp[x, y] = 255
    return m


def tone_range(tones, margin: int = 14):
    lo = [min(t[i] for t in tones) - margin for i in range(3)]
    hi = [max(t[i] for t in tones) + margin for i in range(3)]
    return lo, hi


def border_tones(small: Image.Image, frame: int = 10) -> list[tuple[int, int, int]]:
    """Os 2-3 tons do xadrez, amostrados na moldura da imagem."""
    from collections import Counter

    px = small.load()
    w, h = small.size
    cnt: Counter = Counter()
    for x in range(0, w, 2):
        for y in list(range(0, frame)) + list(range(h - frame, h)):
            cnt[px[x, y]] += 1
    for y in range(0, h, 2):
        for x in list(range(0, frame)) + list(range(w - frame, w)):
            cnt[px[x, y]] += 1

    quant: Counter = Counter()
    for c, n in cnt.items():
        quant[tuple(v // 6 for v in c)] += n

    total = sum(cnt.values())
    tones: list[tuple[int, int, int]] = []
    for key, n in quant.most_common(10):
        if n < 0.02 * total:
            break
        rep = tuple(k * 6 + 3 for k in key)
        if all(sum(abs(rep[i] - t[i]) for i in range(3)) > 34 for t in tones):
            tones.append(rep)
        if len(tones) == 3:
            break
    return tones


def flood_from_border(free: Image.Image) -> list[list[int]]:
    """Flood fill com varredura por linhas. Retorna matriz 1 = fundo."""
    w, h = free.size
    ok = free.load()
    seen = [[0] * w for _ in range(h)]
    stack: list[tuple[int, int]] = []
    for x in range(w):
        for y in (0, h - 1):
            if ok[x, y]:
                stack.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if ok[x, y]:
                stack.append((x, y))

    while stack:
        x, y = stack.pop()
        if seen[y][x] or not ok[x, y]:
            continue
        x1 = x
        while x1 > 0 and ok[x1 - 1, y] and not seen[y][x1 - 1]:
            x1 -= 1
        x2 = x
        while x2 < w - 1 and ok[x2 + 1, y] and not seen[y][x2 + 1]:
            x2 += 1
        row = seen[y]
        for i in range(x1, x2 + 1):
            row[i] = 1
        for ny in (y - 1, y + 1):
            if 0 <= ny < h:
                for i in range(x1, x2 + 1):
                    if ok[i, ny] and not seen[ny][i]:
                        stack.append((i, ny))
    return seen


# --------------------------------------------------------------------------- #
# pipeline
# --------------------------------------------------------------------------- #

def cut_background(im: Image.Image, despill_rounds: int = 3) -> Image.Image:
    im = im.convert("RGB")
    full_w, full_h = im.size
    small = im.resize((WORK, WORK), Image.BOX)

    tones = border_tones(small)
    lo, hi = tone_range(tones)
    core = art_core_mask(small, lo, hi)
    protected = core.filter(ImageFilter.MaxFilter(2 * BAND + 1))
    free = protected.point(lambda v: 0 if v else 255)
    bg = flood_from_border(free)

    px = small.load()
    alpha = [[0 if bg[y][x] else 1 for x in range(WORK)] for y in range(WORK)]

    # buracos fechados de xadrez (miolo da mira, vao entre arcos)
    var = variance_map(small.convert("L"), 3)
    vp = var.load()
    cand = [[1 if (alpha[y][x] and all(lo[i] <= px[x, y][i] <= hi[i] for i in range(3))
                  and max(px[x, y]) - min(px[x, y]) <= 46) else 0
             for x in range(WORK)] for y in range(WORK)]
    mark = [[0] * WORK for _ in range(WORK)]
    for sy in range(WORK):
        for sx in range(WORK):
            if not cand[sy][sx] or mark[sy][sx]:
                continue
            stack = [(sx, sy)]
            mark[sy][sx] = 1
            cells = []
            while stack:
                x, y = stack.pop()
                cells.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < WORK and 0 <= ny < WORK and cand[ny][nx] and not mark[ny][nx]:
                        mark[ny][nx] = 1
                        stack.append((nx, ny))
            if len(cells) < 0.0012 * WORK * WORK:
                continue
            values = sorted(vp[x, y] for x, y in cells)
            if values[len(values) // 2] > TEXTURE:
                for x, y in cells:
                    alpha[y][x] = 0

    # halo: come pixels neutros encostados na transparencia
    tones = border_tones(small) + [(60, 62, 80), (150, 176, 194)]
    for _ in range(despill_rounds):
        doomed = []
        for y in range(WORK):
            for x in range(WORK):
                if not alpha[y][x]:
                    continue
                touching = ((x > 0 and not alpha[y][x - 1])
                            or (x < WORK - 1 and not alpha[y][x + 1])
                            or (y > 0 and not alpha[y - 1][x])
                            or (y < WORK - 1 and not alpha[y + 1][x]))
                if not touching:
                    continue
                c = px[x, y]
                if not all(lo[i] <= c[i] <= hi[i] for i in range(3)):
                    continue
                if (max(c) - min(c)) > 34:
                    continue
                if any(sum(abs(c[i] - t[i]) for i in range(3)) <= 44 for t in tones):
                    doomed.append((x, y))
        if not doomed:
            break
        for x, y in doomed:
            alpha[y][x] = 0

    mask = Image.new("L", (WORK, WORK))
    mp = mask.load()
    for y in range(WORK):
        for x in range(WORK):
            mp[x, y] = 255 if alpha[y][x] else 0
    mask = mask.filter(ImageFilter.MedianFilter(5))
    full = mask.resize((full_w, full_h), Image.LANCZOS).point(lambda v: 255 if v >= 128 else 0)
    rgba = im.convert("RGBA")
    rgba.putalpha(full)
    return rgba


def export(src: str, dst: str, logical: int, scale: int = 1, pad: float = 0.0) -> str:
    rgba = cut_background(Image.open(src))
    bbox = rgba.getbbox()
    if not bbox:
        raise ValueError("nada restou: " + src)
    art = rgba.crop(bbox)
    w, h = art.size
    side = max(1, int(round(max(w, h) * (1 + pad))))
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(art, ((side - w) // 2, (side - h) // 2))
    small = sq.resize((logical, logical), Image.BOX)
    out = small if scale == 1 else small.resize((logical * scale, logical * scale), Image.NEAREST)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    out.save(dst)
    return f"{os.path.relpath(dst, ROOT)}  {out.size[0]}x{out.size[1]} (grade {logical})"


# --------------------------------------------------------------------------- #
# manifesto
# --------------------------------------------------------------------------- #

LOGICAL = 32  # grade nativa da arte entregue

MANIFEST = [
    # fonte, destino, grade logica, escala
    ("icon_ficha.png", "assets/ui/icon_ficha.png", LOGICAL, 2),
    ("icon_marca.png", "assets/ui/icon_marca.png", LOGICAL, 2),
    ("icon_status_marcado.png", "assets/ui/icon_status_marcado.png", LOGICAL, 2),
    ("icon_status_setes.png", "assets/ui/icon_status_setes.png", LOGICAL, 2),
    ("icon_status_guarda.png", "assets/ui/icon_status_guarda.png", LOGICAL, 2),
    ("icon_status_selo.png", "assets/ui/icon_status_selo.png", LOGICAL, 2),
    ("icon_status_espectro.png", "assets/ui/icon_status_espectro.png", LOGICAL, 2),
    ("icon_status_sangue.png", "assets/ui/icon_status_sangue.png", LOGICAL, 2),
    ("fx_espiada_segura.png", "assets/ui/fx_espiada_segura.png", LOGICAL, 2),
    ("fx_espiada_perigosa.png", "assets/ui/fx_espiada_perigosa.png", LOGICAL, 2),
    ("target_reticle.png", "assets/fx/target_reticle.png", LOGICAL, 4),
    ("portrait_outlaw.png", "assets/portrait_outlaw.png", LOGICAL, 8),
    ("portrait_duchess.png", "assets/portrait_duchess.png", LOGICAL, 8),
    ("portrait_cyber.png", "assets/portrait_cyber.png", LOGICAL, 8),
    ("portrait_boss.png", "assets/portrait_boss.png", LOGICAL, 8),
    ("portrait_phantom.png", "assets/portrait_phantom.png", LOGICAL, 8),
]

for skin in ("outlaw", "duchess", "cyber", "boss", "phantom"):
    for kind in ("passiva", "carga", "ativa"):
        MANIFEST.append((
            f"abil_{skin}_{kind}.png",
            f"assets/ui/abil_{skin}_{kind}.png",
            LOGICAL, 2,
        ))

GIFS = [
    ("efeitos_ativacao/fx_boneco.gif", "assets/fx/fx_boneco.gif"),
    ("efeitos_ativacao/fx_curto.gif", "assets/fx/fx_curto.gif"),
    ("efeitos_ativacao/fx_maldicao.gif", "assets/fx/fx_maldicao.gif"),
    ("efeitos_ativacao/fx_municao.gif", "assets/fx/fx_municao.gif"),
    ("efeitos_ativacao/fx_roletas.gif", "assets/fx/fx_roletas.gif"),
    ("efeitos_ativacao/fx_selo.gif", "assets/fx/fx_selo.gif"),
    ("fx_guarda.gif", "assets/fx/fx_guarda.gif"),
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="pasta com os PNGs entregues")
    ap.add_argument("--only", nargs="*", help="limita a alguns nomes de origem")
    args = ap.parse_args()

    only = {o if o.endswith(".png") else o + ".png" for o in (args.only or [])}
    done = 0
    for src_name, dst_rel, logical, scale in MANIFEST:
        if only and src_name not in only:
            continue
        src = os.path.join(args.src, src_name)
        if not os.path.exists(src):
            print("  faltando:", src_name)
            continue
        dst = os.path.join(ROOT, dst_rel)
        try:
            print("ok  ", export(src, dst, logical, scale))
            done += 1
        except Exception as exc:  # noqa: BLE001
            print("erro", src_name, "->", exc)

    for src_name, dst_rel in GIFS:
        if only:
            continue
        src = os.path.join(args.src, src_name)
        if not os.path.exists(src):
            continue
        dst = os.path.join(ROOT, dst_rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)
        print("copy", dst_rel)
        done += 1

    # fundo da selecao: sem transparencia, so recorte + reducao
    if not only:
        bg_src = os.path.join(args.src, "bg_select.png")
        if os.path.exists(bg_src):
            im = Image.open(bg_src).convert("RGB")
            w, h = im.size
            target_ratio = 16 / 9
            ratio = w / h
            if ratio > target_ratio:
                new_w = int(round(h * target_ratio))
                im = im.crop(((w - new_w) // 2, 0, (w + new_w) // 2, h))
            else:
                new_h = int(round(w / target_ratio))
                im = im.crop((0, (h - new_h) // 2, w, (h + new_h) // 2))
            im = im.resize((768, 432), Image.LANCZOS)
            dst = os.path.join(ROOT, "assets/bg_select.png")
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            im.save(dst)
            print("bg   assets/bg_select.png  768x432")
            done += 1

    print(f"\n{done} arquivo(s) gerado(s).")


if __name__ == "__main__":
    main()
