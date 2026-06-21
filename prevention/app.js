/* ════════════════════════════════════════════════
   AOD PRÉVENTION — Application Logic
   FINDRISK (Lindström & Tuomilehto 2003)
   SCORE2 (ESC 2021, pays à risque modéré)
   Dépistages INCa
═════════════════════════════════════════════════ */

'use strict';

/* ─── Filet de sécurité scores élevés ───────── */
function buildHighRiskAlert(title, lines) {
  return `
    <div class="high-risk-alert" role="alert" aria-live="assertive">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M11 2L21 19H1L11 2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M11 9v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="11" cy="16.5" r="1" fill="currentColor"/>
      </svg>
      <div>
        <div class="high-risk-alert-title">${title}</div>
        <div class="high-risk-alert-body">${lines.join('<br>')}</div>
      </div>
    </div>`;
}

/* ─── État global (sessionStorage) ──────────── */
const STATE_KEY = 'aod_prevention_state';
let state = {
  currentSection: 'accueil',
  bilan:    { ageRange: null, answers: {}, themeScores: {}, completed: false },
  findrisk: { score: null, level: null, completed: false },
  cardio:   { risk: null, level: null, data: {}, completed: false },
  cancers:  { sex: null, age: null, programs: {}, completed: false }
};

function saveState() {
  try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch(e) {}
}
function loadState() {
  try {
    const s = sessionStorage.getItem(STATE_KEY);
    if (s) state = JSON.parse(s);
  } catch(e) {}
}

