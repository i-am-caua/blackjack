# Habilidades — Modo Roleta Russa 21

Documento de design das habilidades dos personagens.

**Status:** 5 de 5 personagens definidos, com passiva própria e ativa fechadas.
As regras de resolução estão definidas; a implementação do modo online está em
andamento.

---

## Cenário

Tudo se passa em **Raven Hollow**, cidade de fronteira no velho oeste: poeira,
saloon, xerife comprado e uma mesa de cartas no fundo onde as dívidas são pagas
com chumbo. A regra é a de sempre — vence quem chega mais perto de 21 —, mas aqui
a banca é um tambor de seis câmaras.

As histórias abaixo são o que os moradores contam sobre cada um. Nem tudo é
verdade, mas ninguém em Raven Hollow tem coragem de perguntar.

---

## Regras gerais do sistema

- Cada kit tem **três partes**: a **passiva** (efeito permanente, de graça), a
  **carga** (condição que gera a ficha) e a **ativa** (o que a ficha faz).
- Cada personagem acumula no **máximo 1 ficha** por vez, e não pode empilhar duas.
- Nenhuma habilidade pode passar de **6/6 munições**.
- O alvo de qualquer habilidade **precisa ser avisado visualmente** — a única
  exceção é o Guarda-Costas do Don, que é secreto (a existência da habilidade é
  pública, o estado é oculto).
- Habilidades não podem ser ativadas depois que o tambor começa a girar.
- Apenas o Billy pode eliminar alguém diretamente (2 de dano em quem tem 2 vidas).
- Partida média: **~40 a 45 rodadas** (15 vidas × ~2,8 tiros por acerto).

### Ordem de resolução

Cada rodada passa pelas fases abaixo, **nesta ordem**. Uma fase só começa quando a
anterior termina.

#### Fase 1 — Distribuição

As passivas que olham a mão inicial resolvem juntas, sem interação entre si (cada
uma mexe apenas no próprio estado):

1. **Billy** — mão inicial de 16 duro → remove 1 bala (mín. `1/6`).
2. **Don** — 7 na mão inicial → +1 marca (2 marcas = ficha).
3. **Zero** — mão inicial 12–16 → reserva a próxima carta e recebe o aviso privado.
4. **Viper / Reaper** — nada acontece na distribuição.

#### Fase 2 — Ações de carta

1. Hit / Stand normalmente.
2. **Curto-Circuito** (Zero) pode ser usado aqui, inclusive depois de estourar,
   enquanto a rodada estiver aberta. A troca recalcula os pontos dos dois, mas
   **não devolve o direito de agir** a quem já parou ou estourou.
3. **Billy** — estouro conta para a sequência de 3.

#### Fase 3 — Vencedores

1. Ranking: quem não estourou vence quem estourou; Blackjack vence 21 normal.
2. **Palavra Final** (Don): se ele está entre os empatados e tem **um 7 na mão**,
   ele é o **único** vencedor — os outros empatados não escolhem alvo.
3. Empate sem Don → todos os empatados entram na fila de vencedores e escolhem um
   por vez.

#### Fase 4 — Escolha do alvo

- Cada vencedor escolhe um jogador **vivo**, **exceto a si mesmo**.

#### Fase 5 — Janela de preparação (antes de rolar)

Fase curta de ~8 segundos entre a escolha do alvo e o sorteio da câmara. É a única
janela em que as ativas podem ser usadas. Ordem:

1. **Reaper** — paga 1 vida e 1 ficha para escolher **Maldição** ou **Selo de
   Chumbo**.
2. **Billy** — gasta a ficha e marca um alvo.
3. **Viper** — se for ela a girar, o botão `ROLETA DE CABEÇAS` aparece; ela decide.
4. **Reaper** — se for ele a girar, pode pagar 1 vida e 1 ficha para usar
   **Boneco Vudú** em outro jogador vivo.
5. A janela fecha (todos confirmaram ou o tempo acabou) e o disparo é rolado.

**Regras da janela:**

- Quem não confirmar não gasta nada.
- A **Maldição** resolve **na hora**, como um tiro extra fora do turno (ver
  Fase 6.5).
- O disparo da rodada só é rolado depois que a janela fecha.

#### Fase 6 — Cálculo do tambor

Antes de sortear a câmara, aplica-se nesta ordem:

1. **Selo de Chumbo**: `+1` bala.
2. **Mínimos forçados**: Maldição sobe até `4/6`; a punição por expiração do
   Boneco Vudú sobe até `5/6`, se estiver abaixo.
3. **`+1` da Roleta de Cabeças**.
4. **Teto do Espectro** (Reaper com exatamente 1 vida): corta em `2/6` —
   **sempre por último**.
