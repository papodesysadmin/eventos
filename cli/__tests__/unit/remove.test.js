'use strict';

const { readEvents, writeEvents } = require('../../utils/json-io');

jest.mock('../../utils/json-io');

// Mock readline
const mockQuestion = jest.fn();
const mockClose = jest.fn();
jest.mock('readline', () => ({
  createInterface: () => ({
    question: mockQuestion,
    close: mockClose,
  }),
}));

const { removeEvent } = require('../../commands/remove');

describe('comando remove', () => {
  let consoleSpy;
  let consoleErrorSpy;

  const sampleEvents = [
    {
      id: 'abc-123',
      nome: 'KubeCon 2026',
      dataInicio: '2026-03-15',
      local: 'Centro de Convenções',
      cidade: 'São Paulo',
      estado: 'SP',
      pais: 'Brasil',
      url: 'https://kubecon.io',
      categoria: 'Containers',
    },
    {
      id: 'def-456',
      nome: 'DevOpsDays SP',
      dataInicio: '2026-06-10',
      local: 'Hotel Tivoli',
      cidade: 'São Paulo',
      estado: 'SP',
      pais: 'Brasil',
      url: 'https://devopsdays.org/sp',
      categoria: 'DevOps',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('deve informar erro se ID não encontrado', async () => {
    readEvents.mockReturnValue([...sampleEvents]);

    await removeEvent('id-inexistente');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Evento com ID 'id-inexistente' não encontrado."
    );
    expect(process.exitCode).toBe(1);
    expect(writeEvents).not.toHaveBeenCalled();
  });

  it('deve exibir nome e data do evento antes de confirmar', async () => {
    readEvents.mockReturnValue([...sampleEvents]);
    mockQuestion.mockImplementation((q, cb) => cb('n'));

    await removeEvent('abc-123');

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('KubeCon 2026');
    expect(output).toContain('2026-03-15');
  });

  it('deve remover evento quando usuário confirma com "s"', async () => {
    const events = [...sampleEvents];
    readEvents.mockReturnValue(events);
    mockQuestion.mockImplementation((q, cb) => cb('s'));

    await removeEvent('abc-123');

    expect(writeEvents).toHaveBeenCalledTimes(1);
    const savedEvents = writeEvents.mock.calls[0][0];
    expect(savedEvents).toHaveLength(1);
    expect(savedEvents[0].id).toBe('def-456');
  });

  it('deve cancelar remoção quando usuário responde "n"', async () => {
    readEvents.mockReturnValue([...sampleEvents]);
    mockQuestion.mockImplementation((q, cb) => cb('n'));

    await removeEvent('abc-123');

    expect(writeEvents).not.toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Remoção cancelada');
  });

  it('deve cancelar remoção para qualquer resposta diferente de "s"', async () => {
    readEvents.mockReturnValue([...sampleEvents]);
    mockQuestion.mockImplementation((q, cb) => cb('nao'));

    await removeEvent('abc-123');

    expect(writeEvents).not.toHaveBeenCalled();
  });

  it('deve aceitar confirmação "S" maiúsculo', async () => {
    const events = [...sampleEvents];
    readEvents.mockReturnValue(events);
    mockQuestion.mockImplementation((q, cb) => cb('S'));

    await removeEvent('abc-123');

    expect(writeEvents).toHaveBeenCalledTimes(1);
  });

  it('deve tratar erro ao ler eventos', async () => {
    readEvents.mockImplementation(() => {
      throw new Error('Erro ao ler arquivo de eventos: permissão negada');
    });

    await removeEvent('abc-123');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erro ao ler arquivo de eventos: permissão negada'
    );
    expect(process.exitCode).toBe(1);
  });

  it('deve fechar readline após confirmação', async () => {
    readEvents.mockReturnValue([...sampleEvents]);
    mockQuestion.mockImplementation((q, cb) => cb('s'));

    await removeEvent('abc-123');

    expect(mockClose).toHaveBeenCalled();
  });

  it('deve fechar readline após cancelamento', async () => {
    readEvents.mockReturnValue([...sampleEvents]);
    mockQuestion.mockImplementation((q, cb) => cb('n'));

    await removeEvent('abc-123');

    expect(mockClose).toHaveBeenCalled();
  });
});
