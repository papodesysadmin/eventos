const app = (function () {
  'use strict';

  const MONTH_NAMES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
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

  const DEFAULT_CATEGORY = { name: 'Geral', color: '#a14360' };

  const page = {};

  // All events stored in memory for client-side filtering
  let allEvents = [];

  function init() {
    page.eventList = document.getElementById('event-list');
    page.notice = document.getElementById('notice');
    page.monthSelect = document.getElementById('month-select');
    page.categoryList = document.getElementById('category-list');
    page.presenceFilter = document.getElementById('presence-filter');
    page.presenceCounter = document.getElementById('presence-counter');
    page.resultsCounter = document.getElementById('results-counter');
    page.resultsText = document.getElementById('results-text');

    // Bind filter event listeners
    if (page.monthSelect) {
      page.monthSelect.addEventListener('change', applyFilters);
    }
    if (page.presenceFilter) {
      page.presenceFilter.addEventListener('change', applyFilters);
    }

    loadEvents();
  }

  async function loadEvents() {
    try {
      const response = await fetch('data/eventos.json');
      if (!response.ok) {
        showError('Não foi possível carregar os eventos.');
        return;
      }

      let events;
      try {
        events = await response.json();
      } catch (parseError) {
        showError('Erro ao carregar eventos: formato de dados inválido.');
        return;
      }

      if (!Array.isArray(events)) {
        showError('Erro ao carregar eventos: formato de dados inválido.');
        return;
      }

      if (events.length === 0) {
        showError('Nenhum evento disponível no momento.');
        return;
      }

      allEvents = sortEvents(events);
      renderCategoryList(allEvents);
      updatePresenceCounter(allEvents);
      applyFilters();
    } catch (error) {
      showError('Não foi possível carregar os eventos.');
    }
  }

  function sortEvents(events) {
    return events.slice().sort(function (a, b) {
      var dateA = a.dataInicio || '';
      var dateB = b.dataInicio || '';
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
      // Same date: confirmed presence first
      var presA = a.presenca && a.presenca.confirmada === true ? 0 : 1;
      var presB = b.presenca && b.presenca.confirmada === true ? 0 : 1;
      return presA - presB;
    });
  }

  /**
   * Renders the category list in the sidebar with "Todos" + all categories.
   * Each category item is a clickable link that triggers filtering.
   */
  function renderCategoryList(events) {
    if (!page.categoryList) return;

    page.categoryList.innerHTML = '';

    // "Todos" option
    var allItem = document.createElement('a');
    allItem.href = '#';
    allItem.className = 'list-group-item list-group-item-action active';
    allItem.setAttribute('data-category', '');
    allItem.textContent = 'Todos';
    allItem.addEventListener('click', function (e) {
      e.preventDefault();
      selectCategory('');
    });
    page.categoryList.appendChild(allItem);

    // One item per category
    var categoryKeys = Object.keys(CATEGORIES);
    categoryKeys.forEach(function (key) {
      var cat = CATEGORIES[key];
      var item = document.createElement('a');
      item.href = '#';
      item.className = 'list-group-item list-group-item-action';
      item.setAttribute('data-category', key);
      item.textContent = cat.name;
      item.addEventListener('click', function (e) {
        e.preventDefault();
        selectCategory(key);
      });
      page.categoryList.appendChild(item);
    });
  }

  /**
   * Selects a category in the sidebar and triggers filter application.
   */
  function selectCategory(categoryKey) {
    if (!page.categoryList) return;

    var items = page.categoryList.querySelectorAll('.list-group-item');
    items.forEach(function (item) {
      if (item.getAttribute('data-category') === categoryKey) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    applyFilters();
  }

  /**
   * Updates the presence counter badge with the total number of confirmed events.
   */
  function updatePresenceCounter(events) {
    var count = countPresence(events);
    if (page.presenceCounter) {
      page.presenceCounter.textContent = count;
    }
  }

  /**
   * Counts events with confirmed presence.
   */
  function countPresence(events) {
    var count = 0;
    for (var i = 0; i < events.length; i++) {
      if (events[i].presenca && events[i].presenca.confirmada === true) {
        count++;
      }
    }
    return count;
  }

  /**
   * Gets the currently selected category from the sidebar.
   * Returns empty string for "Todos" (no filter).
   */
  function getSelectedCategory() {
    if (!page.categoryList) return '';
    var active = page.categoryList.querySelector('.list-group-item.active');
    if (!active) return '';
    return active.getAttribute('data-category') || '';
  }

  /**
   * Gets the current filter state from the UI.
   * Returns an object with month, category, and presence values.
   */
  function getFilterState() {
    var month = 0;
    if (page.monthSelect) {
      month = parseInt(page.monthSelect.value, 10) || 0;
    }

    var category = getSelectedCategory();

    var presence = false;
    if (page.presenceFilter) {
      presence = page.presenceFilter.checked;
    }

    return { month: month, category: category, presence: presence };
  }

  /**
   * Filters events based on the given filter state.
   * Applies AND logic: only events matching ALL active criteria are returned.
   *
   * @param {Array} events - Array of event objects
   * @param {Object} filterState - { month, category, presence }
   * @returns {Array} Filtered events
   */
  function filterEvents(events, filterState) {
    return events.filter(function (event) {
      // Month filter
      if (filterState.month > 0) {
        var date = parseDate(event.dataInicio);
        if (!date) return false;
        // getUTCMonth() is 0-indexed, filterState.month is 1-indexed
        if ((date.getUTCMonth() + 1) !== filterState.month) return false;
      }

      // Category filter
      if (filterState.category) {
        if (!event.categoria) return false;
        // Case-insensitive comparison
        if (event.categoria.toLowerCase() !== filterState.category.toLowerCase()) return false;
      }

      // Presence filter
      if (filterState.presence) {
        if (!event.presenca || event.presenca.confirmada !== true) return false;
      }

      return true;
    });
  }

  /**
   * Reads filter state from the UI, filters events, and re-renders.
   * This is the main entry point for filter application.
   */
  function applyFilters() {
    var filterState = getFilterState();
    var filtered = filterEvents(allEvents, filterState);

    // Update results counter
    updateResultsCounter(filtered.length, allEvents.length);

    // Render filtered events or empty message
    if (filtered.length === 0 && allEvents.length > 0) {
      showEmptyFilterMessage();
    } else {
      renderEvents(filtered);
    }
  }

  /**
   * Updates the results counter display above the event list.
   */
  function updateResultsCounter(shown, total) {
    if (!page.resultsCounter || !page.resultsText) return;

    if (total === 0) {
      page.resultsCounter.style.display = 'none';
      return;
    }

    page.resultsText.textContent = 'Mostrando ' + shown + ' de ' + total + ' eventos';
    page.resultsCounter.style.display = '';
  }

  /**
   * Shows a message when no events match the current filters.
   */
  function showEmptyFilterMessage() {
    if (page.eventList) {
      page.eventList.innerHTML = '';
    }
    if (page.notice) {
      page.notice.textContent = 'Nenhum evento encontrado para os filtros selecionados.';
    }
  }

  function renderEvents(events) {
    if (page.notice) {
      page.notice.textContent = '';
    }
    page.eventList.innerHTML = '';
    events.forEach(function (event) {
      var li = document.createElement('li');
      var category = getCategoryByKey(event.categoria) || DEFAULT_CATEGORY;

      li.innerHTML =
        renderTime(event, category) +
        '<div class="info">' +
          '<div class="category" style="background-color: ' + category.color + '">' + category.name + '</div>' +
          '<div class="row">' +
            '<div class="col-sm-10">' +
              '<h2 class="title">' + escapeHtml(event.nome) + '</h2>' +
              renderPresencaBadge(event) +
            '</div>' +
          '</div>' +
          '<div class="d-flex">' +
            '<div class="col-xs-12 col-sm-6">' +
              '<div class="row">' +
                '<div class="col-sm-3 font-weight-bold">Início:</div>' +
                '<div class="col-sm-9">' + formatDate(event.dataInicio) + '</div>' +
              '</div>' +
              '<div class="row">' +
                '<div class="col-sm-3 font-weight-bold">Fim:</div>' +
                '<div class="col-sm-9">' + formatDate(event.dataFim) + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="col-xs-12 col-sm-6">' +
              '<div class="row">' +
                '<div class="col-sm-3 font-weight-bold">Local:</div>' +
                '<div class="col-sm-9">' + escapeHtml(buildLocation(event)) + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          renderEventLink(event.url) +
        '</div>';

      page.eventList.appendChild(li);
    });
  }

  function renderPresencaBadge(event) {
    if (!event.presenca || event.presenca.confirmada !== true) {
      return '';
    }
    return '<span class="badge-presenca">' + escapeHtml(event.presenca.tipo) + '</span>';
  }

  function renderTime(event, category) {
    var date = parseDate(event.dataInicio);
    if (!date) {
      return '<time style="background-color: ' + category.color + '"><span class="day">--</span><span class="month">---</span><span class="year">----</span></time>';
    }
    return '<time datetime="' + event.dataInicio + '" style="background-color: ' + category.color + '">' +
      '<span class="day">' + date.getUTCDate() + '</span>' +
      '<span class="month">' + MONTH_NAMES[date.getUTCMonth()] + '</span>' +
      '<span class="year">' + date.getUTCFullYear() + '</span>' +
    '</time>';
  }

  function renderEventLink(url) {
    if (!url) return '';
    return '<div class="links mt-3">' +
      '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' +
        '<span>Site do Evento</span>' +
        '<i class="fa fa-arrow-circle-right"></i>' +
      '</a>' +
    '</div>';
  }

  function buildLocation(event) {
    var parts = [];
    if (event.local) parts.push(event.local);
    if (event.cidade) parts.push(event.cidade);
    if (event.estado) parts.push(event.estado);
    if (event.pais) parts.push(event.pais);
    return parts.join(' - ');
  }

  function getCategoryByKey(key) {
    if (!key) return null;
    if (CATEGORIES[key]) return CATEGORIES[key];
    // Try case-insensitive match
    var keys = Object.keys(CATEGORIES);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === key.toLowerCase()) {
        return CATEGORIES[keys[i]];
      }
    }
    return null;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    var date = parseDate(dateStr);
    if (!date) return '-';
    var day = String(date.getUTCDate()).padStart(2, '0');
    var month = String(date.getUTCMonth() + 1).padStart(2, '0');
    var year = date.getUTCFullYear();
    return day + '/' + month + '/' + year;
  }

  function parseDate(dateStr) {
    if (!dateStr) return null;
    var date = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(date.getTime())) return null;
    return date;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showError(message) {
    if (page.notice) {
      page.notice.textContent = message;
    }
    if (page.eventList) {
      page.eventList.innerHTML = '';
    }
  }

  return {
    init: init,
    loadEvents: loadEvents,
    renderEvents: renderEvents,
    sortEvents: sortEvents,
    applyFilters: applyFilters,
    filterEvents: filterEvents,
    countPresence: countPresence,
    getFilterState: getFilterState,
    // Expose for testing: allow setting allEvents externally
    _setAllEvents: function (events) { allEvents = events; },
    _getAllEvents: function () { return allEvents; }
  };
})();
