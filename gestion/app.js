/* ════════════════════════════════════════════════
   CPTS DBMB — Gestion de projet — Application Logic
═════════════════════════════════════════════════ */
'use strict';

import { MEMBERS, MEMBERS_BY_ID, MISSIONS } from './data.js';
import { isFirebaseConfigured } from './firebase-config.js';

const backend = isFirebaseConfigured
  ? await import('./backend-firebase.js')
  : await import('./backend-demo.js');

let currentUser = null;
let actionsMap = {};
let eventsList = [];
let missionsFilter = 'toutes';
let calendarDate = new Date();
let selectedDay = null;

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_COURT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];

function initials(name) {
  return name.replace(/^Dr\.?\s*/i, '').split(' ').filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase();
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2600);
}

/* ─── Connexion ──────────────────────────────── */
function populateLoginSelect() {
  const sel = document.getElementById('login-member');
  sel.innerHTML = MEMBERS.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-sidebar').classList.add('hidden');
  document.getElementById('main-content').classList.add('hidden');
}

function showApp(user) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-sidebar').classList.remove('hidden');
  document.getElementById('main-content').classList.remove('hidden');

  document.getElementById('user-avatar').textContent = initials(user.name);
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-role').textContent = user.role;
  document.getElementById('profil-name').textContent = user.name;
  document.getElementById('profil-role').textContent = user.role;
  document.getElementById('accueil-name').textContent = user.name.replace(/^Dr\.?\s*/i, '');

  const today = new Date();
  document.getElementById('accueil-date').textContent = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const memberId = document.getElementById('login-member').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  const res = await backend.login(memberId, password);
  if (!res.ok) errEl.textContent = res.error || 'Connexion impossible.';
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await backend.logout();
});

/* ─── Navigation ─────────────────────────────── */
function navigateTo(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + sectionId)?.classList.add('active');
  document.querySelectorAll(`[data-section="${sectionId}"]`).forEach(n => n.classList.add('active'));
}
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.section));
});

/* ══════════════════════════════════════════════
   MISSIONS — indicateurs & livrables à cocher
══════════════════════════════════════════════ */
function findAction(missionId, actionId) {
  const m = MISSIONS.find(mm => mm.id === missionId);
  return m.actions.find(aa => aa.id === actionId);
}

function actionState(missionId, actionId) {
  const a = findAction(missionId, actionId);
  const stored = actionsMap[`${missionId}__${actionId}`];
  return {
    indicateurs: (stored && Array.isArray(stored.indicateurs) && stored.indicateurs.length === a.indicateurs.length)
      ? stored.indicateurs : a.indicateurs.map(() => false),
    livrables: (stored && Array.isArray(stored.livrables) && stored.livrables.length === a.livrables.length)
      ? stored.livrables : a.livrables.map(() => false),
    remarque: stored?.remarque || '',
    updatedBy: stored?.updatedBy || '',
    updatedAt: stored?.updatedAt || null,
  };
}

