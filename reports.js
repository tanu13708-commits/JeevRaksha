const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Create new animal rescue report (JSON)
router.post('/', optionalAuth, async (req, res) => {
    try {
        console.log('Received report data:', req.body);
        
        const {
            animal_type,
            condition,
            description,
            location,
            latitude,
            longitude,
            landmark,
            reporter_name,
            reporter_phone,
            reporter_email,
            urgency_level
        } = req.body;

        // Validate required fields
        if (!animal_type || !condition || !location) {
            return res.status(400).json({ 
                success: false, 
                message: 'Animal type, condition, and location are required' 
            });
        }

        const { data, error } = await supabaseAdmin
            .from('reports')
            .insert({
                animal_type,
                condition,
                description: description || '',
                location,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                landmark: landmark || '',
                image_url: null,
                reporter_name: reporter_name || 'Anonymous',
                reporter_phone: reporter_phone || '',
                reporter_email: reporter_email || '',
                urgency_level: urgency_level || 'medium',
                status: 'pending',
                user_id: req.user?.id || null,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(400).json({ success: false, message: error.message });
        }

        console.log('Report created:', data.id);
        res.status(201).json({
            success: true,
            message: 'Report submitted successfully!',
            report: data
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create report with image upload
router.post('/with-image', optionalAuth, upload.single('image'), async (req, res) => {
    try {
        const {
            animal_type,
            condition,
            description,
            location,
            latitude,
            longitude,
            landmark,
            reporter_name,
            reporter_phone,
            reporter_email,
            urgency_level
        } = req.body;

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const { data, error } = await supabaseAdmin
            .from('reports')
            .insert({
                animal_type,
                condition,
                description,
                location,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                landmark,
                image_url: imageUrl,
                reporter_name,
                reporter_phone,
                reporter_email,
                urgency_level: urgency_level || 'medium',
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
            message: 'Report submitted successfully!',
            report: data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all reports (with filters)
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { status, animal_type, urgency_level, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('reports')
            .select('*, assigned_ngo:ngos(id, name), assigned_volunteer:volunteers(id, name)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq('status', status);
        if (animal_type) query = query.eq('animal_type', animal_type);
        if (urgency_level) query = query.eq('urgency_level', urgency_level);

        const { data, error, count } = await query;

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({
            success: true,
            reports: data,
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

// Get single report
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('reports')
            .select('*, assigned_ngo:ngos(*), assigned_volunteer:volunteers(*), updates:report_updates(*)')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        res.json({ success: true, report: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update report status (NGO/Admin only)
router.put('/:id/status', authenticateToken, requireRole('ngo', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const { data, error } = await supabase
            .from('reports')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        // Add update log
        await supabase.from('report_updates').insert({
            report_id: id,
            status,
            notes,
            updated_by: req.user.id,
            created_at: new Date().toISOString()
        });

        res.json({ success: true, message: 'Status updated', report: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Assign report to NGO
router.put('/:id/assign-ngo', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { ngo_id } = req.body;

        const { data, error } = await supabase
            .from('reports')
            .update({
                assigned_ngo_id: ngo_id,
                status: 'assigned',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, message: 'NGO assigned', report: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Assign volunteer to report
router.put('/:id/assign-volunteer', authenticateToken, requireRole('ngo', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { volunteer_id } = req.body;

        const { data, error } = await supabase
            .from('reports')
            .update({
                assigned_volunteer_id: volunteer_id,
                status: 'in_progress',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, message: 'Volunteer assigned', report: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get my reports (for logged in users)
router.get('/my/reports', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, reports: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Track report by ID (public - no auth needed)
router.get('/track/:reportId', async (req, res) => {
    try {
        let { reportId } = req.params;
        
        // Clean the report ID - remove # and JR- prefix if present
        reportId = reportId.replace(/^#/, '').replace(/^JR-/i, '').toUpperCase();
        
        console.log('Tracking report:', reportId);
        
        // First try exact match (full UUID)
        let { data, error } = await supabase
            .from('reports')
            .select('*, assigned_ngo:ngos(id, name, phone), assigned_volunteer:volunteers(id, name, phone)')
            .eq('id', reportId)
            .single();
        
        // If not found, try partial match (ID starts with given string)
        if (error || !data) {
            const { data: partialData, error: partialError } = await supabase
                .from('reports')
                .select('*, assigned_ngo:ngos(id, name, phone), assigned_volunteer:volunteers(id, name, phone)')
                .ilike('id', `${reportId}%`)
                .limit(1)
                .single();
            
            if (partialError || !partialData) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Report not found. Please check the Report ID and try again.' 
                });
            }
            
            data = partialData;
        }
        
        // Format response
        res.json({
            success: true,
            data: {
                reportId: data.id,
                animalType: data.animal_type,
                animalCondition: data.condition,
                description: data.description,
                status: data.status,
                urgency: data.urgency_level,
                location: {
                    address: data.location,
                    landmark: data.landmark,
                    city: data.location
                },
                reporterName: data.reporter_name,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                assignedTo: data.assigned_ngo ? {
                    ngoName: data.assigned_ngo.name,
                    ngoPhone: data.assigned_ngo.phone
                } : null,
                volunteer: data.assigned_volunteer ? {
                    name: data.assigned_volunteer.name,
                    phone: data.assigned_volunteer.phone
                } : null
            }
        });
    } catch (error) {
        console.error('Track error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
