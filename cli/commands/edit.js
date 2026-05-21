'use strict';

const readline = require('readline');
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
 * Solicita um campo editável, mostrando o valor atual.
 * Se o usuário pressionar Enter sem digitar, mantém o valor atual.
 * @param {readline.Interface} rl
 * @param {string} label
 * @param {string} currentValue
 * @returns {Promise<string>}
 */
async function askEdit(rl, label, currentValue) {
  const display = currentValue || '(vazio)';
  const answer = await ask(rl, `${label} [${display}]: `);
  return answer || currentValue;
}

/**
 * Exibe os dados atuais do evento formatados.
 * @param {object} evento
 */
function displayEvent(evento) {
  console.log('\n📋 Dados atuais do evento:\n');
  console.log(`  ID:          ${evento.id}`);
  console.log(`  Nome:        ${evento.nome}`);
  console.log(`  Data Início: ${evento.dataInicio}`);
  console.log(`  Data Fim:    ${evento.dataFim || '(não definida)'}`);
  console.log(`  Local:       ${evento.local}`);
  console.log(`  Cidade:      ${evento.cidade}`);
  console.log(`  Estado:      ${evento.estado}`);
  console.log(`  País:        ${evento.pais}`);
  console.log(`  URL:         ${evento.url}`);
  console.log(`  Categoria:   ${evento.categoria}`);
  console.log(`  Descrição:   ${evento.descricao || '(não definida)'}`);

  if (evento.presenca) {
    console.log(`  Presença:    ${evento.presenca.confirmada ? 'Confirmada' : 'Não confirmada'} (${evento.presenca.tipo})`);
  } else {
    console.log(`  Presença:    (não definida)`);
  }
}

/**
 * Comando `edit` — edita um evento existente por ID.
 * Exibe dados atuais e permite alterar campos individualmente.
 * Pressionar Enter sem digitar preserva o valor atual.
 * @param {string} id - Identificador do evento a editar
 */
async function editEvent(id) {
  const events = readEvents();
  const index = events.findIndex((e) => e.id === id);

  if (index === -1) {
    console.log(`\n❌ Evento com ID '${id}' não encontrado.`);
    process.exitCode = 1;
    return;
  }

  const evento = events[index];
  displayEvent(evento);

  const rl = createRl();

  try {
    console.log('\n✏️  Editar evento (pressione Enter para manter o valor atual)\n');

    console.log('Categorias válidas:');
    CATEGORIAS_VALIDAS.forEach((cat, i) => {
      console.log(`  ${i + 1}. ${cat}`);
    });
    console.log('');

    const nome = await askEdit(rl, 'Nome', evento.nome);
    const dataInicio = await askEdit(rl, 'Data Início (YYYY-MM-DD)', evento.dataInicio);
    const dataFim = await askEdit(rl, 'Data Fim (YYYY-MM-DD)', evento.dataFim || '');
    const local = await askEdit(rl, 'Local', evento.local);
    const cidade = await askEdit(rl, 'Cidade', evento.cidade);
    const estado = await askEdit(rl, 'Estado', evento.estado);
    const pais = await askEdit(rl, 'País', evento.pais);
    const url = await askEdit(rl, 'URL', evento.url);
    const categoria = await askEdit(rl, 'Categoria', evento.categoria);
    const descricao = await askEdit(rl, 'Descrição (máx. 200 chars)', evento.descricao || '');

    // Construir evento atualizado preservando campos não editáveis
    const updated = {
      ...evento,
      nome,
      dataInicio,
      local,
      cidade,
      estado,
      pais,
      url,
      categoria,
    };

    if (dataFim) {
      updated.dataFim = dataFim;
    } else {
      delete updated.dataFim;
    }

    if (descricao) {
      updated.descricao = descricao;
    } else {
      delete updated.descricao;
    }

    const { valid, errors } = validateEvent(updated);

    if (!valid) {
      console.log('\n❌ Evento inválido. Alterações não salvas:');
      errors.forEach((err) => console.log(`  - ${err}`));
      process.exitCode = 1;
      return;
    }

    events[index] = updated;
    writeEvents(events);

    console.log(`\n✅ Evento atualizado com sucesso!`);
  } finally {
    rl.close();
  }
}

module.exports = { editEvent };
