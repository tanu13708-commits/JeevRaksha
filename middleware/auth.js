const { supabase } = require('../config/supabase');

// Middleware to verify Supabase JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Token verification failed' });
    }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
                req.user = user;
                req.token = token;
            }
        } catch (error) {
            // Ignore errors for optional auth
        }
    }
    next();
};

// Check if user has specific role
const requireRole = (...roles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', req.user.id)
                .single();

            if (error || !profile) {
                return res.status(403).json({ success: false, message: 'Profile not found' });
            }

            if (!roles.includes(profile.role)) {
                return res.status(403).json({ success: false, message: 'Insufficient permissions' });
            }

            req.userRole = profile.role;
            next();
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Role verification failed' });
        }
    };
};

module.exports = { authenticateToken, optionalAuth, requireRole };
