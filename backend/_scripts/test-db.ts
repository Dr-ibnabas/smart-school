import pool from './src/db.js';

async function test() {
  try {
    console.log('Testing connection...');
    const [rows] = await pool.query('SELECT 1 + 1 as result');
    console.log('Connection successful:', rows);

    console.log('Testing students query...');
    const [students] = await pool.query('SELECT * FROM students LIMIT 1');
    console.log('Students query successful:', students);

    console.log('Testing grades query...');
    const [grades] = await pool.query('SELECT * FROM grades LIMIT 1');
    console.log('Grades query successful:', grades);

    process.exit(0);
  } catch (err) {
    console.error('DATABASE ERROR:', err);
    process.exit(1);
  }
}

test();
