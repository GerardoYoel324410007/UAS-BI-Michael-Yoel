// ==========================================================================
// PIZZAMETRICS CORE APPLICATION & SPK ENGINE
// ==========================================================================

// Markdown Content for 5 Business Questions
const businessQuestionsMarkdown = `
1. **Kapan terjadinya Peak Hours dalam penjualan pizza di restoran?**
   - **Puncak Pemesanan (Peak Hours):** Transaksi harian memuncak secara signifikan pada jam makan siang pukul **12:00 - 13:00** dan jam makan malam pukul **17:00 - 18:00**, bertepatan dengan aktivitas makan utama pelanggan.

2. **Kategori pizza manakah yang mendominasi Total Revenue secara keseluruhan**
   - **Dominasi Kategori:** Kategori **Classic** mendominasi perolehan pendapatan secara masif, diikuti berturut-turut oleh kategori **Supreme**, **Chicken**, dan terakhir kategori **Veggie** yang menyumbang pendapatan terendah.

3. **Apa ukuran pizza apa yang memiliki volume penjualan tertinggi/digemari pelanggan**
   - **Ukuran Terfavorit:** Ukuran **L (Large)** merupakan produk terlaris dengan volume penjualan tertinggi karena dinilai sebagai porsi ideal keluarga. Ukuran **M (Medium)** dan **S (Small)** menempati posisi menengah, sedangkan ukuran **XL** dan **XXL** berkontribusi sangat kecil terhadap volume penjualan.

4. **Apa 5 varian pizza yang menjadi Best-Sellers dan Worst seller**
   - **Top 5 Best-Sellers (Pendapatan Tertinggi):** *The BBQ Chicken Pizza*, *The California Chicken Pizza*, *The Classic Deluxe Pizza*, *The Spicy Italian Pizza*, dan *The Thai Chicken Pizza*.
   - **Bottom 5 Worst-Sellers (Pendapatan Terendah):** *The Spinach Supreme Pizza*, *The Green Garden Pizza*, *The Mediterranean Pizza*, *The Calabrese Pizza*, dan *The Brie Carré Pizza*.

5. **Bagaimana pergerakan tren Total Revenue restoran dari bulan ke bulan sepanjang tahun?**
   - **Tren Bulanan Pendapatan:** Pergerakan pendapatan bulanan relatif stabil dan konsisten sepanjang tahun, dengan puncak performa transaksi tertinggi terjadi pada bulan **Juli** dan **November**.
`;

// Global State
let chartInstances = {};
let aggregatedPizzaStats = []; // Aggregated statistics by pizza_name
let topsisResults = [];
let waspasResults = [];
let spkComparisonData = [];
let currentLambda = 0.50;

// Globally stored chart configurations for toggle clicks
let currentHourlyConfig = null;
let currentMonthlyConfig = null;
let currentBestConfig = null;
let currentWorstConfig = null;

// SPK Configuration Parameters (Dynamic)
let spkCriteria = [
    { id: 'C1', name: 'C1: Total Pendapatan / Revenue Contribution', weight: 0.30, type: 'benefit' },
    { id: 'C2', name: 'C2: Popularitas Massal / Sales Volume', weight: 0.25, type: 'benefit' },
    { id: 'C3', name: 'C3: Konsistensi Pemesanan / Order Frequency', weight: 0.15, type: 'benefit' },
    { id: 'C4', name: 'C4: Kompleksitas Dapur / Operational Burden', weight: 0.15, type: 'cost' },
    { id: 'C5', name: 'C5: Hambatan Harga / Price Barrier', weight: 0.15, type: 'cost' }
];
let spkMatrixOverrides = {}; // Map of altName -> { C1, C2, C3, C4, C5 }
let activeSpkTab = 'spk-info-panel';
let activeTopsisStep = 'all';
let activeWaspasStep = 'all';

// Helper: Count words in a string
function countWords(str) {
    if (!str) return 0;
    return str.split(/\s+/).filter(w => w.trim().length > 0).length;
}

// Helper: Date parser (Robust check for DD-MM-YYYY or MM/DD/YYYY)
function getMonthFromDate(dateStr) {
    if (!dateStr) return 1;
    const parts = dateStr.split(/[-/]/);
    if (parts.length < 2) return 1;
    const val2 = parseInt(parts[1]);
    return isNaN(val2) ? 1 : val2; // Returns 1-12
}

// Helper: Parse DD-MM-YYYY or D/M/YYYY into YYYY-MM-DD
function parseDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split(/[-/]/);
    if (parts.length < 3) return '';
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
}

// Helper: Safe Chart.js instance updating
function updateChart(id, config) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
    }
    const canvas = document.getElementById(id);
    if (canvas) {
        const ctx = canvas.getContext('2d');
        chartInstances[id] = new Chart(ctx, config);
    }
}

// Helper: Get dynamic chart colors based on current theme
function getThemeChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        textColor: isDark ? '#A39089' : '#6B5E6B', // Cocoa Powder vs Fig Muted
        gridColor: isDark ? 'rgba(54, 37, 33, 0.4)' : 'rgba(232, 228, 220, 0.6)', // Hot Mocha vs Apple Skin Light (reduced opacity for premium subtlety)
        primary: isDark ? '#D4A373' : '#E25822', // Melted Caramel vs Mandarin Orange
        secondary: isDark ? '#4EA8DE' : '#2B5C8F', // Mint Chocolate vs Wild Blueberry
        primaryLight: isDark ? 'rgba(212, 163, 115, 0.15)' : 'rgba(226, 88, 34, 0.1)',
        secondaryLight: isDark ? 'rgba(78, 168, 222, 0.15)' : 'rgba(43, 92, 143, 0.15)'
    };
}

