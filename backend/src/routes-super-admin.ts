/**
 * Routes réservées au SUPER ADMINISTRATEUR (rôle 'super_admin').
 *
 *   /api/super-admin/schools                 GET, POST
 *   /api/super-admin/schools/:id             GET, PUT, DELETE
 *   /api/super-admin/schools/:id/theme       PUT  (édition thème complet)
 *   /api/super-admin/schools/:id/users       GET  (liste users d'une école)
 *   /api/super-admin/schools/:id/admins      POST (créer un principal)
 *   /api/super-admin/users/:id/reset-password POST (régénère mdp temporaire)
 *   /api/super-admin/users/:id               DELETE
 *   /api/super-admin/stats                   GET  (compteurs globaux)
 */
import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from './db.js';
import { verifyToken, requireSuperAdmin } from './middlewares/auth.js';
import { validateBody } from './middlewares/validate.js';
import { JWT_SECRET } from './config.js';

const router = express.Router();

// Toutes les routes ici exigent super_admin
router.use(verifyToken, requireSuperAdmin);

function generateTempPassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{3,8}$/i, 'Couleur hexadécimale attendue (#RRGGBB)');

const SchoolCreateSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/, 'Code : lettres/chiffres/-_ uniquement'),
  nom: z.string().trim().min(2).max(150),
  devise: z.string().trim().max(255).optional(),
  address: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().email().max(120).optional().or(z.literal('')),
  website: z.string().max(150).optional(),
  current_academic_year: z.string().max(20).optional(),
});

const SchoolUpdateSchema = SchoolCreateSchema.partial();

const ThemeSchema = z.object({
  theme_primary:       hexColor.optional(),
  theme_primary_light: hexColor.optional(),
  theme_secondary:     hexColor.optional(),
  theme_background:    hexColor.optional(),
  theme_accent:        hexColor.optional(),
  font_family:         z.string().max(120).optional(),
  density:             z.enum(['comfortable', 'compact']).optional(),
  dark_mode:           z.union([z.boolean(), z.literal(0), z.literal(1)]).optional(),
  logo_url:            z.string().max(255).optional().or(z.literal('')),
  stamp_url:           z.string().max(255).optional().or(z.literal('')),
});

