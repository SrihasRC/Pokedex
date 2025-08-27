// PokéDex Frontend JavaScript
class PokemonApp {
    constructor() {
        // API Configuration - Uses config.js settings
        this.API_BASE_URL = window.CONFIG?.API_BASE_URL || 'http://localhost:3000';
        
        // App State
        this.currentPage = 1;
        this.pokemonPerPage = window.CONFIG?.POKEMON_PER_PAGE || 20;
        this.allPokemon = [];
        this.filteredPokemon = [];
        this.currentTypeFilter = 'all';
        this.currentGenFilter = 'all';
        this.searchQuery = '';
        this.isLoading = false;

        // DOM Elements
        this.initializeElements();
        
        // Event Listeners
        this.initializeEventListeners();
        
        // Initialize App
        this.initialize();
    }

    initializeElements() {
        this.elements = {
            // Search and Navigation
            searchInput: document.getElementById('searchInput'),
            clearSearch: document.getElementById('clearSearch'),
            randomBtn: document.getElementById('randomBtn'),
            
            // Stats
            totalPokemon: document.getElementById('totalPokemon'),
            serverStatus: document.getElementById('serverStatus'),
            
            // Filters - Updated to use new structure
            filterButtons: document.querySelectorAll('.filter-chip'),
            
            // Content
            pokemonGrid: document.getElementById('pokemonGrid'),
            loadMoreBtn: document.getElementById('loadMoreBtn'),
            loadingSpinner: document.getElementById('loadingSpinner'),
            errorMessage: document.getElementById('errorMessage'),
            errorText: document.getElementById('errorText'),
            noResults: document.getElementById('noResults'),
            
            // Modal
            pokemonModal: document.getElementById('pokemonModal'),
            closeModal: document.getElementById('closeModal'),
            modalPokemonName: document.getElementById('modalPokemonName'),
            modalPokemonImage: document.getElementById('modalPokemonImage'),
            modalPokemonId: document.getElementById('modalPokemonId'),
            modalPokemonType: document.getElementById('modalPokemonType'),
            modalPokemonHeight: document.getElementById('modalPokemonHeight'),
            modalPokemonWeight: document.getElementById('modalPokemonWeight'),
            modalPokemonDescription: document.getElementById('modalPokemonDescription'),
            modalPokemonExperience: document.getElementById('modalPokemonExperience')
        };

        // Check for missing critical elements
        const criticalElements = ['pokemonGrid', 'loadingSpinner', 'totalPokemon', 'serverStatus'];
        const missingElements = criticalElements.filter(id => !this.elements[id] || !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.error('❌ Missing critical DOM elements:', missingElements);
            console.warn('🔧 Please check that all required IDs exist in the HTML');
        }
    }

