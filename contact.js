const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

// POST /api/contact - Save contact message
router.post('/', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
        }
        const { data, error } = await supabaseAdmin
            .from('contact_messages')
            .insert({ name, email, message, created_at: new Date().toISOString() })
            .select()
            .single();
        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(201).json({ success: true, message: 'Message sent successfully!', contact: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
