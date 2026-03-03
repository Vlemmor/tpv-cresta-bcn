/**
 * =========================================================
 * LA CRESTA BCN - TPV System Core Logic (Updated Flow)
 * =========================================================
 */

// --- STATE MANAGEMENT ---
const AppState = {
    menu: [],
    categories: [],
    activeCategory: 'Para Compartir',
    activeTable: null,
    orders: {},         // Current open orders: { '1': [], 'Rapida-1': [] }
    quickOrderCount: 0,

    // Config
    taxRate: 0.10,      // IVA España 10%
    googleSheetUrl: 'https://script.google.com/macros/s/AKfycby_9IRYStJBzb3FKu-u3V9px7ECqBW3zTRLDSbWUOzgiOwnIun7X6xzvBch4wmf5AeckQ/exec'
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Nav
    setupNavigation();
    updateClock();
    setInterval(updateClock, 1000);

    // 2. Load Data
    AppState.menu = initialMenuData;
    // Map categories in explicit order: Para Compartir, Principales, Bebidas, Postres
    AppState.categories = [...new Set(AppState.menu.map(p => p.category))];

    // 4. Render UI
    renderCategories();
    renderProducts();
    app.renderTablesView();
    setupDrawerSwipe(); // Enable swipe gestures on the order drawer

    // 5. Setup Listeners
    document.getElementById('date-filter').addEventListener('change', () => {
        admin.loadDashboardData();
    });

    // Dash
    setTimeout(() => {
        admin.initCharts();
        admin.loadDashboardData();
    }, 500);

    // Sync views
    app.switchView('home-view');
});

// --- UI MODALS ---
const CustomModal = {
    show: (options) => {
        const { title, message, iconType = 'warning', buttons = [] } = options;

        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-msg').innerText = message;

        const iconEl = document.getElementById('modal-icon');
        iconEl.className = 'ti modal-icon';
        if (iconType === 'success') iconEl.classList.add('ti-circle-check', 'success');
        if (iconType === 'warning') iconEl.classList.add('ti-alert-circle', 'warning');
        if (iconType === 'danger') iconEl.classList.add('ti-alert-triangle', 'danger');

        const actionsContainer = document.getElementById('modal-actions');
        actionsContainer.innerHTML = '';
        actionsContainer.className = `modal-actions ${buttons.length > 2 ? 'vertical' : ''}`;

        buttons.forEach(btnInfo => {
            const btn = document.createElement('button');
            btn.className = `modal-btn ${btnInfo.class || 'modal-btn-secondary'}`;
            btn.innerText = btnInfo.text;
            btn.onclick = () => {
                CustomModal.hide();
                if (btnInfo.onClick) btnInfo.onClick();
            };
            actionsContainer.appendChild(btn);
        });

        document.getElementById('custom-modal').classList.add('active');
    },
    hide: () => {
        document.getElementById('custom-modal').classList.remove('active');
    }
};

// --- NAVIGATION ---
function setupNavigation() {
    const navButtons = document.querySelectorAll('[data-view]');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            app.switchView(btn.dataset.view);
        });
    });
}
function updateClock() {
    const now = new Date();
    document.getElementById('current-time').innerText = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// --- MOBILE DRAWER & CATEGORY TOGGLE ---
function toggleOrderDrawer() {
    const orderArea = document.getElementById('order-area');
    if (!orderArea) return;
    orderArea.classList.toggle('expanded');
}

function openOrderDrawer() {
    const orderArea = document.getElementById('order-area');
    if (orderArea) orderArea.classList.add('expanded');
}

function closeOrderDrawer() {
    const orderArea = document.getElementById('order-area');
    if (orderArea) orderArea.classList.remove('expanded');
}

function setupDrawerSwipe() {
    const orderArea = document.getElementById('order-area');
    if (!orderArea) return;
    let touchStartY = 0;

    orderArea.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    orderArea.addEventListener('touchend', (e) => {
        const deltaY = touchStartY - e.changedTouches[0].clientY;
        if (deltaY > 50) openOrderDrawer();       // swipe up = open
        else if (deltaY < -50) closeOrderDrawer(); // swipe down = close
    }, { passive: true });
}

function toggleCategories() {
    const scroll = document.getElementById('categories-container');
    const btn = document.getElementById('categories-toggle-btn');
    if (!scroll || !btn) return;
    scroll.classList.toggle('hidden');
    btn.classList.toggle('collapsed');
}

function updateDrawerHandle(total, tableName) {
    const drawerTotal = document.getElementById('drawer-total');
    const drawerName = document.getElementById('drawer-table-name');
    if (drawerTotal) drawerTotal.innerText = `€${total.toFixed(2)} →`;
    if (drawerName) drawerName.innerText = tableName || 'Sin mesa activa';
}

// --- DATABASE LOGIC (Google Sheets API) ---
const dbManager = {
    saveSale: async (saleData) => {
        try {
            const response = await fetch(AppState.googleSheetUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            });
            return true; // no-cors no nos deja leer el body en verde, pero si no tira error de red, asumimos insert.
        } catch (error) {
            console.error("Error connecting to Google Sheets DB:", error);
            throw new Error("No se pudo conectar a la base de datos.");
        }
    },
    getAllSales: async () => {
        try {
            const response = await fetch(AppState.googleSheetUrl, {
                method: 'GET'
            });
            const result = await response.json();
            return result.ventas || [];
        } catch (error) {
            console.error("Error fetching data from Google Sheets:", error);
            return [];
        }
    }
};

