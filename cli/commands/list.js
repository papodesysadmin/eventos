'use strict';

const { readEvents } = require('../utils/json-io');

/**
 * Lista eventos cadastrados em formato tabular.
 * @param {object} options - Opções do comando
 * @param {boolean} [options.presenca] - Filtrar apenas eventos com presença confirmada
 */
function listEvents(options = {}) {
  let events;

  try {
    events = readEvents();
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
    return;
  }

  if (options.presenca) {
    events = events.filter(
      (e) => e.presenca && e.presenca.confirmada === true
    );
  }

  if (events.length === 0) {
    console.log('Nenhum evento encontrado.');
    return;
  }

  const COL_ID = 8;
  const COL_NOME = 40;
  const COL_DATA = 12;
  const COL_PRESENCA = 14;

  const header =
    pad('ID', COL_ID) +
    '  ' +
    pad('Nome', COL_NOME) +
    '  ' +
    pad('Data Início', COL_DATA) +
    '  ' +
    pad('Presença', COL_PRESENCA);

  const separator =
    '-'.repeat(COL_ID) +
    '  ' +
    '-'.repeat(COL_NOME) +
    '  ' +
    '-'.repeat(COL_DATA) +
    '  ' +
    '-'.repeat(COL_PRESENCA);

  console.log(header);
  console.log(separator);

  for (const event of events) {
    const id = (event.id || '').substring(0, 8);
    const nome = truncate(event.nome || '', COL_NOME);
    const data = event.dataInicio || '';
    const presenca =
      event.presenca && event.presenca.confirmada
        ? event.presenca.tipo
        : '-';

    const row =
      pad(id, COL_ID) +
      '  ' +
      pad(nome, COL_NOME) +
      '  ' +
      pad(data, COL_DATA) +
      '  ' +
      pad(presenca, COL_PRESENCA);

    console.log(row);
  }

  console.log('');
  console.log(`Total: ${events.length} evento(s)`);
}

/**
 * Preenche string com espaços à direita até o comprimento desejado.
 */
function pad(str, len) {
  if (str.length >= len) return str.substring(0, len);
  return str + ' '.repeat(len - str.length);
}

/**
 * Trunca string ao comprimento máximo, adicionando "..." se necessário.
 */
function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

module.exports = { listEvents };
