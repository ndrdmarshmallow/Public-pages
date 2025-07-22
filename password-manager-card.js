class PasswordManagerCard extends HTMLElement {

  setConfig(config) {
    this._config = config;
    this._modalApp = null;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 2;
  }

  _getPassword(entity) {
    return this._hass.states[entity]?.state ?? '';
  }

  _setPassword(entity, value) {
    this._hass.callService('input_text', 'set_value', { entity_id: entity, value });
  }

  _generatePassword(length = 12, use_numbers = true, use_symbols = true) {
    let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (use_numbers) chars += '0123456789';
    if (use_symbols) chars += '!@#$%^&*';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }

  _copy(text) {
    navigator.clipboard.writeText(text);
  }

  openModal(app) {
    this._modalApp = app;
    this._modalPassword = this._getPassword(app.entity);
    this.render();
  }

  closeModal() {
    this._modalApp = null;
    this.render();
  }

  saveModalPassword() {
    if (this._modalApp) {
      this._setPassword(this._modalApp.entity, this._modalPassword);
      this.closeModal();
    }
  }

  generateInModal() {
    if (this._modalApp) {
      this._modalPassword = this._generatePassword(
        this._modalApp.password_length || 12,
        this._modalApp.use_numbers,
        this._modalApp.use_symbols
      );
      this._copy(this._modalPassword);
      this.render();
    }
  }

  render() {
    if (!this._hass || !this._config) return;

    const apps = this._config.apps || [];
    let html = `
      <style>
        .card { padding: 16px; }
        .app-tile { margin-bottom: 1em; border: 1px solid #ccc; border-radius: 10px; padding: 12px; }
        .app-title { font-weight: bold; }
        button { margin: 4px 4px 4px 0; }
        .modal {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white; padding: 20px; border-radius: 12px; width: 300px;
        }
        input { width: 100%; margin: 0.5em 0; }
      </style>
      <ha-card header="Password Manager">
        <div class="card">
    `;

    apps.forEach(app => {
      const pwd = this._getPassword(app.entity);
      html += `
        <div class="app-tile">
          <div class="app-title">${app.name}</div>
          <button onclick="navigator.clipboard.writeText('${pwd}')">📋 Copy</button>
          <button onclick="this.parentElement.parentElement.parentElement.parentElement.openModal(${JSON.stringify(app).replace(/"/g, '&quot;')})">✏️ Edit</button>
        </div>
      `;
    });

    html += '</div></ha-card>';

    if (this._modalApp) {
      const app = this._modalApp;
      html += `
        <div class="modal" onclick="this.querySelector('.modal-content').parentElement.parentElement.closeModal()">
          <div class="modal-content" onclick="event.stopPropagation()">
            <div><b>${app.name}</b></div>
            <input type="text" value="${this._modalPassword}" oninput="this.parentElement.parentElement.parentElement.parentElement._modalPassword = this.value">
            <button onclick="this.parentElement.parentElement.parentElement.parentElement.generateInModal()">🔄 Generate & Copy</button>
            <button onclick="this.parentElement.parentElement.parentElement.parentElement.saveModalPassword()">💾 Save</button>
            <button onclick="this.parentElement.parentElement.parentElement.parentElement.closeModal()">❌ Cancel</button>
          </div>
        </div>
      `;
    }

    this.innerHTML = html;
  }
}

customElements.define('password-manager-card', PasswordManagerCard);
