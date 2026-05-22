const app = (function () {
  'use strict';

  const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MONTH_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const CATEGORIES = {
    'Cloud': { name: 'Cloud', color: '#e34000' },
    'DevOps': { name: 'DevOps', color: '#0da58d' },
    'Seguranca': { name: 'Segurança', color: '#7ec26b' },
    'Infraestrutura': { name: 'Infraestrutura', color: '#283ee0' },
    'Automacao': { name: 'Automação', color: '#bfa719' },
    'Observabilidade': { name: 'Observabilidade', color: '#8d73aa' },
    'Containers': { name: 'Containers', color: '#18b1fc' },
    'Linux': { name: 'Linux', color: '#613176' },
    'Redes': { name: 'Redes', color: '#5a83de' },
    'Geral': { name: 'Geral', color: '#a14360' },
    'IA': { name: 'IA', color: '#d02a15' },
    'Desenvolvimento': { name: 'Desenvolvimento', color: '#f49715' },
    'Dados': { name: 'Dados', color: '#3b987d' },
    'Carreira': { name: 'Carreira', color: '#e90f95' }
  };

  let allEvents = [];
  let activeCategory = null;
  let presenceOnly = false;
  let currentView = 'calendar';
  let currentMonth = new Date().getMonth();
  let currentYear = 2026;

  function init() {
    buildCategoryFilters();
    bindViewToggle();
    bindCalendarNav();
    bindModal();
    document.getElementById('presence-filter').addEventListener('change', function () {
      presenceOnly = this.checked;
      render();
    });
    loadEvents();
  }

  async function loadEvents() {
    try {
      var response = await fetch('data/eventos.json');
      if (!response.ok) { showNotice('Não foi possível carregar os eventos.'); return; }
      var events;
      try { events = await response.json(); } catch (e) { showNotice('Erro: formato inválido.'); return; }
      if (!Array.isArray(events)) { showNotice('Erro: formato inválido.'); return; }
      if (events.length === 0) { showNotice('Nenhum evento disponível no momento.'); return; }
      allEvents = sortEvents(events);
      updateStats();
      // Set initial month to first event month
      var firstDate = parseDate(allEvents[0].dataInicio);
      if (firstDate) { currentMonth = firstDate.getUTCMonth(); currentYear = firstDate.getUTCFullYear(); }
      render();
    } catch (e) { showNotice('Não foi possível carregar os eventos.'); }
  }

  function sortEvents(events) {
    return events.slice().sort(function (a, b) {
      var dA = a.dataInicio || ''; var dB = b.dataInicio || '';
      if (dA < dB) return -1; if (dA > dB) return 1;
      var pA = a.presenca && a.presenca.confirmada ? 0 : 1;
      var pB = b.presenca && b.presenca.confirmada ? 0 : 1;
      return pA - pB;
    });
  }

  function updateStats() {
    document.getElementById('total-count').textContent = allEvents.length;
    var pCount = allEvents.filter(function (e) { return e.presenca && e.presenca.confirmada; }).length;
    document.getElementById('presenca-count').textContent = pCount;
  }

  function buildCategoryFilters() {
    var container = document.getElementById('category-filters');
    container.appendChild(createPill('Todos', null, true));
    Object.keys(CATEGORIES).forEach(function (key) {
      container.appendChild(createPill(CATEGORIES[key].name, key, false));
    });
  }

  function createPill(label, key, isActive) {
    var el = document.createElement('button');
    el.className = 'filter-pill' + (isActive ? ' active' : '');
    el.textContent = label;
    el.addEventListener('click', function () {
      document.querySelectorAll('.filter-pill').forEach(function (p) { p.classList.remove('active'); });
      el.classList.add('active');
      activeCategory = key;
      render();
    });
    return el;
  }

  function bindViewToggle() {
    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.view-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentView = btn.dataset.view;
        document.getElementById('calendar-nav').style.display = currentView === 'calendar' ? '' : 'none';
        render();
      });
    });
  }

  function bindCalendarNav() {
    document.getElementById('prev-month').addEventListener('click', function () {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      render();
    });
    document.getElementById('next-month').addEventListener('click', function () {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      render();
    });
  }

  function bindModal() {
    document.getElementById('modal-overlay').addEventListener('click', function (e) {
      if (e.target === this) this.style.display = 'none';
    });
  }

  function showEventModal(event) {
    var cat = CATEGORIES[event.categoria] || { name: 'Geral', color: '#a14360' };
    var hasPresence = event.presenca && event.presenca.confirmada;
    var html = '<h3>' + escapeHtml(event.nome) + '</h3>';
    html += '<div class="modal-meta"><span class="category-badge" style="background:' + cat.color + '">' + cat.name + '</span>';
    if (hasPresence) html += ' <span class="presence-badge">🎯 ' + escapeHtml(event.presenca.tipo) + '</span>';
    html += '</div>';
    html += '<div class="modal-meta">📅 ' + formatDateRange(event.dataInicio, event.dataFim) + '</div>';
    html += '<div class="modal-meta">📍 ' + escapeHtml(event.local) + ' — ' + escapeHtml(event.cidade) + ', ' + escapeHtml(event.estado) + '</div>';
    if (event.descricao) html += '<p class="modal-desc">' + escapeHtml(event.descricao) + '</p>';
    if (event.url) html += '<a href="' + escapeHtml(event.url) + '" target="_blank" rel="noopener" class="modal-link">🔗 Site do Evento →</a>';
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
  }

  function getFilteredEvents() {
    return allEvents.filter(function (event) {
      if (activeCategory && event.categoria !== activeCategory) return false;
      if (presenceOnly && (!event.presenca || !event.presenca.confirmada)) return false;
      return true;
    });
  }

  function render() {
    var notice = document.getElementById('notice');
    notice.textContent = '';
    if (currentView === 'calendar') renderCalendar();
    else renderList();
  }

  // ========== CALENDAR VIEW ==========
  function renderCalendar() {
    document.getElementById('cal-month-title').textContent = MONTH_NAMES[currentMonth] + ' ' + currentYear;
    var container = document.getElementById('events-container');
    var filtered = getFilteredEvents();

    // Get events for current month
    var monthEvents = filtered.filter(function (e) {
      var d = parseDate(e.dataInicio);
      return d && d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
    });

    // Build calendar grid
    var firstDay = new Date(Date.UTC(currentYear, currentMonth, 1));
    var lastDay = new Date(Date.UTC(currentYear, currentMonth + 1, 0));
    var startDow = (firstDay.getUTCDay() + 6) % 7; // Monday = 0
    var daysInMonth = lastDay.getUTCDate();

    var html = '<div class="calendar-grid">';
    // Headers
    WEEKDAYS.forEach(function (d) { html += '<div class="cal-header">' + d + '</div>'; });

    // Empty cells before first day
    for (var i = 0; i < startDow; i++) {
      html += '<div class="cal-day other-month"></div>';
    }

    // Days
    var today = new Date();
    for (var day = 1; day <= daysInMonth; day++) {
      var isToday = (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear());
      html += '<div class="cal-day' + (isToday ? ' today' : '') + '">';
      html += '<div class="cal-day-number">' + day + '</div>';

      // Events on this day
      var dayEvents = monthEvents.filter(function (e) {
        var d = parseDate(e.dataInicio);
        return d && d.getUTCDate() === day;
      });

      dayEvents.forEach(function (e) {
        var cat = CATEGORIES[e.categoria] || { name: 'Geral', color: '#a14360' };
        var hasP = e.presenca && e.presenca.confirmada;
        html += '<div class="cal-event' + (hasP ? ' has-presence' : '') + '" style="background:' + cat.color + '" data-event-id="' + escapeHtml(e.id) + '" onclick="app.openEvent(\'' + escapeHtml(e.id) + '\')">';
        html += escapeHtml(e.nome.length > 18 ? e.nome.substring(0, 16) + '…' : e.nome);
        html += '</div>';
      });

      html += '</div>';
    }

    // Empty cells after last day
    var totalCells = startDow + daysInMonth;
    var remaining = (7 - (totalCells % 7)) % 7;
    for (var j = 0; j < remaining; j++) {
      html += '<div class="cal-day other-month"></div>';
    }

    html += '</div>';

    // Show count
    if (monthEvents.length === 0) {
      html += '<p class="notice">Nenhum evento neste mês.</p>';
    }

    container.innerHTML = html;
  }

  // ========== LIST VIEW ==========
  function renderList() {
    document.getElementById('calendar-nav').style.display = 'none';
    var container = document.getElementById('events-container');
    var filtered = getFilteredEvents();

    if (filtered.length === 0) {
      container.innerHTML = '';
      document.getElementById('notice').textContent = 'Nenhum evento encontrado.';
      return;
    }

    var groups = {};
    filtered.forEach(function (event) {
      var date = parseDate(event.dataInicio);
      var key = date ? date.getUTCMonth() : -1;
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    });

    var html = '';
    Object.keys(groups).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (key) {
      var monthIndex = Number(key);
      var monthName = monthIndex >= 0 ? MONTH_NAMES[monthIndex] : 'Indefinido';
      var events = groups[key];

      html += '<div class="month-group"><div class="month-header">';
      html += '<span class="month-name">' + monthName + '</span>';
      html += '<span class="month-count">' + events.length + ' evento' + (events.length > 1 ? 's' : '') + '</span>';
      html += '</div><div class="events-grid">';

      events.forEach(function (event) { html += renderEventCard(event); });
      html += '</div></div>';
    });

    container.innerHTML = html;
  }

  function renderEventCard(event) {
    var date = parseDate(event.dataInicio);
    var cat = CATEGORIES[event.categoria] || { name: 'Geral', color: '#a14360' };
    var hasP = event.presenca && event.presenca.confirmada;

    var card = '<div class="event-card' + (hasP ? ' has-presence' : '') + '">';
    card += '<div class="event-date">';
    if (date) { card += '<span class="day">' + date.getUTCDate() + '</span><span class="month">' + MONTH_SHORT[date.getUTCMonth()] + '</span>'; }
    else { card += '<span class="day">--</span><span class="month">---</span>'; }
    card += '</div><div class="event-info"><div class="event-title"><span>' + escapeHtml(event.nome) + '</span>';
    card += '<span class="category-badge" style="background:' + cat.color + '">' + cat.name + '</span>';
    if (hasP) card += '<span class="presence-badge">🎯 ' + escapeHtml(event.presenca.tipo) + '</span>';
    card += '</div><div class="event-meta">';
    card += '<span class="event-meta-item"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' + formatDateRange(event.dataInicio, event.dataFim) + '</span>';
    card += '<span class="event-meta-item"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' + escapeHtml(event.cidade) + ', ' + escapeHtml(event.estado) + '</span>';
    card += '</div>';
    if (event.descricao) card += '<p class="event-description">' + escapeHtml(event.descricao) + '</p>';
    card += '</div>';
    if (event.url) {
      card += '<div class="event-action"><a href="' + escapeHtml(event.url) + '" target="_blank" rel="noopener" class="event-link" title="Site do evento"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg></a></div>';
    }
    card += '</div>';
    return card;
  }

  function openEvent(id) {
    var event = allEvents.find(function (e) { return e.id === id; });
    if (event) showEventModal(event);
  }

  function formatDateRange(inicio, fim) {
    var d1 = parseDate(inicio);
    if (!d1) return '—';
    var day1 = d1.getUTCDate(); var month1 = MONTH_NAMES[d1.getUTCMonth()];
    if (!fim || inicio === fim) return day1 + ' de ' + month1;
    var d2 = parseDate(fim);
    if (!d2) return day1 + ' de ' + month1;
    var day2 = d2.getUTCDate(); var month2 = MONTH_NAMES[d2.getUTCMonth()];
    if (month1 === month2) return day1 + ' a ' + day2 + ' de ' + month1;
    return day1 + ' de ' + month1 + ' a ' + day2 + ' de ' + month2;
  }

  function parseDate(str) { if (!str) return null; var d = new Date(str + 'T00:00:00Z'); return isNaN(d.getTime()) ? null : d; }
  function escapeHtml(str) { if (!str) return ''; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
  function showNotice(msg) { document.getElementById('notice').textContent = msg; document.getElementById('events-container').innerHTML = ''; }

  return { init: init, openEvent: openEvent };
})();

document.addEventListener('DOMContentLoaded', app.init);
