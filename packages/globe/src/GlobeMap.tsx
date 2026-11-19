import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { loadCountries } from './countries';
import { FLAGS } from './flags';
import { globePayload } from './payload';
import {
  buildGlobeHtml,
  DEFAULT_IMAGERY_URL,
  defaultTheme,
  GlobeQuality,
  GlobeTheme,
} from './globeHtml';

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** ISO alpha-2 country code; adds that country's flag to the pin's name tag. */
  countryCode?: string;
};
export type CountryTap = { iso: string; name: string; visited: boolean };
export type PerfSample = {
  fps: number;
  worstMs: number;
  slowFrames: number;
  frames: number;
  during: 'spin' | 'touch';
  quality: 'high' | 'low';
};
export type GlobeMapHandle = {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  /** Zoom to a country, outline it and show its name. */
  focusCountry: (iso: string) => void;
  /** Remove the outline and label, and zoom back out. */
  clearFocus: () => void;
  /** Pull back to the whole Earth, sized to the part that shows. */
  goHome: () => void;
  /** Frame every stop. */
  fitStops: () => void;
  /** Frame several countries at once (ISO alpha-3). */
  fitCountries: (isos: string[]) => void;
};

export type GlobeMapProps = {
  /** ISO 3166-1 alpha-3 codes, e.g. ['IND', 'FRA'] */
  visitedCountries?: string[];
  places?: Place[];
  /** Ordered points; drawn as great-circle arcs. Ignored when `stops` has any. */
  route?: { lat: number; lng: number }[];
  /** Cities that could be added: hollow, tappable dots. One that is also a stop is not drawn. */
  candidates?: Place[];
  /** Picked cities in visit order: numbered pins joined by the route; a new last stop draws its leg. */
  stops?: Place[];
  /**
   * 'focus' (default): a tapped country is outlined, named and zoomed to, then reported.
   * 'report': it is only reported, and the app decides what happens. Switched without reloading.
   */
  tapMode?: 'focus' | 'report';
  /** Whether tapping a country does anything. Default true. */
  countryTapEnabled?: boolean;
  /** Points at the bottom of the globe covered by something else; camera fits stay above it. */
  bottomInset?: number;
  /**
   * The country (ISO alpha-3) the app is showing a page for: the globe turns to it, outlines and
   * names it, and keeps it so through new data, city flights and a page reload. Clearing it
   * pulls the globe back to the whole Earth.
   */
  focus?: string | null;
  /** Camera moves jump and the route appears whole. Default false. */
  reduceMotion?: boolean;
  quality?: GlobeQuality;
  /** XYZ raster tiles. Pass '' to turn imagery off. */
  imageryUrl?: string;
  imageryMaxZoom?: number;
  imageryAttribution?: string;
  /** Set false when the screen is not focused, to stop the spin and save battery. */
  active?: boolean;
  /** Tapping a country zooms to it and shows its name on the globe. Default true. */
  focusCountryOnPress?: boolean;
  /** Emit onPerf samples while the globe moves. Leave off in production. */
  benchmark?: boolean;
  theme?: GlobeTheme;
  style?: StyleProp<ViewStyle>;
  /** Shown instead of the globe if the map cannot start on this device. */
  /** Shown in place of the globe after it has failed to start; given a way to try again. */
  fallback?: React.ReactNode | ((retry: () => void) => React.ReactNode);
  /**
   * Drawn over the globe's visible part while it starts (Plan 79). As a function it is drawn all
   * along and told whether the map is ready, so it can leave in its own time (Plan 80).
   */
  loading?: React.ReactNode | ((ready: boolean) => React.ReactNode);
  /**
   * False while the globe is out of sight (another screen over it). It then does not reload or
   * count a slow start; anything that needs a reload waits until it is in sight (Plan 89).
   */
  visible?: boolean;
  /** The globe's name for screen readers. */
  label?: string;
  onCountryPress?: (country: CountryTap) => void;
  /** A pin or a numbered stop was tapped. */
  onPlacePress?: (place: Place) => void;
  onCandidatePress?: (place: Place) => void;
  onReady?: (info: {
    ms: number;
    quality: 'high' | 'low';
    pixelRatio: number;
    /** Each step of the start: page time (`ms`) and time since the globe was made (`at`). */
    steps: GlobeStep[];
  }) => void;
  onPerf?: (sample: PerfSample) => void;
  onQualityChange?: (info: { quality: 'high' | 'low'; reason: string; fps: number | null }) => void;
  onImagery?: (info: { ok: boolean; ms?: number }) => void;
  onError?: (message: string, fatal: boolean) => void;
};

