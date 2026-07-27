// ════════════════════════════════════════════════
// Données de référence — CPTS Drancy / Le Blanc-Mesnil / Le Bourget
// Membres (organigramme) et missions ACI (Annexe indicateurs, Année 5)
// ════════════════════════════════════════════════

// Chaque membre se connecte avec un identifiant simple + mot de passe.
// L'identifiant correspond à un compte Firebase Auth "prenom@cptsdbmb.local".
export const MEMBERS = [
  { id: "patrick",        name: "Dr Patrick Laugareil",        role: "Président — Radiologue",                                   groupe: "Gouvernance" },
  { id: "samia",          name: "Dr Samia Ben Ayad-Beloufa",   role: "Vice-Présidente — Médecin généraliste",                    groupe: "Gouvernance" },
  { id: "olivier",        name: "Dr Olivier Barclay",           role: "Secrétaire général — Médecin généraliste",                 groupe: "Gouvernance" },
  { id: "malika.kemache", name: "Malika Kemache",                role: "Trésorière adjointe — Directrice administrative CMS/PMI",  groupe: "Gouvernance" },
  { id: "frederic",       name: "Frédéric Mourad",               role: "Trésorier — Directeur de structure",                       groupe: "Gouvernance" },
  { id: "fatima",         name: "Dr Fatima Bargui",              role: "Membre du bureau — Médecin généraliste",                   groupe: "Gouvernance" },
  { id: "lounes",         name: "Lounès Kemmache",               role: "Coordinateur principal — IDEL",                            groupe: "Coordination terrain" },
  { id: "sabrina",        name: "Sabrina Ben Ayad",              role: "Assistante médicale — axe « médecin traitant »",           groupe: "Coordination terrain" },
  { id: "solene",         name: "Solène Dias",                   role: "Coordinatrice terrain — IDEL",                             groupe: "Coordination terrain" },
  { id: "celia",          name: "Célia Vilus",                    role: "Coordinatrice terrain — IDEL",                             groupe: "Coordination terrain" },
  { id: "sighane",        name: "Sighane Diop",                  role: "Coordinatrice terrain — IDEL",                             groupe: "Coordination terrain" },
  { id: "francine",       name: "Francine Braflan",               role: "Coordinatrice terrain — IDEL",                             groupe: "Coordination terrain" },
  { id: "malika.mouchon", name: "Malika Mouchon",                 role: "ESOX Gestion — gestion courante",                          groupe: "Prestataires" },
  { id: "mathilde",       name: "Mathilde Moysan",                role: "AOD Santé — conseil stratégique et développement MSP",     groupe: "Prestataires" },
];

// id -> objet membre (pratique pour l'affichage)
export const MEMBERS_BY_ID = Object.fromEntries(MEMBERS.map(m => [m.id, m]));

