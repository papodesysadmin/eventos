'use strict';

/**
 * Validador de eventos para o Papo de Sysadmin.
 * Valida campos obrigatórios, formatos e valores permitidos.
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

const TIPOS_PRESENCA_VALIDOS = [
  'palestrante',
  'participante',
  'organizador',
  'midia',
];

const CAMPOS_OBRIGATORIOS = [
  'nome',
  'dataInicio',
  'local',
  'cidade',
  'estado',
  'pais',
  'url',
  'categoria',
];

const MAX_DESCRICAO_LENGTH = 200;

/**
 * Valida formato de data ISO 8601 (YYYY-MM-DD)
 * @param {string} dateStr
 * @returns {boolean}
 */
function isValidDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Valida formato de URL
 * @param {string} urlStr
 * @returns {boolean}
 */
function isValidUrl(urlStr) {
  if (typeof urlStr !== 'string') return false;
  try {
    const url = new URL(urlStr);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Valida um objeto de evento contra o schema
 * @param {object} event - Objeto de evento a validar
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateEvent(event) {
  const errors = [];

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { valid: false, errors: ['Evento deve ser um objeto válido'] };
  }

  // Validar campos obrigatórios presentes e não vazios
  for (const campo of CAMPOS_OBRIGATORIOS) {
    if (event[campo] === undefined || event[campo] === null) {
      errors.push(`Campo obrigatório ausente: ${campo}`);
    } else if (typeof event[campo] === 'string' && event[campo].trim() === '') {
      errors.push(`Campo obrigatório não pode ser vazio: ${campo}`);
    }
  }

  // Validar formato de dataInicio
  if (event.dataInicio !== undefined && event.dataInicio !== null) {
    if (!isValidDate(event.dataInicio)) {
      errors.push('Campo dataInicio deve estar no formato ISO 8601 (YYYY-MM-DD)');
    }
  }

  // Validar formato de dataFim (opcional)
  if (event.dataFim !== undefined && event.dataFim !== null) {
    if (!isValidDate(event.dataFim)) {
      errors.push('Campo dataFim deve estar no formato ISO 8601 (YYYY-MM-DD)');
    }
  }

  // Validar formato de URL
  if (event.url !== undefined && event.url !== null && event.url !== '') {
    if (!isValidUrl(event.url)) {
      errors.push('Campo url deve ser uma URL válida (http ou https)');
    }
  }

  // Validar categoria contra lista de valores permitidos
  if (event.categoria !== undefined && event.categoria !== null && event.categoria !== '') {
    if (!CATEGORIAS_VALIDAS.includes(event.categoria)) {
      errors.push(
        `Categoria inválida: "${event.categoria}". Valores permitidos: ${CATEGORIAS_VALIDAS.join(', ')}`
      );
    }
  }

  // Validar descricao (opcional, máximo 200 caracteres)
  if (event.descricao !== undefined && event.descricao !== null) {
    if (typeof event.descricao !== 'string') {
      errors.push('Campo descricao deve ser uma string');
    } else if (event.descricao.length > MAX_DESCRICAO_LENGTH) {
      errors.push(
        `Campo descricao excede o máximo de ${MAX_DESCRICAO_LENGTH} caracteres (atual: ${event.descricao.length})`
      );
    }
  }

  // Validar presenca (opcional)
  if (event.presenca !== undefined && event.presenca !== null) {
    if (typeof event.presenca !== 'object' || Array.isArray(event.presenca)) {
      errors.push('Campo presenca deve ser um objeto');
    } else {
      // Validar confirmada (boolean obrigatório dentro de presenca)
      if (event.presenca.confirmada === undefined || event.presenca.confirmada === null) {
        errors.push('Campo presenca.confirmada é obrigatório');
      } else if (typeof event.presenca.confirmada !== 'boolean') {
        errors.push('Campo presenca.confirmada deve ser um boolean');
      }

      // Validar tipo (enum obrigatório dentro de presenca)
      if (event.presenca.tipo === undefined || event.presenca.tipo === null) {
        errors.push('Campo presenca.tipo é obrigatório');
      } else if (!TIPOS_PRESENCA_VALIDOS.includes(event.presenca.tipo)) {
        errors.push(
          `Tipo de presença inválido: "${event.presenca.tipo}". Valores permitidos: ${TIPOS_PRESENCA_VALIDOS.join(', ')}`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Valida o arquivo completo de eventos
 * @param {object[]} events - Array de eventos
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateEventsFile(events) {
  const errors = [];

  if (!Array.isArray(events)) {
    return { valid: false, errors: ['O arquivo de eventos deve conter um array'] };
  }

  for (let i = 0; i < events.length; i++) {
    const result = validateEvent(events[i]);
    if (!result.valid) {
      for (const error of result.errors) {
        errors.push(`Evento[${i}]: ${error}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateEvent,
  validateEventsFile,
  isValidDate,
  isValidUrl,
  CATEGORIAS_VALIDAS,
  TIPOS_PRESENCA_VALIDOS,
  CAMPOS_OBRIGATORIOS,
  MAX_DESCRICAO_LENGTH,
};
