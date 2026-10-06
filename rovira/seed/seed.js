// ════════════════════════════════════════════════
// Script de seed — à exécuter UNE SEULE FOIS depuis un ordinateur,
// jamais depuis le site lui-même (utilise une clé d'administration).
//
// Ce script :
//  1. Crée un compte Firebase Authentication pour chaque membre de data.js
//     (identifiant "prenom@cptsrovira.local" + mot de passe aléatoire)
//     Les mots de passe sont lus dans "passwords.local.json" (jamais committé,
//     voir .gitignore) ; à défaut, un mot de passe aléatoire est généré et
//  2. ajouté à "passwords.local.txt" pour le transmettre au membre
//  3. Initialise les documents Firestore des missions/actions et un
//     agenda de démarrage (mêmes données que le mode démo)
//
// Utilisation :
//   1. Déposer le fichier de clé de service (Firebase > Paramètres du
//      projet > Comptes de service > Générer une nouvelle clé privée)
//      sous le nom "serviceAccountKey.json" dans le dossier rovira/
//   2. npm install firebase-admin   (dans ce dossier rovira/seed)
//   3. node seed.js
// ════════════════════════════════════════════════
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const auth = admin.auth();
const db = admin.firestore();

const EMAIL_DOMAIN = '@cptsrovira.local';
const PASSWORDS_FILE = path.join(__dirname, 'passwords.local.txt');
const PRESET_FILE = path.join(__dirname, 'passwords.local.json');
const PRESET = fs.existsSync(PRESET_FILE) ? JSON.parse(fs.readFileSync(PRESET_FILE, 'utf8')) : {};

function randomPassword() {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 10) + '!';
}

async function loadMembers() {
  const mod = await import('../data.js');
  return mod.MEMBERS;
}

// Chargé depuis rovira/data.js (module ES) pour rester en phase avec l'application.
async function loadMissions() {
  const mod = await import('../data.js');
  return mod.MISSIONS;
}

async function seedMembers() {
  const members = await loadMembers();
  const created = [];
  for (const m of members) {
    const email = m.id + EMAIL_DOMAIN;
    try {
      const existing = await auth.getUserByEmail(email).catch(() => null);
      if (existing) {
        console.log(`- Déjà existant : ${m.name} (${email})`);
        continue;
      }
      const password = PRESET[m.id] || randomPassword();
      await auth.createUser({ email, password, displayName: m.name });
      created.push(`${m.name}	identifiant : ${m.id}	mot de passe : ${password}`);
      console.log(`+ Compte créé : ${m.name} (${email})`);
    } catch (e) {
      console.error(`! Erreur pour ${m.name} :`, e.message);
    }
  }
  if (created.length) {
    fs.appendFileSync(PASSWORDS_FILE, created.join('
') + '
');
    console.log(`Mots de passe enregistrés dans ${PASSWORDS_FILE}`);
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
  await db.collection('events').add({
    title: "Soirée visio KBP — Mois sans tabac", date: '2026-11-06', time: '19:30',
    description: "Soirée en visio (19h30-20h) dans le cadre du Mois sans tabac. Replay prévu.",
    createdBy: 'Mathilde Moysan', createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('+ 1 événement de démarrage ajouté.');
}

(async () => {
  console.log('=== Création des comptes ===');
  await seedMembers();
  console.log('\n=== Initialisation des missions/actions ===');
  await seedActions();
  console.log('\n=== Initialisation de l\'agenda ===');
  await seedEvents();
  console.log('\nTerminé. Transmettez à chaque membre son identifiant (prénom) et son mot de passe (voir passwords.local.txt).');
  process.exit(0);
})();
