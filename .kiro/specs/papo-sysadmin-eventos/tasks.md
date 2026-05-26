# Implementation Plan: Papo de Sysadmin Eventos

## Overview

Modernização do site estático de calendário de eventos para se tornar a página oficial do Papo de Sysadmin. A implementação segue uma abordagem incremental: estrutura do projeto → dados e validação → CLI → frontend → pipeline de deploy → testes de propriedade.

## Tasks

- [x] 1. Configurar estrutura do projeto e dependências
  - [x] 1.1 Criar estrutura de diretórios e inicializar projeto Node.js
    - Criar diretórios: `data/`, `cli/`, `cli/commands/`, `cli/extractor/`, `cli/extractor/strategies/`, `cli/validator/`, `cli/utils/`, `cli/__tests__/`, `cli/__tests__/properties/`, `cli/__tests__/unit/`, `cli/__tests__/integration/`, `assets/`, `.github/workflows/`
    - Criar `cli/package.json` com dependências: commander, cheerio, node-fetch, uuid; devDependencies: jest, fast-check
    - Configurar script `test` no package.json para rodar Jest
    - Mover imagens existentes (linkedin.png, medium.png, twitter.png, new.png) para `assets/`
    - _Requisitos: 2.1, 7.1, 7.2_

  - [x] 1.2 Criar arquivo de dados inicial `data/eventos.json`
    - Criar arquivo com array vazio `[]` como conteúdo inicial
    - Garantir codificação UTF-8
    - _Requisitos: 2.1, 2.3_

- [x] 2. Implementar camada de dados e validação
  - [x] 2.1 Implementar módulo de leitura/escrita JSON (`cli/utils/json-io.js`)
    - Função `readEvents()` que lê e faz parsing de `data/eventos.json`
    - Função `writeEvents(events)` que serializa e salva o array de eventos
    - Tratamento de erros para JSON malformado e arquivo inexistente
    - _Requisitos: 2.1, 2.3, 2.4_

  - [x] 2.2 Implementar validador de eventos (`cli/validator/index.js`)
    - Função `validateEvent(event)` que valida campos obrigatórios (nome, dataInicio, local, cidade, estado, pais, url, categoria)
    - Validação de formato de data ISO 8601 (YYYY-MM-DD)
    - Validação de formato de URL
    - Validação de categoria contra lista de valores permitidos
    - Validação de campo `presenca` quando presente (confirmada: boolean, tipo: enum)
    - Validação de `descricao` com máximo de 200 caracteres
    - Função `validateEventsFile(events)` que valida o array completo
    - Retorno de `{ valid, errors }` com lista detalhada de erros
    - _Requisitos: 2.2, 7.7, 7.8_

  - [x] 2.3 Escrever teste de propriedade para round-trip JSON
    - **Property 1: Round-trip de serialização JSON de eventos**
    - **Valida: Requisitos 2.3, 3.7**

  - [x] 2.4 Escrever teste de propriedade para validação de eventos
    - **Property 2: Validação de eventos aceita válidos e rejeita inválidos**
    - **Valida: Requisitos 2.2, 7.7, 7.8**

- [x] 3. Checkpoint - Verificar testes da camada de dados
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

- [x] 4. Implementar extrator de URL
  - [x] 4.1 Implementar estratégias de extração (`cli/extractor/strategies/`)
    - `json-ld.js`: Extrair dados de `<script type="application/ld+json">` com schema.org/Event
    - `opengraph.js`: Extrair de meta tags Open Graph (og:title, event:start_time, etc.)
    - `microdata.js`: Extrair de atributos itemprop/RDFa
    - `heuristic.js`: Extrair via heurísticas de HTML (h1, datas no texto, endereços)
    - Cada estratégia retorna `{ data, confidence }` ou `null`
    - _Requisitos: 3.1, 3.2_

  - [x] 4.2 Implementar normalizador de dados (`cli/extractor/normalizer.js`)
    - Normalizar datas para formato ISO 8601
    - Normalizar nomes de cidades/estados
    - Inferir categoria quando possível
    - Combinar resultados de múltiplas estratégias priorizando por confiança
    - _Requisitos: 3.1, 3.2_

  - [x] 4.3 Implementar módulo principal do extrator (`cli/extractor/index.js`)
    - Função `extractEventFromUrl(url)` que orquestra fetch + parsing + estratégias
    - Timeout de 30 segundos no fetch
    - Tratamento de erros HTTP (4xx/5xx)
    - Retorno de `{ success, data, missingFields, error }`
    - Identificar campos obrigatórios não encontrados
    - Rejeitar páginas sem ao menos nome e data de início
    - _Requisitos: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [x] 4.4 Escrever teste de propriedade para saída do extrator
    - **Property 3: Saída do extrator conforma ao schema de eventos**
    - **Valida: Requisitos 3.2**

  - [x] 4.5 Escrever teste de propriedade para campos faltantes
    - **Property 4: Extrator identifica campos faltantes corretamente**
    - **Valida: Requisitos 3.3, 2.4**

  - [x] 4.6 Escrever teste de propriedade para rejeição de não-eventos
    - **Property 5: Extrator rejeita páginas sem dados de evento**
    - **Valida: Requisitos 3.6**

