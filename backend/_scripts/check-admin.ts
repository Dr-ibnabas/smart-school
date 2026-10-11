import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smartschool_db',
});

async function checkAdmin() {
  try {
    console.log('🔍 Checking database connection...');
    const [connTest] = await pool.query('SELECT 1+1 as test');
    console.log('✅ Connection successful.');

    console.log('🔍 Searching for admin users...');
    const [users]: any = await pool.query('SELECT id, matricule, email, role, nom, prenom FROM users WHERE role = "admin" OR email = "admin@smartschool.internal"');
    
    if (users.length === 0) {
      console.log('❌ NO ADMIN USER FOUND in the database.');
      console.log('Try running: node create-admin-mysql.js');
    } else {
      console.log(`✅ Found ${users.length} user(s):`);
      users.forEach((u: any) => {
        console.log(`- ID: ${u.id}, Email: ${u.email}, Matricule: ${u.matricule}, Role: ${u.role}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ DATABASE ERROR:', error);
    process.exit(1);
  }
}

checkAdmin();
