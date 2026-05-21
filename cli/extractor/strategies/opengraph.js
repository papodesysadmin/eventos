'use strict';

/**
 * Estratégia de extração Open Graph.
 * Extrai dados de meta tags Open Graph (og:title, event:start_time, etc.)
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
 * Extrai data no formato ISO 8601 (YYYY-MM-DD) de uma string de data/datetime.
 * @param {string} dateStr
 * @returns {string|null}
 */
function extractDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Obtém o conteúdo de uma meta tag pelo atributo property ou name.
 * @param {import('cheerio').CheerioAPI} $
 * @param {string} property
 * @returns {string|null}
 */
function getMetaContent($, property) {
  const el = $(`meta[property="${property}"]`).first();
  if (el.length) {
    const content = el.attr('content');
    return content ? content.trim() : null;
  }
  // Fallback: try name attribute
  const elName = $(`meta[name="${property}"]`).first();
  if (elName.length) {
    const content = elName.attr('content');
    return content ? content.trim() : null;
  }
  return null;
}

/**
 * Extrai dados de evento a partir de meta tags Open Graph.
 * @param {import('cheerio').CheerioAPI} $ - Instância do cheerio com HTML carregado
 * @returns {{ data: object, confidence: number } | null}
 */
function extractOpenGraph($) {
  const ogTitle = getMetaContent($, 'og:title');
  const ogDescription = getMetaContent($, 'og:description');
  const ogUrl = getMetaContent($, 'og:url');

  // Event-specific OG tags
  const eventStartTime = getMetaContent($, 'event:start_time') ||
    getMetaContent($, 'og:event:start_time');
  const eventEndTime = getMetaContent($, 'event:end_time') ||
    getMetaContent($, 'og:event:end_time');
  const eventLocation = getMetaContent($, 'event:location') ||
    getMetaContent($, 'og:event:location');

  // Place-related OG tags
  const placeLocation = getMetaContent($, 'place:location:latitude') ?
    getMetaContent($, 'og:locality') : null;
  const ogLocality = getMetaContent($, 'og:locality');
  const ogRegion = getMetaContent($, 'og:region');
  const ogCountryName = getMetaContent($, 'og:country-name');

  // If no title found, this strategy can't extract anything useful
  if (!ogTitle && !eventStartTime) return null;

  const data = {};

  if (ogTitle) {
    data.nome = ogTitle;
  }

  if (eventStartTime) {
    const date = extractDate(eventStartTime);
    if (date) data.dataInicio = date;
  }

  if (eventEndTime) {
    const date = extractDate(eventEndTime);
    if (date) data.dataFim = date;
  }

  if (ogDescription) {
    const desc = ogDescription.trim();
    data.descricao = desc.length > 200 ? desc.substring(0, 200) : desc;
  }

  if (ogUrl) {
    data.url = ogUrl;
  }

  if (eventLocation) {
    data.local = eventLocation;
  }

  if (ogLocality) {
    data.cidade = ogLocality;
  }

  if (ogRegion) {
    data.estado = ogRegion;
  }

  if (ogCountryName) {
    data.pais = ogCountryName;
  }

  // Inferir categoria
  const textForCategory = [data.nome, data.descricao].filter(Boolean).join(' ');
  const category = inferCategory(textForCategory);
  if (category) data.categoria = category;

  // Calcular confiança baseada nos campos encontrados
  const fieldCount = Object.keys(data).length;

  // OG tags são menos confiáveis que JSON-LD para eventos
  // Presença de event:start_time aumenta confiança significativamente
  let confidence = 0.3 + (fieldCount * 0.06);
  if (eventStartTime) confidence += 0.15;
  confidence = Math.min(0.80, confidence);

  return { data, confidence };
}

module.exports = extractOpenGraph;
