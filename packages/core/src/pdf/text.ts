import { Font } from './fonts';
import {
  Keyword,
  Lexer,
  Name,
  PdfDocument,
  Str,
  Stream,
  nameOf,
  readValue,
  type Dict,
  type Value,
} from './objects';

/**
 * Text from a PDF (Plan 31), page by page, in reading order: pieces of text are
 * placed where the page draws them, grouped into lines from top to bottom and
 * sorted left to right, with wide gaps kept as three spaces so columns stay apart
 * ("PNR   X7K2QP"). Returns [] for encrypted files and for scans (no text inside).
 */
export function extractPdfText(bytes: Uint8Array): string[] {
  return extractPdfLayout(bytes).map((page) => page.map((l) => l.text).join('\n'));
}

/** A piece of text on a line, with where it starts and ends across the page (points). */
export interface PdfCell {
  x: number;
  end: number;
  text: string;
}

/** One line of a page: its cells left to right, split where a wide gap separates columns. */
export interface PdfLine {
  y: number;
  size: number;
  cells: PdfCell[];
  /** The cells joined with three spaces, as extractPdfText returns it. */
  text: string;
}

/**
 * The text of each page as lines of positioned cells (Plan 38), so tables can be
 * read by column: a value sits under its header when their positions overlap.
 * Returns [] for encrypted files and for scans.
 */
export function extractPdfLayout(bytes: Uint8Array): PdfLine[][] {
  if (!isPdf(bytes)) return [];
  let doc: PdfDocument;
  try {
    doc = new PdfDocument(bytes);
  } catch {
    return [];
  }
  if (doc.encrypted) return [];
  const pages = findPages(doc).map((p) => {
    try {
      return pageLines(doc, p);
    } catch {
      return [];
    }
  });
  return pages.some((p) => p.length) ? pages : [];
}

/** True when the bytes start like a PDF (allowing junk before the header). */
export function isPdf(bytes: Uint8Array): boolean {
  const head = String.fromCharCode(...bytes.subarray(0, 1024));
  return head.includes('%PDF-');
}

interface Page {
  dict: Dict;
  resources: Dict | null;
}

