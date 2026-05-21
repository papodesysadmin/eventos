'use strict';

/**
 * Estratégia de extração JSON-LD (schema.org/Event).
 * Extrai dados de <script type="application/ld+json"> contendo schema.org/Event.
 */

const CATEGORIAS_VALIDAS = [
  'Cloud', 'DevOps', 'Seguranca', 'Infraestrutura', 'Automacao',
  'Observabilidade', 'Containers', 'Linux', 'Redes', 'Geral',
  'IA', 'Desenvolvimento', 'Dados', 'Carreira',
];

/**
 * Tenta inferir categoria a partir de palavras-chave no nome/descrição do evento.
 * @param {string} text - Texto para análise
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
  // Match YYYY-MM-DD at the beginning (handles full ISO datetime strings)
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Extrai dados de evento a partir de JSON-LD (schema.org/Event).
 * @param {import('cheerio').CheerioAPI} $ - Instância do cheerio com HTML carregado
 * @returns {{ data: object, confidence: number } | null}
 */
function extractJsonLd($) {
  const scripts = $('script[type="application/ld+json"]');

  if (scripts.length === 0) return null;

  let bestResult = null;

  scripts.each((_, el) => {
    try {
      const content = $(el).html();
      if (!content) return;

      let jsonData = JSON.parse(content);

      // Handle @graph arrays
      if (jsonData['@graph'] && Array.isArray(jsonData['@graph'])) {
        jsonData = jsonData['@graph'];
      }

      // Normalize to array
      const items = Array.isArray(jsonData) ? jsonData : [jsonData];

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        const type = item['@type'];
        const isEvent =
          type === 'Event' ||
          type === 'schema:Event' ||
          type === 'https://schema.org/Event' ||
          type === 'http://schema.org/Event' ||
          (Array.isArray(type) && type.some(t =>
            t === 'Event' || t === 'schema:Event' ||
            t === 'https://schema.org/Event' || t === 'http://schema.org/Event'
          ));

        if (!isEvent) continue;

        const data = {};

        // Nome
        if (item.name) {
          data.nome = String(item.name).trim();
        }

        // Data de início
        if (item.startDate) {
          const date = extractDate(String(item.startDate));
          if (date) data.dataInicio = date;
        }

        // Data de fim
        if (item.endDate) {
          const date = extractDate(String(item.endDate));
          if (date) data.dataFim = date;
        }

        // Descrição
        if (item.description) {
          const desc = String(item.description).trim();
          data.descricao = desc.length > 200 ? desc.substring(0, 200) : desc;
        }

        // URL
        if (item.url) {
          data.url = String(item.url).trim();
        }

        // Local (location)
        if (item.location) {
          const loc = item.location;
          if (typeof loc === 'string') {
            data.local = loc.trim();
          } else if (typeof loc === 'object') {
            if (loc.name) {
              data.local = String(loc.name).trim();
            }
            if (loc.address) {
              const addr = loc.address;
              if (typeof addr === 'string') {
                data.local = data.local || addr.trim();
              } else if (typeof addr === 'object') {
                if (addr.addressLocality) data.cidade = String(addr.addressLocality).trim();
                if (addr.addressRegion) data.estado = String(addr.addressRegion).trim();
                if (addr.addressCountry) {
                  data.pais = String(addr.addressCountry).trim();
                }
                if (!data.local && addr.name) {
                  data.local = String(addr.name).trim();
                }
                if (!data.local && addr.streetAddress) {
                  data.local = String(addr.streetAddress).trim();
                }
              }
            }
          }
        }

        // Categoria (inferida do nome/descrição)
        const textForCategory = [data.nome, data.descricao].filter(Boolean).join(' ');
        const category = inferCategory(textForCategory);
        if (category) data.categoria = category;

        // Só retorna se tiver ao menos nome ou data
        if (data.nome || data.dataInicio) {
          const fieldCount = Object.keys(data).length;
          const confidence = Math.min(0.95, 0.5 + (fieldCount * 0.07));

          if (!bestResult || confidence > bestResult.confidence) {
            bestResult = { data, confidence };
          }
        }
      }
    } catch {
      // JSON inválido, ignora este script tag
    }
  });

  return bestResult;
}

module.exports = extractJsonLd;
