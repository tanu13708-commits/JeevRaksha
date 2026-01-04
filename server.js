const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

// Routes
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const ngoRoutes = require('./routes/ngos');
const volunteerRoutes = require('./routes/volunteers');
const triageRoutes = require('./routes/triage');
const donationRoutes = require('./routes/donations');
const adoptionRoutes = require('./routes/adoptions');
const dashboardRoutes = require('./routes/dashboard');
const sponsorshipRoutes = require('./routes/sponsorships');
const contactRoutes = require('./routes/contact');

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/adoptions', adoptionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sponsorships', sponsorshipRoutes);
app.use('/api/contact', contactRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'JeevRaksha API is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Something went wrong!', error: err.message });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`🐾 JeevRaksha Backend running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
});
