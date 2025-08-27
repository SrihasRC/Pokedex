#!/bin/bash

# PokéDex Deployment Script
# This script helps deploy the PokéDex application

echo "🎮 PokéDex Deployment Helper"
echo "================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "backend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Menu options
echo
echo "Please select deployment type:"
echo "1) Local Development Setup"
echo "2) Backend Only (AWS EC2)"
echo "3) Frontend Only (AWS S3)"
echo "4) Full Stack Deployment Check"
echo "5) Clean and Reset"
echo "6) Exit"
echo

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        print_status "Setting up local development environment..."
        
        # Backend setup
        print_status "Installing backend dependencies..."
        cd backend
        npm install
        if [ $? -eq 0 ]; then
            print_success "Backend dependencies installed"
        else
            print_error "Failed to install backend dependencies"
            exit 1
        fi
        
        print_status "Starting backend server..."
        npm start &
        BACKEND_PID=$!
        cd ..
        
        # Wait for backend to start
        sleep 3
        
        # Frontend setup
        print_status "Starting frontend server..."
        cd frontend
        python3 -m http.server 8080 &
        FRONTEND_PID=$!
        cd ..
        
        print_success "Development environment ready!"
        print_status "Backend: http://localhost:3000"
        print_status "Frontend: http://localhost:8080"
        print_warning "Press Enter to stop servers..."
        read
        
        # Kill background processes
        kill $BACKEND_PID 2>/dev/null
        kill $FRONTEND_PID 2>/dev/null
        print_success "Servers stopped"
        ;;
        
    2)
        print_status "Preparing backend for AWS EC2 deployment..."
        
        cd backend
        
        # Check if PM2 is installed
        if ! command -v pm2 &> /dev/null; then
            print_warning "PM2 not found. Installing..."
            npm install -g pm2
        fi
        
        # Install dependencies
        npm install --production
        
        # Create PM2 ecosystem file
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'pokedex-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF
        
        print_success "Backend ready for EC2 deployment!"
        print_status "To deploy on EC2:"
        echo "  1. Upload backend folder to EC2 instance"
        echo "  2. Run: pm2 start ecosystem.config.js"
        echo "  3. Run: pm2 save && pm2 startup"
        echo "  4. Configure nginx reverse proxy (optional)"
        ;;
        
    3)
        print_status "Preparing frontend for AWS S3 deployment..."
        
        cd frontend
        
        # Create deployment folder
        mkdir -p ../deploy/frontend
        
        # Copy files
        cp index.html ../deploy/frontend/
        cp script.js ../deploy/frontend/
        cp styles.css ../deploy/frontend/
        cp config.js ../deploy/frontend/
        cp pokeball.png ../deploy/frontend/
        
        # Update config for production (you'll need to update the API URL)
        print_warning "Remember to update config.js with your production API URL!"
        
        cd ../deploy/frontend
        print_success "Frontend ready for S3 deployment!"
        print_status "Files prepared in: $(pwd)"
        print_status "To deploy to S3:"
        echo "  1. Create S3 bucket with static website hosting"
        echo "  2. Upload all files from deploy/frontend folder"
        echo "  3. Configure bucket policy for public read access"
        echo "  4. Setup CloudFront for CDN (optional)"
        ;;
        
    4)
        print_status "Running deployment readiness check..."
        
        # Check Node.js
        if command -v node &> /dev/null; then
            NODE_VERSION=$(node --version)
            print_success "Node.js installed: $NODE_VERSION"
        else
            print_error "Node.js not found!"
        fi
        
        # Check npm
        if command -v npm &> /dev/null; then
            NPM_VERSION=$(npm --version)
            print_success "npm installed: $NPM_VERSION"
        else
            print_error "npm not found!"
        fi
        
        # Check Python
        if command -v python3 &> /dev/null; then
            PYTHON_VERSION=$(python3 --version)
            print_success "Python3 installed: $PYTHON_VERSION"
        else
            print_warning "Python3 not found (needed for local frontend development)"
        fi
        
        # Check backend dependencies
        if [ -f "backend/package.json" ]; then
            print_success "Backend package.json found"
            if [ -d "backend/node_modules" ]; then
                print_success "Backend dependencies installed"
            else
                print_warning "Backend dependencies not installed (run npm install)"
            fi
        else
            print_error "Backend package.json not found!"
        fi
        
        # Check data file
        if [ -f "backend/Pokemon-updated.csv" ]; then
            POKEMON_COUNT=$(wc -l < backend/Pokemon-updated.csv)
            print_success "Pokemon dataset found: $POKEMON_COUNT entries"
        else
            print_error "Pokemon-updated.csv not found!"
        fi
        
        # Check frontend files
        FRONTEND_FILES=("index.html" "script.js" "styles.css" "config.js")
        for file in "${FRONTEND_FILES[@]}"; do
            if [ -f "frontend/$file" ]; then
                print_success "Frontend file found: $file"
            else
                print_error "Frontend file missing: $file"
            fi
        done
        ;;
        
    5)
        print_warning "This will remove node_modules and reset the project"
        read -p "Are you sure? (y/N): " confirm
        
        if [[ $confirm =~ ^[Yy]$ ]]; then
            print_status "Cleaning backend..."
            rm -rf backend/node_modules
            rm -rf backend/package-lock.json
            
            print_status "Cleaning deploy folder..."
            rm -rf deploy
            
            print_success "Project cleaned successfully!"
            print_status "Run option 1 to setup development environment again"
        else
            print_status "Clean cancelled"
        fi
        ;;
        
    6)
        print_status "Goodbye! 👋"
        exit 0
        ;;
        
    *)
        print_error "Invalid option. Please choose 1-6."
        ;;
esac

echo
print_status "Deployment helper finished!"
