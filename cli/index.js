#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const pkg = require('./package.json');

const program = new Command();

program
  .name('eventos')
  .description('CLI para gerenciamento de eventos do Papo de Sysadmin')
  .version(pkg.version);

program
  .command('add-url <url>')
  .description('Adiciona evento via URL')
  .action(async (url) => {
    const { addFromUrl } = require('./commands/add-url');
    await addFromUrl(url);
  });

program
  .command('add')
  .description('Adiciona evento manualmente')
  .action(async () => {
    const { addManual } = require('./commands/add');
    await addManual();
  });

program
  .command('list')
  .description('Lista eventos')
  .option('--presenca', 'Filtrar apenas eventos com presença confirmada')
  .action(async (options) => {
    const { listEvents } = require('./commands/list');
    await listEvents(options);
  });

program
  .command('edit <id>')
  .description('Edita evento por ID')
  .action(async (id) => {
    const { editEvent } = require('./commands/edit');
    await editEvent(id);
  });

program
  .command('remove <id>')
  .description('Remove evento por ID')
  .action(async (id) => {
    const { removeEvent } = require('./commands/remove');
    await removeEvent(id);
  });

program
  .command('presenca <id> <tipo>')
  .description('Define presença (palestrante, participante, organizador, midia)')
  .action(async (id, tipo) => {
    const { setPresenca } = require('./commands/presenca');
    await setPresenca(id, tipo);
  });

program.parse(process.argv);
