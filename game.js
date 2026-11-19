/**
 * Pixel Blackjack 21 — Complete 6-Deck Blackjack Engine
 */
(function (global) {
  "use strict";

  const AudioFX = global.RetroAudio;

  const SUITS = [
    { id: "spade", name: "Espadas", color: "black", icon: "assets/suit_spade.png" },
    { id: "heart", name: "Copas", color: "red", icon: "assets/suit_heart.png" },
    { id: "diamond", name: "Ouros", color: "red", icon: "assets/suit_diamond.png" },
    { id: "club", name: "Paus", color: "black", icon: "assets/suit_club.png" },
  ];

  const RANKS = [
    { rank: "A", value: 11, royal: null },
    { rank: "2", value: 2, royal: null },
    { rank: "3", value: 3, royal: null },
    { rank: "4", value: 4, royal: null },
    { rank: "5", value: 5, royal: null },
    { rank: "6", value: 6, royal: null },
    { rank: "7", value: 7, royal: null },
    { rank: "8", value: 8, royal: null },
    { rank: "9", value: 9, royal: null },
    { rank: "10", value: 10, royal: null },
    { rank: "J", value: 10, royal: "assets/royal_j.png" },
    { rank: "Q", value: 10, royal: "assets/royal_q.png" },
    { rank: "K", value: 10, royal: "assets/royal_k.png" },
  ];

  const CHIP_DENOMS = [
    { val: 500, img: "assets/chip_500.png" },
    { val: 100, img: "assets/chip_100.png" },
    { val: 50, img: "assets/chip_50.png" },
    { val: 25, img: "assets/chip_25.png" },
    { val: 10, img: "assets/chip_10.png" },
  ];

  const STORAGE_KEY = "pixel_blackjack_save_v1";

  const state = {
    phase: "MENU", // MENU | BETTING | DEALING | INSURANCE | PLAYER_TURN | DEALER_TURN | RESOLVE
    startingBankroll: 1000,
    bankroll: 1000,
    bestBankroll: 1000,
    streak: 0,
    currentBet: 0,
    lastBet: 0,
    insuranceBet: 0,
    shoe: [],
    dealerHand: [],
    dealerHoleHidden: true,
    playerHands: [], // [{ cards: [], bet: number, doubled: false, splitAces: false, result: null }]
    activeHandIndex: 0,
    bgmOn: true,
    sfxOn: true,
  };

  // DOM References
  const el = {
    mainMenu: document.getElementById("main-menu"),
    tableScreen: document.getElementById("table-screen"),
    rulesModal: document.getElementById("rules-modal"),

    btnStartGame: document.getElementById("btn-start-game"),
    btnContinueGame: document.getElementById("btn-continue-game"),
    savedBankrollLabel: document.getElementById("saved-bankroll-label"),
    btnMenuRules: document.getElementById("btn-menu-rules"),
    btnMenuBgm: document.getElementById("btn-menu-bgm"),
    btnMenuSfx: document.getElementById("btn-menu-sfx"),
    bankrollPills: Array.from(document.querySelectorAll(".mode-pill")),

    btnBackMenu: document.getElementById("btn-back-menu"),
    btnTableRules: document.getElementById("btn-table-rules"),
    btnCloseRules: document.getElementById("btn-close-rules"),
    btnTableBgm: document.getElementById("btn-table-bgm"),
    btnTableSfx: document.getElementById("btn-table-sfx"),

    hudBankroll: document.getElementById("hud-bankroll"),
    hudBet: document.getElementById("hud-bet"),
    hudStreak: document.getElementById("hud-streak"),
    hudBest: document.getElementById("hud-best"),
    hudShoe: document.getElementById("hud-shoe"),

    dealerSprite: document.getElementById("dealer-sprite"),
    dealerSpeech: document.getElementById("dealer-speech"),
    dealerScore: document.getElementById("dealer-score"),
    dealerCards: document.getElementById("dealer-cards"),

    statusBanner: document.getElementById("status-banner"),
    betPotValue: document.getElementById("bet-pot-value"),
    betPotChips: document.getElementById("bet-pot-chips"),

    playerHandsWrapper: document.getElementById("player-hands-wrapper"),

    bettingControls: document.getElementById("betting-controls"),
    insuranceControls: document.getElementById("insurance-controls"),
    turnControls: document.getElementById("turn-controls"),
    resolveControls: document.getElementById("resolve-controls"),

    chipButtons: Array.from(document.querySelectorAll(".chip-btn")),
    btnClearBet: document.getElementById("btn-clear-bet"),
    btnRebet: document.getElementById("btn-rebet"),
    btnAllIn: document.getElementById("btn-all-in"),
    btnDeal: document.getElementById("btn-deal"),
    btnRebuy: document.getElementById("btn-rebuy"),

    insuranceCost: document.getElementById("insurance-cost"),
    btnInsureYes: document.getElementById("btn-insure-yes"),
    btnInsureNo: document.getElementById("btn-insure-no"),

    btnHit: document.getElementById("btn-hit"),
    btnStand: document.getElementById("btn-stand"),
    btnDouble: document.getElementById("btn-double"),
    btnSplit: document.getElementById("btn-split"),

    btnPlayAgain: document.getElementById("btn-play-again"),
    btnNewBet: document.getElementById("btn-new-bet"),
  };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function persistSave() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          bankroll: state.bankroll,
          bestBankroll: state.bestBankroll,
          streak: state.streak,
          bgmOn: state.bgmOn,
          sfxOn: state.sfxOn,
        })
      );
    } catch (_) {}
  }

  function buildShoe(decks = 6) {
    const cards = [];
    for (let d = 0; d < decks; d++) {
      for (const s of SUITS) {
        for (const r of RANKS) {
          cards.push({
            rank: r.rank,
            value: r.value,
            royal: r.royal,
            suit: s,
          });
        }
      }
    }
    // Fisher-Yates shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function ensureShoe() {
    if (state.shoe.length < 52) {
      state.shoe = buildShoe(6);
      setSpeech("Embaralhando 6 novos baralhos no sabot!");
    }
  }

  function drawCard() {
    ensureShoe();
    return state.shoe.pop();
  }

  function scoreHand(cards) {
    let total = 0;
    let aces = 0;
    for (const c of cards) {
      total += c.value;
      if (c.rank === "A") aces += 1;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    const isSoft = aces > 0;
    const isBlackjack = cards.length === 2 && total === 21;
    return { total, isSoft, isBlackjack, isBust: total > 21 };
  }

  function triggerDealerDealAnim() {
    el.dealerSprite.src = "assets/dealer_deal.png";
    setTimeout(() => {
      el.dealerSprite.src = "assets/dealer.gif";
    }, 340);
  }

  function setSpeech(text) {
    el.dealerSpeech.textContent = text;
  }

  function setBanner(text, variant = "") {
    el.statusBanner.textContent = text;
    el.statusBanner.className = "status-banner" + (variant ? " " + variant : "");
  }

  function updateAudioButtons() {
    const bgmTxt = state.bgmOn ? "ON" : "OFF";
    const sfxTxt = state.sfxOn ? "ON" : "OFF";
    el.btnMenuBgm.textContent = `MÚSICA: ${bgmTxt}`;
    el.btnMenuSfx.textContent = `SONS: ${sfxTxt}`;
    el.btnTableBgm.textContent = `BGM: ${bgmTxt}`;
    el.btnTableSfx.textContent = `SFX: ${sfxTxt}`;

    el.btnMenuBgm.classList.toggle("btn-green", state.bgmOn);
    el.btnMenuBgm.classList.toggle("btn-slate", !state.bgmOn);
    el.btnTableBgm.classList.toggle("btn-green", state.bgmOn);
    el.btnTableBgm.classList.toggle("btn-slate", !state.bgmOn);

    el.btnMenuSfx.classList.toggle("btn-green", state.sfxOn);
    el.btnMenuSfx.classList.toggle("btn-slate", !state.sfxOn);
    el.btnTableSfx.classList.toggle("btn-green", state.sfxOn);
    el.btnTableSfx.classList.toggle("btn-slate", !state.sfxOn);
  }

  function renderCardEl(card, hidden = false) {
    const wrap = document.createElement("div");
    wrap.className = "card";

    if (hidden) {
      const img = document.createElement("img");
      img.src = "assets/card_back.png";
      img.alt = "Carta virada";
      img.className = "pixel-img card-back-img";
      wrap.appendChild(img);
      return wrap;
    }

    const face = document.createElement("div");
    face.className = `card-face ${card.suit.color}`;

    const topCorner = document.createElement("div");
    topCorner.className = "card-corner";
    topCorner.innerHTML = `<span class="card-rank">${card.rank}</span><img src="${card.suit.icon}" alt="" class="pixel-img card-mini-suit" />`;

    const center = document.createElement("div");
    center.className = "card-center-art";
    const centerImg = document.createElement("img");
    centerImg.src = card.royal ? card.royal : card.suit.icon;
    centerImg.alt = `${card.rank} de ${card.suit.name}`;
    centerImg.className = "pixel-img";
    center.appendChild(centerImg);

    const botCorner = document.createElement("div");
    botCorner.className = "card-corner bottom";
    botCorner.innerHTML = `<span class="card-rank">${card.rank}</span><img src="${card.suit.icon}" alt="" class="pixel-img card-mini-suit" />`;

    face.appendChild(topCorner);
    face.appendChild(center);
    face.appendChild(botCorner);
    wrap.appendChild(face);
    return wrap;
  }

  function renderBetChips(amount) {
    el.betPotValue.textContent = `$${amount}`;
    el.betPotChips.innerHTML = "";
    let rem = amount;
    let count = 0;
    for (const d of CHIP_DENOMS) {
      while (rem >= d.val && count < 8) {
        const img = document.createElement("img");
        img.src = d.img;
        img.alt = `$${d.val}`;
        img.className = "pixel-img";
        el.betPotChips.appendChild(img);
        rem -= d.val;
        count++;
      }
    }
  }

  function renderTable() {
    if (state.bankroll > state.bestBankroll) {
      state.bestBankroll = state.bankroll;
      persistSave();
    }

    const totalBetOnTable =
      state.phase === "BETTING"
        ? state.currentBet
        : state.playerHands.reduce((acc, h) => acc + h.bet, 0);

    el.hudBankroll.textContent = `$${state.bankroll}`;
    el.hudBet.textContent = `$${totalBetOnTable}`;
    el.hudStreak.textContent = `${state.streak}`;
    el.hudBest.textContent = `$${state.bestBankroll}`;
    el.hudShoe.textContent = `${state.shoe.length}`;

    renderBetChips(totalBetOnTable);

    // Dealer cards & score
    el.dealerCards.innerHTML = "";
    state.dealerHand.forEach((c, idx) => {
      const hide = idx === 1 && state.dealerHoleHidden;
      el.dealerCards.appendChild(renderCardEl(c, hide));
    });

    if (state.dealerHand.length === 0) {
      el.dealerScore.textContent = "0";
      el.dealerScore.className = "score-badge";
    } else if (state.dealerHoleHidden) {
      const visibleVal = state.dealerHand[0].value;
      el.dealerScore.textContent = `${visibleVal} + ?`;
      el.dealerScore.className = "score-badge";
    } else {
      const ds = scoreHand(state.dealerHand);
      el.dealerScore.textContent = ds.isBlackjack && !state.dealerHoleHidden ? "21 BJ!" : `${ds.total}`;
      el.dealerScore.className = "score-badge" + (ds.isBust ? " bust" : ds.isBlackjack ? " bj" : "");
    }

    // Player hands
    el.playerHandsWrapper.innerHTML = "";
    if (state.playerHands.length === 0) {
      const emptySlot = document.createElement("div");
      emptySlot.className = "hand-slot";
      emptySlot.innerHTML = `
        <div class="zone-label-row">
          <span class="zone-title">SUA MÃO</span>
          <span class="score-badge">0</span>
        </div>
        <div class="cards-row"></div>
      `;
      el.playerHandsWrapper.appendChild(emptySlot);
    } else {
      state.playerHands.forEach((hand, idx) => {
        const slot = document.createElement("div");
        const isCurrent = state.phase === "PLAYER_TURN" && idx === state.activeHandIndex;
        slot.className = "hand-slot" + (isCurrent ? " active-hand" : "");

        const sc = scoreHand(hand.cards);
        let badgeTxt = `${sc.total}`;
        let badgeCls = "score-badge";
        if (sc.isBlackjack && !hand.isSplitHand) {
          badgeTxt = "21 BLACKJACK!";
          badgeCls += " bj";
        } else if (sc.isBust) {
          badgeTxt = `${sc.total} ESTOUROU`;
          badgeCls += " bust";
        } else if (sc.isSoft) {
          badgeTxt = `${sc.total} (SOFT)`;
        }

        const labelPrefix = state.playerHands.length > 1 ? `MÃO ${idx + 1} ($${hand.bet})` : "SUA MÃO";
        const resultTag = hand.resultLabel ? ` • ${hand.resultLabel}` : "";

        const header = document.createElement("div");
        header.className = "zone-label-row";
        header.innerHTML = `<span class="zone-title">${labelPrefix}${resultTag}</span><span class="${badgeCls}">${badgeTxt}</span>`;

        const cardsRow = document.createElement("div");
        cardsRow.className = "cards-row";
        hand.cards.forEach((c) => cardsRow.appendChild(renderCardEl(c, false)));

        slot.appendChild(header);
        slot.appendChild(cardsRow);
        el.playerHandsWrapper.appendChild(slot);
      });
    }

    // Controls visibility & states
    el.bettingControls.classList.toggle("hidden", state.phase !== "BETTING");
    el.insuranceControls.classList.toggle("hidden", state.phase !== "INSURANCE");
    el.turnControls.classList.toggle("hidden", state.phase !== "PLAYER_TURN");
    el.resolveControls.classList.toggle("hidden", state.phase !== "RESOLVE");

    if (state.phase === "BETTING") {
      el.chipButtons.forEach((btn) => {
        const val = Number(btn.dataset.chip);
        btn.disabled = state.bankroll < val;
      });
      el.btnClearBet.disabled = state.currentBet === 0;
      el.btnRebet.disabled = state.lastBet === 0 || state.bankroll + state.currentBet < state.lastBet;
      el.btnAllIn.disabled = state.bankroll === 0;
      el.btnDeal.disabled = state.currentBet === 0;
      el.btnRebuy.classList.toggle("hidden", state.bankroll > 0 || state.currentBet > 0);
    }

    if (state.phase === "PLAYER_TURN") {
      const hand = state.playerHands[state.activeHandIndex];
      const canDouble = hand && hand.cards.length === 2 && state.bankroll >= hand.bet;
      const canSplit =
        hand &&
        state.playerHands.length === 1 &&
        hand.cards.length === 2 &&
        hand.cards[0].value === hand.cards[1].value &&
        state.bankroll >= hand.bet;

      el.btnHit.disabled = false;
      el.btnStand.disabled = false;
      el.btnDouble.disabled = !canDouble;
      el.btnSplit.disabled = !canSplit;
    }

    if (state.phase === "RESOLVE") {
      el.btnPlayAgain.disabled = state.lastBet === 0 || state.bankroll < state.lastBet;
    }
  }

  function enterMenu() {
    state.phase = "MENU";
    const save = loadSave();
    if (save && typeof save.bankroll === "number" && save.bankroll > 0) {
      el.btnContinueGame.classList.remove("hidden");
      el.savedBankrollLabel.textContent = `$${save.bankroll}`;
    } else {
      el.btnContinueGame.classList.add("hidden");
    }
    el.mainMenu.classList.remove("hidden");
    el.tableScreen.classList.add("hidden");
  }

  function startGame(useSaved) {
    AudioFX.ensureContext();
    AudioFX.playClick();
    if (state.bgmOn) AudioFX.startBgm();

    const save = useSaved ? loadSave() : null;
    if (save && typeof save.bankroll === "number" && save.bankroll > 0) {
      state.bankroll = save.bankroll;
      state.bestBankroll = Math.max(save.bestBankroll || save.bankroll, save.bankroll);
      state.streak = save.streak || 0;
    } else {
      state.bankroll = state.startingBankroll;
      state.bestBankroll = Math.max(state.bestBankroll, state.startingBankroll);
      state.streak = 0;
    }

    state.currentBet = 0;
    state.lastBet = 0;
    state.dealerHand = [];
    state.playerHands = [];
    state.shoe = buildShoe(6);
    state.phase = "BETTING";

    el.mainMenu.classList.add("hidden");
    el.tableScreen.classList.remove("hidden");

    setBanner("FAÇA SUA APOSTA");
    setSpeech("Mesa aberta! Clique nas fichas para apostar.");
    persistSave();
    renderTable();
  }

  function addChip(val) {
    if (state.phase !== "BETTING" || state.bankroll < val) return;
    AudioFX.playChip();
    state.bankroll -= val;
    state.currentBet += val;
    renderTable();
  }

  function clearBet() {
    if (state.phase !== "BETTING" || state.currentBet === 0) return;
    AudioFX.playClick();
    state.bankroll += state.currentBet;
    state.currentBet = 0;
    renderTable();
  }

  function rebet() {
    if (state.phase !== "BETTING" || state.lastBet <= 0) return;
    const available = state.bankroll + state.currentBet;
    if (available < state.lastBet) return;
    AudioFX.playChip();
    state.bankroll = available - state.lastBet;
    state.currentBet = state.lastBet;
    renderTable();
  }

  function allIn() {
    if (state.phase !== "BETTING" || state.bankroll <= 0) return;
    AudioFX.playChip();
    state.currentBet += state.bankroll;
    state.bankroll = 0;
    setSpeech("All-in! Agora ficou emocionante!");
    renderTable();
  }

  function rebuy() {
    AudioFX.playWin();
    state.bankroll = 1000;
    state.currentBet = 0;
    state.streak = 0;
    setSpeech("Banca recarregada com $1000! Boa sorte!");
    setBanner("FAÇA SUA APOSTA");
    persistSave();
    renderTable();
  }

  async function startDeal() {
    if (state.phase !== "BETTING" || state.currentBet <= 0) return;
    state.phase = "DEALING";
    state.lastBet = state.currentBet;
    state.insuranceBet = 0;
    state.dealerHand = [];
    state.dealerHoleHidden = true;
    state.playerHands = [
      {
        cards: [],
        bet: state.currentBet,
        doubled: false,
        isSplitHand: false,
        resultLabel: "",
      },
    ];
    state.currentBet = 0;
    state.activeHandIndex = 0;

    setBanner("DISTRIBUINDO CARTAS...");
    setSpeech("Lá vão as cartas!");
    renderTable();

    // Deal 4 cards sequentially with audio & dealer animation
    const sequence = [
      () => state.playerHands[0].cards.push(drawCard()),
      () => state.dealerHand.push(drawCard()),
      () => state.playerHands[0].cards.push(drawCard()),
      () => state.dealerHand.push(drawCard()),
    ];

    for (const step of sequence) {
      triggerDealerDealAnim();
      AudioFX.playCardDeal();
      step();
      renderTable();
      await sleep(230);
    }

    const playerScore = scoreHand(state.playerHands[0].cards);
    const dealerUp = state.dealerHand[0];

    // Check Insurance offer if Dealer shows Ace and player didn't already bust/etc.
    const insCost = Math.floor(state.playerHands[0].bet / 2);
    if (dealerUp.rank === "A" && state.bankroll >= insCost && insCost > 0) {
      state.phase = "INSURANCE";
      el.insuranceCost.textContent = `$${insCost}`;
      setBanner("DESEJA FAZER SEGURO?");
      setSpeech("Tenho um Ás! Quer fazer seguro contra Blackjack?");
      renderTable();
      return;
    }

    await checkInitialBlackjacks(playerScore);
  }

  async function handleInsurance(take) {
    if (state.phase !== "INSURANCE") return;
    const insCost = Math.floor(state.playerHands[0].bet / 2);
    if (take && state.bankroll >= insCost) {
      AudioFX.playInsurance();
      state.bankroll -= insCost;
      state.insuranceBet = insCost;
      setSpeech(`Seguro de $${insCost} aceito! Conferindo carta oculta...`);
    } else {
      AudioFX.playClick();
      setSpeech("Sem seguro! Conferindo carta oculta...");
    }

    state.phase = "DEALING";
    renderTable();
    await sleep(350);

    const playerScore = scoreHand(state.playerHands[0].cards);
    await checkInitialBlackjacks(playerScore);
  }

  async function checkInitialBlackjacks(playerScore) {
    const dealerScore = scoreHand(state.dealerHand);

    if (dealerScore.isBlackjack || playerScore.isBlackjack) {
      state.dealerHoleHidden = false;
      AudioFX.playCardFlip();
      renderTable();
      await sleep(300);

      // Pay insurance if dealer has Blackjack
      if (dealerScore.isBlackjack && state.insuranceBet > 0) {
        const insPayout = state.insuranceBet * 3; // original stake + 2:1
        state.bankroll += insPayout;
      }

      if (playerScore.isBlackjack && dealerScore.isBlackjack) {
        state.bankroll += state.playerHands[0].bet;
        state.playerHands[0].resultLabel = "EMPATE";
        AudioFX.playPush();
        setBanner("EMPATE DE BLACKJACK!", "push");
        setSpeech("Nós dois fizemos Blackjack! Aposta devolvida.");
      } else if (playerScore.isBlackjack) {
        const payout = Math.floor(state.playerHands[0].bet * 2.5);
        state.bankroll += payout;
        state.streak += 1;
        state.playerHands[0].resultLabel = "BLACKJACK 3:2";
        AudioFX.playBlackjack();
        setBanner("BLACKJACK! VOCÊ VENCEU 3:2!", "bj");
        setSpeech("Incrível! Blackjack natural paga 3 para 2!");
      } else {
        state.streak = 0;
        state.playerHands[0].resultLabel = "BANCA BLACKJACK";
        AudioFX.playBust();
        setBanner("DEALER FEZ BLACKJACK!", "lose");
        setSpeech(
          state.insuranceBet > 0
            ? "Fiz Blackjack, mas seu seguro pagou 2:1!"
            : "Blackjack da banca! Mais sorte na próxima."
        );
      }

      state.phase = "RESOLVE";
      persistSave();
      renderTable();
      return;
    }

    if (state.insuranceBet > 0) {
      setSpeech("Não tenho Blackjack! Agora é a sua vez.");
    } else {
      setSpeech("Sua vez! Pedir carta, parar, dobrar ou dividir?");
    }
    state.phase = "PLAYER_TURN";
    setBanner("SUA VEZ");
    renderTable();
  }

  async function hit() {
    if (state.phase !== "PLAYER_TURN") return;
    const hand = state.playerHands[state.activeHandIndex];
    triggerDealerDealAnim();
    AudioFX.playCardDeal();
    hand.cards.push(drawCard());
    renderTable();

    const sc = scoreHand(hand.cards);
    if (sc.isBust) {
      AudioFX.playBust();
      hand.resultLabel = "ESTOUROU";
      setSpeech("Passou de 21! Estourou essa mão.");
      await sleep(320);
      await advanceHandOrDealer();
    } else if (sc.total === 21) {
      setSpeech("Cravou 21!");
      await sleep(280);
      await advanceHandOrDealer();
    }
  }

  async function stand() {
    if (state.phase !== "PLAYER_TURN") return;
    AudioFX.playClick();
    await advanceHandOrDealer();
  }

  async function doubleDown() {
    if (state.phase !== "PLAYER_TURN") return;
    const hand = state.playerHands[state.activeHandIndex];
    if (hand.cards.length !== 2 || state.bankroll < hand.bet) return;

    AudioFX.playChip();
    state.bankroll -= hand.bet;
    hand.bet *= 2;
    hand.doubled = true;
    renderTable();

    await sleep(160);
    triggerDealerDealAnim();
    AudioFX.playCardDeal();
    hand.cards.push(drawCard());
    renderTable();

    const sc = scoreHand(hand.cards);
    if (sc.isBust) {
      AudioFX.playBust();
      hand.resultLabel = "ESTOUROU";
      setSpeech("Dobrou e passou de 21!");
    } else {
      setSpeech(`Dobrou e parou em ${sc.total}!`);
    }
    await sleep(350);
    await advanceHandOrDealer();
  }

  async function splitHand() {
    if (state.phase !== "PLAYER_TURN" || state.playerHands.length !== 1) return;
    const hand = state.playerHands[0];
    if (hand.cards.length !== 2 || hand.cards[0].value !== hand.cards[1].value) return;
    if (state.bankroll < hand.bet) return;

    AudioFX.playChip();
    state.bankroll -= hand.bet;
    const secondCard = hand.cards.pop();
    hand.isSplitHand = true;

    const splitNewHand = {
      cards: [secondCard],
      bet: hand.bet,
      doubled: false,
      isSplitHand: true,
      resultLabel: "",
    };
    state.playerHands.push(splitNewHand);
    renderTable();

    await sleep(220);
    triggerDealerDealAnim();
    AudioFX.playCardDeal();
    hand.cards.push(drawCard());
    renderTable();

    await sleep(220);
    triggerDealerDealAnim();
    AudioFX.playCardDeal();
    splitNewHand.cards.push(drawCard());
    setSpeech("Mãos divididas! Jogando a Mão 1 primeiro.");
    renderTable();
  }

  async function advanceHandOrDealer() {
    if (state.activeHandIndex + 1 < state.playerHands.length) {
      state.activeHandIndex += 1;
      setSpeech(`Agora jogando a Mão ${state.activeHandIndex + 1}!`);
      renderTable();
      return;
    }

    // Check if ALL player hands busted -> Dealer doesn't need to draw
    const anyLive = state.playerHands.some((h) => !scoreHand(h.cards).isBust);
    state.phase = "DEALER_TURN";
    state.dealerHoleHidden = false;
    AudioFX.playCardFlip();
    setBanner("VEZ DA BANCA...");
    renderTable();

    if (!anyLive) {
      await sleep(350);
      resolveRound();
      return;
    }

    await sleep(450);
    while (scoreHand(state.dealerHand).total < 17) {
      triggerDealerDealAnim();
      AudioFX.playCardDeal();
      state.dealerHand.push(drawCard());
      renderTable();
      await sleep(450);
    }

    resolveRound();
  }

  function resolveRound() {
    const ds = scoreHand(state.dealerHand);
    let totalReturn = 0;
    let totalWagered = 0;
    let wins = 0;
    let losses = 0;
    let pushes = 0;

    state.playerHands.forEach((hand) => {
      const ps = scoreHand(hand.cards);
      totalWagered += hand.bet;

      if (ps.isBust) {
        hand.resultLabel = "ESTOUROU";
        losses += 1;
      } else if (ds.isBust || ps.total > ds.total) {
        hand.resultLabel = "VENCEU";
        totalReturn += hand.bet * 2;
        wins += 1;
      } else if (ps.total === ds.total) {
        hand.resultLabel = "EMPATE";
        totalReturn += hand.bet;
        pushes += 1;
      } else {
        hand.resultLabel = "PERDEU";
        losses += 1;
      }
    });

    state.bankroll += totalReturn;
    const net = totalReturn - totalWagered;

    if (net > 0) {
      state.streak += 1;
      AudioFX.playWin();
      setBanner(`VOCÊ VENCEU! (+$${net})`, "win");
      setSpeech(ds.isBust ? "A banca estourou! Parabéns pela vitória!" : "Ótima jogada! As fichas são suas.");
    } else if (net === 0 && pushes > 0 && wins === losses) {
      AudioFX.playPush();
      setBanner("EMPATE (PUSH)", "push");
      setSpeech("Empate! Sua aposta foi devolvida.");
    } else {
      state.streak = 0;
      AudioFX.playBust();
      setBanner("A BANCA VENCEU", "lose");
      setSpeech("Dessa vez a casa levou! Tente outra rodada.");
    }

    state.phase = "RESOLVE";
    persistSave();
    renderTable();
  }

  function playSameBet() {
    if (state.phase !== "RESOLVE") return;
    if (state.lastBet > 0 && state.bankroll >= state.lastBet) {
      AudioFX.playChip();
      state.bankroll -= state.lastBet;
      state.currentBet = state.lastBet;
      state.phase = "BETTING";
      startDeal();
    } else {
      prepareNewBet();
    }
  }

  function prepareNewBet() {
    if (state.phase !== "RESOLVE") return;
    AudioFX.playClick();
    state.dealerHand = [];
    state.playerHands = [];
    state.currentBet = 0;
    state.phase = "BETTING";
    setBanner("FAÇA SUA APOSTA");
    setSpeech(state.bankroll > 0 ? "Escolha suas fichas para a próxima rodada!" : "Sem fichas! Clique em Recarregar para continuar.");
    renderTable();
  }

  function toggleBgm() {
    AudioFX.ensureContext();
    state.bgmOn = !state.bgmOn;
    AudioFX.setBgmEnabled(state.bgmOn);
    AudioFX.playClick();
    updateAudioButtons();
    persistSave();
  }

  function toggleSfx() {
    AudioFX.ensureContext();
    state.sfxOn = !state.sfxOn;
    AudioFX.setSfxEnabled(state.sfxOn);
    if (state.sfxOn) AudioFX.playClick();
    updateAudioButtons();
    persistSave();
  }

  function openRules() {
    AudioFX.playClick();
    el.rulesModal.classList.remove("hidden");
  }

  function closeRules() {
    AudioFX.playClick();
    el.rulesModal.classList.add("hidden");
  }

  function bindEvents() {
    el.bankrollPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        AudioFX.ensureContext();
        AudioFX.playClick();
        el.bankrollPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.startingBankroll = Number(pill.dataset.bankroll);
      });
    });

    el.btnStartGame.addEventListener("click", () => startGame(false));
    el.btnContinueGame.addEventListener("click", () => startGame(true));
    el.btnBackMenu.addEventListener("click", () => {
      AudioFX.playClick();
      if (state.phase === "BETTING" && state.currentBet > 0) {
        state.bankroll += state.currentBet;
        state.currentBet = 0;
        persistSave();
      }
      enterMenu();
    });

    el.btnMenuRules.addEventListener("click", openRules);
    el.btnTableRules.addEventListener("click", openRules);
    el.btnCloseRules.addEventListener("click", closeRules);
    el.rulesModal.addEventListener("click", (e) => {
      if (e.target === el.rulesModal) closeRules();
    });

    el.btnMenuBgm.addEventListener("click", toggleBgm);
    el.btnTableBgm.addEventListener("click", toggleBgm);
    el.btnMenuSfx.addEventListener("click", toggleSfx);
    el.btnTableSfx.addEventListener("click", toggleSfx);

    el.chipButtons.forEach((btn) => {
      btn.addEventListener("click", () => addChip(Number(btn.dataset.chip)));
    });

    el.btnClearBet.addEventListener("click", clearBet);
    el.btnRebet.addEventListener("click", rebet);
    el.btnAllIn.addEventListener("click", allIn);
    el.btnDeal.addEventListener("click", startDeal);
    el.btnRebuy.addEventListener("click", rebuy);

    el.btnInsureYes.addEventListener("click", () => handleInsurance(true));
    el.btnInsureNo.addEventListener("click", () => handleInsurance(false));

    el.btnHit.addEventListener("click", hit);
    el.btnStand.addEventListener("click", stand);
    el.btnDouble.addEventListener("click", doubleDown);
    el.btnSplit.addEventListener("click", splitHand);

    el.btnPlayAgain.addEventListener("click", playSameBet);
    el.btnNewBet.addEventListener("click", prepareNewBet);
  }

  global.addEventListener("retro-bgm-change", (event) => {
    const enabled = !!(event.detail && event.detail.enabled);
    if (state.bgmOn === enabled) return;
    state.bgmOn = enabled;
    updateAudioButtons();
    persistSave();
  });

  function init() {
    const save = loadSave();
    if (save) {
      if (typeof save.bgmOn === "boolean") state.bgmOn = save.bgmOn;
      if (typeof save.sfxOn === "boolean") state.sfxOn = save.sfxOn;
      if (typeof save.bestBankroll === "number") state.bestBankroll = save.bestBankroll;
    }
    AudioFX.setBgmEnabled(state.bgmOn);
    AudioFX.setSfxEnabled(state.sfxOn);
    updateAudioButtons();
    bindEvents();
    enterMenu();
  }

  init();
})(window);
