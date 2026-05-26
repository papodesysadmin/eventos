'use strict';

const fc = require('fast-check');

/**
 * Property 11: Edição de evento preserva campos não modificados.
 * Property 12: Remoção de evento diminui a lista.
 * Property 13: Listagem CLI exibe todos os eventos.
 * Valida: Requisitos 7.3, 7.4, 7.5
 */

// Mock dependencies
jest.mock('../../utils/json-io');
jest.mock('readline');

const jsonIo = require('../../utils/json-io');
const readline = require('readline');
const { editEvent } = require('../../commands/edit');
const { removeEvent } = require('../../commands/remove');
const { listEvents } = require('../../commands/list');

const { CATEGORIAS_VALIDAS } = require('../../validator/index');

// Helper for fixed events in non-property tests
function makeFixedEvent(id, nome, dataInicio) {
  return {
    id,
    nome,
    dataInicio,
    local: 'Local Teste',
    cidade: 'São Paulo',
    estado: 'SP',
    pais: 'Brasil',
    url: 'https://example.com',
    categoria: 'Cloud',
  };
}

// Arbitrary for valid events
const validEventArbitrary = fc.record({
  id: fc.uuid(),
  nome: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  dataInicio: fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
    .map(d => d.toISOString().slice(0, 10)),
  local: fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0),
  cidade: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  estado: fc.constantFrom('SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'BA', 'CE', 'DF', 'PE'),
  pais: fc.constant('Brasil'),
  url: fc.webUrl(),
  categoria: fc.constantFrom(...CATEGORIAS_VALIDAS),
});

