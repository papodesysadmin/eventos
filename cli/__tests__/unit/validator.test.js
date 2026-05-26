'use strict';

const {
  validateEvent,
  validateEventsFile,
  isValidDate,
  isValidUrl,
  CATEGORIAS_VALIDAS,
  TIPOS_PRESENCA_VALIDOS,
} = require('../../validator/index.js');

// Helper: evento válido completo
function makeValidEvent(overrides = {}) {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nome: 'KubeCon South America 2026',
    dataInicio: '2026-03-15',
    local: 'Centro de Convenções',
    cidade: 'São Paulo',
    estado: 'SP',
    pais: 'Brasil',
    url: 'https://kubecon.io',
    categoria: 'Containers',
    ...overrides,
  };
}

describe('isValidDate', () => {
  test('aceita data válida YYYY-MM-DD', () => {
    expect(isValidDate('2026-03-15')).toBe(true);
    expect(isValidDate('2026-01-01')).toBe(true);
    expect(isValidDate('2026-12-31')).toBe(true);
  });

  test('rejeita formato inválido', () => {
    expect(isValidDate('15-03-2026')).toBe(false);
    expect(isValidDate('2026/03/15')).toBe(false);
    expect(isValidDate('2026-3-15')).toBe(false);
    expect(isValidDate('03-15-2026')).toBe(false);
    expect(isValidDate('not-a-date')).toBe(false);
  });

  test('rejeita datas impossíveis', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2026-00-01')).toBe(false);
    expect(isValidDate('2026-01-32')).toBe(false);
  });

  test('rejeita tipos não-string', () => {
    expect(isValidDate(123)).toBe(false);
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });
});

describe('isValidUrl', () => {
  test('aceita URLs http e https válidas', () => {
    expect(isValidUrl('https://kubecon.io')).toBe(true);
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('https://evento.com.br/2026')).toBe(true);
  });

  test('rejeita URLs sem protocolo http/https', () => {
    expect(isValidUrl('ftp://files.com')).toBe(false);
    expect(isValidUrl('file:///local')).toBe(false);
  });

  test('rejeita strings que não são URLs', () => {
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });

  test('rejeita tipos não-string', () => {
    expect(isValidUrl(123)).toBe(false);
    expect(isValidUrl(null)).toBe(false);
  });
});

