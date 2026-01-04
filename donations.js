const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Create donation record
router.post('/', optionalAuth, async (req, res) => {
    try {
        const {
            amount,
            currency = 'INR',
            donor_name,
            donor_email,
            donor_phone,
            message,
            is_anonymous,
            donation_type,
            ngo_id,
            payment_method
        } = req.body;

        const { data, error } = await supabaseAdmin
            .from('donations')
            .insert({
                amount: parseFloat(amount),
                currency,
                donor_name: is_anonymous ? 'Anonymous' : donor_name,
                donor_email,
                donor_phone,
                message,
                is_anonymous: is_anonymous || false,
                donation_type: donation_type || 'general',
                ngo_id,
                payment_method,
                payment_status: 'pending',
                user_id: req.user?.id || null,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        // Here you would integrate with payment gateway (Razorpay/Stripe)
        // For now, we'll simulate a payment URL
        const paymentUrl = `https://payment.example.com/pay/${data.id}`;

        res.status(201).json({
            success: true,
            message: 'Donation initiated',
            donation: data,
            payment_url: paymentUrl
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update payment status (webhook from payment gateway)
router.post('/webhook', async (req, res) => {
    try {
        const { donation_id, payment_status, transaction_id, payment_details } = req.body;

        const { data, error } = await supabaseAdmin
            .from('donations')
            .update({
                payment_status,
                transaction_id,
                payment_details,
                paid_at: payment_status === 'completed' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', donation_id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, donation: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all donations (public - shows only completed, anonymous names hidden)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabase
            .from('donations')
            .select('id, amount, currency, donor_name, message, donation_type, created_at', { count: 'exact' })
            .eq('payment_status', 'completed')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({
            success: true,
            donations: data,
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

// Get donation statistics
router.get('/stats', async (req, res) => {
    try {
        const { data: donations, error } = await supabase
            .from('donations')
            .select('amount')
            .eq('payment_status', 'completed');

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
        const totalDonors = donations.length;

        res.json({
            success: true,
            stats: {
                total_amount: totalAmount,
                total_donations: totalDonors,
                average_donation: totalDonors > 0 ? totalAmount / totalDonors : 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get my donations (logged in user)
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('donations')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, donations: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create sponsorship
router.post('/sponsor', optionalAuth, async (req, res) => {
    try {
        const {
            animal_id,
            amount_per_month,
            duration_months,
            sponsor_name,
            sponsor_email,
            sponsor_phone,
            message
        } = req.body;

        const { data, error } = await supabaseAdmin
            .from('sponsorships')
            .insert({
                animal_id,
                amount_per_month: parseFloat(amount_per_month),
                duration_months: parseInt(duration_months),
                total_amount: parseFloat(amount_per_month) * parseInt(duration_months),
                sponsor_name,
                sponsor_email,
                sponsor_phone,
                message,
                status: 'active',
                user_id: req.user?.id || null,
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + duration_months * 30 * 24 * 60 * 60 * 1000).toISOString(),
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

module.exports = router;
