const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load Pokemon data
let pokemonData = [];

function loadPokemonData() {
    try {
        const updatedCsvPath = path.join(__dirname, 'Pokemon-updated.csv');
        const oldCsvPath = path.join(__dirname, 'pokemon.csv');
        
        let csvPath = updatedCsvPath;
        if (!fs.existsSync(updatedCsvPath)) {
            console.log('⚠️  Pokemon-updated.csv not found, trying pokemon.csv...');
            if (!fs.existsSync(oldCsvPath)) {
                console.log('⚠️  No Pokemon CSV file found, creating sample data...');
                createSampleData();
                return;
            }
            csvPath = oldCsvPath;
        }
        
        const csvData = fs.readFileSync(csvPath, 'utf8');
        pokemonData = parseCSV(csvData, csvPath.includes('updated'));
        console.log(`✅ Loaded ${pokemonData.length} Pokemon from ${path.basename(csvPath)}`);
    } catch (error) {
        console.error('❌ Error loading Pokemon data:', error.message);
        createSampleData();
    }
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    
    // Parse CSV with proper quote handling
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }
    
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, ''));
    
    return lines.slice(1).map((line, index) => {
        const values = parseCSVLine(line);
        const pokemon = {};
        
        headers.forEach((header, i) => {
            let value = values[i] || '';
            value = value.replace(/"/g, '').trim();
            
            // Map CSV headers to our format
            switch(header.toLowerCase()) {
                case 'id':
                    pokemon.id = parseInt(value) || 0;
                    pokemon.species_id = parseInt(value) || 0;
                    break;
                case 'name':
                    pokemon.name = value;
                    pokemon.identifier = value.toLowerCase().replace(/\s+/g, '-');
                    break;
                case 'type1':
                    pokemon.type1 = value;
                    break;
                case 'type2':
                    pokemon.type2 = value && value !== ' ' ? value : '';
                    break;
                case 'hp':
                    pokemon.hp = parseInt(value) || 0;
                    break;
                case 'attack':
                    pokemon.attack = parseInt(value) || 0;
                    break;
                case 'defense':
                    pokemon.defense = parseInt(value) || 0;
                    break;
                case 'sp. atk':
                    pokemon.sp_attack = parseInt(value) || 0;
                    break;
                case 'sp. def':
                    pokemon.sp_defense = parseInt(value) || 0;
                    break;
                case 'speed':
                    pokemon.speed = parseInt(value) || 0;
                    break;
                case 'total':
                    pokemon.total_stats = parseInt(value) || 0;
                    break;
                case 'generation':
                    pokemon.generation = parseInt(value) || 1;
                    break;
            }
        });
        
        // Skip if no valid ID
        if (!pokemon.id) return null;
        
        // Build type string
        if (pokemon.type1 && pokemon.type2) {
            pokemon.type = `${pokemon.type1}/${pokemon.type2}`;
        } else if (pokemon.type1) {
            pokemon.type = pokemon.type1;
        } else {
            pokemon.type = 'Normal';
        }
        
        // Add missing fields with defaults/calculations
        pokemon.height = Math.floor(Math.random() * 20) + 5; // Random height 5-25 decimeters
        pokemon.weight = Math.floor(Math.random() * 500) + 50; // Random weight 50-550 hectograms  
        pokemon.heightM = (pokemon.height / 10).toFixed(1);
        pokemon.weightKg = (pokemon.weight / 10).toFixed(1);
        pokemon.base_experience = Math.floor(pokemon.total_stats / 5) || 50; // Base exp from total stats
        pokemon.order = pokemon.id;
        pokemon.is_default = true;
        
        // Image URLs
        pokemon.image = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
        pokemon.image_url = pokemon.image;
        
        // Description based on type and stats
        pokemon.description = generateDescription(pokemon);
        
        return pokemon;
    }).filter(pokemon => pokemon && pokemon.id && pokemon.id <= 1025);
}

