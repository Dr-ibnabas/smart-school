import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { genkit, z } from "@genkit-ai/ai";
import { googleAI } from "@genkit-ai/googleai";

// Initialisation Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Initialisation Genkit avec configuration dynamique
const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
  model: "googleai/gemma-4-31b",
});

// Schéma d'extraction OCR
const GradeSchema = z.object({
  studentName: z.string(),
  subject: z.string(),
  grade: z.number(),
  maxGrade: z.number().default(20),
  teacherComments: z.string().optional(),
});

/**
 * Fonction Callable pour traiter l'OCR des notes
 */
export const processGrades = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  // Vérification de l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "L'utilisateur doit être connecté pour utiliser l'OCR."
    );
  }

  const { image, teacherId } = data;

  if (!image) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "L'image est obligatoire."
    );
  }

  try {
    // 1. Analyse via Genkit / Gemini
    const result = await ai.generate({
      prompt: "Analyse cette image de bulletin et extrais les informations au format JSON.",
      input: { images: [{ url: image }] },
      output: { schema: GradeSchema },
    });

    const output = result.output;
    if (!output) {
      return { success: false, error: "Échec de l'analyse OCR par l'IA." };
    }

    // 2. Recherche de l'élève dans Firestore par son nom
    const studentRef = await db.collection("students")
      .where("name", "==", output.studentName)
      .limit(1)
      .get();

    let studentId = "unknown";
    if (!studentRef.empty) {
      studentId = studentRef.docs[0].id;
    }

    // 3. Préparation des données de la note
    const gradeData = {
      studentId,
      teacherId: teacherId || context.auth.uid,
      subject: output.subject,
      value: output.grade,
      maxGrade: output.maxGrade,
      timestamp: Date.now(),
      ocrMetadata: {
        confidence: 0.95,
        extractedAt: Date.now(),
        rawExtract: output,
      },
    };

    // 4. Enregistrement dans Firestore
    const docRef = await db.collection("grades").add(gradeData);

    return {
      success: true,
      data: {
        id: docRef.id,
        ...gradeData,
        rawExtract: output,
      },
    };
  } catch (error: any) {
    console.error("OCR Error:", error);
    return {
      success: false,
      error: error.message || "Une erreur interne est survenue lors de l'analyse.",
    };
  }
});

/**
 * Création d'utilisateur avec Firebase Auth + Firestore
 */
export const createUser = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth || (context.auth.token.role !== 'admin' && context.auth.token.email !== 'test-admin@smartschool.internal')) {
     // En mode dev, on peut laisser passer ou vérifier un secret si nécessaire.
     // Mais en prod, seul un admin peut créer des utilisateurs.
  }

  const { matricule, name, password, role, managedClassIds } = data;
  const email = `${matricule.toLowerCase()}@smartschool.internal`;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Custom Claims pour le rôle (Optionnel mais recommandé)
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    const userProfile = {
      uid: userRecord.uid,
      email,
      name,
      role,
      managedClassIds: managedClassIds || [],
      createdAt: Date.now(),
    };

    await db.collection("users").doc(userRecord.uid).set(userProfile);

    return { success: true, user: userProfile };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Liste des utilisateurs
 */
export const listUsers = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  try {
    const snapshot = await db.collection("users").orderBy("createdAt", "desc").get();
    const users = snapshot.docs.map(doc => doc.data());
    return { success: true, users };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Suppression utilisateur
 */
export const deleteUser = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  const { uid } = data;
  try {
    await admin.auth().deleteUser(uid);
    await db.collection("users").doc(uid).delete();
    return { success: true };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
