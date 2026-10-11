export type UserRole = 'admin' | 'teacher';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  managedClassIds?: string[]; // Pour les professeurs
  createdAt: number;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  parentEmail?: string;
  birthDate?: string;
  photoUrl?: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  teacherIds: string[];
  year: string;
}

export interface GradeEntry {
  id?: string;
  studentId: string;
  teacherId: string;
  subject: string;
  value: number;
  maxGrade: number;
  timestamp: number;
  term?: string; // Trimestre 1, 2, 3
  ocrMetadata?: {
    confidence: number;
    extractedAt: number;
  };
}

export interface Subject {
  id: string;
  name: string;
  coefficient: number;
}
