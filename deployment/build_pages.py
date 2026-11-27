"""Build the public cabin, classroom, and key-gated submission forms."""

import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
import re
from shutil import copy2, copytree, ignore_patterns
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent.parent
DEPLOYMENT = ROOT / "deployment"
LOCAL_SCRIPTS = {"bot-creator.js", "grok-exchange.js"}


def bots_endpoint():
    endpoint = os.environ.get("CABIN_BOT_API", "").strip()
    if endpoint:
        url = urlsplit(endpoint)
        secure = url.scheme == "https" or (url.scheme == "http" and url.hostname in {"127.0.0.1", "localhost"})
        if not secure or not url.hostname or url.username or url.password or url.query or url.fragment or url.path != "/api/community/bots":
            raise ValueError("CABIN_BOT_API must point to the hosted /api/community/bots endpoint.")
    return endpoint


def build(output):
    output.mkdir(parents=True, exist_ok=True)
    classroom_css = ROOT / "classroom" / "assets" / "room.css"
    classroom_version = sha256(classroom_css.read_bytes()).hexdigest()[:12]
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    html = re.sub(r'<script data-source-only>.*?</script>\s*', "", html, flags=re.S)
    html = html.replace('<title>大冰的小屋 · Bot 民谣现场</title>', '<title>3D 大冰的小屋 · Bot 民谣现场</title>')
    html = html.replace('href="http://127.0.0.1:8769/#classroom"', f'href="./classroom/?v={classroom_version}#classroom"')
    html = re.sub(r'<a id="communityPost"[^>]*>.*?</a>', "", html)
    for filename in LOCAL_SCRIPTS:
        html = html.replace(f'<script src="{filename}"></script>', "")

    for filename in re.findall(r'<script src="([^"]+)"', html):
        target = output / filename
        target.parent.mkdir(parents=True, exist_ok=True)
        copy2(ROOT / filename, target)
    html = html.replace("</head>", '<script src="site-config.js"></script>\n</head>', 1)
    (output / "index.html").write_text(html, encoding="utf-8")

    config = json.dumps({"botsEndpoint": bots_endpoint()})
    (output / "site-config.js").write_text(f"window.CabinPublication = Object.freeze({config});\n", encoding="utf-8")
    copy2(ROOT / "house.css", output / "house.css")
    for filename in ("upload.html", "manage-upload.html", "public-upload.js"):
        copy2(DEPLOYMENT / filename, output / filename)
    for directory in ("audio", "textures", "exhibit-images", "classroom"):
        copytree(ROOT / directory, output / directory, dirs_exist_ok=True, ignore=ignore_patterns(".DS_Store"))
    classroom_index = output / "classroom" / "index.html"
    classroom_html = classroom_index.read_text(encoding="utf-8")
    classroom_index.write_text(
        classroom_html.replace('href="assets/room.css"', f'href="assets/room.css?v={classroom_version}"'),
        encoding="utf-8",
    )
    copy2(ROOT / "vendor" / "THREE-LICENSE.txt", output / "vendor" / "THREE-LICENSE.txt")
    (output / ".nojekyll").touch()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "_site")
    build(parser.parse_args().output)