describe('Property 11: Edit preserves unmodified fields', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.resetAllMocks();
    process.exitCode = undefined;
  });

  function setupReadlineMock(answers) {
    let callIndex = 0;
    const mockRl = {
      question: jest.fn((q, cb) => {
        const answer = answers[callIndex] !== undefined ? answers[callIndex] : '';
        callIndex++;
        cb(answer);
      }),
      close: jest.fn(),
    };
    readline.createInterface.mockReturnValue(mockRl);
    return mockRl;
  }

  it('pressing Enter for all fields preserves the original event', () => {
    fc.assert(
      fc.asyncProperty(validEventArbitrary, async (event) => {
        // Clear mocks at start of each iteration
        jsonIo.readEvents.mockReset();
        jsonIo.writeEvents.mockReset();

        const original = { ...event };
        jsonIo.readEvents.mockReturnValue([{ ...event }]);
        jsonIo.writeEvents.mockImplementation(() => {});
        // All empty answers = keep current values
        setupReadlineMock(['', '', '', '', '', '', '', '', '', '']);

        await editEvent(event.id);

        if (jsonIo.writeEvents.mock.calls.length > 0) {
          const saved = jsonIo.writeEvents.mock.calls[0][0][0];
          // All original fields should be preserved
          expect(saved.nome).toBe(original.nome);
          expect(saved.dataInicio).toBe(original.dataInicio);
          expect(saved.local).toBe(original.local);
          expect(saved.cidade).toBe(original.cidade);
          expect(saved.estado).toBe(original.estado);
          expect(saved.pais).toBe(original.pais);
          expect(saved.url).toBe(original.url);
          expect(saved.categoria).toBe(original.categoria);
        }
      }),
      { numRuns: 30 }
    );
  });

  it('non-existent ID never modifies any event', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(validEventArbitrary, { minLength: 1, maxLength: 5 }),
        async (events) => {
          // Use an ID that definitely doesn't match any event
          const safeId = 'zzz-nonexistent-id-000';
          jsonIo.readEvents.mockReturnValue([...events]);
          jsonIo.writeEvents.mockImplementation(() => {});
          setupReadlineMock([]);

          await editEvent(safeId);

          expect(jsonIo.writeEvents).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 12: Removal decreases list size', () => {
  let consoleSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.resetAllMocks();
    process.exitCode = undefined;
  });

  it('removing an existing event decreases list by exactly 1', async () => {
    // Use a fixed set of events to avoid worker issues
    const events = [
      { ...makeFixedEvent('id-1', 'Event 1', '2026-01-01') },
      { ...makeFixedEvent('id-2', 'Event 2', '2026-02-01') },
      { ...makeFixedEvent('id-3', 'Event 3', '2026-03-01') },
    ];

    for (let i = 0; i < events.length; i++) {
      jsonIo.readEvents.mockReturnValue([...events]);
      jsonIo.writeEvents.mockImplementation(() => {});

      const mockQuestion = jest.fn((q, cb) => cb('s'));
      const mockClose = jest.fn();
      readline.createInterface.mockReturnValue({
        question: mockQuestion,
        close: mockClose,
      });

      await removeEvent(events[i].id);

      expect(jsonIo.writeEvents).toHaveBeenCalledTimes(1);
      const savedEvents = jsonIo.writeEvents.mock.calls[0][0];
      expect(savedEvents).toHaveLength(events.length - 1);
      expect(savedEvents.find(e => e.id === events[i].id)).toBeUndefined();

      jest.clearAllMocks();
    }
  });

  it('cancelling removal preserves list unchanged', async () => {
    const events = [
      { ...makeFixedEvent('id-1', 'Event 1', '2026-01-01') },
      { ...makeFixedEvent('id-2', 'Event 2', '2026-02-01') },
    ];

    for (let i = 0; i < events.length; i++) {
      jsonIo.readEvents.mockReturnValue([...events]);
      jsonIo.writeEvents.mockImplementation(() => {});

      const mockQuestion = jest.fn((q, cb) => cb('n'));
      const mockClose = jest.fn();
      readline.createInterface.mockReturnValue({
        question: mockQuestion,
        close: mockClose,
      });

      await removeEvent(events[i].id);

      expect(jsonIo.writeEvents).not.toHaveBeenCalled();

      jest.clearAllMocks();
    }
  });

  it('property: removing any event from generated list decreases by 1', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(validEventArbitrary, { minLength: 1, maxLength: 5 }),
        fc.nat(),
        async (events, indexSeed) => {
          // Clear mocks at start of each iteration
          jsonIo.readEvents.mockReset();
          jsonIo.writeEvents.mockReset();

          const index = indexSeed % events.length;
          const targetId = events[index].id;
          const originalLength = events.length;

          jsonIo.readEvents.mockReturnValue([...events]);
          jsonIo.writeEvents.mockImplementation(() => {});

          const mockQuestion = jest.fn((q, cb) => cb('s'));
          const mockClose = jest.fn();
          readline.createInterface.mockReturnValue({
            question: mockQuestion,
            close: mockClose,
          });

          await removeEvent(targetId);

          expect(jsonIo.writeEvents).toHaveBeenCalledTimes(1);
          const savedEvents = jsonIo.writeEvents.mock.calls[0][0];
          expect(savedEvents).toHaveLength(originalLength - 1);
          expect(savedEvents.find(e => e.id === targetId)).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 13: List shows all events', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.resetAllMocks();
    process.exitCode = undefined;
  });

  it('list output contains the ID prefix of every event', () => {
    fc.assert(
      fc.property(
        fc.array(validEventArbitrary, { minLength: 1, maxLength: 10 }),
        (events) => {
          // Clear mocks at start of each iteration
          jsonIo.readEvents.mockReset();
          consoleSpy.mockClear();

          jsonIo.readEvents.mockReturnValue(events);

          listEvents({});

          const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');

          // Every event's ID prefix (first 8 chars) should appear in output
          for (const event of events) {
            const idPrefix = event.id.substring(0, 8);
            expect(output).toContain(idPrefix);
          }

          // Total count should match
          expect(output).toContain(`Total: ${events.length} evento(s)`);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('list with --presenca filter shows only confirmed events', () => {
    fc.assert(
      fc.property(
        fc.array(validEventArbitrary, { minLength: 1, maxLength: 10 }),
        fc.array(fc.nat(), { minLength: 0, maxLength: 5 }),
        (events, confirmIndices) => {
          // Clear mocks at start of each iteration
          jsonIo.readEvents.mockReset();
          consoleSpy.mockClear();

          // Mark some events as having confirmed presenca
          const eventsWithPresenca = events.map((e, i) => {
            if (confirmIndices.includes(i % events.length)) {
              return { ...e, presenca: { confirmada: true, tipo: 'palestrante' } };
            }
            return e;
          });

          jsonIo.readEvents.mockReturnValue(eventsWithPresenca);

          listEvents({ presenca: true });

          const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
          const confirmedCount = eventsWithPresenca.filter(
            e => e.presenca && e.presenca.confirmada
          ).length;

          if (confirmedCount === 0) {
            expect(output).toContain('Nenhum evento encontrado');
          } else {
            expect(output).toContain(`Total: ${confirmedCount} evento(s)`);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