5. **Pulso Firme** (Viper): só se o resultado final for **exatamente `1/6`**.

#### Fase 6.5 — Giro imediato da Maldição

A Maldição é a única ativa que **interrompe a rodada**:

1. O alvo gira naquele instante, com o tambor calculado pela Fase 6.
2. Passa pela Fase 7 (disparo) e pela Fase 8 (gatilhos) normalmente.
3. Depois do giro, o tambor do alvo **volta para `1/6`**, dando clique ou não.
4. A rodada continua de onde parou.

#### Fase 7 — Disparo

1. Sorteia a câmara.
2. Bala → dano **1**, ou **2** se o alvo estiver com **Munição Turbinada**.
3. Dano **maior ou igual** às vidas restantes → **Guarda-Costas** intercepta.
4. Aplica a perda de vida e a eliminação.
5. Reset do tambor: `1/6` normal; `3/6` quando o Guarda-Costas absorveu.

#### Fase 8 — Gatilhos pós-disparo

| Gatilho | Condição |
|---|---|
| **Sangue Frio** (Viper) | o giro começou em 4/6 ou 5/6 e ela sobreviveu de verdade |
| **Sede de Sangue** (Reaper) | +1 marca por **BANG**, em qualquer jogador |
| **Munição Turbinada** (Billy) | marca consumida no giro do alvo, **mesmo em clique** |
| **Guarda-Costas** (Don) | consumido ao absorver |

#### Fase 9 — Giro extra

- **Roleta de Cabeças**: o giro da Viper resolve **primeiro**; o do sorteado
  **depois** — mesmo que ela morra no próprio giro.
- O giro extra passa de novo pelas Fases 6, 7 e 8, de forma independente.

#### Fase 10 — Fim da rodada

Eliminações → efeitos vencidos → checagem de fim de jogo → próxima rodada.

Se o Boneco Vudú completar cinco rodadas sem transferir dano, a maldição termina
antes da punição. O Reaper faz um giro forçado com no mínimo `5/6`; esse giro não
transfere dano. O Espectro continua sendo aplicado por último.

### Interações resolvidas

| Situação | Resultado |
|---|---|
| **Munição Turbinada + Guarda-Costas** | dano 2 é fatal → capanga morre, Don fica com 1 vida, tambor `3/6` |
| **Roleta de Cabeças + Guarda-Costas** | se o sorteio cair no Don e o tiro for fatal, o capanga absorve |
| **Maldição + Guarda-Costas** | o giro forçado é normal; se for fatal, o capanga absorve |
| **Boneco Vudú + Munição Turbinada** | se o disparo atingir o Reaper, os 2 danos são transferidos; o amaldiçoado pode ser eliminado com 2 vidas |
| **Boneco Vudú + Guarda-Costas** | se o dano transferido for fatal para o Don, o capanga absorve; a transferência encerra o Boneco |
| **Espectro + Selo de Chumbo** | o teto de `2/6` vence — o Selo não carrega o fantasma |
| **Espectro + Roleta de Cabeças** | o `+1` entra e o teto corta em `2/6` |
| **Espectro + punição do Boneco** | o mínimo de `5/6` é aplicado antes do teto; com 1 vida, o giro fica em `2/6` |
| **Pulso Firme + Selo / Maldição / punição do Boneco** | não se aplica: o giro não começa em `1/6` |
| **Pulso Firme + Roleta sorteando a própria Viper** | não se aplica: ela começa em `2/6` |
| **Marca do Billy em quem morre antes de girar** | a marca é perdida |
| **Reaper pagando 1 vida** | o Espectro liga na hora — o giro dele já sai com teto `2/6` |
| **Guarda-Costas + Pulso Firme** | não interagem — o capanga só protege o Don |
| **7 na mão do Don + empate** | ele vence sozinho; os outros não escolhem alvo |
| **BANG absorvido pelo Guarda-Costas** | conta como BANG para a Sede de Sangue |
| **BANG no próprio Reaper** | conta como BANG para a Sede de Sangue |

---

## Billy — Pistoleiro

### Apresentação — tela de seleção

**Frase de efeito — aparece no card:**

> O melhor atirador do velho oeste, perseguido por um azar que nasceu junto com
> ele.

**Descrição — aparece ao abrir o card:**

Caçador de recompensas do velho oeste. Dizem que nunca errou um tiro — nem
bêbado, nem cercado por três xerifes ao mesmo tempo. A fama chegou cedo, e com
ela veio o azar: sempre que a sorte começa a sorrir, o baralho vira contra ele.
Billy já perdeu cavalo, casa e nome numa única noite de jogo. Aprendeu a não
apostar em nada além do próprio gatilho. A roleta é só mais uma mesa onde ele
chega atrasado e sai devendo.

