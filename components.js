// ===================================
// REUSABLE UI COMPONENTS
// ===================================

const Components = {
  // Dashboard component
  renderDashboard: async function() {
    try {
      // If auth state didn't initialize correctly, don't hard-crash the dashboard.
      if (!Auth || !Auth.currentBusiness || !Auth.currentBusiness.id) {
        return `
          <div class="container">
            <h2 class="mb-2">Dashboard</h2>
            <div class="card">
              <div class="card-body">
                <p style="color: var(--text-secondary);">Session not ready. Please log in again.</p>
                <button class="btn btn-primary" onclick="Auth.logout(); window.location.reload();">Go to Login</button>
              </div>
            </div>
          </div>
        `;
      }

      const today = Utils.getTodayDate();
      const { startDate: monthStart } = Utils.getDateRange('thisMonth');

      let todaysSalesTotal = 0;
      let monthSalesTotal = 0;
      let outstandingReport = { totalReceivable: 0, totalPayable: 0 };
      let pendingInvoices = [];

      try {
        const todaysSales = await Billing.getByDateRange(today, today, 'sale');
        todaysSalesTotal = todaysSales.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      } catch (e) {
        console.warn('Dashboard: todays sales failed', e);
      }

      try {
        const monthSales = await Billing.getByDateRange(monthStart, today, 'sale');
        monthSalesTotal = monthSales.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      } catch (e) {
        console.warn('Dashboard: month sales failed', e);
      }

      try {
        outstandingReport = await Reports.getPartyOutstandingReport();
      } catch (e) {
        console.warn('Dashboard: outstanding failed', e);
      }

      try {
        pendingInvoices = await Billing.getPendingInvoices();
      } catch (e) {
        console.warn('Dashboard: pending invoices failed', e);
      }

      const pendingCount = pendingInvoices.length;

      return `
      <div class="container">
        <h2 class="mb-2">Dashboard</h2>
        
        <div class="dashboard-cards">
          <div class="stat-card success">
            <div class="label">Today's Sales</div>
            <div class="value">${Utils.formatCurrency(todaysSalesTotal)}</div>
            <i class="fas fa-rupee-sign icon"></i>
          </div>
          
          <div class="stat-card info">
            <div class="label">This Month</div>
            <div class="value">${Utils.formatCurrency(monthSalesTotal)}</div>
            <i class="fas fa-chart-line icon"></i>
          </div>
          
          <div class="stat-card warning">
            <div class="label">To Receive</div>
            <div class="value">${Utils.formatCurrency(outstandingReport.totalReceivable)}</div>
            <i class="fas fa-arrow-down icon"></i>
          </div>
          
          <div class="stat-card danger">
            <div class="label">To Pay</div>
            <div class="value">${Utils.formatCurrency(outstandingReport.totalPayable)}</div>
            <i class="fas fa-arrow-up icon"></i>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Quick Actions</h3>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
              <button class="btn btn-primary" onclick="Router.navigate('create-invoice', {type: 'sale'})">
                <i class="fas fa-plus"></i> New Sale
              </button>
              <button class="btn btn-outline" onclick="Router.navigate('add-party', {type: 'customer'})">
                <i class="fas fa-user-plus"></i> Add Party
              </button>
              <button class="btn btn-outline" onclick="Router.navigate('add-item')">
                <i class="fas fa-box"></i> Add Item
              </button>
              <button class="btn btn-outline" onclick="Router.navigate('reports')">
                <i class="fas fa-chart-bar"></i> Reports
              </button>
            </div>
          </div>
        </div>

        ${pendingCount > 0 ? `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Pending Payments (${pendingCount})</h3>
            <a href="#" onclick="Router.navigate('billing'); return false;">View All</a>
          </div>
          <div class="list">
            ${pendingInvoices.slice(0, 5).map(inv => `
              <div class="list-item" onclick="Router.navigate('invoice-detail', {id: ${inv.id}})">
                <div class="list-item-content">
                  <div class="list-item-title">${inv.invoiceNo} - ${inv.partyName || 'Cash'}</div>
                  <div class="list-item-subtitle">${Utils.formatDate(inv.date)}</div>
                </div>
                <div class="list-item-action">
                  <div class="list-item-value negative">${Utils.formatCurrency(inv.due)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>

      <button class="fab" onclick="Router.navigate('create-invoice', {type: 'sale'})">
        <i class="fas fa-plus"></i>
      </button>
    `;
    } catch (error) {
      console.error('Dashboard render failed:', error);
      return `
        <div class="container">
          <h2 class="mb-2">Dashboard</h2>
          <div class="card">
            <div class="card-body">
              <h3 style="color: var(--danger-color);">Dashboard failed to load</h3>
              <p style="color: var(--text-secondary);">${error?.message || error}</p>
              <button class="btn btn-primary" onclick="window.location.reload()">Reload</button>
            </div>
          </div>
        </div>
      `;
    }
  },

  // Parties list component
  renderPartiesList: async function(type = null) {
    const parties = await Parties.getAll(type);
    
    if (parties.length === 0) {
      return `
        <div class="container">
          <div class="search-bar">
            <input type="text" placeholder="Search parties..." id="party-search">
            <i class="fas fa-search"></i>
          </div>
          
          <div class="empty-state">
            <i class="fas fa-users"></i>
            <p>No parties yet</p>
            <button class="btn btn-primary" onclick="Router.navigate('add-party')">
              <i class="fas fa-plus"></i> Add Party
            </button>
          </div>
        </div>
        
        <button class="fab" onclick="Router.navigate('add-party')">
          <i class="fas fa-plus"></i>
        </button>
      `;
    }

    return `
      <div class="container">
        <div class="search-bar">
          <input type="text" placeholder="Search parties..." id="party-search" 
                 oninput="Components.searchParties(this.value)">
          <i class="fas fa-search"></i>
        </div>

        <div class="card mb-2">
          <div style="display: flex; gap: 8px; padding: 12px;">
            <button class="btn btn-sm ${!type ? 'btn-primary' : 'btn-outline'}" 
                    onclick="Router.navigate('parties')">All</button>
            <button class="btn btn-sm ${type === 'customer' ? 'btn-primary' : 'btn-outline'}" 
                    onclick="Router.navigate('parties', {type: 'customer'})">Customers</button>
            <button class="btn btn-sm ${type === 'supplier' ? 'btn-primary' : 'btn-outline'}" 
                    onclick="Router.navigate('parties', {type: 'supplier'})">Suppliers</button>
          </div>
        </div>

        <div class="list" id="parties-list">
          ${parties.map(party => `
            <div class="list-item" onclick="Router.navigate('party-detail', {id: ${party.id}})">
              <div class="list-item-content">
                <div class="list-item-title">
                  ${party.name}
                  <span class="badge badge-${party.type === 'customer' ? 'info' : 'warning'}">${party.type}</span>
                </div>
                <div class="list-item-subtitle">${party.phone || ''}</div>
              </div>
              <div class="list-item-action">
                ${party.currentBalance !== 0 ? `
                  <div class="list-item-value ${party.currentBalance > 0 ? 'negative' : 'positive'}">
                    ${Utils.formatCurrency(Math.abs(party.currentBalance))}
                  </div>
                ` : '<span class="text-secondary">₹0</span>'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <button class="fab" onclick="Router.navigate('add-party')">
        <i class="fas fa-plus"></i>
      </button>
    `;
  },

  // Search parties
  searchParties: Utils.debounce(async function(query) {
    if (!query) {
      Router.navigate('parties');
      return;
    }

    const results = await Parties.search(query);
    const listContainer = document.getElementById('parties-list');
    
    if (results.length === 0) {
      listContainer.innerHTML = '<div class="empty-state"><p>No results found</p></div>';
      return;
    }

    listContainer.innerHTML = results.map(party => `
      <div class="list-item" onclick="Router.navigate('party-detail', {id: ${party.id}})">
        <div class="list-item-content">
          <div class="list-item-title">
            ${party.name}
            <span class="badge badge-${party.type === 'customer' ? 'info' : 'warning'}">${party.type}</span>
          </div>
          <div class="list-item-subtitle">${party.phone || ''}</div>
        </div>
        <div class="list-item-action">
          ${party.currentBalance !== 0 ? `
            <div class="list-item-value ${party.currentBalance > 0 ? 'negative' : 'positive'}">
              ${Utils.formatCurrency(Math.abs(party.currentBalance))}
            </div>
          ` : '<span class="text-secondary">₹0</span>'}
        </div>
      </div>
    `).join('');
  }, 300),

  // Items list component
  renderItemsList: async function() {
    const items = await Items.getAll();
    
    if (items.length === 0) {
      return `
        <div class="container">
          <div class="search-bar">
            <input type="text" placeholder="Search items..." id="item-search">
            <i class="fas fa-search"></i>
          </div>
          
          <div class="empty-state">
            <i class="fas fa-box"></i>
            <p>No items yet</p>
            <button class="btn btn-primary" onclick="Router.navigate('add-item')">
              <i class="fas fa-plus"></i> Add Item
            </button>
          </div>
        </div>
        
        <button class="fab" onclick="Router.navigate('add-item')">
          <i class="fas fa-plus"></i>
        </button>
      `;
    }

    const lowStockItems = await Items.getLowStockItems();
    const lowStockLimit = await Auth.getSetting('lowStockAlert') || 10;

    return `
      <div class="container">
        <div class="search-bar">
          <input type="text" placeholder="Search items..." id="item-search" 
                 oninput="Components.searchItems(this.value)">
          <i class="fas fa-search"></i>
        </div>

        ${lowStockItems.length > 0 ? `
        <div class="alert alert-warning mb-2">
          <i class="fas fa-exclamation-triangle"></i>
          <span>${lowStockItems.length} item(s) low on stock</span>
        </div>
        ` : ''}

        <div class="list" id="items-list">
          ${items.map(item => `
            <div class="list-item" onclick="Router.navigate('add-item', {id: ${item.id}})">
              <div class="list-item-content">
                <div class="list-item-title">${item.name}</div>
                <div class="list-item-subtitle">
                  Stock: ${item.currentStock} ${item.unit || 'pcs'} | 
                  Price: ${Utils.formatCurrency(item.salePrice)}
                  ${item.currentStock <= lowStockLimit ? 
                    '<span class="badge badge-warning">Low Stock</span>' : ''}
                </div>
              </div>
              <div class="list-item-action">
                <i class="fas fa-chevron-right text-secondary"></i>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <button class="fab" onclick="Router.navigate('add-item')">
        <i class="fas fa-plus"></i>
      </button>
    `;
  },

  // Search items
  searchItems: Utils.debounce(async function(query) {
    if (!query) {
      Router.navigate('items');
      return;
    }

    const results = await Items.search(query);
    const listContainer = document.getElementById('items-list');
    
    if (results.length === 0) {
      listContainer.innerHTML = '<div class="empty-state"><p>No results found</p></div>';
      return;
    }

    listContainer.innerHTML = results.map(item => `
      <div class="list-item" onclick="Router.navigate('add-item', {id: ${item.id}})">
        <div class="list-item-content">
          <div class="list-item-title">${item.name}</div>
          <div class="list-item-subtitle">
            Stock: ${item.currentStock} ${item.unit || 'pcs'} | 
            Price: ${Utils.formatCurrency(item.salePrice)}
          </div>
        </div>
        <div class="list-item-action">
          <i class="fas fa-chevron-right text-secondary"></i>
        </div>
      </div>
    `).join('');
  }, 300),

  // Billing list component
  renderBillingList: async function() {
    const invoices = await Billing.getAll('sale');
    invoices.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (invoices.length === 0) {
      return `
        <div class="container">
          <div class="empty-state">
            <i class="fas fa-file-invoice"></i>
            <p>No invoices yet</p>
            <button class="btn btn-primary" onclick="Router.navigate('create-invoice', {type: 'sale'})">
              <i class="fas fa-plus"></i> Create Invoice
            </button>
          </div>
        </div>
        
        <button class="fab" onclick="Router.navigate('create-invoice', {type: 'sale'})">
          <i class="fas fa-plus"></i>
        </button>
      `;
    }

    return `
      <div class="container">
        <div class="list">
          ${invoices.slice(0, 50).map(inv => `
            <div class="list-item" onclick="Router.navigate('invoice-detail', {id: ${inv.id}})">
              <div class="list-item-content">
                <div class="list-item-title">
                  ${inv.invoiceNo} - ${inv.partyName || 'Cash Sale'}
                  <span class="badge badge-${inv.status === 'paid' ? 'success' : inv.status === 'partial' ? 'warning' : 'danger'}">
                    ${inv.status}
                  </span>
                </div>
                <div class="list-item-subtitle">
                  ${Utils.formatDate(inv.date)} | ${Utils.formatCurrency(inv.grandTotal)}
                </div>
              </div>
              <div class="list-item-action">
                <i class="fas fa-chevron-right text-secondary"></i>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <button class="fab" onclick="Router.navigate('create-invoice', {type: 'sale'})">
        <i class="fas fa-plus"></i>
      </button>
    `;
  }
};
