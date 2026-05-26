'use strict';

const fs = require('fs');
const path = require('path');
const { readEvents, writeEvents, DATA_FILE } = require('../../utils/json-io');

describe('json-io', () => {
  const originalContent = fs.readFileSync(DATA_FILE, 'utf-8');

  afterEach(() => {
    // Restore original file content after each test
    fs.writeFileSync(DATA_FILE, originalContent, 'utf-8');
  });

  describe('readEvents()', () => {
    it('should read and parse a valid JSON array', () => {
      const testEvents = [
        {
          id: 'test-id-1',
          nome: 'Evento Teste',
          dataInicio: '2026-03-15',
          local: 'Centro de Convenções',
          cidade: 'São Paulo',
          estado: 'SP',
          pais: 'Brasil',
          url: 'https://example.com',
          categoria: 'Cloud',
        },
      ];
      fs.writeFileSync(DATA_FILE, JSON.stringify(testEvents), 'utf-8');

      const result = readEvents();
      expect(result).toEqual(testEvents);
    });

    it('should return an empty array when file contains []', () => {
      fs.writeFileSync(DATA_FILE, '[]', 'utf-8');

      const result = readEvents();
      expect(result).toEqual([]);
    });

    it('should throw an error for malformed JSON', () => {
      fs.writeFileSync(DATA_FILE, '{invalid json', 'utf-8');

      expect(() => readEvents()).toThrow(
        'Erro: data/eventos.json está corrompido. Verifique o arquivo.'
      );
    });

    it('should throw an error when file does not exist', () => {
      // Temporarily rename the file
      const tempPath = DATA_FILE + '.bak';
      fs.renameSync(DATA_FILE, tempPath);

      try {
        expect(() => readEvents()).toThrow('Arquivo de eventos não encontrado');
      } finally {
        fs.renameSync(tempPath, DATA_FILE);
      }
    });

    it('should throw an error when JSON root is not an array', () => {
      fs.writeFileSync(DATA_FILE, '{"key": "value"}', 'utf-8');

      expect(() => readEvents()).toThrow(
        'deve conter um array de eventos na raiz do documento'
      );
    });

    it('should throw an error when JSON root is a string', () => {
      fs.writeFileSync(DATA_FILE, '"hello"', 'utf-8');

      expect(() => readEvents()).toThrow(
        'deve conter um array de eventos na raiz do documento'
      );
    });
  });

  describe('writeEvents()', () => {
    it('should serialize and save an array of events', () => {
      const testEvents = [
        {
          id: 'test-id-1',
          nome: 'Evento Teste',
          dataInicio: '2026-03-15',
          local: 'Centro de Convenções',
          cidade: 'São Paulo',
          estado: 'SP',
          pais: 'Brasil',
          url: 'https://example.com',
          categoria: 'Cloud',
        },
      ];

      writeEvents(testEvents);

      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(testEvents);
    });

    it('should save an empty array', () => {
      writeEvents([]);

      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual([]);
    });

    it('should format JSON with 2-space indentation', () => {
      const testEvents = [{ id: 'test-1', nome: 'Evento' }];

      writeEvents(testEvents);

      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      expect(content).toBe(JSON.stringify(testEvents, null, 2) + '\n');
    });

    it('should throw an error when events is not an array', () => {
      expect(() => writeEvents('not an array')).toThrow(
        'O parâmetro events deve ser um array'
      );
      expect(() => writeEvents(null)).toThrow(
        'O parâmetro events deve ser um array'
      );
      expect(() => writeEvents({})).toThrow(
        'O parâmetro events deve ser um array'
      );
    });

    it('should preserve UTF-8 characters', () => {
      const testEvents = [
        {
          id: 'test-utf8',
          nome: 'Conferência São Paulo — Ação & Inovação',
          cidade: 'São Paulo',
        },
      ];

      writeEvents(testEvents);

      const result = readEvents();
      expect(result[0].nome).toBe(
        'Conferência São Paulo — Ação & Inovação'
      );
      expect(result[0].cidade).toBe('São Paulo');
    });
  });
});
