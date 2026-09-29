# Medicaps University Admissions Portal

An online admissions portal where students sign up, apply to programs, upload documents and track their application, with a full HubSpot CRM pipeline and an AI admissions assistant.

**Live:** https://medicaps-admissions-portal.vercel.app

## Features

- **Email OTP login** (6-digit code, no passwords)
- **Guided application form** with a live progress sidebar: Personal Info → Program of Study → Employment History (postgraduate only) → Academic History → Documents
- **Review page** with edit links and **Download PDF**
- **Dashboard** with multiple applications, progress, "Last saved" and admission decision (Under Review / Accepted / Not Accepted)
- **AI chatbot** (Groq) with suggested follow-up questions
- **Cookie consent banner** with HubSpot visitor tracking

## HubSpot CRM Pipeline

- Contact created after OTP verification
- One deal per application, moving through stages automatically:
  `Program Selected → Academic Info Done → Documents Pending → Submitted → Under Review → Accepted / Rejected`
- Decisions made in HubSpot sync back to the student's dashboard
- Chatbot questions from logged-in students are saved as notes on their contact

## Tech Stack

| Part | Technology |
|---|---|
| Frontend | Next.js (App Router), Tailwind CSS, lucide-react |
| Backend | Node.js, Express |
| Database, Auth, Storage | Supabase (Postgres with Row Level Security) |
| CRM | HubSpot (free) |
| AI | Groq |
| Email | SendGrid via Supabase SMTP |
| Hosting | Vercel (frontend), Render (backend) |

## CI/CD

GitHub Actions runs on every push and pull request:

1. Frontend production build
2. Backend syntax check and **25 automated tests**
3. Dependency vulnerability scan (`npm audit`)
4. Secrets scan (Gitleaks)
5. **Deploy** to Render and Vercel via deploy hooks, only if every check passes

## Security

- Row Level Security: students can only access their own data
- Database triggers block students from changing protected fields (decision, status, CRM links) and lock applications after submission
- Database constraints: one draft at a time, no duplicate course applications
- Uploads limited to PDF/JPG/PNG, max 5 MB, private storage
- Protected API routes, CORS allowlist, request size limits, chatbot rate limiting and prompt-injection filtering
- Security headers on frontend and backend, timeouts, global error handling, startup env check

## Run Locally

```bash
# Backend (backend/.env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HUBSPOT_ACCESS_TOKEN, GROQ_API_KEY, FRONTEND_URL)
cd backend && npm install && npm start

# Frontend (frontend/.env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_HUBSPOT_ID)
cd frontend && npm install && npm run dev

# Tests
cd backend && node --test "tests/*.test.js"
```

## Planned Improvements

- Automated reminders and HubSpot follow-up tasks for stalled applicants
- Full test suite, including database security tests against a test Supabase project
- Strict Content Security Policy tuned for HubSpot
- Custom email domain (OTP emails currently may land in spam)