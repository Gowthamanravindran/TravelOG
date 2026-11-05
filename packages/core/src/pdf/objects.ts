import { unzlibSync, inflateSync } from 'fflate';

/**
 * The PDF file format's building blocks (Plan 31): a tokenizer for objects and
 * page content, and a document that finds every object by scanning the file, so a
 * damaged cross-reference table doesn't matter. Strings are kept as "byte strings"
 * (one char per byte); fonts turn them into text later.
 */

export class Name {
  constructor(readonly name: string) {}
}
export class Ref {
  constructor(
    readonly num: number,
    readonly gen: number,
  ) {}
}
/** A PDF string: each char code is one byte. */
export class Str {
  constructor(readonly bytes: string) {}
}
/** A bare keyword: an operator in page content, or obj / R / stream in the file. */
export class Keyword {
  constructor(readonly word: string) {}
}
export class Stream {
  constructor(
    readonly dict: Dict,
    readonly data: Uint8Array,
  ) {}
}
export type Dict = Map<string, Value>;
export type Value = number | boolean | null | Name | Ref | Str | Stream | Dict | Value[];

const isWhite = (c: number) => c === 32 || c === 10 || c === 13 || c === 9 || c === 12 || c === 0;
const isDelim = (c: number) =>
  c === 40 ||
  c === 41 ||
  c === 60 ||
  c === 62 ||
  c === 91 ||
  c === 93 ||
  c === 123 ||
  c === 125 ||
  c === 47 ||
  c === 37;
const hexVal = (c: number) =>
  c >= 48 && c <= 57 ? c - 48 : c >= 65 && c <= 70 ? c - 55 : c >= 97 && c <= 102 ? c - 87 : -1;

/** Punctuation tokens: [ ] << >> { } */
export type Punct = '[' | ']' | '<<' | '>>' | '{' | '}';
export type Token = number | Name | Str | Keyword | Punct;

export class Lexer {
  pos: number;
  constructor(
    readonly bytes: Uint8Array,
    start = 0,
    readonly end = bytes.length,
  ) {
    this.pos = start;
  }

  private skipSpace() {
    const b = this.bytes;
    while (this.pos < this.end) {
      const c = b[this.pos]!;
      if (isWhite(c)) this.pos++;
      else if (c === 37) {
        // % comment to end of line
        while (this.pos < this.end && b[this.pos] !== 10 && b[this.pos] !== 13) this.pos++;
      } else break;
    }
  }

  /** The next token, or null at the end. */
  next(): Token | null {
    this.skipSpace();
    const b = this.bytes;
    if (this.pos >= this.end) return null;
    const c = b[this.pos]!;
    if (c === 91) return (this.pos++, '[');
    if (c === 93) return (this.pos++, ']');
    if (c === 123) return (this.pos++, '{');
    if (c === 125) return (this.pos++, '}');
    if (c === 60) {
      if (b[this.pos + 1] === 60) return ((this.pos += 2), '<<');
      return this.hexString();
    }
    if (c === 62) {
      this.pos += b[this.pos + 1] === 62 ? 2 : 1;
      return '>>';
    }
    if (c === 40) return this.literalString();
    if (c === 47) return this.name();
    if (c === 41) {
      this.pos++;
      return this.next();
    }
    const start = this.pos;
    while (this.pos < this.end && !isWhite(b[this.pos]!) && !isDelim(b[this.pos]!)) this.pos++;
    let word = '';
    for (let i = start; i < this.pos; i++) word += String.fromCharCode(b[i]!);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) return Number(word);
    if (/^[+-]?\d*\.?\d*$/.test(word) && word !== '') return 0; // "-" or "." alone
    return new Keyword(word);
  }

  private name(): Name {
    const b = this.bytes;
    this.pos++;
    let s = '';
    while (this.pos < this.end && !isWhite(b[this.pos]!) && !isDelim(b[this.pos]!)) {
      const c = b[this.pos]!;
      if (c === 35 && hexVal(b[this.pos + 1] ?? 0) >= 0 && hexVal(b[this.pos + 2] ?? 0) >= 0) {
        s += String.fromCharCode(hexVal(b[this.pos + 1]!) * 16 + hexVal(b[this.pos + 2]!));
        this.pos += 3;
      } else {
        s += String.fromCharCode(c);
        this.pos++;
      }
    }
    return new Name(s);
  }

  private hexString(): Str {
    const b = this.bytes;
    this.pos++;
    let s = '';
    let hi = -1;
    while (this.pos < this.end && b[this.pos] !== 62) {
      const v = hexVal(b[this.pos++]!);
      if (v < 0) continue;
      if (hi < 0) hi = v;
      else {
        s += String.fromCharCode(hi * 16 + v);
        hi = -1;
      }
    }
    if (hi >= 0) s += String.fromCharCode(hi * 16);
    this.pos++;
    return new Str(s);
  }

  private literalString(): Str {
    const b = this.bytes;
    this.pos++;
    let depth = 1;
    let s = '';
    while (this.pos < this.end) {
      const c = b[this.pos++]!;
      if (c === 92) {
        const n = b[this.pos++];
        if (n === undefined) break;
        if (n === 110) s += '\n';
        else if (n === 114) s += '\r';
        else if (n === 116) s += '\t';
        else if (n === 98) s += '\b';
        else if (n === 102) s += '\f';
        else if (n === 13) {
          if (b[this.pos] === 10) this.pos++;
        } else if (n === 10) {
          // line continuation
        } else if (n >= 48 && n <= 55) {
          let v = n - 48;
          for (let k = 0; k < 2 && b[this.pos]! >= 48 && b[this.pos]! <= 55; k++)
            v = v * 8 + (b[this.pos++]! - 48);
          s += String.fromCharCode(v & 255);
        } else s += String.fromCharCode(n);
      } else if (c === 40) {
        depth++;
        s += '(';
      } else if (c === 41) {
        if (--depth === 0) break;
        s += ')';
      } else s += String.fromCharCode(c);
    }
    return new Str(s);
  }
}

