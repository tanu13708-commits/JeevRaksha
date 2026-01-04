const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, full_name, phone, role = 'citizen' } = req.body;

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name,
                    phone,
                    role
                }
            }
        });

        if (authError) {
            return res.status(400).json({ success: false, message: authError.message });
        }

        // Create profile in profiles table
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                email,
                full_name,
                phone,
                role,
                created_at: new Date().toISOString()
            });

        if (profileError) {
            console.error('Profile creation error:', profileError);
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please check your email to verify.',
            user: authData.user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({ success: false, message: error.message });
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        res.json({
            success: true,
            message: 'Login successful',
            token: data.session.access_token,
            user: { ...data.user, profile }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        res.json({ success: true, user: { ...req.user, profile } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { full_name, phone, address, avatar_url } = req.body;

        const { data, error } = await supabase
            .from('profiles')
            .update({
                full_name,
                phone,
                address,
                avatar_url,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, message: 'Profile updated', profile: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Reset password request
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.FRONTEND_URL}/reset-password`
        });

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.json({ success: true, message: 'Password reset email sent' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