| Tipo | Habilidade | Efeito resumido |
|---|---|---|
| Passiva | **Mão do Diabo** | Mão inicial de 16 remove 1 bala do tambor |
| Carga | **Azar do Pistoleiro** | 3 estouros seguidos geram 1 ficha |
| Ativa | **Munição Turbinada** | Próximo tiro de um alvo escolhido causa 2 de dano |

### Passiva — Mão do Diabo

- Se a **mão inicial** do Billy somar **exatamente 16**, ele remove **1 bala** do
  próprio tambor.
- Mínimo `1/6` — nunca desce de 1 bala.
- Conta apenas a mão de **duas cartas iniciais**; cartas compradas depois não
  entram na conta.
- **Ás conta como 1.** `Ás + 5` é mão macia e **não** ativa.
- Não precisa de clique e não gasta ficha.

```text
Mão inicial: 10 + 6 = 16 → tambor 3/6 → 2/6
Mão inicial: Ás + 5 = 16 macio → não ativa
Mão inicial: 9 + 7 = 16 → tambor 1/6 → continua 1/6
```

**Por que 16:** é a pior mão inicial do blackjack — qualquer carta 6 ou mais
estoura. Mão baixa (4 a 11) é justamente a mais confortável, então não serve
como gatilho de azar.

**Por que só 16 e não 12–16:** o Billy é escolhido para girar apenas ~8 vezes por
partida. A faixa `12–16` aparece em ~44% das rodadas e removeria ~9 balas no
jogo — mais do que ele é girado, deixando o tambor travado em `1/6` (+54% de
sobrevivência). O `16` exato aparece em ~7% e rende ~1,6 remoções por partida
(+10%), do tamanho certo para uma passiva.

### Carga — Azar do Pistoleiro

Sempre que Billy estourar no Blackjack, ele recebe uma marca.

Ao estourar **3 vezes seguidas**, ganha 1 ficha de habilidade.

A sequência reinicia quando ele:

- vence uma rodada;
- faz Blackjack;
- usa a habilidade.

### Ativa — Munição Turbinada

Billy pode gastar a ficha **quando quiser** e escolher **outro** jogador vivo
(ele não pode marcar a si mesmo).

Na próxima roletada desse jogador:

- se cair em câmara vazia → dá clique e o efeito é consumido;
- se cair em câmara com bala → o jogador sofre **2 de dano** em vez de 1;
- depois da roletada o efeito desaparece.

**Regras:**

- Não acumula duas fichas.
- Não pode ser ativada depois que o tambor começou a girar.
- O alvo precisa ser outro jogador vivo — Billy não pode marcar a si mesmo.
- O alvo deve ser avisado visualmente de que está sob efeito de dano duplo.
- Pode eliminar um jogador que esteja com 2 vidas.

**Exemplo:**

```text
Billy estoura 3 vezes seguidas → ganha ficha
Billy ativa em Don → Don fica marcado
Don vai para a roleta: câmara com bala
Don perde 2 vidas em vez de 1
Efeito consumido
```

---

## Viper — Duquesa

### Apresentação — tela de seleção

**Frase de efeito — aparece no card:**

> A dona do barco-cassino que transforma o próprio risco em caos para a mesa.

**Descrição — aparece ao abrir o card:**

Dona de um barco-cassino que sobe e desce o rio, a Duquesa aprendeu a contar
cartas antes de aprender a ler. Foi traída pelo próprio sócio, enterrada numa
cova rasa e voltou — dizem que com a ajuda de um veneno que ninguém deveria ter
tomado. Hoje ela não joga para ganhar: joga para descobrir até onde os outros
aguentam. Quanto mais perto da morte a mesa chega, mais calma ela fica.

| Tipo | Habilidade | Efeito resumido |
|---|---|---|
| Passiva | **Pulso Firme** | 75% de não subir a bala no `1/6` (1× por vida) |
| Carga | **Sangue Frio** | Sobreviver a um giro iniciado em 4/6 ou 5/6 gera 1 ficha |
| Ativa | **Roleta de Cabeças** | Sorteia um jogador vivo, que ganha +1 bala e roleta |

### Passiva — Pulso Firme

- **Uma vez por vida**, o primeiro giro da Viper que começar exatamente em
  `1/6` tem **75% de chance** de **não** subir a bala.
- Se a sorte falhar, o tambor vai para `2/6` normalmente e o benefício daquela
  vida está encerrado.
- Reseta quando ela **perde uma vida** — volta a valer na vida seguinte.
- Só vale para giros que **começam em `1/6`**. `2/6` ou mais não são afetados.
- O sorteio é **público** e precisa aparecer na tela, os dois resultados.

