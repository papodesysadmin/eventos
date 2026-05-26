'use strict';

const { extractEventFromUrl, REQUIRED_FIELDS } = require('../../extractor/index');

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

describe('extractEventFromUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HTTP error handling', () => {
    it('should return error for HTTP 404', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await extractEventFromUrl('https://example.com/event');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Erro HTTP 404');
      expect(result.missingFields).toEqual(REQUIRED_FIELDS);
    });

    it('should return error for HTTP 500', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await extractEventFromUrl('https://example.com/event');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Erro HTTP 500');
    });
  });

  describe('timeout handling', () => {
    it('should return error when fetch is aborted (timeout)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      fetch.mockRejectedValue(abortError);

      const result = await extractEventFromUrl('https://example.com/event');

      expect(result.success).toBe(false);
      expect(result.error).toContain('30 segundos');
      expect(result.missingFields).toEqual(REQUIRED_FIELDS);
    });
  });

  describe('network error handling', () => {
    it('should return error for network failures', async () => {
      fetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await extractEventFromUrl('https://example.com/event');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Erro ao acessar URL');
      expect(result.error).toContain('ECONNREFUSED');
    });
  });

  describe('page without event data', () => {
    it('should reject pages without nome and dataInicio', async () => {
      fetch.mockResolvedValue({
        ok: true,
        text: async () => '<html><body><p>Hello world</p></body></html>',
      });

      const result = await extractEventFromUrl('https://example.com/not-event');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Não foi possível identificar dados de evento');
    });
  });

  describe('successful extraction', () => {
    it('should extract event from JSON-LD and return success', async () => {
      const html = `
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@type": "Event",
            "name": "KubeCon 2026",
            "startDate": "2026-03-15",
            "endDate": "2026-03-17",
            "url": "https://kubecon.io",
            "location": {
              "@type": "Place",
              "name": "Centro de Convenções",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "São Paulo",
                "addressRegion": "SP",
                "addressCountry": "Brasil"
              }
            },
            "description": "Maior evento de Kubernetes"
          }
          </script>
        </head>
        <body><h1>KubeCon 2026</h1></body>
        </html>
      `;

      fetch.mockResolvedValue({
        ok: true,
        text: async () => html,
      });

      const result = await extractEventFromUrl('https://kubecon.io');

      expect(result.success).toBe(true);
      expect(result.data.nome).toBe('KubeCon 2026');
      expect(result.data.dataInicio).toBe('2026-03-15');
      expect(result.data.cidade).toBe('São Paulo');
      expect(result.data.estado).toBe('SP');
      expect(result.data.pais).toBe('Brasil');
      expect(result.data.local).toBe('Centro de Convenções');
      expect(result.data.url).toBe('https://kubecon.io');
      expect(result.data.categoria).toBe('Containers');
      expect(result.missingFields).toEqual([]);
    });

    it('should report missing fields for partial extraction', async () => {
      const html = `
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@type": "Event",
            "name": "Tech Meetup",
            "startDate": "2026-05-10"
          }
          </script>
        </head>
        <body><h1>Tech Meetup</h1></body>
        </html>
      `;

      fetch.mockResolvedValue({
        ok: true,
        text: async () => html,
      });

      const result = await extractEventFromUrl('https://meetup.com/tech');

      expect(result.success).toBe(false);
      expect(result.data.nome).toBe('Tech Meetup');
      expect(result.data.dataInicio).toBe('2026-05-10');
      expect(result.missingFields).toContain('local');
      expect(result.missingFields).toContain('cidade');
      expect(result.missingFields).toContain('estado');
      expect(result.missingFields).toContain('pais');
      expect(result.error).toContain('Campos não encontrados');
    });

    it('should use the original URL if not extracted from page', async () => {
      const html = `
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@type": "Event",
            "name": "DevOps Day",
            "startDate": "2026-06-20",
            "location": {
              "@type": "Place",
              "name": "Hotel Paulista",
              "address": {
                "addressLocality": "São Paulo",
                "addressRegion": "SP",
                "addressCountry": "Brasil"
              }
            }
          }
          </script>
        </head>
        <body></body>
        </html>
      `;

      fetch.mockResolvedValue({
        ok: true,
        text: async () => html,
      });

      const result = await extractEventFromUrl('https://devopsday.com.br');

      expect(result.data.url).toBe('https://devopsday.com.br');
    });
  });
});
