# Plan 34 — Attachments open again

**Status:** ✅ Built

## Context
Tapping an attached ticket in a booking failed with "Call to function 'FileSystemFile.preview' has been rejected. No MIME type could be resolved for this file".

`openAttachment()` called `File.preview()` without a type. Android then guesses the type from the file name. Tickets shared from mail, Drive or booking apps often have no extension ("E-Ticket 4521367890"), and the app's copy kept that name. Android didn't know the file was a PDF, so it refused to open it. The type the picker reported was saved on every attachment, but it was never passed on.

## Change (`apps/mobile/src/lib/files.ts`)
- **`mimeFor(name, head)`** works out the type from the extension, else from the file's first bytes (`%PDF`, JPEG, PNG, WebP, GIF).
- **`openAttachment({ localUri, mimeType, name })`** passes the saved type to the viewer. For older attachments saved without a type, it reads the type from the file's first bytes, falling back to PDF. If no app can show the file, the share sheet opens instead so you can pick one (`expo-sharing`, already in Expo Go).
- **`pickAttachment()`** works out the type when the picker gives none, and adds an extension to the stored copy (`.pdf`, `.jpg`…).
- Attachments saved before this fix need no migration: they open through the saved type or the byte check.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. New `__tests__/files.test.ts` covers the type from name or bytes, the saved type reaching the viewer, an older attachment without a type, the share-sheet fallback, and a nameless PDF getting `.pdf`.
- Owner: `git pull && pnpm dev:go`, open a booking and tap its ticket, including one attached before this fix. No new build is needed.
