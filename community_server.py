"""Shared Bot submissions. Use create_app() with a WSGI server for HTTPS hosting."""

import argparse
from contextlib import closing
import hashlib
from http.cookies import CookieError, SimpleCookie
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import sqlite3
from socketserver import ThreadingMixIn
from threading import Thread
import time
from urllib.parse import parse_qs, urlsplit
import webbrowser
from wsgiref.simple_server import WSGIServer, make_server
from wsgiref.util import FileWrapper


ROOT = Path(__file__).resolve().parent
DEFAULT_DB = Path.home() / ".folkhouse" / "community.sqlite3"
API = "/api/community/bots"
INVITE_API = "/api/community/invite"
INVITE_COOKIE = "cabin_publisher"
PAGE_SIZE = 12
MAX_BODY = 18_000
REQUEST_ID = re.compile(r"[0-9a-f]{32}")
PUBLIC_ID = re.compile(r"post-[0-9a-f]{32}")
ASSET = re.compile(
    r"/(?:[\w-]+\.(?:js|css)|vendor/[\w.-]+\.js|"
    r"(?:textures|exhibit-images)/[\w-]+\.(?:webp|png)|audio/[\w-]+\.(?:mp3|vtt))",
    re.ASCII,
)
SHAPES = ("orb", "tile", "cloud", "pebble", "drop", "badge", "bloom", "star")
COLORS = (
    "#27d875", "#438bff", "#f74b55", "#ff953b", "#ffd14d", "#15cbbb",
    "#ad65f4", "#fa6da6", "#91d94a", "#151515",
    "#13c16f", "#3a9de6", "#d3554e", "#ec8c37", "#e5ad38", "#1ab5ab",
    "#9970d8", "#e36b99", "#a4724d", "#4b5054",
)


def required_text(packet, key, limit, label):
    value = packet.get(key)
    if not isinstance(value, str):
        raise ValueError(f"请填写{label}。")
    value = value.strip().replace("\r\n", "\n")
    if not value or len(value.encode("utf-16-le")) // 2 > limit:
        raise ValueError(f"{label}需要在 1 到 {limit} 字之间。")
    if re.search(r"[\x00-\x08\x0b-\x1f\x7f]", value) or (key != "instructions" and "\n" in value):
        raise ValueError(f"请检查{label}里的换行或特殊字符。")
    return value


def submission(payload):
    if not isinstance(payload, dict) or payload.get("publish") is not True:
        raise ValueError("请先确认公开投稿。")
    packet = payload.get("packet")
    if not isinstance(packet, dict) or type(packet.get("v")) is not int or packet["v"] != 1:
        raise ValueError("这份资料的版本不兼容，请在 Grok 里重新生成投稿链接。")
    request_id = packet.get("requestId")
    if not isinstance(request_id, str) or not REQUEST_ID.fullmatch(request_id):
        raise ValueError("投稿链接缺少编号，请在 Grok 里重新生成。")
    shape, color = packet.get("shape"), packet.get("color")
    color = color.lower() if isinstance(color, str) else None
    profile = {
        "v": 1,
        "name": required_text(packet, "name", 20, "Bot 名字"),
        "job": required_text(packet, "job", 20, "岗位"),
        "instructions": required_text(packet, "instructions", 2400, "工作指令"),
        "shape": shape if shape in SHAPES else SHAPES[0],
        "color": color if color in COLORS else COLORS[0],
    }
    return "post-" + request_id, profile


def make_record(row):
    _, identifier, created_at, data = row
    return {**json.loads(data), "id": identifier, "createdAt": created_at}


def init_database(database=None):
    database = Path(database or os.environ.get("CABIN_DB") or DEFAULT_DB).expanduser().resolve()
    database.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(database)) as db, db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("""
            CREATE TABLE IF NOT EXISTS community_bots (
                seq INTEGER PRIMARY KEY,
                id TEXT NOT NULL UNIQUE,
                created_at INTEGER NOT NULL,
                data TEXT NOT NULL
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS community_invites (
                id INTEGER PRIMARY KEY,
                label TEXT NOT NULL,
                token_digest BLOB NOT NULL UNIQUE,
                revoked INTEGER NOT NULL DEFAULT 0
            )
        """)
    return database


