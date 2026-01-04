// Frontend Supabase Configuration
// Add this to your frontend to connect directly to Supabase

const SUPABASE_URL = 'https://ogovwqnnfbkevkfsrtod.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nb3Z3cW5uZmJrZXZrZnNydG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MDUxNTcsImV4cCI6MjA4MzA4MTE1N30.Z6nno4IHzjm58zcJyfvLi9EdUoribK5NBbyj9b3__JE';

// Initialize Supabase client (for browser)
// Add this script tag to your HTML:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== AUTHENTICATION FUNCTIONS =====

async function signUp(email, password, fullName, phone) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                phone: phone
            }
        }
    });
    
    if (error) throw error;
    return data;
}

async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) throw error;
    
    // Store token for API calls
    if (data.session) {
        localStorage.setItem('jeevraksha_token', data.session.access_token);
    }
    
    return data;
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    localStorage.removeItem('jeevraksha_token');
    if (error) throw error;
}

async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
}

// ===== REPORT FUNCTIONS =====

async function submitReport(reportData) {
    const { data, error } = await supabase
        .from('reports')
        .insert(reportData)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

async function getReports(filters = {}) {
    let query = supabase
        .from('reports')
        .select('*, assigned_ngo:ngos(id, name), assigned_volunteer:volunteers(id, name)')
        .order('created_at', { ascending: false });
    
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.animal_type) query = query.eq('animal_type', filters.animal_type);
    if (filters.limit) query = query.limit(filters.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

async function getReportById(id) {
    const { data, error } = await supabase
        .from('reports')
        .select('*, assigned_ngo:ngos(*), assigned_volunteer:volunteers(*)')
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
}

// ===== NGO FUNCTIONS =====

async function getNGOs(filters = {}) {
    let query = supabase
        .from('ngos')
        .select('*')
        .eq('is_verified', true)
        .order('name');
    
    if (filters.city) query = query.ilike('city', `%${filters.city}%`);
    if (filters.state) query = query.ilike('state', `%${filters.state}%`);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// ===== VOLUNTEER FUNCTIONS =====

async function registerVolunteer(volunteerData) {
    const { data, error } = await supabase
        .from('volunteers')
        .insert(volunteerData)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

async function getVolunteerLeaderboard(limit = 10) {
    const { data, error } = await supabase
        .from('volunteers')
        .select('id, name, city, total_rescues, is_verified')
        .eq('is_active', true)
        .order('total_rescues', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data;
}

// ===== TRIAGE FUNCTIONS =====

async function submitTriage(triageData) {
    const { data, error } = await supabase
        .from('triage_results')
        .insert(triageData)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// ===== ADOPTION FUNCTIONS =====

async function getAdoptionAnimals(filters = {}) {
    let query = supabase
        .from('adoption_animals')
        .select('*, ngo:ngos(id, name, city)')
        .eq('status', 'available')
        .order('created_at', { ascending: false });
    
    if (filters.animal_type) query = query.eq('animal_type', filters.animal_type);
    if (filters.gender) query = query.eq('gender', filters.gender);
    if (filters.limit) query = query.limit(filters.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

async function submitAdoptionApplication(applicationData) {
    const { data, error } = await supabase
        .from('adoption_applications')
        .insert(applicationData)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// ===== DONATION FUNCTIONS =====

async function submitDonation(donationData) {
    const { data, error } = await supabase
        .from('donations')
        .insert(donationData)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

async function getDonationStats() {
    const { data, error } = await supabase
        .from('donations')
        .select('amount')
        .eq('payment_status', 'completed');
    
    if (error) throw error;
    
    const totalAmount = data.reduce((sum, d) => sum + d.amount, 0);
    return {
        total_amount: totalAmount,
        total_donations: data.length
    };
}

// ===== DASHBOARD FUNCTIONS =====

async function getDashboardStats() {
    const stats = {};
    
    // Total reports
    const { count: totalReports } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true });
    stats.total_reports = totalReports || 0;
    
    // Rescued animals
    const { count: rescued } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rescued');
    stats.rescued_animals = rescued || 0;
    
    // Active NGOs
    const { count: ngos } = await supabase
        .from('ngos')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true);
    stats.active_ngos = ngos || 0;
    
    // Active volunteers
    const { count: volunteers } = await supabase
        .from('volunteers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
    stats.active_volunteers = volunteers || 0;
    
    return stats;
}

// ===== FILE UPLOAD TO SUPABASE STORAGE =====

async function uploadImage(file, bucket = 'animal-images') {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);
    
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
    
    return publicUrl;
}

// ===== REAL-TIME SUBSCRIPTIONS =====

function subscribeToReports(callback) {
    return supabase
        .channel('reports')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'reports' },
            callback
        )
        .subscribe();
}

function subscribeToNewReports(callback) {
    return supabase
        .channel('new-reports')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'reports' },
            (payload) => callback(payload.new)
        )
        .subscribe();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        supabase,
        signUp,
        signIn,
        signOut,
        getCurrentUser,
        submitReport,
        getReports,
        getReportById,
        getNGOs,
        registerVolunteer,
        getVolunteerLeaderboard,
        submitTriage,
        getAdoptionAnimals,
        submitAdoptionApplication,
        submitDonation,
        getDonationStats,
        getDashboardStats,
        uploadImage,
        subscribeToReports,
        subscribeToNewReports
    };
}