```text
SANGUE FRIO: a bala não subiu — tambor continua 1/6
SANGUE FRIO: falhou — tambor foi para 2/6
```

**Por que 75% e não 100%:** com 100%, a Viper passaria de 2,77 para 3,77 tiros
por vida (+36%), virando a mais tanque da mesa. Com 75% fica em **3,18 tiros
(+14,5%)** — uma vantagem sentida, mas do tamanho de uma passiva.

**Antissinergia registrada:** segurar o tambor em `1/6` atrasa a carga dela, que
exige sobreviver a um giro iniciado em `4/6` ou `5/6`. É aceitável — ela
sobrevive mais, então uma hora chega lá.

### Carga — Sangue Frio

Viper ganha 1 ficha de Roleta de Cabeças quando:

- for escolhida para atirar em si mesma;
- **sobreviver** a uma roletada que começou em **4/6 ou 5/6**.

Considera-se a chance **antes do disparo**.

**Limitações:**

- Só pode ser conquistada **uma vez por partida**.
- Não exige estar com 1 vida.
- `3/6` ou menos **não** concede a ficha.
- `6/6` não tem como sobreviver, então não concede.
- Não vale se outro efeito impedir o dano — ela precisa sobreviver ao disparo
  de verdade.

**Exemplo:**

```text
Viper em 4/6 → clique → sobrevive → ganha a ficha
O tambor passa normalmente para 5/6
```

### Ativa — Roleta de Cabeças

A ativação é **manual**. Quando é escolhida para girar, abre a janela de
preparação e o botão `ROLETA DE CABEÇAS` aparece no painel dela.

1. Ela clica e gasta a ficha.
2. O sistema sorteia aleatoriamente um jogador vivo.
3. O sorteado **pode ser a própria Viper**.
4. O sorteado recebe **+1 munição**.
5. O giro da Viper resolve primeiro; o do sorteado **depois**.
6. O sorteado gira mesmo que a Viper morra no próprio giro.
7. A ficha é consumida **independentemente** do resultado (bala ou clique).

**Limitações:**

- Se ela **não clicar** na janela, o giro dela acontece normalmente e a ficha
  continua guardada.
- O sorteio inclui a Viper.
- O alvo sorteado deve ser avisado antes do giro.
- A munição adicional não passa de `6/6`.
- Viper **não** escolhe o alvo manualmente.

**Exemplo:**

```text
Viper é escolhida → janela abre → clica no botão
Sorteio → Don (2/6 → 3/6)
Viper gira (1/6) → clique
Don gira (3/6) → clique
```

---

## Zero — Forasteiro

### Apresentação — tela de seleção

**Frase de efeito — aparece no card:**

> O forasteiro que muda as cartas da mesa sem ninguém ver a mão dele passar.

**Descrição — aparece ao abrir o card:**

Ninguém em Raven Hollow sabe de onde ele veio. Chegou num cavalo sem ferradura,
carregando uma caixa de latão cheia de engrenagens que ninguém conseguiu abrir, e
pagou o quarto com moedas de um país que não existe. Não tinha nome — chamaram de
Zero porque foi isso que ele respondeu quando perguntaram. Dizem que ele conversa
com os fios do telégrafo e que sabe qual carta vai sair antes do baralho ser
cortado. Onde o Zero senta, o monte muda de ordem.

| Tipo | Habilidade | Efeito resumido |
|---|---|---|
| Passiva | **Espiada** | Mão inicial 12–16 revela se a próxima carta estoura |
| Carga | **Baralho Marcado** | 1 ficha a cada 5 rodadas (máx 1 guardada) |
| Ativa | **Curto-Circuito** | Troca uma carta com outro jogador (recebe aleatória, entrega escolhida) |

### Passiva — Espiada

Zero dá uma espiada no topo do monte antes de decidir se compra.

Na distribuição, se a mão inicial do Zero somar **entre 12 e 16**, o servidor
reserva silenciosamente a próxima carta para ele (para o aviso nunca mentir).

No card dele aparece, **visível apenas para ele**:

```text
ESPIADA: SEGURA
ESPIADA: PERIGOSA
```

- `SEGURA` = a próxima carta não estoura.
- `PERIGOSA` = a próxima carta estoura.
- Ás nunca conta como perigoso.

**Limitações:**

- Vale apenas para a **primeira compra da rodada**.
- Some depois do primeiro `Hit` ou do `Stand`.
- Fora da faixa 12–16, não aparece nada.

**Chance de estourar por total:**

