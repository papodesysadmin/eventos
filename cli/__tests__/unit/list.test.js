'use strict';

const { listEvents } = require('../../commands/list');
const jsonIo = require('../../utils/json-io');

jest.mock('../../utils/json-io');

describe('listEvents', () => {
  let consoleSpy;
  let errorSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
    jest.resetAllMocks();
  });

  test('exibe mensagem quando não há eventos', () => {
    jsonIo.readEvents.mockReturnValue([]);

    listEvents({});

    expect(consoleSpy).toHaveBeenCalledWith('Nenhum evento encontrado.');
  });

  test('exibe tabela com todos os eventos', () => {
    jsonIo.readEvents.mockReturnValue([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        nome: 'KubeCon 2026',
        dataInicio: '2026-03-15',
        presenca: { confirmada: true, tipo: 'palestrante' },
      },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        nome: 'DevOpsDays',
        dataInicio: '2026-05-20',
      },
    ]);

    listEvents({});

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');

    // Header
    expect(output).toContain('ID');
    expect(output).toContain('Nome');
    expect(output).toContain('Data Início');
    expect(output).toContain('Presença');

    // Event data
    expect(output).toContain('a1b2c3d4');
    expect(output).toContain('KubeCon 2026');
    expect(output).toContain('2026-03-15');
    expect(output).toContain('palestrante');

    expect(output).toContain('b2c3d4e5');
    expect(output).toContain('DevOpsDays');
    expect(output).toContain('2026-05-20');
    expect(output).toContain('-');

    // Total
    expect(output).toContain('Total: 2 evento(s)');
  });

  test('filtra apenas eventos com presença quando --presenca é passado', () => {
    jsonIo.readEvents.mockReturnValue([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        nome: 'KubeCon 2026',
        dataInicio: '2026-03-15',
        presenca: { confirmada: true, tipo: 'palestrante' },
      },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        nome: 'DevOpsDays',
        dataInicio: '2026-05-20',
      },
      {
        id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        nome: 'LinuxCon',
        dataInicio: '2026-08-10',
        presenca: { confirmada: false, tipo: 'participante' },
      },
    ]);

    listEvents({ presenca: true });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');

    expect(output).toContain('a1b2c3d4');
    expect(output).toContain('KubeCon 2026');
    expect(output).not.toContain('b2c3d4e5');
    expect(output).not.toContain('DevOpsDays');
    expect(output).not.toContain('c3d4e5f6');
    expect(output).not.toContain('LinuxCon');
    expect(output).toContain('Total: 1 evento(s)');
  });

  test('trunca nomes longos com reticências', () => {
    jsonIo.readEvents.mockReturnValue([
      {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        nome: 'Um Evento Com Nome Extremamente Longo Que Precisa Ser Truncado',
        dataInicio: '2026-01-01',
      },
    ]);

    listEvents({});

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');

    expect(output).toContain('Um Evento Com Nome Extremamente Longo...');
    expect(output).not.toContain('Truncado');
  });

  test('exibe apenas primeiros 8 caracteres do ID', () => {
    jsonIo.readEvents.mockReturnValue([
      {
        id: 'abcdefgh-ijkl-mnop-qrst-uvwxyz123456',
        nome: 'Teste',
        dataInicio: '2026-01-01',
      },
    ]);

    listEvents({});

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');

    expect(output).toContain('abcdefgh');
    expect(output).not.toContain('abcdefgh-');
  });

  test('exibe erro quando readEvents falha', () => {
    jsonIo.readEvents.mockImplementation(() => {
      throw new Error('Erro: Arquivo de eventos não encontrado');
    });

    listEvents({});

    expect(errorSpy).toHaveBeenCalledWith(
      'Erro: Arquivo de eventos não encontrado'
    );
    expect(process.exitCode).toBe(1);

    // Reset exitCode
    process.exitCode = undefined;
  });

  test('exibe "-" para eventos sem presença definida', () => {
    jsonIo.readEvents.mockReturnValue([
      {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        nome: 'Evento Sem Presença',
        dataInicio: '2026-06-01',
      },
    ]);

    listEvents({});

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    const lines = output.split('\n');
    const dataLine = lines.find((l) => l.includes('Evento Sem Presença'));

    expect(dataLine).toContain('-');
  });

  test('--presenca com nenhum evento confirmado exibe mensagem vazia', () => {
    jsonIo.readEvents.mockReturnValue([
      {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        nome: 'Evento Sem Presença',
        dataInicio: '2026-06-01',
      },
    ]);

    listEvents({ presenca: true });

    expect(consoleSpy).toHaveBeenCalledWith('Nenhum evento encontrado.');
  });
});
