// Configuration file for the PokéDex Frontend
window.CONFIG = {
    // API Configuration
    API_BASE_URL: 'http://localhost:3000', // Update this URL for production deployment
    
    // App Settings
    POKEMON_PER_PAGE: 20,
    ENABLE_ANIMATIONS: true,
    DEBUG_MODE: false,
    
    // Feature Flags
    FEATURES: {
        SEARCH: true,
        FILTERS: true,
        RANDOM_POKEMON: true,
        POKEMON_DETAILS: true,
        INFINITE_SCROLL: false, // Future feature
        FAVORITES: false, // Future feature
        OFFLINE_MODE: false // Future feature
    },
    
    // Styling
    THEME: {
        PRIMARY_COLOR: '#3b82f6',
        SECONDARY_COLOR: '#ef4444',
        ACCENT_COLOR: '#f59e0b',
        SUCCESS_COLOR: '#10b981'
    }
};

// Environment detection
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // In production, update the API URL
    // You can uncomment and modify this line when deploying:
    // window.CONFIG.API_BASE_URL = 'https://your-api-domain.com';
    
    console.log('🚀 Running in production mode');
    window.CONFIG.DEBUG_MODE = false;
} else {
    console.log('🔧 Running in development mode');
    window.CONFIG.DEBUG_MODE = true;
}
