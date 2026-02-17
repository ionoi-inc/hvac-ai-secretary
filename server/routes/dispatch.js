const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/dispatch/bookings - Get all bookings for dispatch view
router.get('/bookings', async (req, res) => {
  const { status, date, tech_id } = req.query;
  
  try {
    let query = `
      SELECT 
        sr.request_id,
        sr.status,
        sr.priority,
        sr.preferred_date,
        sr.preferred_time,
        sr.scheduled_date,
        sr.scheduled_time,
        sr.created_at,
        sr.notes,
        sr.issue_description,
        c.customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        c.address,
        c.city,
        c.state,
        c.zip,
        st.service_name,
        st.base_price,
        st.estimated_duration_minutes,
        t.tech_id,
        t.name as tech_name,
        t.phone as tech_phone,
        t.status as tech_status
      FROM SERVICE_REQUESTS sr
      JOIN CUSTOMERS c ON sr.customer_id = c.customer_id
      LEFT JOIN SERVICE_TYPES st ON sr.service_type_id = st.service_type_id
      LEFT JOIN TECHNICIANS t ON sr.assigned_tech_id = t.tech_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND sr.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (date) {
      query += ` AND (sr.scheduled_date = $${paramCount} OR sr.preferred_date = $${paramCount})`;
      params.push(date);
      paramCount++;
    }

    if (tech_id) {
      query += ` AND sr.assigned_tech_id = $${paramCount}`;
      params.push(tech_id);
      paramCount++;
    }

    query += ` ORDER BY 
      CASE sr.status 
        WHEN 'in_progress' THEN 1
        WHEN 'scheduled' THEN 2
        WHEN 'pending' THEN 3
        ELSE 4
      END,
      sr.priority DESC,
      sr.scheduled_date ASC,
      sr.preferred_date ASC,
      sr.created_at ASC
    `;

    const result = await pool.query(query, params);
    
    res.json({ 
      success: true, 
      bookings: result.rows,
      count: result.rows.length 
    });
  } catch (error) {
    console.error('Get dispatch bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve bookings' });
  }
});

// GET /api/dispatch/technicians - Get all technicians with their current status
router.get('/technicians', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.tech_id,
        t.name,
        t.phone,
        t.email,
        t.status,
        t.specialization,
        COUNT(sr.request_id) as active_jobs
      FROM TECHNICIANS t
      LEFT JOIN SERVICE_REQUESTS sr ON t.tech_id = sr.assigned_tech_id 
        AND sr.status IN ('scheduled', 'in_progress')
      GROUP BY t.tech_id
      ORDER BY t.name
    `);

    res.json({ success: true, technicians: result.rows });
  } catch (error) {
    console.error('Get technicians error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve technicians' });
  }
});

// PUT /api/dispatch/bookings/:id/assign - Assign tech to a booking
router.put('/bookings/:id/assign', async (req, res) => {
  const { tech_id, scheduled_date, scheduled_time } = req.body;
  const requestId = req.params.id;

  try {
    const result = await pool.query(
      `UPDATE SERVICE_REQUESTS 
       SET assigned_tech_id = $1, 
           scheduled_date = $2, 
           scheduled_time = $3,
           status = 'scheduled',
           updated_at = CURRENT_TIMESTAMP
       WHERE request_id = $4
       RETURNING *`,
      [tech_id, scheduled_date, scheduled_time, requestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ 
      success: true, 
      message: 'Tech assigned successfully',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Assign tech error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign tech' });
  }
});

// PUT /api/dispatch/bookings/:id/status - Update booking status
router.put('/bookings/:id/status', async (req, res) => {
  const { status } = req.body;
  const requestId = req.params.id;

  const validStatuses = ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
    });
  }

  try {
    const result = await pool.query(
      `UPDATE SERVICE_REQUESTS 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE request_id = $2
       RETURNING *`,
      [status, requestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ 
      success: true, 
      message: 'Status updated successfully',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// PUT /api/dispatch/bookings/:id - Update booking details
router.put('/bookings/:id', async (req, res) => {
  const requestId = req.params.id;
  const { 
    scheduled_date, 
    scheduled_time, 
    priority, 
    notes,
    service_type_id 
  } = req.body;

  try {
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (scheduled_date !== undefined) {
      updates.push(`scheduled_date = $${paramCount}`);
      params.push(scheduled_date);
      paramCount++;
    }
    if (scheduled_time !== undefined) {
      updates.push(`scheduled_time = $${paramCount}`);
      params.push(scheduled_time);
      paramCount++;
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount}`);
      params.push(priority);
      paramCount++;
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      params.push(notes);
      paramCount++;
    }
    if (service_type_id !== undefined) {
      updates.push(`service_type_id = $${paramCount}`);
      params.push(service_type_id);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(requestId);

    const query = `
      UPDATE SERVICE_REQUESTS 
      SET ${updates.join(', ')}
      WHERE request_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ 
      success: true, 
      message: 'Booking updated successfully',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking' });
  }
});

// GET /api/dispatch/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'completed' AND DATE(updated_at) = CURRENT_DATE THEN 1 END) as completed_today,
        COUNT(CASE WHEN scheduled_date = CURRENT_DATE THEN 1 END) as scheduled_today,
        COUNT(CASE WHEN scheduled_date = CURRENT_DATE + 1 THEN 1 END) as scheduled_tomorrow
      FROM SERVICE_REQUESTS
      WHERE status != 'cancelled'
    `);

    res.json({ success: true, stats: stats.rows[0] });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve stats' });
  }
});

module.exports = router;
