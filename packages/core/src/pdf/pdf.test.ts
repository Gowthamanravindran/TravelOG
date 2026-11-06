import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { extractPdfLayout, extractPdfText, isPdf } from './index';

const require = createRequire(import.meta.url);

async function make(
  pages: { lines: [string, number, number][] }[],
  opts: { objectStreams?: boolean; font?: 'helvetica' | 'figtree' } = {},
) {
  const pdf = await PDFDocument.create();
  let font;
  if (opts.font === 'figtree') {
    pdf.registerFontkit(fontkit);
    const path = require.resolve('@expo-google-fonts/figtree/400Regular/Figtree_400Regular.ttf');
    font = await pdf.embedFont(readFileSync(path), { subset: true });
  } else font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const p of pages) {
    const page = pdf.addPage([595, 842]);
    for (const [text, x, y] of p.lines) page.drawText(text, { x, y, size: 11, font });
  }
  return pdf.save({ useObjectStreams: opts.objectStreams ?? true });
}

/** A hand-written PDF so the less common paths (ToUnicode ranges, TJ gaps, T*) are covered. */
function handMade(content: string, extra = ''): Uint8Array {
  const cmap = `/CIDInit /ProcSet findresource begin
begincmap
1 begincodespacerange <0000> <FFFF> endcodespacerange
2 beginbfchar <0001> <0050> <0002> <004E> endbfchar
1 beginbfchar <0003> <0052> endbfchar
1 beginbfrange <0010> <0019> <0030> endbfrange
1 beginbfrange <0020> <0021> [<20B9> <2192>] endbfrange
endcmap end`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type0 /BaseFont /X /Encoding /Identity-H /ToUnicode 6 0 R /DescendantFonts [7 0 R] >>',
    `<< /Length ${cmap.length} >>\nstream\n${cmap}\nendstream`,
    '<< /Type /Font /Subtype /CIDFontType2 /DW 600 >>',
  ];
  let out = '%PDF-1.4\n';
  objs.forEach((o, i) => (out += `${i + 1} 0 obj\n${o}\nendobj\n`));
  out += `trailer\n<< /Root 1 0 R ${extra}>>\n%%EOF\n`;
  return Uint8Array.from(out, (c) => c.charCodeAt(0));
}

