'use strict';

const { readEvents, writeEvents } = require('../utils/json-io');
const { validateEvent, TIPOS_PRESENCA_VALIDOS } = require('../validator');

/**
 * Comando `presenca` — marca ou desmarca presença do Papo de Sysadmin em um evento.
 * @param {string} id - Identificador do evento
 * @param {string} tipo - Tipo de presença (palestrante, participante, organizador, midia) ou "remover"/"none" para desmarcar
 */
async function setPresenca(id, tipo) {
  const tipoLower = tipo.toLowerCase();

  // Se não for remoção, validar tipo contra lista de tipos válidos
  if (tipoLower !== 'remover' && tipoLower !== 'none') {
    if (!TIPOS_PRESENCA_VALIDOS.includes(tipoLower)) {
      console.error(
        `❌ Tipo de presença inválido: "${tipo}". Valores permitidos: ${TIPOS_PRESENCA_VALIDOS.join(', ')}, remover, none`
      );
      process.exitCode = 1;
      return;
    }
  }

  const events = readEvents();

  const index = events.findIndex((e) => e.id === id);

  if (index === -1) {
    console.error(`❌ Evento não encontrado com ID: ${id}`);
    process.exitCode = 1;
    return;
  }

  const evento = events[index];

  if (tipoLower === 'remover' || tipoLower === 'none') {
    // Desmarcar presença — remover o campo
    delete evento.presenca;
    console.log(`✅ Presença removida do evento "${evento.nome}".`);
  } else {
    // Marcar presença com tipo
    evento.presenca = { confirmada: true, tipo: tipoLower };

    // Validar evento antes de salvar
    const { valid, errors } = validateEvent(evento);

    if (!valid) {
      console.error('❌ Evento inválido após alteração:');
      errors.forEach((err) => console.error(`  - ${err}`));
      process.exitCode = 1;
      return;
    }

    console.log(
      `✅ Presença marcada no evento "${evento.nome}" como "${tipoLower}".`
    );
  }

  events[index] = evento;
  writeEvents(events);
}

module.exports = { setPresenca };
