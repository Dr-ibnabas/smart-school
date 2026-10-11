import express from 'express';
import pool from './db.js';
import { verifyToken, requireRole, tenantScope } from './middlewares/auth.js';
import { validateBody } from './middlewares/validate.js';
import { GradeBatchSchema } from './schemas.js';

const router = express.Router();

// ==========================================
// GRADES (NOTES)
// ==========================================

router.get('/grades', verifyToken, async (req, res) => {
  try {
    const scope = tenantScope(req, ' WHERE ');
    const [rows] = await pool.query(`SELECT * FROM grades ${scope.sql}`, scope.params);
    res.json({ status: 'success', data: rows });
  } catch (err: any) {
    console.error('Error in GET /grades:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/grades/:classId/:subjectId/:term', verifyToken, async (req, res) => {
  try {
    const { classId, subjectId, term } = req.params;
    const scope = tenantScope(req);
    const [rows] = await pool.query(
      `SELECT * FROM grades WHERE class_id = ? AND subject_id = ? AND term = ? ${scope.sql}`,
      [classId, subjectId, term, ...scope.params]
    );
    const formatted = (rows as any[]).map(r => ({
      ...r,
      student_id: r.student_id,
      studentId: r.student_id,
      grade_id: r.id
    }));
    res.json({ status: 'success', data: formatted, grades: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/grades/batch', verifyToken, requireRole('admin', 'prof'), validateBody(GradeBatchSchema), async (req, res) => {
  try {
    const { grades, metadata } = req.body;
    const classId = metadata.class_id || metadata.classId;
    const subjectId = metadata.subject_id || metadata.subjectId;
    const term = metadata.term;
    const teacherId = metadata.teacher_id || metadata.teacherId || null;
    const schoolId = req.user?.role === 'super_admin'
      ? (metadata.school_id || req.query.school_id || null)
      : req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({ error: "school_id manquant — précisez l'école cible." });
    }

    for (const g of grades) {
      const studentId = g.student_id || g.studentId;
      if (!studentId) continue;

      const grade1 = g.grade1 !== undefined ? g.grade1 : null;
      const grade2 = g.grade2 !== undefined ? g.grade2 : null;
      const grade3 = g.grade3 !== undefined ? g.grade3 : null;

      await pool.query(
        `INSERT INTO grades (student_id, class_id, subject_id, teacher_id, term, grade1, grade2, grade3, school_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE grade1=VALUES(grade1), grade2=VALUES(grade2), grade3=VALUES(grade3), teacher_id=VALUES(teacher_id)`,
        [studentId, classId, subjectId, teacherId, term, grade1, grade2, grade3, schoolId]
      );
    }

    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/grades', verifyToken, async (req, res) => {
  try {
    const g = req.body;
    const schoolId = req.user?.role === 'super_admin'
      ? (g.school_id || req.query.school_id || null)
      : req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({ error: "school_id manquant — précisez l'école cible." });
    }
    const [result]: any = await pool.query(
      `INSERT INTO grades (student_id, class_id, subject_id, teacher_id, term, grade1, grade2, grade3, school_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [g.studentId, g.classId, g.subjectId, g.teacherId, g.term, g.grade1, g.grade2, g.grade3, schoolId]
    );
    res.json({ status: 'success', data: { id: result.insertId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/grades/:id', verifyToken, async (req, res) => {
  try {
    const scope = tenantScope(req);
    await pool.query(`DELETE FROM grades WHERE id = ? ${scope.sql}`, [req.params.id, ...scope.params]);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
