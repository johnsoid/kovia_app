# Kovia Connect

Kovia Connect is a QR contact-capture application designed for live entertainers. It allows performers to easily collect contact information from their audience members via a personalized QR code linked to a simple capture form.

## Features

*   **Authentication:** Secure sign-up and login for performers using Firebase Authentication (Email/Password).
*   **Performer Dashboard:** Manage profile information (name, username, social links, default redirect URL) and view a table of captured contacts.
*   **QR Code Generation:** Automatically generates a unique QR code linking to the performer's contact capture page.
*   **Contact Capture Page:** A public-facing page (accessed via `/c/[username]`) where audience members can submit their name, email, phone (optional), and ZIP code (optional).
*   **Data Storage:** Performer profiles and captured contacts are stored securely in Firestore.
*   **Admin Dashboard (Basic):** A simple view for administrators to see registered users (placeholder, requires backend logic for full user listing).
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
    *   Copy the example environment file:
        ```bash
        cp .env.example .env.local
        ```
    *   Open `.env.local` and paste your Firebase configuration values from the previous step. Ensure the variable names match those in `src/lib/firebase.ts` (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`).
    *   **Important:** `.env.local` is included in `.gitignore` to prevent committing your secret keys.
    *   **Crucial:** After editing `.env.local`, **you must restart your Next.js development server** for the changes to take effect (stop the `npm run dev` process and run it again).

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
This command builds the application for production usage. Ensure environment variables are correctly configured in your production environment.

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
    *   `admin/dashboard/`: System admin dashboard.
    *   `performer/dashboard/`: Performer dashboard.
    *   `c/[username]/`: Public contact capture page.
*   `src/components/`: Reusable React components.
    *   `ui/`: ShadCN UI components.
*   `src/hooks/`: Custom React hooks (e.g., `use-auth`).
*   `src/lib/`: Utility functions and Firebase configuration (`firebase.ts`).
*   `src/services/`: Client-side data fetching logic (e.g., `zip-code.ts`).
*   `public/`: Static assets.
```