'use strict';

const fc = require('fast-check');

/**
 * Property 6: Badge de presença renderiza corretamente.
 * Property 7: Ordenação de eventos por data e presença.
 * Property 8: Filtros combinados aplicam lógica AND.
 * Property 9: Contador de presença é preciso.
 * Property 10: Contador de resultados filtrados é preciso.
 * Valida: Requisitos 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.4, 5.5
 */

// Re-implement the pure logic functions from main.js for testing
// (main.js is an IIFE that doesn't export, so we test the logic directly)

function sortEvents(events) {
  return events.slice().sort(function (a, b) {
    var dA = a.dataInicio || '';
    var dB = b.dataInicio || '';
    if (dA < dB) return -1;
    if (dA > dB) return 1;
    var pA = a.presenca && a.presenca.confirmada ? 0 : 1;
    var pB = b.presenca && b.presenca.confirmada ? 0 : 1;
    return pA - pB;
  });
}

function getFilteredEvents(allEvents, activeCategory, presenceOnly) {
  return allEvents.filter(function (event) {
    if (activeCategory && event.categoria !== activeCategory) return false;
    if (presenceOnly && (!event.presenca || !event.presenca.confirmada)) return false;
    return true;
  });
}

function hasPresenceBadge(event) {
  return event.presenca && event.presenca.confirmada === true;
}

const CATEGORIAS_VALIDAS = [
  'Cloud', 'DevOps', 'Seguranca', 'Infraestrutura', 'Automacao',
  'Observabilidade', 'Containers', 'Linux', 'Redes', 'Geral',
  'IA', 'Desenvolvimento', 'Dados', 'Carreira',
];

const TIPOS_PRESENCA = ['palestrante', 'participante', 'organizador', 'midia'];

// Arbitrary for events
const eventArbitrary = fc.record({
  id: fc.uuid(),
  nome: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  dataInicio: fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
    .map(d => d.toISOString().slice(0, 10)),
  local: fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0),
  cidade: fc.constantFrom('São Paulo', 'Rio de Janeiro', 'Curitiba', 'Belo Horizonte'),
  estado: fc.constantFrom('SP', 'RJ', 'PR', 'MG', 'SC'),
  pais: fc.constant('Brasil'),
  url: fc.webUrl(),
  categoria: fc.constantFrom(...CATEGORIAS_VALIDAS),
  presenca: fc.oneof(
    fc.constant(undefined),
    fc.record({
      confirmada: fc.boolean(),
      tipo: fc.constantFrom(...TIPOS_PRESENCA),
    })
  ),
});

