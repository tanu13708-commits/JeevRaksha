const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Register as volunteer
router.post('/register', async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            city,
            state,
            pincode,
            skills,
            availability,
            has_vehicle,
            vehicle_type,
            experience,
            motivation
        } = req.body;

        // Convert skills to array if it's a string
        let skillsArray = [];
        if (skills) {
            if (Array.isArray(skills)) {
                skillsArray = skills;
            } else if (typeof skills === 'string') {
                skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
            }
        }

        const { data, error } = await supabaseAdmin
            .from('volunteers')
            .insert({
                name,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                skills: skillsArray,
                availability,
                has_vehicle: has_vehicle || false,
                vehicle_type,
                experience,
                motivation,
                is_active: true,
                is_verified: false,
                total_rescues: 0,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.status(201).json({
            success: true,
            message: 'Volunteer registration successful!',
            volunteer: data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all volunteers
router.get('/', async (req, res) => {
    try {
        const { city, is_active, has_vehicle } = req.query;

        let query = supabase
            .from('volunteers')
            .select('*')
            .order('total_rescues', { ascending: false });

        if (city) query = query.ilike('city', `%${city}%`);
        if (is_active) query = query.eq('is_active', is_active === 'true');
        if (has_vehicle) query = query.eq('has_vehicle', has_vehicle === 'true');

        const { data, error } = await query;

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, volunteers: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single volunteer
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('volunteers')
            .select('*, rescues:reports(count)')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({ success: false, message: 'Volunteer not found' });
        }

        res.json({ success: true, volunteer: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update volunteer availability
router.put('/:id/availability', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active, availability } = req.body;

        const { data, error } = await supabase
            .from('volunteers')
            .update({
                is_active,
                availability,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, message: 'Availability updated', volunteer: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Verify volunteer (NGO/Admin)
router.put('/:id/verify', authenticateToken, requireRole('ngo', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { is_verified } = req.body;

        const { data, error } = await supabase
            .from('volunteers')
            .update({
                is_verified,
                verified_at: is_verified ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, message: `Volunteer ${is_verified ? 'verified' : 'unverified'}`, volunteer: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Increment rescue count
router.post('/:id/complete-rescue', authenticateToken, requireRole('ngo', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const { data: volunteer } = await supabase
            .from('volunteers')
            .select('total_rescues')
            .eq('id', id)
            .single();

        const { data, error } = await supabase
            .from('volunteers')
            .update({
                total_rescues: (volunteer?.total_rescues || 0) + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, message: 'Rescue count updated', volunteer: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get volunteer leaderboard
router.get('/stats/leaderboard', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const { data, error } = await supabase
            .from('volunteers')
            .select('id, name, city, total_rescues, is_verified')
            .eq('is_active', true)
            .order('total_rescues', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, leaderboard: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
