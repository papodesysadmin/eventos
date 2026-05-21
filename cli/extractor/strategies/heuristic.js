'use strict';

/**
 * Estratégia de extração heurística.
 * Extrai dados via heurísticas de HTML (h1, datas no texto, endereços).
 * Última estratégia na cadeia de prioridade — menor confiança.
 */

const CATEGORIAS_VALIDAS = [
  'Cloud', 'DevOps', 'Seguranca', 'Infraestrutura', 'Automacao',
  'Observabilidade', 'Containers', 'Linux', 'Redes', 'Geral',
  'IA', 'Desenvolvimento', 'Dados', 'Carreira',
];

/**
 * Tenta inferir categoria a partir de palavras-chave no texto.
 * @param {string} text
 * @returns {string|null}
 */
function inferCategory(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  const keywords = {
    Cloud: ['cloud', 'aws', 'azure', 'gcp', 'google cloud'],
    DevOps: ['devops', 'ci/cd', 'continuous'],
    Seguranca: ['segurança', 'seguranca', 'security', 'cybersecurity', 'infosec'],
    Infraestrutura: ['infraestrutura', 'infrastructure', 'datacenter'],
    Automacao: ['automação', 'automacao', 'automation', 'ansible', 'terraform', 'iac'],
    Observabilidade: ['observabilidade', 'observability', 'monitoring', 'prometheus', 'grafana'],
    Containers: ['container', 'docker', 'kubernetes', 'k8s', 'kubecon'],
    Linux: ['linux', 'ubuntu', 'debian', 'fedora', 'kernel'],
    Redes: ['rede', 'network', 'networking', 'bgp', 'dns'],
    IA: ['inteligência artificial', 'ia', 'ai', 'machine learning', 'ml', 'llm'],
    Desenvolvimento: ['desenvolvimento', 'developer', 'programming', 'software'],
    Dados: ['dados', 'data', 'big data', 'analytics', 'engenharia de dados'],
    Carreira: ['carreira', 'career', 'liderança', 'leadership', 'management'],
  };

  for (const [category, terms] of Object.entries(keywords)) {
    for (const term of terms) {
      if (lower.includes(term)) return category;
    }
  }

  return null;
}

/**
 * Meses em português e inglês para parsing de datas textuais.
 */
const MONTHS_PT = {
  janeiro: '01', fevereiro: '02', março: '03', marco: '03',
  abril: '04', maio: '05', junho: '06',
  julho: '07', agosto: '08', setembro: '09',
  outubro: '10', novembro: '11', dezembro: '12',
};

const MONTHS_EN = {
  january: '01', february: '02', march: '03',
  april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09',
  october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08', sep: '09',
  oct: '10', nov: '11', dec: '12',
};

const ALL_MONTHS = { ...MONTHS_PT, ...MONTHS_EN };

/**
 * Tenta extrair uma data ISO de texto livre.
 * Suporta formatos:
 * - YYYY-MM-DD
 * - DD/MM/YYYY
 * - DD de Mês de YYYY (português)
 * - Month DD, YYYY (inglês)
 * @param {string} text
 * @returns {string|null} Data no formato YYYY-MM-DD ou null
 */
