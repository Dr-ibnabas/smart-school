import { genkit, z } from '@genkit-ai/ai';
import { googleAI } from '@genkit-ai/googleai';
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import admin from 'firebase-admin';
import { GradeEntry, UserProfile, UserRole } from './types.js';

dotenv.config();

// Initialisation de Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    // Note: Pour Vercel, on utilise souvent les variables d'env individuelles
    // ou un service account JSON stocké en base64 dans une variable d'env.
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// Correction Genkit SDK 0.5.x
const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
  model: 'googleai/gemini-1.5-flash',
});

// Schéma d'extraction OCR
const GradeSchema = z.object({
  studentName: z.string(),
  subject: z.string(),
  grade: z.number(),
  maxGrade: z.number().default(20),
  teacherComments: z.string().optional(),
});

const app = express();

// Configuration CORS pour autoriser le frontend
app.use(cors({
    origin: '*', // En prod, on pourra restreindre au domaine Vercel
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Points d'entrée de l'API (Migration de Express vers Vercel Serverless)

app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Smart School API is running on Vercel' });
});

// 1. Créer un utilisateur (Admin/Prof) via Matricule
app.post('/api/admin/users', async (req: Request, res: Response) => {
  try {
    const { matricule, name, password, role, managedClassIds } = req.body;
    
    if (!matricule || !password || !role) {
      return res.status(400).json({ error: "Matricule, MDP et Rôle sont obligatoires" });
    }

    const email = `${matricule.toLowerCase()}@smartschool.internal`;

    // Création dans Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Création du profil dans Firestore
    const userProfile: UserProfile = {
      uid: userRecord.uid,
      email,
      name,
      role: role as UserRole,
      managedClassIds: managedClassIds || [],
      createdAt: Date.now(),
    };

    await db.collection('users').doc(userRecord.uid).set(userProfile);
    res.status(201).json(userProfile);
  } catch (error: any) {
    console.error("Erreur création utilisateur:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Lister tous les utilisateurs
app.get('/api/admin/users', async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    const users = snapshot.docs.map(doc => doc.data());
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Supprimer un utilisateur
app.delete('/api/admin/users/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    await admin.auth().deleteUser(uid);
    await db.collection('users').doc(uid).delete();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. OCR & Sauvegarde des notes
app.post('/api/analyze-and-save', async (req: Request, res: Response) => {
  try {
    const { image, teacherId } = req.body;
    
    const result = await ai.generate({
      prompt: `Analyse cette image de bulletin et extrais les informations au format JSON.`,
      input: { images: [{ url: image }] },
      output: { schema: GradeSchema },
    });

    const output = result.output;
    if (!output) throw new Error('Échec de l\'analyse OCR');

    const studentRef = await db.collection('students')
      .where('name', '==', output.studentName)
      .limit(1)
      .get();

    let studentId = "unknown";
    if (!studentRef.empty) {
      studentId = studentRef.docs[0].id;
    }

    const gradeData: GradeEntry = {
      studentId,
      teacherId,
      subject: output.subject,
      value: output.grade,
      maxGrade: output.maxGrade,
      timestamp: Date.now(),
      ocrMetadata: {
        confidence: 0.95,
        extractedAt: Date.now(),
      }
    };

    const docRef = await db.collection('grades').add(gradeData);
    res.json({ id: docRef.id, ...gradeData, rawExtract: output });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
