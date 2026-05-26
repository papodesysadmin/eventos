'use strict';

const fc = require('fast-check');
const { readEvents, writeEvents, DATA_FILE } = require('../../utils/json-io');
const fs = require('fs');

/**
 * Property 1: Round-trip de serialização JSON de eventos.
 * Valida: Requisitos 2.3, 3.7
 *
 * Para qualquer array de eventos válido, writeEvents seguido de readEvents
 * deve produzir um array equivalente ao original.
 */

// Arbitrary para gerar um evento válido
const eventArbitrary = fc.record({
  id: fc.uuid(),
  nome: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  dataInicio: fc.date({
    min: new Date('2024-01-01'),
    max: new Date('2030-12-31'),
  }).map(d => d.toISOString().slice(0, 10)),
  local: fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim().length > 0),
  cidade: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  estado: fc.constantFrom('SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'BA', 'CE', 'DF', 'PE'),
  pais: fc.constant('Brasil'),
  url: fc.webUrl(),
  categoria: fc.constantFrom(
    'Cloud', 'DevOps', 'Seguranca', 'Infraestrutura', 'Automacao',
    'Observabilidade', 'Containers', 'Linux', 'Redes', 'Geral',
    'IA', 'Desenvolvimento', 'Dados', 'Carreira'
  ),
});

describe('Property: JSON round-trip serialization', () => {
  const originalContent = fs.readFileSync(DATA_FILE, 'utf-8');

  afterEach(() => {
    fs.writeFileSync(DATA_FILE, originalContent, 'utf-8');
  });

  it('writeEvents → readEvents produces equivalent array (round-trip)', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 0, maxLength: 20 }),
        (events) => {
          writeEvents(events);
          const loaded = readEvents();
          expect(loaded).toEqual(events);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('double write → read is idempotent', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { minLength: 0, maxLength: 10 }),
        (events) => {
          writeEvents(events);
          writeEvents(readEvents());
          const loaded = readEvents();
          expect(loaded).toEqual(events);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('preserves UTF-8 characters through round-trip', () => {
    fc.assert(
      fc.property(
        fc.unicodeString({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (nome) => {
          const events = [{
            id: '00000000-0000-0000-0000-000000000000',
            nome,
            dataInicio: '2026-01-01',
            local: 'Local',
            cidade: 'Cidade',
            estado: 'SP',
            pais: 'Brasil',
            url: 'https://example.com',
            categoria: 'Geral',
          }];
          writeEvents(events);
          const loaded = readEvents();
          expect(loaded[0].nome).toBe(nome);
        }
      ),
      { numRuns: 30 }
    );
  });
});