// --- TPV CORE FUNCTIONS ---
const app = {
    switchView: (viewId) => {
        document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');

        const navButtons = document.querySelectorAll('[data-view]');
        navButtons.forEach(b => b.classList.remove('active'));
        document.querySelectorAll(`[data-view="${viewId}"]`).forEach(b => b.classList.add('active'));

        if (viewId === 'dashboard-view') admin.loadDashboardData();
        if (viewId === 'tables-view') app.renderTablesView();
    },

    goHome: () => {
        app.switchView('home-view');
    },

    renderTablesView: () => {
        const tablesGrid = document.getElementById('tables-grid');
        const quickGrid = document.getElementById('quick-orders-grid');

        tablesGrid.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            let total = 0;
            let isActive = false;
            if (AppState.orders[i] && AppState.orders[i].length > 0) {
                isActive = true;
                total = app.calcTotals(AppState.orders[i]).total;
            }
            tablesGrid.innerHTML += `
                <div class="table-card ${isActive ? 'active' : ''}" onclick="app.openTable('${i}', false)">
                    <h4>Mesa ${i}</h4>
                    ${isActive ? `<p class="table-total">€${total.toFixed(2)}</p>` : `<p class="table-empty">Libre</p>`}
                </div>
            `;
        }

        quickGrid.innerHTML = '';
        let hasQuick = false;
        for (const key in AppState.orders) {
            if (key.startsWith('Rapida-') && AppState.orders[key].length > 0) {
                hasQuick = true;
                let total = app.calcTotals(AppState.orders[key]).total;
                const badge = key.replace('Rapida-', 'R - ');
                quickGrid.innerHTML += `
                    <div class="table-card quick-card active" onclick="app.openTable('${key}', true)">
                        <h4>${badge}</h4>
                        <p class="table-total">€${total.toFixed(2)}</p>
                    </div>
                `;
            }
        }
        if (!hasQuick) {
            quickGrid.innerHTML = `<p class="text-muted" style="grid-column: 1/-1;">No hay órdenes rápidas en curso.</p>`;
        }
    },

    createNewQuickOrder: () => {
        AppState.quickOrderCount++;
        const newId = 'Rapida-' + AppState.quickOrderCount;
        AppState.orders[newId] = [];
        app.openTable(newId, true);
    },

    openTable: (tableId, isQuick) => {
        AppState.activeTable = tableId;
        app.switchView('tpv-view');

        const labelText = isQuick ? tableId.replace('Rapida-', 'Ord Rápida #') : `Mesa ${tableId}`;
        document.getElementById('current-table-label').innerText = labelText;
        // Sync handle bar
        const cart = AppState.orders[tableId] || [];
        const total = cart.length > 0 ? app.calcTotals(cart).total : 0;
        updateDrawerHandle(total, labelText);
        // Always close drawer when switching table (reset to collapsed)
        closeOrderDrawer();

        renderCart();
    },

    addToCart: (product) => {
        const tableId = AppState.activeTable;
        if (!AppState.orders[tableId]) AppState.orders[tableId] = [];
        const cart = AppState.orders[tableId];

        const existingItem = cart.find(item => item.product.id === product.id);
        if (existingItem) existingItem.qty += 1;
        else cart.push({ product: product, qty: 1 });

        renderCart();
    },

    updateQty: (productId, delta) => {
        const tableId = AppState.activeTable;
        const cart = AppState.orders[tableId];
        if (!cart) return;

        const itemIndex = cart.findIndex(item => item.product.id === productId);
        if (itemIndex > -1) {
            cart[itemIndex].qty += delta;
            if (cart[itemIndex].qty <= 0) cart.splice(itemIndex, 1);
        }
        renderCart();
    },

    clearCurrentOrder: () => {
        CustomModal.show({
            title: "¿Limpiar Pedido?",
            message: "Esto borrará todos los productos en listados en esta orden. ¿Estás seguro?",
            iconType: 'danger',
            buttons: [
                { text: 'Cancelar', class: 'modal-btn-secondary' },
                {
                    text: 'Limpiar Todo', class: 'modal-btn-primary', onClick: () => {
                        AppState.orders[AppState.activeTable] = [];
                        renderCart();
                    }
                }
            ]
        });
    },

    saveOrderState: () => {
        // Just visual feedback & return to tables
        app.switchView('tables-view');
    },

    checkoutTable: () => {
        const tableId = AppState.activeTable;
        const cart = AppState.orders[tableId];

        if (!cart || cart.length === 0) {
            CustomModal.show({
                title: "Orden Vacía",
                message: "No hay productos en esta orden para cobrar.",
                iconType: 'warning',
                buttons: [{ text: 'Entendido', class: 'modal-btn-primary' }]
            });
            return;
        }

        const totals = app.calcTotals(cart);
        const sale = {
            id: `T-${Math.floor(new Date().getTime() / 1000).toString().slice(-6)}`,
            timestamp: new Date().toISOString(),
            tableId: tableId,
            cart: cart.map(i => ({
                id: i.product.id, name: i.product.name, qty: i.qty, price: i.product.price, subtotal: i.product.price * i.qty
            })),
            taxRate: AppState.taxRate,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total
        };

        CustomModal.show({
            title: `Cobrar €${sale.total.toFixed(2)}`,
            message: `Vas a cerrar la orden actual. Puedes imprimir el ticket ahora o solo cobrar.`,
            iconType: 'success',
            buttons: [
                { text: 'Cancelar', class: 'modal-btn-secondary' },
                {
                    text: 'Solo Cobrar', class: 'modal-btn-secondary', onClick: () => {
                        finalizeCheckout(sale);
                    }
                },
                {
                    text: 'Cobrar e Imprimir', class: 'modal-btn-primary success', onClick: () => {
                        // PRINT FIRST (ticket still visible in DOM)
                        window.print();
                        // Ask for copy BEFORE clearing, then finalize
                        setTimeout(() => {
                            CustomModal.show({
                                title: '¿Copia adicional?',
                                message: '¿Deseas imprimir una copia del ticket?',
                                iconType: 'warning',
                                buttons: [
                                    { text: 'No, gracias', class: 'modal-btn-secondary', onClick: () => finalizeCheckout(sale) },
                                    {
                                        text: 'Imprimir copia', class: 'modal-btn-primary', onClick: () => {
                                            window.print();
                                            setTimeout(() => finalizeCheckout(sale), 400);
                                        }
                                    }
                                ]
                            });
                        }, 500);
                    }
                }
            ]
        });
    },

    calcTotals: (cart) => {
        let itemsSum = 0;
        cart.forEach(item => { itemsSum += item.product.price * item.qty; });
        const subtotal = itemsSum / (1 + AppState.taxRate);
        const tax = itemsSum - subtotal;
        const total = itemsSum;
        return { subtotal, tax, total };
    },

    printTicket: () => {
        const cart = AppState.orders[AppState.activeTable];
        if (!cart || cart.length === 0) {
            CustomModal.show({ title: "Vacío", message: "No se puede imprimir un ticket en blanco.", buttons: [{ text: 'Ok', class: 'modal-btn-primary' }] });
            return;
        }
        window.print();
    }
};

