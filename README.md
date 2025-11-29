# Kovia App

[![Production Status](https://img.shields.io/badge/status-live-brightgreen)](https://kovia-app-v1--kovia-connect.us-central1.hosted.app)

Kovia App is a modern, full-stack web platform designed for live entertainers (performers, musicians, etc.) to easily collect fan contact information at events using personalized QR codes. The platform is now **live and production-ready**, hosted on **Firebase App Hosting** and continuously deployed via **GitHub Actions**.

**Live App URL:** [https://kovia-app-v1--kovia-connect.us-central1.hosted.app](https://kovia-app-v1--kovia-connect.us-central1.hosted.app)

---

## Core Features

- **Production Hosting:** Live on Firebase App Hosting, with CI/CD via GitHub Actions.
- **Environment Variables:** Securely managed via Firebase App Hosting Secret Manager.
- **Firebase Authentication:**
    - **Email/Password:** Secure login for performers.
    - **Anonymous Auth:** Secure, frictionless session management for public contact submission.
- **Performer Dashboard:** Manage profile, view contacts, and **Reset QR Code** (Token Rotation).
- **Secure QR Codes:** Unique, revocable tokens (`?token=UUID`) for each performer.
- **Public Contact Capture Page:** `/c/[username]` route. Securely submits data via Cloud Functions.
- **Firestore Data Storage:** Performer profiles and captured contacts are stored in Firebase Cloud Firestore.
- **Admin Dashboard:** Basic placeholder for admin user listing.
- **Contact Data Details:** Contact info is normalized (first/last name, email, phone, ZIP, state).
- **Post-Submission Redirect:** Performers can configure a redirect URL after fans submit their info.

---

## Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn UI, Zod (schema validation), React Hook Form (form management)
- **Backend/Data:** Firebase (Authentication, Firestore, Hosting).
- **Cloud Functions:** `addContact` (Gen 2) handles secure contact submission.
    - **Security:** Uses Firebase Anonymous Authentication + Unique Performer Tokens (`contactToken`).
    - **Access Control:** Publicly invokable (`allUsers`) but logically restricted to requests with valid tokens.
- **Development:** npm/yarn, Git

---
*   **Contact Capture Page:** A public-facing page (accessed via `/c/[username]`) where audience members can submit their name, email, phone (optional), and ZIP code (optional). **Working in production.**
*   **Data Storage:** Performer profiles and captured contacts are stored securely in Firestore.
*   **Admin Dashboard (Basic):** A simple view for administrators to see registered users (**placeholder only**; requires backend logic for full user listing).
*   **ZIP Code Lookup:** Automatically determines the state based on the entered ZIP code on the capture form.

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   npm or yarn
*   Firebase Account and Project

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd kovia-connect
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Firebase:**
    *   Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
    *   Enable Firestore (Native mode), Authentication (Email/Password), and Hosting.
    *   In your Firebase project settings, go to the "General" tab.
    *   Under "Your apps", click the Web (`</>`) icon to register a new web app.
    *   Copy the `firebaseConfig` object provided.

4.  **Configure Environment Variables:**
    *   **Development:**
        *   Copy the example environment file:
            ```bash
            cp .env.example .env.local
            ```
        *   Open `.env.local` and paste your Firebase configuration values from the previous step. Ensure the variable names match those in `src/lib/firebase.ts` (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`).
        *   `.env.local` is included in `.gitignore` to prevent committing your secret keys.
        *   After editing `.env.local`, **restart your Next.js development server** for changes to take effect.
    *   **Production:**
        *   **Environment variables are now managed via Firebase App Hosting Secret Manager.**
        *   You do **not** need to deploy a `.env.local` file. Secrets are securely injected into the app at build and runtime via Firebase Hosting.

5.  **(Optional) Seed Initial Data:**
    *   You can manually add the initial performer data to your Firestore database as described in the original prompt (for user `louisJohnson`). Go to your Firestore console, create the `performers` collection, add a document with the ID `louisJohnson`, and populate the fields. Alternatively, adapt the dashboard creation logic to handle initial data setup if needed.

### Running Locally

1.  **Start the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    This will start the Next.js development server, typically on `http://localhost:9002`. Check your terminal and browser console for any Firebase configuration errors.

### Running in Firebase Studio (if applicable)

The `dev` script is configured to run the application within the Firebase Studio environment. The Studio environment typically handles setting the `PORT` and `HOST` environment variables.

1.  Ensure your Firebase project is linked to your Studio workspace.
2.  Use the Studio interface to run the development server. It should execute the `npm run dev` (or `yarn dev`) script.
3.  Access the preview URL provided by Firebase Studio.

### Building for Production

```bash
npm run build
# or
yarn build
```
This command builds the application for production usage.

**Production Deployment:**
- The app is deployed to Firebase App Hosting via GitHub Actions on every push to the `main` branch.
- Environment variables are injected via Firebase Secret Manager (not `.env.local`).
- The live app is available at: [https://kovia-app-v1--kovia-connect.us-central1.hosted.app](https://kovia-app-v1--kovia-connect.us-central1.hosted.app)

### Linting

```bash
npm run lint
# or
yarn lint
```
This command runs the Next.js linter to check code quality.

## Project Structure (Key Directories)

*   `src/app/`: Main application routes (App Router).
    *   `auth/`: Authentication page.
    *   `admin/dashboard/`: System admin dashboard (**placeholder only**)
    *   `performer/dashboard/`: Performer dashboard (**working in production**)
    *   `c/[username]/`: Public contact capture page (**working in production**)
*   `src/components/`: Reusable React components.
    *   `ui/`: ShadCN UI components.
*   `src/hooks/`: Custom React hooks (e.g., `use-auth`).
*   `src/lib/`: Utility functions and Firebase configuration (`firebase.ts`).
*   `src/services/`: Client-side data fetching logic (e.g., `zip-code.ts`).
*   `public/`: Static assets.

---

## Versioning

This project is now versioned and tagged starting with `v1.0`.
- Releases are tracked in [CHANGELOG.md](./CHANGELOG.md).
- Production deployments are tagged and released via GitHub.
```