/* ─── Navigation ─────────────────────────────── */
function navigateTo(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(n => n.classList.remove('active'));

  const target = document.getElementById('section-' + sectionId);
  if (target) {
    target.classList.add('active');
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.querySelectorAll('[data-section="' + sectionId + '"]').forEach(n => n.classList.add('active'));

  state.currentSection = sectionId;
  saveState();

  if (sectionId === 'recap') generateRecap();
}

/* ─── Progress global ────────────────────────── */
function updateProgress() {
  const modules = ['bilan', 'biobilan', 'findrisk', 'cardio', 'cancers', 'audit', 'fagerstrom', 'act', 'stopbang', 'mrs'];
  const done = modules.filter(m => state[m] && state[m].completed).length;
  const pct = (done / modules.length) * 100;

  const fill = document.getElementById('global-progress');
  const text = document.getElementById('global-progress-text');
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = done + ' / ' + modules.length + ' modules';

  modules.forEach(m => {
    const badge = document.getElementById('badge-' + m);
    if (badge) badge.classList.toggle('visible', !!(state[m] && state[m].completed));
  });
}

/* ══════════════════════════════════════════════
   MODULE 1 — MON BILAN PRÉVENTION
══════════════════════════════════════════════ */

/* Questions par tranche d'âge et thématique */
const BILAN_THEMES = [
  { id: 'alimentation', label: 'Alimentation & Activité physique', emoji: '🥗' },
  { id: 'addictions',   label: 'Tabac, alcool & drogues',          emoji: '🚭' },
  { id: 'mental',       label: 'Santé mentale & stress',           emoji: '🧠' },
  { id: 'sommeil',      label: 'Sommeil & sédentarité',            emoji: '😴' },
  { id: 'antecedents',  label: 'Antécédents & vaccinations',       emoji: '🩺' }
];

const BILAN_QUESTIONS = {
  '18-25': {
    alimentation: [
      { id: 'b_ali_1', text: 'Consommez-vous au moins 5 portions de fruits et légumes par jour ?', options: ['Jamais', 'Parfois', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Consommation insuffisante de fruits et légumes', goodLabel: 'Bonne consommation de fruits et légumes' },
      { id: 'b_ali_2', text: 'Pratiquez-vous au moins 30 min d\'activité physique modérée 5 jours par semaine ?', options: ['Jamais', 'Parfois', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Activité physique insuffisante', goodLabel: 'Activité physique satisfaisante' },
      { id: 'b_ali_3', text: 'Évitez-vous les boissons sucrées (sodas, jus industriels) au quotidien ?', options: ['Jamais', 'Parfois', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Consommation de boissons sucrées à réduire', goodLabel: 'Bonne limitation des boissons sucrées' }
    ],
    addictions: [
      { id: 'b_add_1', text: 'Fumez-vous (cigarettes, e-cigarette, narguilé) ?', options: ['Tous les jours', 'Parfois', 'Rarement', 'Non'], weights: [0, 1, 2, 3], reverse: true,
        alertLabel: 'Tabagisme actif — sevrage recommandé', goodLabel: 'Pas de tabagisme actif' },
      { id: 'b_add_2', text: 'Consommez-vous de l\'alcool au-delà de 10 verres par semaine ?', options: ['Oui, régulièrement', 'Parfois', 'Rarement', 'Non'], weights: [0, 1, 2, 3], reverse: true,
        alertLabel: 'Consommation d\'alcool à risque', goodLabel: 'Consommation d\'alcool modérée' },
      { id: 'b_add_3', text: 'Avez-vous consommé du cannabis ou d\'autres substances illicites au cours des 30 derniers jours ?', options: ['Oui, souvent', 'Parfois', 'Rarement', 'Non'], weights: [0, 1, 2, 3], reverse: true,
        alertLabel: 'Usage de substances à risque', goodLabel: 'Pas d\'usage de substances illicites récent' }
    ],
    mental: [
      { id: 'b_men_1', text: 'Vous sentez-vous souvent stressé(e), anxieux(se) ou dépassé(e) ?', options: ['Toujours', 'Souvent', 'Parfois', 'Jamais'], weights: [0, 1, 2, 3], reverse: true,
        alertLabel: 'Niveau de stress/anxiété élevé', goodLabel: 'Stress géré de façon satisfaisante' },
      { id: 'b_men_2', text: 'Avez-vous des pensées négatives récurrentes ou des idées sombres sur votre avenir ?', options: ['Toujours', 'Souvent', 'Parfois', 'Jamais'], weights: [0, 1, 2, 3], reverse: true,
        alertLabel: 'Pensées négatives récurrentes à explorer', goodLabel: 'Pas de pensées négatives récurrentes' },
      { id: 'b_men_3', text: 'Avez-vous des personnes de confiance vers qui vous tourner en cas de difficulté ?', options: ['Jamais', 'Rarement', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Réseau de soutien limité', goodLabel: 'Réseau de soutien présent' }
    ],
    sommeil: [
      { id: 'b_som_1', text: 'Dormez-vous suffisamment (7 à 9 heures par nuit) ?', options: ['Jamais', 'Parfois', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Durée de sommeil insuffisante', goodLabel: 'Durée de sommeil satisfaisante' },
      { id: 'b_som_2', text: 'Passez-vous plus de 4 heures par jour assis(e) en dehors du travail/études ?', options: ['Toujours', 'Souvent', 'Parfois', 'Jamais'], weights: [0, 1, 2, 3], reverse: true,
        alertLabel: 'Sédentarité importante en dehors du travail', goodLabel: 'Temps sédentaire hors travail limité' }
    ],
    antecedents: [
      { id: 'b_ant_1', text: 'Êtes-vous à jour de vos vaccinations (DTPCoq, ROR, hépatite B, HPV si éligible) ?', options: ['Non, aucune', 'Partiellement', 'Presque', 'Oui, à jour'], weights: [0, 1, 2, 3],
        alertLabel: 'Vaccinations à mettre à jour', goodLabel: 'Vaccinations à jour' },
      { id: 'b_ant_2', text: 'Avez-vous consulté un médecin pour un bilan de santé au cours des 2 dernières années ?', options: ['Non', 'Il y a plus de 2 ans', 'Oui, récemment'], weights: [0, 1, 3],
        alertLabel: 'Suivi médical à reprendre', goodLabel: 'Suivi médical régulier' },
      { id: 'b_ant_3', text: 'Avez-vous bénéficié d\'un dépistage des IST (VIH, chlamydia) au cours des 12 derniers mois (si vous avez eu des partenaires multiples ou non protégés) ?', options: ['Non', 'Non concerné(e)', 'Oui'], weights: [0, 3, 3],
        alertLabel: 'Dépistage IST à envisager', goodLabel: 'Dépistage IST effectué ou non concerné' }
    ]
  },
  '45-50': {
    alimentation: [
      { id: 'b_ali_1', text: 'Consommez-vous au moins 5 portions de fruits et légumes par jour ?', options: ['Jamais', 'Parfois', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Consommation insuffisante de fruits et légumes', goodLabel: 'Bonne consommation de fruits et légumes' },
      { id: 'b_ali_2', text: 'Pratiquez-vous au moins 150 min d\'activité physique modérée par semaine ?', options: ['Jamais', 'Parfois', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Activité physique insuffisante (< 150 min/semaine)', goodLabel: 'Activité physique suffisante' },
      { id: 'b_ali_3', text: 'Votre poids est-il stable depuis quelques années (pas de prise de poids significative) ?', options: ['Non, prise récente importante', 'Légère variation', 'Globalement stable'], weights: [0, 1, 3],
        alertLabel: 'Prise de poids récente significative', goodLabel: 'Poids globalement stable' }
    ],
    addictions: [
      { id: 'b_add_1', text: 'Fumez-vous ou avez-vous fumé plus de 5 paquets-années dans votre vie ?', options: ['Oui, toujours fumeur', 'Oui, sevré depuis < 5 ans', 'Non/Sevré > 5 ans'], weights: [0, 1, 3],
        alertLabel: 'Tabagisme actif ou sevrage récent — suivi recommandé', goodLabel: 'Pas de tabagisme actif significatif' },
      { id: 'b_add_2', text: 'Consommez-vous de l\'alcool au-delà de 10 verres par semaine ?', options: ['Oui, régulièrement', 'Parfois', 'Rarement', 'Non'], weights: [0, 1, 2, 3], reverse: true,
        alertLabel: 'Consommation d\'alcool à risque', goodLabel: 'Consommation d\'alcool dans les limites recommandées' }
    ],
    mental: [
      { id: 'b_men_1', text: 'Ressentez-vous souvent une fatigue persistante, une tristesse ou une perte d\'intérêt ?', options: ['Toujours', 'Souvent', 'Parfois', 'Rarement'], weights: [0, 1, 2, 3], reverse: true,
        alertLabel: 'Signes de fatigue persistante ou de dépression à explorer', goodLabel: 'Pas de signes dépressifs notables' },
      { id: 'b_men_2', text: 'Vous sentez-vous capable de gérer votre stress au quotidien ?', options: ['Jamais', 'Parfois', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Difficultés de gestion du stress', goodLabel: 'Bonne capacité à gérer le stress' }
    ],
    sommeil: [
      { id: 'b_som_1', text: 'Dormez-vous 7 à 8 heures de sommeil réparateur par nuit ?', options: ['Jamais', 'Parfois', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Sommeil insuffisant ou non réparateur', goodLabel: 'Sommeil satisfaisant' },
      { id: 'b_som_2', text: 'Passez-vous la majeure partie de votre journée en position assise (travail sédentaire) ?', options: ['Oui, toujours', 'Souvent', 'Parfois', 'Non'], weights: [0, 1, 2, 3], reverse: true,
        alertLabel: 'Sédentarité professionnelle importante — compenser par l\'activité physique', goodLabel: 'Temps assis limité ou compensé' }
    ],
    antecedents: [
      { id: 'b_ant_1', text: 'Connaissez-vous votre tension artérielle ? Est-elle normale (< 130/80 mmHg) ?', options: ['Non / Non mesurée', 'Oui, élevée', 'Oui, normale'], weights: [1, 0, 3],
        alertLabel: 'Tension artérielle inconnue ou élevée', goodLabel: 'Tension artérielle normale et connue' },
      { id: 'b_ant_2', text: 'Avez-vous fait un bilan lipidique (cholestérol) au cours des 5 dernières années ?', options: ['Non', 'Oui, il y a longtemps', 'Oui, récemment'], weights: [0, 1, 3],
        alertLabel: 'Bilan lipidique à renouveler', goodLabel: 'Bilan lipidique récent' },
      { id: 'b_ant_3', text: 'Avez-vous une vaccination antitétanique et antigrippale à jour ?', options: ['Non', 'Partiellement', 'Oui'], weights: [0, 1, 3],
        alertLabel: 'Vaccinations à mettre à jour', goodLabel: 'Vaccinations à jour' }
    ]
  },
  '60-65': {
    alimentation: [
      { id: 'b_ali_1', text: 'Maintenez-vous un apport protéique suffisant (viande, poisson, œufs, légumineuses) chaque jour ?', options: ['Jamais', 'Parfois', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Apport protéique insuffisant — risque de sarcopénie', goodLabel: 'Apport protéique satisfaisant' },
      { id: 'b_ali_2', text: 'Pratiquez-vous une activité physique régulière adaptée à votre âge (marche, gym douce, natation) ?', options: ['Jamais', 'Parfois', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Activité physique adaptée insuffisante', goodLabel: 'Activité physique adaptée régulière' },
      { id: 'b_ali_3', text: 'Avez-vous perdu du poids involontairement (> 3 kg) ces derniers mois ?', options: ['Oui, beaucoup', 'Un peu', 'Non'], weights: [0, 1, 3], reverse: true,
        alertLabel: 'Perte de poids involontaire — à explorer médicalement', goodLabel: 'Pas de perte de poids involontaire' }
    ],
    addictions: [
      { id: 'b_add_1', text: 'Fumez-vous encore ?', options: ['Oui, régulièrement', 'Occasionnellement', 'Non'], weights: [0, 1, 3],
        alertLabel: 'Tabagisme actif — sevrage bénéfique à tout âge', goodLabel: 'Pas de tabagisme actif' },
      { id: 'b_add_2', text: 'Votre consommation d\'alcool est-elle inférieure à 10 verres par semaine ?', options: ['Non', 'Oui, limite'], weights: [0, 3],
        alertLabel: 'Consommation d\'alcool excessive', goodLabel: 'Consommation d\'alcool dans les limites' }
    ],
    mental: [
      { id: 'b_men_1', text: 'Avez-vous des difficultés de mémoire ou de concentration récentes et inhabituelles ?', options: ['Souvent', 'Parfois', 'Non'], weights: [0, 1, 3], reverse: true,
        alertLabel: 'Difficultés mnésiques récentes à évaluer', goodLabel: 'Pas de difficultés de mémoire significatives' },
      { id: 'b_men_2', text: 'Vous sentez-vous parfois triste, sans espoir ou sans plaisir dans vos activités habituelles ?', options: ['Souvent', 'Parfois', 'Non'], weights: [0, 1, 3], reverse: true,
        alertLabel: 'Signes dépressifs — consultation recommandée', goodLabel: 'Pas de signes dépressifs' },
      { id: 'b_men_3', text: 'Maintenez-vous des liens sociaux réguliers (famille, amis, associations) ?', options: ['Jamais', 'Rarement', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Isolement social à prévenir', goodLabel: 'Vie sociale active' }
    ],
    sommeil: [
      { id: 'b_som_1', text: 'Votre sommeil est-il satisfaisant (endormissement facile, peu de réveils) ?', options: ['Jamais', 'Parfois', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Troubles du sommeil à prendre en charge', goodLabel: 'Sommeil de bonne qualité' },
      { id: 'b_som_2', text: 'Avez-vous chuté une ou plusieurs fois au cours des 12 derniers mois ?', options: ['Oui, plusieurs fois', 'Oui, une fois', 'Non'], weights: [0, 1, 3], reverse: true,
        alertLabel: 'Antécédent(s) de chute — bilan de prévention nécessaire', goodLabel: 'Pas de chute récente' }
    ],
    antecedents: [
      { id: 'b_ant_1', text: 'Êtes-vous à jour de vos vaccinations (grippe, pneumocoque, Covid-19, DTP) ?', options: ['Non', 'Partiellement', 'Oui'], weights: [0, 1, 3],
        alertLabel: 'Vaccinations à mettre à jour', goodLabel: 'Vaccinations à jour' },
      { id: 'b_ant_2', text: 'Avez-vous fait contrôler votre vue et votre audition au cours des 2 dernières années ?', options: ['Non', 'Partiellement', 'Oui'], weights: [0, 1, 3],
        alertLabel: 'Contrôle de la vue et/ou de l\'audition à planifier', goodLabel: 'Vue et audition contrôlées récemment' },
      { id: 'b_ant_3', text: 'Prenez-vous plus de 5 médicaments différents par jour ?', options: ['Oui', 'Non'], weights: [0, 3], reverse: true,
        alertLabel: 'Polymédication (> 5 médicaments) — révision médicale recommandée', goodLabel: 'Pas de polymédication' }
    ]
  },
  '70-75': {
    alimentation: [
      { id: 'b_ali_1', text: 'Mangez-vous suffisamment et de façon variée à chaque repas ?', options: ['Non, pas assez', 'Parfois', 'Oui, toujours'], weights: [0, 1, 3],
        alertLabel: 'Alimentation insuffisante ou peu variée — risque de dénutrition', goodLabel: 'Alimentation satisfaisante' },
      { id: 'b_ali_2', text: 'Pratiquez-vous une activité physique régulière (marche quotidienne, gym douce) ?', options: ['Jamais', 'Parfois', 'Souvent', 'Toujours'], weights: [0, 1, 2, 3],
        alertLabel: 'Activité physique insuffisante — maintien de la mobilité prioritaire', goodLabel: 'Activité physique maintenue' },
      { id: 'b_ali_3', text: 'Avez-vous perdu du poids sans le vouloir (> 3 kg) au cours des 3 derniers mois ?', options: ['Oui', 'Non'], weights: [0, 3], reverse: true,
        alertLabel: 'Perte de poids involontaire — consultation urgente recommandée', goodLabel: 'Pas de perte de poids involontaire' }
    ],
    addictions: [
      { id: 'b_add_1', text: 'Consommez-vous de l\'alcool tous les jours ou presque ?', options: ['Oui, régulièrement', 'Parfois', 'Non'], weights: [0, 1, 3], reverse: true,
        alertLabel: 'Consommation quotidienne d\'alcool — risque de chute et interactions médicamenteuses', goodLabel: 'Consommation d\'alcool non quotidienne' },
      { id: 'b_add_2', text: 'Prenez-vous des somnifères ou anxiolytiques régulièrement ?', options: ['Oui, souvent', 'Occasionnellement', 'Non'], weights: [0, 1, 3], reverse: true,
        alertLabel: 'Benzodiazépines régulières — risque de chute et troubles cognitifs', goodLabel: 'Pas de benzodiazépines régulières' }
    ],
    mental: [
      { id: 'b_men_1', text: 'Avez-vous des pertes de mémoire qui vous préoccupent ou qui gênent votre quotidien ?', options: ['Souvent', 'Parfois', 'Non'], weights: [0, 1, 3], reverse: true,
        alertLabel: 'Pertes de mémoire préoccupantes — bilan cognitif recommandé', goodLabel: 'Pas de plainte mémorielle significative' },
      { id: 'b_men_2', text: 'Vous sentez-vous souvent isolé(e) ou seul(e) ?', options: ['Souvent', 'Parfois', 'Non'], weights: [0, 1, 3], reverse: true,
        alertLabel: 'Isolement social — facteur de fragilité à prendre en compte', goodLabel: 'Pas d\'isolement social' },
      { id: 'b_men_3', text: 'Êtes-vous suivi(e) régulièrement par un médecin traitant ?', options: ['Non', 'Oui, annuellement', 'Oui, régulièrement'], weights: [0, 1, 3],
        alertLabel: 'Suivi médical insuffisant', goodLabel: 'Suivi médical régulier' }
    ],
    sommeil: [
      { id: 'b_som_1', text: 'Avez-vous peur de tomber ou avez-vous chuté récemment ?', options: ['Oui, plusieurs fois', 'Oui, une fois', 'J\'ai peur mais pas chuté', 'Non'], weights: [0, 0, 1, 3], reverse: true,
        alertLabel: 'Risque de chute élevé — bilan pluridisciplinaire à programmer', goodLabel: 'Pas de risque de chute identifié' },
      { id: 'b_som_2', text: 'Avez-vous des difficultés à accomplir des actes du quotidien (se laver, s\'habiller, sortir) ?', options: ['Oui, plusieurs', 'Oui, une ou deux', 'Non'], weights: [0, 1, 3], reverse: true,
        alertLabel: 'Perte d\'autonomie dans les activités de base (ADL) — évaluation gériatrique recommandée', goodLabel: 'Autonomie dans les activités quotidiennes préservée' }
    ],
    antecedents: [
      { id: 'b_ant_1', text: 'Êtes-vous à jour de vos vaccinations (grippe annuelle, pneumocoque, rappel COVID, DTP) ?', options: ['Non', 'Partiellement', 'Oui'], weights: [0, 1, 3],
        alertLabel: 'Vaccinations à mettre à jour', goodLabel: 'Vaccinations à jour' },
      { id: 'b_ant_2', text: 'Avez-vous bénéficié d\'une évaluation gériatrique ou d\'un bilan de fragilité récemment ?', options: ['Non', 'Il y a plus de 2 ans', 'Oui, récemment'], weights: [0, 1, 3],
        alertLabel: 'Évaluation gériatrique non réalisée récemment', goodLabel: 'Évaluation gériatrique récente' },
      { id: 'b_ant_3', text: 'Votre traitement médicamenteux a-t-il été revu récemment pour éviter les interactions et chutes ?', options: ['Non', 'Partiellement', 'Oui'], weights: [0, 1, 3],
        alertLabel: 'Révision médicamenteuse à programmer (prévention iatrogénie)', goodLabel: 'Traitement médicamenteux revu récemment' }
    ]
  }
};

/* Recommandations HAS par thème et score */
const BILAN_RECO = {
  alimentation: {
    good:  'Votre alimentation et activité physique sont satisfaisantes. Maintenez ces bonnes habitudes !',
    warn:  'Quelques ajustements seraient bénéfiques : visez 5 fruits/légumes/jour et 150 min d\'activité hebdomadaire.',
    alert: 'Des améliorations importantes sont à envisager. Consultez votre médecin ou un diététicien pour un accompagnement personnalisé.'
  },
  addictions: {
    good:  'Bravo, vos comportements vis-à-vis du tabac et de l\'alcool sont protecteurs pour votre santé.',
    warn:  'Certains comportements méritent vigilance. Un soutien pour réduire les consommations peut être utile (tabac : 3114, alcool : alcool-info-service.fr).',
    alert: 'Des consommations à risque sont détectées. Consultez votre médecin ou un addictologue. Tabac : ligne Tabac Info Service 3989.'
  },
  mental: {
    good:  'Votre santé mentale semble équilibrée. Continuez à cultiver vos ressources (liens sociaux, activités, sommeil).',
    warn:  'Des signes de stress ou de mal-être sont présents. N\'hésitez pas à en parler à votre médecin.',
    alert: 'Des difficultés significatives sont repérées. Une consultation auprès d\'un professionnel de santé mentale est recommandée.'
  },
  sommeil: {
    good:  'Votre sommeil et votre niveau d\'activité physique sont satisfaisants.',
    warn:  'Quelques perturbations du sommeil ou une sédentarité excessive sont notées. Des mesures d\'hygiène du sommeil peuvent aider.',
    alert: 'Des problèmes significatifs de sommeil ou de mobilité sont présents. Consultez votre médecin.'
  },
  antecedents: {
    good:  'Votre suivi médical et vos vaccinations semblent à jour. Continuez ainsi !',
    warn:  'Certains suivis ou vaccinations pourraient être mis à jour. Faites le point avec votre médecin traitant.',
    alert: 'Des lacunes importantes dans le suivi ou les vaccinations ont été identifiées. Consultez rapidement votre médecin.'
  }
};

let bilanCurrentTheme = 0;

function selectAgeRange(range) {
  state.bilan.ageRange = range;
  document.querySelectorAll('.age-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.age === range);
    c.setAttribute('aria-pressed', c.dataset.age === range ? 'true' : 'false');
  });
  const btn = document.getElementById('btn-bilan-start');
  btn.disabled = false;
  btn.removeAttribute('aria-disabled');
  saveState();
}

function startBilanQuestionnaire() {
  if (!state.bilan.ageRange) return;
  document.getElementById('bilan-step-age').classList.add('hidden');
  document.getElementById('bilan-step-questions').classList.remove('hidden');
  bilanCurrentTheme = 0;
  state.bilan.answers = {};
  renderBilanTheme(bilanCurrentTheme);
}

function renderBilanTheme(themeIndex) {
  const theme = BILAN_THEMES[themeIndex];
  const questions = BILAN_QUESTIONS[state.bilan.ageRange][theme.id];

  // Mise à jour header
  const header = document.getElementById('bilan-question-header');
  header.innerHTML = `
    <div class="question-header-title">${theme.emoji} ${theme.label}</div>
    <div class="question-header-desc">Thème ${themeIndex + 1} sur ${BILAN_THEMES.length}</div>
  `;

  // Tabs
  const nav = document.getElementById('bilan-theme-nav');
  nav.innerHTML = BILAN_THEMES.map((t, i) => {
    let cls = 'theme-tab';
    if (i === themeIndex) cls += ' active';
    else if (state.bilan.answers[BILAN_THEMES[i].id]) cls += ' done';
    return `<button class="${cls}" onclick="jumpTheme(${i})" aria-label="Thème ${t.label}">${t.emoji} ${t.label}</button>`;
  }).join('');

  // Questions
  const container = document.getElementById('bilan-questions-container');
  container.innerHTML = questions.map((q, qi) => {
    const saved = state.bilan.answers[theme.id] && state.bilan.answers[theme.id][q.id];
    return `
      <div class="bilan-question">
        <div class="bilan-question-text">${q.text}</div>
        <div class="bilan-options" role="radiogroup" aria-label="${q.text}">
          ${q.options.map((opt, oi) => `
            <label class="bilan-option">
              <input type="radio" name="bq_${q.id}" value="${oi}" ${saved === oi ? 'checked' : ''} onchange="saveBilanAnswer('${theme.id}','${q.id}',${oi})">
              ${opt}
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Bouton dernière question
  const btn = document.getElementById('btn-bilan-next-theme');
  if (themeIndex === BILAN_THEMES.length - 1) {
    btn.textContent = 'Voir mes résultats';
    btn.innerHTML += ' <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M8.5 3.5L13 8l-4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  } else {
    btn.innerHTML = 'Thème suivant <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M8.5 3.5L13 8l-4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
}

function saveBilanAnswer(themeId, questionId, valueIndex) {
  if (!state.bilan.answers[themeId]) state.bilan.answers[themeId] = {};
  state.bilan.answers[themeId][questionId] = valueIndex;
  saveState();
}

function jumpTheme(idx) {
  bilanCurrentTheme = idx;
  renderBilanTheme(idx);
}

function bilanNextTheme() {
  // Vérifier réponses du thème courant
  const theme = BILAN_THEMES[bilanCurrentTheme];
  const questions = BILAN_QUESTIONS[state.bilan.ageRange][theme.id];
  const answered = state.bilan.answers[theme.id] || {};
  if (questions.some(q => answered[q.id] === undefined)) {
    // Highlight manquant
    document.querySelectorAll('.bilan-question').forEach((el, i) => {
      if (answered[questions[i]?.id] === undefined) {
        el.style.border = '2px solid var(--coral)';
        setTimeout(() => el.style.border = '', 2000);
      }
    });
    return;
  }

  if (bilanCurrentTheme < BILAN_THEMES.length - 1) {
    bilanCurrentTheme++;
    renderBilanTheme(bilanCurrentTheme);
    document.getElementById('section-bilan').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    showBilanResults();
  }
}

function showBilanResults() {
  const themeScores = {};
  BILAN_THEMES.forEach(theme => {
    const questions = BILAN_QUESTIONS[state.bilan.ageRange][theme.id];
    const answers = state.bilan.answers[theme.id] || {};
    let total = 0, max = 0;
    const alerts = [], goods = [];

    questions.forEach(q => {
      const idx = answers[q.id] !== undefined ? answers[q.id] : 0;
      const w = q.weights[idx] !== undefined ? q.weights[idx] : 0;
      const qMax = Math.max(...q.weights);
      total += w;
      max += qMax;
      // Point de vigilance si score < 50% du max de la question
      if (w < qMax * 0.5) alerts.push(q.alertLabel);
      else if (w >= qMax * 0.75) goods.push(q.goodLabel);
    });

    const pct = max > 0 ? (total / max) * 100 : 0;
    themeScores[theme.id] = { total, max, pct, alerts, goods };
  });

  state.bilan.themeScores = themeScores;
  state.bilan.completed = true;
  saveState();
  updateProgress();

  document.getElementById('bilan-step-questions').classList.add('hidden');
  document.getElementById('bilan-step-results').classList.remove('hidden');

  const container = document.getElementById('bilan-results-container');
  container.innerHTML = BILAN_THEMES.map(theme => {
    const score = themeScores[theme.id];
    let status, statusLabel;
    if (score.pct >= 75) { status = 'good'; statusLabel = 'Point fort'; }
    else if (score.pct >= 45) { status = 'warn'; statusLabel = 'Point de vigilance'; }
    else { status = 'alert'; statusLabel = 'Action recommandée'; }

    const barPct = Math.round(score.pct);
    const barColor = status === 'good' ? 'var(--green)' : status === 'warn' ? 'var(--yellow)' : 'var(--coral)';

    // Construire les bullets spécifiques
    let bullets = '';
    if (score.alerts.length) {
      bullets += score.alerts.map(a =>
        `<div class="result-bullet result-bullet--alert">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="var(--coral)" stroke-width="1.5"/><path d="M7 4v3.5" stroke="var(--coral)" stroke-width="1.5" stroke-linecap="round"/><circle cx="7" cy="10" r=".75" fill="var(--coral)"/></svg>
          <span>${a}</span>
        </div>`
      ).join('');
    }
    if (score.goods.length && status !== 'alert') {
      bullets += score.goods.slice(0, 2).map(g =>
        `<div class="result-bullet result-bullet--good">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="var(--green)" stroke-width="1.5"/><path d="M4.5 7l2 2 3-3.5" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>${g}</span>
        </div>`
      ).join('');
    }
    if (!bullets) {
      bullets = `<div class="result-bullet result-bullet--good">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="var(--green)" stroke-width="1.5"/><path d="M4.5 7l2 2 3-3.5" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>${BILAN_RECO[theme.id].good}</span>
      </div>`;
    }

    // Conseil ciblé : basé sur les alertes réelles, pas un texte générique
    let conseil = '';
    if (status !== 'good') {
      const conseilText = score.alerts.length
        ? `Point(s) à travailler en priorité avec votre médecin : ${score.alerts.join(' · ')}.`
        : BILAN_RECO[theme.id][status];
      conseil = `<div class="result-conseil">${conseilText}</div>`;
    }

    return `
      <div class="theme-result-card status-${status}">
        <div class="theme-result-header">
          <div class="theme-result-name">${theme.emoji} ${theme.label}</div>
          <div class="theme-status-chip ${status}">${statusLabel}</div>
        </div>
        <div class="result-bar-wrap">
          <div style="height:6px;background:var(--navy-light);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${barPct}%;background:${barColor};border-radius:3px;transition:width 0.8s ease;"></div>
          </div>
          <div style="font-size:0.72rem;color:var(--gray);margin-top:4px;">${barPct}% de réponses favorables</div>
        </div>
        <div class="result-bullets">${bullets}</div>
        ${conseil}
      </div>
    `;
  }).join('');

  document.getElementById('section-bilan').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goBackBilanAge() {
  document.getElementById('bilan-step-questions').classList.add('hidden');
  document.getElementById('bilan-step-age').classList.remove('hidden');
}

function restartBilan() {
  state.bilan = { ageRange: null, answers: {}, themeScores: {}, completed: false };
  bilanCurrentTheme = 0;
  saveState();
  updateProgress();
  document.getElementById('bilan-step-results').classList.add('hidden');
  document.getElementById('bilan-step-age').classList.remove('hidden');
  document.querySelectorAll('.age-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', 'false');
  });
  document.getElementById('btn-bilan-start').disabled = true;
}

/* ══════════════════════════════════════════════
   MODULE 2 — FINDRISK
══════════════════════════════════════════════ */

function calculateIMC() {
  const poids = parseFloat(document.getElementById('f-poids').value);
  const taille = parseFloat(document.getElementById('f-taille').value);
  const display = document.getElementById('imc-display');
  const category = document.getElementById('imc-category');
  const cursor = document.getElementById('imc-bar-cursor');

  if (!poids || !taille || taille < 50) {
    display.textContent = '— kg/m²';
    category.textContent = '';
    return;
  }

  const imc = poids / Math.pow(taille / 100, 2);
  display.textContent = imc.toFixed(1) + ' kg/m²';

  // Position curseur sur la barre (18.5=0% → 35=100%)
  const pct = Math.min(Math.max((imc - 14) / (40 - 14) * 100, 2), 98);
  cursor.style.left = pct + '%';

  let cat, color, radioVal;
  if (imc < 18.5) { cat = 'Maigreur'; color = '#4FC3F7'; radioVal = null; }
  else if (imc < 25) { cat = 'Poids normal ✓'; color = '#66BB6A'; radioVal = '0'; }
  else if (imc < 30) { cat = 'Surpoids'; color = '#FFA726'; radioVal = '1'; }
  else { cat = 'Obésité'; color = '#EF5350'; radioVal = '3'; }

  category.textContent = cat;
  category.style.color = color;

  // Sauvegarder dans le profil
  updateProfile({ imc, weight: poids, height: taille });

  // Auto-sélectionner le radio correspondant
  if (radioVal !== null) {
    const radios = document.querySelectorAll('input[name="f_imc"]');
    radios.forEach(r => { r.checked = r.value === radioVal; });
  }
}

function updateWaistOptions() {
  const sex = document.querySelector('input[name="f_sex"]:checked');
  if (!sex) return;
  document.querySelectorAll('.waist-options').forEach(el => el.classList.add('hidden'));
  document.getElementById('waist-options-' + sex.value).classList.remove('hidden');
  // Reset waist radio
  document.querySelectorAll('input[name="f_waist"]').forEach(r => r.checked = false);
}

function getFINDRISKValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? parseInt(el.value) : null;
}

function calculateFINDRISK() {
  const age   = getFINDRISKValue('f_age');
  const imc   = getFINDRISKValue('f_imc');
  const waist = getFINDRISKValue('f_waist');
  const act   = getFINDRISKValue('f_activity');
  const veg   = getFINDRISKValue('f_vegetables');
  const hta   = getFINDRISKValue('f_hypertension');
  const gly   = getFINDRISKValue('f_hyperglycemia');
  const fam   = getFINDRISKValue('f_family');

  const msgEl = document.getElementById('findrisk-missing-msg');
  if ([age, imc, waist, act, veg, hta, gly, fam].some(v => v === null)) {
    msgEl.classList.remove('hidden');
    // Scroll vers première question sans réponse
    return;
  }
  msgEl.classList.add('hidden');

  const score = age + imc + waist + act + veg + hta + gly + fam;
  state.findrisk.score = score;

  let level, levelText, riskText, color;
  if (score < 7) {
    level = 'low'; levelText = 'Risque faible';
    riskText = 'Risque estimé inférieur à 1 % de développer un diabète de type 2 dans les 10 prochaines années.';
    color = '#2E7D32';
  } else if (score <= 11) {
    level = 'low-mid'; levelText = 'Risque légèrement élevé';
    riskText = 'Risque estimé d\'environ 4 % — soit environ 1 personne sur 25 dans votre profil développera un diabète à 10 ans.';
    color = '#F59E0B';
  } else if (score <= 14) {
    level = 'mid'; levelText = 'Risque modéré';
    riskText = 'Risque estimé d\'environ 17 % — soit environ 1 personne sur 6. Une prévention active est recommandée.';
    color = '#E65100';
  } else if (score <= 20) {
    level = 'high'; levelText = 'Risque élevé';
    riskText = 'Risque estimé d\'environ 33 % — soit environ 1 personne sur 3. Une consultation médicale et un bilan glycémique sont fortement conseillés.';
    color = '#C62828';
  } else {
    level = 'very-high'; levelText = 'Risque très élevé';
    riskText = 'Risque estimé supérieur à 50 % — soit 1 personne sur 2. Consultez votre médecin rapidement pour un bilan glycémique complet.';
    color = '#7B0000';
  }

  state.findrisk.level = level;
  state.findrisk.completed = true;
  saveState();
  updateProgress();

  // Afficher résultats
  document.getElementById('findrisk-form').classList.add('hidden');
  const results = document.getElementById('findrisk-results');
  results.classList.remove('hidden');

  // Animer gauge (arc semi-circulaire, 283 = longueur arc total)
  const maxDashoffset = 283;
  const pct = Math.min(score / 26, 1);
  const offset = maxDashoffset - (pct * maxDashoffset);

  const arc = document.getElementById('findrisk-gauge-arc');
  const scoreText = document.getElementById('findrisk-score-text');

  arc.style.stroke = color;
  scoreText.textContent = score;

  setTimeout(() => { arc.style.strokeDashoffset = offset; }, 100);

  // Badge niveau
  const badge = document.getElementById('findrisk-risk-badge');
  badge.textContent = levelText;
  badge.className = 'risk-level-badge risk-' + level;

  // Détail
  document.getElementById('findrisk-risk-detail').textContent = riskText;

  // Légende
  const legend = document.getElementById('findrisk-gauge-legend');
  legend.innerHTML = [
    { label: '< 7 : Faible', color: '#2E7D32' },
    { label: '7–11 : Légèrement élevé', color: '#F59E0B' },
    { label: '12–14 : Modéré', color: '#E65100' },
    { label: '15–20 : Élevé', color: '#C62828' },
    { label: '> 20 : Très élevé', color: '#7B0000' }
  ].map(l => `
    <div class="gauge-legend-item">
      <span class="gauge-legend-dot" style="background:${l.color}"></span>
      ${l.label}
    </div>
  `).join('');

  // Filet de sécurité score élevé FINDRISK
  let findriskAlert = '';
  if (level === 'high' || level === 'very-high') {
    findriskAlert = buildHighRiskAlert(
      'Action prioritaire — consultez votre médecin',
      [
        `Votre score FINDRISK (${score}/26) indique un risque ${level === 'very-high' ? 'très élevé' : 'élevé'} de développer un diabète de type 2.`,
        'Demandez une glycémie à jeun et une HbA1c à votre médecin <strong>dans les prochaines semaines</strong>.',
        'Ce résultat ne constitue pas un diagnostic. Seul votre médecin peut confirmer ou infirmer ce risque après bilan.',
      ]
    );
  }
  document.getElementById('findrisk-risk-detail').innerHTML = (findriskAlert || '') + `<p style="margin:${findriskAlert?'16px':'0'} 0 0">${riskText}</p>`;

  // Recommandations
  const recos = getFINDRISKRecommendations(level, score);
  document.getElementById('findrisk-recommendations').innerHTML = `
    <div class="recommendations-title">Recommandations</div>
    ${recos.map(r => `
      <div class="recommendation-item">
        <span class="recommendation-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        ${r}
      </div>
    `).join('')}
  `;

  // Conduite à tenir
  document.getElementById('findrisk-conduite').innerHTML = renderConduiteFindrisk(level, score);

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderConduiteFindrisk(level, score) {
  const conduites = {
    'low': {
      urgency: 'urgency-routine', urgencyLabel: 'Suivi habituel',
      interlocuteur: '<strong>Médecin traitant</strong> lors de la prochaine consultation de routine',
      delai: 'Pas d\'urgence — prochain rendez-vous habituel',
      apporter: 'Ce résultat de bilan. Signaler tout antécédent familial de diabète.',
      message: 'Votre profil est favorable. Maintenez vos bonnes habitudes et signalez ce score à votre médecin lors de votre prochain bilan annuel.'
    },
    'low-mid': {
      urgency: 'urgency-short', urgencyLabel: 'Dans les 3 à 6 mois',
      interlocuteur: '<strong>Médecin traitant</strong> pour prescription d\'un bilan glycémique',
      delai: 'Dans les 3 à 6 mois',
      apporter: 'Ce bilan FINDRISK. Poids, taille, tour de taille. Liste des médicaments.',
      message: 'Demandez une glycémie à jeun ou une HbA1c à votre médecin. En cas de prédiabète, il pourra vous orienter vers un programme d\'éducation thérapeutique.'
    },
    'mid': {
      urgency: 'urgency-short', urgencyLabel: 'Dans les 1 à 3 mois',
      interlocuteur: '<strong>Médecin traitant</strong> — peut orienter vers un <strong>diabétologue</strong> si nécessaire',
      delai: 'Dans le mois suivant ce bilan',
      apporter: 'Ce bilan FINDRISK. Résultats de biologie récents (glycémie, bilan lipidique). Valeurs de tension artérielle.',
      message: 'Un bilan glycémique (glycémie à jeun + HbA1c) est fortement recommandé. Votre médecin évaluera l\'opportunité d\'un programme de prévention du diabète.'
    },
    'high': {
      urgency: 'urgency-immediate', urgencyLabel: 'Rapidement — dans le mois',
      interlocuteur: '<strong>Médecin traitant</strong> en priorité, puis <strong>diabétologue ou endocrinologue</strong>',
      delai: 'Dans les 2 à 4 semaines',
      apporter: 'Ce bilan complet. Derniers résultats biologiques. Carnet de suivi tensionnel si disponible.',
      message: 'Votre risque est élevé. Consultez rapidement votre médecin pour un bilan glycémique complet et une évaluation de l\'ensemble des facteurs de risque métaboliques.'
    },
    'very-high': {
      urgency: 'urgency-immediate', urgencyLabel: 'Urgent — dans les 2 semaines',
      interlocuteur: '<strong>Médecin traitant</strong> en urgence relative, puis <strong>diabétologue</strong>',
      delai: 'Dans les 2 semaines',
      apporter: 'Ce bilan. Tous les résultats biologiques disponibles. Liste complète des médicaments.',
      message: 'Risque très élevé. Une prise en charge médicale rapide est indispensable : bilan glycémique, bilan métabolique complet, et mise en place d\'un suivi structuré.'
    }
  };
  const c = conduites[level] || conduites['low'];
  return `
    <div class="conduite-block">
      <div class="conduite-header">
        <div class="conduite-header-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2a9 9 0 100 18A9 9 0 0011 2z" stroke="#C9972B" stroke-width="1.5"/><path d="M11 7v5l3 3" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <div>
          <div class="conduite-header-title">Conduite à tenir</div>
          <div class="conduite-header-sub">Orientation et adressage recommandés</div>
        </div>
      </div>
      <div class="conduite-body">
        <div class="conduite-row">
          <div class="conduite-label">Délai</div>
          <div class="conduite-value">
            <span class="conduite-urgency ${c.urgency}">${c.urgencyLabel}</span><br>
            ${c.delai}
          </div>
        </div>
        <div class="conduite-row">
          <div class="conduite-label">Interlocuteur</div>
          <div class="conduite-value">${c.interlocuteur}</div>
        </div>
        <div class="conduite-row">
          <div class="conduite-label">À apporter</div>
          <div class="conduite-value">${c.apporter}</div>
        </div>
        <div class="conduite-row">
          <div class="conduite-label">Message clé</div>
          <div class="conduite-value">${c.message}</div>
        </div>
      </div>
    </div>
  `;
}

function getFINDRISKRecommendations(level, score) {
  const base = [
    'Maintenir une alimentation équilibrée riche en fibres, légumes et céréales complètes.',
    'Pratiquer au moins 150 minutes d\'activité physique d\'intensité modérée par semaine.',
    'Maintenir un poids de forme (IMC entre 18,5 et 25 kg/m²).'
  ];
  if (level === 'low') {
    return ['Continuez sur cette lancée ! Votre profil est favorable.', ...base.slice(0, 2)];
  }
  if (level === 'low-mid') {
    return [
      'Consultez votre médecin pour un dosage de la glycémie à jeun, en particulier si vous avez plus de 45 ans.',
      ...base,
      'Limiter les boissons sucrées et les aliments à index glycémique élevé.'
    ];
  }
  return [
    'Consultez rapidement votre médecin pour un bilan glycémique (glycémie à jeun et/ou HbA1c).',
    'En cas de glycémie entre 1,10 et 1,25 g/L (prédiabète) : programme d\'éducation thérapeutique disponible.',
    ...base,
    'Réduire ou arrêter le tabac : le tabagisme augmente le risque de diabète de 30 à 40 %.',
    'Objectif de perte de poids en cas de surpoids : 5 à 7 % du poids corporel réduisent significativement le risque.'
  ];
}

function restartFINDRISK() {
  state.findrisk = { score: null, level: null, completed: false };
  saveState();
  updateProgress();
  document.getElementById('findrisk-results').classList.add('hidden');
  document.getElementById('findrisk-form').classList.remove('hidden');
  document.querySelectorAll('#findrisk-form input[type="radio"]').forEach(r => r.checked = false);
  document.getElementById('f-poids').value = '';
  document.getElementById('f-taille').value = '';
  document.getElementById('imc-display').textContent = '— kg/m²';
  document.getElementById('imc-category').textContent = '';
  document.getElementById('imc-bar-cursor').style.left = '0%';
  document.querySelectorAll('.waist-options').forEach(el => el.classList.add('hidden'));
}

/* ══════════════════════════════════════════════
   MODULE 3 — RISQUE CARDIOVASCULAIRE (SCORE2)
══════════════════════════════════════════════ */

/*
  SCORE2 ESC 2021 — Pays à risque modéré (France)
  Source: SCORE2 working group & ESC Cardiovascular Risk Collaboration,
  European Heart Journal, 2021, 42(25):2439-2454

  Hommes (modéré):
    LP = 0.3742×((age-60)/5) + 0.6457×smoking + 0.6012×((sbp-120)/20) + 0.2777×(nonHDL-3.5)
    S₀ = 0.9605, μ = -0.5699

  Femmes (modéré):
    LP = 0.4648×((age-60)/5) + 0.7744×smoking + 0.3131×((sbp-120)/20) + 0.8673×(nonHDL-3.5)
    S₀ = 0.9776, μ = -0.7380

  Risk = 1 - S₀^exp(LP - μ)
*/

/* Gate biologie SCORE2 */
function openCardioForm() {
  document.getElementById('cardio-bio-gate').classList.add('hidden');
  document.getElementById('cardio-form').classList.remove('hidden');
  document.getElementById('cardio-bio-blocked').classList.add('hidden');
}
function showCardioBioBlocked() {
  document.getElementById('cardio-bio-blocked').classList.remove('hidden');
  document.getElementById('cardio-form').classList.add('hidden');
}

function checkCardioAge() {
  const age = parseInt(document.getElementById('c-age').value);
  const note = document.getElementById('age-cardio-note');
  if (age >= 70) note.textContent = 'SCORE2-OP utilisé pour les 70 ans et plus.';
  else if (age >= 40) note.textContent = 'SCORE2 standard (40–69 ans).';
  else if (age) note.textContent = 'Âge hors plage SCORE2 (40–79 ans recommandé).';
}

function updateCardioAge() {
  checkCardioAge();
  const age = parseInt(document.getElementById('c-age').value);
  const sex = document.querySelector('input[name="c_sex"]:checked');
  if (age) updateProfile({ age });
  if (sex) updateProfile({ sex: sex.value });
}

function toggleCholUnit() {
  const unit = document.querySelector('input[name="c_unit"]:checked').value;
  const ismmol = unit === 'mmol';
  const labels = ['total', 'hdl'];
  labels.forEach((l, i) => {
    document.getElementById('unit-label-' + l).textContent = ismmol ? '(mmol/L)' : '(mg/dL)';
    document.getElementById('unit-display-' + (i + 1)).textContent = ismmol ? 'mmol/L' : 'mg/dL';
  });
  const note = document.getElementById('unit-convert-note');
  note.textContent = ismmol ? '' : 'Conversion automatique : mg/dL ÷ 38.67 = mmol/L';
  calculateNonHDL();
}

function toMmol(val, unit) {
  return unit === 'mgdl' ? val / 38.67 : val;
}

function calculateNonHDL() {
  const unit = document.querySelector('input[name="c_unit"]:checked')?.value || 'mmol';
  const total = parseFloat(document.getElementById('c-total-chol').value);
  const hdl   = parseFloat(document.getElementById('c-hdl').value);
  const display = document.getElementById('c-non-hdl');
  if (!total || !hdl) { display.textContent = '—'; return; }
  const totalMmol = toMmol(total, unit);
  const hdlMmol   = toMmol(hdl, unit);
  const nonHDL = totalMmol - hdlMmol;
  display.textContent = nonHDL.toFixed(2) + ' mmol/L';
  display.dataset.value = nonHDL;
}

function calculateSCORE2() {
  const sexEl   = document.querySelector('input[name="c_sex"]:checked');
  const smoking = document.querySelector('input[name="c_smoking"]:checked');
  const age     = parseInt(document.getElementById('c-age').value);
  const sbp     = parseFloat(document.getElementById('c-sbp').value);
  const unit    = document.querySelector('input[name="c_unit"]:checked')?.value || 'mmol';
  const totalRaw = parseFloat(document.getElementById('c-total-chol').value);
  const hdlRaw   = parseFloat(document.getElementById('c-hdl').value);
  const msgEl    = document.getElementById('cardio-missing-msg');

  const errors = [];
  if (!sexEl)    errors.push('le sexe');
  if (!age || age < 40 || age > 79) errors.push('l\'âge (40–79 ans)');
  if (!smoking)  errors.push('le statut tabagique');
  if (!sbp || sbp < 80 || sbp > 220) errors.push('la pression artérielle (80–220 mmHg)');
  if (!totalRaw) errors.push('le cholestérol total');
  if (!hdlRaw)   errors.push('le HDL-cholestérol');

  if (errors.length) {
    msgEl.classList.remove('hidden');
    msgEl.textContent = 'Veuillez renseigner : ' + errors.join(', ') + '.';
    return;
  }
  msgEl.classList.add('hidden');

  const sex  = sexEl.value;
  const smk  = parseInt(smoking.value);
  const totalMmol = toMmol(totalRaw, unit);
  const hdlMmol   = toMmol(hdlRaw, unit);
  const nonHDL    = totalMmol - hdlMmol;

  let risk10;
  if (sex === 'H') {
    const LP = 0.3742 * ((age - 60) / 5)
             + 0.6457 * smk
             + 0.6012 * ((sbp - 120) / 20)
             + 0.2777 * (nonHDL - 3.5);
    risk10 = 1 - Math.pow(0.9605, Math.exp(LP - (-0.5699)));
  } else {
    const LP = 0.4648 * ((age - 60) / 5)
             + 0.7744 * smk
             + 0.3131 * ((sbp - 120) / 20)
             + 0.8673 * (nonHDL - 3.5);
    risk10 = 1 - Math.pow(0.9776, Math.exp(LP - (-0.7380)));
  }

  // Correction SCORE2-OP pour ≥70 ans (facteur correctif simplifié ESC)
  if (age >= 70) risk10 = risk10 * 0.8;

  const riskPct = Math.max(0.1, Math.min(risk10 * 100, 99.9));
  const riskRounded = Math.round(riskPct * 10) / 10;

  // Catégorisation ESC 2021
  let level, levelText, color;
  if (age < 40) {
    if (riskPct < 2.5) { level = 'low'; levelText = 'Faible (<2,5%)'; color = '#2E7D32'; }
    else if (riskPct < 7.5) { level = 'mid'; levelText = 'Modéré (2,5–7,5%)'; color = '#E65100'; }
    else { level = 'high'; levelText = 'Élevé (>7,5%)'; color = '#C62828'; }
  } else if (age < 70) {
    if (riskPct < 5) { level = 'low'; levelText = 'Faible (<5%)'; color = '#2E7D32'; }
    else if (riskPct < 10) { level = 'mid'; levelText = 'Modéré (5–10%)'; color = '#E65100'; }
    else { level = 'high'; levelText = 'Élevé (>10%)'; color = '#C62828'; }
  } else {
    if (riskPct < 7.5) { level = 'low'; levelText = 'Faible (<7,5%)'; color = '#2E7D32'; }
    else if (riskPct < 15) { level = 'mid'; levelText = 'Modéré (7,5–15%)'; color = '#E65100'; }
    else { level = 'high'; levelText = 'Élevé (>15%)'; color = '#C62828'; }
  }

  state.cardio = { risk: riskRounded, level, data: { sex, age, smk, sbp, nonHDL }, completed: true };
  saveState();
  updateProgress();

  // Afficher résultats
  document.getElementById('cardio-form').classList.add('hidden');
  const results = document.getElementById('cardio-results');
  results.classList.remove('hidden');

  // Gauge
  const maxOffset = 283;
  const pct = Math.min(riskPct / (age >= 70 ? 30 : 20), 1);
  const arc = document.getElementById('cardio-gauge-arc');
  arc.style.stroke = color;
  document.getElementById('cardio-score-text').textContent = riskRounded + '%';
  setTimeout(() => { arc.style.strokeDashoffset = maxOffset - (pct * maxOffset); }, 100);

  const badge = document.getElementById('cardio-risk-badge');
  badge.textContent = levelText;
  badge.className = 'risk-level-badge risk-' + level;

  // Détail
  document.getElementById('cardio-risk-detail').innerHTML = `
    <strong>Interprétation :</strong> Sur 100 personnes ayant votre profil (${sex === 'H' ? 'homme' : 'femme'}, ${age} ans, ${smk ? 'fumeur' : 'non-fumeur'}),
    environ <strong>${Math.round(riskRounded)}</strong> développeront un événement cardiovasculaire
    (infarctus, AVC, décès cardiovasculaire) dans les 10 prochaines années.
    <br><br>
    Vos valeurs : PAS = <strong>${sbp} mmHg</strong> · Non-HDL = <strong>${nonHDL.toFixed(2)} mmol/L</strong>
  `;

  // Chart.js
  renderCardioChart(sex, age, smk, sbp, nonHDL, riskRounded, color);

  // Recommandations
  const recoEl = document.getElementById('cardio-recommendations');
  recoEl.innerHTML = '<div class="recommendations-title">Recommandations ESC 2021</div>' +
    getCardioRecommendations(level, smk, sbp, nonHDL).map(r =>
      `<div class="recommendation-item"><span class="recommendation-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${r}</div>`
    ).join('');

  // Conduite à tenir cardio
  document.getElementById('cardio-conduite').innerHTML = renderConduiteCardio(level, state.cardio.data);

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderConduiteCardio(level, data) {
  const smk = data.smk;
  const sbp  = data.sbp;
  const conduites = {
    'low': {
      urgency: 'urgency-routine', urgencyLabel: 'Suivi habituel',
      interlocuteur: '<strong>Médecin traitant</strong> lors du prochain bilan de routine',
      delai: 'Prochain bilan annuel ou bisannuel',
      examen: 'Bilan lipidique et tension artérielle tous les 5 ans si stable. Sevrage tabagique si fumeur.',
      message: 'Votre risque cardiovasculaire est actuellement faible. Maintenez votre hygiène de vie et signalez ce résultat à votre médecin.'
    },
    'mid': {
      urgency: 'urgency-short', urgencyLabel: 'Dans les 1 à 3 mois',
      interlocuteur: smk ? '<strong>Médecin traitant</strong> — aide au sevrage tabagique prioritaire (Tabac Info Service : 3989)' : '<strong>Médecin traitant</strong> pour réévaluation des facteurs de risque',
      delai: 'Dans les 1 à 3 mois',
      examen: 'Bilan lipidique complet, glycémie à jeun, fonction rénale. ECG de repos si non fait récemment.' + (sbp > 140 ? ' Automesure tensionnelle sur 3 jours.' : ''),
      message: 'Un risque modéré nécessite un plan d\'action sur les facteurs modifiables. Votre médecin définira avec vous les objectifs prioritaires.'
    },
    'high': {
      urgency: 'urgency-immediate', urgencyLabel: 'Dans les 2 à 4 semaines',
      interlocuteur: '<strong>Médecin traitant</strong> en priorité, puis <strong>cardiologue</strong> selon évaluation',
      delai: 'Dans les 2 à 4 semaines',
      examen: 'Bilan lipidique complet, glycémie, fonction rénale, ECG de repos, automesure tensionnelle. Écho cardiaque selon orientation.',
      message: 'Risque élevé. Une prise en charge médicale structurée est nécessaire — traitement des facteurs de risque modifiables (tabac, hypertension, cholestérol) et suivi cardiologique.'
    }
  };
  const c = conduites[level] || conduites['low'];
  return `
    <div class="conduite-block">
      <div class="conduite-header">
        <div class="conduite-header-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2a9 9 0 100 18A9 9 0 0011 2z" stroke="#C9972B" stroke-width="1.5"/><path d="M11 7v5l3 3" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <div>
          <div class="conduite-header-title">Conduite à tenir</div>
          <div class="conduite-header-sub">Orientation et adressage recommandés</div>
        </div>
      </div>
      <div class="conduite-body">
        <div class="conduite-row">
          <div class="conduite-label">Délai</div>
          <div class="conduite-value">
            <span class="conduite-urgency ${c.urgency}">${c.urgencyLabel}</span><br>
            ${c.delai}
          </div>
        </div>
        <div class="conduite-row">
          <div class="conduite-label">Interlocuteur</div>
          <div class="conduite-value">${c.interlocuteur}</div>
        </div>
        <div class="conduite-row">
          <div class="conduite-label">Examens à prévoir</div>
          <div class="conduite-value">${c.examen}</div>
        </div>
        <div class="conduite-row">
          <div class="conduite-label">Message clé</div>
          <div class="conduite-value">${c.message}</div>
        </div>
      </div>
    </div>
  `;
}

function getCardioRecommendations(level, smoking, sbp, nonHDL) {
  const recos = ['Activité physique aérobie : au moins 150 min/semaine d\'intensité modérée (marche rapide, vélo, natation).', 'Alimentation méditerranéenne : privilégier fruits, légumes, poissons gras, huile d\'olive.'];
  if (smoking) recos.unshift('Arrêt du tabac : priorité absolue — réduit le risque cardiovasculaire de 50 % en 1 an. Consultez votre médecin ou appelez le 3989.');
  if (sbp > 140) recos.push('Hypertension artérielle détectée (PAS > 140 mmHg) : une consultation médicale et un traitement sont probablement nécessaires.');
  if (nonHDL > 4) recos.push('Non-HDL cholestérol élevé : un traitement hypolipémiant (statine) pourrait être discuté avec votre médecin.');
  if (level === 'high') recos.push('Risque élevé : une consultation cardiologique est recommandée pour un bilan complet et une stratégie de réduction du risque.');
  return recos;
}

let cardioChart = null;
function renderCardioChart(sex, age, smk, sbp, nonHDL, myRisk, color) {
  const ctx = document.getElementById('cardio-chart');
  if (!ctx) return;
  if (cardioChart) { cardioChart.destroy(); cardioChart = null; }

  // Calcul risque moyen (référence sans facteurs modifiables)
  let refRisk;
  if (sex === 'H') {
    const LP = 0.3742 * ((age - 60) / 5) + 0 + 0.6012 * ((120 - 120) / 20) + 0.2777 * (3.5 - 3.5);
    refRisk = (1 - Math.pow(0.9605, Math.exp(LP - (-0.5699)))) * 100;
  } else {
    const LP = 0.4648 * ((age - 60) / 5) + 0 + 0.3131 * ((120 - 120) / 20) + 0.8673 * (3.5 - 3.5);
    refRisk = (1 - Math.pow(0.9776, Math.exp(LP - (-0.7380)))) * 100;
  }
  if (age >= 70) refRisk *= 0.8;
  refRisk = Math.max(0.1, refRisk);

  cardioChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Votre risque', 'Risque de référence\n(même âge/sexe, sans facteur de risque)'],
      datasets: [{
        data: [myRisk, refRisk.toFixed(1)],
        backgroundColor: [color, '#D6DCF0'],
        borderColor: [color, '#9AAABB'],
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ctx.raw + ' % de risque à 10 ans'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: Math.max(myRisk, refRisk) * 1.4,
          ticks: { callback: v => v + '%', font: { family: 'Inter', size: 11 } },
          grid: { color: '#E8E8E8' }
        },
        x: {
          ticks: { font: { family: 'Inter', size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

function restartCardio() {
  state.cardio = { risk: null, level: null, data: {}, completed: false };
  saveState();
  updateProgress();
  if (cardioChart) { cardioChart.destroy(); cardioChart = null; }
  document.getElementById('cardio-results').classList.add('hidden');
  document.getElementById('cardio-form').classList.add('hidden');
  document.getElementById('cardio-bio-gate').classList.remove('hidden');
  document.getElementById('cardio-bio-blocked').classList.add('hidden');
  document.querySelectorAll('#cardio-bio-gate input[type="radio"]').forEach(r => r.checked = false);
  document.querySelectorAll('#cardio-form input[type="radio"]').forEach(r => r.checked = false);
  document.getElementById('c-age').value = '';
  document.getElementById('c-sbp').value = '';
  document.getElementById('c-total-chol').value = '';
  document.getElementById('c-hdl').value = '';
  document.getElementById('c-non-hdl').textContent = '—';
}

/* ══════════════════════════════════════════════
   MODULE 4 — DÉPISTAGES CANCERS
══════════════════════════════════════════════ */

function updateCancersEligibility() {
  const sexEl = document.querySelector('input[name="ca_sex"]:checked');
  const ageEl = document.getElementById('ca-age');
  if (!sexEl || !ageEl.value) return;

  const sex = sexEl.value;
  const age = parseInt(ageEl.value);
  state.cancers.sex = sex;
  state.cancers.age = age;
  saveState();

  const panel = document.getElementById('cancers-eligibility-panel');
  const items = [];

  // Cancer du sein
  const seinOk = sex === 'F' && age >= 50 && age <= 74;
  items.push({ label: 'Cancer du sein', ok: seinOk && sex === 'F', relevant: sex === 'F' });

  // Colorectal
  const ccrOk = age >= 50 && age <= 74;
  items.push({ label: 'Cancer colorectal', ok: ccrOk, relevant: true });

  // Col utérus
  const colOk = sex === 'F' && age >= 25 && age <= 65;
  items.push({ label: 'Cancer du col de l\'utérus', ok: colOk && sex === 'F', relevant: sex === 'F' });

  panel.innerHTML = `
    <div style="font-size:0.8rem;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">
      Éligibilité aux programmes de dépistage
    </div>
    ${items.map(item => {
      if (!item.relevant) {
        return `<div class="eligibility-item"><span class="elig-status">⚪</span> ${item.label} — Non applicable (sexe)</div>`;
      }
      return `<div class="eligibility-item"><span class="elig-status">${item.ok ? '✅' : '⚠️'}</span> ${item.label} — ${item.ok ? 'Éligible' : 'Non éligible (âge hors programme)'}</div>`;
    }).join('')}
  `;

  // Mettre à jour les badges et formulaires de chaque programme
  updateSeinProgram(sex, age);
  updateCCRProgram(sex, age);
  updateColProgram(sex, age);

  // Afficher tableau récap si données complètes
  updateScreeningTable();
}

function updateSeinProgram(sex, age) {
  const badge = document.getElementById('sein-eligibility-badge');
  const form  = document.getElementById('sein-date-form');
  const elig  = sex === 'F' && age >= 50 && age <= 74;

  if (sex !== 'F') {
    badge.textContent = 'Non applicable';
    badge.className = 'program-eligibility-badge elig-no';
    form.classList.add('hidden');
  } else if (elig) {
    badge.textContent = 'Éligible ✓';
    badge.className = 'program-eligibility-badge elig-ok';
    form.classList.remove('hidden');
  } else {
    badge.textContent = age < 50 ? 'Éligible à partir de 50 ans' : 'Programme jusqu\'à 74 ans';
    badge.className = 'program-eligibility-badge elig-warn';
    form.classList.add('hidden');
  }
}

function updateCCRProgram(sex, age) {
  const badge = document.getElementById('colorectal-eligibility-badge');
  const riskQ = document.getElementById('colorectal-risk-questions');
  const dateF = document.getElementById('colorectal-date-form');
  const elig  = age >= 50 && age <= 74;

  if (elig) {
    badge.textContent = 'Éligible ✓';
    badge.className = 'program-eligibility-badge elig-ok';
    riskQ.classList.remove('hidden');
  } else {
    badge.textContent = age < 50 ? 'Éligible à partir de 50 ans' : 'Programme jusqu\'à 74 ans';
    badge.className = 'program-eligibility-badge elig-warn';
    riskQ.classList.add('hidden');
    dateF.classList.add('hidden');
  }
}

function updateCCRRisk() {
  const perso   = document.querySelector('input[name="ca_ccr_perso"]:checked')?.value;
  const famille = document.querySelector('input[name="ca_ccr_famille"]:checked')?.value;
  const mici    = document.querySelector('input[name="ca_ccr_mici"]:checked')?.value;
  const alertEl = document.getElementById('ccr-risk-alert');
  const dateF   = document.getElementById('colorectal-date-form');

  if (!perso || !famille || !mici) return;

  const highRisk = perso === 'oui' || famille === 'oui' || mici === 'oui';
  if (highRisk) {
    alertEl.className = 'info-box info-box--warn';
    alertEl.classList.remove('hidden');
    const reasons = [];
    if (perso === 'oui')   reasons.push('antécédents personnels de polype ou de cancer colorectal');
    if (famille === 'oui') reasons.push('antécédent familial au premier degré');
    if (mici === 'oui')    reasons.push('maladie inflammatoire chronique de l\'intestin');
    alertEl.innerHTML = `
      <strong>⚠️ Risque élevé détecté</strong><br>
      En raison de : ${reasons.join(', ')}.<br>
      Vous n'êtes pas éligible au dépistage organisé par test FIT.
      <strong>Consultez votre médecin pour une coloscopie directe.</strong>
    `;
    dateF.classList.add('hidden');
  } else {
    alertEl.classList.add('hidden');
    dateF.classList.remove('hidden');
  }
  updateScreeningTable();
}

function updateColProgram(sex, age) {
  const badge    = document.getElementById('col-eligibility-badge');
  const form     = document.getElementById('col-date-form');
  const examType = document.getElementById('col-exam-type');
  const elig     = sex === 'F' && age >= 25 && age <= 65;

  if (sex !== 'F') {
    badge.textContent = 'Non applicable';
    badge.className = 'program-eligibility-badge elig-no';
    form.classList.add('hidden');
  } else if (elig) {
    badge.textContent = 'Éligible ✓';
    badge.className = 'program-eligibility-badge elig-ok';
    form.classList.remove('hidden');
    if (age <= 29) {
      examType.textContent = '25–29 ans : Frottis cervico-utérin (FCU) — 3 examens : initial, à 1 an, puis tous les 3 ans.';
    } else {
      examType.textContent = '30–65 ans : Test HPV-HR (papillomavirus à haut risque) — tous les 5 ans.';
    }
  } else {
    badge.textContent = age < 25 ? 'Éligible à partir de 25 ans' : 'Programme jusqu\'à 65 ans';
    badge.className = 'program-eligibility-badge elig-warn';
    form.classList.add('hidden');
  }
}

/* Calculateurs de dates */
function calculateNextScreening(lastDateStr, intervalYears) {
  if (!lastDateStr) return null;
  const last = new Date(lastDateStr);
  const next = new Date(last);
  next.setFullYear(next.getFullYear() + intervalYears);
  return next;
}

function formatDate(date) {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getDateStatus(nextDate) {
  const today = new Date();
  const msPerMonth = 30 * 24 * 60 * 60 * 1000;
  const diff = nextDate - today;
  if (diff < 0) return 'late';
  if (diff < 3 * msPerMonth) return 'soon';
  return 'ok';
}

function renderNextDate(containerId, nextDate, programLabel) {
  const el = document.getElementById(containerId);
  if (!nextDate) { el.textContent = ''; return; }
  const status = getDateStatus(nextDate);
  const isLate = status === 'late';
  const isSoon = status === 'soon';

  let cls = 'next-date-result ';
  let prefix = '';
  if (isLate) { cls += 'next-date-late'; prefix = '⚠️ En retard — '; }
  else if (isSoon) { cls += 'next-date-soon'; prefix = '🕐 Bientôt — '; }
  else { cls += 'next-date-ok'; prefix = '✓ Prochain examen : '; }

  el.className = cls;
  el.textContent = prefix + formatDate(nextDate);

  if (isLate) el.textContent += ' — Vous êtes en retard pour ce dépistage. Prenez rendez-vous dès que possible.';
  updateScreeningTable();
}

function calculateSeinNext() {
  const val = document.getElementById('sein-last-date').value;
  const next = calculateNextScreening(val, 2);
  renderNextDate('sein-next-date', next, 'Sein');
  state.cancers.programs.sein = { lastDate: val, nextDate: next, status: next ? getDateStatus(next) : null };
  saveState();
  state.cancers.completed = true;
  saveState();
  updateProgress();
}

function calculateCCRNext() {
  const val = document.getElementById('ccr-last-date').value;
  const next = calculateNextScreening(val, 2);
  renderNextDate('ccr-next-date', next, 'Colorectal');
  state.cancers.programs.colorectal = { lastDate: val, nextDate: next, status: next ? getDateStatus(next) : null };
  saveState();
  state.cancers.completed = true;
  saveState();
  updateProgress();
}

function calculateColNext() {
  const age  = state.cancers.age;
  const val  = document.getElementById('col-last-date').value;
  const interval = age && age <= 29 ? 3 : 5;
  const next = calculateNextScreening(val, interval);
  renderNextDate('col-next-date', next, 'Col');
  state.cancers.programs.col = { lastDate: val, nextDate: next, status: next ? getDateStatus(next) : null };
  saveState();
  state.cancers.completed = true;
  saveState();
  updateProgress();
}

function updateScreeningTable() {
  const sex = state.cancers.sex;
  const age = state.cancers.age;
  if (!sex || !age) return;

  const table = document.getElementById('cancers-summary-table');
  const tbody = document.getElementById('screening-table-body');
  table.classList.remove('hidden');

  const programs = [
    {
      name: 'Cancer du sein',
      elig: sex === 'F' && age >= 50 && age <= 74,
      program: state.cancers.programs.sein,
      notApplicable: sex !== 'F'
    },
    {
      name: 'Cancer colorectal',
      elig: age >= 50 && age <= 74,
      program: state.cancers.programs.colorectal,
      notApplicable: false
    },
    {
      name: 'Cancer du col de l\'utérus',
      elig: sex === 'F' && age >= 25 && age <= 65,
      program: state.cancers.programs.col,
      notApplicable: sex !== 'F'
    }
  ];

  tbody.innerHTML = programs.map(p => {
    if (p.notApplicable) {
      return `<tr><td>${p.name}</td><td>⚪ Non applicable</td><td>—</td><td>—</td></tr>`;
    }
    if (!p.elig) {
      return `<tr><td>${p.name}</td><td>⚠️ Hors âge d'éligibilité</td><td>—</td><td>Revenez à l'âge éligible</td></tr>`;
    }
    if (!p.program || !p.program.nextDate) {
      return `<tr><td>${p.name}</td><td>❓ À programmer</td><td>Saisissez la date du dernier examen</td><td>Contacter votre médecin</td></tr>`;
    }
    const st = p.program.status;
    const statusText = st === 'late' ? '⚠️ En retard' : st === 'soon' ? '🕐 Bientôt' : '✅ À jour';
    const nextDate = new Date(p.program.nextDate);
    return `<tr><td>${p.name}</td><td>${statusText}</td><td>${formatDate(nextDate)}</td><td>${st === 'late' ? 'Prendre RDV rapidement' : 'À planifier'}</td></tr>`;
  }).join('');
}

/* ══════════════════════════════════════════════
   MODULE 5 — RÉCAPITULATIF
══════════════════════════════════════════════ */

function generateRecap() {
  const hasAny = state.bilan.completed || state.findrisk.completed || state.cardio.completed || state.cancers.completed;

  document.getElementById('recap-empty').classList.toggle('hidden', hasAny);
  document.getElementById('recap-content').classList.toggle('hidden', !hasAny);

  if (!hasAny) return;

  // Date
  document.getElementById('recap-date').textContent =
    'Bilan réalisé le ' + new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Tableau synthèse
  const rows = [];
  const actions = [];

  if (state.bilan.completed) {
    const scores = state.bilan.themeScores;
    const allPcts = Object.values(scores).map(s => s.pct);
    const avgPct = allPcts.reduce((a, b) => a + b, 0) / allPcts.length;
    const alertThemes = BILAN_THEMES.filter(t => scores[t.id] && scores[t.id].pct < 45).map(t => t.label);

    let level = avgPct >= 75 ? 'Favorable' : avgPct >= 45 ? 'Vigilance requise' : 'Actions prioritaires';
    let levelClass = avgPct >= 75 ? 'risk-low' : avgPct >= 45 ? 'risk-low-mid' : 'risk-high';

    rows.push({ module: 'Mon Bilan Prévention (HAS)', result: Math.round(avgPct) + '% de réponses favorables', level, levelClass,
      action: alertThemes.length ? 'Focus sur : ' + alertThemes.join(', ') : 'Maintenir les bonnes habitudes' });

    if (alertThemes.length) {
      actions.push({ priority: 1, title: 'Bilan Prévention : axes d\'amélioration', desc: 'Thèmes prioritaires : ' + alertThemes.join(', ') + '. Évoquez ces points avec votre médecin traitant.' });
    }
  }

  if (state.findrisk.completed) {
    const levelLabels = { 'low': 'Faible', 'low-mid': 'Légèrement élevé', 'mid': 'Modéré', 'high': 'Élevé', 'very-high': 'Très élevé' };
    const levelClasses = { 'low': 'risk-low', 'low-mid': 'risk-low-mid', 'mid': 'risk-mid', 'high': 'risk-high', 'very-high': 'risk-very-high' };
    const l = state.findrisk.level;
    rows.push({ module: 'FINDRISK — Risque Diabète T2', result: 'Score ' + state.findrisk.score + '/26',
      level: levelLabels[l], levelClass: levelClasses[l],
      action: l === 'low' ? 'Maintenir les bonnes habitudes' : 'Glycémie à jeun recommandée' });

    if (l !== 'low') {
      actions.push({ priority: l === 'very-high' || l === 'high' ? 1 : 2,
        title: 'Bilan glycémique à planifier',
        desc: 'Score FINDRISK ' + state.findrisk.score + '/26 (' + levelLabels[l] + '). Demandez une glycémie à jeun à votre médecin.' });
    }
  }

  if (state.cardio.completed) {
    const levelLabels = { 'low': 'Faible', 'mid': 'Modéré', 'high': 'Élevé' };
    const levelClasses = { 'low': 'risk-low', 'mid': 'risk-mid', 'high': 'risk-high' };
    const l = state.cardio.level;
    rows.push({ module: 'SCORE2 — Risque Cardiovasculaire', result: state.cardio.risk + '% à 10 ans',
      level: levelLabels[l], levelClass: levelClasses[l],
      action: l === 'low' ? 'Maintenir mode de vie sain' : l === 'mid' ? 'Réduction des facteurs de risque' : 'Consultation cardiologique' });

    if (l !== 'low') {
      actions.push({ priority: l === 'high' ? 1 : 2,
        title: 'Risque cardiovasculaire ' + levelLabels[l].toLowerCase(),
        desc: 'Risque SCORE2 de ' + state.cardio.risk + '% à 10 ans. ' +
          (state.cardio.data.smk ? 'Arrêt du tabac prioritaire. ' : '') +
          (l === 'high' ? 'Consultation cardiologique recommandée.' : 'Hygiène de vie et suivi médical régulier recommandés.') });
    }
  }

  if (state.cancers.completed) {
    const programs = state.cancers.programs;
    const latePrograms = Object.entries(programs).filter(([k, v]) => v && v.status === 'late').map(([k]) => k);
    const soonPrograms = Object.entries(programs).filter(([k, v]) => v && v.status === 'soon').map(([k]) => k);

    let level = latePrograms.length ? 'Dépistage(s) en retard' : soonPrograms.length ? 'Examen(s) à prévoir' : 'À jour';
    let levelClass = latePrograms.length ? 'risk-high' : soonPrograms.length ? 'risk-low-mid' : 'risk-low';
    rows.push({ module: 'Dépistages des cancers (INCa)', result: Object.keys(programs).length + ' programme(s) saisi(s)',
      level, levelClass, action: latePrograms.length ? 'Prise de RDV urgente' : 'Planifier les examens' });

    if (latePrograms.length) {
      const names = { sein: 'cancer du sein', colorectal: 'cancer colorectal', col: 'cancer du col de l\'utérus' };
      actions.push({ priority: 1, title: 'Dépistage en retard',
        desc: 'Programme(s) en retard : ' + latePrograms.map(p => names[p]).join(', ') + '. Prenez rendez-vous rapidement.' });
    }
  }

  // Remplir tableau
  document.getElementById('recap-table-body').innerHTML = rows.map(r => `
    <tr>
      <td><strong>${r.module}</strong></td>
      <td>${r.result}</td>
      <td><span class="risk-level-badge ${r.levelClass}" style="font-size:0.75rem;padding:6px 14px;">${r.level}</span></td>
      <td style="font-size:0.85rem;color:var(--gray);">${r.action}</td>
    </tr>
  `).join('');

  // Plan d'action
  actions.sort((a, b) => a.priority - b.priority);

  // Compléter avec actions génériques si peu de modules
  // Modules additionnels complétés
  if (state.audit && state.audit.completed && !state.audit.notApplicable) {
    const lMap = { 'low': 'Faible risque', 'low-mid': 'Usage à risque', 'mid': 'Usage nocif', 'very-high': 'Dépendance probable' };
    const cMap = { 'low': 'risk-low', 'low-mid': 'risk-low-mid', 'mid': 'risk-mid', 'very-high': 'risk-very-high' };
    const l = state.audit.level;
    rows.push({ module: 'AUDIT — Alcool', result: 'Score ' + state.audit.score + '/40', level: lMap[l] || l, levelClass: cMap[l] || 'risk-low',
      action: l === 'low' ? 'Continuer la vigilance' : 'Consultation médicale recommandée' });
    if (l !== 'low') actions.push({ priority: l === 'very-high' ? 1 : 2, title: 'Consommation d\'alcool à risque (AUDIT)', desc: 'Score AUDIT ' + state.audit.score + '/40. Évoquez votre consommation avec votre médecin. Alcool Info Service : 0 800 235 006.' });
  }

  if (state.fagerstrom && state.fagerstrom.completed && !state.fagerstrom.notSmoker) {
    const lMap2 = { 'low': 'Très faible', 'low-mid': 'Faible', 'mid': 'Moyenne', 'high': 'Forte', 'very-high': 'Très forte' };
    const cMap2 = { 'low': 'risk-low', 'low-mid': 'risk-low-mid', 'mid': 'risk-low-mid', 'high': 'risk-high', 'very-high': 'risk-very-high' };
    const l2 = state.fagerstrom.level;
    rows.push({ module: 'Fagerström — Tabac', result: 'Score ' + state.fagerstrom.score + '/10', level: 'Dépendance ' + (lMap2[l2] || ''), levelClass: cMap2[l2] || 'risk-mid',
      action: l2 === 'low' ? 'Sevrage facilité' : 'Plan de sevrage personnalisé' });
    if (l2 !== 'low') actions.push({ priority: 2, title: 'Dépendance tabagique — sevrage à planifier', desc: 'Score Fagerström ' + state.fagerstrom.score + '/10 (' + (lMap2[l2] || '') + '). Tabac Info Service : 3989.' });
  }

  if (state.act && state.act.completed && !state.act.notApplicable) {
    const lMap3 = { 'low': 'Bien contrôlé', 'mid': 'Partiellement contrôlé', 'high': 'Non contrôlé' };
    const cMap3 = { 'low': 'risk-low', 'mid': 'risk-mid', 'high': 'risk-high' };
    const l3 = state.act.level;
    rows.push({ module: 'ACT — Contrôle de l\'asthme', result: 'Score ' + state.act.score + '/25', level: lMap3[l3] || l3, levelClass: cMap3[l3] || 'risk-low',
      action: l3 === 'low' ? 'Poursuivre le traitement' : 'Réévaluation médicale' });
    if (l3 !== 'low') actions.push({ priority: l3 === 'high' ? 1 : 2, title: 'Asthme ' + (lMap3[l3] || '').toLowerCase(), desc: 'Score ACT ' + state.act.score + '/25. Consulter votre médecin pour adapter le traitement de fond.' });
  }

  if (state.stopbang && state.stopbang.completed) {
    const lMap4 = { 'low': 'Faible', 'mid': 'Intermédiaire', 'high': 'Élevé' };
    const cMap4 = { 'low': 'risk-low', 'mid': 'risk-low-mid', 'high': 'risk-high' };
    const l4 = state.stopbang.level;
    rows.push({ module: 'STOP-BANG — Apnée du sommeil', result: 'Score ' + state.stopbang.score + '/8', level: 'Risque ' + (lMap4[l4] || ''), levelClass: cMap4[l4] || 'risk-low',
      action: l4 === 'low' ? 'Pas d\'action urgente' : 'Consultation somnologue' });
    if (l4 === 'high') actions.push({ priority: 2, title: 'Risque élevé d\'apnée du sommeil', desc: 'Score STOP-BANG ' + state.stopbang.score + '/8. Consultation pneumologue/somnologue et polygraphie recommandées.' });
  }

  if (state.mrs && state.mrs.completed && !state.mrs.notApplicable) {
    const lMap5 = { 'low': 'Minimes', 'low-mid': 'Légers', 'mid': 'Modérés', 'high': 'Sévères' };
    const cMap5 = { 'low': 'risk-low', 'low-mid': 'risk-low-mid', 'mid': 'risk-mid', 'high': 'risk-high' };
    const l5 = state.mrs.level;
    rows.push({ module: 'MRS — Ménopause', result: 'Score ' + state.mrs.total + '/44', level: 'Symptômes ' + (lMap5[l5] || ''), levelClass: cMap5[l5] || 'risk-low',
      action: l5 === 'low' ? 'Hygiène de vie' : 'Consultation gynécologique' });
    if (l5 === 'high' || l5 === 'mid') actions.push({ priority: l5 === 'high' ? 1 : 3, title: 'Symptômes ménopausiques ' + (lMap5[l5] || '').toLowerCase(), desc: 'Score MRS total ' + state.mrs.total + '/44. Consultation gynécologique pour évaluer les options thérapeutiques (THM, alternatives).' });
  }

  if (!state.findrisk.completed) actions.push({ priority: 4, title: 'Compléter le score FINDRISK', desc: 'Évaluez votre risque de diabète de type 2 (8 questions, 5 min).' });
  if (!state.cardio.completed) actions.push({ priority: 4, title: 'Compléter le risque cardiovasculaire', desc: 'Calculez votre risque SCORE2 si vous avez votre dernier bilan sanguin.' });
  if (!state.cancers.completed) actions.push({ priority: 4, title: 'Vérifier les dépistages cancers', desc: 'Vérifiez votre éligibilité aux programmes INCa.' });

  const actionList = document.getElementById('action-plan-list');
  actionList.innerHTML = actions.slice(0, 8).map((a, i) => `
    <div class="action-item" role="listitem">
      <div class="action-priority priority-${Math.min(a.priority, 4)}" aria-label="Priorité ${a.priority}">
        ${i + 1}
      </div>
      <div class="action-text">
        <strong>${a.title}</strong>
        <span>${a.desc}</span>
      </div>
    </div>
  `).join('');
}

function restartAll() {
  state = {
    currentSection: 'accueil',
    bilan:    { ageRange: null, answers: {}, themeScores: {}, completed: false },
    findrisk: { score: null, level: null, completed: false },
    cardio:   { risk: null, level: null, data: {}, completed: false },
    cancers:  { sex: null, age: null, programs: {}, completed: false }
  };
  saveState();
  updateProgress();
  navigateTo('accueil');
}

/* ══════════════════════════════════════════════
   MODULE BILAN BIOLOGIQUE
══════════════════════════════════════════════ */

/* ─── Onglets bilan bio ──────────────────────── */
function switchBioTab(tab) {
  document.querySelectorAll('.bio-tab').forEach(b => {
    b.classList.toggle('active', b.id === 'tab-' + tab);
    b.setAttribute('aria-selected', b.id === 'tab-' + tab ? 'true' : 'false');
  });
  document.querySelectorAll('.bio-tab-content').forEach(c => {
    const show = c.id === 'bio-tab-' + tab;
    c.classList.toggle('hidden', !show);
    if (show) c.removeAttribute('hidden');
    else c.setAttribute('hidden', '');
  });
  if (tab === 'normes') renderBioNorms();
}

/* ─── Données des normes par groupe ─────────── */
const BIO_NORM_GROUPS = [
  {
    id: 'lipides',
    title: 'Bilan lipidique',
    subtitle: 'Cholestérol — Marqueurs de risque cardiovasculaire',
    color: '#C25B3F',
    bgColor: '#FDE8E3',
    organSVG: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 19s-8-6-8-12a5 5 0 0110 0 5 5 0 0110 0c0 6-8 12-8 12z" stroke="#C25B3F" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
    values: [
      { key: 'bio-chol-total', name: 'Cholestérol total', unit: 'mmol/L',
        zones: [{w:44,label:'< 4,0\nOptimal',color:'#2E7D32'},{w:22,label:'4,0–5,0\nNormal',color:'#7CB342'},{w:22,label:'5,0–6,2\nLimite',color:'#F59E0B'},{w:12,label:'> 6,2\nÉlevé',color:'#E65100'}],
        chronic: 'En cas de maladie cardiovasculaire ou de diabète à haut risque, l\'objectif peut être < 4,0 mmol/L — votre médecin définit votre cible.' },
      { key: 'bio-ldl', name: 'LDL-cholestérol', unit: 'mmol/L',
        zones: [{w:35,label:'< 2,6\nOptimal',color:'#2E7D32'},{w:15,label:'2,6–3,0\nNormal',color:'#7CB342'},{w:20,label:'3,0–4,0\nLimite',color:'#F59E0B'},{w:15,label:'4,0–5,0\nÉlevé',color:'#E65100'},{w:15,label:'> 5,0\nTrès élevé',color:'#C62828'}],
        chronic: '⚠ Les cibles LDL varient fortement : < 1,8 mmol/L si risque cardiovasculaire élevé — < 1,4 mmol/L après infarctus ou AVC. Ces normes NE s\'appliquent PAS dans ces situations.' },
      { key: 'bio-hdl', name: 'HDL-cholestérol', unit: 'mmol/L',
        zones: [{w:25,label:'< 0,9\nTrès bas',color:'#C62828'},{w:20,label:'0,9–1,0\nBas (H)',color:'#E65100'},{w:10,label:'1,0–1,2\nBas (F)',color:'#F59E0B'},{w:45,label:'> 1,2\nNormal',color:'#2E7D32'}],
        note: 'Plus le HDL est élevé, mieux c\'est. H = homme (seuil 1,0) · F = femme (seuil 1,2 mmol/L).' },
      { key: 'bio-tg', name: 'Triglycérides', unit: 'mmol/L',
        zones: [{w:40,label:'< 1,7\nNormal',color:'#2E7D32'},{w:15,label:'1,7–2,3\nLimite',color:'#F59E0B'},{w:20,label:'2,3–5,6\nÉlevé',color:'#E65100'},{w:25,label:'> 5,6\nTrès élevé',color:'#C62828'}],
        note: 'Un taux très élevé (> 5,6 mmol/L) augmente le risque de pancréatite aiguë.' },
    ]
  },
  {
    id: 'glycemie',
    title: 'Métabolisme glucidique',
    subtitle: 'Glycémie — Dépistage du diabète et du prédiabète',
    color: '#2A7B6F',
    bgColor: '#D1EDE9',
    organSVG: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><ellipse cx="11" cy="13" rx="7" ry="6" stroke="#2A7B6F" stroke-width="1.8"/><path d="M7 13c0-2 1.5-4 4-4s4 2 4 4" stroke="#2A7B6F" stroke-width="1.5" stroke-linecap="round"/><circle cx="11" cy="13" r="1.5" fill="#2A7B6F" opacity="0.5"/></svg>`,
    values: [
      { key: 'bio-glyc', name: 'Glycémie à jeun', unit: 'g/L',
        zones: [{w:50,label:'0,70–1,10\nNormal',color:'#2E7D32'},{w:25,label:'1,10–1,26\nPrédiabète',color:'#F59E0B'},{w:25,label:'≥ 1,26\nDiabète*',color:'#C62828'}],
        note: '* Diabète confirmé si glycémie ≥ 1,26 g/L à jeun à deux reprises, ou ≥ 2,00 g/L à n\'importe quel moment.',
        chronic: 'En cas de diabète traité, les cibles glycémiques sont individualisées et fixées par le médecin (souvent entre 0,70 et 1,30 g/L à jeun).' },
      { key: 'bio-hba1c', name: 'HbA1c (hémoglobine glyquée)', unit: '%',
        zones: [{w:33,label:'< 5,7 %\nNormal',color:'#2E7D32'},{w:22,label:'5,7–6,4 %\nPrédiabète',color:'#F59E0B'},{w:45,label:'≥ 6,5 %\nDiabète',color:'#C62828'}],
        chronic: 'Chez le diabétique traité, la cible HbA1c est personnalisée (souvent < 7 % ou < 8 % selon l\'âge et les comorbidités).' },
    ]
  },
  {
    id: 'tension',
    title: 'Pression artérielle',
    subtitle: 'Tension — Classification ESC 2018',
    color: '#7B5EA7',
    bgColor: '#E8DFF5',
    organSVG: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="10" width="16" height="6" rx="3" stroke="#7B5EA7" stroke-width="1.8"/><path d="M3 13h16M7 10V8M15 10V8" stroke="#7B5EA7" stroke-width="1.5" stroke-linecap="round"/><path d="M5 8h12" stroke="#7B5EA7" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    values: [
      { key: 'bio-pas', name: 'Pression artérielle systolique (PAS)', unit: 'mmHg',
        zones: [{w:25,label:'< 120\nOptimale',color:'#2E7D32'},{w:22,label:'120–129\nNormale',color:'#7CB342'},{w:22,label:'130–139\nNormale haute',color:'#F59E0B'},{w:20,label:'140–179\nHTA grade 1–2',color:'#E65100'},{w:11,label:'≥ 180\nHTA sévère',color:'#C62828'}],
        chronic: 'Les cibles tensionnelles sont abaissées chez le patient diabétique ou insuffisant rénal (souvent < 130 mmHg PAS).' },
      { key: 'bio-pad', name: 'Pression artérielle diastolique (PAD)', unit: 'mmHg',
        zones: [{w:40,label:'< 80\nOptimale',color:'#2E7D32'},{w:20,label:'80–84\nNormale',color:'#7CB342'},{w:15,label:'85–89\nNormale haute',color:'#F59E0B'},{w:25,label:'≥ 90\nHTA',color:'#E65100'}] },
    ]
  },
  {
    id: 'renal',
    title: 'Bilan rénal',
    subtitle: 'Créatinine et filtration glomérulaire (DFG)',
    color: '#0369A1',
    bgColor: '#E0F2FE',
    organSVG: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M7 4C5 4 3 6 3 9c0 4 2 8 5 9 1 .4 2 .1 3-1 1 1.1 2 1.4 3 1 3-1 5-5 5-9 0-3-2-5-4-5-2 0-3 2-4 2-1 0-2-2-4-2z" stroke="#0369A1" stroke-width="1.8"/></svg>`,
    values: [
      { key: 'bio-creat', name: 'Créatinine', unit: 'µmol/L',
        zones: [{w:50,label:'Norme H 59–104\nNorme F 45–84',color:'#2E7D32'},{w:25,label:'Légèrement\nélevée',color:'#F59E0B'},{w:25,label:'Élevée\n→ insuffisance',color:'#C62828'}],
        note: 'La valeur normale dépend de l\'âge, du sexe et de la masse musculaire. Une élévation isolée n\'est pas diagnostique.' },
      { key: 'bio-dfg', name: 'DFG estimé (CKD-EPI)', unit: 'mL/min/1,73m²',
        zones: [{w:30,label:'> 90\nNormal',color:'#2E7D32'},{w:25,label:'60–89\nLégèrement ↘',color:'#7CB342'},{w:20,label:'30–59\nModéré',color:'#F59E0B'},{w:15,label:'15–29\nSévère',color:'#E65100'},{w:10,label:'< 15\nTerminal',color:'#C62828'}],
        chronic: 'Une insuffisance rénale chronique modifie les cibles tensionnelles, lipidiques et glycémiques. Suivi néphrologue recommandé.' },
    ]
  },
  {
    id: 'hepatique',
    title: 'Bilan hépatique',
    subtitle: 'Transaminases ASAT / ALAT',
    color: '#D4820A',
    bgColor: '#FEF3C7',
    organSVG: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 6c0-1 3-2 7-2 5 0 8 2 8 5 0 4-3 10-8 10-5 0-7-6-7-10 0-2 0-3 0-3z" stroke="#D4820A" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
    values: [
      { key: 'bio-asat', name: 'ASAT (GOT)', unit: 'U/L',
        zones: [{w:50,label:'< 35 (F) / < 40 (H)\nNormal',color:'#2E7D32'},{w:25,label:'1–3× norme\nLimite',color:'#F59E0B'},{w:25,label:'> 3× norme\nÉlevé',color:'#C62828'}],
        note: 'L\'élévation des transaminases peut être liée à l\'alcool, certains médicaments, ou une maladie du foie.' },
      { key: 'bio-alat', name: 'ALAT (GPT)', unit: 'U/L',
        zones: [{w:50,label:'< 35 (F) / < 45 (H)\nNormal',color:'#2E7D32'},{w:25,label:'1–3× norme\nLimite',color:'#F59E0B'},{w:25,label:'> 3× norme\nÉlevé',color:'#C62828'}] },
    ]
  },
  {
    id: 'autres',
    title: 'Autres marqueurs',
    subtitle: 'Thyroïde · Inflammation · Micronutriments · Métabolisme',
    color: '#4A5568',
    bgColor: '#F1F5F9',
    organSVG: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M8 7c-1-2 1-4 3-4s4 2 3 4" stroke="#4A5568" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="7" cy="11" rx="3" ry="4" stroke="#4A5568" stroke-width="1.8"/><ellipse cx="15" cy="11" rx="3" ry="4" stroke="#4A5568" stroke-width="1.8"/></svg>`,
    values: [
      { key: 'bio-tsh', name: 'TSH (thyréostimuline)', unit: 'mUI/L',
        zones: [{w:15,label:'< 0,27\nHyperT',color:'#C62828'},{w:55,label:'0,27–4,2\nNormal',color:'#2E7D32'},{w:30,label:'> 4,2\nHypoT',color:'#E65100'}],
        note: 'Les normes TSH varient selon l\'âge et l\'état thyroïdien. Une anomalie doit être confirmée par un médecin.' },
      { key: 'bio-crp', name: 'CRP ultrasensible', unit: 'mg/L',
        zones: [{w:35,label:'< 1\nRisque CV faible',color:'#2E7D32'},{w:30,label:'1–3\nRisque modéré',color:'#7CB342'},{w:20,label:'3–10\nInflammation',color:'#E65100'},{w:15,label:'> 10\nInfection/inflamm',color:'#C62828'}],
        note: 'La CRP-us est un marqueur d\'inflammation générale. Une valeur élevée isolée doit être interprétée par un médecin.' },
      { key: 'bio-vitd', name: 'Vitamine D (25-OH)', unit: 'ng/mL',
        zones: [{w:25,label:'< 20\nDéficit',color:'#C62828'},{w:25,label:'20–30\nInsuffisance',color:'#F59E0B'},{w:35,label:'30–80\nOptimal',color:'#2E7D32'},{w:15,label:'> 100\nSurcharge',color:'#E65100'}] },
      { key: 'bio-ferritine', name: 'Ferritine', unit: 'µg/L',
        zones: [{w:20,label:'Bas (F < 10,\nH < 30)',color:'#0369A1'},{w:55,label:'Normal\nH 30–400 · F 10–200',color:'#2E7D32'},{w:25,label:'Élevé\n→ surcharge fer',color:'#E65100'}] },
      { key: 'bio-urate', name: 'Acide urique', unit: 'µmol/L',
        zones: [{w:55,label:'< 360 (F) / < 420 (H)\nNormal',color:'#2E7D32'},{w:25,label:'Limite\nhyperuricémie',color:'#F59E0B'},{w:20,label:'Élevé\n→ risque goutte',color:'#C62828'}],
        note: 'L\'hyperuricémie est asymptomatique mais prédispose à la goutte et aux calculs rénaux.' },
    ]
  },
];

function renderBioNorms() {
  const container = document.getElementById('bio-norms-container');
  if (!container || container.dataset.rendered) return;
  const p = getProfile();
  const bio = p.bio || {};

  container.innerHTML = BIO_NORM_GROUPS.map(group => {
    const cards = group.values.map(val => {
      const userVal = bio[val.key.replace('bio-','')] ?? getVal(val.key);
      const barSegments = val.zones.map(z =>
        `<div class="bio-norm-bar-segment" style="flex:${z.w};background:${z.color}" title="${z.label.replace('\n',' ')}"></div>`
      ).join('');
      const barLabels = val.zones.map(z =>
        `<span style="flex:${z.w};text-align:center;font-size:0.58rem;color:var(--gray);line-height:1.3">${z.label.replace('\n','<br>')}</span>`
      ).join('');

      // Statut de la valeur utilisateur
      let userHtml = '';
      if (userVal !== null && userVal !== undefined) {
        // Trouver la zone correspondante
        const zone = val.zones.find((z, i) => {
          const nextZone = val.zones[i + 1];
          return !nextZone; // dernier segment = catch-all, on prendra la couleur de la zone trouvée
        });
        userHtml = `<div class="bio-norm-user-value">
          <span class="bio-norm-user-dot" style="background:${findZoneColor(val.zones, val.key, userVal)}"></span>
          <span class="bio-norm-user-val">${userVal} ${val.unit}</span>
          <span class="bio-norm-user-label">→ ${findZoneLabel(val.zones, val.key, userVal)}</span>
        </div>`;
      }

      const chronic = val.chronic ? `<div class="bio-norm-chronic-note"><strong>⚕ Pathologie chronique :</strong> ${val.chronic}</div>` : '';
      const note = val.note ? `<div style="font-size:0.72rem;color:var(--gray);margin-top:8px;font-style:italic">${val.note}</div>` : '';

      return `<div class="bio-norm-card">
        <div class="bio-norm-card-header">
          <div class="bio-norm-card-name">${val.name}</div>
          <div class="bio-norm-card-unit">${val.unit}</div>
        </div>
        <div class="bio-norm-bar-wrap">
          <div class="bio-norm-bar">${barSegments}</div>
          <div class="bio-norm-bar-labels" style="display:flex">${barLabels}</div>
        </div>
        ${userHtml}${note}${chronic}
      </div>`;
    }).join('');

    return `<div class="bio-norm-group">
      <div class="bio-norm-group-header">
        <div class="bio-norm-group-organ" style="background:${group.bgColor}">${group.organSVG}</div>
        <div>
          <div class="bio-norm-group-title">${group.title}</div>
          <div class="bio-norm-group-subtitle">${group.subtitle}</div>
        </div>
      </div>
      <div class="bio-norm-cards-grid">${cards}</div>
    </div>`;
  }).join('');

  container.dataset.rendered = '1';
}

function findZoneColor(zones, key, val) {
  // Heuristique simplifiée basée sur les clés connues
  const statusEl = document.getElementById('bio-status-' + key.replace('bio-',''));
  if (statusEl) {
    if (statusEl.classList.contains('normal')) return '#2E7D32';
    if (statusEl.classList.contains('limite')) return '#F59E0B';
    if (statusEl.classList.contains('eleve')) return '#E65100';
    if (statusEl.classList.contains('critique')) return '#C62828';
    if (statusEl.classList.contains('bas')) return '#0369A1';
  }
  return '#9AAABB';
}

function findZoneLabel(zones, key, val) {
  const statusEl = document.getElementById('bio-status-' + key.replace('bio-',''));
  return statusEl?.textContent || '';
}

/* Constante de conversion mmol→mg pour lipides (facteur ×38.67 pour chol, ×88.57 pour TG) */
const CONV = { CHOL: 38.67, TG: 88.57, GLYC_GL_TO_MMOL: 0.0555 };

function convertBio(field) {
  const map = {
    'chol-total': { mmol: 'bio-chol-total', mg: 'bio-chol-total-mg', factor: CONV.CHOL },
    'hdl':        { mmol: 'bio-hdl',         mg: 'bio-hdl-mg',         factor: CONV.CHOL },
    'ldl':        { mmol: 'bio-ldl',         mg: 'bio-ldl-mg',         factor: CONV.CHOL },
    'tg':         { mmol: 'bio-tg',          mg: 'bio-tg-mg',          factor: CONV.TG   },
    'glyc':       { mmol: 'bio-glyc-mmol',   mg: 'bio-glyc',  special: 'glyc' }
  };
  const m = map[field];
  if (!m) return;

  if (m.special === 'glyc') {
    const glVal = parseFloat(document.getElementById('bio-glyc').value);
    const mmolVal = parseFloat(document.getElementById('bio-glyc-mmol').value);
    if (document.activeElement.id === 'bio-glyc' && glVal) {
      document.getElementById('bio-glyc-mmol').value = (glVal / 0.18).toFixed(1);
    } else if (document.activeElement.id === 'bio-glyc-mmol' && mmolVal) {
      document.getElementById('bio-glyc').value = (mmolVal * 0.18).toFixed(2);
    }
  } else {
    const mmolEl = document.getElementById(m.mmol);
    const mgEl   = document.getElementById(m.mg);
    if (document.activeElement.id === m.mg) {
      const mg = parseFloat(mgEl.value);
      if (mg) mmolEl.value = (mg / m.factor).toFixed(2);
    } else {
      const mmol = parseFloat(mmolEl.value);
      if (mmol) mgEl.value = Math.round(mmol * m.factor);
    }
  }
  updateBioValues();
}

function checkBioAge() {
  const dateEl = document.getElementById('bio-date');
  const warn   = document.getElementById('bio-date-warn');
  if (!dateEl.value) return;
  const months = (new Date() - new Date(dateEl.value)) / (30 * 24 * 3600 * 1000);
  warn.classList.toggle('hidden', months <= 6);
}

function getVal(id) {
  const v = parseFloat(document.getElementById(id)?.value);
  return isNaN(v) ? null : v;
}

function setBioStatus(id, value, rules) {
  const el = document.getElementById(id);
  if (!el || value === null) { if (el) el.textContent = ''; return; }
  let status = '', label = '';
  for (const r of rules) {
    if (r.fn(value)) { status = r.cls; label = r.label; break; }
  }
  el.textContent = label;
  el.className = 'bio-status ' + status;
}

function updateBioValues() {
  const p = getProfile();
  const sex = p.sex || null;

  const chol = getVal('bio-chol-total');
  const hdl  = getVal('bio-hdl');
  const ldl  = getVal('bio-ldl');
  const tg   = getVal('bio-tg');
  const glyc = getVal('bio-glyc');      // g/L
  const hba1c = getVal('bio-hba1c');
  const pas  = getVal('bio-pas');
  const pad  = getVal('bio-pad');
  const creat = getVal('bio-creat');    // µmol/L
  const asat = getVal('bio-asat');
  const alat = getVal('bio-alat');
  const tsh  = getVal('bio-tsh');
  const crp  = getVal('bio-crp');
  const ferritine = getVal('bio-ferritine');
  const vitd = getVal('bio-vitd');
  const urate = getVal('bio-urate');

  // Non-HDL calculé
  const nonHDL = (chol !== null && hdl !== null) ? +(chol - hdl).toFixed(2) : null;
  const nonHDLEl = document.getElementById('bio-nonhdl-display');
  nonHDLEl.textContent = nonHDL !== null ? nonHDL + ' mmol/L' : '—';

  // LDL Friedewald si absent (valide si TG < 4.0 mmol/L)
  let ldlCalc = ldl;
  if (ldlCalc === null && chol !== null && hdl !== null && tg !== null && tg < 4.0) {
    ldlCalc = +(chol - hdl - tg / 2.2).toFixed(2);
    document.getElementById('bio-ldl').placeholder = ldlCalc + ' (calculé)';
  }

  // DFG CKD-EPI
  let dfg = null;
  if (creat !== null && p.age) {
    const crMgDl = creat / 88.4;
    const isFemale = sex === 'F';
    const kappa = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.329 : -0.411;
    const sexFactor = isFemale ? 1.018 : 1;
    dfg = Math.round(141 * Math.pow(Math.min(crMgDl / kappa, 1), alpha)
      * Math.pow(Math.max(crMgDl / kappa, 1), -1.209)
      * Math.pow(0.993, p.age) * sexFactor);
  }
  const dfgEl = document.getElementById('bio-dfg-display');
  dfgEl.textContent = dfg !== null ? dfg + ' mL/min/1,73m²' : '—';

  // Statuts
  setBioStatus('bio-status-chol-total', chol, [
    { fn: v => v < 5.0, cls: 'normal', label: '✓ Normal' },
    { fn: v => v < 6.2, cls: 'limite', label: '↗ Limite' },
    { fn: () => true,   cls: 'eleve',  label: '▲ Élevé' },
  ]);
  setBioStatus('bio-status-hdl', hdl, [
    { fn: v => (sex === 'F' ? v >= 1.2 : v >= 1.0), cls: 'normal', label: '✓ Normal' },
    { fn: () => true, cls: 'bas', label: '↘ Bas' },
  ]);
  setBioStatus('bio-status-ldl', ldlCalc, [
    { fn: v => v < 3.0,  cls: 'normal',  label: '✓ Normal' },
    { fn: v => v < 4.0,  cls: 'limite',  label: '↗ Limite' },
    { fn: v => v < 5.0,  cls: 'eleve',   label: '▲ Élevé' },
    { fn: () => true,    cls: 'critique', label: '⚠ Très élevé' },
  ]);
  setBioStatus('bio-status-tg', tg, [
    { fn: v => v < 1.7, cls: 'normal', label: '✓ Normal' },
    { fn: v => v < 2.3, cls: 'limite', label: '↗ Limite' },
    { fn: v => v < 5.6, cls: 'eleve',  label: '▲ Élevé' },
    { fn: () => true,   cls: 'critique', label: '⚠ Très élevé' },
  ]);
  setBioStatus('bio-status-nonhdl', nonHDL, [
    { fn: v => v < 3.8, cls: 'normal', label: '✓ Normal' },
    { fn: v => v < 4.5, cls: 'limite', label: '↗ Limite' },
    { fn: () => true,   cls: 'eleve',  label: '▲ Élevé' },
  ]);
  setBioStatus('bio-status-glyc', glyc, [
    { fn: v => v < 1.10, cls: 'normal',  label: '✓ Normal' },
    { fn: v => v < 1.26, cls: 'limite',  label: 'Prédiabète' },
    { fn: () => true,    cls: 'critique', label: '⚠ Élevée' },
  ]);
  setBioStatus('bio-status-hba1c', hba1c, [
    { fn: v => v < 5.7, cls: 'normal', label: '✓ Normal' },
    { fn: v => v < 6.5, cls: 'limite', label: 'Prédiabète' },
    { fn: () => true,   cls: 'critique', label: '⚠ Diabète' },
  ]);
  setBioStatus('bio-status-pas', pas, [
    { fn: v => v < 120, cls: 'normal', label: '✓ Optimale' },
    { fn: v => v < 130, cls: 'normal', label: '✓ Normale' },
    { fn: v => v < 140, cls: 'limite', label: '↗ Haute' },
    { fn: v => v < 180, cls: 'eleve',  label: '▲ HTA' },
    { fn: () => true,   cls: 'critique', label: '⚠ HTA sévère' },
  ]);
  setBioStatus('bio-status-pad', pad, [
    { fn: v => v < 80, cls: 'normal', label: '✓ Optimale' },
    { fn: v => v < 90, cls: 'limite', label: '↗ Haute' },
    { fn: () => true,  cls: 'eleve',  label: '▲ HTA' },
  ]);
  setBioStatus('bio-status-creat', creat, [
    { fn: v => sex === 'F' ? (v >= 45 && v <= 84) : (v >= 59 && v <= 104), cls: 'normal', label: '✓ Normal' },
    { fn: v => v < (sex === 'F' ? 45 : 59), cls: 'bas', label: '↘ Bas' },
    { fn: () => true, cls: 'eleve', label: '▲ Élevée' },
  ]);
  setBioStatus('bio-status-dfg', dfg, [
    { fn: v => v >= 90, cls: 'normal', label: '✓ Normal' },
    { fn: v => v >= 60, cls: 'limite', label: 'Légère ↘' },
    { fn: v => v >= 30, cls: 'eleve',  label: '▲ Modérée' },
    { fn: () => true,   cls: 'critique', label: '⚠ Sévère' },
  ]);
  setBioStatus('bio-status-asat', asat, [
    { fn: v => (sex === 'F' ? v <= 35 : v <= 40), cls: 'normal', label: '✓ Normal' },
    { fn: v => v <= 80, cls: 'limite', label: '↗ Limite' },
    { fn: () => true,   cls: 'eleve',  label: '▲ Élevée' },
  ]);
  setBioStatus('bio-status-alat', alat, [
    { fn: v => (sex === 'F' ? v <= 35 : v <= 45), cls: 'normal', label: '✓ Normal' },
    { fn: v => v <= 90, cls: 'limite', label: '↗ Limite' },
    { fn: () => true,   cls: 'eleve',  label: '▲ Élevée' },
  ]);
  setBioStatus('bio-status-tsh', tsh, [
    { fn: v => v >= 0.27 && v <= 4.2, cls: 'normal', label: '✓ Normal' },
    { fn: v => v < 0.27, cls: 'bas',   label: '↘ Bas' },
    { fn: () => true,    cls: 'eleve', label: '▲ Élevée' },
  ]);
  setBioStatus('bio-status-crp', crp, [
    { fn: v => v < 1,  cls: 'normal', label: '✓ Faible' },
    { fn: v => v < 3,  cls: 'limite', label: 'Modéré' },
    { fn: v => v < 10, cls: 'eleve',  label: '▲ Élevée' },
    { fn: () => true,  cls: 'critique', label: '⚠ Très élevée' },
  ]);
  setBioStatus('bio-status-vitd', vitd, [
    { fn: v => v >= 30,  cls: 'normal', label: '✓ Suffisant' },
    { fn: v => v >= 20,  cls: 'limite', label: '↗ Insuffisant' },
    { fn: () => true,    cls: 'eleve',  label: '⚠ Déficit' },
  ]);
  setBioStatus('bio-status-ferritine', ferritine, [
    { fn: v => sex === 'F' ? (v >= 10 && v <= 200) : (v >= 30 && v <= 400), cls: 'normal', label: '✓ Normal' },
    { fn: v => v < (sex === 'F' ? 10 : 30), cls: 'bas',  label: '↘ Bas' },
    { fn: () => true, cls: 'eleve', label: '▲ Élevée' },
  ]);
  setBioStatus('bio-status-urate', urate, [
    { fn: v => sex === 'F' ? v < 360 : v < 420, cls: 'normal', label: '✓ Normal' },
    { fn: v => sex === 'F' ? v < 480 : v < 540, cls: 'limite', label: '↗ Limite' },
    { fn: () => true, cls: 'eleve', label: '▲ Élevé' },
  ]);

  // Pré-remplir SCORE2 si valeurs présentes
  if (chol !== null) { document.getElementById('c-total-chol').value = chol.toFixed(2); document.querySelector('input[name="c_unit"][value="mmol"]').checked = true; }
  if (hdl !== null)  { document.getElementById('c-hdl').value = hdl.toFixed(2); }
  if (pas !== null)  { document.getElementById('c-sbp').value = Math.round(pas); }
  calculateNonHDL();

  // Auto-unlock SCORE2 gate si lipides + PAS présents
  if (chol !== null && hdl !== null && pas !== null) {
    document.getElementById('cardio-bio-gate').classList.add('hidden');
    document.getElementById('cardio-form').classList.remove('hidden');
    document.querySelector('input[name="cardio_bio_gate"][value="oui"]').checked = true;
  }

  // Auto-enrichir FINDRISK Q7 si glycémie élevée
  if (glyc !== null && glyc >= 1.10) {
    const hyperEl = document.querySelector('input[name="f_hyperglycemia"][value="5"]');
    if (hyperEl && !hyperEl.checked) {
      hyperEl.checked = true;
      const note = document.createElement('div');
      note.className = 'prefill-note';
      note.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M6 5v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Pré-rempli depuis votre bilan biologique (glycémie ' + glyc + ' g/L)';
      const parent = hyperEl.closest('.question-card');
      if (parent && !parent.querySelector('.prefill-note')) parent.appendChild(note);
    }
  }

  // Sauvegarder dans le profil
  updateProfile({ bio: { chol, hdl, ldl: ldlCalc, tg, nonHDL, glyc, hba1c, pas, pad, creat, dfg, asat, alat, tsh, crp, ferritine, vitd, urate } });
}

function saveBioBilan() {
  const p = getProfile();
  const bio = p.bio || {};
  const panel = document.getElementById('bio-summary-panel');

  const hasLipids = bio.chol !== null && bio.hdl !== null;
  const hasPAS    = bio.pas !== null;
  const score2Ready = hasLipids && hasPAS;

  let html = '<div class="bio-summary-title">Résumé de votre bilan</div>';

  if (score2Ready) {
    html += `<div class="bio-summary-unlock">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M5 8V6a4 4 0 018 0v2" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="8" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/></svg>
      SCORE2 débloqué — vos valeurs lipidiques et tensionnelles sont pré-remplies.
      <button class="btn-primary" style="padding:6px 14px;font-size:0.8rem;margin-left:auto" onclick="navigateTo('cardio')">Calculer SCORE2 →</button>
    </div>`;
  } else {
    const missing = [];
    if (!hasLipids) missing.push('cholestérol total et HDL');
    if (!hasPAS) missing.push('pression artérielle systolique');
    html += `<div class="info-box info-box--warn" style="margin-bottom:16px">Manque pour débloquer SCORE2 : ${missing.join(', ')}.</div>`;
  }

  const rows = [
    { label: 'Cholestérol total', val: bio.chol, unit: 'mmol/L' },
    { label: 'HDL', val: bio.hdl, unit: 'mmol/L' },
    { label: 'LDL', val: bio.ldl, unit: 'mmol/L' },
    { label: 'Non-HDL', val: bio.nonHDL, unit: 'mmol/L' },
    { label: 'Triglycérides', val: bio.tg, unit: 'mmol/L' },
    { label: 'Glycémie à jeun', val: bio.glyc, unit: 'g/L' },
    { label: 'HbA1c', val: bio.hba1c, unit: '%' },
    { label: 'PAS', val: bio.pas, unit: 'mmHg' },
    { label: 'PAD', val: bio.pad, unit: 'mmHg' },
    { label: 'Créatinine', val: bio.creat, unit: 'µmol/L' },
    { label: 'DFG estimé', val: bio.dfg, unit: 'mL/min' },
  ].filter(r => r.val !== null && r.val !== undefined);

  if (rows.length) {
    html += '<div class="bio-summary-rows">' + rows.map(r =>
      `<div class="bio-summary-row"><span class="bio-summary-name">${r.label}</span><span class="bio-summary-value">${r.val} ${r.unit}</span></div>`
    ).join('') + '</div>';
  }

  panel.innerHTML = html;
  panel.classList.remove('hidden');

  state.biobilan = { completed: true };
  saveState();
  updateProgress();
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveBioIST() {
  const fields = ['ist-vih','ist-hepb','ist-hepc','ist-chlamydia','ist-syphilis','ist-hpv'];
  const ist = {};
  fields.forEach(id => { ist[id.replace('ist-','')] = document.getElementById(id)?.value || ''; });
  updateProfile({ ist });
}

function clearBioBilan() {
  document.querySelectorAll('#bio-form input[type="number"], #bio-form input[type="date"]').forEach(el => el.value = '');
  document.getElementById('bio-summary-panel').classList.add('hidden');
  document.getElementById('bio-date-warn').classList.add('hidden');
  document.getElementById('bio-nonhdl-display').textContent = '—';
  document.getElementById('bio-dfg-display').textContent = '—';
  document.querySelectorAll('.bio-status').forEach(el => { el.textContent = ''; el.className = 'bio-status'; });
}

/* ══════════════════════════════════════════════
   PROFIL UTILISATEUR (données partagées)
══════════════════════════════════════════════ */

function getProfile() {
  return state.profile || {};
}

function updateProfile(data) {
  state.profile = { ...(state.profile || {}), ...data };
  saveState();
  prefillModulesFromProfile();
}

function prefillModulesFromProfile() {
  const p = getProfile();

  // STOP-BANG : IMC auto depuis FINDRISK
  if (p.imc !== undefined) {
    const imcAuto = document.getElementById('sb-imc-auto');
    const imcOpts = document.getElementById('sb-imc-options');
    if (imcAuto && imcOpts) {
      const over35 = p.imc > 35;
      imcAuto.className = 'info-box info-box--info';
      imcAuto.style.marginBottom = '10px';
      imcAuto.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M7 6v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> IMC repris de FINDRISK : <strong>${p.imc.toFixed(1)} kg/m²</strong> → ${over35 ? 'Oui (> 35)' : 'Non (≤ 35)'}`;
      imcAuto.classList.remove('hidden');
      // Auto-check la bonne option
      document.querySelectorAll('input[name="sb_b"]').forEach(r => { r.checked = r.value === (over35 ? '1' : '0'); });
    }
  }

  // STOP-BANG : âge auto
  if (p.age !== undefined) {
    const ageAuto = document.getElementById('sb-age-auto');
    if (ageAuto) {
      const over50 = p.age > 50;
      ageAuto.className = 'info-box info-box--info';
      ageAuto.style.marginBottom = '10px';
      ageAuto.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M7 6v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Âge repris du profil : <strong>${p.age} ans</strong> → ${over50 ? 'Oui (> 50)' : 'Non (≤ 50)'}`;
      ageAuto.classList.remove('hidden');
      document.querySelectorAll('input[name="sb_a"]').forEach(r => { r.checked = r.value === (over50 ? '1' : '0'); });
    }
  }

  // STOP-BANG : sexe auto
  if (p.sex !== undefined) {
    const sexAuto = document.getElementById('sb-sex-auto');
    if (sexAuto) {
      const isMale = p.sex === 'H';
      sexAuto.className = 'info-box info-box--info';
      sexAuto.style.marginBottom = '10px';
      sexAuto.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M7 6v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Sexe repris du profil : <strong>${isMale ? 'Homme' : 'Femme'}</strong>`;
      sexAuto.classList.remove('hidden');
      document.querySelectorAll('input[name="sb_g"]').forEach(r => { r.checked = r.value === (isMale ? '1' : '0'); });
    }
  }

  // Masquer MRS si homme ou âge < 40
  updateMRSGate();
}

function updateMRSGate() {
  const p = getProfile();
  const notEligEl = document.getElementById('mrs-not-eligible');
  const notEligText = document.getElementById('mrs-not-eligible-text');
  const gateCard = document.getElementById('mrs-gate-card');
  if (!notEligEl || !gateCard) return;

  if (p.sex === 'H') {
    notEligEl.classList.remove('hidden');
    notEligText.textContent = 'Ce module est réservé aux femmes. Il n\'est pas applicable à votre profil.';
    gateCard.classList.add('hidden');
  } else if (p.age && p.age < 40) {
    notEligEl.classList.remove('hidden');
    notEligText.textContent = `Ce module s'adresse aux femmes de 40 ans et plus. Vous pourrez y accéder à partir de 40 ans.`;
    gateCard.classList.add('hidden');
  } else {
    notEligEl.classList.add('hidden');
    gateCard.classList.remove('hidden');
  }
}

/* ══════════════════════════════════════════════
   LOGIQUE HORS-TRANCHE D'ÂGE
══════════════════════════════════════════════ */

const HORS_TRANCHE_MODULES = {
  '26-44': {
    label: '26–44 ans',
    nextTranche: 45,
    modules: [
      { id: 'findrisk', label: 'FINDRISK — Diabète' },
      { id: 'audit',    label: 'AUDIT — Alcool' },
      { id: 'fagerstrom', label: 'Fagerström — Tabac' },
      { id: 'act',      label: 'ACT — Asthme' },
      { id: 'stopbang', label: 'STOP-BANG — Apnée' },
      { id: 'cancers',  label: 'Dépistage col utérus (femmes)' },
    ]
  },
  '51-59': {
    label: '51–59 ans',
    nextTranche: 60,
    modules: [
      { id: 'findrisk', label: 'FINDRISK — Diabète' },
      { id: 'cardio',   label: 'SCORE2 — Risque cardiovasculaire' },
      { id: 'audit',    label: 'AUDIT — Alcool' },
      { id: 'fagerstrom', label: 'Fagerström — Tabac' },
      { id: 'act',      label: 'ACT — Asthme' },
      { id: 'stopbang', label: 'STOP-BANG — Apnée' },
      { id: 'mrs',      label: 'MRS — Ménopause (femmes)' },
      { id: 'cancers',  label: 'Dépistages sein & colorectal' },
    ]
  },
  'other': {
    modules: [
      { id: 'findrisk', label: 'FINDRISK — Diabète' },
      { id: 'cardio',   label: 'SCORE2 — Cardiovasculaire' },
      { id: 'audit',    label: 'AUDIT — Alcool' },
      { id: 'fagerstrom', label: 'Fagerström — Tabac' },
      { id: 'act',      label: 'ACT — Asthme' },
      { id: 'stopbang', label: 'STOP-BANG — Apnée' },
      { id: 'mrs',      label: 'MRS — Ménopause (femmes)' },
      { id: 'cancers',  label: 'Dépistages des cancers' },
    ]
  }
};

function checkBilanRealAge(val) {
  const age = parseInt(val);
  const hint = document.getElementById('bilan-age-hint');
  const horsCard = document.getElementById('bilan-hors-tranche');

  if (!age || age < 16 || age > 100) {
    horsCard.classList.add('hidden');
    hint.textContent = 'Entrez votre âge pour voir si votre bilan officiel est programmé.';
    return;
  }

  // Sauvegarder dans le profil
  updateProfile({ age });

  // Vérifier si dans une tranche officielle
  const inRange = (age >= 18 && age <= 25) || (age >= 45 && age <= 50) ||
                  (age >= 60 && age <= 65) || (age >= 70 && age <= 75);

  if (inRange) {
    horsCard.classList.add('hidden');
    // Auto-sélectionner la carte correspondante
    let range = null;
    if (age >= 18 && age <= 25) range = '18-25';
    else if (age >= 45 && age <= 50) range = '45-50';
    else if (age >= 60 && age <= 65) range = '60-65';
    else if (age >= 70 && age <= 75) range = '70-75';
    if (range) selectAgeRange(range);
    hint.textContent = `✓ Votre âge (${age} ans) correspond à la tranche ${range}. Votre bilan officiel est disponible ci-dessous.`;
    hint.style.color = 'var(--green)';
  } else {
    // Hors tranche
    hint.textContent = `ℹ Votre âge (${age} ans) est hors des tranches officielles.`;
    hint.style.color = 'var(--gold)';

    let group, nextTranche;
    if (age >= 26 && age <= 44)      { group = HORS_TRANCHE_MODULES['26-44'];  nextTranche = 45; }
    else if (age >= 51 && age <= 59) { group = HORS_TRANCHE_MODULES['51-59'];  nextTranche = 60; }
    else if (age >= 66 && age <= 69) { group = HORS_TRANCHE_MODULES['other'];  nextTranche = 70; }
    else if (age > 75)               { group = HORS_TRANCHE_MODULES['other'];  nextTranche = null; }
    else                             { group = HORS_TRANCHE_MODULES['other'];  nextTranche = 18; }

    const nextMsg = nextTranche
      ? `Votre prochain bilan prévention remboursé sera disponible à <strong>${nextTranche} ans</strong>.`
      : 'Vous pouvez continuer à bénéficier des modules de dépistage ci-dessous.';

    horsCard.innerHTML = `
      <p style="margin-bottom:12px;">
        Votre bilan prévention officiel n'est pas encore programmé pour votre tranche d'âge.<br>
        Pas d'inquiétude — vous pouvez tout de même prendre soin de vous dès aujourd'hui.<br>
        ${nextMsg}
      </p>
      <p style="font-size:0.85rem;color:var(--gray);margin-bottom:16px;">
        En attendant, les évaluations ci-dessous sont adaptées à votre profil :
      </p>
      <div class="hors-tranche-modules">
        ${(group?.modules || []).map(m =>
          `<button class="hors-tranche-module-btn" onclick="navigateTo('${m.id}')">
            → ${m.label}
          </button>`
        ).join('')}
      </div>
    `;
    horsCard.classList.remove('hidden');

    // Désactiver les cartes âge officielles
    document.querySelectorAll('.age-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-pressed', 'false');
    });
    const btn = document.getElementById('btn-bilan-start');
    if (btn) { btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); }
  }
}

/* ══════════════════════════════════════════════
   MODULE AUDIT — Alcool
══════════════════════════════════════════════ */

function getAUDITValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? parseInt(el.value) : null;
}

function calculateAUDIT() {
  const qs = ['a_q1','a_q2','a_q3','a_q4','a_q5','a_q6','a_q7','a_q8','a_q9','a_q10'];
  const vals = qs.map(q => getAUDITValue(q));
  const msgEl = document.getElementById('audit-missing-msg');

  if (vals.some(v => v === null)) { msgEl.classList.remove('hidden'); return; }
  msgEl.classList.add('hidden');

  const score = vals.reduce((s, v) => s + v, 0);
  state.audit = { score, completed: true };
  saveState(); updateProgress();

  let level, levelText, detail, color;
  if (score <= 7) {
    level = 'low'; levelText = 'Consommation à faible risque'; color = '#2E7D32';
    detail = 'Votre consommation semble maîtrisée. Continuez sur cette lancée et restez attentif(ve) à ne pas dépasser les repères de consommation à faible risque (max 2 verres/jour, 10 verres/semaine, avec des jours sans alcool).';
  } else if (score <= 15) {
    level = 'low-mid'; levelText = 'Usage à risque'; color = '#F59E0B';
    detail = 'Votre consommation mérite attention. Elle peut avoir des effets sur votre santé à moyen terme. Un échange avec votre médecin peut être utile pour faire le point.';
  } else if (score <= 19) {
    level = 'mid'; levelText = 'Usage nocif'; color = '#E65100';
    detail = 'Votre consommation d\'alcool a un impact sur votre santé physique et/ou psychologique. Une consultation médicale est recommandée. Une aide au sevrage peut être proposée.';
  } else {
    level = 'very-high'; levelText = 'Dépendance probable'; color = '#C62828';
    detail = 'Votre score indique une dépendance probable à l\'alcool. Un accompagnement spécialisé est fortement recommandé. Vous pouvez appeler Alcool Info Service au 0 800 235 006 (gratuit, anonyme, 8h–2h).';
  }

  state.audit.level = level;
  saveState();

  document.getElementById('audit-form').classList.add('hidden');
  const results = document.getElementById('audit-results');
  results.classList.remove('hidden');

  const arc = document.getElementById('audit-gauge-arc');
  arc.style.stroke = color;
  document.getElementById('audit-score-text').textContent = score;
  setTimeout(() => { arc.style.strokeDashoffset = 283 - (score / 40) * 283; }, 100);

  const badge = document.getElementById('audit-risk-badge');
  badge.textContent = levelText;
  badge.className = 'risk-level-badge risk-' + level;
  let auditAlert = '';
  if (score >= 16) {
    auditAlert = buildHighRiskAlert(
      score >= 20 ? 'Situation nécessitant un accompagnement professionnel' : 'Résultat important — parlez-en à un professionnel',
      [
        score >= 20
          ? 'Votre score AUDIT indique une <strong>dépendance probable à l\'alcool</strong>. Un accompagnement spécialisé est nécessaire.'
          : 'Votre score AUDIT indique un <strong>usage nocif de l\'alcool</strong> ayant un impact sur votre santé.',
        'Alcool Info Service (gratuit, anonyme, 8h–2h) : <strong><a href="tel:0800235006">0 800 235 006</a></strong>',
        'Ou consultez votre médecin traitant ou un addictologue dans les prochains jours.',
        'Ce score ne remplace pas un diagnostic médical.',
      ]
    );
  }
  document.getElementById('audit-risk-detail').innerHTML = (auditAlert || '') + detail;

  const recos = [];
  if (score >= 8) recos.push('Parler de votre consommation à votre médecin traitant lors de la prochaine consultation.');
  if (score >= 8) recos.push('Tenir un journal de consommation (date, contexte, quantité) pour prendre conscience des situations à risque.');
  if (score >= 16) recos.push('Contacter Alcool Info Service : 0 800 235 006 (gratuit, anonyme) ou visiter alcool-info-service.fr.');
  if (score >= 20) recos.push('Consulter un addictologue ou un centre de soins, d\'accompagnement et de prévention en addictologie (CSAPA).');
  recos.push('Jours sans alcool : viser au moins 2 jours consécutifs sans consommation par semaine.');

  document.getElementById('audit-recommendations').innerHTML = `
    <div class="recommendations-title">Recommandations</div>
    ${recos.map(r => `<div class="recommendation-item"><span class="recommendation-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${r}</div>`).join('')}
  `;

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function restartAUDIT() {
  state.audit = { score: null, completed: false };
  saveState(); updateProgress();
  document.getElementById('audit-results').classList.add('hidden');
  document.getElementById('audit-form').classList.remove('hidden');
  document.querySelectorAll('#audit-form input[type="radio"]').forEach(r => r.checked = false);
}

/* ══════════════════════════════════════════════
   MODULE FAGERSTRÖM — Tabac
══════════════════════════════════════════════ */

function showFagerstromGate(val) {
  const form = document.getElementById('fagerstrom-form');
  const msg  = document.getElementById('fag-non-smoker-msg');
  if (val === 'oui') {
    form.classList.remove('hidden');
    msg.classList.add('hidden');
    updateProfile({ smoker: true });
  } else {
    form.classList.add('hidden');
    msg.classList.remove('hidden');
    state.fagerstrom = { completed: true, notSmoker: true };
    saveState(); updateProgress();
  }
}

function calculateFagerstrom() {
  const qs = ['f2_q1','f2_q2','f2_q3','f2_q4','f2_q5','f2_q6'];
  const vals = qs.map(q => {
    const el = document.querySelector(`input[name="${q}"]:checked`);
    return el ? parseInt(el.value) : null;
  });
  const msgEl = document.getElementById('fag-missing-msg');
  if (vals.some(v => v === null)) { msgEl.classList.remove('hidden'); return; }
  msgEl.classList.add('hidden');

  const score = vals.reduce((s, v) => s + v, 0);
  state.fagerstrom = { score, completed: true };
  saveState(); updateProgress();

  let level, levelText, detail, color;
  if (score <= 2) {
    level = 'low'; levelText = 'Très faible dépendance'; color = '#2E7D32';
    detail = 'Votre dépendance physique à la nicotine est très faible. Le sevrage peut être envisagé sans substitution nicotinique majeure, mais un accompagnement comportemental reste utile.';
  } else if (score <= 4) {
    level = 'low-mid'; levelText = 'Faible dépendance'; color = '#84CC16';
    detail = 'Dépendance faible à la nicotine. Les substituts nicotiniques à faible dose peuvent aider, en complément d\'un suivi par votre médecin ou pharmacien.';
  } else if (score === 5) {
    level = 'mid'; levelText = 'Dépendance moyenne'; color = '#F59E0B';
    detail = 'Dépendance moyenne. Des substituts nicotiniques (patchs, gommes) et/ou un accompagnement médicamenteux sont recommandés pour maximiser les chances de succès.';
  } else if (score <= 7) {
    level = 'high'; levelText = 'Forte dépendance'; color = '#E65100';
    detail = 'Forte dépendance à la nicotine. Un traitement médicamenteux (varénicline ou bupropion) associé à une thérapie comportementale est fortement recommandé.';
  } else {
    level = 'very-high'; levelText = 'Très forte dépendance'; color = '#C62828';
    detail = 'Très forte dépendance physique à la nicotine. Une prise en charge spécialisée (consultation tabacologie) est indispensable. Des traitements combinés peuvent être nécessaires.';
  }

  state.fagerstrom.level = level;
  saveState();

  document.getElementById('fag-gate').classList.add('hidden');
  document.getElementById('fagerstrom-form').classList.add('hidden');
  const results = document.getElementById('fagerstrom-results');
  results.classList.remove('hidden');

  const arc = document.getElementById('fag-gauge-arc');
  arc.style.stroke = color;
  document.getElementById('fag-score-text').textContent = score;
  setTimeout(() => { arc.style.strokeDashoffset = 283 - (score / 10) * 283; }, 100);

  const badge = document.getElementById('fag-risk-badge');
  badge.textContent = levelText;
  badge.className = 'risk-level-badge risk-' + level;
  document.getElementById('fag-risk-detail').textContent = detail;

  const recos = [
    'Fixer une date d\'arrêt précise et l\'annoncer à ses proches.',
    'Consulter votre médecin ou pharmacien pour un plan de sevrage personnalisé.',
  ];
  if (score >= 5) recos.push('Envisager des substituts nicotiniques remboursés (jusqu\'à 150€/an sur prescription) : patchs, gommes, pastilles.');
  if (score >= 6) recos.push('Demander une consultation en tabacologie — hôpitaux et centres spécialisés disponibles sur le territoire.');

  document.getElementById('fag-recommendations').innerHTML = `
    <div class="recommendations-title">Plan de sevrage recommandé</div>
    ${recos.map(r => `<div class="recommendation-item"><span class="recommendation-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${r}</div>`).join('')}
  `;

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function restartFagerstrom() {
  state.fagerstrom = { score: null, completed: false };
  saveState(); updateProgress();
  document.getElementById('fagerstrom-results').classList.add('hidden');
  document.getElementById('fag-gate').classList.remove('hidden');
  document.getElementById('fagerstrom-form').classList.add('hidden');
  document.querySelectorAll('#fag-gate input, #fagerstrom-form input').forEach(r => r.checked = false);
  document.getElementById('fag-non-smoker-msg').classList.add('hidden');
}

/* ══════════════════════════════════════════════
   MODULE ACT — Asthme
══════════════════════════════════════════════ */

function showACTForm(val) {
  const form = document.getElementById('act-form');
  const msg  = document.getElementById('act-non-msg');
  if (val === 'oui') { form.classList.remove('hidden'); msg.classList.add('hidden'); }
  else {
    form.classList.add('hidden'); msg.classList.remove('hidden');
    state.act = { completed: true, notApplicable: true }; saveState(); updateProgress();
  }
}

function calculateACT() {
  const qs = ['act_q1','act_q2','act_q3','act_q4','act_q5'];
  const vals = qs.map(q => {
    const el = document.querySelector(`input[name="${q}"]:checked`);
    return el ? parseInt(el.value) : null;
  });
  const msgEl = document.getElementById('act-missing-msg');
  if (vals.some(v => v === null)) { msgEl.classList.remove('hidden'); return; }
  msgEl.classList.add('hidden');

  const score = vals.reduce((s, v) => s + v, 0);
  state.act = { score, completed: true };
  saveState(); updateProgress();

  let level, levelText, detail, color;
  if (score <= 19) {
    level = 'high'; levelText = 'Asthme non contrôlé'; color = '#C62828';
    detail = `Score ${score}/25 — Votre asthme n'est pas suffisamment contrôlé. Des symptômes fréquents affectent votre qualité de vie. Consultez votre médecin pour réévaluer votre traitement et votre technique d'inhalation.`;
  } else if (score <= 24) {
    level = 'mid'; levelText = 'Asthme partiellement contrôlé'; color = '#E65100';
    detail = `Score ${score}/25 — Votre asthme est partiellement contrôlé. Un point médical serait utile pour optimiser votre traitement et réduire les symptômes résiduels.`;
  } else {
    level = 'low'; levelText = 'Asthme bien contrôlé'; color = '#2E7D32';
    detail = `Score ${score}/25 — Bravo, votre asthme est bien maîtrisé. Continuez votre traitement de fond et consultez si vos symptômes évoluent.`;
  }

  state.act.level = level;
  saveState();

  document.getElementById('act-gate').classList.add('hidden');
  document.getElementById('act-form').classList.add('hidden');
  const results = document.getElementById('act-results');
  results.classList.remove('hidden');

  const arc = document.getElementById('act-gauge-arc');
  arc.style.stroke = color;
  document.getElementById('act-score-text').textContent = score;
  // ACT : plus c'est haut = mieux (25 = parfait), donc on inverse
  setTimeout(() => { arc.style.strokeDashoffset = 283 - ((score - 5) / 20) * 283; }, 100);

  const badge = document.getElementById('act-risk-badge');
  badge.textContent = levelText;
  badge.className = 'risk-level-badge risk-' + level;
  let actAlert = '';
  if (score <= 15) {
    actAlert = buildHighRiskAlert(
      'Asthme non contrôlé — consultez votre médecin cette semaine',
      [
        `Votre score ACT (${score}/25) indique un asthme <strong>insuffisamment contrôlé</strong>.`,
        'Consultez votre médecin ou pneumologue <strong>dans les 7 jours</strong> pour adapter votre traitement.',
        'En cas de crise sévère (essoufflement au repos, lèvres bleues) : <strong>appelez le 15 (SAMU)</strong>.',
      ]
    );
  }
  document.getElementById('act-risk-detail').innerHTML = (actAlert || '') + detail;

  const recos = score <= 19 ? [
    'Consulter votre médecin ou pneumologue pour réévaluer votre traitement de fond.',
    'Vérifier votre technique d\'utilisation des inhalateurs (aerochambre, turbuhaler, diskus…).',
    'Identifier et éviter vos facteurs déclenchants (allergènes, tabac, pollution, effort…).',
    'Plan d\'action écrit en cas de crise — à définir avec votre médecin.',
  ] : score <= 24 ? [
    'Revoir avec votre médecin l\'adéquation de votre traitement de fond.',
    'Continuer à éviter les facteurs déclenchants identifiés.',
    'Programmer un contrôle médical dans les 1 à 3 mois.',
  ] : [
    'Poursuivre votre traitement de fond sans interruption.',
    'Refaire l\'ACT dans 3 mois pour surveiller le contrôle de l\'asthme.',
    'Continuer à éviter vos facteurs déclenchants.',
  ];

  document.getElementById('act-recommendations').innerHTML = `
    <div class="recommendations-title">Recommandations</div>
    ${recos.map(r => `<div class="recommendation-item"><span class="recommendation-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${r}</div>`).join('')}
  `;

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function restartACT() {
  state.act = { score: null, completed: false };
  saveState(); updateProgress();
  document.getElementById('act-results').classList.add('hidden');
  document.getElementById('act-gate').classList.remove('hidden');
  document.getElementById('act-form').classList.add('hidden');
  document.querySelectorAll('#section-act input').forEach(r => r.checked = false);
  document.getElementById('act-non-msg').classList.add('hidden');
}

/* ══════════════════════════════════════════════
   MODULE STOP-BANG — Apnée du sommeil
══════════════════════════════════════════════ */

function calculateSTOPBANG() {
  const items = ['sb_s','sb_t','sb_o','sb_p','sb_b','sb_a','sb_n','sb_g'];
  const vals = items.map(q => {
    const el = document.querySelector(`input[name="${q}"]:checked`);
    return el ? parseInt(el.value) : null;
  });
  const msgEl = document.getElementById('sb-missing-msg');
  if (vals.some(v => v === null)) { msgEl.classList.remove('hidden'); return; }
  msgEl.classList.add('hidden');

  const score = vals.reduce((s, v) => s + v, 0);
  state.stopbang = { score, completed: true };
  saveState(); updateProgress();

  let level, levelText, detail, color;
  if (score <= 2) {
    level = 'low'; levelText = 'Risque faible'; color = '#2E7D32';
    detail = `Score ${score}/8 — Risque faible d'apnée obstructive du sommeil. Si vous présentez tout de même des symptômes (ronflements, somnolence diurne excessive), signalez-les à votre médecin.`;
  } else if (score <= 4) {
    level = 'mid'; levelText = 'Risque intermédiaire'; color = '#F59E0B';
    detail = `Score ${score}/8 — Risque intermédiaire d'apnée du sommeil. En cas de fatigue chronique, ronflements importants ou apnées observées par votre entourage, parlez-en à votre médecin.`;
  } else {
    level = 'high'; levelText = 'Risque élevé'; color = '#C62828';
    detail = `Score ${score}/8 — Risque élevé d'apnée obstructive du sommeil. Une consultation spécialisée (pneumologue, ORL, ou somnologue) est recommandée pour réaliser un enregistrement du sommeil (polygraphie ou polysomnographie).`;
  }

  state.stopbang.level = level;
  saveState();

  document.getElementById('stopbang-form').classList.add('hidden');
  const results = document.getElementById('stopbang-results');
  results.classList.remove('hidden');

  const arc = document.getElementById('sb-gauge-arc');
  arc.style.stroke = color;
  document.getElementById('sb-score-text').textContent = score;
  setTimeout(() => { arc.style.strokeDashoffset = 283 - (score / 8) * 283; }, 100);

  const badge = document.getElementById('sb-risk-badge');
  badge.textContent = levelText;
  badge.className = 'risk-level-badge risk-' + level;
  let sbAlert = '';
  if (score >= 5) {
    sbAlert = buildHighRiskAlert(
      'Risque élevé d\'apnée du sommeil — consultation spécialisée recommandée',
      [
        `Votre score STOP-BANG (${score}/8) indique un <strong>risque élevé</strong> de syndrome d'apnées obstructives du sommeil (SAOS).`,
        'Une polygraphie ventilatoire nocturne (enregistrement du sommeil) est recommandée.',
        'Consultez votre <strong>médecin traitant</strong> qui vous orientera vers un pneumologue ou somnologue.',
        'En attendant : évitez l\'alcool le soir, les somnifères et dormez sur le côté.',
      ]
    );
  }
  document.getElementById('sb-risk-detail').innerHTML = (sbAlert || '') + detail;

  const recos = score >= 5 ? [
    'Consulter un pneumologue ou médecin spécialiste du sommeil pour une polygraphie ventilatoire nocturne.',
    'En attendant : éviter l\'alcool et les somnifères le soir (majorent les apnées).',
    'Dormir en position latérale (sur le côté) peut réduire les apnées de position.',
    'Si surpoids : la perte de poids améliore significativement le SAOS.',
  ] : score >= 3 ? [
    'Signaler les ronflements et la fatigue diurne à votre médecin traitant.',
    'Éviter l\'alcool et les somnifères le soir.',
    'Réévaluer dans 6 mois si les symptômes s\'aggravent.',
  ] : [
    'Maintenir un sommeil régulier et de bonne hygiène (horaires fixes, chambre fraîche et sombre).',
    'Si des ronflements apparaissent, réévaluer ce questionnaire.',
  ];

  document.getElementById('sb-recommendations').innerHTML = `
    <div class="recommendations-title">Recommandations</div>
    ${recos.map(r => `<div class="recommendation-item"><span class="recommendation-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${r}</div>`).join('')}
  `;

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function restartSTOPBANG() {
  state.stopbang = { score: null, completed: false };
  saveState(); updateProgress();
  document.getElementById('stopbang-results').classList.add('hidden');
  document.getElementById('stopbang-form').classList.remove('hidden');
  document.querySelectorAll('#stopbang-form input[type="radio"]').forEach(r => r.checked = false);
}

/* ══════════════════════════════════════════════
   MODULE MRS — Ménopause Rating Scale
══════════════════════════════════════════════ */

const MRS_ITEMS = {
  somato: [
    { id: 'mrs_1', label: 'Bouffées de chaleur / sueurs',
      desc: 'Sensation soudaine de chaleur intense au visage, cou ou poitrine, avec transpiration — le jour ou la nuit (sueurs nocturnes pouvant mouiller les draps).' },
    { id: 'mrs_2', label: 'Gêne cardiaque',
      desc: 'Battements inhabituels, irréguliers ou fortement perceptibles (cœur qui "s\'emballe", palpitations), oppression dans la poitrine sans effort particulier.' },
    { id: 'mrs_3', label: 'Troubles du sommeil',
      desc: 'Difficultés à s\'endormir le soir, réveils nocturnes fréquents sans raison, réveil très matinal avec impossibilité de se rendormir.' },
    { id: 'mrs_4', label: 'Douleurs musculaires et articulaires',
      desc: 'Douleurs, raideurs ou inconforts dans les muscles et articulations (dos, genoux, épaules, mains) sans blessure ni maladie articulaire connue.' },
  ],
  psycho: [
    { id: 'mrs_5', label: 'Humeur dépressive',
      desc: 'Tristesse persistante, découragement, larmes faciles, perte d\'envie ou d\'intérêt pour des activités habituellement plaisantes, humeur changeante sans raison évidente.' },
    { id: 'mrs_6', label: 'Irritabilité / nervosité',
      desc: 'Vous vous énervez plus facilement qu\'avant, impatience accrue, tension intérieure, réactions plus vives que d\'habitude face à des situations du quotidien.' },
    { id: 'mrs_7', label: 'Anxiété',
      desc: 'Inquiétude ou malaise diffus sans raison précise, crises d\'angoisse soudaines (cœur rapide, souffle court, peur intense), sensation que quelque chose de mauvais va arriver.' },
  ],
  uro: [
    { id: 'mrs_8',  label: 'Problèmes de sexualité',
      desc: 'Diminution du désir sexuel, moindre plaisir ou satisfaction lors des rapports, changements notables dans la fréquence ou la qualité de la vie sexuelle par rapport à votre habitude.' },
    { id: 'mrs_9',  label: 'Problèmes urinaires',
      desc: 'Besoin d\'uriner plus souvent (y compris la nuit), difficulté à vous "retenir", petites fuites urinaires lors d\'un effort (toux, fou rire, sport, éternuement).' },
    { id: 'mrs_10', label: 'Sécheresse vaginale',
      desc: 'Sensation de sécheresse, d\'irritation ou de brûlure dans le vagin au quotidien ou lors des rapports sexuels, douleurs à la pénétration, inconfort persistant.' },
    { id: 'mrs_11', label: 'Inconfort physique général',
      desc: 'Douleurs ou raideurs dans les articulations, sensation de gonflement dans les mains ou doigts, inconforts physiques diffus sans explication médicale connue.' },
  ]
};

const MRS_LABELS = ['Absent', 'Léger', 'Modéré', 'Sévère', 'Très sévère'];

function renderMRSItems(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = items.map((item, i) => `
    <div class="mrs-item">
      <div class="mrs-item-label">${i + 1 + (containerId === 'mrs-psycho-items' ? 4 : containerId === 'mrs-uro-items' ? 7 : 0)}. ${item.label}</div>
      ${item.desc ? `<div class="mrs-item-desc">${item.desc}</div>` : ''}
      <div class="mrs-scale" role="radiogroup" aria-label="${item.label}">
        ${[0,1,2,3,4].map(v => `
          <label class="mrs-scale-btn" aria-label="${MRS_LABELS[v]}">
            <input type="radio" name="${item.id}" value="${v}" style="display:none" onchange="this.parentElement.classList.add('selected');this.closest('.mrs-scale').querySelectorAll('label').forEach((l,li)=>{if(li!==${v})l.classList.remove('selected')})">
            <span style="display:block;font-size:1rem;font-weight:700">${v}</span>
            <span style="display:block;font-size:0.6rem;line-height:1.2">${MRS_LABELS[v]}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function showMRSForm(val) {
  const form = document.getElementById('mrs-form');
  const msg  = document.getElementById('mrs-gate-no-msg');
  if (val === 'oui') {
    form.classList.remove('hidden');
    msg.classList.add('hidden');
    // Rendre les items MRS
    renderMRSItems('mrs-somato-items', MRS_ITEMS.somato);
    renderMRSItems('mrs-psycho-items', MRS_ITEMS.psycho);
    renderMRSItems('mrs-uro-items', MRS_ITEMS.uro);
  } else {
    form.classList.add('hidden');
    msg.classList.remove('hidden');
    state.mrs = { completed: true, notApplicable: true }; saveState(); updateProgress();
  }
}

function calculateMRS() {
  const allItems = [...MRS_ITEMS.somato, ...MRS_ITEMS.psycho, ...MRS_ITEMS.uro];
  const vals = {};
  let missing = false;
  allItems.forEach(item => {
    const el = document.querySelector(`input[name="${item.id}"]:checked`);
    if (el === null) missing = true;
    else vals[item.id] = parseInt(el.value);
  });

  const msgEl = document.getElementById('mrs-missing-msg');
  if (missing) { msgEl.classList.remove('hidden'); return; }
  msgEl.classList.add('hidden');

  const somato = MRS_ITEMS.somato.reduce((s, i) => s + (vals[i.id] || 0), 0);
  const psycho  = MRS_ITEMS.psycho.reduce((s, i) => s + (vals[i.id] || 0), 0);
  const uro     = MRS_ITEMS.uro.reduce((s, i) => s + (vals[i.id] || 0), 0);
  const total   = somato + psycho + uro;

  state.mrs = { somato, psycho, uro, total, completed: true };
  saveState(); updateProgress();

  let level, levelText, detail, color;
  if (total <= 4) {
    level = 'low'; levelText = 'Symptômes absents ou minimes'; color = '#2E7D32';
    detail = 'Vos symptômes ménopausiques sont absents ou très légers. Aucune prise en charge spécifique n\'est nécessaire à ce stade.';
  } else if (total <= 8) {
    level = 'low-mid'; levelText = 'Symptômes légers'; color = '#F59E0B';
    detail = 'Vous présentez des symptômes légers liés à la ménopause. Des mesures d\'hygiène de vie (activité physique, alimentation équilibrée, gestion du stress) peuvent aider.';
  } else if (total <= 16) {
    level = 'mid'; levelText = 'Symptômes modérés'; color = '#E65100';
    detail = 'Vos symptômes ménopausiques sont modérés et peuvent affecter votre qualité de vie. Une consultation médicale (gynécologue ou médecin traitant) est recommandée pour évaluer les options.';
  } else {
    level = 'high'; levelText = 'Symptômes sévères'; color = '#C62828';
    detail = `Score total ${total}/44 — Vos symptômes ménopausiques sont sévères. Un accompagnement médical est fortement recommandé pour évaluer un traitement hormonal de la ménopause (THM) ou d\'autres options thérapeutiques (phytothérapie, TCC, etc.).`;
  }

  state.mrs.level = level;
  saveState();

  document.getElementById('mrs-gate').classList.add('hidden');
  document.getElementById('mrs-form').classList.add('hidden');
  const results = document.getElementById('mrs-results');
  results.classList.remove('hidden');

  // Scores grid
  document.getElementById('mrs-scores-grid').innerHTML = `
    <div class="mrs-score-card">
      <div class="mrs-score-label">Somatovégétatif</div>
      <div class="mrs-score-value">${somato}</div>
      <div class="mrs-score-max">/ 16</div>
    </div>
    <div class="mrs-score-card">
      <div class="mrs-score-label">Psychologique</div>
      <div class="mrs-score-value">${psycho}</div>
      <div class="mrs-score-max">/ 12</div>
    </div>
    <div class="mrs-score-card">
      <div class="mrs-score-label">Urogénital</div>
      <div class="mrs-score-value">${uro}</div>
      <div class="mrs-score-max">/ 16</div>
    </div>
    <div class="mrs-total-card">
      <div class="mrs-total-label">Score total MRS</div>
      <div class="mrs-total-value">${total}</div>
      <div class="mrs-total-max">/ 44 points</div>
    </div>
  `;

  const badge = document.getElementById('mrs-risk-badge');
  badge.textContent = levelText;
  badge.className = 'risk-level-badge risk-' + level;
  document.getElementById('mrs-risk-detail').textContent = detail;

  const recos = total <= 4 ? [
    'Maintenir une activité physique régulière (aide à réduire bouffées de chaleur et troubles de l\'humeur).',
    'Alimentation équilibrée riche en phyto-estrogènes (soja, lin, légumineuses) si souhaitée.',
  ] : total <= 8 ? [
    'Activité physique régulière : 150 min/semaine d\'intensité modérée.',
    'Techniques de gestion du stress : relaxation, yoga, cohérence cardiaque.',
    'Consulter votre médecin si les symptômes s\'aggravent.',
  ] : [
    'Consulter votre gynécologue ou médecin traitant pour évaluation du THM (Traitement Hormonal de la Ménopause).',
    'Discuter des traitements non hormonaux disponibles : inhibiteurs de recapture de la sérotonine, oxybutynine, phytothérapie.',
    'En cas de sécheresse vaginale : lubrifiants et hydratants vaginaux disponibles sans ordonnance.',
    'Activité physique : diminue l\'intensité des bouffées de chaleur et améliore l\'humeur.',
    ...(total >= 17 ? ['Thérapie cognitivo-comportementale (TCC) : efficace contre bouffées de chaleur et troubles du sommeil liés à la ménopause.'] : []),
  ];

  document.getElementById('mrs-recommendations').innerHTML = `
    <div class="recommendations-title">Recommandations</div>
    ${recos.map(r => `<div class="recommendation-item"><span class="recommendation-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${r}</div>`).join('')}
  `;

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function restartMRS() {
  state.mrs = { completed: false };
  saveState(); updateProgress();
  document.getElementById('mrs-results').classList.add('hidden');
  document.getElementById('mrs-gate').classList.remove('hidden');
  document.getElementById('mrs-form').classList.add('hidden');
  document.querySelectorAll('#section-mrs input').forEach(r => r.checked = false);
  document.querySelectorAll('#section-mrs .mrs-scale-btn').forEach(b => b.classList.remove('selected'));
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  loadState();

  // Navigation sidebar
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.section));
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') navigateTo(btn.dataset.section); });
  });

  // Restaurer état
  if (state.currentSection) {
    navigateTo(state.currentSection);
  } else {
    navigateTo('accueil');
  }

  // Restaurer bilan
  if (state.bilan.ageRange) {
    selectAgeRange(state.bilan.ageRange);
    if (state.bilan.completed) {
      document.getElementById('bilan-step-age').classList.add('hidden');
      document.getElementById('bilan-step-results').classList.remove('hidden');
      showBilanResults();
    }
  }

  updateProgress();

  // Synchroniser profil depuis données déjà saisies
  const poids = document.getElementById('f-poids')?.value;
  const taille = document.getElementById('f-taille')?.value;
  if (poids && taille) {
    const imc = parseFloat(poids) / Math.pow(parseFloat(taille) / 100, 2);
    updateProfile({ imc, weight: parseFloat(poids), height: parseFloat(taille) });
  }
  const cSex = document.querySelector('input[name="c_sex"]:checked');
  const cAge = document.getElementById('c-age')?.value;
  if (cSex) updateProfile({ sex: cSex.value });
  if (cAge) updateProfile({ age: parseInt(cAge) });

  // Initialiser l'onglet saisie comme visible
  const saisieTab = document.getElementById('bio-tab-saisie');
  if (saisieTab) { saisieTab.classList.remove('hidden'); saisieTab.removeAttribute('hidden'); }
  const normesTab = document.getElementById('bio-tab-normes');
  if (normesTab) { normesTab.classList.add('hidden'); }

  // Prefill STOP-BANG depuis profil sauvegardé
  if (state.profile) prefillModulesFromProfile();
  updateMRSGate();

  // Restaurer éligibilité cancers
  if (state.cancers.sex && state.cancers.age) {
    const sexRadio = document.querySelector(`input[name="ca_sex"][value="${state.cancers.sex}"]`);
    if (sexRadio) sexRadio.checked = true;
    const ageInput = document.getElementById('ca-age');
    if (ageInput) ageInput.value = state.cancers.age;
    updateCancersEligibility();
  }

  // Focus management for accessibility
  document.querySelectorAll('.section').forEach(section => {
    section.setAttribute('tabindex', '-1');
  });
});
