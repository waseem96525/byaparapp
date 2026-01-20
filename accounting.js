// ===================================
// ACCOUNTING MODULE
// ===================================

const Accounting = {
  // Get all transactions
  async getAllTransactions() {
    const businessId = Auth.currentBusiness.id;
    return await db.getBusinessData(businessId, 'transactions');
  },

  // Get transactions by date range
  async getTransactionsByDateRange(startDate, endDate) {
    const transactions = await this.getAllTransactions();
    return transactions.filter(txn => 
      txn.date >= startDate && txn.date <= endDate
    );
  },

  // Get all bank accounts
  async getAllBankAccounts() {
    const businessId = Auth.currentBusiness.id;
    return await db.getBusinessData(businessId, 'bankAccounts');
  },

  // Add bank account
  async addBankAccount(accountData) {
    try {
      const account = {
        ...accountData,
        businessId: Auth.currentBusiness.id,
        balance: accountData.openingBalance || 0,
        createdAt: new Date().toISOString()
      };

      const id = await db.add('bankAccounts', account);
      Utils.showToast('Bank account added successfully');
      return { success: true, id };
    } catch (error) {
      Utils.showToast('Error adding bank account');
      return { success: false, error: error.message };
    }
  },

  // Update bank account balance
  async updateBankBalance(accountId, amount, type = 'credit') {
    const account = await db.get('bankAccounts', accountId);
    if (!account) return { success: false };

    if (type === 'credit') {
      account.balance += amount;
    } else {
      account.balance -= amount;
    }

    await db.update('bankAccounts', account);
    return { success: true };
  },

  // Get all expenses
  async getAllExpenses() {
    const businessId = Auth.currentBusiness.id;
    return await db.getBusinessData(businessId, 'expenses');
  },

  // Get expenses by date range
  async getExpensesByDateRange(startDate, endDate) {
    const expenses = await this.getAllExpenses();
    return expenses.filter(exp => 
      exp.date >= startDate && exp.date <= endDate
    );
  },

  // Add expense
  async addExpense(expenseData) {
    try {
      const expense = {
        ...expenseData,
        businessId: Auth.currentBusiness.id,
        createdAt: new Date().toISOString()
      };

      const id = await db.add('expenses', expense);

      // Update bank account if specified
      if (expenseData.accountId) {
        await this.updateBankBalance(expenseData.accountId, expenseData.amount, 'debit');
      }

      Utils.showToast('Expense added successfully');
      return { success: true, id };
    } catch (error) {
      Utils.showToast('Error adding expense');
      return { success: false, error: error.message };
    }
  },

  // Update expense
  async updateExpense(id, updates) {
    try {
      const expense = await db.get('expenses', id);
      const updated = { ...expense, ...updates };
      await db.update('expenses', updated);
      Utils.showToast('Expense updated successfully');
      return { success: true };
    } catch (error) {
      Utils.showToast('Error updating expense');
      return { success: false, error: error.message };
    }
  },

  // Delete expense
  async deleteExpense(id) {
    if (!Utils.confirm('Are you sure you want to delete this expense?')) {
      return { success: false };
    }

    try {
      const expense = await db.get('expenses', id);
      
      // Restore bank balance
      if (expense.accountId) {
        await this.updateBankBalance(expense.accountId, expense.amount, 'credit');
      }

      await db.delete('expenses', id);
      Utils.showToast('Expense deleted successfully');
      return { success: true };
    } catch (error) {
      Utils.showToast('Error deleting expense');
      return { success: false, error: error.message };
    }
  },

  // Get expense categories
  async getExpenseCategories() {
    const businessId = Auth.currentBusiness.id;
    const categories = await db.getBusinessData(businessId, 'categories');
    return categories.filter(c => c.type === 'expense');
  },

  // Get cash flow summary
  async getCashFlowSummary(startDate, endDate) {
    const transactions = await this.getTransactionsByDateRange(startDate, endDate);
    const expenses = await this.getExpensesByDateRange(startDate, endDate);

    let cashIn = 0;
    let cashOut = 0;

    transactions.forEach(txn => {
      if (txn.type === 'payment_in') {
        cashIn += txn.amount;
      } else if (txn.type === 'payment_out') {
        cashOut += txn.amount;
      }
    });

    expenses.forEach(exp => {
      cashOut += exp.amount;
    });

    return {
      cashIn,
      cashOut,
      netCashFlow: cashIn - cashOut
    };
  },

  // Get cash in hand
  async getCashInHand() {
    const accounts = await this.getAllBankAccounts();
    const cashAccount = accounts.find(acc => acc.type === 'cash');
    return cashAccount ? cashAccount.balance : 0;
  }
};
