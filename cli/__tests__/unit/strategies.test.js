'use strict';

const cheerio = require('cheerio');
const extractJsonLd = require('../../extractor/strategies/json-ld');
const extractOpenGraph = require('../../extractor/strategies/opengraph');
const extractMicrodata = require('../../extractor/strategies/microdata');
const extractHeuristic = require('../../extractor/strategies/heuristic');

describe('Estratégia JSON-LD', () => {
  it('deve extrair dados de um script JSON-LD com schema.org/Event', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Event",
          "name": "KubeCon South America 2026",
          "startDate": "2026-03-15",
          "endDate": "2026-03-17",
          "description": "Maior evento de Kubernetes da América do Sul",
          "url": "https://kubecon.io",
          "location": {
            "@type": "Place",
            "name": "Centro de Convenções",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "São Paulo",
              "addressRegion": "SP",
              "addressCountry": "Brasil"
            }
          }
        }
        </script>
      </head><body></body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractJsonLd($);

    expect(result).not.toBeNull();
    expect(result.data.nome).toBe('KubeCon South America 2026');
    expect(result.data.dataInicio).toBe('2026-03-15');
    expect(result.data.dataFim).toBe('2026-03-17');
    expect(result.data.local).toBe('Centro de Convenções');
    expect(result.data.cidade).toBe('São Paulo');
    expect(result.data.estado).toBe('SP');
    expect(result.data.pais).toBe('Brasil');
    expect(result.data.url).toBe('https://kubecon.io');
    expect(result.data.categoria).toBe('Containers');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });

  it('deve retornar null quando não há script JSON-LD', () => {
    const html = '<html><head></head><body><h1>Hello</h1></body></html>';
    const $ = cheerio.load(html);
    expect(extractJsonLd($)).toBeNull();
  });

  it('deve retornar null quando JSON-LD não é do tipo Event', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        { "@type": "Organization", "name": "Acme Corp" }
        </script>
      </head><body></body></html>
    `;
    const $ = cheerio.load(html);
    expect(extractJsonLd($)).toBeNull();
  });

  it('deve lidar com @graph contendo Event', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebPage", "name": "Page" },
            { "@type": "Event", "name": "DevOpsDays SP", "startDate": "2026-05-10" }
          ]
        }
        </script>
      </head><body></body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractJsonLd($);

    expect(result).not.toBeNull();
    expect(result.data.nome).toBe('DevOpsDays SP');
    expect(result.data.dataInicio).toBe('2026-05-10');
    expect(result.data.categoria).toBe('DevOps');
  });

  it('deve lidar com JSON-LD inválido sem quebrar', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{ invalid json }</script>
      </head><body></body></html>
    `;
    const $ = cheerio.load(html);
    expect(extractJsonLd($)).toBeNull();
  });

  it('deve truncar descrição com mais de 200 caracteres', () => {
    const longDesc = 'A'.repeat(300);
    const html = `
      <html><head>
        <script type="application/ld+json">
        { "@type": "Event", "name": "Test", "startDate": "2026-01-01", "description": "${longDesc}" }
        </script>
      </head><body></body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractJsonLd($);

    expect(result).not.toBeNull();
    expect(result.data.descricao.length).toBe(200);
  });

  it('deve extrair data de datetime ISO completo', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        { "@type": "Event", "name": "Test", "startDate": "2026-06-20T09:00:00-03:00" }
        </script>
      </head><body></body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractJsonLd($);

    expect(result).not.toBeNull();
    expect(result.data.dataInicio).toBe('2026-06-20');
  });
});

describe('Estratégia Open Graph', () => {
  it('deve extrair dados de meta tags OG com event:start_time', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="AWS Summit São Paulo 2026" />
        <meta property="og:description" content="Evento de cloud computing da AWS" />
        <meta property="og:url" content="https://aws.amazon.com/events/summit-sp" />
        <meta property="event:start_time" content="2026-08-20T09:00:00" />
        <meta property="event:end_time" content="2026-08-21T18:00:00" />
        <meta property="event:location" content="Transamerica Expo Center" />
        <meta property="og:locality" content="São Paulo" />
        <meta property="og:region" content="SP" />
        <meta property="og:country-name" content="Brasil" />
      </head><body></body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractOpenGraph($);

    expect(result).not.toBeNull();
    expect(result.data.nome).toBe('AWS Summit São Paulo 2026');
    expect(result.data.dataInicio).toBe('2026-08-20');
    expect(result.data.dataFim).toBe('2026-08-21');
    expect(result.data.local).toBe('Transamerica Expo Center');
    expect(result.data.cidade).toBe('São Paulo');
    expect(result.data.estado).toBe('SP');
    expect(result.data.pais).toBe('Brasil');
    expect(result.data.categoria).toBe('Cloud');
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it('deve retornar null quando não há meta tags OG relevantes', () => {
    const html = '<html><head></head><body></body></html>';
    const $ = cheerio.load(html);
    expect(extractOpenGraph($)).toBeNull();
  });

  it('deve extrair apenas título quando não há event:start_time', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Linux Conference" />
        <meta property="og:description" content="Conferência sobre Linux" />
      </head><body></body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractOpenGraph($);

    expect(result).not.toBeNull();
    expect(result.data.nome).toBe('Linux Conference');
    expect(result.data.categoria).toBe('Linux');
    expect(result.confidence).toBeLessThan(0.7);
  });

  it('deve truncar descrição longa', () => {
    const longDesc = 'B'.repeat(300);
    const html = `
      <html><head>
        <meta property="og:title" content="Test Event" />
        <meta property="og:description" content="${longDesc}" />
      </head><body></body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractOpenGraph($);

    expect(result).not.toBeNull();
    expect(result.data.descricao.length).toBe(200);
  });
});

