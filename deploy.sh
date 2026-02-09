#!/bin/bash

# HVAC AI Secretary - Deployment Script
# This script automates the deployment of the HVAC AI Secretary application

set -e  # Exit on error

echo "=================================="
echo "HVAC AI Secretary Deployment"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}Please run as root (use sudo)${NC}"
   exit 1
fi

# Get the non-root user who invoked sudo
ACTUAL_USER=${SUDO_USER:-$USER}
DEPLOY_DIR="/home/$ACTUAL_USER/hvac-ai-secretary"

echo -e "${YELLOW}Deployment directory: $DEPLOY_DIR${NC}"

# Update system packages
echo -e "${GREEN}[1/9] Updating system packages...${NC}"
apt-get update -y
apt-get upgrade -y

# Install Node.js 18
echo -e "${GREEN}[2/9] Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PostgreSQL
echo -e "${GREEN}[3/9] Installing PostgreSQL...${NC}"
apt-get install -y postgresql postgresql-contrib

# Install Nginx
echo -e "${GREEN}[4/9] Installing Nginx...${NC}"
apt-get install -y nginx

# Install PM2 globally
echo -e "${GREEN}[5/9] Installing PM2...${NC}"
npm install -g pm2

# Clone or update repository
echo -e "${GREEN}[6/9] Setting up application...${NC}"
if [ -d "$DEPLOY_DIR" ]; then
    echo "Directory exists, pulling latest changes..."
    cd "$DEPLOY_DIR"
    sudo -u $ACTUAL_USER git pull
else
    echo "Cloning repository..."
    sudo -u $ACTUAL_USER git clone https://github.com/dutchiono/hvac-ai-secretary.git "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
fi

# Install dependencies
echo -e "${GREEN}[7/9] Installing Node.js dependencies...${NC}"
sudo -u $ACTUAL_USER npm install

# Setup PostgreSQL database
echo -e "${GREEN}[8/9] Setting up PostgreSQL database...${NC}"
read -p "Enter database password for hvacuser: " DB_PASSWORD

sudo -u postgres psql << EOF
CREATE DATABASE hvac_crm;
CREATE USER hvacuser WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE hvac_crm TO hvacuser;
\\q
EOF

echo "Importing database schema..."
sudo -u postgres psql -d hvac_crm -f "$DEPLOY_DIR/hvac-crm-schema.sql"

# Create .env file if it doesn't exist
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
    
    # Update database password in .env
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" "$DEPLOY_DIR/.env"
    
    echo -e "${RED}IMPORTANT: Edit $DEPLOY_DIR/.env with your Twilio and business information${NC}"
fi

# Setup Nginx
echo -e "${GREEN}[9/9] Configuring Nginx...${NC}"
read -p "Enter your domain name (e.g., hvac.example.com): " DOMAIN_NAME

cat > /etc/nginx/sites-available/hvac-ai-secretary << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/hvac-ai-secretary /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx
systemctl enable nginx

# Start application with PM2
echo -e "${GREEN}Starting application with PM2...${NC}"
cd "$DEPLOY_DIR"
sudo -u $ACTUAL_USER pm2 delete hvac-ai-secretary 2>/dev/null || true
sudo -u $ACTUAL_USER pm2 start server.js --name hvac-ai-secretary
sudo -u $ACTUAL_USER pm2 save
sudo -u $ACTUAL_USER pm2 startup systemd -u $ACTUAL_USER --hp /home/$ACTUAL_USER

# Setup firewall
echo -e "${GREEN}Configuring firewall...${NC}"
ufw allow 22
ufw allow 80
ufw allow 443
echo "y" | ufw enable

echo ""
echo -e "${GREEN}=================================="
echo "Deployment Complete!"
echo "==================================${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file: nano $DEPLOY_DIR/.env"
echo "2. Add your Twilio credentials"
echo "3. Restart the app: pm2 restart hvac-ai-secretary"
echo "4. Setup SSL with certbot:"
echo "   sudo apt install certbot python3-certbot-nginx -y"
echo "   sudo certbot --nginx -d $DOMAIN_NAME"
echo ""
echo "Your app is running at: http://$DOMAIN_NAME"
echo ""
echo "Useful commands:"
echo "  pm2 status                  - Check app status"
echo "  pm2 logs hvac-ai-secretary  - View logs"
echo "  pm2 restart hvac-ai-secretary - Restart app"
echo ""
