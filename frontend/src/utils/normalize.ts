/**
 * Helpers pour normaliser les conventions de nommage entre le backend MySQL
 * (snake_case : class_id, student_id, subject_id) et l'ancien code frontend
 * (camelCase : classId, studentId, subjectId). À utiliser dans les pages
 * pour éviter les bugs subtils où l'une des deux clés est absente.
 *
 * Idéalement, à terme, on n'expose plus que le snake_case du backend.
 */

/** Récupère l'id de classe d'un objet, peu importe la casse. */
export const getClassId = (o: any): string | number | null | undefined =>
  o?.class_id ?? o?.classId ?? null;

/** Récupère l'id d'élève d'un objet, peu importe la casse. */
export const getStudentId = (o: any): string | number | null | undefined =>
  o?.student_id ?? o?.studentId ?? null;

/** Récupère l'id de matière d'un objet, peu importe la casse. */
export const getSubjectId = (o: any): string | number | null | undefined =>
  o?.subject_id ?? o?.subjectId ?? null;

/** Récupère l'id d'enseignant d'un objet, peu importe la casse. */
export const getTeacherId = (o: any): string | number | null | undefined =>
  o?.teacher_id ?? o?.teacherId ?? null;

/**
 * Compare deux ids en string pour éviter les pièges 1 vs "1" / null vs ""
 * (les backends renvoient parfois des nombres, parfois des strings).
 */
export const sameId = (
  a: string | number | null | undefined,
  b: string | number | null | undefined
): boolean => {
  if (a == null || b == null) return false;
  return String(a) === String(b);
};

/**
 * Normalise une entrée objet en s'assurant que les deux variantes existent
 * (utile quand on poste à un backend dont l'API n'est pas tranchée).
 */
export const withClassId = <T extends Record<string, any>>(o: T): T => {
  const id = getClassId(o);
  return { ...o, class_id: id, classId: id };
};
