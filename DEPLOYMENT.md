# 🚀 PokéDex Deployment Guide

Complete guide for deploying your Pokemon PokéDex application with both backend and frontend components.

## 📋 Prerequisites

- Node.js 16+ installed
- Git (for version control)
- Basic understanding of web hosting

## 🔧 Backend Deployment (API Server)

### Local Testing
```bash
cd backend
npm install
node server.js
```

### AWS EC2 Deployment

1. **Launch EC2 Instance**
   - Choose Amazon Linux 2 AMI
   - Instance type: t3.micro (free tier eligible)
   - Configure security group to allow:
     - SSH (port 22) from your IP
     - HTTP (port 80) from anywhere
     - Custom TCP (port 3000) from anywhere

2. **Connect and Setup**
```bash
# Connect to your EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# Update system
sudo yum update -y

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install node

# Install PM2 for process management
npm install -g pm2

# Create app directory
mkdir -p ~/pokedex-api
cd ~/pokedex-api
```

3. **Deploy Your Code**
```bash
# Option 1: Upload files directly
# scp -i your-key.pem -r backend/* ec2-user@your-ec2-public-ip:~/pokedex-api/

# Option 2: Git clone (recommended)
git clone https://your-repo-url.git .
# Or just copy the files manually

# Install dependencies
npm install

# Start with PM2
pm2 start server.js --name pokedex-api
pm2 startup
pm2 save
```

4. **Configure Reverse Proxy (Optional)**
```bash
# Install nginx
sudo yum install -y nginx

# Configure nginx
sudo tee /etc/nginx/conf.d/pokedex.conf << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 🎨 Frontend Deployment (Static Website)

### Update Configuration
1. **Edit `config.js`**:
```javascript
window.CONFIG = {
    API_BASE_URL: 'http://your-ec2-public-ip:3000', // or your domain
    // ... other settings
};
```

### Deployment Options

#### Option 1: AWS S3 Static Website Hosting

1. **Create S3 Bucket**
```bash
# Create bucket (replace with unique name)
aws s3 mb s3://your-pokedex-frontend

# Upload files
aws s3 sync frontend/ s3://your-pokedx-frontend/ --delete

# Configure static website hosting
aws s3 website s3://your-pokedx-frontend --index-document index.html --error-document index.html

# Set public read policy
aws s3api put-bucket-policy --bucket your-pokedex-frontend --policy '{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-pokedex-frontend/*"
        }
    ]
}'
```

2. **Access your site at**: `http://your-pokedex-frontend.s3-website-us-east-1.amazonaws.com`

#### Option 2: Netlify (Easiest)

1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your `frontend` folder
3. Update the API URL in the deployed `config.js` file
4. Your site is live instantly!

#### Option 3: GitHub Pages

1. Create a GitHub repository
2. Upload your frontend files
3. Enable GitHub Pages in repository settings
4. Update `config.js` with your backend URL

#### Option 4: Traditional Web Hosting

1. Upload all files from `frontend/` to your web host
2. Update `config.js` with your API URL
3. Ensure all files are accessible via web browser

## 🔒 Security & Production Considerations

### Backend Security
- Use environment variables for sensitive data
- Implement rate limiting
- Add HTTPS with Let's Encrypt
- Configure CORS properly
- Use PM2 for process management
- Set up monitoring and logging

### Frontend Security
- Use HTTPS for production
- Implement Content Security Policy (CSP)
- Minify and compress assets
- Use CDN for better performance

## 🌐 Custom Domain Setup

### For Backend (EC2)
1. Register domain or use existing one
2. Create A record pointing to EC2 public IP
3. Configure SSL with Let's Encrypt:
```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### For Frontend (S3 + CloudFront)
1. Create CloudFront distribution
2. Set S3 bucket as origin
3. Configure custom domain in CloudFront
4. Update DNS to point to CloudFront

## 📊 Monitoring & Maintenance

### Backend Monitoring
```bash
# Check PM2 status
pm2 status
pm2 logs pokedex-api

# Monitor system resources
htop
df -h

# Update application
git pull
npm install
pm2 reload pokedex-api
```

### Frontend Updates
```bash
# Update S3 (if using S3)
aws s3 sync frontend/ s3://your-bucket-name/ --delete

# Update other platforms
# Re-upload files to your hosting provider
```

## 🧪 Testing Your Deployment

### API Testing
```bash
# Test health endpoint
curl https://your-domain.com/health

# Test Pokemon endpoint
curl https://your-domain.com/api/pokemon/1
```

### Frontend Testing
1. Open your website URL
2. Check browser console for errors
3. Test all features:
   - Search functionality
   - Type filters
   - Generation filters
   - Pokemon details modal
   - Random Pokemon button

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend has proper CORS configuration
   - Update frontend API URL in `config.js`

2. **API Not Accessible**
   - Check EC2 security groups
   - Verify server is running: `pm2 status`
   - Check logs: `pm2 logs pokedex-api`

3. **Frontend Not Loading Data**
   - Check browser console for errors
   - Verify API URL in `config.js`
   - Test API endpoints directly

4. **Performance Issues**
   - Implement caching headers
   - Use CDN for static assets
   - Optimize images and data loading

## 📝 Environment Variables

### Backend (.env file)
```
PORT=3000
NODE_ENV=production
SERVER_ID=api-server-1
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend (config.js)
```javascript
window.CONFIG = {
    API_BASE_URL: 'https://your-backend-domain.com',
    POKEMON_PER_PAGE: 20,
    ENABLE_ANIMATIONS: true,
    DEBUG_MODE: false
};
```

## 🎉 Success Checklist

- [ ] Backend API is accessible and returns Pokemon data
- [ ] Frontend loads and displays Pokemon cards
- [ ] Search functionality works
- [ ] Type and generation filters work
- [ ] Pokemon detail modal shows complete information
- [ ] Random Pokemon feature works
- [ ] Mobile responsive design works
- [ ] HTTPS is configured for production
- [ ] Custom domain is set up (if desired)
- [ ] Monitoring is in place

---

**Congratulations! Your PokéDex is now live and ready for trainers around the world! 🌟**

Access your application:
- **Frontend**: https://your-frontend-domain.com
- **API**: https://your-backend-domain.com/api
- **Health Check**: https://your-backend-domain.com/health

*Gotta catch 'em all!* 🔴⚪
