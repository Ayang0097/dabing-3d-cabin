"""Bundle the offline room, local engine and original songs into a shareable HTML file."""
from pathlib import Path
from html import escape
import base64
import json
import re

project = Path(__file__).resolve().parent
html = (project / 'index.html').read_text()
html = re.sub(r'<script data-source-only>.*?</script>\s*', '', html, flags=re.S)
css = (project / 'house.css').read_text()
html = html.replace('<link rel="stylesheet" href="house.css">', '<style>\n' + css + '\n</style>')
audio = {
    song.stem: 'data:audio/mpeg;base64,' + base64.b64encode(song.read_bytes()).decode('ascii')
    for song in [project / 'audio' / 'san-yue-san.mp3']
}
textures = {
    tex.name: 'data:image/webp;base64,' + base64.b64encode(tex.read_bytes()).decode('ascii')
    for tex in sorted((project / 'textures').glob('*.webp'))
    if tex.name != 'portal-tree.webp'  # Original portal texture kept with the source assets.
}
reflection = project / 'textures/room-reflections.png'
textures[reflection.name] = 'data:image/png;base64,' + base64.b64encode(reflection.read_bytes()).decode('ascii')
exhibit_images = {
    image.name: 'data:image/webp;base64,' + base64.b64encode(image.read_bytes()).decode('ascii')
    for image in sorted((project / 'exhibit-images').glob('*.webp'))
}
def embed_script(match):
    script = (project / match[1]).read_text().replace('</script', r'<\/script')
    return '<script>\n' + script + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', embed_script, html)
license_text = (project / 'vendor/THREE-LICENSE.txt').read_text()
assets = '<script>window.CabinMedia=' + json.dumps(audio, ensure_ascii=False) + ';window.CabinSurfaceImages=' + json.dumps(textures) + ';window.CabinExhibitImages=' + json.dumps(exhibit_images) + ';</script>'
html = html.replace('</main>', '</main>\n' + assets, 1)
html = html.replace('</body>', '<script type="text/plain" id="three-license">\n' + escape(license_text) + '\n</script>\n</body>')
out = project / '大冰的小屋·Bot民谣现场.html'
out.write_text(html)
print(out.name, out.stat().st_size, 'bytes')
