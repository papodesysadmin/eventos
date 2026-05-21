'use strict';

const readline = require('readline');
const { v4: uuidv4 } = require('uuid');
const { readEvents, writeEvents } = require('../utils/json-io');
const { validateEvent, CATEGORIAS_VALIDAS } = require('../validator');

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
 * Solicita um campo obrigatório, repetindo até obter valor não vazio.
 * @param {readline.Interface} rl
 * @param {string} label
 * @returns {Promise<string>}
 */
async function askRequired(rl, label) {
  let value = '';
  while (!value) {
    value = await ask(rl, `${label}: `);
    if (!value) {
      console.log('  Este campo é obrigatório. Tente novamente.');
    }
  }
  return value;
}

/**
 * Solicita um campo opcional, retornando undefined se vazio.
 * @param {readline.Interface} rl
 * @param {string} label
 * @returns {Promise<string|undefined>}
 */
async function askOptional(rl, label) {
  const value = await ask(rl, `${label} (opcional, Enter para pular): `);
  return value || undefined;
}

/**
 * Comando `add` — adiciona evento manualmente via prompts interativos.
 */
async function addManual() {
  const rl = createRl();

  try {
    console.log('\n📅 Adicionar novo evento manualmente\n');

    const nome = await askRequired(rl, 'Nome do evento');
    const dataInicio = await askRequired(rl, 'Data de início (YYYY-MM-DD)');
    const dataFim = await askOptional(rl, 'Data de fim (YYYY-MM-DD)');
    const local = await askRequired(rl, 'Local');
    const cidade = await askRequired(rl, 'Cidade');
    const estado = await askRequired(rl, 'Estado');
    const pais = await askRequired(rl, 'País');
    const url = await askRequired(rl, 'URL do evento');

    console.log('\nCategorias válidas:');
    CATEGORIAS_VALIDAS.forEach((cat, i) => {
      console.log(`  ${i + 1}. ${cat}`);
    });

    const categoria = await askRequired(rl, '\nCategoria');
    const descricao = await askOptional(rl, 'Descrição (máx. 200 caracteres)');

    const id = uuidv4();

    const evento = {
      id,
      nome,
      dataInicio,
      local,
      cidade,
      estado,
      pais,
      url,
      categoria,
    };

    if (dataFim) evento.dataFim = dataFim;
    if (descricao) evento.descricao = descricao;

    const { valid, errors } = validateEvent(evento);

    if (!valid) {
      console.log('\n❌ Evento inválido:');
      errors.forEach((err) => console.log(`  - ${err}`));
      process.exitCode = 1;
      return;
    }

    const events = readEvents();
    events.push(evento);
    writeEvents(events);

    console.log(`\n✅ Evento adicionado com sucesso!`);
    console.log(`   ID: ${id}`);
  } finally {
    rl.close();
  }
}

module.exports = { addManual };
