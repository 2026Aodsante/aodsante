# ════════════════════════════════════════════════
# Vérifie les comptes Firebase Authentication et sauvegarde
# l'état actuel de Firestore (actions + agenda) dans un fichier JSON local.
# ════════════════════════════════════════════════
import os
import json
import datetime
import firebase_admin
from firebase_admin import credentials, auth, firestore

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cred = credentials.Certificate(os.path.join(BASE_DIR, "serviceAccountKey.json"))
firebase_admin.initialize_app(cred)
db = firestore.client()

EXPECTED_IDS = [
    "patrick", "samia", "olivier", "malika.kemache", "frederic", "fatima",
    "lounes", "sabrina", "solene", "celia", "sighane", "francine",
    "malika.mouchon", "mathilde",
]
EMAIL_DOMAIN = "@cptsdbmb.local"

print("=== Vérification des comptes Authentication ===")
found = {}
for user in auth.list_users().iterate_all():
    found[user.email] = user.display_name

missing = []
for member_id in EXPECTED_IDS:
    email = member_id + EMAIL_DOMAIN
    if email in found:
        print(f"OK   {found[email]:35s} ({email})")
    else:
        missing.append(email)
        print(f"MANQUANT  {email}")

extra = [e for e in found if e not in [m + EMAIL_DOMAIN for m in EXPECTED_IDS]]
if extra:
    print("\nComptes supplémentaires inattendus :", extra)

print(f"\n{len(found)} comptes trouvés / {len(EXPECTED_IDS)} attendus. Manquants : {len(missing)}")

# ─── Sauvegarde Firestore ───────────────────────
backup = {
    "generated_at": datetime.datetime.now().isoformat(),
    "actions": {},
    "events": [],
}

for doc in db.collection("actions").stream():
    backup["actions"][doc.id] = doc.to_dict()

for doc in db.collection("events").stream():
    d = doc.to_dict()
    d["id"] = doc.id
    # serverTimestamp -> string pour être sérialisable en JSON
    if d.get("createdAt") is not None:
        d["createdAt"] = str(d["createdAt"])
    backup["events"].append(d)

backup_dir = os.path.join(BASE_DIR, "seed", "backups")
os.makedirs(backup_dir, exist_ok=True)
stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
backup_path = os.path.join(backup_dir, f"backup_{stamp}.json")
with open(backup_path, "w", encoding="utf-8") as f:
    json.dump(backup, f, ensure_ascii=False, indent=2, default=str)

print(f"\nSauvegarde écrite dans : {backup_path}")
print(f"  {len(backup['actions'])} actions, {len(backup['events'])} événements")
