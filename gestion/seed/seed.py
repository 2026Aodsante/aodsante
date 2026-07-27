# ════════════════════════════════════════════════
# Script de seed (Python, équivalent de seed.js) — à exécuter UNE SEULE FOIS.
# Crée les 14 comptes Firebase Authentication + initialise Firestore.
# Utilise gestion/serviceAccountKey.json (jamais committé, voir .gitignore).
# ════════════════════════════════════════════════
import os
import firebase_admin
from firebase_admin import credentials, auth, firestore

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cred = credentials.Certificate(os.path.join(BASE_DIR, "serviceAccountKey.json"))
firebase_admin.initialize_app(cred)
db = firestore.client()

EMAIL_DOMAIN = "@cptsdbmb.local"

MEMBERS = [
    ("patrick",        "Dr Patrick Laugareil",       "Patrick2026!"),
    ("samia",          "Dr Samia Ben Ayad-Beloufa",  "Samia2026!"),
    ("olivier",        "Dr Olivier Barclay",          "Olivier2026!"),
    ("malika.kemache", "Malika Kemache",              "MalikaK2026!"),
    ("frederic",       "Frédéric Mourad",             "Frederic2026!"),
    ("fatima",         "Dr Fatima Bargui",            "Fatima2026!"),
    ("lounes",         "Lounès Kemmache",             "Lounes2026!"),
    ("sabrina",        "Sabrina Ben Ayad",            "Sabrina2026!"),
    ("solene",         "Solène Dias",                 "Solene2026!"),
    ("celia",          "Célia Vilus",                 "Celia2026!"),
    ("sighane",        "Sighane Diop",                "Sighane2026!"),
    ("francine",       "Francine Braflan",            "Francine2026!"),
    ("malika.mouchon", "Malika Mouchon",              "MalikaM2026!"),
    ("mathilde",       "Mathilde Moysan",             "Mathilde2026!"),
]

# (missionId, actionId, nb_indicateurs, nb_livrables) — doit rester en phase avec gestion/data.js
ACTIONS = [
    ("acces-soins", "medecin-traitant", 6, 7),
    ("acces-soins", "snp-sas", 3, 5),
    ("acces-soins", "telemedecine", 2, 6),
    ("parcours-patient", "parcours-cardio", 4, 5),
    ("parcours-patient", "parcours-sante-mentale", 2, 6),
    ("parcours-patient", "parcours-sorties-hospit", 2, 4),
    ("prevention", "depistage-cancers", 4, 5),
    ("prevention", "journees-prevention", 3, 4),
    ("crise-sanitaire", "plan-crise", 2, 3),
    ("qualite-soins", "reunions-concertation", 1, 3),
    ("qualite-soins", "soirees-formation", 2, 4),
    ("accompagnement-ps", "securite-soignants", 2, 6),
    ("accompagnement-ps", "accueil-stagiaires", 2, 4),
    ("accompagnement-ps", "aide-installation", 2, 4),
]


def seed_members():
    print("=== Création des comptes ===")
    for member_id, name, password in MEMBERS:
        email = member_id + EMAIL_DOMAIN
        try:
            existing = auth.get_user_by_email(email)
            print(f"- Déjà existant : {name} ({email})")
        except auth.UserNotFoundError:
            auth.create_user(email=email, password=password, display_name=name)
            print(f"+ Compte créé : {name} ({email} / {password})")


def seed_actions():
    print("\n=== Initialisation des missions/actions ===")
    batch = db.batch()
    for mission_id, action_id, n_ind, n_liv in ACTIONS:
        ref = db.collection("actions").document(f"{mission_id}__{action_id}")
        batch.set(ref, {
            "indicateurs": [False] * n_ind,
            "livrables": [False] * n_liv,
            "remarque": "",
            "updatedBy": "",
            "updatedAt": None,
        }, merge=True)
    batch.commit()
    print(f"+ {len(ACTIONS)} actions initialisées dans Firestore.")


def seed_events():
    print("\n=== Initialisation de l'agenda ===")
    existing = list(db.collection("events").limit(1).stream())
    if existing:
        print("- Des événements existent déjà, aucun ajouté.")
        return
    import datetime
    today = datetime.date.today()
    in5 = today + datetime.timedelta(days=5)
    in12 = today + datetime.timedelta(days=12)
    db.collection("events").add({
        "title": "Soirée de formation — Diabète", "date": in5.isoformat(), "time": "19:00",
        "description": "À destination de tous les professionnels de santé du territoire.",
        "createdBy": "Mathilde Moysan", "createdAt": firestore.SERVER_TIMESTAMP,
    })
    db.collection("events").add({
        "title": "Réunion de concertation — Ménopause", "date": in12.isoformat(), "time": "18:30",
        "description": "Réunion pluriprofessionnelle de partage d'expériences.",
        "createdBy": "Dr Olivier Barclay", "createdAt": firestore.SERVER_TIMESTAMP,
    })
    print("+ 2 événements de démarrage ajoutés.")


if __name__ == "__main__":
    seed_members()
    seed_actions()
    seed_events()
    print("\nTerminé. Transmettez à chaque membre son identifiant (prénom) et son mot de passe ci-dessus.")
