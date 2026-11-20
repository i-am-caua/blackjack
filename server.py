#!/usr/bin/env python3
"""Pixel Blackjack 21 + Modo Online Roleta Russa (até 5 jogadores na LAN).

Servidor HTTP multithread sem dependências externas (apenas biblioteca padrão Python 3).
Serve os arquivos estáticos do jogo e a API /api/roulette/* com reconhecimento de IP e máquina.

Sistema de habilidades (HABILIDADES.md):
  - cada personagem tem passiva, carga e ativa;
  - a ativa gasta 1 ficha;
  - existe uma janela de preparação de 8s entre a escolha do alvo e o giro do tambor.
"""
import argparse
import copy
import http.server
import json
import mimetypes
import os
import random
import socket
import threading
import time
import urllib.parse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MAX_PLAYERS = 5
CARD_TURN_TIMEOUT_SEC = 40
PREP_WINDOW_SEC = 8.0
SHOT_SPIN_DURATIONS_MS = (2500, 3000, 3500, 4000)
SHOT_AUTO_NEXT_SEC = 9.0
WINNER_SCREEN_SEC = 10.0
LOBBY_STALE_SEC = 120.0

SKINS = ["outlaw", "duchess", "cyber", "boss", "phantom"]
# O bot usa o próprio nome do personagem, como se fosse mais um jogador da mesa.
CHARACTER_NAMES = {
    "outlaw": "Billy",
    "duchess": "Viper",
    "cyber": "Zero",
    "boss": "Don",
    "phantom": "Reaper",
}

# Textos curtos usados pelo painel e pelos chips (HABILIDADES.md §Textos curtos)
KITS = {
    "outlaw": {
        "name": "Billy",
        "role": "Pistoleiro",
        "passive": ("MÃO DO DIABO", "Mão inicial 16 → −1 bala"),
        "charge": ("AZAR DO PISTOLEIRO", "3 estouros seguidos = ficha"),
        "active": ("MUNIÇÃO TURBINADA", "Marca um alvo: o próximo tiro dele causa 2 de dano"),
        "marksMax": 3,
    },
    "duchess": {
        "name": "Viper",
        "role": "Duquesa",
        "passive": ("PULSO FIRME", "75% de não subir a bala no 1/6 (1× por vida)"),
        "charge": ("SANGUE FRIO", "Clique em 3/6, 4/6 ou 5/6 = ficha"),
        "active": ("ROLETA DE CABEÇAS", "Sorteia alguém: +1 bala e roleta"),
        "marksMax": 0,
    },
    "cyber": {
        "name": "Zero",
        "role": "Forasteiro",
        "passive": ("ESPIADA", "Mão inicial 12–16 revela a próxima carta"),
        "charge": ("BARALHO MARCADO", "1 ficha a cada 5 rodadas"),
        "active": ("CURTO-CIRCUITO", "Troca uma carta com um alvo"),
        "marksMax": 0,
    },
    "boss": {
        "name": "Don",
        "role": "Chefão",
        "passive": ("PALAVRA FINAL", "Com um 7 na mão, empate é vitória sua"),
        "charge": ("SETE DA SORTE", "7 na mão inicial = marca (2 = ficha)"),
        "active": ("GUARDA-COSTAS", "Capanga morre no seu lugar, você fica com 1 vida"),
        "marksMax": 2,
    },
    "phantom": {
        "name": "Reaper",
        "role": "Morto-Vivo",
        "passive": ("ESPECTRO", "Com 1 vida, o tambor nunca passa de 2/6"),
        "charge": ("SEDE DE SANGUE", "3 BANGs = ficha"),
        "active": ("SANGUE POR SANGUE", "Paga 1 vida + 1 ficha: Maldição, Selo ou Boneco Vudú"),
        "marksMax": 3,
    },
}

SUITS = [
    {"id": "spade", "name": "Espadas", "color": "black", "icon": "assets/suit_spade.png"},
    {"id": "heart", "name": "Copas", "color": "red", "icon": "assets/suit_heart.png"},
    {"id": "diamond", "name": "Ouros", "color": "red", "icon": "assets/suit_diamond.png"},
    {"id": "club", "name": "Paus", "color": "black", "icon": "assets/suit_club.png"},
]

RANKS = [
    ("A", 11, None),
    ("2", 2, None),
    ("3", 3, None),
    ("4", 4, None),
    ("5", 5, None),
    ("6", 6, None),
    ("7", 7, None),
    ("8", 8, None),
    ("9", 9, None),
    ("10", 10, None),
    ("J", 10, "assets/royal_j.png"),
    ("Q", 10, "assets/royal_q.png"),
    ("K", 10, "assets/royal_k.png"),
]


def build_shoe(decks=6):
    cards = []
    for _ in range(decks):
        for suit in SUITS:
            for rank, value, royal in RANKS:
                cards.append({
                    "rank": rank,
                    "value": value,
                    "royal": royal,
                    "suit": suit,
                })
    random.shuffle(cards)
    return cards


def score_hand(cards):
    total = sum(c["value"] for c in cards)
    aces = sum(1 for c in cards if c["rank"] == "A")
    while total > 21 and aces > 0:
        total -= 10
        aces -= 1
    is_soft = aces > 0
    is_bj = len(cards) == 2 and total == 21
    return {
        "total": total,
        "isSoft": is_soft,
        "isBlackjack": is_bj,
        "isBust": total > 21,
    }


def detect_platform(user_agent):
    ua = (user_agent or "").lower()
    if "android" in ua:
        return "Android"
    if "iphone" in ua or "ipad" in ua or "ios" in ua:
        return "iOS"
    if "windows" in ua:
        return "Windows"
    if "mac os" in ua or "macintosh" in ua:
        return "macOS"
    if "linux" in ua:
        return "Linux"
    return "Dispositivo"


def fresh_ability_state():
    return {
        "ficha": 0,            # 0/1 ficha guardada
        "streak": 0,           # Billy: estouros seguidos
        "setes": 0,            # Don: marcas (2 = ficha)
        "guard": False,        # Don: Guarda-Costas armado
        "guardUsed": False,    # Don: Guarda-Costas só pode salvar uma vez por partida
        "pulsoUsed": False,    # Viper: Pulso Firme já usado nesta vida
        "sangueFrioDone": False,  # Viper: carga já conquistada
        "blood": 0,            # Reaper: marcas de Sede de Sangue
        "selo": False,         # Selo de Chumbo ativo
        "marcado": False,      # Munição Turbinada ativa
        "marcadoOwner": None,
        "marcadoSkipMainShot": False,
        "espiada": None,       # Zero: SEGURA | PERIGOSA
        "reserved": None,      # Zero: carta reservada do topo
    }


