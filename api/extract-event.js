'use strict';

/**
 * API endpoint para extração de dados de eventos a partir de URLs.
 * Roda na VPS como parte do servidor Node.js.
 * Reutiliza a lógica do extrator da CLI.
 *
 * Uso: POST /api/extract-event
 * Body: { "url": "https://..." }
 * Response: { "success": true, "data": {...}, "missingFields": [...] }
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// ============================================================
// CHEERIO-LIKE MINIMAL HTML PARSER (sem dependência externa)
// Para a VPS, usamos regex-based extraction para evitar npm install
// ============================================================

/**
 * Extrai conteúdo de tags script type="application/ld+json"
 */
function extractJsonLdBlocks(html) {
  const blocks = [];
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (e) { /* ignore invalid JSON */ }
  }
  return blocks;
}

/**
 * Extrai conteúdo de meta tags
 */
function extractMetaTags(html) {
  const metas = {};
  const regex = /<meta[^>]*(?:property|name)\s*=\s*["']([^"']+)["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*\/?>/gi;
  const regex2 = /<meta[^>]*content\s*=\s*["']([^"']*)["'][^>]*(?:property|name)\s*=\s*["']([^"']+)["'][^>]*\/?>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    metas[match[1]] = match[2];
  }
  while ((match = regex2.exec(html)) !== null) {
    metas[match[2]] = match[1];
  }
  return metas;
}

/**
 * Extrai texto de um elemento HTML por tag
 */
function extractFirstTag(html, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = html.match(regex);
  if (!match) return null;
  return match[1].replace(/<[^>]+>/g, '').trim();
}

/**
 * Extrai data ISO de uma string
 */
function extractDate(str) {
  if (!str) return null;
  const match = str.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

// Meses
const MONTHS = {
  janeiro: '01', fevereiro: '02', 'março': '03', marco: '03',
  abril: '04', maio: '05', junho: '06', julho: '07',
  agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07',
  aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  fev: '02', abr: '04', mai: '05', set: '09', out: '10', dez: '12',
};

function parseDateText(text) {
  if (!text) return null;
  // ISO
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  // DD/MM/YYYY
  const br = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  // DD de Mês de YYYY
  const pt = text.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (pt && MONTHS[pt[2].toLowerCase()]) {
    return `${pt[3]}-${MONTHS[pt[2].toLowerCase()]}-${pt[1].padStart(2, '0')}`;
  }
  // Month DD, YYYY
  const en = text.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (en && MONTHS[en[1].toLowerCase()]) {
    return `${en[3]}-${MONTHS[en[1].toLowerCase()]}-${en[2].padStart(2, '0')}`;
  }
  return null;
}

// Categorias
const CATEGORY_KEYWORDS = {
  Containers: ['kubernetes', 'k8s', 'docker', 'container', 'kubecon'],
  Cloud: ['cloud', 'aws', 'azure', 'gcp', 'google cloud', 'serverless'],
  DevOps: ['devops', 'ci/cd', 'cicd', 'gitops', 'sre'],
  Seguranca: ['segurança', 'seguranca', 'security', 'cybersecurity', 'devsecops'],
  Observabilidade: ['observabilidade', 'observability', 'monitoring', 'prometheus', 'grafana'],
  Automacao: ['automação', 'automacao', 'automation', 'ansible', 'terraform'],
  Linux: ['linux', 'kernel', 'open source'],
  Redes: ['rede', 'redes', 'network', 'networking'],
  IA: ['inteligência artificial', 'machine learning', 'ai', 'ml', 'llm', 'gpt'],
  Desenvolvimento: ['desenvolvimento', 'developer', 'programação', 'software', 'fullstack'],
  Dados: ['dados', 'data', 'big data', 'analytics', 'data engineering'],
  Infraestrutura: ['infraestrutura', 'infrastructure', 'datacenter', 'vmware'],
  Carreira: ['carreira', 'career', 'liderança', 'leadership'],
};

function inferCategory(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return cat;
    }
  }
  return null;
}

