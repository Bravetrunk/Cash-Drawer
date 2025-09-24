// Transactions Page JavaScript

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    updateDate();
    loadTransactions();
    updateStatistics();
    setInterval(updateDate, 60000);
});

// Update current date
function updateDate() {
    const now = new Date();
    const options = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const thaiDate = now.toLocaleDateString('th-TH', options);
    document.getElementById('currentDate').textContent = thaiDate;
}

// Load and display transactions
function loadTransactions(transactions = null) {
    const tbody = document.getElementById('transactionsTableBody');
    const noDataMsg = document.getElementById('noDataMessage');

    const data = transactions || transactionManager.getAllTransactions();

    if (data.length === 0) {
        tbody.innerHTML = '';
        noDataMsg.style.display = 'block';
        return;
    }

    noDataMsg.style.display = 'none';
    tbody.innerHTML = data.map(transaction => createTransactionRow(transaction)).join('');
}

// Create transaction table row
function createTransactionRow(t) {
    const date = new Date(t.timestamp);
    const statusClass = Math.abs(t.difference) < 0.01 ? 'status-perfect' :
                       t.difference > 0 ? 'status-over' : 'status-short';
    const statusText = Math.abs(t.difference) < 0.01 ? '✅ ถูกต้อง' :
                      t.difference > 0 ? `📈 เกิน` : `📉 ขาด`;

    return `
        <tr>
            <td>${date.toLocaleDateString('th-TH')}<br><small>${date.toLocaleTimeString('th-TH')}</small></td>
            <td>${transactionManager.getShiftName(t.shift)}</td>
            <td>${t.cashierName}</td>
            <td>${formatCurrency(t.openingCash)}</td>
            <td>${formatCurrency(t.revenue)}</td>
            <td>${formatCurrency(t.promptpay)}</td>
            <td>${formatCurrency(t.closingCash)}</td>
            <td class="${statusClass}">${formatCurrency(Math.abs(t.difference))}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="editTransaction('${t.id}')">✏️</button>
                    <button class="btn-action btn-delete" onclick="deleteTransaction('${t.id}')">🗑️</button>
                    <button class="btn-action btn-print" onclick="printTransaction('${t.id}')">🖨️</button>
                </div>
            </td>
        </tr>
    `;
}

// Update statistics
function updateStatistics() {
    const stats = transactionManager.getStatistics();
    document.getElementById('totalTransactions').textContent = stats.totalTransactions;
    document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue);
    document.getElementById('totalPromptpay').textContent = formatCurrency(stats.totalPromptpay);
    document.getElementById('perfectCount').textContent = stats.perfectCount;
}

// Filter transactions
function filterTransactions() {
    const filters = {
        date: document.getElementById('filterDate').value,
        shift: document.getElementById('filterShift').value,
        cashier: document.getElementById('filterCashier').value
    };

    const filtered = transactionManager.filterTransactions(filters);
    loadTransactions(filtered);
}

// Clear filters
function clearFilters() {
    document.getElementById('filterDate').value = '';
    document.getElementById('filterShift').value = '';
    document.getElementById('filterCashier').value = '';
    loadTransactions();
}

// Clear all transactions
function clearAllTransactions() {
    if (transactionManager.clearAll()) {
        loadTransactions();
        updateStatistics();
    }
}

// Edit transaction
function editTransaction(id) {
    const transaction = transactionManager.getTransaction(id);
    if (!transaction) return;

    // Show modal
    document.getElementById('editModal').style.display = 'flex';

    // Fill form with transaction data
    document.getElementById('editTransactionId').value = id;
    document.getElementById('editCashier').value = transaction.cashierName;
    document.getElementById('editShift').value = transaction.shift;
    document.getElementById('editRevenue').value = transaction.revenue;
    document.getElementById('editPromptpay').value = transaction.promptpay;
    document.getElementById('editNote').value = transaction.note || '';

    // Fill denominations
    const denominations = [1000, 500, 100, 50, 20, 10, 5, 1];
    denominations.forEach(denom => {
        document.getElementById(`editOpen${denom}`).value = transaction.openingDenominations[denom] || 0;
        document.getElementById(`editClose${denom}`).value = transaction.closingDenominations[denom] || 0;
    });
}

