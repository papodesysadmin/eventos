'use strict';

/**
 * Integration tests for CLI flow.
 * Tests: add-url → extraction → validation → save JSON
 *        add manual → validation → save JSON
 *        edit → preserve fields → save JSON
 * Valida: Requisitos 3.4, 7.1, 7.2, 7.4
 */

const fs = require('fs');
const path = require('path');
const { DATA_FILE } = require('../../utils/json-io');

// Save and restore the real data file
const originalContent = fs.readFileSync(DATA_FILE, 'utf-8');

afterAll(() => {
  fs.writeFileSync(DATA_FILE, originalContent, 'utf-8');
});

beforeEach(() => {
  // Start with empty events
  fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
});

afterEach(() => {
  fs.writeFileSync(DATA_FILE, originalContent, 'utf-8');
});

// Mock readline for interactive commands
jest.mock('readline');
const readline = require('readline');

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

// Mock node-fetch for add-url
jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

describe('Integration: add-url → extraction → validation → save', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('extracts event from URL with JSON-LD and saves to file', async () => {
    const html = `
      <html>
      <head>
        <script type="application/ld+json">
        {
          "@type": "Event",
          "name": "DevOpsDays São Paulo 2026",
          "startDate": "2026-06-10",
          "endDate": "2026-06-11",
          "url": "https://devopsdays.org/sp",
          "location": {
            "@type": "Place",
            "name": "Hotel Tivoli Mofarrej",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "São Paulo",
              "addressRegion": "SP",
              "addressCountry": "Brasil"
            }
          }
        }
        </script>
      </head>
      <body><h1>DevOpsDays São Paulo 2026</h1></body>
      </html>
    `;

    fetch.mockResolvedValue({ ok: true, text: async () => html });

    // addFromUrl saves directly when all fields are extracted successfully
    // No readline confirmation needed

    const { addFromUrl } = require('../../commands/add-url');
    await addFromUrl('https://devopsdays.org/sp');

    // Verify the event was saved
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    expect(saved).toHaveLength(1);
    expect(saved[0].nome).toBe('DevOpsDays São Paulo 2026');
    expect(saved[0].dataInicio).toBe('2026-06-10');
    expect(saved[0].dataFim).toBe('2026-06-11');
    expect(saved[0].cidade).toBe('São Paulo');
    expect(saved[0].estado).toBe('SP');
    expect(saved[0].pais).toBe('Brasil');
    expect(saved[0].local).toBe('Hotel Tivoli Mofarrej');
    expect(saved[0].url).toBe('https://devopsdays.org/sp');
    expect(saved[0].id).toBeDefined();
  });

  it('handles extraction failure gracefully', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const { addFromUrl } = require('../../commands/add-url');
    await addFromUrl('https://example.com/not-found');

    // File should remain empty
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    expect(saved).toHaveLength(0);
  });
});

describe('Integration: add manual → validation → save', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('adds event with all required fields via interactive prompts', async () => {
    // Answers for: nome, dataInicio, dataFim, local, cidade, estado, pais, url, categoria, descricao
    setupReadlineMock([
      'KubeCon South America 2026',
      '2026-03-15',
      '2026-03-17',
      'Centro de Convenções',
      'São Paulo',
      'SP',
      'Brasil',
      'https://kubecon.io',
      'Containers',
      'Maior evento de Kubernetes da América do Sul',
    ]);

    const { addManual } = require('../../commands/add');
    await addManual();

    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    expect(saved).toHaveLength(1);
    expect(saved[0].nome).toBe('KubeCon South America 2026');
    expect(saved[0].dataInicio).toBe('2026-03-15');
    expect(saved[0].dataFim).toBe('2026-03-17');
    expect(saved[0].local).toBe('Centro de Convenções');
    expect(saved[0].cidade).toBe('São Paulo');
    expect(saved[0].estado).toBe('SP');
    expect(saved[0].pais).toBe('Brasil');
    expect(saved[0].url).toBe('https://kubecon.io');
    expect(saved[0].categoria).toBe('Containers');
    expect(saved[0].descricao).toBe('Maior evento de Kubernetes da América do Sul');
    expect(saved[0].id).toBeDefined();
  });

  it('rejects event with invalid data and does not save', async () => {
    // Invalid date format
    setupReadlineMock([
      'Evento Teste',
      'data-invalida',  // invalid date
      '',
      'Local',
      'Cidade',
      'SP',
      'Brasil',
      'https://example.com',
      'Cloud',
      '',
    ]);

    const { addManual } = require('../../commands/add');
    await addManual();

    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    expect(saved).toHaveLength(0);
  });
});

describe('Integration: edit → preserve fields → save', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('edits a single field and preserves all others', async () => {
    const existingEvent = {
      id: 'test-edit-id-1234',
      nome: 'Original Event',
      dataInicio: '2026-05-01',
      local: 'Original Local',
      cidade: 'São Paulo',
      estado: 'SP',
      pais: 'Brasil',
      url: 'https://original.com',
      categoria: 'Cloud',
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify([existingEvent], null, 2) + '\n', 'utf-8');

    // Change only nome (first field), keep rest empty
    setupReadlineMock(['Updated Event Name', '', '', '', '', '', '', '', '', '']);

    const { editEvent } = require('../../commands/edit');
    await editEvent('test-edit-id-1234');

    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    expect(saved).toHaveLength(1);
    expect(saved[0].nome).toBe('Updated Event Name');
    // All other fields preserved
    expect(saved[0].dataInicio).toBe('2026-05-01');
    expect(saved[0].local).toBe('Original Local');
    expect(saved[0].cidade).toBe('São Paulo');
    expect(saved[0].estado).toBe('SP');
    expect(saved[0].pais).toBe('Brasil');
    expect(saved[0].url).toBe('https://original.com');
    expect(saved[0].categoria).toBe('Cloud');
  });

  it('edit with all empty answers preserves event unchanged', async () => {
    const existingEvent = {
      id: 'test-preserve-id',
      nome: 'Preserved Event',
      dataInicio: '2026-08-20',
      local: 'Preserved Local',
      cidade: 'Curitiba',
      estado: 'PR',
      pais: 'Brasil',
      url: 'https://preserved.com',
      categoria: 'DevOps',
      presenca: { confirmada: true, tipo: 'palestrante' },
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify([existingEvent], null, 2) + '\n', 'utf-8');

    setupReadlineMock(['', '', '', '', '', '', '', '', '', '']);

    const { editEvent } = require('../../commands/edit');
    await editEvent('test-preserve-id');

    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual(existingEvent);
  });
});
