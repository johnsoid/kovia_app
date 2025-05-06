# **App Name**: Kovia Connect

## Core Features:

- Auth Landing Page: Sign up / log in via Firebase Auth (email + password).
- System Admin Dashboard: Display table of all registered users with basic info.
- Performer Admin Page: View and edit performer profile + table of captured contacts (Firestore). All fields editable via UI.
- QR Code Generation: Performers generate QR codes linking to their personalized contact capture page.
- Contact Capture Page: Public form (name, email, phone, ZIP, state) accessed via QR. Saves to Firestore under the associated performer.
- Dynamic Data Fetching: Lookup performer data via unique username to render profile + generate QR.

## Style Guidelines:

- Primary: Dark blue `#1A202C` – professional, clean base
- Secondary: Light gray `#EDF2F7` – subtle backgrounds, soft contrast
- Accent: Teal `#4DC0B5` – highlight CTAs and key interactions
- Typography: Clean sans-serif (e.g., Inter or Roboto) for readability
- Layout: Mobile-first, single-column with strong visual hierarchy
- Icons: Use standard, recognizable social icons (SVG preferred)