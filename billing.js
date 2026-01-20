// ===================================
// BILLING & INVOICING
// ===================================

const Billing = {
  currentInvoice: null,

  // Invoice types
  TYPES: {
    SALE: 'sale',
    PURCHASE: 'purchase',
    ESTIMATE: 'estimate',
    PROFORMA: 'proforma',
    CHALLAN: 'challan'
  },

  // Get all invoices
  async getAll(type = null) {
    const businessId = Auth.currentBusiness.id;
    const invoices = await db.getBusinessData(businessId, 'invoices');
    
    if (type) {
      return invoices.filter(inv => inv.type === type);
    }
    return invoices;
  },

  // Get invoice by ID
  async getById(id) {
    return await db.get('invoices', id);
  },

  // Create new invoice
  async create(invoiceData) {
    try {
      // Generate invoice number
      const prefix = invoiceData.type === 'estimate' ? 'estimatePrefix' : 
                     invoiceData.type === 'challan' ? 'challanPrefix' : 'invoicePrefix';
      const lastNoKey = invoiceData.type === 'estimate' ? 'lastEstimateNo' : 
                        invoiceData.type === 'challan' ? 'lastChallanNo' : 'lastInvoiceNo';
      
      const invoicePrefix = await Auth.getSetting(prefix) || 'INV';
      const lastNo = await Auth.getSetting(lastNoKey) || 0;
      const invoiceNo = Utils.generateInvoiceNo(invoicePrefix, lastNo);

      // Calculate totals
      const totals = Utils.calculateInvoiceTotals(
        invoiceData.items,
        invoiceData.isGST,
        invoiceData.discountPercent,
        invoiceData.discountAmount
      );

      const invoice = {
        ...invoiceData,
        invoiceNo,
        businessId: Auth.currentBusiness.id,
        ...totals,
        paid: invoiceData.paid || 0,
        due: totals.grandTotal - (invoiceData.paid || 0),
        status: totals.grandTotal === invoiceData.paid ? 'paid' : 
                invoiceData.paid > 0 ? 'partial' : 'unpaid',
        createdAt: new Date().toISOString()
      };

      const id = await db.add('invoices', invoice);

      // Update invoice number
      await Auth.updateSetting(lastNoKey, lastNo + 1);

      // Update party balance (for sale/purchase)
      if (invoice.partyId && (invoice.type === 'sale' || invoice.type === 'purchase')) {
        const balanceType = invoice.type === 'sale' ? 'debit' : 'credit';
        await Parties.updateBalance(invoice.partyId, invoice.due, balanceType);
      }

      // Update inventory
      if (invoice.type === 'sale') {
        for (const item of invoice.items) {
          await Items.updateStock(item.itemId, item.quantity, 'subtract');
        }
      } else if (invoice.type === 'purchase') {
        for (const item of invoice.items) {
          await Items.updateStock(item.itemId, item.quantity, 'add');
        }
      }

      // Record payment if any
      if (invoice.paid > 0) {
        await this.recordPayment(id, {
          amount: invoice.paid,
          mode: invoice.paymentMode || 'cash',
          date: invoice.date
        });
      }

      Utils.showToast(`${this.getTypeLabel(invoice.type)} created successfully`);
      return { success: true, id, invoice };
    } catch (error) {
      console.error('Create invoice error:', error);
      Utils.showToast('Error creating invoice');
      return { success: false, error: error.message };
    }
  },

  // Update invoice
  async update(id, updates) {
    try {
      const invoice = await this.getById(id);
      const updated = { ...invoice, ...updates };
      
      // Recalculate totals if items changed
      if (updates.items) {
        const totals = Utils.calculateInvoiceTotals(
          updated.items,
          updated.isGST,
          updated.discountPercent,
          updated.discountAmount
        );
        Object.assign(updated, totals);
        updated.due = totals.grandTotal - updated.paid;
        updated.status = totals.grandTotal === updated.paid ? 'paid' : 
                        updated.paid > 0 ? 'partial' : 'unpaid';
      }

      await db.update('invoices', updated);
      Utils.showToast('Invoice updated successfully');
      return { success: true };
    } catch (error) {
      Utils.showToast('Error updating invoice');
      return { success: false, error: error.message };
    }
  },

  // Delete invoice
  async delete(id) {
    if (!Utils.confirm('Are you sure you want to delete this invoice?')) {
      return { success: false };
    }

    try {
      const invoice = await this.getById(id);
      
      // Restore party balance
      if (invoice.partyId && (invoice.type === 'sale' || invoice.type === 'purchase')) {
        const balanceType = invoice.type === 'sale' ? 'credit' : 'debit';
        await Parties.updateBalance(invoice.partyId, invoice.due, balanceType);
      }

      // Restore inventory
      if (invoice.type === 'sale') {
        for (const item of invoice.items) {
          await Items.updateStock(item.itemId, item.quantity, 'add');
        }
      } else if (invoice.type === 'purchase') {
        for (const item of invoice.items) {
          await Items.updateStock(item.itemId, item.quantity, 'subtract');
        }
      }

      await db.delete('invoices', id);
      Utils.showToast('Invoice deleted successfully');
      return { success: true };
    } catch (error) {
      Utils.showToast('Error deleting invoice');
      return { success: false, error: error.message };
    }
  },

  // Record payment against invoice
  async recordPayment(invoiceId, paymentData) {
    try {
      const invoice = await this.getById(invoiceId);
      
      const transaction = {
        type: invoice.type === 'sale' ? 'payment_in' : 'payment_out',
        partyId: invoice.partyId,
        invoiceId: invoiceId,
        amount: paymentData.amount,
        mode: paymentData.mode,
        reference: paymentData.reference || '',
        date: paymentData.date,
        businessId: Auth.currentBusiness.id,
        createdAt: new Date().toISOString()
      };

      await db.add('transactions', transaction);

      // Update invoice paid amount
      invoice.paid += paymentData.amount;
      invoice.due = invoice.grandTotal - invoice.paid;
      invoice.status = invoice.due === 0 ? 'paid' : 'partial';
      await db.update('invoices', invoice);

      // Update party balance
      if (invoice.partyId) {
        await Parties.updateBalance(invoice.partyId, paymentData.amount, 'credit');
      }

      Utils.showToast('Payment recorded successfully');
      return { success: true };
    } catch (error) {
      Utils.showToast('Error recording payment');
      return { success: false, error: error.message };
    }
  },

  // Get invoice type label
  getTypeLabel(type) {
    const labels = {
      sale: 'Sale Invoice',
      purchase: 'Purchase Invoice',
      estimate: 'Estimate',
      proforma: 'Proforma Invoice',
      challan: 'Delivery Challan'
    };
    return labels[type] || 'Invoice';
  },

  // Get invoices by date range
  async getByDateRange(startDate, endDate, type = null) {
    const invoices = await this.getAll(type);
    return invoices.filter(inv => 
      inv.date >= startDate && inv.date <= endDate
    );
  },

  // Get pending invoices
  async getPendingInvoices() {
    const invoices = await this.getAll();
    return invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial');
  },

  // Share invoice via WhatsApp
  async shareInvoice(invoiceId) {
    const invoice = await this.getById(invoiceId);
    const party = await Parties.getById(invoice.partyId);
    
    const message = `
${this.getTypeLabel(invoice.type)} #${invoice.invoiceNo}
Date: ${Utils.formatDate(invoice.date)}

Total: ${Utils.formatCurrency(invoice.grandTotal)}
${invoice.paid > 0 ? `Paid: ${Utils.formatCurrency(invoice.paid)}` : ''}
${invoice.due > 0 ? `Due: ${Utils.formatCurrency(invoice.due)}` : ''}

Thank you for your business!
${Auth.currentBusiness.name}
`.trim();

    Utils.shareWhatsApp(party.phone, message);
  },

  // Convert estimate to invoice
  async convertToInvoice(estimateId) {
    const estimate = await this.getById(estimateId);
    if (estimate.type !== 'estimate') {
      Utils.showToast('Can only convert estimates');
      return { success: false };
    }

    const invoiceData = {
      ...estimate,
      type: 'sale',
      date: Utils.getTodayDate()
    };
    delete invoiceData.id;
    delete invoiceData.invoiceNo;
    delete invoiceData.createdAt;

    return await this.create(invoiceData);
  }
};