| Mão | Cartas que estouram | Chance |
|---|---|---|
| 12 | 10, J, Q, K | 31% |
| 13 | 9, 10, J, Q, K | 38% |
| 14 | 8, 9, 10, J, Q, K | 46% |
| 15 | 7, 8, 9, 10, J, Q, K | 54% |
| 16 | 6, 7, 8, 9, 10, J, Q, K | 62% |

### Carga — Baralho Marcado

Zero é o único personagem com carga **recorrente**: ele não precisa de azar nem
de sorte, só de tempo.

- Ganha **1 ficha nas rodadas 5, 10, 15, 20...** — o contador é **fixo** e não
  reinicia depois de um uso.
- Máximo **1 ficha guardada** por vez.
- As rodadas continuam contando mesmo que ele esteja com a ficha cheia — o
  contador não pausa, mas a ficha extra é descartada.
- É o único que pode usar a ativa **mais de uma vez por partida**.

```text
Rodada 5  → 1ª ficha
Rodada 10 → 2ª ficha
Rodada 15 → 3ª ficha
```

### Ativa — Curto-Circuito

Zero provoca um curto entre a própria mão e a de outro jogador, e as cartas se
misturam sem controle.

- Durante a fase de cartas, escolhe **um jogador vivo**.
- **Recebe uma carta aleatória** da mão do alvo.
- **Entrega uma carta escolhida** da própria mão.
- Pode ser usada **mesmo depois de estourar**, desde que a rodada ainda esteja aberta.
- O alvo recebe aviso visual e o log anuncia a troca.
- Quem já parou continua parado — a troca muda a mão, não o direito de agir.
- Os pontos dos dois são recalculados na hora.

**Exemplo:**

```text
Zero: 13 (10 + 3)
Alvo: 20 (10 + 10)

Zero puxa do alvo → carta aleatória = 10
Zero entrega → escolhe o 3
Resultado: Zero 20 / Alvo 13
```

**Por que é equilibrado:** o Zero escolhe **de quem** puxar, mas não **o que**
puxa. A leitura de mesa vira aposta, não execução. E ele pode se sabotar
entregando uma carta boa e recebendo uma ruim.

---

## Don — Chefão

### Apresentação — tela de seleção

**Frase de efeito — aparece no card:**

> O homem que não entra no fogo, porque sempre tem alguém pago para entrar no
> lugar dele.

**Descrição — aparece ao abrir o card:**

Barão de terras e dono da linha do telégrafo, o Don é a lei de Raven Hollow — o
xerife bebe no balcão dele e o juiz dorme na casa dele. Nunca sujou as mãos,
porque sempre existe alguém pago para sujar por ele. Tem uma única superstição:
um sete na mão é o sinal de que o destino está do lado dele. Quando o sete
aparece, o Don não discute o resultado — ele decide quem ganha.

| Tipo | Habilidade | Efeito resumido |
|---|---|---|
| Passiva | **Palavra Final** | Segurando um 7, empates são vitória só do Don |
| Carga | **Sete da Sorte** | 7 na mão inicial gera marca; 2 marcas = ficha |
| Ativa | **Guarda-Costas** | Um capanga morre no lugar dele e o deixa com 1 vida |

### Passiva — Palavra Final

- Enquanto o Don tiver um **7 na mão**, qualquer **empate** é vitória **só
  dele**.
- Os outros jogadores empatados não recebem a vitória naquela rodada.
- Vale para um 7 na mão inicial ou comprado depois.
- Não gasta nada e não precisa de clique.

```text
Don: 19 (7 + 10 + 2) · Viper: 19
Empate → vitória só do Don → ele escolhe o alvo da roleta
```

### Carga — Sete da Sorte

- Se a **mão inicial** do Don tiver um **7**, ele ganha 1 marca.
- O card mostra `SETES 1/2`.
- Com **2 marcas**, ganha a ficha `GUARDA-COSTAS`.
- Máximo **1 ficha por partida**.

**Exemplo:**

```text
Mão inicial: 7 + 9 = 16 → ganha 1 marca
Rodada seguinte: 7 + 4 = 11 → ganha a 2ª marca → ficha do Guarda-Costas
```

### Ativa — Guarda-Costas

O Guarda-Costas é **secreto**: só o Don vê `GUARDA-COSTAS ARMADO` no card.
Ele fica armado indefinidamente até o primeiro disparo que seria **fatal**.

- Não precisa de clique: entra em ação sozinho quando o tiro **mataria** o Don
  (dano maior ou igual às vidas restantes).
- O capanga morre no lugar dele e o Don fica com **1 vida**, independentemente
  do dano recebido.
- O tambor do Don vai para **3/6** em vez de resetar em `1/6`.
- A ficha é consumida. Máximo uma vez por partida.

**Exemplos:**

```text
Don com 1 vida + tiro normal (1 de dano)
→ seria fatal → capanga morre → Don fica com 1 vida → tambor 3/6
```

