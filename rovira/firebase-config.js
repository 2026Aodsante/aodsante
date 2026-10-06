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
  apiKey: "AIzaSyC-AYVMiNhSWlOr7XwFfJU_2EAr5_SYVSw",
  authDomain: "gestion-cpts-rovira.firebaseapp.com",
  projectId: "gestion-cpts-rovira",
  storageBucket: "gestion-cpts-rovira.firebasestorage.app",
  messagingSenderId: "215311133636",
  appId: "1:215311133636:web:0e8187fa650ebf81cdd291",
};

export const isFirebaseConfigured = firebaseConfig.apiKey !== "REPLACE_ME";
