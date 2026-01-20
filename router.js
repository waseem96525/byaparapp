// ===================================
// ROUTER & NAVIGATION
// ===================================

const Router = {
  routes: {},
  currentRoute: 'dashboard',

  // Initialize router
  init() {
    // Define routes
    this.routes = {
      dashboard: (params) => this.renderDashboard(params),
      parties: (params) => this.renderParties(params),
      'party-detail': (params) => this.renderPartyDetail(params),
      'add-party': (params) => this.renderAddParty(params),
      items: (params) => this.renderItems(params),
      'add-item': (params) => this.renderAddItem(params),
      billing: (params) => this.renderBilling(params),
      'create-invoice': (params) => this.renderCreateInvoice(params),
      'invoice-detail': (params) => this.renderInvoiceDetail(params),
      reports: (params) => this.renderReports(params),
      settings: (params) => this.renderSettings(params),
      login: (params) => this.renderLogin(params),
      setup: (params) => this.renderSetup(params)
    };

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.route) {
        this.navigate(e.state.route, e.state.params, false);
      }
    });
  },

  // Navigate to route
  navigate(route, params = {}, pushState = true) {
    this.currentRoute = route;

    if (pushState) {
      history.pushState({ route, params }, '', `#${route}`);
    }

    const renderFunc = this.routes[route];
    if (renderFunc) {
      renderFunc.call(this, params);
    } else {
      this.navigate('dashboard');
    }
  },

  // Go back
  back() {
    history.back();
  },

  // Render app shell
  renderAppShell() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="top-bar">
        <h1 id="page-title">BizBiller</h1>
        <div class="actions">
          <button class="icon-btn" onclick="Router.navigate('settings')">
            <i class="fas fa-cog"></i>
          </button>
        </div>
      </div>
      
      <div id="page-content" class="page-content"></div>
      
      <nav class="bottom-nav">
        <a href="#" class="nav-item active" data-route="dashboard">
          <i class="fas fa-home"></i>
          <span>Home</span>
        </a>
        <a href="#" class="nav-item" data-route="billing">
          <i class="fas fa-file-invoice"></i>
          <span>Bills</span>
        </a>
        <a href="#" class="nav-item" data-route="parties">
          <i class="fas fa-users"></i>
          <span>Parties</span>
        </a>
        <a href="#" class="nav-item" data-route="items">
          <i class="fas fa-box"></i>
          <span>Items</span>
        </a>
        <a href="#" class="nav-item" data-route="reports">
          <i class="fas fa-chart-bar"></i>
          <span>Reports</span>
        </a>
      </nav>
    `;

    // Add navigation listeners
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = item.getAttribute('data-route');
        
        // Update active state
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        this.navigate(route);
      });
    });
  },

  // Update page title
  setTitle(title) {
    document.getElementById('page-title').textContent = title;
  },

  // Get content container
  getContentContainer() {
    return document.getElementById('page-content');
  },

  // Render login page
  renderLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="login-container" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--background);">
        <div class="card" style="max-width: 400px; width: 90%; text-align: center;">
          <div style="padding: 32px;">
            <i class="fas fa-calculator" style="font-size: 64px; color: var(--primary-color); margin-bottom: 16px;"></i>
            <h1 style="margin-bottom: 8px;">BizBiller</h1>
            <p style="color: var(--text-secondary); margin-bottom: 32px;">Enter your PIN to continue</p>
            
            <form id="login-form">
              <div class="form-group">
                <input type="password" id="pin-input" class="form-control" placeholder="Enter 4-digit PIN" 
                       maxlength="4" pattern="[0-9]{4}" style="text-align: center; font-size: 24px; letter-spacing: 8px;" required>
              </div>
              <button type="submit" class="btn btn-primary btn-block btn-lg">Login</button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = document.getElementById('pin-input').value;
      
      const result = await Auth.login(pin);
      if (result.success) {
        // Reload the page to properly initialize everything
        window.location.reload();
      } else {
        Utils.showToast(result.error || 'Invalid PIN');
        document.getElementById('pin-input').value = '';
      }
    });
  },

  // Render setup page (first time)
  renderSetup() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="setup-container" style="min-height: 100vh; padding: 24px; background: var(--background);">
        <div class="card" style="max-width: 500px; margin: 0 auto;">
          <div style="padding: 24px;">
            <h1 style="margin-bottom: 8px;"><i class="fas fa-store"></i> Business Setup</h1>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">Let's set up your business profile</p>
            
            <form id="setup-form">
              <div class="form-group">
                <label class="form-label">Business Name *</label>
                <input type="text" id="business-name" class="form-control" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Owner Name *</label>
                <input type="text" id="owner-name" class="form-control" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Phone Number *</label>
                <input type="tel" id="phone" class="form-control" placeholder="10-digit mobile number" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" id="email" class="form-control">
              </div>
              
              <div class="form-group">
                <label class="form-label">Address</label>
                <textarea id="address" class="form-control" rows="3"></textarea>
              </div>
              
              <div class="form-group">
                <label class="form-label">GSTIN (Optional)</label>
                <input type="text" id="gstin" class="form-control" placeholder="15-digit GST number">
              </div>
              
              <div class="form-group">
                <label class="form-label">Set 4-digit PIN *</label>
                <input type="password" id="pin" class="form-control" maxlength="4" pattern="[0-9]{4}" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Confirm PIN *</label>
                <input type="password" id="confirm-pin" class="form-control" maxlength="4" pattern="[0-9]{4}" required>
              </div>
              
              <button type="submit" class="btn btn-primary btn-block btn-lg">
                <i class="fas fa-check"></i> Complete Setup
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.getElementById('setup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const pin = document.getElementById('pin').value;
      const confirmPin = document.getElementById('confirm-pin').value;
      
      if (pin !== confirmPin) {
        Utils.showToast('PINs do not match');
        return;
      }
      
      const businessData = {
        name: document.getElementById('business-name').value,
        ownerName: document.getElementById('owner-name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,
        gstin: document.getElementById('gstin').value,
        pin: pin
      };
      
      const result = await Auth.setupBusiness(businessData);
      if (result.success) {
        Utils.showToast('Business setup completed!');
        // Reload the page to properly initialize everything
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        Utils.showToast(result.error || 'Setup failed');
      }
    });
  },

  // Render dashboard (placeholder for now)
  renderDashboard() {
    this.setTitle('Dashboard');
    const content = this.getContentContainer();
    content.innerHTML = '<div class="container"><h2>Dashboard</h2><p>Loading...</p></div>';
  },

  // Render parties (placeholder)
  renderParties() {
    this.setTitle('Parties');
    const content = this.getContentContainer();
    content.innerHTML = '<div class="container"><h2>Parties</h2><p>Loading...</p></div>';
  },

  // Render items (placeholder)
  renderItems() {
    this.setTitle('Items');
    const content = this.getContentContainer();
    content.innerHTML = '<div class="container"><h2>Items</h2><p>Loading...</p></div>';
  },

  // Render billing (placeholder)
  renderBilling() {
    this.setTitle('Bills');
    const content = this.getContentContainer();
    content.innerHTML = '<div class="container"><h2>Bills</h2><p>Loading...</p></div>';
  },

  // Render reports (placeholder)
  renderReports() {
    this.setTitle('Reports');
    const content = this.getContentContainer();
    content.innerHTML = '<div class="container"><h2>Reports</h2><p>Loading...</p></div>';
  },

  // Render settings (placeholder)
  renderSettings() {
    this.setTitle('Settings');
    const content = this.getContentContainer();
    content.innerHTML = '<div class="container"><h2>Settings</h2><p>Loading...</p></div>';
  }
};