```text
Don com 2 vidas + Munição Turbinada do Billy (2 de dano)
→ seria fatal → capanga morre → Don fica com 1 vida → tambor 3/6
```

```text
Don com 3 vidas + tiro normal (1 de dano)
→ não é fatal → capanga não entra → Don fica com 2 vidas
```

### Interações

| Situação | Resultado |
|---|---|
| Billy usa Munição Turbinada no Don com 2 vidas | Capanga morre, Don fica com 1 vida |
| Viper sorteia o Don na Roleta de Cabeças | Capanga absorve se o tiro for fatal |
| Don com 3 vidas | O capanga não entra em ação |

**Por que é equilibrado:** ele só escapa quando já estaria morto, e sai da
situação com o tambor em `3/6` — ou seja, volta vivo, mas com ~50% de morrer no
próximo tiro. Não vira tanque, vira segunda chance.

---

## Reaper — Morto-Vivo

### Apresentação — tela de seleção

**Frase de efeito — aparece no card:**

> O meio-morto que fica mais perigoso a cada passo rumo ao próprio fim.

**Descrição — aparece ao abrir o card:**

O coveiro de Raven Hollow já abriu a cova dele três vezes, e três vezes a cova
amanheceu vazia. Ninguém sabe se ele está vivo. Metade dele já foi embora — o
resto se recusa a ir. Quanto mais perto da terra ele chega, mais forte fica, como
se a morte não soubesse o que fazer com ele. Os outros jogadores aprenderam que a
única hora segura para enfrentá-lo é quando ele ainda está inteiro.

| Tipo | Habilidade | Efeito resumido |
|---|---|---|
| Passiva | **Espectro** | Com 1 vida, o tambor nunca passa de 2/6 |
| Carga | **Sede de Sangue** | 3 BANGs = 1 ficha (máx 1 guardada) |
| Ativa | **Sangue por Sangue** | Paga 1 vida (precisa ter 2+) e 1 ficha para escolher uma maldição |

### Passiva — Espectro

- Enquanto o Reaper estiver com **exatamente 1 vida**, o tambor dele **nunca
  passa de 2/6**.
- Não é escudo: o tiro acontece normalmente, ele só fica menos carregado.
- Com 2 ou 3 vidas, não faz nada.

**Comparação de risco (começando em 1/6):**

| Regra | Tiros esperados até morrer |
|---|---|
| Sem passiva | 2,77 |
| Teto em 3/6 | 2,94 |
| **Teto em 2/6** | **3,50** |
| Teto em 1/6 | 6,00 |

### Carga — Sede de Sangue

- Cada **BANG** em qualquer jogador dá 1 marca ao Reaper.
- Conta **todo BANG**: inclusive o que o Guarda-Costas absorve e o que acerta o
  próprio Reaper.
- Com **3 marcas**, ganha a ficha de `Sangue por Sangue`.
- Máximo **1 ficha guardada por vez**.
- O limite real de uso é a vida dele: ele só consegue usar duas vezes na partida
  (3 vidas → 2 → 1).

### Ativa — Sangue por Sangue

- Custa **1 vida e 1 ficha** e exige ter **2 ou mais vidas**.
- Escolhe **um dos três modos** abaixo.
- Só pode ser usada antes de o tambor começar a girar.

#### Modo 1 — Maldição

O alvo é forçado a girar **na hora**, com no mínimo 4/6.

- O giro é **imediato**: acontece no mesmo instante da ativação, como um tiro
  extra fora do turno, e interrompe a rodada até terminar.
- Depois desse giro, o tambor volta para `1/6`, dando clique ou não.
- É um golpe único, sem deixar marca permanente.

```text
Alvo em 1/6 → gira em 4/6 → clique → tambor volta para 1/6
```

#### Modo 2 — Selo de Chumbo

Até o fim da partida, **todo giro do alvo começa com +1 bala**.

```text
Normal:     1/6 → 2/6 → 3/6 → 4/6 → 5/6 → 6/6
Selo:       2/6 → 3/6 → 4/6 → 5/6 → 6/6
```

- O alvo nunca mais vê `1/6`.
- Tiros esperados até perder 1 vida: **2,77 → 2,13** (~23% menos).

#### Modo 3 — Boneco Vudú

Quando o Reaper for escolhido para girar, ele pode pagar **1 vida e 1 ficha** e
amaldiçoar outro jogador vivo. A rodada em que a habilidade é ativada conta como
a primeira das cinco rodadas do prazo. A ativação não acrescenta munição ao
tambor do Reaper.

