# GetCareerTruth Dark Theme Implementation Guide

## Design System Overview

This document outlines the implementation of the premium dark SaaS aesthetic for GetCareerTruth, inspired by betterstack.com.

## Color Palette

- Primary Dark Blue: #1A5FB4
- Accent Teal/Cyan: #00B4D8
- Deep Navy (background base): #0A0F1E
- Surface cards: #0F1629
- Border/divider: #1E2A45
- Text primary: #F0F4FF
- Text secondary: #8A9BBE

## Typography

- Font: Inter (imported from Google Fonts)
- Hero headline: 72px, weight 800, tight letter-spacing (-0.03em), line-height 1.05
- Section labels: 11px, weight 600, letter-spacing 0.2em, uppercase
- Section headings: 48px, weight 700
- Body text: 17px, weight 400, line-height 1.7
- Nav links: 14px, weight 500

## Implementation Files

The dark theme implementation includes:

1. `globals-dark.css` - Custom CSS variables and styles
2. `layout-dark.tsx` - Root layout with dark theme
3. `page-dark.tsx` - Main landing page with dark theme
4. `dark-design/page.tsx` - Complete dark theme implementation

## Key Components

1. **Navbar** - Sticky glassmorphism effect with backdrop blur
2. **Hero Section** - Two-column layout with floating employee cards
3. **Problem Section** - 3-column card grid with gradient icon containers
4. **How It Works Section** - Three steps to career clarity
5. **Footer** - Clean, minimal footer with site links

## Design Principles Implemented

- All backgrounds are dark (#0A0F1E)
- No stock gradients or generic SaaS patterns
- CSS Grid used throughout
- Cards with border glow effects instead of drop shadows
- Subtle ambient radial glows for visual interest
- Consistent 120px section padding
- Mobile responsive design
- Linear, Vercel, BetterStack-inspired density and precision

## Brand Consistency

The design maintains all existing copy and content while transforming only the visual presentation to match the premium dark SaaS aesthetic.