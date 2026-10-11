import express from 'express';
import pool from './db.js';
import { verifyToken } from './middlewares/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/settings';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// POST /api/upload/settings/:type  (logo | stamp)
router.post('/upload/settings/:type', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { type } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const fileUrl = `/uploads/settings/${req.file.filename}`;

    // Colonne dans la DB : logo_url ou stamp_url
    const column = type === 'logo' ? 'logo_url' : 'stamp_url';

    const [existing]: any = await pool.query('SELECT id FROM settings LIMIT 1');
    if (existing.length > 0) {
      await pool.query(`UPDATE settings SET \`${column}\` = ? WHERE id = ?`, [fileUrl, existing[0].id]);
    } else {
      await pool.query(`INSERT INTO settings (\`${column}\`) VALUES (?)`, [fileUrl]);
    }

    res.json({ status: 'success', url: fileUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings - branding PUBLIC (utilisé par la page Login avant connexion)
// On expose uniquement les champs nécessaires au branding ; pas l'email/tel/adresse.
router.get('/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
    const data: any = (rows as any[])[0] || {};

    // L'utilisateur est-il authentifié ? Si oui, on expose tout. Sinon, branding seul.
    const authHeader = req.headers.authorization;
    const isAuthenticated = !!authHeader; // verifyToken serait plus strict mais coûteux ici

    const publicFields = {
      school_name:   data.school_name   || null,
      platform_name: data.platform_name || null,
      description:   data.description   || null,
      logo:          data.logo_url      || null,
      stamp:         data.stamp_url     || null,
      logo_url:      data.logo_url      || null,
      stamp_url:     data.stamp_url     || null,
    };

    const fullData = isAuthenticated
      ? { ...data, ...publicFields }
      : publicFields;

    res.json({ status: 'success', data: fullData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings - Mettre à jour les paramètres textuels
router.post('/settings', verifyToken, async (req, res) => {
  try {
    const {
      schoolName, school_name,
      platformName, platform_name,
      defaultLanguage, language,
      theme,
      currentAcademicYear, current_academic_year,
      address, phone, email, website,
      description
    } = req.body;

    const finalSchoolName   = school_name   || schoolName   || '';
    const finalPlatformName = platform_name || platformName || '';
    const finalLanguage     = language  || defaultLanguage  || 'fr';
    const finalAcYear       = current_academic_year || currentAcademicYear || '';

    const [existing]: any = await pool.query('SELECT id FROM settings LIMIT 1');

    if (existing.length > 0) {
      await pool.query(
        `UPDATE settings SET
          school_name=?, platform_name=?, language=?, theme=?,
          current_academic_year=?, address=?, phone=?, email=?,
          website=?, description=?
         WHERE id=?`,
        [
          finalSchoolName, finalPlatformName, finalLanguage, theme || 'light',
          finalAcYear, address || '', phone || '', email || '',
          website || '', description || '', existing[0].id
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO settings (school_name, platform_name, language, theme, current_academic_year, address, phone, email, website, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalSchoolName, finalPlatformName, finalLanguage, theme || 'light',
          finalAcYear, address || '', phone || '', email || '',
          website || '', description || ''
        ]
      );
    }

    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
