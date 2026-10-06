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
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

export const isFirebaseConfigured = firebaseConfig.apiKey !== "REPLACE_ME";
