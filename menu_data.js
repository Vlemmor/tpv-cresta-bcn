// Datos preliminares extraídos de la carta en PDF
const initialMenuData = [
    // === PARA COMPARTIR ===
    { id: 13, name: "Pan de coca con tomate", category: "Para Compartir", price: 2.90 },
    { id: 14, name: "Escudella", category: "Para Compartir", price: 8.90 },
    { id: 15, name: "Ensalada de Tomate y Atún", category: "Para Compartir", price: 8.90 },
    { id: 16, name: "Mejillones a la Chalaca", category: "Para Compartir", price: 8.90 },
    { id: 17, name: "Causa de Pollo Limeña", category: "Para Compartir", price: 9.90 },
    { id: 18, name: "Berenjenas en Tempura", category: "Para Compartir", price: 8.90 },
    { id: 19, name: "Croquetas de Rabo de Toro (4un)", category: "Para Compartir", price: 6.60 },
    { id: 20, name: "Crestas de Ají de Gallina (4un)", category: "Para Compartir", price: 5.80 },
    { id: 21, name: "Alcachofas confitadas", category: "Para Compartir", price: 10.90 },
    { id: 22, name: "Tacos de Chicharrón (2un)", category: "Para Compartir", price: 7.20 },
    { id: 23, name: "Huevos Rotos con Butifarra Perol", category: "Para Compartir", price: 8.90 },
    { id: 24, name: "Canelones de Pollo a la Huacaina", category: "Para Compartir", price: 10.80 },

    // === PRINCIPALES (Tierra y Mar Unificados) ===
    { id: 1, name: "Anticucho de Pollo", category: "Principales", price: 6.50 },
    { id: 3, name: "Cachopo de Pollo a la Caprese", category: "Principales", price: 13.80 },
    { id: 4, name: "Entraña con Chimichurri", category: "Principales", price: 13.80 },
    { id: 5, name: "Arroz de Confit de Pato", category: "Principales", price: 14.80 },
    { id: 6, name: "Meloso de Costilla de Vaca", category: "Principales", price: 16.80 },
    { id: 7, name: "Cachopo de Ternera", category: "Principales", price: 14.80 },
    { id: 9, name: "Ceviche Carretillero", category: "Principales", price: 18.80 },
    { id: 10, name: "Ceviche Clásico", category: "Principales", price: 17.80 },
    { id: 12, name: "Calamarcitos Anticuchados", category: "Principales", price: 10.90 },

    // === BEBIDAS / CÓCTELES ===
    { id: 33, name: "Pisco Sour Clásico", category: "Bebidas", price: 8.50 },
    { id: 34, name: "Pisco Sour de Maracuyá", category: "Bebidas", price: 9.50 },
    { id: 35, name: "Mojito de Maracuyá", category: "Bebidas", price: 8.50 },
    { id: 36, name: "Sangría de Maracuyá (Jarra 1L)", category: "Bebidas", price: 13.90 },
    { id: 37, name: "Cresta Verano", category: "Bebidas", price: 8.50 },
    { id: 38, name: "Vaso de Chicha Morada", category: "Bebidas", price: 3.90 },

    // === POSTRES ===
    { id: 28, name: "Dulce de Tres Leches", category: "Postres", price: 5.80 },
    { id: 29, name: "Trufa de chocolate (6 un)", category: "Postres", price: 6.50 },
    { id: 30, name: "Cremoso de Cheesecake", category: "Postres", price: 5.80 },
    { id: 31, name: "Helados Artesanales", category: "Postres", price: 5.80 },
];
