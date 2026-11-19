"""Builds the globe's page with the package's own code, for the desktop checks in this folder."""

import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PKG = os.path.join(ROOT, "packages", "globe")


def build(html_path):
    """Writes the page to `html_path` (no imagery: the checks must not need the network)."""
    dump = os.path.join(PKG, "src", "zz-page-dump.test.ts")
    with open(dump, "w") as f:
        f.write(
            "import { writeFileSync } from 'node:fs';\n"
            "import { it } from 'vitest';\n"
            "import { loadCountries } from './countries';\n"
            "import { FLAGS } from './flags';\n"
            "import { buildGlobeHtml, defaultTheme } from './globeHtml';\n"
            "it('dump', () => {\n"
            f"  writeFileSync('{html_path}', buildGlobeHtml(loadCountries(), {{ theme: defaultTheme, quality: 'auto', imageryUrl: '', imageryMaxZoom: 5, imageryAttribution: '', benchmark: false, focusOnTap: true, flags: FLAGS }}));\n"
            "});\n"
        )
    try:
        subprocess.run(["npx", "vitest", "run", "src/zz-page-dump.test.ts"], cwd=PKG, check=True, capture_output=True)
    finally:
        os.remove(dump)
