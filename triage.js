const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// AI Triage Assessment
router.post('/assess', optionalAuth, upload.single('image'), async (req, res) => {
    try {
        const {
            animal_type,
            bleeding,
            stand,
            vehicle,
            breathing,
            young,
            description
        } = req.body;

        // Triage logic
        let urgency_level = 'non_emergency';
        let risk_score = 0;
        let advice = '';
        let first_aid = [];
        let contact_priority = '';

        // Calculate risk score
        if (bleeding === 'yes') risk_score += 30;
        if (vehicle === 'yes') risk_score += 35;
        if (breathing === 'yes') risk_score += 25;
        if (stand === 'yes') risk_score += 20;
        if (young === 'yes') risk_score += 10;

        // Determine urgency level
        if (risk_score >= 60) {
            urgency_level = 'critical';
            advice = 'This is a CRITICAL emergency! The animal needs immediate professional help.';
            contact_priority = 'Call emergency vet/NGO immediately';
            first_aid = [
                'Keep the animal calm and still',
                'Do not move the animal unless absolutely necessary',
                'Apply gentle pressure to bleeding wounds with clean cloth',
                'Keep the animal warm with a blanket',
                'Do NOT give food or water if unconscious'
            ];
        } else if (risk_score >= 40) {
            urgency_level = 'urgent';
            advice = 'Urgent attention needed. Contact rescue team as soon as possible.';
            contact_priority = 'Contact NGO/rescue within 30 minutes';
            first_aid = [
                'Move animal to safe area if on road',
                'Provide shade and shelter',
                'Offer water in a shallow container if conscious',
                'Monitor breathing and behavior',
                'Keep other animals and people away'
            ];
        } else if (risk_score >= 20) {
            urgency_level = 'monitor';
            advice = 'Monitor the animal closely. Seek help if condition worsens.';
            contact_priority = 'Contact local shelter within a few hours';
            first_aid = [
                'Provide fresh water',
                'Create a quiet, safe space',
                'Offer food if the animal seems hungry',
                'Watch for signs of distress',
                'Take photos for documentation'
            ];
        } else {
            urgency_level = 'non_emergency';
            advice = 'No immediate emergency detected. Monitor and provide basic care.';
            contact_priority = 'Contact animal welfare when convenient';
            first_aid = [
                'Provide food and water',
                'Create shelter from weather',
                'Monitor for any changes',
                'Consider long-term care options'
            ];
        }

        // Get recommended contacts based on location
        const { data: nearbyNGOs } = await supabase
            .from('ngos')
            .select('id, name, phone, city')
            .eq('is_verified', true)
            .limit(3);

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        // Save triage result
        const { data: triageResult, error } = await supabaseAdmin
            .from('triage_results')
            .insert({
                animal_type,
                symptoms: { bleeding, stand, vehicle, breathing, young },
                description,
                image_url: imageUrl,
                urgency_level,
                risk_score,
                advice,
                first_aid,
                user_id: req.user?.id || null,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Triage save error:', error);
        }

        res.json({
            success: true,
            triage: {
                id: triageResult?.id,
                animal_type,
                urgency_level,
                risk_score,
                advice,
                first_aid,
                contact_priority,
                recommended_contacts: nearbyNGOs || [],
                emoji: getUrgencyEmoji(urgency_level),
                color: getUrgencyColor(urgency_level)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get triage history (for logged in users)
router.get('/history', optionalAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Login required' });
        }

        const { data, error } = await supabase
            .from('triage_results')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, history: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get triage statistics
router.get('/stats', async (req, res) => {
    try {
        const { data: total } = await supabase
            .from('triage_results')
            .select('id', { count: 'exact' });

        const { data: critical } = await supabase
            .from('triage_results')
            .select('id', { count: 'exact' })
            .eq('urgency_level', 'critical');

        const { data: urgent } = await supabase
            .from('triage_results')
            .select('id', { count: 'exact' })
            .eq('urgency_level', 'urgent');

        res.json({
            success: true,
            stats: {
                total_assessments: total?.length || 0,
                critical_cases: critical?.length || 0,
                urgent_cases: urgent?.length || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper functions
function getUrgencyEmoji(level) {
    const emojis = {
        critical: '🔴',
        urgent: '🟠',
        monitor: '🟡',
        non_emergency: '🟢'
    };
    return emojis[level] || '⚪';
}

function getUrgencyColor(level) {
    const colors = {
        critical: '#dc2626',
        urgent: '#ea580c',
        monitor: '#ca8a04',
        non_emergency: '#16a34a'
    };
    return colors[level] || '#6b7280';
}

module.exports = router;
