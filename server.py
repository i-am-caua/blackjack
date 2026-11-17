#!/usr/bin/env python3
"""Pixel Blackjack 21 + Modo Online Roleta Russa (até 5 jogadores na LAN).

Servidor HTTP multithread sem dependências externas (apenas biblioteca padrão Python 3).
Serve os arquivos estáticos do jogo e a API /api/roulette/* com reconhecimento de IP e máquina.
"""
import argparse
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
SHOT_ANIM_SEC = 3.2
SHOT_AUTO_NEXT_SEC = 6.0
LOBBY_STALE_SEC = 120.0

SKINS = ["outlaw", "duchess", "cyber", "boss", "phantom"]
BOT_NAMES = ["Bot-Billy", "Bot-Viper", "Bot-Zero", "Bot-Don", "Bot-Reaper"]

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


class RouletteRoom:
    def __init__(self):
        self.lock = threading.RLock()
        self.phase = "LOBBY"  # LOBBY | PLAYING_CARDS | CHOOSE_TARGET | ROULETTE_SHOT | GAME_OVER
        self.players = []     # Ordered list of player dicts (max 5)
        self.shoe = build_shoe(6)
        self.round_num = 0
        self.winner_queue = []
        self.current_shooter_id = None
        self.round_winners = []
        self.last_shot = None
        self.shot_seq = 0
        self.phase_started_at = time.time()
        self.shot_ready_at = 0.0
        self.winner_champion_id = None
        self.logs = ["Sala criada! Aguardando jogadores na rede local (até 5)."]
        self.seen_devices = {}  # ip -> {ip, platform, lastSeen, nick}

    def add_log(self, msg):
        self.logs.insert(0, msg)
        self.logs = self.logs[:14]

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

    def _pick_free_skin(self):
        used = {p["skin"] for p in self.players}
        for sk in SKINS:
            if sk not in used:
                return sk
        return SKINS[len(self.players) % len(SKINS)]

    def touch_network_device(self, ip, platform, nick=None):
        now = time.time()
        entry = self.seen_devices.get(ip, {"ip": ip, "platform": platform, "nick": nick or ""})
        entry["platform"] = platform
        entry["lastSeen"] = now
        if nick:
            entry["nick"] = nick
        self.seen_devices[ip] = entry
        # Prune stale passive devices older than 120s
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

    def join(self, client_id, nick, skin, ip, platform):
        with self.lock:
            self.cleanup_stale_lobby()
            nick = (nick or "").strip()[:16] or f"Player-{len(self.players) + 1}"
            if skin not in SKINS:
                skin = self._pick_free_skin()

            existing = self._find_player(client_id)
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

            player = {
                "id": client_id,
                "nick": nick,
                "skin": skin,
                "ip": ip,
                "platform": platform,
                "isBot": False,
                "lives": 3,
                "chambers": 6,
                "alive": True,
                "hand": [],
                "stood": False,
                "busted": False,
                "kills": 0,
                "shotsSurvived": 0,
                "lastSeen": time.time(),
            }
            self.players.append(player)
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
                self._check_after_elimination()

    def add_bot(self):
        with self.lock:
            if self.phase != "LOBBY":
                return False, "Só é possível adicionar bots no lobby."
            if len(self.players) >= MAX_PLAYERS:
                return False, "Sala já atingiu 5 jogadores."
            skin = self._pick_free_skin()
            bot_idx = sum(1 for p in self.players if p["isBot"]) + 1
            used_names = {p["nick"] for p in self.players}
            name = next((n for n in BOT_NAMES if n not in used_names), f"Bot-{bot_idx}")
            bot_id = f"bot_{int(time.time() * 1000)}_{random.randint(100, 999)}"
            self.players.append({
                "id": bot_id,
                "nick": name,
                "skin": skin,
                "ip": "127.0.0.1 (BOT)",
                "platform": "CPU",
                "isBot": True,
                "lives": 3,
                "chambers": 6,
                "alive": True,
                "hand": [],
                "stood": False,
                "busted": False,
                "kills": 0,
                "shotsSurvived": 0,
                "lastSeen": time.time(),
            })
            self.add_log(f"{name} entrou para completar a mesa.")
            return True, "Bot adicionado."

    def remove_bots(self):
        with self.lock:
            if self.phase != "LOBBY":
                return False, "Só é possível remover bots no lobby."
            self.players = [p for p in self.players if not p["isBot"]]
            self.add_log("Bots removidos do lobby.")
            return True, "Bots removidos."

    def start_match(self):
        with self.lock:
            if self.phase != "LOBBY":
                return False, "Partida já iniciada."
            if len(self.players) < 2:
                return False, "São necessários pelo menos 2 jogadores (ou adicione um Bot)."
            self.round_num = 0
            self.shot_seq = 0
            self.last_shot = None
            self.winner_champion_id = None
            self.shoe = build_shoe(6)
            for p in self.players:
                p["lives"] = 3
                p["chambers"] = 6
                p["alive"] = True
                p["kills"] = 0
                p["shotsSurvived"] = 0
            self._start_round()
            return True, "Partida iniciada!"

    def _start_round(self):
        self.round_num += 1
        self.winner_queue = []
        self.current_shooter_id = None
        self.round_winners = []
        self.phase = "PLAYING_CARDS"
        self.phase_started_at = time.time()

        alive_players = [p for p in self.players if p["alive"]]
        for p in self.players:
            p["hand"] = []
            p["stood"] = not p["alive"]
            p["busted"] = False

        for p in alive_players:
            p["hand"] = [self._draw(), self._draw()]
            sc = score_hand(p["hand"])
            if sc["isBlackjack"]:
                p["stood"] = True

        # Bots play their Blackjack hands immediately
        for p in alive_players:
            if p["isBot"]:
                while not p["stood"] and not p["busted"]:
                    sc = score_hand(p["hand"])
                    if sc["total"] < 17:
                        p["hand"].append(self._draw())
                        sc = score_hand(p["hand"])
                        if sc["isBust"]:
                            p["busted"] = True
                            p["stood"] = True
                    else:
                        p["stood"] = True

        self.add_log(f"Rodada {self.round_num}: cartas distribuídas! Façam suas jogadas.")
        self._check_cards_complete()

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
                p["hand"].append(self._draw())
                sc = score_hand(p["hand"])
                if sc["isBust"]:
                    p["busted"] = True
                    p["stood"] = True
                    self.add_log(f"{p['nick']} pediu carta e estourou ({sc['total']})!")
                elif sc["total"] == 21:
                    p["stood"] = True
                    self.add_log(f"{p['nick']} cravou 21 pontos!")
            elif action == "stand":
                p["stood"] = True
                sc = score_hand(p["hand"])
                self.add_log(f"{p['nick']} parou com {sc['total']} pontos.")
            else:
                return False, "Ação inválida."

            self._check_cards_complete()
            return True, "OK"

    def _check_cards_complete(self):
        alive = [p for p in self.players if p["alive"]]
        if not alive:
            return
        if all(p["stood"] or p["busted"] for p in alive):
            # Evaluate winning hand(s)
            scored = []
            for p in alive:
                sc = score_hand(p["hand"])
                if not sc["isBust"]:
                    rank_key = (1, 1 if sc["isBlackjack"] else 0, sc["total"])
                else:
                    # All busted fallback: closest to 21 wins
                    rank_key = (0, 0, -sc["total"])
                scored.append((rank_key, p))

            best_key = max(item[0] for item in scored)
            winners = [p for rk, p in scored if rk == best_key]
            self.round_winners = [w["id"] for w in winners]
            self.winner_queue = [w["id"] for w in winners]
            names = ", ".join(w["nick"] for w in winners)
            self.add_log(f"Vencedor(es) da rodada: {names}! Escolha quem vai encarar o revólver.")
            self._advance_to_next_shooter()

    def _advance_to_next_shooter(self):
        alive_ids = {p["id"] for p in self.players if p["alive"]}
        if len(alive_ids) <= 1:
            self._finish_match()
            return

        # Keep only alive shooters in queue
        self.winner_queue = [wid for wid in self.winner_queue if wid in alive_ids]
        if self.winner_queue:
            self.current_shooter_id = self.winner_queue.pop(0)
            self.phase = "CHOOSE_TARGET"
            self.phase_started_at = time.time()
            shooter = self._find_player(self.current_shooter_id)
            if shooter and shooter["isBot"]:
                # Bot picks a living opponent (prefers opponent with lowest chambers)
                opponents = [p for p in self.players if p["alive"] and p["id"] != shooter["id"]]
                if opponents:
                    opponents.sort(key=lambda o: (o["chambers"], o["lives"]))
                    self._execute_shot(shooter["id"], opponents[0]["id"])
        else:
            self._start_round()

    def shoot(self, shooter_id, target_id):
        with self.lock:
            if self.phase != "CHOOSE_TARGET":
                return False, "Não é o momento de atirar."
            if shooter_id != self.current_shooter_id:
                return False, "Apenas o vencedor da rodada pode atirar."
            return self._execute_shot(shooter_id, target_id)

    def _execute_shot(self, shooter_id, target_id):
        shooter = self._find_player(shooter_id)
        target = self._find_player(target_id)
        if not shooter or not target or not target["alive"]:
            return False, "Alvo inválido."
        if shooter["id"] == target["id"]:
            return False, "Escolha outro jogador para atirar!"

        odds_before = f"1/{target['chambers']}"
        roll = random.randint(1, target["chambers"])
        fired = (roll == 1)
        eliminated = False

        if fired:
            target["lives"] = max(0, target["lives"] - 1)
            if target["lives"] == 0:
                target["alive"] = False
                target["chambers"] = 0
                eliminated = True
                shooter["kills"] += 1
                odds_after = "ELIMINADO"
                self.add_log(
                    f"BANG! {shooter['nick']} disparou ({odds_before}) e ELIMINOU {target['nick']}!"
                )
            else:
                target["chambers"] = 6
                odds_after = "1/6"
                self.add_log(
                    f"BANG! {shooter['nick']} acertou {target['nick']} ({odds_before})! Restam {target['lives']} vidas (tambor voltou a 1/6)."
                )
        else:
            target["shotsSurvived"] += 1
            target["chambers"] = max(1, target["chambers"] - 1)
            odds_after = f"1/{target['chambers']}"
            self.add_log(
                f"*CLIQUE*! {target['nick']} sobreviveu ao tiro ({odds_before}). Próxima chance: {odds_after}!"
            )

        self.shot_seq += 1
        self.last_shot = {
            "seq": self.shot_seq,
            "shooterId": shooter["id"],
            "shooterNick": shooter["nick"],
            "shooterSkin": shooter["skin"],
            "targetId": target["id"],
            "targetNick": target["nick"],
            "targetSkin": target["skin"],
            "fired": fired,
            "eliminated": eliminated,
            "oddsBefore": odds_before,
            "oddsAfter": odds_after,
            "livesLeft": target["lives"],
        }
        self.phase = "ROULETTE_SHOT"
        self.phase_started_at = time.time()
        self.shot_ready_at = time.time() + SHOT_ANIM_SEC
        return True, "Disparo executado!"

    def next_after_shot(self):
        with self.lock:
            if self.phase != "ROULETTE_SHOT":
                return False, "Aguardando disparo."
            if time.time() < self.shot_ready_at - 0.5:
                return False, "Animação em andamento."
            self._check_after_elimination()
            return True, "OK"

    def _check_after_elimination(self):
        alive = [p for p in self.players if p["alive"]]
        if len(alive) <= 1:
            self._finish_match()
        else:
            self._advance_to_next_shooter()

    def _finish_match(self):
        alive = [p for p in self.players if p["alive"]]
        self.phase = "GAME_OVER"
        self.phase_started_at = time.time()
        if alive:
            champ = alive[0]
            self.winner_champion_id = champ["id"]
            self.add_log(f"FIM DE JOGO! {champ['nick']} é o grande sobrevivente!")
        else:
            self.winner_champion_id = None
            self.add_log("FIM DE JOGO!")

    def reset_to_lobby(self):
        with self.lock:
            self.phase = "LOBBY"
            self.round_num = 0
            self.winner_queue = []
            self.current_shooter_id = None
            self.round_winners = []
            self.last_shot = None
            self.winner_champion_id = None
            for p in self.players:
                p["lives"] = 3
                p["chambers"] = 6
                p["alive"] = True
                p["hand"] = []
                p["stood"] = False
                p["busted"] = False
                p["kills"] = 0
                p["shotsSurvived"] = 0
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
            elif self.phase == "ROULETTE_SHOT":
                if now - self.phase_started_at >= SHOT_AUTO_NEXT_SEC:
                    self._check_after_elimination()

    def snapshot(self, viewer_id, viewer_ip, viewer_platform):
        with self.lock:
            self.tick_timers()
            if viewer_id:
                p = self._find_player(viewer_id)
                if p:
                    p["lastSeen"] = time.time()
                    p["ip"] = viewer_ip
                    p["platform"] = viewer_platform
            self.touch_network_device(viewer_ip, viewer_platform)

            now = time.time()
            time_left = 0
            if self.phase == "PLAYING_CARDS":
                time_left = max(0, int(CARD_TURN_TIMEOUT_SEC - (now - self.phase_started_at)))

            players_out = []
            for p in self.players:
                sc = score_hand(p["hand"]) if p["hand"] else {"total": 0, "isSoft": False, "isBlackjack": False, "isBust": False}
                players_out.append({
                    "id": p["id"],
                    "nick": p["nick"],
                    "skin": p["skin"],
                    "ip": p["ip"],
                    "platform": p["platform"],
                    "isBot": p["isBot"],
                    "lives": p["lives"],
                    "chambers": p["chambers"],
                    "odds": f"1/{p['chambers']}" if p["alive"] and p["chambers"] > 0 else "0",
                    "alive": p["alive"],
                    "hand": p["hand"],
                    "score": sc,
                    "stood": p["stood"],
                    "busted": p["busted"],
                    "kills": p["kills"],
                    "shotsSurvived": p["shotsSurvived"],
                })

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
                "lastShot": self.last_shot,
                "championId": self.winner_champion_id,
                "logs": self.logs,
                "networkDevices": list(self.seen_devices.values()),
            }


ROOM = RouletteRoom()


class BlackjackHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format, *args):
        # Quiet request logging except errors
        pass

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
            else:
                ok, msg = ROOM.add_bot()
        elif parsed.path == "/api/roulette/start":
            ok, msg = ROOM.start_match()
        elif parsed.path == "/api/roulette/action":
            ok, msg = ROOM.card_action(client_id, body.get("action"))
        elif parsed.path == "/api/roulette/shoot":
            ok, msg = ROOM.shoot(client_id, str(body.get("targetId") or ""))
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
    print(f"Pixel Blackjack + Roleta Russa Server rodando em:")
    print(f"  Local: http://127.0.0.1:{args.port}")
    print(f"  Rede : http://{lan_ip}:{args.port}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
        srv.server_close()


if __name__ == "__main__":
    main()
