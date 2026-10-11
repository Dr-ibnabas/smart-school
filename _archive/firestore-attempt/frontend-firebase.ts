import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// REMARQUE : Ces clés sont normalement dans un fichier .env (VITE_FIREBASE_...)
// Pour le développement local, elles sont nécessaires pour se connecter à votre projet Firebase.
const firebaseConfig = {
  apiKey: process.env.GOOGLE_API_KEY,
  authDomain: "smartschoolnew-6ebee.firebaseapp.com",
  projectId: "smartschoolnew-6ebee",
  storageBucket: "smartschoolnew-6ebee.firebasestorage.app",
  messagingSenderId: "114958476320",
  appId: "1:114958476320:web:1ed8a716c90c744f90ef5d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
