import express from 'express';
import pool from './db.js';
import { verifyToken, tenantScope } from './middlewares/auth.js';

const router = express.Router();

// GET all timetable entries for a class
router.get('/timetables/class/:classId', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const scope = tenantScope(req, ' AND ', 't.school_id');
    const [rows] = await pool.query(
      `SELECT t.*, s.nom as subject_name, u.nom as teacher_nom, u.prenom as teacher_prenom
       FROM timetables t
       JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN users u ON t.teacher_id = u.id
       WHERE t.class_id = ? ${scope.sql}
       ORDER BY FIELD(day_of_week, 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'), start_time`,
      [classId, ...scope.params]
    );
    res.json({ status: 'success', data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST new timetable entry
router.post('/timetables', verifyToken, async (req, res) => {
  try {
    const { classId, dayOfWeek, startTime, endTime, subjectId, teacherId, room } = req.body;
    const [result] = await pool.query(
      'INSERT INTO timetables (class_id, day_of_week, start_time, end_time, subject_id, teacher_id, room) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [classId, dayOfWeek, startTime, endTime, subjectId, teacherId, room]
    );
    res.json({ status: 'success', id: (result as any).insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE timetable entry
router.delete('/timetables/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM timetables WHERE id = ?', [id]);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// BATCH Save timetable for a class
router.post('/timetables/save-batch/:classId', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { classId } = req.params;
    const schedule = req.body; // { Day: { "Time Slot": { matiereId, enseignantId } } }

    const schoolId = req.user?.role === 'super_admin'
      ? (req.query.school_id || null)
      : req.user?.school_id;
    if (!schoolId) {
      connection.release();
      return res.status(400).json({ error: "school_id manquant — précisez l'école cible." });
    }

    await connection.beginTransaction();

    // Delete existing (avec garde tenant)
    await connection.query(
      'DELETE FROM timetables WHERE class_id = ? AND school_id = ?',
      [classId, schoolId]
    );

    // Insert new
    for (const day of Object.keys(schedule)) {
      for (const slot of Object.keys(schedule[day])) {
        const item = schedule[day][slot];
        if (!item.matiereId) continue;

        const [start_time, end_time] = slot.split(' - ');

        await connection.query(
          'INSERT INTO timetables (class_id, day_of_week, start_time, end_time, subject_id, teacher_id, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [classId, day, start_time, end_time, item.matiereId, item.enseignantId || null, schoolId]
        );
      }
    }

    await connection.commit();
    res.json({ status: 'success' });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

export default router;
