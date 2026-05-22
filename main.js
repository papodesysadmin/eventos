const app = (function () {
  'use strict';

  const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MONTH_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const WEEKDAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

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
  let currentMonth = 0;
  let currentYear = 2026;

  function init() {
    buildCategoryFilters();
    bindViewToggle();
    bindCalendarNav();
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
    document.getElementById('presenca-count').textContent = allEvents.filter(function (e) { return e.presenca && e.presenca.confirmada; }).length;
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
    el.className = 'px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap ' +
      (isActive ? 'bg-accent text-white border-accent' : 'bg-brand-700 text-gray-400 border-brand-500 hover:border-accent hover:text-white');
    el.textContent = label;
    el.addEventListener('click', function () {
      container.querySelectorAll('button').forEach(function (b) {
        b.className = 'px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap bg-brand-700 text-gray-400 border-brand-500 hover:border-accent hover:text-white';
      });
      el.className = 'px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap bg-accent text-white border-accent';
      activeCategory = key;
      render();
    });
    var container = document.getElementById('category-filters');
    return el;
  }

  function bindViewToggle() {
    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.view-btn').forEach(function (b) {
          b.classList.remove('active', 'bg-accent', 'text-white');
          b.classList.add('text-gray-400');
        });
        btn.classList.add('active', 'bg-accent', 'text-white');
        btn.classList.remove('text-gray-400');
        currentView = btn.dataset.view;
        document.getElementById('calendar-nav').style.display = currentView === 'calendar' ? '' : 'none';
        render();
      });
    });
    // Set initial active state
    document.querySelector('.view-btn.active').classList.add('bg-accent', 'text-white');
  }

  function bindCalendarNav() {
    document.getElementById('prev-month').addEventListener('click', function () {
      currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } render();
    });
    document.getElementById('next-month').addEventListener('click', function () {
      currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } render();
    });
  }

  function getFilteredEvents() {
    return allEvents.filter(function (event) {
      if (activeCategory && event.categoria !== activeCategory) return false;
      if (presenceOnly && (!event.presenca || !event.presenca.confirmada)) return false;
      return true;
    });
  }

  function render() {
    document.getElementById('notice').textContent = '';
    if (currentView === 'calendar') renderCalendar();
    else renderList();
  }

  // ========== CALENDAR VIEW ==========
  function renderCalendar() {
    document.getElementById('cal-month-title').textContent = MONTH_NAMES[currentMonth] + ' ' + currentYear;
    var container = document.getElementById('events-container');
    var filtered = getFilteredEvents();

    var monthEvents = filtered.filter(function (e) {
      var d = parseDate(e.dataInicio);
      return d && d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
    });

    var firstDay = new Date(Date.UTC(currentYear, currentMonth, 1));
    var lastDay = new Date(Date.UTC(currentYear, currentMonth + 1, 0));
    var startDow = (firstDay.getUTCDay() + 6) % 7;
    var daysInMonth = lastDay.getUTCDate();

    var html = '<div class="grid grid-cols-7 border border-brand-500 rounded-xl overflow-hidden">';

    // Weekday headers
    WEEKDAYS.forEach(function (d, i) {
      html += '<div class="bg-accent/90 text-white text-center py-3 text-xs md:text-sm font-bold uppercase tracking-wide">';
      html += '<span class="hidden md:inline">' + d + '</span>';
      html += '<span class="md:hidden">' + WEEKDAYS_SHORT[i] + '</span>';
      html += '</div>';
    });

    // Empty cells before
    for (var i = 0; i < startDow; i++) {
      html += '<div class="cal-cell bg-brand-900/50 border border-brand-500/50 p-1"></div>';
    }

    // Days
    for (var day = 1; day <= daysInMonth; day++) {
      var dayEvents = monthEvents.filter(function (e) {
        var d = parseDate(e.dataInicio);
        return d && d.getUTCDate() === day;
      });

      var hasEvents = dayEvents.length > 0;
      html += '<div class="cal-cell border border-brand-500/50 p-1.5 relative ' +
        (hasEvents ? 'bg-brand-700 hover:bg-brand-600' : 'bg-brand-800') + ' transition-colors">';

      // Day number
      html += '<div class="text-xs font-semibold text-gray-500 mb-1">' + day + '</div>';

      // Events
      dayEvents.forEach(function (e) {
        var cat = CATEGORIES[e.categoria] || { name: 'Geral', color: '#a14360' };
        var hasP = e.presenca && e.presenca.confirmada;
        html += '<div class="event-chip rounded px-1.5 py-0.5 mb-0.5 text-[10px] md:text-xs font-bold text-white cursor-pointer truncate hover:opacity-90 transition-opacity' +
          (hasP ? ' ring-2 ring-presence' : '') + '" ' +
          'style="background:' + cat.color + '" ' +
          'onclick="app.openEvent(\'' + esc(e.id) + '\')" ' +
          'title="' + esc(e.nome) + '">';
        html += esc(e.nome);
        html += '</div>';
      });

      html += '</div>';
    }

    // Empty cells after
    var totalCells = startDow + daysInMonth;
    var remaining = (7 - (totalCells % 7)) % 7;
    for (var j = 0; j < remaining; j++) {
      html += '<div class="cal-cell bg-brand-900/50 border border-brand-500/50 p-1"></div>';
    }

    html += '</div>';

    if (monthEvents.length === 0) {
      html += '<p class="text-center text-gray-500 py-6">Nenhum evento neste mês</p>';
    } else {
      html += '<p class="text-center text-gray-500 text-sm py-3">' + monthEvents.length + ' evento' + (monthEvents.length > 1 ? 's' : '') + ' em ' + MONTH_NAMES[currentMonth] + '</p>';
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

      html += '<div class="mb-8">';
      html += '<div class="flex items-center gap-3 mb-3 pb-2 border-b border-brand-500">';
      html += '<h3 class="text-xl font-bold">' + monthName + '</h3>';
      html += '<span class="bg-brand-700 text-gray-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-brand-500">' + events.length + ' evento' + (events.length > 1 ? 's' : '') + '</span>';
      html += '</div><div class="space-y-3">';

      events.forEach(function (event) {
        var date = parseDate(event.dataInicio);
        var cat = CATEGORIES[event.categoria] || { name: 'Geral', color: '#a14360' };
        var hasP = event.presenca && event.presenca.confirmada;

        html += '<div class="bg-brand-700 border border-brand-500 rounded-xl p-4 flex gap-4 items-center hover:border-accent hover:bg-brand-600 transition-all' + (hasP ? ' border-l-4 border-l-presence' : '') + '">';

        // Date
        html += '<div class="text-center bg-brand-800 rounded-lg px-3 py-2 min-w-[56px]">';
        if (date) {
          html += '<div class="text-xl font-extrabold leading-none">' + date.getUTCDate() + '</div>';
          html += '<div class="text-[10px] font-bold text-accent uppercase mt-0.5">' + MONTH_SHORT[date.getUTCMonth()] + '</div>';
        }
        html += '</div>';

        // Info
        html += '<div class="flex-1 min-w-0">';
        html += '<div class="flex items-center gap-2 flex-wrap mb-1">';
        html += '<span class="font-bold text-sm truncate">' + esc(event.nome) + '</span>';
        html += '<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style="background:' + cat.color + '">' + cat.name + '</span>';
        if (hasP) html += '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-presence text-white">🎯 ' + esc(event.presenca.tipo) + '</span>';
        html += '</div>';
        html += '<div class="flex flex-wrap gap-3 text-xs text-gray-400">';
        html += '<span>📅 ' + formatDateRange(event.dataInicio, event.dataFim) + '</span>';
        html += '<span>📍 ' + esc(event.cidade) + ', ' + esc(event.estado) + '</span>';
        html += '</div>';
        if (event.descricao) html += '<p class="text-xs text-gray-500 mt-1 line-clamp-1">' + esc(event.descricao) + '</p>';
        html += '</div>';

        // Link
        if (event.url) {
          html += '<a href="' + esc(event.url) + '" target="_blank" rel="noopener" class="w-9 h-9 rounded-full bg-brand-800 border border-brand-500 flex items-center justify-center text-gray-400 hover:bg-accent hover:border-accent hover:text-white transition-all shrink-0">';
          html += '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>';
          html += '</a>';
        }
        html += '</div>';
      });

      html += '</div></div>';
    });

    container.innerHTML = html;
  }

  function openEvent(id) {
    var event = allEvents.find(function (e) { return e.id === id; });
    if (!event) return;
    var cat = CATEGORIES[event.categoria] || { name: 'Geral', color: '#a14360' };
    var hasP = event.presenca && event.presenca.confirmada;

    var html = '<div class="space-y-4">';
    html += '<h3 class="text-xl font-bold">' + esc(event.nome) + '</h3>';
    html += '<div class="flex flex-wrap gap-2">';
    html += '<span class="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style="background:' + cat.color + '">' + cat.name + '</span>';
    if (hasP) html += '<span class="text-xs font-bold px-2.5 py-1 rounded-full bg-presence text-white">🎯 ' + esc(event.presenca.tipo) + '</span>';
    html += '</div>';
    html += '<div class="text-sm text-gray-400 space-y-1">';
    html += '<p>📅 ' + formatDateRange(event.dataInicio, event.dataFim) + '</p>';
    html += '<p>📍 ' + esc(event.local) + ' — ' + esc(event.cidade) + ', ' + esc(event.estado) + '</p>';
    html += '</div>';
    if (event.descricao) html += '<p class="text-sm text-gray-300">' + esc(event.descricao) + '</p>';
    if (event.url) html += '<a href="' + esc(event.url) + '" target="_blank" rel="noopener" class="inline-block mt-2 text-accent font-semibold text-sm hover:underline">🔗 Site do Evento →</a>';
    html += '</div>';

    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
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
  function esc(str) { if (!str) return ''; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
  function showNotice(msg) { document.getElementById('notice').textContent = msg; document.getElementById('events-container').innerHTML = ''; }

  return { init: init, openEvent: openEvent };
})();

document.addEventListener('DOMContentLoaded', app.init);
