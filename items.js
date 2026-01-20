// ===================================
// ITEMS/INVENTORY MANAGEMENT
// ===================================

const Items = {
  currentItems: [],

  // Get all items
  async getAll() {
    const businessId = Auth.currentBusiness.id;
    return await db.getBusinessData(businessId, 'items');
  },

  // Get item by ID
  async getById(id) {
    return await db.get('items', id);
  },

  // Get item by barcode
  async getByBarcode(barcode) {
    const items = await this.getAll();
    return items.find(i => i.barcode === barcode);
  },

  // Add new item
  async add(itemData) {
    try {
      const item = {
        ...itemData,
        businessId: Auth.currentBusiness.id,
        currentStock: itemData.openingStock || 0,
        createdAt: new Date().toISOString()
      };

      const id = await db.add('items', item);
      Utils.showToast('Item added successfully');
      return { success: true, id };
    } catch (error) {
      Utils.showToast('Error adding item');
      return { success: false, error: error.message };
    }
  },

  // Update item
  async update(id, updates) {
    try {
      const item = await this.getById(id);
      const updated = { ...item, ...updates };
      await db.update('items', updated);
      Utils.showToast('Item updated successfully');
      return { success: true };
    } catch (error) {
      Utils.showToast('Error updating item');
      return { success: false, error: error.message };
    }
  },

  // Delete item
  async delete(id) {
    if (!Utils.confirm('Are you sure you want to delete this item?')) {
      return { success: false };
    }

    try {
      await db.delete('items', id);
      Utils.showToast('Item deleted successfully');
      return { success: true };
    } catch (error) {
      Utils.showToast('Error deleting item');
      return { success: false, error: error.message };
    }
  },

  // Update stock
  async updateStock(itemId, quantity, type = 'add') {
    const item = await this.getById(itemId);
    if (!item) return { success: false };

    if (type === 'add') {
      item.currentStock += quantity;
    } else if (type === 'subtract') {
      if (item.currentStock < quantity) {
        Utils.showToast('Insufficient stock');
        return { success: false, error: 'Insufficient stock' };
      }
      item.currentStock -= quantity;
    }

    await db.update('items', item);
    
    // Check low stock alert
    const lowStockLimit = await Auth.getSetting('lowStockAlert') || 10;
    if (item.currentStock <= lowStockLimit) {
      Utils.showToast(`Low stock alert: ${item.name} (${item.currentStock} remaining)`);
    }

    return { success: true };
  },

  // Get low stock items
  async getLowStockItems() {
    const items = await this.getAll();
    const lowStockLimit = await Auth.getSetting('lowStockAlert') || 10;
    return items.filter(i => i.currentStock <= lowStockLimit);
  },

  // Get items by category
  async getByCategory(categoryId) {
    const items = await this.getAll();
    return items.filter(i => i.categoryId === categoryId);
  },

  // Search items
  async search(query) {
    const items = await this.getAll();
    const lowerQuery = query.toLowerCase();
    return items.filter(i => 
      i.name.toLowerCase().includes(lowerQuery) ||
      (i.barcode && i.barcode.includes(query)) ||
      (i.hsn && i.hsn.includes(query))
    );
  },

  // Generate barcode
  generateBarcode() {
    return 'BR' + Date.now().toString().slice(-10);
  },

  // Get categories
  async getCategories() {
    const businessId = Auth.currentBusiness.id;
    const categories = await db.getBusinessData(businessId, 'categories');
    return categories.filter(c => c.type === 'item');
  },

  // Add category
  async addCategory(name) {
    try {
      const id = await db.add('categories', {
        name,
        type: 'item',
        businessId: Auth.currentBusiness.id
      });
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