function actionCompletion(missionId, actionId) {
  const st = actionState(missionId, actionId);
  const total = st.indicateurs.length + st.livrables.length;
  const done = st.indicateurs.filter(Boolean).length + st.livrables.filter(Boolean).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function completionLabel(pct) {
  if (pct >= 100) return { label: 'Terminé', className: 'status-done' };
  if (pct > 0) return { label: 'En cours', className: 'status-progress' };
  return { label: 'Non démarré', className: 'status-todo' };
}

function formatUpdated(st) {
  if (!st.updatedBy) return '';
  let when = '';
  try {
    const d = st.updatedAt?.toDate ? st.updatedAt.toDate() : (st.updatedAt ? new Date(st.updatedAt) : null);
    if (d) when = ` le ${d.toLocaleDateString('fr-FR')}`;
  } catch (e) {}
  return `Mis à jour par ${st.updatedBy}${when}`;
}

function checklistHtml(missionId, actionId, kind, items, checked) {
  return `
    <div class="checklist-group">
      <div class="checklist-group-title">${kind === 'indicateurs' ? 'Indicateurs / objectifs attendus' : 'Livrables / preuves attendues'}</div>
      <ul class="checklist">
        ${items.map((text, i) => `
          <li class="checklist-item">
            <label>
              <input type="checkbox" data-mission="${missionId}" data-action="${actionId}" data-kind="${kind}" data-index="${i}" ${checked[i] ? 'checked' : ''}>
              <span class="${checked[i] ? 'checked' : ''}">${text}</span>
            </label>
          </li>`).join('')}
      </ul>
    </div>`;
}

function renderMissions() {
  const list = document.getElementById('missions-list');
  const filtered = MISSIONS.map(m => {
    const actions = m.actions.filter(a => missionsFilter === 'toutes' || a.referents.includes(currentUser.id));
    return { ...m, actions };
  }).filter(m => m.actions.length > 0);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">Aucune mission ne vous concerne pour le moment.</div>`;
    return;
  }

  list.innerHTML = filtered.map(m => {
    const completions = m.actions.map(a => actionCompletion(m.id, a.id));
    const totalDone = completions.reduce((s, c) => s + c.done, 0);
    const totalItems = completions.reduce((s, c) => s + c.total, 0);
    const pct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0;

    const actionsHtml = m.actions.map(a => {
      const st = actionState(m.id, a.id);
      const comp = actionCompletion(m.id, a.id);
      const badge = completionLabel(comp.pct);
      const chips = a.referents.map(rid => {
        const mem = MEMBERS_BY_ID[rid];
        const mine = rid === currentUser.id;
        return `<span class="referent-chip ${mine ? 'referent-chip--me' : ''}"><span class="referent-avatar">${initials(mem.name)}</span>${mem.name}</span>`;
      }).join('');

      return `
        <div class="action-row" data-mission="${m.id}" data-action="${a.id}">
          <div class="action-row-header">
            <div>
              <div class="action-title">${a.titre}</div>
              <div class="action-referents">${chips}</div>
            </div>
            <div class="action-row-status">
              <span class="mission-tag ${badge.className}">${badge.label}</span>
              <div class="action-completion">${comp.done} / ${comp.total} éléments</div>
              <div class="mission-progress-bar action-progress-bar"><div class="mission-progress-fill" style="width:${comp.pct}%"></div></div>
              <div class="action-meta">${formatUpdated(st)}</div>
            </div>
          </div>
          <div class="checklist-columns">
            ${checklistHtml(m.id, a.id, 'indicateurs', a.indicateurs, st.indicateurs)}
            ${checklistHtml(m.id, a.id, 'livrables', a.livrables, st.livrables)}
          </div>
          <div class="form-group action-remarque">
            <label class="form-label">Remarques</label>
            <textarea class="form-textarea action-remarque-input" placeholder="Notes, blocages, précisions..." data-mission="${m.id}" data-action="${a.id}">${st.remarque}</textarea>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="mission-card">
        <div class="mission-card-header">
          <div>
            <div class="mission-card-title-row">
              <h3 class="mission-card-title">${m.titre}</h3>
              <span class="mission-tag mission-tag--${m.type}">${m.type === 'obligatoire' ? 'Obligatoire' : 'Complémentaire'}</span>
            </div>
            <div class="mission-card-budget">Financement ACI : ${m.budget} <span class="mission-budget-detail">(${m.budgetFixe} part fixe · ${m.budgetVariable} part variable)</span></div>
          </div>
          <div class="mission-progress-wrap">
            <div class="mission-progress-pct">${pct}%</div>
            <div class="mission-progress-bar"><div class="mission-progress-fill" style="width:${pct}%"></div></div>
          </div>
        </div>
        <div class="mission-actions">${actionsHtml}</div>
      </div>`;
  }).join('');

  list.querySelectorAll('.checklist-item input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const { mission, action, kind, index } = e.target.dataset;
      const st = actionState(mission, action);
      const arr = [...st[kind]];
      arr[Number(index)] = e.target.checked;
      await backend.updateAction(mission, action, { indicateurs: kind === 'indicateurs' ? arr : st.indicateurs, livrables: kind === 'livrables' ? arr : st.livrables, remarque: st.remarque });
      toast('Mis à jour.');
    });
  });
  list.querySelectorAll('.action-remarque-input').forEach(ta => {
    let timer;
    ta.addEventListener('input', (e) => {
      clearTimeout(timer);
      const { mission, action } = e.target.dataset;
      timer = setTimeout(async () => {
        const st = actionState(mission, action);
        await backend.updateAction(mission, action, { indicateurs: st.indicateurs, livrables: st.livrables, remarque: ta.value });
        toast('Remarque enregistrée.');
      }, 700);
    });
  });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    missionsFilter = btn.dataset.filter;
    renderMissions();
  });
});

