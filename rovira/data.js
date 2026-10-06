// ════════════════════════════════════════════════
// Données de référence — CPTS RoViRa (Rosny-sous-Bois / Villemomble / Le Raincy)
// Membres (organigramme) et missions ACI (Annexe indicateurs, Année 5)
// ════════════════════════════════════════════════

// Chaque membre se connecte avec un identifiant simple + mot de passe.
// L'identifiant correspond à un compte Firebase Auth "prenom@cptsrovira.local".
export const MEMBERS = [
  { id: "stephane", name: "Stéphane Vigne",    role: "Président",                                            groupe: "Gouvernance" },
  { id: "patrick",  name: "Patrick Laugareil", role: "Membre de l'équipe",                                   groupe: "Gouvernance" },
  { id: "audrey",   name: "Audrey Attia",      role: "Membre de l'équipe",                                   groupe: "Coordination" },
  { id: "matthias", name: "Matthias Micaelli", role: "Membre de l'équipe",                                   groupe: "Coordination" },
  { id: "benjamin", name: "Benjamin Micaelli", role: "Membre de l'équipe",                                   groupe: "Coordination" },
  { id: "malika",   name: "Malika Mouchon",    role: "ESOX Gestion — gestion courante",                      groupe: "Prestataires" },
  { id: "mathilde", name: "Mathilde Moysan",   role: "AOD Santé — accompagnement managérial et pilotage ACI", groupe: "Prestataires" },
];

// id -> objet membre (pratique pour l'affichage)
export const MEMBERS_BY_ID = Object.fromEntries(MEMBERS.map(m => [m.id, m]));

