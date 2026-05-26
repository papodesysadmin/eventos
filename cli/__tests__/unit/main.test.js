/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Load main.js source and evaluate it in jsdom context
const mainJsPath = path.resolve(__dirname, '../../../main.js');
const mainJsSource = fs.readFileSync(mainJsPath, 'utf-8');

function setupDOM() {
  document.body.innerHTML = `
    <div id="notice"></div>
    <div id="events-container"></div>
    <div id="category-filters"></div>
    <div id="total-count">0</div>
    <div id="presenca-count">0</div>
    <input type="checkbox" id="presence-filter" />
    <div id="calendar-nav">
      <button id="prev-month"></button>
      <span id="cal-month-title"></span>
      <button id="next-month"></button>
    </div>
    <button class="view-btn active" data-view="calendar"></button>
    <button class="view-btn" data-view="list"></button>
    <div id="modal-overlay" style="display:none">
      <div id="modal-content"></div>
    </div>
  `;
}

function loadApp() {
  if (global.app) delete global.app;
  const script = new Function(mainJsSource + '\nreturn app;');
  return script();
}

describe('EventosApp - main.js', () => {
  let app;

  beforeEach(() => {
    setupDOM();
    global.fetch = jest.fn();
    app = loadApp();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
  });

  describe('loadEvents()', () => {
    it('should render events when JSON is valid and non-empty', async () => {
      const mockEvents = [
        {
          id: '123',
          nome: 'KubeCon 2026',
          dataInicio: '2026-03-15',
          dataFim: '2026-03-17',
          local: 'Centro de Convenções',
          cidade: 'São Paulo',
          estado: 'SP',
          pais: 'Brasil',
          url: 'https://kubecon.io',
          categoria: 'Containers'
        }
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockEvents
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const container = document.getElementById('events-container');
      expect(container.innerHTML).toContain('KubeCon 2026');
    });

    it('should show error for malformed JSON', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => { throw new SyntaxError('Unexpected token'); }
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const notice = document.getElementById('notice');
      expect(notice.textContent).toContain('formato inválido');
    });

    it('should show error when response is not an array', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] })
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const notice = document.getElementById('notice');
      expect(notice.textContent).toContain('formato inválido');
    });

    it('should show message for empty array', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => []
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const notice = document.getElementById('notice');
      expect(notice.textContent).toContain('Nenhum evento disponível');
    });

    it('should show error when fetch fails (network error)', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const notice = document.getElementById('notice');
      expect(notice.textContent).toContain('Não foi possível carregar');
    });

    it('should show error when response is not ok (404/500)', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const notice = document.getElementById('notice');
      expect(notice.textContent).toContain('Não foi possível carregar');
    });
  });

  describe('Calendar rendering', () => {
    it('should render calendar grid with event names', async () => {
      const events = [{
        id: '1',
        nome: 'Test Event',
        dataInicio: '2026-03-20',
        local: 'Venue',
        cidade: 'City',
        estado: 'ST',
        pais: 'Brasil',
        url: 'https://example.com',
        categoria: 'Cloud'
      }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const container = document.getElementById('events-container');
      expect(container.innerHTML).toContain('Test Event');
    });

    it('should render category color in event chip', async () => {
      const events = [{
        id: '1',
        nome: 'DevOps Day',
        dataInicio: '2026-03-10',
        local: 'Online',
        cidade: 'São Paulo',
        estado: 'SP',
        pais: 'Brasil',
        url: 'https://devopsday.com',
        categoria: 'DevOps'
      }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const container = document.getElementById('events-container');
      // DevOps color is #0da58d
      expect(container.innerHTML).toContain('#0da58d');
    });

    it('should use default category color for unknown categories', async () => {
      const events = [{
        id: '1',
        nome: 'Unknown Cat Event',
        dataInicio: '2026-03-01',
        local: 'Place',
        cidade: 'City',
        estado: 'ST',
        pais: 'Brasil',
        url: 'https://example.com',
        categoria: 'UnknownCategory'
      }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const container = document.getElementById('events-container');
      // Default/Geral color is #a14360
      expect(container.innerHTML).toContain('#a14360');
    });

    it('should escape HTML in event names to prevent XSS', async () => {
      const events = [{
        id: '1',
        nome: '<script>alert("xss")</script>',
        dataInicio: '2026-03-01',
        local: 'Place',
        cidade: 'City',
        estado: 'ST',
        pais: 'Brasil',
        url: 'https://example.com',
        categoria: 'Geral'
      }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const container = document.getElementById('events-container');
      // The event chip text content should show escaped text, not execute script
      const chip = container.querySelector('.event-chip');
      expect(chip).not.toBeNull();
      // Text content should contain the literal characters, not execute
      expect(chip.textContent).toContain('<script>');
      // But the innerHTML of the chip should have escaped entities
      expect(chip.innerHTML).toContain('&lt;script&gt;');
    });

    it('should show presence ring for events with presenca.confirmada', async () => {
      const events = [{
        id: '1',
        nome: 'KubeCon 2026',
        dataInicio: '2026-03-15',
        local: 'Centro de Convenções',
        cidade: 'São Paulo',
        estado: 'SP',
        pais: 'Brasil',
        url: 'https://kubecon.io',
        categoria: 'Containers',
        presenca: { confirmada: true, tipo: 'palestrante' }
      }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const container = document.getElementById('events-container');
      expect(container.innerHTML).toContain('ring-2 ring-presence');
    });

    it('should NOT show presence ring when presenca.confirmada is false', async () => {
      const events = [{
        id: '1',
        nome: 'Linux Conf',
        dataInicio: '2026-03-01',
        local: 'Centro de Eventos',
        cidade: 'Porto Alegre',
        estado: 'RS',
        pais: 'Brasil',
        url: 'https://linuxconf.br',
        categoria: 'Linux',
        presenca: { confirmada: false, tipo: 'participante' }
      }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const container = document.getElementById('events-container');
      expect(container.innerHTML).not.toContain('ring-presence');
    });

    it('should NOT show presence ring when presenca is absent', async () => {
      const events = [{
        id: '1',
        nome: 'Cloud Summit',
        dataInicio: '2026-03-15',
        local: 'Hotel',
        cidade: 'Rio',
        estado: 'RJ',
        pais: 'Brasil',
        url: 'https://cloudsummit.io',
        categoria: 'Cloud'
      }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      const container = document.getElementById('events-container');
      expect(container.innerHTML).not.toContain('ring-presence');
    });
  });

  describe('List view rendering', () => {
    it('should render list view with presence badge', async () => {
      const events = [{
        id: '1',
        nome: 'KubeCon 2026',
        dataInicio: '2026-03-15',
        local: 'Centro de Convenções',
        cidade: 'São Paulo',
        estado: 'SP',
        pais: 'Brasil',
        url: 'https://kubecon.io',
        categoria: 'Containers',
        presenca: { confirmada: true, tipo: 'palestrante' }
      }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Switch to list view
      const listBtn = document.querySelector('[data-view="list"]');
      listBtn.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      const container = document.getElementById('events-container');
      expect(container.innerHTML).toContain('KubeCon 2026');
      expect(container.innerHTML).toContain('palestrante');
      expect(container.innerHTML).toContain('bg-presence');
    });

    it('should render location info in list view', async () => {
      const events = [{
        id: '1',
        nome: 'Linux Conf',
        dataInicio: '2026-03-01',
        local: 'Centro de Eventos',
        cidade: 'Porto Alegre',
        estado: 'RS',
        pais: 'Brasil',
        url: 'https://linuxconf.br',
        categoria: 'Linux'
      }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Switch to list view
      const listBtn = document.querySelector('[data-view="list"]');
      listBtn.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      const container = document.getElementById('events-container');
      expect(container.innerHTML).toContain('Porto Alegre');
      expect(container.innerHTML).toContain('RS');
    });

    it('should render event link with target blank in list view', async () => {
      const events = [{
        id: '1',
        nome: 'Cloud Summit',
        dataInicio: '2026-03-15',
        local: 'Hotel',
        cidade: 'Rio',
        estado: 'RJ',
        pais: 'Brasil',
        url: 'https://cloudsummit.io',
        categoria: 'Cloud'
      }];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Switch to list view
      const listBtn = document.querySelector('[data-view="list"]');
      listBtn.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      const container = document.getElementById('events-container');
      expect(container.innerHTML).toContain('href="https://cloudsummit.io"');
      expect(container.innerHTML).toContain('target="_blank"');
    });

    it('should show all tipo values in presence badge', async () => {
      const tipos = ['palestrante', 'participante', 'organizador', 'midia'];
      const events = tipos.map((tipo, i) => ({
        id: String(i),
        nome: 'Event ' + tipo,
        dataInicio: '2026-03-0' + (i + 1),
        local: 'Place',
        cidade: 'City',
        estado: 'ST',
        pais: 'Brasil',
        url: 'https://example.com',
        categoria: 'Geral',
        presenca: { confirmada: true, tipo }
      }));

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Switch to list view
      const listBtn = document.querySelector('[data-view="list"]');
      listBtn.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      const container = document.getElementById('events-container');
      tipos.forEach(tipo => {
        expect(container.innerHTML).toContain(tipo);
      });
    });
  });

  describe('Stats and counters', () => {
    it('should update total count', async () => {
      const events = [
        { id: '1', nome: 'A', dataInicio: '2026-03-01', local: 'L', cidade: 'C', estado: 'SP', pais: 'Brasil', url: 'https://a.com', categoria: 'Cloud' },
        { id: '2', nome: 'B', dataInicio: '2026-04-01', local: 'L', cidade: 'C', estado: 'SP', pais: 'Brasil', url: 'https://b.com', categoria: 'DevOps' },
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(document.getElementById('total-count').textContent).toBe('2');
    });

    it('should update presenca count', async () => {
      const events = [
        { id: '1', nome: 'A', dataInicio: '2026-03-01', local: 'L', cidade: 'C', estado: 'SP', pais: 'Brasil', url: 'https://a.com', categoria: 'Cloud', presenca: { confirmada: true, tipo: 'palestrante' } },
        { id: '2', nome: 'B', dataInicio: '2026-04-01', local: 'L', cidade: 'C', estado: 'SP', pais: 'Brasil', url: 'https://b.com', categoria: 'DevOps' },
        { id: '3', nome: 'C', dataInicio: '2026-05-01', local: 'L', cidade: 'C', estado: 'SP', pais: 'Brasil', url: 'https://c.com', categoria: 'Linux', presenca: { confirmada: true, tipo: 'organizador' } },
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => events
      });

      app.init();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(document.getElementById('presenca-count').textContent).toBe('2');
    });
  });

  describe('No Google Sheets references', () => {
    it('should not contain any Google Sheets API references', () => {
      expect(mainJsSource).not.toContain('API_KEY');
      expect(mainJsSource).not.toContain('API_BASE');
      expect(mainJsSource).not.toContain('script.google.com');
      expect(mainJsSource).not.toContain('Google');
      expect(mainJsSource).not.toContain('google');
    });

    it('should fetch from data/eventos.json', () => {
      expect(mainJsSource).toContain("fetch('data/eventos.json')");
    });
  });
});
