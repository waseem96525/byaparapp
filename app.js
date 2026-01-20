// ===================================
// MAIN APP - BizBiller
// ===================================

(async function() {
  'use strict';

  console.log('App starting...');

  // Initialize database
  await db.init();
  console.log('Database initialized');

  // Check if business is set up
  const hasSetup = await Auth.hasBusinessSetup();
  console.log('Has business setup:', hasSetup);

  if (!hasSetup) {
    // First time setup
    Router.init();
    Router.renderSetup();
  } else {
    // Check authentication
    const isAuthenticated = await Auth.init();
    console.log('Is authenticated:', isAuthenticated);

    if (!isAuthenticated) {
      // Show login
      Router.init();
      Router.renderLogin();
    } else {
      console.log('Loading app...');
      // Load app
      Router.init();
      
      // Override Router render methods with full implementations BEFORE navigation
      setupRouterOverrides();
      console.log('Router overrides set up');
      
      Router.renderAppShell();
      console.log('App shell rendered');
      
      // Apply saved theme
      const theme = await Auth.getSetting('theme') || 'light';
      document.documentElement.setAttribute('data-theme', theme);
      
      // Navigate to dashboard
      console.log('Navigating to dashboard...');
      Router.navigate('dashboard');
    }
  }

  // Setup Router overrides function
  function setupRouterOverrides() {
    console.log('Setting up router overrides...');
    Router.renderDashboard = async function() {
      this.setTitle('Dashboard');
      const content = this.getContentContainer();
      try {
        const html = await Components.renderDashboard();
        content.innerHTML = html;
      } catch (error) {
        console.error('Dashboard error:', error);
        content.innerHTML = `
          <div class="container">
            <div class="card">
              <div class="card-body">
                <h3 style="color: #e74c3c;">Error loading dashboard</h3>
                <p>${error?.message || error}</p>
                <button class="btn btn-primary" onclick="location.reload()">Reload</button>
              </div>
            </div>
          </div>
        `;
      }
    };

    Router.renderParties = async function(params = {}) {
      this.setTitle('Parties');
      const content = this.getContentContainer();
      content.innerHTML = await Components.renderPartiesList(params.type);
    };

  Router.renderItems = async function() {
    this.setTitle('Items');
    const content = this.getContentContainer();
    content.innerHTML = await Components.renderItemsList();
  };

  Router.renderBilling = async function() {
    this.setTitle('Bills');
    const content = this.getContentContainer();
    content.innerHTML = await Components.renderBillingList();
  };

  Router.renderAddParty = function(params = {}) {
    this.setTitle(params.id ? 'Edit Party' : 'Add Party');
    const content = this.getContentContainer();
    
    content.innerHTML = `
      <div class="container">
        <form id="party-form">
          <div class="card">
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Party Type *</label>
                <select id="party-type" class="form-control" required>
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Name *</label>
                <input type="text" id="party-name" class="form-control" required>
              </div>

              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input type="tel" id="party-phone" class="form-control" placeholder="10-digit mobile">
              </div>

              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" id="party-email" class="form-control">
              </div>

              <div class="form-group">
                <label class="form-label">Address</label>
                <textarea id="party-address" class="form-control" rows="3"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">GSTIN</label>
                <input type="text" id="party-gstin" class="form-control" maxlength="15">
              </div>

              <div class="form-group">
                <label class="form-label">Opening Balance</label>
                <input type="number" id="party-balance" class="form-control" value="0" step="0.01">
              </div>

              <button type="submit" class="btn btn-primary btn-block">
                <i class="fas fa-save"></i> Save Party
              </button>
            </div>
          </div>
        </form>
      </div>
    `;

    // Handle form submission
    document.getElementById('party-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const partyData = {
        type: document.getElementById('party-type').value,
        name: document.getElementById('party-name').value,
        phone: document.getElementById('party-phone').value,
        email: document.getElementById('party-email').value,
        address: document.getElementById('party-address').value,
        gstin: document.getElementById('party-gstin').value,
        openingBalance: parseFloat(document.getElementById('party-balance').value) || 0
      };

      const result = await Parties.add(partyData);
      if (result.success) {
        Router.back();
      }
    });
  };

  Router.renderAddItem = async function(params = {}) {
    this.setTitle(params.id ? 'Edit Item' : 'Add Item');
    const content = this.getContentContainer();
    
    const categories = await Items.getCategories();
    let item = null;
    
    if (params.id) {
      item = await Items.getById(params.id);
    }

    content.innerHTML = `
      <div class="container">
        <form id="item-form">
          <div class="card">
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Item Name *</label>
                <input type="text" id="item-name" class="form-control" value="${item?.name || ''}" required>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Category</label>
                  <select id="item-category" class="form-control">
                    <option value="">Select Category</option>
                    ${categories.map(cat => `
                      <option value="${cat.id}" ${item?.categoryId === cat.id ? 'selected' : ''}>
                        ${cat.name}
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Unit</label>
                  <select id="item-unit" class="form-control">
                    <option value="pcs" ${item?.unit === 'pcs' ? 'selected' : ''}>Pieces</option>
                    <option value="kg" ${item?.unit === 'kg' ? 'selected' : ''}>Kg</option>
                    <option value="ltr" ${item?.unit === 'ltr' ? 'selected' : ''}>Litre</option>
                    <option value="mtr" ${item?.unit === 'mtr' ? 'selected' : ''}>Meter</option>
                    <option value="box" ${item?.unit === 'box' ? 'selected' : ''}>Box</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Sale Price *</label>
                  <input type="number" id="item-sale-price" class="form-control" 
                         value="${item?.salePrice || ''}" step="0.01" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Purchase Price</label>
                  <input type="number" id="item-purchase-price" class="form-control" 
                         value="${item?.purchasePrice || ''}" step="0.01">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">GST Rate (%)</label>
                  <select id="item-gst" class="form-control">
                    <option value="0" ${item?.gstRate === 0 ? 'selected' : ''}>0%</option>
                    <option value="5" ${item?.gstRate === 5 ? 'selected' : ''}>5%</option>
                    <option value="12" ${item?.gstRate === 12 ? 'selected' : ''}>12%</option>
                    <option value="18" ${item?.gstRate === 18 || !item ? 'selected' : ''}>18%</option>
                    <option value="28" ${item?.gstRate === 28 ? 'selected' : ''}>28%</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">HSN Code</label>
                  <input type="text" id="item-hsn" class="form-control" value="${item?.hsn || ''}">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Opening Stock</label>
                  <input type="number" id="item-stock" class="form-control" 
                         value="${item?.currentStock || 0}" ${item ? 'disabled' : ''}>
                </div>

                <div class="form-group">
                  <label class="form-label">Barcode</label>
                  <input type="text" id="item-barcode" class="form-control" 
                         value="${item?.barcode || ''}" placeholder="Auto-generate">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea id="item-description" class="form-control" rows="2">${item?.description || ''}</textarea>
              </div>

              <div style="display: flex; gap: 12px;">
                <button type="submit" class="btn btn-primary" style="flex: 1;">
                  <i class="fas fa-save"></i> Save Item
                </button>
                ${item ? `
                <button type="button" class="btn btn-danger" onclick="handleDeleteItem(${item.id})">
                  <i class="fas fa-trash"></i>
                </button>
                ` : ''}
              </div>
            </div>
          </div>
        </form>
      </div>
    `;

    // Handle form submission
    document.getElementById('item-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const itemData = {
        name: document.getElementById('item-name').value,
        categoryId: parseInt(document.getElementById('item-category').value) || null,
        unit: document.getElementById('item-unit').value,
        salePrice: parseFloat(document.getElementById('item-sale-price').value),
        purchasePrice: parseFloat(document.getElementById('item-purchase-price').value) || 0,
        gstRate: parseInt(document.getElementById('item-gst').value),
        hsn: document.getElementById('item-hsn').value,
        barcode: document.getElementById('item-barcode').value || Items.generateBarcode(),
        description: document.getElementById('item-description').value,
        openingStock: item ? item.currentStock : parseFloat(document.getElementById('item-stock').value) || 0
      };

      let result;
      if (item) {
        result = await Items.update(item.id, itemData);
      } else {
        result = await Items.add(itemData);
      }

      if (result.success) {
        if (item) {
          Router.back();
        } else {
          Router.navigate('items');
        }
      }
    });

    // Delete item handler
    window.handleDeleteItem = async function(itemId) {
      const result = await Items.delete(itemId);
      if (result.success) {
        Router.back();
      }
    };
  };

  Router.renderCreateInvoice = async function(params = {}) {
    const type = params.type || 'sale';
    this.setTitle(`Create ${Billing.getTypeLabel(type)}`);
    const content = this.getContentContainer();
    
    const parties = await Parties.getAll(type === 'sale' ? 'customer' : 'supplier');
    const items = await Items.getAll();

    content.innerHTML = `
      <div class="container">
        <form id="invoice-form">
          <div class="card">
            <div class="card-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Date *</label>
                  <input type="date" id="inv-date" class="form-control" 
                         value="${Utils.getTodayDate()}" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Invoice Type</label>
                  <select id="inv-type" class="form-control">
                    <option value="sale" ${type === 'sale' ? 'selected' : ''}>Sale Invoice</option>
                    <option value="purchase" ${type === 'purchase' ? 'selected' : ''}>Purchase Invoice</option>
                    <option value="estimate">Estimate</option>
                    <option value="challan">Delivery Challan</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Party</label>
                <select id="inv-party" class="form-control">
                  <option value="">Cash ${type === 'sale' ? 'Sale' : 'Purchase'}</option>
                  ${parties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">
                  <input type="checkbox" id="inv-gst" checked> GST Invoice
                </label>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Items</h3>
              <button type="button" class="btn btn-sm btn-primary" onclick="addInvoiceItem()">
                <i class="fas fa-plus"></i> Add
              </button>
            </div>
            <div id="invoice-items"></div>
          </div>

          <div class="card">
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Discount (%)</label>
                <input type="number" id="inv-discount" class="form-control" value="0" 
                       step="0.01" min="0" max="100" onchange="calculateInvoiceTotal()">
              </div>

              <div style="border-top: 1px solid var(--divider); padding-top: 12px; margin-top: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Subtotal:</span>
                  <strong id="inv-subtotal">₹0.00</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Discount:</span>
                  <strong id="inv-discount-amt">₹0.00</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Tax:</span>
                  <strong id="inv-tax">₹0.00</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 18px; color: var(--primary-color);">
                  <strong>Total:</strong>
                  <strong id="inv-total">₹0.00</strong>
                </div>
              </div>

              <div class="form-group mt-2">
                <label class="form-label">Paid Amount</label>
                <input type="number" id="inv-paid" class="form-control" value="0" step="0.01" min="0">
              </div>

              <div class="form-group">
                <label class="form-label">Payment Mode</label>
                <select id="inv-payment-mode" class="form-control">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Notes</label>
                <textarea id="inv-notes" class="form-control" rows="2"></textarea>
              </div>

              <button type="submit" class="btn btn-primary btn-block btn-lg">
                <i class="fas fa-save"></i> Save Invoice
              </button>
            </div>
          </div>
        </form>
      </div>
    `;

    // Initialize invoice items and handlers
    window.invoiceItems = [];

    // Add item handler
    window.addInvoiceItem = function() {
      const itemId = Utils.generateId();
      window.invoiceItems.push({ id: itemId, itemId: null, name: '', quantity: 1, rate: 0, gstRate: 18, unit: 'pcs' });
      renderInvoiceItems();
    };

    // Initialize with one item row
    window.addInvoiceItem();

    // Remove item handler
    window.removeInvoiceItem = function(id) {
      window.invoiceItems = window.invoiceItems.filter(i => i.id !== id);
      renderInvoiceItems();
      calculateInvoiceTotal();
    };

    // Render items
    function renderInvoiceItems() {
      const container = document.getElementById('invoice-items');
      container.innerHTML = window.invoiceItems.map(item => `
        <div style="padding: 12px; border-bottom: 1px solid var(--divider);">
          <div class="form-group">
            <select class="form-control" onchange="selectInvoiceItem('${item.id}', this.value)">
              <option value="">Select Item</option>
              ${items.map(i => `
                <option value="${i.id}" ${item.itemId === i.id ? 'selected' : ''}>
                  ${i.name} - ${Utils.formatCurrency(i.salePrice)}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <input type="number" class="form-control" placeholder="Qty" value="${item.quantity}"
                     min="1" step="1" onchange="updateInvoiceItemQty('${item.id}', this.value)">
            </div>
            <div class="form-group">
              <input type="number" class="form-control" placeholder="Rate" value="${item.rate}"
                     step="0.01" min="0" onchange="updateInvoiceItemRate('${item.id}', this.value)">
            </div>
            <div class="form-group">
              <button type="button" class="btn btn-danger btn-sm" onclick="removeInvoiceItem('${item.id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div style="text-align: right; font-weight: 600;">
            Amount: ${Utils.formatCurrency(item.quantity * item.rate)}
          </div>
        </div>
      `).join('');
    }

    // Select item
    window.selectInvoiceItem = async function(id, itemId) {
      if (!itemId) return;
      
      const selectedItem = await Items.getById(parseInt(itemId));
      if (!selectedItem) return;

      const invoiceItem = window.invoiceItems.find(i => i.id === id);
      invoiceItem.itemId = selectedItem.id;
      invoiceItem.name = selectedItem.name;
      invoiceItem.rate = selectedItem.salePrice;
      invoiceItem.gstRate = selectedItem.gstRate || 18;
      invoiceItem.unit = selectedItem.unit || 'pcs';
      
      renderInvoiceItems();
      calculateInvoiceTotal();
    };

    // Update qty
    window.updateInvoiceItemQty = function(id, qty) {
      const item = window.invoiceItems.find(i => i.id === id);
      item.quantity = parseFloat(qty) || 1;
      renderInvoiceItems();
      calculateInvoiceTotal();
    };

    // Update rate
    window.updateInvoiceItemRate = function(id, rate) {
      const item = window.invoiceItems.find(i => i.id === id);
      item.rate = parseFloat(rate) || 0;
      renderInvoiceItems();
      calculateInvoiceTotal();
    };

    // Calculate total
    window.calculateInvoiceTotal = function() {
      const isGST = document.getElementById('inv-gst').checked;
      const discountPercent = parseFloat(document.getElementById('inv-discount').value) || 0;
      
      const totals = Utils.calculateInvoiceTotals(window.invoiceItems, isGST, discountPercent, 0);
      
      document.getElementById('inv-subtotal').textContent = Utils.formatCurrency(totals.subtotal);
      document.getElementById('inv-discount-amt').textContent = Utils.formatCurrency(totals.discount);
      document.getElementById('inv-tax').textContent = Utils.formatCurrency(totals.totalTax);
      document.getElementById('inv-total').textContent = Utils.formatCurrency(totals.grandTotal);
    };

    // Handle form submission
    document.getElementById('invoice-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (window.invoiceItems.length === 0 || !window.invoiceItems.some(i => i.itemId)) {
        Utils.showToast('Please add at least one item');
        return;
      }

      const partyId = parseInt(document.getElementById('inv-party').value) || null;
      const party = partyId ? await Parties.getById(partyId) : null;

      const invoiceData = {
        type: document.getElementById('inv-type').value,
        date: document.getElementById('inv-date').value,
        partyId: partyId,
        partyName: party ? party.name : null,
        isGST: document.getElementById('inv-gst').checked,
        items: window.invoiceItems.filter(i => i.itemId),
        discountPercent: parseFloat(document.getElementById('inv-discount').value) || 0,
        discountAmount: 0,
        paid: parseFloat(document.getElementById('inv-paid').value) || 0,
        paymentMode: document.getElementById('inv-payment-mode').value,
        notes: document.getElementById('inv-notes').value
      };

      const result = await Billing.create(invoiceData);
      if (result.success) {
        Router.navigate('invoice-detail', { id: result.id });
      }
    });
  };

  Router.renderInvoiceDetail = async function(params) {
    if (!params.id) {
      Router.navigate('billing');
      return;
    }

    const invoice = await Billing.getById(params.id);
    if (!invoice) {
      Utils.showToast('Invoice not found');
      Router.navigate('billing');
      return;
    }

    const party = invoice.partyId ? await Parties.getById(invoice.partyId) : null;

    this.setTitle(invoice.invoiceNo);
    const content = this.getContentContainer();

    content.innerHTML = `
      <div class="container">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${Billing.getTypeLabel(invoice.type)}</h3>
            <span class="badge badge-${invoice.status === 'paid' ? 'success' : invoice.status === 'partial' ? 'warning' : 'danger'}">
              ${invoice.status}
            </span>
          </div>
          <div class="card-body">
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td><strong>Invoice No:</strong></td>
                <td>${invoice.invoiceNo}</td>
              </tr>
              <tr>
                <td><strong>Date:</strong></td>
                <td>${Utils.formatDate(invoice.date)}</td>
              </tr>
              <tr>
                <td><strong>Party:</strong></td>
                <td>${invoice.partyName || 'Cash Sale'}</td>
              </tr>
              <tr>
                <td><strong>Total:</strong></td>
                <td class="fw-bold">${Utils.formatCurrency(invoice.grandTotal)}</td>
              </tr>
              <tr>
                <td><strong>Paid:</strong></td>
                <td class="text-success">${Utils.formatCurrency(invoice.paid)}</td>
              </tr>
              ${invoice.due > 0 ? `
              <tr>
                <td><strong>Due:</strong></td>
                <td class="text-danger fw-bold">${Utils.formatCurrency(invoice.due)}</td>
              </tr>
              ` : ''}
            </table>

            <div class="line" style="border-top: 1px solid var(--divider); margin: 16px 0;"></div>

            <h4 style="font-size: 14px; margin-bottom: 12px;">Items</h4>
            ${invoice.items.map((item, idx) => `
              <div style="padding: 8px 0; border-bottom: 1px solid var(--divider);">
                <div style="display: flex; justify-content: space-between;">
                  <span>${idx + 1}. ${item.name}</span>
                  <strong>${Utils.formatCurrency(item.quantity * item.rate)}</strong>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                  ${item.quantity} ${item.unit || 'pcs'} × ${Utils.formatCurrency(item.rate)}
                </div>
              </div>
            `).join('')}

            <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid var(--divider);">
              <div style="display: flex; justify-content: space-between; font-size: 18px;">
                <strong>Grand Total:</strong>
                <strong class="text-primary">${Utils.formatCurrency(invoice.grandTotal)}</strong>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px;">
              <button class="btn btn-primary" onclick="Print.printInvoice(${invoice.id})">
                <i class="fas fa-print"></i> Print
              </button>
              ${party ? `
              <button class="btn btn-success" onclick="Billing.shareInvoice(${invoice.id})">
                <i class="fab fa-whatsapp"></i> Share
              </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  Router.renderReports = function() {
    this.setTitle('Reports');
    const content = this.getContentContainer();

    content.innerHTML = `
      <div class="container">
        <div class="card mb-2" onclick="showSalesReport()">
          <div class="list-item">
            <div class="list-item-content">
              <div class="list-item-title"><i class="fas fa-chart-line"></i> Sales Report</div>
              <div class="list-item-subtitle">View sales summary and details</div>
            </div>
            <i class="fas fa-chevron-right text-secondary"></i>
          </div>
        </div>

        <div class="card mb-2" onclick="showPurchaseReport()">
          <div class="list-item">
            <div class="list-item-content">
              <div class="list-item-title"><i class="fas fa-shopping-cart"></i> Purchase Report</div>
              <div class="list-item-subtitle">View purchase summary</div>
            </div>
            <i class="fas fa-chevron-right text-secondary"></i>
          </div>
        </div>

        <div class="card mb-2" onclick="showProfitLossReport()">
          <div class="list-item">
            <div class="list-item-content">
              <div class="list-item-title"><i class="fas fa-balance-scale"></i> Profit & Loss</div>
              <div class="list-item-subtitle">View profit and loss statement</div>
            </div>
            <i class="fas fa-chevron-right text-secondary"></i>
          </div>
        </div>

        <div class="card mb-2" onclick="showPartyOutstanding()">
          <div class="list-item">
            <div class="list-item-content">
              <div class="list-item-title"><i class="fas fa-users"></i> Party Outstanding</div>
              <div class="list-item-subtitle">View receivables and payables</div>
            </div>
            <i class="fas fa-chevron-right text-secondary"></i>
          </div>
        </div>

        <div class="card mb-2" onclick="showStockReport()">
          <div class="list-item">
            <div class="list-item-content">
              <div class="list-item-title"><i class="fas fa-boxes"></i> Stock Report</div>
              <div class="list-item-subtitle">View inventory summary</div>
            </div>
            <i class="fas fa-chevron-right text-secondary"></i>
          </div>
        </div>

        <div class="card mb-2" onclick="showGSTReport()">
          <div class="list-item">
            <div class="list-item-content">
              <div class="list-item-title"><i class="fas fa-file-invoice-dollar"></i> GST Report</div>
              <div class="list-item-subtitle">View GST summary (GSTR-1)</div>
            </div>
            <i class="fas fa-chevron-right text-secondary"></i>
          </div>
        </div>
      </div>
    `;

    // Report handlers will show simple alerts for now
    window.showSalesReport = async function() {
      const { startDate, endDate } = Utils.getDateRange('thisMonth');
      const report = await Reports.getSalesReport(startDate, endDate);
      alert(`Sales Report (This Month)\n\nTotal Sales: ${Utils.formatCurrency(report.totalSales)}\nInvoices: ${report.totalInvoices}\nPaid: ${Utils.formatCurrency(report.totalPaid)}\nDue: ${Utils.formatCurrency(report.totalDue)}`);
    };

    window.showPurchaseReport = async function() {
      const { startDate, endDate } = Utils.getDateRange('thisMonth');
      const report = await Reports.getPurchaseReport(startDate, endDate);
      alert(`Purchase Report (This Month)\n\nTotal Purchases: ${Utils.formatCurrency(report.totalPurchases)}\nInvoices: ${report.totalInvoices}\nPaid: ${Utils.formatCurrency(report.totalPaid)}\nDue: ${Utils.formatCurrency(report.totalDue)}`);
    };

    window.showProfitLossReport = async function() {
      const { startDate, endDate } = Utils.getDateRange('thisMonth');
      const report = await Reports.getProfitLossReport(startDate, endDate);
      alert(`Profit & Loss (This Month)\n\nRevenue: ${Utils.formatCurrency(report.revenue)}\nCOGS: ${Utils.formatCurrency(report.cogs)}\nGross Profit: ${Utils.formatCurrency(report.grossProfit)}\nExpenses: ${Utils.formatCurrency(report.totalExpenses)}\nNet Profit: ${Utils.formatCurrency(report.netProfit)}\nProfit Margin: ${report.profitMargin.toFixed(2)}%`);
    };

    window.showPartyOutstanding = async function() {
      const report = await Reports.getPartyOutstandingReport();
      alert(`Party Outstanding\n\nTo Receive: ${Utils.formatCurrency(report.totalReceivable)} (${report.customers.length} customers)\nTo Pay: ${Utils.formatCurrency(report.totalPayable)} (${report.suppliers.length} suppliers)\nNet Position: ${Utils.formatCurrency(report.netPosition)}`);
    };

    window.showStockReport = async function() {
      const report = await Reports.getStockReport();
      alert(`Stock Report\n\nTotal Items: ${report.totalItems}\nStock Value: ${Utils.formatCurrency(report.totalStockValue)}\nLow Stock Items: ${report.lowStockItems.length}`);
    };

    window.showGSTReport = async function() {
      const { startDate, endDate } = Utils.getDateRange('thisMonth');
      const report = await Reports.getGSTReport(startDate, endDate);
      alert(`GST Report (This Month)\n\nTaxable Amount: ${Utils.formatCurrency(report.totalTaxable)}\nTotal Tax: ${Utils.formatCurrency(report.totalTax)}\nInvoices: ${report.invoiceCount}`);
    };
  };

  Router.renderSettings = function() {
    this.setTitle('Settings');
    const content = this.getContentContainer();

    content.innerHTML = `
      <div class="container">
        <div class="card mb-2">
          <div class="card-header">
            <h3 class="card-title">Business Profile</h3>
          </div>
          <div class="list">
            <div class="list-item">
              <div class="list-item-content">
                <div class="list-item-title">${Auth.currentBusiness.name}</div>
                <div class="list-item-subtitle">${Auth.currentBusiness.phone || ''}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-2">
          <div class="card-header">
            <h3 class="card-title">Settings</h3>
          </div>
          <div class="list">
            <div class="list-item" onclick="toggleTheme()">
              <div class="list-item-content">
                <div class="list-item-title"><i class="fas fa-moon"></i> Dark Mode</div>
              </div>
              <i class="fas fa-toggle-off" id="theme-toggle"></i>
            </div>
            <div class="list-item" onclick="Settings.backupData()">
              <div class="list-item-content">
                <div class="list-item-title"><i class="fas fa-download"></i> Backup Data</div>
              </div>
              <i class="fas fa-chevron-right text-secondary"></i>
            </div>
            <div class="list-item" onclick="Auth.logout(); window.location.reload();">
              <div class="list-item-content">
                <div class="list-item-title"><i class="fas fa-sign-out-alt"></i> Logout</div>
              </div>
              <i class="fas fa-chevron-right text-secondary"></i>
            </div>
          </div>
        </div>

        <div class="card mb-2">
          <div class="card-header">
            <h3 class="card-title" style="color: var(--danger-color);">Danger Zone</h3>
          </div>
          <div class="list">
            <div class="list-item" onclick="Settings.resetAllData()">
              <div class="list-item-content">
                <div class="list-item-title" style="color: var(--danger-color);">
                  <i class="fas fa-trash"></i> Reset All Data
                </div>
                <div class="list-item-subtitle">This will delete all your business data</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    window.toggleTheme = async function() {
      const newTheme = await Settings.toggleTheme();
      const icon = document.getElementById('theme-toggle');
      icon.className = newTheme === 'dark' ? 'fas fa-toggle-on' : 'fas fa-toggle-off';
    };
  };

  Router.renderPartyDetail = async function(params) {
    if (!params.id) {
      Router.navigate('parties');
      return;
    }

    const party = await Parties.getById(params.id);
    if (!party) {
      Utils.showToast('Party not found');
      Router.navigate('parties');
      return;
    }

    this.setTitle(party.name);
    const content = this.getContentContainer();

    const ledger = await Parties.getLedger(party.id);

    content.innerHTML = `
      <div class="container">
        <div class="card">
          <div class="card-body">
            <h2>${party.name}</h2>
            <p><i class="fas fa-phone"></i> ${party.phone || 'N/A'}</p>
            <p><i class="fas fa-envelope"></i> ${party.email || 'N/A'}</p>
            ${party.address ? `<p><i class="fas fa-map-marker-alt"></i> ${party.address}</p>` : ''}
            
            <div style="margin-top: 16px; padding: 16px; background: var(--background); border-radius: 8px;">
              <div style="font-size: 14px; color: var(--text-secondary);">Outstanding Balance</div>
              <div style="font-size: 24px; font-weight: bold; color: ${party.currentBalance > 0 ? 'var(--danger-color)' : 'var(--success-color)'};">
                ${Utils.formatCurrency(Math.abs(party.currentBalance))}
                ${party.currentBalance > 0 ? '(You will receive)' : party.currentBalance < 0 ? '(You will pay)' : ''}
              </div>
            </div>

            ${party.currentBalance > 0 ? `
            <button class="btn btn-success btn-block mt-2" onclick="Parties.sendPaymentReminder(${JSON.stringify(party).replace(/"/g, '&quot;')}, ${party.currentBalance})">
              <i class="fab fa-whatsapp"></i> Send Payment Reminder
            </button>
            ` : ''}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Ledger</h3>
          </div>
          ${ledger.length > 0 ? `
          <div class="list">
            ${ledger.map(entry => `
              <div class="list-item">
                <div class="list-item-content">
                  <div class="list-item-title">
                    ${entry.invoiceNo || 'Payment'}
                  </div>
                  <div class="list-item-subtitle">${Utils.formatDate(entry.date)}</div>
                </div>
                <div class="list-item-value">
                  ${Utils.formatCurrency(entry.grandTotal || entry.amount)}
                </div>
              </div>
            `).join('')}
          </div>
          ` : '<div class="empty-state"><p>No transactions yet</p></div>'}
        </div>
      </div>
    `;
  };
  } // End of setupRouterOverrides function

})();