/* ══════════════════════════════════════════════
   ACCUEIL (résumé)
══════════════════════════════════════════════ */
function renderAccueil() {
  const allActions = MISSIONS.flatMap(m => m.actions.map(a => ({ ...a, missionId: m.id, missionTitre: m.titre })));
  const mesActions = allActions.filter(a => a.referents.includes(currentUser.id));
  const enCours = allActions.filter(a => {
    const c = actionCompletion(a.missionId, a.id);
    return c.pct > 0 && c.pct < 100;
  });

  document.getElementById('stat-mes-actions').textContent = mesActions.length;
  document.getElementById('stat-en-cours').textContent = enCours.length;

  const upcoming = [...eventsList].filter(ev => ev.date >= new Date().toISOString().slice(0,10)).sort((a,b) => a.date.localeCompare(b.date));
  document.getElementById('stat-prochain-evt').textContent = upcoming[0] ? formatEventDate(upcoming[0].date) : '—';

  const mesActionsEl = document.getElementById('accueil-mes-actions');
  mesActionsEl.innerHTML = mesActions.length ? mesActions.map(a => {
    const comp = actionCompletion(a.missionId, a.id);
    const badge = completionLabel(comp.pct);
    return `<div class="event-item"><div class="event-item-body">
      <div class="event-item-title">${a.titre}</div>
      <div class="event-item-desc">${a.missionTitre} — ${comp.done}/${comp.total} éléments</div>
    </div><span class="mission-tag ${badge.className}" style="background:transparent;border:1px solid currentColor;">${badge.label}</span></div>`;
  }).join('') : `<div class="empty-state">Vous n'êtes référent(e) d'aucune action pour le moment.</div>`;

  const evtEl = document.getElementById('accueil-evenements');
  evtEl.innerHTML = upcoming.length ? upcoming.slice(0,5).map(renderEventItem).join('') : `<div class="empty-state">Aucun événement à venir.</div>`;
}

/* ══════════════════════════════════════════════
   AGENDA
══════════════════════════════════════════════ */
function formatEventDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function renderEventItem(ev, withDelete) {
  const d = new Date(ev.date + 'T00:00:00');
  return `
    <div class="event-item">
      <div class="event-date-badge">
        <div class="event-date-day">${d.getDate()}</div>
        <div class="event-date-month">${JOURS_COURT[d.getMonth()]}</div>
      </div>
      <div class="event-item-body">
        <div class="event-item-title">${ev.title}</div>
        ${ev.time ? `<div class="event-item-time">${ev.time}</div>` : ''}
        ${ev.description ? `<div class="event-item-desc">${ev.description}</div>` : ''}
        ${ev.createdBy ? `<div class="event-item-author">Ajouté par ${ev.createdBy}</div>` : ''}
      </div>
      ${withDelete ? `<button class="btn-icon event-item-del" data-del="${ev.id}" title="Supprimer" aria-label="Supprimer">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2.5h4V4M4 4l.5 9.5a1 1 0 001 1h5a1 1 0 001-1L12 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>` : ''}
    </div>`;
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  document.getElementById('cal-month-label').textContent = `${MOIS[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);

  const eventsByDate = {};
  eventsList.forEach(ev => { (eventsByDate[ev.date] = eventsByDate[ev.date] || []).push(ev); });

  let cells = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, muted: true, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ day: d, muted: false, dateStr });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - (startOffset + daysInMonth) + 1, muted: true, dateStr: null });
  }

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = cells.map(c => {
    const isToday = c.dateStr === todayStr;
    const isSelected = c.dateStr && c.dateStr === selectedDay;
    const evs = c.dateStr ? (eventsByDate[c.dateStr] || []) : [];
    return `
      <div class="cal-day ${c.muted ? 'muted' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${c.dateStr || ''}">
        <div class="cal-day-num">${c.day}</div>
        <div class="cal-day-events">${evs.slice(0,2).map(ev => `<div class="cal-event-pill">${ev.title}</div>`).join('')}${evs.length > 2 ? `<div class="cal-event-pill">+${evs.length-2}</div>` : ''}</div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.cal-day[data-date]:not([data-date=""])').forEach(el => {
    el.addEventListener('click', () => {
      selectedDay = el.dataset.date;
      renderCalendar();
      renderSelectedDay();
    });
  });

  renderAllUpcoming();
}

