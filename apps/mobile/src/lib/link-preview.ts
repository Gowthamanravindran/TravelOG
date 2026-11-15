import type { SavedSource } from '@travelog/db';

/**
 * Plan 59: what a pasted link is, read on the phone. YouTube and TikTok have public oEmbed
 * endpoints (title, creator, thumbnail); other sites give their page title and `og:` tags.
 * Instagram shares nothing without Meta's API, so the caption has to be pasted.
 */

export interface LinkPreview {
  url: string;
  source: SavedSource;
  title: string | null;
  author: string | null;
  thumbUrl: string | null;
  /** Text to look for places in: the title and description we could read. */
  text: string;
  /** False when the site doesn't let apps read the post (Instagram). */
  readable: boolean;
}

/** The first http(s) link in pasted text, or null. */
export function firstLink(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!m) return null;
  return m[0].replace(/[).,!?]+$/, '');
}

export function linkSource(url: string): SavedSource {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\.|^m\./, '');
  } catch {
    return 'web';
  }
  if (/(^|\.)instagram\.com$|^instagr\.am$/.test(host)) return 'instagram';
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) return 'youtube';
  if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok';
  return 'web';
}

const OEMBED: Partial<Record<SavedSource, (url: string) => string>> = {
  youtube: (u) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`,
  tiktok: (u) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
};

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

/** `og:` and `<title>` from a page's HTML. */
export function readMeta(html: string): {
  title: string | null;
  description: string | null;
  image: string | null;
} {
  const head = html.slice(0, 200_000);
  const meta = (name: string) => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`,
      'i',
    );
    const m = head.match(re);
    const v = m?.[1] ?? m?.[2];
    return v ? decode(v).trim() || null : null;
  };
  const title = meta('og:title') ?? head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null;
  return {
    title: title ? decode(title).trim() || null : null,
    description: meta('og:description') ?? meta('description'),
    image: meta('og:image'),
  };
}

/** Reads what it can about a link; never throws (offline gives a bare preview). */
export async function fetchPreview(url: string, signal?: AbortSignal): Promise<LinkPreview> {
  const source = linkSource(url);
  const bare: LinkPreview = {
    url,
    source,
    title: null,
    author: null,
    thumbUrl: null,
    text: '',
    readable: source !== 'instagram',
  };
  if (source === 'instagram') return bare;
  try {
    const oembed = OEMBED[source];
    if (oembed) {
      const res = await fetch(oembed(url), { signal });
      if (!res.ok) return bare;
      const body = (await res.json()) as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };
      return {
        ...bare,
        title: body.title?.trim() || null,
        author: body.author_name?.trim() || null,
        thumbUrl: body.thumbnail_url ?? null,
        text: body.title ?? '',
      };
    }
    const res = await fetch(url, { signal, headers: { Accept: 'text/html' } });
    if (!res.ok) return bare;
    const m = readMeta(await res.text());
    return {
      ...bare,
      title: m.title,
      thumbUrl: m.image,
      text: [m.title, m.description].filter(Boolean).join('\n'),
    };
  } catch {
    return bare;
  }
}