class RouletteRoom:
    def __init__(self):
        self.lock = threading.RLock()
        self.phase = "LOBBY"  # LOBBY | PLAYING_CARDS | CHOOSE_TARGET | PREP | ROULETTE_SHOT | GAME_OVER
        self.players = []     # Ordered list of player dicts (max 5)
        self.shoe = build_shoe(6)
        self.round_num = 0
        self.winner_queue = []
        self.current_shooter_id = None
        self.round_winners = []
        self.last_shot = None
        self.shot_pre_state = None
        self.shot_seq = 0
        self.phase_started_at = time.time()
        self.shot_ready_at = 0.0
        self.winner_champion_id = None
        self.winner_screen_until = 0.0
        self.logs = ["Sala criada! Aguardando jogadores na rede local (até 5)."]
        self.seen_devices = {}  # ip -> {ip, platform, lastSeen, nick}

        # Janela de preparação / fila de giros
        self.target_id = None
        self.chooser_id = None
        self.prep = None
        self.spin_queue = []
        self.resume_mode = None
        self.ability_seq = 0
        self.last_ability = None
        self.boneco_curse = None  # Reaper: redireciona um disparo por até 5 rodadas
        self.pending_viper_roleta = None
        self.pending_reaper_ability = None

        # Último alvo escolhido por cada bot (evita repetir a mesma vítima).
        self.bot_last_targets = {}

    # ------------------------------------------------------------------ util
    def add_log(self, msg):
        self.logs.insert(0, msg)
        self.logs = self.logs[:40]

    def _active_ability_phase(self):
        return self.phase in ("PLAYING_CARDS", "CHOOSE_TARGET", "PREP")

    def _draw(self):
        if len(self.shoe) < 26:
            self.shoe = build_shoe(6)
            self.add_log("Sabot reembaralhado (6 baralhos).")
        return self.shoe.pop()

    def _find_player(self, pid):
        for p in self.players:
            if p["id"] == pid:
                return p
        return None

    def _pick_free_skin(self, exclude_id=None):
        used = {p["skin"] for p in self.players if p["id"] != exclude_id}
        for sk in SKINS:
            if sk not in used:
                return sk
        return None

    def _alive(self):
        return [p for p in self.players if p["alive"]]

    def _grant_ficha(self, p):
        if p["ficha"] < 1:
            p["ficha"] = 1
            return True
        return False

    def _ability_event(self, p, fx, text, target_id=None):
        self.ability_seq += 1
        self.last_ability = {
            "seq": self.ability_seq,
            "actorId": p["id"],
            "actorNick": p["nick"],
            "actorSkin": p["skin"],
            "targetId": target_id,
            "fx": fx,
            "text": text,
        }

    # -------------------------------------------------------------- conexões
    def touch_network_device(self, ip, platform, nick=None):
        now = time.time()
        entry = self.seen_devices.get(ip, {"ip": ip, "platform": platform, "nick": nick or ""})
        entry["platform"] = platform
        entry["lastSeen"] = now
        if nick:
            entry["nick"] = nick
        self.seen_devices[ip] = entry
        stale = [k for k, v in self.seen_devices.items() if now - v["lastSeen"] > 120]
        for k in stale:
            del self.seen_devices[k]

    def cleanup_stale_lobby(self):
        if self.phase != "LOBBY":
            return
        now = time.time()
        before = len(self.players)
        self.players = [
            p for p in self.players
            if p["isBot"] or (now - p["lastSeen"] < LOBBY_STALE_SEC)
        ]
        if len(self.players) < before:
            self.add_log("Jogador desconectado removido por inatividade.")

    def _make_player(self, pid, nick, skin, ip, platform, is_bot):
        player = {
            "id": pid,
            "nick": nick,
            "skin": skin,
            "ip": ip,
            "platform": platform,
            "isBot": is_bot,
            "lives": 3,
            "chambers": 6,
            "bullets": 1,
            "alive": True,
            "hand": [],
            "stood": False,
            "busted": False,
            "kills": 0,
            "shotsSurvived": 0,
            "lastSeen": time.time(),
        }
        player.update(fresh_ability_state())
        return player

    def join(self, client_id, nick, skin, ip, platform):
        with self.lock:
            self.cleanup_stale_lobby()
            nick = (nick or "").strip()[:16] or f"Player-{len(self.players) + 1}"
            existing = self._find_player(client_id)
            if skin not in SKINS:
                skin = self._pick_free_skin(exclude_id=client_id)
                if skin is None:
                    return False, "N\u00e3o h\u00e1 personagem livre na mesa."

            owner = next(
                (p for p in self.players if p["id"] != client_id and p["skin"] == skin),
                None,
            )
            if owner:
                return False, f"Personagem j\u00e1 escolhido por {owner['nick']}. Escolha outro."

            if existing:
                existing["nick"] = nick
                existing["skin"] = skin
                existing["ip"] = ip
                existing["platform"] = platform
                existing["lastSeen"] = time.time()
                self.touch_network_device(ip, platform, nick)
                return True, "Perfil atualizado."

            if self.phase != "LOBBY":
                return False, "Partida já em andamento! Aguarde terminar."
            if len(self.players) >= MAX_PLAYERS:
                return False, f"Sala cheia! Limite máximo de {MAX_PLAYERS} jogadores."

            self.players.append(self._make_player(client_id, nick, skin, ip, platform, False))
            self.touch_network_device(ip, platform, nick)
            self.add_log(f"{nick} ({ip} • {platform}) entrou na mesa.")
            return True, "Entrou na mesa!"

    def leave(self, client_id):
        with self.lock:
            p = self._find_player(client_id)
            if not p:
                return
            if self.phase == "LOBBY":
                self.players = [x for x in self.players if x["id"] != client_id]
                self.add_log(f"{p['nick']} saiu do lobby.")
            else:
                p["alive"] = False
                p["lives"] = 0
                p["stood"] = True
                self.add_log(f"{p['nick']} abandonou a partida.")
                if self.phase == "PREP" and self.prep and self.prep.get("active"):
                    self.prep["ready"].add(p["id"])
                    self._maybe_end_prep()
                elif self.phase in ("CHOOSE_TARGET", "PLAYING_CARDS"):
                    self._check_after_elimination()

    def add_bot(self, skin=None):
        with self.lock:
            if self.phase != "LOBBY":
                return False, "Só é possível adicionar bots no lobby."
            if len(self.players) >= MAX_PLAYERS:
                return False, "Sala já atingiu 5 jogadores."

            skin = (skin or "").strip() or None
            if skin:
                if skin not in SKINS:
                    return False, "Personagem inválido."
                owner = next((p for p in self.players if p["skin"] == skin), None)
                if owner:
                    name = CHARACTER_NAMES.get(skin, skin)
                    return False, f"{name} já está na mesa."
            else:
                skin = self._pick_free_skin()
                if skin is None:
                    return False, "Não há personagem livre na mesa."

            name = CHARACTER_NAMES.get(skin, "Bot")
            bot_id = f"bot_{int(time.time() * 1000)}_{random.randint(100, 999)}"
            self.players.append(self._make_player(
                bot_id, name, skin, "BOT • CPU", "CPU", True
            ))
            self.add_log(f"{name} (BOT) entrou na mesa.")
            return True, f"{name} entrou na mesa."

    def remove_bot(self, bot_id):
        with self.lock:
            if self.phase != "LOBBY":
                return False, "Só é possível remover bots no lobby."
            bot = next(
                (p for p in self.players if p["isBot"] and p["id"] == bot_id),
                None,
            )
            if not bot:
                return False, "Bot não encontrado."
            self.players = [p for p in self.players if p["id"] != bot_id]
            self.add_log(f"{bot['nick']} (BOT) saiu da mesa.")
            return True, f"{bot['nick']} removido."

    def remove_bots(self):
        with self.lock:
            if self.phase != "LOBBY":
                return False, "Só é possível remover bots no lobby."
            self.players = [p for p in self.players if not p["isBot"]]
            self.add_log("Bots removidos do lobby.")
            return True, "Bots removidos."

    # ------------------------------------------------------------- partida
    def start_match(self):
        with self.lock:
            if self.phase != "LOBBY":
                return False, "Partida já iniciada."
            if len(self.players) < 2:
                return False, "São necessários pelo menos 2 jogadores (ou adicione um Bot)."
            self.round_num = 0
            self.shot_seq = 0
            self.ability_seq = 0
            self.last_shot = None
            self.shot_pre_state = None
            self.last_ability = None
            self.boneco_curse = None
            self.pending_viper_roleta = None
            self.pending_reaper_ability = None
            self.winner_champion_id = None
            self.winner_screen_until = 0.0
            self.target_id = None
            self.chooser_id = None
            self.prep = None
            self.spin_queue = []
            self.resume_mode = None
            self.bot_last_targets = {}
            self.shoe = build_shoe(6)
            for p in self.players:
                p.update({
                    "lives": 3, "chambers": 6, "bullets": 1, "alive": True,
                    "hand": [], "stood": False, "busted": False,
                    "kills": 0, "shotsSurvived": 0,
                })
                p.update(fresh_ability_state())
            self._start_round()
            return True, "Partida iniciada!"

    def _return_reserved_cards(self):
        for p in self.players:
            if p.get("reserved"):
                self.shoe.append(p["reserved"])
                p["reserved"] = None
            p["espiada"] = None

    def _start_round(self):
        self._return_reserved_cards()
        self.round_num += 1
        self.winner_queue = []
        self.current_shooter_id = None
        self.round_winners = []
        self.target_id = None
        self.chooser_id = None
        self.prep = None
        self.spin_queue = []
        self.resume_mode = None
        self.last_ability = None
        self.phase = "PLAYING_CARDS"
        self.phase_started_at = time.time()

        alive_players = self._alive()
        for p in self.players:
            p["hand"] = []
            p["stood"] = not p["alive"]
            p["busted"] = False

        # --- Fase 1: distribuição ---
        for p in alive_players:
            p["hand"] = [self._draw(), self._draw()]
            sc = score_hand(p["hand"])
            if sc["isBlackjack"]:
                p["stood"] = True

        # Zero: Baralho Marcado (ficha a cada 5 rodadas)
        for p in alive_players:
            if p["skin"] == "cyber" and self.round_num % 5 == 0:
                if self._grant_ficha(p):
                    self.add_log(f"BARALHO MARCADO: {p['nick']} ganhou uma ficha (rodada {self.round_num}).")

        # Passivas / cargas que olham a mão inicial (Billy → Don → Zero)
        for p in alive_players:
            sc = score_hand(p["hand"])
            if p["skin"] == "outlaw":
                if sc["total"] == 16 and not sc["isSoft"]:
                    before = p["bullets"]
                    p["bullets"] = max(1, p["bullets"] - 1)
                    if p["bullets"] != before:
                        self.add_log(f"MÃO DO DIABO: {p['nick']} fez 16 duro e removeu 1 bala ({p['bullets']}/6).")
                if sc["isBlackjack"]:
                    p["streak"] = 0  # blackjack zera a sequência de estouros
            elif p["skin"] == "boss":
                if any(c["rank"] == "7" for c in p["hand"]):
                    p["setes"] = min(2, p["setes"] + 1)
                    if p["setes"] >= 2 and not p["guard"] and not p["guardUsed"]:
                        p["guard"] = True
                        self._grant_ficha(p)
                        self.add_log(f"SETE DA SORTE: {p['nick']} completou 2 marcas → GUARDA-COSTAS ARMADO.")
                    else:
                        self.add_log(f"SETE DA SORTE: {p['nick']} tem SETES {p['setes']}/2.")
            elif p["skin"] == "cyber":
                if 12 <= sc["total"] <= 16:
                    card = self._draw()
                    p["reserved"] = card
                    danger = score_hand(p["hand"] + [card])["isBust"]
                    p["espiada"] = "PERIGOSA" if danger else "SEGURA"
                    # aviso é privado: não entra no log público

        # Bots jogam suas mãos de Blackjack imediatamente
        for p in alive_players:
            if p["isBot"]:
                self._bot_play_hand(p)

        self.add_log(f"Rodada {self.round_num}: cartas distribuídas! Façam suas jogadas.")
        self._check_cards_complete()

    def _bot_play_hand(self, p):
        while not p["stood"] and not p["busted"]:
            sc = score_hand(p["hand"])
            if sc["total"] < 17:
                p["hand"].append(self._draw())
                sc = score_hand(p["hand"])
                if sc["isBust"]:
                    p["busted"] = True
                    p["stood"] = True
                    self._register_bust(p)
            else:
                p["stood"] = True

    def _register_bust(self, p):
        if p["skin"] == "outlaw":
            p["streak"] = min(3, p["streak"] + 1)
            if p["streak"] >= 3:
                if self._grant_ficha(p):
                    self.add_log(f"AZAR DO PISTOLEIRO: {p['nick']} estourou 3× seguidas e ganhou uma ficha!")
                p["streak"] = 0

    def _clear_espiada(self, p):
        p["espiada"] = None

    def card_action(self, client_id, action):
        with self.lock:
            if self.phase != "PLAYING_CARDS":
                return False, "Não está na fase de cartas."
            p = self._find_player(client_id)
            if not p or not p["alive"]:
                return False, "Jogador não ativo nesta rodada."
            if p["stood"] or p["busted"]:
                return False, "Você já finalizou sua mão nesta rodada."

            if action == "hit":
                p["hand"].append(p["reserved"] if p["reserved"] else self._draw())
                p["reserved"] = None
                self._clear_espiada(p)
                sc = score_hand(p["hand"])
                if sc["isBust"]:
                    p["busted"] = True
                    p["stood"] = True
                    self._register_bust(p)
                    self.add_log(f"{p['nick']} pediu carta e estourou ({sc['total']})!")
                elif sc["total"] == 21:
                    p["stood"] = True
                    if sc["isBlackjack"] and p["skin"] == "outlaw":
                        p["streak"] = 0
                    self.add_log(f"{p['nick']} cravou 21 pontos!")
            elif action == "stand":
                p["stood"] = True
                self._clear_espiada(p)
                sc = score_hand(p["hand"])
                self.add_log(f"{p['nick']} parou com {sc['total']} pontos.")
            else:
                return False, "Ação inválida."

            self._check_cards_complete()
            return True, "OK"

    def _check_cards_complete(self):
        alive = self._alive()
        if not alive:
            return
        if all(p["stood"] or p["busted"] for p in alive):
            scored = []
            for p in alive:
                sc = score_hand(p["hand"])
                if not sc["isBust"]:
                    rank_key = (1, 1 if sc["isBlackjack"] else 0, sc["total"])
                else:
                    rank_key = (0, 0, -sc["total"])
                scored.append((rank_key, p))

            best_key = max(item[0] for item in scored)
            winners = [p for rk, p in scored if rk == best_key]

            # Palavra Final: Don com um 7 na mão vence sozinho qualquer empate
            if len(winners) > 1:
                don = next(
                    (w for w in winners
                     if w["skin"] == "boss" and any(c["rank"] == "7" for c in w["hand"])),
                    None,
                )
                if don:
                    self.add_log(f"PALAVRA FINAL: {don['nick']} tinha um 7 e venceu o empate sozinho!")
                    winners = [don]

            # Vitória zera a sequência de estouros do Billy
            for w in winners:
                if w["skin"] == "outlaw":
                    w["streak"] = 0

            self.round_winners = [w["id"] for w in winners]
            self.winner_queue = [w["id"] for w in winners]
            names = ", ".join(w["nick"] for w in winners)
            self.add_log(f"Vencedor(es) da rodada: {names}! Escolha quem vai encarar o revólver.")
            self._advance_to_next_shooter()

    def _bot_pick_target(self, shooter, opponents, last_target=None):
        """Escolha de alvo do bot: ameaça (tambor/vida/efeitos) + ruído.

        O ruído resolve o empate total (ex.: todos em 1/6 e 3 vidas) de forma
        aleatória, em vez de cair sempre no assento mais à esquerda. Humanos e
        bots entram no mesmo sorteio.
        """
        def threat(p):
            score = 2.0 * p["bullets"] - 1.0 * p["lives"]
            if p.get("marcado"):
                score += 2.0   # próximo giro dele causa 2 de dano
            if p.get("selo"):
                score += 1.0   # tambor dele está mais cheio
            score += random.uniform(0.0, 1.6)
            if len(opponents) > 1 and p["id"] == last_target:
                score -= 1.5   # evita perseguir sempre a mesma pessoa
            return score

        return max(opponents, key=threat)

    def _advance_to_next_shooter(self):
        alive_ids = {p["id"] for p in self._alive()}
        if len(alive_ids) <= 1:
            self._finish_match()
            return

        self.winner_queue = [wid for wid in self.winner_queue if wid in alive_ids]
        if self.winner_queue:
            self.current_shooter_id = self.winner_queue.pop(0)
            self.phase = "CHOOSE_TARGET"
            self.phase_started_at = time.time()
            shooter = self._find_player(self.current_shooter_id)
            if shooter and shooter["isBot"]:
                opponents = [p for p in self._alive() if p["id"] != shooter["id"]]
                if opponents:
                    target = self._bot_pick_target(
                        shooter,
                        opponents,
                        self.bot_last_targets.get(shooter["id"]),
                    )
                    self.bot_last_targets[shooter["id"]] = target["id"]
                    self._enter_prep(shooter["id"], target["id"])
        else:
            if self._resolve_boneco_expiry_if_due():
                return
            self._start_round()

    def _arm_boneco(self, reaper, target):
        # A vida e a ficha são cobradas uma única vez no fluxo geral de Sangue.
        self.boneco_curse = {
            "reaperId": reaper["id"],
            "targetId": target["id"],
            # A rodada de ativação conta como 1/5; expira no fim de N + 4.
            "expiresRound": self.round_num + 4,
        }
        self.add_log(
            f"BONECO VUDÚ: {reaper['nick']} amaldiçoou {target['nick']} por 5 rodadas, "
            "contando esta. O primeiro disparo que "
            "atingir o Reaper transfere o dano exato."
        )
        self._ability_event(
            reaper,
            "fx_boneco",
            f"{target['nick']} foi amaldiçoado por 5 rodadas, contando esta",
            target["id"],
        )

    def _launch_maldicao(self, reaper, target):
        self.add_log(
            f"MALDIÇÃO: {reaper['nick']} forçou {target['nick']} a girar "
            "com mínimo 4/6."
        )
        self._ability_event(reaper, "fx_maldicao", f"Maldição em {target['nick']}", target["id"])
        if self.prep:
            self.prep["remaining"] = max(2.0, self.prep["deadline"] - time.time())
            if self.prep.get("actorId") == reaper["id"]:
                self._complete_prep_stage(reaper)
        self._begin_spins([{
            "pid": target["id"],
            "killer": reaper["id"],
            "min4": True,
            "curse": True,
            "note": "MALDICAO",
        }], "PREP")

    def _resolve_pending_reaper_curse(self):
        pending = self.pending_reaper_ability
        if not pending or pending.get("mode") != "maldicao":
            return False
        reaper = self._find_player(pending.get("ownerId"))
        target = self._find_player(pending.get("targetId"))
        self.pending_reaper_ability = None
        if not reaper or not reaper["alive"]:
            self.add_log("SANGUE POR SANGUE: a Maldição guardada foi cancelada porque o Reaper foi eliminado.")
            return False
        if not target or not target["alive"]:
            self.add_log("SANGUE POR SANGUE: a Maldição guardada foi cancelada porque o alvo não está mais vivo.")
            return False
        self._launch_maldicao(reaper, target)
        return True

    def _activate_pending_boneco(self, reaper):
        pending = self.pending_reaper_ability
        if (
            not pending or pending.get("mode") != "boneco"
            or pending.get("ownerId") != reaper["id"]
        ):
            return
        target = self._find_player(pending.get("targetId"))
        self.pending_reaper_ability = None
        if not target or not target["alive"]:
            self.add_log("BONECO VUDÚ: a maldição guardada foi cancelada porque o alvo foi eliminado.")
            return
        self._arm_boneco(reaper, target)

    def _resolve_boneco_expiry_if_due(self):
        curse = self.boneco_curse
        if not curse or self.round_num < curse["expiresRound"]:
            return False

        self.boneco_curse = None
        reaper = self._find_player(curse["reaperId"])
        if not reaper or not reaper["alive"]:
            self.add_log("BONECO VUDÚ expirou sem transferência; o Reaper não está vivo para cumprir o giro.")
            return False

        self.add_log(
            f"BONECO VUDÚ EXPIROU: {reaper['nick']} não transferiu nenhum disparo "
            "em cinco rodadas; a maldição terminou. Ele deverá girar com no mínimo 5/6 "
            "e este giro não transfere dano."
        )
        self._begin_spins([{
            "pid": reaper["id"],
            "killer": None,
            "min_bullets": 5,
            "bonecoPenalty": True,
            "note": "PUNIÇÃO DO BONECO",
        }], "ROUND")
        return True

    def shoot(self, shooter_id, target_id):
        with self.lock:
            if self.phase != "CHOOSE_TARGET":
                return False, "Não é o momento de atirar."
            if shooter_id != self.current_shooter_id:
                return False, "Apenas o vencedor da rodada pode atirar."
            target = self._find_player(target_id)
            if not target or not target["alive"] or target["id"] == shooter_id:
                return False, "Alvo inválido."
            self._enter_prep(shooter_id, target_id)
            return True, "Disparo executado!"

    # ------------------------------------------------- janela de preparação
    def _enter_prep(self, chooser_id, target_id):
        self.chooser_id = chooser_id
        self.target_id = target_id
        self.phase = "PREP"
        self.phase_started_at = time.time()
        self.prep = {
            "active": True,
            "deadline": time.time() + PREP_WINDOW_SEC,
            "ready": {
                p["id"] for p in self._alive()
                if p["isBot"] and not self._bot_has_prep_ability(p)
            },
            "extras": [],
            "stage": 0,
            "stageDone": set(),
            "actorId": None,
        }
        self.spin_queue = []
        self.resume_mode = None
        target = self._find_player(target_id)
        chooser = self._find_player(chooser_id)
        self.add_log(
            f"JANELA DE PREPARAÇÃO: {chooser['nick']} escolheu {target['nick']}. "
            f"Todos têm {PREP_WINDOW_SEC:.0f}s para confirmar; habilidades podem ser usadas antes do giro."
        )
        if self._resolve_pending_reaper_curse():
            return
        self._maybe_end_prep()

    def _bot_has_prep_ability(self, p):
        if not p["alive"] or p["ficha"] < 1:
            return False
        if p["skin"] in ("outlaw", "phantom"):
            return p["lives"] >= 2 if p["skin"] == "phantom" else True
        return p["skin"] == "duchess" and self.target_id == p["id"]

    def _prep_candidates(self, stage):
        if not self.prep:
            return []
        target = self._find_player(self.target_id)
        ready = self.prep["ready"]
        done = self.prep["stageDone"]
        skins = {0: "phantom", 1: "outlaw", 2: "duchess", 3: "phantom"}
        result = []
        for p in self._alive():
            if p["skin"] != skins.get(stage) or p["id"] in ready:
                continue
            if (stage, p["id"]) in done or p["ficha"] < 1:
                continue
            if p["skin"] == "phantom" and p["lives"] < 2:
                continue
            if stage == 2 and (not target or target["id"] != p["id"]):
                continue
            if stage == 3 and (not target or target["id"] != p["id"]):
                continue
            result.append(p)
        return result

    def _complete_prep_stage(self, p, ready_after=True):
        if not self.prep:
            return
        stage = self.prep["stage"]
        self.prep["stageDone"].add((stage, p["id"]))
        if ready_after:
            self.prep["ready"].add(p["id"])

    def _mark_billy_target(self, owner, target):
        if target["marcado"]:
            return
        target["marcado"] = True
        target["marcadoOwner"] = owner["id"]
        # O alvo principal já foi escolhido antes da janela de preparo.
        # Nesse caso, a marca fica guardada para o próximo giro futuro dele.
        target["marcadoSkipMainShot"] = bool(
            self.phase == "PREP" and target["id"] == self.target_id
        )

    def _run_bot_prep_stage(self, p, stage):
        target = self._find_player(self.target_id)
        if stage == 0:
            if target and target["id"] != p["id"]:
                p["lives"] -= 1
                p["ficha"] = 0
                target["selo"] = True
                self.add_log(
                    f"SELO DE CHUMBO: {p['nick']} pagou 1 vida e selou {target['nick']} "
                    "até o Reaper morrer."
                )
                self._ability_event(p, "fx_selo", f"{target['nick']} recebeu o Selo de Chumbo", target["id"])
                self._complete_prep_stage(p)
            else:
                # Se o Reaper é o alvo, guarda a ficha para a etapa do Boneco Vudú.
                self._complete_prep_stage(p, ready_after=False)
        elif stage == 1:
            others = [x for x in self._alive() if x["id"] != p["id"]]
            chosen = target if target and target["id"] != p["id"] else (
                random.choice(others) if others else None
            )
            if chosen:
                p["ficha"] = 0
                p["streak"] = 0
                self._mark_billy_target(p, chosen)
                self.add_log(f"MUNIÇÃO TURBINADA: {p['nick']} marcou {chosen['nick']} (próximo tiro causa 2).")
                self._ability_event(p, "fx_municao", f"{p['nick']} marcou {chosen['nick']}", chosen["id"])
            self._complete_prep_stage(p)
        elif stage == 2:
            if random.random() < 0.5:
                p["ficha"] = 0
                chosen = random.choice(self._alive())
                self.prep["extras"].append({
                    "pid": chosen["id"], "plus1": True, "killer": p["id"],
                    "note": "ROLETA DE CABEÇAS",
                })
                self.add_log(f"ROLETA DE CABEÇAS: {p['nick']} sorteou {chosen['nick']} (+1 bala).")
                self._ability_event(p, "fx_roletas", f"Sorteio: {chosen['nick']}", chosen["id"])
            self._complete_prep_stage(p)
        elif stage == 3 and target:
            opponents = [x for x in self._alive() if x["id"] != p["id"]]
            current_odds = self._compute_bullets(p, {})
            if opponents and not self.boneco_curse and p["lives"] >= 3 and current_odds >= 4:
                chosen = min(opponents, key=lambda x: (x["lives"], -x["bullets"]))
                self._arm_boneco(p, chosen)
            self._complete_prep_stage(p)

    def _advance_prep_stage(self):
        if not self.prep or not self.prep.get("active"):
            return
        while self.prep["stage"] < 4:
            stage = self.prep["stage"]
            candidates = self._prep_candidates(stage)
            if not candidates:
                self.prep["stage"] += 1
                continue
            actor = candidates[0]
            self.prep["actorId"] = actor["id"]
            if actor["isBot"]:
                self._run_bot_prep_stage(actor, stage)
                continue
            return
        self.prep["actorId"] = None

    def _maybe_end_prep(self):
        if not self.prep or not self.prep.get("active"):
            return
        self._advance_prep_stage()
        if self.phase != "PREP" or not self.prep or self.prep["stage"] < 4:
            return
        alive_ids = {p["id"] for p in self._alive()}
        if alive_ids and alive_ids <= self.prep["ready"]:
            self._end_prep()

    def _end_prep(self):
        if not self.prep or not self.prep.get("active"):
            return
        self.prep["active"] = False
        target = self._find_player(self.target_id)
        if not target or not target["alive"]:
            self.prep = None
            self._check_after_elimination()
            return
        queue = [{
            "pid": self.target_id,
            "killer": self.chooser_id,
            "main": True,
        }]
        queue.extend(self.prep.get("extras") or [])
        pending_roleta = self.pending_viper_roleta
        if pending_roleta:
            viper = self._find_player(pending_roleta.get("ownerId"))
            if not viper or not viper["alive"]:
                self.pending_viper_roleta = None
            elif target["id"] == viper["id"]:
                chosen = random.choice(self._alive())
                queue.append({
                    "pid": chosen["id"], "plus1": True, "killer": viper["id"],
                    "note": "ROLETA DE CABEÇAS",
                })
                self.pending_viper_roleta = None
                self.add_log(
                    f"ROLETA DE CABEÇAS: a roleta guardada por {viper['nick']} sorteou "
                    f"{chosen['nick']} (+1 bala; gira depois dela)."
                )
                self._ability_event(viper, "fx_roletas", f"Sorteio: {chosen['nick']}", chosen["id"])
        self.prep = None
        self._begin_spins(queue, "ROUND")

    def confirm_prep(self, client_id):
        with self.lock:
            if self.phase != "PREP" or not self.prep or not self.prep.get("active"):
                return False, "A janela de preparação não está aberta."
            p = self._find_player(client_id)
            if not p or not p["alive"]:
                return False, "Jogador não ativo."
            if p["id"] == self.prep.get("actorId") and self.prep["stage"] < 4:
                stage = self.prep["stage"]
                future_boneco = (
                    p["skin"] == "phantom" and stage == 0
                    and self.target_id == p["id"] and p["ficha"] > 0 and p["lives"] >= 2
                )
                self._complete_prep_stage(p, ready_after=not future_boneco)
                self._maybe_end_prep()
                return True, "Habilidade pulada."
            self.prep["ready"].add(p["id"])
            self._maybe_end_prep()
            return True, "Pronto."

    # ------------------------------------------------------- giros / tambor
    def _compute_bullets(self, p, spin):
        # p["bullets"] guarda a progressão-base; o Selo é um bônus de giro,
        # reaplicado uma vez antes de cada sorteio.
        bullets = max(1, min(6, p["bullets"]))
        if p["selo"]:
            bullets += 1
        if spin.get("min4"):
            bullets = max(bullets, 4)
        if spin.get("min_bullets"):
            bullets = max(bullets, int(spin["min_bullets"]))
        if spin.get("plus1"):
            bullets += 1
        if p["skin"] == "phantom" and p["lives"] == 1:
            bullets = min(bullets, 2)
        return max(1, min(6, bullets))

    def _begin_spins(self, queue, resume_mode):
        self.spin_queue = list(queue)
        self.resume_mode = resume_mode
        self._next_spin()

    def _next_spin(self):
        while self.spin_queue:
            spin = self.spin_queue.pop(0)
            target = self._find_player(spin["pid"])
            if target and target["alive"]:
                self._do_spin(spin, target)
                return
            if target and target["marcado"]:
                target["marcado"] = False
                target["marcadoOwner"] = None
                target["marcadoSkipMainShot"] = False

        if self.resume_mode == "PREP":
            self._resume_prep_after_curse()
        else:
            self.resume_mode = None
            self._check_after_elimination()

    def _resume_prep_after_curse(self):
        if len(self._alive()) <= 1:
            self.prep = None
            self._finish_match()
            return
        self.phase = "PREP"
        self.phase_started_at = time.time()
        if self.prep and self.prep.get("active"):
            remaining = max(2.0, self.prep.get("remaining", 3.0))
            self.prep["deadline"] = time.time() + remaining
            self.add_log("A rodada continua: a janela de preparação segue aberta.")
            self._maybe_end_prep()
        else:
            self._check_after_elimination()

    def _register_bang(self):
        for p in self.players:
            if p["skin"] == "phantom" and p["alive"]:
                if p["blood"] < 3:
                    p["blood"] += 1
                if p["blood"] >= 3:
                    p["blood"] = 0
                    if self._grant_ficha(p):
                        self.add_log(f"SEDE DE SANGUE: {p['nick']} completou 3 BANGs e ganhou uma ficha!")

    def _do_spin(self, spin, target):
        spin_duration_ms = random.choice(SHOT_SPIN_DURATIONS_MS)
        if target["skin"] == "phantom":
            self._activate_pending_boneco(target)
        # Guarda o estado público anterior ao sorteio. A resolução interna é
        # imediata, mas nenhum resultado pode chegar aos clientes durante o giro.
        self.shot_pre_state = {
            "players": copy.deepcopy(self.players),
            "bonecoCurse": copy.deepcopy(self.boneco_curse),
            "logs": list(self.logs),
            "lastAbility": copy.deepcopy(self.last_ability),
        }
        bullets_before = self._compute_bullets(target, spin)
        lives_before_shot = target["lives"]
        odds_before = f"{bullets_before}/6"
        chamber_index = random.randrange(6)
        fired = chamber_index < bullets_before

        skip_current_mark = (
            target["marcado"]
            and target.get("marcadoSkipMainShot")
            and spin.get("main")
        )
        was_marked = bool(target["marcado"] and not skip_current_mark)
        dmg = 2 if was_marked else 1
        marked_owner_id = target.get("marcadoOwner") if was_marked else None
        if was_marked:
            target["marcado"] = False
            target["marcadoOwner"] = None
            target["marcadoSkipMainShot"] = False
        elif skip_current_mark:
            target["marcadoSkipMainShot"] = False

        eliminated = False
        guard_absorbed = False
        pulso = None
        damage_target = target
        damage_redirected = False

        active_curse = self.boneco_curse
        if (
            fired
            and not spin.get("bonecoPenalty")
            and active_curse
            and active_curse.get("reaperId") == target["id"]
        ):
            cursed_target = self._find_player(active_curse.get("targetId"))
            if cursed_target and cursed_target["alive"]:
                damage_target = cursed_target
                damage_redirected = True
                self.boneco_curse = None
                target["bullets"] = 1
                self.add_log(
                    f"BONECO VUDÚ: o disparo contra {target['nick']} ({odds_before}) "
                    f"transferiu {dmg} dano(s) para {cursed_target['nick']}!"
                )
                self._ability_event(
                    target,
                    "fx_boneco",
                    f"{dmg} dano(s) transferido(s) para {cursed_target['nick']}",
                    cursed_target["id"],
                )

        damage_target_lives_before = damage_target["lives"]
        damage_target_eliminated = False

        if fired:
            self._register_bang()
            if dmg >= damage_target["lives"] and damage_target["guard"]:
                damage_target["guard"] = False
                damage_target["guardUsed"] = True
                damage_target["ficha"] = 0
                damage_target["lives"] = 1
                damage_target["bullets"] = 3
                guard_absorbed = True
                if damage_redirected:
                    target["bullets"] = 1
                    odds_after = f"{self._compute_bullets(target, {})}/6"
                else:
                    odds_after = f"{self._compute_bullets(damage_target, {})}/6"
                guard_odds = f"{self._compute_bullets(damage_target, {})}/6"
                self._ability_event(
                    damage_target, "fx_guarda",
                    f"O capanga de {damage_target['nick']} morreu no lugar dele",
                    damage_target["id"],
                )
                self.add_log(
                    f"GUARDA-COSTAS! O capanga de {damage_target['nick']} morreu no lugar dele. "
                    f"Ele ficou com 1 vida e o tambor vai para {guard_odds}."
                )
            else:
                damage_target["lives"] = max(0, damage_target["lives"] - dmg)
                if damage_redirected:
                    target["bullets"] = 1
                if damage_target["lives"] == 0:
                    damage_target["alive"] = False
                    damage_target["chambers"] = 0
                    damage_target["bullets"] = 0
                    damage_target["marcado"] = False
                    damage_target["marcadoOwner"] = None
                    damage_target["marcadoSkipMainShot"] = False
                    if (
                        self.pending_viper_roleta
                        and self.pending_viper_roleta.get("ownerId") == damage_target["id"]
                    ):
                        self.pending_viper_roleta = None
                        self.add_log("ROLETA DE CABEÇAS: a ativação guardada foi cancelada porque a Viper foi eliminada.")
                    if (
                        self.pending_reaper_ability
                        and self.pending_reaper_ability.get("ownerId") == damage_target["id"]
                    ):
                        self.pending_reaper_ability = None
                        self.add_log("SANGUE POR SANGUE: a ativação guardada foi cancelada porque o Reaper foi eliminado.")
                    elif (
                        self.pending_reaper_ability
                        and self.pending_reaper_ability.get("targetId") == damage_target["id"]
                    ):
                        self.pending_reaper_ability = None
                        self.add_log(
                            f"SANGUE POR SANGUE: a ativação guardada foi cancelada porque "
                            f"{damage_target['nick']} foi eliminado antes de o efeito começar."
                        )
                    if damage_target["skin"] == "phantom":
                        cleared_seals = False
                        for sealed_player in self.players:
                            if sealed_player["selo"]:
                                sealed_player["selo"] = False
                                cleared_seals = True
                        if cleared_seals:
                            self.add_log(
                                "SELO DE CHUMBO: com a eliminação do Reaper, "
                                "todos os Selos ativos se desfizeram."
                            )
                    damage_target_eliminated = True
                    eliminated = not damage_redirected
                    odds_after = "ELIMINADO"
                    killer_id = spin.get("killer")
                    if spin.get("bonecoPenalty"):
                        killer_id = None
                    elif damage_redirected:
                        killer_id = marked_owner_id or target["id"]
                    killer = self._find_player(killer_id) if killer_id else None
                    if killer:
                        killer["kills"] += 1
                    if damage_redirected:
                        self.add_log(
                            f"BANG! {damage_target['nick']} foi eliminado pelo dano "
                            f"transferido do tiro de {target['nick']} ({odds_before})!"
                        )
                    else:
                        self.add_log(
                            f"BANG! {target['nick']} atirou em si mesmo ({odds_before})"
                            f"{' com dano 2' if dmg == 2 else ''} e foi ELIMINADO!"
                        )
                else:
                    if not damage_redirected:
                        target["bullets"] = 1
                    odds_after = f"{self._compute_bullets(target, {})}/6"
                    if damage_redirected:
                        self.add_log(
                            f"BANG! {target['nick']} não perdeu vida; o dano foi transferido. "
                            f"{damage_target['nick']} perdeu {dmg} vida(s) e ficou com "
                            f"{damage_target['lives']}."
                        )
                    else:
                        self.add_log(
                            f"BANG! {target['nick']} atirou em si mesmo ({odds_before})"
                            f"{' com dano 2' if dmg == 2 else ''}! "
                            f"Restam {target['lives']} vidas. Próxima chance: {odds_after}."
                        )
        else:
            target["shotsSurvived"] += 1
            # bullets guarda o avanço permanente do tambor; o +1 do Selo é
            # reaplicado em cada giro e não deve ser contado duas vezes no clique.
            next_bullets = bullets_before + 1 - (1 if target["selo"] else 0)

            if spin.get("reset_one") or spin.get("curse"):
                next_bullets = 1
            elif target["skin"] == "duchess" and bullets_before == 1 and not target["pulsoUsed"]:
                target["pulsoUsed"] = True
                if random.random() < 0.75:
                    pulso = "success"
                    next_bullets = 1
                    self.add_log(
                        f"PULSO FIRME: a bala não subiu — o tambor de {target['nick']} continua 1/6."
                    )
                else:
                    pulso = "fail"
                    next_bullets = 2
                    self.add_log(
                        f"PULSO FIRME: falhou — o tambor de {target['nick']} foi para 2/6."
                    )

            target["bullets"] = max(1, min(6, next_bullets))
            odds_after = f"{self._compute_bullets(target, {})}/6"
            self.add_log(
                f"*CLIQUE*! {target['nick']} sobreviveu ao próprio tiro ({odds_before}). "
                f"Próxima chance: {odds_after}!"
            )

        if target["skin"] == "duchess" and target["lives"] < lives_before_shot:
            target["pulsoUsed"] = False
        if damage_redirected and damage_target["skin"] == "duchess" and damage_target["lives"] < damage_target_lives_before:
            damage_target["pulsoUsed"] = False

        # Sangue Frio só conta clique sem perda de vida em giro iniciado entre 3/6 e 5/6.
        if (
            target["skin"] == "duchess"
            and bullets_before in (3, 4, 5)
            and not fired
            and target["lives"] == lives_before_shot
            and target["lives"] > 0
            and not target["sangueFrioDone"]
        ):
            target["sangueFrioDone"] = True
            if self._grant_ficha(target):
                self.add_log(
                    f"SANGUE FRIO: {target['nick']} deu clique em {odds_before} sem perder vida "
                    f"e ganhou a ROLETA DE CABEÇAS!"
                )

        self.shot_seq += 1
        shot_chooser_id = spin.get("killer")
        if shot_chooser_id is None and not spin.get("bonecoPenalty"):
            shot_chooser_id = self.chooser_id
        shot_chooser = self._find_player(shot_chooser_id) if shot_chooser_id else None
        self.last_shot = {
            "seq": self.shot_seq,
            "chooserId": shot_chooser_id,
            "chooserNick": (shot_chooser or {}).get("nick", ""),
            "chooserSkin": (shot_chooser or {}).get("skin", ""),
            "shooterId": target["id"],
            "shooterNick": target["nick"],
            "shooterSkin": target["skin"],
            "targetId": target["id"],
            "targetNick": target["nick"],
            "targetSkin": target["skin"],
            "fired": fired,
            "eliminated": eliminated,
            "guardAbsorbed": guard_absorbed,
            "damage": dmg,
            "damageRedirected": damage_redirected,
            "damageTargetId": damage_target["id"],
            "damageTargetNick": damage_target["nick"],
            "damageTargetSkin": damage_target["skin"],
            "damageTargetLivesBefore": damage_target_lives_before,
            "damageTargetLivesLeft": damage_target["lives"],
            "damageTargetEliminated": damage_target_eliminated,
            "wasMarked": was_marked,
            "pulso": pulso,
            "oddsBefore": odds_before,
            "oddsAfter": odds_after,
            "livesBefore": lives_before_shot,
            "livesLeft": target["lives"],
            "bulletCountBefore": bullets_before,
            "chamberIndex": chamber_index,
            "spinDurationMs": spin_duration_ms,
            "source": spin.get("note") or ("MALDICAO" if spin.get("curse") else "RODADA"),
            "isExtra": bool(spin.get("note")),
            "curse": bool(spin.get("curse")),
            "bonecoPenalty": bool(spin.get("bonecoPenalty")),
        }
        self.phase = "ROULETTE_SHOT"
        self.phase_started_at = time.time()
        self.shot_ready_at = time.time() + spin_duration_ms / 1000

    def next_after_shot(self):
        with self.lock:
            if self.phase != "ROULETTE_SHOT":
                return False, "Aguardando disparo."
            if time.time() < self.shot_ready_at - 0.5:
                return False, "Animação em andamento."
            self._finish_spin_phase()
            return True, "OK"

    def _finish_spin_phase(self):
        if self.spin_queue:
            self._next_spin()
            return
        if self.resume_mode == "PREP":
            self._resume_prep_after_curse()
            return
        self.resume_mode = None
        self._check_after_elimination()

    def _check_after_elimination(self):
        alive = self._alive()
        if len(alive) <= 1:
            # Se o prazo venceu no fim da quinta rodada, a punição do Boneco
            # ainda resolve antes de declarar o Reaper como último sobrevivente.
            if self._resolve_boneco_expiry_if_due():
                return
            self._finish_match()
        else:
            self._advance_to_next_shooter()

    def _finish_match(self):
        alive = self._alive()
        self.phase = "GAME_OVER"
        self.phase_started_at = time.time()
        self.shot_pre_state = None
        self.winner_screen_until = self.phase_started_at + WINNER_SCREEN_SEC
        self.prep = None
        self.spin_queue = []
        self.boneco_curse = None
        self.pending_viper_roleta = None
        self.pending_reaper_ability = None
        if alive:
            champ = alive[0]
            self.winner_champion_id = champ["id"]
            self.add_log(f"FIM DE JOGO! {champ['nick']} é o grande sobrevivente!")
        else:
            self.winner_champion_id = None
            self.winner_screen_until = self.phase_started_at
            self.add_log("FIM DE JOGO!")

    def reset_to_lobby(self):
        with self.lock:
            self._return_reserved_cards()
            self.phase = "LOBBY"
            self.round_num = 0
            self.winner_queue = []
            self.current_shooter_id = None
            self.round_winners = []
            self.last_shot = None
            self.shot_pre_state = None
            self.last_ability = None
            self.target_id = None
            self.chooser_id = None
            self.prep = None
            self.spin_queue = []
            self.resume_mode = None
            self.boneco_curse = None
            self.pending_viper_roleta = None
            self.pending_reaper_ability = None
            self.bot_last_targets = {}
            self.winner_champion_id = None
            self.winner_screen_until = 0.0
            for p in self.players:
                p.update({
                    "lives": 3, "chambers": 6, "bullets": 1, "alive": True,
                    "hand": [], "stood": False, "busted": False,
                    "kills": 0, "shotsSurvived": 0,
                })
                p.update(fresh_ability_state())
            self.add_log("Mesa reiniciada no Lobby!")
            return True, "Voltou para o lobby."

    def tick_timers(self):
        with self.lock:
            now = time.time()
            if self.phase == "LOBBY":
                self.cleanup_stale_lobby()
            elif self.phase == "PLAYING_CARDS":
                if now - self.phase_started_at >= CARD_TURN_TIMEOUT_SEC:
                    for p in self.players:
                        if p["alive"] and not p["stood"]:
                            p["stood"] = True
                    self.add_log("Tempo esgotado! Mãos restantes encerradas automaticamente.")
                    self._check_cards_complete()
            elif self.phase == "PREP":
                if self.prep and now >= self.prep.get("deadline", 0):
                    self.add_log("Janela de preparação encerrada. O tambor vai girar!")
                    self._end_prep()
            elif self.phase == "ROULETTE_SHOT":
                if now - self.phase_started_at >= SHOT_AUTO_NEXT_SEC:
                    self._finish_spin_phase()

    # ------------------------------------------------------------ habilidades
    def _ability_flags(self, p):
        flags = {
            "municao": False,
            "roletas": False,
            "roletasPending": False,
            "curto": False,
            "sangue": False,
            "sanguePending": False,
            "boneco": False,
        }
        if not p or not p["alive"]:
            return flags
        flags["roletasPending"] = bool(
            self.pending_viper_roleta
            and self.pending_viper_roleta.get("ownerId") == p["id"]
        )
        flags["sanguePending"] = bool(
            self.pending_reaper_ability
            and self.pending_reaper_ability.get("ownerId") == p["id"]
        )
        if p["ficha"] < 1 or not self._active_ability_phase():
            return flags

        skin = p["skin"]
        if skin == "outlaw":
            flags["municao"] = any(
                target["alive"] and target["id"] != p["id"] and not target["marcado"]
                for target in self.players
            )
        elif skin == "duchess":
            flags["roletas"] = not flags["roletasPending"]
        elif skin == "cyber":
            flags["curto"] = (
                self.phase == "PLAYING_CARDS"
                and bool(p["hand"])
                and any(x["alive"] and x["id"] != p["id"] and x["hand"] for x in self.players)
            )
        elif skin == "phantom":
            flags["sangue"] = (
                p["lives"] >= 2 and not flags["sanguePending"]
            )
            flags["boneco"] = (
                flags["sangue"]
                and not self.boneco_curse
                and not flags["sanguePending"]
            )
        return flags

    def use_ability(self, client_id, kind, target_id=None, mode=None, card_index=None):
        with self.lock:
            p = self._find_player(client_id)
            if not p or not p["alive"]:
                return False, "Jogador não ativo."
            if p["ficha"] < 1:
                return False, "Sem ficha."
            if self.phase == "ROULETTE_SHOT":
                return False, "O tambor já está girando."
            if not self._active_ability_phase():
                return False, "A habilidade só pode ser usada durante uma partida ativa."

            kind = (kind or "").strip()

            # ------------------------------------------------ Billy: Munição
            if kind == "municao":
                if p["skin"] != "outlaw":
                    return False, "Habilidade de outro personagem."
                target = self._find_player(target_id)
                if not target or not target["alive"] or target["id"] == p["id"]:
                    return False, "Escolha outro jogador vivo."
                if target["marcado"]:
                    return False, "Esse jogador já está marcado."
                p["ficha"] = 0
                p["streak"] = 0  # usar a habilidade reinicia a sequência
                self._mark_billy_target(p, target)
                self.add_log(
                    f"MUNIÇÃO TURBINADA: {p['nick']} marcou {target['nick']} — "
                    f"o próximo tiro dele causa 2 de dano."
                )
                self._ability_event(p, "fx_municao", f"{target['nick']} está marcado", target["id"])
                if (
                    self.prep and self.prep.get("actorId") == p["id"]
                    and self.prep.get("stage") == 1
                ):
                    self._complete_prep_stage(p)
                    self._maybe_end_prep()
                return True, "Munição Turbinada aplicada."

            # ---------------------------------------------- Viper: Roleta
            if kind == "roletas":
                if p["skin"] != "duchess":
                    return False, "Habilidade de outro personagem."
                if self.pending_viper_roleta:
                    return False, "A Roleta de Cabeças já está guardada para o próximo giro da Viper."
                p["ficha"] = 0
                self.pending_viper_roleta = {"ownerId": p["id"]}
                self.add_log(
                    f"ROLETA DE CABEÇAS: {p['nick']} guardou a habilidade; "
                    "o sorteio será resolvido no próximo giro normal da Viper."
                )
                self._ability_event(p, "fx_roletas", "Roleta guardada para o próximo giro da Viper")
                if self.phase == "PREP" and self.target_id == p["id"]:
                    if self.prep and self.prep.get("actorId") == p["id"]:
                        self._complete_prep_stage(p)
                    self._maybe_end_prep()
                return True, "Roleta guardada para o próximo giro da Viper."

            # ----------------------------------------------- Zero: Curto
            if kind == "curto":
                if p["skin"] != "cyber":
                    return False, "Habilidade de outro personagem."
                if self.phase != "PLAYING_CARDS":
                    return False, "Só durante a fase de cartas."
                target = self._find_player(target_id)
                if not target or not target["alive"] or target["id"] == p["id"]:
                    return False, "Alvo inválido."
                if not target["hand"]:
                    return False, "O alvo não tem cartas."
                if card_index is None:
                    return False, "Escolha uma carta sua."
                try:
                    card_index = int(card_index)
                except (TypeError, ValueError):
                    return False, "Carta inválida."
                if card_index < 0 or card_index >= len(p["hand"]):
                    return False, "Carta inválida."

                was_busted = p["busted"]
                target_was_busted = target["busted"]
                given = p["hand"].pop(card_index)
                received = target["hand"].pop(random.randrange(len(target["hand"])))
                p["hand"].append(received)
                target["hand"].append(given)

                my_sc = score_hand(p["hand"])
                p["busted"] = my_sc["isBust"]
                t_sc = score_hand(target["hand"])
                target["busted"] = t_sc["isBust"]
                if target["busted"]:
                    target["stood"] = True
                if my_sc["isBust"] and not was_busted:
                    self._register_bust(p)
                if t_sc["isBust"] and not target_was_busted:
                    self._register_bust(target)

                # a espiada precisa continuar honesta depois da troca
                if p["espiada"] and p["reserved"]:
                    p["espiada"] = (
                        "PERIGOSA"
                        if score_hand(p["hand"] + [p["reserved"]])["isBust"]
                        else "SEGURA"
                    )

                p["ficha"] = 0
                self.add_log(
                    f"CURTO-CIRCUITO: {p['nick']} trocou uma carta com {target['nick']} "
                    f"({given['rank']} por {received['rank']})."
                )
                self._ability_event(p, "fx_curto", f"{p['nick']} trocou com {target['nick']}", target["id"])
                self._check_cards_complete()
                return True, "Cartas trocadas."

            # -------------------------------------------- Reaper: Sangue
            if kind == "sangue":
                if p["skin"] != "phantom":
                    return False, "Habilidade de outro personagem."
                if p["lives"] < 2:
                    return False, "Precisa de 2 vidas ou mais para pagar."
                if mode not in ("maldicao", "selo", "boneco"):
                    return False, "Escolha Maldição, Selo de Chumbo ou Boneco Vudú."
                if (
                    self.pending_reaper_ability
                    and self.pending_reaper_ability.get("ownerId") == p["id"]
                ):
                    return False, "Você já tem uma habilidade Sangue por Sangue guardada."

                target = self._find_player(target_id)
                if mode in ("maldicao", "selo", "boneco"):
                    if not target or not target["alive"] or target["id"] == p["id"]:
                        return False, "Alvo inválido."
                if mode == "boneco" and self.boneco_curse:
                    return False, "Já existe um Boneco Vudú ativo; não é possível acumular maldições."

                p["lives"] -= 1
                p["ficha"] = 0

                if mode == "selo":
                    target["selo"] = True
                    self.add_log(
                        f"SELO DE CHUMBO: {p['nick']} pagou 1 vida e selou {target['nick']} "
                        "até o Reaper morrer."
                    )
                    self._ability_event(p, "fx_selo", f"{target['nick']} recebeu o Selo de Chumbo", target["id"])
                    if self.prep and self.prep.get("actorId") == p["id"]:
                        self._complete_prep_stage(p)
                        self._maybe_end_prep()
                    return True, "Selo de Chumbo aplicado."

                if mode == "maldicao":
                    if self.phase == "PREP":
                        self.add_log(
                            f"SANGUE POR SANGUE: {p['nick']} pagou 1 vida e 1 ficha; "
                            f"a Maldição será lançada contra {target['nick']}."
                        )
                        self._launch_maldicao(p, target)
                    else:
                        self.pending_reaper_ability = {
                            "ownerId": p["id"], "mode": mode, "targetId": target["id"],
                        }
                        self.add_log(
                            f"SANGUE POR SANGUE: {p['nick']} pagou 1 vida e 1 ficha e "
                            f"guardou a Maldição contra {target['nick']} para a próxima preparação."
                        )
                        self._ability_event(
                            p, "fx_maldicao", f"Maldição guardada contra {target['nick']}", target["id"]
                        )
                    return True, "Maldição lançada." if self.phase == "ROULETTE_SHOT" else "Maldição guardada."

                self.add_log(
                    f"SANGUE POR SANGUE: {p['nick']} pagou 1 vida e 1 ficha para armar "
                    f"o Boneco Vudú contra {target['nick']}."
                )
                if self.phase == "PREP" and self.target_id == p["id"]:
                    self._arm_boneco(p, target)
                    if self.prep and self.prep.get("actorId") == p["id"]:
                        self._complete_prep_stage(p)
                        self._maybe_end_prep()
                    return True, f"{target['nick']} está amaldiçoado por 5 rodadas."

                self.pending_reaper_ability = {
                    "ownerId": p["id"], "mode": mode, "targetId": target["id"],
                }
                self._ability_event(
                    p, "fx_boneco", f"Boneco guardado contra {target['nick']}", target["id"]
                )
                if self.prep and self.prep.get("actorId") == p["id"]:
                    self._complete_prep_stage(p)
                    self._maybe_end_prep()
                return True, "Boneco Vudú guardado para o próximo giro do Reaper."

            return False, "Habilidade desconhecida."

    # ---------------------------------------------------------------- estado
    def snapshot(self, viewer_id, viewer_ip, viewer_platform):
        with self.lock:
            self.tick_timers()
            viewer = None
            if viewer_id:
                viewer = self._find_player(viewer_id)
                if viewer:
                    viewer["lastSeen"] = time.time()
                    viewer["ip"] = viewer_ip
                    viewer["platform"] = viewer_platform
            self.touch_network_device(viewer_ip, viewer_platform)

            now = time.time()
            shot_result_pending = bool(
                self.phase == "ROULETTE_SHOT"
                and self.last_shot
                and self.shot_pre_state
                and now < self.shot_ready_at
            )
            staged = self.shot_pre_state if shot_result_pending else None
            state_players = staged["players"] if staged else self.players
            state_curse = staged["bonecoCurse"] if staged else self.boneco_curse
            state_logs = staged["logs"] if staged else self.logs
            state_last_ability = staged["lastAbility"] if staged else self.last_ability
            if shot_result_pending:
                public_shot_keys = (
                    "seq", "chooserId", "chooserNick", "chooserSkin",
                    "shooterId", "shooterNick", "shooterSkin",
                    "targetId", "targetNick", "targetSkin", "oddsBefore",
                    "bulletCountBefore", "chamberIndex", "spinDurationMs",
                    "source", "isExtra", "curse",
                    "bonecoPenalty",
                )
                state_last_shot = {
                    key: self.last_shot[key]
                    for key in public_shot_keys
                    if key in self.last_shot
                }
                state_last_shot["resultReady"] = False
            else:
                state_last_shot = dict(self.last_shot) if self.last_shot else None
                if state_last_shot:
                    state_last_shot["resultReady"] = True

            time_left = 0
            if self.phase == "PLAYING_CARDS":
                time_left = max(0, int(CARD_TURN_TIMEOUT_SEC - (now - self.phase_started_at)))
            elif self.phase == "PREP" and self.prep:
                time_left = max(0, int(round(self.prep["deadline"] - now)))
            elif self.phase == "ROULETTE_SHOT":
                time_left = max(0, int(round(SHOT_AUTO_NEXT_SEC - (now - self.phase_started_at))))

            players_out = []
            for p in state_players:
                sc = score_hand(p["hand"]) if p["hand"] else {
                    "total": 0, "isSoft": False, "isBlackjack": False, "isBust": False,
                }
                kit = KITS[p["skin"]]
                is_viewer = bool(viewer and viewer["id"] == p["id"])
                marks = 0
                if p["skin"] == "outlaw":
                    marks = p["streak"]
                elif p["skin"] == "boss":
                    marks = p["setes"]
                elif p["skin"] == "phantom":
                    marks = p["blood"]

                # Munição efetiva para exibição: já inclui Selo de Chumbo e o
                # teto do Espectro, para o tambor/chance nunca mentirem.
                eff_bullets = (
                    self._compute_bullets(p, {})
                    if p["alive"] and p["chambers"] > 0
                    else 0
                )

                players_out.append({
                    "id": p["id"],
                    "nick": p["nick"],
                    "skin": p["skin"],
                    "ip": p["ip"],
                    "platform": p["platform"],
                    "isBot": p["isBot"],
                    "lives": p["lives"],
                    "chambers": p["chambers"],
                    "bullets": eff_bullets,
                    "odds": f"{eff_bullets}/{p['chambers']}" if p["alive"] and p["chambers"] > 0 else "0",
                    "alive": p["alive"],
                    "hand": p["hand"],
                    "score": sc,
                    "stood": p["stood"],
                    "busted": p["busted"],
                    "kills": p["kills"],
                    "shotsSurvived": p["shotsSurvived"],
                    # habilidades públicas (chips)
                    "setes": p["setes"],
                    "selo": p["selo"],
                    "marcado": p["marcado"],
                    "marks": marks,
                    "marksMax": kit["marksMax"],
                    "bonecoMarked": bool(
                        state_curse
                        and state_curse.get("targetId") == p["id"]
                    ),
                    "bonecoRounds": (
                        max(0, state_curse["expiresRound"] - self.round_num + 1)
                        if state_curse
                        and state_curse.get("targetId") == p["id"]
                        else 0
                    ),
                    # segredos: só para o próprio jogador
                    "ficha": p["ficha"] if is_viewer else 0,
                    "guard": p["guard"] if is_viewer else False,
                    "espiada": p["espiada"] if is_viewer else None,
                    "pulsoUsed": p["pulsoUsed"] if is_viewer else False,
                    "sangueFrioDone": p["sangueFrioDone"] if is_viewer else False,
                })

            me = None
            if viewer:
                state_viewer = next(
                    (p for p in state_players if p["id"] == viewer["id"]),
                    viewer,
                )
                kit = KITS[state_viewer["skin"]]
                flags = self._ability_flags(state_viewer)
                next_ficha_round = 0
                if state_viewer["skin"] == "cyber":
                    next_ficha_round = (5 - (self.round_num % 5)) % 5 or 5

                effect = None
                if state_viewer["skin"] == "outlaw":
                    marked = [p["nick"] for p in state_players if p["marcado"]]
                    if marked:
                        effect = "EFEITO ATIVO: " + ", ".join(marked) + " marcado(s)"
                elif state_viewer["skin"] == "phantom":
                    sealed = [p["nick"] for p in state_players if p["selo"]]
                    if sealed:
                        effect = "SELO ATIVO: " + ", ".join(sealed)
                if state_curse:
                    if state_curse.get("reaperId") == state_viewer["id"]:
                        cursed_target = next(
                            (p for p in state_players if p["id"] == state_curse.get("targetId")),
                            None,
                        )
                        target_name = cursed_target["nick"] if cursed_target else "alvo"
                        remaining = max(
                            0,
                            state_curse["expiresRound"] - self.round_num + 1,
                        )
                        effect = f"BONECO ATIVO: {target_name} • {remaining}/5 rodada(s)"
                    elif state_curse.get("targetId") == state_viewer["id"]:
                        effect = "VOCÊ ESTÁ AMALDIÇOADO PELO BONECO VUDÚ"
                if (
                    self.pending_viper_roleta
                    and self.pending_viper_roleta.get("ownerId") == state_viewer["id"]
                ):
                    effect = "ROLETA GUARDADA: será resolvida no próximo giro normal da Viper."
                if (
                    self.pending_reaper_ability
                    and self.pending_reaper_ability.get("ownerId") == state_viewer["id"]
                ):
                    pending = self.pending_reaper_ability
                    pending_target = self._find_player(pending.get("targetId"))
                    target_name = pending_target["nick"] if pending_target else "alvo"
                    pending_text = (
                        f"MALDIÇÃO GUARDADA contra {target_name}: será resolvida na próxima preparação."
                        if pending.get("mode") == "maldicao"
                        else f"BONECO GUARDADO contra {target_name}: ativa no próximo giro do Reaper."
                    )
                    effect = f"{effect} • {pending_text}" if effect else pending_text

                me = {
                    "id": state_viewer["id"],
                    "skin": state_viewer["skin"],
                    "alive": state_viewer["alive"],
                    "lives": state_viewer["lives"],
                    "ficha": state_viewer["ficha"],
                    "marks": (
                        state_viewer["streak"] if state_viewer["skin"] == "outlaw"
                        else state_viewer["setes"] if state_viewer["skin"] == "boss"
                        else state_viewer["blood"] if state_viewer["skin"] == "phantom"
                        else 0
                    ),
                    "marksMax": kit["marksMax"],
                    "streak": state_viewer["streak"],
                    "setes": state_viewer["setes"],
                    "blood": state_viewer["blood"],
                    "guard": state_viewer["guard"],
                    "espiada": state_viewer["espiada"],
                    "pulsoUsed": state_viewer["pulsoUsed"],
                    "sangueFrioDone": state_viewer["sangueFrioDone"],
                    "flags": flags,
                    "effect": effect,
                    "nextFichaRound": next_ficha_round,
                }

            return {
                "phase": self.phase,
                "maxPlayers": MAX_PLAYERS,
                "roundNum": self.round_num,
                "timeLeft": time_left,
                "shoeRemaining": len(self.shoe),
                "viewerIp": viewer_ip,
                "viewerPlatform": viewer_platform,
                "players": players_out,
                "roundWinners": self.round_winners,
                "currentShooterId": self.current_shooter_id,
                "targetId": self.target_id,
                "chooserId": self.chooser_id,
                "prepActive": bool(self.prep and self.prep.get("active")),
                "prepStage": self.prep["stage"] if self.prep else None,
                "prepStageName": (
                    [
                        "REAPER — ESCOLHA UM MODO",
                        "BILLY — MUNIÇÃO TURBINADA",
                        "VIPER — ROLETA DE CABEÇAS",
                        "REAPER — ESCOLHA UM MODO",
                        "CONFIRMAÇÃO FINAL",
                    ][min(4, max(0, self.prep["stage"]))]
                    if self.prep else None
                ),
                "prepActorId": self.prep.get("actorId") if self.prep else None,
                "prepReadyIds": sorted(self.prep["ready"]) if self.prep else [],
                "lastShot": state_last_shot,
                "lastAbility": state_last_ability,
                "championId": self.winner_champion_id,
                "winnerScreenUntil": int(self.winner_screen_until * 1000),
                "winnerScreenRemainingMs": max(
                    0,
                    int((self.winner_screen_until - now) * 1000)
                    if self.phase == "GAME_OVER" else 0,
                ),
                "logs": state_logs,
                "networkDevices": list(self.seen_devices.values()),
                "kits": KITS,
                "me": me,
            }


