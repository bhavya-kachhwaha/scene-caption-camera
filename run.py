import runpy
import sys
from pathlib import Path

studio = Path(__file__).resolve().parent / "studio"
app = studio / "scene_caption.py"
if not app.is_file():
    raise SystemExit("Run git submodule update --init --recursive first.")
sys.path.insert(0, str(studio))
runpy.run_path(str(app), run_name="__main__")
