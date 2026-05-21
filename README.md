# Papo de Sysadmin — Eventos 2026

Calendário de eventos de tecnologia onde o **Papo de Sysadmin** estará presente em 2026. Site estático hospedado no GitHub Pages com gerenciamento de eventos via CLI.

🔗 **Site:** [https://papode.sysadmin.eventos/](https://papode.sysadmin.eventos/)

## Funcionalidades

- Listagem de eventos de tecnologia com filtros por mês, categoria e presença
- Badge de presença confirmada do Papo de Sysadmin (palestrante, participante, organizador, mídia)
- Ordenação por data com prioridade para eventos com presença confirmada
- CLI para gerenciamento de eventos (adicionar, editar, remover, marcar presença)
- Extração automática de dados de eventos a partir de URLs
- Deploy automático via GitHub Actions

## Estrutura do Projeto

```
eventos/
├── index.html                  # Página principal
├── main.js                     # Lógica do frontend (filtros, renderização)
├── styles.css                  # Estilos customizados
├── loader.css                  # Estilos do loader
├── data/
│   └── eventos.json            # Dados dos eventos (fonte de verdade)
├── assets/
│   ├── logo-papo.svg           # Logo do Papo de Sysadmin
│   └── ...                     # Ícones e imagens
├── cli/
│   ├── index.js                # Entry point da CLI
│   ├── package.json            # Dependências da CLI
│   ├── commands/               # Comandos da CLI
│   │   ├── add-url.js          # Adicionar evento via URL
│   │   ├── add.js              # Adicionar evento manualmente
│   │   ├── edit.js             # Editar evento
│   │   ├── list.js             # Listar eventos
│   │   ├── remove.js           # Remover evento
│   │   └── presenca.js         # Marcar presença
│   ├── extractor/              # Extração de metadados de URLs
│   │   ├── index.js            # Orquestrador de extração
│   │   ├── normalizer.js       # Normalização de dados
│   │   └── strategies/         # Estratégias de extração
│   │       ├── json-ld.js      # Extração via JSON-LD
│   │       ├── microdata.js    # Extração via Microdata
│   │       ├── opengraph.js    # Extração via Open Graph
│   │       └── heuristic.js    # Extração via heurísticas
│   ├── validator/
│   │   └── index.js            # Validação de dados de eventos
│   ├── utils/
│   │   └── json-io.js          # Leitura/escrita do arquivo JSON
│   └── __tests__/              # Testes (unit, properties, integration)
├── .github/
│   └── workflows/
│       └── deploy.yml          # Pipeline de deploy (GitHub Actions)
└── README.md
```

## Como Usar a CLI

### Instalação

```bash
cd cli
npm install
```

### Comandos Disponíveis

#### Adicionar evento via URL (extração automática)

```bash
npx eventos add-url https://exemplo.com/evento
```

O extrator acessa a página, extrai metadados (nome, data, local, etc.) e solicita confirmação. Campos não encontrados são solicitados manualmente.

#### Adicionar evento manualmente

```bash
npx eventos add
```

Solicita cada campo obrigatório interativamente (nome, data de início, local, cidade, estado, país, URL, categoria).

#### Listar eventos

```bash
npx eventos list
npx eventos list --presenca   # Apenas eventos com presença confirmada
```

Exibe ID, nome, data de início e status de presença de cada evento.

#### Editar evento

```bash
npx eventos edit <id>
```

Exibe os dados atuais e permite alterar campos individualmente.

#### Remover evento

```bash
npx eventos remove <id>
```

Exibe os dados do evento e solicita confirmação antes de remover.

#### Marcar presença

```bash
npx eventos presenca <id> <tipo>
```

Tipos válidos: `palestrante`, `participante`, `organizador`, `midia`

## Como Adicionar Eventos

### Via CLI (recomendado)

```bash
cd cli
npx eventos add-url https://url-do-evento.com
# ou
npx eventos add
```

### Manualmente (editando JSON)

Edite o arquivo `data/eventos.json` seguindo o schema:

```json
{
  "id": "uuid-v4-gerado",
  "nome": "Nome do Evento",
  "dataInicio": "2026-01-15",
  "dataFim": "2026-01-17",
  "local": "Nome do Local",
  "cidade": "Cidade",
  "estado": "UF",
  "pais": "Brasil",
  "url": "https://site-do-evento.com",
  "categoria": "DevOps",
  "descricao": "Descrição curta (máx 200 caracteres)",
  "presenca": {
    "confirmada": true,
    "tipo": "palestrante"
  }
}
```

**Categorias válidas:** Cloud, DevOps, Seguranca, Infraestrutura, Automacao, Observabilidade, Containers, Linux, Redes, Geral, IA, Desenvolvimento, Dados, Carreira

## Deploy

O deploy é automático via GitHub Actions. Ao fazer push na branch `main` com alterações em:

- `data/eventos.json`
- `index.html`
- `main.js`
- `styles.css`
- `assets/**`

O pipeline publica automaticamente no GitHub Pages. O processo completo leva no máximo 5 minutos.

### Deploy manual

Não é necessário build. O site é estático — basta servir os arquivos da raiz do repositório.

## Desenvolvimento

### Testes

```bash
cd cli
npm test
```

Os testes incluem:
- Testes unitários (Jest)
- Testes de propriedade (fast-check)

### Estrutura de dados

O frontend (`main.js`) carrega `data/eventos.json` via `fetch()` relativo. A CLI (`cli/utils/json-io.js`) lê e escreve no mesmo arquivo usando `path.resolve(__dirname, '../../data/eventos.json')`. Ambos compartilham a mesma fonte de dados.

## Licença

Este trabalho está licenciado com uma Licença [Creative Commons - Atribuição-NãoComercial 4.0 Internacional](http://creativecommons.org/licenses/by-nc/4.0/).

## Créditos

- **Papo de Sysadmin** — [YouTube](https://www.youtube.com/@papode.sysadmin) | [Spotify](https://open.spotify.com/show/papode-sysadmin) | [Twitter/X](https://x.com/papode_sysadmin) | [LinkedIn](https://www.linkedin.com/company/papode-sysadmin)
- Projeto original inspirado em [wagnerfusca/eventos](https://github.com/wagnerfusca/eventos)
