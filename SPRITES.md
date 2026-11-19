# Sprites — Roleta Russa 21

Especificação de arte para os sprites das habilidades e da interface.

Este documento é feito para ser enviado a um gerador de imagem. Cada sprite tem
descrição visual, paleta, grade de pixels e um **prompt pronto em inglês**.

**Regra de ouro:** o estilo tem que casar com os sprites que já existem no jogo
(`assets/char_outlaw_idle.png`, `assets/heart_full.png`, `assets/tambor/`).
Pixel art chunky, paleta fechada, contorno escuro, zero suavização.

---

## 1. Regras globais

### 1.1 Grade e escala

- Toda arte é desenhada numa **grade lógica pequena** e ampliada por fator
  inteiro, com **nearest-neighbor** (sem interpolação).
- Ícones: grade lógica **16×16**, exportado a **4×** → 64×64.
- Ícones de status: grade lógica **16×16**, exportado a **2×** → 32×32.
- Retratos: grade lógica **32×32**, exportado a **8×** → 256×256.
- Efeitos animados: grade lógica **32×32**, exportado a **4×** → 128×128.
- **Nunca** exportar em tamanho quebrado (ex.: 48px de um desenho de 16). O pixel
  tem que ficar quadrado e nítido.

### 1.2 Paleta

Paleta **Sweetie16** — a mesma do `style.css`. Não usar nenhuma cor fora dela.

| Nome | Hex | Uso típico |
|---|---|---|
| `ink` | `#1a1c2c` | contorno, olhos, sombra mais escura |
| `plum` | `#5d275d` | sombra de sangue, tecido escuro |
| `red` | `#b13e53` | perigo, sangue, mira, fogo |
| `orange` | `#ef7d57` | luz quente, sombra de dourado |
| `gold` | `#ffcd75` | latão, ficha, destaque nobre |
| `lime` | `#a7f070` | brilho de "seguro", energia |
| `green` | `#38b764` | veneno, sucesso, viper |
| `teal` | `#257179` | sombra de verde-água |
| `navy` | `#29366f` | fundo escuro, metal frio |
| `blue` | `#3b5dc9` | metal, tecnologia |
| `sky` | `#41a6f6` | brilho elétrico |
| `cyan` | `#73eff7` | energia, fantasma, Zero |
| `white` | `#f4f4f4` | luz, osso, carta |
| `silver` | `#94b0c2` | metal claro, chumbo |
| `slate` | `#566c86` | metal médio, capanga |
| `char` | `#333c57` | fundo do palco, sombra neutra |

### 1.3 Contorno e sombreamento

- Todo sprite tem **contorno de 1 pixel** em `ink #1a1c2c` (na grade lógica).
- Sombreamento em **2 tons no máximo**: cor base + uma sombra mais escura.
- Brilho em **1 pixel** de `white #f4f4f4` (nunca em área maior).
- Luz vem **de cima à esquerda**.
- Sem gradiente, sem dithering pesado, sem sombra projetada, sem blur.

### 1.4 O que nunca fazer

- Não escrever texto no sprite (a interface mostra texto em HTML).
- Não usar fundo branco ou xadrez "fake transparency".
- Não usar anti-aliasing, contornos cinza-suaves ou brilho difuso.
- Não usar mais de 16 cores por sprite.
- Não desenhar personagem com rosto detalhado: os existentes são silhuetas
  simples, quase sem traços.
- Não incluir marca d'água, moldura ou assinatura.

### 1.5 Prompt base

Colar **antes** do prompt específico de cada sprite:

```text
pixel art sprite, 16x16 logical pixel grid scaled 4x with nearest neighbor,
transparent background, strict 16-color Sweetie16 palette,
1 pixel dark navy outline (#1a1c2c), flat shading with at most 2 tones per color,
single white specular pixel, light from top-left,
no anti-aliasing, no gradients, no dithering, no blur, no text, no watermark,
centered, no drop shadow, game asset, crisp square pixels
```

---

## 2. Onde cada arquivo vai

| Pasta | Conteúdo |
|---|---|
| `assets/ui/` | fichas, marcas, ícones de status, ícones de habilidade |
| `assets/fx/` | efeitos animados e mira |
| `assets/` | retratos e fundo da seleção |

Todos os nomes abaixo são **exatos**. Não renomear.

---

## 3. Essenciais

