'use strict';

/**
 * Normalizador de dados extraídos de páginas de eventos.
 * Combina resultados de múltiplas estratégias de extração,
 * priorizando por confiança, e normaliza formatos de dados.
 */

const CATEGORIAS_VALIDAS = [
  'Cloud',
  'DevOps',
  'Seguranca',
  'Infraestrutura',
  'Automacao',
  'Observabilidade',
  'Containers',
  'Linux',
  'Redes',
  'Geral',
  'IA',
  'Desenvolvimento',
  'Dados',
  'Carreira',
];

/**
 * Mapeamento de palavras-chave para inferência de categoria.
 * Ordem importa: categorias mais específicas primeiro.
 */
const CATEGORY_KEYWORDS = [
  { category: 'Containers', keywords: ['kubernetes', 'k8s', 'docker', 'container', 'openshift', 'helm', 'istio', 'service mesh', 'kubecon'] },
  { category: 'Cloud', keywords: ['cloud', 'aws', 'azure', 'gcp', 'google cloud', 'cloudnative', 'cloud native', 'serverless', 'lambda'] },
  { category: 'DevOps', keywords: ['devops', 'ci/cd', 'cicd', 'pipeline', 'gitops', 'sre', 'continuous delivery', 'continuous integration'] },
  { category: 'Seguranca', keywords: ['segurança', 'seguranca', 'security', 'cybersecurity', 'devsecops', 'pentest', 'hacking', 'cibersegurança'] },
  { category: 'Observabilidade', keywords: ['observabilidade', 'observability', 'monitoring', 'monitoramento', 'prometheus', 'grafana', 'opentelemetry', 'tracing'] },
  { category: 'Automacao', keywords: ['automação', 'automacao', 'automation', 'ansible', 'terraform', 'puppet', 'chef', 'iac', 'infrastructure as code'] },
  { category: 'Linux', keywords: ['linux', 'kernel', 'ubuntu', 'debian', 'fedora', 'red hat', 'suse', 'open source'] },
  { category: 'Redes', keywords: ['rede', 'redes', 'network', 'networking', 'dns', 'tcp', 'bgp', 'firewall', 'load balancer'] },
  { category: 'IA', keywords: ['inteligência artificial', 'inteligencia artificial', 'machine learning', 'deep learning', 'ai', 'ml', 'llm', 'gpt', 'neural'] },
  { category: 'Desenvolvimento', keywords: ['desenvolvimento', 'developer', 'programação', 'programacao', 'software', 'coding', 'frontend', 'backend', 'fullstack'] },
  { category: 'Dados', keywords: ['dados', 'data', 'big data', 'analytics', 'data engineering', 'engenharia de dados', 'spark', 'kafka', 'etl'] },
  { category: 'Infraestrutura', keywords: ['infraestrutura', 'infrastructure', 'datacenter', 'data center', 'storage', 'virtualization', 'virtualização', 'vmware'] },
  { category: 'Carreira', keywords: ['carreira', 'career', 'liderança', 'lideranca', 'leadership', 'gestão', 'gestao', 'management'] },
];

/**
 * Mapeamento de meses em português e inglês para número (1-12)
 */
const MONTH_NAMES = {
  // Português
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4,
  maio: 5, junho: 6, julho: 7, agosto: 8,
  setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  // Inglês
  january: 1, february: 2, march: 3, april: 4,
  may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
  // Abreviações inglês
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, oct: 10, nov: 11, dec: 12,
  // Abreviações português
  fev: 2, abr: 4, mai: 5, set: 9, out: 10, dez: 12,
};

/**
 * Mapeamento de estados brasileiros (nome completo → sigla)
 */