// Les 6 missions du contrat ACI (5ème année de fonctionnement, 15/04/2026-14/04/2027).
// Chaque action a des indicateurs (une ligne par ligne de l'ACI, avec son montant
// variable ; valeur = montant max en €, null si hors part variable) et des livrables (preuves/documents
// attendus) : chaque élément est cochable indépendamment, plus une remarque libre.
// L'ensemble est stocké/synchronisé dans Firestore (collection "actions").
// Les référents sont à attribuer une fois la liste des membres complétée.
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
        referents: [],
        indicateurs: [
          { texte: "Patients en ALD sans MT (initial 219) : 50 et moins → 9 000 € · 100 à 51 → 6 000 € · 219 à 101 → 3 000 €", montant: "jusqu'à 9 000 €", valeur: 9000 },
          { texte: "Atteindre 68 811 patients de +16 ans avec un MT (soit +700 vs 66 111 initial)", montant: "5 000 €", valeur: 5000 },
          { texte: "Arriver à 6 patients C2S en ALD sans MT (soit -10 vs 16 initial)", montant: "3 000 €", valeur: 3000 },
          { texte: "Atteindre 203 patients de +70 ans sans MT (soit -100 vs 303 initial)", montant: "5 000 €", valeur: 5000 },
          { texte: "Maintenir le partenariat en place avec la CPAM", montant: "2 000 €", valeur: 2000 },
          { texte: "Recenser les médecins volontaires, suivre l'évolution du nombre de médecins participants et de patients pris en charge par médecin", montant: "3 000 €", valeur: 3000 },
        ],
        livrables: [
          "Données issues de requêtes locales CPAM",
          "Adresse mail et n° d'appel dédiés, personne ressource identifiée",
          "Bilan de suivi régulier, remontée de l'activité du partenariat CPAM",
          "Recensement des médecins volontaires pour l'action",
          "Document de suivi du nombre de médecins participants et du nombre de patients supplémentaires par médecin",
        ],
      },
      {
        id: "annuaire-offre-soins",
        titre: "Lisibilité de l'offre de soins et orientation (annuaire)",
        referents: [],
        indicateurs: [
          { texte: "Annuaire : recensement formalisé (PS, structures sanitaires et médico-sociales, dispositifs spécifiques), version numérique en ligne sur le site CPTS, diffusion à l'ensemble des acteurs du territoire", montant: "5 000 €", valeur: 5000 },
        ],
        livrables: [
          "Document formalisant le recensement effectué",
          "Lien d'accès à la version numérique de l'annuaire",
          "Justificatifs des opérations de diffusion (mailings, réunions, supports CPTS)",
        ],
      },
      {
        id: "snp-sas",
        titre: "Accès aux soins non programmés — participation au SAS",
        referents: [],
        indicateurs: [
          { texte: "Recenser les médecins participant au SAS, promouvoir le dispositif et suivre le nombre de sollicitations", montant: "3 000 €", valeur: 3000 },
        ],
        livrables: [
          "Documents de recensement des médecins participant au SAS",
          "Nombre de médecins participant au SAS",
          "Nombre de RDV honorés et non honorés",
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
        id: "parcours-diabete",
        titre: "Parcours diabète — finalisation et mise en œuvre (indicateurs non atteints en N-1)",
        referents: [],
        indicateurs: [
          { texte: "Recensement des PS intervenant dans la prise en charge du diabète effectué, actualisé et formalisé", montant: "2 000 €", valeur: 2000 },
          { texte: "Parcours diabète type 1 élaboré, diffusé, expliqué aux PS et mis en œuvre, bilan d'utilisation", montant: "3 000 €", valeur: 3000 },
          { texte: "Mise en œuvre effective du parcours diabète type 2, bilan d'utilisation", montant: "2 000 €", valeur: 2000 },
          { texte: "Bilans de l'apport des parcours type 1 et type 2 (bilans initiaux, finaux, bilan général)", montant: "2 000 €", valeur: 2000 },
          { texte: "Organiser une demi-journée « prévention diabète » avec bilan", montant: "5 000 €", valeur: 5000 },
          { texte: "Organiser une soirée annuelle pluriprofessionnelle", montant: "3 000 €", valeur: 3000 },
          { texte: "Organiser 3 réunions pluriprofessionnelles de suivi du parcours", montant: "3 000 €", valeur: 3000 },
        ],
        livrables: [
          "Résultat du recensement des PS",
          "Exemplaires des parcours type 1 et type 2 élaborés",
          "Justificatifs des actions de diffusion, communication, présentation",
          "Évaluation de l'utilisation du protocole (PS impliqués, patients pris en charge, suivi, satisfaction)",
          "Documents évaluant l'apport des parcours : bilans initiaux, bilans finaux, bilan général",
          "Demi-journée prévention : calendrier, déroulé, émargement, supports, nombre de patients informés/dépistés/orientés",
          "Soirée annuelle : date, déroulé, supports, émargement, bilan et évaluation",
          "Réunions de suivi : calendrier, émargement, CR et suivi des observations",
        ],
      },
      {
        id: "parcours-obesite",
        titre: "Parcours obésité — année 3 mise en œuvre (indicateurs non atteints en N-1)",
        referents: [],
        indicateurs: [
          { texte: "Parcours diffusé, expliqué aux PS et mis en œuvre, bilan quantitatif et qualitatif", montant: "5 000 €", valeur: 5000 },
          { texte: "Déployer le projet GPSObésité avec le réseau ROMDES : projet écrit, 10 patients recrutés, bilans initiaux", montant: "2 000 €", valeur: 2000 },
          { texte: "Organiser 8 ateliers, bilans finaux individuels et bilan général", montant: "4 000 €", valeur: 4000 },
          { texte: "Organiser une soirée thématique éducation à l'alimentation / troubles alimentaires", montant: "3 000 €", valeur: 3000 },
        ],
        livrables: [
          "Modalités de diffusion aux PS et évaluation de l'utilisation du parcours",
          "Nombre de PS impliqués, patients orientés, suivis, orientés vers l'hôpital",
          "Projet GPSObésité écrit, PS participants (nom et catégorie), bilans initiaux",
          "Ateliers : calendrier, déroulé, participants (PS et patients), bilans finaux, bilan général",
          "Soirée thématique : date, déroulé, supports, émargement, bilan et évaluation",
        ],
      },
      {
        id: "parcours-cancer-poumon",
        titre: "Parcours dépistage du cancer du poumon — année 2 (indicateurs non atteints en N-1)",
        referents: [],
        indicateurs: [
          { texte: "Parcours de dépistage, prévention et suivi défini, formalisé et diffusé ; conventions partenariales formalisées", montant: "5 000 €", valeur: 5000 },
          { texte: "Mise en œuvre effective du parcours, bilan de suivi quantitatif et qualitatif", montant: "2 000 €", valeur: 2000 },
          { texte: "Soirée annuelle pluriprofessionnelle (recommandations, scanner faible dose, parcours coordonné)", montant: "2 000 €", valeur: 2000 },
          { texte: "Demi-journée annuelle de dépistage et de sensibilisation ouverte à la population", montant: "2 000 €", valeur: 2000 },
        ],
        livrables: [
          "Exemplaire du parcours élaboré et modalités de diffusion aux PS",
          "Évaluation de l'utilisation du parcours",
          "Nombre de PS impliqués, patients dépistés, ayant eu recours au scanner, orientés pour un suivi",
          "Soirée : calendrier, déroulé, émargement, supports, bilan et satisfaction",
          "Demi-journée : calendrier, déroulé, émargement, supports, nombre de patients informés/dépistés/orientés",
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
        referents: [],
        indicateurs: [
          { texte: "Cancer du sein (initial 66,26 %) : socle 69,70 % → 1 000 € · intermédiaire 72,40 % → 2 500 € · objectif 75 % (8 613 patientes) → 3 500 €", montant: "jusqu'à 3 500 €", valeur: 3500 },
          { texte: "Cancer du col de l'utérus (initial 64,08 %) : socle 66,70 % → 1 000 € · intermédiaire 67,45 % → 2 500 € · objectif 68,20 % (18 216 patientes) → 3 500 €", montant: "jusqu'à 3 500 €", valeur: 3500 },
          { texte: "Cancer colorectal (initial 23,50 %) : socle 25 % → 1 000 € · intermédiaire 26,10 % → 2 500 € · objectif 27 % (6 205 patients) → 3 500 €", montant: "jusqu'à 3 500 €", valeur: 3500 },
          { texte: "Participer au dispositif d'amélioration du dépistage colorectal avec la CPAM (convention signée, évaluation)", montant: "500 €", valeur: 500 },
        ],
        livrables: [
          "Données statistiques CPAM",
          "Convention CPAM/CPTS signée",
          "Suivi partenarial CPAM / CPTS",
          "Documents de recensement des données d'évaluation",
        ],
      },
      {
        id: "juin-vert",
        titre: "Action en faveur des dépistages des cancers — Juin Vert",
        referents: [],
        indicateurs: [
          { texte: "Juin Vert : journées de frottis sans RDV sur les 3 communes, sensibilisation dépistage et vaccination HPV en pharmacie, supports diffusés aux PS et au grand public", montant: "1 000 €", valeur: 1000 },
        ],
        livrables: [
          "Calendrier des journées organisées",
          "Nombre de PS et structures participants, nombre de patients bénéficiaires",
          "Évaluations",
          "Exemplaires des supports d'information",
          "Document et opération de communication (date, moyens, public visé)",
        ],
      },
      {
        id: "prevention-scolaire",
        titre: "Prévention et promotion de la santé en milieu scolaire (Collège Corot)",
        referents: [],
        indicateurs: [
          { texte: "Parcours de prévention scolaire écrit et détaillé (réunions avec le collège, besoins, programme annuel)", montant: "900 €", valeur: 900 },
          { texte: "Ateliers Alimentation et Nutrition mis en place", montant: "900 €", valeur: 900 },
          { texte: "Ateliers Écrans et Sommeil mis en place", montant: "900 €", valeur: 900 },
          { texte: "Actions de santé sexuelle déployées", montant: "900 €", valeur: 900 },
          { texte: "Actions de développement des compétences psychosociales et du bien-être", montant: "900 €", valeur: 900 },
          { texte: "Projet pédagogique d'établissement écrit en coconstruction avec les enseignants", montant: "500 €", valeur: 500 },
          { texte: "Évaluation (questionnaire Pronote, satisfaction, bilan) et préparation du déploiement à d'autres établissements", montant: "500 €", valeur: 500 },
        ],
        livrables: [
          "Calendrier des réunions, émargement, recueil des besoins, programme construit",
          "Calendriers, déroulés et contenus des ateliers et actions",
          "Exemplaires des supports et outils créés",
          "Nombre de professionnels et d'élèves participants",
          "Retours des professionnels et des élèves, bilans",
          "Exemplaire du projet pédagogique construit",
          "Exemplaire du questionnaire et bilan d'évaluation (professionnels, élèves/familles), perspectives",
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
        referents: [],
        indicateurs: [
          { texte: "Plan d'action conforme à la trame nationale (référent SSE, lieu cellule de crise, actions à mener)", montant: "part fixe", valeur: null },
          { texte: "Mise à jour du plan initial", montant: "part fixe", valeur: null },
          { texte: "En cas de crise reconnue par l'ARS : mise en œuvre du plan, nombre de PS participants, nombre d'actions", montant: "67 500 € si crise", valeur: null },
        ],
        livrables: [
          "Plan d'action rédigé conforme à la trame nationale",
          "Document mis à jour, consolidé, faisant apparaître les modifications et la date de mise à jour",
          "Documents justifiant la mise en œuvre du plan d'action (le cas échéant)",
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
        referents: [],
        indicateurs: [
          { texte: "Au moins 2 réunions de concertation (hors thèmes des parcours de soins), avec au moins 1 compte rendu / document de suivi par réunion", montant: "5 000 €", valeur: 5000 },
        ],
        livrables: [
          "Date et objet des réunions",
          "Nombre de présents et catégorie",
          "Documents supports aux réunions",
          "CR et feuilles de présence",
        ],
      },
      {
        id: "soiree-bien-etre",
        titre: "Soirée annuelle pluriprofessionnelle dédiée au bien-être des soignants",
        referents: [],
        indicateurs: [
          { texte: "Soirée organisée (conférence santé mentale / QVT, témoignages, ateliers entre pairs, ressources, convivialité) et synthèse anonyme des besoins", montant: "5 000 €", valeur: 5000 },
        ],
        livrables: [
          "Date de la soirée, déroulé, contenu",
          "Supports présentés",
          "Nombre et catégorie de participants (feuille d'émargement)",
          "Exemplaire de la synthèse",
          "Bilan, perspectives, évaluation",
        ],
      },
      {
        id: "soirees-thematiques",
        titre: "Soirées thématiques",
        referents: [],
        indicateurs: [
          { texte: "Au moins 2 soirées sur 2 thématiques différentes (différentes des années précédentes)", montant: "5 000 €", valeur: 5000 },
        ],
        livrables: [
          "Date et objet des soirées",
          "Nombre de présents et catégorie",
          "Documents supports",
          "Évaluations, bilan",
          "CR et feuilles de présence",
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
        id: "accueil-stagiaires",
        titre: "Aide à l'accueil de stagiaires",
        referents: [],
        indicateurs: [
          { texte: "Participation aux formations PAMSU (5/an), GEPEM (2/an), journée de médecine générale à Bobigny ; aide aux maquettes de stages et stage DJ", montant: "3 500 €", valeur: 3500 },
        ],
        livrables: [
          "Documents justifiant les participations aux formations (participants, dates)",
          "Résultats, bilans",
          "Exemplaire des documents justifiant l'aide aux maquettes",
        ],
      },
      {
        id: "promotion-internes",
        titre: "Promotion du territoire auprès des internes de médecine générale",
        referents: [],
        indicateurs: [
          { texte: "Participation au Congrès National des Internes de MG (stand partagé avec deux autres CPTS), supports créés, contacts pris", montant: "3 500 €", valeur: 3500 },
        ],
        livrables: [
          "Documents justifiant la participation",
          "Exemplaire des supports créés et remis",
          "Nombre d'internes et/ou jeunes médecins rencontrés",
          "CR de participation",
        ],
      },
      {
        id: "aide-installation",
        titre: "Aide à l'installation de nouveaux professionnels toutes catégories",
        referents: [],
        indicateurs: [
          { texte: "Mettre en place des actions d'aide à l'installation (locaux, aides administratives, mise en relation)", montant: "3 000 €", valeur: 3000 },
        ],
        livrables: [
          "Documents justifiant les actions mises en place",
          "Nombre de nouveaux PS aidés par la CPTS (justificatifs PS concernés, moyens déployés)",
        ],
      },
    ],
  },
];
