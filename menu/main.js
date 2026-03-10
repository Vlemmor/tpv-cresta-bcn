document.addEventListener('DOMContentLoaded', () => {
    initMenu();
});

const UI = {
    container: document.getElementById('reels-container'),
    nav: document.getElementById('categories-nav')
};

// Fotos de demostración usando las generadas (fallback si no hay del usuario)
const PLACEHOLDERS = {
    "Para Compartir": "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&q=80&w=800",
    "Principales": "https://images.unsplash.com/photo-1544124499-58912cbddaad?auto=format&fit=crop&q=80&w=800",
    "Bebidas": "https://images.unsplash.com/photo-1542849187-5ec6ea5e6a27?auto=format&fit=crop&q=80&w=800",
    "Postres": "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&q=80&w=800"
};

function initMenu() {
    if (typeof initialMenuData === 'undefined') {
        UI.container.innerHTML = `<p style="padding: 2rem; text-align: center;">Error: No se pudieron cargar los datos del menú.</p>`;
        return;
    }

    renderCategories();

    // Unir datos del TPV con el Menú del Día de Marketing (si existe)
    let finalData = [...initialMenuData];
    const savedMarketing = localStorage.getItem('cresta_menu_dia');

    if (savedMarketing) {
        const mData = JSON.parse(savedMarketing);
        const menuDiaItem = {
            id: 'menu-dia',
            name: "MENÚ DEL DÍA",
            category: "Especial",
            price: parseFloat(mData.price),
            desc: `Primero: ${mData.primeros} | Segundo: ${mData.segundos} | Postre: ${mData.postres}`,
            isSpecial: true
        };
        finalData.unshift(menuDiaItem); // Ponerlo de primero
    }

    renderFeed(finalData);
}

function renderCategories() {
    const categories = ["Todos", "Especial", ...new Set(initialMenuData.map(item => item.category))];

    UI.nav.innerHTML = categories.map((cat, index) => `
        <button class="cat-pill ${index === 0 ? 'active' : ''}" onclick="filterByCategory('${cat}', this)">
            ${cat}
        </button>
    `).join('');
}

function renderFeed(items) {
    UI.container.innerHTML = '';

    if (items.length === 0) {
        UI.container.innerHTML = `<div class="reel-item" style="display:flex; align-items:center; justify-content:center;">Sin platos disponibles</div>`;
        return;
    }

    items.forEach(item => {
        const reelItem = document.createElement('section');
        reelItem.className = 'reel-item';

        let mediaUrl = item.video || PLACEHOLDERS[item.category] || PLACEHOLDERS["Principales"];

        // Convertir link de Google Drive a link Directo
        if (mediaUrl.includes('drive.google.com')) {
            const fileId = mediaUrl.split('/d/')[1]?.split('/')[0] || mediaUrl.split('id=')[1]?.split('&')[0];
            if (fileId) mediaUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }

        const isVideo = mediaUrl.endsWith('.mp4') || item.video || mediaUrl.includes('google.com/uc');

        reelItem.innerHTML = `
            ${isVideo
                ? `<video class="reel-media" src="${mediaUrl}" autoplay loop muted playsinline poster="${PLACEHOLDERS[item.category]}"></video>`
                : `<img class="reel-media" src="${mediaUrl}" alt="${item.name}" loading="lazy">`
            }
            <div class="reel-overlay">
                <div class="dish-info">
                    ${item.isSpecial ? '<span class="badge">RECOMENDACIÓN HOY</span>' : ''}
                    <h2>${item.name}</h2>
                    <p class="dish-price">€${item.price.toFixed(2)}</p>
                    <p class="dish-desc">${item.desc || 'Fusion Peruano-Mediterránea auténtica.'}</p>
                </div>
            </div>
        `;

        UI.container.appendChild(reelItem);
    });
}

function filterByCategory(category, el) {
    // UI Update
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    el.classList.add('active');

    // Data Filter
    const filtered = category === "Todos"
        ? initialMenuData
        : initialMenuData.filter(i => i.category === category);

    renderFeed(filtered);
    UI.container.scrollTo(0, 0);
}