// ==========================================================================
// CORE APP INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Register ChartJS DataLabels Plugin and disable it by default for all charts
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
        Chart.defaults.set('plugins.datalabels', {
            display: false
        });
    }

    // Theme Mode Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeToggleIcon(savedTheme);

        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', nextTheme);
            localStorage.setItem('theme', nextTheme);
            updateThemeToggleIcon(nextTheme);
            
            // Re-render all charts with new theme colors
            applyFilters();
            runSPK();
        });
    }

    function updateThemeToggleIcon(theme) {
        const icon = themeToggleBtn.querySelector('i');
        if (icon) {
            if (theme === 'dark') {
                icon.className = 'fa-solid fa-sun';
            } else {
                icon.className = 'fa-solid fa-moon';
            }
        }
    }

    // 1. Render Markdown Content
    const mdContainer = document.getElementById('markdown-container');
    if (mdContainer && window.marked) {
        mdContainer.innerHTML = marked.parse(businessQuestionsMarkdown);
    }

    // 2. Setup Tab Switching Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const topbarTitle = document.getElementById('topbar-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            item.classList.add('active');
            const target = item.getAttribute('data-target');
            const targetEl = document.getElementById(target);
            if (targetEl) targetEl.classList.add('active');

            if (target === 'dashboard-tab') {
                topbarTitle.textContent = 'Sales Analytics Dashboard';
            } else if (target === 'spk-tab') {
                topbarTitle.textContent = 'SPK Decision Analysis';
                // Trigger SPK computation & rendering on active tab to draw charts correctly
                runSPK();
            }
        });
    });

    // 3. Setup Collapsible QnA Panel
    const qnaHeader = document.querySelector('.qna-header');
    const qnaPanel = document.querySelector('.qna-panel');
    if (qnaHeader && qnaPanel) {
        qnaHeader.addEventListener('click', () => {
            qnaPanel.classList.toggle('collapsed');
        });
    }

    // 4. Setup Chart Toggle Listeners (Once)
    const btnHourly = document.getElementById('btn-toggle-hourly');
    const btnMonthly = document.getElementById('btn-toggle-monthly');
    if (btnHourly && btnMonthly) {
        btnHourly.addEventListener('click', () => {
            btnHourly.classList.add('active');
            btnMonthly.classList.remove('active');
            if (currentHourlyConfig) {
                updateChart('salesTrendChart', currentHourlyConfig);
            }
        });
        btnMonthly.addEventListener('click', () => {
            btnMonthly.classList.add('active');
            btnHourly.classList.remove('active');
            if (currentMonthlyConfig) {
                updateChart('salesTrendChart', currentMonthlyConfig);
            }
        });
    }

    const btnBest = document.getElementById('btn-toggle-best');
    const btnWorst = document.getElementById('btn-toggle-worst');
    if (btnBest && btnWorst) {
        btnBest.addEventListener('click', () => {
            btnBest.classList.add('active');
            btnWorst.classList.remove('active');
            if (currentBestConfig) {
                updateChart('rankingChart', currentBestConfig);
            }
        });
        btnWorst.addEventListener('click', () => {
            btnWorst.classList.add('active');
            btnBest.classList.remove('active');
            if (currentWorstConfig) {
                updateChart('rankingChart', currentWorstConfig);
            }
        });
    }

    // 5. Setup Filters Panel (Once)
    const categoryFilter = document.getElementById('categoryFilter');
    const sizeFilter = document.getElementById('sizeFilter');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');

    function applyFilters() {
        if (typeof pizzaData === 'undefined') return;

        const cat = categoryFilter.value;
        const sz = sizeFilter.value;
        const start = startDateFilter.value;
        const end = endDateFilter.value;

        const filtered = pizzaData.filter(row => {
            // Category Filter
            if (cat !== 'All' && row.pizza_category !== cat) {
                return false;
            }
            // Size Filter
            if (sz !== 'All' && row.pizza_size !== sz) {
                return false;
            }
            // Date Range Filter
            if (row.order_date) {
                const rowIso = parseDate(row.order_date);
                if (rowIso) {
                    if (start && rowIso < start) return false;
                    if (end && rowIso > end) return false;
                }
            }
            return true;
        });

        // Update status badge
        const statusBadge = document.getElementById('filter-status-badge');
        if (statusBadge) {
            const percent = ((filtered.length / pizzaData.length) * 100).toFixed(1);
            statusBadge.textContent = `Showing ${filtered.length.toLocaleString('en-US')} orders (${percent}%)`;
        }

        // Re-aggregate and update Dashboard
        initDataProcessing(filtered);

        // Re-run SPK calculations if active tab is SPK
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav && activeNav.getAttribute('data-target') === 'spk-tab') {
            runSPK();
        }
    }

    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
    if (sizeFilter) sizeFilter.addEventListener('change', applyFilters);
    if (startDateFilter) startDateFilter.addEventListener('change', applyFilters);
    if (endDateFilter) endDateFilter.addEventListener('change', applyFilters);

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            categoryFilter.value = 'All';
            sizeFilter.value = 'All';
            startDateFilter.value = '2015-01-01';
            endDateFilter.value = '2015-12-31';
            applyFilters();
        });
    }

    // 6. Initialize Data Processing & UI Rendering
    if (typeof pizzaData !== 'undefined' && pizzaData.length > 0) {
        initDataProcessing(pizzaData);
    } else {
        document.getElementById('loading-msg').textContent = 'Error: No data variable found!';
    }

    // Initialize SPK specific UI navigation and controls
    initSPKUI();

    // Hide Loading Spinner with smooth fadeout
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        }
    }, 600);
});

// ==========================================================================
// DATA PROCESSING & KPI COMPUTATION
// ==========================================================================

