// ===================================
// UTILITIES & HELPERS
// ===================================

const Utils = {
  // Format currency (INR)
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  },

  // Format date
  formatDate(date, format = 'dd/mm/yyyy') {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    if (format === 'dd/mm/yyyy') {
      return `${day}/${month}/${year}`;
    } else if (format === 'yyyy-mm-dd') {
      return `${year}-${month}-${day}`;
    }
    return d.toLocaleDateString('en-IN');
  },

  // Get today's date in YYYY-MM-DD format
  getTodayDate() {
    return this.formatDate(new Date(), 'yyyy-mm-dd');
  },

  // Calculate GST
  calculateGST(amount, gstRate) {
    const gstAmount = (amount * gstRate) / 100;
    return {
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      igst: gstAmount,
      total: gstAmount
    };
  },

  // Calculate invoice totals
  calculateInvoiceTotals(items, isGST = true, discountPercent = 0, discountAmount = 0) {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.rate;
      subtotal += itemTotal;

      if (isGST && item.gstRate) {
        const gst = this.calculateGST(itemTotal, item.gstRate);
        totalTax += gst.total;
      }
    });

    // Apply discount
    let discount = discountAmount;
    if (discountPercent > 0) {
      discount = (subtotal * discountPercent) / 100;
    }

    const taxableAmount = subtotal - discount;
    const total = taxableAmount + totalTax;

    return {
      subtotal,
      discount,
      taxableAmount,
      totalTax,
      total,
      roundOff: Math.round(total) - total,
      grandTotal: Math.round(total)
    };
  },

  // Generate invoice number
  generateInvoiceNo(prefix = 'INV', lastNo = 0) {
    const nextNo = lastNo + 1;
    return `${prefix}${String(nextNo).padStart(5, '0')}`;
  },

  // Show toast notification
  showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, duration);
  },

  // Confirm dialog
  confirm(message) {
    return window.confirm(message);
  },

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Generate unique ID
  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  },

  // Export to CSV
  exportToCSV(data, filename) {
    if (!data || !data.length) {
      this.showToast('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  // Share via WhatsApp
  shareWhatsApp(phone, message) {
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  },

  // Get financial year
  getFinancialYear(date = new Date()) {
    const month = date.getMonth();
    const year = date.getFullYear();
    if (month < 3) { // Jan-Mar
      return `${year - 1}-${year}`;
    } else {
      return `${year}-${year + 1}`;
    }
  },

  // Validate GST number
  validateGST(gstNumber) {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gstNumber);
  },

  // Validate phone number
  validatePhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  },

  // Get date range
  getDateRange(period) {
    const today = new Date();
    const endDate = new Date(today);
    let startDate = new Date(today);

    switch (period) {
      case 'today':
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
        break;
      case 'thisWeek':
        startDate.setDate(startDate.getDate() - startDate.getDay());
        break;
      case 'thisMonth':
        startDate.setDate(1);
        break;
      case 'lastMonth':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        endDate.setDate(0);
        break;
      case 'thisYear':
        startDate.setMonth(0);
        startDate.setDate(1);
        break;
      case 'lastYear':
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setMonth(0);
        startDate.setDate(1);
        endDate.setFullYear(endDate.getFullYear() - 1);
        endDate.setMonth(11);
        endDate.setDate(31);
        break;
    }

    return {
      startDate: this.formatDate(startDate, 'yyyy-mm-dd'),
      endDate: this.formatDate(endDate, 'yyyy-mm-dd')
    };
  },

  // Local storage helpers
  storage: {
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    get(key) {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    },
    remove(key) {
      localStorage.removeItem(key);
    },
    clear() {
      localStorage.clear();
    }
  },

  // Get current business ID
  getCurrentBusinessId() {
    return this.storage.get('currentBusinessId');
  },

  // Set current business
  setCurrentBusiness(businessId) {
    this.storage.set('currentBusinessId', businessId);
  }
};
