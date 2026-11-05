import {
  docFromTemplate,
  parseDoc,
  pickForCollage,
  serializeDoc,
  templatePhotoCount,
  type StudioDoc,
  type StudioFormat,
  type StudioTemplateId,
} from '@travelog/core';
import { eq } from 'drizzle-orm';

import { deleteRow, getRow, insertRow, liveRows, newId, nowIso, updateRow, type Db } from '../db';
import { studioProjects } from '../schema';
import { listPhotos } from './photos';
import { getTrip } from './trips';

export type StudioProject = typeof studioProjects.$inferSelect;

export interface NewProjectInput {
  tripId: string;
  format: StudioFormat;
  slides: number;
  template: StudioTemplateId;
  title?: string;
}

/**
 * Starts a carousel from a template, filled with trip photos spread across the
 * days (the same pick as the Plan 13 collages).
 */
export function createProject(db: Db, input: NewProjectInput): StudioProject {
  const trip = getTrip(db, input.tripId);
  if (!trip) throw new Error('trip not found');
  const title = (input.title ?? trip.destination ?? trip.title).trim().slice(0, 60) || 'Our trip';
  const slots = templatePhotoCount(input.template, input.format, input.slides);
  const photoIds = pickForCollage(listPhotos(db, input.tripId), slots).map((p) => p.id);
  const doc = docFromTemplate(input.template, input.format, input.slides, photoIds, newId, title);
  return insertRow(db, 'studio_projects', {
    tripId: input.tripId,
    title,
    format: doc.format,
    slides: doc.slides,
    doc: serializeDoc(doc),
    thumbnailUri: null,
    exportedAt: null,
  });
}

/** Newest-edited first. */
export function listProjects(db: Db, tripId: string): StudioProject[] {
  return liveRows(db, 'studio_projects', eq(studioProjects.tripId, tripId)).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function getProject(db: Db, id: string): { project: StudioProject; doc: StudioDoc } | null {
  const project = getRow(db, 'studio_projects', id);
  if (!project) return null;
  return { project, doc: parseDoc(project.doc, project.format, project.slides) };
}

/** Saves the editor's document (called a moment after edits stop). */
export function saveProjectDoc(db: Db, id: string, doc: StudioDoc): StudioProject {
  return updateRow(db, 'studio_projects', id, {
    doc: serializeDoc(doc),
    format: doc.format,
    slides: doc.slides,
  });
}

export function renameProject(db: Db, id: string, title: string): StudioProject {
  const t = title.trim().slice(0, 60);
  if (!t) throw new RangeError('please give it a name');
  return updateRow(db, 'studio_projects', id, { title: t });
}

/** Records the preview image and that the carousel was exported. */
export function markExported(db: Db, id: string, thumbnailUri: string | null): StudioProject {
  return updateRow(db, 'studio_projects', id, { thumbnailUri, exportedAt: nowIso() });
}

export function duplicateProject(db: Db, id: string): StudioProject {
  const found = getRow(db, 'studio_projects', id);
  if (!found) throw new Error('project not found');
  return insertRow(db, 'studio_projects', {
    tripId: found.tripId,
    title: `${found.title} (copy)`.slice(0, 60),
    format: found.format,
    slides: found.slides,
    doc: found.doc,
    thumbnailUri: found.thumbnailUri,
    exportedAt: null,
  });
}

export function deleteProject(db: Db, id: string): void {
  deleteRow(db, 'studio_projects', id);
}

/** "Europe · 3": the trip's name and the next collage number (Plan 22). */
export function nextCollageTitle(db: Db, tripId: string): string {
  const trip = getTrip(db, tripId);
  const name = (trip?.title ?? 'Trip').trim().slice(0, 50) || 'Trip';
  // Count every collage ever made for the trip (deleted ones too), so numbers aren't reused.
  const made = db
    .select()
    .from(studioProjects)
    .where(eq(studioProjects.tripId, tripId))
    .all().length;
  return `${name} · ${made + 1}`;
}

/** Saves a collage built in the compose screen. */
export function createProjectFromDoc(
  db: Db,
  tripId: string,
  doc: StudioDoc,
  title: string = nextCollageTitle(db, tripId),
): StudioProject {
  if (!getTrip(db, tripId)) throw new Error('trip not found');
  return insertRow(db, 'studio_projects', {
    tripId,
    title: title.trim().slice(0, 60) || nextCollageTitle(db, tripId),
    format: doc.format,
    slides: doc.slides,
    doc: serializeDoc(doc),
    thumbnailUri: null,
    exportedAt: null,
  });
}