### 3.1 `assets/ui/icon_ficha.png`

| Campo | Valor |
|---|---|
| Tamanho | 64×64 |
| Grade lógica | 16×16 (4×) |
| Formato | PNG-32, fundo transparente |
| Onde | painel de habilidade e assento |
| Exibido em | 32px |

**Composição:** um cartucho de revólver em pé, visto de frente, com a base
ligeiramente mais larga. O corpo ocupa ~5 px de largura e ~11 px de altura,
centralizado, com 2 px de folga em cima e embaixo.

**Leitura em 16px:** tem que parecer uma bala, não um pino. A ponta arredondada
e o aro da base são o que identificam.

**Cores:**

| Parte | Cor |
|---|---|
| Corpo | `gold #ffcd75` |
| Metade direita (sombra) | `orange #ef7d57` |
| Aro da base | `silver #94b0c2` |
| Base inferior | `slate #566c86` |
| Brilho | `white #f4f4f4` (1 px no alto à esquerda) |
| Contorno | `ink #1a1c2c` |

**Estados:** o mesmo arquivo serve para "ficha gasta" — eu aplico
`grayscale + opacity` no CSS. Não precisa de versão vazia.

**Prompt:**

```text
a single upright brass revolver cartridge standing vertically, front view,
rounded bullet tip at top, slightly wider rim at the bottom,
golden body with orange shadow on the right half, silver rim,
small white highlight pixel at upper left, dark navy outline,
centered with 2 pixels of empty margin, readable as a bullet at 16 pixels
```

---

### 3.2 `assets/ui/icon_marca.png`

| Campo | Valor |
|---|---|
| Tamanho | 32×32 |
| Grade lógica | 16×16 (2×) |
| Formato | PNG-32, fundo transparente |
| Onde | painel e assento (contador de progresso) |
| Exibido em | 12–16px |

**Composição:** uma bala de chumbo arredondada, deitada na diagonal (subindo da
esquerda para a direita), ocupando ~10 px na diagonal. Forma simples de bolinha
levemente oval, com um pixel de brilho no canto superior esquerdo.

**Cores:**

| Parte | Cor |
|---|---|
| Corpo | `silver #94b0c2` |
| Sombra (metade inferior direita) | `slate #566c86` |
| Brilho | `white #f4f4f4` (1 px) |
| Contorno | `ink #1a1c2c` |

**Uso:** três marcas lado a lado formam `●●○`. Como é usado em série, precisa ser
legível e simétrico mesmo pequeno. Também serve para "marca apagada" via CSS.

**Prompt:**

```text
a single round lead bullet ball lying diagonally, tilted up to the right,
simple oval shape, light silver on the upper left half,
medium slate shadow on the lower right half, one white highlight pixel,
dark navy outline, centered, very readable at 16 pixels
```

---

### 3.3 `assets/ui/icon_status_marcado.png`

| Campo | Valor |
|---|---|
| Tamanho | 32×32 |
| Grade lógica | 16×16 (2×) |
| Formato | PNG-32, fundo transparente |
| Onde | chip no assento do alvo |
| Exibido em | 16px |

**Composição:** mira de tiro (crosshair) **vazada**: quatro cantos em "L" nos
cantos do quadrado, um ponto central de 2×2, e o miolo **transparente**. Nada
preenchendo o centro.

**Cores:**

| Parte | Cor |
|---|---|
| Cantos e ponto | `red #b13e53` |
| Brilho dos cantos | `orange #ef7d57` (1 px interno) |
| Contorno | `ink #1a1c2c` |

**Prompt:**

```text
a hollow targeting crosshair reticle, four L-shaped corner brackets pointing
inward, a small 2x2 dot in the exact center, empty transparent space inside,
red brackets with a thin orange inner highlight and dark navy outline
```

---

### 3.4 `assets/ui/icon_status_setes.png`

| Campo | Valor |
|---|---|
| Tamanho | 32×32 |
| Grade lógica | 16×16 (2×) |
| Formato | PNG-32, fundo transparente |
| Onde | chip no assento do Don |
| Exibido em | 16px |

**Composição:** uma carta de baralho vista de frente, levemente inclinada para a
direita (~10°), com o número **7** grande ocupando quase toda a face. O 7 precisa
ser desenhado à mão em blocos (fonte de 3×5 px), não com fonte vetorial.

