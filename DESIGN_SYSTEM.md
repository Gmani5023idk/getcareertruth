# GetCareerTruth Dark Theme Design System

## Overview

This document describes the complete dark theme implementation for the GetCareerTruth website, following the design principles of premium SaaS products like Linear, Vercel, and BetterStack.

## Color System

### Primary Colors
- Primary Dark Blue: #1A5FB4
- Accent Teal/Cyan: #00B4D8
- Deep Navy: #0A0F1E (background base)
- Surface cards: #0F1629
- Border/Divider: #1E2A45
- Text Primary: #F0F4FF
- Text Secondary: #8A9BBE

## Typography

### Font Family
- Primary: Inter, with specific OpenType features enabled
- Monospace: For code elements

### Hierarchy
- Hero headline: 72px, weight 800, letter-spacing -0.03em
- Section headings: 48px, weight 700
- Body text: 17px, weight 400
- Navigation: 14px, weight 500

## Layout & Spacing

### Grid System
- Max content width: 1200px
- Section padding: 120px top/bottom
- Component spacing follows 8px grid

### Components

#### Cards
- Border radius: 12px
- Background: #0F1629
- Border: 1px solid #1E2A45
- Padding: 24px
- On hover: border color shifts to #1A5FB4 with a subtle box-shadow glow

## Implementation Files

The implementation includes:
1. globals-dark.css - Custom CSS variables and styles
2. layout-dark.tsx - Root layout with dark theme
3. page-dark.tsx - Main landing page with dark theme design
4. dark-design/page.tsx - Complete dark theme implementation

## Design Principles

1. All backgrounds are dark
2. No drop shadows that feel "floaty"
3. No stock rounded blobs, confetti, or gradient mesh backgrounds
4. No generic SaaS patterns
5. Dense, precise, trustworthy, and fast implementation
6. Preserve ALL existing copy and content
7. Only change visual design

## Mobile Responsiveness

- Stack hero to single column below 768px
- Cards stack vertically on mobile
- Nav collapses to hamburger menu and replace logo with logo.png

## Brand Consistency

The design maintains all existing copy and content while transforming only the visual presentation to match the premium dark SaaS aesthetic.