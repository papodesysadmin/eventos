'use strict';

const fc = require('fast-check');
const {
  validateEvent,
  validateEventsFile,
  CATEGORIAS_VALIDAS,
  TIPOS_PRESENCA_VALIDOS,
  CAMPOS_OBRIGATORIOS,
} = require('../../validator/index');

/**
 * Property 2: Validação de eventos aceita válidos e rejeita inválidos.
 * Valida: Requisitos 2.2, 7.7, 7.8
 */

// Arbitrary para gerar um evento completamente válido
const validEventArbitrary = fc.record({
  id: fc.uuid(),
  nome: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  dataInicio: fc.date({
    min: new Date('2024-01-01'),
    max: new Date('2030-12-31'),
  }).map(d => d.toISOString().slice(0, 10)),
  local: fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim().length > 0),
  cidade: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  estado: fc.constantFrom('SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'BA', 'CE', 'DF', 'PE'),
  pais: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  url: fc.webUrl(),
  categoria: fc.constantFrom(...CATEGORIAS_VALIDAS),
});

// Arbitrary para gerar presença válida opcional
const validPresencaArbitrary = fc.record({
  confirmada: fc.boolean(),
  tipo: fc.constantFrom(...TIPOS_PRESENCA_VALIDOS),
});

describe('Property: Validator accepts valid events', () => {
  it('any event with all required fields valid passes validation', () => {
    fc.assert(
      fc.property(validEventArbitrary, (event) => {
        const result = validateEvent(event);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it('valid event with optional presenca passes validation', () => {
    fc.assert(
      fc.property(
        validEventArbitrary,
        validPresencaArbitrary,
        (event, presenca) => {
          const eventWithPresenca = { ...event, presenca };
          const result = validateEvent(eventWithPresenca);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('valid event with optional descricao (≤200 chars) passes validation', () => {
    fc.assert(
      fc.property(
        validEventArbitrary,
        fc.string({ minLength: 1, maxLength: 200 }),
        (event, descricao) => {
          const eventWithDesc = { ...event, descricao };
          const result = validateEvent(eventWithDesc);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('valid event with optional dataFim passes validation', () => {
    fc.assert(
      fc.property(
        validEventArbitrary,
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
          .map(d => d.toISOString().slice(0, 10)),
        (event, dataFim) => {
          const eventWithFim = { ...event, dataFim };
          const result = validateEvent(eventWithFim);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Property: Validator rejects invalid events', () => {
  it('removing any required field makes event invalid', () => {
    fc.assert(
      fc.property(
        validEventArbitrary,
        fc.constantFrom(...CAMPOS_OBRIGATORIOS),
        (event, fieldToRemove) => {
          const broken = { ...event };
          delete broken[fieldToRemove];
          const result = validateEvent(broken);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty string for any required field makes event invalid', () => {
    fc.assert(
      fc.property(
        validEventArbitrary,
        fc.constantFrom(...CAMPOS_OBRIGATORIOS),
        (event, fieldToEmpty) => {
          const broken = { ...event, [fieldToEmpty]: '' };
          const result = validateEvent(broken);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('invalid date format for dataInicio makes event invalid', () => {
    fc.assert(
      fc.property(
        validEventArbitrary,
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
        (event, badDate) => {
          const broken = { ...event, dataInicio: badDate };
          const result = validateEvent(broken);
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('invalid categoria makes event invalid', () => {
    fc.assert(
      fc.property(
        validEventArbitrary,
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => !CATEGORIAS_VALIDAS.includes(s)),
        (event, badCategoria) => {
          const broken = { ...event, categoria: badCategoria };
          const result = validateEvent(broken);
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('descricao > 200 chars makes event invalid', () => {
    fc.assert(
      fc.property(
        validEventArbitrary,
        fc.string({ minLength: 201, maxLength: 500 }),
        (event, longDesc) => {
          const broken = { ...event, descricao: longDesc };
          const result = validateEvent(broken);
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('non-object values are always invalid', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (value) => {
          const result = validateEvent(value);
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });
});

describe('Property: validateEventsFile', () => {
  it('array of valid events always passes', () => {
    fc.assert(
      fc.property(
        fc.array(validEventArbitrary, { minLength: 0, maxLength: 10 }),
        (events) => {
          const result = validateEventsFile(events);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('array with at least one invalid event fails', () => {
    fc.assert(
      fc.property(
        fc.array(validEventArbitrary, { minLength: 1, maxLength: 5 }),
        fc.nat({ max: 4 }),
        (events, idx) => {
          const index = idx % events.length;
          const broken = [...events];
          broken[index] = { ...broken[index] };
          delete broken[index].nome;
          const result = validateEventsFile(broken);
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes(`Evento[${index}]`))).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });
});
