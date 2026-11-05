import {
  Keyword,
  Lexer,
  Name,
  Str,
  type Dict,
  type Value,
  nameOf,
  type PdfDocument,
  Stream,
} from './objects';

/**
 * Fonts turn the bytes in a text-showing operator into characters and widths.
 * We read the font's ToUnicode map when it has one (nearly every generated ticket
 * does), otherwise its encoding and glyph names.
 */

// Windows code page 1252 differs from Latin-1 only in 0x80–0x9F.
const WIN_ANSI_HIGH: Record<number, string> = {
  0x80: '€',
  0x82: '‚',
  0x83: 'ƒ',
  0x84: '„',
  0x85: '…',
  0x86: '†',
  0x87: '‡',
  0x88: 'ˆ',
  0x89: '‰',
  0x8a: 'Š',
  0x8b: '‹',
  0x8c: 'Œ',
  0x8e: 'Ž',
  0x91: '‘',
  0x92: '’',
  0x93: '“',
  0x94: '”',
  0x95: '•',
  0x96: '–',
  0x97: '—',
  0x98: '˜',
  0x99: '™',
  0x9a: 'š',
  0x9b: '›',
  0x9c: 'œ',
  0x9e: 'ž',
  0x9f: 'Ÿ',
};

const winAnsi = (code: number) =>
  WIN_ANSI_HIGH[code] ??
  (code >= 32 && code !== 127 && !(code >= 0x80 && code <= 0x9f) ? String.fromCharCode(code) : '');

const GLYPHS: Record<string, string> = {
  space: ' ',
  exclam: '!',
  quotedbl: '"',
  numbersign: '#',
  dollar: '$',
  percent: '%',
  ampersand: '&',
  quotesingle: "'",
  quoteright: '’',
  quoteleft: '‘',
  parenleft: '(',
  parenright: ')',
  asterisk: '*',
  plus: '+',
  comma: ',',
  hyphen: '-',
  minus: '−',
  period: '.',
  slash: '/',
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  colon: ':',
  semicolon: ';',
  less: '<',
  equal: '=',
  greater: '>',
  question: '?',
  at: '@',
  bracketleft: '[',
  backslash: '\\',
  bracketright: ']',
  asciicircum: '^',
  underscore: '_',
  grave: '`',
  braceleft: '{',
  bar: '|',
  braceright: '}',
  asciitilde: '~',
  quotedblleft: '“',
  quotedblright: '”',
  endash: '–',
  emdash: '—',
  bullet: '•',
  ellipsis: '…',
  Euro: '€',
  sterling: '£',
  yen: '¥',
  rupee: '₹',
  rupeeindian: '₹',
  arrowright: '→',
  degree: '°',
  multiply: '×',
  copyright: '©',
  registered: '®',
  trademark: '™',
  nbspace: ' ',
  nonbreakingspace: ' ',
  middot: '·',
  periodcentered: '·',
  fi: 'fi',
  fl: 'fl',
  ff: 'ff',
  ffi: 'ffi',
  ffl: 'ffl',
};

/** A glyph name ("A", "uni20B9", "rupee") → its text. */
export function glyphText(name: string): string {
  const base = name.split('.')[0]!.split('_')[0]!;
  if (/^[A-Za-z]$/.test(base)) return base;
  if (GLYPHS[base]) return GLYPHS[base]!;
  const uni = /^uni([0-9A-Fa-f]{4,})$/.exec(base) ?? /^u([0-9A-Fa-f]{4,6})$/.exec(base);
  if (uni) {
    const hex = uni[1]!;
    let s = '';
    for (let i = 0; i + 4 <= hex.length; i += 4)
      s += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
    return s;
  }
  return '';
}

const utf16be = (bytes: string) => {
  let s = '';
  for (let i = 0; i + 1 < bytes.length; i += 2)
    s += String.fromCharCode((bytes.charCodeAt(i) << 8) | bytes.charCodeAt(i + 1));
  if (bytes.length % 2) s += String.fromCharCode(bytes.charCodeAt(bytes.length - 1));
  return s;
};

const codeOf = (bytes: string) => {
  let v = 0;
  for (let i = 0; i < bytes.length; i++) v = v * 256 + bytes.charCodeAt(i);
  return v;
};

export interface CMap {
  map: Map<number, string>;
  /** Code byte lengths from the codespace ranges, e.g. [{len:2, lo:0, hi:0xffff}]. */
  ranges: { len: number; lo: number; hi: number }[];
}

