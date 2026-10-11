/**
 * URL de base du backend Smart School (Express + MySQL).
 *
 * - En dev : par défaut http://localhost:3001 (utilisé par le proxy Vite aussi).
 * - En prod : doit être défini via VITE_API_URL (ex: https://api.smartschool.example).
 *   Si VITE_API_URL est vide en prod, on suppose un déploiement same-origin
 *   (frontend et backend servis sur le même domaine).
 *
 * UNIQUE source de vérité — ne pas redéfinir ailleurs.
 */
export const BACKEND_URL: string =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '' : 'http://localhost:3001');


const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('smartschool_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        let err;
        try {
            err = await response.json();
        } catch(e) {
            err = { error: response.statusText };
        }
        throw new Error(err.error || 'Erreur API');
    }

    return response.json();
};

export const analyzeGrade = async (imageData: string, teacherId: string): Promise<any> => {
    return await apiFetch('/api/analyze-and-save', {
        method: 'POST',
        body: JSON.stringify({ image: imageData, teacherId })
    });
};

export const fetchClassStudents = async (classId: string): Promise<any[]> => {
    const res = await apiFetch(`/api/students`);
    const students = res.data.filter((s:any) => String(s.class_id) === String(classId) || String(s.classId) === String(classId));
    return students;
};

export const authService = {
    login: async (identifier: string, password: string) => {
        // Le backend accepte email OU matricule directement dans le champ email
        // On envoie l'identifiant tel quel — pas de transformation
        return apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: identifier, password })
        });
    },
    logout: () => {
        localStorage.removeItem('smartschool_token');
        localStorage.removeItem('smartschool_user');
    },
    checkStatus: async () => {
        return { status: 'online', mode: 'mysql' };
    }
};

export interface EleveListOptions {
    classeId?: string | number | null;
    page?: number;
    perPage?: number;
    q?: string;
}

export const eleveService = {
    /**
     * Liste paginée des élèves. Sans paramètres → comportement legacy (tous les élèves,
     * filtre côté client par classeId si fourni).
     * Avec `perPage` → pagination serveur (recommandé pour > 200 élèves).
     */
    getAll: async (opts: EleveListOptions | string | number | null = null) => {
        // Compat ascendante : si on passe un id de classe directement, on rentre
        // dans le mode legacy.
        const options: EleveListOptions = (opts && typeof opts === 'object')
            ? opts
            : { classeId: opts as any };

        const qs = new URLSearchParams();
        if (options.classeId) qs.set('class_id', String(options.classeId));
        if (options.page) qs.set('page', String(options.page));
        if (options.perPage) qs.set('per_page', String(options.perPage));
        if (options.q) qs.set('q', options.q);

        const qsStr = qs.toString();
        const studentsUrl = qsStr ? `/api/students?${qsStr}` : '/api/students';

        const [studentsRes, classesRes] = await Promise.all([
            apiFetch(studentsUrl),
            apiFetch('/api/classes')
        ]);

        let students = studentsRes.data;
        // Filtre client uniquement quand on n'a pas passé class_id au serveur.
        if (options.classeId && !qs.has('class_id')) {
            students = students.filter((s: any) =>
                String(s.class_id) === String(options.classeId) ||
                String(s.classId) === String(options.classeId)
            );
        }

        return {
            status: 'success',
            data: students,
            eleves: students,
            classes: classesRes.data || [],
            pagination: studentsRes.pagination,
        };
    },
    create: async (eleveData: any) => {
        return apiFetch('/api/students', { method: 'POST', body: JSON.stringify(eleveData) });
    },
    createMultiple: async (elevesData: any[]) => {
        return apiFetch('/api/students/batch', { method: 'POST', body: JSON.stringify(elevesData) });
    },
    update: async (id: string, eleveData: any) => {
        return apiFetch(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(eleveData) });
    },
    delete: async (id: string) => {
        return apiFetch(`/api/students/${id}`, { method: 'DELETE' });
    }
};

