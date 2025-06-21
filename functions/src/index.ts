import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { z } from "zod";

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// Zod schema for contact form data (server-side validation)
const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  zip: z.string().regex(/^\d{5}$/, "Must be a 5-digit ZIP code").optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  targetUsername: z.string().min(1, "Target username is required"),
});

type ContactFunctionPayload = z.infer<typeof contactSchema>;

export const addContact = functions.https.onCall(async (request: functions.https.CallableRequest<ContactFunctionPayload>) => {
  const data = request.data;
  // const context = request.context; // Available if needed

  const validationResult = contactSchema.safeParse(data);
  if (!validationResult.success) {
    console.error("Validation failed:", validationResult.error.flatten().fieldErrors);
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid contact data provided.",
      validationResult.error.flatten().fieldErrors
    );
  }

  const { targetUsername, ...contactData } = validationResult.data;

  try {
    const performersRef = db.collection("performers");
    const q = performersRef.where("userName", "==", targetUsername).limit(1);
    const performerSnapshot = await q.get();

    if (performerSnapshot.empty) {
      console.error(`Performer with username "${targetUsername}" not found.`);
      throw new functions.https.HttpsError(
        "not-found",
        `Performer "${targetUsername}" not found.`
      );
    }

    const performerDoc = performerSnapshot.docs[0];
    const performerUid = performerDoc.id;
    const performerProfileData = performerDoc.data();

    const contactToSave = {
      ...contactData,
      performerUid: performerUid,
      capturedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const contactRef = await db.collection("contacts").add(contactToSave);
    console.log("Contact added successfully with ID:", contactRef.id, "for performer UID:", performerUid);

    return {
      success: true,
      message: "Contact information submitted successfully!",
      contactId: contactRef.id,
      redirectUrl: performerProfileData.defaultRedirectUrl || null,
    };
  } catch (error) {
    console.error("Error processing contact submission:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      "An internal error occurred while saving your contact information.",
      (process.env.NODE_ENV === 'development' && error instanceof Error) ? { originalMessage: error.message } : undefined
    );
  }
});