const GlobeMap = forwardRef<GlobeMapHandle, GlobeMapProps>(function GlobeMap(
  {
    visitedCountries,
    places,
    route,
    candidates,
    stops,
    countryTapEnabled = true,
    tapMode = 'focus',
    reduceMotion = false,
    bottomInset = 0,
    focus = null,
    quality = 'auto',
    imageryUrl = DEFAULT_IMAGERY_URL,
    imageryMaxZoom = 5,
    imageryAttribution = 'NASA Blue Marble',
    active = true,
    focusCountryOnPress = true,
    benchmark = false,
    theme = defaultTheme,
    style,
    fallback,
    loading,
    label,
    visible = true,
    onCountryPress,
    onPlacePress,
    onCandidatePress,
    onReady,
    onPerf,
    onQualityChange,
    onImagery,
    onError,
  },
  ref,
) {
  const webview = useRef<WebView<{}>>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Quality is read once per page build; later changes go through setQuality so the map is not rebuilt.
  const initialQuality = useRef(quality);
  const html = useMemo(
    () =>
      buildGlobeHtml(loadCountries(), {
        theme,
        quality: initialQuality.current,
        imageryUrl,
        imageryMaxZoom,
        imageryAttribution,
        benchmark,
        focusOnTap: focusCountryOnPress,
        flags: FLAGS,
      }),
    [theme, imageryUrl, imageryMaxZoom, imageryAttribution, benchmark, focusCountryOnPress],
  );

  const run = useCallback((js: string) => {
    webview.current?.injectJavaScript(js + '; true;');
  }, []);

  // A new page (different theme, reload) starts not-ready.
  useEffect(() => {
    setReady(false);
  }, [html, reloadKey]);

  // A start can fail: the drawing context is refused, or the page goes silent. The page is then
  // loaded again, up to three starts in a row, before the fallback is shown (Plan 77).
  // The page reports each step of its start; the step it last reached names a stall (Plan 79).
  const failures = useRef(0);
  const shown = useRef(visible);
  shown.current = visible;
  const reloadWhenShown = useRef(false);
  const step = useRef('start');
  const [progress, setProgress] = useState(0);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startFailed = useCallback(
    (message: string) => {
      failures.current += 1;
      onError?.(message, true);
      if (retry.current) clearTimeout(retry.current);
      if (failures.current >= START_TRIES) {
        setFailed(true);
        return;
      }
      retry.current = setTimeout(() => setReloadKey((k) => k + 1), RETRY_MS);
    },
    [onError],
  );
  useEffect(
    () => () => {
      if (retry.current) clearTimeout(retry.current);
    },
    [],
  );
  // A new page starts from the beginning, timed from when it is made (Plan 92).
  const timeline = useRef<{ start: number; steps: GlobeStep[] }>({ start: Date.now(), steps: [] });
  useEffect(() => {
    step.current = 'start';
    timeline.current = { start: Date.now(), steps: [] };
  }, [html, reloadKey]);
  // A start that goes too long without any step is counted as failed. A slow start that keeps
  // reporting steps is left to finish: starting it again would only make it later (Plan 79).
  useEffect(() => {
    if (ready || failed || !visible) return;
    const timer = setTimeout(
      () => startFailed(stallMessage(timeline.current.steps)),
      SILENCE_LIMIT_MS,
    );
    return () => clearTimeout(timer);
  }, [ready, failed, visible, html, reloadKey, progress, startFailed]);

  const retryNow = useCallback(() => {
    failures.current = 0;
    setFailed(false);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (ready) run('window.globe.setInset(' + Math.round(bottomInset) + ')');
  }, [ready, bottomInset, run]);

  // Held as state, not sent once: a fresh page (a reload after a crash) is told again.
  const focused = useRef(false);
  useEffect(() => {
    if (!ready) {
      focused.current = false;
      return;
    }
    if (focus) run('window.globe.setFocus(' + JSON.stringify(focus) + ')');
    else if (focused.current) run('window.globe.setFocus(null)');
    focused.current = !!focus;
  }, [ready, focus, run]);

  // Sent before the data, so a first route never animates when it should not.
  useEffect(() => {
    if (ready) run('window.globe.setReduceMotion(' + (reduceMotion ? 'true' : 'false') + ')');
  }, [ready, reduceMotion, run]);

  // Push data when its content changes. Comparing the serialised form means a parent that
  // re-creates arrays on every render does not cause extra work in the map.
  const payload = useMemo(
    () => globePayload({ visited: visitedCountries, places, route, candidates, stops }),
    [visitedCountries, places, route, candidates, stops],
  );
  const latestStops = useRef<Place[]>([]);
  latestStops.current = stops ?? [];
  useEffect(() => {
    if (ready) run('window.globe.setData(' + payload + ')');
  }, [ready, payload, run]);

  useEffect(() => {
    if (ready) run('window.globe.setTapMode(' + JSON.stringify(tapMode) + ')');
  }, [ready, tapMode, run]);

  useEffect(() => {
    if (ready) run('window.globe.setCountryTap(' + (countryTapEnabled ? 'true' : 'false') + ')');
  }, [ready, countryTapEnabled, run]);

  useEffect(() => {
    if (ready) run('window.globe.setSpin(' + (active && !reduceMotion ? 'true' : 'false') + ')');
  }, [ready, active, reduceMotion, run]);

  useEffect(() => {
    if (ready && quality !== initialQuality.current) {
      initialQuality.current = quality;
      run('window.globe.setQuality(' + JSON.stringify(quality) + ')');
    }
  }, [ready, quality, run]);

  // In sight or not, the page is told (Plan 89).
  useEffect(() => {
    if (ready) run('window.globe.setVisible(' + (visible ? 'true' : 'false') + ')');
  }, [ready, visible, run]);

  // Last of everything sent when the page is ready: the globe travels in from far away (Plan 80).
  useEffect(() => {
    if (ready) run('window.globe.arrive()');
  }, [ready, run]);

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (lng, lat, zoom) =>
        run('window.globe.flyTo(' + [lng, lat, zoom ?? 3.5].join(',') + ')'),
      focusCountry: (iso) => run('window.globe.focusCountry(' + JSON.stringify(iso) + ')'),
      clearFocus: () => run('window.globe.clearSelection()'),
      goHome: () => run('window.globe.goHome()'),
      fitStops: () =>
        run(
          'window.globe.fitPoints(' +
            JSON.stringify(latestStops.current.map((p) => ({ lat: p.lat, lng: p.lng }))) +
            ')',
        ),
      fitCountries: (isos) => run('window.globe.fitCountries(' + JSON.stringify(isos) + ')'),
    }),
    [run],
  );

  // The OS can kill a WebView's render process under memory pressure. Remount to recover.
  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);
  // A reload put off while the globe was out of sight happens once it is back (Plan 89).
  useEffect(() => {
    if (visible && reloadWhenShown.current) {
      reloadWhenShown.current = false;
      reload();
    }
  }, [visible, reload]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case 'progress':
          step.current = String(msg.step);
          timeline.current.steps.push({
            step: String(msg.step),
            ms: Number(msg.ms) || 0,
            at: Date.now() - timeline.current.start,
            ...(msg.w && msg.h ? { w: Number(msg.w), h: Number(msg.h) } : {}),
          });
          setProgress((n) => n + 1);
          break;
        case 'ready':
          failures.current = 0;
          setReady(true);
          onReady?.({
            ms: msg.ms,
            quality: msg.quality,
            pixelRatio: msg.pixelRatio,
            steps: [...timeline.current.steps],
          });
          break;
        case 'country':
          onCountryPress?.({ iso: msg.iso, name: msg.name, visited: msg.visited });
          break;
        case 'place':
          onPlacePress?.({ id: msg.id, name: msg.name, lat: msg.lat, lng: msg.lng });
          break;
        case 'candidate':
          onCandidatePress?.({ id: msg.id, name: msg.name, lat: msg.lat, lng: msg.lng });
          break;
        case 'perf':
          onPerf?.(msg);
          break;
        case 'quality':
          onQualityChange?.({ quality: msg.quality, reason: msg.reason, fps: msg.fps });
          break;
        case 'imagery':
          onImagery?.({ ok: msg.ok, ms: msg.ms });
          break;
        case 'crash':
          // Out of sight, the reload waits: it would only start the globe again behind the
          // screen in front, slowing that screen (Plan 89).
          if (shown.current) reload();
          else reloadWhenShown.current = true;
          break;
        case 'error':
          if (msg.fatal) startFailed(String(msg.message));
          else onError?.(msg.message, false);
          break;
      }
    },
    [
      onCountryPress,
      onPlacePress,
      onCandidatePress,
      onReady,
      onPerf,
      onQualityChange,
      onImagery,
      onError,
      reload,
      startFailed,
    ],
  );

  if (failed && fallback) {
    return (
      <View style={[styles.container, { backgroundColor: theme.space }, style]}>
        <View style={[styles.band, { bottom: bottomInset }]}>
          {typeof fallback === 'function' ? fallback(retryNow) : fallback}
        </View>
      </View>
    );
  }

  return (
    <View
      accessible={!!label}
      accessibilityLabel={label}
      style={[styles.container, { backgroundColor: theme.space }, style]}
    >
      <WebView
        key={reloadKey}
        ref={webview}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        onContentProcessDidTerminate={reload}
        onRenderProcessGone={reload}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        androidLayerType="hardware"
        nestedScrollEnabled
        style={[styles.webview, { backgroundColor: theme.space }]}
      />
      {typeof loading === 'function' ? (
        <View pointerEvents="none" style={[styles.band, { bottom: bottomInset }]}>
          {loading(ready)}
        </View>
      ) : !ready && loading ? (
        <View pointerEvents="none" style={[styles.band, { bottom: bottomInset }]}>
          {loading}
        </View>
      ) : null}
    </View>
  );
});

export default GlobeMap;

/** One step of the globe's start, as the page reports it (Plan 92). */
export interface GlobeStep {
  step: string;
  /** Since the page started running. */
  ms: number;
  /** Since the globe was made in the app: includes the browser starting and the page arriving. */
  at: number;
  /** The globe's size, on the step where the map is made. */
  w?: number;
  h?: number;
}

/** What a stalled start says: the step it stalled after, and the globe's size if known. */
function stallMessage(steps: readonly GlobeStep[]): string {
  const last = steps.at(-1);
  const limit = SILENCE_LIMIT_MS / 1000;
  if (!last) return `Map page never started within ${limit} s`;
  const size = last.w && last.h ? ` (${last.w}×${last.h})` : '';
  return `Map made no progress for ${limit} s after “${last.step}”${size}`;
}

/** Starts tried in a row before the fallback is shown. */
const START_TRIES = 3;
/** Wait before loading the page again after a failed start. */
const RETRY_MS = 1000;
/** How long a start may go without reporting any step before it counts as stuck (Plan 79). */
const SILENCE_LIMIT_MS = 5_000;

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  webview: { flex: 1 },
  // The part of the globe that shows above whatever covers its lower part.
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