**Cores:**

| Parte | Cor |
|---|---|
| Face da carta | `white #f4f4f4` |
| Sombra da face | `silver #94b0c2` (faixa de 1 px na borda direita) |
| Número 7 | `red #b13e53` |
| Contorno | `ink #1a1c2c` |

**Prompt:**

```text
a single playing card seen from the front, tilted 10 degrees to the right,
white face with a thin silver shading strip on the right edge,
a large hand-drawn blocky number 7 in red occupying most of the card face,
dark navy outline, no suit symbols, readable at 16 pixels
```

---

### 3.5 `assets/ui/icon_status_guarda.png`

| Campo | Valor |
|---|---|
| Tamanho | 32×32 |
| Grade lógica | 16×16 (2×) |
| Formato | PNG-32, fundo transparente |
| Onde | painel privado do Don |
| Exibido em | 16–20px |

**Composição:** silhueta de capanga, de frente, só cabeça e ombros: chapéu de aba
larga (5 px de largura), cabeça sem rosto, ombros largos ocupando a base do
quadro. Um pequeno distintivo dourado no peito.

**Cores:**

| Parte | Cor |
|---|---|
| Silhueta | `slate #566c86` |
| Sombra lateral | `char #333c57` |
| Distintivo | `gold #ffcd75` (2 px) |
| Contorno | `ink #1a1c2c` |

**Prompt:**

```text
a front-facing silhouette bust of a western bodyguard, wide-brimmed hat,
faceless head, broad shoulders filling the bottom of the frame,
medium slate gray body with darker navy shading on one side,
a tiny golden badge on the chest, dark navy outline, no facial features
```

---

### 3.6 `assets/ui/icon_status_selo.png`

| Campo | Valor |
|---|---|
| Tamanho | 32×32 |
| Grade lógica | 16×16 (2×) |
| Formato | PNG-32, fundo transparente |
| Onde | chip no assento do alvo amaldiçoado |
| Exibido em | 16px |

**Composição:** um **cadeado de chumbo**: corpo retangular baixo e largo (8×6 px)
com um arco fino em cima ligando os dois lados, e uma **rachadura** de 1 px
descendo do topo do corpo. O cadeado precisa ser reconhecível a 16px, então o
arco tem que ser grosso (2 px) e o corpo ocupar a metade inferior.

**Cores:**

| Parte | Cor |
|---|---|
| Corpo | `silver #94b0c2` |
| Sombra (metade direita) | `slate #566c86` |
| Arco | `slate #566c86` com brilho `silver` |
| Rachadura | `ink #1a1c2c` |
| Contorno | `ink #1a1c2c` |

**Prompt:**

```text
a heavy lead padlock viewed from the front, short wide rectangular body,
thick 2 pixel shackle arch on top, a thin crack running down from the top
of the body, silver body with slate shadows on the right half,
dark navy outline, chunky and readable at 16 pixels
```

---

### 3.7 `assets/ui/icon_status_espectro.png`

| Campo | Valor |
|---|---|
| Tamanho | 32×32 |
| Grade lógica | 16×16 (2×) |
| Formato | PNG-32, fundo transparente |
| Onde | chip no assento do Reaper |
| Exibido em | 16px |

**Composição:** fantasma clássico: cabeça arredondada, corpo reto e barra
inferior ondulada em 3 pontas. Dois olhos escuros ovais. Sem boca.

**Cores:**

| Parte | Cor |
|---|---|
| Corpo | `white #f4f4f4` |
| Sombra (lado direito e base) | `silver #94b0c2` |
| Brilho frio na borda superior | `cyan #73eff7` (1 px) |
| Olhos | `ink #1a1c2c` |
| Contorno | `ink #1a1c2c` |

**Prompt:**

```text
a small classic ghost, rounded head, rectangular body with a wavy three-point
bottom edge, two dark oval eyes, white body with silver shading on the right
side and bottom, a thin cyan rim highlight on the upper edge, dark navy outline,
no mouth, cute but eerie, readable at 16 pixels
```

---

### 3.8 `assets/ui/icon_status_sangue.png`

| Campo | Valor |
|---|---|
| Tamanho | 32×32 |
| Grade lógica | 16×16 (2×) |
| Formato | PNG-32, fundo transparente |
| Onde | chip no assento do Reaper |
| Exibido em | 16px |

