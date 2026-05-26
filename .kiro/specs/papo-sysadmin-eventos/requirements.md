# Requirements Document

## Introduction

Modernização do site estático de calendário de eventos (fork de wagnerfusca/eventos) para se tornar a página oficial de eventos do "Papo de Sysadmin" — comunidade e podcast brasileiro de sysadmins. O objetivo é promover os eventos de tecnologia que a equipe do Papo de Sysadmin estará presente em 2026, com destaque visual para presença confirmada, e oferecer um fluxo automatizado de cadastro de eventos via URL.

## Glossary

- **Sistema_Eventos**: Aplicação web estática que exibe o calendário de eventos de tecnologia do Papo de Sysadmin
- **Extrator_URL**: Módulo de automação que recebe uma URL de evento e extrai metadados estruturados (nome, data, local, descrição, etc.)
- **Arquivo_Eventos**: Arquivo JSON local que armazena todos os dados dos eventos cadastrados
- **Pipeline_Deploy**: Pipeline de CI/CD (GitHub Actions) que realiza build e deploy automático ao GitHub Pages
- **Painel_Admin**: Interface CLI ou web simplificada para gerenciar o cadastro de eventos
- **Badge_Presenca**: Indicador visual que destaca eventos onde o Papo de Sysadmin terá presença confirmada
- **Tipo_Presenca**: Classificação do tipo de participação do Papo de Sysadmin no evento (palestrante, participante, organizador, mídia)

## Requirements

### Requirement 1: Rebranding para Papo de Sysadmin

**User Story:** Como visitante do site, eu quero ver a identidade visual do Papo de Sysadmin, para que eu reconheça que este é o calendário oficial da comunidade.

#### Acceptance Criteria

1. THE Sistema_Eventos SHALL exibir o logotipo do Papo de Sysadmin no cabeçalho da página com largura mínima de 120px, contendo texto alternativo "Papo de Sysadmin"
2. THE Sistema_Eventos SHALL aplicar as cores definidas no guia de identidade visual do Papo de Sysadmin aos elementos de cabeçalho, rodapé e botões de ação
3. THE Sistema_Eventos SHALL exibir links para as redes sociais do Papo de Sysadmin (YouTube, Spotify, Twitter/X, LinkedIn) no cabeçalho, cada um com atributo aria-label identificando a plataforma de destino e abrindo em nova aba
4. THE Sistema_Eventos SHALL exibir o título "Papo de Sysadmin — Eventos 2026" como título principal da página e como conteúdo da tag HTML title
5. THE Sistema_Eventos SHALL incluir meta tags Open Graph (og:title, og:description, og:image, og:url) e Twitter Card (twitter:card, twitter:title, twitter:description, twitter:image) com o nome "Papo de Sysadmin" e a descrição do calendário de eventos da comunidade
6. IF o logotipo do Papo de Sysadmin não carregar, THEN THE Sistema_Eventos SHALL exibir o texto "Papo de Sysadmin" como fallback visível no cabeçalho

### Requirement 2: Armazenamento Local de Dados em JSON

**User Story:** Como mantenedor do site, eu quero que os dados dos eventos sejam armazenados em arquivos JSON locais no repositório, para que eu não dependa de serviços externos como Google Sheets.

#### Acceptance Criteria

1. THE Sistema_Eventos SHALL carregar os dados de eventos a partir do Arquivo_Eventos no repositório local
2. THE Arquivo_Eventos SHALL armazenar para cada evento os seguintes campos obrigatórios: nome, data de início (formato ISO 8601 YYYY-MM-DD), local, cidade, estado, país, URL do site oficial e categoria; e os seguintes campos opcionais: data de fim (formato ISO 8601 YYYY-MM-DD), descrição curta (máximo de 200 caracteres) e status de presença do Papo de Sysadmin
3. THE Arquivo_Eventos SHALL utilizar o formato JSON com codificação UTF-8 e conter um array de objetos de evento na raiz do documento
4. IF o Arquivo_Eventos contiver JSON malformado ou eventos com campos obrigatórios ausentes, THEN THE Sistema_Eventos SHALL exibir uma mensagem de erro ao usuário indicando a natureza do problema encontrado
5. THE Sistema_Eventos SHALL renderizar a lista de eventos sem realizar chamadas a APIs externas em tempo de execução
6. IF o Arquivo_Eventos contiver zero eventos (array vazio), THEN THE Sistema_Eventos SHALL exibir uma mensagem informando que não há eventos disponíveis

### Requirement 3: Automação de Cadastro via URL

**User Story:** Como mantenedor do site, eu quero colar a URL de um evento e ter os dados extraídos automaticamente, para que o processo de cadastro seja rápido e sem trabalho manual.

