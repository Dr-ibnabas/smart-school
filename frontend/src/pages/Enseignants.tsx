import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Search,
    UserPlus,
    Edit,
    Trash2,
    X,
    Check,
    AlertCircle,
    Loader2,
    BookOpen,
    GraduationCap
} from 'lucide-react';
import { enseignantService, classeService } from '../services/api';

interface Enseignant {
    id: string;
    firstName?: string;
    lastName?: string;
    matricule?: string;
    email?: string;
    subjects?: string[];
    matiere_nom?: string;
    assignments?: string[];
}

interface Matiere {
    id: string;
    name?: string;
    nom?: string;
}

interface ClasseItem {
    id: string;
    name?: string;
    nom?: string;
}

const Enseignants = () => {
    const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
    const [matieres, setMatieres] = useState<Matiere[]>([]);
    const [classes, setClasses] = useState<ClasseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [currentEnseignant, setCurrentEnseignant] = useState<Enseignant | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: string }>({ text: '', type: '' });

    // Assignment state
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await enseignantService.getAll();
            if (data.status === 'success') {
                setEnseignants(data.enseignants || []);
                setMatieres(data.matieres || []);
            }
            
            const classesRes = await classeService.getAll();
            if (classesRes.status === 'success') {
                setClasses(classesRes.classes || []);
            }
        } catch (err) {
            console.error("Failed to fetch data", err);
            setMessage({ text: 'Erreur lors du chargement des données.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);
        const teacherData = Object.fromEntries(formData.entries()) as Record<string, unknown>;
        // Handle subjects array
        teacherData.subjects = [teacherData.matiere_id];

        try {
            const res = await enseignantService.create(teacherData);
            if (res.status === 'success') {
                setMessage({ text: 'Enseignant ajouté avec succès !', type: 'success' });
                setIsAddModalOpen(false);
                const matObj = matieres.find(m => m.id === teacherData.matiere_id);
                setEnseignants(prev => [{
                    id: res.data?.id || Date.now().toString(),
                    ...teacherData,
                    matiere_nom: matObj ? matObj.name || matObj.nom : 'Non assigné'
                } as any, ...prev]);
            } else {
                setMessage({ text: res.message || 'Erreur lors de l’ajout.', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Une erreur est survenue.', type: 'error' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);
        const teacherData = Object.fromEntries(formData.entries()) as Record<string, unknown>;
        teacherData.subjects = [teacherData.matiere_id];

        try {
            if (!currentEnseignant) return;
            const res = await enseignantService.update(currentEnseignant.id, teacherData);
            if (res.status === 'success') {
                setMessage({ text: 'Enseignant modifié avec succès !', type: 'success' });
                setIsEditModalOpen(false);
                const matObj = matieres.find(m => m.id === teacherData.matiere_id);
                setEnseignants(prev => prev.map(ens => ens.id === currentEnseignant.id ? {
                    ...ens,
                    ...teacherData,
                    matiere_nom: matObj ? matObj.name || matObj.nom : 'Non assigné'
                } as any : ens));
            } else {
                setMessage({ text: res.message || 'Erreur lors de la modification.', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Une erreur est survenue.', type: 'error' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteTeacher = async (id: string, name: string) => {
        if (window.confirm(`Voulez-vous vraiment supprimer l’enseignant ${name} ?`)) {
            try {
                const res = await enseignantService.delete(id);
                if (res.status === 'success') {
                    setMessage({ text: 'Enseignant supprimé.', type: 'success' });
                    setEnseignants(prev => prev.filter(ens => ens.id !== id));
                }
            } catch (err) {
                setMessage({ text: 'Erreur lors de la suppression.', type: 'error' });
            }
        }
    };

    const handleOpenAssign = async (enseignant: Enseignant) => {
        setCurrentEnseignant(enseignant);
        setFormLoading(true);
        try {
            const res = await enseignantService.getAssignments(enseignant.id);
            if (res.status === 'success') {
                setSelectedClasses(res.class_ids || []);
            }
            setIsAssignModalOpen(true);
        } catch (err) {
            setMessage({ text: 'Erreur lors du chargement des assignations.', type: 'error' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleSaveAssignments = async () => {
        setFormLoading(true);
        try {
            const res = await enseignantService.assignClasses(currentEnseignant!.id, selectedClasses);
            if (res.status === 'success') {
                setMessage({ text: 'Assignations mises à jour !', type: 'success' });
                setIsAssignModalOpen(false);
                setEnseignants(prev => prev.map(ens => ens.id === currentEnseignant?.id ? {
                    ...ens,
                    assignments: selectedClasses
                } as any : ens));
            }
        } catch (err) {
            setMessage({ text: 'Erreur lors de l’assignation.', type: 'error' });
        } finally {
            setFormLoading(false);
        }
    };

    const filteredEnseignants = enseignants.filter(ens =>
        (ens.lastName + ' ' + ens.firstName + ' ' + (ens.matricule || '')).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center mb-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-inner">
                            <Users className="text-primary" size={20} />
                        </div>
                        Enseignants
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-slate-500 text-xs font-semibold flex items-center bg-white/50 px-3 py-1 rounded-full border border-white/40 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-2"></span>
                            {enseignants.length} enseignant{enseignants.length > 1 ? 's' : ''}
                        </span>
                        <span className="text-xs font-semibold bg-primary/5 text-primary px-3 py-1 rounded-full border border-primary/10">
                            {matieres.length} matière{matieres.length > 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-md shadow-primary/20 hover:bg-primary-light active:scale-95 transition-all flex-shrink-0"
                >
                    <UserPlus size={18} />
                    <span className="hidden sm:inline">Nouvel enseignant</span>
                    <span className="sm:hidden">Nouveau</span>
                </button>
            </div>

            {/* Notification Area */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className={`p-5 rounded-[2rem] flex items-center justify-between shadow-2xl ${
                            message.type === 'success' 
                                ? 'bg-green-500/10 border border-green-500/20 text-green-800' 
                                : 'bg-red-500/10 border border-red-500/20 text-red-800'
                        } backdrop-blur-xl z-50`}
                    >
                        <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mr-4 shadow-lg ${
                                message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                            }`}>
                                {message.type === 'success' ? <Check size={20} className="animate-bounce" /> : <AlertCircle size={20} />}
                            </div>
                            <div>
                                <p className="text-sm font-black uppercase tracking-widest">{message.type === 'success' ? 'Succès' : 'Attention'}</p>
                                <p className="text-sm font-bold opacity-80">{message.text}</p>
                            </div>
                        </div>
                        <button onClick={() => setMessage({ text: '', type: '' })} className="p-3 hover:bg-black/5 rounded-2xl transition-all">
                            <X size={20} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Bar - Modernized */}
            <div className="premium-card glass p-3 flex items-center group focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                <div className="relative w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={24} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom, matricule ou matière..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-16 pr-8 py-4 bg-transparent outline-none font-black text-slate-800 placeholder:text-slate-400 placeholder:font-bold text-lg"
                    />
                </div>
            </div>

            {/* Teachers Table */}
            <div className="overflow-hidden border-0 shadow-sm bg-white/30 backdrop-blur-xl rounded-2xl glass">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-y-3 px-3">
                        <thead>
                            <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                <th className="px-3 py-3">Enseignant</th>
                                <th className="px-3 py-3">Matricule / Email</th>
                                <th className="px-3 py-3">Matière</th>
                                <th className="px-3 py-3 text-center">Classes</th>
                                <th className="px-3 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-48 text-center bg-white/20 rounded-[3rem]">
                                        <div className="relative inline-block scale-110">
                                            <div className="w-24 h-24 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Users size={32} className="text-primary animate-pulse" />
                                            </div>
                                        </div>
                                        <p className="mt-10 text-slate-400 font-extrabold uppercase tracking-[0.5em] text-[9px] animate-pulse">Synchronisation du personnel...</p>
                                    </td>
                                </tr>
                            ) : filteredEnseignants.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-48 text-center bg-white/20 rounded-[3rem]">
                                        <div className="w-32 h-32 bg-slate-50/50 rounded-[3.5rem] flex items-center justify-center mx-auto mb-10 border border-slate-100/50 shadow-inner group">
                                            <Search size={48} className="text-slate-300 group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-300 uppercase tracking-tight">Tableau Vide</h2>
                                        <p className="text-slate-400 mt-3 font-bold uppercase tracking-[0.25em] text-[10px]">Aucun enseignant trouvé</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredEnseignants.map((ens, idx) => (
                                    <motion.tr
                                        key={ens.id}
                                        initial={{ opacity: 0, scale: 0.98, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ 
                                            duration: 0.4, 
                                            delay: idx * 0.04,
                                            ease: [0.23, 1, 0.32, 1]
                                        }}
                                        className="group relative"
                                    >
                                        <td className="px-3 py-3 bg-white/60 group-hover:bg-white/95 border-y border-l border-white/40 rounded-l-2xl shadow-sm group-hover:shadow-lg transition-all">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="relative w-11 h-11 shrink-0">
                                                    <div className="relative w-full h-full rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-base shadow border-2 border-white/80">
                                                        {ens.lastName?.charAt(0) || '?'}
                                                    </div>
                                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors leading-tight truncate">
                                                        {ens.lastName} <span className="font-medium text-slate-500">{ens.firstName}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 bg-white/60 group-hover:bg-white/95 border-y border-white/40 shadow-sm group-hover:shadow-lg transition-all">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-mono text-xs font-bold text-slate-700 bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10 inline-block w-fit group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                    {ens.matricule || 'EMP-' + idx.toString().padStart(3, '0')}
                                                </span>
                                                <span className="text-[11px] text-slate-500 truncate">{ens.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 bg-white/60 group-hover:bg-white/95 border-y border-white/40 shadow-sm group-hover:shadow-lg transition-all">
                                            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                                                <BookOpen size={14} />
                                                {ens.matiere_nom || 'Non assignée'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 bg-white/60 group-hover:bg-white/95 border-y border-white/40 text-center shadow-sm group-hover:shadow-lg transition-all">
                                            <button
                                                onClick={() => handleOpenAssign(ens)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-primary transition-all active:scale-95"
                                                title="Gérer les classes assignées"
                                            >
                                                <GraduationCap size={14} />
                                                {ens.assignments?.length || 0} classe{(ens.assignments?.length || 0) > 1 ? 's' : ''}
                                            </button>
                                        </td>
                                        <td className="px-3 py-3 bg-white/60 group-hover:bg-white/95 border-y border-r border-white/40 rounded-r-2xl text-right shadow-sm group-hover:shadow-lg transition-all">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => {
                                                        setCurrentEnseignant(ens);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center text-amber-500 bg-white hover:bg-amber-500 hover:text-white rounded-lg transition-all shadow-sm border border-amber-50"
                                                    title="Modifier"
                                                    aria-label="Modifier"
                                                >
                                                    <Edit size={15} strokeWidth={2.5} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTeacher(ens.id, ens.lastName!)}
                                                    className="w-8 h-8 flex items-center justify-center text-red-500 bg-white hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm border border-red-50"
                                                    title="Supprimer"
                                                    aria-label="Supprimer"
                                                >
                                                    <Trash2 size={15} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Premium Modals */}
            <AnimatePresence>
                {(isAddModalOpen || isEditModalOpen) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            className="bg-white/95 w-full max-w-2xl rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden border border-white/60 backdrop-blur-2xl"
                        >
                            <div className="bg-gradient-to-br from-slate-900 to-primary p-12 text-white relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <div className="relative z-10">
                                    <h3 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">
                                        {isAddModalOpen ? 'Nouvel Expert' : 'Edition de Profil'}
                                    </h3>
                                    <p className="text-white/60 font-bold text-xs uppercase tracking-[0.3em] pl-1">
                                        {isAddModalOpen ? 'Enregistrement dans le corps enseignant' : `Mise à jour pour ${currentEnseignant?.lastName}`}
                                    </p>
                                </div>
                                <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="absolute top-10 right-10 p-4 bg-white/10 hover:bg-white/20 rounded-[2rem] transition-all backdrop-blur-md">
                                    <X size={28} />
                                </button>
                            </div>

                            <form onSubmit={isAddModalOpen ? handleAddTeacher : handleEditTeacher} className="p-12 space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Nom de famille</label>
                                        <input 
                                            name="lastName" 
                                            defaultValue={isEditModalOpen ? currentEnseignant?.lastName : ''} 
                                            required 
                                            placeholder="Ex: TRAORE"
                                            className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-800 focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all text-lg shadow-inner" 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Prénom(s)</label>
                                        <input 
                                            name="firstName" 
                                            defaultValue={isEditModalOpen ? currentEnseignant?.firstName : ''} 
                                            required 
                                            placeholder="Ex: Moussa"
                                            className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-800 focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all text-lg shadow-inner" 
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Email Professionnel</label>
                                        <input 
                                            type="email" 
                                            name="email" 
                                            defaultValue={isEditModalOpen ? currentEnseignant?.email : ''} 
                                            required 
                                            placeholder="m.traore@ecole.com"
                                            className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-800 focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all text-lg shadow-inner" 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Numéro Matricule</label>
                                        <input 
                                            name="matricule" 
                                            defaultValue={isEditModalOpen ? currentEnseignant?.matricule : ''} 
                                            placeholder="Ex: ENS-2025-001"
                                            className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-primary placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all text-lg shadow-inner" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Discipline / Spécialisation</label>
                                    <div className="relative">
                                        <select 
                                            name="matiere_id" 
                                            defaultValue={isEditModalOpen ? currentEnseignant?.subjects?.[0] : ''} 
                                            className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-800 appearance-none focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all text-lg cursor-pointer shadow-inner pr-16"
                                        >
                                            <option value="">Sélectionner une discipline</option>
                                            {matieres.map(m => <option key={m.id} value={m.id}>{m.name || m.nom}</option>)}
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-primary">
                                            <BookOpen size={24} />
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={formLoading} 
                                    className="w-full py-6 bg-slate-900 text-white font-black uppercase tracking-[0.3em] rounded-3xl shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)] hover:bg-primary transition-all flex items-center justify-center disabled:opacity-50 group mt-4 transform active:scale-95"
                                >
                                    {formLoading ? (
                                        <Loader2 className="animate-spin mr-3" size={28} />
                                    ) : (
                                        <Check className="mr-3 group-hover:scale-125 transition-transform" size={28} strokeWidth={3} />
                                    )}
                                    Enregistrer le dossier
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isAssignModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-3xl">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            className="bg-white/95 w-full max-w-xl rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] overflow-hidden border border-white/60 backdrop-blur-md"
                        >
                            <div className="bg-slate-900 p-10 text-white flex items-center justify-between relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full -ml-16 -mt-16 blur-2xl"></div>
                                <div className="relative z-10">
                                    <h3 className="text-3xl font-black uppercase tracking-tighter">Attributions</h3>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.35em] mt-1 pl-1">Configuration du périmètre scolaire</p>
                                </div>
                                <button onClick={() => setIsAssignModalOpen(false)} className="p-4 bg-white/5 hover:bg-white/10 rounded-[1.5rem] transition-all relative z-10 border border-white/5 backdrop-blur-md">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="p-10 bg-slate-50/50">
                                <div className="flex items-center p-6 bg-white rounded-[2rem] border border-slate-100 shadow-xl mb-10 group hover:border-primary/20 transition-all">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-primary/20 mr-6 group-hover:scale-110 transition-transform">
                                        {currentEnseignant?.lastName?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xl font-black text-slate-900 leading-none mb-1">{currentEnseignant?.lastName} {currentEnseignant?.firstName}</p>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 px-2 py-0.5 rounded-md w-fit">{currentEnseignant?.matiere_nom}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4 mb-6">Pédagogie - Sélection des classes</p>
                                    <div className="max-h-[300px] overflow-y-auto space-y-4 pr-3 custom-scrollbar">
                                        {classes.length === 0 ? (
                                            <div className="py-12 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100 shadow-inner">
                                                <GraduationCap size={40} className="mx-auto text-slate-200 mb-4" />
                                                <p className="text-sm font-bold text-slate-400 italic">Aucune structure de classe définie</p>
                                            </div>
                                        ) : (
                                            classes.map(c => (
                                                <label key={c.id} className={`flex items-center p-5 rounded-[2rem] cursor-pointer transition-all border group ${
                                                    selectedClasses.includes(c.id) 
                                                        ? 'bg-primary/5 border-primary/30 shadow-lg ring-1 ring-primary/20' 
                                                        : 'bg-white border-slate-100 hover:border-primary/40 hover:bg-primary/[0.02]'
                                                }`}>
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mr-5 transition-all duration-300 shadow-sm ${
                                                        selectedClasses.includes(c.id) ? 'bg-primary text-white scale-110 rotate-[360deg]' : 'bg-slate-50 border-2 border-slate-100 group-hover:border-primary/20'
                                                    }`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedClasses.includes(c.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedClasses([...selectedClasses, c.id]);
                                                                else setSelectedClasses(selectedClasses.filter(id => id !== c.id));
                                                            }}
                                                            className="hidden"
                                                        />
                                                        {selectedClasses.includes(c.id) ? <Check size={18} strokeWidth={4} /> : <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-primary/30"></div>}
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className={`font-black text-base uppercase tracking-wider transition-colors pt-0.5 ${
                                                            selectedClasses.includes(c.id) ? 'text-primary' : 'text-slate-500 group-hover:text-slate-900'
                                                        }`}>
                                                            {c.name || c.nom}
                                                        </span>
                                                        {selectedClasses.includes(c.id) && (
                                                            <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest mt-0.5 animate-fade-in">Assigné à l'expert</p>
                                                        )}
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handleSaveAssignments}
                                    disabled={formLoading}
                                    className="w-full py-6 mt-10 bg-slate-900 text-white font-black uppercase tracking-[0.3em] rounded-[2rem] shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)] hover:bg-primary transition-all flex items-center justify-center disabled:opacity-50 group transform active:scale-95"
                                >
                                    {formLoading ? (
                                        <Loader2 className="animate-spin mr-3" size={28} />
                                    ) : (
                                        <Check className="mr-3 group-hover:scale-125 transition-transform" size={28} strokeWidth={3} />
                                    )}
                                    Appliquer les changements
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Enseignants;