function initDataProcessing(data) {
    let totalRevenue = 0;
    const orderIds = new Set();
    let totalPizzaSold = 0;
    
    // Aggregation maps
    const hourlyOrders = Array(24).fill(0).map(() => new Set());
    const monthlyRevenue = Array(12).fill(0);
    const categoryRevenue = {};
    const sizeQuantity = {};
    const pizzaRevenueMap = {};
    const pizzaStats = {};

    data.forEach(row => {
        const qty = parseInt(row.quantity) || 0;
        const totalPrice = parseFloat(row.total_price) || 0;
        const unitPrice = parseFloat(row.unit_price) || 0;
        const orderId = row.order_id;
        const pizzaName = row.pizza_name;
        
        // Sum basic KPIs
        totalRevenue += totalPrice;
        totalPizzaSold += qty;
        if (orderId) orderIds.add(orderId);

        // 1. Hourly Trend Processing (Peak hours)
        if (row.order_time) {
            const hr = parseInt(row.order_time.split(':')[0]);
            if (!isNaN(hr) && hr >= 0 && hr < 24 && orderId) {
                hourlyOrders[hr].add(orderId);
            }
        }

        // 2. Monthly Trend Processing
        if (row.order_date) {
            const month = getMonthFromDate(row.order_date);
            monthlyRevenue[month - 1] += totalPrice;
        }

        // 3. Category Revenue
        if (row.pizza_category) {
            categoryRevenue[row.pizza_category] = (categoryRevenue[row.pizza_category] || 0) + totalPrice;
        }

        // 4. Size Quantity
        if (row.pizza_size) {
            sizeQuantity[row.pizza_size] = (sizeQuantity[row.pizza_size] || 0) + qty;
        }

        // 5. Pizza Name Standings (Best/Worst)
        if (pizzaName) {
            pizzaRevenueMap[pizzaName] = (pizzaRevenueMap[pizzaName] || 0) + totalPrice;

            // Aggregation for SPK Models
            if (!pizzaStats[pizzaName]) {
                pizzaStats[pizzaName] = {
                    name: pizzaName,
                    ingredients: row.pizza_ingredients || '',
                    category: row.pizza_category || 'Classic',
                    sumUnitPrice: 0,
                    count: 0,
                    volume: 0,
                    revenue: 0,
                    orderIds: new Set()
                };
            }
            pizzaStats[pizzaName].sumUnitPrice += unitPrice;
            pizzaStats[pizzaName].count += 1;
            pizzaStats[pizzaName].volume += qty;
            pizzaStats[pizzaName].revenue += totalPrice;
            if (row.order_id) {
                pizzaStats[pizzaName].orderIds.add(row.order_id);
            }
        }
    });

    // Populate global aggregated data for SPK models with direct quantitative criteria extraction
    aggregatedPizzaStats = Object.keys(pizzaStats).map(name => {
        const stats = pizzaStats[name];
        
        // C4: Kitchen Complexity / Operational Burden (Cost) = number of commas + 1
        const commaCount = (stats.ingredients.match(/,/g) || []).length;
        const c4Val = commaCount + 1;
        
        // C5: Hambatan Harga / Price Barrier (Cost) = average unit price
        const c5Val = stats.count > 0 ? (stats.sumUnitPrice / stats.count) : 0;

        return {
            name: name,
            C1: stats.revenue,
            C2: stats.volume,
            C3: stats.orderIds.size,
            C4: c4Val,
            C5: c5Val
        };
    });

    // Render KPI Values in DOM
    const totalOrdersCount = orderIds.size;
    const avgOrderValue = totalOrdersCount > 0 ? (totalRevenue / totalOrdersCount) : 0;
    document.getElementById('kpi-revenue').textContent = `$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('kpi-orders').textContent = totalOrdersCount.toLocaleString('en-US');
    document.getElementById('kpi-sold').textContent = totalPizzaSold.toLocaleString('en-US');
    document.getElementById('kpi-aov').textContent = `$${avgOrderValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // Initialize Dashboard UI charts
    initDashboardCharts({
        hourlyData: hourlyOrders.map(set => set.size),
        monthlyData: monthlyRevenue,
        categoryData: categoryRevenue,
        sizeData: sizeQuantity,
        pizzaRevenueData: pizzaRevenueMap
    });
}

// ==========================================================================
// INTERACTIVE DASHBOARD CHARTS (TAB 1)
// ==========================================================================

function initDashboardCharts(data) {
    const themeColors = getThemeChartColors();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // 1. Hourly vs Monthly Spline line chart toggle setup
    const hourlyLabels = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const monthlyLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Hourly configuration
    currentHourlyConfig = {
        type: 'line',
        data: {
            labels: hourlyLabels,
            datasets: [{
                label: 'Orders Count',
                data: data.hourlyData,
                borderColor: themeColors.primary,
                borderWidth: 3,
                backgroundColor: themeColors.primaryLight,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: themeColors.primary,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false } 
            },
            scales: {
                x: { 
                    grid: { display: false },
                    ticks: { color: themeColors.textColor }
                },
                y: { 
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor }
                }
            }
        }
    };

    // Monthly configuration
    currentMonthlyConfig = {
        type: 'bar',
        data: {
            labels: monthlyLabels,
            datasets: [{
                label: 'Monthly Revenue ($)',
                data: data.monthlyData,
                backgroundColor: themeColors.secondary,
                borderRadius: 8,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false } 
            },
            scales: {
                x: { 
                    grid: { display: false },
                    ticks: { color: themeColors.textColor }
                },
                y: { 
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor }
                }
            }
        }
    };

    // Initial trend chart render based on active toggle state
    const btnHourly = document.getElementById('btn-toggle-hourly');
    if (btnHourly && btnHourly.classList.contains('active')) {
        updateChart('salesTrendChart', currentHourlyConfig);
    } else {
        updateChart('salesTrendChart', currentMonthlyConfig);
    }

    // 2. Category Revenue contribution doughnut chart
    const catKeys = Object.keys(data.categoryData);
    const catVals = catKeys.map(k => data.categoryData[k]);
    updateChart('categoryChart', {
        type: 'doughnut',
        data: {
            labels: catKeys,
            datasets: [{
                data: catVals,
                backgroundColor: [
                    themeColors.primary, 
                    themeColors.secondary, 
                    isDark ? '#75635D' : '#8E818E', 
                    isDark ? '#B88B5D' : '#FFA07A'
                ],
                borderWidth: 2,
                borderColor: isDark ? '#1A110F' : '#FDFBF7'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        boxWidth: 12, 
                        font: { weight: 600 },
                        color: themeColors.textColor
                    } 
                },
                datalabels: {
                    display: true,
                    color: '#fff',
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    formatter: (value, ctx) => {
                        let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        let percentage = (value * 100 / sum).toFixed(1) + "%";
                        return percentage;
                    }
                }
            },
            cutout: '65%'
        }
    });

    // 3. Pizza size distribution doughnut chart
    // Reorder size keys standardly: S, M, L, XL, XXL
    const orderedSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const sizeVals = orderedSizes.map(sz => data.sizeData[sz] || 0);
    updateChart('sizeChart', {
        type: 'doughnut',
        data: {
            labels: orderedSizes,
            datasets: [{
                data: sizeVals,
                backgroundColor: [
                    themeColors.primary,
                    themeColors.secondary,
                    isDark ? '#75635D' : '#8E818E',
                    isDark ? '#B88B5D' : '#FFA07A',
                    isDark ? '#4EA8DE' : '#2B5C8F'
                ],
                borderWidth: 2,
                borderColor: isDark ? '#1A110F' : '#FDFBF7'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        boxWidth: 12, 
                        font: { weight: 600 },
                        color: themeColors.textColor
                    } 
                },
                datalabels: {
                    display: true,
                    color: '#fff',
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    formatter: (value, ctx) => {
                        let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        let percentage = (value * 100 / sum).toFixed(1) + "%";
                        return percentage;
                    }
                }
            },
            cutout: '65%'
        }
    });

    // 4. Best & Worst Pizza standings horizontal bar chart toggle setup
    const sortedRevenue = Object.keys(data.pizzaRevenueData)
        .map(k => ({ name: k, rev: data.pizzaRevenueData[k] }))
        .sort((a, b) => b.rev - a.rev);

    const bestSellers = sortedRevenue.slice(0, 5);
    const worstSellers = sortedRevenue.slice(-5).reverse(); // Reverse so the absolute lowest is at the bottom

    currentBestConfig = {
        type: 'bar',
        data: {
            labels: bestSellers.map(x => x.name),
            datasets: [{
                label: 'Revenue ($)',
                data: bestSellers.map(x => x.rev),
                backgroundColor: themeColors.primaryLight,
                borderColor: themeColors.primary,
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { 
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor }
                },
                y: { 
                    grid: { display: false },
                    ticks: { color: themeColors.textColor }
                }
            }
        }
    };

    currentWorstConfig = {
        type: 'bar',
        data: {
            labels: worstSellers.map(x => x.name),
            datasets: [{
                label: 'Revenue ($)',
                data: worstSellers.map(x => x.rev),
                backgroundColor: isDark ? 'rgba(216, 58, 86, 0.3)' : 'rgba(216, 58, 86, 0.15)',
                borderColor: '#D83A56',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { 
                    grid: { color: themeColors.gridColor },
                    ticks: { color: themeColors.textColor }
                },
                y: { 
                    grid: { display: false },
                    ticks: { color: themeColors.textColor }
                }
            }
        }
    };

    // Initial Best Sellers Render based on active toggle state
    const btnBest = document.getElementById('btn-toggle-best');
    if (btnBest && btnBest.classList.contains('active')) {
        updateChart('rankingChart', currentBestConfig);
    } else {
        updateChart('rankingChart', currentWorstConfig);
    }
}

// ==========================================================================
// DECISION SUPPORT SYSTEM (SPK) MATRICES COMPUTATION
// ==========================================================================

