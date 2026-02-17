# HVAC CRM System - Deployment Guide

## Overview
Complete HVAC CRM system for M. Jacob Company with customer booking, dispatch management, and technician mobile views.

## System Components

### Backend API (Node.js/Express)
- **Location:** `/server/`
- **Port:** 3000 (configurable via `PORT` env var)
- **Database:** PostgreSQL

### Frontend Pages
- **Customer Landing Page:** `/public/index.html` - Main website with booking form
- **Dispatch Dashboard:** `/public/dispatch.html` - Mark's dispatch/management view
- **Tech Portal:** `/public/tech.html` - Mobile-friendly technician job view

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL 12+
- Your VPS with web server (nginx/Apache)

## Installation Steps

### 1. Database Setup

Connect to your PostgreSQL database and run the schema:

```bash
psql -U your_db_user -d your_database < hvac-crm-schema.sql
```

This creates all tables: CUSTOMERS, SERVICE_TYPES, SERVICE_REQUESTS, TECHNICIANS, etc.

### 2. Install Dependencies

```bash
cd server
npm install
```

### 3. Environment Configuration

Create a `.env` file in the `/server` directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hvac_crm

# Server
PORT=3000
NODE_ENV=production

# Optional: CORS settings
CORS_ORIGIN=https://yourdomain.com
```

### 4. Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Or use PM2 for production:
```bash
npm install -g pm2
pm2 start server.js --name hvac-crm
pm2 save
pm2 startup
```

## Deployment on VPS

### Option 1: Nginx Reverse Proxy (Recommended)

1. **Install Nginx** (if not already installed)
```bash
sudo apt update
sudo apt install nginx
```

2. **Create Nginx config** (`/etc/nginx/sites-available/hvac-crm`)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend static files
    location / {
        root /var/www/hvac-crm/public;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Enable site**
```bash
sudo ln -s /etc/nginx/sites-available/hvac-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Apache Reverse Proxy

1. **Enable modules**
```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
```

2. **Create Apache config** (`/etc/apache2/sites-available/hvac-crm.conf`)
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /var/www/hvac-crm/public

    <Directory /var/www/hvac-crm/public>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api
</VirtualHost>
```

3. **Enable site**
```bash
sudo a2ensite hvac-crm.conf
sudo systemctl reload apache2
```

## File Structure on VPS

```
/var/www/hvac-crm/
├── server/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   ├── .env
│   └── routes/
│       ├── bookings.js
│       ├── dispatch.js
│       └── tech.js
└── public/
    ├── index.html
    ├── dispatch.html
    ├── tech.html
    ├── booking.js
    ├── BookingModal.css
    └── styles.css
```

## API Endpoints

### Customer Booking
- `POST /api/bookings` - Create new service request
- `GET /api/bookings/:id` - Get booking details

### Dispatch Management
- `GET /api/dispatch/bookings` - List all bookings (filters: status, date, tech_id)
- `GET /api/dispatch/technicians` - List all techs with job counts
- `PUT /api/dispatch/bookings/:id/assign` - Assign tech to job
- `PUT /api/dispatch/bookings/:id/status` - Update job status
- `PUT /api/dispatch/bookings/:id` - Update booking details
- `GET /api/dispatch/stats` - Dashboard statistics

### Technician Portal
- `POST /api/tech/login` - Tech login (by phone or name)
- `GET /api/tech/:id/jobs` - Get tech's jobs (filters: date, status)
- `PUT /api/tech/jobs/:id/start` - Mark job started
- `PUT /api/tech/jobs/:id/complete` - Mark job complete with details
- `PUT /api/tech/jobs/:id/notes` - Add notes to job
- `GET /api/tech/:id/schedule` - Get week schedule

## Access URLs

After deployment:
- **Customer Website:** `https://yourdomain.com/`
- **Dispatch Dashboard:** `https://yourdomain.com/dispatch`
- **Tech Portal:** `https://yourdomain.com/tech`
- **API Health Check:** `https://yourdomain.com/api/health`

## Initial Data Setup

### Add Service Types

```sql
INSERT INTO SERVICE_TYPES (service_name, base_price, estimated_duration_minutes)
VALUES 
    ('Clean and Check', 100.00, 60),
    ('Service Call', 135.00, 90),
    ('Installation', 0.00, 240),
    ('Emergency Service', 200.00, 120);
```

### Add Technicians

```sql
INSERT INTO TECHNICIANS (name, phone, email, specialization, status)
VALUES 
    ('John Doe', '412-555-0101', 'john@example.com', 'HVAC', 'available'),
    ('Jane Smith', '412-555-0102', 'jane@example.com', 'Installation', 'available');
```

## Testing

1. **Test API Health:**
```bash
curl http://localhost:3000/api/health
```

2. **Test Customer Booking:**
- Open `http://localhost:3000/` in browser
- Click "Schedule Service"
- Fill out and submit form

3. **Test Dispatch Dashboard:**
- Open `http://localhost:3000/dispatch`
- View bookings, assign techs

4. **Test Tech Portal:**
- Open `http://localhost:3000/tech`
- Login with tech phone number
- View assigned jobs

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check database exists: `psql -U user -l`

### Port Already in Use
- Change `PORT` in `.env`
- Or kill existing process: `lsof -ti:3000 | xargs kill`

### CORS Issues
- Set `CORS_ORIGIN` in `.env` to your domain
- Or update `cors()` config in `server.js`

### Static Files Not Loading
- Verify file paths in nginx/Apache config
- Check file permissions: `chmod -R 755 /var/www/hvac-crm/public`

## Maintenance

### View Logs (PM2)
```bash
pm2 logs hvac-crm
```

### Restart Server
```bash
pm2 restart hvac-crm
```

### Database Backups
```bash
pg_dump -U user hvac_crm > backup_$(date +%Y%m%d).sql
```

### Update Code
```bash
cd /var/www/hvac-crm
git pull origin main
cd server
npm install
pm2 restart hvac-crm
```

## Security Notes

- Use HTTPS in production (Let's Encrypt/Certbot)
- Set strong PostgreSQL passwords
- Implement authentication for dispatch dashboard
- Add rate limiting for API endpoints
- Regular database backups
- Keep Node.js and dependencies updated

## Support

For issues, contact the development team or check logs at `/var/log/nginx/` or `pm2 logs`.
