// ════════════════════════════════════════════════
// Backend DÉMO — stockage local (localStorage uniquement)
// Utilisé tant que Firebase n'est pas configuré.
// Même interface que backend-firebase.js pour un switch transparent.
// ════════════════════════════════════════════════
import { MEMBERS_BY_ID, MISSIONS } from './data.js?v=20261006b';

const LS_AUTH = 'rovira_demo_auth';
const LS_ACTIONS = 'rovira_demo_actions';
const LS_EVENTS = 'rovira_demo_events';
const LS_DOCUMENTS = 'rovira_demo_documents';
const DEMO_PASSWORD = 'demo';

let authListeners = [];
let actionsListeners = [];
let eventsListeners = [];
let documentsListeners = [];

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedActionsIfEmpty() {
  let actions = readJSON(LS_ACTIONS, null);
  if (actions) return actions;
  actions = {};
  MISSIONS.forEach(m => m.actions.forEach(a => {
    actions[`${m.id}__${a.id}`] = {
      indicateurs: a.indicateurs.map(() => false),
      livrables: a.livrables.map(() => false),
      remarque: '',
      updatedBy: '',
      updatedAt: null,
    };
  }));
  writeJSON(LS_ACTIONS, actions);
  return actions;
}

function seedEventsIfEmpty() {
  let events = readJSON(LS_EVENTS, null);
  if (events) return events;
  events = [
    { id: 'seed1', title: 'Soirée visio KBP — Mois sans tabac', date: '2026-11-06', time: '19:30', description: 'Soirée en visio (19h30-20h) dans le cadre du Mois sans tabac. Replay prévu.', createdBy: 'Mathilde Moysan' },
  ];
  writeJSON(LS_EVENTS, events);
  return events;
}

export const backendMode = 'demo';

export function onAuthChange(cb) {
  authListeners.push(cb);
  const raw = readJSON(LS_AUTH, null);
  cb(raw ? MEMBERS_BY_ID[raw.id] || null : null);
  return () => { authListeners = authListeners.filter(l => l !== cb); };
}

export async function login(memberId, password) {
  if (!MEMBERS_BY_ID[memberId]) return { ok: false, error: 'Membre inconnu.' };
  if (password !== DEMO_PASSWORD) return { ok: false, error: 'Mot de passe incorrect (mode démo : utilisez "demo").' };
  writeJSON(LS_AUTH, { id: memberId });
  const user = MEMBERS_BY_ID[memberId];
  authListeners.forEach(l => l(user));
  return { ok: true };
}

export async function logout() {
  localStorage.removeItem(LS_AUTH);
  authListeners.forEach(l => l(null));
}

export async function changePassword(newPassword) {
  return { ok: false, error: 'Le changement de mot de passe n\'est disponible qu\'en mode connecté (Firebase).' };
}

export function watchActions(cb) {
  const actions = seedActionsIfEmpty();
  cb(actions);
  actionsListeners.push(cb);
  return () => { actionsListeners = actionsListeners.filter(l => l !== cb); };
}

export async function updateAction(missionId, actionId, patch) {
  const actions = seedActionsIfEmpty();
  const key = `${missionId}__${actionId}`;
  actions[key] = { ...actions[key], ...patch, updatedAt: new Date().toISOString() };
  writeJSON(LS_ACTIONS, actions);
  actionsListeners.forEach(l => l(actions));
}

export function watchEvents(cb) {
  const events = seedEventsIfEmpty();
  cb(events);
  eventsListeners.push(cb);
  return () => { eventsListeners = eventsListeners.filter(l => l !== cb); };
}

export async function addEvent(event) {
  const events = seedEventsIfEmpty();
  events.push({ ...event, id: 'e' + Date.now() });
  writeJSON(LS_EVENTS, events);
  eventsListeners.forEach(l => l(events));
}

export async function updateEvent(eventId, patch) {
  const events = seedEventsIfEmpty();
  const idx = events.findIndex(e => e.id === eventId);
  const auth = readJSON(LS_AUTH, null);
  const editor = auth ? MEMBERS_BY_ID[auth.id]?.name : '';
  if (idx !== -1) events[idx] = { ...events[idx], ...patch, editedBy: editor, editedAt: new Date().toISOString() };
  writeJSON(LS_EVENTS, events);
  eventsListeners.forEach(l => l(events));
}

export async function deleteEvent(eventId) {
  let events = seedEventsIfEmpty();
  events = events.filter(e => e.id !== eventId);
  writeJSON(LS_EVENTS, events);
  eventsListeners.forEach(l => l(events));
}

export function watchDocuments(cb) {
  const docs = readJSON(LS_DOCUMENTS, []);
  cb(docs);
  documentsListeners.push(cb);
  return () => { documentsListeners = documentsListeners.filter(l => l !== cb); };
}

export async function addDocumentLink(link, meta) {
  const auth = readJSON(LS_AUTH, null);
  const uploader = auth ? MEMBERS_BY_ID[auth.id]?.name : '';
  const docs = readJSON(LS_DOCUMENTS, []);
  docs.push({
    id: 'doc' + Date.now(),
    name: link.name,
    url: link.url,
    category: meta.category,
    missionId: meta.missionId || null,
    actionId: meta.actionId || null,
    uploadedBy: uploader,
    uploadedAt: new Date().toISOString(),
  });
  writeJSON(LS_DOCUMENTS, docs);
  documentsListeners.forEach(l => l(docs));
}

export async function deleteDocument(docId) {
  let docs = readJSON(LS_DOCUMENTS, []);
  docs = docs.filter(d => d.id !== docId);
  writeJSON(LS_DOCUMENTS, docs);
  documentsListeners.forEach(l => l(docs));
}