#### Acceptance Criteria

1. WHEN uma URL de evento é fornecida ao Extrator_URL, THE Extrator_URL SHALL acessar a página dentro de no máximo 30 segundos e extrair os metadados do evento (nome, data de início, data de fim, local, cidade, estado, país, URL, categoria e descrição)
2. WHEN o Extrator_URL concluir a extração com sucesso, THE Extrator_URL SHALL gerar uma entrada JSON válida compatível com o schema do Arquivo_Eventos
3. WHEN o Extrator_URL não conseguir extrair um campo obrigatório (nome, data de início, data de fim, local, cidade, estado, país, URL ou categoria), THE Extrator_URL SHALL solicitar ao usuário o preenchimento manual de cada campo faltante, indicando quais campos não foram encontrados
4. WHEN o usuário confirmar os dados extraídos, THE Painel_Admin SHALL adicionar a nova entrada ao Arquivo_Eventos
5. IF a URL fornecida não responder dentro de 30 segundos ou retornar erro HTTP, THEN THE Extrator_URL SHALL informar o motivo da falha e solicitar uma URL alternativa
6. IF a página acessada não contiver ao menos o nome e uma data de início identificáveis, THEN THE Extrator_URL SHALL informar que não foi possível reconhecer dados de evento na página e solicitar uma URL alternativa
7. THE Extrator_URL SHALL gerar saída JSON cuja serialização, após parsing e re-serialização, produza um objeto equivalente ao original (propriedade round-trip)

### Requirement 4: Destaque de Presença do Papo de Sysadmin

**User Story:** Como visitante do site, eu quero identificar rapidamente quais eventos terão a presença do Papo de Sysadmin, para que eu possa priorizar esses eventos.

#### Acceptance Criteria

1. WHEN um evento possuir presença confirmada do Papo de Sysadmin, THE Sistema_Eventos SHALL exibir o Badge_Presenca na listagem, visualmente distinto dos demais elementos do evento por meio de cor de fundo e texto exclusivos não utilizados em nenhuma outra categoria
2. THE Badge_Presenca SHALL exibir o Tipo_Presenca como rótulo textual com um dos valores: "palestrante", "participante", "organizador" ou "mídia"
3. THE Sistema_Eventos SHALL ordenar os eventos primeiro por data de início (ascendente) e, entre eventos com a mesma data de início, posicionar eventos com presença confirmada do Papo de Sysadmin antes dos demais
4. WHEN o usuário aplicar o filtro "Presença Papo de Sysadmin", THE Sistema_Eventos SHALL exibir apenas eventos com presença confirmada, mantendo os filtros de categoria, mês e ano já aplicados
5. IF o usuário remover o filtro "Presença Papo de Sysadmin", THEN THE Sistema_Eventos SHALL restaurar a listagem completa respeitando os demais filtros ativos
6. THE Sistema_Eventos SHALL exibir, junto ao filtro "Presença Papo de Sysadmin" na barra lateral de categorias, um contador numérico com o total de eventos com presença confirmada visível sem necessidade de interação do usuário

### Requirement 5: Filtros e Navegação Modernizados

**User Story:** Como visitante do site, eu quero filtrar eventos por mês, categoria e presença do Papo de Sysadmin, para que eu encontre rapidamente os eventos do meu interesse.

#### Acceptance Criteria

1. THE Sistema_Eventos SHALL oferecer filtro por mês do ano (janeiro a dezembro) em formato de lista suspensa com a opção padrão "Todos os meses" pré-selecionada ao carregar a página
2. THE Sistema_Eventos SHALL oferecer filtro por categoria de evento em formato de lista lateral contendo todas as categorias cadastradas no sistema, com a opção "Todos" pré-selecionada ao carregar a página
3. THE Sistema_Eventos SHALL oferecer filtro por presença confirmada do Papo de Sysadmin, permitindo ao usuário selecionar apenas eventos em que a participação do Papo de Sysadmin esteja indicada nos dados do evento
4. WHEN múltiplos filtros forem aplicados simultaneamente, THE Sistema_Eventos SHALL exibir apenas eventos que atendam a todos os critérios selecionados (lógica AND entre filtros)
5. WHEN filtros forem aplicados, THE Sistema_Eventos SHALL atualizar a lista de eventos exibidos em no máximo 3 segundos e exibir o número total de eventos encontrados visível ao usuário acima da lista de resultados
6. WHEN nenhum evento corresponder aos filtros aplicados, THE Sistema_Eventos SHALL exibir uma mensagem visível na área de listagem de eventos informando que não há eventos para os critérios selecionados, em substituição à lista de eventos
7. WHEN o usuário selecionar a opção padrão em todos os filtros, THE Sistema_Eventos SHALL exibir todos os eventos disponíveis sem restrição de categoria, mês ou presença do Papo de Sysadmin

