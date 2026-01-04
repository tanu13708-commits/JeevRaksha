const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Create sponsorship
router.post('/', optionalAuth, async (req, res) => {
    try {
        const {
            animal_id,
            animal_name,
            animal_type,
            amount_per_month,
            duration_months,
            sponsor_name,
            sponsor_email,
            sponsor_phone,
            message
        } = req.body;

        const totalAmount = parseFloat(amount_per_month) * parseInt(duration_months);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + parseInt(duration_months));

        const { data, error } = await supabaseAdmin
            .from('sponsorships')
            .insert({
                animal_id: animal_id || null,
                animal_name: animal_name || null,
                animal_type: animal_type || null,
                amount_per_month: parseFloat(amount_per_month),
                duration_months: parseInt(duration_months),
                total_amount: totalAmount,
                sponsor_name,
                sponsor_email,
                sponsor_phone,
                message,
                status: 'active',
                user_id: req.user?.id || null,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.status(201).json({
            success: true,
            message: 'Sponsorship created successfully!',
            sponsorship: data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all sponsorships
router.get('/', async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('sponsorships')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq('status', status);

        const { data, error, count } = await query;

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({
            success: true,
            sponsorships: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get user's sponsorships
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sponsorships')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, sponsorships: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
