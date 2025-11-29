# Changelog

## v1.0 – Initial MVP Launch (2025-05-08)

- Email/password login and registration
- Contact capture via `/c/[username]` route
- QR code generation for each performer
- Firestore storage of performer profiles and captured contacts
- Public form validation and redirect to performer’s social profile
- Admin dashboard placeholder
- Basic ZIP code → state auto-mapping
- Environment variables migrated to Secret Manager for production
- Firebase App Hosting CI/CD connected to GitHub main branch

## v1.1 – Security Hardening & Anonymous Auth (2025-11-29)

- **Cloud Function Security:** Implemented `addContact` as a Callable Function (`onCall`) with `allUsers` IAM access.
- **Anonymous Authentication:** Frontend now signs in users anonymously before contact submission to secure the Cloud Function invocation.
- **Unique Performer Tokens:**
    - Replaced shared `QR_SECRET` with unique, per-performer `contactToken` stored in Firestore.
    - Tokens are included in the QR code URL (`?token=...`).
    - Added **"Reset QR Code"** functionality in Dashboard to rotate tokens and invalidate old links.
- **Dashboard Improvements:** Auto-generates tokens for existing profiles; added confirmation dialog for token reset.
- **Bug Fixes:** Resolved IAM permission issues and CORS errors during deployment.