Durante o prazo, se um disparo atingir o Reaper, o dano exato daquele disparo é
transferido para o jogador amaldiçoado. O Reaper não perde vida nesse disparo, e
o Boneco termina depois da transferência. Se o dano transferido for fatal para o
Don, o Guarda-Costas pode absorvê-lo normalmente. Munição Turbinada transfere
seus **2 danos** completos e pode eliminar um amaldiçoado com 2 vidas.

Se nenhum disparo for transferido até o fim da quinta rodada, a maldição termina
antes de o Reaper fazer um giro forçado com **no mínimo 5/6**. Esse giro não pode
transferir dano. O Espectro continua valendo: com 1 vida, o teto de `2/6` reduz
a chance efetiva do giro de punição.

```text
Reaper é escolhido para girar (2 vidas)
→ paga 1 vida e 1 ficha; amaldiçoa Don (rodada 1/5)
→ um BANG atinge o Reaper e transfere 1 dano ao Don
→ o Boneco termina; o Reaper não perde vida
```

### Interações

| Situação | Resultado |
|---|---|
| Reaper com 1 vida usando Sangue por Sangue | Não pode — exige 2 ou mais |
| Selo de Chumbo + Espectro | Não se aplicam juntos (são de personagens diferentes) |
| Reaper com 1 vida na punição do Boneco | O mínimo de `5/6` é aplicado e depois o Espectro limita o giro a `2/6` |
| Punição do Boneco | A maldição termina antes do giro; o tiro forçado nunca transfere dano |

---

## Interface do jogo

### Regra geral

- O jogador **sempre** vê o resumo das três partes do próprio personagem —
  passiva, carga e ativa — do início ao fim da partida.
- O texto é curto: **uma linha por parte**, no máximo duas.
- A descrição completa fica a um clique (ou hover) de distância.
- As habilidades dos **outros** jogadores ficam visíveis como chips no assento,
  não como texto.

### Tela de seleção

Cada card de personagem mostra, de cima para baixo:

1. retrato, nome e papel (`Pistoleiro`, `Duquesa`, `Forasteiro`, `Chefão`, `Morto-Vivo`);
   o papel é só exibição — o id interno do Zero continua `cyber` no código;
2. a **frase de efeito** — uma linha, a manchete do personagem;
3. a **tabela de habilidades** com uma linha para cada parte;
4. um botão **`Ver detalhes`**.

Ao abrir `Ver detalhes`, o card expande e mostra:

- a **descrição** completa — a historinha da seção do personagem neste documento;
- o texto completo de cada habilidade (passiva, carga e ativa).

Os cinco cards aparecem lado a lado, para comparação direta.

### Durante a partida — Painel de Habilidade

Painel fixo do jogador (canto inferior esquerdo no desktop, barra recolhível no
celular):

```text
┌──────────────────────────────────┐
│ BILLY — Pistoleiro               │
│                                  │
│ MÃO DO DIABO                     │
│ Mão inicial 16 → −1 bala         │
│                                  │
│ AZAR DO PISTOLEIRO               │
│ Estouros seguidos: ●●○  1/3      │
│                                  │
│ MUNIÇÃO TURBINADA                │
│ Ficha pronta          [ Usar ]   │
└──────────────────────────────────┘
```

- A linha da **passiva** fica sempre visível — é o efeito que nunca desliga.
- A **carga** mostra o progresso em marcas e uma barra (`●●○`).
- A **ativa** mostra o estado da ficha: `pronta`, `vazia` ou `armada`.
- Quando a ativa está pronta, o botão acende; quando não está, fica apagado com
  o motivo (`Sem ficha`).
- Quando o efeito já está aplicado em alguém, o painel troca a linha por
  `EFEITO ATIVO: Don está marcado`.
- O painel nunca cobre o tambor nem os assentos.
- No celular ele começa recolhido em uma aba com o nome do personagem, mas o
  resumo da **passiva** continua visível na aba fechada.

### No assento do jogador

Versão reduzida, visível para todos:

- nome do personagem sempre visível;
- chips de estado: `SETES 1/2`, `SELO`, `MARCADO`, `AMALDIÇOADO 5/5`, `MARCA 2/3`;
- `GUARDA-COSTAS ARMADO` aparece **só no card do Don**.

### Avisos de alvo

- O alvo de qualquer habilidade recebe destaque visual na hora.
- O log anuncia a ativação, o alvo e o resultado.
- Ativações e sorteios mostram o alvo, o resultado e o prazo na tela; o estado
  do Boneco Vudú é público.

### Textos curtos (para implementação)