// Finalize after printing (or for "Solo Cobrar" — no print)
function finalizeCheckout(sale) {
    AppState.orders[sale.tableId] = [];
    AppState.activeTable = null;
    closeOrderDrawer();
    app.switchView('tables-view');
    app.renderTablesView();
    CustomModal.show({ title: 'Cobro Exitoso', message: 'La venta fue registrada.', iconType: 'success', buttons: [{ text: 'Ok', class: 'modal-btn-primary' }] });
    // Save to Google Sheets silently in background
    dbManager.saveSale(sale).catch(e => console.warn('Error saving to Google Sheets:', e));
}


// --- UI RENDER FUNCTIONS ---
function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    AppState.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${AppState.activeCategory === cat ? 'active' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => {
            AppState.activeCategory = cat;
            renderCategories();
            renderProducts();
        };
        container.appendChild(btn);
    });
}

function renderProducts() {
    const container = document.getElementById('products-container');
    container.innerHTML = '';
    const filtered = AppState.menu.filter(p => p.category === AppState.activeCategory);

    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `<div class="product-name">${product.name}</div><div class="product-price">€${product.price.toFixed(2)}</div>`;
        card.onclick = () => {
            card.classList.add('clicked');
            setTimeout(() => card.classList.remove('clicked'), 200);
            app.addToCart(product);
        };
        container.appendChild(card);
    });
}

