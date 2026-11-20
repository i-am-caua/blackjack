# Personagens novos — direção visual

Este documento reúne a direção inicial dos retratos de personagens novos de
**Roleta Russa 21**. O objetivo é gerar a primeira imagem de cada um; não
define habilidades, animações ou integração no jogo.

O estilo deve acompanhar os retratos existentes e as regras de `SPRITES.md`:
pixel art de faroeste gótico, paleta Sweetie16, contorno escuro, pixels nítidos
e fundo transparente.

---

## Regras gerais dos retratos

| Campo | Valor |
|---|---|
| Tamanho final | 256×256 px |
| Grade lógica | 32×32, ampliada em 8× por nearest-neighbor |
| Formato | PNG-32 com fundo transparente |
| Enquadramento | Busto do peito para cima, centralizado, de frente ou em 3/4 |
| Fundo | Transparente, sem cenário, moldura ou sombra projetada |
| Paleta | Sweetie16, sem cores adicionais |

- Manter os detalhes legíveis na grade lógica de 32×32.
- Usar contorno de 1 pixel lógico em `ink #1a1c2c` e sombreamento simples.
- Sem anti-aliasing, gradientes, blur, texto, marca-d'água ou assinatura.
- Cada prompt abaixo descreve **um único retrato**, sem variações ou folha de
  personagens.

---

## 1. Mineradora — nome em aberto

**Nome de trabalho:** Mara. O nome definitivo será escolhido depois; não
escrever nome nem letras na imagem. Até lá, o arquivo pode usar o nome neutro
`assets/portrait_mineradora.png`.

### Personalidade

Ex-encarregada de mina, direta e obstinada. É protetora com quem trabalha ao
lado dela, tem humor seco e detesta ser tratada com pena. Passa a impressão de
alguém que aguenta firme quando todo o resto desaba.

### Composição

Busto robusto, de frente ou em 3/4. O capacete baixo de mineração e a lâmpada
devem formar a silhueta principal. O rosto é determinado, com expressão
impaciente; fuligem pode marcar as bochechas. Incluir um lenço vermelho queimado
no pescoço, uma luva grossa visível e a parte superior de um martelo de mina
preso ao ombro ou à alça do macacão. Não cobrir o rosto com ferramentas.

### Cores dominantes

| Parte | Cores Sweetie16 |
|---|---|
| Roupa de trabalho e fuligem | `char #333c57`, `ink #1a1c2c` |
| Capacete e luz da lâmpada | `orange #ef7d57`, `gold #ffcd75` |
| Lenço | `red #b13e53` |
| Metal do martelo e fivelas | `slate #566c86`, `silver #94b0c2` |

### Prompt

```text
pixel art character bust portrait, a tough adult woman who used to supervise
a frontier mine, chest up, centered, front three-quarter view, 32x32 logical
pixel grid scaled to 256x256 with nearest neighbor, transparent background,
strict Sweetie16 palette. Broad sturdy silhouette, short rugged miner's jacket,
low mining helmet with a small brass lamp, burnt red neckerchief, soot smudges
on her cheeks, one heavy work glove and the top of a mining hammer visible over
one shoulder. Determined impatient expression, practical and protective
presence. Charcoal and slate clothing, copper-orange and gold lamp, dark navy
one-pixel outline, flat two-tone shading, light from top-left, crisp square
pixels. No background, no text, no watermark, no extra characters, no
photorealism.
```

---

## 2. Elias — pregador itinerante

**Nome:** Elias. O visual já está definido como um homem muito velho, descuidado
e de aparência marcante.

### Personalidade

Pregador itinerante que perdeu a fé, mas ainda sabe contar histórias e consolar
quem precisa. É gentil e irônico, observa a mesa em silêncio e usa humor para
disfarçar o próprio desgaste. Parece ter passado tempo demais na estrada e
tempo de menos cuidando de si.

### Composição

Busto do peito para cima, ombros ligeiramente caídos. Elias é idoso, com calvície
muito avançada: topo da cabeça quase todo sem cabelo e poucos fios brancos nas
laterais. Barba branca cheia e desgrenhada, com manchas de bebida em tom âmbar
ao redor da boca e na ponta. Um cachimbo fica preso no canto da boca, bem
visível contra a barba. Usa uma boina escura, sem chapéu de caubói.

A camisa clara está suja de poeira, amarrotada e aberta em vários botões no
peito, deixando aparecer alguns pelos. Manter a abertura como um detalhe
desleixado e cômico, sem nudez ou anatomia detalhada. A gola pode estar torta;
evitar acessórios elegantes ou aparência de homem rico.

### Cores dominantes

| Parte | Cores Sweetie16 |
|---|---|
| Barba e fios restantes | `white #f4f4f4`, `silver #94b0c2` |
| Boina e sombras | `char #333c57`, `ink #1a1c2c` |
| Camisa empoeirada | `white #f4f4f4`, `slate #566c86` |
| Manchas de bebida e cachimbo | `orange #ef7d57`, `gold #ffcd75`, `plum #5d275d` |

### Prompt

```text
pixel art character bust portrait, Elias, a very old itinerant preacher from a
weird western frontier, chest up, centered, front three-quarter view, 32x32
logical pixel grid scaled to 256x256 with nearest neighbor, transparent
background, strict Sweetie16 palette. Extremely advanced baldness, almost
bare crown with only wispy white hair at the sides, full messy white beard
stained amber around the mouth and beard tip as if spilled liquor, a small
smoking pipe held constantly at the corner of his mouth, clearly visible
against the beard. Worn dark beret, no cowboy hat. Dusty rumpled pale shirt
with several buttons undone at the chest, a few simple chest-hair pixels
visible, crooked collar and slumped shoulders. He looks old, unkempt, gently
amused and a little tired, not wealthy or threatening. Keep the face and beard
readable at 32x32. Dark navy one-pixel outline, flat two-tone shading, light
from top-left, crisp square pixels. No scenery, no background, no text, no
watermark, no extra characters, no photorealism, no nudity.
```