// Configuration multer pour upload assets école (logo, tampon)
const schoolAssetStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.resolve('uploads', 'schools', String(req.params.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const type = req.params.type;
    cb(null, `${type}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const schoolAssetUpload = multer({
  storage: schoolAssetStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|gif|svg\+xml|webp)$/.test(file.mimetype)) {
      return cb(new Error('Format non supporté (PNG/JPG/GIF/SVG/WebP)'));
    }
    cb(null, true);
  }
});

const AdminCreateSchema = z.object({
  email: z.string().email().max(120),
  matricule: z.string().trim().max(50).optional(),
  nom: z.string().trim().min(1).max(100),
  prenom: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(200).optional(), // sinon généré
});

// ===========================================================
// ÉCOLES — CRUD
// ===========================================================
router.get('/schools', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*,
        (SELECT COUNT(*) FROM users    WHERE school_id = s.id AND role = 'admin') AS admin_count,
        (SELECT COUNT(*) FROM users    WHERE school_id = s.id AND role = 'prof')  AS prof_count,
        (SELECT COUNT(*) FROM students WHERE school_id = s.id)                    AS student_count,
        (SELECT COUNT(*) FROM classes  WHERE school_id = s.id)                    AS class_count
      FROM schools s
      ORDER BY s.created_at DESC
    `);
    res.json({ status: 'success', data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schools/:id', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM schools WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'École introuvable' });
    res.json({ status: 'success', data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/schools', validateBody(SchoolCreateSchema), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const body = req.body;
    await connection.beginTransaction();

    const [result]: any = await connection.query(
      `INSERT INTO schools (code, nom, devise, address, phone, email, website, current_academic_year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [body.code, body.nom, body.devise || null, body.address || null,
       body.phone || null, body.email || null, body.website || null,
       body.current_academic_year || null]
    );
    const schoolId = result.insertId;

    // Crée automatiquement un compte principal pour cette école
    const tempPassword = generateTempPassword(10);
    const hash = await bcrypt.hash(tempPassword, 10);
    const adminMatricule = `${body.code.toUpperCase()}-ADMIN`;
    const adminEmail = `admin@${body.code.toLowerCase()}.smartschool`;

    await connection.query(
      `INSERT INTO users (matricule, email, password_hash, role, nom, prenom, school_id)
       VALUES (?, ?, ?, 'admin', ?, ?, ?)`,
      [adminMatricule, adminEmail, hash, 'Principal', body.nom.slice(0, 50), schoolId]
    );

    await connection.commit();

    res.status(201).json({
      status: 'success',
      data: { id: schoolId },
      admin: {
        matricule: adminMatricule,
        email: adminEmail,
        temp_password: tempPassword,
      },
    });
  } catch (err: any) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Code d\'école déjà utilisé.' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.put('/schools/:id', validateBody(SchoolUpdateSchema), async (req, res) => {
  try {
    const body = req.body;
    const fields = Object.keys(body) as (keyof typeof body)[];
    if (fields.length === 0) return res.json({ status: 'success' });

    const setClause = fields.map(f => `\`${String(f)}\` = ?`).join(', ');
    const values = fields.map(f => (body as any)[f] || null);
    values.push(req.params.id);

    await pool.query(`UPDATE schools SET ${setClause} WHERE id = ?`, values);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/schools/:id', async (req, res) => {
  try {
    // Garde-fou : on bloque la suppression si l'école contient des élèves
    const [rows]: any = await pool.query(
      'SELECT COUNT(*) AS n FROM students WHERE school_id = ?',
      [req.params.id]
    );
    if (rows[0].n > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer : cette école contient encore ${rows[0].n} élève(s). Archivez-la plutôt.`,
      });
    }
    await pool.query('DELETE FROM users   WHERE school_id = ?', [req.params.id]);
    await pool.query('DELETE FROM schools WHERE id        = ?', [req.params.id]);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload logo OU tampon d'une école (type = logo | stamp)
router.post('/schools/:id/upload/:type(logo|stamp)', schoolAssetUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const { id, type } = req.params;
    const fileUrl = `/uploads/schools/${id}/${req.file.filename}`;
    const column = type === 'logo' ? 'logo_url' : 'stamp_url';

    // Récupère l'ancien fichier pour le supprimer
    const [rows]: any = await pool.query(`SELECT ${column} AS old_path FROM schools WHERE id = ?`, [id]);
    const oldPath = rows?.[0]?.old_path;

    await pool.query(`UPDATE schools SET \`${column}\` = ? WHERE id = ?`, [fileUrl, id]);

    // Nettoyage du fichier précédent (best-effort)
    if (oldPath && oldPath.startsWith(`/uploads/schools/${id}/`)) {
      const absolute = path.resolve('.' + oldPath);
      fs.unlink(absolute, () => { /* ignore */ });
    }

    res.json({ status: 'success', url: fileUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/schools/:id/theme', validateBody(ThemeSchema), async (req, res) => {
  try {
    const body = req.body;
    const fields = Object.keys(body) as (keyof typeof body)[];
    if (fields.length === 0) return res.json({ status: 'success' });

    const setClause = fields.map(f => `\`${String(f)}\` = ?`).join(', ');
    const values = fields.map(f => (body as any)[f]);
    values.push(req.params.id);

    await pool.query(`UPDATE schools SET ${setClause} WHERE id = ?`, values);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================================
// UTILISATEURS d'une école
// ===========================================================
router.get('/schools/:id/users', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, matricule, email, role, nom, prenom, subject, school_id
       FROM users WHERE school_id = ? ORDER BY role, nom`,
      [req.params.id]
    );
    res.json({ status: 'success', data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/schools/:id/admins', validateBody(AdminCreateSchema), async (req, res) => {
  try {
    const body = req.body;
    const providedPwd = typeof body.password === 'string' && body.password.length >= 8 ? body.password : '';
    const tempPwd = providedPwd || generateTempPassword(10);
    const hash = await bcrypt.hash(tempPwd, 10);
    const mat = body.matricule || `ADM-${Date.now()}`;

    const [result]: any = await pool.query(
      `INSERT INTO users (matricule, email, password_hash, role, nom, prenom, school_id)
       VALUES (?, ?, ?, 'admin', ?, ?, ?)`,
      [mat, body.email, hash, body.nom, body.prenom, req.params.id]
    );

    res.status(201).json({
      status: 'success',
      data: { id: result.insertId },
      ...(providedPwd ? {} : { temp_password: tempPwd }),
    });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Matricule ou email déjà utilisé.' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const tempPwd = generateTempPassword(10);
    const hash = await bcrypt.hash(tempPwd, 10);
    const [result]: any = await pool.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hash, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }
    res.json({ status: 'success', temp_password: tempPwd });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ? AND role != "super_admin"', [req.params.id]);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================================
// IMPERSONATION — Le super_admin se connecte "en tant que" un user
//   POST /api/super-admin/users/:id/impersonate
//   Retourne un token JWT pour ce user, avec un flag `impersonated_by`
//   qui permet de tracer l'opération côté audit (champ optionnel).
//   Le client doit conserver son propre token super_admin pour pouvoir
//   "sortir" du mode impersonation.
// ===========================================================
router.post('/users/:id/impersonate', async (req, res) => {
    try {
        const [rows]: any = await pool.query(
            `SELECT u.*, s.id AS s_id, s.code AS s_code, s.nom AS s_nom, s.devise, s.logo_url,
                    s.stamp_url, s.theme_primary, s.theme_primary_light, s.theme_secondary,
                    s.theme_background, s.theme_accent, s.font_family, s.density, s.dark_mode,
                    s.current_academic_year, s.status
             FROM users u
             LEFT JOIN schools s ON u.school_id = s.id
             WHERE u.id = ? LIMIT 1`,
            [req.params.id]
        );
        const user = rows?.[0];
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        if (user.role === 'super_admin') {
            return res.status(400).json({ error: "Inutile d'imposer un super_admin." });
        }

        // Token court (1h) avec marqueur d'impersonation
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                matricule: user.matricule,
                school_id: user.school_id ?? null,
                impersonated_by: req.user?.id,
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const school = user.s_id ? {
            id: user.s_id, code: user.s_code, nom: user.s_nom, devise: user.devise,
            logo_url: user.logo_url, stamp_url: user.stamp_url,
            theme_primary: user.theme_primary, theme_primary_light: user.theme_primary_light,
            theme_secondary: user.theme_secondary, theme_background: user.theme_background,
            theme_accent: user.theme_accent, font_family: user.font_family,
            density: user.density, dark_mode: user.dark_mode,
            current_academic_year: user.current_academic_year, status: user.status,
        } : null;

        // eslint-disable-next-line no-console
        console.warn(`[IMPERSONATE] super_admin ${req.user?.id} → user ${user.id} (${user.email})`);

        res.json({
            status: 'success',
            token,
            user: {
                id: user.id, email: user.email, role: user.role,
                nom: user.nom, prenom: user.prenom, matricule: user.matricule,
                school_id: user.school_id ?? null,
                impersonated_by: req.user?.id,
            },
            school,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ===========================================================
// Stats globales (super_admin dashboard)
// ===========================================================
router.get('/stats', async (_req, res) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM schools WHERE status = 'active') AS schools_active,
        (SELECT COUNT(*) FROM schools)                          AS schools_total,
        (SELECT COUNT(*) FROM users WHERE role = 'admin')       AS admins,
        (SELECT COUNT(*) FROM users WHERE role = 'prof')        AS profs,
        (SELECT COUNT(*) FROM students)                          AS students,
        (SELECT COUNT(*) FROM classes)                           AS classes
    `);
    res.json({ status: 'success', data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
