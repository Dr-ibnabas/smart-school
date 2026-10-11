import admin from 'firebase-admin';

// Configuration avec votre ID de projet
const projectId = 'smartschoolnew-6ebee';
const adminUid = 'qtKCEamLjSRvXOV7WhhmaarMbPm2';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: projectId,
  });
}

const db = admin.firestore();

async function setAdminProfile() {
  console.log(`🚀 Attribution des droits admin pour l'UID : ${adminUid}...`);
  
  const userProfile = {
    uid: adminUid,
    email: 'admin-001@smartschool.internal',
    name: 'Admin Smart School',
    role: 'ADMIN',
    managedClassIds: [],
    createdAt: Date.now(),
  };

  try {
    await db.collection('users').doc(adminUid).set(userProfile);
    console.log('✅ Succès ! Le profil administrateur a été créé dans Firestore.');
    console.log('Vous pouvez maintenant vous connecter sur http://localhost:3000');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'attribution des droits :', error);
    process.exit(1);
  }
}

setAdminProfile();