// TOPSIS Method Implementation
function calculateTOPSIS(matrix) {
    const m = matrix.length;
    
    // 1. Initial matrix (X)
    let initial = matrix.map(row => {
        let vals = {};
        spkCriteria.forEach(crit => {
            vals[crit.id] = Number(row[crit.id] || 0);
        });
        return {
            id: row.name,
            name: row.name,
            values: vals
        };
    });

    // 2. Divisors (Column Norms)
    let divisors = {};
    spkCriteria.forEach(crit => {
        let sumSq = 0;
        matrix.forEach(row => {
            let val = Number(row[crit.id] || 0);
            sumSq += val * val;
        });
        divisors[crit.id] = Math.sqrt(sumSq) || 1;
    });

    // 3. Normalized Matrix (R)
    let normalized = initial.map(alt => {
        let normAlt = { id: alt.id, name: alt.name, values: {} };
        spkCriteria.forEach(crit => {
            normAlt.values[crit.id] = alt.values[crit.id] / divisors[crit.id];
        });
        return normAlt;
    });

    // 4. Weighted Normalized Matrix (Y)
    let weighted = normalized.map(alt => {
        let wtAlt = { id: alt.id, name: alt.name, values: {} };
        spkCriteria.forEach(crit => {
            wtAlt.values[crit.id] = alt.values[crit.id] * crit.weight;
        });
        return wtAlt;
    });

    // 5. Ideal Solutions (A+ / A-)
    let idealPositive = {};
    let idealNegative = {};
    spkCriteria.forEach(crit => {
        let vals = weighted.map(alt => alt.values[crit.id]);
        if (crit.type === 'benefit') {
            idealPositive[crit.id] = Math.max(...vals);
            idealNegative[crit.id] = Math.min(...vals);
        } else {
            idealPositive[crit.id] = Math.min(...vals);
            idealNegative[crit.id] = Math.max(...vals);
        }
    });

    // 6. Distances (D+ / D-) and preference (V)
    let results = weighted.map(alt => {
        let sumSqPlus = 0;
        let sumSqMinus = 0;
        spkCriteria.forEach(crit => {
            let diffPlus = alt.values[crit.id] - idealPositive[crit.id];
            let diffMinus = alt.values[crit.id] - idealNegative[crit.id];
            sumSqPlus += diffPlus * diffPlus;
            sumSqMinus += diffMinus * diffMinus;
        });
        let dPlus = Math.sqrt(sumSqPlus);
        let dMinus = Math.sqrt(sumSqMinus);
        let preference = (dPlus + dMinus === 0) ? 0 : dMinus / (dPlus + dMinus);
        return {
            id: alt.id,
            name: alt.name,
            dPositive: dPlus,
            dNegative: dMinus,
            preference: preference
        };
    }).sort((a, b) => b.preference - a.preference).map((item, idx) => ({
        ...item,
        rank: idx + 1
    }));

    return {
        initial: initial,
        divisors: divisors,
        normalized: normalized,
        weighted: weighted,
        idealPositive: idealPositive,
        idealNegative: idealNegative,
        results: results
    };
}

// WASPAS Method Implementation
function calculateWASPAS(matrix, lambda) {
    const m = matrix.length;

    // 1. Initial matrix (X)
    let initial = matrix.map(row => {
        let vals = {};
        spkCriteria.forEach(crit => {
            vals[crit.id] = Number(row[crit.id] || 0);
        });
        return {
            id: row.name,
            name: row.name,
            values: vals
        };
    });

    // 2. Max/Min values
    let maxMinValues = {};
    spkCriteria.forEach(crit => {
        let vals = matrix.map(row => Number(row[crit.id] || 0));
        if (crit.type === 'benefit') {
            maxMinValues[crit.id] = Math.max(...vals) || 1;
        } else {
            maxMinValues[crit.id] = Math.min(...vals) || 1;
        }
    });

    // 3. Normalized Matrix (R)
    let normalized = initial.map(alt => {
        let normAlt = { id: alt.id, name: alt.name, values: {} };
        spkCriteria.forEach(crit => {
            let val = alt.values[crit.id];
            if (crit.type === 'benefit') {
                normAlt.values[crit.id] = val / maxMinValues[crit.id];
            } else {
                normAlt.values[crit.id] = val === 0 ? 0 : maxMinValues[crit.id] / val;
            }
        });
        return normAlt;
    });

    // 4. WSM & WPM Details
    let wsmDetails = [];
    let wpmDetails = [];

    normalized.forEach(alt => {
        let wsmVals = {};
        let wpmVals = {};
        let wsmScore = 0;
        let wpmScore = 1;

        spkCriteria.forEach(crit => {
            let normVal = alt.values[crit.id];
            let weight = crit.weight;

            // WSM term
            let wsmVal = normVal * weight;
            wsmVals[crit.id] = wsmVal;
            wsmScore += wsmVal;

            // WPM term
            let wpmVal = Math.pow(normVal, weight);
            wpmVals[crit.id] = wpmVal;
            wpmScore *= wpmVal;
        });

        wsmDetails.push({
            id: alt.id,
            name: alt.name,
            values: wsmVals,
            score: wsmScore
        });

        wpmDetails.push({
            id: alt.id,
            name: alt.name,
            values: wpmVals,
            score: wpmScore
        });
    });

    // 5. Combination score and ranking
    let results = initial.map(alt => {
        let wsmItem = wsmDetails.find(item => item.id === alt.id);
        let wpmItem = wpmDetails.find(item => item.id === alt.id);
        let qScore = lambda * wsmItem.score + (1 - lambda) * wpmItem.score;
        return {
            id: alt.id,
            name: alt.name,
            wsmScore: wsmItem.score,
            wpmScore: wpmItem.score,
            qScore: qScore
        };
    }).sort((a, b) => b.qScore - a.qScore).map((item, idx) => ({
        ...item,
        rank: idx + 1
    }));

    return {
        initial: initial,
        maxMinValues: maxMinValues,
        normalized: normalized,
        wsmDetails: wsmDetails,
        wpmDetails: wpmDetails,
        results: results
    };
}

// ==========================================================================
// CUSTOM K-MEANS CLUSTERING (k=3)
// ==========================================================================

function runKMeansClustering(matrix) {
    const m = matrix.length;
    
    // Normalize coordinates C5 (Price Barrier) and C4 (Complexity) to [0,1] to balance scale weight
    const c4Vals = matrix.map(x => x.C4);
    const c5Vals = matrix.map(x => x.C5);
    
    const minC4 = Math.min(...c4Vals);
    const maxC4 = Math.max(...c4Vals);
    const minC5 = Math.min(...c5Vals);
    const maxC5 = Math.max(...c5Vals);
    
    const scaleC4 = maxC4 - minC4 || 1;
    const scaleC5 = maxC5 - minC5 || 1;

    const dataset = matrix.map(row => ({
        name: row.name,
        rawC4: row.C4,
        rawC5: row.C5,
        x: (row.C5 - minC5) / scaleC5, // X-coordinate (Price)
        y: (row.C4 - minC4) / scaleC4  // Y-coordinate (Complexity)
    }));

    // Deterministic Centroids Initialization based on price distribution
    const sortedByPrice = [...dataset].sort((a, b) => a.x - b.x);
    let centroids = [
        { x: sortedByPrice[Math.floor(m * 0.1)].x, y: sortedByPrice[Math.floor(m * 0.1)].y }, // budget
        { x: sortedByPrice[Math.floor(m * 0.5)].x, y: sortedByPrice[Math.floor(m * 0.5)].y }, // value
        { x: sortedByPrice[Math.floor(m * 0.9)].x, y: sortedByPrice[Math.floor(m * 0.9)].y }  // premium
    ];

    let clusterAssignments = Array(m).fill(-1);
    let converged = false;
    let iterations = 0;

    while (!converged && iterations < 100) {
        iterations++;
        let changed = false;

        // Step A: Assign points to nearest centroid
        for (let i = 0; i < m; i++) {
            const pt = dataset[i];
            let minDist = Infinity;
            let bestCluster = 0;

            for (let c = 0; c < 3; c++) {
                const dx = pt.x - centroids[c].x;
                const dy = pt.y - centroids[c].y;
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                    minDist = dist;
                    bestCluster = c;
                }
            }

            if (clusterAssignments[i] !== bestCluster) {
                clusterAssignments[i] = bestCluster;
                changed = true;
            }
        }

        // Step B: Update centroids coordinates
        const sums = Array(3).fill(0).map(() => ({ x: 0, y: 0, count: 0 }));
        for (let i = 0; i < m; i++) {
            const clus = clusterAssignments[i];
            sums[clus].x += dataset[i].x;
            sums[clus].y += dataset[i].y;
            sums[clus].count++;
        }

        const nextCentroids = centroids.map((c, idx) => {
            const sum = sums[idx];
            if (sum.count === 0) return c; // keep same if empty
            return { x: sum.x / sum.count, y: sum.y / sum.count };
        });

        // Check if centroids changed
        let diff = 0;
        for (let c = 0; c < 3; c++) {
            diff += Math.abs(centroids[c].x - nextCentroids[c].x);
            diff += Math.abs(centroids[c].y - nextCentroids[c].y);
        }

        centroids = nextCentroids;
        if (!changed || diff < 1e-6) {
            converged = true;
        }
    }

    // Attach cluster index to data
    dataset.forEach((pt, i) => {
        pt.cluster = clusterAssignments[i];
    });

    // Sort clusters based on average raw unit price (C5) so they map to tiers correctly
    const clusterAverages = Array(3).fill(0).map((_, idx) => {
        const pts = dataset.filter(p => p.cluster === idx);
        const avgPrice = pts.length === 0 ? 0 : pts.reduce((sum, p) => sum + p.rawC5, 0) / pts.length;
        return { index: idx, avgPrice: avgPrice };
    });
    clusterAverages.sort((a, b) => a.avgPrice - b.avgPrice);

    // Map sorted tiers to names: index 0 -> Underperformers (low), 1 -> Average (mid), 2 -> Star (high)
    const clusterMapping = {};
    clusterAverages.forEach((item, sortedIdx) => {
        clusterMapping[item.index] = sortedIdx; // original cluster index maps to sorted tier index (0,1,2)
    });

    dataset.forEach(pt => {
        pt.cluster = clusterMapping[pt.cluster]; // replace cluster index with sorted tier index
    });

    return dataset;
}

