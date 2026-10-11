import admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialisation simple
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'smart-school',
  });
}

const db = admin.firestore();

async function countRecords() {
  const collections = ['users', 'classes', 'subjects', 'students', 'grades', 'absences', 'settings'];
  const results = {};

  try {
    for (const collName of collections) {
      const snap = await db.collection(collName).count().get();
      results[collName] = snap.data().count;
    }
    console.log("=== RESUME DES DONNEES FIRESTORE ===");
    for (const [coll, count] of Object.entries(results)) {
      console.log(`- ${coll}: ${count} enregistrements`);
    }
  } catch (err) {
    console.error("Erreur lors de la lecture Firestore:", err);
  }
}

countRecords();
