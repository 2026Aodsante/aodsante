// ════════════════════════════════════════════════
// Configuration Firebase — à remplacer par la config
// récupérée dans la console Firebase (Paramètres du
// projet > Vos applications > Web).
//
// Tant que ces valeurs restent "REPLACE_ME", l'application
// fonctionne automatiquement en MODE DÉMO (données stockées
// uniquement dans ce navigateur, non partagées).
// ════════════════════════════════════════════════
export const firebaseConfig = {
  apiKey: "AIzaSyCy5a6Kd1LC4ALLJfSptRvxWJU_GuGT2G8",
  authDomain: "gestion-cpts-dbmb.firebaseapp.com",
  projectId: "gestion-cpts-dbmb",
  storageBucket: "gestion-cpts-dbmb.firebasestorage.app",
  messagingSenderId: "650015178405",
  appId: "1:650015178405:web:0ff4296231e5d23ffe574c",
};

export const isFirebaseConfigured = firebaseConfig.apiKey !== "REPLACE_ME";