describe('extractPdfText', () => {
  it('reads text drawn with a standard font, with object streams', async () => {
    const bytes = await make([
      {
        lines: [
          ['E-Ticket', 50, 800],
          ['PNR: X7K2QP', 50, 780],
          ['Departure 12 Jul 2026 06:45', 50, 760],
        ],
      },
    ]);
    expect(extractPdfText(bytes)).toEqual(['E-Ticket\nPNR: X7K2QP\nDeparture 12 Jul 2026 06:45']);
  });

  it('reads files without object streams the same way', async () => {
    const bytes = await make([{ lines: [['Hotel Sea Breeze', 50, 800]] }], {
      objectStreams: false,
    });
    expect(extractPdfText(bytes)).toEqual(['Hotel Sea Breeze']);
  });

  it('puts text on the same line in left-to-right order and keeps columns apart', async () => {
    const bytes = await make([
      {
        lines: [
          ['Bengaluru', 300, 700],
          ['From', 50, 700],
          ['Goa', 300, 680],
          ['To', 50, 680],
        ],
      },
    ]);
    expect(extractPdfText(bytes)).toEqual(['From   Bengaluru\nTo   Goa']);
  });

  it('returns one string per page', async () => {
    const bytes = await make([
      { lines: [['Page one', 50, 800]] },
      { lines: [['Page two', 50, 800]] },
    ]);
    expect(extractPdfText(bytes)).toEqual(['Page one', 'Page two']);
  });

  it('reads embedded fonts through their ToUnicode map', async () => {
    const bytes = await make([{ lines: [['Zürich – Total €120.50', 50, 800]] }], {
      font: 'figtree',
    });
    expect(extractPdfText(bytes)).toEqual(['Zürich – Total €120.50']);
  });

  it('handles two-byte codes, ranges, TJ gaps and next-line operators', () => {
    const content = [
      'BT /F1 12 Tf 14 TL 50 800 Td',
      '[<0001> <0002> <0003> -3000 <0011> <0012>] TJ',
      'T* <0020> Tj',
      'T* [<0013> <0014>] TJ ET',
    ].join('\n');
    expect(extractPdfText(handMade(content))).toEqual(['PNR   12\n₹\n34']);
  });

  it('gives nothing for an image-only page (a scan)', async () => {
    const pdf = await PDFDocument.create();
    const png = await pdf.embedPng(
      Uint8Array.from(
        atob(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        ),
        (c) => c.charCodeAt(0),
      ),
    );
    pdf.addPage([200, 200]).drawImage(png, { x: 0, y: 0, width: 200, height: 200 });
    expect(extractPdfText(await pdf.save())).toEqual([]);
  });

  it('gives nothing for an encrypted file instead of garbage', () => {
    const bytes = handMade('BT /F1 12 Tf 50 800 Td <0001> Tj ET', '/Encrypt 9 0 R ');
    expect(extractPdfText(bytes)).toEqual([]);
  });

  it('gives nothing for files that are not PDFs, or are broken', () => {
    expect(extractPdfText(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toEqual([]);
    expect(isPdf(Uint8Array.from('%PDF-1.7', (c) => c.charCodeAt(0)))).toBe(true);
    expect(
      extractPdfText(Uint8Array.from('%PDF-1.7\n1 0 obj << /Type', (c) => c.charCodeAt(0))),
    ).toEqual([]);
  });

  it('spaces words in Type 3 fonts, whose widths use the font’s own units (Plan 38)', () => {
    // 1100 units at 1/2048 is about half an em: "AB" ends near x=62.9, so "BA" at x=67
    // is one word space away. Read as thousandths, "AB" would wrongly reach x=76.
    const content = 'BT /F1 12 Tf 50 800 Td (AB) Tj 17 0 Td (BA) Tj ET';
    expect(extractPdfText(type3Pdf(content))).toEqual(['AB BA']);
  });

  it('turns ligatures into plain letters ("conﬁrmation" → "confirmation")', () => {
    // Code 66 is drawn with the "ﬁ" ligature glyph (U+FB01).
    const content = 'BT /F1 12 Tf 50 800 Td (AB) Tj ET';
    expect(extractPdfText(type3Pdf(content, '/Encoding << /Differences [66 /uniFB01] >>'))).toEqual(
      ['Afi'],
    );
  });

  it('keeps each column as a cell with its position', async () => {
    const bytes = await make([
      {
        lines: [
          ['CHECK-IN', 300, 700],
          ['CHECK-OUT', 400, 700],
          ['20', 302, 680],
          ['24', 402, 680],
        ],
      },
    ]);
    const [page] = extractPdfLayout(bytes);
    expect(page!.map((l) => l.cells.map((c) => [Math.round(c.x), c.text]))).toEqual([
      [
        [300, 'CHECK-IN'],
        [400, 'CHECK-OUT'],
      ],
      [
        [302, '20'],
        [402, '24'],
      ],
    ]);
  });
});

/** A one-page PDF using a Type 3 font with a 1/2048 FontMatrix. */
function type3Pdf(content: string, extra = ''): Uint8Array {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    `<< /Type /Font /Subtype /Type3 /FontMatrix [0.000488 0 0 -0.000488 0 0] /FontBBox [0 0 1000 1000] /CharProcs << >> /FirstChar 65 /LastChar 66 /Widths [1100 1100] ${extra}>>`,
  ];
  let out = '%PDF-1.4\n';
  objs.forEach((o, i) => (out += `${i + 1} 0 obj\n${o}\nendobj\n`));
  out += 'trailer\n<< /Root 1 0 R >>\n%%EOF\n';
  return Uint8Array.from(out, (c) => c.charCodeAt(0));
}
