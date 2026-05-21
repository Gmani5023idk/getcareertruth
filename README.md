# GetCareerTruth

Career advice you can actually trust. A platform connecting students with verified employees for honest 15-minute career conversations.

## 🚀 Tech Stack

- **Framework:** Next.js 15 (App Router) with TypeScript
- **Styling:** Tailwind CSS v4 with CSS Variables
- **Database:** PostgreSQL via Prisma ORM
- **Authentication:** NextAuth.js v5 (Google OAuth + Credentials)
- **State Management:** Zustand + TanStack Query
- **Animations:** Framer Motion
- **Payments:** Razorpay
- **Real-time Chat:** Pusher
- **Email:** Resend
- **File Uploads:** Cloudinary

## 📋 Prerequisites

- Node.js 20+ 
- PostgreSQL database
- Accounts for:
  - Razorpay (payments)
  - Cloudinary (file uploads)
  - Pusher (real-time chat)
  - Resend (email)
  - Google OAuth (authentication)

## 🛠️ Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd getcareertruth
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/getcareertruth

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Razorpay
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Pusher
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-key
PUSHER_SECRET=your-secret
PUSHER_CLUSTER=ap2
NEXT_PUBLIC_PUSHER_KEY=your-key
NEXT_PUBLIC_PUSHER_CLUSTER=ap2

# Resend
RESEND_API_KEY=your-api-key
RESEND_FROM_EMAIL=noreply@getcareertruth.in

# Platform
PLATFORM_FEE_PERCENT=15
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
getcareertruth/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public pages (SSG/ISR)
│   ├── (auth)/            # Auth pages (CSR)
│   ├── (dashboard)/       # Dashboard pages (SSR)
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── layout/           # Layout components
│   └── ...
├── lib/                   # Utility functions
├── prisma/               # Database schema
├── public/               # Static assets
└── shared/              # Shared schemas
```

## 🎨 Design System

The platform uses the "Calm Clarity" design system with:

- **Primary Color:** Teal (#00ACC1) - for verified states, CTAs
- **Secondary Color:** Royal Blue (#1565C0) - for accents
- **Accent Color:** Amber (#F59E0B) - for urgency
- **Typography:** DM Serif Display (headings) + DM Sans (body)
- **Shadows:** Soft, layered shadows for depth
- **Radius:** 12px-24px rounded corners

## 🔒 Security

- NextAuth.js for authentication with httpOnly cookies
- CSRF protection built-in
- Rate limiting on API endpoints
- Input validation with Zod
- File upload restrictions (MIME type + size)
- Cloudinary private storage for sensitive documents
- Razorpay signature verification

## 📝 License

[Your License Here]

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📧 Support

For support, email support@getcareertruth.in or open an issue on GitHub.
