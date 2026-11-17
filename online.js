/**
 * Pixel Blackjack 21 — Modo Online LAN: Roleta Russa (até 5 jogadores)
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
    lastShotSeq: 0,
    shotAnimUntil: 0,
    shotAnimTimer: null,
    serverOffline: false,
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
    skinCards: Array.from(document.querySelectorAll(".skin-card")),
    lobbyPlayers: document.getElementById("rl-lobby-players"),
    networkDevices: document.getElementById("rl-network-devices"),

    btnAddBot: document.getElementById("btn-rl-add-bot"),
    btnClearBots: document.getElementById("btn-rl-clear-bots"),
    btnLeave: document.getElementById("btn-rl-leave"),
    btnStart: document.getElementById("btn-rl-start"),

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

    seatsGrid: document.getElementById("rl-seats-grid"),
    logList: document.getElementById("rl-log-list"),
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
      b.textContent = `BGM: ${bgmOn ? "ON" : "OFF"}`;
      b.classList.toggle("btn-green", bgmOn);
      b.classList.toggle("btn-slate", !bgmOn);
    });
    [el.btnLobbySfx, el.btnArenaSfx].forEach((b) => {
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

  function updateSkinSelectionUI() {
    el.skinCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.skin === rl.skin);
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
    rl.shotAnimUntil = Date.now() + 2600;
    if (rl.shotAnimTimer) clearTimeout(rl.shotAnimTimer);

    // Step 1: Aim + Spin
    el.revolverImg.src = "assets/revolver_spin.gif";
    AudioFX.playCylinderSpin();
    renderArena(rl.lastState, "SPIN");

    rl.shotAnimTimer = setTimeout(() => {
      if (shot.fired) {
        el.revolverImg.src = "assets/revolver_bang.png";
        AudioFX.playGunshot();
        if (shot.eliminated) {
          setTimeout(() => AudioFX.playEliminated(), 320);
        }
      } else {
        el.revolverImg.src = "assets/revolver_click.png";
        AudioFX.playDryFire();
      }
      renderArena(rl.lastState, "RESULT");
    }, 950);
  }

  function applyServerState(data) {
    if (!data || !data.phase) return;
    rl.lastState = data;

    if (data.lastShot && data.lastShot.seq > rl.lastShotSeq) {
      rl.lastShotSeq = data.lastShot.seq;
      playShotAnimationSequence(data.lastShot);
    }

    const me = (data.players || []).find((p) => p.id === rl.clientId);

    if (data.phase === "LOBBY" || !me) {
      if (el.lobbyScreen.classList.contains("hidden") && rl.active) {
        el.arenaScreen.classList.add("hidden");
        el.lobbyScreen.classList.remove("hidden");
      }
      renderLobby(data);
    } else {
      if (el.arenaScreen.classList.contains("hidden") && rl.active) {
        el.lobbyScreen.classList.add("hidden");
        el.arenaScreen.classList.remove("hidden");
      }
      const step = Date.now() < rl.shotAnimUntil ? "RESULT" : "IDLE";
      renderArena(data, step);
    }
  }

  function renderLobby(data) {
    el.myDevice.textContent = `${data.viewerIp} • ${data.viewerPlatform}`;
    el.playerCount.textContent = `${data.players.length} / ${data.maxPlayers}`;

    el.lobbyPlayers.innerHTML = "";
    if (data.players.length === 0) {
      el.lobbyPlayers.innerHTML = `<div class="roster-row"><span class="roster-ip">Nenhum jogador entrou ainda. Digite seu nick e clique em Entrar!</span></div>`;
    } else {
      data.players.forEach((p) => {
        const row = document.createElement("div");
        row.className = "roster-row" + (p.id === rl.clientId ? " me" : "");
        row.innerHTML = `
          <div class="roster-left">
            <img src="assets/char_${p.skin}_idle.gif" alt="${p.skin}" class="pixel-img" />
            <div>
              <div class="roster-nick">${escapeHtml(p.nick)}${p.id === rl.clientId ? " (VOCÊ)" : ""}</div>
              <div class="roster-ip">${escapeHtml(p.ip)} • ${escapeHtml(p.platform)}</div>
            </div>
          </div>
          <span class="roster-tag">${SKIN_LABELS[p.skin] || p.skin}</span>
        `;
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
    if (!p.alive) return `assets/char_${p.skin}_dead.png`;
    const shot = data.lastShot;
    if (data.phase === "ROULETTE_SHOT" && shot) {
      if (p.id === shot.shooterId) {
        if (animStep === "SPIN") return `assets/char_${p.skin}_aim.png`;
        if (shot.fired) return `assets/char_${p.skin}_shoot.png`;
        return `assets/char_${p.skin}_aim.png`;
      }
      if (p.id === shot.targetId && animStep === "RESULT" && shot.fired) {
        return `assets/char_${p.skin}_hit.png`;
      }
    }
    if (data.phase === "CHOOSE_TARGET" && p.id === data.currentShooterId) {
      return `assets/char_${p.skin}_aim.png`;
    }
    return `assets/char_${p.skin}_idle.gif`;
  }

  function renderArena(data, animStep) {
    if (!data) return;
    const alivePlayers = data.players.filter((p) => p.alive);
    const me = data.players.find((p) => p.id === rl.clientId);

    el.roundNum.textContent = `${data.roundNum}`;
    el.aliveCount.textContent = `${alivePlayers.length}/${data.players.length}`;
    el.timer.textContent = data.phase === "PLAYING_CARDS" ? `${data.timeLeft}s` : "-";
    el.arenaIp.textContent = `${data.viewerIp}`;

    const isMyTurnCards =
      data.phase === "PLAYING_CARDS" && me && me.alive && !me.stood && !me.busted;
    const isMyShoot =
      data.phase === "CHOOSE_TARGET" && data.currentShooterId === rl.clientId;

    el.btnHit.classList.toggle("hidden", data.phase !== "PLAYING_CARDS");
    el.btnStand.classList.toggle("hidden", data.phase !== "PLAYING_CARDS");
    el.btnHit.disabled = !isMyTurnCards;
    el.btnStand.disabled = !isMyTurnCards;
    el.btnNext.classList.toggle("hidden", data.phase !== "ROULETTE_SHOT");
    el.btnRematch.classList.toggle("hidden", data.phase !== "GAME_OVER");

    // Center Banner + Revolver image
    if (data.phase === "PLAYING_CARDS") {
      el.revolverImg.src = "assets/revolver_idle.png";
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
      const shooter = data.players.find((p) => p.id === data.currentShooterId);
      if (isMyShoot) {
        el.phaseBanner.className = "status-banner bj";
        el.phaseBanner.textContent = "VOCÊ VENCEU A RODADA! ATIRE!";
        el.shotDetail.textContent = "Clique no botão 'ATIRAR NESTE!' abaixo do adversário escolhido.";
      } else {
        el.phaseBanner.className = "status-banner";
        el.phaseBanner.textContent = `${shooter ? shooter.nick : "Vencedor"} VAI ATIRAR!`;
        el.shotDetail.textContent = "O vencedor da rodada está escolhendo o alvo na mesa...";
      }
    } else if (data.phase === "ROULETTE_SHOT" && data.lastShot) {
      const sh = data.lastShot;
      if (Date.now() < rl.shotAnimUntil && animStep === "SPIN") {
        el.phaseBanner.className = "status-banner";
        el.phaseBanner.textContent = `${sh.shooterNick} GIRANDO O TAMBOR...`;
        el.shotDetail.textContent = `Mirando em ${sh.targetNick} (Chance: ${sh.oddsBefore})`;
      } else if (sh.fired) {
        el.revolverImg.src = "assets/revolver_bang.png";
        el.phaseBanner.className = "status-banner lose";
        el.phaseBanner.textContent = sh.eliminated
          ? `BANG! ${sh.targetNick} ELIMINADO!`
          : `BANG! ${sh.targetNick} PERDEU 1 VIDA!`;
        el.shotDetail.textContent = sh.eliminated
          ? `${sh.shooterNick} disparou (${sh.oddsBefore}) e tirou ${sh.targetNick} do jogo!`
          : `${sh.shooterNick} acertou (${sh.oddsBefore})! ${sh.targetNick} agora tem ${sh.livesLeft} vidas (tambor voltou a 1/6).`;
      } else {
        el.revolverImg.src = "assets/revolver_click.png";
        el.phaseBanner.className = "status-banner push";
        el.phaseBanner.textContent = `*CLIQUE*! ${sh.targetNick} SOBREVIVEU!`;
        el.shotDetail.textContent = `Bala não saiu (${sh.oddsBefore})! Próxima chance em ${sh.targetNick}: ${sh.oddsAfter}!`;
      }
    } else if (data.phase === "GAME_OVER") {
      el.revolverImg.src = "assets/revolver_idle.png";
      const champ = data.players.find((p) => p.id === data.championId);
      el.phaseBanner.className = "status-banner win";
      el.phaseBanner.textContent = champ
        ? `CAMPEÃO: ${champ.nick}!`
        : "FIM DA PARTIDA!";
      el.shotDetail.textContent = "Último sobrevivente na mesa! Clique em 'Voltar ao Lobby' para jogar outra.";
    }

    // Render 5 Seats
    el.seatsGrid.innerHTML = "";
    data.players.forEach((p) => {
      const card = document.createElement("div");
      const isMe = p.id === rl.clientId;
      const isShooter = data.phase === "CHOOSE_TARGET" && p.id === data.currentShooterId;
      const isHitShake =
        data.phase === "ROULETTE_SHOT" &&
        data.lastShot &&
        data.lastShot.fired &&
        data.lastShot.targetId === p.id;

      card.className =
        "seat-card" +
        (isMe ? " me" : "") +
        (isShooter ? " shooter" : "") +
        (!p.alive ? " dead" : "") +
        (isHitShake ? " target-flash" : "");

      const heartsHtml = [0, 1, 2]
        .map((i) => `<img src="assets/${i < p.lives ? "heart_full" : "heart_empty"}.png" class="pixel-img" alt="" />`)
        .join("");

      const cylNum = p.alive ? Math.max(1, Math.min(6, p.chambers || 6)) : 1;
      const dangerClass = p.chambers <= 2 ? " danger" : "";
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

      card.innerHTML = `
        <div class="seat-top">
          <span class="seat-nick">${escapeHtml(p.nick)}${isMe ? " (EU)" : ""}</span>
          <span class="seat-ip">${escapeHtml(p.ip)}</span>
        </div>
        <div class="seat-sprite-row">
          <img src="${spriteSrc}" class="pixel-img seat-char-img" alt="${p.skin}" />
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
        shootBtn.textContent = `ATIRAR (${p.odds})`;
        shootBtn.addEventListener("click", () => shootTarget(p.id));
        card.appendChild(shootBtn);
      }

      el.seatsGrid.appendChild(card);
    });

    // Logs
    el.logList.innerHTML = "";
    (data.logs || []).forEach((line) => {
      const li = document.createElement("li");
      li.textContent = "• " + line;
      el.logList.appendChild(li);
    });
  }

  async function shootTarget(targetId) {
    AudioFX.playClick();
    try {
      const data = await apiPost("/api/roulette/shoot", { targetId });
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

    [el.btnLobbyBgm, el.btnArenaBgm].forEach((b) => b.addEventListener("click", toggleBgm));
    [el.btnLobbySfx, el.btnArenaSfx].forEach((b) => b.addEventListener("click", toggleSfx));

    el.skinCards.forEach((card) => {
      card.addEventListener("click", () => {
        AudioFX.playClick();
        rl.skin = card.dataset.skin;
        updateSkinSelectionUI();
        if (rl.lastState && rl.lastState.players.some((p) => p.id === rl.clientId)) {
          joinOrUpdate();
        }
      });
    });

    el.btnJoin.addEventListener("click", joinOrUpdate);
    el.nickInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") joinOrUpdate();
    });

    el.btnAddBot.addEventListener("click", async () => {
      AudioFX.playClick();
      try {
        applyServerState(await apiPost("/api/roulette/bot", {}));
      } catch (_) {}
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
  }

  bindEvents();
})(window);