function renderCart() {
    const list = document.getElementById('order-items');
    const tableId = AppState.activeTable;
    const cart = AppState.orders[tableId] || [];

    // Ticker Header
    const now = new Date();
    document.getElementById('print-date').innerText = now.toLocaleString('es-ES');
    document.getElementById('print-table').innerText = tableId.startsWith('Rapida') ? 'Orden Barra' : `Mesa ${tableId}`;
    document.getElementById('print-ticket-id').innerText = `T-${Math.floor(now.getTime() / 1000).toString().slice(-6)}`;

    if (cart.length === 0) {
        let label = tableId.startsWith('Rapida') ? 'Nueva orden rápida' : `Mesa ${tableId}`;
        list.innerHTML = `<div class="empty-order-msg"><i class="ti ti-shopping-cart"></i><p>${label} sin productos</p></div>`;
        document.getElementById('summary-subtotal').innerText = '€0.00';
        document.getElementById('summary-tax').innerText = '€0.00';
        document.getElementById('summary-total').innerText = '€0.00';
        return;
    }

    list.innerHTML = '';
    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        const lineTotal = (item.product.price * item.qty).toFixed(2);
        div.innerHTML = `
            <div class="item-qty-controls no-print">
                <button class="qty-btn" onclick="app.updateQty(${item.product.id}, -1)">-</button>
                <div class="item-qty">${item.qty}</div>
                <button class="qty-btn" onclick="app.updateQty(${item.product.id}, 1)">+</button>
            </div>
            <div class="item-info no-print">
                <div class="item-title">${item.product.name}</div>
                <div class="item-price">€${lineTotal}</div>
            </div>
            <div class="print-only print-item-row">
                <span class="print-item-name">${item.qty}x ${item.product.name}</span>
                <span class="print-item-price">€${lineTotal}</span>
            </div>
        `;
        list.appendChild(div);
    });


    const totals = app.calcTotals(cart);
    document.getElementById('summary-subtotal').innerText = `€${totals.subtotal.toFixed(2)}`;
    document.getElementById('summary-tax').innerText = `€${totals.tax.toFixed(2)}`;
    document.getElementById('summary-total').innerText = `€${totals.total.toFixed(2)}`;

    // Update mini-total on the mobile drawer handle
    const labelText = tableId.toString().startsWith('Rapida') ? tableId.replace('Rapida-', 'Ord Rápida #') : `Mesa ${tableId}`;
    updateDrawerHandle(totals.total, labelText);
}


// --- DASHBOARD ---
let chartInstances = {};