describe('Estratégia Microdata', () => {
  it('deve extrair dados de microdata com itemscope Event', () => {
    const html = `
      <html><body>
        <div itemscope itemtype="https://schema.org/Event">
          <h1 itemprop="name">Ansible Fest 2026</h1>
          <time itemprop="startDate" datetime="2026-10-05">5 de outubro</time>
          <time itemprop="endDate" datetime="2026-10-06">6 de outubro</time>
          <span itemprop="description">Evento de automação com Ansible</span>
          <a itemprop="url" href="https://ansiblefest.com">Site</a>
          <div itemprop="location" itemscope itemtype="https://schema.org/Place">
            <span itemprop="name">Convention Center</span>
            <div itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
              <span itemprop="addressLocality">Chicago</span>
              <span itemprop="addressRegion">IL</span>
              <span itemprop="addressCountry">USA</span>
            </div>
          </div>
        </div>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractMicrodata($);

    expect(result).not.toBeNull();
    expect(result.data.nome).toBe('Ansible Fest 2026');
    expect(result.data.dataInicio).toBe('2026-10-05');
    expect(result.data.dataFim).toBe('2026-10-06');
    expect(result.data.local).toBe('Convention Center');
    expect(result.data.cidade).toBe('Chicago');
    expect(result.data.estado).toBe('IL');
    expect(result.data.pais).toBe('USA');
    expect(result.data.url).toBe('https://ansiblefest.com');
    expect(result.data.categoria).toBe('Automacao');
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it('deve retornar null quando não há microdata de evento', () => {
    const html = '<html><body><h1>Hello World</h1></body></html>';
    const $ = cheerio.load(html);
    expect(extractMicrodata($)).toBeNull();
  });

  it('deve extrair dados de RDFa typeof="Event"', () => {
    const html = `
      <html><body>
        <div typeof="Event">
          <span property="schema:name">Security Summit</span>
          <time property="schema:startDate" datetime="2026-07-15">15 Jul</time>
          <span property="schema:location">Centro de Eventos</span>
        </div>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractMicrodata($);

    expect(result).not.toBeNull();
    expect(result.data.nome).toBe('Security Summit');
    expect(result.data.dataInicio).toBe('2026-07-15');
    expect(result.data.local).toBe('Centro de Eventos');
    expect(result.data.categoria).toBe('Seguranca');
  });

  it('deve usar content attr quando disponível', () => {
    const html = `
      <html><body>
        <div itemscope itemtype="https://schema.org/Event">
          <meta itemprop="name" content="Hidden Event Name" />
          <meta itemprop="startDate" content="2026-11-20" />
        </div>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractMicrodata($);

    expect(result).not.toBeNull();
    expect(result.data.nome).toBe('Hidden Event Name');
    expect(result.data.dataInicio).toBe('2026-11-20');
  });
});

describe('Estratégia Heurística', () => {
  it('deve extrair nome do h1 e datas do texto', () => {
    const html = `
      <html><head><title>Evento Teste</title></head>
      <body>
        <h1>Prometheus Meetup 2026</h1>
        <div class="event-date">15/03/2026</div>
        <div class="location">Espaço Cultural, São Paulo</div>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractHeuristic($);

    expect(result).not.toBeNull();
    expect(result.data.nome).toBe('Prometheus Meetup 2026');
    expect(result.data.dataInicio).toBe('2026-03-15');
    expect(result.data.local).toBe('Espaço Cultural, São Paulo');
    expect(result.data.categoria).toBe('Observabilidade');
    expect(result.confidence).toBeLessThanOrEqual(0.55);
  });

  it('deve retornar null quando não há nome nem data', () => {
    const html = '<html><body><p>Conteúdo genérico sem evento</p></body></html>';
    const $ = cheerio.load(html);
    expect(extractHeuristic($)).toBeNull();
  });

  it('deve extrair data em formato português', () => {
    const html = `
      <html><body>
        <h1>Docker Day</h1>
        <p class="date">20 de junho de 2026</p>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractHeuristic($);

    expect(result).not.toBeNull();
    expect(result.data.dataInicio).toBe('2026-06-20');
    expect(result.data.categoria).toBe('Containers');
  });

  it('deve extrair data em formato inglês', () => {
    const html = `
      <html><body>
        <h1>Network Summit</h1>
        <span class="when">March 10, 2026</span>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractHeuristic($);

    expect(result).not.toBeNull();
    expect(result.data.dataInicio).toBe('2026-03-10');
    expect(result.data.categoria).toBe('Redes');
  });

  it('deve usar title como fallback quando não há h1', () => {
    const html = `
      <html><head><title>Cloud Expo 2026</title></head>
      <body>
        <p>Data: 2026-09-01</p>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractHeuristic($);

    expect(result).not.toBeNull();
    expect(result.data.nome).toBe('Cloud Expo 2026');
    expect(result.data.dataInicio).toBe('2026-09-01');
    expect(result.data.categoria).toBe('Cloud');
  });

  it('deve extrair URL canônica', () => {
    const html = `
      <html><head>
        <link rel="canonical" href="https://example.com/event" />
      </head><body>
        <h1>Test Event</h1>
        <time datetime="2026-04-01">1 de abril</time>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractHeuristic($);

    expect(result).not.toBeNull();
    expect(result.data.url).toBe('https://example.com/event');
  });

  it('deve extrair descrição de meta description', () => {
    const html = `
      <html><head>
        <meta name="description" content="Um evento incrível de tecnologia" />
      </head><body>
        <h1>Tech Event</h1>
        <p>2026-02-15</p>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractHeuristic($);

    expect(result).not.toBeNull();
    expect(result.data.descricao).toBe('Um evento incrível de tecnologia');
  });

  it('deve ter confiança menor que outras estratégias', () => {
    const html = `
      <html><body>
        <h1>Kubernetes Day</h1>
        <p>2026-05-20</p>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractHeuristic($);

    expect(result).not.toBeNull();
    expect(result.confidence).toBeLessThanOrEqual(0.55);
  });
});

describe('Todas as estratégias retornam formato correto', () => {
  const html = `
    <html><head>
      <title>DevOps Conference 2026</title>
      <meta property="og:title" content="DevOps Conference 2026" />
      <meta property="event:start_time" content="2026-04-10T09:00:00" />
      <script type="application/ld+json">
      {
        "@type": "Event",
        "name": "DevOps Conference 2026",
        "startDate": "2026-04-10"
      }
      </script>
    </head>
    <body>
      <div itemscope itemtype="https://schema.org/Event">
        <h1 itemprop="name">DevOps Conference 2026</h1>
        <time itemprop="startDate" datetime="2026-04-10">10 de abril</time>
      </div>
    </body></html>
  `;

  const $ = cheerio.load(html);

  const strategies = [
    { name: 'json-ld', fn: extractJsonLd },
    { name: 'opengraph', fn: extractOpenGraph },
    { name: 'microdata', fn: extractMicrodata },
    { name: 'heuristic', fn: extractHeuristic },
  ];

  for (const { name, fn } of strategies) {
    it(`${name} retorna { data, confidence } com formato correto`, () => {
      const result = fn($);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.data).toBe('object');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  }
});
