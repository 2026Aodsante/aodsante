// ════════════════════════════════════════════════
// Script de seed — à exécuter UNE SEULE FOIS depuis un ordinateur,
// jamais depuis le site lui-même (utilise une clé d'administration).
//
// Ce script :
//  1. Crée un compte Firebase Authentication pour chacun des 14 membres
//     (identifiant "prenom@cptsdbmb.local" + mot de passe par défaut)
//  2. Initialise les documents Firestore des missions/actions et un
//     agenda de démarrage (mêmes données que le mode démo)
//
// Utilisation :
//   1. Déposer le fichier de clé de service (Firebase > Paramètres du
//      projet > Comptes de service > Générer une nouvelle clé privée)
//      sous le nom "serviceAccountKey.json" dans le dossier gestion/
//   2. npm install firebase-admin   (dans ce dossier gestion/seed)
//   3. node seed.js
// ════════════════════════════════════════════════
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const auth = admin.auth();
const db = admin.firestore();

const EMAIL_DOMAIN = '@cptsdbmb.local';

// Même liste que gestion/data.js — mot de passe par défaut à transmettre à chacun.
const MEMBERS = [
  { id: 'patrick',        name: 'Dr Patrick Laugareil',       password: 'Patrick2026!' },
  { id: 'samia',          name: 'Dr Samia Ben Ayad-Beloufa',  password: 'Samia2026!' },
  { id: 'olivier',        name: 'Dr Olivier Barclay',          password: 'Olivier2026!' },
  { id: 'malika.kemache', name: 'Malika Kemache',              password: 'MalikaK2026!' },
  { id: 'frederic',       name: 'Frédéric Mourad',             password: 'Frederic2026!' },
  { id: 'fatima',         name: 'Dr Fatima Bargui',            password: 'Fatima2026!' },
  { id: 'lounes',         name: 'Lounès Kemmache',             password: 'Lounes2026!' },
  { id: 'sabrina',        name: 'Sabrina Ben Ayad',            password: 'Sabrina2026!' },
  { id: 'solene',         name: 'Solène Dias',                 password: 'Solene2026!' },
  { id: 'celia',          name: 'Célia Vilus',                 password: 'Celia2026!' },
  { id: 'sighane',        name: 'Sighane Diop',                password: 'Sighane2026!' },
  { id: 'francine',       name: 'Francine Braflan',            password: 'Francine2026!' },
  { id: 'malika.mouchon', name: 'Malika Mouchon',              password: 'MalikaM2026!' },
  { id: 'mathilde',       name: 'Mathilde Moysan',             password: 'Mathilde2026!' },
];

// Chargé depuis gestion/data.js (module ES) pour rester en phase avec l'application.
async function loadMissions() {
  const mod = await import('../data.js');
  return mod.MISSIONS;
}

async function seedMembers() {
  for (const m of MEMBERS) {
    const email = m.id + EMAIL_DOMAIN;
    try {
      const existing = await auth.getUserByEmail(email).catch(() => null);
      if (existing) {
        console.log(`- Déjà existant : ${m.name} (${email})`);
        continue;
      }
      await auth.createUser({ email, password: m.password, displayName: m.name });
      console.log(`+ Compte créé : ${m.name} (${email} / ${m.password})`);
    } catch (e) {
      console.error(`! Erreur pour ${m.name} :`, e.message);
    }
  }
}

async function seedActions() {
  const missions = await loadMissions();
  const batch = db.batch();
  let count = 0;
  missions.forEach(m => m.actions.forEach(a => {
    const ref = db.collection('actions').doc(`${m.id}__${a.id}`);
    batch.set(ref, {
      indicateurs: a.indicateurs.map(() => false),
      livrables: a.livrables.map(() => false),
      remarque: '',
      updatedBy: '',
      updatedAt: null,
    }, { merge: true });
    count++;
  }));
  await batch.commit();
  console.log(`+ ${count} actions initialisées dans Firestore.`);
}

async function seedEvents() {
  const existing = await db.collection('events').limit(1).get();
  if (!existing.empty) { console.log('- Des événements existent déjà, aucun ajouté.'); return; }
  const today = new Date();
  const in5 = new Date(today); in5.setDate(in5.getDate() + 5);
  const in12 = new Date(today); in12.setDate(in12.getDate() + 12);
  await db.collection('events').add({
    title: "Soirée de formation — Diabète", date: in5.toISOString().slice(0,10), time: '19:00',
    description: "À destination de tous les professionnels de santé du territoire.",
    createdBy: 'Mathilde Moysan', createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection('events').add({
    title: "Réunion de concertation — Ménopause", date: in12.toISOString().slice(0,10), time: '18:30',
    description: "Réunion pluriprofessionnelle de partage d'expériences.",
    createdBy: 'Dr Olivier Barclay', createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('+ 2 événements de démarrage ajoutés.');
}

(async () => {
  console.log('=== Création des comptes ===');
  await seedMembers();
  console.log('\n=== Initialisation des missions/actions ===');
  await seedActions();
  console.log('\n=== Initialisation de l\'agenda ===');
  await seedEvents();
  console.log('\nTerminé. Transmettez à chaque membre son identifiant (prénom) et son mot de passe ci-dessus.');
  process.exit(0);
})();
