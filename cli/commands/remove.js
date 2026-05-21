'use strict';

const readline = require('readline');
const { readEvents, writeEvents } = require('../utils/json-io');

/**
 * Cria uma interface readline para prompts interativos.
 * @returns {readline.Interface}
 */
function createRl() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Faz uma pergunta ao usuário e retorna a resposta.
 * @param {readline.Interface} rl
 * @param {string} question
 * @returns {Promise<string>}
 */
function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Comando `remove` — remove evento por ID com confirmação do usuário.
 * @param {string} id - Identificador do evento a remover
 */
async function removeEvent(id) {
  let events;

  try {
    events = readEvents();
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
    return;
  }

  const index = events.findIndex((e) => e.id === id);

  if (index === -1) {
    console.error(`Evento com ID '${id}' não encontrado.`);
    process.exitCode = 1;
    return;
  }

  const evento = events[index];

  console.log('\n🗑️  Evento a ser removido:\n');
  console.log(`  Nome: ${evento.nome}`);
  console.log(`  Data: ${evento.dataInicio}`);

  const rl = createRl();

  try {
    const resposta = await ask(rl, '\nConfirma a remoção? (s/n): ');

    if (resposta.toLowerCase() !== 's') {
      console.log('Remoção cancelada.');
      return;
    }

    events.splice(index, 1);
    writeEvents(events);

    console.log(`\n✅ Evento '${evento.nome}' removido com sucesso.`);
  } finally {
    rl.close();
  }
}

module.exports = { removeEvent };