function findPages(doc: PdfDocument): Page[] {
  const out: Page[] = [];
  const seen = new Set<Dict>();
  const walk = (node: Dict | null, inherited: Dict | null, depth: number) => {
    if (!node || seen.has(node) || depth > 32) return;
    seen.add(node);
    const resources = doc.dict(node.get('Resources')) ?? inherited;
    const type = nameOf(doc.resolve(node.get('Type')));
    if (type === 'Pages' || node.has('Kids')) {
      for (const kid of doc.array(node.get('Kids'))) walk(doc.dict(kid), resources, depth + 1);
    } else out.push({ dict: node, resources });
  };
  let catalog: Dict | null = null;
  for (const num of doc.numbers()) {
    const d = doc.dict(doc.get(num));
    if (d && nameOf(doc.resolve(d.get('Type'))) === 'Catalog') catalog = d;
  }
  if (catalog) walk(doc.dict(catalog.get('Pages')), null, 0);
  if (out.length) return out;
  // No usable page tree: take page objects in file order.
  for (const num of doc.numbers()) {
    const d = doc.dict(doc.get(num));
    if (d && nameOf(doc.resolve(d.get('Type'))) === 'Page')
      out.push({ dict: d, resources: doc.dict(d.get('Resources')) });
  }
  return out;
}

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];
const apply = (m: Matrix, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

interface Piece {
  x: number;
  y: number;
  end: number;
  size: number;
  text: string;
}

interface State {
  ctm: Matrix;
  font: Font | null;
  size: number;
  charSpace: number;
  wordSpace: number;
  scale: number;
  leading: number;
  rise: number;
}

function pageLines(doc: PdfDocument, page: Page): PdfLine[] {
  const contents = doc.resolve(page.dict.get('Contents'));
  const streams = (
    Array.isArray(contents) ? contents.map((c) => doc.resolve(c)) : [contents]
  ).filter((s): s is Stream => s instanceof Stream);
  const parts = streams.map((s) => doc.decode(s)).filter((d): d is Uint8Array => !!d);
  const joined = new Uint8Array(parts.reduce((n, p) => n + p.length + 1, 0));
  let at = 0;
  for (const p of parts) {
    joined.set(p, at);
    joined[at + p.length] = 10;
    at += p.length + 1;
  }
  const pieces: Piece[] = [];
  const fonts = new Map<Dict, Font>();
  run(doc, joined, page.resources, IDENTITY, pieces, fonts, 0);
  return layout(pieces);
}

function run(
  doc: PdfDocument,
  data: Uint8Array,
  resources: Dict | null,
  base: Matrix,
  pieces: Piece[],
  fonts: Map<Dict, Font>,
  depth: number,
) {
  const lex = new Lexer(data);
  const stack: State[] = [];
  let s: State = {
    ctm: base,
    font: null,
    size: 0,
    charSpace: 0,
    wordSpace: 0,
    scale: 1,
    leading: 0,
    rise: 0,
  };
  let tm: Matrix = IDENTITY;
  let tlm: Matrix = IDENTITY;
  let ops: Value[] = [];

  const fontFor = (name: string): Font | null => {
    const dict = doc.dict(doc.dict(resources?.get('Font'))?.get(name));
    if (!dict) return null;
    let f = fonts.get(dict);
    if (!f) {
      f = new Font(doc, dict);
      fonts.set(dict, f);
    }
    return f;
  };

  const nextLine = (tx: number, ty: number) => {
    tlm = mul([1, 0, 0, 1, tx, ty], tlm);
    tm = tlm;
  };

  const show = (items: Value[]) => {
    if (!s.font) return;
    const m = mul(tm, s.ctm);
    const size = Math.abs(s.size * Math.hypot(m[2], m[3]) || s.size);
    let text = '';
    let from = 0; // where the current piece starts, in text space units
    let advance = 0;
    const flush = () => {
      const [x, y] = apply(m, from, s.rise);
      const [endX] = apply(m, advance, s.rise);
      // NFKC turns ligatures and compatibility forms into plain letters ("ﬁ" → "fi").
      if (text.trim()) pieces.push({ x, y, end: endX, size, text: text.normalize('NFKC') });
      text = '';
    };
    for (const it of items) {
      if (typeof it === 'number') {
        // A very large gap inside one run is a column break: start a new piece there.
        if (it < -1500) {
          flush();
          advance += (-it / 1000) * s.size * s.scale;
          from = advance;
          continue;
        }
        if (it < -250 && text && !text.endsWith(' ')) text += ' ';
        advance += (-it / 1000) * s.size * s.scale;
        continue;
      }
      if (!(it instanceof Str)) continue;
      for (const g of s.font.glyphs(it.bytes)) {
        text += g.text;
        advance += (g.width * s.size + s.charSpace + (g.space ? s.wordSpace : 0)) * s.scale;
      }
    }
    flush();
    tm = mul([1, 0, 0, 1, advance, 0], tm);
  };

  for (;;) {
    const v = readValue(lex, false);
    if (v === undefined) break;
    if (!(v instanceof Keyword)) {
      ops.push(v);
      continue;
    }
    const n = (i: number) => (typeof ops[i] === 'number' ? (ops[i] as number) : 0);
    switch (v.word) {
      case 'q':
        stack.push({ ...s });
        break;
      case 'Q':
        if (stack.length) s = stack.pop()!;
        break;
      case 'cm':
        s.ctm = mul([n(0), n(1), n(2), n(3), n(4), n(5)], s.ctm);
        break;
      case 'BT':
        tm = IDENTITY;
        tlm = IDENTITY;
        break;
      case 'Tf':
        s.font = ops[0] instanceof Name ? fontFor(ops[0].name) : null;
        s.size = n(1);
        break;
      case 'Tc':
        s.charSpace = n(0);
        break;
      case 'Tw':
        s.wordSpace = n(0);
        break;
      case 'Tz':
        s.scale = n(0) / 100;
        break;
      case 'TL':
        s.leading = n(0);
        break;
      case 'Ts':
        s.rise = n(0);
        break;
      case 'Td':
        nextLine(n(0), n(1));
        break;
      case 'TD':
        s.leading = -n(1);
        nextLine(n(0), n(1));
        break;
      case 'Tm':
        tlm = [n(0), n(1), n(2), n(3), n(4), n(5)];
        tm = tlm;
        break;
      case 'T*':
        nextLine(0, -s.leading);
        break;
      case 'Tj':
        show([ops[0] ?? null]);
        break;
      case "'":
        nextLine(0, -s.leading);
        show([ops[0] ?? null]);
        break;
      case '"':
        s.wordSpace = n(0);
        s.charSpace = n(1);
        nextLine(0, -s.leading);
        show([ops[2] ?? null]);
        break;
      case 'TJ':
        show(Array.isArray(ops[0]) ? ops[0] : []);
        break;
      case 'Do': {
        if (depth >= 6 || !(ops[0] instanceof Name)) break;
        const xo = doc.resolve(doc.dict(resources?.get('XObject'))?.get(ops[0].name));
        if (!(xo instanceof Stream) || nameOf(doc.resolve(xo.dict.get('Subtype'))) !== 'Form')
          break;
        const body = doc.decode(xo);
        if (!body) break;
        const mat = doc.array(xo.dict.get('Matrix')).map((x) => doc.number(x));
        const fm = (mat.length === 6 ? mat : IDENTITY) as Matrix;
        run(
          doc,
          body,
          doc.dict(xo.dict.get('Resources')) ?? resources,
          mul(fm, s.ctm),
          pieces,
          fonts,
          depth + 1,
        );
        break;
      }
      case 'BI':
        skipInlineImage(lex);
        break;
    }
    ops = [];
  }
}

function skipInlineImage(lex: Lexer) {
  const b = lex.bytes;
  // Skip the image's parameters up to "ID", then its data up to " EI".
  for (let t = lex.next(); t !== null; t = lex.next())
    if (t instanceof Keyword && t.word === 'ID') break;
  for (let i = lex.pos + 1; i < b.length - 2; i++) {
    if (
      b[i] === 69 &&
      b[i + 1] === 73 &&
      /\s/.test(String.fromCharCode(b[i - 1]!)) &&
      (i + 2 >= b.length || /\s/.test(String.fromCharCode(b[i + 2]!)))
    ) {
      lex.pos = i + 2;
      return;
    }
  }
  lex.pos = b.length;
}

/** Pieces → lines of cells, top to bottom, left to right. */
function layout(pieces: Piece[]): PdfLine[] {
  const sorted = pieces.filter((p) => p.text.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Piece[][] = [];
  for (const p of sorted) {
    const line = lines[lines.length - 1];
    const tol = Math.max(1, Math.min(p.size, line?.[0]?.size ?? p.size) * 0.5);
    if (line && Math.abs(line[0]!.y - p.y) <= tol) line.push(p);
    else lines.push([p]);
  }
  return lines.map((line) => {
    line.sort((a, b) => a.x - b.x);
    const cells: PdfCell[] = [];
    let cell: PdfCell | null = null;
    for (const p of line) {
      const gap = cell ? p.x - cell.end : Infinity;
      if (!cell || gap > p.size * 0.9) {
        // A wide gap starts a new column.
        cell = { x: p.x, end: p.end, text: p.text };
        cells.push(cell);
        continue;
      }
      if (gap > p.size * 0.15 && !cell.text.endsWith(' ') && !p.text.startsWith(' '))
        cell.text += ' ';
      cell.text += p.text;
      cell.end = Math.max(cell.end, p.end);
    }
    const clean = cells
      .map((c) => ({ ...c, text: c.text.replace(/\s+/g, ' ').trim() }))
      .filter((c) => c.text);
    return {
      y: line[0]!.y,
      size: Math.min(...line.map((p) => p.size)),
      cells: clean,
      text: clean.map((c) => c.text).join('   '),
    };
  });
}