function extractDateFromText(text) {
  if (!text) return null;

  // ISO format: YYYY-MM-DD
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  // BR format: DD/MM/YYYY
  const brMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    return `${brMatch[3]}-${month}-${day}`;
  }

  // Portuguese: DD de Mês de YYYY
  const ptMatch = text.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (ptMatch) {
    const day = ptMatch[1].padStart(2, '0');
    const monthName = ptMatch[2].toLowerCase();
    const month = ALL_MONTHS[monthName];
    if (month) return `${ptMatch[3]}-${month}-${day}`;
  }

  // English: Month DD, YYYY
  const enMatch = text.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (enMatch) {
    const monthName = enMatch[1].toLowerCase();
    const month = ALL_MONTHS[monthName];
    if (month) {
      const day = enMatch[2].padStart(2, '0');
      return `${enMatch[3]}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Tenta extrair todas as datas de um texto.
 * @param {string} text
 * @returns {string[]} Array de datas no formato YYYY-MM-DD
 */
function extractAllDates(text) {
  if (!text) return [];
  const dates = [];

  // ISO format
  const isoMatches = text.matchAll(/(\d{4})-(\d{2})-(\d{2})/g);
  for (const m of isoMatches) dates.push(m[0]);

  // BR format
  const brMatches = text.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g);
  for (const m of brMatches) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    dates.push(`${m[3]}-${month}-${day}`);
  }

  // Portuguese dates
  const ptMatches = text.matchAll(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/gi);
  for (const m of ptMatches) {
    const day = m[1].padStart(2, '0');
    const monthName = m[2].toLowerCase();
    const month = ALL_MONTHS[monthName];
    if (month) dates.push(`${m[3]}-${month}-${day}`);
  }

  // English dates
  const enMatches = text.matchAll(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/gi);
  for (const m of enMatches) {
    const monthName = m[1].toLowerCase();
    const month = ALL_MONTHS[monthName];
    if (month) {
      const day = m[2].padStart(2, '0');
      dates.push(`${m[3]}-${month}-${day}`);
    }
  }

  // Deduplicate
  return [...new Set(dates)];
}

/**
 * Extrai dados de evento via heurísticas de HTML.
 * @param {import('cheerio').CheerioAPI} $ - Instância do cheerio com HTML carregado
 * @returns {{ data: object, confidence: number } | null}
 */
function extractHeuristic($) {
  const data = {};

  // 1. Extrair nome do evento: h1, title, ou og:title como fallback
  const h1 = $('h1').first().text().trim();
  const title = $('title').first().text().trim();

  if (h1) {
    data.nome = h1;
  } else if (title) {
    data.nome = title;
  }

  // 2. Extrair datas do corpo da página
  const bodyText = $('body').text();

  // Procurar datas em elementos com classes/IDs sugestivos
  const dateSelectors = [
    '[class*="date"]', '[class*="data"]', '[class*="when"]', '[class*="quando"]',
    '[id*="date"]', '[id*="data"]', '[id*="when"]', '[id*="quando"]',
    'time', '.event-date', '.event-time',
  ];

  let foundDates = [];

  for (const selector of dateSelectors) {
    $(selector).each((_, el) => {
      const elText = $(el).text().trim();
      const datetime = $(el).attr('datetime');

      if (datetime) {
        const date = extractDateFromText(datetime);
        if (date) foundDates.push(date);
      }

      if (elText) {
        const date = extractDateFromText(elText);
        if (date) foundDates.push(date);
      }
    });
  }

  // Fallback: buscar datas no texto geral
  if (foundDates.length === 0) {
    foundDates = extractAllDates(bodyText);
  }

  // Deduplicate e ordenar
  foundDates = [...new Set(foundDates)].sort();

  if (foundDates.length > 0) {
    data.dataInicio = foundDates[0];
    if (foundDates.length > 1) {
      data.dataFim = foundDates[foundDates.length - 1];
    }
  }

  // 3. Extrair local/endereço
  const addressSelectors = [
    '[class*="location"]', '[class*="local"]', '[class*="venue"]',
    '[class*="address"]', '[class*="endereco"]',
    '[id*="location"]', '[id*="local"]', '[id*="venue"]',
    'address',
  ];

  for (const selector of addressSelectors) {
    const el = $(selector).first();
    if (el.length) {
      const text = el.text().trim();
      if (text && text.length < 200) {
        data.local = text;
        break;
      }
    }
  }

  // 4. Extrair URL canônica
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) {
    data.url = canonical;
  }

  // 5. Extrair descrição de meta description
  const metaDesc = $('meta[name="description"]').attr('content');
  if (metaDesc) {
    const desc = metaDesc.trim();
    data.descricao = desc.length > 200 ? desc.substring(0, 200) : desc;
  }

  // 6. Inferir categoria
  const textForCategory = [data.nome, data.descricao, bodyText.substring(0, 500)]
    .filter(Boolean).join(' ');
  const category = inferCategory(textForCategory);
  if (category) data.categoria = category;

  // Só retorna se tiver ao menos nome ou data
  if (!data.nome && !data.dataInicio) return null;

  // Confiança baixa — heurísticas são menos confiáveis
  const fieldCount = Object.keys(data).length;
  const confidence = Math.min(0.55, 0.15 + (fieldCount * 0.05));

  return { data, confidence };
}

module.exports = extractHeuristic;
