// ===================================
// SETTINGS & CONFIGURATION
// ===================================

const Settings = {
  // Get all settings
  async getAll() {
    return await db.getAll('settings');
  },

  // Get setting value
  async get(key) {
    return await Auth.getSetting(key);
  },

  // Update setting
  async update(key, value) {
    return await Auth.updateSetting(key, value);
  },

  // Backup data
  async backupData() {
    try {
      const backup = {
        version: 1,
        timestamp: new Date().toISOString(),
        business: await db.getAll('business'),
        users: await db.getAll('users'),
        parties: await db.getAll('parties'),
        items: await db.getAll('items'),
        invoices: await db.getAll('invoices'),
        transactions: await db.getAll('transactions'),
        expenses: await db.getAll('expenses'),
        bankAccounts: await db.getAll('bankAccounts'),
        categories: await db.getAll('categories'),
        settings: await db.getAll('settings')
      };

      const dataStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bizbiller_backup_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      Utils.showToast('Backup created successfully');
      return { success: true };
    } catch (error) {
      Utils.showToast('Error creating backup');
      return { success: false, error: error.message };
    }
  },

  // Restore data from backup
  async restoreData(file) {
    try {
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const backup = JSON.parse(e.target.result);
            
            // Clear existing data
            await db.clearAll();

            // Restore data
            for (const [storeName, data] of Object.entries(backup)) {
              if (storeName === 'version' || storeName === 'timestamp') continue;
              
              for (const item of data) {
                await db.add(storeName, item);
              }
            }

            Utils.showToast('Data restored successfully');
            resolve({ success: true });
          } catch (error) {
            Utils.showToast('Error restoring data');
            reject({ success: false, error: error.message });
          }
        };

        reader.onerror = () => {
          Utils.showToast('Error reading file');
          reject({ success: false, error: 'Error reading file' });
        };

        reader.readAsText(file);
      });
    } catch (error) {
      Utils.showToast('Error restoring data');
      return { success: false, error: error.message };
    }
  },

  // Toggle theme
  async toggleTheme() {
    const currentTheme = await this.get('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    await this.update('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    return newTheme;
  },

  // Change language
  async changeLanguage(lang) {
    await this.update('language', lang);
    // In a real app, this would trigger UI translation
    Utils.showToast(`Language changed to ${lang === 'en' ? 'English' : 'Hindi'}`);
  },

  // Reset all data
  async resetAllData() {
    if (!Utils.confirm('Are you sure you want to reset all data? This cannot be undone!')) {
      return { success: false };
    }

    if (!Utils.confirm('This will delete ALL your business data. Are you absolutely sure?')) {
      return { success: false };
    }

    try {
      await db.clearAll();
      Utils.storage.clear();
      Utils.showToast('All data has been reset');
      window.location.reload();
      return { success: true };
    } catch (error) {
      Utils.showToast('Error resetting data');
      return { success: false, error: error.message };
    }
  }
};
