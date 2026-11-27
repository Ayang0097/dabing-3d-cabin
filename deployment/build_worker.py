"""Bundle the outfit catalog into the Sites Worker entrypoint."""

from argparse import ArgumentParser
from pathlib import Path

parser = ArgumentParser(description=__doc__)
parser.add_argument("output", type=Path)
output = parser.parse_args().output
root = Path(__file__).resolve().parent.parent
catalog = (root / "bot-outfit.js").read_text()
worker = (root / "deployment" / "worker.mjs").read_text()
import_line = "import '../bot-outfit.js';\n"
if not worker.startswith(import_line):
    raise SystemExit("The Worker must import the shared outfit catalog first.")
output.write_text(catalog + "\n" + worker.removeprefix(import_line))