function createSampleData() {
    console.log('📝 Creating sample Pokemon data...');
    pokemonData = [
        {
            id: 1, identifier: 'bulbasaur', species_id: 1, height: 7, weight: 69,
            base_experience: 64, order: 1, is_default: true,
            name: 'Bulbasaur', heightM: '0.7', weightKg: '6.9',
            type1: 'Grass', type2: 'Poison', type: 'Grass/Poison',
            hp: 45, attack: 49, defense: 49, sp_attack: 65, sp_defense: 65, speed: 45, total_stats: 318,
            generation: 1,
            image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
            image_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
            description: 'Bulbasaur draws energy from sunlight and has a deep connection with nature. This well-balanced Pokémon from Generation 1 is known for its distinctive abilities and loyal nature.'
        },
        {
            id: 4, identifier: 'charmander', species_id: 4, height: 6, weight: 85,
            base_experience: 62, order: 5, is_default: true,
            name: 'Charmander', heightM: '0.6', weightKg: '8.5',
            type1: 'Fire', type2: '', type: 'Fire',
            hp: 39, attack: 52, defense: 43, sp_attack: 60, sp_defense: 50, speed: 65, total_stats: 309,
            generation: 1,
            image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
            image_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
            description: 'Charmander burns with intense flames and has a fiery temperament. This well-balanced Pokémon from Generation 1 is known for its distinctive abilities and loyal nature.'
        },
        {
            id: 7, identifier: 'squirtle', species_id: 7, height: 5, weight: 90,
            base_experience: 63, order: 10, is_default: true,
            name: 'Squirtle', heightM: '0.5', weightKg: '9.0',
            type1: 'Water', type2: '', type: 'Water',
            hp: 44, attack: 48, defense: 65, sp_attack: 50, sp_defense: 64, speed: 43, total_stats: 314,
            generation: 1,
            image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png',
            image_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png',
            description: 'Squirtle is graceful in aquatic environments and controls water with ease. This well-balanced Pokémon from Generation 1 is known for its distinctive abilities and loyal nature.'
        },
        {
            id: 25, identifier: 'pikachu', species_id: 25, height: 4, weight: 60,
            base_experience: 112, order: 35, is_default: true,
            name: 'Pikachu', heightM: '0.4', weightKg: '6.0',
            type1: 'Electric', type2: '', type: 'Electric',
            hp: 35, attack: 55, defense: 40, sp_attack: 50, sp_defense: 50, speed: 90, total_stats: 320,
            generation: 1,
            image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
            image_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
            description: 'Pikachu generates powerful electrical charges and moves with lightning speed. This well-balanced Pokémon from Generation 1 is known for its distinctive abilities and loyal nature.'
        }
    ];
    console.log(`✅ Created ${pokemonData.length} sample Pokemon`);
}

function getRandomType() {
    const types = [
        'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison',
        'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark',
        'Steel', 'Fairy', 'Grass/Poison', 'Fire/Flying', 'Water/Flying', 'Bug/Flying'
    ];
    return types[Math.floor(Math.random() * types.length)];
}

