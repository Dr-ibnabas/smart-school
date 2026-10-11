import { z } from 'zod';

// Helper : transforme '' / undefined en null pour les FK optionnelles.
const optionalId = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform(v => {
    if (v === null || v === undefined || v === '') return null;
    return v;
  });

// ============================================================
// AUTH
// ============================================================
export const LoginSchema = z.object({
  // On accepte email OU matricule sans contraindre le format — le backend
  // matche les deux en SQL.
  email: z.string().min(1, 'Identifiant requis').max(120),
  password: z.string().min(1, 'Mot de passe requis').max(200),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// ============================================================
// CLASSES
// ============================================================
export const ClassCreateSchema = z.object({
  nom: z.string().trim().min(1).max(100).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  niveau: z.string().trim().max(50).optional(),
  level: z.string().trim().max(50).optional(),
}).refine(
  d => !!(d.nom || d.name),
  { message: 'Le nom de la classe est requis', path: ['nom'] }
);

// ============================================================
// SUBJECTS (MATIÈRES)
// ============================================================
export const SubjectCreateSchema = z.object({
  nom: z.string().trim().min(1).max(100).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  coefficient: z.coerce.number().min(0).max(20).optional(),
}).refine(
  d => !!(d.nom || d.name),
  { message: 'Le nom de la matière est requis', path: ['nom'] }
);

// ============================================================
// STUDENTS (ÉLÈVES)
// ============================================================
export const StudentCreateSchema = z.object({
  matricule: z.string().trim().min(1).max(50),
  nom: z.string().trim().min(1).max(100),
  prenom: z.string().trim().min(1).max(100),
  genre: z.enum(['M', 'F']).optional().default('M'),
  class_id: optionalId,
  classId: optionalId,
  redoublant: z.coerce.boolean().optional().default(false),
});

export const StudentBatchSchema = z.array(StudentCreateSchema).min(1).max(500);

// ============================================================
// USERS (ENSEIGNANTS / ADMINS)
// ============================================================
export const UserCreateSchema = z.object({
  email: z.string().email('E-mail invalide').max(120),
  matricule: z.string().trim().max(50).optional(),
  password: z.string().min(6).max(200).optional(), // si absent, le backend en génère un
  role: z.enum(['admin', 'prof']).optional().default('prof'),
  firstname: z.string().trim().max(100).optional(),
  lastname: z.string().trim().max(100).optional(),
  nom: z.string().trim().max(100).optional(),
  prenom: z.string().trim().max(100).optional(),
  subject: z.union([z.string(), z.number(), z.null()]).optional(),
  classes: z.array(z.union([z.string(), z.number()])).optional().default([]),
});

export const UserUpdateSchema = UserCreateSchema.partial();

// ============================================================
// GRADES (NOTES)
// ============================================================
const GradeNumber = z.union([z.coerce.number().min(0).max(20), z.null(), z.undefined()])
  .transform(v => (v === undefined ? null : v));

export const GradeBatchItemSchema = z.object({
  student_id: optionalId,
  studentId: optionalId,
  grade1: GradeNumber.optional(),
  grade2: GradeNumber.optional(),
  grade3: GradeNumber.optional(),
});

export const GradeBatchSchema = z.object({
  grades: z.array(GradeBatchItemSchema).min(1).max(500),
  metadata: z.object({
    class_id: optionalId,
    classId: optionalId,
    subject_id: optionalId,
    subjectId: optionalId,
    term: z.string().trim().min(1).max(50),
    teacher_id: optionalId.optional(),
    teacherId: optionalId.optional(),
  }),
}).refine(
  d => !!(d.metadata.class_id || d.metadata.classId),
  { message: 'class_id ou classId requis', path: ['metadata', 'class_id'] }
).refine(
  d => !!(d.metadata.subject_id || d.metadata.subjectId),
  { message: 'subject_id ou subjectId requis', path: ['metadata', 'subject_id'] }
);

// ============================================================
// ABSENCES
// ============================================================
export const AbsenceCreateSchema = z.object({
  studentId: optionalId.optional(),
  student_id: optionalId.optional(),
  classId: optionalId.optional(),
  class_id: optionalId.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format attendu : YYYY-MM-DD'),
  statut: z.enum(['absent', 'retard', 'justifié', 'present']).optional(),
  type: z.string().optional(), // legacy
  motif: z.string().max(255).optional().default(''),
  reason: z.string().max(255).optional(), // legacy
  isJustified: z.union([z.boolean(), z.literal('true'), z.literal('false')]).optional(),
}).refine(
  d => !!(d.studentId || d.student_id),
  { message: 'studentId requis', path: ['studentId'] }
).refine(
  d => !!(d.classId || d.class_id),
  { message: 'classId requis', path: ['classId'] }
);

// ============================================================
// CONTACT / OCR / SETTINGS / TIMETABLE — schémas légers
// ============================================================
export const AnalyzeSchema = z.object({
  image: z.string().min(20, 'Image (data-URL base64) requise'),
  teacherId: z.union([z.string(), z.number()]).optional(),
});
