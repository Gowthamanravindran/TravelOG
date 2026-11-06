import { mimeFor, openAttachment, pickAttachment } from '@/lib/files';

const PDF_HEAD = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

const mockPreview = jest.fn();
const mockCopy = jest.fn();
const mockPick = jest.fn();
let mockHead: Uint8Array = PDF_HEAD;
const mockFiles: { uri: string }[] = [];
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    name: string;
    constructor(dirOrUri: { uri?: string } | string, name?: string) {
      this.uri = typeof dirOrUri === 'string' ? dirOrUri : `${dirOrUri.uri}/${name}`;
      this.name = this.uri.split('/').pop()!;
      mockFiles.push(this);
    }
    open() {
      return { readBytesSync: (n: number) => mockHead.slice(0, n), close: () => {} };
    }
    preview(opts: unknown) {
      return mockPreview(this.uri, opts);
    }
    static pickFileAsync() {
      return mockPick();
    }
  }
  class Directory {
    uri: string;
    constructor(_base: unknown, name: string) {
      this.uri = `file:///docs/${name}`;
    }
    create() {}
  }
  return { File, Directory, Paths: { document: {} } };
});

const mockShare = jest.fn();
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => Promise.resolve(true),
  shareAsync: (...args: unknown[]) => mockShare(...args),
}));

beforeEach(() => {
  mockPreview.mockReset().mockResolvedValue(undefined);
  mockShare.mockReset().mockResolvedValue(undefined);
  mockPick.mockReset();
  mockCopy.mockReset();
  mockHead = PDF_HEAD;
});

describe('mimeFor (Plan 34)', () => {
  it('knows a type from the extension, else from the first bytes', () => {
    expect(mimeFor('ticket.PDF')).toBe('application/pdf');
    expect(mimeFor('boarding.jpeg')).toBe('image/jpeg');
    expect(mimeFor('E-Ticket 4521367890', PDF_HEAD)).toBe('application/pdf');
    expect(mimeFor('scan', Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(mimeFor('shot', Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png');
    expect(mimeFor('mystery', Uint8Array.from([1, 2, 3, 4]))).toBeNull();
    expect(mimeFor('mystery')).toBeNull();
  });
});

describe('openAttachment', () => {
  it('tells the viewer the stored type', async () => {
    await openAttachment({
      localUri: 'file:///a/1-ticket',
      mimeType: 'application/pdf',
      name: 'ticket',
    });
    expect(mockPreview).toHaveBeenCalledWith('file:///a/1-ticket', {
      mimeType: 'application/pdf',
      title: 'ticket',
    });
  });

  it('works out the type of an older attachment saved without one', async () => {
    await openAttachment({ localUri: 'file:///a/1-E-Ticket', mimeType: null, name: 'E-Ticket' });
    expect(mockPreview).toHaveBeenCalledWith('file:///a/1-E-Ticket', {
      mimeType: 'application/pdf',
      title: 'E-Ticket',
    });
  });

  it('falls back to the share sheet when no app can show it', async () => {
    mockPreview.mockRejectedValue(new Error('No app can preview files'));
    await openAttachment({
      localUri: 'file:///a/1-x.pdf',
      mimeType: 'application/pdf',
      name: 'x.pdf',
    });
    expect(mockShare).toHaveBeenCalledWith('file:///a/1-x.pdf', {
      mimeType: 'application/pdf',
      dialogTitle: 'x.pdf',
    });
  });
});

describe('pickAttachment', () => {
  it('gives a nameless PDF an extension and a type', async () => {
    const source = {
      name: 'E-Ticket 4521367890',
      type: '',
      size: 1200,
      open: () => ({ readBytesSync: (n: number) => PDF_HEAD.slice(0, n), close: () => {} }),
      copy: mockCopy,
    };
    mockPick.mockResolvedValue({ canceled: false, result: source });
    const picked = await pickAttachment();
    expect(picked).toMatchObject({ name: 'E-Ticket 4521367890', mimeType: 'application/pdf' });
    expect(picked!.localUri).toMatch(/E-Ticket_4521367890\.pdf$/);
  });
});
