-- ========================================
-- JEEVRAKSHA SUPABASE DATABASE SCHEMA
-- ========================================
-- Run this SQL in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- ========================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'citizen' CHECK (role IN ('citizen', 'volunteer', 'ngo', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- ========================================
-- 2. NGOS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ngos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    registration_number TEXT,
    description TEXT,
    services TEXT[], -- Array of services offered
    logo_url TEXT,
    website TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_verified BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
    verified_at TIMESTAMPTZ,
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ngos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NGOs are viewable by everyone" ON ngos
    FOR SELECT USING (true);

CREATE POLICY "Verified NGOs can update their own record" ON ngos
    FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 3. VOLUNTEERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS volunteers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    skills TEXT[], -- Array of skills
    availability TEXT, -- e.g., 'weekends', 'evenings', 'anytime'
    has_vehicle BOOLEAN DEFAULT false,
    vehicle_type TEXT,
    experience TEXT,
    motivation TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    total_rescues INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    user_id UUID REFERENCES profiles(id),
    ngo_id UUID REFERENCES ngos(id), -- Associated NGO if any
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers are viewable by everyone" ON volunteers
    FOR SELECT USING (true);

CREATE POLICY "Volunteers can update own record" ON volunteers
    FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 4. REPORTS TABLE (Animal Rescue Reports)
-- ========================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    animal_type TEXT NOT NULL,
    condition TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    landmark TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    image_url TEXT,
    additional_images TEXT[], -- Array of image URLs
    reporter_name TEXT,
    reporter_phone TEXT,
    reporter_email TEXT,
    urgency_level TEXT DEFAULT 'medium' CHECK (urgency_level IN ('critical', 'high', 'medium', 'low')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'rescued', 'closed', 'cancelled')),
    user_id UUID REFERENCES profiles(id),
    assigned_ngo_id UUID REFERENCES ngos(id),
    assigned_volunteer_id UUID REFERENCES volunteers(id),
    rescue_notes TEXT,
    rescued_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports are viewable by everyone" ON reports
    FOR SELECT USING (true);

CREATE POLICY "Anyone can create reports" ON reports
    FOR INSERT WITH CHECK (true);

CREATE POLICY "NGOs and admins can update reports" ON reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('ngo', 'admin')
        )
    );

-- ========================================
-- 5. REPORT UPDATES TABLE (Status History)
-- ========================================
CREATE TABLE IF NOT EXISTS report_updates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE report_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Report updates are viewable by everyone" ON report_updates
    FOR SELECT USING (true);

-- ========================================
-- 6. TRIAGE RESULTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS triage_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    animal_type TEXT NOT NULL,
    symptoms JSONB, -- {bleeding: 'yes', stand: 'no', etc.}
    description TEXT,
    image_url TEXT,
    urgency_level TEXT CHECK (urgency_level IN ('critical', 'urgent', 'monitor', 'non_emergency')),
    risk_score INTEGER,
    advice TEXT,
    first_aid TEXT[],
    user_id UUID REFERENCES profiles(id),
    report_id UUID REFERENCES reports(id), -- Link to report if created
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE triage_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Triage results are viewable by owner" ON triage_results
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create triage" ON triage_results
    FOR INSERT WITH CHECK (true);

-- ========================================
-- 7. DONATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS donations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    donor_name TEXT,
    donor_email TEXT,
    donor_phone TEXT,
    message TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    donation_type TEXT DEFAULT 'general' CHECK (donation_type IN ('general', 'rescue', 'medical', 'food', 'shelter')),
    ngo_id UUID REFERENCES ngos(id),
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    transaction_id TEXT,
    payment_details JSONB,
    user_id UUID REFERENCES profiles(id),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Completed donations are viewable by everyone" ON donations
    FOR SELECT USING (payment_status = 'completed');

CREATE POLICY "Users can view own donations" ON donations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create donations" ON donations
    FOR INSERT WITH CHECK (true);

-- ========================================
-- 8. SPONSORSHIPS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS sponsorships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    animal_id UUID,
    amount_per_month DECIMAL(10, 2) NOT NULL,
    duration_months INTEGER NOT NULL,
    total_amount DECIMAL(10, 2),
    sponsor_name TEXT,
    sponsor_email TEXT,
    sponsor_phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    user_id UUID REFERENCES profiles(id),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sponsorships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsorships viewable by owner" ON sponsorships
    FOR SELECT USING (auth.uid() = user_id);

