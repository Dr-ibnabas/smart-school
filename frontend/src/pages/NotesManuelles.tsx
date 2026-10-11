import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save,
    Users,
    BookOpen,
    ChevronDown,
    CheckCircle,
    AlertCircle,
    Loader2,
    Search,
    Filter,
    ArrowRight,
    Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
    classeService, 
    matiereService, 
    eleveService, 
    noteService 
} from '../services/api';

interface Student {
    id: string;
    nom: string;
    prenom: string;
    matricule: string;
}

interface GradeEntry {
    studentId: string;
    studentName: string;
    grade1: string;
    grade2: string;
    grade3: string;
}

const NotesManuelles = () => {
    const { user } = useAuth();
    
    // Selection state
    const [classes, setClasses] = useState<any[]>([]);
    const [matieres, setMatieres] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('Trimestre 1');
    
    // Data state
    const [entries, setEntries] = useState<GradeEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // Fetch initial data
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [classesRes, matieresRes] = await Promise.all([
                    classeService.getAll(),
                    matiereService.getAll()
                ]);
                setClasses(classesRes.data || []);
                setMatieres(matieresRes.data || []);
            } catch (err) {
                console.error("Error fetching metadata:", err);
                setError("Impossible de charger les classes ou les matières.");
            }
        };
        fetchMetadata();
    }, []);

    // Load students and existing grades when selection changes
    const loadGradesGrid = async () => {
        if (!selectedClassId || !selectedSubjectId) return;
        
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        try {
            // Get all students in class
            const studentsRes = await eleveService.getAll(selectedClassId);
            const students: Student[] = studentsRes.data || [];
            
            // Get existing grades for this class/subject/term
            const gradesRes = await noteService.getByClass(selectedClassId, selectedSubjectId, selectedTerm);
            const existingGrades = gradesRes.data || [];
            
            // Map students to entries
            const newEntries = students.map(student => {
                const existing = existingGrades.find((g: any) => g.studentId === student.id);
                return {
                    studentId: student.id,
                    studentName: `${student.prenom} ${student.nom}`,
                    grade1: existing?.grade1?.toString() || '',
                    grade2: existing?.grade2?.toString() || '',
                    grade3: existing?.grade3?.toString() || ''
                };
            });
            
            setEntries(newEntries);
        } catch (err) {
            console.error("Error loading grades grid:", err);
            setError("Erreur lors du chargement de la liste des élèves.");
        } finally {
            setLoading(false);
        }
    };

    const handleGradeChange = (studentId: string, field: 'grade1' | 'grade2' | 'grade3', value: string) => {
        // Validate numeric value between 0 and 20 (or empty)
        if (value !== '' && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 20)) {
            return;
        }
        
        setEntries(prev => prev.map(entry => 
            entry.studentId === studentId ? { ...entry, [field]: value } : entry
        ));
    };

    const handleSave = async () => {
        if (!selectedClassId || !selectedSubjectId || !selectedTerm) return;
        
        setSaving(true);
        setError(null);
        setSuccess(null);
        
        try {
            const dataToSave = {
                metadata: {
                    classId: selectedClassId,
                    subjectId: selectedSubjectId,
                    term: selectedTerm,
                    teacherId: user?.uid
                },
                grades: entries.map(e => ({
                    studentId: e.studentId,
                    grade1: e.grade1 === '' ? null : Number(e.grade1),
                    grade2: e.grade2 === '' ? null : Number(e.grade2),
                    grade3: e.grade3 === '' ? null : Number(e.grade3)
                }))
            };
            
            await noteService.saveBatch(dataToSave);
            setSuccess("Toutes les notes ont été enregistrées avec succès !");
            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            console.error("Error saving grades:", err);
            setError("Échec de l'enregistrement des notes.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title mb-1">
                        <div className="page-title-icon">
                            <Edit3 className="text-primary" size={20} />
                        </div>
                        Saisie manuelle des notes
                    </h1>
                    <p className="page-subtitle">
                        Saisis les notes directement dans la grille pour un traitement rapide.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={loadGradesGrid}
                        disabled={!selectedClassId || !selectedSubjectId || loading}
                        className="btn-secondary"
                    >
                        <Search size={16} />
                        Charger la liste
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={entries.length === 0 || saving}
                        className="btn-primary"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Enregistrer tout
                    </button>
                </div>
            </div>

            {/* Notifications */}
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex items-center">
                        <AlertCircle className="mr-3" size={20} />
                        <span className="font-bold">{error}</span>
                    </motion.div>
                )}
                {success && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="p-4 bg-green-50 border border-green-100 text-green-700 rounded-2xl flex items-center">
                        <CheckCircle className="mr-3" size={20} />
                        <span className="font-bold">{success}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="surface p-4 space-y-2">
                    <label className="flex items-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <Users size={12} className="mr-1.5" /> Classe
                    </label>
                    <div className="relative">
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="input cursor-pointer pr-9"
                        >
                            <option value="">Sélectionner une classe</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.nom || c.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="surface p-4 space-y-2">
                    <label className="flex items-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <BookOpen size={12} className="mr-1.5" /> Matière
                    </label>
                    <div className="relative">
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            className="input cursor-pointer pr-9"
                        >
                            <option value="">Sélectionner une matière</option>
                            {matieres.map(m => <option key={m.id} value={m.id}>{m.name || m.nom}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="surface p-4 space-y-2">
                    <label className="flex items-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <Filter size={12} className="mr-1.5" /> Trimestre
                    </label>
                    <div className="relative">
                        <select
                            value={selectedTerm}
                            onChange={(e) => setSelectedTerm(e.target.value)}
                            className="input cursor-pointer pr-9"
                        >
                            <option value="Trimestre 1">Trimestre 1</option>
                            <option value="Trimestre 2">Trimestre 2</option>
                            <option value="Trimestre 3">Trimestre 3</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>
            </div>

            {/* Grades Grid */}
            <div className="surface overflow-hidden min-h-[320px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[320px]">
                        <Loader2 className="animate-spin text-primary mb-3" size={28} />
                        <p className="text-slate-400 text-sm font-medium">Chargement des élèves…</p>
                    </div>
                ) : entries.length > 0 ? (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/70 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 table-head">Élève</th>
                                    <th className="px-3 py-3 table-head text-center">Note 1 /20</th>
                                    <th className="px-3 py-3 table-head text-center">Note 2 /20</th>
                                    <th className="px-3 py-3 table-head text-center">Note 3 /20</th>
                                    <th className="px-4 py-3 table-head text-primary text-center">Moyenne</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {entries.map((entry) => {
                                    const n1 = entry.grade1 === '' ? NaN : Number(entry.grade1);
                                    const n2 = entry.grade2 === '' ? NaN : Number(entry.grade2);
                                    const n3 = entry.grade3 === '' ? NaN : Number(entry.grade3);

                                    const presentNotes = [n1, n2, n3].filter(n => !isNaN(n));
                                    const average = presentNotes.length > 0
                                        ? (presentNotes.reduce((a, b) => a + b, 0) / presentNotes.length).toFixed(2)
                                        : '-';

                                    return (
                                        <tr key={entry.studentId} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-sm text-slate-800">{entry.studentName}</div>
                                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID : {(entry.studentId || '').toString().substring(0, 8)}</div>
                                            </td>
                                            {(['grade1', 'grade2', 'grade3'] as const).map(field => (
                                                <td key={field} className="px-3 py-3">
                                                    <input
                                                        type="text"
                                                        value={entry[field]}
                                                        onChange={(e) => handleGradeChange(entry.studentId, field, e.target.value)}
                                                        placeholder="-"
                                                        aria-label={`${entry.studentName} — ${field}`}
                                                        className="w-16 mx-auto block text-center py-1.5 bg-slate-50 border border-slate-100 rounded-lg font-semibold text-sm text-slate-800 focus:ring-2 focus:ring-primary/15 focus:border-primary/40 outline-none transition-all placeholder:text-slate-300"
                                                    />
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-bold ${
                                                    average === '-' ? 'bg-slate-100 text-slate-400' :
                                                    Number(average) >= 10 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                                }`}>
                                                    {average}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[320px] text-center p-6">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-3">
                            <Users size={24} />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-700">Aucun résultat à afficher</h3>
                        <p className="text-slate-400 text-xs mt-1 max-w-xs">
                            Sélectionne une classe et une matière ci-dessus, puis clique sur « Charger la liste ».
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesManuelles;
