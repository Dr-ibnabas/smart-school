import React, { useState, useEffect } from 'react';
import { 
    CalendarDays, 
    Save, 
    Check, 
    X, 
    Clock, 
    FileWarning, 
    Search,
    BarChart3,
    ListTodo
} from 'lucide-react';
import { classeService, eleveService, absenceService } from '../services/api';
import toast from 'react-hot-toast';

const Absences = () => {
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [students, setStudents] = useState<any[]>([]);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [absencesState, setAbsencesState] = useState<Record<string, { statut: string, motif: string }>>({});
    const [loading, setLoading] = useState(false);
    
    // Tabs: 'pointage' ou 'mensuel'
    const [activeTab, setActiveTab] = useState<'pointage' | 'mensuel'>('pointage');
    const [monthPrefix, setMonthPrefix] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [monthlyStats, setMonthlyStats] = useState<any[]>([]);

    useEffect(() => {
        loadClasses();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            loadStudents();
            if (activeTab === 'pointage') {
                loadDailyAbsences();
            } else {
                loadMonthlyAbsences();
            }
        }
    }, [selectedClass, date, activeTab, monthPrefix]);

    const loadClasses = async () => {
        try {
            const res = await classeService.getAll();
            setClasses(res.data || []);
            if (res.data && res.data.length > 0) {
                setSelectedClass(res.data[0].id);
            }
        } catch (error) {
            toast.error("Erreur lors du chargement des classes");
        }
    };

    const loadStudents = async () => {
        try {
            const res = await eleveService.getAll(selectedClass);
            setStudents(res.data || []);
        } catch (error) {
            toast.error("Erreur lors du chargement des élèves");
        }
    };

    const loadDailyAbsences = async () => {
        try {
            setLoading(true);
            const res = await absenceService.getAllByDate(selectedClass, date);
            const absData = res.data || [];
            
            const newState: Record<string, { statut: string, motif: string }> = {};
            absData.forEach((abs: any) => {
                newState[abs.studentId] = { statut: abs.statut, motif: abs.motif || '' };
            });
            setAbsencesState(newState);
        } catch (error) {
            toast.error("Erreur lors du chargement des absences");
        } finally {
            setLoading(false);
        }
    };

    const loadMonthlyAbsences = async () => {
        try {
            setLoading(true);
            const res = await absenceService.getMonthlyStats(selectedClass, monthPrefix);
            setMonthlyStats(res.data || []);
        } catch (error) {
            toast.error("Erreur lors du chargement des statistiques");
        } finally {
            setLoading(false);
        }
    };

    const handleStatutChange = (studentId: string, statut: string) => {
        setAbsencesState(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], statut, motif: prev[studentId]?.motif || '' }
        }));
    };

    const handleMotifChange = (studentId: string, motif: string) => {
        setAbsencesState(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], motif, statut: prev[studentId]?.statut || 'absent' }
        }));
    };

    const saveAbsences = async () => {
        try {
            setLoading(true);
            const payload = students.map(s => {
                const sState = absencesState[s.id] || { statut: 'present', motif: '' };
                return {
                    studentId: s.id,
                    statut: sState.statut,
                    motif: sState.motif
                };
            }).filter(s => s.statut !== 'present'); // Optionally we can only save non-present states to save DB space

            await absenceService.saveBatch({
                classId: selectedClass,
                date,
                absences: payload
            });
            toast.success("Pointage enregistré avec succès");
            loadDailyAbsences();
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de l'enregistrement");
        } finally {
            setLoading(false);
        }
    };

    const getStudentMonthlySummary = (studentId: string) => {
        let abs = 0;
        let retards = 0;
        let justifie = 0;

        monthlyStats.forEach(record => {
            if (record.studentId === studentId) {
                if (record.statut === 'absent') abs++;
                if (record.statut === 'retard') retards++;
                if (record.statut === 'justifie') justifie++;
            }
        });

        return { abs, retards, justifie };
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Le <Toaster /> est déjà monté globalement dans main.tsx — pas de doublon ici. */}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="page-title mb-1">
                        <div className="page-title-icon">
                            <ListTodo className="text-primary" size={20} />
                        </div>
                        Absences
                    </h1>
                    <p className="page-subtitle">Pointage journalier et bilan mensuel des absences et retards.</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('pointage')}
                        className={`flex items-center px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${activeTab === 'pointage' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ListTodo size={14} className="mr-1.5" />
                        Pointage
                    </button>
                    <button
                        onClick={() => setActiveTab('mensuel')}
                        className={`flex items-center px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${activeTab === 'mensuel' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BarChart3 size={14} className="mr-1.5" />
                        Bilan mensuel
                    </button>
                </div>
            </div>

            {/* Filtres */}
            <div className="surface p-4 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Classe</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="input cursor-pointer"
                    >
                        {classes.length === 0 ? <option value="">Aucune classe</option> : null}
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name || c.nom}</option>
                        ))}
                    </select>
                </div>

                {activeTab === 'pointage' ? (
                    <div className="flex-1 min-w-[180px]">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                        <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="input pl-9"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 min-w-[180px]">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Mois</label>
                        <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            <input
                                type="month"
                                value={monthPrefix}
                                onChange={(e) => setMonthPrefix(e.target.value)}
                                className="input pl-9"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Vue Pointage Journalier */}
            {activeTab === 'pointage' && (
                <div className="surface overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b border-slate-100">
                        <h2 className="text-sm font-bold text-slate-800">Liste d'appel</h2>
                        <button
                            onClick={saveAbsences}
                            disabled={loading}
                            className="btn-primary"
                        >
                            <Save size={16} />
                            {loading ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                    {students.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Aucun élève trouvé dans cette classe.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 rounded-tl-lg">Élève</th>
                                        <th scope="col" className="px-6 py-4">Statut</th>
                                        <th scope="col" className="px-6 py-4 rounded-tr-lg">Motif (si justifié/retard)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student) => {
                                        const state = absencesState[student.id] || { statut: 'present', motif: '' };
                                        
                                        return (
                                            <tr key={student.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                                        {student.prenom.charAt(0)}{student.nom.charAt(0)}
                                                    </div>
                                                    {student.nom} {student.prenom}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleStatutChange(student.id, 'present')}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${state.statut === 'present' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                        >
                                                            <Check size={14} /> Présent
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStatutChange(student.id, 'absent')}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${state.statut === 'absent' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                        >
                                                            <X size={14} /> Absent
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStatutChange(student.id, 'retard')}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${state.statut === 'retard' ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                        >
                                                            <Clock size={14} /> Retard
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStatutChange(student.id, 'justifie')}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${state.statut === 'justifie' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                        >
                                                            <FileWarning size={14} /> Justifié
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {(state.statut === 'justifie' || state.statut === 'retard' || state.statut === 'absent') && (
                                                        <input 
                                                            type="text" 
                                                            placeholder="Préciser le motif..."
                                                            value={state.motif}
                                                            onChange={(e) => handleMotifChange(student.id, e.target.value)}
                                                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg focus:ring-primary focus:border-primary px-3 py-2"
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Vue Mensuelle */}
            {activeTab === 'mensuel' && (
                <div className="surface p-5">
                    <h2 className="text-sm font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
                        Bilan des absences — {monthPrefix}
                    </h2>
                    {students.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            Aucun élève trouvé dans cette classe.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {students.map(student => {
                                const stats = getStudentMonthlySummary(student.id);
                                return (
                                    <div key={student.id} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-light text-white flex items-center justify-center font-semibold text-xs shrink-0">
                                                {student.prenom.charAt(0)}{student.nom.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-semibold text-slate-900 truncate">{student.nom} {student.prenom}</h3>
                                                <p className="text-[11px] text-slate-500 font-mono">{student.matricule}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-red-50 text-red-700 rounded-lg p-2 text-center border border-red-100">
                                                <div className="text-base font-bold">{stats.abs}</div>
                                                <div className="text-[10px] font-semibold uppercase mt-0.5">Abs.</div>
                                            </div>
                                            <div className="bg-amber-50 text-amber-700 rounded-lg p-2 text-center border border-amber-100">
                                                <div className="text-base font-bold">{stats.retards}</div>
                                                <div className="text-[10px] font-semibold uppercase mt-0.5">Retards</div>
                                            </div>
                                            <div className="bg-blue-50 text-blue-700 rounded-lg p-2 text-center border border-blue-100">
                                                <div className="text-base font-bold">{stats.justifie}</div>
                                                <div className="text-[10px] font-semibold uppercase mt-0.5">Just.</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Absences;
