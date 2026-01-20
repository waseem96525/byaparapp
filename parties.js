// ===================================
// PARTY MANAGEMENT (Customers & Suppliers)
// ===================================

const Parties = {
  currentParties: [],

  // Get all parties
  async getAll(type = null) {
    const businessId = Auth.currentBusiness.id;
    const parties = await db.getBusinessData(businessId, 'parties');
    
    if (type) {
      return parties.filter(p => p.type === type);
    }
    return parties;
  },

  // Get party by ID
  async getById(id) {
    return await db.get('parties', id);
  },

  // Add new party
  async add(partyData) {
    try {
      const party = {
        ...partyData,
        businessId: Auth.currentBusiness.id,
        openingBalance: partyData.openingBalance || 0,
        currentBalance: partyData.openingBalance || 0,
        createdAt: new Date().toISOString()
      };

      const id = await db.add('parties', party);
      Utils.showToast(`${partyData.type === 'customer' ? 'Customer' : 'Supplier'} added successfully`);
      return { success: true, id };
    } catch (error) {
      Utils.showToast('Error adding party');
      return { success: false, error: error.message };
    }
  },

  // Update party
  async update(id, updates) {
    try {
      const party = await this.getById(id);
      const updated = { ...party, ...updates };
      await db.update('parties', updated);
      Utils.showToast('Party updated successfully');
      return { success: true };
    } catch (error) {
      Utils.showToast('Error updating party');
      return { success: false, error: error.message };
    }
  },

  // Delete party
  async delete(id) {
    if (!Utils.confirm('Are you sure you want to delete this party?')) {
      return { success: false };
    }

    try {
      await db.delete('parties', id);
      Utils.showToast('Party deleted successfully');
      return { success: true };
    } catch (error) {
      Utils.showToast('Error deleting party');
      return { success: false, error: error.message };
    }
  },

  // Get party ledger
  async getLedger(partyId) {
    const invoices = await db.getByIndex('invoices', 'partyId', partyId);
    const transactions = await db.getByIndex('transactions', 'partyId', partyId);
    
    // Combine and sort by date
    const entries = [...invoices, ...transactions].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    return entries;
  },

  // Get party outstanding
  async getOutstanding(partyId) {
    const party = await this.getById(partyId);
    return party ? party.currentBalance : 0;
  },

  // Update party balance
  async updateBalance(partyId, amount, type = 'debit') {
    const party = await this.getById(partyId);
    if (!party) return;

    if (type === 'debit') {
      party.currentBalance += amount;
    } else {
      party.currentBalance -= amount;
    }

    await db.update('parties', party);
  },

  // Search parties
  async search(query) {
    const parties = await this.getAll();
    const lowerQuery = query.toLowerCase();
    return parties.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.phone && p.phone.includes(query))
    );
  },

  // Send payment reminder via WhatsApp
  sendPaymentReminder(party, amount) {
    const message = `Dear ${party.name},\n\nThis is a friendly reminder about your outstanding payment of ${Utils.formatCurrency(amount)}.\n\nPlease make the payment at your earliest convenience.\n\nThank you!\n${Auth.currentBusiness.name}`;
    Utils.shareWhatsApp(party.phone, message);
  }
};
