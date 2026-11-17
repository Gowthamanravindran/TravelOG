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
};

export type GlobeMapProps = {
  /** ISO 3166-1 alpha-3 codes, e.g. ['IND', 'FRA'] */
  visitedCountries?: string[];
  places?: Place[];
  /** Ordered stops; drawn as great-circle arcs. */
  route?: { lat: number; lng: number }[];
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
  fallback?: React.ReactNode;
  onCountryPress?: (country: CountryTap) => void;
  onPlacePress?: (place: Place) => void;
  onReady?: (info: { ms: number; quality: 'high' | 'low'; pixelRatio: number }) => void;
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
    onCountryPress,
    onPlacePress,
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

  // Push data when its content changes. Comparing the serialised form means a parent that
  // re-creates arrays on every render does not cause extra work in the map.
  const payload = useMemo(
    () =>
      JSON.stringify({ visited: visitedCountries ?? [], places: places ?? [], route: route ?? [] }),
    [visitedCountries, places, route],
  );
  useEffect(() => {
    if (ready) run('window.globe.setData(' + payload + ')');
  }, [ready, payload, run]);

  useEffect(() => {
    if (ready) run('window.globe.setSpin(' + (active ? 'true' : 'false') + ')');
  }, [ready, active, run]);

  useEffect(() => {
    if (ready && quality !== initialQuality.current) {
      initialQuality.current = quality;
      run('window.globe.setQuality(' + JSON.stringify(quality) + ')');
    }
  }, [ready, quality, run]);

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (lng, lat, zoom) =>
        run('window.globe.flyTo(' + [lng, lat, zoom ?? 3.5].join(',') + ')'),
      focusCountry: (iso) => run('window.globe.focusCountry(' + JSON.stringify(iso) + ')'),
      clearFocus: () => run('window.globe.clearSelection()'),
    }),
    [run],
  );

  // The OS can kill a WebView's render process under memory pressure. Remount to recover.
  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case 'ready':
          setReady(true);
          onReady?.({ ms: msg.ms, quality: msg.quality, pixelRatio: msg.pixelRatio });
          break;
        case 'country':
          onCountryPress?.({ iso: msg.iso, name: msg.name, visited: msg.visited });
          break;
        case 'place':
          onPlacePress?.({ id: msg.id, name: msg.name, lat: msg.lat, lng: msg.lng });
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
          reload();
          break;
        case 'error':
          if (msg.fatal) setFailed(true);
          onError?.(msg.message, !!msg.fatal);
          break;
      }
    },
    [onCountryPress, onPlacePress, onReady, onPerf, onQualityChange, onImagery, onError, reload],
  );

  if (failed && fallback) {
    return (
      <View style={[styles.container, { backgroundColor: theme.space }, style]}>{fallback}</View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.space }, style]}>
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
    </View>
  );
});

export default GlobeMap;

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  webview: { flex: 1 },
});
