import React, { useState, useEffect } from 'react';
import { 
    Calendar,
    Save, 
    BookOpen,
    UserSquare2,
    Clock,
    Plus
} from 'lucide-react';
import { classeService, matiereService, enseignantService, emploiDuTempsService } from '../services/api';
import toast from 'react-hot-toast';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'];
const TIME_SLOTS = [
    '08:00 - 10:00',
    '10:00 - 12:00',
    '13:00 - 15:00',
    '15:00 - 17:00'
];

const EmploisDuTemps = () => {
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    
    const [matieres, setMatieres] = useState<any[]>([]);
    const [enseignants, setEnseignants] = useState<any[]>([]);
    
    // schedule structure: { [day]: { [timeSlot]: { matiereId, enseignantId } } }
    const [schedule, setSchedule] = useState<Record<string, Record<string, { matiereId: string, enseignantId: string }>>>({});
    const [loading, setLoading] = useState(false);
    
    // Pour l'édition rapide
    const [activeEdit, setActiveEdit] = useState<{day: string, slot: string} | null>(null);
    const [tempEdit, setTempEdit] = useState({ matiereId: '', enseignantId: '' });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            loadSchedule();
        }
    }, [selectedClass]);

    const loadData = async () => {
        try {
            const [classesRes, matieresRes, enseignantsRes] = await Promise.all([
                classeService.getAll(),
                matiereService.getAll(),
                enseignantService.getAll()
            ]);
            setClasses(classesRes.data || []);
            setMatieres(matieresRes.data || []);
            setEnseignants(enseignantsRes.data || []);

            if (classesRes.data && classesRes.data.length > 0) {
                setSelectedClass(classesRes.data[0].id);
            }
        } catch (error) {
            toast.error("Erreur lors du chargement des données");
        }
    };

    const loadSchedule = async () => {
        try {
            setLoading(true);
            const res = await emploiDuTempsService.getByClass(selectedClass);
            setSchedule(res.data?.schedule || {});
            setActiveEdit(null);
        } catch (error) {
            toast.error("Erreur lors du chargement de l'emploi du temps");
        } finally {
            setLoading(false);
        }
    };

    const saveSchedule = async () => {
        try {
            setLoading(true);
            await emploiDuTempsService.save(selectedClass, schedule);
            toast.success("Emploi du temps enregistré avec succès");
        } catch (error) {
            toast.error("Erreur lors de l'enregistrement");
        } finally {
            setLoading(false);
        }
    };

    const openEditDialog = (day: string, slot: string) => {
        const current = schedule[day]?.[slot] || { matiereId: '', enseignantId: '' };
        setTempEdit({ ...current });
        setActiveEdit({ day, slot });
    };

    const saveEditDialog = () => {
        if (!activeEdit) return;
        const { day, slot } = activeEdit;
        setSchedule(prev => {
            const newDay = { ...(prev[day] || {}) };
            if (!tempEdit.matiereId && !tempEdit.enseignantId) {
                delete newDay[slot];
            } else {
                newDay[slot] = tempEdit;
            }
            return { ...prev, [day]: newDay };
        });
        setActiveEdit(null);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Le <Toaster /> global est monté dans main.tsx. */}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="page-title mb-1">
                        <div className="page-title-icon">
                            <Calendar className="text-primary" size={20} />
                        </div>
                        Emplois du temps
                    </h1>
                    <p className="page-subtitle">Planifie les cours hebdomadaires par classe.</p>
                </div>

                <button
                    onClick={saveSchedule}
                    disabled={loading || !selectedClass}
                    className="btn-primary"
                >
                    <Save size={16} />
                    {loading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
            </div>

            {/* Filtre classe */}
            <div className="surface p-4">
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

            {selectedClass ? (
                <div className="surface overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar p-3">
                        <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr>
                                    <th className="py-2.5 px-2 border border-slate-100 bg-slate-50 text-slate-400 font-medium text-center w-24">
                                        <Clock size={16} className="mx-auto" />
                                    </th>
                                    {DAYS.map(day => (
                                        <th key={day} className="py-2.5 px-2 border border-slate-100 bg-slate-50 text-slate-700 font-semibold text-center text-xs">
                                            {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {TIME_SLOTS.map(slot => (
                                    <tr key={slot}>
                                        <td className="py-2 px-2 border border-slate-100 bg-slate-50 font-semibold text-slate-600 text-center text-[11px]">
                                            {slot}
                                        </td>
                                        {DAYS.map(day => {
                                            const cellData = schedule[day]?.[slot];
                                            const active = activeEdit?.day === day && activeEdit?.slot === slot;
                                            return (
                                                <td key={`${day}-${slot}`} className={`border border-slate-100 p-1.5 align-top w-44 transition-colors ${active ? 'bg-primary/5 ring-2 ring-primary/40' : 'hover:bg-slate-50'}`}>
                                                    {active ? (
                                                        <div className="space-y-1.5 p-0.5">
                                                            <select
                                                                value={tempEdit.matiereId}
                                                                onChange={(e) => setTempEdit({ ...tempEdit, matiereId: e.target.value })}
                                                                className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1 focus:ring-2 focus:ring-primary/15 outline-none"
                                                            >
                                                                <option value="">Matière…</option>
                                                                {matieres.map(m => <option key={m.id} value={m.id}>{m.name || m.nom}</option>)}
                                                            </select>

                                                            <select
                                                                value={tempEdit.enseignantId}
                                                                onChange={(e) => setTempEdit({ ...tempEdit, enseignantId: e.target.value })}
                                                                className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1 focus:ring-2 focus:ring-primary/15 outline-none"
                                                            >
                                                                <option value="">Enseignant…</option>
                                                                {enseignants.map(m => <option key={m.id} value={m.id}>{m.name || m.nom}</option>)}
                                                            </select>

                                                            <div className="flex gap-1 pt-1">
                                                                <button onClick={saveEditDialog} className="flex-1 bg-primary text-white text-[11px] font-semibold py-1 rounded hover:bg-primary-light transition-colors">OK</button>
                                                                <button onClick={() => setActiveEdit(null)} className="flex-1 bg-slate-100 text-slate-600 text-[11px] font-semibold py-1 rounded hover:bg-slate-200 transition-colors">Annuler</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => openEditDialog(day, slot)}
                                                            className={`h-full min-h-[66px] rounded-lg border-2 border-dashed p-2 cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                                                                cellData
                                                                    ? 'border-transparent bg-primary/10 hover:bg-primary/15'
                                                                    : 'border-slate-200 bg-transparent hover:border-primary/40 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            {cellData ? (
                                                                <>
                                                                    <div className="font-semibold text-primary flex items-center gap-1 text-[11px] mb-0.5 w-full">
                                                                        <BookOpen size={12} className="shrink-0" />
                                                                        <span className="truncate">
                                                                            {matieres.find(m => m.id === cellData.matiereId)?.name || matieres.find(m => m.id === cellData.matiereId)?.nom || '—'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-slate-600 flex items-center gap-1 text-[11px] w-full">
                                                                        <UserSquare2 size={12} className="shrink-0" />
                                                                        <span className="truncate">
                                                                            {enseignants.find(e => e.id === cellData.enseignantId)?.name || enseignants.find(e => e.id === cellData.enseignantId)?.nom || '—'}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="text-slate-400 group flex flex-col items-center gap-0.5">
                                                                    <Plus size={14} className="group-hover:text-primary transition-colors" />
                                                                    <span className="text-[10px] font-semibold group-hover:text-primary transition-colors">Ajouter</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="surface p-8 text-center">
                    <Calendar size={32} className="mx-auto text-slate-300 mb-3" />
                    <h3 className="text-sm font-semibold text-slate-700">Aucune classe sélectionnée</h3>
                    <p className="text-xs text-slate-500 mt-1">Sélectionne une classe pour voir ou éditer son emploi du temps.</p>
                </div>
            )}
        </div>
    );
};

export default EmploisDuTemps;
