"""Local Grok Bot transfers for the offline cabin on macOS."""

import argparse
import base64
import hmac
import json
import os
import plistlib
import re
import secrets
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


PORT = 18767
LABEL = "local.folkhouse.grok-bridge"
STATE = Path.home() / "Library/Application Support/大冰的小屋/Grok"
CABIN = Path(__file__).resolve().parent / "大冰的小屋·Bot民谣现场.html"
MAX_BODY = 120_000
WEBHOOK = re.compile(r"https://api2?\.cursor\.(?:sh|com)/automations/webhook/[A-Za-z0-9_-]{1,160}")
BOT_ID = re.compile(r"[A-Za-z0-9_-]{1,120}")
ENCODED = re.compile(r"[A-Za-z0-9_-]+")

RECEIVE_PAGE = """<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>把 Bot 带进小屋</title>
<style>
  body{color:#f5e4c7;background:#202d2b;margin:0;display:grid;min-height:100dvh;place-items:center;font:16px/1.6 system-ui,sans-serif}
  main{box-sizing:border-box;width:min(92%,440px);border:1px solid #636a53;border-radius:16px;padding:26px;background:#293a33}
  h1{font-size:22px;margin:0 0 8px}p{margin:0;overflow-wrap:anywhere}
</style>
<main><h1>把 Bot 带进小屋</h1><p id="message" role="status">正在打开小屋…</p></main>
<script>
async function receiveBot() {
  const message = document.getElementById('message');
  const hash = location.hash, packed = new URLSearchParams(hash.slice(1)).get('bot');
  if (!packed) { message.textContent = '请在 Grok Bot 里点带有角色资料的「一键上传到小屋」链接。'; return; }
  message.textContent = '正在打开小屋…';
  try {
    const response = await fetch(location.pathname, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({bot: packed})
    });
    const reply = await response.json();
    if (location.hash !== hash) return;
    message.textContent = response.ok ? '已打开小屋，入屋结果会显示在小屋页面。可以关闭本页。' : reply.error;
    if (response.ok) history.replaceState(null, '', location.pathname);
  } catch { message.textContent = '连接中断。请重新运行「连接 Grok 双向迁移」，再点击 Grok 里的入屋链接。'; }
}
window.addEventListener('hashchange', receiveBot);
receiveBot();
</script></html>"""


class TransferError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


class RejectRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def read_settings():
    file = STATE / "settings.json"
    try:
        return json.loads(file.read_text())
    except FileNotFoundError:
        settings = {"pair": secrets.token_urlsafe(24), "receive": secrets.token_urlsafe(24)}
        save_settings(settings)
        return settings


