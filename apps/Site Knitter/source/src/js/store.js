// Central state, events and undo history
import { clone } from './util.js';

export const state = {
  project: null,        // the site document
  filePath: null,       // path of the .wspin file
  dirty: false,
  pageId: null,         // current page
  entryId: null,        // current blog entry (when editing a blog post)
  selection: [],        // selected element ids
  zoom: 1,
  editingTextId: null,  // element in inline text-edit mode
  showGuides: true,
};

const listeners = new Map();
export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => listeners.get(evt).delete(fn);
}
export function emit(evt, data) {
  for (const fn of listeners.get(evt) || []) {
    try { fn(data); } catch (e) { console.error(`listener for ${evt} failed`, e); }
  }
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------
export const currentPage = () => state.project?.pages.find((p) => p.id === state.pageId) || null;

export const currentEntry = () => {
  const p = currentPage();
  return p && p.type === 'blog' && state.entryId ? p.blog.entries.find((e) => e.id === state.entryId) || null : null;
};

/** Elements of whatever is being edited: page canvas or blog entry body canvas. */
export function currentElements() {
  const p = currentPage();
  if (!p) return [];
  return p.elements;
}

export const elementById = (id) => currentElements().find((e) => e.id === id) || null;
export const selectedElements = () => state.selection.map(elementById).filter(Boolean);

// ---------------------------------------------------------------------------
// Undo / redo — whole-project snapshots (asset blobs live outside the doc)
// ---------------------------------------------------------------------------
const undoStack = [];
const redoStack = [];
const MAX_UNDO = 120;
let lastKey = null;
let lastTime = 0;

function snapshot() {
  return JSON.stringify({ project: state.project, pageId: state.pageId, entryId: state.entryId, selection: state.selection });
}

function restore(snap) {
  const s = JSON.parse(snap);
  state.project = s.project;
  state.pageId = s.project.pages.some((p) => p.id === s.pageId) ? s.pageId : s.project.pages[0]?.id;
  state.entryId = s.entryId;
  state.selection = s.selection || [];
  state.editingTextId = null;
  setDirty(true);
  emit('project');
}

/**
 * Apply a change to the document with undo support.
 * opts.key: coalesce rapid edits with the same key (e.g. slider drags).
 * opts.events: events to emit afterwards (default ['change']).
 */
export function mutate(fn, opts = {}) {
  const now = Date.now();
  const coalesce = opts.key && opts.key === lastKey && now - lastTime < 1200;
  if (!coalesce) {
    undoStack.push(snapshot());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
  }
  lastKey = opts.key || null;
  lastTime = now;
  fn(state.project);
  setDirty(true);
  for (const e of opts.events || ['change']) emit(e);
}

/** For drag operations: take a snapshot up front, commit only if something changed. */
export function beginGesture() {
  return snapshot();
}
export function endGesture(before) {
  if (before && before !== snapshot()) {
    undoStack.push(before);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
    lastKey = null;
    setDirty(true);
  }
}

export function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
}
export function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
}
export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;

export function resetHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
  lastKey = null;
}

// ---------------------------------------------------------------------------
export function setDirty(v) {
  if (state.dirty !== v) {
    state.dirty = v;
    emit('dirty');
  }
}

export function loadProject(project, filePath = null) {
  state.project = project;
  state.filePath = filePath;
  state.pageId = project.pages[0]?.id || null;
  state.entryId = null;
  state.selection = [];
  state.editingTextId = null;
  resetHistory();
  state.dirty = false;
  emit('project');
  emit('dirty');
}

export function selectPage(id, entryId = null) {
  state.pageId = id;
  state.entryId = entryId;
  state.selection = [];
  state.editingTextId = null;
  emit('page');
}

export function select(ids) {
  state.selection = [...new Set(ids)];
  if (state.editingTextId && !state.selection.includes(state.editingTextId)) state.editingTextId = null;
  emit('selection');
}

export function projectForSave() {
  return clone(state.project);
}