export const ocrService = {
    processImage: async (imageFile: File) => {
        const base64Content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });

        const result = await analyzeGrade(base64Content, '');
        return {
            status: 'success',
            data: {
                eleves: result.eleves || [],
                raw: result.rawExtract || ''
            }
        };
    }
};

export const classeService = {
    getAll: async () => {
        return apiFetch('/api/classes');
    },
    create: async (data: any) => {
        return apiFetch('/api/classes', { method: 'POST', body: JSON.stringify(data) });
    },
    update: async (id: string, data: any) => {
        return apiFetch(`/api/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    delete: async (id: string) => {
        return apiFetch(`/api/classes/${id}`, { method: 'DELETE' });
    }
};

export const matiereService = {
    getAll: async () => {
        return apiFetch('/api/subjects');
    },
    create: async (data: any) => {
        return apiFetch('/api/subjects', { method: 'POST', body: JSON.stringify(data) });
    },
    update: async (id: string, data: any) => {
        return apiFetch(`/api/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    delete: async (id: string) => {
        return apiFetch(`/api/subjects/${id}`, { method: 'DELETE' });
    }
};

export const enseignantService = {
    getAll: async () => {
        const res = await apiFetch('/api/users');
        const teachers = res.data.filter((u: any) => u.role === 'prof');
        const subs = await apiFetch('/api/subjects');
        const subjectList = subs.data;
        const subjectsMap: any = {};
        subjectList.forEach((s: any) => { subjectsMap[s.id] = s.nom; });

        const mappedTeachers = teachers.map((t: any) => ({
            ...t,
            matiere_nom: subjectsMap[t.subject] || 'Non assigné'
        }));
        return { status: 'success', data: mappedTeachers, enseignants: mappedTeachers, matieres: subjectList };
    },
    getAssignments: async (profId: string) => {
        const res = await apiFetch('/api/users');
        const user = res.data.find((u: any) => String(u.id) === String(profId));
        if (user) {
            return { 
                status: 'success', 
                data: {
                    classes: user.classes || [],
                    subjects: user.subject ? [user.subject] : []
                },
                class_ids: user.classes || []
            };
        }
        return { status: 'success', data: { classes: [], subjects: [] }, class_ids: [] };
    },
    create: async (data: any) => {
        const postData = {
            ...data,
            subject: data.subjects ? data.subjects[0] : null,
            classes: data.assignments || [],
            role: 'prof'
        };
        return apiFetch('/api/users', { method: 'POST', body: JSON.stringify(postData) });
    },
    update: async (id: string, data: any) => {
        const postData = {
            ...data,
            subject: data.subjects ? data.subjects[0] : null,
            classes: data.assignments || []
        };
        return apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(postData) });
    },
    delete: async (id: string) => {
        return apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    },
    assignClasses: async (teacherId: string, classIds: string[]) => {
        const res = await apiFetch('/api/users');
        const user = res.data.find((u: any) => String(u.id) === String(teacherId));
        if(user) {
            return apiFetch(`/api/users/${teacherId}`, { 
                method: 'PUT', 
                body: JSON.stringify({ ...user, classes: classIds }) 
            });
        }
        return { status: 'error' };
    },
    getDashboardStats: async (profId: string) => {
        const res = await apiFetch('/api/users');
        const user = res.data.find((u: any) => String(u.id) === String(profId));
        if (!user) return { status: 'success', stats: { classes: 0, students: 0, subjects: 0 } };
        
        const classIds = user.classes || [];
        const subjects = user.subject ? [user.subject] : [];
        
        let studentsCount = 0;
        if (classIds.length > 0) {
            const studentsRes = await apiFetch('/api/students');
            studentsRes.data.forEach((sDoc: any) => {
                if (classIds.includes(String(sDoc.class_id)) || classIds.includes(String(sDoc.classId))) studentsCount++;
            });
        }
        return {
            status: 'success',
            stats: {
                classes: classIds.length,
                subjects: subjects.length,
                students: studentsCount
            }
        };
    },
    getMyClasses: async (profId: string) => {
        const res = await apiFetch('/api/users');
        const user = res.data.find((u: any) => String(u.id) === String(profId));
        if (!user) return { status: 'success', classes: [] };
        
        const classIds = user.classes || [];
        if (classIds.length === 0) return { status: 'success', classes: [] };
        
        const classes: any[] = [];
        const studentsRes = await apiFetch('/api/students');
        const classesRes = await apiFetch('/api/classes');
        
        const studentCounts: any = {};
        studentsRes.data.forEach((sDoc: any) => {
            const cId = sDoc.class_id || sDoc.classId;
            studentCounts[cId] = (studentCounts[cId] || 0) + 1;
        });
        
        const teacherSubjectsCount = user.subject ? 1 : 0;
        
        classesRes.data.forEach((cDoc: any) => {
            if (classIds.includes(String(cDoc.id))) {
                classes.push({
                    id: cDoc.id,
                    nom: cDoc.nom || '',
                    niveau: cDoc.niveau || 'Général',
                    student_count: studentCounts[cDoc.id] || 0,
                    subject_count: teacherSubjectsCount
                });
            }
        });
        return { status: 'success', classes };
    }
};

