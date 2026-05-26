'use strict';

const { editEvent } = require('../../commands/edit');
const jsonIo = require('../../utils/json-io');
const readline = require('readline');

jest.mock('../../utils/json-io');
jest.mock('readline');

describe('editEvent', () => {
  let consoleSpy;

  const sampleEvent = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nome: 'KubeCon 2026',
    dataInicio: '2026-03-15',
    dataFim: '2026-03-17',
    local: 'Centro de Convenções',
    cidade: 'São Paulo',
    estado: 'SP',
    pais: 'Brasil',
    url: 'https://kubecon.io',
    categoria: 'Containers',
    descricao: 'Maior evento de Kubernetes',
    presenca: { confirmada: true, tipo: 'palestrante' },
  };

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

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.resetAllMocks();
    process.exitCode = undefined;
  });

  test('exibe erro quando ID não é encontrado', async () => {
    jsonIo.readEvents.mockReturnValue([sampleEvent]);

    await editEvent('id-inexistente');

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain("Evento com ID 'id-inexistente' não encontrado");
    expect(process.exitCode).toBe(1);
  });

  test('exibe dados atuais do evento antes de editar', async () => {
    jsonIo.readEvents.mockReturnValue([{ ...sampleEvent }]);
    jsonIo.writeEvents.mockImplementation(() => {});
    setupReadlineMock(['', '', '', '', '', '', '', '', '', '']);

    await editEvent(sampleEvent.id);

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('KubeCon 2026');
    expect(output).toContain('2026-03-15');
    expect(output).toContain('Centro de Convenções');
    expect(output).toContain('São Paulo');
  });

  test('preserva campos quando usuário pressiona Enter sem digitar', async () => {
    jsonIo.readEvents.mockReturnValue([{ ...sampleEvent }]);
    jsonIo.writeEvents.mockImplementation(() => {});
    setupReadlineMock(['', '', '', '', '', '', '', '', '', '']);

    await editEvent(sampleEvent.id);

    expect(jsonIo.writeEvents).toHaveBeenCalledTimes(1);
    const savedEvents = jsonIo.writeEvents.mock.calls[0][0];
    const savedEvent = savedEvents[0];

    expect(savedEvent.nome).toBe('KubeCon 2026');
    expect(savedEvent.dataInicio).toBe('2026-03-15');
    expect(savedEvent.dataFim).toBe('2026-03-17');
    expect(savedEvent.local).toBe('Centro de Convenções');
    expect(savedEvent.cidade).toBe('São Paulo');
    expect(savedEvent.estado).toBe('SP');
    expect(savedEvent.pais).toBe('Brasil');
    expect(savedEvent.url).toBe('https://kubecon.io');
    expect(savedEvent.categoria).toBe('Containers');
    expect(savedEvent.descricao).toBe('Maior evento de Kubernetes');
    expect(savedEvent.presenca).toEqual({ confirmada: true, tipo: 'palestrante' });
  });

  test('altera campo individual e preserva os demais', async () => {
    jsonIo.readEvents.mockReturnValue([{ ...sampleEvent }]);
    jsonIo.writeEvents.mockImplementation(() => {});
    // Change only nome (first field), keep rest empty
    setupReadlineMock(['KubeCon Brasil 2026', '', '', '', '', '', '', '', '', '']);

    await editEvent(sampleEvent.id);

    const savedEvents = jsonIo.writeEvents.mock.calls[0][0];
    const savedEvent = savedEvents[0];

    expect(savedEvent.nome).toBe('KubeCon Brasil 2026');
    expect(savedEvent.dataInicio).toBe('2026-03-15');
    expect(savedEvent.local).toBe('Centro de Convenções');
    expect(savedEvent.cidade).toBe('São Paulo');
    expect(savedEvent.estado).toBe('SP');
    expect(savedEvent.pais).toBe('Brasil');
    expect(savedEvent.url).toBe('https://kubecon.io');
    expect(savedEvent.categoria).toBe('Containers');
    expect(savedEvent.presenca).toEqual({ confirmada: true, tipo: 'palestrante' });
  });

  test('exibe erro de validação quando dados são inválidos', async () => {
    jsonIo.readEvents.mockReturnValue([{ ...sampleEvent }]);
    jsonIo.writeEvents.mockImplementation(() => {});
    // Set invalid date format (second field is dataInicio)
    setupReadlineMock(['', 'data-invalida', '', '', '', '', '', '', '', '']);

    await editEvent(sampleEvent.id);

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Evento inválido');
    expect(jsonIo.writeEvents).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  test('exibe sucesso após edição válida', async () => {
    jsonIo.readEvents.mockReturnValue([{ ...sampleEvent }]);
    jsonIo.writeEvents.mockImplementation(() => {});
    setupReadlineMock(['', '', '', '', '', '', '', '', '', '']);

    await editEvent(sampleEvent.id);

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Evento atualizado com sucesso');
  });

  test('preserva presenca quando não é editada', async () => {
    const eventWithPresenca = {
      ...sampleEvent,
      presenca: { confirmada: true, tipo: 'organizador' },
    };
    jsonIo.readEvents.mockReturnValue([eventWithPresenca]);
    jsonIo.writeEvents.mockImplementation(() => {});
    setupReadlineMock(['', '', '', '', '', '', '', '', '', '']);

    await editEvent(sampleEvent.id);

    const savedEvents = jsonIo.writeEvents.mock.calls[0][0];
    const savedEvent = savedEvents[0];

    expect(savedEvent.presenca).toEqual({ confirmada: true, tipo: 'organizador' });
  });

  test('fecha readline interface mesmo em caso de erro', async () => {
    jsonIo.readEvents.mockReturnValue([{ ...sampleEvent }]);
    jsonIo.writeEvents.mockImplementation(() => {
      throw new Error('Erro de escrita');
    });
    const mockRl = setupReadlineMock(['', '', '', '', '', '', '', '', '', '']);

    await expect(editEvent(sampleEvent.id)).rejects.toThrow('Erro de escrita');
    expect(mockRl.close).toHaveBeenCalled();
  });

  test('altera múltiplos campos simultaneamente', async () => {
    jsonIo.readEvents.mockReturnValue([{ ...sampleEvent }]);
    jsonIo.writeEvents.mockImplementation(() => {});
    // Change nome, dataInicio, and cidade
    setupReadlineMock(['Novo Nome', '2026-06-01', '', 'Novo Local', 'Rio de Janeiro', '', '', '', '', '']);

    await editEvent(sampleEvent.id);

    const savedEvents = jsonIo.writeEvents.mock.calls[0][0];
    const savedEvent = savedEvents[0];

    expect(savedEvent.nome).toBe('Novo Nome');
    expect(savedEvent.dataInicio).toBe('2026-06-01');
    expect(savedEvent.local).toBe('Novo Local');
    expect(savedEvent.cidade).toBe('Rio de Janeiro');
    // Unchanged fields
    expect(savedEvent.estado).toBe('SP');
    expect(savedEvent.pais).toBe('Brasil');
    expect(savedEvent.url).toBe('https://kubecon.io');
  });
});
