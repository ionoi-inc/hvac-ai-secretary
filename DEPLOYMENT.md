# M. Jacob Company HVAC - Deployment Guide

## Overview
This system has a frontend (static HTML/CSS/JS) and a backend (Node.js/Express API) with email notifications.

## What Was Built

### Frontend Changes
- Fixed script.js and style.css loading paths (changed from `/script.js` to `./script.js`)
- Updated booking form to send data to `/api/bookings`
- Form fields: name, phone, email, service, datetime, message

### Backend API
- **Endpoint**: `POST /api/bookings`
- **Functionality**:
  - Receives booking form submissions
  - Sends email notification immediately
  - Stores booking in PostgreSQL database (if available)
  - Returns success/error response

### Email Notification System
- Uses nodemailer with Gmail
- Sends formatted email with all booking details
- Includes timestamp in ET timezone

## Server Setup Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

This will install:
- express
- pg (PostgreSQL)
- cors
- nodemailer (NEW - for email notifications)

### 2. Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hvac_crm
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Gmail Configuration (REQUIRED for email notifications)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password
NOTIFICATION_EMAIL=dutchiono@gmail.com

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 3. Gmail App Password Setup

**IMPORTANT**: You need a Gmail App Password (not your regular password)

1. Go to Google Account settings: https://myaccount.google.com/
2. Security → 2-Step Verification (enable if not already)
3. Security → App Passwords
4. Generate new app password for "Mail"
5. Copy the 16-character password
6. Use this in `GMAIL_APP_PASSWORD` environment variable

### 4. Set Up PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE hvac_crm;

# Connect to the database
\c hvac_crm

# Run the init script
\i /path/to/backend/init_bookings.sql
```

Or run directly:
```bash
psql -U postgres -d hvac_crm -f backend/init_bookings.sql
```

### 5. Start the Backend Server

```bash
cd backend
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### 6. Deploy Frontend Files

Copy these files to your web server's public directory:
- `public/index.html`
- `public/style.css`
- `public/script.js`

Make sure the backend API is accessible at `/api/*` (use nginx reverse proxy if needed)

## Testing the System

### Test Email Notifications
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "phone": "412-555-0123",
    "email": "test@example.com",
    "service": "Clean & Check",
    "datetime": "2024-02-20",
    "message": "Test booking"
  }'
```

You should receive an email at `NOTIFICATION_EMAIL` with the booking details.

### Test Database Storage
```bash
# Check if booking was stored
psql -U postgres -d hvac_crm -c "SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5;"
```

## Nginx Configuration (Optional but Recommended)

If using Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name mjacobcompany.com;

    # Serve frontend files
    root /var/www/mjacobcompany/public;
    index index.html;

    # Frontend static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Email Not Sending
- Verify Gmail credentials in `.env`
- Check that 2-Step Verification is enabled
- Ensure App Password is correct (16 chars, no spaces)
- Check server logs: `Error: Invalid login` means wrong credentials

### Database Connection Failed
- System will send email but show warning in logs
- Booking won't be stored in database
- Email notification still works!
- Fix database connection later

### Modal Not Opening
- Check browser console for JavaScript errors
- Verify `script.js` is loading (Network tab in DevTools)
- Ensure paths are relative: `./script.js` not `/script.js`

### CORS Errors
- Backend already has CORS enabled
- If still seeing errors, check backend `server.js` has `app.use(cors())`

## Google Calendar Integration (Future)

To add Google Calendar integration:
1. Set up OAuth2 credentials for the server's Gmail account
2. Install `googleapis` package: `npm install googleapis`
3. Add calendar creation logic to `/api/bookings` endpoint
4. Reference existing Google Calendar agent code

## System Flow

1. Customer fills out booking form on website
2. Form submits to `/api/bookings` endpoint
3. Backend receives data:
   - ✅ Sends email notification (PRIORITY - always works)
   - ✅ Stores in database (OPTIONAL - gracefully fails if DB down)
4. Frontend shows success message
5. Modal closes after 5 seconds

## What You Need to Do Next

1. ✅ Push all code to GitHub (see next section)
2. ⚠️ On the server, run `npm install` to get nodemailer
3. ⚠️ Create `.env` file with Gmail credentials
4. ⚠️ Set up PostgreSQL database with `init_bookings.sql`
5. ⚠️ Restart the backend server
6. ✅ Test by submitting a booking form

## Quick Deploy Checklist

- [ ] Code pushed to GitHub
- [ ] Server has Node.js v18+ installed
- [ ] Backend dependencies installed (`npm install`)
- [ ] `.env` file created with Gmail credentials
- [ ] PostgreSQL database created
- [ ] Database initialized with `init_bookings.sql`
- [ ] Backend server running
- [ ] Frontend files deployed
- [ ] Test booking submitted successfully
- [ ] Email notification received
- [ ] Booking stored in database (check with SQL)

## Support

If something breaks, check:
1. Backend logs: `npm start` output
2. Database connection: `psql -U postgres -d hvac_crm`
3. Email credentials: Try logging into Gmail manually
4. Browser console: Check for JavaScript errors