/** Parses a ToUnicode CMap (a PostScript-like stream). */
export function parseCMap(data: Uint8Array): CMap {
  const lex = new Lexer(data);
  const map = new Map<number, string>();
  const ranges: CMap['ranges'] = [];
  const operands: (Str | Value[])[] = [];
  let mode = '';
  for (let tok = lex.next(); tok !== null; tok = lex.next()) {
    if (tok instanceof Keyword) {
      const w = tok.word;
      if (w === 'begincodespacerange' || w === 'beginbfchar' || w === 'beginbfrange') {
        mode = w;
        operands.length = 0;
      } else if (w.startsWith('end')) mode = '';
      continue;
    }
    if (!mode) continue;
    if (tok === '[') {
      const arr: Value[] = [];
      for (let t = lex.next(); t !== null && t !== ']'; t = lex.next())
        if (t instanceof Str) arr.push(t);
      operands.push(arr);
    } else if (tok instanceof Str) operands.push(tok);
    else if (tok instanceof Name) operands.push(new Str(''));
    else continue;

    if (mode === 'begincodespacerange' && operands.length === 2) {
      const [lo, hi] = operands as [Str, Str];
      ranges.push({ len: lo.bytes.length, lo: codeOf(lo.bytes), hi: codeOf(hi.bytes) });
      operands.length = 0;
    } else if (mode === 'beginbfchar' && operands.length === 2) {
      const [src, dst] = operands as [Str, Str];
      if (dst instanceof Str) map.set(codeOf(src.bytes), utf16be(dst.bytes));
      operands.length = 0;
    } else if (mode === 'beginbfrange' && operands.length === 3) {
      const [lo, hi, dst] = operands as [Str, Str, Str | Value[]];
      const a = codeOf(lo.bytes);
      const b = Math.min(codeOf(hi.bytes), a + 65535);
      if (Array.isArray(dst)) {
        dst.forEach((d, i) => d instanceof Str && a + i <= b && map.set(a + i, utf16be(d.bytes)));
      } else {
        const base = utf16be(dst.bytes);
        const head = base.slice(0, -1);
        const last = base.charCodeAt(base.length - 1);
        for (let c = a; c <= b; c++) map.set(c, head + String.fromCharCode(last + (c - a)));
      }
      operands.length = 0;
    }
  }
  return { map, ranges };
}

export interface Glyph {
  code: number;
  text: string;
  /** Width in thousandths of the font size. */
  width: number;
  /** True for the single-byte space, where word spacing applies. */
  space: boolean;
}

export class Font {
  private toUnicode: CMap | null = null;
  private encoding: string[] | null = null;
  private widths = new Map<number, number>();
  private defaultWidth = 500;
  private composite = false;

  constructor(doc: PdfDocument, dict: Dict | null) {
    if (!dict) return;
    this.composite = nameOf(doc.resolve(dict.get('Subtype'))) === 'Type0';
    const tu = doc.resolve(dict.get('ToUnicode'));
    if (tu instanceof Stream) {
      const data = doc.decode(tu);
      if (data) this.toUnicode = parseCMap(data);
    }
    if (this.composite) {
      const desc = doc.dict(doc.array(dict.get('DescendantFonts'))[0]);
      if (desc) {
        this.defaultWidth = doc.number(desc.get('DW'), 1000);
        const w = doc.array(desc.get('W'));
        for (let i = 0; i < w.length;) {
          const first = doc.number(w[i]);
          const next = doc.resolve(w[i + 1]);
          if (Array.isArray(next)) {
            next.forEach((x, k) => this.widths.set(first + k, doc.number(x)));
            i += 2;
          } else {
            const last = doc.number(next);
            const width = doc.number(w[i + 2]);
            for (let c = first; c <= last && c - first < 65536; c++) this.widths.set(c, width);
            i += 3;
          }
        }
      }
    } else {
      const firstChar = doc.number(dict.get('FirstChar'));
      doc
        .array(dict.get('Widths'))
        .forEach((x, i) => this.widths.set(firstChar + i, doc.number(x)));
      const desc = doc.dict(dict.get('FontDescriptor'));
      if (desc?.has('MissingWidth')) this.defaultWidth = doc.number(desc.get('MissingWidth'));
      this.encoding = simpleEncoding(doc, doc.resolve(dict.get('Encoding')));
    }
  }

  /** Splits shown bytes into glyphs. */
  glyphs(bytes: string): Glyph[] {
    const out: Glyph[] = [];
    let i = 0;
    while (i < bytes.length) {
      const len = this.codeLength(bytes, i);
      const code = codeOf(bytes.slice(i, i + len));
      i += len;
      let text = this.toUnicode?.map.get(code);
      if (text === undefined) text = this.composite ? '' : (this.encoding?.[code] ?? winAnsi(code));
      // Control characters and private-use glyphs carry no readable text.
      text = text.replace(/[\u0000-\u0008\u000e-\u001f-]/g, '');
      out.push({
        code,
        text,
        width: this.widths.get(code) ?? this.defaultWidth,
        space: len === 1 && code === 32,
      });
    }
    return out;
  }

  private codeLength(bytes: string, at: number): number {
    const ranges = this.toUnicode?.ranges ?? [];
    if (ranges.length) {
      for (let len = 1; len <= 4; len++) {
        if (at + len > bytes.length) break;
        const code = codeOf(bytes.slice(at, at + len));
        if (ranges.some((r) => r.len === len && code >= r.lo && code <= r.hi)) return len;
      }
    }
    return this.composite ? Math.min(2, bytes.length - at) : 1;
  }
}

function simpleEncoding(doc: PdfDocument, enc: Value): string[] | null {
  const table = Array.from({ length: 256 }, (_, c) => winAnsi(c));
  if (enc instanceof Name || enc === null) return enc ? table : null;
  if (!(enc instanceof Map)) return null;
  let code = 0;
  for (const d of doc.array(enc.get('Differences'))) {
    const v = doc.resolve(d);
    if (typeof v === 'number') code = v;
    else if (v instanceof Name) {
      if (code < 256) table[code] = glyphText(v.name);
      code++;
    }
  }
  return table;
}