// ==========================================================================
// RUN SPK COMPUTATION & UI RENDERING (TAB 2)
// ==========================================================================

// Global dynamic active matrix mapping overrides
let activeMatrix = [];

function runSPK() {
    if (aggregatedPizzaStats.length === 0) return;

    // 1. Verify Weights (Must sum to exactly 100%)
    const totalWeightPct = spkCriteria.reduce((sum, c) => sum + c.weight * 100, 0);
    const weightCheckOk = Math.abs(totalWeightPct - 100) < 0.01;

    const alertBanner = document.getElementById('spk-weight-alert');
    const weightValEl = document.getElementById('spk-weight-total-val');
    if (alertBanner && weightValEl) {
        weightValEl.textContent = `${totalWeightPct.toFixed(1)}%`;
        if (weightCheckOk) {
            alertBanner.style.display = 'none';
        } else {
            alertBanner.style.display = 'flex';
        }
    }

    // Disable or enable sub-tabs based on weight constraints
    document.querySelectorAll('.spk-sub-tab-btn').forEach(btn => {
        const target = btn.getAttribute('data-spk-target');
        if (target === 'spk-topsis-panel' || target === 'spk-waspas-panel' || target === 'spk-ranking-panel') {
            btn.disabled = !weightCheckOk;
            btn.title = weightCheckOk ? '' : 'Total bobot kriteria harus 100%';
            if (!weightCheckOk && btn.classList.contains('active')) {
                // Fallback to Info tab if active tab gets disabled
                switchSpkTab('spk-info-panel');
            }
        }
    });

    // 2. Build the Active Matrix from Aggregated Stats + Overrides
    activeMatrix = aggregatedPizzaStats.map(row => {
        const name = row.name;
        const overrides = spkMatrixOverrides[name] || {};
        let rowObj = { name: name };
        spkCriteria.forEach(crit => {
            rowObj[crit.id] = overrides[crit.id] ?? row[crit.id];
        });
        return rowObj;
    });

    // Render configuration inputs and decision matrix inputs regardless of calculation states
    renderCriteriaConfig();
    renderDecisionMatrixTable(activeMatrix);

    if (!weightCheckOk) return;

    // 3. Execute calculations
    const topsisData = calculateTOPSIS(activeMatrix);
    const waspasData = calculateWASPAS(activeMatrix, currentLambda);

    topsisResults = topsisData.results;
    waspasResults = waspasData.results;

    // 4. Compile Rankings
    const topsisRankMap = {};
    topsisResults.forEach(item => {
        topsisRankMap[item.name] = item.rank;
    });

    const waspasRankMap = {};
    waspasResults.forEach(item => {
        waspasRankMap[item.name] = item.rank;
    });

    // Compile parallel benchmarking data
    spkComparisonData = activeMatrix.map(item => {
        const name = item.name;
        const topScore = topsisResults.find(x => x.name === name).preference;
        const topRank = topsisRankMap[name];
        const wasScore = waspasResults.find(x => x.name === name).qScore;
        const wasRank = waspasRankMap[name];

        return {
            name: name,
            topsisScore: topScore,
            topsisRank: topRank,
            waspasScore: wasScore,
            waspasRank: wasRank,
            diff: topRank - wasRank // positive means ranked better/higher in WASPAS
        };
    }).sort((a, b) => a.topsisRank - b.topsisRank);

    // 5. Render active SPK panel structures
    if (activeSpkTab === 'spk-topsis-panel') {
        const topsisContainer = document.getElementById('topsis-steps-container');
        if (topsisContainer) {
            topsisContainer.innerHTML = getTopsisStepHTML(activeTopsisStep, topsisData);
        }
    } else if (activeSpkTab === 'spk-waspas-panel') {
        const waspasContainer = document.getElementById('waspas-steps-container');
        if (waspasContainer) {
            waspasContainer.innerHTML = getWaspasStepHTML(activeWaspasStep, waspasData, currentLambda);
        }
    } else if (activeSpkTab === 'spk-ranking-panel') {
        // Render comparison table
        renderComparisonRankingTable(spkComparisonData);
    }
}

// Render configuration inputs for criteria weights and types
function renderCriteriaConfig() {
    const tbody = document.getElementById('criteria-config-tbody');
    if (!tbody) return;
    
    // Check if we need to regenerate to avoid resetting cursor on inputs
    // If table already has inputs, only update value if not focused
    const hasRows = tbody.children.length > 0;
    
    if (!hasRows) {
        tbody.innerHTML = '';
        spkCriteria.forEach(crit => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${crit.id}</strong></td>
                <td>${crit.name.split(': ')[1]}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="number" class="table-cell-input criteria-weight-input" data-crit-id="${crit.id}" min="0" max="100" value="${(crit.weight * 100).toFixed(0)}">
                        <span>%</span>
                    </div>
                </td>
                <td>
                    <select class="filter-select criteria-type-select" data-crit-id="${crit.id}" style="width: 150px; height: 38px; padding: 6px 12px; margin: 0;">
                        <option value="benefit" ${crit.type === 'benefit' ? 'selected' : ''}>Benefit</option>
                        <option value="cost" ${crit.type === 'cost' ? 'selected' : ''}>Cost</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners
        tbody.querySelectorAll('.criteria-weight-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const critId = e.target.getAttribute('data-crit-id');
                const val = parseFloat(e.target.value);
                const crit = spkCriteria.find(c => c.id === critId);
                if (crit && !isNaN(val)) {
                    crit.weight = val / 100;
                    runSPK();
                }
            });
        });

        tbody.querySelectorAll('.criteria-type-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const critId = e.target.getAttribute('data-crit-id');
                const val = e.target.value;
                const crit = spkCriteria.find(c => c.id === critId);
                if (crit) {
                    crit.type = val;
                    runSPK();
                }
            });
        });
    } else {
        // Just update values if not active
        spkCriteria.forEach(crit => {
            const input = tbody.querySelector(`.criteria-weight-input[data-crit-id="${crit.id}"]`);
            if (input && document.activeElement !== input) {
                input.value = (crit.weight * 100).toFixed(0);
            }
            const select = tbody.querySelector(`.criteria-type-select[data-crit-id="${crit.id}"]`);
            if (select && document.activeElement !== select) {
                select.value = crit.type;
            }
        });
    }
}

