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
        # Count animation frames asked for, to see whether the page rests when nothing moves.
        "window.__raf=0; var __r=window.requestAnimationFrame.bind(window); window.requestAnimationFrame=function(f){window.__raf++; return __r(f);};"
    )
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("file://" + HTML)
    page.wait_for_function("window.__msgs.some(m=>m.type==='ready'||m.fatal)", timeout=60000)
    # The page reports each step of its start, in order, before ready (Plan 79): the app reloads
    # a page only after 5 s with no step at all.
    page.wait_for_function("window.__msgs.some(m=>m.step==='loaded')", timeout=10000)
    steps = page.evaluate("window.__msgs.filter(m=>m.type==='progress'||m.type==='ready').map(m=>m.type==='ready'?'ready':m.step)")
    # "loaded" (the map's own load event) can come just before or after ready.
    out["start_steps"] = steps[:4] == ["page", "data", "library", "map"] and "ready" in steps and "loaded" in steps
    out["start_steps_seen"] = steps
    # ---- Arriving (Plan 80) ---------------------------------------------------------------------
    # The globe is ready far away, small; a height setting before it arrives is applied at once
    # (no slide up from the bottom); arriving brings it to its full size in the visible part.
    def size0():
        return page.evaluate("window.globe.debugSize()")
    far = size0()
    page.evaluate("window.globe.setInset(%d)" % INSET)
    page.wait_for_timeout(120)
    out["arrive_far"] = far["diameter"] < 0.35 * min(W, H - INSET) and abs(size0()["centerY"] - BAND_MID) <= 6
    page.evaluate("window.globe.arrive()")
    page.wait_for_timeout(700)
    mid = size0()
    page.wait_for_timeout(1800)
    end = size0()
    out["arrive_moves"] = far["diameter"] < mid["diameter"] < end["diameter"]
    out["arrive_home"] = 0.8 * min(W, H - INSET) <= end["diameter"] <= min(W, H - INSET) + 2 and abs(end["centerY"] - BAND_MID) <= 6
    out["arrive_at"] = [far, mid, end]
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

    # ---- With motion on, in the order the app really sends things (Plan 75) --------------------
    # A drawer changes height just after a move is asked for, so the inset and the spin switch
    # arrive while the camera is in flight. Neither may cancel the move. Reduce motion hides this.
    TALL = 760
    page.set_viewport_size({"width": W, "height": TALL})
    page.evaluate("window.globe.setReduceMotion(false); window.globe.setFocus(null); window.globe.setData({}); window.globe.setInset(342); window.globe.goHome()")
    page.wait_for_timeout(1600)

    def size():
        return page.evaluate("window.globe.debugSize()")

    def same(a, b):
        return abs(a["zoom"] - b["zoom"]) < 0.08 and abs(a["centerY"] - b["centerY"]) <= 8 and abs(a["lat"] - b["lat"]) < 1.5 and abs(((a["lng"] - b["lng"]) + 180) % 360 - 180) < 1.5

    def reset():
        page.evaluate("window.globe.setFocus(null); window.globe.setData({}); window.globe.setInset(342); window.globe.goHome()")
        page.wait_for_timeout(1800)

    # 5. Open a country, then the drawer grows (inset) and the spin is switched off. The camera
    #    must end where it does when nothing interrupts it: on the country, in the new band.
    page.evaluate("window.globe.setInset(547)")
    page.wait_for_timeout(700)
    page.evaluate("window.globe.setFocus('JPN')")
    page.wait_for_timeout(1800)
    calm = size()
    reset()
    page.evaluate("window.globe.setFocus('JPN'); window.globe.setInset(547); window.globe.setSpin(false)")
    page.wait_for_timeout(2200)
    page.screenshot(path="/tmp/globe-motion-focus.png")
    at = size()
    mid = (TALL - 547) // 2
    out["motion_focus"] = same(at, calm) and at["zoom"] >= 2 and abs(at["centerY"] - mid) <= 20 and at.get("selected") == "JPN" and popups() == 1
    out["motion_focus_at"] = [calm, at]

    # 6. City dots arrive and a city is flown to: the country keeps its outline and name.
    page.evaluate("window.globe.setData({candidates:[{id:'t',name:'Tokyo',lat:35.68,lng:139.69}]}); window.globe.flyTo(139.69, 35.68, 5)")
    page.wait_for_timeout(1600)
    at = size()
    out["focus_held"] = at.get("selected") == "JPN" and popups() == 1 and at["zoom"] >= 4.5 and abs(at["centerY"] - (TALL - 547) // 2) <= 8

    # 7. Leave the country while the drawer shrinks: back to the whole Earth in the new band.
    page.evaluate("window.globe.setFocus(null); window.globe.setData({}); window.globe.setInset(342); window.globe.setSpin(true)")
    page.wait_for_timeout(2200)
    page.evaluate("window.globe.setSpin(false)")
    page.screenshot(path="/tmp/globe-motion-home.png")
    at = size()
    mid = (TALL - 342) // 2
    out["motion_home"] = at["diameter"] <= min(W, TALL - 342) and at["diameter"] >= 0.8 * min(W, TALL - 342) and abs(at["centerY"] - mid) <= 14 and not at.get("selected") and popups() == 0
    out["motion_home_at"] = at

    # 8. The create flow: fit two countries, then the drawer changes height.
    page.evaluate("window.globe.setInset(471)")
    page.wait_for_timeout(700)
    page.evaluate("window.globe.fitCountries(['JPN','IND'])")
    page.wait_for_timeout(1800)
    calm = size()
    reset()
    page.evaluate("window.globe.fitCountries(['JPN','IND']); window.globe.setInset(471); window.globe.setSpin(false)")
    page.wait_for_timeout(2200)
    at = size()
    out["motion_fit"] = same(at, calm) and 85 <= at["lng"] <= 125 and at["zoom"] > 0.9
    out["motion_fit_at"] = [calm, at]

    # 9. A move with almost no room (a short stage) must not throw.
    page.evaluate("window.globe.setInset(700); window.globe.setFocus('FRA')")
    page.wait_for_timeout(1500)
    page.evaluate("window.globe.setFocus(null); window.globe.setInset(342)")
    page.wait_for_timeout(1200)

    # ---- Picking stops (Plan 85) -------------------------------------------------------------
    page.set_viewport_size({"width": W, "height": H})  # an earlier section made the page taller
    page.wait_for_timeout(300)
    page.evaluate("window.globe.setReduceMotion(true); window.globe.setSpin(false); window.globe.setFocus(null); window.globe.setInset(%d)" % INSET)
    # The picked countries fill most of the visible part, and still fit in it.
    page.evaluate("window.globe.fitCountries(['ITA'])")
    page.wait_for_timeout(400)
    b = page.evaluate("window.globe.debugBox('ITA')")
    band_h = H - INSET
    fill = max((b["right"] - b["left"]) / W, (b["bottom"] - b["top"]) / band_h)
    out["fit_fills"] = fill >= 0.7 and b["left"] >= 0 and b["right"] <= W and b["top"] >= 0 and b["bottom"] <= band_h
    out["fit_fills_at"] = [round(fill, 2), b]
    # A tap right on the middle city of a tight cluster picks that city, not a neighbour.
    cluster = [
        {"id": "mid", "name": "Middle", "lat": 35.68, "lng": 139.69},
        {"id": "up", "name": "Above", "lat": 35.86, "lng": 139.66},
        {"id": "down", "name": "Below", "lat": 35.50, "lng": 139.66},
    ]
    page.evaluate("c => window.globe.setData({ candidates: c })", cluster)
    page.evaluate("window.globe.flyTo(139.68, 35.68, 5.5)")
    page.wait_for_timeout(500)
    picks = {}
    for city in cluster:
        p0 = page.evaluate("c => window.globe.debugPoint(c.lng, c.lat)", city)
        hit = [m for m in tap(p0["x"], p0["y"]) if m.get("type") == "candidate"]
        picks[city["id"]] = hit[0]["id"] if hit else None
    out["tap_nearest"] = picks == {"mid": "mid", "up": "up", "down": "down"}
    out["tap_nearest_at"] = picks
    page.evaluate("window.globe.setData({})")

    # ---- Quality comes back (Plan 87) ---------------------------------------------------------
    # Put the automatic quality in the state of a drop long ago; while the globe is still, it
    # tries the satellite look again within a couple of seconds.
    page.evaluate("window.globe.setSpin(false)")
    q = page.evaluate("window.globe.debugQuality()")
    out["quality_ready_known"] = q["state"]["readyAt"] > 0
    n0 = page.evaluate("window.__msgs.length")
    page.evaluate("t => window.globe.debugQuality({ quality: 'low', slow: 0, since: t - 30000, wait: 20000, readyAt: 1 })", q["now"])
    page.wait_for_timeout(2600)
    back = page.evaluate("n => window.__msgs.slice(n).filter(m => m.type === 'quality')", n0)
    out["quality_returns"] = any(m["quality"] == "high" and m["reason"] == "retry" for m in back)
    out["quality_returns_at"] = back

    # ---- Resting and hidden (Plan 89) ------------------------------------------------------
    # With nothing moving, the page asks for (almost) no frames.
    page.evaluate("window.globe.setSpin(false); window.globe.setVisible(true)")
    page.wait_for_timeout(2500)
    r0 = page.evaluate("window.__raf")
    page.wait_for_timeout(1000)
    out["idle_quiet"] = page.evaluate("window.__raf") - r0 <= 3
    out["idle_quiet_at"] = page.evaluate("window.__raf") - r0
    # Losing the drawing context while hidden is not a crash; it comes back when shown.
    lose = "window.__lc = window.__lc || document.querySelector('canvas.maplibregl-canvas').getContext('webgl2').getExtension('WEBGL_lose_context');"
    n0 = page.evaluate("window.__msgs.length")
    page.evaluate("window.globe.setVisible(false); " + lose + " window.__lc.loseContext()")
    page.wait_for_timeout(4000)
    hidden_crash = page.evaluate("n => window.__msgs.slice(n).some(m => m.type === 'crash')", n0)
    page.evaluate("window.globe.setVisible(true); window.__lc.restoreContext()")
    page.wait_for_timeout(4000)
    shown_crash = page.evaluate("n => window.__msgs.slice(n).some(m => m.type === 'crash')", n0)
    out["hidden_no_crash"] = not hidden_crash and not shown_crash
    # In sight, a context that does not come back is still a crash (the app reloads).
    n1 = page.evaluate("window.__msgs.length")
    page.evaluate(lose + " window.__lc.loseContext()")
    page.wait_for_timeout(4000)
    out["shown_lost_crashes"] = page.evaluate("n => window.__msgs.slice(n).some(m => m.type === 'crash')", n1)

    out["no_errors"] = not errors and not page.evaluate("window.__msgs.some(m=>m.type==='error')")
    out["errors"] = errors[:3]
    browser.close()

print(json.dumps(out, indent=1))
checks = ["idle_quiet", "hidden_no_crash", "shown_lost_crashes", "quality_ready_known", "quality_returns", "fit_fills", "tap_nearest", "start_steps", "arrive_far", "arrive_moves", "arrive_home", "inset_focus", "report_only", "focus_mode", "home_fits", "motion_focus", "focus_held", "motion_home", "motion_fit", "no_errors"]
sys.exit(0 if all(out.get(c) for c in checks) else 1)