| Personagem | Passiva | Carga | Ativa |
|---|---|---|---|
| **Billy** | Mão inicial 16 → −1 bala | 3 estouros seguidos = ficha | Marca um alvo: o próximo tiro dele causa 2 de dano |
| **Viper** | 75% de não subir a bala no 1/6 (1× por vida) | Sobreviver a um giro em 4/6 ou 5/6 = ficha | Sorteia alguém: +1 bala e roleta |
| **Zero** | Mão inicial 12–16 revela a próxima carta | 1 ficha a cada 5 rodadas | Troca uma carta com um alvo |
| **Don** | Com um 7 na mão, empate é vitória sua | 7 na mão inicial = marca (2 = ficha) | Capanga morre no seu lugar, você fica com 1 vida |
| **Reaper** | Com 1 vida, o tambor nunca passa de 2/6 | 3 BANGs = ficha | Paga 1 vida e 1 ficha: Maldição, Selo de Chumbo ou Boneco Vudú |

---

## Assets necessários

Todos no estilo pixel art dos sprites atuais, paleta **Sweetie16**, fundo
transparente, sem antialias.

A especificação completa de cada sprite — grade, cores, composição, frames e
prompt pronto em inglês — está em **`SPRITES.md`**.

### Essenciais

| Arquivo | Tamanho | Onde aparece | O que é |
|---|---|---|---|
| `icon_ficha.png` | 64×64 | painel + assento | ficha da ativa (bala de latão em pé) |
| `icon_marca.png` | 32×32 | painel + assento | marcador de progresso (projétil deitado) |
| `icon_status_marcado.png` | 32×32 | assento | alvo marcado pela Munição Turbinada (mira) |
| `icon_status_setes.png` | 32×32 | assento | marcas do Don (um 7 estilizado) |
| `icon_status_guarda.png` | 32×32 | painel do Don | Guarda-Costas armado (silhueta de capanga) |
| `icon_status_selo.png` | 32×32 | assento | Selo de Chumbo ativo (lacre de chumbo) |
| `icon_status_espectro.png` | 32×32 | assento | Espectro ativo (fantasma) |
| `icon_status_sangue.png` | 32×32 | assento | marcas da Sede de Sangue (gota) |
| `target_reticle.png` | 128×128 | palco | mira sobre o alvo escolhido |
| `fx_guarda.gif` | 128×128 | palco | capanga entra na frente do tiro e cai |

Os estados "vazio / gasto" não precisam de sprite novo: o mesmo PNG com
`filter: grayscale(1)` e `opacity` resolve.

### Opcionais

| Arquivo | Tamanho | Uso |
|---|---|---|
| `portrait_<skin>.png` (5) | 256×256 | busto grande no card de seleção |
| `abil_<skin>_<tipo>.png` (15) | 64×64 | ícone por habilidade (passiva / carga / ativa) |
| `fx_municao.gif` | 128×128 | ativação da Munição Turbinada |
| `fx_roletas.gif` | 128×128 | ativação da Roleta de Cabeças |
| `fx_curto.gif` | 128×128 | ativação do Curto-Circuito |
| `fx_maldicao.gif` | 128×128 | Maldição do Reaper |
| `fx_selo.gif` | 128×128 | Selo de Chumbo sendo aplicado |
| `fx_boneco.gif` | 128×128 | Boneco Vudú |
| `fx_espiada_segura.png` | 32×32 | aviso `ESPIADA: SEGURA` |
| `fx_espiada_perigosa.png` | 32×32 | aviso `ESPIADA: PERIGOSA` |
| `bg_select.png` | 512×288 | fundo da tela de seleção |

### O que não precisa de sprite novo

- Tambor: `Tambor-1M` a `Tambor-6M` já cobrem todos os estados, inclusive teto e
  mínimo.
- Personagens: `idle`, `aim`, `hit`, `dead`, `shoot` e o `idle.gif` já existem.
- Cartas, fichas de aposta, corações, revólver, coroa e mesa: já existem.
- Painéis, botões, barras e brilhos: CSS.

---

## Resumo geral

| Personagem | Passiva | Carga | Ativa | Status |
|---|---|---|---|---|
| **Billy** | Mão do Diabo | Azar do Pistoleiro | Munição Turbinada | ✅ Definido |
| **Viper** | Pulso Firme | Sangue Frio | Roleta de Cabeças | ✅ Definido |
| **Zero** | Espiada | Baralho Marcado | Curto-Circuito | ✅ Definido |
| **Don** | Palavra Final | Sete da Sorte | Guarda-Costas | ✅ Definido |
| **Reaper** | Espectro | Sede de Sangue | Sangue por Sangue | ✅ Definido |

---

## Implementação

A ordem de resolução está definida. A integração do modo online está em
andamento em `server.py`, `online.js`, `index.html` e `style.css`. O Boneco Vudú
segue a regra de transferência de dano durante cinco rodadas e a punição por
expiração descritas acima.