// Estados BR
const ESTADOS_BR = {
  'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amapa': 'AP',
  'amazonas': 'AM', 'bahia': 'BA', 'ceará': 'CE', 'ceara': 'CE',
  'distrito federal': 'DF', 'espírito santo': 'ES', 'espirito santo': 'ES',
  'goiás': 'GO', 'goias': 'GO', 'maranhão': 'MA', 'maranhao': 'MA',
  'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG',
  'pará': 'PA', 'para': 'PA', 'paraíba': 'PB', 'paraiba': 'PB',
  'paraná': 'PR', 'parana': 'PR', 'pernambuco': 'PE', 'piauí': 'PI',
  'piaui': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
  'rio grande do sul': 'RS', 'rondônia': 'RO', 'rondonia': 'RO',
  'roraima': 'RR', 'santa catarina': 'SC', 'são paulo': 'SP',
  'sao paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO',
};

function normalizeEstado(estado) {
  if (!estado) return estado;
  const trimmed = estado.trim();
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  return ESTADOS_BR[trimmed.toLowerCase()] || trimmed;
}

// ============================================================
// ESTRATÉGIAS DE EXTRAÇÃO
// ============================================================

function extractFromJsonLd(html) {
  const blocks = extractJsonLdBlocks(html);
  for (const block of blocks) {
    const items = block['@graph'] ? block['@graph'] : (Array.isArray(block) ? block : [block]);
    for (const item of items) {
      if (!item || !item['@type']) continue;
      const type = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
      if (!type.some(t => t === 'Event' || t.includes('Event'))) continue;

      const data = {};
      if (item.name) data.nome = String(item.name).trim();
      if (item.startDate) data.dataInicio = extractDate(String(item.startDate));
      if (item.endDate) data.dataFim = extractDate(String(item.endDate));
      if (item.description) {
        const d = String(item.description).trim();
        data.descricao = d.length > 200 ? d.substring(0, 200) : d;
      }
      if (item.url) data.url = String(item.url).trim();
      if (item.location) {
        const loc = item.location;
        if (typeof loc === 'string') { data.local = loc.trim(); }
        else if (typeof loc === 'object') {
          if (loc.name) data.local = String(loc.name).trim();
          if (loc.address) {
            const addr = typeof loc.address === 'string' ? { name: loc.address } : loc.address;
            if (addr.addressLocality) data.cidade = String(addr.addressLocality).trim();
            if (addr.addressRegion) data.estado = String(addr.addressRegion).trim();
            if (addr.addressCountry) data.pais = String(addr.addressCountry).trim();
            if (!data.local && addr.name) data.local = String(addr.name).trim();
          }
        }
      }
      if (data.nome || data.dataInicio) return { data, confidence: 0.9 };
    }
  }
  return null;
}

function extractFromOpenGraph(html) {
  const metas = extractMetaTags(html);
  const data = {};

  if (metas['og:title']) data.nome = metas['og:title'];
  if (metas['og:description']) {
    const d = metas['og:description'].trim();
    data.descricao = d.length > 200 ? d.substring(0, 200) : d;
  }
  if (metas['og:url']) data.url = metas['og:url'];
  if (metas['event:start_time'] || metas['og:event:start_time']) {
    data.dataInicio = extractDate(metas['event:start_time'] || metas['og:event:start_time']);
  }
  if (metas['event:end_time'] || metas['og:event:end_time']) {
    data.dataFim = extractDate(metas['event:end_time'] || metas['og:event:end_time']);
  }
  if (metas['event:location'] || metas['og:event:location']) {
    data.local = metas['event:location'] || metas['og:event:location'];
  }
  if (metas['og:locality']) data.cidade = metas['og:locality'];
  if (metas['og:region']) data.estado = metas['og:region'];
  if (metas['og:country-name']) data.pais = metas['og:country-name'];

  if (!data.nome && !data.dataInicio) return null;
  return { data, confidence: 0.6 };
}