const ESTADOS_BR = {
  'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amapa': 'AP',
  'amazonas': 'AM', 'bahia': 'BA', 'ceará': 'CE', 'ceara': 'CE',
  'distrito federal': 'DF', 'espírito santo': 'ES', 'espirito santo': 'ES',
  'goiás': 'GO', 'goias': 'GO', 'maranhão': 'MA', 'maranhao': 'MA',
  'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', 'pará': 'PA', 'para': 'PA',
  'paraíba': 'PB', 'paraiba': 'PB', 'paraná': 'PR', 'parana': 'PR',
  'pernambuco': 'PE', 'piauí': 'PI', 'piaui': 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
  'rio grande do sul': 'RS', 'rondônia': 'RO', 'rondonia': 'RO',
  'roraima': 'RR', 'santa catarina': 'SC',
  'são paulo': 'SP', 'sao paulo': 'SP',
  'sergipe': 'SE', 'tocantins': 'TO',
};

/**
 * Normaliza uma string de data para formato ISO 8601 (YYYY-MM-DD).
 * Suporta múltiplos formatos de entrada.
 *
 * @param {string} dateStr - String de data em formato variado
 * @returns {string|null} Data no formato YYYY-MM-DD ou null se não reconhecida
 */
function normalizeDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();

  // Já está em ISO 8601
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // ISO 8601 com hora (2026-03-15T10:00:00...)
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoMatch) {
    return isoMatch[1];
  }

  // DD/MM/YYYY ou DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // MM/DD/YYYY (formato americano - tentamos detectar se mês > 12)
  // Nota: ambiguidade é resolvida assumindo DD/MM/YYYY por padrão (contexto brasileiro)

  // "Month DD, YYYY" ou "DD Month YYYY" (inglês/português)
  const textDateMatch1 = trimmed.match(/^([a-zA-ZÀ-ÿ]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (textDateMatch1) {
    const monthNum = MONTH_NAMES[textDateMatch1[1].toLowerCase()];
    if (monthNum) {
      const day = textDateMatch1[2].padStart(2, '0');
      const month = String(monthNum).padStart(2, '0');
      return `${textDateMatch1[3]}-${month}-${day}`;
    }
  }

  // "DD de Month de YYYY" (português)
  const textDateMatch2 = trimmed.match(/^(\d{1,2})\s+(?:de\s+)?([a-zA-ZÀ-ÿ]+)\s+(?:de\s+)?(\d{4})$/i);
  if (textDateMatch2) {
    const monthNum = MONTH_NAMES[textDateMatch2[2].toLowerCase()];
    if (monthNum) {
      const day = textDateMatch2[1].padStart(2, '0');
      const month = String(monthNum).padStart(2, '0');
      return `${textDateMatch2[3]}-${month}-${day}`;
    }
  }

  // "DD Month YYYY" (sem "de")
  const textDateMatch3 = trimmed.match(/^(\d{1,2})\s+([a-zA-ZÀ-ÿ]+)\s+(\d{4})$/i);
  if (textDateMatch3) {
    const monthNum = MONTH_NAMES[textDateMatch3[2].toLowerCase()];
    if (monthNum) {
      const day = textDateMatch3[1].padStart(2, '0');
      const month = String(monthNum).padStart(2, '0');
      return `${textDateMatch3[3]}-${month}-${day}`;
    }
  }

  // YYYY/MM/DD
  const ymd = trimmed.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymd) {
    const month = ymd[2].padStart(2, '0');
    const day = ymd[3].padStart(2, '0');
    return `${ymd[1]}-${month}-${day}`;
  }

  return null;
}

/**
 * Normaliza nome de estado brasileiro.
 * Converte nome completo para sigla de 2 letras.
 *
 * @param {string} estado - Nome ou sigla do estado
 * @returns {string} Sigla do estado ou valor original se não reconhecido
 */
function normalizeEstado(estado) {
  if (!estado || typeof estado !== 'string') return estado;

  const trimmed = estado.trim();

  // Já é uma sigla de 2 letras
  if (/^[A-Z]{2}$/.test(trimmed)) {
    return trimmed;
  }

  const normalized = ESTADOS_BR[trimmed.toLowerCase()];
  return normalized || trimmed;
}

