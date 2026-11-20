/**
 * Pixel Blackjack 21 — Modo Online LAN: Roleta Russa (até 5 jogadores)
 *
 * Inclui o sistema de habilidades de HABILIDADES.md:
 *  - painel permanente (passiva / carga / ativa);
 *  - janela de preparação de 8s;
 *  - alvos destacados, chips de estado e efeitos de habilidade.
 */
(function (global) {
  "use strict";

  const AudioFX = global.RetroAudio;
  const SKIN_LABELS = {
    outlaw: "Billy",
    duchess: "Viper",
    cyber: "Zero",
    boss: "Don",
    phantom: "Reaper",
  };
  const SKIN_ORDER = ["outlaw", "duchess", "cyber", "boss", "phantom"];

  // Usado apenas se o servidor ainda não enviou o kit (ex.: primeira conexão).
  const FALLBACK_KITS = {
    outlaw: {
      name: "Billy",
      role: "Pistoleiro",
      passive: ["MÃO DO DIABO", "Mão inicial 16 → −1 bala"],
      charge: ["AZAR DO PISTOLEIRO", "3 estouros seguidos = ficha"],
      active: ["MUNIÇÃO TURBINADA", "Marca um alvo: o próximo tiro dele causa 2 de dano"],
      marksMax: 3,
    },
    duchess: {
      name: "Viper",
      role: "Duquesa",
      passive: ["PULSO FIRME", "75% de não subir a bala no 1/6 (1× por vida)"],
      charge: ["SANGUE FRIO", "Sobreviver a um giro em 4/6 ou 5/6 = ficha"],
      active: ["ROLETA DE CABEÇAS", "Sorteia alguém: +1 bala e roleta"],
      marksMax: 0,
    },
    cyber: {
      name: "Zero",
      role: "Forasteiro",
      passive: ["ESPIADA", "Mão inicial 12–16 revela a próxima carta"],
      charge: ["BARALHO MARCADO", "1 ficha a cada 5 rodadas"],
      active: ["CURTO-CIRCUITO", "Troca uma carta com um alvo"],
      marksMax: 0,
    },
    boss: {
      name: "Don",
      role: "Chefão",
      passive: ["PALAVRA FINAL", "Com um 7 na mão, empate é vitória sua"],
      charge: ["SETE DA SORTE", "7 na mão inicial = marca (2 = ficha)"],
      active: ["GUARDA-COSTAS", "Capanga morre no seu lugar, você fica com 1 vida"],
      marksMax: 2,
    },
    phantom: {
      name: "Reaper",
      role: "Morto-Vivo",
      passive: ["ESPECTRO", "Com 1 vida, o tambor nunca passa de 2/6"],
      charge: ["SEDE DE SANGUE", "3 BANGs = ficha"],
      active: ["SANGUE POR SANGUE", "Paga 1 vida + 1 ficha: Maldição, Selo ou Boneco Vudú"],
      marksMax: 3,
    },
  };

  const ABILITY_DETAILS = {
    outlaw: {
      passive: "Só a mão inicial de duas cartas que totalize 16 duro ativa. Ás conta como 1; mão macia não ativa. Remove 1 bala, sem descer de 1/6, e não gasta ficha.",
      charge: "Cada estouro no Blackjack dá uma marca. Três estouros seguidos geram 1 ficha, no máximo 1 guardada. A sequência zera ao vencer uma rodada, fazer Blackjack ou usar a ativa.",
      active: "Na janela de preparação, gasta 1 ficha e marca qualquer jogador vivo. No próximo giro dele, BANG causa 2 de dano; clique também consome a marca. Pode eliminar com 2 vidas. Não acumula, o alvo é avisado e uma marca em alguém que morre antes de girar é perdida.",
    },
    duchess: {
      passive: "Uma vez por vida, o primeiro giro iniciado exatamente em 1/6 tem 75% de chance de manter o tambor em 1/6; se falhar, sobe para 2/6. O sorteio e o resultado são públicos. Reseta quando perde uma vida.",
      charge: "Uma vez por partida, ganha 1 ficha se sobreviver de verdade a um giro iniciado em 4/6 ou 5/6. Conta a chance antes do disparo; clique ou BANG não fatal contam.",
      active: "Só quando a Viper for escolhida para girar. Na preparação, gasta 1 ficha e sorteia um jogador vivo, podendo sortear a si mesma. Ela gira primeiro; o sorteado recebe +1 bala (máximo 6/6) e gira depois, mesmo que ela morra. A ficha é consumida mesmo se o sorteado for ela; sem ativar, fica guardada.",
    },
    cyber: {
      passive: "Com mão inicial de 12 a 16, reserva a próxima carta e mostra só ao Zero se ela é SEGURA ou PERIGOSA; Ás nunca estoura. Vale para a primeira compra e desaparece após Hit ou Stand.",
      charge: "Ganha 1 ficha nas rodadas 5, 10, 15, 20... O contador não reinicia e continua mesmo com a ficha cheia; máximo 1 guardada. É a única ativa reutilizável na mesma partida.",
      active: "Na fase de cartas, escolhe outro jogador vivo com cartas, recebe uma carta aleatória dele e entrega uma carta própria escolhida. Pode usar depois de estourar enquanto a rodada estiver aberta. Recalcula os pontos na hora e não devolve a ação a quem já parou ou estourou; o alvo é avisado.",
    },
    boss: {
      passive: "Enquanto tiver um 7 na mão, qualquer empate que inclua o Don é vitória só dele; os outros empatados não vencem. Vale para 7 inicial ou comprado, sem clique nem custo.",
      charge: "Um 7 na mão inicial dá 1 marca SETES. Com 2 marcas, arma automaticamente o Guarda-Costas. Máximo 1 ficha por partida.",
      active: "Arma automaticamente e fica secreto, visível só ao Don. No primeiro tiro fatal (dano ≥ vidas), o capanga absorve: Don fica com 1 vida, tambor em 3/6 e ficha consumida. Não protege contra dano não fatal e só salva uma vez por partida.",
    },
    phantom: {
      passive: "Com exatamente 1 vida, o tambor final nunca passa de 2/6, mesmo após Selo, mínimo 4/6 ou +1 bala. O tiro acontece normalmente; não é escudo.",
      charge: "Cada BANG em qualquer jogador dá 1 marca, inclusive os absorvidos pelo Guarda-Costas e os que acertam o Reaper. Três marcas geram 1 ficha; guarda no máximo 1. A vida limita o uso a duas vezes por partida.",
      active: "Só na preparação; cada modo custa 1 vida (é preciso ter 2 ou mais) e 1 ficha. Maldição força outro jogador vivo a girar imediatamente com mínimo 4/6 e depois volta o tambor a 1/6 (Guarda-Costas deixa 3/6). Selo dá +1 bala a cada giro do alvo até o fim da partida, máximo 6/6. Boneco: somente quando o Reaper for escolhido para girar; amaldiçoa outro jogador vivo por cinco rodadas, contando a atual, sem acrescentar munição ao tambor. Se um disparo atingir o Reaper durante o prazo, o dano exato (inclusive os 2 da Munição Turbinada) é transferido e o efeito termina. O Guarda-Costas do Don pode absorver dano fatal transferido. Sem transferência até o fim da quinta rodada, a maldição acaba antes de o Reaper girar com no mínimo 5/6; com 1 vida, o Espectro limita o giro a 2/6. A punição não transfere dano.",
    },
  };

  // Reação central acompanha quase toda a pausa do revólver após o giro.
  const SHOT_REACTION_MS = 3600;

  function tombstoneImage(skin) {
    const knownSkins = new Set(["outlaw", "duchess", "cyber", "boss", "phantom"]);
    const safeSkin = knownSkins.has(skin) ? skin : "outlaw";
    return `assets/lapide_${safeSkin}.png?v=lapides-v1`;
  }

  function getClientId() {
    let cid = sessionStorage.getItem("pixel_bj_client_id");
    if (!cid) {
      cid = "cli_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
      sessionStorage.setItem("pixel_bj_client_id", cid);
    }
    return cid;
  }

  const rl = {
    clientId: getClientId(),
    nick: localStorage.getItem("pixel_bj_nick") || "",
    skin: localStorage.getItem("pixel_bj_skin") || "outlaw",
    active: false,
    pollTimer: null,
    lastState: null,
    preShotState: null,
    lastShotSeq: 0,
    shotAnimUntil: 0,
    shotResultAt: 0,
    activeShotSeq: 0,
    shotAnimTimer: null,
    shotReactionTimer: null,
    shotStageStep: "IDLE",
    shotFlashTimer: null,
    happySeatId: null,
    happySeatUntil: 0,
    happyEventKey: "",
    happyTimer: null,
    winnerHappyKey: "",
    winnerScreenKey: "",
    winnerScreenDeadline: 0,
    winnerScreenTimer: null,
    serverOffline: false,
    // Habilidades
    lastAbilitySeq: 0,
    abilityFx: null,
    abilityFxTimer: null,
    toast: null,
    toastTimer: null,
    prepKey: "",
    prepReadySent: false,
    panelOpen: true,
    panelUserToggled: false,
    abilityModalOpen: false,
  };

  const el = {
    mainMenu: document.getElementById("main-menu"),
    lobbyScreen: document.getElementById("roulette-lobby"),
    arenaScreen: document.getElementById("roulette-screen"),
    rulesModal: document.getElementById("roulette-rules-modal"),

    btnOpenRoulette: document.getElementById("btn-open-roulette"),
    btnMenu: document.getElementById("btn-rl-menu"),
    btnRulesLobby: document.getElementById("btn-rl-rules"),
    btnRulesArena: document.getElementById("btn-rl-arena-rules"),
    btnCloseRules: document.getElementById("btn-close-rl-rules"),

    btnLobbyBgm: document.getElementById("btn-rl-bgm"),
    btnLobbySfx: document.getElementById("btn-rl-sfx"),
    btnArenaBgm: document.getElementById("btn-rl-arena-bgm"),
    btnArenaSfx: document.getElementById("btn-rl-arena-sfx"),

    myDevice: document.getElementById("rl-my-device"),
    playerCount: document.getElementById("rl-player-count"),
    serverWarning: document.getElementById("rl-server-warning"),

    nickInput: document.getElementById("rl-nick-input"),
    btnJoin: document.getElementById("btn-rl-join"),
    lobbyNotice: document.getElementById("rl-lobby-notice"),
    skinCards: Array.from(document.querySelectorAll(".skin-card")),
    lobbyPlayers: document.getElementById("rl-lobby-players"),
    networkDevices: document.getElementById("rl-network-devices"),

    btnAddBot: document.getElementById("btn-rl-add-bot"),
    btnClearBots: document.getElementById("btn-rl-clear-bots"),
    btnLeave: document.getElementById("btn-rl-leave"),
    btnStart: document.getElementById("btn-rl-start"),

    // Modal de adicionar bot
    botModal: document.getElementById("rl-bot-modal"),
    botModalOptions: document.getElementById("rl-bot-modal-options"),
    botModalCancel: document.getElementById("rl-bot-modal-cancel"),

    btnBackLobby: document.getElementById("btn-rl-back-lobby"),
    roundNum: document.getElementById("rl-round-num"),
    aliveCount: document.getElementById("rl-alive-count"),
    timer: document.getElementById("rl-timer"),
    arenaIp: document.getElementById("rl-arena-ip"),

    revolverImg: document.getElementById("rl-revolver-img"),
    phaseBanner: document.getElementById("rl-phase-banner"),
    shotDetail: document.getElementById("rl-shot-detail"),
    btnHit: document.getElementById("btn-rl-hit"),
    btnStand: document.getElementById("btn-rl-stand"),
    btnNext: document.getElementById("btn-rl-next"),
    btnRematch: document.getElementById("btn-rl-rematch"),

    // Janela de preparação
    prepBox: document.getElementById("rl-prep-box"),
    prepTimer: document.getElementById("rl-prep-timer"),
    prepHint: document.getElementById("rl-prep-hint"),
    prepReadyList: document.getElementById("rl-prep-ready-list"),
    btnReady: document.getElementById("btn-rl-ready"),

    // Painel de habilidade
    abilityPanel: document.getElementById("rl-ability-panel"),
    abilityToggle: document.getElementById("rl-ability-toggle"),
    abilityPortrait: document.getElementById("rl-ability-portrait"),
    abilityToggleName: document.getElementById("rl-ability-toggle-name"),
    abilityTogglePassive: document.getElementById("rl-ability-toggle-passive"),
    abilityToggleArrow: document.getElementById("rl-ability-toggle-arrow"),
    abilityBody: document.getElementById("rl-ability-body"),
    abilPassiveIcon: document.getElementById("rl-abil-passive-icon"),
    abilPassiveName: document.getElementById("rl-abil-passive-name"),
    abilPassiveDesc: document.getElementById("rl-abil-passive-desc"),
    abilChargeIcon: document.getElementById("rl-abil-charge-icon"),
    abilChargeName: document.getElementById("rl-abil-charge-name"),
    abilChargeDesc: document.getElementById("rl-abil-charge-desc"),
    abilMarksWrap: document.getElementById("rl-abil-marks-wrap"),
    abilMarksText: document.getElementById("rl-abil-marks-text"),
    abilBarFill: document.getElementById("rl-abil-bar-fill"),
    abilActiveIcon: document.getElementById("rl-abil-active-icon"),
    abilActiveName: document.getElementById("rl-abil-active-name"),
    abilActiveDesc: document.getElementById("rl-abil-active-desc"),
    abilFichaText: document.getElementById("rl-abil-ficha-text"),
    abilUse: document.getElementById("rl-abil-use"),
    abilEffect: document.getElementById("rl-abil-effect"),
    espiadaBox: document.getElementById("rl-espiada"),
    espiadaIcon: document.getElementById("rl-espiada-icon"),
    espiadaText: document.getElementById("rl-espiada-text"),

    // Modal de habilidade
    abilityModal: document.getElementById("rl-ability-modal"),
    abilityModalTitle: document.getElementById("rl-ability-modal-title"),
    abilityModalText: document.getElementById("rl-ability-modal-text"),
    abilityModalOptions: document.getElementById("rl-ability-modal-options"),
    abilityModalCancel: document.getElementById("rl-ability-modal-cancel"),

    seatsGrid: document.getElementById("rl-seats-grid"),
    logList: document.getElementById("rl-log-list"),
    characterDetails: document.getElementById("rl-character-details"),

    shotOverlay: document.getElementById("rl-shot-overlay"),
    shotOverlayTitle: document.getElementById("rl-shot-overlay-title"),
    shotOverlayDetail: document.getElementById("rl-shot-overlay-detail"),
    shotOverlayDrum: document.getElementById("rl-shot-overlay-drum"),
    shotOverlayGun: document.getElementById("rl-shot-overlay-gun"),
    shotOverlayCharacter: document.getElementById("rl-shot-overlay-character"),
    shotOverlayName: document.getElementById("rl-shot-overlay-name"),
    shotOverlayFx: document.getElementById("rl-shot-overlay-fx"),
    shotFlash: document.getElementById("rl-shot-flash"),
    winnerPanel: document.getElementById("rl-winner-panel"),
    winnerPortrait: document.getElementById("rl-winner-portrait"),
    winnerName: document.getElementById("rl-winner-name"),
    winnerRole: document.getElementById("rl-winner-role"),
    winnerSprite: document.getElementById("rl-winner-sprite"),
  };

  function buildArenaLayout() {
    const playfield = document.querySelector("#roulette-screen .roulette-playfield");
    const center = playfield && playfield.querySelector(".arena-center");
    if (!playfield || !center || !el.abilityPanel || !el.seatsGrid || !el.winnerPanel) return;

    const mainColumn = document.createElement("div");
    mainColumn.className = "arena-main-column";
    playfield.insertBefore(el.abilityPanel, center);
    playfield.insertBefore(mainColumn, center);
    mainColumn.append(center, el.winnerPanel, el.shotOverlay, el.seatsGrid);
  }

  buildArenaLayout();

  const ABILITY_FX_DURATION = {
    fx_municao: 1600,
    fx_roletas: 1600,
    fx_selo: 1600,
    fx_maldicao: 1600,
    fx_boneco: 1600,
    fx_curto: 1400,
  };

  function syncAudioButtons() {
    const bgmOn = AudioFX.bgmEnabled;
    const sfxOn = AudioFX.sfxEnabled;
    const menuBgm = document.getElementById("btn-menu-bgm");
    const menuSfx = document.getElementById("btn-menu-sfx");
    if (menuBgm) {
      menuBgm.textContent = `MÚSICA: ${bgmOn ? "ON" : "OFF"}`;
      menuBgm.classList.toggle("btn-green", bgmOn);
      menuBgm.classList.toggle("btn-slate", !bgmOn);
    }
    if (menuSfx) {
      menuSfx.textContent = `SONS: ${sfxOn ? "ON" : "OFF"}`;
      menuSfx.classList.toggle("btn-green", sfxOn);
      menuSfx.classList.toggle("btn-slate", !sfxOn);
    }
    [el.btnLobbyBgm, el.btnArenaBgm].forEach((b) => {
      if (!b) return;
      b.textContent = `BGM: ${bgmOn ? "ON" : "OFF"}`;
      b.classList.toggle("btn-green", bgmOn);
      b.classList.toggle("btn-slate", !bgmOn);
    });
    [el.btnLobbySfx, el.btnArenaSfx].forEach((b) => {
      if (!b) return;
      b.textContent = `SFX: ${sfxOn ? "ON" : "OFF"}`;
      b.classList.toggle("btn-green", sfxOn);
      b.classList.toggle("btn-slate", !sfxOn);
    });
  }

  async function apiGet(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  async function apiPost(path, payload) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ clientId: rl.clientId }, payload || {})),
    });
    const data = await res.json();
    if (!res.ok && data && data.message) {
      el.shotDetail.textContent = data.message;
    }
    return data;
  }

  function skinOwner(skin, players) {
    return (players || []).find((player) =>
      player.id !== rl.clientId && player.skin === skin
    ) || null;
  }

  function showLobbyNotice(message) {
    if (!el.lobbyNotice) return;
    el.lobbyNotice.textContent = message || "";
    el.lobbyNotice.classList.toggle("hidden", !message);
  }

  function updateSkinSelectionUI(players) {
    const roster = players || (rl.lastState && rl.lastState.players) || [];
    // Se o personagem selecionado acabou de ser ocupado (por um bot ou outro
    // jogador) e você ainda não entrou, pula para o primeiro personagem livre.
    const isJoined = roster.some((p) => p.id === rl.clientId);
    if (!isJoined && skinOwner(rl.skin, roster)) {
      const freeSkin = SKIN_ORDER.find((skin) => !skinOwner(skin, roster));
      if (freeSkin) {
        rl.skin = freeSkin;
        localStorage.setItem("pixel_bj_skin", rl.skin);
      }
    }
    el.skinCards.forEach((card) => {
      const owner = skinOwner(card.dataset.skin, roster);
      const active = card.dataset.skin === rl.skin && !owner;
      let badge = card.querySelector(".skin-availability");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "skin-availability hidden";
        badge.setAttribute("aria-live", "polite");
        card.appendChild(badge);
      }
      badge.textContent = owner ? `JÁ ESCOLHIDO · ${owner.nick}` : "";
      badge.classList.toggle("hidden", !owner);
      card.classList.toggle("unavailable", !!owner);
      card.classList.toggle("active", active);
      card.setAttribute("aria-pressed", active ? "true" : "false");
      card.setAttribute("aria-disabled", owner ? "true" : "false");
    });
    // A seleção do card e o painel de detalhes são estados independentes.
    // Preserve o personagem que o painel já está mostrando durante o polling.
    syncSharedCharacterDetails();
  }

  function syncSharedCharacterDetails(skin) {
    const panel = el.characterDetails;
    if (!panel || panel.classList.contains("hidden")) return;
    const detailSkin = skin || panel.dataset.skin || rl.skin;
    const selected = el.skinCards.find((card) => card.dataset.skin === detailSkin);
    const source = selected && selected.querySelector(".char-details");
    if (!source) return;
    panel.innerHTML = source.innerHTML;
    panel.dataset.skin = selected.dataset.skin;
    const title = document.createElement("div");
    title.className = "shared-detail-title";
    const name = selected.querySelector(".char-name");
    const role = selected.querySelector(".char-role");
    title.textContent = (name ? name.textContent : selected.dataset.skin)
      + (role ? " · " + role.textContent : "");
    panel.prepend(title);
    el.skinCards.forEach((card) => {
      const button = card.querySelector(".char-details-btn");
      if (button) button.textContent = card.dataset.skin === detailSkin ? "OCULTAR DETALHES" : "VER DETALHES";
    });
  }

  function openLobby() {
    AudioFX.ensureContext();
    AudioFX.playClick();
    if (AudioFX.bgmEnabled) AudioFX.startBgm();
    syncAudioButtons();

    rl.active = true;
    el.nickInput.value = rl.nick || "";
    updateSkinSelectionUI();
    el.mainMenu.classList.add("hidden");
    el.arenaScreen.classList.add("hidden");
    el.lobbyScreen.classList.remove("hidden");

    pollOnce();
    if (rl.pollTimer) clearInterval(rl.pollTimer);
    rl.pollTimer = setInterval(pollOnce, 900);
  }

  function closeToMainMenu() {
    AudioFX.playClick();
    rl.active = false;
    if (rl.pollTimer) {
      clearInterval(rl.pollTimer);
      rl.pollTimer = null;
    }
    el.lobbyScreen.classList.add("hidden");
    el.arenaScreen.classList.add("hidden");
    el.mainMenu.classList.remove("hidden");
  }

  async function joinOrUpdate() {
    AudioFX.ensureContext();
    AudioFX.playClick();
    const typed = el.nickInput.value.trim();
    rl.nick = typed || `Player_${rl.clientId.slice(4, 8)}`;
    el.nickInput.value = rl.nick;
    localStorage.setItem("pixel_bj_nick", rl.nick);
    localStorage.setItem("pixel_bj_skin", rl.skin);

    try {
      const data = await apiPost("/api/roulette/join", {
        nick: rl.nick,
        skin: rl.skin,
      });
      rl.serverOffline = false;
      if (!data.ok) {
        const joinedPlayer = (data.players || []).find((player) => player.id === rl.clientId);
        if (joinedPlayer) {
          rl.skin = joinedPlayer.skin;
          localStorage.setItem("pixel_bj_skin", rl.skin);
        }
        showLobbyNotice(data.message || "N\u00e3o foi poss\u00edvel escolher esse personagem.");
        applyServerState(data);
        return;
      }
      showLobbyNotice("");
      const joinedPlayer = (data.players || []).find((player) => player.id === rl.clientId);
      if (joinedPlayer) {
        rl.skin = joinedPlayer.skin;
        localStorage.setItem("pixel_bj_skin", rl.skin);
      }
      applyServerState(data);
    } catch (_) {
      rl.serverOffline = true;
      el.serverWarning.classList.remove("hidden");
    }
  }

  async function pollOnce() {
    if (!rl.active) return;
    try {
      const data = await apiGet(`/api/roulette/state?clientId=${encodeURIComponent(rl.clientId)}`);
      rl.serverOffline = false;
      el.serverWarning.classList.add("hidden");
      applyServerState(data);
    } catch (_) {
      rl.serverOffline = true;
      el.serverWarning.classList.remove("hidden");
    }
  }

  function playShotAnimationSequence(shot) {
    const spinDuration = 4200;
    const totalDuration = 8500;
    rl.shotStageStep = "SPIN";
    rl.shotResultAt = Date.now() + spinDuration;
    rl.shotAnimUntil = Date.now() + totalDuration;
    if (rl.shotAnimTimer) clearTimeout(rl.shotAnimTimer);
    if (rl.shotReactionTimer) clearTimeout(rl.shotReactionTimer);
    rl.shotReactionTimer = null;

    // No computador, a cena acontece no espaço central da mesa.
    el.revolverImg.src = "assets/revolver_idle.png";
    el.revolverImg.classList.remove("self-aim");
    AudioFX.playCylinderSpin();
    renderArena(rl.lastState, "SPIN");

    rl.shotAnimTimer = setTimeout(() => {
      rl.shotStageStep = "RESULT";
      if (shot.fired) {
        AudioFX.playGunshot();
        if (shot.guardAbsorbed) {
          showSeatHappy(shot.damageTargetId || shot.shooterId, `guard:${shot.seq}`);
        } else if (shot.damageRedirected) {
          showSeatHappy(shot.shooterId, `boneco:${shot.seq}`);
        } else if (shot.chooserId && shot.chooserId !== shot.shooterId) {
          showSeatHappy(shot.chooserId, `shot:${shot.seq}`);
        }
        if (window.innerWidth > 960) triggerShotFlash();
        if (shot.eliminated || shot.damageTargetEliminated) {
          setTimeout(() => AudioFX.playEliminated(), 320);
        }
      } else {
        AudioFX.playDryFire();
      }
      renderArena(rl.lastState, "RESULT");
      rl.shotReactionTimer = window.setTimeout(() => {
        rl.shotReactionTimer = null;
        if (
          rl.activeShotSeq === Number(shot.seq) &&
          rl.lastState &&
          rl.lastState.phase === "ROULETTE_SHOT" &&
          rl.lastState.lastShot &&
          Number(rl.lastState.lastShot.seq) === Number(shot.seq)
        ) {
          renderArena(rl.lastState, "RESULT");
        }
      }, SHOT_REACTION_MS);
      if (shot.guardAbsorbed) playOneShotFx(el.shotOverlayFx, "fx_guarda", 450);
    }, spinDuration);
  }

  function triggerShotFlash() {
    if (!el.shotFlash) return;
    if (rl.shotFlashTimer) clearTimeout(rl.shotFlashTimer);
    el.shotFlash.classList.remove("hidden", "active");
    void el.shotFlash.offsetWidth;
    el.shotFlash.classList.add("active");
    rl.shotFlashTimer = window.setTimeout(() => {
      el.shotFlash.classList.remove("active");
      el.shotFlash.classList.add("hidden");
    }, 260);
  }

  function playOneShotFx(imgEl, fxName, ms) {
    if (!imgEl) return;
    imgEl.src = `assets/fx/${fxName}.gif?t=${Date.now()}`;
    imgEl.classList.remove("hidden");
    window.setTimeout(() => {
      imgEl.classList.add("hidden");
      imgEl.removeAttribute("src");
    }, ms || 500);
  }

  function shotSourceLabel(shot) {
    if (!shot) return "";
    if (shot.curse) return "MALDICÃO";
    if (shot.source && shot.source !== "RODADA") return shot.source;
    return "";
  }

  function bonecoPenaltyDetail(shot) {
    const odds = shot && shot.oddsBefore ? ` Chance efetiva: ${shot.oddsBefore}.` : "";
    return `O prazo terminou sem transferência e a maldição acabou. O giro de punição tem mínimo 5/6 antes do Espectro.${odds} Este giro não transfere dano.`;
  }

  function feedMeta(line) {
    const text = String(line || "");
    const upper = text.toLocaleUpperCase("pt-BR");
    if (/^RODADA\s+\d+/i.test(text)) {
      return { tone: "round", label: "RODADA", icon: "assets/ui/icon_marca.png", divider: true };
    }
    if (upper.includes("MUNI") && upper.includes("TURBINADA")) {
      return { tone: "outlaw", label: "BILLY · ATIVA", icon: "assets/ui/abil_outlaw_ativa.png" };
    }
    if (upper.includes("ROLETA DE CABE")) {
      return { tone: "duchess", label: "VIPER · ATIVA", icon: "assets/ui/abil_duchess_ativa.png" };
    }
    if (upper.includes("CURTO-CIRCUITO")) {
      return { tone: "cyber", label: "ZERO · ATIVA", icon: "assets/ui/abil_cyber_ativa.png" };
    }
    if (upper.includes("GUARDA-COSTAS")) {
      return { tone: "boss", label: "DON · GUARDA", icon: "assets/ui/icon_status_guarda.png" };
    }
    if (upper.includes("SETE DA SORTE")) {
      return { tone: "boss", label: "DON · CARGA", icon: "assets/ui/abil_boss_carga.png" };
    }
    if (upper.includes("PALAVRA FINAL")) {
      return { tone: "boss", label: "DON · PASSIVA", icon: "assets/ui/abil_boss_passiva.png" };
    }
    if (upper.includes("SELO DE CHUMBO")) {
      return { tone: "phantom", label: "REAPER · SELO", icon: "assets/ui/icon_status_selo.png" };
    }
    if (upper.includes("MALDI") || upper.includes("BONECO VUD")) {
      return { tone: "phantom", label: "REAPER · ATIVA", icon: "assets/ui/abil_phantom_ativa.png" };
    }
    if (upper.includes("PULSO FIRME")) {
      return { tone: "duchess", label: "VIPER · PASSIVA", icon: "assets/ui/abil_duchess_passiva.png" };
    }
    if (upper.includes("SANGUE FRIO")) {
      return { tone: "duchess", label: "VIPER · CARGA", icon: "assets/ui/abil_duchess_carga.png" };
    }
    if (upper.includes("AZAR DO PISTOLEIRO")) {
      return { tone: "outlaw", label: "BILLY · CARGA", icon: "assets/ui/abil_outlaw_carga.png" };
    }
    if (upper.includes("DO DIABO")) {
      return { tone: "outlaw", label: "BILLY · PASSIVA", icon: "assets/ui/abil_outlaw_passiva.png" };
    }
    if (upper.includes("BARALHO MARCADO")) {
      return { tone: "cyber", label: "ZERO · CARGA", icon: "assets/ui/abil_cyber_carga.png" };
    }
    if (upper.includes("ESPIADA")) {
      return { tone: "cyber", label: "ZERO · PASSIVA", icon: "assets/ui/abil_cyber_passiva.png" };
    }
    if (upper.includes("ESPECTRO")) {
      return { tone: "phantom", label: "REAPER · PASSIVA", icon: "assets/ui/abil_phantom_passiva.png" };
    }
    if (upper.includes("SEDE DE SANGUE")) {
      return { tone: "phantom", label: "REAPER · CARGA", icon: "assets/ui/abil_phantom_carga.png" };
    }
    if (upper.includes("SANGUE POR SANGUE")) {
      return { tone: "phantom", label: "REAPER · ATIVA", icon: "assets/ui/abil_phantom_ativa.png" };
    }
    if (upper.includes("BANG!")) {
      return { tone: "danger", label: "BANG", icon: "assets/revolver_bang.png" };
    }
    if (upper.includes("CLIQUE")) {
      return { tone: "safe", label: "CLIQUE", icon: "assets/revolver_click.png" };
    }
    if (upper.includes("JANELA DE PREPARA")) {
      return { tone: "prep", label: "PREPARAÇÃO", icon: "assets/ui/icon_status_marcado.png" };
    }
    if (upper.includes("FIM DE JOGO") || upper.includes("VENCEDOR")) {
      return { tone: "result", label: "RESULTADO", icon: "assets/ui/icon_ficha.png" };
    }
    return { tone: "neutral", label: "MESA", icon: "assets/ui/icon_marca.png" };
  }

  function renderArenaFeed(logs, data, animStep) {
    const sourceLogs = logs || [];
    const spinInProgress =
      animStep === "SPIN" || Date.now() < rl.shotResultAt;
    const spinningShot = data
      && data.phase === "ROULETTE_SHOT"
      && spinInProgress
      && data.lastShot;
    const spinningTarget = spinningShot
      && (data.players || []).find((player) => player.id === data.lastShot.shooterId);
    const targetNick = spinningTarget && String(spinningTarget.nick || "").toLocaleLowerCase("pt-BR");
    const displayLogs = spinningTarget && targetNick
      ? sourceLogs.filter((line) => {
          const message = String(line || "");
          const upper = message.toLocaleUpperCase("pt-BR");
          const mentionsTarget = message.toLocaleLowerCase("pt-BR").includes(targetNick);
          const currentShotOutcome =
            upper.startsWith("BANG!")
            || upper.startsWith("*CLIQUE*!")
            || (upper.includes("GUARDA-COSTAS") && upper.includes("MORREU"))
            || upper.startsWith("PULSO FIRME:")
            || upper.startsWith("SANGUE FRIO:")
            || upper.startsWith("SEDE DE SANGUE:");
          return !(mentionsTarget && currentShotOutcome);
        })
      : sourceLogs;
    const feedKey = JSON.stringify(displayLogs);
    if (el.logList.dataset.feedKey === feedKey) return;
    const previousTop = el.logList.scrollTop;
    const wasNearNewest = previousTop < 28;
    const fragment = document.createDocumentFragment();
    displayLogs.forEach((line, index) => {
      const meta = feedMeta(line);
      const item = document.createElement("li");
      item.className = meta.divider ? "feed-round" : "feed-item feed-" + meta.tone;
      if (index === 0 && !meta.divider) item.classList.add("feed-latest");
      const icon = document.createElement("img");
      icon.className = "pixel-img feed-icon";
      icon.src = meta.icon;
      icon.alt = "";
      icon.loading = "lazy";
      const content = document.createElement("div");
      content.className = "feed-content";
      const label = document.createElement("span");
      label.className = "feed-label";
      label.textContent = meta.label;
      const message = document.createElement("span");
      message.className = "feed-message";
      message.textContent = String(line || "");
      content.append(label, message);
      item.append(icon, content);
      fragment.appendChild(item);
    });
    el.logList.replaceChildren(fragment);
    el.logList.dataset.feedKey = feedKey;
    el.logList.scrollTop = wasNearNewest ? 0 : previousTop;
  }

  function characterGif(skin, expression) {
    return `assets/char_${skin}_${expression}.gif?v=shot-blood-animation-v1`;
  }

  function showSeatHappy(playerId, eventKey) {
    if (!playerId || !eventKey || rl.happyEventKey === eventKey) return;
    if (rl.happyTimer) clearTimeout(rl.happyTimer);

    rl.happySeatId = playerId;
    rl.happySeatUntil = Date.now() + 2000;
    rl.happyEventKey = eventKey;
    rl.happyTimer = window.setTimeout(() => {
      if (rl.happyEventKey !== eventKey) return;
      rl.happySeatId = null;
      rl.happySeatUntil = 0;
      rl.happyEventKey = "";
      rl.happyTimer = null;
      if (rl.lastState) {
        const step = Date.now() < rl.shotAnimUntil ? rl.shotStageStep : "IDLE";
        renderArena(rl.lastState, step);
      }
    }, 2000);
  }

  function showWinnerHappy(data, champion) {
    if (data.phase !== "GAME_OVER" || !champion) return;
    const key = `${champion.id}:${data.winnerScreenUntil || data.roundNum}`;
    if (rl.winnerHappyKey === key) return;
    rl.winnerHappyKey = key;
    showSeatHappy(champion.id, `winner:${key}`);
  }

  function renderShotOverlay(data, animStep) {
    const shot = data && data.lastShot;
    const visible = data && data.phase === "ROULETTE_SHOT" && shot && animStep !== "IDLE";
    if (!visible) {
      el.shotOverlay.classList.add("hidden");
      el.shotOverlayDrum.classList.remove("spinning");
      return;
    }

    const target = (data.players || []).find((p) => p.id === shot.shooterId);
    if (!target) return;

    const bulletCount = Math.max(1, Math.min(6, shot.bulletCountBefore || 1));
    const chamberIndex = Number(shot.chamberIndex || 0);
    const finalAngle = -(chamberIndex * 60 + 1440);
    const isSpin = animStep === "SPIN";
    const sourceLabel = shotSourceLabel(shot);
    const damageTxt = shot.damage === 2 ? " (dano 2)" : "";

    el.shotOverlay.classList.remove("hidden");
    el.shotOverlay.classList.toggle("shot-result", !isSpin);

    if (isSpin) {
      el.shotOverlayTitle.textContent = sourceLabel
        ? `${sourceLabel}! ${target.nick} VAI GIRAR...`
        : `${target.nick} FOI ESCOLHIDO...`;
      if (shot.bonecoPenalty) {
        el.shotOverlayDetail.textContent = bonecoPenaltyDetail(shot);
      } else {
        el.shotOverlayDetail.textContent = shot.curse
          ? `${shot.chooserNick} lançou a Maldição. O tambor tem no mínimo 4/6.`
          : `${shot.chooserNick} escolheu ${target.nick}. A câmara está girando...`;
      }
    } else if (shot.bonecoPenalty) {
      el.shotOverlayTitle.textContent = shot.fired
        ? shot.eliminated
          ? "PUNIÇÃO DO BONECO! REAPER FOI ELIMINADO!"
          : "PUNIÇÃO DO BONECO! BANG NO REAPER!"
        : "PUNIÇÃO DO BONECO! CLIQUE — REAPER SOBREVIVEU!";
      el.shotOverlayDetail.textContent = shot.fired
        ? `A punição não transfere dano. O Reaper perdeu ${shot.damage} vida(s); restam ${shot.livesLeft}. Chance: ${shot.oddsBefore}.`
        : `${bonecoPenaltyDetail(shot)} Próxima chance: ${shot.oddsAfter}.`;
    } else if (shot.damageRedirected) {
      const victim = (data.players || []).find((p) => p.id === shot.damageTargetId);
      const victimName = shot.damageTargetNick || (victim && victim.nick) || "o amaldiçoado";
      if (shot.guardAbsorbed) {
        el.shotOverlayTitle.textContent = `BONECO VUDÚ! O GUARDA-COSTAS SALVOU ${victimName}!`;
        el.shotOverlayDetail.textContent =
          `O tiro contra ${target.nick} transferiu ${shot.damage} dano(s) para ${victimName}, mas o capanga absorveu o disparo.`;
      } else if (shot.damageTargetEliminated) {
        el.shotOverlayTitle.textContent = `BANG! ${victimName} FOI ELIMINADO!`;
        el.shotOverlayDetail.textContent =
          `O Boneco Vudú transferiu ${shot.damage} dano(s) do tiro contra ${target.nick} (${shot.oddsBefore}) para ${victimName}.`;
      } else {
        el.shotOverlayTitle.textContent = `BONECO VUDÚ! TIRO TRANSFERIDO PARA ${victimName}!`;
        el.shotOverlayDetail.textContent =
          `${victimName} perdeu ${shot.damage} vida(s) pelo disparo que atingiu ${target.nick} (${shot.oddsBefore}); restam ${shot.damageTargetLivesLeft} vida(s).`;
      }
    } else if (shot.guardAbsorbed) {
      el.shotOverlayTitle.textContent = `GUARDA-COSTAS! ${target.nick} NÃO MORREU!`;
      el.shotOverlayDetail.textContent =
        `O capanga morreu no lugar dele. ${target.nick} ficou com 1 vida e o tambor foi para 3/6.`;
    } else if (shot.fired && shot.eliminated) {
      el.shotOverlayTitle.textContent = `BANG! ${target.nick} FOI ELIMINADO!`;
      el.shotOverlayDetail.textContent =
        `A câmara marcada pela seta tinha munição (${shot.oddsBefore})${damageTxt}. ${target.nick} saiu do jogo!`;
    } else if (shot.fired) {
      el.shotOverlayTitle.textContent = `BANG! ${target.nick} PERDEU ${shot.damage} VIDA${shot.damage > 1 ? "S" : ""}!`;
      el.shotOverlayDetail.textContent =
        `A câmara marcada pela seta tinha munição (${shot.oddsBefore})${damageTxt}. Restam ${shot.livesLeft} vidas.`;
    } else {
      el.shotOverlayTitle.textContent = `CLIQUE! ${target.nick} SOBREVIVEU!`;
      const pulsoTxt = shot.pulso === "success"
        ? " PULSO FIRME: a bala não subiu."
        : shot.pulso === "fail"
          ? " PULSO FIRME falhou."
          : "";
      el.shotOverlayDetail.textContent =
        `A câmara marcada pela seta estava vazia (${shot.oddsBefore}).${pulsoTxt} Próxima chance: ${shot.oddsAfter}.`;
    }

    el.shotOverlayName.textContent = target.nick;

    el.shotOverlayDrum.src = `assets/tambor/Tambor-${bulletCount}M.png`;
    el.shotOverlayDrum.style.setProperty("--overlay-drum-angle", `${finalAngle}deg`);
    el.shotOverlayDrum.classList.toggle("spinning", isSpin);
    if (!isSpin) el.shotOverlayDrum.style.transform = `rotate(${finalAngle}deg)`;

    el.shotOverlayGun.src = isSpin
      ? "assets/revolver_spin.gif"
      : shot.fired
        ? "assets/revolver_bang.png"
        : "assets/revolver_click.png";

    if (isSpin) {
      // O servidor já conhece o resultado, mas a animação não pode entregá-lo
      // antes que a câmara pare.
      el.shotOverlayCharacter.src = characterGif(target.skin, "scared");
    } else if (shot.guardAbsorbed) {
      el.shotOverlayCharacter.src = rl.happySeatId === target.id && Date.now() < rl.happySeatUntil
        ? characterGif(target.skin, "happy")
        : characterGif(target.skin, "idle");
    } else if (shot.fired && shot.eliminated && Date.now() >= rl.shotResultAt + SHOT_REACTION_MS) {
      el.shotOverlayCharacter.src = tombstoneImage(target.skin);
    } else if (shot.fired) {
      el.shotOverlayCharacter.src = Date.now() < rl.shotResultAt + SHOT_REACTION_MS
        ? characterGif(target.skin, shot.damageRedirected ? "happy" : "shot")
        : characterGif(target.skin, "idle");
    } else {
      el.shotOverlayCharacter.src = Date.now() < rl.shotResultAt + SHOT_REACTION_MS
        ? characterGif(target.skin, "relieved")
        : characterGif(target.skin, "idle");
    }

    if (!isSpin && !shot.guardAbsorbed) {
      el.shotOverlayFx.classList.add("hidden");
    }
  }

  function startShotAnimationIfNeeded(data, previousState) {
    if (!data || data.phase !== "ROULETTE_SHOT" || !data.lastShot) return false;
    const seq = Number(data.lastShot.seq || 0);
    if (!seq || rl.activeShotSeq === seq) return false;

    rl.activeShotSeq = seq;
    rl.lastShotSeq = Math.max(rl.lastShotSeq, seq);
    // Só guarda o estado imediatamente anterior ao disparo. Se o poll anterior
    // já era este mesmo giro, não serve como referência.
    const prevSeq = previousState && previousState.lastShot
      ? Number(previousState.lastShot.seq || 0)
      : 0;
    rl.preShotState = prevSeq === seq ? null : (previousState || null);
    rl.lastState = data;
    playShotAnimationSequence(data.lastShot);
    return true;
  }

  function registerAbilityFx(data) {
    const ab = data && data.lastAbility;
    if (!ab || !ab.seq || ab.seq === rl.lastAbilitySeq) return false;
    rl.lastAbilitySeq = ab.seq;
    // Guarda-Costas só toca na cena do disparo; a imagem não deve aparecer
    // uma segunda vez como FX genérico no assento.
    if (ab.fx === "fx_guarda") return true;
    const duration = ABILITY_FX_DURATION[ab.fx] || 1600;
    rl.abilityFx = {
      seq: ab.seq,
      fx: ab.fx,
      actorId: ab.actorId,
      targetId: ab.targetId || null,
      text: ab.text,
      until: Date.now() + duration,
    };
    if (rl.abilityFxTimer) clearTimeout(rl.abilityFxTimer);
    rl.abilityFxTimer = window.setTimeout(() => {
      rl.abilityFx = null;
      if (rl.lastState) {
        // Não deixa um FX antigo forçar um render IDLE no meio do giro.
        const step = Date.now() < rl.shotAnimUntil ? rl.shotStageStep : "IDLE";
        renderArena(rl.lastState, step);
      }
    }, duration);
    return true;
  }

  function applyServerState(data) {
    if (!data || !data.phase) return;
    if (data.phase === "LOBBY") {
      if (rl.shotReactionTimer) clearTimeout(rl.shotReactionTimer);
      rl.shotReactionTimer = null;
      rl.activeShotSeq = 0;
      rl.lastShotSeq = 0;
      rl.shotStageStep = "IDLE";
      rl.preShotState = null;
      rl.lastAbilitySeq = 0;
      rl.abilityFx = null;
      rl.toast = null;
      rl.prepKey = "";
      rl.prepReadySent = false;
      if (rl.happyTimer) clearTimeout(rl.happyTimer);
      rl.happyTimer = null;
      rl.happySeatId = null;
      rl.happySeatUntil = 0;
      rl.happyEventKey = "";
      rl.winnerHappyKey = "";
      if (rl.winnerScreenTimer) clearTimeout(rl.winnerScreenTimer);
      rl.winnerScreenTimer = null;
      rl.winnerScreenKey = "";
      rl.winnerScreenDeadline = 0;
      el.winnerPanel.classList.add("hidden");
      el.arenaScreen.classList.remove("duel-spin-focus", "shot-stage-active");
    }
    const previousState = rl.lastState;
    rl.lastState = data;

    registerAbilityFx(data);
    const justStartedShot = startShotAnimationIfNeeded(data, previousState);

    const me = (data.players || []).find((p) => p.id === rl.clientId);

    if (data.phase === "LOBBY" || !me) {
      if (el.lobbyScreen.classList.contains("hidden") && rl.active) {
        el.arenaScreen.classList.add("hidden");
        el.lobbyScreen.classList.remove("hidden");
      }
      renderLobby(data);
      return;
    }

    if (el.arenaScreen.classList.contains("hidden") && rl.active) {
      el.lobbyScreen.classList.add("hidden");
      el.arenaScreen.classList.remove("hidden");
      closeBotPicker();
    }

    const shotStillAnimating =
      data.phase === "ROULETTE_SHOT" &&
      data.lastShot &&
      Date.now() < rl.shotAnimUntil;
    if (!justStartedShot && !shotStillAnimating) {
      const step = Date.now() < rl.shotAnimUntil ? "RESULT" : "IDLE";
      if (step === "IDLE") rl.shotStageStep = "IDLE";
      renderArena(data, step);
    } else if (
      !justStartedShot &&
      shotStillAnimating &&
      Date.now() >= rl.shotResultAt &&
      rl.shotStageStep === "SPIN"
    ) {
      rl.shotStageStep = "RESULT";
      renderArena(data, "RESULT");
    }
  }

  // ------------------------------------------------------------ bots (lobby)
  function openBotPicker() {
    if (!el.botModal) return;
    const data = rl.lastState || {};
    const roster = data.players || [];
    const taken = {};
    roster.forEach((p) => {
      if (p && p.skin) taken[p.skin] = p;
    });

    el.botModalOptions.innerHTML = "";
    SKIN_ORDER.forEach((skin) => {
      const owner = taken[skin];
      const kit = kitFor(data, skin) || FALLBACK_KITS[skin] || {};
      const option = document.createElement("button");
      option.type = "button";
      option.className = "pixel-btn bot-option "
        + (owner ? "btn-slate" : "btn-gold");
      option.disabled = !!owner;
      option.innerHTML = `
        <img src="assets/portrait_${skin}.png" alt="" class="pixel-img bot-option-portrait" />
        <span class="bot-option-info">
          <span class="ability-option-label">${SKIN_LABELS[skin] || skin}</span>
          <span class="ability-option-sub">${escapeHtml(kit.role || "")}</span>
        </span>
        <span class="bot-option-status">${owner ? `JÁ ESCOLHIDO · ${escapeHtml(owner.nick)}` : "ADICIONAR"}</span>
      `;
      option.addEventListener("click", () => {
        AudioFX.playClick();
        addBotFromPicker(skin);
      });
      el.botModalOptions.appendChild(option);
    });

    el.botModal.classList.remove("hidden");
  }

  function closeBotPicker() {
    if (!el.botModal) return;
    el.botModal.classList.add("hidden");
  }

  function notifyLobby(message) {
    if (!message) return;
    if (rl.lastState && rl.lastState.phase === "LOBBY") {
      showLobbyNotice(message);
    } else {
      showToast(message);
    }
  }

  async function addBotFromPicker(skin) {
    try {
      const data = await apiPost("/api/roulette/bot", { skin });
      if (data && data.phase) applyServerState(data);
      if (data && data.ok) {
        closeBotPicker();
        notifyLobby(data.message || "Bot adicionado.");
      } else {
        notifyLobby((data && data.message) || "Não foi possível adicionar o bot.");
        openBotPicker();
      }
    } catch (_) {
      notifyLobby("Falha ao adicionar o bot.");
    }
  }

  async function removeBotById(botId) {
    if (!botId) return;
    try {
      const data = await apiPost("/api/roulette/bot", { removeBot: botId });
      if (data && data.phase) applyServerState(data);
      notifyLobby((data && data.message) || "Bot removido.");
      if (el.botModal && !el.botModal.classList.contains("hidden")) openBotPicker();
    } catch (_) {
      notifyLobby("Falha ao remover o bot.");
    }
  }

  function renderLobby(data) {
    updateSkinSelectionUI(data.players);
    el.myDevice.textContent = `${data.viewerIp} • ${data.viewerPlatform}`;
    el.playerCount.textContent = `${data.players.length} / ${data.maxPlayers}`;

    el.lobbyPlayers.innerHTML = "";
    if (data.players.length === 0) {
      el.lobbyPlayers.innerHTML = `<div class="roster-row"><span class="roster-ip">Nenhum jogador entrou ainda. Digite seu nick e clique em Entrar!</span></div>`;
    } else {
      data.players.forEach((p) => {
        const isMe = p.id === rl.clientId;
        const row = document.createElement("div");
        row.className = "roster-row"
          + (isMe ? " me" : "")
          + (p.isBot ? " bot" : "");
        const place = p.isBot ? "BOT • CPU" : `${p.ip} • ${p.platform}`;
        const tagText = p.isBot
          ? ((FALLBACK_KITS[p.skin] || {}).role || SKIN_LABELS[p.skin] || p.skin)
          : (SKIN_LABELS[p.skin] || p.skin);
        row.innerHTML = `
          <div class="roster-left">
            <img src="${characterGif(p.skin, "idle")}" alt="${p.skin}" class="pixel-img" />
            <div>
              <div class="roster-nick">${escapeHtml(p.nick)}${isMe ? " (VOCÊ)" : ""}${p.isBot ? ' <span class="bot-badge">BOT</span>' : ""}</div>
              <div class="roster-ip">${escapeHtml(place)}</div>
            </div>
          </div>
          <div class="roster-right">
            <span class="roster-tag">${escapeHtml(tagText)}</span>
            ${p.isBot ? `<button type="button" class="pixel-btn btn-red btn-sm roster-remove" data-bot-id="${escapeHtml(p.id)}" title="Remover ${escapeHtml(p.nick)} da mesa">REMOVER</button>` : ""}
          </div>
        `;
        const removeBtn = row.querySelector(".roster-remove");
        if (removeBtn) {
          removeBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            AudioFX.playClick();
            removeBotById(p.id);
          });
        }
        el.lobbyPlayers.appendChild(row);
      });
    }

    el.networkDevices.innerHTML = "";
    (data.networkDevices || []).forEach((dev) => {
      const pill = document.createElement("span");
      pill.className = "device-pill";
      const label = dev.nick ? `${dev.nick} (${dev.ip})` : `${dev.ip} • ${dev.platform}`;
      pill.textContent = label;
      el.networkDevices.appendChild(pill);
    });

    const me = data.players.find((p) => p.id === rl.clientId);
    el.btnAddBot.disabled = data.players.length >= data.maxPlayers;
    el.btnStart.disabled = !me || data.players.length < 2;
    el.btnLeave.disabled = !me;
  }

  function spriteForPlayer(p, data, animStep) {
    const shot = data.phase === "ROULETTE_SHOT" && data.lastShot && data.lastShot.shooterId === p.id
      ? data.lastShot
      : null;
    const redirectedShot = data.phase === "ROULETTE_SHOT"
      && data.lastShot
      && data.lastShot.damageRedirected
      && data.lastShot.damageTargetId === p.id
      ? data.lastShot
      : null;
    if (rl.happySeatId === p.id && Date.now() < rl.happySeatUntil) {
      return characterGif(p.skin, "happy");
    }
    if (redirectedShot && animStep === "SPIN") return characterGif(p.skin, "idle");
    if (redirectedShot && animStep === "RESULT") {
      if (redirectedShot.guardAbsorbed) {
        return p.alive ? characterGif(p.skin, "happy") : tombstoneImage(p.skin);
      }
      if (redirectedShot.fired && Date.now() < rl.shotResultAt + SHOT_REACTION_MS) {
        return characterGif(p.skin, "shot");
      }
      if (!p.alive) return tombstoneImage(p.skin);
      return characterGif(p.skin, "idle");
    }
    if (shot && animStep === "RESULT") {
      if (shot.guardAbsorbed) {
        return p.alive ? characterGif(p.skin, "idle") : tombstoneImage(p.skin);
      }
      if (shot.fired && shot.eliminated && Date.now() >= rl.shotResultAt + SHOT_REACTION_MS) {
        return tombstoneImage(p.skin);
      }
      if (shot.damageRedirected && shot.fired && Date.now() < rl.shotResultAt + SHOT_REACTION_MS) {
        return characterGif(p.skin, "happy");
      }
      return characterGif(p.skin, "idle");
    }
    if (shot && animStep === "SPIN") return characterGif(p.skin, "idle");
    if (!p.alive) return tombstoneImage(p.skin);
    return characterGif(p.skin, "idle");
  }

  // ------------------------------------------------------------- habilidades
  function kitFor(data, skin) {
    return (data && data.kits && data.kits[skin]) || FALLBACK_KITS[skin] || null;
  }

  function showToast(message) {
    if (!message) return;
    rl.toast = { msg: message, until: Date.now() + 4200 };
    if (rl.toastTimer) clearTimeout(rl.toastTimer);
    rl.toastTimer = window.setTimeout(() => {
      rl.toast = null;
      if (rl.lastState) renderAbilityPanel(rl.lastState, rl.lastState.me);
    }, 4200);
  }

  function abilityReason(me, phase, data) {
    if (!me) return "Sem jogador";
    if (me.skin === "boss") {
      return me.guard ? "Armada" : (me.marks < 2 ? "2 setes para armar" : "Sem ficha");
    }
    if (me.ficha < 1) return "Sem ficha";
    const flags = me.flags || {};
    if (me.skin === "outlaw") return flags.municao ? "" : phase === "PREP" ? "Aguarde a etapa do Billy" : "Só na preparação";
    if (me.skin === "duchess") return flags.roletas ? "" : phase === "PREP" ? "Aguarde sua etapa" : "Só quando for girar";
    if (me.skin === "cyber") {
      if (flags.curto) return "";
      return phase === "PLAYING_CARDS" ? "Sem alvo com cartas" : "Só na fase de cartas";
    }
    if (me.skin === "phantom") {
      if (flags.sangue) return "";
      return phase === "PREP"
        ? me.lives < 2 ? "Precisa de 2+ vidas" : "Aguarde a etapa do Reaper"
        : "Só na preparação";
    }
    return "Indisponível";
  }

  function renderAbilityPanel(data, me) {
    if (!data || !me) return;
    const kit = kitFor(data, me.skin);
    if (!kit) return;

    const nameU = String(kit.name || "").toUpperCase();
    const roleU = String(kit.role || "");
    el.abilityPortrait.src = "assets/portrait_" + me.skin + ".png";
    el.abilityPortrait.alt = kit.name || me.skin;
    el.abilityToggleName.textContent = `${nameU} — ${roleU}`;
    el.abilityTogglePassive.textContent = kit.passive ? kit.passive[0] : "";

    el.abilPassiveIcon.src = `assets/ui/abil_${me.skin}_passiva.png`;
    el.abilPassiveName.textContent = kit.passive ? kit.passive[0] : "";
    el.abilPassiveDesc.textContent = kit.passive ? kit.passive[1] : "";

    el.abilChargeIcon.src = `assets/ui/abil_${me.skin}_carga.png`;
    el.abilChargeName.textContent = kit.charge ? kit.charge[0] : "";
    el.abilChargeDesc.textContent = kit.charge ? kit.charge[1] : "";

    el.abilActiveIcon.src = `assets/ui/abil_${me.skin}_ativa.png`;
    el.abilActiveName.textContent = kit.active ? kit.active[0] : "";
    el.abilActiveDesc.textContent = kit.active ? kit.active[1] : "";

    // Progresso da carga
    const marksMax = Number(me.marksMax || kit.marksMax || 0);
    if (marksMax > 0) {
      el.abilMarksWrap.classList.remove("hidden");
      const marks = Math.max(0, Math.min(marksMax, Number(me.marks || 0)));
      el.abilMarksText.textContent = `${marks}/${marksMax}`;
      el.abilBarFill.style.width = `${Math.round((marks / marksMax) * 100)}%`;
    } else {
      el.abilMarksWrap.classList.add("hidden");
    }

    // Ficha / estado da ativa
    let fichaTxt = "";
    if (me.skin === "boss") {
      fichaTxt = me.guard ? "GUARDA-COSTAS ARMADO" : (me.marks >= 2 ? "SEM FICHA" : "AGUARDANDO SETES");
    } else {
      fichaTxt = me.ficha > 0 ? "FICHA PRONTA" : "SEM FICHA";
    }
    el.abilFichaText.textContent = fichaTxt;

    const reason = abilityReason(me, data.phase, data);
    const canUse = !!me.alive && reason === "";
    el.abilUse.disabled = !canUse;
    el.abilUse.classList.toggle("ability-ready", canUse);
    el.abilUse.textContent = canUse
      ? "USAR"
      : me.skin === "boss" && me.guard
        ? "ARMADA"
        : "USAR";

    // Linha de efeito / aviso
    const effectMsg = rl.toast && Date.now() < rl.toast.until
      ? rl.toast.msg
      : me.effect || "";
    if (effectMsg) {
      el.abilEffect.textContent = effectMsg;
      el.abilEffect.classList.remove("hidden");
      el.abilEffect.classList.toggle("toast", !!(rl.toast && Date.now() < rl.toast.until));
    } else if (!canUse && reason) {
      el.abilEffect.textContent = reason;
      el.abilEffect.classList.remove("hidden");
      el.abilEffect.classList.remove("toast");
    } else {
      el.abilEffect.classList.add("hidden");
    }

    // Espiada privada do Zero
    if (me.skin === "cyber" && me.espiada) {
      el.espiadaBox.classList.remove("hidden");
      el.espiadaText.textContent = `ESPIADA: ${me.espiada}`;
      el.espiadaIcon.src = me.espiada === "PERIGOSA"
        ? "assets/ui/fx_espiada_perigosa.png"
        : "assets/ui/fx_espiada_segura.png";
      el.espiadaBox.classList.toggle("danger", me.espiada === "PERIGOSA");
    } else {
      el.espiadaBox.classList.add("hidden");
    }
  }

  function applyPanelState() {
    el.abilityBody.classList.toggle("hidden", !rl.panelOpen);
    el.abilityPanel.classList.toggle("collapsed", !rl.panelOpen);
    el.abilityToggle.setAttribute("aria-expanded", rl.panelOpen ? "true" : "false");
    el.abilityToggleArrow.textContent = rl.panelOpen ? "▾" : "▸";
  }

  function renderPrep(data, me) {
    const active = data.phase === "PREP";
    if (!active) {
      el.prepBox.classList.add("hidden");
      rl.prepReadySent = false;
      rl.prepKey = "";
      return;
    }

    const key = `${data.roundNum}:${data.chooserId}:${data.targetId}`;
    if (key !== rl.prepKey) {
      rl.prepKey = key;
      rl.prepReadySent = false;
    }

    el.prepBox.classList.remove("hidden");
    el.prepTimer.textContent = `${data.timeLeft}s`;
    el.prepBox.classList.toggle("urgent", data.timeLeft <= 3);

    const target = data.players.find((p) => p.id === data.targetId);
    const chooser = data.players.find((p) => p.id === data.chooserId);
    const step = Number.isInteger(data.prepStage) ? data.prepStage : 4;
    const actor = (data.players || []).find((p) => p.id === data.prepActorId);
    const iAmActor = !!me && me.id === data.prepActorId;
    const stepName = data.prepStageName || "CONFIRMAÇÃO FINAL";
    if (step < 4 && iAmActor) {
      el.prepHint.textContent = `ETAPA ${step + 1}/4 — SUA VEZ: ${stepName}. Use a habilidade ou pule esta etapa.`;
      el.prepHint.className = "prep-hint warn";
    } else if (step < 4) {
      el.prepHint.textContent = `${stepName}: ${actor ? actor.nick : "aguardando"}. Você pode confirmar para pular suas ações.`;
      el.prepHint.className = "prep-hint";
    } else {
      el.prepHint.textContent = `${chooser ? chooser.nick : "O vencedor"} escolheu ${target ? target.nick : "um alvo"}. Confirme quando estiver pronto; o disparo começa quando todos confirmarem ou o tempo acabar.`;
      el.prepHint.className = "prep-hint";
    }

    const readyNames = (data.prepReadyIds || [])
      .map((id) => {
        const p = data.players.find((x) => x.id === id);
        return p ? p.nick : null;
      })
      .filter(Boolean);
    el.prepReadyList.textContent = readyNames.length
      ? `PRONTOS: ${readyNames.join(", ")}`
      : "PRONTOS: —";

    const alreadyReady = (data.prepReadyIds || []).includes(rl.clientId);
    el.btnReady.disabled = alreadyReady;
    el.btnReady.textContent = alreadyReady ? "AGUARDANDO..." : iAmActor && step < 4 ? "PULAR ETAPA" : "PRONTO";
  }

  function openAbilityModal(title, text, options) {
    el.abilityModalCancel.textContent = "CANCELAR";
    el.abilityModalTitle.textContent = title;
    el.abilityModalText.textContent = text || "";
    el.abilityModalOptions.innerHTML = "";

    (options || []).forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pixel-btn ability-option " + (opt.className || "btn-slate");
      btn.disabled = !!opt.disabled;

      const label = document.createElement("span");
      label.className = "ability-option-label";
      label.textContent = opt.label || "";
      btn.appendChild(label);

      if (opt.sub) {
        const sub = document.createElement("span");
        sub.className = "ability-option-sub";
        sub.textContent = opt.sub;
        btn.appendChild(sub);
      }
      btn.addEventListener("click", () => {
        AudioFX.playClick();
        opt.onClick && opt.onClick();
      });
      el.abilityModalOptions.appendChild(btn);
    });

    el.abilityModal.classList.remove("hidden");
    rl.abilityModalOpen = true;
  }

  function closeAbilityModal() {
    el.abilityModal.classList.add("hidden");
    el.abilityModalCancel.textContent = "CANCELAR";
    rl.abilityModalOpen = false;
  }

  function openAbilityInfo(kind) {
    const data = rl.lastState;
    const me = data && (data.players || []).find((p) => p.id === rl.clientId);
    const kit = me && kitFor(data, me.skin);
    const detail = me && ABILITY_DETAILS[me.skin] && ABILITY_DETAILS[me.skin][kind];
    if (!kit || !detail) return;
    const ability = kit[kind] && kit[kind][0] || "HABILIDADE";
    openAbilityModal(ability, detail, []);
    el.abilityModalCancel.textContent = "FECHAR";
  }

  async function performAbility(payload) {
    closeAbilityModal();
    AudioFX.ensureContext();
    try {
      const data = await apiPost("/api/roulette/ability", payload);
      if (data && data.message) showToast(data.message);
      if (data && data.phase) applyServerState(data);
    } catch (_) {
      showToast("Falha ao usar a habilidade.");
    }
  }

  function aliveOpponents(data) {
    return (data.players || []).filter((p) => p.alive && p.id !== rl.clientId);
  }

  function openBillyModal(data) {
    const options = aliveOpponents(data).map((p) => ({
      label: `${p.nick}`,
      sub: `${SKIN_LABELS[p.skin] || p.skin} • ${p.lives} vida(s) • tambor ${p.odds}`,
      className: "btn-slate",
      onClick: () => performAbility({ kind: "municao", targetId: p.id }),
    }));
    if (!options.length) {
      showToast("Nenhum alvo disponível.");
      return;
    }
    openAbilityModal(
      "MUNIÇÃO TURBINADA",
      "Escolha quem será marcado. O próximo tiro desse alvo causa 2 de dano (o efeito é consumido mesmo se der clique).",
      options
    );
  }

  function openViperModal() {
    openAbilityModal(
      "ROLETA DE CABEÇAS",
      "A Viper vai sortear um jogador vivo (pode ser ela mesma). O sorteado recebe +1 munição e gira depois dela. O sorteio é público.",
      [{
        label: "GIRAR A ROLETA",
        sub: "Gasta 1 ficha",
        className: "btn-gold",
        onClick: () => performAbility({ kind: "roletas" }),
      }]
    );
  }

  function openZeroModal(data) {
    const options = aliveOpponents(data)
      .filter((p) => (p.hand || []).length > 0)
      .map((p) => ({
        label: `${p.nick}`,
        sub: `${SKIN_LABELS[p.skin] || p.skin} • ${p.score.total} pontos`,
        className: "btn-slate",
        onClick: () => openZeroCardModal(data, p),
      }));
    if (!options.length) {
      showToast("Nenhum alvo com cartas na mão.");
      return;
    }
    openAbilityModal(
      "CURTO-CIRCUITO — ESCOLHA O ALVO",
      "Você recebe uma carta aleatória do alvo e entrega uma carta escolhida da sua mão.",
      options
    );
  }

  function openZeroCardModal(data, target) {
    const mePlayer = data.players.find((p) => p.id === rl.clientId);
    const hand = (mePlayer && mePlayer.hand) || [];
    if (!hand.length) {
      showToast("Você não tem cartas para trocar.");
      return;
    }
    const options = hand.map((c, idx) => ({
      label: `${c.rank} de ${c.suit ? c.suit.name : "?"}`,
      sub: "Entregar esta carta",
      className: "btn-slate",
      onClick: () => performAbility({
        kind: "curto",
        targetId: target.id,
        cardIndex: idx,
      }),
    }));
    openAbilityModal(
      `ENTREGAR CARTA PARA ${target.nick}`,
      "A carta aleatória do alvo já está reservada para você. Escolha qual das suas cartas entregar.",
      options
    );
  }

  function openReaperModal(data) {
    const mePlayer = data.players.find((p) => p.id === rl.clientId);
    const options = [];
    if (data.prepStage === 0) {
      options.push({
        label: "MALDIÇÃO",
        sub: "Alvo gira agora com no mínimo 4/6",
        className: "btn-red",
        onClick: () => openReaperTargetModal(data, "maldicao", "MALDIÇÃO", "Escolha quem vai girar agora. O tambor dele terá no mínimo 4/6."),
      });
      options.push({
        label: "SELO DE CHUMBO",
        sub: "Alvo começa todo giro com +1 bala",
        className: "btn-slate",
        onClick: () => openReaperTargetModal(data, "selo", "SELO DE CHUMBO", "Escolha quem receberá o Selo até o fim da partida."),
      });
    } else if (data.prepStage === 3 && data.targetId === rl.clientId) {
      options.push({
        label: "BONECO VUDÚ",
        sub: "Paga 1 vida + 1 ficha; transfere o dano ou força punição",
        className: "btn-orange",
        onClick: () => openReaperTargetModal(data, "boneco", "BONECO VUDÚ", "Escolha um jogador vivo para amaldiçoar. O prazo inclui esta rodada e as quatro seguintes. Se um disparo atingir você, todo o dano passa para o amaldiçoado e o efeito termina. Sem transferência até o fim da quinta rodada, a maldição acaba antes de você girar com no mínimo 5/6; com 1 vida, o Espectro limita o giro a 2/6. A punição não transfere dano."),
      });
    }

    openAbilityModal(
      "SANGUE POR SANGUE",
      `Pague 1 vida e 1 ficha (você tem ${mePlayer ? mePlayer.lives : "?"} vida(s)) e escolha o efeito desta etapa.`,
      options
    );
  }

  function openReaperTargetModal(data, mode, title, text) {
    const options = aliveOpponents(data).map((p) => ({
      label: `${p.nick}`,
      sub: `${SKIN_LABELS[p.skin] || p.skin} • ${p.lives} vida(s)`,
      className: "btn-slate",
      onClick: () => performAbility({ kind: "sangue", mode, targetId: p.id }),
    }));
    if (!options.length) {
      showToast("Nenhum alvo disponível.");
      return;
    }
    openAbilityModal(title, text, options);
  }

  function handleAbilityButton() {
    const data = rl.lastState;
    const me = data && data.me;
    if (!data || !me) return;
    if (abilityReason(me, data.phase, data) !== "") return;

    if (me.skin === "outlaw") openBillyModal(data);
    else if (me.skin === "duchess") openViperModal();
    else if (me.skin === "cyber") openZeroModal(data);
    else if (me.skin === "phantom") openReaperModal(data);
  }

  function renderWinnerPanel(data, champion) {
    const until = Number(data.winnerScreenUntil || 0);
    const remainingMs = Math.max(0, Number(data.winnerScreenRemainingMs || 0));
    const key = champion && until ? `${champion.id}:${until}` : "";

    if (data.phase !== "GAME_OVER" || !champion || !key) {
      if (rl.winnerScreenTimer) clearTimeout(rl.winnerScreenTimer);
      rl.winnerScreenTimer = null;
      rl.winnerScreenKey = "";
      rl.winnerScreenDeadline = 0;
      el.winnerPanel.classList.add("hidden");
      return false;
    }

    if (rl.winnerScreenKey !== key) {
      if (rl.winnerScreenTimer) clearTimeout(rl.winnerScreenTimer);
      rl.winnerScreenKey = key;
      rl.winnerScreenDeadline = Date.now() + remainingMs;
      if (remainingMs > 0) {
        rl.winnerScreenTimer = window.setTimeout(() => {
          rl.winnerScreenTimer = null;
          if (rl.lastState) renderArena(rl.lastState, "IDLE");
        }, remainingMs);
      }
    }

    const visible = Date.now() < rl.winnerScreenDeadline;
    el.winnerPanel.classList.toggle("hidden", !visible);
    if (!visible) return false;

    const kit = kitFor(data, champion.skin);
    el.winnerPortrait.src = `assets/portrait_${champion.skin}.png`;
    el.winnerPortrait.alt = `Retrato de ${champion.nick}`;
    el.winnerName.textContent = champion.nick;
    el.winnerRole.textContent = `${SKIN_LABELS[champion.skin] || champion.skin} · ${(kit && kit.role) || ""}`;
    el.winnerSprite.src = characterGif(champion.skin, "idle");
    el.winnerSprite.alt = `${champion.nick}, último sobrevivente`;
    return true;
  }

  // Durante o giro, o servidor já sabe o resultado, mas o assento não pode
  // entregá-lo antes de a câmara parar. Usa a vida/tambor de antes do disparo.
  function stagedShotPlayer(p, data, animStep) {
    const shot = data.lastShot;
    const shotSpinning =
      animStep === "SPIN" || Date.now() < rl.shotResultAt;
    if (
      !shot ||
      data.phase !== "ROULETTE_SHOT" ||
      !shotSpinning ||
      (p.id !== shot.shooterId && !(shot.damageRedirected && p.id === shot.damageTargetId))
    ) {
      return p;
    }

    const prev = ((rl.preShotState && rl.preShotState.players) || [])
      .find((x) => x.id === p.id);
    if (shot.damageRedirected && p.id === shot.damageTargetId) {
      return prev ? { ...p, ...prev } : {
        ...p,
        lives: Number(shot.damageTargetLivesBefore) || p.lives,
        alive: true,
      };
    }
    const bulletsBefore = Number(shot.bulletCountBefore);

    let livesBefore = Number(shot.livesBefore);
    if (!Number.isFinite(livesBefore) || livesBefore <= 0) {
      if (prev && Number.isFinite(Number(prev.lives))) {
        livesBefore = Number(prev.lives);
      } else if (!shot.fired) {
        livesBefore = Number(shot.livesLeft);
      } else if (shot.guardAbsorbed) {
        livesBefore = Math.max(1, Number(shot.damage) || 1, Number(shot.livesLeft) || 1);
      } else {
        livesBefore = (Number(shot.livesLeft) || 0) + (Number(shot.damage) || 1);
      }
    }
    if (!Number.isFinite(livesBefore) || livesBefore <= 0) {
      livesBefore = Number(p.lives) || 1;
    }

    return {
      ...p,
      lives: livesBefore,
      alive: true,
      bullets: Number.isFinite(bulletsBefore)
        ? Math.max(1, Math.min(6, bulletsBefore))
        : (prev ? prev.bullets : p.bullets),
      odds: shot.oddsBefore || (prev ? prev.odds : p.odds),
      // Efeitos consumidos no início do giro continuam visíveis até o fim.
      guard: prev ? prev.guard : p.guard,
      ficha: prev ? prev.ficha : p.ficha,
      marcado: prev ? prev.marcado : p.marcado,
      selo: prev ? prev.selo : p.selo,
      setes: prev ? prev.setes : p.setes,
      marks: prev ? prev.marks : p.marks,
    };
  }

  // ------------------------------------------------------------------ arena
  function renderArena(data, animStep) {
    if (!data) return;
    renderShotOverlay(data, animStep);
    const champion = data.players.find((p) => p.id === data.championId);
    const winnerPanelVisible = renderWinnerPanel(data, champion);
    showWinnerHappy(data, champion);
    const alivePlayers = data.players.filter((p) => p.alive);
    const me = data.players.find((p) => p.id === rl.clientId);
    const aliveBeforeSpin = alivePlayers.length
      + (animStep === "SPIN" && data.lastShot
        && (data.lastShot.damageTargetEliminated || data.lastShot.eliminated) ? 1 : 0);
    const focusDuelSpin = window.innerWidth > 960
      && data.phase === "ROULETTE_SHOT"
      && animStep === "SPIN"
      && aliveBeforeSpin === 2;
    el.arenaScreen.classList.toggle("duel-spin-focus", focusDuelSpin);
    const shotStageActive = window.innerWidth > 960
      && data.phase === "ROULETTE_SHOT"
      && animStep !== "IDLE";
    el.arenaScreen.classList.toggle("shot-stage-active", shotStageActive);

    el.roundNum.textContent = `${data.roundNum}`;
    el.aliveCount.textContent = `${aliveBeforeSpin}/${data.players.length}`;
    el.timer.textContent = (data.phase === "PLAYING_CARDS" || data.phase === "PREP")
      ? `${data.timeLeft}s`
      : "-";
    el.arenaIp.textContent = `${data.viewerIp}`;

    const isMyTurnCards =
      data.phase === "PLAYING_CARDS" && me && me.alive && !me.stood && !me.busted;
    const isMyShoot =
      data.phase === "CHOOSE_TARGET" && data.currentShooterId === rl.clientId;

    el.btnHit.classList.toggle("hidden", data.phase !== "PLAYING_CARDS");
    el.btnStand.classList.toggle("hidden", data.phase !== "PLAYING_CARDS");
    el.btnHit.disabled = !isMyTurnCards;
    el.btnStand.disabled = !isMyTurnCards;
    const shotCanAdvance = data.phase === "ROULETTE_SHOT" && Date.now() >= rl.shotAnimUntil;
    el.btnNext.classList.toggle("hidden", !shotCanAdvance);
    el.btnRematch.classList.toggle("hidden", data.phase !== "GAME_OVER" || winnerPanelVisible);

    // Centro / banner
    if (data.phase === "PLAYING_CARDS") {
      el.revolverImg.src = "assets/revolver_idle.png";
      el.revolverImg.classList.remove("self-aim");
      el.phaseBanner.className = "status-banner";
      if (isMyTurnCards) {
        el.phaseBanner.textContent = "SUA VEZ NAS CARTAS!";
        el.shotDetail.textContent = "Faça a maior mão (até 21) para ganhar o direito de atirar!";
      } else {
        el.phaseBanner.textContent = "AGUARDANDO JOGADORES...";
        el.shotDetail.textContent = "Você já finalizou sua mão. Esperando os outros terminarem.";
      }
    } else if (data.phase === "CHOOSE_TARGET") {
      el.revolverImg.src = "assets/revolver_spin.gif";
      el.revolverImg.classList.remove("self-aim");
      const shooter = data.players.find((p) => p.id === data.currentShooterId);
      if (isMyShoot) {
        el.phaseBanner.className = "status-banner bj";
        el.phaseBanner.textContent = "VOCÊ VENCEU A RODADA! ESCOLHA O ALVO!";
        el.shotDetail.textContent = "Escolha um adversário: ele apontará o revólver para si mesmo.";
      } else {
        el.phaseBanner.className = "status-banner";
        el.phaseBanner.textContent = `${shooter ? shooter.nick : "Vencedor"} ESCOLHERÁ O ALVO!`;
        el.shotDetail.textContent = "O vencedor está escolhendo quem deverá atirar em si mesmo...";
      }
    } else if (data.phase === "PREP") {
      el.revolverImg.src = "assets/revolver_idle.png";
      el.revolverImg.classList.remove("self-aim");
      const target = data.players.find((p) => p.id === data.targetId);
      const chooser = data.players.find((p) => p.id === data.chooserId);
      const iAmTarget = me && me.id === data.targetId;
      el.phaseBanner.className = "status-banner prep";
      if (iAmTarget) {
        el.phaseBanner.className = "status-banner prep warn";
        el.phaseBanner.textContent = `VOCÊ FOI ESCOLHIDO, ${me.nick}!`;
      } else {
        el.phaseBanner.textContent = "JANELA DE PREPARAÇÃO";
      }
      el.shotDetail.textContent =
        `${chooser ? chooser.nick : "Vencedor"} escolheu ${target ? target.nick : "o alvo"}. ` +
        `Habilidades podem ser usadas por ${data.timeLeft}s antes do tambor girar.`;
    } else if (data.phase === "ROULETTE_SHOT" && data.lastShot) {
      const sh = data.lastShot;
      const sourceLabel = shotSourceLabel(sh);
      el.revolverImg.src = "assets/revolver_idle.png";
      el.revolverImg.classList.remove("self-aim");
      if (Date.now() < rl.shotAnimUntil && animStep === "SPIN") {
        el.phaseBanner.className = "status-banner";
        el.phaseBanner.textContent = sourceLabel
          ? `${sourceLabel}! ${sh.shooterNick} VAI GIRAR...`
          : `${sh.shooterNick} APONTANDO PARA SI MESMO...`;
        el.shotDetail.textContent = sh.bonecoPenalty
          ? bonecoPenaltyDetail(sh)
          : sh.curse
            ? `${sh.chooserNick} lançou a Maldição (mínimo 4/6).`
            : `${sh.chooserNick} escolheu ${sh.shooterNick} (Chance: ${sh.oddsBefore})`;
      } else if (sh.bonecoPenalty) {
        el.phaseBanner.className = sh.fired ? "status-banner lose" : "status-banner push";
        el.phaseBanner.textContent = sh.fired
          ? sh.eliminated
            ? "PUNIÇÃO DO BONECO! REAPER FOI ELIMINADO!"
            : "PUNIÇÃO DO BONECO! BANG NO REAPER!"
          : "PUNIÇÃO DO BONECO! CLIQUE — REAPER SOBREVIVEU!";
        el.shotDetail.textContent = sh.fired
          ? `O giro de punição não transfere dano. Restam ${sh.livesLeft} vida(s); chance: ${sh.oddsBefore}.`
          : `${bonecoPenaltyDetail(sh)} Próxima chance: ${sh.oddsAfter}.`;
      } else if (sh.damageRedirected) {
        const victimName = sh.damageTargetNick || "o amaldiçoado";
        el.phaseBanner.className = sh.guardAbsorbed ? "status-banner win" : "status-banner lose";
        if (sh.guardAbsorbed) {
          el.phaseBanner.textContent = `BONECO VUDÚ! O CAPANGA SALVOU ${victimName}!`;
          el.shotDetail.textContent = `O tiro contra ${sh.shooterNick} transferiu ${sh.damage} dano(s) para ${victimName}, mas o Guarda-Costas absorveu o disparo.`;
        } else if (sh.damageTargetEliminated) {
          el.phaseBanner.textContent = `BANG! ${victimName} FOI ELIMINADO!`;
          el.shotDetail.textContent = `O Boneco Vudú transferiu ${sh.damage} dano(s) do tiro que atingiu ${sh.shooterNick} (${sh.oddsBefore}).`;
        } else {
          el.phaseBanner.textContent = `BONECO VUDÚ! TIRO TRANSFERIDO PARA ${victimName}!`;
          el.shotDetail.textContent = `${victimName} perdeu ${sh.damage} vida(s); restam ${sh.damageTargetLivesLeft}. ${sh.shooterNick} não perdeu vida.`;
        }
      } else if (sh.guardAbsorbed) {
        el.phaseBanner.className = "status-banner win";
        el.phaseBanner.textContent = `GUARDA-COSTAS! ${sh.shooterNick} SOBREVIVEU!`;
        el.shotDetail.textContent =
          `O capanga morreu no lugar de ${sh.shooterNick}. Ele ficou com 1 vida e o tambor foi para 3/6.`;
      } else if (sh.fired) {
        el.phaseBanner.className = "status-banner lose";
        el.phaseBanner.textContent = sh.eliminated
          ? `BANG! ${sh.shooterNick} SE ELIMINOU!`
          : `BANG! ${sh.shooterNick} PERDEU ${sh.damage} VIDA${sh.damage > 1 ? "S" : ""}!`;
        el.shotDetail.textContent = sh.eliminated
          ? `${sh.chooserNick} escolheu ${sh.shooterNick}; ele atirou em si mesmo (${sh.oddsBefore}) e saiu do jogo!`
          : `${sh.shooterNick} atirou em si mesmo (${sh.oddsBefore})${sh.damage > 1 ? " com dano 2" : ""}! Restam ${sh.livesLeft} vidas (tambor voltou a 1/6).`;
      } else {
        el.phaseBanner.className = "status-banner push";
        el.phaseBanner.textContent = `*CLIQUE*! ${sh.shooterNick} SOBREVIVEU!`;
        let extra = "";
        if (sh.pulso === "success") extra = " PULSO FIRME: a bala não subiu.";
        else if (sh.pulso === "fail") extra = " PULSO FIRME falhou: tambor foi para 2/6.";
        el.shotDetail.textContent =
          `A bala não saiu (${sh.oddsBefore}).${extra} Próxima chance de ${sh.shooterNick}: ${sh.oddsAfter}!`;
      }
    } else if (data.phase === "GAME_OVER") {
      el.revolverImg.src = "assets/revolver_idle.png";
      el.revolverImg.classList.remove("self-aim");
      const champ = data.players.find((p) => p.id === data.championId);
      el.phaseBanner.className = "status-banner win";
      el.phaseBanner.textContent = champ
        ? `CAMPEÃO: ${champ.nick}!`
        : "FIM DA PARTIDA!";
      el.shotDetail.textContent = "Último sobrevivente na mesa! Clique em 'Voltar ao Lobby' para jogar outra.";
    }

    // Janela de preparação
    renderPrep(data, me);

    if (data.phase === "GAME_OVER" && winnerPanelVisible) {
      el.phaseBanner.textContent = "PARTIDA ENCERRADA!";
      el.shotDetail.textContent = "O vencedor está sendo celebrado por 10 segundos.";
    }

    // Painel de habilidade permanente
    if (me) {
      let panelMe = data.me || me;
      if (
        panelMe
        && animStep === "SPIN"
        && data.phase === "ROULETTE_SHOT"
        && data.lastShot
        && data.lastShot.shooterId === panelMe.id
        && rl.preShotState
        && rl.preShotState.me
      ) {
        // O Guarda-Costas do Don não pode "desarmar" na tela antes do BANG.
        panelMe = { ...panelMe, guard: rl.preShotState.me.guard };
      }
      renderAbilityPanel(data, panelMe);
    }

    // Assentos
    const fx = rl.abilityFx && Date.now() < rl.abilityFx.until ? rl.abilityFx : null;
    el.seatsGrid.innerHTML = "";
    data.players.forEach((rawPlayer) => {
      const p = stagedShotPlayer(rawPlayer, data, animStep);
      const card = document.createElement("div");
      const isMe = p.id === rl.clientId;
      const isShooter = data.phase === "CHOOSE_TARGET" && p.id === data.currentShooterId;
      const isChosenTarget = data.phase === "PREP" && p.id === data.targetId;
      const inlineShotStage = window.innerWidth > 960;
      const isStagedTarget = inlineShotStage
        && data.phase === "ROULETTE_SHOT"
        && data.lastShot
        && data.lastShot.shooterId === p.id
        && animStep === "SPIN";
      const isDeathAnimationPending =
        data.phase === "ROULETTE_SHOT" &&
        data.lastShot &&
        (data.lastShot.shooterId === p.id || (data.lastShot.damageRedirected && data.lastShot.damageTargetId === p.id)) &&
        data.lastShot.fired &&
        (data.lastShot.eliminated || data.lastShot.damageTargetEliminated) &&
        animStep === "RESULT" &&
        Date.now() < rl.shotResultAt + SHOT_REACTION_MS;
      const seatLeavingClass = isStagedTarget ? " shot-leaving" : "";
      const isHitShake =
        data.phase === "ROULETTE_SHOT" &&
        animStep === "RESULT" &&
        data.lastShot &&
        data.lastShot.fired &&
        (data.lastShot.damageRedirected
          ? data.lastShot.damageTargetId === p.id
          : data.lastShot.targetId === p.id);

      card.className =
        "seat-card" +
        (isMe ? " me" : "") +
        (isShooter ? " shooter" : "") +
        (isChosenTarget ? " chosen-target" : "") +
        (data.phase === "ROULETTE_SHOT" && data.lastShot && data.lastShot.shooterId === p.id && animStep !== "IDLE" ? " self-shooter" : "") +
        (isStagedTarget ? " shot-away" : "") +
        (isDeathAnimationPending ? " shot-death-pending" : "") +
        (!p.alive && !isStagedTarget ? " dead" : "") +
        (isHitShake ? " target-flash" : "");

      const heartsHtml = [0, 1, 2]
        .map((i) => `<img src="assets/${i < p.lives ? "heart_full" : "heart_empty"}.png" class="pixel-img" alt="" />`)
        .join("");

      const cylNum = p.alive ? Math.max(1, Math.min(6, p.bullets || 1)) : 1;
      const dangerClass = p.bullets >= 4 ? " danger" : "";
      const oddsTxt = p.alive ? `Chance ${p.odds}` : "ELIMINADO";

      const cardsHtml = (p.hand || [])
        .map(
          (c) => `
          <div class="mini-card ${c.suit.color}">
            <span>${c.rank}</span>
            <img src="${c.royal ? c.royal : c.suit.icon}" class="pixel-img" alt="" />
          </div>`
        )
        .join("");

      let statusTxt = `${p.score.total} PTS`;
      let statusCls = "seat-hand-status";
      if (!p.alive) {
        statusTxt = "ELIMINADO";
        statusCls += " bust";
      } else if (p.busted) {
        statusTxt = `${p.score.total} ESTOUROU`;
        statusCls += " bust";
      } else if (p.score.isBlackjack) {
        statusTxt = "21 BLACKJACK";
        statusCls += " bj";
      } else if (p.stood) {
        statusTxt = `${p.score.total} PAROU`;
      }

      const spriteSrc = spriteForPlayer(p, data, animStep);
      const canShootThis = isMyShoot && p.alive && !isMe;
      const isSelfShotTarget =
        !inlineShotStage &&
        data.phase === "ROULETTE_SHOT" &&
        data.lastShot &&
        data.lastShot.shooterId === p.id &&
        animStep !== "IDLE";
      const drumBulletCount = data.lastShot && data.lastShot.shooterId === p.id
        ? data.lastShot.bulletCountBefore
        : p.bullets;
      const chamberIndex = data.lastShot && data.lastShot.shooterId === p.id
        ? data.lastShot.chamberIndex
        : 0;
      const drumRotation = -(Number(chamberIndex || 0) * 60 + 1440);
      let selfShotGunSrc = "";
      if (isSelfShotTarget) {
        selfShotGunSrc = animStep === "SPIN"
          ? "assets/revolver_spin.gif"
          : data.lastShot.fired
            ? "assets/revolver_bang.png"
            : "assets/revolver_click.png";
      }
      const drumHtml = isSelfShotTarget
        ? `<div class="self-shot-drum-wrap">
             <span class="self-shot-pointer" aria-hidden="true"></span>
             <img src="assets/tambor/Tambor-${Math.max(1, Math.min(6, drumBulletCount || 1))}M.png"
                  class="pixel-img self-shot-drum${animStep === "SPIN" ? " spinning" : ""}"
                  style="--drum-angle: ${drumRotation}deg"
                  alt="Tambor com ${drumBulletCount} munição(ões)" />
           </div>`
        : "";

      // Chips de estado das habilidades (visíveis para todos)
      const chips = [];
      if (p.skin === "boss") {
        chips.push({ icon: "icon_status_setes", label: `SETES ${p.setes}/2` });
      }
      if (p.selo) {
        chips.push({ icon: "icon_status_selo", label: "SELO" });
      }
      if (p.marcado) {
        chips.push({ icon: "icon_status_marcado", label: "MARCADO" });
      }
      if (p.bonecoMarked) {
        chips.push({
          icon: "abil_phantom_ativa",
          label: `AMALDIÇOADO ${p.bonecoRounds}/5`,
          className: "cursed",
        });
      }
      if (p.skin === "outlaw") {
        chips.push({ icon: "icon_marca", label: `MARCA ${p.marks}/3` });
      } else if (p.skin === "phantom") {
        chips.push({ icon: "icon_status_sangue", label: `MARCA ${p.marks}/3` });
      }
      if (p.skin === "phantom" && p.alive && p.lives === 1) {
        chips.push({ icon: "icon_status_espectro", label: "ESPECTRO" });
      }
      if (p.skin === "boss" && p.guard) {
        // guard é privado: o servidor só envia para o próprio Don.
        chips.push({ icon: "icon_status_guarda", label: "GUARDA-COSTAS ARMADO" });
      }
      const chipsHtml = chips.length
        ? `<div class="seat-chips">${chips.map((c) => `
            <span class="seat-chip${c.label === "GUARDA-COSTAS ARMADO" ? " guard" : ""}${c.className ? ` ${c.className}` : ""}">
              <img src="assets/ui/${c.icon}.png" class="pixel-img" alt="" />${c.label}
            </span>`).join("")}</div>`
        : "";

      const fxKey = `${fx ? fx.seq : ""}`;
      const showFx = fx && (fx.targetId === p.id || (!fx.targetId && fx.actorId === p.id));
      const fxHtml = showFx
        ? `<img src="assets/fx/${fx.fx}.gif?t=${fxKey}" class="pixel-img seat-ability-fx" alt="" />`
        : "";
      const reticleHtml = (showFx || isChosenTarget)
        ? `<img src="assets/fx/target_reticle.png" class="pixel-img seat-reticle" alt="" />`
        : "";

      card.innerHTML = `
        ${fxHtml}
        ${reticleHtml}
        <div class="seat-top">
          <span class="seat-nick">${escapeHtml(p.nick)}${isMe ? " (EU)" : ""}</span>
          <span class="seat-ip">${escapeHtml(p.ip)}</span>
        </div>
        <div class="seat-char-name">${SKIN_LABELS[p.skin] || p.skin} · ${escapeHtml((kitFor(data, p.skin) || {}).role || "")}</div>
        ${chipsHtml}
        ${drumHtml}
        <div class="seat-sprite-row">
          ${selfShotGunSrc ? `<img src="${selfShotGunSrc}" class="pixel-img self-shot-revolver" alt="Revólver do auto-disparo" />` : ""}
          <img src="${spriteSrc}" class="pixel-img seat-char-img${seatLeavingClass}" alt="${p.skin}" />
          <div class="seat-stats-col">
            <div class="hearts-row">${heartsHtml}</div>
            <div class="cylinder-badge">
              <img src="assets/cylinder_${cylNum}.png" class="pixel-img" alt="" />
              <span class="odds-text${dangerClass}">${oddsTxt}</span>
            </div>
          </div>
        </div>
        <div class="seat-cards-row">${cardsHtml}</div>
        <div class="${statusCls}">${statusTxt}</div>
      `;

      if (canShootThis) {
        const shootBtn = document.createElement("button");
        shootBtn.type = "button";
        shootBtn.className = "pixel-btn btn-red btn-sm seat-shoot-btn";
        shootBtn.textContent = `ESCOLHER ${p.nick} (${p.odds})`;
        shootBtn.addEventListener("click", () => shootTarget(p.id));
        card.appendChild(shootBtn);
      }

      el.seatsGrid.appendChild(card);
    });

    // Feed colorido com símbolo e categoria em cada evento.
    renderArenaFeed(data.logs || [], data, animStep);
  }

  async function shootTarget(targetId) {
    AudioFX.playClick();
    try {
      const data = await apiPost("/api/roulette/shoot", { targetId });
      // The manual shooter must not wait for the next 900ms polling cycle.
      // Start immediately from the POST response; duplicate polling states
      // are ignored by activeShotSeq.
      startShotAnimationIfNeeded(data);
      applyServerState(data);
    } catch (_) {}
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toggleBgm() {
    AudioFX.ensureContext();
    AudioFX.setBgmEnabled(!AudioFX.bgmEnabled);
    AudioFX.playClick();
    syncAudioButtons();
  }

  function toggleSfx() {
    AudioFX.ensureContext();
    AudioFX.setSfxEnabled(!AudioFX.sfxEnabled);
    if (AudioFX.sfxEnabled) AudioFX.playClick();
    syncAudioButtons();
  }

  function bindEvents() {
    el.btnOpenRoulette.addEventListener("click", openLobby);
    el.btnMenu.addEventListener("click", closeToMainMenu);

    el.btnRulesLobby.addEventListener("click", () => {
      AudioFX.playClick();
      el.rulesModal.classList.remove("hidden");
    });
    el.btnRulesArena.addEventListener("click", () => {
      AudioFX.playClick();
      el.rulesModal.classList.remove("hidden");
    });
    el.btnCloseRules.addEventListener("click", () => {
      AudioFX.playClick();
      el.rulesModal.classList.add("hidden");
    });
    el.rulesModal.addEventListener("click", (e) => {
      if (e.target === el.rulesModal) {
        el.rulesModal.classList.add("hidden");
      }
    });

    [el.btnLobbyBgm, el.btnArenaBgm].forEach((b) => b && b.addEventListener("click", toggleBgm));
    [el.btnLobbySfx, el.btnArenaSfx].forEach((b) => b && b.addEventListener("click", toggleSfx));

    el.skinCards.forEach((card) => {
      const select = () => {
        AudioFX.playClick();
        const owner = skinOwner(card.dataset.skin, (rl.lastState && rl.lastState.players) || []);
        if (owner) {
          const characterName = card.querySelector(".char-name")?.textContent || "Esse personagem";
          showLobbyNotice(`${characterName} já foi escolhido por ${owner.nick}. Escolha outro.`);
          return;
        }
        showLobbyNotice("");
        rl.skin = card.dataset.skin;
        updateSkinSelectionUI((rl.lastState && rl.lastState.players) || []);
        if (rl.lastState && rl.lastState.players.some((p) => p.id === rl.clientId)) {
          joinOrUpdate();
        }
      };
      card.addEventListener("click", select);
      card.addEventListener("keydown", (e) => {
        if (e.target.closest("button")) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select();
        }
      });

      const detailsBtn = card.querySelector(".char-details-btn");
      const detailsBox = card.querySelector(".char-details");
      if (detailsBtn && detailsBox) {
        detailsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          AudioFX.playClick();
          const panel = el.characterDetails;
          const isOpenForCard = panel
            && !panel.classList.contains("hidden")
            && panel.dataset.skin === card.dataset.skin;
          if (isOpenForCard) {
            panel.classList.add("hidden");
            panel.replaceChildren();
            delete panel.dataset.skin;
            el.skinCards.forEach((item) => {
              const button = item.querySelector(".char-details-btn");
              if (button) button.textContent = "VER DETALHES";
            });
          } else {
            panel.classList.remove("hidden");
            syncSharedCharacterDetails(card.dataset.skin);
          }
        });
      }
    });

    el.btnJoin.addEventListener("click", joinOrUpdate);
    el.nickInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") joinOrUpdate();
    });

    el.btnAddBot.addEventListener("click", () => {
      AudioFX.playClick();
      openBotPicker();
    });

    el.btnClearBots.addEventListener("click", async () => {
      AudioFX.playClick();
      try {
        applyServerState(await apiPost("/api/roulette/bot", { remove: true }));
      } catch (_) {}
    });

    el.btnLeave.addEventListener("click", async () => {
      AudioFX.playClick();
      try {
        applyServerState(await apiPost("/api/roulette/leave", {}));
      } catch (_) {}
    });

    el.btnStart.addEventListener("click", async () => {
      AudioFX.playClick();
      try {
        applyServerState(await apiPost("/api/roulette/start", {}));
      } catch (_) {}
    });

    el.btnHit.addEventListener("click", async () => {
      AudioFX.playCardDeal();
      try {
        applyServerState(await apiPost("/api/roulette/action", { action: "hit" }));
      } catch (_) {}
    });

    el.btnStand.addEventListener("click", async () => {
      AudioFX.playClick();
      try {
        applyServerState(await apiPost("/api/roulette/action", { action: "stand" }));
      } catch (_) {}
    });

    el.btnNext.addEventListener("click", async () => {
      AudioFX.playClick();
      try {
        applyServerState(await apiPost("/api/roulette/next_round", {}));
      } catch (_) {}
    });

    el.btnRematch.addEventListener("click", async () => {
      AudioFX.playClick();
      try {
        applyServerState(await apiPost("/api/roulette/reset", {}));
      } catch (_) {}
    });

    el.btnBackLobby.addEventListener("click", async () => {
      AudioFX.playClick();
      try {
        applyServerState(await apiPost("/api/roulette/reset", {}));
      } catch (_) {}
    });

    // ---- Habilidades ----
    el.abilityToggle.addEventListener("click", () => {
      AudioFX.playClick();
      rl.panelOpen = !rl.panelOpen;
      rl.panelUserToggled = true;
      applyPanelState();
    });

    el.abilUse.addEventListener("click", handleAbilityButton);
    el.abilityPanel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-ability-info]");
      if (!button) return;
      event.stopPropagation();
      AudioFX.playClick();
      openAbilityInfo(button.dataset.abilityInfo);
    });
    el.abilityModalCancel.addEventListener("click", () => {
      AudioFX.playClick();
      closeAbilityModal();
    });
    el.abilityModal.addEventListener("click", (e) => {
      if (e.target === el.abilityModal) closeAbilityModal();
    });

    if (el.botModal) {
      el.botModalCancel.addEventListener("click", () => {
        AudioFX.playClick();
        closeBotPicker();
      });
      el.botModal.addEventListener("click", (e) => {
        if (e.target === el.botModal) closeBotPicker();
      });
    }

    el.btnReady.addEventListener("click", async () => {
      AudioFX.playClick();
      el.btnReady.disabled = true;
      el.btnReady.textContent = "AGUARDANDO...";
      try {
        applyServerState(await apiPost("/api/roulette/confirm", {}));
      } catch (_) {}
    });
  }

  // Em telas compactas, o painel inicia recolhido e mantém retrato e nome visíveis.
  rl.panelOpen = window.innerWidth > 960;
  applyPanelState();
  window.addEventListener("resize", () => {
    if (!rl.panelUserToggled) {
      rl.panelOpen = window.innerWidth > 960;
      applyPanelState();
    }
  });

  bindEvents();
})(window);