**Composição:** gota de sangue vertical: ponta fina em cima, corpo arredondado
embaixo, ocupando 7×11 px. Um pixel de brilho no alto à esquerda.

**Cores:**

| Parte | Cor |
|---|---|
| Corpo | `red #b13e53` |
| Sombra (lado direito e base) | `plum #5d275d` |
| Brilho | `white #f4f4f4` (1 px) |
| Contorno | `ink #1a1c2c` |

**Prompt:**

```text
a single vertical blood drop, sharp point at the top, rounded bulbous bottom,
red body with dark plum shadow on the right side and bottom,
one white highlight pixel at the upper left, dark navy outline,
simple and readable at 16 pixels
```

---

### 3.9 `assets/fx/target_reticle.png`

| Campo | Valor |
|---|---|
| Tamanho | 128×128 |
| Grade lógica | 32×32 (4×) |
| Formato | PNG-32, fundo transparente |
| Onde | sobreposição no palco, sobre o personagem-alvo |
| Exibido em | 96px |

**Composição:** mira grande e **vazada**, para sobrepor o personagem:

- um anel externo quebrado em 4 arcos (cada arco ~6 px de comprimento);
- quatro marcas (tick marks) apontando para o centro, entre os arcos;
- quatro cantos em "L" por fora do anel;
- **centro 100% transparente** — pelo menos 16×16 px vazios no meio.

**Cores:**

| Parte | Cor |
|---|---|
| Arcos e cantos | `red #b13e53` |
| Brilho interno | `orange #ef7d57` (1 px) |
| Ticks | `gold #ffcd75` |
| Contorno | `ink #1a1c2c` (1 px externo) |

**Prompt:**

```text
a large hollow targeting reticle overlay, broken outer ring made of four arcs,
four small tick marks pointing inward between the arcs, four L-shaped corner
brackets outside the ring, completely transparent empty center of at least
16x16 pixels, red arcs with orange inner highlights and gold ticks,
dark navy external outline
```

---

### 3.10 `assets/fx/fx_guarda.gif`

| Campo | Valor |
|---|---|
| Tamanho | 128×128 |
| Grade lógica | 32×32 (4×) |
| Formato | GIF animado, fundo transparente |
| Onde | palco, quando o Guarda-Costas absorve o tiro |
| Exibido em | 128px |
| Duração | 4 frames, 100 ms cada (~0,4 s), toca **uma vez** |

**Composição por frame:**

| Frame | Cena |
|---|---|
| 1 | silhueta de capanga **entrando pela esquerda**, corpo inclinado para a direita, braço esticado |
| 2 | capanga **de pé na frente**, de costas para o Don, peito aberto; um clarão dourado no peito |
| 3 | capanga **jogado para trás**, corpo arqueado; estouro vermelho no peito |
| 4 | capanga **caindo**, já translúcido (alfa ~50%), sumindo pela base |

**Cores:**

| Parte | Cor |
|---|---|
| Silhueta | `slate #566c86` |
| Sombra | `char #333c57` |
| Clarão do tiro | `gold #ffcd75` no frame 2 |
| Sangue / estouro | `red #b13e53` nos frames 3 e 4 |
| Contorno | `ink #1a1c2c` |

**Prompt (para o frame 2, repetir variando a pose):**

```text
pixel art animation frame, a faceless western bodyguard silhouette standing
with his back to the viewer and chest open, arms wide, a golden muzzle flash
burst on his chest, medium slate body with dark navy shading, dark navy outline,
32x32 logical grid, transparent background
```

---

## 4. Opcionais

### 4.1 Retratos — `assets/portrait_<skin>.png`

| Campo | Valor |
|---|---|
| Tamanho | 256×256 |
| Grade lógica | 32×32 (8×) |
| Formato | PNG-32, fundo transparente |
| Onde | card de seleção de personagem |
| Exibido em | 128px |

Cinco arquivos: `portrait_outlaw.png`, `portrait_duchess.png`,
`portrait_cyber.png`, `portrait_boss.png`, `portrait_phantom.png`.

**Composição comum:** busto do peito para cima, centralizado, de frente ou 3/4,
ocupando ~28 dos 32 px de altura. Fundo transparente. Sem cenário.

