import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap,
    Search,
    Plus,
    Edit,
    Trash2,
    X,
    Check,
    Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { classeService } from '../services/api';
import { notify } from '../utils/toast';

interface ClasseItem {
    id: string;
    nom: string;
    niveau?: string;
    name?: string;
    level?: string;
}

const Classes = () => {
    const navigate = useNavigate();
    const [classes, setClasses] = useState<ClasseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentClasse, setCurrentClasse] = useState<ClasseItem | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await classeService.getAll();
            if (data.status === 'success') {
                setClasses(data.classes || []);
            }
        } catch {
            notify.error('Erreur lors du chargement.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddClasse = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        try {
            const res = await classeService.create(data);
            if (res.status === 'success') {
                notify.success('Classe créée avec succès');
                setIsAddModalOpen(false);
                fetchData();
            }
        } catch {
            notify.error('Erreur lors de la création.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditClasse = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        try {
            if (!currentClasse) return;
            const res = await classeService.update(currentClasse.id, data);
            if (res.status === 'success') {
                notify.success('Classe mise à jour');
                setIsEditModalOpen(false);
                fetchData();
            }
        } catch {
            notify.error('Erreur lors de la mise à jour.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteClasse = async (id: string, name: string) => {
        if (window.confirm(`Voulez-vous vraiment supprimer la classe ${name} ?`)) {
            try {
                const res = await classeService.delete(id);
                if (res.status === 'success') {
                    notify.success('Classe supprimée');
                    setClasses(prev => prev.filter(c => c.id !== id));
                }
            } catch {
                notify.error('Erreur lors de la suppression.');
            }
        }
    };

    const filteredClasses = classes.filter(c =>
        (c.nom || c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title mb-2">
                        <div className="page-title-icon">
                            <GraduationCap className="text-primary" size={20} />
                        </div>
                        Classes
                    </h1>
                    <span className="text-slate-500 text-xs font-semibold inline-flex items-center bg-white/50 px-3 py-1 rounded-full border border-white/40 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse mr-2"></span>
                        {classes.length} classe{classes.length > 1 ? 's' : ''} configurée{classes.length > 1 ? 's' : ''}
                    </span>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-primary flex-shrink-0"
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Nouvelle classe</span>
                    <span className="sm:hidden">Nouvelle</span>
                </button>
            </div>

            {/* Search */}
            <div className="surface flex items-center px-3 py-2">
                <Search className="ml-2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Rechercher un niveau ou une classe…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
                />
            </div>

            {/* Classes Table */}
            <div className="surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="table-head border-b border-slate-100">
                                <th className="px-4 py-3">Classe</th>
                                <th className="px-4 py-3">Niveau</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="py-16 text-center">
                                        <Loader2 className="mx-auto text-primary animate-spin" size={28} />
                                        <p className="mt-3 text-xs text-slate-400">Chargement…</p>
                                    </td>
                                </tr>
                            ) : filteredClasses.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="py-16 text-center">
                                        <Search size={24} className="text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm font-semibold text-slate-500">Aucune classe</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Crée une classe pour commencer.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredClasses.map((c, idx) => (
                                    <motion.tr
                                        key={c.id || idx}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        onClick={() => navigate(`/eleves?class_id=${c.id}`)}
                                        className="group hover:bg-slate-50/70 transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                                                    {(c.nom || '').toString().substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-primary transition-colors">{c.nom}</p>
                                                    <p className="text-[11px] text-slate-400 font-mono">ID : {c.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="badge-primary">
                                                {c.niveau || 'Standard'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex items-center gap-1.5">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setCurrentClasse(c); setIsEditModalOpen(true); }}
                                                    className="btn-icon text-amber-500 bg-white border-amber-50 hover:bg-amber-500 hover:text-white"
                                                    title="Modifier"
                                                    aria-label="Modifier"
                                                >
                                                    <Edit size={15} strokeWidth={2.5} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClasse(c.id, c.nom); }}
                                                    className="btn-icon text-red-500 bg-white border-red-50 hover:bg-red-500 hover:text-white"
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

            {/* Modal Ajout/Édition */}
            <AnimatePresence>
                {(isAddModalOpen || isEditModalOpen) && (
                    <div className="modal-backdrop">
                        <motion.div
                            initial={{ scale: 0.97, opacity: 0, y: 12 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.97, opacity: 0 }}
                            className="modal-panel"
                        >
                            <div className="modal-header">
                                <h3 className="text-base font-bold text-slate-900">
                                    {isAddModalOpen ? 'Nouvelle classe' : 'Modifier la classe'}
                                </h3>
                                <button
                                    onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                                    className="modal-close"
                                    aria-label="Fermer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={isAddModalOpen ? handleAddClasse : handleEditClasse}>
                                <div className="modal-body">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nom de la classe *</label>
                                        <input
                                            name="nom"
                                            defaultValue={isEditModalOpen ? currentClasse?.nom : ''}
                                            required
                                            placeholder="Ex : 6ème A"
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Niveau d'études *</label>
                                        <select
                                            name="niveau"
                                            defaultValue={isEditModalOpen ? currentClasse?.niveau : ''}
                                            required
                                            className="input cursor-pointer"
                                        >
                                            <option value="">Sélectionner un niveau</option>
                                            <option value="6ème">6ème</option>
                                            <option value="7ème">7ème</option>
                                            <option value="8ème">8ème</option>
                                            <option value="9ème">9ème</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                                        className="btn-secondary"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="btn-primary"
                                    >
                                        {formLoading
                                            ? <Loader2 className="animate-spin" size={16} />
                                            : <Check size={16} />}
                                        {isAddModalOpen ? 'Créer' : 'Enregistrer'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Classes;
