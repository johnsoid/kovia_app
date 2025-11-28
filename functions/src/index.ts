/* eslint-disable max-len */
import {onRequest, HttpsError} from "firebase-functions/v2/https";
import {Request, Response} from "express";
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
});

export const addContact = onRequest(
  {region: "us-central1", invoker: "public"},
  async (req: Request, res: Response) => {
    // 1. Only allow POST
    if (req.method !== "POST") {
      res.set("Allow", "POST");
      res.status(405).json({error: "Method Not Allowed"});
      return;
    }

    // 2. Token check (from query only)
    const qrSecret = process.env.QR_SECRET;
    const token = req.query.token;
    if (!token || token !== qrSecret) {
      res.status(403).json({error: "Forbidden"});
      return;
    }

    // 3. Parse and validate body
    let data: unknown = req.body;
    if (!data || typeof data !== "object") {
      try {
        data = JSON.parse(req.body as string);
      } catch {
        res.status(400).json({error: "Invalid JSON body"});
        return;
      }
    }
    const validationResult = contactSchema.safeParse(data);
    if (!validationResult.success) {
      // eslint-disable-next-line no-console
      console.error("Validation failed:", validationResult.error.flatten().fieldErrors);
      res.status(400).json({
        error: "Invalid contact data provided.",
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const {targetUsername, ...contactData} = validationResult.data;
    try {
      // 4. Firestore lookup and write (unchanged logic)
      const performersRef = db.collection("performers");
      const q = performersRef.where("userName", "==", targetUsername).limit(1);
      const performerSnapshot = await q.get();

      if (performerSnapshot.empty) {
        // eslint-disable-next-line no-console
        console.error(`Performer with username '${targetUsername}' not found.`);
        res.status(404).json({error: `Performer '${targetUsername}' not found.`});
        return;
      }

      const performerDoc = performerSnapshot.docs[0];
      const performerUid = performerDoc.id;
      const performerProfileData = performerDoc.data();

      const contactToSave = {
        ...contactData,
        performerUid,
        capturedAt: FieldValue.serverTimestamp(),
      };

      const contactRef = await db
        .collection("performers")
        .doc(performerUid)
        .collection("contacts")
        .add(contactToSave);
      // eslint-disable-next-line no-console
      console.log("Contact added successfully with ID:", contactRef.id, "for performer UID:", performerUid);

      res.status(200).json({
        success: true,
        contactId: contactRef.id,
        redirectUrl: performerProfileData.defaultRedirectUrl || null,
      });
      return;
    } catch (error) {
      // 5. Error handling
      // eslint-disable-next-line no-console
      console.error("Error processing contact submission:", error);
      if (error instanceof HttpsError && error.code === "not-found") {
        res.status(404).json({error: error.message});
        return;
      }
      res.status(500).json({error: "Internal Server Error"});
      return;
    }
  }
);
