'use strict';

/**
 * Estratégia de extração Microdata/RDFa.
 * Extrai dados de atributos itemprop e RDFa (property, typeof).
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
 * Obtém o valor de um elemento com itemprop.
 * Prioriza: content attr > datetime attr > href attr > text content
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('cheerio').Cheerio} context - Elemento de contexto (escopo)
 * @param {string} prop - Nome do itemprop
 * @returns {string|null}
 */
function getItempropValue($, context, prop) {
  const el = context.find(`[itemprop="${prop}"]`).first();
  if (!el.length) return null;

  // Prioridade: content > datetime > href > text
  const content = el.attr('content');
  if (content) return content.trim();

  const datetime = el.attr('datetime');
  if (datetime) return datetime.trim();

  const href = el.attr('href');
  if (href && (prop === 'url' || prop === 'sameAs')) return href.trim();

  const text = el.text();
  return text ? text.trim() : null;
}

/**
 * Obtém o valor de um elemento com atributo RDFa property.
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('cheerio').Cheerio} context
 * @param {string} prop - Nome da property RDFa (ex: "schema:name")
 * @returns {string|null}
 */
function getRdfaValue($, context, prop) {
  const el = context.find(`[property="${prop}"]`).first();
  if (!el.length) return null;

  const content = el.attr('content');
  if (content) return content.trim();

  const datetime = el.attr('datetime');
  if (datetime) return datetime.trim();

  const href = el.attr('href');
  if (href) return href.trim();

  const text = el.text();
  return text ? text.trim() : null;
}

/**
 * Extrai dados de evento a partir de Microdata (itemprop) e RDFa.
 * @param {import('cheerio').CheerioAPI} $ - Instância do cheerio com HTML carregado
 * @returns {{ data: object, confidence: number } | null}
 */
function extractMicrodata($) {
  // Tentar encontrar escopo de Event via itemscope/itemtype
  let eventScope = $('[itemtype*="schema.org/Event"]').first();

  // Fallback: tentar RDFa typeof="Event"
  if (!eventScope.length) {
    eventScope = $('[typeof="Event"], [typeof="schema:Event"]').first();
  }

  // Se não encontrou escopo de evento, tentar buscar itemprop globalmente
  if (!eventScope.length) {
    // Verificar se existem itemprop relevantes no documento
    const hasName = $('[itemprop="name"]').length > 0;
    const hasStartDate = $('[itemprop="startDate"]').length > 0;

    if (!hasName && !hasStartDate) return null;

    // Usar body como contexto
    eventScope = $('body');
  }

  const data = {};
  const isRdfa = eventScope.attr('typeof') !== undefined;

  // Nome
  const name = isRdfa
    ? getRdfaValue($, eventScope, 'schema:name') || getRdfaValue($, eventScope, 'name')
    : getItempropValue($, eventScope, 'name');
  if (name) data.nome = name;

  // Data de início
  const startDate = isRdfa
    ? getRdfaValue($, eventScope, 'schema:startDate') || getRdfaValue($, eventScope, 'startDate')
    : getItempropValue($, eventScope, 'startDate');
  if (startDate) {
    const date = extractDate(startDate);
    if (date) data.dataInicio = date;
  }

  // Data de fim
  const endDate = isRdfa
    ? getRdfaValue($, eventScope, 'schema:endDate') || getRdfaValue($, eventScope, 'endDate')
    : getItempropValue($, eventScope, 'endDate');
  if (endDate) {
    const date = extractDate(endDate);
    if (date) data.dataFim = date;
  }

  // Descrição
  const description = isRdfa
    ? getRdfaValue($, eventScope, 'schema:description') || getRdfaValue($, eventScope, 'description')
    : getItempropValue($, eventScope, 'description');
  if (description) {
    data.descricao = description.length > 200 ? description.substring(0, 200) : description;
  }

  // URL
  const url = isRdfa
    ? getRdfaValue($, eventScope, 'schema:url') || getRdfaValue($, eventScope, 'url')
    : getItempropValue($, eventScope, 'url');
  if (url) data.url = url;

  // Location
  const locationScope = eventScope.find('[itemprop="location"], [property="schema:location"]').first();
  if (locationScope.length) {
    // Check if location has nested structure (Place with name/address)
    const hasNestedContent = locationScope.find('[itemprop="name"], [property="schema:name"]').length > 0;

    if (hasNestedContent) {
      const locName = getItempropValue($, locationScope, 'name') ||
        getRdfaValue($, locationScope, 'schema:name');
      if (locName) data.local = locName;

      // Address within location
      const addressScope = locationScope.find('[itemprop="address"], [property="schema:address"]').first();
      const addrContext = addressScope.length ? addressScope : locationScope;

      const locality = getItempropValue($, addrContext, 'addressLocality') ||
        getRdfaValue($, addrContext, 'schema:addressLocality');
      if (locality) data.cidade = locality;

      const region = getItempropValue($, addrContext, 'addressRegion') ||
        getRdfaValue($, addrContext, 'schema:addressRegion');
      if (region) data.estado = region;

      const country = getItempropValue($, addrContext, 'addressCountry') ||
        getRdfaValue($, addrContext, 'schema:addressCountry');
      if (country) data.pais = country;
    } else {
      // Simple text location (no nested structure)
      const locText = locationScope.attr('content') || locationScope.text();
      if (locText && locText.trim()) {
        data.local = locText.trim();
      }
    }
  } else {
    // Tentar location diretamente
    const location = isRdfa
      ? getRdfaValue($, eventScope, 'schema:location') || getRdfaValue($, eventScope, 'location')
      : getItempropValue($, eventScope, 'location');
    if (location) data.local = location;
  }

  // Inferir categoria
  const textForCategory = [data.nome, data.descricao].filter(Boolean).join(' ');
  const category = inferCategory(textForCategory);
  if (category) data.categoria = category;

  // Só retorna se tiver ao menos nome ou data
  if (!data.nome && !data.dataInicio) return null;

  // Calcular confiança
  const fieldCount = Object.keys(data).length;
  const confidence = Math.min(0.85, 0.4 + (fieldCount * 0.06));

  return { data, confidence };
}

module.exports = extractMicrodata;
