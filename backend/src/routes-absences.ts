import express from 'express';
import pool from './db.js';
import { verifyToken, tenantScope } from './middlewares/auth.js';
import { validateBody } from './middlewares/validate.js';
import { AbsenceCreateSchema } from './schemas.js';

const router = express.Router();

// GET /api/absences - Liste toutes les absences
router.get('/absences', verifyToken, async (req, res) => {
  try {
    const scope = tenantScope(req, ' WHERE ', 'a.school_id');
    const [rows] = await pool.query(
      `SELECT a.*, s.nom as student_nom, s.prenom as student_prenom, c.nom as classe_nom
       FROM absences a
       JOIN students s ON a.student_id = s.id
       JOIN classes  c ON a.class_id   = c.id
       ${scope.sql}
       ORDER BY a.date DESC`,
      scope.params
    );
    res.json({ status: 'success', data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/absences - Enregistrer une absence / retard
router.post('/absences', verifyToken, validateBody(AbsenceCreateSchema), async (req, res) => {
  try {
    // Accepter les deux formats : camelCase (frontend) et snake_case (API directe)
    const studentId = req.body.studentId || req.body.student_id;
    const classId   = req.body.classId   || req.body.class_id;
    const date      = req.body.date;

    // Normaliser le statut : ancien format (reason/justified/type) → nouveau (statut/motif)
    let statut = req.body.statut || req.body.type || 'absent';
    // Si l'ancien frontend envoyait isJustified=true, on passe en "justifié"
    if (req.body.isJustified === true || req.body.isJustified === 'true') {
      statut = 'justifié';
    }
    const motif = req.body.motif || req.body.reason || '';

    if (!studentId || !classId || !date) {
      return res.status(400).json({ error: 'studentId, classId et date sont requis.' });
    }

    const schoolId = req.user?.role === 'super_admin'
      ? (req.body.school_id || req.query.school_id || null)
      : req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({ error: "school_id manquant — précisez l'école cible." });
    }
    const [result]: any = await pool.query(
      'INSERT INTO absences (student_id, class_id, date, statut, motif, school_id) VALUES (?, ?, ?, ?, ?, ?)',
      [studentId, classId, date, statut, motif, schoolId]
    );
    res.json({ status: 'success', data: { id: result.insertId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/absences/:id - Modifier une absence
router.put('/absences/:id', verifyToken, async (req, res) => {
  try {
    const { statut, motif } = req.body;
    await pool.query(
      'UPDATE absences SET statut = ?, motif = ? WHERE id = ?',
      [statut, motif || '', req.params.id]
    );
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/absences/batch - Enregistrer par lot (batch) les absences d'une classe pour une date donnée
router.post('/absences/batch', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { classId, date, absences } = req.body;
    
    if (!classId || !date || !Array.isArray(absences)) {
      connection.release();
      return res.status(400).json({ error: 'classId, date, et absences (liste) sont requis.' });
    }

    const schoolId = req.user?.role === 'super_admin'
      ? (req.body.school_id || req.query.school_id || null)
      : req.user?.school_id;
    if (!schoolId) {
      connection.release();
      return res.status(400).json({ error: "school_id manquant — précisez l'école cible." });
    }

    await connection.beginTransaction();

    // 1. Nettoyer les pointages existants pour cette classe et cette date
    await connection.query(
      'DELETE FROM absences WHERE class_id = ? AND date = ? AND school_id = ?',
      [classId, date, schoolId]
    );

    // 2. Insérer les nouvelles absences (statut !== 'present')
    const activeAbsences = absences.filter((abs: any) => abs.statut && abs.statut !== 'present');
    
    for (const abs of activeAbsences) {
      const studentId = abs.studentId || abs.student_id;
      if (!studentId) continue;
      
      const statut = abs.statut || 'absent';
      const motif = abs.motif || '';

      await connection.query(
        'INSERT INTO absences (student_id, class_id, date, statut, motif, school_id) VALUES (?, ?, ?, ?, ?, ?)',
        [studentId, classId, date, statut, motif, schoolId]
      );
    }

    await connection.commit();
    res.json({ status: 'success', count: activeAbsences.length });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/absences/:id
router.delete('/absences/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM absences WHERE id = ?', [req.params.id]);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