- [x] 5. Checkpoint - Verificar testes do extrator
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

- [x] 6. Implementar CLI de gerenciamento
  - [x] 6.1 Criar entry point da CLI (`cli/index.js`)
    - Configurar Commander.js com nome "eventos" e versão
    - Registrar todos os subcomandos
    - Configurar bin no package.json para execução global
    - _Requisitos: 7.1, 7.2_

  - [x] 6.2 Implementar comando `add-url` (`cli/commands/add-url.js`)
    - Receber URL como argumento
    - Chamar extrator de URL
    - Exibir dados extraídos para confirmação do usuário
    - Solicitar preenchimento manual de campos faltantes
    - Gerar UUID v4 como identificador
    - Validar e salvar no Arquivo_Eventos
    - Exibir ID gerado ao concluir
    - _Requisitos: 3.1, 3.3, 3.4, 7.1_

  - [x] 6.3 Implementar comando `add` (`cli/commands/add.js`)
    - Solicitar cada campo obrigatório interativamente via prompts
    - Gerar UUID v4 como identificador
    - Validar e salvar no Arquivo_Eventos
    - Exibir ID gerado ao concluir
    - _Requisitos: 7.2_

  - [x] 6.4 Implementar comando `list` (`cli/commands/list.js`)
    - Listar todos os eventos com: ID, nome, data de início, status de presença
    - Opção `--presenca` para filtrar apenas eventos com presença confirmada
    - Formatação tabular na saída
    - _Requisitos: 7.3_

  - [x] 6.5 Implementar comando `edit` (`cli/commands/edit.js`)
    - Receber ID como argumento
    - Exibir dados atuais do evento
    - Permitir alterar campos individualmente
    - Validar antes de salvar
    - Preservar campos não modificados
    - Informar erro se ID não encontrado
    - _Requisitos: 7.4, 7.7, 7.9_

  - [x] 6.6 Implementar comando `remove` (`cli/commands/remove.js`)
    - Receber ID como argumento
    - Exibir dados do evento para confirmação
    - Solicitar confirmação antes de remover
    - Informar erro se ID não encontrado
    - _Requisitos: 7.5, 7.9_

  - [x] 6.7 Implementar comando `presenca` (`cli/commands/presenca.js`)
    - Receber ID e tipo de presença como argumentos
    - Tipos válidos: palestrante, participante, organizador, midia
    - Marcar/desmarcar presença no evento
    - Validar e salvar
    - _Requisitos: 7.6_

  - [x] 6.8 Escrever teste de propriedade para edição preservar campos
    - **Property 11: Edição de evento preserva campos não modificados**
    - **Valida: Requisitos 7.4**

  - [x] 6.9 Escrever teste de propriedade para remoção diminuir lista
    - **Property 12: Remoção de evento diminui a lista**
    - **Valida: Requisitos 7.5**

  - [x] 6.10 Escrever teste de propriedade para listagem completa
    - **Property 13: Listagem CLI exibe todos os eventos**
    - **Valida: Requisitos 7.3**

- [x] 7. Checkpoint - Verificar testes da CLI
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

- [x] 8. Refatorar frontend para carregar dados locais
  - [x] 8.1 Refatorar `main.js` para carregar JSON local
    - Implementar `EventosApp.loadEvents()` que faz fetch de `data/eventos.json`
    - Implementar `EventosApp.renderEvents(events)` para renderizar cards
    - Tratamento de erros: JSON malformado, array vazio, falha no fetch
    - Exibir mensagens de erro apropriadas ao usuário
    - Remover qualquer referência ao Google Sheets
    - _Requisitos: 2.1, 2.4, 2.5, 2.6_

  - [x] 8.2 Implementar ordenação de eventos
    - Implementar `EventosApp.sortEvents(events)` com critérios:
      - Primário: data de início ascendente
      - Secundário: eventos com presença confirmada primeiro (mesma data)
    - _Requisitos: 4.3_

  - [x] 8.3 Implementar badge de presença e renderização de cards
    - Renderizar Badge_Presenca para eventos com `presenca.confirmada = true`
    - Exibir Tipo_Presenca como rótulo textual no badge
    - Cor de fundo e texto exclusivos para o badge (distintos das categorias)
    - Não renderizar badge para eventos sem presença confirmada
    - _Requisitos: 4.1, 4.2_

  - [x] 8.4 Implementar filtros combinados
    - Filtro por mês: dropdown com "Todos os meses" + janeiro a dezembro
    - Filtro por categoria: lista lateral com "Todos" + todas as categorias
    - Filtro por presença: checkbox/toggle "Presença Papo de Sysadmin"
    - Lógica AND entre todos os filtros ativos
    - Exibir contador de resultados acima da lista
    - Exibir contador de presença junto ao filtro de presença
    - Mensagem quando nenhum evento corresponder aos filtros
    - Atualização em tempo real (< 3 segundos)
    - _Requisitos: 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 8.5 Escrever teste de propriedade para badge de presença
    - **Property 6: Badge de presença renderiza corretamente**
    - **Valida: Requisitos 4.1, 4.2**

  - [x] 8.6 Escrever teste de propriedade para ordenação
    - **Property 7: Ordenação de eventos por data e presença**
    - **Valida: Requisitos 4.3**

  - [x] 8.7 Escrever teste de propriedade para filtros AND
    - **Property 8: Filtros combinados aplicam lógica AND**
    - **Valida: Requisitos 4.4, 4.5, 5.4**

  - [x] 8.8 Escrever teste de propriedade para contador de presença
    - **Property 9: Contador de presença é preciso**
    - **Valida: Requisitos 4.6**

  - [x] 8.9 Escrever teste de propriedade para contador de resultados
    - **Property 10: Contador de resultados filtrados é preciso**
    - **Valida: Requisitos 5.5**

