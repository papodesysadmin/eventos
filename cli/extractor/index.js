'use strict';

/**
 * Módulo principal do extrator de eventos.
 * Orquestra fetch da URL, parsing do HTML e execução das estratégias de extração.
 */

const fetch = require('node-fetch');
const cheerio = require('cheerio');

const extractJsonLd = require('./strategies/json-ld');
const extractOpengraph = require('./strategies/opengraph');
const extractMicrodata = require('./strategies/microdata');
const extractHeuristic = require('./strategies/heuristic');
const { normalize } = require('./normalizer');

/** Campos obrigatórios conforme schema do Arquivo_Eventos */
const REQUIRED_FIELDS = ['nome', 'dataInicio', 'local', 'cidade', 'estado', 'pais', 'url', 'categoria'];

/** Timeout padrão para fetch (30 segundos) */
const FETCH_TIMEOUT_MS = 30000;

/**
 * Extrai metadados de evento a partir de uma URL.
 *
 * @param {string} url - URL da página do evento
 * @returns {Promise<{success: boolean, data: object, missingFields: string[], error?: string}>}
 */
async function extractEventFromUrl(url) {
  let html;

  // 1. Fetch da página com timeout de 30s
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PapoDeSysadmin-EventExtractor/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeout);

    // Tratamento de erros HTTP (4xx/5xx)
    if (!response.ok) {
      return {
        success: false,
        data: {},
        missingFields: REQUIRED_FIELDS,
        error: `Erro HTTP ${response.status}: ${response.statusText}`,
      };
    }

    html = await response.text();
  } catch (err) {
    // Timeout ou erro de rede
    if (err.name === 'AbortError' || err.type === 'aborted') {
      return {
        success: false,
        data: {},
        missingFields: REQUIRED_FIELDS,
        error: 'Erro: URL não respondeu em 30 segundos.',
      };
    }

    return {
      success: false,
      data: {},
      missingFields: REQUIRED_FIELDS,
      error: `Erro ao acessar URL: ${err.message}`,
    };
  }

  // 2. Parse do HTML com cheerio
  const $ = cheerio.load(html);

  // 3. Executar todas as estratégias de extração
  const results = [];

  const strategies = [extractJsonLd, extractOpengraph, extractMicrodata, extractHeuristic];

  for (const strategy of strategies) {
    try {
      const result = strategy($);
      if (result && result.data && typeof result.confidence === 'number') {
        results.push(result);
      }
    } catch {
      // Estratégia falhou, continua com as próximas
    }
  }

  // 4. Normalizar e combinar resultados
  const data = normalize(results);

  // Garantir que a URL original é preservada se não foi extraída
  if (!data.url) {
    data.url = url;
  }

  // 5. Rejeitar páginas sem ao menos nome e data de início
  if (!data.nome && !data.dataInicio) {
    return {
      success: false,
      data,
      missingFields: REQUIRED_FIELDS.filter((field) => !data[field]),
      error: 'Não foi possível identificar dados de evento nesta página.',
    };
  }

  // 6. Identificar campos obrigatórios não encontrados
  const missingFields = REQUIRED_FIELDS.filter(
    (field) => data[field] === undefined || data[field] === null || data[field] === ''
  );

  // 7. Retornar resultado
  if (missingFields.length === 0) {
    return {
      success: true,
      data,
      missingFields: [],
    };
  }

  return {
    success: false,
    data,
    missingFields,
    error: `Campos não encontrados: ${missingFields.join(', ')}. Preencha manualmente.`,
  };
}

module.exports = { extractEventFromUrl, REQUIRED_FIELDS, FETCH_TIMEOUT_MS };