def save_settings(settings):
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    temp = STATE / ".settings.tmp"
    fd = os.open(temp, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as stream:
        json.dump(settings, stream)
    temp.replace(STATE / "settings.json")


def bot_text(profile, key, limit, required=False):
    value = profile.get(key, "")
    if not isinstance(value, str) or len(value) > limit or (required and not value.strip()):
        raise TransferError("Bot 资料不完整或超出长度，请检查姓名、工作和能力说明。")
    return value.strip()


def unpack_bot(packed):
    if not isinstance(packed, str) or len(packed) > 32_000 or not ENCODED.fullmatch(packed):
        raise TransferError("这条入屋链接已损坏。请在 Grok Bot 里重新生成。")
    try:
        binary = base64.urlsafe_b64decode(packed + "=" * (-len(packed) % 4))
        unzip = zlib.decompressobj(16 + zlib.MAX_WBITS)
        raw = unzip.decompress(binary, MAX_BODY)
        if not unzip.eof or unzip.unused_data:
            raise ValueError()
        profile = json.loads(raw)
        if not isinstance(profile, dict) or profile.get("v") != 1:
            raise ValueError()
    except (ValueError, zlib.error) as exc:
        raise TransferError("无法读取入屋链接。请在 Grok Bot 里重新生成。") from exc
    bot_text(profile, "name", 20, required=True)
    bot_text(profile, "job", 20)
    instructions = bot_text(profile, "instructions", 16_000)
    source = bot_text(profile, "sourceId", 120)
    if source and not BOT_ID.fullmatch(source):
        raise TransferError("Grok Bot 的 ID 格式不完整。")
    if not (instructions or source):
        raise TransferError("请带上可复用的能力说明，或 Grok Bot 的分享 ID。")
    return packed


def open_cabin(fragment):
    if not CABIN.is_file():
        raise TransferError("找不到当前的小屋 HTML。请在小屋文件夹里重新打开连接工具。", 503)
    result = subprocess.run(["/usr/bin/open", "-b", "com.google.Chrome", CABIN.as_uri() + fragment],
                            capture_output=True, timeout=10)
    if result.returncode:
        raise TransferError("Chrome 未能打开小屋。仍可在小屋的迁移面板里粘贴这条链接。", 503)


def request_copy(settings, payload):
    url, key = settings["webhook"], settings["key"]
    request = urllib.request.Request(url, data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                                     headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
    try:
        with urllib.request.build_opener(RejectRedirect).open(request, timeout=12) as reply:
            if reply.status != 200:
                raise TransferError("Grok 未确认接收。请先查看 Grok 的例行任务记录。", 502)
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403, 404):
            raise TransferError("Grok 拒绝了这次请求。请核对任务的 POST 地址和 key。", 502) from exc
        raise TransferError("Grok 未接受请求。请查看例行任务是否已暂停或用量已达上限。", 502) from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise TransferError("没有收到 Grok 的确认。请先查看例行任务记录，再决定是否重试。", 502) from exc


class Bridge(ThreadingHTTPServer):
    def __init__(self, port, settings):
        self.settings = settings
        self.copying = threading.Lock()
        self.pending = set()
        self.recent = {}
        super().__init__(("127.0.0.1", port), Handler)
        self.host = f"127.0.0.1:{self.server_port}"
        self.origin = "http://" + self.host

    @property
    def join(self):
        return "/join/" + self.settings["receive"]

    def send_bot(self, profile):
        settings = self.settings.copy()
        if not settings.get("webhook"):
            raise TransferError("请先连接 Grok 的复制任务。", 409)
        source = bot_text(profile, "id", 120, required=True)
        if not BOT_ID.fullmatch(source):
            raise TransferError("找不到要复制的 Bot。")
        payload = {"action": "create-private-cabin-bot", "sourceId": source,
                   "name": bot_text(profile, "name", 20, True), "job": bot_text(profile, "job", 20),
                   "appearance": bot_text(profile, "appearance", 300),
                   "instructions": bot_text(profile, "instructions", 24_000, True),
                   "example": bot_text(profile, "example", 1000)}
        with self.copying:
            now = time.monotonic()
            self.recent = {item: until for item, until in self.recent.items() if until > now}
            marker = (settings["webhook"], source)
            if marker in self.pending:
                return {"pending": True}
            if marker in self.recent:
                return {"accepted": True}
            self.pending.add(marker)
        try:
            request_copy(settings, payload)
            with self.copying:
                self.recent[marker] = time.monotonic() + 45
        finally:
            with self.copying:
                self.pending.discard(marker)
        return {"accepted": True}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        # Upload links and their profile contents stay out of the service log.
        pass

    def send(self, status, content, mime="application/json; charset=utf-8"):
        data = json.dumps(content, ensure_ascii=False) if isinstance(content, dict) else content
        body = data.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'none'; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'")
        if self.path.startswith("/api/") and self.headers.get("Origin") == "null":
            self.send_header("Access-Control-Allow-Origin", "null")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Cabin-Token")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if self.headers.get_content_type() != "application/json" or not 0 < length <= MAX_BODY:
                raise ValueError()
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError()
        except (ValueError, TimeoutError) as exc:
            raise TransferError("无法读取这次迁移的数据。") from exc
        return data

    def dispatch(self):
        server = self.server
        if self.headers.get("Host") != server.host:
            raise TransferError("请从本机打开小屋连接。", 403)
        method, path = self.command, self.path
        if path == server.join:
            if method == "GET":
                self.send(200, RECEIVE_PAGE, "text/html; charset=utf-8")
            elif method == "POST" and self.headers.get("Origin") == server.origin:
                packed = unpack_bot(self.read_body().get("bot"))
                open_cabin("#grok-bot=" + packed)
                self.send(200, {"opened": True})
            else:
                raise TransferError("请点击 Grok Bot 回复里的入屋链接。", 403)
            return
        if not path.startswith("/api/"):
            raise TransferError("没有找到这个连接地址。", 404)
        if self.headers.get("Origin") not in (None, "null"):
            raise TransferError("请从本机的小屋 HTML 操作。", 403)
        if method == "OPTIONS":
            self.send(204, "")
            return
        supplied = self.headers.get("X-Cabin-Token", "").encode("utf-8")
        if not hmac.compare_digest(supplied, server.settings["pair"].encode("ascii")):
            raise TransferError("小屋未连接。请重新打开「连接 Grok 双向迁移」。", 403)
        if path == "/api/status" and method == "GET":
            self.send(200, {"receiveUrl": server.origin + server.join, "webhook": bool(server.settings.get("webhook"))})
        elif path == "/api/webhook" and method in ("POST", "DELETE"):
            settings = server.settings.copy()
            if method == "POST":
                data = self.read_body()
                url = bot_text(data, "url", 300, True)
                key = re.sub(r"^(?:Authorization:\s*)?Bearer\s+", "", bot_text(data, "key", 400, True), flags=re.I)
                if not WEBHOOK.fullmatch(url) or not re.fullmatch(r"crsr_[A-Za-z0-9_\-]{8,300}", key):
                    raise TransferError("请使用 Grok Bot 例行任务 Webhook 的 POST 地址和以 crsr_ 开头的 key。")
                settings.update(webhook=url, key=key)
            else:
                settings.pop("webhook", None)
                settings.pop("key", None)
            with server.copying:
                save_settings(settings)
                server.settings = settings
                server.recent.clear()
            self.send(200, {"webhook": bool(settings.get("webhook"))})
        elif path == "/api/copy" and method == "POST":
            self.send(200, server.send_bot(self.read_body()))
        else:
            raise TransferError("没有找到这个连接操作。", 404)

    def handle_request(self):
        self.connection.settimeout(15)
        try:
            self.dispatch()
        except TransferError as exc:
            self.send(exc.status, {"error": str(exc)})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except (OSError, subprocess.SubprocessError):
            self.send(503, {"error": "本机连接未能完成操作，请稍后重试。"})

    do_GET = do_POST = do_DELETE = do_OPTIONS = handle_request


def start_bridge(settings):
    agents = Path.home() / "Library/LaunchAgents"
    agents.mkdir(parents=True, exist_ok=True)
    plist = agents / (LABEL + ".plist")
    domain = f"gui/{os.getuid()}"
    target = domain + "/" + LABEL
    data = plistlib.dumps({"Label": LABEL, "ProgramArguments": [sys.executable, str(Path(__file__).resolve()), "--serve"],
                           "RunAtLoad": True, "KeepAlive": True})
    if not plist.is_file() or plist.read_bytes() != data:
        subprocess.run(["/bin/launchctl", "bootout", target], capture_output=True)
        plist.write_bytes(data)
    if subprocess.run(["/bin/launchctl", "print", target], capture_output=True).returncode:
        subprocess.run(["/bin/launchctl", "bootstrap", domain, str(plist)], check=True)
    status = urllib.request.Request(f"http://127.0.0.1:{PORT}/api/status", headers={"X-Cabin-Token": settings["pair"]})
    for _ in range(30):
        try:
            with urllib.request.urlopen(status, timeout=.3) as reply:
                if json.load(reply).get("receiveUrl") == f"http://127.0.0.1:{PORT}/join/" + settings["receive"]:
                    return
        except (OSError, ValueError):
            time.sleep(.15)
    raise TransferError("小屋接收器未能启动。请检查本机端口 18767 是否被占用。", 503)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--serve", action="store_true")
    mode.add_argument("--start", action="store_true")
    mode.add_argument("--disconnect", action="store_true")
    args = parser.parse_args()
    if args.disconnect:
        target = f"gui/{os.getuid()}/{LABEL}"
        subprocess.run(["/bin/launchctl", "bootout", target], capture_output=True)
        (Path.home() / "Library/LaunchAgents" / (LABEL + ".plist")).unlink(missing_ok=True)
        return
    settings = read_settings()
    if args.serve:
        with Bridge(PORT, settings) as server:
            server.serve_forever()
    else:
        start_bridge(settings)
        if not args.start:
            open_cabin("#grok-pair=" + settings["pair"])
        print("小屋的 Grok 接收器已启动。")


if __name__ == "__main__":
    try:
        main()
    except (OSError, subprocess.SubprocessError, TransferError) as error:
        sys.exit(str(error))
