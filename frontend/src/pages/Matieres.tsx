import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    Search,
    Plus,
    Edit,
    Trash2,
    X,
    Check,
    AlertCircle,
    Loader2,
    Layers
} from 'lucide-react';
import { matiereService } from '../services/api';

interface Matiere {
    id: string;
    name?: string;
    nom?: string;
    code?: string;
}

const Matieres = () => {
    const [matieres, setMatieres] = useState<Matiere[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentMatiere, setCurrentMatiere] = useState<Matiere | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: string }>({ text: '', type: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await matiereService.getAll();
            if (data.status === 'success') {
                setMatieres(data.matieres || []);
            }
        } catch (err) {
            console.error("Failed to fetch subjects", err);
            setMessage({ text: 'Erreur lors du chargement des matières.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddMatiere = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);
        const matiereData = Object.fromEntries(formData.entries());

        try {
            const res = await matiereService.create(matiereData);
            if (res.status === 'success') {
                setMessage({ text: 'Matière ajoutée avec succès !', type: 'success' });
                setIsAddModalOpen(false);
                fetchData();
            } else {
                setMessage({ text: res.message || 'Erreur lors de l\’ajout.', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Une erreur est survenue.', type: 'error' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditMatiere = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);
        const matiereData = Object.fromEntries(formData.entries());

        try {
            if (!currentMatiere) return;
            const res = await matiereService.update(currentMatiere.id, matiereData);
            if (res.status === 'success') {
                setMessage({ text: 'Matière modifiée avec succès !', type: 'success' });
                setIsEditModalOpen(false);
                fetchData();
            } else {
                setMessage({ text: res.message || 'Erreur lors de la modification.', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Une erreur est survenue.', type: 'error' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteMatiere = async (id: string, name: string) => {
        if (window.confirm(`Voulez-vous vraiment supprimer la matière ${name} ?`)) {
            try {
                const res = await matiereService.delete(id);
                if (res.status === 'success') {
                    setMessage({ text: 'Matière supprimée.', type: 'success' });
                    fetchData();
                }
            } catch (err) {
                setMessage({ text: 'Erreur lors de la suppression.', type: 'error' });
            }
        }
    };

    const filteredMatieres = matieres.filter(m =>
        (m.name || m.nom || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center">
                        <BookOpen className="mr-3 text-primary" size={32} />
                        Gestion des Matières
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Gérez le catalogue des disciplines enseignées.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center px-5 py-2.5 bg-primary text-white rounded-2xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all font-bold text-sm"
                >
                    <Plus size={18} className="mr-2" />
                    Ajouter une Matière
                </button>
            </div>

            {/* Notification Area */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-2xl flex items-center justify-between ${
                            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                        }`}
                    >
                        <div className="flex items-center">
                            {message.type === 'success' ? <Check size={18} className="mr-2" /> : <AlertCircle size={18} className="mr-2" />}
                            <span className="text-sm font-bold">{message.text}</span>
                        </div>
                        <button onClick={() => setMessage({ text: '', type: '' })} className="hover:opacity-70">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher une matière..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                    />
                </div>
            </div>

            {/* Grid display for subjects */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center">
                        <Loader2 className="animate-spin text-primary mx-auto mb-4" size={32} />
                        <p className="text-gray-400 font-medium">Chargement des matières...</p>
                    </div>
                ) : filteredMatieres.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                        <p className="text-gray-500 font-bold">Aucune matière trouvée</p>
                    </div>
                ) : (
                    filteredMatieres.map((m) => (
                        <motion.div
                            key={m.id}
                            layout
                            className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center">
                                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mr-4 group-hover:scale-110 transition-transform">
                                    <Layers size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{m.name || m.nom}</h3>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                                        Coefficient&nbsp;
                                        <span className="text-primary font-bold">
                                            {m.coefficient !== undefined && m.coefficient !== null ? m.coefficient : 1}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => {
                                        setCurrentMatiere(m);
                                        setIsEditModalOpen(true);
                                    }}
                                    className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-colors"
                                >
                                    <Edit size={18} />
                                </button>
                                <button
                                    onClick={() => handleDeleteMatiere(m.id, m.name || m.nom)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Modal Ajout / Édition */}
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
                                    {isAddModalOpen ? 'Nouvelle matière' : 'Modifier la matière'}
                                </h3>
                                <button
                                    onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                                    className="modal-close"
                                    aria-label="Fermer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={isAddModalOpen ? handleAddMatiere : handleEditMatiere}>
                                <div className="modal-body">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nom de la matière *</label>
                                        <input
                                            name="name"
                                            defaultValue={isEditModalOpen ? (currentMatiere?.name || currentMatiere?.nom) : ''}
                                            required
                                            placeholder="Ex : Mathématiques"
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Coefficient</label>
                                        <input
                                            name="coefficient"
                                            type="number"
                                            min="0.5"
                                            max="10"
                                            step="0.5"
                                            defaultValue={isEditModalOpen ? (currentMatiere?.coefficient ?? 1) : 1}
                                            className="input"
                                        />
                                        <p className="text-[11px] text-slate-400 mt-1">Pondération de la matière dans la moyenne générale.</p>
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
                                        {formLoading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
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

export default Matieres;
