// Currency denominations
const denominations = {
    1000: 1000,
    500: 500,
    100: 100,
    50: 50,
    20: 20,
    10: 10,
    5: 5,
    1: 1
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateDate();
    initializeInputListeners();
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

// Initialize input listeners
function initializeInputListeners() {
    // Cash inputs
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            if (input.id.startsWith('open-')) {
                calculateOpeningCash();
            } else if (input.id.startsWith('close-')) {
                calculateClosingCash();
            }
            updateSummary();
            autoCalculate();
        });

        // Enter key to move to next input
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const nextInput = getNextInput(input);
                if (nextInput) {
                    nextInput.focus();
                } else {
                    calculateAll();
                }
            }
        });
    });

    // Revenue and PromptPay
    document.getElementById('revenue').addEventListener('input', () => {
        updateSummary();
        autoCalculate();
    });
    document.getElementById('promptpay').addEventListener('input', () => {
        updateSummary();
        autoCalculate();
    });
}

// Get next input element
function getNextInput(currentInput) {
    const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
    const currentIndex = inputs.indexOf(currentInput);
    return inputs[currentIndex + 1] || null;
}

// Calculate opening cash
function calculateOpeningCash() {
    let total = 0;
    Object.keys(denominations).forEach(denom => {
        const input = document.getElementById(`open-${denom}`);
        if (input && input.value) {
            total += parseInt(input.value) * denominations[denom];
        }
    });

    document.getElementById('openingTotal').textContent = formatCurrency(total, true);
    return total;
}

// Calculate closing cash
function calculateClosingCash() {
    let total = 0;
    Object.keys(denominations).forEach(denom => {
        const input = document.getElementById(`close-${denom}`);
        if (input && input.value) {
            total += parseInt(input.value) * denominations[denom];
        }
    });

    document.getElementById('closingTotal').textContent = formatCurrency(total, true);
    document.getElementById('actualAmount').textContent = formatCurrency(total, true);
    return total;
}

// Update summary
function updateSummary() {
    const opening = calculateOpeningCash();
    const revenue = parseFloat(document.getElementById('revenue').value) || 0;
    const promptpay = parseFloat(document.getElementById('promptpay').value) || 0;

    document.getElementById('summaryOpening').textContent = formatCurrency(opening, true);
    document.getElementById('summaryRevenue').textContent = formatCurrency(revenue, true);
    document.getElementById('summaryPromptpay').textContent = formatCurrency(promptpay, true);

    const expected = opening + revenue - promptpay;
    document.getElementById('expectedCash').textContent = formatCurrency(expected, true);

    return expected;
}

// Auto calculate when all fields have values
function autoCalculate() {
    const hasClosingCash = document.getElementById('close-1000').value ||
                           document.getElementById('close-500').value ||
                           document.getElementById('close-100').value ||
                           document.getElementById('close-50').value ||
                           document.getElementById('close-20').value ||
                           document.getElementById('close-10').value ||
                           document.getElementById('close-5').value ||
                           document.getElementById('close-1').value;

    if (hasClosingCash) {
        calculateDifference();
    }
}

// Calculate difference
function calculateDifference() {
    const expected = updateSummary();
    const actual = calculateClosingCash();
    const difference = actual - expected;

    document.getElementById('resultDifference').textContent = formatCurrency(Math.abs(difference), true);

    const differenceBox = document.getElementById('differenceBox');
    const differenceStatus = document.getElementById('differenceStatus');

    differenceBox.classList.remove('status-perfect', 'status-over', 'status-short');

    if (Math.abs(difference) < 0.01) {
        differenceBox.classList.add('status-perfect');
        differenceStatus.textContent = '✅ ถูกต้อง';
    } else if (difference > 0) {
        differenceBox.classList.add('status-over');
        differenceStatus.textContent = `เกิน +${formatCurrency(difference, true)}`;
    } else {
        differenceBox.classList.add('status-short');
        differenceStatus.textContent = `ขาด -${formatCurrency(Math.abs(difference), true)}`;
    }
}

// Main calculation
function calculateAll() {
    calculateDifference();
}

// Clear all inputs
function clearAll() {
    if (confirm('ล้างข้อมูลทั้งหมด?')) {
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.value = '';
        });

        // Reset displays
        document.getElementById('openingTotal').textContent = '฿0';
        document.getElementById('closingTotal').textContent = '฿0';
        document.getElementById('summaryOpening').textContent = '฿0';
        document.getElementById('summaryRevenue').textContent = '฿0';
        document.getElementById('summaryPromptpay').textContent = '฿0';
        document.getElementById('expectedCash').textContent = '฿0';
        document.getElementById('actualAmount').textContent = '฿0';
        document.getElementById('resultDifference').textContent = '฿0';
        document.getElementById('differenceStatus').textContent = '';

        document.getElementById('differenceBox').classList.remove('status-perfect', 'status-over', 'status-short');
    }
}

// Print report
function printReport() {
    calculateAll();

    const printContent = `
        <style>
            * { font-family: 'Kanit', sans-serif; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .header { font-weight: bold; font-size: 18px; margin-bottom: 20px; }
            .total { font-weight: bold; background: #f5f5f5; }
        </style>
        <div class="header">รายงานการตรวจสอบลิ้นชักเงินสด</div>
        <div>วันที่: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        <table>
            <tr><td>เงินสดยกมา</td><td style="text-align: right">${document.getElementById('summaryOpening').textContent}</td></tr>
            <tr><td>บวก: รายรับ</td><td style="text-align: right">${document.getElementById('summaryRevenue').textContent}</td></tr>
            <tr><td>หัก: พร้อมเพย์</td><td style="text-align: right">${document.getElementById('summaryPromptpay').textContent}</td></tr>
            <tr class="total"><td>เงินที่ควรมี</td><td style="text-align: right">${document.getElementById('expectedCash').textContent}</td></tr>
            <tr class="total"><td>เงินที่นับได้</td><td style="text-align: right">${document.getElementById('actualAmount').textContent}</td></tr>
            <tr class="total"><td>ผลต่าง</td><td style="text-align: right">${document.getElementById('resultDifference').textContent} ${document.getElementById('differenceStatus').textContent}</td></tr>
        </table>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>รายงาน</title>
                <link href="<https://fonts.googleapis.com/css2?family=Kanit:wght@400;600&display=swap>" rel="stylesheet">
            </head>
            <body>${printContent}</body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
}

// Format currency (compact version)
function formatCurrency(amount, compact = false) {
    if (compact) {
        // Shortened format for display
        if (amount >= 1000000) {
            return `฿${(amount/1000000).toFixed(2)}M`;
        } else if (amount >= 1000) {
            return `฿${Math.floor(amount).toLocaleString('th-TH')}`;
        }
    }

    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'Enter':
                e.preventDefault();
                calculateAll();
                break;
            case 'd':
                e.preventDefault();
                clearAll();
                break;
            case 'p':
                e.preventDefault();
                printReport();
                break;
        }
    }
});