ROOM = RouletteRoom()


class BlackjackHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format, *args):
        # Quiet request logging except errors
        pass

    def end_headers(self):
        # HTML/CSS/JS mudam com frequência: nunca deixar o navegador reusar
        # uma versão antiga em cache (o /api/ já manda no-store).
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def _client_info(self):
        xff = self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        xri = self.headers.get("X-Real-IP", "").strip()
        ip = xri or xff or self.client_address[0]
        platform = detect_platform(self.headers.get("User-Agent", ""))
        return ip, platform

    def _send_json(self, data, status=200):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(min(length, 65536))
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/roulette/state":
            qs = urllib.parse.parse_qs(parsed.query)
            viewer_id = (qs.get("clientId") or [""])[0]
            ip, platform = self._client_info()
            self._send_json(ROOM.snapshot(viewer_id, ip, platform))
            return
        if parsed.path == "/api/health":
            self._send_json({"ok": True, "players": len(ROOM.players), "phase": ROOM.phase})
            return
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if not parsed.path.startswith("/api/roulette/"):
            self._send_json({"ok": False, "error": "Rota desconhecida"}, status=404)
            return

        body = self._read_json()
        client_id = str(body.get("clientId") or "")
        ip, platform = self._client_info()

        if parsed.path == "/api/roulette/join":
            ok, msg = ROOM.join(client_id, body.get("nick"), body.get("skin"), ip, platform)
        elif parsed.path == "/api/roulette/leave":
            ROOM.leave(client_id)
            ok, msg = True, "Saiu."
        elif parsed.path == "/api/roulette/bot":
            if body.get("remove"):
                ok, msg = ROOM.remove_bots()
            elif body.get("removeBot"):
                ok, msg = ROOM.remove_bot(str(body.get("removeBot")))
            else:
                ok, msg = ROOM.add_bot(body.get("skin"))
        elif parsed.path == "/api/roulette/start":
            ok, msg = ROOM.start_match()
        elif parsed.path == "/api/roulette/action":
            ok, msg = ROOM.card_action(client_id, body.get("action"))
        elif parsed.path == "/api/roulette/shoot":
            ok, msg = ROOM.shoot(client_id, str(body.get("targetId") or ""))
        elif parsed.path == "/api/roulette/ability":
            ok, msg = ROOM.use_ability(
                client_id,
                body.get("kind"),
                target_id=body.get("targetId"),
                mode=body.get("mode"),
                card_index=body.get("cardIndex"),
            )
        elif parsed.path == "/api/roulette/confirm":
            ok, msg = ROOM.confirm_prep(client_id)
        elif parsed.path == "/api/roulette/next_round":
            ok, msg = ROOM.next_after_shot()
        elif parsed.path == "/api/roulette/reset":
            ok, msg = ROOM.reset_to_lobby()
        else:
            self._send_json({"ok": False, "error": "Ação desconhecida"}, status=404)
            return

        snap = ROOM.snapshot(client_id, ip, platform)
        snap["ok"] = ok
        snap["message"] = msg
        self._send_json(snap, status=200 if ok else 400)


class ReusableThreadingServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True


def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def main():
    mimetypes.add_type("image/gif", ".gif")
    mimetypes.add_type("application/javascript", ".js")
    parser = argparse.ArgumentParser(description="Servidor Pixel Blackjack & Roleta Russa LAN")
    parser.add_argument("--host", default="0.0.0.0", help="Endereço de escuta (padrão: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8080, help="Porta HTTP (padrão: 8080)")
    args = parser.parse_args()

    srv = ReusableThreadingServer((args.host, args.port), BlackjackHandler)
    lan_ip = get_lan_ip()
    print("Pixel Blackjack + Roleta Russa Server rodando em:")
    print(f"  Local: http://127.0.0.1:{args.port}")
    print(f"  Rede : http://{lan_ip}:{args.port}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
        srv.server_close()


if __name__ == "__main__":
    main()