const admin = {
    initCharts: () => {
        const ctxTop = document.getElementById('top-products-chart').getContext('2d');
        const ctxTime = document.getElementById('sales-timeline-chart').getContext('2d');

        Chart.defaults.color = '#475569';
        Chart.defaults.font.family = 'Outfit';

        chartInstances.topProducts = new Chart(ctxTop, {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'Unidades Vendidas', data: [], backgroundColor: '#F97316', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        chartInstances.salesTimeline = new Chart(ctxTime, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Ventas Totales (€)', data: [], borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    },

    loadDashboardData: async () => {
        try {
            document.getElementById('kpi-total-sales').innerText = 'Cargando...';
            const allSales = await dbManager.getAllSales();
            const filterValue = document.getElementById('date-filter').value;
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const weekStart = todayStart - (7 * 24 * 60 * 60 * 1000);
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

            const filteredSales = allSales.filter(sale => {
                const ts = new Date(sale.timestamp).getTime();
                if (filterValue === 'today') return ts >= todayStart;
                if (filterValue === 'week') return ts >= weekStart;
                if (filterValue === 'month') return ts >= monthStart;
                return true;
            });

            admin.renderKPIs(filteredSales);
            admin.updateCharts(filteredSales);
        } catch (e) { console.error("Error dashboard data", e); }
    },

    renderKPIs: (sales) => {
        const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
        const totalTables = sales.length;
        const avgTicket = totalTables > 0 ? totalSales / totalTables : 0;
        document.getElementById('kpi-total-sales').innerText = `€${totalSales.toFixed(2)}`;
        document.getElementById('kpi-total-tables').innerText = totalTables;
        document.getElementById('kpi-avg-ticket').innerText = `€${avgTicket.toFixed(2)}`;
    },

    updateCharts: (sales) => {
        const itemCounts = {};
        sales.forEach(s => {
            const cartItems = s.cart || s.items || [];
            cartItems.forEach(item => {
                if (!itemCounts[item.name]) itemCounts[item.name] = 0;
                itemCounts[item.name] += item.qty;
            });
        });

        const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        chartInstances.topProducts.data.labels = sortedItems.map(i => i[0]);
        chartInstances.topProducts.data.datasets[0].data = sortedItems.map(i => i[1]);
        chartInstances.topProducts.update();

        const salesByDate = {};
        sales.forEach(s => {
            const d = new Date(s.timestamp).toLocaleDateString();
            if (!salesByDate[d]) salesByDate[d] = 0;
            salesByDate[d] += s.total;
        });

        const sortedDates = Object.keys(salesByDate).sort((a, b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
        chartInstances.salesTimeline.data.labels = sortedDates;
        chartInstances.salesTimeline.data.datasets[0].data = sortedDates.map(d => salesByDate[d]);
        chartInstances.salesTimeline.update();
    },

    exportExcel: async () => {
        try {
            CustomModal.show({ title: "Generando...", message: "Descargando historial de Google Sheets...", buttons: [] });
            const allSales = await dbManager.getAllSales();
            if (allSales.length === 0) { CustomModal.show({ title: "Vacío", message: "No hay datos que exportar.", buttons: [{ text: 'Ok', class: 'modal-btn-primary' }] }); return; }

            const flatData = [];
            allSales.forEach(sale => {
                const dateObj = new Date(sale.timestamp);
                const cartItems = sale.cart || sale.items || [];
                cartItems.forEach(item => {
                    flatData.push({
                        'Fecha': dateObj.toLocaleDateString(), 'Hora': dateObj.toLocaleTimeString(),
                        'Sala/Mesa': sale.tableId, 'Producto': item.name, 'Cantidad': item.qty, 'P. Unitario (€)': item.price,
                        'Subtotal Base (€)': (item.subtotal / (1 + (sale.taxRate || 0.10))).toFixed(2),
                        'IVA (€)': (item.subtotal - (item.subtotal / (1 + (sale.taxRate || 0.10)))).toFixed(2),
                        'Total Bruto (€)': item.subtotal.toFixed(2)
                    });
                });
            });

            const ws = XLSX.utils.json_to_sheet(flatData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reporte");
            XLSX.writeFile(wb, `Ventas_${new Date().getTime()}.xlsx`);
            CustomModal.hide();
        } catch (e) { console.error("Error excel", e); CustomModal.hide(); }
    },

    downloadBackup: async () => {
        const allSales = await dbManager.getAllSales();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allSales));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", `Backup_${new Date().getTime()}.json`);
        document.body.appendChild(anchor);
        anchor.click(); anchor.remove();
    }
};