| Personagem | Detalhes obrigatórios | Cores dominantes |
|---|---|---|
| **Billy** | chapéu de aba larga, poncho, coldre no ombro, olhar cansado | `orange`, `red`, `gold` |
| **Viper** | chapéu pequeno com pena, cachecol, sorriso torto, cabelo preso | `green`, `teal`, `plum` |
| **Zero** | rosto coberto por sombra sob o chapéu, gola alta, fios de telégrafo saindo do casaco | `cyan`, `blue`, `navy` |
| **Don** | cartola ou chapéu caro, charuto, corrente de relógio, sobrancelha dura | `plum`, `gold`, `white` |
| **Reaper** | metade do rosto em osso, metade em sombra, capa rasgada, olhos vazios | `silver`, `white`, `char` |

**Prompt (base para os cinco):**

```text
pixel art character bust portrait, chest up, centered, front three-quarter view,
32x32 logical pixel grid, transparent background, strict Sweetie16 palette,
single dark navy outline, flat two-tone shading, no facial detail beyond eyes,
western look, no background, no text
```

Depois acrescentar a linha do personagem da tabela acima.

### 4.2 Ícones de habilidade — `assets/ui/abil_<skin>_<tipo>.png`

| Campo | Valor |
|---|---|
| Tamanho | 64×64 |
| Grade lógica | 16×16 (4×) |
| Formato | PNG-32, fundo transparente |
| Onde | linhas do painel de habilidade |
| Exibido em | 24px |

Quinze arquivos, no padrão `abil_outlaw_passiva.png`, `abil_outlaw_carga.png`,
`abil_outlaw_ativa.png`, e assim por diante.

| Arquivo | Ideia visual | Cores |
|---|---|---|
| `abil_outlaw_passiva` | carta com um furo de bala no meio | `white`, `silver`, `ink` |
| `abil_outlaw_carga` | três balas em fileira, a última quebrada | `gold`, `orange`, `silver` |
| `abil_outlaw_ativa` | bala com dois estilhaços vermelhos saindo | `gold`, `red`, `orange` |
| `abil_duchess_passiva` | coração com linha de pulso reta | `red`, `plum`, `lime` |
| `abil_duchess_carga` | cabeça de víbora enrolada | `green`, `teal`, `lime` |
| `abil_duchess_ativa` | tambor de revólver com uma caveira no centro | `silver`, `slate`, `red` |
| `abil_cyber_passiva` | olho aberto com brilho azul | `white`, `cyan`, `sky` |
| `abil_cyber_carga` | baralho com um "X" marcado no verso | `navy`, `blue`, `cyan` |
| `abil_cyber_ativa` | duas cartas com um raio entre elas | `cyan`, `sky`, `white` |
| `abil_boss_passiva` | pequena coroa sobre uma carta | `gold`, `white`, `plum` |
| `abil_boss_carga` | ferradura com um 7 dentro | `gold`, `orange`, `ink` |
| `abil_boss_ativa` | chapéu de capanga sobre um terno | `slate`, `char`, `gold` |
| `abil_phantom_passiva` | fantasma (igual ao ícone de status) | `white`, `silver`, `cyan` |
| `abil_phantom_carga` | gota de sangue com dois caninos | `red`, `plum`, `white` |
| `abil_phantom_ativa` | revólver com gota de sangue na boca do cano | `silver`, `red`, `ink` |

**Prompt (template):**

```text
pixel art game ability icon, single centered symbol, 16x16 logical pixel grid,
transparent background, strict Sweetie16 palette, dark navy outline,
flat two-tone shading, bold silhouette, readable at 24 pixels,
no text, no letters, no frame
```

Depois acrescentar a linha da tabela.

### 4.3 Efeitos de ativação — `assets/fx/fx_<nome>.gif`

| Campo | Valor |
|---|---|
| Tamanho | 128×128 |
| Grade lógica | 32×32 (4×) |
| Formato | GIF animado, fundo transparente |
| Duração | 4 frames, 100 ms cada |
| Onde | sobre o assento de quem ativou |

| Arquivo | Cena | Cores |
|---|---|---|
| `fx_municao.gif` | bala girando e ficando com contorno vermelho pulsante | `gold`, `red`, `orange` |
| `fx_roletas.gif` | tambor girando com uma caveira piscando no centro | `silver`, `slate`, `red` |
| `fx_curto.gif` | duas cartas batendo uma na outra com faísca azul | `cyan`, `sky`, `white` |
| `fx_maldicao.gif` | marca de caveira se formando e queimando em vermelho | `plum`, `red`, `ink` |
| `fx_selo.gif` | cadeado de chumbo caindo e travando com impacto | `silver`, `slate`, `gold` |
| `fx_boneco.gif` | boneco de pano sendo atravessado por um alfinete | `plum`, `red`, `gold` |

