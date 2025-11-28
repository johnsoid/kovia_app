/* eslint-disable max-len */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import { z } from "zod";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

// Zod schema for contact form data (server-side validation)
const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  zip: z.string().regex(/^\d{5}$/, "Must be a 5-digit ZIP code").optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  targetUsername: z.string().min(1, "Target username is required"),
  token: z.string().optional(), // Token is now passed in body
});

export const addContact = onCall(
  { region: "us-central1" },
  async (request: CallableRequest) => {
    // 1. Auth Check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated (anonymous allowed).");
    }

    // 2. Token check (from data)
    const qrSecret = process.env.QR_SECRET;
    // Note: In onCall, data is in request.data, not query/body
    // We expect the token to be passed in the data object now, or we can keep checking query if we really want,
    // but onCall usually passes everything in the body.
    // However, the previous code checked req.query.token.
    // Let's assume for better security we move token to the body payload, OR we check context.
    // For now, let's look for it in the data payload to be consistent with onCall patterns.
    const token = request.data.token;

    // Fallback: If the frontend sends it as a query param, onCall doesn't easily expose raw query params.
    // We will update frontend to send token in body.
    if (!token || token !== qrSecret) {
      throw new HttpsError("permission-denied", "Invalid or missing QR token.");
    }

    // 3. Validate body (request.data is already parsed JSON)
    const data = request.data;

    const validationResult = contactSchema.safeParse(data);
    if (!validationResult.success) {
      // eslint-disable-next-line no-console
      console.error("Validation failed:", validationResult.error.flatten().fieldErrors);
      throw new HttpsError(
        "invalid-argument",
        "Invalid contact data provided.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const { targetUsername, ...contactData } = validationResult.data;
    try {
      // 4. Firestore lookup and write
      const performersRef = db.collection("performers");
      const q = performersRef.where("userName", "==", targetUsername).limit(1);
      const performerSnapshot = await q.get();

      if (performerSnapshot.empty) {
        // eslint-disable-next-line no-console
        console.error(`Performer with username '${targetUsername}' not found.`);
        throw new HttpsError("not-found", `Performer '${targetUsername}' not found.`);
      }

      const performerDoc = performerSnapshot.docs[0];
      const performerUid = performerDoc.id;
      const performerProfileData = performerDoc.data();

      const contactToSave = {
        ...contactData,
        performerUid,
        capturedAt: FieldValue.serverTimestamp(),
        // Optional: save the auth uid to track who submitted it
        submittedBy: request.auth.uid,
      };

      const contactRef = await db
        .collection("performers")
        .doc(performerUid)
        .collection("contacts")
        .add(contactToSave);
      // eslint-disable-next-line no-console
      console.log("Contact added successfully with ID:", contactRef.id, "for performer UID:", performerUid);

      return {
        success: true,
        contactId: contactRef.id,
        redirectUrl: performerProfileData.defaultRedirectUrl || null,
      };
    } catch (error) {
      // 5. Error handling
      // eslint-disable-next-line no-console
      console.error("Error processing contact submission:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Internal Server Error");
    }
  }
);