    initializeEventListeners() {
        // Search functionality
        this.elements.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.toggleClearButton();
            this.debounceSearch();
        });

        this.elements.clearSearch.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.searchQuery = '';
            this.toggleClearButton();
            this.filterAndDisplayPokemon();
        });

        // Random Pokemon
        this.elements.randomBtn.addEventListener('click', () => {
            this.getRandomPokemon();
        });

        // Filter buttons
        this.elements.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = e.target.dataset.filter;
                
                if (filterType === 'type') {
                    this.setActiveFilter(e.target, 'type');
                    this.currentTypeFilter = e.target.dataset.type;
                } else if (filterType === 'generation') {
                    this.setActiveFilter(e.target, 'generation');
                    this.currentGenFilter = e.target.dataset.gen;
                }
                
                this.filterAndDisplayPokemon();
            });
        });

        // Load more button
        this.elements.loadMoreBtn.addEventListener('click', () => {
            this.loadMorePokemon();
        });

        // Modal events
        this.elements.closeModal.addEventListener('click', () => {
            this.closeModal();
        });

        this.elements.pokemonModal.addEventListener('click', (e) => {
            if (e.target === this.elements.pokemonModal) {
                this.closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
            if (e.key === '/' && !this.elements.searchInput.matches(':focus')) {
                e.preventDefault();
                this.elements.searchInput.focus();
            }
        });
    }

    async initialize() {
        this.showLoading();
        await this.checkServerHealth();
        
        // Load all Pokemon data for better filtering experience
        await this.loadAllPokemon();
        
        this.hideLoading();
    }

    async loadAllPokemon() {
        try {
            console.log('🔄 Loading all Pokemon data...');
            this.showLoadingProgress('Loading Pokemon data...');
            
            // First, get the total count
            const healthResponse = await fetch(`${this.API_BASE_URL}/health`);
            const health = await healthResponse.json();
            const totalPokemon = health.pokemon_count;
            
            // Load all Pokemon in one request (or a few large requests)
            const limit = Math.min(totalPokemon, 1000); // Load up to 1000 at once
            const response = await fetch(`${this.API_BASE_URL}/api/pokemon?page=1&limit=${limit}`);
            const data = await response.json();
            
            if (data.success) {
                this.allPokemon = data.data;
                console.log(`✅ Loaded ${this.allPokemon.length} Pokemon successfully!`);
                
                this.updateStats();
                this.filterAndDisplayPokemon();
                
                // Hide load more button since we have all data
                this.elements.loadMoreBtn.classList.add('hidden');
                
                // Show success message
                this.showLoadingProgress(`Successfully loaded ${this.allPokemon.length} Pokemon!`);
                setTimeout(() => this.hideLoadingProgress(), 1000);
            } else {
                // Fallback to paginated loading
                console.warn('⚠️ Falling back to paginated loading...');
                this.showLoadingProgress('Loading Pokemon in batches...');
                await this.loadPokemon();
            }
        } catch (error) {
            console.error('❌ Error loading all Pokemon:', error);
            this.showLoadingProgress('Error loading Pokemon, trying alternative method...');
            // Fallback to paginated loading
            await this.loadPokemon();
        }
    }

    showLoadingProgress(message) {
        const spinner = this.elements.loadingSpinner;
        if (spinner) {
            const messageEl = spinner.querySelector('p');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }

    hideLoadingProgress() {
        // Reset loading message
        const spinner = this.elements.loadingSpinner;
        if (spinner) {
            const messageEl = spinner.querySelector('p');
            if (messageEl) {
                messageEl.textContent = 'Catching Pokémon...';
            }
        }
    }

    async checkServerHealth() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/health`);
            const health = await response.json();
            
            if (this.elements.serverStatus) {
                this.elements.serverStatus.textContent = '🟢';
            }
            if (this.elements.totalPokemon) {
                this.elements.totalPokemon.textContent = health.pokemon_count.toLocaleString();
            }
        } catch (error) {
            if (this.elements.serverStatus) {
                this.elements.serverStatus.textContent = '🔴';
            }
            this.showError('Unable to connect to the Pokémon server. Please try again later.');
        }
    }

    async loadPokemon() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();

        try {
            // Load all Pokemon at once with a higher limit to avoid pagination issues with filters
            const response = await fetch(`${this.API_BASE_URL}/api/pokemon?page=${this.currentPage}&limit=100`);
            const data = await response.json();

            if (data.success) {
                this.allPokemon = [...this.allPokemon, ...data.data];
                this.updateStats();
                this.filterAndDisplayPokemon();
                
                // Continue loading more pages until we have all Pokemon
                if (this.currentPage < data.pagination.pages && this.allPokemon.length < data.pagination.total) {
                    this.elements.loadMoreBtn.classList.remove('hidden');
                    // Auto-load more pages to get complete dataset for better filtering
                    if (this.allPokemon.length < 500) { // Load first 500 Pokemon for better performance
                        setTimeout(() => {
                            this.loadMorePokemon();
                        }, 100);
                    }
                } else {
                    this.elements.loadMoreBtn.classList.add('hidden');
                }
            } else {
                this.showError('Failed to load Pokémon data');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async loadMorePokemon() {
        this.currentPage++;
        await this.loadPokemon();
    }

    filterAndDisplayPokemon() {
        let filtered = this.allPokemon;

        // Apply type filter
        if (this.currentTypeFilter !== 'all') {
            filtered = filtered.filter(pokemon => 
                pokemon.type && pokemon.type.toLowerCase().includes(this.currentTypeFilter.toLowerCase())
            );
        }

        // Apply generation filter
        if (this.currentGenFilter !== 'all') {
            filtered = filtered.filter(pokemon => 
                pokemon.generation && pokemon.generation.toString() === this.currentGenFilter
            );
        }

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(pokemon =>
                pokemon.name.toLowerCase().includes(this.searchQuery) ||
                pokemon.identifier.toLowerCase().includes(this.searchQuery) ||
                (pokemon.type && pokemon.type.toLowerCase().includes(this.searchQuery)) ||
                pokemon.id.toString().includes(this.searchQuery)
            );
        }

        this.filteredPokemon = filtered;
        this.updateStats(); // Update stats after filtering
        this.displayPokemon();
    }

    displayPokemon() {
        this.elements.pokemonGrid.innerHTML = '';
        this.hideError();
        this.elements.noResults.classList.add('hidden');

        if (this.filteredPokemon.length === 0) {
            this.elements.noResults.classList.remove('hidden');
            return;
        }

        this.filteredPokemon.forEach(pokemon => {
            const card = this.createPokemonCard(pokemon);
            this.elements.pokemonGrid.appendChild(card);
        });

        // Add loading animation
        const cards = this.elements.pokemonGrid.querySelectorAll('.pokemon-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    createPokemonCard(pokemon) {
        const card = document.createElement('div');
        card.className = 'pokemon-card';
        card.onclick = () => this.showPokemonModal(pokemon);

        const types = this.parseTypes(pokemon.type);
        const typeClasses = types.map(type => this.getTypeClass(type));
        
        card.innerHTML = `
            <div class="text-center">
                <div class="relative mb-4">
                    <img 
                        src="${pokemon.image || pokemon.image_url}" 
                        alt="${pokemon.name}"
                        class="w-32 h-32 mx-auto object-contain"
                        loading="lazy"
                        onerror="this.src='https://via.placeholder.com/128x128/f3f4f6/9ca3af?text=${pokemon.name.charAt(0)}'"
                    >
                    <div class="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full px-2 py-1 text-xs font-bold text-gray-600">
                        #${pokemon.id.toString().padStart(3, '0')}
                    </div>
                    ${pokemon.generation ? `<div class="absolute top-2 left-2 bg-pokemon-blue bg-opacity-90 rounded-full px-2 py-1 text-xs font-bold text-white">Gen ${pokemon.generation}</div>` : ''}
                </div>
                
                <h3 class="text-xl font-bold text-gray-800 mb-2">${pokemon.name}</h3>
                
                <div class="mb-3 flex justify-center gap-1">
                    ${types.map((type, index) => 
                        `<span class="type-badge ${typeClasses[index]}">${type}</span>`
                    ).join('')}
                </div>
                
                <div class="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                    <div>
                        <span class="font-semibold">Height:</span> ${pokemon.heightM}m
                    </div>
                    <div>
                        <span class="font-semibold">Weight:</span> ${pokemon.weightKg}kg
                    </div>
                </div>
                
                ${pokemon.total_stats ? `
                    <div class="mb-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-2">
                        <div class="text-xs text-gray-500 mb-1">Total Stats</div>
                        <div class="text-lg font-bold text-pokemon-blue">${pokemon.total_stats}</div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-gradient-to-r from-pokemon-blue to-pokemon-green h-2 rounded-full" style="width: ${Math.min((pokemon.total_stats / 800) * 100, 100)}%"></div>
                        </div>
                    </div>
                ` : `
                    <div class="bg-gray-50 rounded-lg p-2">
                        <div class="text-xs text-gray-500">Base Experience</div>
                        <div class="text-lg font-bold text-pokemon-green">${pokemon.base_experience}</div>
                    </div>
                `}
            </div>
        `;

        return card;
    }

    getTypeClass(type) {
        const mainType = type.toLowerCase().replace(/\s+/g, '');
        return `type-${mainType}`;
    }

    parseTypes(typeString) {
        if (!typeString) return ['Normal'];
        
        // Handle dual types (e.g., "Grass/Poison" or "Fire/Flying")
        if (typeString.includes('/')) {
            return typeString.split('/').map(t => t.trim());
        }
        
        return [typeString.trim()];
    }

    showPokemonModal(pokemon) {
        const types = this.parseTypes(pokemon.type);
        const typeClasses = types.map(type => this.getTypeClass(type));
        
        this.elements.modalPokemonName.textContent = pokemon.name;
        this.elements.modalPokemonImage.src = pokemon.image || pokemon.image_url;
        this.elements.modalPokemonImage.alt = pokemon.name;
        this.elements.modalPokemonId.textContent = `#${pokemon.id.toString().padStart(3, '0')}`;
        
        // Handle multiple types
        this.elements.modalPokemonType.innerHTML = types.map((type, index) => 
            `<span class="type-badge ${typeClasses[index]} mr-1">${type}</span>`
        ).join('');
        
        this.elements.modalPokemonHeight.textContent = `${pokemon.heightM}m`;
        this.elements.modalPokemonWeight.textContent = `${pokemon.weightKg}kg`;
        this.elements.modalPokemonDescription.textContent = pokemon.description || 'No description available.';
        this.elements.modalPokemonExperience.textContent = pokemon.base_experience;

        // Add additional stats if available
        if (pokemon.total_stats) {
            const statsContainer = document.getElementById('modalStatsContainer');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div class="bg-red-50 rounded-lg p-4">
                            <div class="text-sm text-red-600">HP</div>
                            <div class="text-xl font-bold text-red-700">${pokemon.hp || 0}</div>
                        </div>
                        <div class="bg-orange-50 rounded-lg p-4">
                            <div class="text-sm text-orange-600">Attack</div>
                            <div class="text-xl font-bold text-orange-700">${pokemon.attack || 0}</div>
                        </div>
                        <div class="bg-blue-50 rounded-lg p-4">
                            <div class="text-sm text-blue-600">Defense</div>
                            <div class="text-xl font-bold text-blue-700">${pokemon.defense || 0}</div>
                        </div>
                        <div class="bg-purple-50 rounded-lg p-4">
                            <div class="text-sm text-purple-600">Speed</div>
                            <div class="text-xl font-bold text-purple-700">${pokemon.speed || 0}</div>
                        </div>
                    </div>
                    <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 mb-4">
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="font-bold text-gray-800">Total Stats</h3>
                            <span class="text-2xl font-bold text-pokemon-green">${pokemon.total_stats}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div class="bg-gradient-to-r from-pokemon-blue to-pokemon-green h-3 rounded-full" style="width: ${Math.min((pokemon.total_stats / 800) * 100, 100)}%"></div>
                        </div>
                    </div>
                `;
            }
        }

        this.elements.pokemonModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.elements.pokemonModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    async getRandomPokemon() {
        this.elements.randomBtn.disabled = true;
        this.elements.randomBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Finding...';

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/pokemon/random`);
            const data = await response.json();

            if (data.success) {
                this.showPokemonModal(data.data);
            } else {
                this.showError('Failed to get random Pokémon');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        } finally {
            this.elements.randomBtn.disabled = false;
            this.elements.randomBtn.innerHTML = '<i class="fas fa-dice mr-2"></i>Surprise Me!';
        }
    }

    setActiveFilter(activeBtn, filterType) {
        // Find all buttons of the same filter type and remove active class
        const buttonsOfSameType = document.querySelectorAll(`[data-filter="${filterType}"]`);
        buttonsOfSameType.forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        activeBtn.classList.add('active');
    }

    toggleClearButton() {
        if (this.elements.searchInput.value) {
            this.elements.clearSearch.classList.remove('hidden');
        } else {
            this.elements.clearSearch.classList.add('hidden');
        }
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.filterAndDisplayPokemon();
        }, 300);
    }

    updateStats() {
        // Only update total count and server status - removed loaded/filtered counts
    }

    showLoading() {
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.classList.remove('hidden');
        }
        if (this.elements.pokemonGrid) {
            this.elements.pokemonGrid.classList.add('hidden');
        }
    }

    hideLoading() {
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.classList.add('hidden');
        }
        if (this.elements.pokemonGrid) {
            this.elements.pokemonGrid.classList.remove('hidden');
        }
    }

    showError(message) {
        if (this.elements.errorText) {
            this.elements.errorText.textContent = message;
        }
        if (this.elements.errorMessage) {
            this.elements.errorMessage.classList.remove('hidden');
        }
        this.hideLoading();
    }

    hideError() {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.classList.add('hidden');
        }
    }
}

