const app = (function () {
  'use strict';

  const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const MONTH_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
    'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
  ];

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

  function init() {
    buildCategoryFilters();
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
      try { events = await response.json(); } catch (e) { showNotice('Erro ao carregar eventos: formato inválido.'); return; }
      if (!Array.isArray(events)) { showNotice('Erro ao carregar eventos: formato inválido.'); return; }
      if (events.length === 0) { showNotice('Nenhum evento disponível no momento.'); return; }
      allEvents = sortEvents(events);
      updateStats();
      render();
    } catch (e) {
      showNotice('Não foi possível carregar os eventos.');
    }
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
    var allPill = createPill('Todos', null, true);
    container.appendChild(allPill);
    Object.keys(CATEGORIES).forEach(function (key) {
      container.appendChild(createPill(CATEGORIES[key].name, key, false));
    });
  }

  function createPill(label, key, isActive) {
    var el = document.createElement('button');
    el.className = 'filter-pill' + (isActive ? ' active' : '');
    el.textContent = label;
    el.setAttribute('data-category', key || '');
    el.addEventListener('click', function () {
      document.querySelectorAll('.filter-pill').forEach(function (p) { p.classList.remove('active'); });
      el.classList.add('active');
      activeCategory = key;
      render();
    });
    return el;
  }

  function getFilteredEvents() {
    return allEvents.filter(function (event) {
      if (activeCategory && event.categoria !== activeCategory) return false;
      if (presenceOnly && (!event.presenca || !event.presenca.confirmada)) return false;
      return true;
    });
  }

  function render() {
    var container = document.getElementById('events-container');
    var notice = document.getElementById('notice');
    notice.textContent = '';
    var filtered = getFilteredEvents();

    if (filtered.length === 0) {
      container.innerHTML = '';
      notice.textContent = 'Nenhum evento encontrado para os filtros selecionados.';
      return;
    }

    // Group by month
    var groups = {};
    filtered.forEach(function (event) {
      var date = parseDate(event.dataInicio);
      var monthKey = date ? date.getUTCMonth() : -1;
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(event);
    });

    var html = '';
    var sortedKeys = Object.keys(groups).sort(function (a, b) { return Number(a) - Number(b); });

    sortedKeys.forEach(function (key) {
      var monthIndex = Number(key);
      var monthName = monthIndex >= 0 ? MONTH_NAMES[monthIndex] : 'Data indefinida';
      var events = groups[key];

      html += '<div class="month-group">';
      html += '<div class="month-header">';
      html += '<span class="month-name">' + monthName + '</span>';
      html += '<span class="month-count">' + events.length + ' evento' + (events.length > 1 ? 's' : '') + '</span>';
      html += '</div>';
      html += '<div class="events-grid">';

      events.forEach(function (event) {
        html += renderEventCard(event);
      });

      html += '</div></div>';
    });

    container.innerHTML = html;
  }

  function renderEventCard(event) {
    var date = parseDate(event.dataInicio);
    var category = CATEGORIES[event.categoria] || { name: 'Geral', color: '#a14360' };
    var hasPresence = event.presenca && event.presenca.confirmada;

    var card = '<div class="event-card' + (hasPresence ? ' has-presence' : '') + '">';

    // Date block
    card += '<div class="event-date">';
    if (date) {
      card += '<span class="day">' + date.getUTCDate() + '</span>';
      card += '<span class="month">' + MONTH_SHORT[date.getUTCMonth()] + '</span>';
    } else {
      card += '<span class="day">--</span><span class="month">---</span>';
    }
    card += '</div>';

    // Info
    card += '<div class="event-info">';
    card += '<div class="event-title">';
    card += '<span>' + escapeHtml(event.nome) + '</span>';
    card += '<span class="category-badge" style="background:' + category.color + '">' + category.name + '</span>';
    if (hasPresence) {
      card += '<span class="presence-badge">🎯 ' + escapeHtml(event.presenca.tipo) + '</span>';
    }
    card += '</div>';

    // Meta
    card += '<div class="event-meta">';
    card += '<span class="event-meta-item"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' + formatDateRange(event.dataInicio, event.dataFim) + '</span>';
    card += '<span class="event-meta-item"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' + escapeHtml(event.local) + ' — ' + escapeHtml(event.cidade) + ', ' + escapeHtml(event.estado) + '</span>';
    card += '</div>';

    if (event.descricao) {
      card += '<p class="event-description">' + escapeHtml(event.descricao) + '</p>';
    }
    card += '</div>';

    // Action
    if (event.url) {
      card += '<div class="event-action">';
      card += '<a href="' + escapeHtml(event.url) + '" target="_blank" rel="noopener" class="event-link" title="Site do evento">';
      card += '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>';
      card += '</a></div>';
    }

    card += '</div>';
    return card;
  }

  function formatDateRange(inicio, fim) {
    var d1 = parseDate(inicio);
    if (!d1) return '—';
    var day1 = d1.getUTCDate();
    var month1 = MONTH_NAMES[d1.getUTCMonth()];

    if (!fim) return day1 + ' de ' + month1;

    var d2 = parseDate(fim);
    if (!d2) return day1 + ' de ' + month1;

    var day2 = d2.getUTCDate();
    var month2 = MONTH_NAMES[d2.getUTCMonth()];

    if (inicio === fim) return day1 + ' de ' + month1;
    if (month1 === month2) return day1 + ' a ' + day2 + ' de ' + month1;
    return day1 + ' de ' + month1 + ' a ' + day2 + ' de ' + month2;
  }

  function parseDate(str) {
    if (!str) return null;
    var d = new Date(str + 'T00:00:00Z');
    return isNaN(d.getTime()) ? null : d;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showNotice(msg) {
    document.getElementById('notice').textContent = msg;
    document.getElementById('events-container').innerHTML = '';
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', app.init);
