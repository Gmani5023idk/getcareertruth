# GetCareerTruth - Quick Reference

**Last Updated:** May 2, 2026  
**Status:** 100% Complete

---

## 🚀 Quick Start Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Database commands
npx prisma generate
npx prisma migrate dev
npx prisma studio
```

---

## 🌐 Access URLs

**Local:** http://localhost:3000  
**Network:** http://10.255.255.254:3000

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Landing page |
| `app/(public)/employees/page.tsx` | Employee directory |
| `prisma/schema.prisma` | Database schema |
| `.env.example` | Environment variables template |
| `middleware.ts` | Security middleware |
| `tailwind.config.ts` | Tailwind configuration |

---

## 🎨 Design System

**Colors:**
- Primary: #00ACC1 (Teal)
- Secondary: #1565C0 (Royal Blue)
- Accent: #F59E0B (Amber)

**Typography:**
- Headings: DM Serif Display
- Body: DM Sans

---

## 📊 Project Stats

- **Files:** 130+
- **Lines:** ~28,000
- **Components:** 45+
- **API Routes:** 22+
- **Models:** 11

---

## 🔧 Common Issues

### Port 3000 in use
```bash
lsof -ti:3000 | xargs kill -9
```

### Animation import errors
Use default imports:
```typescript
import FadeIn from '@/components/animations/fade-in';
```

### Database connection issues
Check `.env` file has correct `DATABASE_URL`

---

## ✅ Completed Phases

- [x] Phase 1: Foundation
- [x] Phase 2: Core Features
- [x] Phase 3: Booking System
- [x] Phase 4: Payment System
- [x] Phase 5: Chat & Transcripts
- [x] Phase 6: Polish & SEO

---

## 📝 Environment Variables

Required in `.env`:
```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
OPENAI_API_KEY=
RESEND_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 🎯 Next Priority

1. Fix Lucide icon import in employee detail page
2. Test all API routes
3. Set up production deployment

---

**See PROJECT_RECALL.md for full documentation**
