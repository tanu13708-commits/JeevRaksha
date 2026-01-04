const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

// Get public dashboard stats
router.get('/stats', async (req, res) => {
    try {
        // Total reports
        const { count: totalReports } = await supabase
            .from('reports')
            .select('*', { count: 'exact', head: true });

        // Rescued animals
        const { count: rescuedAnimals } = await supabase
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'rescued');

        // Active NGOs
        const { count: activeNGOs } = await supabase
            .from('ngos')
            .select('*', { count: 'exact', head: true })
            .eq('is_verified', true);

        // Active volunteers
        const { count: activeVolunteers } = await supabase
            .from('volunteers')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        // Pending reports
        const { count: pendingReports } = await supabase
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        // In progress reports
        const { count: inProgressReports } = await supabase
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'in_progress');

        // Animals adopted
        const { count: animalsAdopted } = await supabase
            .from('adoption_animals')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'adopted');

        // Total donations
        const { data: donations } = await supabase
            .from('donations')
            .select('amount')
            .eq('payment_status', 'completed');

        const totalDonations = donations?.reduce((sum, d) => sum + d.amount, 0) || 0;

        res.json({
            success: true,
            stats: {
                total_reports: totalReports || 0,
                rescued_animals: rescuedAnimals || 0,
                active_ngos: activeNGOs || 0,
                active_volunteers: activeVolunteers || 0,
                pending_reports: pendingReports || 0,
                in_progress_reports: inProgressReports || 0,
                animals_adopted: animalsAdopted || 0,
                total_donations: totalDonations
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get reports by status
router.get('/reports-by-status', async (req, res) => {
    try {
        const statuses = ['pending', 'assigned', 'in_progress', 'rescued', 'closed'];
        const result = {};

        for (const status of statuses) {
            const { count } = await supabase
                .from('reports')
                .select('*', { count: 'exact', head: true })
                .eq('status', status);
            result[status] = count || 0;
        }

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get reports by animal type
router.get('/reports-by-animal', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('reports')
            .select('animal_type');

        if (error) throw error;

        const counts = {};
        data.forEach(report => {
            counts[report.animal_type] = (counts[report.animal_type] || 0) + 1;
        });

        res.json({ success: true, data: counts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get recent reports
router.get('/recent-reports', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const { data, error } = await supabase
            .from('reports')
            .select('id, animal_type, condition, location, status, urgency_level, created_at')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) throw error;

        res.json({ success: true, reports: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get monthly trends
router.get('/monthly-trends', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('reports')
            .select('created_at, status')
            .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

        if (error) throw error;

        // Group by month
        const monthlyData = {};
        data.forEach(report => {
            const month = new Date(report.created_at).toISOString().slice(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = { reports: 0, rescued: 0 };
            }
            monthlyData[month].reports++;
            if (report.status === 'rescued') {
                monthlyData[month].rescued++;
            }
        });

        res.json({ success: true, data: monthlyData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get top performing NGOs
router.get('/top-ngos', async (req, res) => {
    try {
        const { limit = 5 } = req.query;

        const { data: ngos, error } = await supabase
            .from('ngos')
            .select('id, name, city')
            .eq('is_verified', true);

        if (error) throw error;

        // Get rescue counts for each NGO
        const ngoStats = await Promise.all(ngos.map(async (ngo) => {
            const { count } = await supabase
                .from('reports')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_ngo_id', ngo.id)
                .eq('status', 'rescued');

            return { ...ngo, rescue_count: count || 0 };
        }));

        const topNGOs = ngoStats
            .sort((a, b) => b.rescue_count - a.rescue_count)
            .slice(0, parseInt(limit));

        res.json({ success: true, ngos: topNGOs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get urgency distribution
router.get('/urgency-distribution', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('reports')
            .select('urgency_level')
            .eq('status', 'pending');

        if (error) throw error;

        const distribution = { critical: 0, high: 0, medium: 0, low: 0 };
        data.forEach(report => {
            if (distribution.hasOwnProperty(report.urgency_level)) {
                distribution[report.urgency_level]++;
            }
        });

        res.json({ success: true, data: distribution });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Admin dashboard (requires auth)
router.get('/admin', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        // Get all comprehensive stats for admin
        const stats = {
            users: {},
            reports: {},
            ngos: {},
            volunteers: {},
            donations: {}
        };

        // User stats
        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        stats.users.total = totalUsers || 0;

        // Pending NGO verifications
        const { count: pendingNGOs } = await supabase
            .from('ngos')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        stats.ngos.pending_verification = pendingNGOs || 0;

        // Today's reports
        const today = new Date().toISOString().slice(0, 10);
        const { count: todayReports } = await supabase
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today);
        stats.reports.today = todayReports || 0;

        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