function extractFromHeuristic(html) {
  const data = {};

  // Title
  const h1 = extractFirstTag(html, 'h1');
  const title = extractFirstTag(html, 'title');
  data.nome = h1 || title || null;

  // Dates from body text
  const bodyText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const dates = [];
  // ISO
  const isoMatches = bodyText.matchAll(/(\d{4}-\d{2}-\d{2})/g);
  for (const m of isoMatches) dates.push(m[1]);
  // BR
  const brMatches = bodyText.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g);
  for (const m of brMatches) dates.push(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  // PT text
  const ptMatches = bodyText.matchAll(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/gi);
  for (const m of ptMatches) {
    if (MONTHS[m[2].toLowerCase()]) dates.push(`${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`);
  }

  const uniqueDates = [...new Set(dates)].sort();
  if (uniqueDates.length > 0) {
    data.dataInicio = uniqueDates[0];
    if (uniqueDates.length > 1) data.dataFim = uniqueDates[uniqueDates.length - 1];
  }

  // Meta description
  const metas = extractMetaTags(html);
  if (metas['description']) {
    const d = metas['description'].trim();
    data.descricao = d.length > 200 ? d.substring(0, 200) : d;
  }

  // Canonical URL
  const canonical = html.match(/<link[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/i);
  if (canonical) data.url = canonical[1];

  if (!data.nome && !data.dataInicio) return null;
  return { data, confidence: 0.3 };
}

// ============================================================
// HTML ENTITY DECODER
// ============================================================

function decodeHtmlEntities(str) {
  if (!str) return str;
  const entities = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&apos;': "'",
    '&eacute;': 'é', '&Eacute;': 'É', '&aacute;': 'á', '&Aacute;': 'Á',
    '&iacute;': 'í', '&Iacute;': 'Í', '&oacute;': 'ó', '&Oacute;': 'Ó',
    '&uacute;': 'ú', '&Uacute;': 'Ú', '&atilde;': 'ã', '&Atilde;': 'Ã',
    '&otilde;': 'õ', '&Otilde;': 'Õ', '&ccedil;': 'ç', '&Ccedil;': 'Ç',
    '&agrave;': 'à', '&Agrave;': 'À', '&acirc;': 'â', '&Acirc;': 'Â',
    '&ecirc;': 'ê', '&Ecirc;': 'Ê', '&ocirc;': 'ô', '&Ocirc;': 'Ô',
    '&uuml;': 'ü', '&Uuml;': 'Ü', '&ntilde;': 'ñ', '&Ntilde;': 'Ñ',
    '&nbsp;': ' ', '&ndash;': '–', '&mdash;': '—', '&hellip;': '…',
  };
  let result = str;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.split(entity).join(char);
  }
  // Numeric entities: &#123; or &#x1F;
  result = result.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
  return result;
}

// ============================================================
// MAIN EXTRACTION LOGIC
// ============================================================

function extractEventData(html, originalUrl) {
  const results = [
    extractFromJsonLd(html),
    extractFromOpenGraph(html),
    extractFromHeuristic(html),
  ].filter(Boolean);

  if (results.length === 0) {
    return { success: false, data: {}, missingFields: ['nome', 'dataInicio'], error: 'Não foi possível identificar dados de evento nesta página.' };
  }

  // Merge results by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence);
  const merged = {};
  for (const { data } of results) {
    for (const [key, value] of Object.entries(data)) {
      if (value && !merged[key]) merged[key] = value;
    }
  }

  // Decode HTML entities in all string fields
  for (const key of Object.keys(merged)) {
    if (typeof merged[key] === 'string') {
      merged[key] = decodeHtmlEntities(merged[key]);
    }
  }

  // Ensure URL
  if (!merged.url) merged.url = originalUrl;

  // Normalize estado
  if (merged.estado) merged.estado = normalizeEstado(merged.estado);

  // Infer category
  if (!merged.categoria) {
    merged.categoria = inferCategory([merged.nome, merged.descricao].filter(Boolean).join(' '));
  }

  // Default country
  if (!merged.pais) merged.pais = 'Brasil';

  // Try to extract date/city from description if missing
  if (!merged.dataInicio && merged.descricao) {
    const dateFromDesc = parseDateText(merged.descricao);
    if (dateFromDesc) merged.dataInicio = dateFromDesc;
    // Try "entre os dias DD a DD de Mês" pattern
    if (!merged.dataInicio) {
      const rangeMatch = merged.descricao.match(/(\d{1,2})\s+(?:a|e)\s+(\d{1,2})\s+de\s+(\w+)/i);
      if (rangeMatch && MONTHS[rangeMatch[3].toLowerCase()]) {
        const year = merged.descricao.match(/(\d{4})/);
        const yr = year ? year[1] : new Date().getFullYear().toString();
        merged.dataInicio = `${yr}-${MONTHS[rangeMatch[3].toLowerCase()]}-${rangeMatch[1].padStart(2, '0')}`;
        merged.dataFim = `${yr}-${MONTHS[rangeMatch[3].toLowerCase()]}-${rangeMatch[2].padStart(2, '0')}`;
      }
    }
  }

  // Try to extract city from description if missing
  if (!merged.cidade && merged.descricao) {
    // Common pattern: "em CIDADE" or "em CIDADE,"
    const cityMatch = merged.descricao.match(/(?:em|in)\s+([A-ZÀ-Ú][A-ZÀ-Ú\s]{2,20})(?:[,.]|\s+entre|\s+de\s+\d)/i);
    if (cityMatch) {
      const city = cityMatch[1].trim();
      // Capitalize properly
      merged.cidade = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
      // Try to infer state from known cities
      const cityStateMap = {
        'florianópolis': 'SC', 'florianopolis': 'SC', 'são paulo': 'SP', 'sao paulo': 'SP',
        'rio de janeiro': 'RJ', 'belo horizonte': 'MG', 'porto alegre': 'RS',
        'curitiba': 'PR', 'brasília': 'DF', 'brasilia': 'DF', 'recife': 'PE',
        'salvador': 'BA', 'fortaleza': 'CE', 'manaus': 'AM', 'goiânia': 'GO',
        'campinas': 'SP', 'joinville': 'SC', 'londrina': 'PR',
      };
      if (!merged.estado && cityStateMap[city.toLowerCase()]) {
        merged.estado = cityStateMap[city.toLowerCase()];
      }
    }
  }

  // Check required fields
  const required = ['nome', 'dataInicio', 'local', 'cidade', 'estado', 'pais', 'url', 'categoria'];
  const missingFields = required.filter(f => !merged[f]);

  return {
    success: missingFields.length === 0,
    data: merged,
    missingFields,
    error: missingFields.length > 0 ? `Campos não encontrados: ${missingFields.join(', ')}` : undefined,
  };
}