-- ========================================
-- 9. ADOPTION ANIMALS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS adoption_animals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    animal_type TEXT NOT NULL,
    breed TEXT,
    age INTEGER,
    age_unit TEXT DEFAULT 'years' CHECK (age_unit IN ('days', 'weeks', 'months', 'years')),
    gender TEXT CHECK (gender IN ('male', 'female', 'unknown')),
    size TEXT CHECK (size IN ('small', 'medium', 'large', 'extra_large')),
    color TEXT,
    description TEXT,
    health_status TEXT,
    is_vaccinated BOOLEAN DEFAULT false,
    is_neutered BOOLEAN DEFAULT false,
    temperament TEXT,
    good_with_kids BOOLEAN DEFAULT false,
    good_with_pets BOOLEAN DEFAULT false,
    special_needs TEXT,
    images TEXT[], -- Array of image URLs
    ngo_id UUID REFERENCES ngos(id),
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'pending', 'adopted', 'not_available')),
    adopted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE adoption_animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Adoption animals are viewable by everyone" ON adoption_animals
    FOR SELECT USING (true);

-- ========================================
-- 10. ADOPTION APPLICATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS adoption_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    animal_id UUID REFERENCES adoption_animals(id) NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    applicant_phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    occupation TEXT,
    has_pets BOOLEAN DEFAULT false,
    current_pets TEXT,
    has_kids BOOLEAN DEFAULT false,
    kids_ages TEXT,
    home_type TEXT,
    has_yard BOOLEAN DEFAULT false,
    experience TEXT,
    reason TEXT,
    reference_contacts TEXT,
    ngo_id UUID REFERENCES ngos(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'withdrawn')),
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id),
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE adoption_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications" ON adoption_applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "NGOs can view their applications" ON adoption_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ngos WHERE ngos.id = adoption_applications.ngo_id AND ngos.user_id = auth.uid()
        )
    );

-- ========================================
-- 11. CONTACT MESSAGES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
    replied_at TIMESTAMPTZ,
    replied_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create contact messages" ON contact_messages
    FOR INSERT WITH CHECK (true);

-- ========================================
-- INDEXES FOR BETTER PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_animal_type ON reports(animal_type);
CREATE INDEX IF NOT EXISTS idx_reports_urgency ON reports(urgency_level);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_ngos_city ON ngos(city);
CREATE INDEX IF NOT EXISTS idx_ngos_verified ON ngos(is_verified);
CREATE INDEX IF NOT EXISTS idx_ngos_location ON ngos(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_volunteers_city ON volunteers(city);
CREATE INDEX IF NOT EXISTS idx_volunteers_active ON volunteers(is_active);

CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(payment_status);
CREATE INDEX IF NOT EXISTS idx_donations_type ON donations(donation_type);

CREATE INDEX IF NOT EXISTS idx_adoption_animals_type ON adoption_animals(animal_type);
CREATE INDEX IF NOT EXISTS idx_adoption_animals_status ON adoption_animals(status);

-- ========================================
-- FUNCTIONS & TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ngos_updated_at BEFORE UPDATE ON ngos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volunteers_updated_at BEFORE UPDATE ON volunteers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adoption_animals_updated_at BEFORE UPDATE ON adoption_animals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adoption_applications_updated_at BEFORE UPDATE ON adoption_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'citizen')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========================================
-- SAMPLE DATA (Optional - Remove in production)
-- ========================================

-- Insert sample NGOs
INSERT INTO ngos (name, email, phone, city, state, description, services, is_verified, status) VALUES
('Animal Aid Unlimited', 'contact@animalaidunlimited.org', '+91-9876543210', 'Udaipur', 'Rajasthan', 'Rescue and treatment center for street animals', ARRAY['rescue', 'medical', 'shelter'], true, 'active'),
('Blue Cross of India', 'info@bluecrossofindia.org', '+91-9876543211', 'Chennai', 'Tamil Nadu', 'One of India''s oldest animal welfare organizations', ARRAY['rescue', 'adoption', 'medical'], true, 'active'),
('People For Animals', 'help@peopleforanimalsindia.org', '+91-9876543212', 'Delhi', 'Delhi', 'India''s largest animal welfare organization', ARRAY['rescue', 'legal', 'advocacy'], true, 'active');

-- Insert sample volunteers
INSERT INTO volunteers (name, email, phone, city, state, skills, is_active, total_rescues) VALUES
('Rahul Sharma', 'rahul@example.com', '+91-9876543220', 'Mumbai', 'Maharashtra', ARRAY['first_aid', 'transport', 'handling'], true, 15),
('Priya Patel', 'priya@example.com', '+91-9876543221', 'Ahmedabad', 'Gujarat', ARRAY['medical', 'foster'], true, 23),
('Amit Kumar', 'amit@example.com', '+91-9876543222', 'Bangalore', 'Karnataka', ARRAY['transport', 'handling'], true, 8);
