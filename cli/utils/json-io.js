'use strict';

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '../../data/eventos.json');

/**
 * Lê e faz parsing do arquivo de eventos JSON.
 * @returns {object[]} Array de objetos de evento
 * @throws {Error} Se o arquivo não existir ou contiver JSON malformado
 */
function readEvents() {
  let content;

  try {
    content = fs.readFileSync(DATA_FILE, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        `Erro: Arquivo de eventos não encontrado em ${DATA_FILE}. Verifique se o arquivo existe.`
      );
    }
    throw new Error(`Erro ao ler arquivo de eventos: ${err.message}`);
  }

  let events;
  try {
    events = JSON.parse(content);
  } catch (err) {
    throw new Error(
      'Erro: data/eventos.json está corrompido. Verifique o arquivo.'
    );
  }

  if (!Array.isArray(events)) {
    throw new Error(
      'Erro: data/eventos.json deve conter um array de eventos na raiz do documento.'
    );
  }

  return events;
}

/**
 * Serializa e salva o array de eventos no arquivo JSON.
 * @param {object[]} events - Array de objetos de evento a salvar
 * @throws {Error} Se events não for um array ou se houver erro de escrita
 */
function writeEvents(events) {
  if (!Array.isArray(events)) {
    throw new Error('Erro: O parâmetro events deve ser um array.');
  }

  const content = JSON.stringify(events, null, 2) + '\n';

  try {
    fs.writeFileSync(DATA_FILE, content, 'utf-8');
  } catch (err) {
    throw new Error(`Erro ao salvar arquivo de eventos: ${err.message}`);
  }
}

module.exports = { readEvents, writeEvents, DATA_FILE };