### Requirement 6: Deploy Automatizado via GitHub Actions

**User Story:** Como mantenedor do site, eu quero que o site seja publicado automaticamente quando eu adicionar ou alterar eventos, para que as mudanças fiquem disponíveis sem intervenção manual.

#### Acceptance Criteria

1. WHEN um commit é realizado na branch principal contendo alterações no Arquivo_Eventos, THE Pipeline_Deploy SHALL iniciar o processo de build e deploy automaticamente em até 30 segundos após o push
2. WHEN o Pipeline_Deploy é iniciado, THE Pipeline_Deploy SHALL realizar o build do site estático e publicar o resultado no GitHub Pages
3. IF o build ou o deploy falhar, THEN THE Pipeline_Deploy SHALL marcar o status do commit como "failure" no GitHub, permitindo ao mantenedor identificar a falha sem acessar os logs manualmente
4. THE Pipeline_Deploy SHALL concluir o processo completo (build e deploy) em no máximo 5 minutos após o commit
5. IF o Pipeline_Deploy não concluir em 5 minutos, THEN THE Pipeline_Deploy SHALL cancelar a execução e marcar o status do commit como "failure" no GitHub
6. WHEN o deploy for concluído com sucesso, THE Pipeline_Deploy SHALL marcar o status do commit como "success" no GitHub

### Requirement 7: Interface CLI para Gerenciamento de Eventos

**User Story:** Como mantenedor do site, eu quero uma interface de linha de comando para adicionar, editar e remover eventos, para que eu tenha controle total sobre o conteúdo sem editar JSON manualmente.

#### Acceptance Criteria

1. THE Painel_Admin SHALL oferecer comando para adicionar um novo evento via URL (acionando o Extrator_URL) e, ao concluir com sucesso, exibir o identificador único gerado para o evento
2. THE Painel_Admin SHALL oferecer comando para adicionar um novo evento via preenchimento manual de campos, solicitando cada campo obrigatório interativamente
3. THE Painel_Admin SHALL oferecer comando para listar todos os eventos cadastrados, exibindo identificador, nome, data de início e status de presença de cada evento
4. THE Painel_Admin SHALL oferecer comando para editar um evento existente por identificador, permitindo alterar qualquer campo individualmente
5. THE Painel_Admin SHALL oferecer comando para remover um evento existente por identificador, solicitando confirmação antes de executar a remoção
6. THE Painel_Admin SHALL oferecer comando para marcar ou desmarcar a presença do Papo de Sysadmin em um evento, incluindo o Tipo_Presenca (palestrante, participante, organizador ou mídia)
7. WHEN um evento é adicionado ou modificado via Painel_Admin, THE Painel_Admin SHALL validar os dados antes de salvar no Arquivo_Eventos
8. IF dados obrigatórios estiverem ausentes durante a validação, THEN THE Painel_Admin SHALL informar quais campos estão faltando e não salvar a entrada
9. IF um identificador fornecido não corresponder a nenhum evento existente, THEN THE Painel_Admin SHALL informar que o evento não foi encontrado e não realizar nenhuma alteração

### Requirement 8: Design Responsivo e Moderno

**User Story:** Como visitante do site, eu quero acessar o calendário de eventos em qualquer dispositivo (desktop, tablet, celular), para que eu tenha uma boa experiência independente do dispositivo.

#### Acceptance Criteria

1. THE Sistema_Eventos SHALL renderizar todos os elementos visíveis sem sobreposição de conteúdo, sem texto truncado e sem barra de rolagem horizontal em viewports de 320px a 2560px de largura
2. WHEN o viewport for menor que 768px, THE Sistema_Eventos SHALL exibir o layout em coluna única com a barra de navegação colapsada em menu hambúrguer, e WHEN o viewport for igual ou maior que 768px, THE Sistema_Eventos SHALL exibir o layout em múltiplas colunas com a barra de navegação expandida
3. THE Sistema_Eventos SHALL carregar a página inicial com até 50 eventos visíveis em no máximo 3 segundos em conexão 3G simulada (latência de 100ms, download de 1.6 Mbps, upload de 750 Kbps)
4. THE Sistema_Eventos SHALL utilizar fontes com tamanho mínimo de 16px para texto de corpo e tamanho mínimo de 14px para texto secundário em todos os viewports
5. THE Sistema_Eventos SHALL manter contraste mínimo de 4.5:1 entre texto e fundo conforme WCAG 2.1 nível AA
6. WHILE o viewport for menor que 768px, THE Sistema_Eventos SHALL renderizar todos os elementos interativos (links, botões, campos de seleção) com área de toque mínima de 44x44px
