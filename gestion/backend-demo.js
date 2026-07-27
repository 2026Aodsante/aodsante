// ════════════════════════════════════════════════
// Backend DÉMO — stockage local (localStorage uniquement)
// Utilisé tant que Firebase n'est pas configuré.
// Même interface que backend-firebase.js pour un switch transparent.
// ════════════════════════════════════════════════
import { MEMBERS_BY_ID, MISSIONS } from './data.js';

const LS_AUTH = 'gestion_demo_auth';
const LS_ACTIONS = 'gestion_demo_actions';
const LS_EVENTS = 'gestion_demo_events';
const DEMO_PASSWORD = 'demo';

let authListeners = [];
let actionsListeners = [];
let eventsListeners = [];

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
  const today = new Date();
  const in5 = new Date(today); in5.setDate(in5.getDate() + 5);
  const in12 = new Date(today); in12.setDate(in12.getDate() + 12);
  events = [
    { id: 'seed1', title: 'Soirée de formation — Diabète', date: in5.toISOString().slice(0,10), time: '19:00', description: 'À destination de tous les professionnels de santé du territoire.', createdBy: 'Mathilde Moysan' },
    { id: 'seed2', title: 'Réunion de concertation — Ménopause', date: in12.toISOString().slice(0,10), time: '18:30', description: 'Réunion pluriprofessionnelle de partage d\'expériences.', createdBy: 'Dr Olivier Barclay' },
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

export async function deleteEvent(eventId) {
  let events = seedEventsIfEmpty();
  events = events.filter(e => e.id !== eventId);
  writeJSON(LS_EVENTS, events);
  eventsListeners.forEach(l => l(events));
}