export const noteService = {
    getAll: async () => {
        return apiFetch('/api/grades');
    },
    getByClass: async (classId: string, subjectId: string, term = 'Trimestre 1') => {
        return apiFetch(`/api/grades/${classId}/${subjectId}/${term}`);
    },
    saveBatch: async (data: any) => {
        return apiFetch('/api/grades/batch', { method: 'POST', body: JSON.stringify(data) });
    },
    create: async (data: any) => {
        return apiFetch('/api/grades', { method: 'POST', body: JSON.stringify(data) });
    },
    delete: async (id: string) => {
        return apiFetch(`/api/grades/${id}`, { method: 'DELETE' });
    }
};

export const bulletinService = {
    getBulletin: async (eleveId: string, term: string) => {
        return apiFetch(`/api/bulletins/${eleveId}/${term}`);
    }
};

export const userService = {
    getAll: async () => {
        return apiFetch('/api/users');
    },
    create: async (userData: any) => {
        return apiFetch('/api/users', { method: 'POST', body: JSON.stringify(userData) });
    },
    update: async (id: string, data: any) => {
        return apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    delete: async (id: string) => {
        return apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    },
    resetPassword: async () => {
        return { status: 'success', message: "Action non supportée côté client." };
    }
};

export const settingsService = {
    get: async () => {
        const res = await apiFetch('/api/settings');
        const d = res.data || {};
        // Normalise logo/stamp (backend expose les deux: logo_url et logo)
        const normalized = {
            ...d,
            logo:  d.logo  || d.logo_url  || null,
            stamp: d.stamp || d.stamp_url || null
        };
        return { status: 'success', settings: normalized, ...normalized };
    },
    update: async (data: any) => {
        return apiFetch('/api/settings', { method: 'POST', body: JSON.stringify(data) });
    },
    uploadLogo: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('smartschool_token');
        const response = await fetch(`${BACKEND_URL}/api/upload/settings/logo`, {
            method: 'POST',
            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: formData
        });
        const res = await response.json();
        return { status: 'success', url: res.url };
    },
    uploadStamp: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('smartschool_token');
        const response = await fetch(`${BACKEND_URL}/api/upload/settings/stamp`, {
            method: 'POST',
            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: formData
        });
        const res = await response.json();
        return { status: 'success', url: res.url };
    }
};

