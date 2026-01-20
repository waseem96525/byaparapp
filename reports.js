// ===================================
// REPORTS & ANALYTICS
// ===================================

const Reports = {
  // Get sales report
  async getSalesReport(startDate, endDate) {
    const invoices = await Billing.getByDateRange(startDate, endDate, 'sale');
    
    const summary = {
      totalSales: 0,
      totalInvoices: invoices.length,
      totalTax: 0,
      totalPaid: 0,
      totalDue: 0,
      invoices: invoices
    };

    invoices.forEach(inv => {
      summary.totalSales += inv.grandTotal;
      summary.totalTax += inv.totalTax || 0;
      summary.totalPaid += inv.paid;
      summary.totalDue += inv.due;
    });

    return summary;
  },

  // Get purchase report
  async getPurchaseReport(startDate, endDate) {
    const invoices = await Billing.getByDateRange(startDate, endDate, 'purchase');
    
    const summary = {
      totalPurchases: 0,
      totalInvoices: invoices.length,
      totalTax: 0,
      totalPaid: 0,
      totalDue: 0,
      invoices: invoices
    };

    invoices.forEach(inv => {
      summary.totalPurchases += inv.grandTotal;
      summary.totalTax += inv.totalTax || 0;
      summary.totalPaid += inv.paid;
      summary.totalDue += inv.due;
    });

    return summary;
  },

  // Get profit & loss report
  async getProfitLossReport(startDate, endDate) {
    const salesReport = await this.getSalesReport(startDate, endDate);
    const purchaseReport = await this.getPurchaseReport(startDate, endDate);
    
    // Get expenses
    const businessId = Auth.currentBusiness.id;
    const allExpenses = await db.getBusinessData(businessId, 'expenses');
    const expenses = allExpenses.filter(exp => 
      exp.date >= startDate && exp.date <= endDate
    );
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const revenue = salesReport.totalSales;
    const cogs = purchaseReport.totalPurchases; // Cost of Goods Sold
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      revenue,
      cogs,
      grossProfit,
      totalExpenses,
      netProfit,
      profitMargin,
      salesCount: salesReport.totalInvoices,
      purchaseCount: purchaseReport.totalInvoices,
      expenseCount: expenses.length
    };
  },

  // Get party outstanding report
  async getPartyOutstandingReport() {
    const parties = await Parties.getAll();
    
    const customers = parties.filter(p => p.type === 'customer' && p.currentBalance > 0);
    const suppliers = parties.filter(p => p.type === 'supplier' && p.currentBalance > 0);

    const totalReceivable = customers.reduce((sum, p) => sum + p.currentBalance, 0);
    const totalPayable = suppliers.reduce((sum, p) => sum + p.currentBalance, 0);

    return {
      customers,
      suppliers,
      totalReceivable,
      totalPayable,
      netPosition: totalReceivable - totalPayable
    };
  },

  // Get stock summary report
  async getStockReport() {
    const items = await Items.getAll();
    
    let totalStockValue = 0;
    let lowStockItems = [];
    const lowStockLimit = await Auth.getSetting('lowStockAlert') || 10;

    items.forEach(item => {
      const value = item.currentStock * (item.purchasePrice || 0);
      totalStockValue += value;

      if (item.currentStock <= lowStockLimit) {
        lowStockItems.push(item);
      }
    });

    return {
      totalItems: items.length,
      totalStockValue,
      lowStockItems,
      items
    };
  },

  // Get GST report (GSTR-1 summary)
  async getGSTReport(startDate, endDate) {
    const salesInvoices = await Billing.getByDateRange(startDate, endDate, 'sale');
    const gstInvoices = salesInvoices.filter(inv => inv.isGST);

    const taxSummary = {
      0: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
      5: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
      12: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
      18: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
      28: { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
    };

    gstInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const rate = item.gstRate || 0;
        if (taxSummary[rate]) {
          const itemTotal = item.quantity * item.rate;
          taxSummary[rate].taxable += itemTotal;
          
          const gst = Utils.calculateGST(itemTotal, rate);
          taxSummary[rate].cgst += gst.cgst;
          taxSummary[rate].sgst += gst.sgst;
          taxSummary[rate].total += gst.total;
        }
      });
    });

    let totalTaxable = 0;
    let totalTax = 0;

    Object.values(taxSummary).forEach(summary => {
      totalTaxable += summary.taxable;
      totalTax += summary.total;
    });

    return {
      taxSummary,
      totalTaxable,
      totalTax,
      invoiceCount: gstInvoices.length,
      period: { startDate, endDate }
    };
  },

  // Get day book
  async getDayBook(date) {
    const invoices = await Billing.getByDateRange(date, date);
    const businessId = Auth.currentBusiness.id;
    const allExpenses = await db.getBusinessData(businessId, 'expenses');
    const expenses = allExpenses.filter(exp => exp.date === date);
    const allTransactions = await db.getBusinessData(businessId, 'transactions');
    const transactions = allTransactions.filter(txn => txn.date === date);

    return {
      invoices,
      expenses,
      transactions,
      date
    };
  },

  // Get top selling items
  async getTopSellingItems(startDate, endDate, limit = 10) {
    const salesInvoices = await Billing.getByDateRange(startDate, endDate, 'sale');
    
    const itemSales = {};
    
    salesInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!itemSales[item.itemId]) {
          itemSales[item.itemId] = {
            itemId: item.itemId,
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        itemSales[item.itemId].quantity += item.quantity;
        itemSales[item.itemId].revenue += item.quantity * item.rate;
      });
    });

    const sorted = Object.values(itemSales).sort((a, b) => b.revenue - a.revenue);
    return sorted.slice(0, limit);
  },

  // Export report to CSV
  async exportReport(reportType, data, filename) {
    let exportData = [];

    switch (reportType) {
      case 'sales':
        exportData = data.invoices.map(inv => ({
          'Invoice No': inv.invoiceNo,
          'Date': Utils.formatDate(inv.date),
          'Party': inv.partyName,
          'Total': inv.grandTotal,
          'Paid': inv.paid,
          'Due': inv.due,
          'Status': inv.status
        }));
        break;

      case 'parties':
        exportData = data.map(party => ({
          'Name': party.name,
          'Phone': party.phone,
          'Type': party.type,
          'Balance': party.currentBalance
        }));
        break;

      case 'items':
        exportData = data.map(item => ({
          'Name': item.name,
          'Category': item.category,
          'Current Stock': item.currentStock,
          'Unit': item.unit,
          'Sale Price': item.salePrice,
          'Purchase Price': item.purchasePrice
        }));
        break;
    }

    Utils.exportToCSV(exportData, filename);
  }
};
