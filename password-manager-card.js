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
    window.dispatchEvent(new CustomEvent('hass-show-toast', {
      detail: { message: 'Copied to clipboard!' }
    }));
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
    const modalApp = this._modalApp;
    const modalPassword = this._modalPassword ?? '';

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { font-family: var(--primary-font-family); }
        .card { padding: 16px; }
        .app-tile {
          background-color: var(--card-background-color);
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: var(--ha-card-border-radius, 12px);
          padding: 16px;
          margin-bottom: 1em;
          box-shadow: var(--ha-card-box-shadow);
        }
        .app-title {
          font-size: 1.2em;
          font-weight: bold;
          color: var(--primary-text-color);
          margin-bottom: 8px;
        }
        button {
          margin: 8px 8px 8px 0;
          padding: 6px 12px;
          background-color: var(--primary-color);
          color: var(--text-primary-color, #fff);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1em;
        }
        button:hover {
          filter: brightness(1.1);
        }
        input {
          width: 100%;
          padding: 8px;
          font-size: 1em;
          background: var(--input-background-color, #f7f7f7);
          color: var(--primary-text-color);
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 4px;
          margin-bottom: 10px;
        }
        .modal {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: var(--card-background-color);
          color: var(--primary-text-color);
          padding: 20px;
          border-radius: var(--ha-card-border-radius, 12px);
          width: 300px;
          box-shadow: var(--ha-card-box-shadow);
        }
      </style>

      <ha-card header="Password Manager">
        <div class="card">
          ${apps.map((app, index) => `
            <div class="app-tile" data-idx="${index}">
              <div class="app-title">${app.name}</div>
              <button class="copy-btn">Copy Password</button>
              <button class="edit-btn">Edit Password</button>
            </div>
          `).join('')}
        </div>
      </ha-card>

      ${modalApp ? `
        <div class="modal">
          <div class="modal-content">
            <div><b>${modalApp.name}</b></div>
            <input type="text" value="${modalPassword.replace(/"/g, '&quot;')}" id="modal-password">
            <button class="generate-btn">Generate Password</button>
            <button class="save-btn">Save</button>
            <button class="cancel-btn">Cancel</button>
          </div>
        </div>
      ` : ''}
    `;

    this.innerHTML = '';
    this.appendChild(wrapper);

    // Attach tile button listeners
    wrapper.querySelectorAll('.app-tile').forEach(tile => {
      const idx = parseInt(tile.getAttribute('data-idx'));
      const app = apps[idx];

      tile.querySelector('.copy-btn').addEventListener('click', () => {
        const pwd = this._getPassword(app.entity);
        this._copy(pwd);
      });

      tile.querySelector('.edit-btn').addEventListener('click', () => {
        this.openModal(app);
      });
    });

    // Modal listeners
    if (modalApp) {
      wrapper.querySelector('.modal').addEventListener('click', () => this.closeModal());
      wrapper.querySelector('.modal-content').addEventListener('click', e => e.stopPropagation());

      wrapper.querySelector('.generate-btn').addEventListener('click', () => {
        this.generateInModal();
      });

      wrapper.querySelector('.save-btn').addEventListener('click', () => {
        const val = wrapper.querySelector('#modal-password').value;
        this._modalPassword = val;
        this.saveModalPassword();
      });

      wrapper.querySelector('.cancel-btn').addEventListener('click', () => {
        this.closeModal();
      });
    }
  }
}

customElements.define('password-manager-card', PasswordManagerCard);
