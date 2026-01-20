// ===================================
// DATABASE LAYER - IndexedDB
// ===================================

const DB_NAME = 'BizBillerDB';
const DB_VERSION = 1;

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Business Store
        if (!db.objectStoreNames.contains('business')) {
          const businessStore = db.createObjectStore('business', { keyPath: 'id', autoIncrement: true });
          businessStore.createIndex('name', 'name', { unique: false });
        }

        // Users Store (for multi-user support)
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('businessId', 'businessId', { unique: false });
        }

        // Parties Store (Customers & Suppliers)
        if (!db.objectStoreNames.contains('parties')) {
          const partyStore = db.createObjectStore('parties', { keyPath: 'id', autoIncrement: true });
          partyStore.createIndex('name', 'name', { unique: false });
          partyStore.createIndex('phone', 'phone', { unique: false });
          partyStore.createIndex('type', 'type', { unique: false }); // 'customer' or 'supplier'
          partyStore.createIndex('businessId', 'businessId', { unique: false });
        }

        // Items/Products Store
        if (!db.objectStoreNames.contains('items')) {
          const itemStore = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
          itemStore.createIndex('name', 'name', { unique: false });
          itemStore.createIndex('barcode', 'barcode', { unique: false });
          itemStore.createIndex('category', 'category', { unique: false });
          itemStore.createIndex('businessId', 'businessId', { unique: false });
        }

        // Invoices Store
        if (!db.objectStoreNames.contains('invoices')) {
          const invoiceStore = db.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
          invoiceStore.createIndex('invoiceNo', 'invoiceNo', { unique: false });
          invoiceStore.createIndex('type', 'type', { unique: false }); // sale, purchase, estimate, etc.
          invoiceStore.createIndex('partyId', 'partyId', { unique: false });
          invoiceStore.createIndex('date', 'date', { unique: false });
          invoiceStore.createIndex('businessId', 'businessId', { unique: false });
        }

        // Transactions Store (Payments)
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
          transactionStore.createIndex('type', 'type', { unique: false }); // payment_in, payment_out
          transactionStore.createIndex('partyId', 'partyId', { unique: false });
          transactionStore.createIndex('invoiceId', 'invoiceId', { unique: false });
          transactionStore.createIndex('date', 'date', { unique: false });
          transactionStore.createIndex('businessId', 'businessId', { unique: false });
        }

        // Expenses Store
        if (!db.objectStoreNames.contains('expenses')) {
          const expenseStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
          expenseStore.createIndex('category', 'category', { unique: false });
          expenseStore.createIndex('date', 'date', { unique: false });
          expenseStore.createIndex('businessId', 'businessId', { unique: false });
        }

        // Bank Accounts Store
        if (!db.objectStoreNames.contains('bankAccounts')) {
          const bankStore = db.createObjectStore('bankAccounts', { keyPath: 'id', autoIncrement: true });
          bankStore.createIndex('businessId', 'businessId', { unique: false });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Categories Store
        if (!db.objectStoreNames.contains('categories')) {
          const categoryStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
          categoryStore.createIndex('type', 'type', { unique: false }); // item, expense
          categoryStore.createIndex('businessId', 'businessId', { unique: false });
        }
      };
    });
  }

  // Generic CRUD operations
  async add(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, id) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async update(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex(storeName, indexName, value) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllByIndex(storeName, indexName, value) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Business-specific queries
  async getBusinessData(businessId, storeName) {
    return await this.getByIndex(storeName, 'businessId', businessId);
  }

  // Clear all data (for reset/logout)
  async clearAll() {
    const storeNames = ['business', 'users', 'parties', 'items', 'invoices', 
                        'transactions', 'expenses', 'bankAccounts', 'categories'];
    
    for (const storeName of storeNames) {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// Initialize database instance
const db = new Database();
