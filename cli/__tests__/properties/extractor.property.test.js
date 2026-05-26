'use strict';

const fc = require('fast-check');
const { extractEventFromUrl, REQUIRED_FIELDS } = require('../../extractor/index');

jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

/**
 * Property 3: Saída do extrator conforma ao schema de eventos.
 * Property 4: Extrator identifica campos faltantes corretamente.
 * Property 5: Extrator rejeita páginas sem dados de evento.
 * Valida: Requisitos 3.2, 3.3, 3.6
 */

// Helper: generate a valid JSON-LD event page
function makeJsonLdPage(fields) {
  const jsonLd = {
    '@type': 'Event',
    name: fields.nome || undefined,
    startDate: fields.dataInicio || undefined,
    endDate: fields.dataFim || undefined,
    url: fields.url || undefined,
    location: fields.local ? {
      '@type': 'Place',
      name: fields.local,
      address: {
        '@type': 'PostalAddress',
        addressLocality: fields.cidade || undefined,
        addressRegion: fields.estado || undefined,
        addressCountry: fields.pais || undefined,
      },
    } : undefined,
    description: fields.descricao || undefined,
  };

  return `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body><h1>${fields.nome || ''}</h1></body></html>`;
}

describe('Property 3: Extractor output conforms to event schema', () => {
  beforeEach(() => jest.clearAllMocks());

  it('successful extraction always returns object with required schema fields', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          nome: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          dataInicio: fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
            .map(d => d.toISOString().slice(0, 10)),
          local: fc.string({ minLength: 2, maxLength: 40 }).filter(s => s.trim().length > 0),
          cidade: fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 0),
          estado: fc.constantFrom('SP', 'RJ', 'MG', 'PR', 'SC'),
          pais: fc.constant('Brasil'),
          url: fc.constant('https://example.com/event'),
        }),
        async (fields) => {
          const html = makeJsonLdPage(fields);
          fetch.mockResolvedValue({ ok: true, text: async () => html });

          const result = await extractEventFromUrl('https://example.com/event');

          // Result always has the expected structure
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('data');
          expect(result).toHaveProperty('missingFields');
          expect(typeof result.success).toBe('boolean');
          expect(typeof result.data).toBe('object');
          expect(Array.isArray(result.missingFields)).toBe(true);

          // If successful, data has all required fields
          if (result.success) {
            for (const field of REQUIRED_FIELDS) {
              expect(result.data[field]).toBeDefined();
              expect(result.data[field]).not.toBe('');
              expect(result.data[field]).not.toBeNull();
            }
            expect(result.missingFields).toHaveLength(0);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('data.url is always a string when present', () => {
    fc.assert(
      fc.asyncProperty(
        fc.webUrl(),
        async (url) => {
          const html = makeJsonLdPage({ nome: 'Test Event', dataInicio: '2026-06-01' });
          fetch.mockResolvedValue({ ok: true, text: async () => html });

          const result = await extractEventFromUrl(url);

          if (result.data.url) {
            expect(typeof result.data.url).toBe('string');
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 4: Extractor identifies missing fields correctly', () => {
  beforeEach(() => jest.clearAllMocks());

  it('missingFields contains exactly the fields not present in data', () => {
    fc.assert(
      fc.asyncProperty(
        fc.subarray(REQUIRED_FIELDS.filter(f => f !== 'nome' && f !== 'url'), { minLength: 1 }),
        async (fieldsToOmit) => {
          // Build a page with some fields missing
          const allFields = {
            nome: 'Test Event',
            dataInicio: '2026-05-01',
            local: 'Venue',
            cidade: 'São Paulo',
            estado: 'SP',
            pais: 'Brasil',
            url: 'https://example.com',
          };

          for (const field of fieldsToOmit) {
            delete allFields[field];
          }

          const html = makeJsonLdPage(allFields);
          fetch.mockResolvedValue({ ok: true, text: async () => html });

          const result = await extractEventFromUrl('https://example.com');

          // Every field in missingFields should NOT be present in data
          for (const field of result.missingFields) {
            const val = result.data[field];
            expect(val === undefined || val === null || val === '').toBe(true);
          }

          // Every required field NOT in missingFields should be present in data
          for (const field of REQUIRED_FIELDS) {
            if (!result.missingFields.includes(field)) {
              const val = result.data[field];
              expect(val !== undefined && val !== null && val !== '').toBe(true);
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});

describe('Property 5: Extractor rejects pages without event data', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pages without nome and dataInicio always return success=false', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 200 }),
        async (randomContent) => {
          // Generate a page with random content but no event structure
          const html = `<html><body><p>${randomContent.replace(/</g, '&lt;')}</p></body></html>`;
          fetch.mockResolvedValue({ ok: true, text: async () => html });

          const result = await extractEventFromUrl('https://example.com/random');

          expect(result.success).toBe(false);
          expect(result.missingFields.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('HTTP errors always return success=false with all fields missing', () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom(400, 401, 403, 404, 500, 502, 503),
        fc.string({ minLength: 3, maxLength: 30 }),
        async (status, statusText) => {
          fetch.mockResolvedValue({ ok: false, status, statusText });

          const result = await extractEventFromUrl('https://example.com/error');

          expect(result.success).toBe(false);
          expect(result.error).toContain(`Erro HTTP ${status}`);
          expect(result.missingFields).toEqual(REQUIRED_FIELDS);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('network errors always return success=false', () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom('ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'),
        async (errorCode) => {
          fetch.mockRejectedValue(new Error(errorCode));

          const result = await extractEventFromUrl('https://example.com/fail');

          expect(result.success).toBe(false);
          expect(result.error).toContain('Erro ao acessar URL');
          expect(result.missingFields).toEqual(REQUIRED_FIELDS);
        }
      ),
      { numRuns: 10 }
    );
  });
});
