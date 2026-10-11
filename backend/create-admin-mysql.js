import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smartschool_db',
});

async function createAdmin() {
  const matricule = 'ADMIN-001';
  const email     = 'admin@smartschool.internal';
  const password  = 'admin123';
  const nom       = 'Admin';
  const prenom    = 'Principal';
  const role      = 'admin';

  try {
    const salt         = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log(`🚀 Création du compte admin MySQL pour ${email}...`);

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR matricule = ?',
      [email, matricule]
    );

    // Pas de TypeScript "as any[]" — on caste via Array.isArray / length
    const rows = Array.isArray(existing) ? existing : [];

    if (rows.length > 0) {
      console.log("ℹ️ L'administrateur existe déjà. Mise à jour du mot de passe...");
      await pool.query(
        'UPDATE users SET password_hash = ?, role = ? WHERE email = ?',
        [passwordHash, role, email]
      );
    } else {
      await pool.query(
        'INSERT INTO users (matricule, email, password_hash, role, nom, prenom) VALUES (?, ?, ?, ?, ?, ?)',
        [matricule, email, passwordHash, role, nom, prenom]
      );
      console.log('✅ Administrateur créé avec succès.');
    }

    console.log('\n--- TERMINÉ ---');
    console.log(`Matricule    : ${matricule}`);
    console.log(`Email        : ${email}`);
    console.log(`Mot de passe : ${password}`);
    console.log('\n⚠️  Changez le mot de passe après votre première connexion !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur :', error);
    process.exit(1);
  }
}

createAdmin();