/**
 * Reads one value from the lexer. In file mode (`refs`), "12 0 R" becomes a Ref.
 * Returns undefined at the end, or a Keyword the caller handles.
 */
export function readValue(
  lex: Lexer,
  refs: boolean,
  first?: Token | null,
): Value | Keyword | undefined {
  const tok = first === undefined ? lex.next() : first;
  if (tok === null) return undefined;
  if (tok === '[') {
    const arr: Value[] = [];
    for (;;) {
      const t = lex.next();
      if (t === null || t === ']') break;
      const v = readValue(lex, refs, t);
      if (v === undefined) break;
      if (v instanceof Keyword) {
        if (v.word === 'true' || v.word === 'false') arr.push(v.word === 'true');
        else if (v.word === 'null') arr.push(null);
        continue;
      }
      arr.push(v);
    }
    return arr;
  }
  if (tok === '<<') {
    const dict: Dict = new Map();
    for (;;) {
      const k = lex.next();
      if (k === null || k === '>>') break;
      if (!(k instanceof Name)) continue;
      const v = readValue(lex, refs);
      if (v === undefined) break;
      if (v instanceof Keyword) {
        dict.set(k.name, v.word === 'true' ? true : v.word === 'false' ? false : null);
        continue;
      }
      dict.set(k.name, v);
    }
    return dict;
  }
  if (tok === ']' || tok === '>>' || tok === '{' || tok === '}') return new Keyword(tok);
  if (typeof tok === 'number' && refs && Number.isInteger(tok) && tok >= 0) {
    const save = lex.pos;
    const t2 = lex.next();
    if (typeof t2 === 'number' && Number.isInteger(t2)) {
      const t3 = lex.next();
      if (t3 instanceof Keyword && t3.word === 'R') return new Ref(tok, t2);
    }
    lex.pos = save;
    return tok;
  }
  if (tok instanceof Keyword) {
    if (tok.word === 'true') return true;
    if (tok.word === 'false') return false;
    if (tok.word === 'null') return null;
  }
  return tok;
}

const latin1 = (bytes: Uint8Array, start = 0, end = bytes.length) => {
  let s = '';
  for (let i = start; i < end; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, Math.min(end, i + 8192)));
  return s;
};

export const bytesToLatin1 = latin1;

function indexOf(bytes: Uint8Array, word: string, from: number): number {
  const first = word.charCodeAt(0);
  outer: for (let i = from; i <= bytes.length - word.length; i++) {
    if (bytes[i] !== first) continue;
    for (let k = 1; k < word.length; k++) if (bytes[i + k] !== word.charCodeAt(k)) continue outer;
    return i;
  }
  return -1;
}

