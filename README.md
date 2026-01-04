# JeevRaksha Backend with Supabase

Complete backend API for the JeevRaksha Animal Rescue Platform using Node.js, Express, and Supabase.

## 🚀 Quick Start

### 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Settings > API** and copy:
   - `Project URL` → This is your `SUPABASE_URL`
   - `anon public` key → This is your `SUPABASE_ANON_KEY`
   - `service_role` key → This is your `SUPABASE_SERVICE_ROLE_KEY`

### 2. Create Database Tables

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `database/schema.sql`
3. Run the SQL to create all tables

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your Supabase credentials
```

### 4. Install & Run

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production
npm start
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/auth/forgot-password` | Request password reset |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports` | Create new rescue report |
| GET | `/api/reports` | Get all reports (with filters) |
| GET | `/api/reports/:id` | Get single report |
| PUT | `/api/reports/:id/status` | Update report status |
| PUT | `/api/reports/:id/assign-ngo` | Assign NGO to report |
| PUT | `/api/reports/:id/assign-volunteer` | Assign volunteer |

### NGOs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ngos/register` | Register new NGO |
| GET | `/api/ngos` | Get all NGOs |
| GET | `/api/ngos/nearby` | Get nearby NGOs |
| GET | `/api/ngos/:id` | Get single NGO |
| PUT | `/api/ngos/:id/verify` | Verify NGO (admin) |

### Volunteers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/volunteers/register` | Register as volunteer |
| GET | `/api/volunteers` | Get all volunteers |
| GET | `/api/volunteers/:id` | Get single volunteer |
| GET | `/api/volunteers/stats/leaderboard` | Get leaderboard |

### AI Triage
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/triage/assess` | Get AI triage assessment |
| GET | `/api/triage/history` | Get user's triage history |
| GET | `/api/triage/stats` | Get triage statistics |

### Donations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/donations` | Create donation |
| GET | `/api/donations` | Get all donations |
| GET | `/api/donations/stats` | Get donation stats |
| POST | `/api/donations/sponsor` | Create sponsorship |

### Adoptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/adoptions/animals` | Add animal for adoption |
| GET | `/api/adoptions/animals` | Get all animals |
| GET | `/api/adoptions/animals/:id` | Get single animal |
| POST | `/api/adoptions/applications` | Submit adoption application |
| PUT | `/api/adoptions/applications/:id/status` | Update application status |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get public statistics |
| GET | `/api/dashboard/recent-reports` | Get recent reports |
| GET | `/api/dashboard/monthly-trends` | Get monthly trends |
| GET | `/api/dashboard/top-ngos` | Get top performing NGOs |

## 🔐 Authentication

The API uses JWT tokens from Supabase Auth. Include the token in requests:

```javascript
fetch('/api/reports', {
    headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN',
        'Content-Type': 'application/json'
    }
});
```

## 🗄️ Database Schema

### Tables
- `profiles` - User profiles (extends Supabase auth)
- `ngos` - Registered NGOs
- `volunteers` - Registered volunteers
- `reports` - Animal rescue reports
- `report_updates` - Report status history
- `triage_results` - AI triage assessments
- `donations` - Donation records
- `sponsorships` - Animal sponsorships
- `adoption_animals` - Animals for adoption
- `adoption_applications` - Adoption applications
- `contact_messages` - Contact form submissions

## 🛡️ Row Level Security

All tables have RLS enabled with appropriate policies:
- Public data is readable by everyone
- Users can only update their own records
- NGOs/Admins have elevated permissions

## 📁 Project Structure

```
backend/
├── config/
│   └── supabase.js      # Supabase client configuration
├── database/
│   └── schema.sql       # Database schema
├── middleware/
│   ├── auth.js          # Authentication middleware
│   └── upload.js        # File upload middleware
├── routes/
│   ├── auth.js          # Auth routes
│   ├── reports.js       # Report routes
│   ├── ngos.js          # NGO routes
│   ├── volunteers.js    # Volunteer routes
│   ├── triage.js        # AI Triage routes
│   ├── donations.js     # Donation routes
│   ├── adoptions.js     # Adoption routes
│   └── dashboard.js     # Dashboard routes
├── uploads/             # Uploaded files
├── .env.example         # Environment variables template
├── package.json         # Dependencies
├── server.js            # Main server file
└── README.md            # This file
```

## 🔧 Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin) |
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | Environment (development/production) |
| `FRONTEND_URL` | Frontend URL for CORS |

## 🚀 Deployment

### Railway / Render / Vercel

1. Push code to GitHub
2. Connect to deployment platform
3. Set environment variables
4. Deploy!

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

## 📞 Support

For issues or questions, contact the JeevRaksha team.

---

Made with ❤️ for animals
