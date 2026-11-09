import fs from 'node:fs';
import path from 'node:path';

/**
 * Plan 49 T1: which of the app's dependencies ship native (phone-side) code.
 * A package is native when it has an Expo module config, an Android Gradle
 * build or an iOS podspec. Autolinking only links direct dependencies, so those
 * are the ones that must already be in the installed app.
 */
export function isNativeDir(dir) {
  const has = (f) => fs.existsSync(path.join(dir, f));
  if (has('expo-module.config.json')) return true;
  if (has('android/build.gradle') || has('android/build.gradle.kts')) return true;
  return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith('.podspec'));
}

/** The folder a dependency is installed in, looked up from the app's folder. */
export function packageDir(appDir, name) {
  let at = appDir;
  for (;;) {
    const dir = path.join(at, 'node_modules', name);
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const up = path.dirname(at);
    if (up === at) return null;
    at = up;
  }
}

/** Native dependencies missing from the allow-list, and listed ones no longer used. */
export function checkNative(appDir, allowed) {
  const pkg = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
  const deps = Object.keys(pkg.dependencies ?? {});
  const native = deps.filter((d) => {
    const dir = packageDir(appDir, d);
    return dir ? isNativeDir(dir) : false;
  });
  return {
    native,
    unlisted: native.filter((d) => !(d in allowed)),
    unused: Object.keys(allowed).filter((d) => !deps.includes(d)),
  };
}