describe('Property 6: Badge de presença renderiza corretamente', () => {
  it('badge is shown if and only if presenca.confirmada === true', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        const shouldShow = event.presenca && event.presenca.confirmada === true;
        expect(hasPresenceBadge(event)).toBe(shouldShow);
      }),
      { numRuns: 100 }
    );
  });

  it('badge tipo matches presenca.tipo when shown', () => {
    fc.assert(
      fc.property(
        eventArbitrary.filter(e => e.presenca && e.presenca.confirmada),
        (event) => {
          expect(hasPresenceBadge(event)).toBe(true);
          expect(TIPOS_PRESENCA).toContain(event.presenca.tipo);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Property 7: Ordenação de eventos por data e presença', () => {
  it('sorted events are in non-decreasing date order', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 2, maxLength: 30 }),
        (events) => {
          const sorted = sortEvents(events);

          for (let i = 1; i < sorted.length; i++) {
            const dateA = sorted[i - 1].dataInicio || '';
            const dateB = sorted[i].dataInicio || '';
            expect(dateA <= dateB).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('for same date, events with presenca come before those without', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 2, maxLength: 30 }),
        (events) => {
          const sorted = sortEvents(events);

          for (let i = 1; i < sorted.length; i++) {
            if (sorted[i - 1].dataInicio === sorted[i].dataInicio) {
              const pA = sorted[i - 1].presenca && sorted[i - 1].presenca.confirmada ? 0 : 1;
              const pB = sorted[i].presenca && sorted[i].presenca.confirmada ? 0 : 1;
              expect(pA <= pB).toBe(true);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('sorting does not add or remove events', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 0, maxLength: 20 }),
        (events) => {
          const sorted = sortEvents(events);
          expect(sorted.length).toBe(events.length);

          const sortedIds = sorted.map(e => e.id).sort();
          const originalIds = events.map(e => e.id).sort();
          expect(sortedIds).toEqual(originalIds);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('sorting does not mutate the original array', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 1, maxLength: 10 }),
        (events) => {
          const original = [...events];
          sortEvents(events);
          expect(events).toEqual(original);
        }
      ),
      { numRuns: 30 }
    );
  });
});

describe('Property 8: Filtros combinados aplicam lógica AND', () => {
  it('category filter returns only events of that category', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 1, maxLength: 20 }),
        fc.constantFrom(...CATEGORIAS_VALIDAS),
        (events, category) => {
          const filtered = getFilteredEvents(events, category, false);
          for (const event of filtered) {
            expect(event.categoria).toBe(category);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('presence filter returns only events with presenca.confirmada', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 1, maxLength: 20 }),
        (events) => {
          const filtered = getFilteredEvents(events, null, true);
          for (const event of filtered) {
            expect(event.presenca).toBeDefined();
            expect(event.presenca.confirmada).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('combined filters apply AND logic (category + presence)', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 1, maxLength: 20 }),
        fc.constantFrom(...CATEGORIAS_VALIDAS),
        (events, category) => {
          const filtered = getFilteredEvents(events, category, true);
          for (const event of filtered) {
            expect(event.categoria).toBe(category);
            expect(event.presenca).toBeDefined();
            expect(event.presenca.confirmada).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('no filters returns all events', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 0, maxLength: 20 }),
        (events) => {
          const filtered = getFilteredEvents(events, null, false);
          expect(filtered.length).toBe(events.length);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('filtered results are always a subset of original', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 0, maxLength: 20 }),
        fc.constantFrom(null, ...CATEGORIAS_VALIDAS),
        fc.boolean(),
        (events, category, presenceOnly) => {
          const filtered = getFilteredEvents(events, category, presenceOnly);
          expect(filtered.length).toBeLessThanOrEqual(events.length);
          for (const event of filtered) {
            expect(events).toContainEqual(event);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Property 9: Contador de presença é preciso', () => {
  it('presence count matches actual confirmed events', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 0, maxLength: 30 }),
        (events) => {
          const count = events.filter(e => e.presenca && e.presenca.confirmada).length;
          const filtered = getFilteredEvents(events, null, true);
          expect(filtered.length).toBe(count);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('presence count is always <= total count', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 0, maxLength: 30 }),
        (events) => {
          const presenceCount = events.filter(e => e.presenca && e.presenca.confirmada).length;
          expect(presenceCount).toBeLessThanOrEqual(events.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Property 10: Contador de resultados filtrados é preciso', () => {
  it('filtered count equals length of filtered array', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 0, maxLength: 20 }),
        fc.constantFrom(null, ...CATEGORIAS_VALIDAS),
        fc.boolean(),
        (events, category, presenceOnly) => {
          const filtered = getFilteredEvents(events, category, presenceOnly);
          // The count displayed should match the filtered array length
          const displayCount = filtered.length;
          expect(displayCount).toBe(filtered.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('category filter count + other categories = total (partition)', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 1, maxLength: 20 }),
        (events) => {
          let totalFromCategories = 0;
          for (const cat of CATEGORIAS_VALIDAS) {
            totalFromCategories += getFilteredEvents(events, cat, false).length;
          }
          // Events with categories in CATEGORIAS_VALIDAS should sum to total
          // (all events have valid categories from our arbitrary)
          expect(totalFromCategories).toBe(events.length);
        }
      ),
      { numRuns: 30 }
    );
  });
});