def browser_token(code):
    if not isinstance(code, str):
        return None
    normalized = code.strip().replace("-", "").lower()
    if not re.fullmatch(r"[a-f0-9]{32}", normalized):
        return None
    # The browser receives a derived credential. The database stores only its digest.
    return hashlib.sha256(b"cabin-publisher-v1:" + normalized.encode("ascii")).hexdigest()


def token_digest(token):
    return hashlib.sha256(token.encode("ascii")).digest()


def cookie_token(environ):
    cookies = SimpleCookie()
    try:
        cookies.load(environ.get("HTTP_COOKIE", ""))
    except CookieError:
        return None
    cookie = cookies.get(INVITE_COOKIE)
    if cookie and re.fullmatch(r"[a-f0-9]{64}", cookie.value):
        return cookie.value
    return None


def active_invite(db, token):
    return bool(token) and db.execute(
        "SELECT 1 FROM community_invites WHERE token_digest = ? AND revoked = 0",
        (token_digest(token),),
    ).fetchone() is not None


def create_app(database=None, public_origin=None):
    public_origin = (public_origin or os.environ.get("CABIN_PUBLIC_ORIGIN", "")).rstrip("/")
    if public_origin:
        configured = urlsplit(public_origin)
        if (configured.scheme != "https" or not configured.hostname or configured.username
                or configured.password or configured.path or configured.query or configured.fragment):
            raise ValueError("CABIN_PUBLIC_ORIGIN 请填写完整 HTTPS 来源，例如 https://cabin.example.com")
    database = init_database(database)

    cabin_html = (ROOT / "index.html").read_bytes().replace(b"<body>", b"<body data-community>", 1)
    submit_html = (ROOT / "submit.html").read_bytes()

    def app(environ, start_response):
        path = environ["PATH_INFO"]
        method = environ["REQUEST_METHOD"]

        def send(status, content=b"", content_type="application/json; charset=utf-8", headers=()):
            response_headers = [
                ("Content-Type", content_type),
                ("X-Content-Type-Options", "nosniff"),
                ("Referrer-Policy", "same-origin"),
                *headers,
            ]
            if status != "304 Not Modified":
                response_headers.append(("Content-Length", str(len(content))))
            start_response(status, response_headers)
            return [] if method == "HEAD" or not content else [content]

        def reply(status, data, cache="no-store", etag=None, extra_headers=()):
            headers = [("Cache-Control", cache), *extra_headers]
            if etag:
                headers.append(("ETag", etag))
                if environ.get("HTTP_IF_NONE_MATCH") == etag:
                    return send("304 Not Modified", headers=headers)
            return send(status, json.dumps(data, ensure_ascii=False).encode("utf-8"), headers=headers)

        def invite_required(message="请先用屋主发给你的有效邀请码开启投稿。"):
            return reply("403 Forbidden", {"code": "invite_required", "error": message})

        if method == "POST" and path in (API, INVITE_API):
            origin = public_origin
            if not origin and not environ.get("HTTP_FORWARDED"):
                host = environ.get("HTTP_HOST", "")
                if re.fullmatch(r"(?:localhost|127\.0\.0\.1):" + re.escape(environ["SERVER_PORT"]), host):
                    origin = "http://" + host
            if not origin or environ.get("HTTP_ORIGIN") != origin:
                return reply("403 Forbidden", {"error": "请从小屋的投稿页提交。"})
            if environ.get("CONTENT_TYPE", "").split(";", 1)[0] != "application/json":
                return reply("415 Unsupported Media Type", {"error": "投稿需要使用小屋的 JSON 格式。"})
            token = cookie_token(environ) if path == API else None
            if path == API and not token:
                return invite_required()
            try:
                length = int(environ.get("CONTENT_LENGTH") or "0")
                if not 0 < length <= (MAX_BODY if path == API else 512):
                    return reply("413 Payload Too Large", {"error": "请检查提交内容的长度。"})
                payload = json.loads(environ["wsgi.input"].read(length))
                with closing(sqlite3.connect(database)) as db, db:
                    if path == INVITE_API:
                        token = browser_token(payload.get("code") if isinstance(payload, dict) else None)
                        if not active_invite(db, token):
                            return invite_required("邀请码无效或已被停用，请向屋主核对。")
                        cookie = (f"{INVITE_COOKIE}={token}; Path=/api/community; "
                                  "HttpOnly; SameSite=Lax; Max-Age=31536000")
                        if public_origin:
                            cookie += "; Secure"
                        return reply("200 OK", {"authorized": True}, extra_headers=[("Set-Cookie", cookie)])

                    # Check revocation and publish in the same write transaction.
                    db.execute("BEGIN IMMEDIATE")
                    if not active_invite(db, token):
                        return invite_required()
                    identifier, profile = submission(payload)
                    data = json.dumps(profile, ensure_ascii=False, separators=(",", ":"))
                    insert = db.execute(
                        "INSERT INTO community_bots(id, created_at, data) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING",
                        (identifier, time.time_ns() // 1_000_000, data),
                    )
                    row = db.execute("SELECT * FROM community_bots WHERE id = ?", (identifier,)).fetchone()
                    created = insert.rowcount == 1
            except (ValueError, UnicodeError, RecursionError) as error:
                message = str(error) if type(error) is ValueError else "无法读取资料，请重新生成投稿链接。"
                return reply("400 Bad Request", {"error": message})
            except sqlite3.OperationalError:
                return reply("503 Service Unavailable", {"error": "小屋暂时收不到投稿，点一下再试。"})
            if row[3] != data:
                return reply("409 Conflict", {"error": "这个投稿编号已经用过，请生成一个新链接。"})
            return reply("201 Created" if created else "200 OK", {"bot": make_record(row), "created": created})

        if method not in ("GET", "HEAD"):
            return reply("405 Method Not Allowed", {"error": "小屋不支持这个请求。"})
        if path == INVITE_API:
            try:
                with closing(sqlite3.connect(database)) as db:
                    authorized = active_invite(db, cookie_token(environ))
            except sqlite3.OperationalError:
                return reply("503 Service Unavailable", {"error": "暂时无法核验投稿资格，请重试。"})
            return reply("200 OK", {"authorized": authorized})
        if path == API:
            before = parse_qs(environ.get("QUERY_STRING", "")).get("before", [""])[0]
            if before and (not re.fullmatch(r"[1-9][0-9]{0,18}", before) or int(before) > 2**63 - 1):
                return reply("400 Bad Request", {"error": "投稿名册页码无效。"})
            query = "SELECT * FROM community_bots "
            params = (PAGE_SIZE + 1,)
            if before:
                query += "WHERE seq < ? "
                params = (int(before), *params)
            with closing(sqlite3.connect(database)) as db:
                rows = db.execute(query + "ORDER BY seq DESC LIMIT ?", params).fetchall()
            next_page = rows[PAGE_SIZE - 1][0] if len(rows) > PAGE_SIZE else None
            etag = f'"posts-{rows[0][0] if rows else 0}-{before}"'
            return reply("200 OK", {"bots": [make_record(row) for row in rows[:PAGE_SIZE]], "next": next_page},
                         cache="no-cache", etag=etag)
        if path.startswith(API + "/") and PUBLIC_ID.fullmatch(identifier := path[len(API) + 1:]):
            with closing(sqlite3.connect(database)) as db:
                row = db.execute("SELECT * FROM community_bots WHERE id = ?", (identifier,)).fetchone()
            if row:
                return reply("200 OK", {"bot": make_record(row)})
            return reply("404 Not Found", {"error": "小屋里还没有这位 Bot。"})

        if path in ("/", "/index.html"):
            return send("200 OK", cabin_html, "text/html; charset=utf-8", [("Cache-Control", "no-store")])
        if path == "/submit":
            clicked = (
                environ.get("HTTP_SEC_FETCH_USER") == "?1"
                and environ.get("HTTP_SEC_FETCH_MODE") == "navigate"
                and environ.get("HTTP_SEC_FETCH_DEST") == "document"
            )
            html = submit_html.replace(b"<body>", b"<body data-link-clicked>", 1) if clicked else submit_html
            return send("200 OK", html, "text/html; charset=utf-8", [
                ("Cache-Control", "no-store"),
                ("Content-Security-Policy",
                 "default-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"),
            ])
        if ASSET.fullmatch(path):
            file = (ROOT / path[1:]).resolve()
            if file.is_relative_to(ROOT) and file.is_file():
                info = file.stat()
                media_type = mimetypes.guess_type(file)[0] or "application/octet-stream"
                etag = f'"asset-{info.st_mtime_ns}-{info.st_size}"'
                headers = [("Cache-Control", "no-cache"), ("ETag", etag)]
                if environ.get("HTTP_IF_NONE_MATCH") == etag:
                    return send("304 Not Modified", content_type=media_type, headers=headers)
                start_response("200 OK", [
                    ("Content-Type", media_type),
                    ("Content-Length", str(info.st_size)),
                    ("X-Content-Type-Options", "nosniff"),
                    *headers,
                ])
                if method == "HEAD":
                    return []
                return environ.get("wsgi.file_wrapper", FileWrapper)(file.open("rb"))
        return reply("404 Not Found", {"error": "小屋里没有这个页面。"})

    return app


class PreviewServer(ThreadingMixIn, WSGIServer):
    daemon_threads = True


def manage_invites(args, parser):
    database = init_database(args.db)
    with closing(sqlite3.connect(database)) as db:
        if args.issue_invite is not None:
            label = args.issue_invite.strip()
            if any(not c.isprintable() for c in label):
                parser.error("称呼中含有不能显示的字符。")
            raw = secrets.token_hex(16).upper()
            code = "-".join(raw[i:i + 8] for i in range(0, len(raw), 8))
            with db:
                row = db.execute("INSERT INTO community_invites (label, token_digest) VALUES (?, ?)",
                                 (label, token_digest(browser_token(code))))
            print(f"邀请码编号：{row.lastrowid}\n邀请码：{code}")
        elif args.revoke_invite is not None:
            if not 1 <= args.revoke_invite <= 2**63 - 1:
                parser.error("请输入有效的邀请码编号。")
            with db:
                row = db.execute("UPDATE community_invites SET revoked = 1 WHERE id = ?", (args.revoke_invite,))
            if not row.rowcount:
                parser.error("找不到这个邀请码编号。")
            print(f"已停用邀请码 {args.revoke_invite}。")
        else:
            print("编号\t状态\t称呼")
            for number, label, revoked in db.execute("SELECT id, label, revoked FROM community_invites ORDER BY id DESC"):
                print(number, "已停用" if revoked else "有效", label or "—", sep="\t")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="预览小屋投稿并管理邀请码")
    parser.add_argument("--port", type=int, default=18768)
    parser.add_argument("--db", type=Path, help=f"SQLite 数据文件，默认 {DEFAULT_DB}")
    parser.add_argument("--open", action="store_true", help="启动后打开投稿页")
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument("--issue-invite", nargs="?", const="", metavar="称呼", help="为受邀者生成邀请码")
    actions.add_argument("--list-invites", action="store_true", help="列出邀请码编号、状态和称呼")
    actions.add_argument("--revoke-invite", type=int, metavar="编号", help="停用指定邀请码和对应浏览器的投稿资格")
    args = parser.parse_args()
    if args.issue_invite is not None or args.list_invites or args.revoke_invite is not None:
        manage_invites(args, parser)
        raise SystemExit(0)
    with make_server("127.0.0.1", args.port, create_app(args.db), server_class=PreviewServer) as server:
        address = f"http://127.0.0.1:{server.server_port}/submit"
        print(f"本机投稿预览 {address}", flush=True)
        if args.open:
            Thread(target=webbrowser.open, args=(address,), daemon=True).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