/**
 * Normaliza nome de cidade (capitalização e limpeza).
 *
 * @param {string} cidade - Nome da cidade
 * @returns {string} Nome normalizado
 */
function normalizeCidade(cidade) {
  if (!cidade || typeof cidade !== 'string') return cidade;

  const trimmed = cidade.trim();
  if (!trimmed) return trimmed;

  // Capitaliza cada palavra, exceto preposições comuns
  const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e'];
  return trimmed
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && preposicoes.includes(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Infere a categoria do evento com base no nome e descrição.
 *
 * @param {string} nome - Nome do evento
 * @param {string} [descricao] - Descrição do evento
 * @returns {string|null} Categoria inferida ou null
 */
function inferCategory(nome, descricao) {
  if (!nome && !descricao) return null;

  const text = `${nome || ''} ${descricao || ''}`.toLowerCase();

  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }

  return null;
}

/**
 * Combina resultados de múltiplas estratégias de extração,
 * priorizando valores de estratégias com maior confiança.
 *
 * @param {Array<{data: object, confidence: number}>} results - Resultados das estratégias
 * @returns {object} Objeto combinado com os melhores valores
 */
function mergeResults(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return {};
  }

  // Ordena por confiança decrescente
  const sorted = [...results]
    .filter((r) => r && r.data && typeof r.confidence === 'number')
    .sort((a, b) => b.confidence - a.confidence);

  if (sorted.length === 0) {
    return {};
  }

  const merged = {};

  // Para cada resultado (do mais confiável ao menos confiável),
  // preenche campos que ainda não foram definidos
  for (const { data } of sorted) {
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && value !== '') {
        if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
          merged[key] = value;
        }
      }
    }
  }

  return merged;
}

/**
 * Normaliza os dados extraídos e retorna um objeto de evento
 * compatível com o schema do Arquivo_Eventos.
 *
 * @param {Array<{data: object, confidence: number}>} extractionResults - Resultados das estratégias de extração
 * @returns {object} Objeto de evento normalizado
 */
function normalize(extractionResults) {
  // Combinar resultados priorizando por confiança
  const merged = mergeResults(extractionResults);

  // Normalizar datas
  const dataInicio = normalizeDate(merged.dataInicio || merged.startDate || merged.date);
  const dataFim = normalizeDate(merged.dataFim || merged.endDate);

  // Normalizar localização
  const cidade = normalizeCidade(merged.cidade || merged.city);
  const estado = normalizeEstado(merged.estado || merged.state);

  // Inferir categoria se não fornecida
  let categoria = merged.categoria || merged.category;
  if (categoria && CATEGORIAS_VALIDAS.includes(categoria)) {
    // Categoria já é válida
  } else {
    // Tentar inferir da descrição/nome
    const inferred = inferCategory(merged.nome || merged.name, merged.descricao || merged.description);
    categoria = inferred || categoria || null;
  }

  // Montar objeto normalizado
  const normalized = {
    nome: (merged.nome || merged.name || '').trim() || null,
    dataInicio: dataInicio || null,
    local: (merged.local || merged.venue || merged.location || '').trim() || null,
    cidade: cidade || null,
    estado: estado || null,
    pais: (merged.pais || merged.country || '').trim() || null,
    url: (merged.url || '').trim() || null,
    categoria: categoria || null,
  };

  // Campos opcionais
  if (dataFim) {
    normalized.dataFim = dataFim;
  }

  const descricao = (merged.descricao || merged.description || '').trim();
  if (descricao) {
    normalized.descricao = descricao.length > 200 ? descricao.substring(0, 200) : descricao;
  }

  return normalized;
}

module.exports = {
  normalize,
  normalizeDate,
  normalizeEstado,
  normalizeCidade,
  inferCategory,
  mergeResults,
  CATEGORIAS_VALIDAS,
  CATEGORY_KEYWORDS,
};
