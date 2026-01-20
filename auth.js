// ===================================
// AUTHENTICATION & USER MANAGEMENT
// ===================================

const Auth = {
  currentUser: null,
  currentBusiness: null,

  // Initialize authentication
  async init() {
    // Check if user is logged in
    const userId = Utils.storage.get('currentUserId');
    const businessId = Utils.storage.get('currentBusinessId');

    if (userId && businessId) {
      this.currentUser = await db.get('users', userId);
      this.currentBusiness = await db.get('business', businessId);
      return true;
    }
    return false;
  },

  // Setup new business (first time)
  async setupBusiness(businessData) {
    try {
      // Create business
      const businessId = await db.add('business', {
        name: businessData.name,
        address: businessData.address,
        phone: businessData.phone,
        email: businessData.email,
        gstin: businessData.gstin,
        logo: businessData.logo || null,
        createdAt: new Date().toISOString()
      });

      // Create admin user
      const userId = await db.add('users', {
        businessId: businessId,
        username: businessData.username || 'admin',
        pin: businessData.pin,
        role: 'admin',
        name: businessData.ownerName || businessData.name,
        createdAt: new Date().toISOString()
      });

      // Initialize default settings
      await this.initializeDefaultSettings(businessId);

      // Set current business and user
      Utils.storage.set('currentBusinessId', businessId);
      Utils.storage.set('currentUserId', userId);

      this.currentBusiness = await db.get('business', businessId);
      this.currentUser = await db.get('users', userId);

      return { success: true, businessId, userId };
    } catch (error) {
      console.error('Setup business error:', error);
      return { success: false, error: error.message };
    }
  },

  // Login with PIN
  async login(pin) {
    try {
      const users = await db.getAll('users');
      const user = users.find(u => u.pin === pin);

      if (user) {
        this.currentUser = user;
        this.currentBusiness = await db.get('business', user.businessId);
        
        Utils.storage.set('currentUserId', user.id);
        Utils.storage.set('currentBusinessId', user.businessId);

        return { success: true, user };
      } else {
        return { success: false, error: 'Invalid PIN' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  },

  // Logout
  logout() {
    this.currentUser = null;
    this.currentBusiness = null;
    Utils.storage.remove('currentUserId');
    Utils.storage.remove('currentBusinessId');
  },

  // Check if business exists
  async hasBusinessSetup() {
    const businesses = await db.getAll('business');
    return businesses.length > 0;
  },

  // Initialize default settings
  async initializeDefaultSettings(businessId) {
    const defaultSettings = {
      // Invoice settings
      invoicePrefix: 'INV',
      lastInvoiceNo: 0,
      estimatePrefix: 'EST',
      lastEstimateNo: 0,
      challanPrefix: 'DC',
      lastChallanNo: 0,
      
      // Tax settings
      defaultGSTRate: 18,
      taxRates: [0, 5, 12, 18, 28],
      
      // Display settings
      theme: 'light',
      language: 'en',
      currency: 'INR',
      
      // Print settings
      printFormat: 'a4',
      thermalPrinterWidth: '80mm',
      
      // Business settings
      businessId: businessId,
      enableInventory: true,
      lowStockAlert: 10,
      enableMultiUser: false
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      await db.add('settings', { key, value });
    }

    // Add default categories
    const defaultCategories = [
      { name: 'General', type: 'item', businessId },
      { name: 'Electronics', type: 'item', businessId },
      { name: 'Clothing', type: 'item', businessId },
      { name: 'Food & Beverages', type: 'item', businessId },
      { name: 'Office Expenses', type: 'expense', businessId },
      { name: 'Rent', type: 'expense', businessId },
      { name: 'Utilities', type: 'expense', businessId },
      { name: 'Salary', type: 'expense', businessId }
    ];

    for (const category of defaultCategories) {
      await db.add('categories', category);
    }

    // Add default bank account (Cash)
    await db.add('bankAccounts', {
      name: 'Cash in Hand',
      type: 'cash',
      balance: 0,
      businessId: businessId,
      createdAt: new Date().toISOString()
    });
  },

  // Add new user (for multi-user support)
  async addUser(userData) {
    if (this.currentUser.role !== 'admin') {
      return { success: false, error: 'Only admin can add users' };
    }

    try {
      const userId = await db.add('users', {
        businessId: this.currentBusiness.id,
        username: userData.username,
        pin: userData.pin,
        role: userData.role || 'staff',
        name: userData.name,
        createdAt: new Date().toISOString()
      });

      return { success: true, userId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get all users
  async getUsers() {
    if (!this.currentBusiness) return [];
    return await db.getByIndex('users', 'businessId', this.currentBusiness.id);
  },

  // Update business profile
  async updateBusiness(updates) {
    try {
      const updated = { ...this.currentBusiness, ...updates };
      await db.update('business', updated);
      this.currentBusiness = updated;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Change PIN
  async changePin(oldPin, newPin) {
    if (this.currentUser.pin !== oldPin) {
      return { success: false, error: 'Incorrect current PIN' };
    }

    try {
      this.currentUser.pin = newPin;
      await db.update('users', this.currentUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get setting value
  async getSetting(key) {
    const setting = await db.get('settings', key);
    return setting ? setting.value : null;
  },

  // Update setting
  async updateSetting(key, value) {
    try {
      await db.update('settings', { key, value });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
