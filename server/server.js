const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool } = require('./db');
const bookingRoutes = require('./routes/bookings');
const dispatchRoutes = require('./routes/dispatch');
const techRoutes = require('./routes/tech');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/tech', techRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

// Serve HTML pages
app.get('/dispatch', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dispatch.html'));
});

app.get('/tech', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/tech.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HVAC CRM Server running on port ${PORT}`);
  console.log(`📊 Dispatch dashboard: http://localhost:${PORT}/dispatch`);
  console.log(`🔧 Tech portal: http://localhost:${PORT}/tech`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end();
  process.exit(0);
});
