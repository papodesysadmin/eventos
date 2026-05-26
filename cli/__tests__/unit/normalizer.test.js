'use strict';

const {
  normalize,
  normalizeDate,
  normalizeEstado,
  normalizeCidade,
  inferCategory,
  mergeResults,
} = require('../../extractor/normalizer');

describe('normalizeDate', () => {
  test('retorna null para entrada inválida', () => {
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();
    expect(normalizeDate('')).toBeNull();
    expect(normalizeDate(123)).toBeNull();
    expect(normalizeDate('invalid')).toBeNull();
  });

  test('preserva formato ISO 8601 já correto', () => {
    expect(normalizeDate('2026-03-15')).toBe('2026-03-15');
    expect(normalizeDate('2026-12-01')).toBe('2026-12-01');
  });

  test('extrai data de ISO 8601 com hora', () => {
    expect(normalizeDate('2026-03-15T10:00:00Z')).toBe('2026-03-15');
    expect(normalizeDate('2026-03-15T10:00:00-03:00')).toBe('2026-03-15');
  });

  test('converte DD/MM/YYYY', () => {
    expect(normalizeDate('15/03/2026')).toBe('2026-03-15');
    expect(normalizeDate('1/1/2026')).toBe('2026-01-01');
  });

  test('converte DD-MM-YYYY', () => {
    expect(normalizeDate('15-03-2026')).toBe('2026-03-15');
  });

  test('converte DD.MM.YYYY', () => {
    expect(normalizeDate('15.03.2026')).toBe('2026-03-15');
  });

  test('converte "Month DD, YYYY" (inglês)', () => {
    expect(normalizeDate('March 15, 2026')).toBe('2026-03-15');
    expect(normalizeDate('December 1, 2026')).toBe('2026-12-01');
    expect(normalizeDate('January 31, 2026')).toBe('2026-01-31');
  });

  test('converte "DD de Month de YYYY" (português)', () => {
    expect(normalizeDate('15 de março de 2026')).toBe('2026-03-15');
    expect(normalizeDate('1 de janeiro de 2026')).toBe('2026-01-01');
  });

  test('converte "DD Month YYYY"', () => {
    expect(normalizeDate('15 March 2026')).toBe('2026-03-15');
    expect(normalizeDate('1 janeiro 2026')).toBe('2026-01-01');
  });

  test('converte YYYY/MM/DD', () => {
    expect(normalizeDate('2026/03/15')).toBe('2026-03-15');
  });
});

describe('normalizeEstado', () => {
  test('preserva siglas de 2 letras', () => {
    expect(normalizeEstado('SP')).toBe('SP');
    expect(normalizeEstado('RJ')).toBe('RJ');
  });

  test('converte nome completo para sigla', () => {
    expect(normalizeEstado('São Paulo')).toBe('SP');
    expect(normalizeEstado('Rio de Janeiro')).toBe('RJ');
    expect(normalizeEstado('Minas Gerais')).toBe('MG');
  });

  test('é case-insensitive', () => {
    expect(normalizeEstado('são paulo')).toBe('SP');
    expect(normalizeEstado('SÃO PAULO')).toBe('SP');
  });

  test('retorna valor original se não reconhecido', () => {
    expect(normalizeEstado('California')).toBe('California');
  });

  test('retorna valor original para entrada inválida', () => {
    expect(normalizeEstado(null)).toBeNull();
    expect(normalizeEstado('')).toBe('');
  });
});

describe('normalizeCidade', () => {
  test('capitaliza nomes de cidades', () => {
    expect(normalizeCidade('são paulo')).toBe('São Paulo');
    expect(normalizeCidade('RIO DE JANEIRO')).toBe('Rio de Janeiro');
  });

  test('mantém preposições em minúscula', () => {
    expect(normalizeCidade('juiz de fora')).toBe('Juiz de Fora');
  });

  test('retorna valor original para entrada inválida', () => {
    expect(normalizeCidade(null)).toBeNull();
    expect(normalizeCidade('')).toBe('');
  });
});

describe('inferCategory', () => {
  test('infere Containers para eventos de Kubernetes/Docker', () => {
    expect(inferCategory('KubeCon 2026', '')).toBe('Containers');
    expect(inferCategory('Docker Summit', '')).toBe('Containers');
  });

  test('infere Cloud para eventos de cloud', () => {
    expect(inferCategory('AWS re:Invent', '')).toBe('Cloud');
    expect(inferCategory('Cloud Native Day', '')).toBe('Cloud');
  });

  test('infere DevOps para eventos de DevOps', () => {
    expect(inferCategory('DevOps Days São Paulo', '')).toBe('DevOps');
  });

  test('infere Seguranca para eventos de segurança', () => {
    expect(inferCategory('Security Summit', '')).toBe('Seguranca');
    expect(inferCategory('', 'Evento de cybersecurity')).toBe('Seguranca');
  });

  test('infere Linux para eventos de Linux', () => {
    expect(inferCategory('Linux Day', '')).toBe('Linux');
  });

  test('infere IA para eventos de inteligência artificial', () => {
    expect(inferCategory('AI Conference', '')).toBe('IA');
    expect(inferCategory('Machine Learning Summit', '')).toBe('IA');
  });

  test('retorna null quando não consegue inferir', () => {
    expect(inferCategory('Evento Genérico', '')).toBeNull();
    expect(inferCategory('', '')).toBeNull();
    expect(inferCategory(null, null)).toBeNull();
  });
});

