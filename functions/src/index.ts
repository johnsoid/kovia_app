/* eslint-disable max-len */
import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";
import {z} from "zod";

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
  {region: "us-central1"},
  async (request: CallableRequest) => {
    // 1. Auth Check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated (anonymous allowed).");
    }

    // 2. Token check (from data)
    // We now expect a unique token per performer, validated AFTER fetching the performer profile.
    // We still check if it exists here to fail fast if missing.
    const token = request.data.token;

    if (!token) {
      throw new HttpsError("permission-denied", "Missing QR token.");
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

    const {targetUsername, ...contactData} = validationResult.data;
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

      // 4b. Validate Token
      // The token provided in the request must match the one stored in the performer's profile.
      if (performerProfileData.contactToken !== token) {
        // eslint-disable-next-line no-console
        console.error(`Invalid token provided for performer '${targetUsername}'.`);
        throw new HttpsError("permission-denied", "Invalid QR token.");
      }

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