// ============================================================
// HTTP FETCH
// ============================================================

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      timeout: 30000,
    };

    const req = client.request(options, (res) => {
      // Follow redirects (up to 5)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${parsedUrl.protocol}//${parsedUrl.host}${res.headers.location}`;
        fetchUrl(redirectUrl).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout: 30s')); });
    req.end();
  });
}

// ============================================================
// MULTI-EVENT EXTRACTION (Markdown format - agenda-tech-brasil)
// ============================================================

/**
 * Detecta se o conteúdo é Markdown com formato de lista de eventos.
 * Formato: - DD: [Nome](URL) - _Cidade/UF_ ![tipo]
 */
function isMarkdownEventList(content) {
  // Check for the agenda-tech-brasil pattern
  return content.includes('<!-- ANO') || 
    (content.match(/^- \d{1,2}.*\[.+\]\(.+\)/m) && content.match(/_{1,2}[A-ZÀ-Ú].*\/[A-Z]{2}_{1,2}/m));
}

/**
 * Parse markdown event list (agenda-tech-brasil format).
 * Returns array of event objects.
 */
function parseMarkdownEvents(content, sourceUrl) {
  const events = [];
  const lines = content.split('\n');
  
  let currentMonth = null;
  let currentYear = null;
  
  // Detect year from content
  const yearMatch = content.match(/## Eventos em (\d{4})/);
  if (yearMatch) currentYear = yearMatch[1];
  if (!currentYear) {
    const yearMatch2 = content.match(/ANO(\d{4})/);
    if (yearMatch2) currentYear = yearMatch2[1];
  }
  if (!currentYear) currentYear = new Date().getFullYear().toString();

  const monthMap = {
    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'marco': '03', 'marã§o': '03',
    'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07',
    'agosto': '08', 'setembro': '09', 'outubro': '10',
    'novembro': '11', 'dezembro': '12',
  };

  for (const line of lines) {
    // Detect month headers: ### Janeiro, ### Fevereiro, etc.
    const monthHeader = line.match(/^###\s+(\S+)/i);
    if (monthHeader) {
      const rawMonth = monthHeader[1].toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove accents
      // Map without accents
      const monthMapNorm = {
        'janeiro': '01', 'fevereiro': '02', 'marco': '03',
        'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07',
        'agosto': '08', 'setembro': '09', 'outubro': '10',
        'novembro': '11', 'dezembro': '12',
      };
      const m = monthMap[monthHeader[1].toLowerCase()] || monthMapNorm[rawMonth];
      if (m) currentMonth = m;
      continue;
    }

    // Parse event lines. Patterns:
    // - DD: [Nome](URL) - _Cidade/UF_ ![tipo]
    // - DD e DD: [Nome](URL) - _Cidade/UF_ ![tipo]
    // - DD, DD e DD: [Nome](URL) - _Cidade/UF_ ![tipo]
    // - DD, DD, DD e DD: [Nome](URL) - _Cidade/UF_ ![tipo]
    const eventMatch = line.match(/^-\s+([\d,\s]+(?:e\s+\d+)?)\s*:\s*\[([^\]]+)\]\(([^)]+)\)\s*(?:-\s*_([^_]+)_)?\s*(?:!\[([^\]]*)\])?/);
    if (!eventMatch || !currentMonth) continue;

    const daysStr = eventMatch[1]; // "08, 09, 10 e 11" or "22" or "01 e 02"
    const nome = eventMatch[2].trim();
    const url = eventMatch[3].trim();
    const location = eventMatch[4] ? eventMatch[4].trim() : null;
    const tipo = eventMatch[5] ? eventMatch[5].trim() : null;

    // Parse days: extract all numbers
    const dayNumbers = daysStr.match(/\d+/g);
    if (!dayNumbers || dayNumbers.length === 0) continue;

    const dayStart = dayNumbers[0];
    const dayEnd = dayNumbers.length > 1 ? dayNumbers[dayNumbers.length - 1] : null;

    const dataInicio = `${currentYear}-${currentMonth}-${dayStart.padStart(2, '0')}`;
    let dataFim = null;
    
    // Determine end date
    if (dayEnd) {
      dataFim = `${currentYear}-${currentMonth}-${dayEnd.padStart(2, '0')}`;
    }

    // Parse location: "Cidade/UF" or "Grande São Paulo/SP"
    let cidade = null;
    let estado = null;
    if (location) {
      const locParts = location.split('/');
      if (locParts.length === 2) {
        cidade = locParts[0].trim();
        estado = locParts[1].trim();
      } else {
        cidade = location;
      }
    }

    // Infer category from name
    const categoria = inferCategory(nome) || 'Geral';

    const event = {
      nome,
      dataInicio,
      url,
      cidade: cidade || null,
      estado: estado || null,
      pais: 'Brasil',
      local: null,
      categoria,
    };

    if (dataFim) event.dataFim = dataFim;
    if (tipo) event.formato = tipo; // presencial, online, híbrido

    events.push(event);
  }

  return events;
}

