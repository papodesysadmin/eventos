'use strict';

const readline = require('readline');
const { v4: uuidv4 } = require('uuid');
const { extractEventFromUrl } = require('../extractor/index');
const { readEvents, writeEvents } = require('../utils/json-io');
const { validateEvent, CATEGORIAS_VALIDAS } = require('../validator/index');

/**
 * Cria interface readline para prompts interativos.
 * @returns {readline.Interface}
 */
function createReadlineInterface() {
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
 * Exibe os dados extraídos ao usuário.
 * @param {object} data - Dados extraídos do evento
 */
function displayExtractedData(data) {
  console.log('\n📋 Dados extraídos:');
  console.log('─'.repeat(40));

  const fields = [
    ['nome', 'Nome'],
    ['dataInicio', 'Data Início'],
    ['dataFim', 'Data Fim'],
    ['local', 'Local'],
    ['cidade', 'Cidade'],
    ['estado', 'Estado'],
    ['pais', 'País'],
    ['url', 'URL'],
    ['categoria', 'Categoria'],
    ['descricao', 'Descrição'],
  ];

  for (const [key, label] of fields) {
    if (data[key]) {
      console.log(`  ${label}: ${data[key]}`);
    }
  }

  console.log('─'.repeat(40));
}

/**
 * Solicita ao usuário o preenchimento de campos faltantes.
 * @param {readline.Interface} rl
 * @param {string[]} missingFields - Lista de campos faltantes
 * @param {object} data - Dados parciais já extraídos
 * @returns {Promise<object>} Dados completos com campos preenchidos
 */
async function promptMissingFields(rl, missingFields, data) {
  const result = { ...data };

  const fieldLabels = {
    nome: 'Nome do evento',
    dataInicio: 'Data de início (YYYY-MM-DD)',
    dataFim: 'Data de fim (YYYY-MM-DD, opcional)',
    local: 'Local/venue',
    cidade: 'Cidade',
    estado: 'Estado',
    pais: 'País',
    url: 'URL do evento',
    categoria: `Categoria (${CATEGORIAS_VALIDAS.join(', ')})`,
  };

  console.log('\n⚠️  Campos não encontrados. Preencha manualmente:\n');

  for (const field of missingFields) {
    const label = fieldLabels[field] || field;
    const answer = await ask(rl, `  ${label}: `);

    if (answer) {
      result[field] = answer;
    }
  }

  return result;
}

/**
 * Adiciona um evento a partir de uma URL.
 * Extrai metadados, solicita campos faltantes, valida e salva.
 *
 * @param {string} url - URL da página do evento
 */
async function addFromUrl(url) {
  console.log(`\n🔍 Extraindo dados de: ${url}\n`);

  // 1. Chamar extrator de URL
  const extraction = await extractEventFromUrl(url);

  // 2. Se extração falhou completamente (sem nome e sem dataInicio), exibir erro e sair
  if (!extraction.data.nome && !extraction.data.dataInicio) {
    console.error(`\n❌ ${extraction.error || 'Não foi possível identificar dados de evento nesta página.'}`);
    process.exitCode = 1;
    return;
  }

  // 3. Exibir dados extraídos
  displayExtractedData(extraction.data);

  let eventData = { ...extraction.data };

  // 4. Se há campos faltantes, solicitar preenchimento manual
  if (extraction.missingFields && extraction.missingFields.length > 0) {
    const rl = createReadlineInterface();
    try {
      eventData = await promptMissingFields(rl, extraction.missingFields, eventData);
    } finally {
      rl.close();
    }
  }

  // 5. Gerar UUID v4 como identificador
  const id = uuidv4();
  eventData.id = id;

  // 6. Validar o evento completo
  const validation = validateEvent(eventData);

  if (!validation.valid) {
    console.error('\n❌ Não foi possível salvar. Campos inválidos:');
    for (const error of validation.errors) {
      console.error(`   • ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  // 7. Salvar no Arquivo_Eventos
  try {
    const events = readEvents();
    events.push(eventData);
    writeEvents(events);
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exitCode = 1;
    return;
  }

  // 8. Exibir ID gerado ao concluir
  console.log(`\n✅ Evento adicionado com sucesso!`);
  console.log(`   ID: ${id}`);
}

module.exports = { addFromUrl };
