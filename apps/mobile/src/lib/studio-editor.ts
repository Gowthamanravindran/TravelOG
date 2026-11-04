import {
  commit,
  newDoc,
  redo,
  startHistory,
  undo,
  type History,
  type StudioDoc,
} from '@travelog/core';
import { getProject, saveProjectDoc, type StudioProject } from '@travelog/db';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDb, useMutate } from '@/data/provider';

const AUTOSAVE_MS = 800;

export interface StudioEditor {
  project: StudioProject | null;
  doc: StudioDoc;
  /** Applies an edit and records it for undo. */
  apply: (edit: (doc: StudioDoc) => StudioDoc) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedId: string | null;
  select: (id: string | null) => void;
  /** Writes any pending change now (before leaving or exporting). */
  flush: () => void;
}

/**
 * Editor state for one Studio project: the document with undo/redo, the selected
 * layer, and autosave a moment after edits stop (each save is one outbox entry,
 * so dragging doesn't flood the sync queue).
 */
export function useStudioEditor(projectId: string): StudioEditor {
  const db = useDb();
  const mutate = useMutate();
  // Loaded once; afterwards the editor's own state is the source of truth.
  const loaded = useMemo(() => getProject(db, projectId), [db, projectId]);
  const [history, setHistory] = useState<History>(() =>
    startHistory(loaded?.doc ?? newDoc('post', 3)),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const saved = useRef(history.present);
  const pending = useRef<StudioDoc | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const doc = pending.current;
    if (!doc || !loaded || doc === saved.current) return;
    pending.current = null;
    saved.current = doc;
    mutate((db) => saveProjectDoc(db, projectId, doc));
  }, [loaded, mutate, projectId]);

  useEffect(() => {
    if (history.present === saved.current) {
      // Undone back to what's saved: nothing left to write.
      pending.current = null;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      return;
    }
    pending.current = history.present;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_MS);
  }, [history.present, flush]);

  // Save whatever is left when the editor closes.
  useEffect(() => flush, [flush]);

  const apply = useCallback(
    (edit: (doc: StudioDoc) => StudioDoc) => setHistory((h) => commit(h, edit(h.present))),
    [],
  );

  return {
    project: loaded?.project ?? null,
    doc: history.present,
    apply,
    undo: () => setHistory(undo),
    redo: () => setHistory(redo),
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    selectedId:
      selectedId && history.present.layers.some((l) => l.id === selectedId) ? selectedId : null,
    select: setSelectedId,
    flush,
  };
}