- [x] 9. Checkpoint - Verificar testes do frontend
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

- [x] 10. Aplicar rebranding e design responsivo
  - [x] 10.1 Atualizar `index.html` com identidade visual do Papo de Sysadmin
    - Adicionar logotipo no cabeçalho com largura mínima 120px e alt="Papo de Sysadmin"
    - Adicionar links de redes sociais (YouTube, Spotify, Twitter/X, LinkedIn) com aria-label e target="_blank"
    - Atualizar título para "Papo de Sysadmin — Eventos 2026"
    - Adicionar meta tags Open Graph e Twitter Card
    - Implementar fallback de texto para logo não carregada (evento onerror)
    - Atualizar referências de imagens para `assets/`
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 10.2 Atualizar `styles.css` para design responsivo e acessível
    - Aplicar cores do guia de identidade visual
    - Layout coluna única para viewport < 768px, múltiplas colunas para >= 768px
    - Menu hambúrguer para navegação em mobile
    - Fonte mínima 16px para corpo, 14px para texto secundário
    - Contraste mínimo 4.5:1 (WCAG 2.1 AA)
    - Área de toque mínima 44x44px em mobile
    - Sem sobreposição, texto truncado ou scroll horizontal de 320px a 2560px
    - _Requisitos: 1.2, 8.1, 8.2, 8.4, 8.5, 8.6_

- [x] 11. Configurar pipeline de deploy
  - [x] 11.1 Criar workflow GitHub Actions (`.github/workflows/deploy.yml`)
    - Trigger: push na branch principal com alterações em `data/eventos.json` ou arquivos do site
    - Steps: checkout → build → deploy para GitHub Pages
    - Timeout de 5 minutos
    - Status de commit: success/failure
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 12. Integração final e wiring
  - [x] 12.1 Conectar todos os componentes e verificar fluxo completo
    - Garantir que CLI salva no `data/eventos.json` e frontend carrega do mesmo arquivo
    - Verificar que filtros, ordenação e badges funcionam com dados reais
    - Atualizar `README.md` com instruções de uso da CLI e estrutura do projeto
    - Verificar que o pipeline de deploy funciona com a nova estrutura
    - _Requisitos: 2.1, 3.4, 6.1, 6.2_

  - [x] 12.2 Escrever testes de integração do fluxo CLI
    - Testar fluxo: add-url → extração → validação → salva JSON
    - Testar fluxo: add manual → validação → salva JSON
    - Testar fluxo: edit → preserva campos → salva JSON
    - _Requisitos: 3.4, 7.1, 7.2, 7.4_

- [x] 13. Checkpoint final - Verificar todos os testes
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

## Notes

- Tasks marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada task referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Testes de propriedade validam propriedades universais de corretude
- Testes unitários validam exemplos específicos e edge cases
- A linguagem de implementação é JavaScript/Node.js conforme definido no design

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4"] },
    { "id": 3, "tasks": ["4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "6.1"] },
    { "id": 5, "tasks": ["4.4", "4.5", "4.6", "6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["6.5", "6.6", "6.7"] },
    { "id": 7, "tasks": ["6.8", "6.9", "6.10"] },
    { "id": 8, "tasks": ["8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3"] },
    { "id": 10, "tasks": ["8.4"] },
    { "id": 11, "tasks": ["8.5", "8.6", "8.7", "8.8", "8.9"] },
    { "id": 12, "tasks": ["10.1", "10.2", "11.1"] },
    { "id": 13, "tasks": ["12.1"] },
    { "id": 14, "tasks": ["12.2"] }
  ]
}
```
