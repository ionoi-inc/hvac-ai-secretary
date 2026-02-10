// HVAC AI Secretary - Main Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✓ Database connected:', res.rows[0].now);
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
const chatRoutes = require('./routes/chat');
const smsRoutes = require('./routes/sms');
const appointmentRoutes = require('./routes/appointments');
const customerRoutes = require('./routes/customers');

app.use('/api/chat', chatRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/customers', customerRoutes);

// Google Calendar availability endpoint
app.get('/api/availability', async (req, res) => {
  try {
    const { startDate, endDate, timezone = 'America/New_York' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    // Business hours configuration
    const BUSINESS_HOURS = {
      0: null, // Sunday - closed
      1: { start: 8, end: 18 }, // Monday 8am-6pm
      2: { start: 8, end: 18 }, // Tuesday
      3: { start: 8, end: 18 }, // Wednesday
      4: { start: 8, end: 18 }, // Thursday
      5: { start: 8, end: 18 }, // Friday
      6: { start: 9, end: 15 }  // Saturday 9am-3pm
    };
    
    const APPOINTMENT_DURATION = 120; // 2 hours in minutes
    const BUFFER_TIME = 30; // 30 minutes buffer
    const SLOT_DURATION = APPOINTMENT_DURATION + BUFFER_TIME; // 150 minutes total
    
    // TODO: Call Google Calendar API to get existing events
    // const events = await run_action({
    //   action_key: 'google_calendar-list-events',
    //   account_id: process.env.GOOGLE_CALENDAR_ACCOUNT_ID,
    //   props: {
    //     calendarId: 'dutchiono@gmail.com',
    //     timeMin: startDate,
    //     timeMax: endDate,
    //     singleEvents: true,
    //     orderBy: 'startTime',
    //     timeZone: timezone
    //   }
    // });
    
    // Generate available slots (mock for now)
    const availableSlots = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const hours = BUSINESS_HOURS[dayOfWeek];
      
      if (!hours) continue; // Skip closed days
      
      for (let hour = hours.start; hour < hours.end; hour += 2.5) {
        const slotStart = new Date(d);
        slotStart.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + APPOINTMENT_DURATION);
        
        if (slotEnd.getHours() <= hours.end) {
          availableSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString()
          });
        }
      }
    }
    
    res.json({ availableSlots });
  } catch (error) {
    console.error('Availability error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Book appointment endpoint
app.post('/api/book-appointment', async (req, res) => {
  try {
    const { 
      customerName, 
      customerEmail, 
      customerPhone, 
      customerAddress, 
      serviceType, 
      appointmentDate, 
      notes 
    } = req.body;
    
    // Validate required fields
    const requiredFields = {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      serviceType,
      appointmentDate
    };
    
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }
    
    // Validate date format
    const startDate = new Date(appointmentDate);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid appointmentDate format. Expected ISO 8601 string.'
      });
    }
    
    // Calculate end date (2 hours later)
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000).toISOString();
    
    // Format event description
    const description = `
HVAC Service Appointment

Service Type: ${serviceType}
Customer: ${customerName}
Email: ${customerEmail}
Phone: ${customerPhone}
Address: ${customerAddress}

${notes ? `Notes: ${notes}` : ''}

---
Appointment Duration: 2 hours
    `.trim();
    
    // TODO: Create Google Calendar event
    // const calendarEvent = await run_action({
    //   action_key: 'google_calendar-create-event',
    //   account_id: process.env.GOOGLE_CALENDAR_ACCOUNT_ID,
    //   props: {
    //     summary: `[${serviceType}] - ${customerName}`,
    //     eventStartDate: appointmentDate,
    //     eventEndDate: endDate,
    //     description: description,
    //     location: customerAddress,
    //     timeZone: "America/New_York",
    //     attendees: [customerEmail],
    //     sendUpdates: "all"
    //   }
    // });
    
    // Mock response for now
    const mockEventId = 'evt_' + Date.now();
    
    return res.status(201).json({
      success: true,
      message: 'Appointment successfully booked',
      appointment: {
        eventId: mockEventId,
        customerName,
        customerEmail,
        serviceType,
        appointmentDate,
        appointmentEndDate: endDate,
        location: customerAddress,
        calendarLink: `https://calendar.google.com/calendar/event?eid=${mockEventId}`
      }
    });
    
  } catch (error) {
    console.error('Booking error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create calendar event',
      details: error.message
    });
  }
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }
    
    // Here we would integrate with an email service like SendGrid, Mailgun, or AWS SES
    // For now, we'll use nodemailer with a configured SMTP service
    const emailContent = `New Contact Form Submission from M. Jacob Company Website

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Service Requested: ${service || 'General inquiry'}

Message:
${message}
    `;
    
    // TODO: Replace with actual email sending logic using nodemailer or email service
    console.log('Contact form submission:', emailContent);
    
    res.json({ success: true, message: 'Thank you for contacting us. We will get back to you soon!' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message. Please call us at 412-512-0425.' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;