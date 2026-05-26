'use strict';

jest.mock('../../utils/json-io');

const { readEvents, writeEvents } = require('../../utils/json-io');
const { setPresenca } = require('../../commands/presenca');

describe('comando presenca', () => {
  let consoleSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.exitCode = undefined;
  });

  const makeEvent = (overrides = {}) => ({
    id: 'abc-123',
    nome: 'KubeCon 2026',
    dataInicio: '2026-03-15',
    local: 'Centro de Convenções',
    cidade: 'São Paulo',
    estado: 'SP',
    pais: 'Brasil',
    url: 'https://kubecon.io',
    categoria: 'Containers',
    ...overrides,
  });

  test('marca presença com tipo válido "palestrante"', async () => {
    const evento = makeEvent();
    readEvents.mockReturnValue([evento]);

    await setPresenca('abc-123', 'palestrante');

    expect(writeEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'abc-123',
        presenca: { confirmada: true, tipo: 'palestrante' },
      }),
    ]);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Presença marcada')
    );
    expect(process.exitCode).toBeUndefined();
  });

  test('marca presença com tipo válido "participante"', async () => {
    const evento = makeEvent();
    readEvents.mockReturnValue([evento]);

    await setPresenca('abc-123', 'participante');

    expect(writeEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        presenca: { confirmada: true, tipo: 'participante' },
      }),
    ]);
  });

  test('marca presença com tipo válido "organizador"', async () => {
    const evento = makeEvent();
    readEvents.mockReturnValue([evento]);

    await setPresenca('abc-123', 'organizador');

    expect(writeEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        presenca: { confirmada: true, tipo: 'organizador' },
      }),
    ]);
  });

  test('marca presença com tipo válido "midia"', async () => {
    const evento = makeEvent();
    readEvents.mockReturnValue([evento]);

    await setPresenca('abc-123', 'midia');

    expect(writeEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        presenca: { confirmada: true, tipo: 'midia' },
      }),
    ]);
  });

  test('remove presença com tipo "remover"', async () => {
    const evento = makeEvent({ presenca: { confirmada: true, tipo: 'palestrante' } });
    readEvents.mockReturnValue([evento]);

    await setPresenca('abc-123', 'remover');

    const savedEvents = writeEvents.mock.calls[0][0];
    expect(savedEvents[0].presenca).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Presença removida')
    );
  });

  test('remove presença com tipo "none"', async () => {
    const evento = makeEvent({ presenca: { confirmada: true, tipo: 'organizador' } });
    readEvents.mockReturnValue([evento]);

    await setPresenca('abc-123', 'none');

    const savedEvents = writeEvents.mock.calls[0][0];
    expect(savedEvents[0].presenca).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Presença removida')
    );
  });

  test('rejeita tipo de presença inválido', async () => {
    readEvents.mockReturnValue([makeEvent()]);

    await setPresenca('abc-123', 'invalido');

    expect(writeEvents).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Tipo de presença inválido')
    );
    expect(process.exitCode).toBe(1);
  });

  test('informa erro se ID não encontrado', async () => {
    readEvents.mockReturnValue([makeEvent()]);

    await setPresenca('id-inexistente', 'palestrante');

    expect(writeEvents).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Evento não encontrado')
    );
    expect(process.exitCode).toBe(1);
  });

  test('aceita tipo com case diferente (case-insensitive)', async () => {
    const evento = makeEvent();
    readEvents.mockReturnValue([evento]);

    await setPresenca('abc-123', 'Palestrante');

    expect(writeEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        presenca: { confirmada: true, tipo: 'palestrante' },
      }),
    ]);
  });
});
