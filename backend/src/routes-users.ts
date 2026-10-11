import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import pool from './db.js';
import { verifyToken, requireRole, tenantScope } from './middlewares/auth.js';
import { validateBody } from './middlewares/validate.js';
import { UserCreateSchema, UserUpdateSchema } from './schemas.js';

const router = express.Router();

/**
 * Génère un mot de passe temporaire de `length` caractères, sans ambiguïtés
 * visuelles (pas de 0/O/1/l/I). Sera communiqué à l'admin qui crée l'utilisateur.
 */
function generateTempPassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

// GET /api/users - Liste tous les utilisateurs (admin uniquement)
// - admin école : voit uniquement les users de SA school
// - super_admin : voit tout (ou filtre via ?school_id=X)
router.get('/users', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const scope = tenantScope(req, ' WHERE ');
    const [rows] = await pool.query(
      `SELECT id, matricule, email, role, nom, prenom, subject, classes, school_id
       FROM users ${scope.sql}`,
      scope.params
    );
    const enriched = (rows as any[]).map(r => ({
      ...r,
      // Compatibilité frontend (firstname/lastname aliases)
      firstname: r.prenom,
      lastname: r.nom,
      classes: r.classes ? JSON.parse(r.classes) : []
    }));
    res.json({ status: 'success', data: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - Créer un utilisateur (admin uniquement)
router.post('/users', verifyToken, requireRole('admin'), validateBody(UserCreateSchema), async (req, res) => {
  try {
    const { email, matricule, password, role, firstname, lastname, nom, prenom, subject, classes } = req.body;
    const finalNom    = nom    || lastname  || '';
    const finalPrenom = prenom || firstname || '';

    // Si pas de mot de passe fourni, on en génère un temporaire et on le
    // renvoie UNE SEULE FOIS à l'admin pour qu'il le communique à l'utilisateur.
    const providedPassword = typeof password === 'string' && password.length >= 6 ? password : '';
    const tempPassword = providedPassword || generateTempPassword(10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const classesJson = Array.isArray(classes) ? JSON.stringify(classes) : '[]';
    const mat = matricule || `PROF-${Date.now()}`;

    // School scoping : super_admin peut spécifier school_id, sinon = école du créateur
    const schoolId = req.user?.role === 'super_admin'
      ? (req.body.school_id || req.query.school_id || null)
      : req.user?.school_id;
    if (!schoolId && role !== 'super_admin') {
      return res.status(400).json({ error: "school_id manquant — précisez l'école cible." });
    }

    const [result]: any = await pool.query(
      'INSERT INTO users (matricule, email, password_hash, role, nom, prenom, subject, classes, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [mat, email, hashedPassword, role || 'prof', finalNom, finalPrenom, subject || null, classesJson, schoolId]
    );

    res.json({
      status: 'success',
      data: { id: result.insertId },
      // Renvoyé UNIQUEMENT si l'admin n'a pas fourni de mot de passe.
      // À transmettre à l'utilisateur de manière sécurisée (et invité à le changer).
      ...(providedPassword ? {} : { temp_password: tempPassword })
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id - Mettre à jour un utilisateur (admin uniquement)
router.put('/users/:id', verifyToken, requireRole('admin'), validateBody(UserUpdateSchema), async (req, res) => {
  try {
    const { email, role, firstname, lastname, nom, prenom, subject, classes, password } = req.body;
    const finalNom    = nom    || lastname  || '';
    const finalPrenom = prenom || firstname || '';
    const classesJson = Array.isArray(classes) ? JSON.stringify(classes) : '[]';

    const scope = tenantScope(req);
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users SET email=?, role=?, nom=?, prenom=?, subject=?, classes=?, password_hash=? WHERE id=? ${scope.sql}`,
        [email, role, finalNom, finalPrenom, subject || null, classesJson, hashedPassword, req.params.id, ...scope.params]
      );
    } else {
      await pool.query(
        `UPDATE users SET email=?, role=?, nom=?, prenom=?, subject=?, classes=? WHERE id=? ${scope.sql}`,
        [email, role, finalNom, finalPrenom, subject || null, classesJson, req.params.id, ...scope.params]
      );
    }

    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Supprimer un utilisateur (admin uniquement)
router.delete('/users/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const scope = tenantScope(req);
    await pool.query(`DELETE FROM users WHERE id = ? ${scope.sql}`, [req.params.id, ...scope.params]);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