describe('validateEvent', () => {
  test('aceita evento válido com todos os campos obrigatórios', () => {
    const result = validateEvent(makeValidEvent());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('aceita evento válido com campos opcionais', () => {
    const result = validateEvent(
      makeValidEvent({
        dataFim: '2026-03-17',
        descricao: 'Maior evento de Kubernetes da América do Sul',
        presenca: { confirmada: true, tipo: 'palestrante' },
      })
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejeita evento nulo ou não-objeto', () => {
    expect(validateEvent(null).valid).toBe(false);
    expect(validateEvent(undefined).valid).toBe(false);
    expect(validateEvent('string').valid).toBe(false);
    expect(validateEvent(123).valid).toBe(false);
    expect(validateEvent([]).valid).toBe(false);
  });

  describe('campos obrigatórios', () => {
    test('reporta campo ausente', () => {
      const event = makeValidEvent();
      delete event.nome;
      const result = validateEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Campo obrigatório ausente: nome');
    });

    test('reporta campo vazio', () => {
      const result = validateEvent(makeValidEvent({ nome: '' }));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Campo obrigatório não pode ser vazio: nome');
    });

    test('reporta múltiplos campos ausentes', () => {
      const result = validateEvent({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(8); // todos os campos obrigatórios
    });
  });

  describe('validação de dataInicio', () => {
    test('rejeita formato inválido', () => {
      const result = validateEvent(makeValidEvent({ dataInicio: '15/03/2026' }));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Campo dataInicio deve estar no formato ISO 8601 (YYYY-MM-DD)'
      );
    });
  });

  describe('validação de dataFim', () => {
    test('rejeita formato inválido', () => {
      const result = validateEvent(makeValidEvent({ dataFim: 'invalid' }));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Campo dataFim deve estar no formato ISO 8601 (YYYY-MM-DD)'
      );
    });

    test('aceita dataFim ausente', () => {
      const event = makeValidEvent();
      delete event.dataFim;
      const result = validateEvent(event);
      expect(result.valid).toBe(true);
    });
  });

  describe('validação de URL', () => {
    test('rejeita URL inválida', () => {
      const result = validateEvent(makeValidEvent({ url: 'not-a-url' }));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Campo url deve ser uma URL válida (http ou https)'
      );
    });
  });

  describe('validação de categoria', () => {
    test('aceita todas as categorias válidas', () => {
      for (const cat of CATEGORIAS_VALIDAS) {
        const result = validateEvent(makeValidEvent({ categoria: cat }));
        expect(result.valid).toBe(true);
      }
    });

    test('rejeita categoria inválida', () => {
      const result = validateEvent(makeValidEvent({ categoria: 'Invalida' }));
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Categoria inválida');
    });
  });

  describe('validação de descricao', () => {
    test('aceita descricao dentro do limite', () => {
      const result = validateEvent(makeValidEvent({ descricao: 'Evento legal' }));
      expect(result.valid).toBe(true);
    });

    test('aceita descricao com exatamente 200 caracteres', () => {
      const result = validateEvent(makeValidEvent({ descricao: 'a'.repeat(200) }));
      expect(result.valid).toBe(true);
    });

    test('rejeita descricao com mais de 200 caracteres', () => {
      const result = validateEvent(makeValidEvent({ descricao: 'a'.repeat(201) }));
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('excede o máximo de 200 caracteres');
    });

    test('rejeita descricao não-string', () => {
      const result = validateEvent(makeValidEvent({ descricao: 123 }));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Campo descricao deve ser uma string');
    });
  });

  describe('validação de presenca', () => {
    test('aceita presenca válida', () => {
      for (const tipo of TIPOS_PRESENCA_VALIDOS) {
        const result = validateEvent(
          makeValidEvent({ presenca: { confirmada: true, tipo } })
        );
        expect(result.valid).toBe(true);
      }
    });

    test('rejeita presenca sem confirmada', () => {
      const result = validateEvent(
        makeValidEvent({ presenca: { tipo: 'palestrante' } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Campo presenca.confirmada é obrigatório');
    });

    test('rejeita presenca.confirmada não-boolean', () => {
      const result = validateEvent(
        makeValidEvent({ presenca: { confirmada: 'sim', tipo: 'palestrante' } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Campo presenca.confirmada deve ser um boolean');
    });

    test('rejeita presenca sem tipo', () => {
      const result = validateEvent(
        makeValidEvent({ presenca: { confirmada: true } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Campo presenca.tipo é obrigatório');
    });

    test('rejeita tipo de presenca inválido', () => {
      const result = validateEvent(
        makeValidEvent({ presenca: { confirmada: true, tipo: 'invalido' } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Tipo de presença inválido');
    });

    test('rejeita presenca não-objeto', () => {
      const result = validateEvent(makeValidEvent({ presenca: 'string' }));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Campo presenca deve ser um objeto');
    });
  });
});

describe('validateEventsFile', () => {
  test('aceita array vazio', () => {
    const result = validateEventsFile([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('aceita array com eventos válidos', () => {
    const result = validateEventsFile([makeValidEvent(), makeValidEvent()]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejeita entrada não-array', () => {
    expect(validateEventsFile(null).valid).toBe(false);
    expect(validateEventsFile({}).valid).toBe(false);
    expect(validateEventsFile('string').valid).toBe(false);
  });

  test('reporta erros com índice do evento', () => {
    const events = [makeValidEvent(), makeValidEvent({ nome: '' })];
    const result = validateEventsFile(events);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Evento[1]');
  });

  test('reporta erros de múltiplos eventos', () => {
    const events = [makeValidEvent({ nome: '' }), makeValidEvent({ url: 'bad' })];
    const result = validateEventsFile(events);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Evento[0]'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Evento[1]'))).toBe(true);
  });
});
