// ===================================
// PRINT MODULE
// ===================================

const Print = {
  // Print invoice
  async printInvoice(invoiceId, format = 'a4') {
    const invoice = await Billing.getById(invoiceId);
    const party = invoice.partyId ? await Parties.getById(invoice.partyId) : null;
    const business = Auth.currentBusiness;

    let html = '';

    if (format === 'thermal-58' || format === 'thermal-80') {
      html = this.generateThermalPrint(invoice, party, business, format);
    } else {
      html = this.generateA4Print(invoice, party, business);
    }

    // Create print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  },

  // Generate A4 print layout
  generateA4Print(invoice, party, business) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${invoice.invoiceNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; }
    .invoice { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; }
    .header { background: #4A90E2; color: white; padding: 20px; }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .header p { font-size: 12px; }
    .info-section { display: flex; justify-content: space-between; padding: 20px; border-bottom: 1px solid #ddd; }
    .info-box { flex: 1; }
    .info-box h3 { font-size: 14px; color: #666; margin-bottom: 10px; }
    .info-box p { font-size: 12px; line-height: 1.5; }
    .invoice-details { padding: 20px; background: #f5f5f5; }
    .invoice-details table { width: 100%; font-size: 12px; }
    .invoice-details td { padding: 5px; }
    table.items { width: 100%; border-collapse: collapse; margin: 20px 0; }
    table.items th { background: #f5f5f5; padding: 10px; text-align: left; font-size: 12px; border: 1px solid #ddd; }
    table.items td { padding: 10px; font-size: 12px; border: 1px solid #ddd; }
    .text-right { text-align: right; }
    .totals { margin: 20px; }
    .totals table { width: 300px; margin-left: auto; font-size: 13px; }
    .totals td { padding: 8px; }
    .totals .grand-total { font-weight: bold; font-size: 16px; background: #f5f5f5; }
    .footer { padding: 20px; text-align: center; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    @media print {
      body { padding: 0; }
      .invoice { border: none; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <h1>${business.name}</h1>
      <p>${business.address || ''}</p>
      <p>Phone: ${business.phone || ''} | Email: ${business.email || ''}</p>
      ${business.gstin ? `<p>GSTIN: ${business.gstin}</p>` : ''}
    </div>

    <div class="invoice-details">
      <table>
        <tr>
          <td><strong>${Billing.getTypeLabel(invoice.type)}</strong></td>
          <td class="text-right"><strong>${invoice.invoiceNo}</strong></td>
        </tr>
        <tr>
          <td>Date: ${Utils.formatDate(invoice.date)}</td>
          <td class="text-right">${invoice.dueDate ? 'Due: ' + Utils.formatDate(invoice.dueDate) : ''}</td>
        </tr>
      </table>
    </div>

    <div class="info-section">
      <div class="info-box">
        <h3>Bill To:</h3>
        ${party ? `
        <p><strong>${party.name}</strong></p>
        <p>${party.address || ''}</p>
        <p>${party.phone || ''}</p>
        ${party.gstin ? `<p>GSTIN: ${party.gstin}</p>` : ''}
        ` : '<p>Cash Sale</p>'}
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Rate</th>
          ${invoice.isGST ? '<th class="text-right">GST %</th>' : ''}
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.name}</td>
          <td class="text-right">${item.quantity} ${item.unit || ''}</td>
          <td class="text-right">${Utils.formatCurrency(item.rate)}</td>
          ${invoice.isGST ? `<td class="text-right">${item.gstRate || 0}%</td>` : ''}
          <td class="text-right">${Utils.formatCurrency(item.quantity * item.rate)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr>
          <td>Subtotal:</td>
          <td class="text-right">${Utils.formatCurrency(invoice.subtotal)}</td>
        </tr>
        ${invoice.discount > 0 ? `
        <tr>
          <td>Discount:</td>
          <td class="text-right">- ${Utils.formatCurrency(invoice.discount)}</td>
        </tr>
        ` : ''}
        ${invoice.isGST && invoice.totalTax > 0 ? `
        <tr>
          <td>Tax (GST):</td>
          <td class="text-right">${Utils.formatCurrency(invoice.totalTax)}</td>
        </tr>
        ` : ''}
        ${invoice.roundOff !== 0 ? `
        <tr>
          <td>Round Off:</td>
          <td class="text-right">${invoice.roundOff > 0 ? '+' : ''}${Utils.formatCurrency(Math.abs(invoice.roundOff))}</td>
        </tr>
        ` : ''}
        <tr class="grand-total">
          <td>Grand Total:</td>
          <td class="text-right">${Utils.formatCurrency(invoice.grandTotal)}</td>
        </tr>
        ${invoice.paid > 0 ? `
        <tr>
          <td>Paid:</td>
          <td class="text-right">${Utils.formatCurrency(invoice.paid)}</td>
        </tr>
        <tr>
          <td>Balance Due:</td>
          <td class="text-right">${Utils.formatCurrency(invoice.due)}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${invoice.notes ? `
    <div style="padding: 20px; border-top: 1px solid #ddd;">
      <p style="font-size: 12px;"><strong>Notes:</strong> ${invoice.notes}</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>Thank you for your business!</p>
      <p style="margin-top: 10px;">This is a computer-generated invoice</p>
    </div>
  </div>
</body>
</html>
    `;
  },

  // Generate thermal printer layout (58mm or 80mm)
  generateThermalPrint(invoice, party, business, format) {
    const width = format === 'thermal-58' ? '58mm' : '80mm';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${invoice.invoiceNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: monospace; width: ${width}; padding: 5px; font-size: 11px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 5px 0; }
    table { width: 100%; font-size: 10px; }
    .text-right { text-align: right; }
  </style>
</head>
<body>
  <div class="center bold" style="font-size: 14px;">${business.name}</div>
  <div class="center">${business.phone || ''}</div>
  ${business.gstin ? `<div class="center">GSTIN: ${business.gstin}</div>` : ''}
  
  <div class="line"></div>
  
  <div class="bold">${Billing.getTypeLabel(invoice.type)}: ${invoice.invoiceNo}</div>
  <div>Date: ${Utils.formatDate(invoice.date)}</div>
  ${party ? `<div>Customer: ${party.name}</div>` : ''}
  ${party && party.phone ? `<div>Phone: ${party.phone}</div>` : ''}
  
  <div class="line"></div>
  
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Rate</th>
        <th class="text-right">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
      <tr>
        <td>${item.name.substring(0, 15)}</td>
        <td class="text-right">${item.quantity}</td>
        <td class="text-right">${item.rate}</td>
        <td class="text-right">${(item.quantity * item.rate).toFixed(2)}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="line"></div>
  
  <table>
    <tr>
      <td>Subtotal:</td>
      <td class="text-right bold">${invoice.subtotal.toFixed(2)}</td>
    </tr>
    ${invoice.discount > 0 ? `
    <tr>
      <td>Discount:</td>
      <td class="text-right">-${invoice.discount.toFixed(2)}</td>
    </tr>
    ` : ''}
    ${invoice.isGST && invoice.totalTax > 0 ? `
    <tr>
      <td>Tax:</td>
      <td class="text-right">${invoice.totalTax.toFixed(2)}</td>
    </tr>
    ` : ''}
    <tr>
      <td class="bold">TOTAL:</td>
      <td class="text-right bold">${invoice.grandTotal.toFixed(2)}</td>
    </tr>
    ${invoice.paid > 0 ? `
    <tr>
      <td>Paid:</td>
      <td class="text-right">${invoice.paid.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Balance:</td>
      <td class="text-right">${invoice.due.toFixed(2)}</td>
    </tr>
    ` : ''}
  </table>
  
  <div class="line"></div>
  <div class="center">Thank You! Visit Again</div>
</body>
</html>
    `;
  }
};
