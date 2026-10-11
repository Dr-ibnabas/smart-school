import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import pool from './db.js';
import { verifyToken, requireRole, tenantScope } from './middlewares/auth.js';
import { validateBody } from './middlewares/validate.js';
import { JWT_SECRET, AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MIN } from './config.js';
import {
  LoginSchema,
  ClassCreateSchema,
  SubjectCreateSchema,
  StudentCreateSchema,
  StudentBatchSchema,
} from './schemas.js';

const router = express.Router();

// Rate-limit anti-bruteforce sur /auth/login : N tentatives par fenêtre par IP.
const loginLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: `Trop de tentatives de connexion. Réessaie dans ${AUTH_RATE_LIMIT_WINDOW_MIN} minutes.`
  },
  // Ne compte que les échecs : pas de pénalité pour les logins réussis.
  skipSuccessfulRequests: true,
});

// ==========================================
// AUTHENTIFICATION
// ==========================================
router.post('/auth/login', loginLimiter, validateBody(LoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    // Accepter email ou matricule (pour prof/admin)
    const sql = `SELECT * FROM users WHERE email = ? OR matricule = ?`;
    const [rows]: any = await pool.query(sql, [email, email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Récupérer les classes/matières si prof
    let assignments: any[] = [];
    let subjects: any[] = [];

    if (user.role === 'prof') {
        const [cRows]: any = await pool.query(`SELECT class_id FROM teacher_classes WHERE teacher_id = ?`, [user.id]);
        assignments = cRows.map((r: any) => r.class_id);
        const [sRows]: any = await pool.query(`SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?`, [user.id]);
        subjects = sRows.map((r: any) => r.subject_id);
    }

    // Charger l'école associée (sauf pour le super_admin global)
    let school: any = null;
    if (user.school_id) {
      const [sRows]: any = await pool.query(
        `SELECT id, code, nom, devise, logo_url, stamp_url,
                theme_primary, theme_primary_light, theme_secondary,
                theme_background, theme_accent, font_family, density, dark_mode,
                current_academic_year, status
         FROM schools WHERE id = ? LIMIT 1`,
        [user.school_id]
      );
      school = sRows[0] || null;
      if (school && school.status === 'suspended') {
        return res.status(403).json({ error: "Cette école est suspendue. Contacte le super-administrateur." });
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        matricule: user.matricule,
        school_id: user.school_id ?? null
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      status: 'success',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
        matricule: user.matricule,
        school_id: user.school_id ?? null,
        assignments,
        subjects
      },
      school
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// NOTE : l'endpoint /auth/init-admin a été retiré pour raisons de sécurité.
// Pour créer le premier compte administrateur, utiliser le script :
//   node backend/create-admin.js
// (cf. README pour la procédure d'initialisation du projet).

router.get('/auth/check', verifyToken, (req, res) => {
  res.json({ status: 'success', user: (req as any).user });
});

// ==========================================
// CLASSES
// ==========================================
router.get('/classes', verifyToken, async (req, res) => {
  try {
    const scope = tenantScope(req, ' WHERE ');
    const [rows] = await pool.query(`SELECT * FROM classes ${scope.sql}`, scope.params);
    res.json({ status: 'success', classes: rows, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/classes', verifyToken, requireRole('admin'), validateBody(ClassCreateSchema), async (req, res) => {
  try {
    const { name, nom, level, niveau } = req.body;
    const finalNom = nom || name;
    const finalNiveau = niveau || level;
    const schoolId = req.user?.role === 'super_admin'
      ? (req.body.school_id || req.query.school_id || null)
      : req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({ error: "school_id manquant — précisez l'école cible." });
    }
    const [result]: any = await pool.query(
      `INSERT INTO classes (nom, niveau, school_id) VALUES (?, ?, ?)`,
      [finalNom, finalNiveau, schoolId]
    );
    res.json({ status: 'success', data: { id: result.insertId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/classes/:id', verifyToken, requireRole('admin'), validateBody(ClassCreateSchema), async (req, res) => {
  try {
    const { nom, niveau, name, level } = req.body;
    const finalNom = nom || name;
    const finalNiveau = niveau || level;
    const scope = tenantScope(req);
    await pool.query(
      `UPDATE classes SET nom = ?, niveau = ? WHERE id = ? ${scope.sql}`,
      [finalNom, finalNiveau, req.params.id, ...scope.params]
    );
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/classes/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const scope = tenantScope(req);
    await pool.query(`DELETE FROM classes WHERE id = ? ${scope.sql}`, [req.params.id, ...scope.params]);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MATIÈRES
// ==========================================
router.get('/subjects', verifyToken, async (req, res) => {
  try {
    const scope = tenantScope(req, ' WHERE ');
    const [rows] = await pool.query(`SELECT * FROM subjects ${scope.sql}`, scope.params);
    res.json({ status: 'success', matieres: rows, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subjects', verifyToken, requireRole('admin'), validateBody(SubjectCreateSchema), async (req, res) => {
  try {
    const { name, nom, coefficient } = req.body;
    const finalNom = nom || name;
    const schoolId = req.user?.role === 'super_admin'
      ? (req.body.school_id || req.query.school_id || null)
      : req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({ error: "school_id manquant — précisez l'école cible." });
    }
    const [result]: any = await pool.query(
      `INSERT INTO subjects (nom, coefficient, school_id) VALUES (?, ?, ?)`,
      [finalNom, coefficient || 1, schoolId]
    );
    res.json({ status: 'success', data: { id: result.insertId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/subjects/:id', verifyToken, requireRole('admin'), validateBody(SubjectCreateSchema), async (req, res) => {
  try {
    const { nom, coefficient, name } = req.body;
    const finalNom = nom || name;
    const scope = tenantScope(req);
    await pool.query(
      `UPDATE subjects SET nom = ?, coefficient = ? WHERE id = ? ${scope.sql}`,
      [finalNom, coefficient, req.params.id, ...scope.params]
    );
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/subjects/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const scope = tenantScope(req);
    await pool.query(`DELETE FROM subjects WHERE id = ? ${scope.sql}`, [req.params.id, ...scope.params]);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ÉLÈVES
// ==========================================
router.get('/students', verifyToken, async (req, res) => {
  try {
    // Pagination + filtres optionnels (rétrocompatibles).
    //   ?page=1&per_page=50           → page numérotée
    //   ?class_id=12                   → filtre par classe
    //   ?q=abdoul                       → recherche nom/prénom/matricule
    //   (aucun paramètre)               → tous les élèves, comme avant
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const perPageRaw = parseInt(String(req.query.per_page || '0'), 10) || 0;
    const perPage = perPageRaw > 0 ? Math.min(200, perPageRaw) : 0; // 0 = pas de pagination
    const classId = req.query.class_id || req.query.classId;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    // Build WHERE
    const where: string[] = [];
    const params: any[] = [];

    // Tenant scoping : filtre par école sauf si super_admin sans override
    const scope = tenantScope(req, '', 's.school_id');
    if (scope.sql) {
      where.push(scope.sql);
      params.push(...scope.params);
    }

    if (classId) {
      where.push('s.class_id = ?');
      params.push(classId);
    }
    if (q) {
      where.push('(s.nom LIKE ? OR s.prenom LIKE ? OR s.matricule LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Total (utile au frontend pour afficher la pagination)
    const [countRows]: any = await pool.query(
      `SELECT COUNT(*) AS total FROM students s ${whereSql}`,
      params
    );
    const total = Number(countRows?.[0]?.total) || 0;

    // Page de résultats
    let limitSql = '';
    const queryParams = [...params];
    if (perPage > 0) {
      const offset = (page - 1) * perPage;
      limitSql = 'LIMIT ? OFFSET ?';
      queryParams.push(perPage, offset);
    }

    const [rows] = await pool.query(
      `SELECT s.*, c.nom AS classe_nom
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       ${whereSql}
       ORDER BY s.nom ASC, s.prenom ASC
       ${limitSql}`,
      queryParams
    );

    const data = (rows as any[]).map(r => ({
      ...r,
      classId: r.class_id, // alias frontend legacy
    }));

    res.json({
      status: 'success',
      data,
      // Aliases pour rétrocompatibilité avec l'ancien code frontend.
      eleves: data,
      classes: [],
      pagination: perPage > 0
        ? { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) }
        : { page: 1, per_page: total, total, total_pages: 1 },
    });
  } catch (err: any) {
    console.error('Error in GET /students:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/students', verifyToken, requireRole('admin'), validateBody(StudentCreateSchema), async (req, res) => {
  try {
    const { matricule, nom, prenom, genre, class_id, classId, redoublant } = req.body;
    const cId = class_id || classId;
    const schoolId = req.user?.role === 'super_admin'
      ? (req.body.school_id || req.query.school_id || null)
      : req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({ error: "school_id manquant — précisez l'école cible." });
    }
    const [result]: any = await pool.query(
      `INSERT INTO students (matricule, nom, prenom, genre, class_id, redoublant, school_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [matricule, nom, prenom, genre || 'M', cId || null, redoublant || false, schoolId]
    );
    res.json({ status: 'success', data: { id: result.insertId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/students/batch', verifyToken, requireRole('admin'), validateBody(StudentBatchSchema), async (req, res) => {
  try {
    const students = req.body;
    const schoolId = req.user?.role === 'super_admin'
      ? (req.body[0]?.school_id || req.query.school_id || null)
      : req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({ error: "school_id manquant — précisez l'école cible." });
    }
    for (const s of students) {
       await pool.query(
          `INSERT INTO students (matricule, nom, prenom, genre, class_id, redoublant, school_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            nom=VALUES(nom),
            prenom=VALUES(prenom),
            genre=VALUES(genre),
            class_id=VALUES(class_id),
            redoublant=VALUES(redoublant)`,
          [s.matricule, s.nom, s.prenom, s.genre || 'M', s.class_id || s.classId || null, s.redoublant || false, schoolId]
       );
    }
    res.json({ status: 'success', count: students.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/students/:id', verifyToken, requireRole('admin'), validateBody(StudentCreateSchema), async (req, res) => {
  try {
    const { matricule, nom, prenom, genre, class_id, classId, redoublant } = req.body;
    const cId = class_id || classId;
    const scope = tenantScope(req);
    await pool.query(
      `UPDATE students SET matricule=?, nom=?, prenom=?, genre=?, class_id=?, redoublant=? WHERE id=? ${scope.sql}`,
      [matricule, nom, prenom, genre, cId || null, redoublant ? 1 : 0, req.params.id, ...scope.params]
    );
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/students/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const scope = tenantScope(req);
    await pool.query(`DELETE FROM students WHERE id = ? ${scope.sql}`, [req.params.id, ...scope.params]);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
