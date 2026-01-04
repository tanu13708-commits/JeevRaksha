const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Register NGO
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
            registration_number,
            description,
            services,
            latitude,
            longitude
        } = req.body;

        const { data, error } = await supabaseAdmin
            .from('ngos')
            .insert({
                name,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                registration_number,
                description,
                services,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                is_verified: false,
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.status(201).json({
            success: true,
            message: 'NGO registration submitted for verification',
            ngo: data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all NGOs
router.get('/', async (req, res) => {
    try {
        const { city, state, verified_only = true } = req.query;

        let query = supabase
            .from('ngos')
            .select('*')
            .order('name');

        if (verified_only === 'true') {
            query = query.eq('is_verified', true);
        }
        if (city) query = query.ilike('city', `%${city}%`);
        if (state) query = query.ilike('state', `%${state}%`);

        const { data, error } = await query;

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, ngos: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get nearby NGOs
router.get('/nearby', async (req, res) => {
    try {
        const { latitude, longitude, radius = 50 } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
        }

        // Using Supabase PostGIS or simple distance calculation
        const { data, error } = await supabase
            .from('ngos')
            .select('*')
            .eq('is_verified', true);

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        // Calculate distance and filter
        const lat1 = parseFloat(latitude);
        const lon1 = parseFloat(longitude);
        const radiusKm = parseFloat(radius);

        const nearbyNGOs = data.filter(ngo => {
            if (!ngo.latitude || !ngo.longitude) return false;
            
            const distance = calculateDistance(lat1, lon1, ngo.latitude, ngo.longitude);
            ngo.distance = distance;
            return distance <= radiusKm;
        }).sort((a, b) => a.distance - b.distance);

        res.json({ success: true, ngos: nearbyNGOs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single NGO
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('ngos')
            .select('*, reports:reports(count)')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }

        res.json({ success: true, ngo: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Verify NGO (Admin only)
router.put('/:id/verify', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { is_verified } = req.body;

        const { data, error } = await supabase
            .from('ngos')
            .update({
                is_verified,
                status: is_verified ? 'active' : 'rejected',
                verified_at: is_verified ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, message: `NGO ${is_verified ? 'verified' : 'rejected'}`, ngo: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update NGO details
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('ngos')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, message: 'NGO updated', ngo: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

module.exports = router;