// Les 6 missions du contrat ACI (5ème année de fonctionnement, 19/12/2025-19/12/2026).
// Chaque action a des indicateurs (objectifs chiffrés) et des livrables (preuves/documents
// attendus) : chaque élément est cochable indépendamment, plus une remarque libre.
// L'ensemble est stocké/synchronisé dans Firestore (collection "actions").
export const MISSIONS = [
  {
    id: "acces-soins",
    type: "obligatoire",
    titre: "Favoriser l'accès aux soins",
    budget: "125 000 €",
    budgetFixe: "90 000 €",
    budgetVariable: "35 000 €",
    actions: [
      {
        id: "medecin-traitant",
        titre: "Faciliter l'accès à un médecin traitant",
        referents: ["sabrina", "malika.kemache", "lounes"],
        indicateurs: [
          "Atteindre 20 patients en ALD sans médecin traitant (soit -146 vs 166 initial)",
          "Atteindre 1 331 patients de +16 ans sans MT (soit -3 000)",
          "Atteindre 12 patients C2S en ALD sans MT (soit -60 vs 72 initial)",
          "Atteindre 200 patients de +70 ans sans MT (soit -290 vs 490 initial)",
          "Maintenir le dispositif de partenariat avec la CPAM",
          "Répondre aux demandes du guichet unique sous 30 à 90 jours",
        ],
        livrables: [
          "Données de requêtes locales CPAM transmises",
          "Adresse mail et n° d'appel dédiés, personne ressource identifiée",
          "Bilan de suivi régulier du partenariat CPAM",
          "Circuit et protocole de priorisation du guichet unique formalisés par écrit",
          "Recrutement d'une assistante médicale dédiée (contrat, fiche de poste)",
          "Suivi nominatif et bilan du dispositif guichet unique",
          "Recensement du nombre de médecins participants",
        ],
      },
      {
        id: "snp-sas",
        titre: "Accès aux soins non programmés (SAS 93)",
        referents: ["lounes", "sabrina", "malika.kemache"],
        indicateurs: [
          "Organisation complémentaire au SAS mise en place au sein de la CPTS",
          "Augmenter le nombre de médecins de la CPTS participant au SAS",
          "Suivre le nombre de RDV donnés et honorés",
        ],
        livrables: [
          "Circuit et organisation formalisés par écrit",
          "Recrutement d'une assistante médicale dédiée (contrat, fiche de poste)",
          "Document de suivi nominatif et bilan (type de demande, orientation, délais)",
          "Document de recensement des médecins participants",
          "Suivi du nombre de créneaux ouverts et des RDV honorés/non honorés",
        ],
      },
      {
        id: "telemedecine",
        titre: "Développer téléconsultation et télémédecine",
        referents: ["solene", "samia", "lounes"],
        indicateurs: [
          "Déployer des créneaux dédiés de téléconsultation pour personnes âgées/isolées",
          "Promouvoir l'outil Direct AP-HP auprès des professionnels du territoire",
        ],
        livrables: [
          "Protocoles d'utilisation des outils de téléconsultation formalisés par écrit",
          "Justificatifs des créneaux réservés par professionnel de santé",
          "Bilan du dispositif (nominatif, types de demandes, PS concernés)",
          "Justificatif des opérations de communication vers l'ensemble des PS",
          "Cas d'usage et circuit d'accès à Direct AP-HP formalisés",
          "Bilan du recours à l'outil Direct AP-HP",
        ],
      },
    ],
  },
  {
    id: "parcours-patient",
    type: "obligatoire",
    titre: "Parcours pluriprofessionnels autour du patient",
    budget: "90 000 €",
    budgetFixe: "45 000 €",
    budgetVariable: "45 000 €",
    actions: [
      {
        id: "parcours-cardio",
        titre: "Parcours Cardio-Respiratoire",
        referents: ["patrick"],
        indicateurs: [
          "Atteindre 100 patients intégrés au parcours cardio-respiratoire",
          "Réaliser 75 dépistages LDCT chez les fumeurs éligibles (50-80 ans, ≥20 paquets-années)",
          "Réaliser 70 orientations vers la tabacologie",
          "Améliorer le suivi coordonné (délais < 30 jours pour orientations prioritaires)",
        ],
        livrables: [
          "Parcours détaillé, circuits et fiches réflexes formalisés par écrit",
          "Annuaire des différents acteurs constitué",
          "Recensement des acteurs participants par catégorie",
          "Document et bilan des opérations de communication",
          "Bilan quantitatif et qualitatif complet du parcours",
        ],
      },
      {
        id: "parcours-sante-mentale",
        titre: "Parcours Santé Mentale",
        referents: ["olivier"],
        indicateurs: [
          "Réduire les délais d'accès au psychiatre",
          "Développer un parcours addictologie sur le territoire",
        ],
        livrables: [
          "Annuaire des professionnels de santé créé",
          "Parcours facilitant les orientations formalisé",
          "Formation des PS à l'écoute active réalisée",
          "Mise en place de consultations dédiées",
          "Communication réalisée auprès de l'ensemble des PS",
          "Bilan complet (nombre de PS impliqués, patients pris en charge, délais)",
        ],
      },
      {
        id: "parcours-sorties-hospit",
        titre: "Parcours sorties d'hospitalisation, fragilité, VAD",
        referents: ["olivier", "lounes"],
        indicateurs: [
          "Mettre en place un binôme médecin/IDE pour les VAD",
          "Disposer d'un véhicule dédié",
        ],
        livrables: [
          "Parcours écrit du dispositif VAD élaboré (contexte, rôles, circuit)",
          "Outils créés (document d'évaluation, recueil de données, compte rendu)",
          "Convention de mise à disposition du véhicule élaborée",
          "Bilan quantitatif et qualitatif détaillé (participants, patients bénéficiaires, délais, affectations MT)",
        ],
      },
    ],
  },
  {
    id: "prevention",
    type: "obligatoire",
    titre: "Développement d'actions coordonnées de prévention",
    budget: "35 000 €",
    budgetFixe: "17 500 €",
    budgetVariable: "17 500 €",
    actions: [
      {
        id: "depistage-cancers",
        titre: "Augmentation des dépistages des cancers",
        referents: ["sighane"],
        indicateurs: [
          "Dépistage cancer du sein : atteindre 69% (+1 075 patientes vs 62,89% initial)",
          "Dépistage cancer du col de l'utérus : atteindre 64% (+1 500 patientes vs 60,48% initial)",
          "Dépistage cancer colorectal : atteindre 21,50% (+1 160 patients vs 18,53% initial)",
          "Augmenter le nombre de créneaux dédiés aux dispositifs",
        ],
        livrables: [
          "Promotion du dispositif 100% Mammographie réalisée",
          "Intégration et mobilisation des professionnels au dispositif 100% Frottis",
          "Promotion du dépistage colorectal auprès des femmes éligibles, PS et grand public",
          "Participation au partenariat proposé par la CPAM (100% Colo)",
          "Bilan d'opération formalisé, supports d'information, convention signée",
        ],
      },
      {
        id: "journees-prevention",
        titre: "Actions collectives de prévention",
        referents: ["sighane", "francine"],
        indicateurs: [
          "Organiser 4 journées de sensibilisation (communauté Tamoule, anti-tabac, ménopause, santé de la femme)",
          "Atteindre 800 participants cumulés et plus",
          "Atteindre 250 orientations et plus",
        ],
        livrables: [
          "Déroulé et supports de chaque journée créés",
          "Calendrier des journées formalisé",
          "Feuilles d'émargement des participants",
          "Bilans écrits et bilan de satisfaction (acteurs et population)",
        ],
      },
    ],
  },
  {
    id: "crise-sanitaire",
    type: "obligatoire",
    titre: "Réponse aux crises sanitaires graves",
    budget: "22 500 €",
    budgetFixe: "22 500 €",
    budgetVariable: "67 500 € si crise reconnue par l'ARS",
    actions: [
      {
        id: "plan-crise",
        titre: "Plan d'action gestion de crise",
        referents: ["patrick", "olivier"],
        indicateurs: [
          "Reconnaissance par l'ARS d'une situation de crise grave (le cas échéant)",
          "Mise en œuvre effective du plan d'action en cas de crise",
        ],
        livrables: [
          "Plan d'action rédigé conforme à la trame nationale (référent SSE, lieu cellule de crise, actions à mener)",
          "Plan d'action mis à jour avec dates de révision",
          "Documents justifiant la mise en œuvre du plan (nombre de PS participants, nombre d'actions)",
        ],
      },
    ],
  },
  {
    id: "qualite-soins",
    type: "complementaire",
    titre: "Qualité et pertinence des soins",
    budget: "30 000 €",
    budgetFixe: "15 000 €",
    budgetVariable: "15 000 €",
    actions: [
      {
        id: "reunions-concertation",
        titre: "Réunions de partage d'expériences pluriprofessionnelles",
        referents: ["samia", "olivier"],
        indicateurs: [
          "Organiser 3 réunions pluriprofessionnelles (obésité, ménopause, gynécologie)",
        ],
        livrables: [
          "Ordre du jour et supports de réunion créés",
          "Feuille d'émargement de chaque réunion",
          "Compte rendu et bilan/évaluation de chaque réunion",
        ],
      },
      {
        id: "soirees-formation",
        titre: "Soirées de formations thématiques",
        referents: ["samia", "olivier"],
        indicateurs: [
          "Organiser 4 soirées de formation (écoute active/entretien motivationnel, diabète...)",
          "Minimum 15 participants par soirée",
        ],
        livrables: [
          "Support de déroulé préparé en amont pour chaque soirée",
          "Supports de présentation créés",
          "Feuilles d'émargement",
          "Compte rendu et bilan de satisfaction de chaque soirée",
        ],
      },
    ],
  },
  {
    id: "accompagnement-ps",
    type: "complementaire",
    titre: "Accompagnement des professionnels de santé",
    budget: "20 000 €",
    budgetFixe: "10 000 €",
    budgetVariable: "10 000 €",
    actions: [
      {
        id: "securite-soignants",
        titre: "Sécuriser les conditions d'exercice (Mon Shérif)",
        referents: ["sighane"],
        indicateurs: [
          "Doter au minimum 40 soignants d'un bouton d'urgence",
          "Former 100% des bénéficiaires",
        ],
        livrables: [
          "Recensement des bénéficiaires prioritaires",
          "Support de formation créé",
          "Procédures et circuit d'utilisation formalisés",
          "Justificatif d'achat des boutons",
          "Émargement de la réunion de formation",
          "Bilan de satisfaction et d'utilisation",
        ],
      },
      {
        id: "accueil-stagiaires",
        titre: "Améliorer l'accueil des stagiaires",
        referents: ["olivier"],
        indicateurs: [
          "Augmenter le nombre de terrains de stage et de tuteurs actifs (MSU, référents ESI)",
          "Uniformiser les pratiques d'accueil",
        ],
        livrables: [
          "Livrets d'accueil, grilles d'objectifs et évaluations créés",
          "Outils de mise en relation stagiaires / lieux d'installation créés",
          "Documents justifiant les actions pour augmenter le nombre de maîtres de stage",
          "Suivi du nombre de maîtres de stage et de stagiaires",
        ],
      },
      {
        id: "aide-installation",
        titre: "Aide à l'installation de nouveaux professionnels",
        referents: ["mathilde", "patrick"],
        indicateurs: [
          "Mettre en place un guichet unique d'aide à l'installation",
          "Accompagner les projets de création de MSP / regroupement de PS",
        ],
        livrables: [
          "Missions des différents acteurs formalisées",
          "Partenariats avec les acteurs des 3 communes formalisés",
          "Documents d'aide à l'installation créés",
          "Suivi et bilan des PS / cabinets / MSP accompagnés",
        ],
      },
    ],
  },
];
