# Product Development Requirements (PDR)
**Project Name:** Kovia
**Owner:** Isaac Johnson  
**Build Lead:** Isaac Johnson + Firebase App Hosting  
**Version:** 1.0 (MVP Launched)  
**Date:** 2025-05-08  

---

## 🧠 Objective

FanConnect (Kovia App) solves a key engagement gap for live entertainers — especially cruise ship performers — by enabling frictionless post-show contact capture via QR code. Fans fill out a short form and are redirected to a performer's social page. Captured data is stored in Firestore, scoped to each performer, with the long-term goal of regional remarketing and multi-artist support.

---

## ✅ What's Been Completed (v1.0)

- 🚀 **App deployed live** via Firebase App Hosting with GitHub integration
- ✅ **QR contact flow** live at `https://kovia-app-v1--kovia-connect.us-central1.hosted.app`
- ✅ Form captures: `firstName`, `lastName`, `email`, `phone`, `zipCode`, `state`, `opt-in`
- ✅ Submissions are stored under correct performer in Firestore
- ✅ Firebase Auth (email/password) for admin login
- ✅ Admin dashboard placeholder live
- ✅ Performer profiles rendered at `/c/[username]`
- ✅ Redirect to prioritized social links post-capture
- ✅ All environment secrets are managed via Secret Manager (App Hosting)
- ✅ Firebase security rules restrict reads/writes by auth and path
- ✅ Error handling for invalid performer ID, email validation, etc.
- ✅ GitHub Actions CI/CD setup for automatic deploys on `main`

---

## 🔄 What Changed From the Original PDR

| Original Plan | Updated Implementation |
|---------------|------------------------|
| `/form?ref=performerId` QR path | Replaced with `/c/[username]` for better UX and routing |
| Admin Dashboard features | Only basic shell is built (v1.0); filtering and tags still pending |
| Email validation API | Deferred from MVP (manual validation only) |
| Shareable post-survey clip | Not in v1.0; will be part of v1.2 or later |
| CSV export | Not implemented yet (planned for admin dashboard upgrade) |

---

## ⏳ Still Outstanding (Future Phases)

### Admin Dashboard (v1.1–v1.2)
- [ ] Filter by tag, date, state
- [ ] Inline notes, tagging (`fan` vs `business`)
- [ ] CSV export by filter
- [ ] Contact edit/delete from UI
- [ ] Manual performer tagging

### CRM Enrichment (v1.2+)
- [ ] Email validation (e.g., NeverBounce)
- [ ] Cruise schedule metadata tagging
- [ ] Geo enrichment: zip → city/region
- [ ] Colorado regional segment view

### SaaS Readiness
- [ ] Multi-user onboarding for additional performers
- [ ] Self-serve profile editor and QR link manager
- [ ] Tiered access roles and permissions
- [ ] Admin impersonation for support

---

## 📂 Attachments

**Deployment URL:**  
https://kovia-app-v1--kovia-connect.us-central1.hosted.app

**Source Repo:**  
Private GitHub (linked via CI/CD)

**Environment Management:**  
All `NEXT_PUBLIC_FIREBASE_*` keys stored in Secret Manager; injected via `apphosting.yaml`.

**Firestore Schema (Current):**

```
/performers/{performerId}
  firstName
  lastName
  userName
  socials[]
  defaultRedirectUrl

/performers/{performerId}/contacts/{contactId}
  firstName
  lastName
  email
  phone
  zipCode
  state
  createdAt
  optedInMarketing
```

---

## 📘 CHANGELOG.md created (v1.0)

See attached changelog file for detailed list of features in this release.

---

**End of PDR v1.0**