// Save edited transaction
function saveEditedTransaction() {
    const id = document.getElementById('editTransactionId').value;

    // Calculate new totals
    const denominations = [1000, 500, 100, 50, 20, 10, 5, 1];
    let openingCash = 0;
    let closingCash = 0;
    const openingDenominations = {};
    const closingDenominations = {};

    denominations.forEach(denom => {
        const openCount = parseInt(document.getElementById(`editOpen${denom}`).value) || 0;
        const closeCount = parseInt(document.getElementById(`editClose${denom}`).value) || 0;
        openingDenominations[denom] = openCount;
        closingDenominations[denom] = closeCount;
        openingCash += openCount * denom;
        closingCash += closeCount * denom;
    });

    const revenue = parseFloat(document.getElementById('editRevenue').value) || 0;
    const promptpay = parseFloat(document.getElementById('editPromptpay').value) || 0;
    const expectedCash = openingCash + revenue - promptpay;
    const difference = closingCash - expectedCash;

    const updatedData = {
        cashierName: document.getElementById('editCashier').value,
        shift: document.getElementById('editShift').value,
        revenue,
        promptpay,
        note: document.getElementById('editNote').value,
        openingCash,
        closingCash,
        expectedCash,
        difference,
        openingDenominations,
        closingDenominations
    };

    if (transactionManager.updateTransaction(id, updatedData)) {
        closeEditModal();
        loadTransactions();
        updateStatistics();
        alert('แก้ไขรายการสำเร็จ!');
    }
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Delete transaction
function deleteTransaction(id) {
    if (confirm('คุณต้องการลบรายการนี้หรือไม่?')) {
        if (transactionManager.deleteTransaction(id)) {
            loadTransactions();
            updateStatistics();
        }
    }
}

// Print single transaction
function printTransaction(id) {
    const t = transactionManager.getTransaction(id);
    if (!t) return;

    const date = new Date(t.timestamp);
    const printContent = `
        <style>
            * { font-family: 'Kanit', sans-serif; }
            .header { font-size: 20px; font-weight: bold; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .label { font-weight: bold; width: 150px; }
        </style>
        <div class="header">รายงานการตรวจสอบลิ้นชักเงินสด</div>
        <table>
            <tr><td class="label">วันที่:</td><td>${date.toLocaleDateString('th-TH')} ${date.toLocaleTimeString('th-TH')}</td></tr>
            <tr><td class="label">ผู้ทำรายการ:</td><td>${t.cashierName}</td></tr>
            <tr><td class="label">กะ:</td><td>${transactionManager.getShiftName(t.shift)}</td></tr>
            <tr><td class="label">เงินสดยกมา:</td><td>${formatCurrency(t.openingCash)}</td></tr>
            <tr><td class="label">รายรับ:</td><td>${formatCurrency(t.revenue)}</td></tr>
            <tr><td class="label">พร้อมเพย์:</td><td>${formatCurrency(t.promptpay)}</td></tr>
            <tr><td class="label">เงินที่ควรมี:</td><td>${formatCurrency(t.expectedCash)}</td></tr>
            <tr><td class="label">เงินที่นับได้:</td><td>${formatCurrency(t.closingCash)}</td></tr>
            <tr><td class="label">ผลต่าง:</td><td>${formatCurrency(Math.abs(t.difference))} ${transactionManager.getStatusText(t.difference)}</td></tr>
            ${t.note ? `<tr><td class="label">หมายเหตุ:</td><td>${t.note}</td></tr>` : ''}
        </table>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>พิมพ์รายการ</title>
                <link href="<https://fonts.googleapis.com/css2?family=Kanit:wght@400;600&display=swap>" rel="stylesheet">
            </head>
            <body>${printContent}</body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Export functionality
function exportTransactions() {
    transactionManager.exportToCSV();
}
