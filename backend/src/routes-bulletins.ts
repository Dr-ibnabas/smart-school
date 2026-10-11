import express from 'express';
import pool from './db.js';
import { verifyToken, tenantScope } from './middlewares/auth.js';

const router = express.Router();

router.get('/bulletins/:eleveId/:term', verifyToken, async (req, res) => {
    try {
        const { eleveId, term } = req.params;
        const scope = tenantScope(req, ' AND ', 's.school_id');

        // 1. Fetch Student Info (avec garde tenant)
        const [studentRows]: any = await pool.query(
            `SELECT s.*, c.nom as classe_nom, c.niveau as classe_niveau
             FROM students s
             LEFT JOIN classes c ON s.class_id = c.id
             WHERE s.id = ? ${scope.sql}`,
            [eleveId, ...scope.params]
        );

        if (studentRows.length === 0) {
            return res.status(404).json({ error: "Élève introuvable" });
        }
        const student = studentRows[0];
        const classId = student.class_id;
        // Pour les sous-requêtes suivantes, on filtre sur l'école de l'élève
        // (ainsi le super_admin voit toujours le bulletin de l'élève précis).
        const schoolFilter = student.school_id;

        // 2. Fetch Settings — on prend les settings de l'école de l'élève
        const [settingsRows]: any = await pool.query(
            `SELECT * FROM schools WHERE id = ? LIMIT 1`,
            [schoolFilter]
        );
        const schoolRow = settingsRows[0] || {};
        // Compat : on remappe sur les champs attendus en aval.
        const settings: any = {
            school_name: schoolRow.nom,
            logo_url:    schoolRow.logo_url,
            stamp_url:   schoolRow.stamp_url,
            platform_name: schoolRow.nom,
        };

        // 3. Fetch All Grades for the class and term (to calculate ranks)
        const [classGrades]: any = await pool.query(
            `SELECT * FROM grades WHERE class_id = ? AND term = ? AND school_id = ?`,
            [classId, term, schoolFilter]
        );

        // 4. Fetch Subjects
        const [subjectsRows]: any = await pool.query(
            `SELECT * FROM subjects WHERE school_id = ?`,
            [schoolFilter]
        );
        const subjectsMap: any = {};
        subjectsRows.forEach((s: any) => {
            subjectsMap[s.id] = s;
        });

        // 5. Fetch Teachers (de l'école courante)
        const [teachersRows]: any = await pool.query(
            `SELECT id, nom, prenom, subject as subject_id
             FROM users
             WHERE role = 'prof' AND subject IS NOT NULL AND school_id = ?`,
            [schoolFilter]
        );
        const teachersBySubject: any = {};
        teachersRows.forEach((t: any) => {
            teachersBySubject[t.subject_id] = { nom: t.nom, prenom: t.prenom };
        });

        // 6. Logic for averages and ranks
        const studentGrades = classGrades.filter((g: any) => String(g.student_id) === String(eleveId));
        
        // Group class grades by subject
        const bySubjectByStudent: Record<string, Record<string, number>> = {};
        classGrades.forEach((g: any) => {
            const n1 = g.grade1 !== null && g.grade1 !== undefined ? parseFloat(g.grade1) : NaN;
            const n2 = g.grade2 !== null && g.grade2 !== undefined ? parseFloat(g.grade2) : NaN;
            const n3 = g.grade3 !== null && g.grade3 !== undefined ? parseFloat(g.grade3) : NaN;

            const presentNotes = [n1, n2, n3].filter(n => !isNaN(n));
            if (presentNotes.length === 0) return;

            // Simple average if less than 3 notes, weighted if all 3 are present (Djibouti Style)
            let avg = 0;
            if (presentNotes.length === 3) {
                avg = ((n1 + n2) / 2 + n3) / 2;
            } else {
                avg = presentNotes.reduce((a, b) => a + b, 0) / presentNotes.length;
            }

            const sId = g.subject_id;
            const stuId = g.student_id;
            if (!bySubjectByStudent[sId]) bySubjectByStudent[sId] = {};
            bySubjectByStudent[sId][stuId] = avg;
        });

        const gradesBySubject: any[] = [];
        let totalPoints = 0;
        let totalCoef = 0;

        studentGrades.forEach((g: any) => {
            const sId = g.subject_id;
            const avg = bySubjectByStudent[sId]?.[eleveId];
            if (avg === undefined) return;

            const subject = subjectsMap[sId] || { nom: 'Inconnue', coefficient: 1 };
            const coef = subject.coefficient || 1;
            
            const classAvgs = Object.values(bySubjectByStudent[sId] || {});
            const sortedAvgs = [...classAvgs].sort((a, b) => b - a);
            const rank = sortedAvgs.indexOf(avg) + 1;
            const maxGrade = classAvgs.length > 0 ? Math.max(...classAvgs).toFixed(2) : '-';
            
            const teacher = teachersBySubject[sId] || { nom: '', prenom: '' };
            
            gradesBySubject.push({
                matiere_nom: subject.nom,
                teacher_nom: teacher.nom,
                teacher_prenom: teacher.prenom,
                grade1: g.grade1,
                grade2: g.grade2,
                grade3: g.grade3,
                average: avg.toFixed(2),
                rank: `${rank}/${classAvgs.length}`,
                max_grade: maxGrade,
                coef: coef
            });
            totalPoints += avg * coef;
            totalCoef += coef;
        });

        // Overall Ranking
        const studentTotals: Record<string, { points: number, coef: number }> = {};
        Object.keys(bySubjectByStudent).forEach(sId => {
            const subjectCoef = subjectsMap[sId]?.coefficient || 1;
            Object.entries(bySubjectByStudent[sId]).forEach(([stuId, avg]) => {
                if (!studentTotals[stuId]) studentTotals[stuId] = { points: 0, coef: 0 };
                studentTotals[stuId].points += (avg as number) * subjectCoef;
                studentTotals[stuId].coef += subjectCoef;
            });
        });

        const studentAvgsList = Object.values(studentTotals)
            .filter(s => s.coef > 0)
            .map(s => s.points / s.coef)
            .sort((a, b) => b - a);

        const generalAverage = totalCoef > 0 ? (totalPoints / totalCoef) : 0;
        // Trouver le rang : on cherche la première moyenne <= la nôtre.
        // (indexOf sur une comparaison stricte de float est fragile, on utilise findIndex.)
        const overallRank =
            studentAvgsList.findIndex(avg => Math.abs(avg - generalAverage) < 0.001) + 1;
        const totalStudents = studentAvgsList.length;

        res.json({
            status: 'success',
            bulletin: {
                settings: {
                    logo: settings.logo_url || settings.logo || null,
                    stamp: settings.stamp_url || settings.stamp || null,
                    school_name: settings.school_name || settings.platform_name || 'Smart School'
                },
                eleve: {
                    id: eleveId,
                    nom: student.nom || '',
                    prenom: student.prenom || '',
                    matricule: student.matricule || '',
                    date_naissance: student.date_naissance ? new Date(student.date_naissance).toLocaleDateString('fr-FR') : '',
                    genre: student.genre || 'M',
                    classe_nom: student.classe_nom,
                    niveau: student.classe_niveau,
                    redoublant: !!student.redoublant,
                },
                term: term,
                year: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
                lignes: gradesBySubject,
                moyenne_generale: generalAverage.toFixed(2),
                overall_rank: totalStudents > 0 ? `${overallRank}/${totalStudents}` : '-',
                date_generation: new Date().toISOString()
            }
        });

    } catch (err: any) {
        console.error('Error in GET /bulletins:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