**Prompt (template):**

```text
pixel art animation frame, 32x32 logical pixel grid, transparent background,
strict Sweetie16 palette, dark navy outline, flat shading, centered effect,
no text, no background, single impact moment
```

Depois acrescentar a cena da tabela.

### 4.4 Espiada — `assets/ui/fx_espiada_segura.png` e `fx_espiada_perigosa.png`

| Campo | Valor |
|---|---|
| Tamanho | 32×32 |
| Grade lógica | 16×16 (2×) |
| Formato | PNG-32, fundo transparente |
| Onde | aviso privado do Zero |

| Arquivo | Desenho | Cores |
|---|---|---|
| `fx_espiada_segura.png` | olho aberto com pupila e brilho | `white`, `cyan`, `lime` |
| `fx_espiada_perigosa.png` | o mesmo olho com uma barra diagonal por cima | `white`, `red`, `ink` |

**Prompt:**

```text
pixel art icon of a single wide open eye, front view, white sclera,
cyan iris, one highlight pixel, dark navy outline, centered, 16x16 logical grid
```

Para a versão perigosa, acrescentar:

```text
same eye with a thick diagonal red slash crossing it from top-left to
bottom-right, red replacing the iris
```

### 4.5 Fundo da seleção — `assets/bg_select.png`

| Campo | Valor |
|---|---|
| Tamanho | 512×288 |
| Grade lógica | 128×72 (4×) |
| Formato | PNG-24, sem transparência |
| Onde | fundo da tela de seleção |
| Exibido em | tela cheia, com `background-size: cover` |

**Composição:** interior de saloon à noite, em silhueta. Balcão ao fundo, duas
lâmpadas penduradas com halo quente, janelas com chuva ou poeira, mesa de pôquer
apenas insinuada na parte de baixo. **Contraste baixo**: o fundo não pode competir
com os cards.

**Cores:**

| Parte | Cor |
|---|---|
| Parede e móveis | `ink #1a1c2c` e `char #333c57` |
| Halo das lâmpadas | `orange #ef7d57` com núcleo `gold #ffcd75` |
| Vidros | `navy #29366f` |
| Detalhes quentes | `plum #5d275d` |

**Prompt:**

```text
pixel art saloon interior at night, low contrast, dark navy wall and wooden
furniture silhouettes, two hanging oil lamps with warm orange halos,
windows with dusty blue glass, a poker table hinted at the bottom edge,
no characters, no text, 128x72 logical pixel grid, flat shading
```

---

## 5. Checklist de entrega

### Essenciais

- [ ] `assets/ui/icon_ficha.png` — 64×64
- [ ] `assets/ui/icon_marca.png` — 32×32
- [ ] `assets/ui/icon_status_marcado.png` — 32×32
- [ ] `assets/ui/icon_status_setes.png` — 32×32
- [ ] `assets/ui/icon_status_guarda.png` — 32×32
- [ ] `assets/ui/icon_status_selo.png` — 32×32
- [ ] `assets/ui/icon_status_espectro.png` — 32×32
- [ ] `assets/ui/icon_status_sangue.png` — 32×32
- [ ] `assets/fx/target_reticle.png` — 128×128
- [ ] `assets/fx/fx_guarda.gif` — 128×128, 4 frames

### Opcionais

- [ ] `assets/portrait_outlaw.png` — 256×256
- [ ] `assets/portrait_duchess.png` — 256×256
- [ ] `assets/portrait_cyber.png` — 256×256
- [ ] `assets/portrait_boss.png` — 256×256
- [ ] `assets/portrait_phantom.png` — 256×256
- [ ] 15× `assets/ui/abil_<skin>_<tipo>.png` — 64×64
- [ ] 6× `assets/fx/fx_<nome>.gif` — 128×128
- [ ] `assets/ui/fx_espiada_segura.png` — 32×32
- [ ] `assets/ui/fx_espiada_perigosa.png` — 32×32
- [ ] `assets/bg_select.png` — 512×288