---

## 3. Cantora de Nova Orleans — nome em aberto

**Origem de trabalho:** Nova Orleans, como artista que veio de fora da região.
O nome fica em aberto.

### Personalidade

Jovem adulta, elegante e delicada na maneira de se portar. Está sempre bem
arrumada, mesmo depois de uma noite longa cantando em bares. É educada e
graciosa com o público, mas cuidadosa com a própria segurança: não confunde
delicadeza com ingenuidade.

### Composição

Busto do peito para cima, com postura ereta de cantora acostumada ao palco.
Usa um vestido chamativo, bem cortado e impecavelmente cuidado, com um detalhe
de brilho simples que continue legível em 32×32. O cabelo é preto, volumoso e
alto, cuidadosamente preso e arrumado. Batom vermelho vivo é um dos pontos de
cor mais fortes do rosto. A expressão é serena e refinada, com olhar atento.

Ela carrega um revólver pequeno escondido sob o vestido para se proteger. Como
este retrato é enquadrado do peito para cima, a arma **não deve aparecer**; esse
detalhe fica registrado para uma futura arte de corpo inteiro.

### Cores dominantes

| Parte | Cores Sweetie16 |
|---|---|
| Vestido de palco | `plum #5d275d`, `red #b13e53`, `gold #ffcd75` |
| Cabelo | `ink #1a1c2c`, `char #333c57` |
| Batom | `red #b13e53` |
| Brilhos e joias discretas | `gold #ffcd75`, `white #f4f4f4` |

### Prompt

```text
pixel art character bust portrait, an elegant young adult woman singer from
New Orleans, chest up, centered, front three-quarter view, 32x32 logical pixel
grid scaled to 256x256 with nearest neighbor, transparent background, strict
Sweetie16 palette. Immaculately groomed and poised, delicate graceful presence
with an alert, self-possessed gaze. A striking but tasteful stage dress in deep
plum and red with a few small gold accents, tall carefully arranged black hair,
vivid bright red lipstick. She looks like a polished singer from late-night
frontier bars. Refined, not fragile. Her small defensive revolver is concealed
under the dress and must not be visible in this chest-up portrait. Dark navy
one-pixel outline, flat two-tone shading, light from top-left, crisp square
pixels. No stage, no scenery, no background, no text, no watermark, no extra
characters, no photorealism.
```

---

## 4. Indígena — nome e povo em aberto

**Idade:** entre 45 e 50 anos. A nação, a região de origem e o nome ainda serão
definidos. A pele castanho-escura é uma característica deste personagem, não
uma regra para representar todos os povos indígenas.

### Personalidade

Ainda em aberto. A direção visual não determina personalidade, origem ou
costumes; esses detalhes podem ser escolhidos junto com o nome e a comunidade
específica do personagem.

### Composição

Busto do peito para cima, com postura firme e expressão madura. Usa roupas de
couro de trabalho e um chapéu de couro adornado com penas, como elementos
visuais deste personagem. O chapéu deve ter uma silhueta clara, mas sem ser
tratado como traje universal de povos indígenas. Um cachimbo de madeira fica
preso no canto da boca, com fumaça discreta de tabaco ou ervas naturais; não o
identificar como objeto cerimonial. Carrega lâminas em bainhas de couro e não
usa armas de fogo. No retrato, pode aparecer uma bainha presa à alça no ombro;
sem pose de ataque.

### Cores dominantes

| Parte | Cores Sweetie16 |
|---|---|
| Pele em tom castanho-escuro estilizado | `orange #ef7d57`, `plum #5d275d`, `char #333c57` |
| Roupa de couro | `orange #ef7d57`, `gold #ffcd75`, `ink #1a1c2c` |
| Penas | `red #b13e53`, `teal #257179`, `gold #ffcd75` |
| Bainha e lâmina | `char #333c57`, `silver #94b0c2` |

### Prompt

```text
pixel art character bust portrait, an Indigenous man aged about 45 to 50 from
a weird western frontier, chest up, centered, front three-quarter view, 32x32
logical pixel grid scaled to 256x256 with nearest neighbor, transparent
background, strict Sweetie16 palette. Dark brown skin as an individual
character trait, mature calm face, practical leather clothing and a distinct
leather hat adorned with a small arrangement of feathers. A wooden pipe held
at the corner of his mouth with a subtle wisp of smoke from natural tobacco or
herbs. He carries only blades, never a gun; show one sheathed knife on a leather
shoulder strap, no attack pose. Grounded and self-possessed, not a fantasy
warrior or mystical stereotype. The hat and clothing are this character's
stylized design and do not claim to represent every Indigenous nation. Dark
navy one-pixel outline, flat two-tone shading, light from top-left, crisp square
pixels. No scenery, no background, no text, no watermark, no extra characters,
no photorealism.
```

---

## Próxima decisão

- Escolher o nome definitivo da mineradora.
- Escolher o nome da cantora e confirmar se a origem de Nova Orleans funciona.
- Escolher o nome, a nação e a região de origem do personagem indígena antes de
  fechar os detalhes culturais do traje.

As habilidades dos personagens permanecem em aberto.