function renderSelectedDay() {
  const label = document.getElementById('selected-day-label');
  const el = document.getElementById('selected-day-events');
  if (!selectedDay) {
    label.textContent = 'Événements du jour';
    el.innerHTML = `<div class="empty-state">Cliquez sur un jour du calendrier.</div>`;
    return;
  }
  const d = new Date(selectedDay + 'T00:00:00');
  label.textContent = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const evs = eventsList.filter(ev => ev.date === selectedDay);
  el.innerHTML = evs.length ? evs.map(ev => renderEventItem(ev, true)).join('') : `<div class="empty-state">Aucun événement ce jour.</div>`;
  wireDeleteButtons(el);
}

function renderAllUpcoming() {
  const el = document.getElementById('all-upcoming-events');
  const todayStr = new Date().toISOString().slice(0,10);
  const upcoming = [...eventsList].filter(ev => ev.date >= todayStr).sort((a,b) => a.date.localeCompare(b.date)).slice(0, 8);
  el.innerHTML = upcoming.length ? upcoming.map(ev => renderEventItem(ev, true)).join('') : `<div class="empty-state">Aucun événement à venir.</div>`;
  wireDeleteButtons(el);
}

function wireDeleteButtons(container) {
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await backend.deleteEvent(btn.dataset.del);
      toast('Événement supprimé.');
    });
  });
}

document.getElementById('cal-prev').addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

/* ─── Modal ajout événement ──────────────────── */
const eventModal = document.getElementById('event-modal');
document.getElementById('add-event-btn').addEventListener('click', () => {
  document.getElementById('event-form').reset();
  if (selectedDay) document.getElementById('event-date').value = selectedDay;
  eventModal.classList.add('open');
});
document.getElementById('event-cancel').addEventListener('click', () => eventModal.classList.remove('open'));
eventModal.addEventListener('click', (e) => { if (e.target === eventModal) eventModal.classList.remove('open'); });

document.getElementById('event-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const event = {
    title: document.getElementById('event-title').value.trim(),
    date: document.getElementById('event-date').value,
    time: document.getElementById('event-time').value,
    description: document.getElementById('event-desc').value.trim(),
    createdBy: currentUser.name,
  };
  await backend.addEvent(event);
  eventModal.classList.remove('open');
  toast('Événement ajouté.');
});

/* ══════════════════════════════════════════════
   PROFIL — changement de mot de passe
══════════════════════════════════════════════ */
document.getElementById('password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('password-msg');
  const p1 = document.getElementById('new-password').value;
  const p2 = document.getElementById('new-password-confirm').value;
  msg.className = 'form-msg visible';
  if (p1 !== p2) { msg.textContent = 'Les deux mots de passe ne correspondent pas.'; msg.classList.add('error'); return; }
  const res = await backend.changePassword(p1);
  if (res.ok) { msg.textContent = 'Mot de passe mis à jour.'; msg.classList.add('success'); document.getElementById('password-form').reset(); }
  else { msg.textContent = res.error; msg.classList.add('error'); }
});

/* ══════════════════════════════════════════════
   INITIALISATION
══════════════════════════════════════════════ */
function renderAll() {
  renderAccueil();
  renderMissions();
  renderCalendar();
  renderSelectedDay();
}

populateLoginSelect();
if (backend.backendMode === 'demo') {
  document.getElementById('login-mode-note').innerHTML = 'Mode démonstration locale — mot de passe : <strong>demo</strong> (données non partagées entre appareils).';
}

backend.onAuthChange((user) => {
  currentUser = user;
  if (user) {
    showApp(user);
    backend.watchActions((map) => { actionsMap = map; renderAll(); });
    backend.watchEvents((list) => { eventsList = list; renderAll(); });
  } else {
    showLogin();
  }
});