// Utility Functions
function getTypeEmoji(type) {
    const typeMap = {
        'fire': '🔥',
        'water': '💧',
        'grass': '🌿',
        'electric': '⚡',
        'psychic': '🔮',
        'ice': '❄️',
        'dragon': '🐲',
        'dark': '🌙',
        'fairy': '🧚',
        'normal': '⚪',
        'fighting': '👊',
        'poison': '☠️',
        'ground': '🌍',
        'flying': '🦅',
        'bug': '🐛',
        'rock': '🪨',
        'ghost': '👻',
        'steel': '⚙️'
    };
    
    return typeMap[type.toLowerCase()] || '❓';
}

// Initialize App when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pokemonApp = new PokemonApp();
    
    // Add some fun Easter eggs
    console.log(`
    🌟 PokéDex Frontend Loaded! 🌟
    
    Keyboard shortcuts:
    - Press '/' to focus search
    - Press 'Escape' to close modal
    
    Gotta catch 'em all! 🔴⚪
    `);
    
    // Add Konami Code Easter Egg
    let konamiCode = [];
    const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    
    document.addEventListener('keydown', (e) => {
        konamiCode.push(e.code);
        konamiCode = konamiCode.slice(-10);
        
        if (konamiCode.join(',') === konamiSequence.join(',')) {
            document.body.style.animation = 'rainbow 2s infinite';
            setTimeout(() => {
                document.body.style.animation = '';
            }, 5000);
            
            console.log('🎮 Konami Code activated! You found a secret! 🌈');
        }
    });
});

// Add rainbow animation for Easter egg
const style = document.createElement('style');
style.textContent = `
    @keyframes rainbow {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Service Worker Registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
