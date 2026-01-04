const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Add animal for adoption
router.post('/animals', authenticateToken, requireRole('ngo', 'admin'), upload.array('images', 5), async (req, res) => {
    try {
        const {
            name,
            animal_type,
            breed,
            age,
            age_unit,
            gender,
            size,
            color,
            description,
            health_status,
            is_vaccinated,
            is_neutered,
            temperament,
            good_with_kids,
            good_with_pets,
            special_needs,
            ngo_id
        } = req.body;

        const imageUrls = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

        const { data, error } = await supabaseAdmin
            .from('adoption_animals')
            .insert({
                name,
                animal_type,
                breed,
                age: parseInt(age),
                age_unit: age_unit || 'years',
                gender,
                size,
                color,
                description,
                health_status,
                is_vaccinated: is_vaccinated === 'true',
                is_neutered: is_neutered === 'true',
                temperament,
                good_with_kids: good_with_kids === 'true',
                good_with_pets: good_with_pets === 'true',
                special_needs,
                images: imageUrls,
                ngo_id,
                status: 'available',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.status(201).json({
            success: true,
            message: 'Animal added for adoption',
            animal: data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all animals for adoption
router.get('/animals', async (req, res) => {
    try {
        const { 
            animal_type, 
            breed, 
            gender, 
            size, 
            age_min, 
            age_max,
            page = 1, 
            limit = 12 
        } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('adoption_animals')
            .select('*, ngo:ngos(id, name, city)', { count: 'exact' })
            .eq('status', 'available')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (animal_type) query = query.eq('animal_type', animal_type);
        if (breed) query = query.ilike('breed', `%${breed}%`);
        if (gender) query = query.eq('gender', gender);
        if (size) query = query.eq('size', size);
        if (age_min) query = query.gte('age', parseInt(age_min));
        if (age_max) query = query.lte('age', parseInt(age_max));

        const { data, error, count } = await query;

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({
            success: true,
            animals: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single animal
router.get('/animals/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('adoption_animals')
            .select('*, ngo:ngos(*)')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({ success: false, message: 'Animal not found' });
        }

        res.json({ success: true, animal: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Submit adoption application
router.post('/applications', optionalAuth, async (req, res) => {
    try {
        const {
            animal_id,
            animal_name,
            animal_type,
            animal_breed,
            applicant_name,
            applicant_email,
            applicant_phone,
            address,
            city,
            state,
            pincode,
            occupation,
            has_pets,
            current_pets,
            has_kids,
            kids_ages,
            home_type,
            has_yard,
            experience,
            reason,
            references
        } = req.body;

        let ngo_id = null;

        // If animal_id provided, check if animal exists
        if (animal_id) {
            const { data: animal } = await supabase
                .from('adoption_animals')
                .select('status, ngo_id')
                .eq('id', animal_id)
                .single();

            if (animal && animal.status === 'available') {
                ngo_id = animal.ngo_id;
            }
        }

        const { data, error } = await supabaseAdmin
            .from('adoption_applications')
            .insert({
                animal_id: animal_id || null,
                animal_name: animal_name || null,
                animal_type: animal_type || null,
                animal_breed: animal_breed || null,
                applicant_name,
                applicant_email,
                applicant_phone,
                address,
                city,
                state,
                pincode,
                occupation,
                has_pets: has_pets || false,
                current_pets,
                has_kids: has_kids || false,
                kids_ages,
                home_type,
                has_yard: has_yard || false,
                experience,
                reason,
                references,
                ngo_id,
                status: 'pending',
                user_id: req.user?.id || null,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.status(201).json({
            success: true,
            message: 'Adoption application submitted successfully!',
            application: data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get applications for an animal (NGO only)
router.get('/animals/:id/applications', authenticateToken, requireRole('ngo', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('adoption_applications')
            .select('*')
            .eq('animal_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, applications: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update application status (NGO only)
router.put('/applications/:id/status', authenticateToken, requireRole('ngo', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const { data, error } = await supabase
            .from('adoption_applications')
            .update({
                status,
                review_notes: notes,
                reviewed_at: new Date().toISOString(),
                reviewed_by: req.user.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        // If approved, mark animal as adopted
        if (status === 'approved') {
            await supabase
                .from('adoption_animals')
                .update({ status: 'adopted', adopted_at: new Date().toISOString() })
                .eq('id', data.animal_id);
        }

        res.json({ success: true, message: 'Application status updated', application: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get my applications
router.get('/my-applications', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('adoption_applications')
            .select('*, animal:adoption_animals(*)')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, applications: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
