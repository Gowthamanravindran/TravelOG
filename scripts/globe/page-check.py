#!/usr/bin/env python3
"""Runs the real globe page in headless Chrome and checks what unit tests cannot (Plan 72).

The app's tests replace the web view with a stand-in, so the page's own script is only proven
to parse. This builds the page exactly as the app does and drives it: camera padding, tap modes
and the home view. A development aid, not part of CI: it needs Playwright for Python
(`pip install playwright`) and Google Chrome at /usr/bin/google-chrome.

    python3 scripts/globe/page-check.py        # from the repo root; exits 1 if a check fails
"""
import json
import os
import subprocess
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PKG = os.path.join(ROOT, "packages", "globe")
HTML = "/tmp/travelog-globe.html"
DUMP = os.path.join(PKG, "src", "zz-page-dump.test.ts")

# Build the page with the package's own code (no imagery: the check must not need the network).
with open(DUMP, "w") as f:
    f.write(
        "import { writeFileSync } from 'node:fs';\n"
        "import { it } from 'vitest';\n"
        "import { loadCountries } from './countries';\n"
        "import { FLAGS } from './flags';\n"
        "import { buildGlobeHtml, defaultTheme } from './globeHtml';\n"
        "it('dump', () => {\n"
        f"  writeFileSync('{HTML}', buildGlobeHtml(loadCountries(), {{ theme: defaultTheme, quality: 'auto', imageryUrl: '', imageryMaxZoom: 5, imageryAttribution: '', benchmark: false, focusOnTap: true, flags: FLAGS }}));\n"
        "});\n"
    )
try:
    subprocess.run(["npx", "vitest", "run", "src/zz-page-dump.test.ts"], cwd=PKG, check=True, capture_output=True)
finally:
    os.remove(DUMP)

W, H, INSET = 390, 470, 200
BAND_MID = (H - INSET) // 2  # the middle of the part of the globe that shows
out = {}
with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path="/usr/bin/google-chrome",
        args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
    )
    page = browser.new_page(viewport={"width": W, "height": H})
    page.add_init_script(
        "window.__msgs=[]; window.ReactNativeWebView={postMessage:function(m){window.__msgs.push(JSON.parse(m))}};"
    )
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("file://" + HTML)
    page.wait_for_function("window.__msgs.some(m=>m.type==='ready'||m.fatal)", timeout=60000)
    page.evaluate("window.globe.setSpin(false); window.globe.setReduceMotion(true)")

    def tap(x, y):
        n = page.evaluate("window.__msgs.length")
        page.mouse.click(x, y)
        page.wait_for_timeout(250)
        return page.evaluate("n=>window.__msgs.slice(n).filter(m=>m.type!=='perf')", n)

    def popups():
        return page.evaluate("document.querySelectorAll('.country-pop').length")

    # 1. With the lower 200 px covered, a focused country sits in the middle of what shows.
    page.evaluate(f"window.globe.setTapMode('report'); window.globe.setInset({INSET}); window.globe.focusCountry('JPN')")
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/globe-focus.png")
    # Just below the middle of the band: the middle itself is under the country's name tag.
    hit = tap(W // 2 + 15, BAND_MID + 50)
    out["inset_focus"] = any(m.get("type") == "country" and m.get("iso") == "JPN" for m in hit)

    # 2. Report mode: a tap tells the app and does nothing else.
    page.evaluate("window.globe.clearSelection()")
    page.evaluate("window.globe.flyTo(138, 36, 4)")
    page.wait_for_timeout(1200)
    hit = tap(W // 2, BAND_MID)
    out["report_only"] = any(m.get("type") == "country" for m in hit) and popups() == 0

    # 3. Focus mode: the same tap outlines and names the country.
    page.evaluate("window.globe.setTapMode('focus')")
    hit = tap(W // 2, BAND_MID)
    page.wait_for_timeout(600)
    out["focus_mode"] = any(m.get("type") == "country" for m in hit) and popups() == 1

    # 4. Home: the whole Earth fits in the band that shows (its top edge is on screen, and the
    #    covered part holds no more than the globe's lower rim).
    page.evaluate("window.globe.clearSelection(); window.globe.setTapMode('report'); window.globe.goHome()")
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/globe-home.png")
    size = page.evaluate("window.globe.debugSize ? window.globe.debugSize() : null")
    out["home_fits"] = bool(size) and size["diameter"] <= min(W, H - INSET) and abs(size["centerY"] - BAND_MID) <= 12
    out["home_size"] = size

    out["no_errors"] = not errors and not page.evaluate("window.__msgs.some(m=>m.type==='error')")
    out["errors"] = errors[:3]
    browser.close()

print(json.dumps(out, indent=1))
checks = ["inset_focus", "report_only", "focus_mode", "home_fits", "no_errors"]
sys.exit(0 if all(out.get(c) for c in checks) else 1)
