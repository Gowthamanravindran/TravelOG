"""The globe page started before it has a size (Plan 93).

On the owner's phone the globe's page starts before the globe has been given a size. Drawing the
background stars on a 0 x 0 canvas then threw, which stopped the page before it made its map: every
cold start stalled for 5 s until the app reloaded it. This starts the page inside a frame with no
size, gives the frame a size after a moment, and checks the page made its map and comes up.

Run: python3 scripts/globe/zero-size-check.py
"""

import json
import os
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from globe_page import build  # noqa: E402

HTML = "/tmp/travelog-globe-zero-page.html"
build(HTML)
WRAP = "/tmp/travelog-globe-zero.html"
W, H = 390, 470

with open(WRAP, "w") as f:
    f.write(
        '<html><body style="margin:0"><iframe id="f" src="file://%s" '
        'style="border:0;width:0;height:0"></iframe></body></html>' % HTML
    )

out = {}
with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path="/usr/bin/google-chrome",
        args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
              "--ignore-gpu-blocklist", "--no-sandbox", "--allow-file-access-from-files"],
    )
    page = browser.new_page(viewport={"width": W, "height": H})
    page.add_init_script(
        "window.__msgs=[]; window.ReactNativeWebView={postMessage:function(m){window.__msgs.push(JSON.parse(m))}};"
    )
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("file://" + WRAP)
    page.wait_for_timeout(5000)
    frame = page.frames[1]
    early = frame.evaluate("window.__msgs.filter(m => m.type === 'progress').map(m => m.step)")
    out["zero_size_makes_map"] = "map" in early
    out["zero_size_steps"] = early
    page.evaluate("var f = document.getElementById('f'); f.style.width = '%dpx'; f.style.height = '%dpx'" % (W, H))
    # Polled plainly: waiting by animation frames inside a frame did not see it reliably.
    out["zero_size_then_ready"] = False
    for _ in range(40):
        page.wait_for_timeout(500)
        if frame.evaluate("window.__msgs.some(m => m.type === 'ready')"):
            out["zero_size_then_ready"] = True
            break
    out["page_errors"] = errors + frame.evaluate("window.__msgs.filter(m => m.type === 'error').map(m => m.message)")
    browser.close()

print(json.dumps(out, indent=1))
ok = out["zero_size_makes_map"] and out["zero_size_then_ready"]
print("PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
