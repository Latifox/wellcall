# WellCall.io - Multi-Tenant SaaS Dashboard

A modern multi-tenant SaaS dashboard for Retell AI call analytics and management, built with Next.js 14, TypeScript, Supabase, and TailwindCSS.

## Features

- 🔐 **Multi-tenant Architecture** - Secure client isolation with Row Level Security (RLS)
- 👥 **Role-based Access Control** - Admin and client roles with different permissions
- 📊 **Real-time Analytics** - Call volume, sentiment analysis, and performance metrics
- 🎯 **Retell AI Integration** - Secure API integration via Supabase Edge Functions
- 📱 **Responsive Design** - Modern UI with shadcn/ui components
- 🔒 **Secure Authentication** - Supabase Auth with session management

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **UI Components**: shadcn/ui, Recharts for analytics
- **Authentication**: Supabase Auth with RLS policies
- **API Integration**: Supabase Edge Functions for secure Retell API calls

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Retell AI account (for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wellcall-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

4. **Set up Supabase**
   
   Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```
   
   Initialize and start local development:
   ```bash
   supabase init
   supabase start
   ```
   
   Run migrations:
   ```bash
   supabase db reset
   ```

5. **Deploy Edge Functions**
   ```bash
   supabase functions deploy get-client-analytics
   supabase functions deploy get-admin-analytics
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Tables

- **clients** - Client organizations with Retell workspace details
- **users** - User accounts linked to auth.users with role-based access
- **usage_cache** - Cached analytics data for performance

### Row Level Security (RLS)

- Clients can only access their own data
- Admins can access all client data
- Automatic user creation on signup via triggers

## Demo Credentials

For testing purposes, you can use these demo credentials:

- **Admin**: admin@wellcall.io / admin123
- **Client**: client@acme.com / client123

## Project Structure

```
├── app/                    # Next.js 14 App Router
│   ├── dashboard/         # Dashboard pages
│   ├── login/            # Authentication
│   └── page.tsx          # Landing page
├── components/
│   ├── ui/               # shadcn/ui components
│   └── dashboard/        # Dashboard-specific components
├── lib/
│   ├── supabase/         # Supabase client configuration
│   └── types/            # TypeScript type definitions
├── supabase/
│   ├── functions/        # Edge Functions
│   └── migrations/       # Database migrations
└── middleware.ts         # Route protection
```

## Key Features

### Multi-tenant Dashboard

- **Client View**: Personal analytics, call history, sentiment analysis
- **Admin View**: All clients overview, revenue tracking, system-wide metrics

### Analytics Components

- **MetricCard**: KPI display with trend indicators
- **CallsChart**: Line chart for daily call volume
- **SentimentChart**: Pie chart for sentiment distribution
- **RecentCallsTable**: Detailed call history with status and sentiment

### Security

- Row Level Security (RLS) policies for data isolation
- Encrypted API key storage
- Secure Edge Functions for external API calls
- Session-based authentication with middleware protection

## Deployment

### Supabase

1. Create a new Supabase project
2. Run migrations: `supabase db push`
3. Deploy Edge Functions: `supabase functions deploy`

### Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## API Integration

The dashboard integrates with Retell AI through secure Edge Functions:

- `get-client-analytics`: Fetches client-specific call data
- `get-admin-analytics`: Aggregates data across all clients

Edge Functions handle API key management and rate limiting, keeping sensitive credentials secure.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact: support@wellcall.io

---

Built with ❤️ using Next.js 14, Supabase, and modern web technologies.