function getRandomDescription(name) {
    const descriptions = [
        `${name} is a remarkable Pokemon known for its unique abilities and loyal nature.`,
        `This Pokemon has been observed in various habitats and displays fascinating behavioral patterns.`,
        `${name} possesses extraordinary powers that make it a valuable companion for trainers.`,
        `Known for its intelligence and adaptability, ${name} is a favorite among Pokemon researchers.`,
        `This species has evolved remarkable traits that help it survive in diverse environments.`
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function generateDescription(pokemon) {
    const typeDescriptions = {
        'Fire': 'burns with intense flames and has a fiery temperament',
        'Water': 'is graceful in aquatic environments and controls water with ease',
        'Grass': 'draws energy from sunlight and has a deep connection with nature',
        'Electric': 'generates powerful electrical charges and moves with lightning speed',
        'Psychic': 'possesses incredible mental powers and can manipulate objects with its mind',
        'Ice': 'thrives in cold climates and can freeze opponents with icy attacks',
        'Dragon': 'is a legendary creature with immense power and ancient wisdom',
        'Dark': 'moves through shadows and uses cunning tactics in battle',
        'Fairy': 'radiates magical energy and brings joy to those around it',
        'Fighting': 'is a skilled warrior with incredible physical strength',
        'Poison': 'secretes toxic substances and is immune to most poisons',
        'Ground': 'has mastery over earth and stone, dwelling in underground caves',
        'Flying': 'soars through the skies with grace and has keen eyesight',
        'Bug': 'is highly adaptable and works well in groups with others of its kind',
        'Rock': 'has a sturdy body like stone and incredible defensive capabilities',
        'Ghost': 'exists between dimensions and can phase through solid objects',
        'Steel': 'has a metallic body that provides excellent protection in battle',
        'Normal': 'is versatile and adaptable, making it popular among trainers'
    };
    
    const mainType = pokemon.type1 || 'Normal';
    const typeDesc = typeDescriptions[mainType] || 'has unique characteristics that make it special';
    
    const statDesc = pokemon.total_stats > 500 ? 'incredibly powerful' :
                    pokemon.total_stats > 400 ? 'quite strong' :
                    pokemon.total_stats > 300 ? 'well-balanced' : 'still developing its abilities';
    
    return `${pokemon.name} ${typeDesc}. This ${statDesc} Pokémon from Generation ${pokemon.generation} is known for its distinctive abilities and loyal nature.`;
}

// Middleware to log requests
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`📡 ${timestamp} - ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pokemon_count: pokemonData.length,
        server_id: process.env.SERVER_ID || 'server-1'
    });
});

// API Documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Pokédex API',
        version: '1.0.0',
        description: 'A RESTful API for Pokemon data with auto-scaling capabilities',
        endpoints: {
            'GET /api/pokemon': 'Get all Pokemon with pagination',
            'GET /api/pokemon/random': 'Get a random Pokemon',
            'GET /api/pokemon/:id': 'Get Pokemon by ID',
            'GET /api/pokemon/search/:query': 'Search Pokemon by name',
            'GET /api/stats': 'Get API statistics',
            'GET /health': 'Health check endpoint'
        },
        server_id: process.env.SERVER_ID || 'server-1',
        load_balancer: !!process.env.LOAD_BALANCER
    });
});

// Get all Pokemon with pagination
app.get('/api/pokemon', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 1000); // Increased limit to 1000 for better frontend experience
    const offset = (page - 1) * limit;
    
    const paginatedData = pokemonData.slice(offset, offset + limit);
    
    res.json({
        success: true,
        data: paginatedData,
        pagination: {
            page,
            limit,
            total: pokemonData.length,
            pages: Math.ceil(pokemonData.length / limit)
        },
        server_id: process.env.SERVER_ID || 'server-1'
    });
});

// Get random Pokemon
app.get('/api/pokemon/random', (req, res) => {
    if (pokemonData.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'No Pokemon data available'
        });
    }
    
    const randomIndex = Math.floor(Math.random() * pokemonData.length);
    const randomPokemon = pokemonData[randomIndex];
    
    res.json({
        success: true,
        data: randomPokemon,
        server_id: process.env.SERVER_ID || 'server-1'
    });
});

// Get Pokemon by ID
app.get('/api/pokemon/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid Pokemon ID'
        });
    }
    
    const pokemon = pokemonData.find(p => p.id === id);
    
    if (!pokemon) {
        return res.status(404).json({
            success: false,
            error: 'Pokemon not found'
        });
    }
    
    res.json({
        success: true,
        data: pokemon,
        server_id: process.env.SERVER_ID || 'server-1'
    });
});

// Search Pokemon by name
app.get('/api/pokemon/search/:query', (req, res) => {
    const query = req.params.query.toLowerCase();
    
    const results = pokemonData.filter(pokemon =>
        pokemon.name.toLowerCase().includes(query) ||
        pokemon.identifier.toLowerCase().includes(query) ||
        pokemon.type.toLowerCase().includes(query)
    );
    
    res.json({
        success: true,
        data: results,
        count: results.length,
        server_id: process.env.SERVER_ID || 'server-1'
    });
});

// Get API statistics
app.get('/api/stats', (req, res) => {
    res.json({
        success: true,
        stats: {
            total_pokemon: pokemonData.length,
            server_uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            server_id: process.env.SERVER_ID || 'server-1',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            generations: getGenerationStats(),
            types: getTypeStats()
        }
    });
});

// Get Pokemon by generation
app.get('/api/pokemon/generation/:gen', (req, res) => {
    const generation = parseInt(req.params.gen);
    
    if (isNaN(generation) || generation < 1 || generation > 9) {
        return res.status(400).json({
            success: false,
            error: 'Invalid generation. Must be between 1-9.'
        });
    }
    
    const generationPokemon = pokemonData.filter(p => p.generation === generation);
    
    res.json({
        success: true,
        data: generationPokemon,
        count: generationPokemon.length,
        generation: generation,
        server_id: process.env.SERVER_ID || 'server-1'
    });
});

function getGenerationStats() {
    const stats = {};
    pokemonData.forEach(pokemon => {
        const gen = pokemon.generation || 1;
        stats[gen] = (stats[gen] || 0) + 1;
    });
    return stats;
}

function getTypeStats() {
    const stats = {};
    pokemonData.forEach(pokemon => {
        const types = pokemon.type ? pokemon.type.split('/') : ['Normal'];
        types.forEach(type => {
            type = type.trim();
            stats[type] = (stats[type] || 0) + 1;
        });
    });
    return stats;
}

// Stress test endpoint for load testing
app.get('/api/stress/:duration', (req, res) => {
    const duration = Math.min(parseInt(req.params.duration) || 1000, 10000); // Max 10 seconds
    const startTime = Date.now();
    
    // Simulate CPU-intensive work
    while (Date.now() - startTime < duration) {
        Math.random() * Math.random();
    }
    
    res.json({
        success: true,
        message: `Stress test completed`,
        duration_ms: Date.now() - startTime,
        server_id: process.env.SERVER_ID || 'server-1'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.message);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        server_id: process.env.SERVER_ID || 'server-1'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        available_endpoints: [
            'GET /api',
            'GET /api/pokemon',
            'GET /api/pokemon/random',
            'GET /api/pokemon/:id',
            'GET /api/pokemon/search/:query',
            'GET /api/stats',
            'GET /health'
        ]
    });
});

// Start server
function startServer() {
    loadPokemonData();
    
    app.listen(PORT, "0.0.0.0", () => {
        const serverId = process.env.SERVER_ID || 'server-1';
        console.log('🚀 Pokédex API Server Started!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📡 Server ID: ${serverId}`);
        console.log(`🌐 Port: ${PORT}`);
        console.log(`🐛 Pokemon loaded: ${pokemonData.length}`);
        console.log(`🔗 API Documentation: http://localhost:${PORT}/api`);
        console.log(`💚 Health Check: http://localhost:${PORT}/health`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('📴 Received SIGTERM, shutting down gracefully...');
            process.exit(0);
        });
        
        process.on('SIGINT', () => {
            console.log('📴 Received SIGINT, shutting down gracefully...');
            process.exit(0);
        });
    });
}

startServer();

module.exports = app;