function ascii85(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let group: number[] = [];
  const flush = (n: number) => {
    while (group.length < 5) group.push(84);
    let v = 0;
    for (const g of group) v = v * 85 + g;
    const bytes = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
    out.push(...bytes.slice(0, n));
    group = [];
  };
  for (let i = 0; i < data.length; i++) {
    const c = data[i]!;
    if (c === 126) break; // ~>
    if (isWhite(c)) continue;
    if (c === 122 && group.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    if (c < 33 || c > 117) continue;
    group.push(c - 33);
    if (group.length === 5) flush(4);
  }
  if (group.length) flush(group.length - 1);
  return Uint8Array.from(out);
}

function asciiHex(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let hi = -1;
  for (const c of data) {
    if (c === 62) break;
    const v = hexVal(c);
    if (v < 0) continue;
    if (hi < 0) hi = v;
    else {
      out.push(hi * 16 + v);
      hi = -1;
    }
  }
  if (hi >= 0) out.push(hi * 16);
  return Uint8Array.from(out);
}

function flate(data: Uint8Array): Uint8Array {
  try {
    return unzlibSync(data);
  } catch {
    // Some writers get the zlib header or checksum wrong; try the raw data.
    return inflateSync(data.subarray(2));
  }
}

export class PdfDocument {
  private objects = new Map<number, Value>();
  private offsets = new Map<number, number>();
  readonly encrypted: boolean;

  constructor(readonly bytes: Uint8Array) {
    const text = latin1(bytes);
    this.encrypted = /\/Encrypt\s*(\d+\s+\d+\s+R|<<)/.test(text);
    const re = /(\d+)[ \t\r\n\f\0]+(\d+)[ \t\r\n\f\0]+obj\b/g;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      if (m.index > 0 && /\d/.test(text[m.index - 1]!)) continue;
      this.offsets.set(Number(m[1]), m.index);
    }
    // Objects packed inside object streams (most modern writers use them).
    for (const num of [...this.offsets.keys()]) {
      const v = this.get(num);
      if (v instanceof Stream && nameOf(v.dict.get('Type')) === 'ObjStm') this.unpack(v);
    }
  }

  /** Object numbers in file order. */
  numbers(): number[] {
    return [...new Set([...this.offsets.keys(), ...this.objects.keys()])].sort((a, b) => a - b);
  }

  get(num: number): Value {
    if (this.objects.has(num)) return this.objects.get(num)!;
    const at = this.offsets.get(num);
    if (at === undefined) return null;
    this.objects.set(num, null); // guards against loops while parsing
    const v = this.parseAt(at);
    this.objects.set(num, v);
    return v;
  }

  resolve(v: Value | undefined): Value {
    for (let depth = 0; v instanceof Ref && depth < 16; depth++) v = this.get(v.num);
    return v === undefined || v instanceof Ref ? null : v;
  }

  dict(v: Value | undefined): Dict | null {
    const r = this.resolve(v);
    if (r instanceof Map) return r;
    if (r instanceof Stream) return r.dict;
    return null;
  }

  array(v: Value | undefined): Value[] {
    const r = this.resolve(v);
    return Array.isArray(r) ? r : [];
  }

  number(v: Value | undefined, fallback = 0): number {
    const r = this.resolve(v);
    return typeof r === 'number' ? r : fallback;
  }

  private parseAt(at: number): Value {
    const lex = new Lexer(this.bytes, at);
    lex.next();
    lex.next();
    const kw = lex.next();
    if (!(kw instanceof Keyword) || kw.word !== 'obj') return null;
    const v = readValue(lex, true);
    if (v === undefined || v instanceof Keyword) return null;
    if (!(v instanceof Map)) return v;
    const save = lex.pos;
    const after = lex.next();
    if (!(after instanceof Keyword) || after.word !== 'stream') {
      lex.pos = save;
      return v;
    }
    let start = lex.pos;
    if (this.bytes[start] === 13) start++;
    if (this.bytes[start] === 10) start++;
    const length = v.get('Length');
    const len = typeof length === 'number' ? length : this.number(length, -1);
    let end = len >= 0 ? start + len : -1;
    const tail = end >= 0 ? latin1(this.bytes, end, Math.min(this.bytes.length, end + 20)) : '';
    if (end < 0 || end > this.bytes.length || !/^\s*endstream/.test(tail)) {
      end = indexOf(this.bytes, 'endstream', start);
      if (end < 0) end = this.bytes.length;
      while (end > start && (this.bytes[end - 1] === 10 || this.bytes[end - 1] === 13)) end--;
    }
    return new Stream(v, this.bytes.subarray(start, end));
  }

  private unpack(stm: Stream) {
    const data = this.decode(stm);
    if (!data) return;
    const n = this.number(stm.dict.get('N'));
    const first = this.number(stm.dict.get('First'));
    const lex = new Lexer(data);
    const index: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const num = lex.next();
      const off = lex.next();
      if (typeof num !== 'number' || typeof off !== 'number') break;
      index.push([num, off]);
    }
    for (const [num, off] of index) {
      if (this.offsets.has(num) || this.objects.has(num)) continue;
      const v = readValue(new Lexer(data, first + off), true);
      if (v !== undefined && !(v instanceof Keyword)) this.objects.set(num, v);
    }
  }

  /** The stream's decoded bytes, or null for filters we don't read (images, LZW). */
  decode(stm: Stream): Uint8Array | null {
    const f = this.resolve(stm.dict.get('Filter'));
    const filters = (Array.isArray(f) ? f : f ? [f] : []).map((x) => nameOf(this.resolve(x)));
    let data: Uint8Array = stm.data;
    try {
      for (const name of filters) {
        if (name === 'FlateDecode' || name === 'Fl') data = flate(data);
        else if (name === 'ASCII85Decode' || name === 'A85') data = ascii85(data);
        else if (name === 'ASCIIHexDecode' || name === 'AHx') data = asciiHex(data);
        else return null;
      }
    } catch {
      return null;
    }
    return data;
  }
}

export function nameOf(v: Value | undefined): string | null {
  return v instanceof Name ? v.name : null;
}
