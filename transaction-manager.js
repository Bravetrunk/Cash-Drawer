// Transaction Manager - Core functionality for saving and managing transactions

class TransactionManager {
    constructor() {
        this.transactions = this.loadTransactions();
    }

    // Load transactions from localStorage
    loadTransactions() {
        const saved = localStorage.getItem('cashDrawerTransactions');
        return saved ? JSON.parse(saved) : [];
    }

    // Save transactions to localStorage
    saveTransactions() {
        localStorage.setItem('cashDrawerTransactions', JSON.stringify(this.transactions));
    }

    // Add new transaction
    addTransaction(transactionData) {
        const transaction = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...transactionData
        };

        this.transactions.unshift(transaction); // Add to beginning
        this.saveTransactions();
        return transaction;
    }

    // Update existing transaction
    updateTransaction(id, updatedData) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions[index] = {
                ...this.transactions[index],
                ...updatedData,
                lastModified: new Date().toISOString()
            };
            this.saveTransactions();
            return true;
        }
        return false;
    }

    // Delete transaction
    deleteTransaction(id) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions.splice(index, 1);
            this.saveTransactions();
            return true;
        }
        return false;
    }

    // Get transaction by ID
    getTransaction(id) {
        return this.transactions.find(t => t.id === id);
    }

    // Get all transactions
    getAllTransactions() {
        return this.transactions;
    }

    // Filter transactions
    filterTransactions(filters) {
        let filtered = [...this.transactions];

        if (filters.date) {
            filtered = filtered.filter(t => {
                const transactionDate = new Date(t.timestamp).toDateString();
                const filterDate = new Date(filters.date).toDateString();
                return transactionDate === filterDate;
            });
        }

        if (filters.shift) {
            filtered = filtered.filter(t => t.shift === filters.shift);
        }

        if (filters.cashier) {
            filtered = filtered.filter(t =>
                t.cashierName.toLowerCase().includes(filters.cashier.toLowerCase())
            );
        }

        return filtered;
    }

    // Get statistics
    getStatistics() {
        const stats = {
            totalTransactions: this.transactions.length,
            totalRevenue: 0,
            totalPromptpay: 0,
            perfectCount: 0,
            overCount: 0,
            shortCount: 0
        };

        this.transactions.forEach(t => {
            stats.totalRevenue += parseFloat(t.revenue) || 0;
            stats.totalPromptpay += parseFloat(t.promptpay) || 0;

            if (Math.abs(t.difference) < 0.01) {
                stats.perfectCount++;
            } else if (t.difference > 0) {
                stats.overCount++;
            } else {
                stats.shortCount++;
            }
        });

        return stats;
    }

    // Clear all transactions
    clearAll() {
        if (confirm('คุณต้องการลบประวัติทั้งหมดหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
            this.transactions = [];
            this.saveTransactions();
            return true;
        }
        return false;
    }

    // Export transactions to CSV
    exportToCSV() {
        const headers = ['วันที่', 'เวลา', 'กะ', 'ผู้ทำรายการ', 'เงินยกมา', 'รายรับ', 'พร้อมเพย์', 'เงินปิดกะ', 'ผลต่าง', 'สถานะ', 'หมายเหตุ'];
        const rows = this.transactions.map(t => {
            const date = new Date(t.timestamp);
            return [
                date.toLocaleDateString('th-TH'),
                date.toLocaleTimeString('th-TH'),
                this.getShiftName(t.shift),
                t.cashierName,
                t.openingCash,
                t.revenue,
                t.promptpay,
                t.closingCash,
                t.difference,
                this.getStatusText(t.difference),
                t.note || ''
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\\n');

        const blob = new Blob(['\\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `cash_drawer_transactions_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Helper methods
    getShiftName(shift) {
        const shifts = {
            'morning': 'กะเช้า',
            'afternoon': 'กะบ่าย',
            'night': 'กะดึก'
        };
        return shifts[shift] || shift;
    }

    getStatusText(difference) {
        if (Math.abs(difference) < 0.01) return 'ถูกต้อง';
        return difference > 0 ? 'เงินเกิน' : 'เงินขาด';
    }
}

// Initialize transaction manager
const transactionManager = new TransactionManager();

// Function to save current transaction (called from main page)
function saveTransaction() {
    // Calculate all values first
    calculateAll();

    // Get all input values
    const cashierName = document.getElementById('cashierName').value;
    const shift = document.getElementById('shiftSelect').value;
    const note = document.getElementById('transactionNote').value;

    if (!cashierName) {
        alert('กรุณากรอกชื่อผู้ทำรายการ');
        document.getElementById('cashierName').focus();
        return;
    }

    // Collect denomination data
    const openingDenominations = {};
    const closingDenominations = {};
    const denominations = [1000, 500, 100, 50, 20, 10, 5, 1];

    denominations.forEach(denom => {
        openingDenominations[denom] = parseInt(document.getElementById(`open-${denom}`).value) || 0;
        closingDenominations[denom] = parseInt(document.getElementById(`close-${denom}`).value) || 0;
    });

    // Get calculated values
    const openingCash = calculateOpeningCash();
    const closingCash = calculateClosingCash();
    const revenue = parseFloat(document.getElementById('revenue').value) || 0;
    const promptpay = parseFloat(document.getElementById('promptpay').value) || 0;
    const expectedCash = openingCash + revenue - promptpay;
    const difference = closingCash - expectedCash;

    // Create transaction object
    const transactionData = {
        cashierName,
        shift,
        note,
        openingCash,
        closingCash,
        revenue,
        promptpay,
        expectedCash,
        difference,
        openingDenominations,
        closingDenominations
    };

    // Save transaction
    const saved = transactionManager.addTransaction(transactionData);

    if (saved) {
        // Show success message
        const successMsg = document.getElementById('successMessage');
        successMsg.style.display = 'block';
        successMsg.classList.add('fade-in');

        // Hide message after 3 seconds
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);

        // Optional: Clear form after saving
        if (confirm('บันทึกสำเร็จ! ต้องการล้างข้อมูลเพื่อทำรายการใหม่หรือไม่?')) {
            clearAll();
        }
    }
}