// Render decision matrix table with inputs
function renderDecisionMatrixTable(matrixData) {
    const tbody = document.querySelector('#decision-matrix-table tbody');
    if (!tbody) return;

    // Check if table is empty
    const hasRows = tbody.children.length > 0;
    
    if (!hasRows) {
        tbody.innerHTML = '';
        matrixData.forEach(row => {
            const tr = document.createElement('tr');
            
            let cellsHTML = `<td><strong>${row.name}</strong></td>`;
            spkCriteria.forEach(crit => {
                const val = spkMatrixOverrides[row.name]?.[crit.id] ?? row[crit.id];
                // Format C1 (revenue) and C5 (average price) to 2 decimals for cleaner display. Others can be shown directly.
                const formattedVal = (crit.id === 'C1' || crit.id === 'C5') ? Number(val).toFixed(2) : val.toString();
                cellsHTML += `<td style="text-align: center;"><input type="number" step="any" class="table-cell-input matrix-cell-input" data-pizza="${row.name}" data-crit="${crit.id}" value="${formattedVal}"></td>`;
            });
            
            tr.innerHTML = cellsHTML;
            tbody.appendChild(tr);
        });

        // Add event listeners
        tbody.querySelectorAll('.matrix-cell-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const pizzaName = e.target.getAttribute('data-pizza');
                const critId = e.target.getAttribute('data-crit');
                const val = parseFloat(e.target.value);
                
                if (!spkMatrixOverrides[pizzaName]) {
                    spkMatrixOverrides[pizzaName] = {};
                }
                spkMatrixOverrides[pizzaName][critId] = isNaN(val) ? 0 : val;
                runSPK();
            });
        });
    } else {
        // Just update values if not active
        matrixData.forEach(row => {
            spkCriteria.forEach(crit => {
                const val = spkMatrixOverrides[row.name]?.[crit.id] ?? row[crit.id];
                const input = tbody.querySelector(`.matrix-cell-input[data-pizza="${row.name}"][data-crit="${crit.id}"]`);
                if (input && document.activeElement !== input) {
                    input.value = (crit.id === 'C1' || crit.id === 'C5') ? Number(val).toFixed(2) : val.toString();
                }
            });
        });
    }
}