/**
 * Detect if URL is a GitHub raw content or repo README
 */
function getGitHubRawUrl(url) {
  // https://github.com/user/repo → https://raw.githubusercontent.com/user/repo/main/README.md
  const ghMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/?$/);
  if (ghMatch) {
    return `https://raw.githubusercontent.com/${ghMatch[1]}/${ghMatch[2]}/main/README.md`;
  }
  // Already raw
  if (url.includes('raw.githubusercontent.com')) return url;
  return null;
}

// ============================================================
// HTTP SERVER
// ============================================================

const PORT = process.env.EXTRACT_PORT || 3002;

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/extract') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { url } = JSON.parse(body);
      if (!url || !url.startsWith('http')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'URL inválida' }));
        return;
      }

      console.log(`[extract] Fetching: ${url}`);
      
      // Check if it's a GitHub repo URL — fetch README directly
      const rawUrl = getGitHubRawUrl(url);
      const fetchTarget = rawUrl || url;
      
      const content = await fetchUrl(fetchTarget);

      // Check if content is a markdown event list
      if (isMarkdownEventList(content)) {
        console.log(`[extract] Detected markdown event list`);
        const events = parseMarkdownEvents(content, url);
        console.log(`[extract] Parsed ${events.length} events from markdown`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          multiple: true, 
          events: events,
          total: events.length,
          source: url,
        }));
        return;
      }

      // Single event extraction (HTML)
      const result = extractEventData(content, url);
      console.log(`[extract] Result: success=${result.success}, fields=${Object.keys(result.data).length}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error(`[extract] Error: ${err.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message, data: {}, missingFields: [] }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[extract-event] Listening on 127.0.0.1:${PORT}`);
});