export const superAdminService = {
    listSchools: async () => apiFetch('/api/super-admin/schools'),
    getSchool:   async (id: string | number) => apiFetch(`/api/super-admin/schools/${id}`),
    createSchool: async (data: any) =>
        apiFetch('/api/super-admin/schools', { method: 'POST', body: JSON.stringify(data) }),
    updateSchool: async (id: string | number, data: any) =>
        apiFetch(`/api/super-admin/schools/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSchool: async (id: string | number) =>
        apiFetch(`/api/super-admin/schools/${id}`, { method: 'DELETE' }),
    updateTheme: async (id: string | number, theme: any) =>
        apiFetch(`/api/super-admin/schools/${id}/theme`, { method: 'PUT', body: JSON.stringify(theme) }),
    listUsersOfSchool: async (id: string | number) =>
        apiFetch(`/api/super-admin/schools/${id}/users`),
    createAdmin: async (schoolId: string | number, data: any) =>
        apiFetch(`/api/super-admin/schools/${schoolId}/admins`, { method: 'POST', body: JSON.stringify(data) }),
    resetPassword: async (userId: string | number) =>
        apiFetch(`/api/super-admin/users/${userId}/reset-password`, { method: 'POST' }),
    deleteUser: async (userId: string | number) =>
        apiFetch(`/api/super-admin/users/${userId}`, { method: 'DELETE' }),
    impersonate: async (userId: string | number) =>
        apiFetch(`/api/super-admin/users/${userId}/impersonate`, { method: 'POST' }),
    stats: async () => apiFetch('/api/super-admin/stats'),
};

export const schoolPublicService = {
    getByCode: async (code: string) => apiFetch(`/api/schools/by-code/${encodeURIComponent(code)}/public`),
};

export const importService = {
    importEleves: async (studentsArray: any[]) => {
        const res = await apiFetch('/api/students/batch', { method: 'POST', body: JSON.stringify(studentsArray) });
        return { status: 'success', message: `${res.count} élèves importés.` };
    }
};

export const dashboardService = {
    getStats: async () => {
        try {
            const [students, users, classes, subjects] = await Promise.all([
                apiFetch('/api/students').catch(() => ({ data: [] })),
                apiFetch('/api/users').catch(() => ({ data: [] })),
                apiFetch('/api/classes').catch(() => ({ data: [] })),
                apiFetch('/api/subjects').catch(() => ({ data: [] }))
            ]);

            return {
                status: 'success',
                data: {
                    students: students.data.length,
                    teachers: users.data.filter((u:any) => u.role === 'prof').length,
                    classes: classes.data.length,
                    subjects: subjects.data.length
                }
            };
        } catch (error) {
            console.error("Dashboard stats error:", error);
            return { status: 'error', data: {} };
        }
    }
};

export const absenceService = {
    getAllByDate: async (classId: string, date: string) => {
        const res = await apiFetch('/api/absences');
        const data = res.data.filter((a:any) => String(a.class_id || a.classId) === String(classId) && a.date === date);
        return { status: 'success', data };
    },
    saveBatch: async (data: { classId: string, date: string, absences: any[] }) => {
        return apiFetch('/api/absences/batch', {
            method: 'POST',
            body: JSON.stringify({
                classId:  data.classId,
                date:     data.date,
                absences: data.absences.map(abs => ({
                    studentId: abs.studentId || abs.student_id,
                    statut:    abs.statut || 'absent',
                    motif:     abs.motif || ''
                }))
            })
        });
    },
    getMonthlyStats: async (classId: string, monthPrefix: string) => {
        const res = await apiFetch('/api/absences');
        const data = res.data.filter((a:any) => String(a.class_id || a.classId) === String(classId) && String(a.date).startsWith(monthPrefix));
        return { status: 'success', data };
    }
};

export const emploiDuTempsService = {
    getByClass: async (classId: string) => {
        const res = await apiFetch(`/api/timetables/class/${classId}`);
        const schedule: Record<string, Record<string, { matiereId: string, enseignantId: string }>> = {};
        
        res.data.forEach((row: any) => {
            const day = row.day_of_week;
            const slot = `${row.start_time} - ${row.end_time}`;
            if (!schedule[day]) schedule[day] = {};
            schedule[day][slot] = {
                matiereId: String(row.subject_id),
                enseignantId: String(row.teacher_id || '')
            };
        });

        return { status: 'success', data: { schedule } }; 
    },
    save: async (classId: string, schedule: any) => {
        return apiFetch(`/api/timetables/save-batch/${classId}`, { 
            method: 'POST', 
            body: JSON.stringify(schedule) 
        });
    }
};

export default {
    analyzeGrade,
    fetchClassStudents,
    absenceService,
    emploiDuTempsService
};