// Generate TOPSIS Steps HTML representation
function getTopsisStepHTML(step, data) {
    const { initial, divisors, normalized, weighted, idealPositive, idealNegative, results } = data;
    
    const initialTableHTML = () => `
        <div class="step-card-header">
            <h3>Matriks Keputusan Awal (X)</h3>
        </div>
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Alternatif</th>
                        ${spkCriteria.map(c => `<th>${c.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${initial.map(row => `
                        <tr>
                            <td><strong>${row.name}</strong></td>
                            ${spkCriteria.map(c => {
                                const val = row.values[c.id];
                                return `<td>${(c.id === 'C1' || c.id === 'C5') ? Number(val).toFixed(2) : val}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    const step1HTML = () => `
        <div class="step-card-header">
            <h3>Langkah 1: Normalisasi Matriks (R)</h3>
            <span class="math-symbol">r_ij = x_ij / √(∑ x_kj^2)</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-sub); margin-bottom: 12px;">
            Tiap elemen matriks dibagi dengan akar jumlah kuadrat elemen satu kolom (pembagi kolom).
        </p>
        <div class="glass-panel" style="padding: 16px; margin-bottom: 16px; background: rgba(255, 255, 255, 0.4);">
            <strong>Nilai Pembagi (Divisor) Kolom:</strong>
            <div style="display: flex; flex-wrap: wrap; gap: 24px; margin-top: 8px;">
                ${spkCriteria.map(c => `
                    <div style="font-size: 0.85rem;">
                        <strong>${c.name.split(': ')[1]}:</strong>
                        <code style="color: var(--primary); font-weight: bold; font-family: monospace;">${divisors[c.id].toFixed(4)}</code>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Alternatif</th>
                        ${spkCriteria.map(c => `<th>${c.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${normalized.map(row => `
                        <tr>
                            <td><strong>${row.name}</strong></td>
                            ${spkCriteria.map(c => `<td>${row.values[c.id].toFixed(4)}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    const step2HTML = () => `
        <div class="step-card-header">
            <h3>Langkah 2: Matriks Normalisasi Terbobot (Y)</h3>
            <span class="math-symbol">y_ij = r_ij × w_j</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-sub); margin-bottom: 12px;">
            Mengalikan matriks ternormalisasi R dengan bobot kriteria masing-masing.
        </p>
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Alternatif</th>
                        ${spkCriteria.map(c => `
                            <th>
                                ${c.name}
                                <div style="font-size: 0.75rem; font-weight: normal; color: var(--text-sub);">
                                    Bobot: ${(c.weight * 100).toFixed(0)}% (${c.weight.toFixed(2)})
                                </div>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${weighted.map(row => `
                        <tr>
                            <td><strong>${row.name}</strong></td>
                            ${spkCriteria.map(c => `<td>${row.values[c.id].toFixed(4)}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    const step3HTML = () => `
        <div class="step-card-header">
            <h3>Langkah 3: Menentukan Solusi Ideal Positif (A+) & Negatif (A-)</h3>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-sub); margin-bottom: 16px;">
            - Untuk kriteria <strong>Benefit</strong>: A+ mencari nilai tertinggi (max), A- mencari nilai terendah (min).<br>
            - Untuk kriteria <strong>Cost</strong>: A+ mencari nilai terendah (min), A- mencari nilai tertinggi (max).
        </p>
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th style="width: 40%;">Kriteria</th>
                        <th style="width: 20%;">Tipe</th>
                        <th style="width: 20%;">Ideal Positif (A+)</th>
                        <th style="width: 20%;">Ideal Negatif (A-)</th>
                    </tr>
                </thead>
                <tbody>
                    ${spkCriteria.map(c => `
                        <tr>
                            <td><strong>${c.name}</strong></td>
                            <td><span class="badge ${c.type === 'benefit' ? 'badge-benefit' : 'badge-cost'}">${c.type}</span></td>
                            <td style="color: var(--primary); font-weight: 600;">${idealPositive[c.id].toFixed(4)}</td>
                            <td style="color: #b36b00; font-weight: 600;">${idealNegative[c.id].toFixed(4)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    const step4HTML = () => `
        <div class="step-card-header">
            <h3>Langkah 4: Menghitung Jarak Solusi (D+ & D-)</h3>
            <span class="math-symbol">Di+ = √(∑(y_ij - y+_j)^2) | Di- = √(∑(y_ij - y-_j)^2)</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-sub); margin-bottom: 12px;">
            Mengukur seberapa jauh nilai tertimbang setiap alternatif dari titik ideal positif dan negatif.
        </p>
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Alternatif</th>
                        <th>Jarak Ideal Positif (D+)</th>
                        <th>Jarak Ideal Negatif (D-)</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(row => `
                        <tr>
                            <td><strong>${row.name}</strong></td>
                            <td style="color: var(--primary); font-weight: 500;">${row.dPositive.toFixed(4)}</td>
                            <td style="color: #b36b00; font-weight: 500;">${row.dNegative.toFixed(4)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    const step5HTML = () => `
        <div class="step-card-header">
            <h3>Langkah 5: Nilai Preferensi (V) & Ranking Akhir TOPSIS</h3>
            <span class="math-symbol">V_i = D_i^- / (D_i^+ + D_i^-)</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-sub); margin-bottom: 12px;">
            Alternatif diurutkan berdasarkan nilai preferensi V yang terbesar ke terkecil. Nilai V mendekati 1 memiliki prioritas tertinggi.
        </p>
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th style="width: 10%;">Rank</th>
                        <th style="width: 45%;">Alternatif Pizza</th>
                        <th style="width: 22.5%;">Nilai Preferensi (V)</th>
                        <th style="width: 22.5%;">Status Rekomendasi</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(row => {
                        let recBadge = '';
                        if (row.rank === 1) {
                            recBadge = '<span class="badge badge-benefit" style="text-transform: none;">⭐ VIP Utama</span>';
                        } else if (row.preference > 0.5) {
                            recBadge = '<span class="badge badge-secondary" style="text-transform: none;">Layak VIP</span>';
                        } else {
                            recBadge = '<span class="badge badge-cost" style="text-transform: none;">Prioritas Rendah</span>';
                        }
                        return `
                            <tr>
                                <td><span class="rank-badge ${row.rank <= 3 ? 'rank-' + row.rank : 'rank-other'}">${row.rank}</span></td>
                                <td><strong>${row.name}</strong></td>
                                <td style="font-weight: 600; color: var(--primary);">${row.preference.toFixed(4)}</td>
                                <td>${recBadge}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    if (step === 'step1') return step1HTML();
    if (step === 'step2') return step2HTML();
    if (step === 'step3') return step3HTML();
    if (step === 'step4') return step4HTML();
    if (step === 'step5') return step5HTML();
    
    // 'all'
    return `
        <div class="glass-panel" style="display: flex; flex-direction: column; gap: 32px; background: white;">
            ${initialTableHTML()}
            <hr style="border-color: rgba(141, 158, 255, 0.15);">
            ${step1HTML()}
            <hr style="border-color: rgba(141, 158, 255, 0.15);">
            ${step2HTML()}
            <hr style="border-color: rgba(141, 158, 255, 0.15);">
            ${step3HTML()}
            <hr style="border-color: rgba(141, 158, 255, 0.15);">
            ${step4HTML()}
            <hr style="border-color: rgba(141, 158, 255, 0.15);">
            ${step5HTML()}
        </div>
    `;
}

// Generate WASPAS Steps HTML representation
function getWaspasStepHTML(step, data, lambda) {
    const { initial, maxMinValues, normalized, wsmDetails, wpmDetails, results } = data;
    
    const initialTableHTML = () => `
        <div class="step-card-header">
            <h3>Matriks Keputusan Awal (X)</h3>
        </div>
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Alternatif</th>
                        ${spkCriteria.map(c => `<th>${c.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${initial.map(row => `
                        <tr>
                            <td><strong>${row.name}</strong></td>
                            ${spkCriteria.map(c => {
                                const val = row.values[c.id];
                                return `<td>${(c.id === 'C1' || c.id === 'C5') ? Number(val).toFixed(2) : val}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    const step1HTML = () => `
        <div class="step-card-header">
            <h3>Langkah 1: Normalisasi Matriks (R)</h3>
            <div style="text-align: right; font-size: 0.8rem;">
                <span class="math-symbol" style="display: block;">Benefit: r_ij = x_ij / max(x_j)</span>
                <span class="math-symbol" style="display: block;">Cost: r_ij = min(x_j) / x_ij</span>
            </div>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-sub); margin-bottom: 12px;">
            Nilai benefit dibagi dengan nilai tertinggi (max) dari kolom tersebut. Nilai cost adalah nilai terendah (min) kolom dibagi dengan nilai alternatif terkait.
        </p>
        <div class="glass-panel" style="padding: 16px; margin-bottom: 16px; background: rgba(255, 255, 255, 0.4);">
            <strong>Nilai Referensi (Max untuk Benefit, Min untuk Cost):</strong>
            <div style="display: flex; flex-wrap: wrap; gap: 24px; margin-top: 8px;">
                ${spkCriteria.map(c => `
                    <div style="font-size: 0.85rem;">
                        <strong>${c.name.split(': ')[1]} (${c.type}):</strong>
                        <code style="color: var(--primary); font-weight: bold; font-family: monospace;">${maxMinValues[c.id].toFixed(2)}</code>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Alternatif</th>
                        ${spkCriteria.map(c => `<th>${c.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${normalized.map(row => `
                        <tr>
                            <td><strong>${row.name}</strong></td>
                            ${spkCriteria.map(c => `<td>${row.values[c.id].toFixed(4)}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    const step2HTML = () => `
        <div class="step-card-header">
            <h3>Langkah 2: Weighted Sum Model (WSM / Q_i^(1))</h3>
            <span class="math-symbol">Q_i^(1) = ∑ (r_ij × w_j)</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-sub); margin-bottom: 12px;">
            Mengalikan nilai normalisasi R dengan bobot kriteria masing-masing, kemudian menjumlahkannya per baris alternatif.
        </p>
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Alternatif</th>
                        ${spkCriteria.map(c => `
                            <th>
                                ${c.name}
                                <div style="font-size: 0.75rem; font-weight: normal; color: var(--text-sub);">
                                    (r × ${c.weight.toFixed(2)})
                                </div>
                            </th>
                        `).join('')}
                        <th style="background-color: rgba(108, 74, 182, 0.05); font-weight: bold;">Total WSM (Q_i^(1))</th>
                    </tr>
                </thead>
                <tbody>
                    ${wsmDetails.map(row => `
                        <tr>
                            <td><strong>${row.name}</strong></td>
                            ${spkCriteria.map(c => `<td>${row.values[c.id].toFixed(4)}</td>`).join('')}
                            <td style="font-weight: bold; color: var(--primary); background-color: rgba(108, 74, 182, 0.03);">${row.score.toFixed(4)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    const step3HTML = () => `
        <div class="step-card-header">
            <h3>Langkah 3: Weighted Product Model (WPM / Q_i^(2))</h3>
            <span class="math-symbol">Q_i^(2) = ∏ (r_ij ^ w_j)</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-sub); margin-bottom: 12px;">
            Memangkatkan nilai normalisasi R dengan bobot kriteria masing-masing, kemudian mengalikannya secara horizontal per baris alternatif.
        </p>
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Alternatif</th>
                        ${spkCriteria.map(c => `
                            <th>
                                ${c.name}
                                <div style="font-size: 0.75rem; font-weight: normal; color: var(--text-sub);">
                                    (r ^ ${c.weight.toFixed(2)})
                                </div>
                            </th>
                        `).join('')}
                        <th style="background-color: rgba(0, 210, 196, 0.05); font-weight: bold;">Total WPM (Q_i^(2))</th>
                    </tr>
                </thead>
                <tbody>
                    ${wpmDetails.map(row => `
                        <tr>
                            <td><strong>${row.name}</strong></td>
                            ${spkCriteria.map(c => `<td>${row.values[c.id].toFixed(4)}</td>`).join('')}
                            <td style="font-weight: bold; color: #008f85; background-color: rgba(0, 210, 196, 0.03);">${row.score.toFixed(4)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    const step4HTML = () => `
        <div class="step-card-header">
            <h3>Langkah 4: Nilai Kombinasi WASPAS (Q_i) & Ranking Akhir</h3>
            <span class="math-symbol">Q_i = λ × Q_i^(1) + (1 - λ) × Q_i^(2)</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-sub); margin-bottom: 12px;">
            Menggabungkan nilai WSM dan WPM berdasarkan koefisien &lambda; = ${lambda.toFixed(2)}. Alternatif dengan nilai Q tertinggi berada di peringkat teratas.
        </p>
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th style="width: 10%;">Rank</th>
                        <th style="width: 35%;">Alternatif Pizza</th>
                        <th style="width: 17.5%;">Nilai WSM (Q^(1))</th>
                        <th style="width: 17.5%;">Nilai WPM (Q^(2))</th>
                        <th style="width: 20%;">Kombinasi WASPAS (Q)</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(row => `
                        <tr>
                            <td><span class="rank-badge ${row.rank <= 3 ? 'rank-' + row.rank : 'rank-other'}">${row.rank}</span></td>
                            <td><strong>${row.name}</strong></td>
                            <td>${row.wsmScore.toFixed(4)}</td>
                            <td>${row.wpmScore.toFixed(4)}</td>
                            <td style="font-weight: 600; color: var(--primary);">${row.qScore.toFixed(4)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    if (step === 'step1') return step1HTML();
    if (step === 'step2') return step2HTML();
    if (step === 'step3') return step3HTML();
    if (step === 'step4') return step4HTML();
    
    // 'all'
    return `
        <div class="glass-panel" style="display: flex; flex-direction: column; gap: 32px; background: white;">
            ${initialTableHTML()}
            <hr style="border-color: rgba(141, 158, 255, 0.15);">
            ${step1HTML()}
            <hr style="border-color: rgba(141, 158, 255, 0.15);">
            ${step2HTML()}
            <hr style="border-color: rgba(141, 158, 255, 0.15);">
            ${step3HTML()}
            <hr style="border-color: rgba(141, 158, 255, 0.15);">
            ${step4HTML()}
        </div>
    `;
}

// Render the side-by-side ranking comparison table
function renderComparisonRankingTable(comparisonData) {
    const tbody = document.querySelector('#comparison-ranking-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    comparisonData.forEach(row => {
        const tr = document.createElement('tr');
        
        let diffBadgeHTML = '';
        if (row.diff > 0) {
            diffBadgeHTML = `<span class="diff-badge diff-positive"><i class="fa-solid fa-arrow-up"></i> +${row.diff}</span>`;
        } else if (row.diff < 0) {
            diffBadgeHTML = `<span class="diff-badge diff-negative"><i class="fa-solid fa-arrow-down"></i> ${row.diff}</span>`;
        } else {
            diffBadgeHTML = `<span class="diff-badge diff-neutral">=</span>`;
        }
        
        tr.innerHTML = `
            <td><strong>${row.name}</strong></td>
            <td style="text-align: center;"><span class="rank-badge ${row.topsisRank <= 3 ? 'rank-' + row.topsisRank : 'rank-other'}" style="margin: 0 auto;">${row.topsisRank}</span></td>
            <td style="color: var(--primary); font-weight: 600;">${row.topsisScore.toFixed(4)}</td>
            <td style="text-align: center;"><span class="rank-badge ${row.waspasRank <= 3 ? 'rank-' + row.waspasRank : 'rank-other'}" style="margin: 0 auto;">${row.waspasRank}</span></td>
            <td style="color: #008f85; font-weight: 600;">${row.waspasScore.toFixed(4)}</td>
            <td style="text-align: center;">${diffBadgeHTML}</td>
        `;
        tbody.appendChild(tr);
    });

    // Populate Dynamic SPK Recommendation Content next to the table
    const recContent = document.getElementById('spk-recommendation-content');
    if (recContent && comparisonData.length >= 3) {
        const top3 = comparisonData.slice(0, 3);
        let html = `<ol style="margin-left: 20px; margin-top: 8px;">`;
        top3.forEach((row, idx) => {
            html += `
                <li style="margin-bottom: 12px;">
                    <strong style="color: var(--primary); font-size: 0.95rem;">${row.name}</strong>
                    <div style="font-size: 0.8rem; color: var(--text-sub); margin-top: 4px;">
                        Peringkat TOPSIS: <strong style="color: var(--primary);">#${row.topsisRank}</strong> (Skor: ${row.topsisScore.toFixed(4)}) | 
                        Peringkat WASPAS: <strong style="color: #008f85;">#${row.waspasRank}</strong> (Skor: ${row.waspasScore.toFixed(4)})
                    </div>
                </li>
            `;
        });
        html += `</ol>`;
        html += `
            <div style="margin-top: 14px; padding: 12px; background: rgba(0, 143, 133, 0.08); border-radius: 12px; border: 1px dashed rgba(0, 143, 133, 0.3); font-size: 0.82rem; line-height: 1.5; color: var(--text-sub);">
                <i class="fa-solid fa-circle-check" style="color: #008f85; margin-right: 6px;"></i>
                <strong>Kesimpulan Analisis SPK:</strong> Tiga menu di atas memiliki kombinasi optimal antara kontribusi pendapatan yang tinggi (C1), volume penjualan yang besar (C2), serta frekuensi pemesanan yang stabil (C3), dengan beban operasional dapur (C4) dan hambatan harga (C5) yang paling logis untuk kampanye promosi massal.
            </div>
        `;
        recContent.innerHTML = html;
    }
}

// Function to handle switching of SPK panels
function switchSpkTab(targetId) {
    activeSpkTab = targetId;
    
    // Toggle active classes on tab buttons
    document.querySelectorAll('.spk-sub-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-spk-target') === targetId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Toggle display of panel sections
    document.querySelectorAll('.spk-panel').forEach(panel => {
        if (panel.id === targetId) {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    });

    // Re-run SPK rendering to update calculations for the visible tab
    runSPK();
}

// Initialize SPK tab sub-tabs, step-tabs, inputs and listener bindings
function initSPKUI() {
    // A. Sub-tabs switching binding
    document.querySelectorAll('.spk-sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-spk-target');
            if (btn.disabled) return;
            switchSpkTab(target);
        });
    });

    // B. Matrix Reset Override binding
    const resetMatrixBtn = document.getElementById('resetMatrixBtn');
    if (resetMatrixBtn) {
        resetMatrixBtn.addEventListener('click', () => {
            spkMatrixOverrides = {};
            const tbody = document.querySelector('#decision-matrix-table tbody');
            if (tbody) tbody.innerHTML = ''; // Force redraw
            runSPK();
        });
    }

    // C. TOPSIS steps tab switching
    document.querySelectorAll('[data-topsis-step]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-topsis-step]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeTopsisStep = e.target.getAttribute('data-topsis-step');
            runSPK();
        });
    });

    // D. WASPAS steps tab switching
    document.querySelectorAll('[data-waspas-step]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-waspas-step]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeWaspasStep = e.target.getAttribute('data-waspas-step');
            runSPK();
        });
    });

    // E. WASPAS lambda slider binding
    const waspasSlider = document.getElementById('waspasLambdaSlider');
    const waspasSliderVal = document.getElementById('waspas-lambda-val');
    if (waspasSlider && waspasSliderVal) {
        waspasSlider.addEventListener('input', (e) => {
            currentLambda = parseFloat(e.target.value);
            waspasSliderVal.textContent = currentLambda.toFixed(2);
            runSPK();
        });
    }
}