describe('mergeResults', () => {
  test('retorna objeto vazio para array vazio', () => {
    expect(mergeResults([])).toEqual({});
  });

  test('retorna objeto vazio para entrada inválida', () => {
    expect(mergeResults(null)).toEqual({});
    expect(mergeResults(undefined)).toEqual({});
  });

  test('prioriza resultado com maior confiança', () => {
    const results = [
      { data: { nome: 'Evento A' }, confidence: 0.5 },
      { data: { nome: 'Evento B' }, confidence: 0.9 },
    ];
    expect(mergeResults(results).nome).toBe('Evento B');
  });

  test('preenche campos faltantes com resultados de menor confiança', () => {
    const results = [
      { data: { nome: 'Evento A', cidade: 'São Paulo' }, confidence: 0.9 },
      { data: { nome: 'Evento B', estado: 'SP' }, confidence: 0.5 },
    ];
    const merged = mergeResults(results);
    expect(merged.nome).toBe('Evento A');
    expect(merged.cidade).toBe('São Paulo');
    expect(merged.estado).toBe('SP');
  });

  test('ignora valores vazios ou null', () => {
    const results = [
      { data: { nome: '', cidade: null }, confidence: 0.9 },
      { data: { nome: 'Evento B', cidade: 'Rio' }, confidence: 0.5 },
    ];
    const merged = mergeResults(results);
    expect(merged.nome).toBe('Evento B');
    expect(merged.cidade).toBe('Rio');
  });

  test('filtra resultados inválidos', () => {
    const results = [
      null,
      { data: null, confidence: 0.9 },
      { data: { nome: 'Evento' }, confidence: 0.5 },
    ];
    expect(mergeResults(results).nome).toBe('Evento');
  });
});

describe('normalize', () => {
  test('normaliza resultado completo de extração', () => {
    const results = [
      {
        data: {
          nome: 'KubeCon South America 2026',
          dataInicio: 'March 15, 2026',
          dataFim: '17/03/2026',
          local: 'Centro de Convenções',
          cidade: 'são paulo',
          estado: 'São Paulo',
          pais: 'Brasil',
          url: 'https://kubecon.io',
        },
        confidence: 0.9,
      },
    ];

    const normalized = normalize(results);

    expect(normalized.nome).toBe('KubeCon South America 2026');
    expect(normalized.dataInicio).toBe('2026-03-15');
    expect(normalized.dataFim).toBe('2026-03-17');
    expect(normalized.local).toBe('Centro de Convenções');
    expect(normalized.cidade).toBe('São Paulo');
    expect(normalized.estado).toBe('SP');
    expect(normalized.pais).toBe('Brasil');
    expect(normalized.url).toBe('https://kubecon.io');
    expect(normalized.categoria).toBe('Containers');
  });

  test('combina múltiplas estratégias', () => {
    const results = [
      {
        data: { nome: 'DevOps Days SP', dataInicio: '2026-06-10' },
        confidence: 0.9,
      },
      {
        data: {
          nome: 'DevOps Days',
          cidade: 'São Paulo',
          estado: 'SP',
          pais: 'Brasil',
          local: 'Hotel Tivoli',
          url: 'https://devopsdays.org/sp',
        },
        confidence: 0.6,
      },
    ];

    const normalized = normalize(results);

    expect(normalized.nome).toBe('DevOps Days SP');
    expect(normalized.dataInicio).toBe('2026-06-10');
    expect(normalized.cidade).toBe('São Paulo');
    expect(normalized.estado).toBe('SP');
    expect(normalized.url).toBe('https://devopsdays.org/sp');
    expect(normalized.categoria).toBe('DevOps');
  });

  test('retorna null para campos não encontrados', () => {
    const results = [
      { data: { nome: 'Evento' }, confidence: 0.5 },
    ];

    const normalized = normalize(results);

    expect(normalized.nome).toBe('Evento');
    expect(normalized.dataInicio).toBeNull();
    expect(normalized.local).toBeNull();
    expect(normalized.cidade).toBeNull();
  });

  test('trunca descrição para 200 caracteres', () => {
    const longDesc = 'A'.repeat(250);
    const results = [
      { data: { nome: 'Evento', descricao: longDesc }, confidence: 0.9 },
    ];

    const normalized = normalize(results);
    expect(normalized.descricao.length).toBe(200);
  });

  test('aceita campos em inglês e mapeia para português', () => {
    const results = [
      {
        data: {
          name: 'Linux Summit',
          startDate: '2026-09-20',
          endDate: '2026-09-22',
          venue: 'Convention Center',
          city: 'curitiba',
          state: 'Paraná',
          country: 'Brasil',
          url: 'https://linuxsummit.org',
          description: 'Evento de Linux',
        },
        confidence: 0.8,
      },
    ];

    const normalized = normalize(results);

    expect(normalized.nome).toBe('Linux Summit');
    expect(normalized.dataInicio).toBe('2026-09-20');
    expect(normalized.dataFim).toBe('2026-09-22');
    expect(normalized.local).toBe('Convention Center');
    expect(normalized.cidade).toBe('Curitiba');
    expect(normalized.estado).toBe('PR');
    expect(normalized.pais).toBe('Brasil');
    expect(normalized.categoria).toBe('Linux');
    expect(normalized.descricao).toBe('Evento de Linux');
  });

  test('preserva categoria válida fornecida', () => {
    const results = [
      {
        data: { nome: 'Evento Genérico', categoria: 'Geral' },
        confidence: 0.9,
      },
    ];

    const normalized = normalize(results);
    expect(normalized.categoria).toBe('Geral');
  });

  test('retorna objeto vazio normalizado para array vazio', () => {
    const normalized = normalize([]);
    expect(normalized.nome).toBeNull();
    expect(normalized.dataInicio).toBeNull();
  });
});
