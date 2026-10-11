import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './.env' });

// Utilisation de l'ID de projet détecté activement si celui du .env semble incorrect
const projectId = 'smartschoolnew-6ebee'; 

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: projectId,
    // [WARNING]: In local dev without GCloud CLI logged into 'smartschoolnew',
    // this will fail. Use: credential: admin.credential.cert('./serviceAccountKey.json')
  });
}

const db = admin.firestore();

async function createAdmin() {
  const matricule = 'ADMIN-001';
  const password = 'Admin123!';
  const name = 'Admin Smart School';
  const role = 'ADMIN';
  const email = `${matricule.toLowerCase()}@smartschool.internal`;

  console.log(`🚀 Création du compte admin pour ${email}...`);

  try {
    // 1. Création dans Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('ℹ️ L\'utilisateur existe déjà dans Auth.');
    } catch (e) {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name,
      });
      console.log('✅ Utilisateur créé dans Firebase Auth.');
    }

    // 2. Création du profil dans Firestore
    const userProfile = {
      uid: userRecord.uid,
      email,
      name,
      role,
      managedClassIds: [],
      createdAt: Date.now(),
    };

    await db.collection('users').doc(userRecord.uid).set(userProfile);
    console.log('✅ Profil créé dans Firestore.');
    
    console.log('\n--- TERMINÉ ---');
    console.log(`Matricule : ${matricule}`);
    console.log(`Mot de passe : ${password}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la création :', error);
    process.exit(1);
  }
}

createAdmin();
