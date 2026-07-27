// ════════════════════════════════════════════════
// Backend FIREBASE — Firestore (données partagées) + Authentication
// Utilisé automatiquement dès que firebase-config.js contient une vraie config.
// Même interface que backend-demo.js pour un switch transparent dans app.js.
// ════════════════════════════════════════════════
import { firebaseConfig } from './firebase-config.js';
import { MEMBERS_BY_ID } from './data.js';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  getFirestore, collection, doc, setDoc, onSnapshot, addDoc, deleteDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL_DOMAIN = '@cptsdbmb.local';
let currentUser = null; // { id, name, role }

export const backendMode = 'firebase';

function memberIdFromEmail(email) {
  return (email || '').replace(EMAIL_DOMAIN, '');
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, (fbUser) => {
    if (fbUser) {
      const id = memberIdFromEmail(fbUser.email);
      currentUser = MEMBERS_BY_ID[id] ? { ...MEMBERS_BY_ID[id] } : null;
    } else {
      currentUser = null;
    }
    cb(currentUser);
  });
}

export async function login(memberId, password) {
  try {
    await signInWithEmailAndPassword(auth, memberId + EMAIL_DOMAIN, password);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Identifiant ou mot de passe incorrect." };
  }
}

export async function logout() {
  await signOut(auth);
}

export async function changePassword(newPassword) {
  try {
    await updatePassword(auth.currentUser, newPassword);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Impossible de changer le mot de passe (reconnectez-vous puis réessayez)." };
  }
}

export function watchActions(cb) {
  return onSnapshot(collection(db, 'actions'), (snap) => {
    const map = {};
    snap.forEach(d => { map[d.id] = d.data(); });
    cb(map);
  });
}

export async function updateAction(missionId, actionId, patch) {
  const ref = doc(db, 'actions', `${missionId}__${actionId}`);
  await setDoc(ref, {
    ...patch,
    updatedBy: currentUser ? currentUser.name : '',
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function watchEvents(cb) {
  return onSnapshot(collection(db, 'events'), (snap) => {
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    cb(list);
  });
}

export async function addEvent(event) {
  await addDoc(collection(db, 'events'), { ...event, createdAt: serverTimestamp() });
}

export async function deleteEvent(eventId) {
  await deleteDoc(doc(db, 'events', eventId));
}
