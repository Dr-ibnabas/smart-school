import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Search,
    Plus,
    FileSpreadsheet,
    Edit,
    Trash2,
    X,
    Check,
    AlertCircle,
    Loader2,
    Filter,
    Printer,
    ShieldCheck,
    CreditCard
} from 'lucide-react';
import { eleveService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';
import { useLocation } from 'react-router-dom';
// xlsx (~350 Ko) chargé en lazy uniquement quand l'utilisateur importe un fichier.

interface Student {
    id: string;
    matricule: string;
    nom?: string;
    prenom?: string;
    genre?: string;
    classe_nom?: string;
    date_naissance?: string;
    redoublant?: boolean;
}

interface Classe {
    id: string;
    nom: string;
}

const Eleves = () => {
    const { user } = useAuth();
    const { settings, logoUrl, stampUrl } = useSettings();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialClassId = queryParams.get('class_id') || '';

    const [eleves, setEleves] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Classe[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClasse, setFilterClasse] = useState(initialClassId);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentEleve, setCurrentEleve] = useState<Student | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [attestationEleve, setAttestationEleve] = useState<Student | null>(null);
    const [carteEleve, setCarteEleve] = useState<Student | null>(null);
    const [message, setMessage] = useState<{ text: string; type: string }>({ text: '', type: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isTeacher = user?.role?.toLowerCase() === 'prof';

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!filterClasse) {
            setMessage({ 
                text: 'Action requise : Sélectionnez une classe dans le menu déroulant "Toutes les classes" avant d\'importer votre fichier Excel.', 
                type: 'alert' 
            });
            return;
        }

        setLoading(true);
        try {
            const XLSX = await import('xlsx');
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const workbookSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawRows = XLSX.utils.sheet_to_json(workbookSheet, { header: 1 }) as any[][];

            const norm = (s: any) =>
                String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\-_.:]/g, '');

            let headerRowIndex = 0;
            let bestMatchCount = 0;

            for (let i = 0; i < Math.min(10, rawRows.length); i++) {
                const row = rawRows[i];
                if (!Array.isArray(row)) continue;
                let matchCount = 0;
                for (const cell of row) {
                    const nCell = norm(cell);
                    if (nCell.includes('nom') || nCell.includes('prenom') || nCell.includes('matricule')) matchCount++;
                }
                if (matchCount > bestMatchCount) {
                    bestMatchCount = matchCount;
                    headerRowIndex = i;
                }
            }

            const headers = rawRows[headerRowIndex] || [];
            const studentsToImport: any[] = [];
            
            for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
                const row = rawRows[i];
                if (!Array.isArray(row) || row.length === 0) continue;
                
                const rowData: Record<string, string> = {};
                for (let j = 0; j < headers.length; j++) {
                    const headerName = headers[j];
                    if (headerName) rowData[norm(headerName)] = String(row[j] || '').trim();
                }

                const pick = (keys: string[]): string => {
                    const normalizedKeys = keys.map(k => norm(k));
                    // Try exact match first
                    for (const nk of normalizedKeys) {
                        if (rowData[nk]) return rowData[nk];
                    }
                    // Try partial match
                    for (const rowKey in rowData) {
                        for (const nk of normalizedKeys) {
                            if (rowKey.includes(nk)) return rowData[rowKey];
                        }
                    }
                    return '';
                };

                const nomPrenomCombine = pick(['nom et prenom', 'nometprenom', 'eleve', 'nom prenom', 'full_name']);
                let nom = pick(['nom', 'last name', 'surname']);
                let prenom = pick(['prenom', 'first name', 'given names']);

                if (!nom && !prenom && nomPrenomCombine) {
                    const parts = nomPrenomCombine.split(' ');
                    if (parts.length > 1) {
                        nom = parts[0];
                        prenom = parts.slice(1).join(' ');
                    } else {
                        nom = nomPrenomCombine;
                    }
                }

                // Plus unique matricule generation if missing
                const timestamp = Date.now().toString().slice(-6);
                const defaultMatricule = `MAT-${timestamp}-${String(i).padStart(3, '0')}`;
                const matricule = pick(['matricule', 'mat', 'n°', 'identifiant']) || defaultMatricule;
                
                const genreRaw = pick(['genre', 'sexe', 'gender', 'sex']).toLowerCase();
                const genre = (genreRaw.startsWith('f') || genreRaw.startsWith('fem')) ? 'F' : 'M';
                
                const redoublantRaw = pick(['redoublant', 'repeating', 'statut']).toLowerCase();
                const redoublant = /^(oui|redoublant|true|1|yes)/i.test(redoublantRaw);

                if (nom || prenom) {
                    studentsToImport.push({ 
                        matricule, 
                        nom: nom || 'Inconnu', 
                        prenom: prenom || '', 
                        genre, 
                        redoublant, 
                        class_id: filterClasse 
                    });
                }
            }

            if (studentsToImport.length > 0) {
                const res = await eleveService.createMultiple(studentsToImport);
                if (res.status === 'success') {
                    setMessage({ text: `${studentsToImport.length} élèves importés avec succès !`, type: 'success' });
                    fetchData();
                }
            }
        } catch (error) {
            setMessage({ text: 'Erreur lors de l\'importation.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterClasse]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await eleveService.getAll(filterClasse);
            if (data.status === 'success') {
                setEleves(data.eleves || []);
                setClasses(data.classes || []);
            }
        } catch (err) {
            setMessage({ text: 'Erreur lors du chargement.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);
        const studentData = Object.fromEntries(formData.entries());
        try {
            const res = await eleveService.create(studentData);
            if (res.status === 'success') {
                setMessage({ text: 'Élève inscrit avec succès !', type: 'success' });
                setIsAddModalOpen(false);
                fetchData();
            }
        } catch (err) {
            setMessage({ text: 'Erreur lors de l\’inscription.', type: 'error' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditStudent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.currentTarget);
        const studentData = Object.fromEntries(formData.entries());
        try {
            if (!currentEleve) return;
            const res = await eleveService.update(currentEleve.id, studentData);
            if (res.status === 'success') {
                setMessage({ text: 'Dossier mis à jour !', type: 'success' });
                setIsEditModalOpen(false);
                fetchData();
            }
        } catch (err) {
            setMessage({ text: 'Erreur lors de la mise à jour.', type: 'error' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteStudent = async (id: string, name: string) => {
        if (window.confirm(`Voulez-vous vraiment supprimer l’élève ${name} ?`)) {
            try {
                const res = await eleveService.delete(id);
                if (res.status === 'success') {
                    setMessage({ text: 'Élève supprimé.', type: 'success' });
                    setEleves(prev => prev.filter(el => el.id !== id));
                }
            } catch (err) {
                setMessage({ text: 'Erreur lors de la suppression.', type: 'error' });
            }
        }
    };

    const filteredEleves = eleves.filter(el =>
        (el.nom + ' ' + el.prenom + ' ' + el.matricule).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center mb-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-inner">
                            <Users className="text-primary" size={20} />
                        </div>
                        Effectif Scolaire
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-slate-500 text-xs font-semibold flex items-center bg-white/50 px-3 py-1 rounded-full border border-white/40 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-2"></span>
                            {eleves.length} Élèves inscrits
                        </span>
                        <span className="text-xs font-semibold bg-primary/5 text-primary px-3 py-1 rounded-full border border-primary/10">
                            {classes.length} Classes actives
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {!isTeacher && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-md shadow-primary/20 hover:bg-primary-light active:scale-95 transition-all"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">Inscrire un Élève</span>
                            <span className="sm:hidden">Inscrire</span>
                        </button>
                    )}
                    <input 
                        type="file" 
                        accept=".csv, .xlsx, .xls"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        title="Importer un fichier Excel"
                        aria-label="Importer Excel"
                        className="w-10 h-10 bg-white/80 border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm active:scale-95"
                    >
                        <FileSpreadsheet size={18} />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Effectif Total', value: eleves.length, icon: Users, color: 'primary' },
                    { label: 'Garçons', value: eleves.filter(e => e.genre === 'M').length, icon: '♂', color: 'blue' },
                    { label: 'Filles', value: eleves.filter(e => e.genre === 'F').length, icon: '♀', color: 'pink' },
                    { label: 'Redoublants', value: eleves.filter(e => e.redoublant).length, icon: AlertCircle, color: 'amber' }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass p-4 flex items-center justify-between border-0 shadow-md rounded-2xl"
                    >
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{stat.label}</p>
                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                        </div>
                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg font-bold ${
                            stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                            stat.color === 'blue' ? 'bg-blue-500/10 text-blue-600' :
                            stat.color === 'pink' ? 'bg-pink-500/10 text-pink-600' :
                            'bg-amber-500/10 text-amber-600'
                        }`}>
                            {typeof stat.icon === 'string' ? stat.icon : <stat.icon size={20} />}
                        </div>
                    </motion.div>
                ))}
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

            {/* Search and Filters - Modernized */}
            <div className="premium-card glass p-3 flex flex-col lg:flex-row gap-4 items-center border-0 shadow-2xl bg-white/40">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={24} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom, matrícula ou niveau..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-16 pr-8 py-4 bg-transparent outline-none font-black text-slate-800 placeholder:text-slate-400 placeholder:font-bold text-lg"
                    />
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto pr-3">
                    <div className="relative group w-full lg:min-w-[300px]">
                        <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-primary group-hover:scale-110 transition-transform" size={20} />
                        <select
                            value={filterClasse}
                            onChange={(e) => setFilterClasse(e.target.value)}
                            className="w-full pl-14 pr-12 py-4 bg-white/60 border border-white/40 rounded-3xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-slate-600 appearance-none cursor-pointer shadow-sm text-lg"
                        >
                            <option value="">Toutes les classes</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-primary">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Students Table - Modernized & Repaired */}
            <div className="premium-card glass overflow-hidden border-0 shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white/30 backdrop-blur-xl rounded-3xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-y-3 px-3">
                        <thead>
                            <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                <th className="px-3 py-3">Matricule</th>
                                <th className="px-3 py-3">Élève</th>
                                <th className="px-3 py-3 text-center">Genre</th>
                                <th className="px-3 py-3">Classe</th>
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
                                        <p className="mt-10 text-slate-400 font-extrabold uppercase tracking-[0.5em] text-[9px] animate-pulse">Synchronisation du registre...</p>
                                    </td>
                                </tr>
                            ) : filteredEleves.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-48 text-center bg-white/20 rounded-[3rem]">
                                        <div className="w-32 h-32 bg-slate-50/50 rounded-[3.5rem] flex items-center justify-center mx-auto mb-10 border border-slate-100/50 shadow-inner group">
                                            <Search size={48} className="text-slate-300 group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-300 uppercase tracking-tight">Aucun Résultat</h2>
                                        <p className="text-slate-400 mt-3 font-bold uppercase tracking-[0.25em] text-[10px]">Ajustez vos filtres ou effectuez une nouvelle recherche</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredEleves.map((eleve, idx) => (
                                    <motion.tr
                                        key={eleve.id}
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
                                            <span className="font-mono text-xs font-bold text-slate-700 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all inline-block">
                                                {eleve.matricule}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 bg-white/60 group-hover:bg-white/95 border-y border-white/40 shadow-sm group-hover:shadow-lg transition-all">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="relative w-11 h-11 shrink-0">
                                                    <div className="relative w-full h-full rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-base shadow border-2 border-white/80">
                                                        {eleve.nom?.charAt(0) || '?'}
                                                    </div>
                                                    {eleve.redoublant && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white border border-white z-10">
                                                            <AlertCircle size={10} strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors leading-tight truncate">
                                                        {eleve.nom} <span className="font-medium text-slate-500">{eleve.prenom}</span>
                                                    </span>
                                                    {eleve.redoublant && (
                                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">Redoublant</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 bg-white/60 group-hover:bg-white/95 border-y border-white/40 text-center shadow-sm group-hover:shadow-lg transition-all">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                                                eleve.genre === 'F'
                                                ? 'bg-pink-50 text-pink-600 border-pink-100'
                                                : 'bg-blue-50 text-blue-600 border-blue-100'
                                            }`}>
                                                <span className="mr-1.5">{eleve.genre === 'F' ? '♀' : '♂'}</span>
                                                {eleve.genre === 'F' ? 'Féminin' : 'Masculin'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 bg-white/60 group-hover:bg-white/95 border-y border-white/40 shadow-sm group-hover:shadow-lg transition-all">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-900/5 px-2.5 py-1 rounded-lg border border-slate-200/50">
                                                <ShieldCheck size={14} className="text-primary" />
                                                {eleve.classe_nom || 'Stand-by'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 bg-white/60 group-hover:bg-white/95 border-y border-r border-white/40 rounded-r-2xl text-right shadow-sm group-hover:shadow-lg transition-all">
                                            {!isTeacher && (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => setAttestationEleve(eleve)}
                                                        className="w-8 h-8 flex items-center justify-center text-indigo-500 bg-white hover:bg-indigo-500 hover:text-white rounded-lg transition-all shadow-sm border border-indigo-50"
                                                        title="Certificat"
                                                        aria-label="Certificat"
                                                    >
                                                        <Printer size={15} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => setCarteEleve(eleve)}
                                                        className="w-8 h-8 flex items-center justify-center text-rose-500 bg-white hover:bg-rose-500 hover:text-white rounded-lg transition-all shadow-sm border border-rose-50"
                                                        title="Carte"
                                                        aria-label="Carte"
                                                    >
                                                        <CreditCard size={15} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setCurrentEleve(eleve);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center text-amber-500 bg-white hover:bg-amber-500 hover:text-white rounded-lg transition-all shadow-sm border border-amber-50"
                                                        title="Modifier"
                                                        aria-label="Modifier"
                                                    >
                                                        <Edit size={15} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteStudent(eleve.id, eleve.nom || '')}
                                                        className="w-8 h-8 flex items-center justify-center text-red-500 bg-white hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm border border-red-50"
                                                        title="Supprimer"
                                                        aria-label="Supprimer"
                                                    >
                                                        <Trash2 size={15} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Branding */}
            <div className="flex justify-center items-center py-6">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[1em] hover:text-primary transition-colors cursor-default">
                    Smart School Management System
                </p>
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
                                        {isAddModalOpen ? 'Nouvel Apprenant' : 'Dossier Scolaire'}
                                    </h3>
                                    <p className="text-white/60 font-bold text-xs uppercase tracking-[0.3em] pl-1">
                                        {isAddModalOpen ? 'Ouverture d\'une nouvelle fiche élève' : `Mise à jour du profil de ${currentEleve?.nom}`}
                                    </p>
                                </div>
                                <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="absolute top-10 right-10 p-4 bg-white/10 hover:bg-white/20 rounded-[2rem] transition-all backdrop-blur-md">
                                    <X size={28} />
                                </button>
                            </div>

                            <form onSubmit={isAddModalOpen ? handleAddStudent : handleEditStudent} className="p-12 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Numéro Matricule</label>
                                    <input
                                        name="matricule"
                                        defaultValue={isEditModalOpen ? currentEleve?.matricule : ''}
                                        required
                                        placeholder="Ex: MAT-2025-001"
                                        className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-primary placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/30 transition-all text-lg shadow-inner"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Nom de famille</label>
                                        <input
                                            name="nom"
                                            defaultValue={isEditModalOpen ? currentEleve?.nom : ''}
                                            required
                                            placeholder="Ex: CAMARA"
                                            className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-800 focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all text-lg shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Prénom(s)</label>
                                        <input
                                            name="prenom"
                                            defaultValue={isEditModalOpen ? currentEleve?.prenom : ''}
                                            placeholder="Ex: Abdoulaye"
                                            className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-800 focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all text-lg shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Classe d'assignation</label>
                                        <div className="relative">
                                            <select
                                                name="class_id"
                                                defaultValue={isEditModalOpen ? currentEleve?.class_id : ''}
                                                required
                                                className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-800 appearance-none focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all text-lg cursor-pointer shadow-inner pr-16"
                                            >
                                                <option value="">Sélectionner</option>
                                                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Genre biologique</label>
                                        <div className="relative">
                                            <select
                                                name="genre"
                                                defaultValue={isEditModalOpen ? currentEleve?.genre : 'M'}
                                                className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-800 appearance-none focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all text-lg cursor-pointer shadow-inner pr-16"
                                            >
                                                <option value="M">Masculin (♂)</option>
                                                <option value="F">Féminin (♀)</option>
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner group">
                                    <label className="flex items-center space-x-6 cursor-pointer">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                name="redoublant"
                                                defaultChecked={isEditModalOpen ? !!currentEleve?.redoublant : false}
                                                className="peer hidden"
                                            />
                                            <div className="w-14 h-8 bg-slate-200 rounded-full peer-checked:bg-amber-500 transition-all shadow-inner"></div>
                                            <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-all peer-checked:translate-x-6 shadow-md"></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-slate-700 group-hover:text-primary transition-colors">Statut Redoublant</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">L'élève est inscrit en reprise d'année</span>
                                        </div>
                                    </label>
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
            </AnimatePresence>

            <AnimatePresence>
                {attestationEleve && (
                    <div className="fixed inset-0 z-[100] bg-gray-900/90 backdrop-blur-sm flex flex-col items-center overflow-y-auto">
                        <div className="sticky top-0 z-[120] w-full max-w-[210mm] flex justify-end gap-4 print:hidden mb-6 p-4">
                            <button
                                onClick={() => window.print()}
                                className="bg-white hover:bg-gray-100 text-gray-900 px-6 py-3 rounded-2xl shadow-xl font-black flex items-center transition-all text-sm"
                            >
                                <Printer className="mr-3 text-red-500" size={20} />
                                Lancer l'Impression
                            </button>
                            <button
                                onClick={() => setAttestationEleve(null)}
                                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl shadow-xl font-black flex items-center transition-all text-sm"
                            >
                                Fermer
                            </button>
                        </div>
                        <motion.div
                            key="attestation"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="bg-white shadow-2xl relative"
                            style={{ 
                                width: '210mm', 
                                minHeight: '297mm', 
                                padding: '15mm 20mm',
                                fontFamily: '"Times New Roman", Times, serif'
                            }}
                            id="print-area"
                        >
                            <div className="flex justify-between items-start mb-8 text-[14px]">
                                <div className="text-center w-[45%] leading-snug">
                                    <p className="font-bold">République de Djibouti</p>
                                    <p>Unité-Egalité-Paix</p>
                                    <p className="my-1">ooo</p>
                                    <p className="font-bold">Ministère de l'Education Nationale</p>
                                    <p className="font-bold">et de la Formation Professionnelle</p>
                                    <p className="my-1">ooo</p>
                                    <p>Réf : <span className="font-bold">146</span> /CEM-LYCEE DE HOLL HOLL/25-26</p>
                                </div>
                                <div className="text-center w-[45%] leading-snug">
                                    <h2 className="font-black text-[18px]">{settings?.school_name || 'CEM/LYCEE DE HOLL HOLL'}</h2>
                                    <p className="font-bold">{settings?.description || 'Sous-préfecture de Holl Holl'}</p>
                                    <p className="my-1">ooo</p>
                                    <p className="font-bold">Tél : 77 77 82 87</p>
                                    <p className="mt-6 text-right">Date : {new Date().toLocaleDateString('fr-FR')}</p>
                                </div>
                            </div>

                            <div className="text-center mb-12 mt-8">
                                <h1 className="inline-block px-12 py-3 border-2 border-black font-black text-2xl tracking-wide">
                                    CERTIFICAT DE SCOLARITE
                                </h1>
                            </div>

                            <div className="text-[18px] leading-relaxed mb-6 mt-12">
                                <p className="mb-2">Le Principal de l'établissement <strong>{settings?.school_name || 'LYCEM de HOLL HOLL'}</strong>,</p>
                                <p className="font-bold italic">atteste que :</p>
                            </div>

                            <div className="mb-8 text-[18px]">
                                <table className="w-full">
                                    <tbody>
                                        <tr>
                                            <td className="w-[120px] pb-4">L'élève</td>
                                            <td className="pb-4 font-bold">: {attestationEleve.nom} {attestationEleve.prenom}</td>
                                        </tr>
                                        <tr>
                                            <td className="w-[120px] pb-4">Né(e) le</td>
                                            <td className="pb-4 font-bold">: {attestationEleve.date_naissance || '..... / ..... / ..........'}</td>
                                        </tr>
                                        <tr>
                                            <td className="w-[120px] pb-4">A</td>
                                            <td className="pb-4 font-bold">: {attestationEleve.lieu_naissance || 'Djibouti'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="text-[18px] leading-relaxed mb-6 mt-6">
                                <p>Poursuit actuellement ses études dans notre établissement :</p>
                            </div>

                            <div className="mb-12 text-[18px] ml-12">
                                <table className="w-full">
                                    <tbody>
                                        <tr>
                                            <td className="w-[200px] pb-4">En classe de</td>
                                            <td className="pb-4 font-bold">: {attestationEleve.classe_nom || '......................'}</td>
                                        </tr>
                                        <tr>
                                            <td className="w-[200px] pb-4">Pour l'année scolaire</td>
                                            <td className="pb-4 font-bold">: 2025-2026</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="text-[18px] leading-relaxed mb-16 mt-12">
                                <p>
                                    En foi de quoi le présent certificat est délivré à la demande de l'intéressé(e) pour servir et valoir ce que de droit.
                                </p>
                            </div>

                            <div className="flex justify-end mr-12 text-[18px] mt-12 relative">
                                <div className="text-center">
                                    <p className="font-bold underline decoration-1 underline-offset-4 mb-20 italic">Le Principal</p>
                                    {settings?.stamp && (
                                        <img src={settings.stamp} alt="Cachet" className="absolute w-32 h-32 object-contain right-[-20px] bottom-4 opacity-80" style={{ mixBlendMode: 'multiply' }} />
                                    )}
                                    <p className="font-bold">Le Chef d'Établissement</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Carte Scolaire Modal */}
            <AnimatePresence>
                {carteEleve && (
                    <div className="fixed inset-0 z-[100] bg-gray-900/90 backdrop-blur-sm p-4 flex flex-col items-center justify-center overflow-y-auto">
                        <div className="flex w-full justify-between max-w-[190mm] mb-4 print:hidden items-center z-[120]">
                            <h3 className="text-white font-bold text-xl drop-shadow-md">Aperçu Carte Scolaire</h3>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => window.print()}
                                    className="bg-white hover:bg-gray-100 text-gray-900 px-6 py-3 rounded-2xl shadow-xl font-black flex items-center transition-all text-sm"
                                >
                                    <Printer className="mr-3 text-red-500" size={20} />
                                    Imprimer la carte
                                </button>
                                <button
                                    onClick={() => setCarteEleve(null)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl shadow-xl font-black flex items-center transition-all text-sm"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                        
                        <motion.div
                            key="carte"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full flex flex-col items-center print:flex-col print:gap-8 justify-center gap-6"
                        >
                            {/* RECTO (Front) */}
                            <div 
                                className="relative bg-white rounded-lg shadow-2xl overflow-hidden print:shadow-none print:m-0" 
                                style={{ width: '85.6mm', height: '53.98mm', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                            >
                                {/* Diagonals bottom right */}
                                <div className="absolute right-0 bottom-0 w-[50%] h-[100%] overflow-hidden pointer-events-none z-0">
                                    <div className="absolute right-[-20%] bottom-[-20%] w-[150%] h-[150%] bg-[#7a1318] transform -rotate-45 translate-x-1/2 translate-y-1/4"></div>
                                    <div className="absolute right-[-20%] bottom-[-20%] w-[120%] h-[120%] bg-[#a31a20] transform -rotate-45 translate-x-1/3 translate-y-1/3"></div>
                                </div>

                                <div className="relative z-10 w-full h-full flex flex-col p-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center">
                                            {logoUrl ? (
                                                <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-900 text-white flex items-center justify-center text-[7px] font-bold rounded">LOGO</div>
                                            )}
                                            <div className="ml-1 leading-[1.1] max-w-[80px]">
                                                <h2 className="text-[9px] font-black uppercase text-black line-clamp-2 leading-tight">
                                                    {settings?.school_name || 'LYCEE DE HOLL-HOLL'}
                                                </h2>
                                            </div>
                                        </div>
                                        <div className="text-center pr-2">
                                            <h1 className="text-[#a31a20] text-[18px] font-black italic tracking-tighter uppercase whitespace-nowrap" style={{ fontFamily: 'Georgia, serif', textShadow: '1px 1px 0px rgba(0,0,0,0.1)'}}>CARTE SCOLAIRE</h1>
                                            <h2 className="text-[#a31a20] text-[15px] font-black italic uppercase drop-shadow-sm line-clamp-1" style={{ fontFamily: 'Georgia, serif'}}>2025/2026</h2>
                                        </div>
                                    </div>

                                    {/* Middle section */}
                                    <div className="flex mt-1 flex-1">
                                        {/* Photo */}
                                        <div className="w-[30%]">
                                            <div className="w-full aspect-[3/4] bg-blue-50/50 border-[3px] border-[#a31a20] relative flex items-center justify-center overflow-hidden shadow-sm">
                                                 <span className="text-[8px] text-gray-400 font-bold uppercase rotate-45 absolute opacity-50">PHOTO</span>
                                            </div>
                                        </div>
                                        
                                        {/* Info */}
                                        <div className="w-[70%] pl-2 relative">
                                            <div className="bg-[#a31a20] text-white py-1 px-3 rounded-r-full rounded-l-sm absolute left-[-4px] w-[105%] flex items-center shadow-md border-y border-r border-[#7a1318]">
                                                <p className="text-[12px] font-black uppercase tracking-wider truncate drop-shadow-md">{carteEleve.nom} {carteEleve.prenom}</p>
                                            </div>
                                            
                                            <div className="mt-8 space-y-[3px] pl-3 text-[10px] text-gray-800">
                                                <div className="flex items-center drop-shadow-sm"><span className="w-[100px]">Matricule</span> <span className="font-extrabold text-[11px]">{carteEleve.matricule}</span></div>
                                                <div className="flex items-center"><span className="w-[100px]">Niveau</span> <span className="font-medium">: Terminale</span></div>
                                                <div className="flex items-center"><span className="w-[100px]">Classe</span> <span className="font-medium">: {carteEleve.classe_nom || 'T° S1'}</span></div>
                                                <div className="flex items-center"><span className="w-[100px]">Sexe</span> <span className="font-medium">: {carteEleve.genre === 'F' ? 'Féminin' : 'Masculin'}</span></div>
                                                <div className="flex items-center"><span className="w-[100px]">Date de naissance</span> <span className="font-medium">: {carteEleve.date_naissance || '01 Janvier 2009'}</span></div>
                                                <div className="flex items-center"><span className="w-[100px]">valid jusqu'à</span> <span className="font-medium">: JUIN 2026</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer section */}
                                    <div className="flex justify-between items-end mt-1">
                                        {/* Generic Barcode Line */}
                                        <div className="ml-1 flex items-end">
                                             <img src="https://barcode.tec-it.com/barcode.ashx?data=3211821136&code=Code128&translate-esc=on" alt="barcode" className="w-[110px] h-8 mix-blend-multiply opacity-80 filter grayscale"/>
                                        </div>
                                        {/* Auto-Stamp/Stamp */}
                                        <div className="mr-8 mb-1 relative flex flex-col items-center self-end">
                                            {settings?.stamp ? (
                                                <img src={settings.stamp} alt="Stamp" className="w-[50px] h-[50px] object-contain opacity-80" style={{ mixBlendMode: 'multiply' }} />
                                            ) : (
                                                <div className="w-24 h-10 border border-blue-800 text-blue-800 rotate-[-5deg] text-[6px] font-bold flex flex-col items-center justify-center leading-tight rounded-md bg-white/70 backdrop-blur-sm">
                                                    <span>{settings?.school_name?.substring(0, 20) || 'LYCEE DE HOLL-HOLL'}</span>
                                                    <span className="italic mt-[1px]">Le Proviseur</span>
                                                    <span className="mt-[1px]">MENFOP</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* VERSO (Back) */}
                            <div 
                                className="relative bg-white rounded-lg shadow-2xl overflow-hidden print:shadow-none print:m-0" 
                                style={{ width: '85.6mm', height: '53.98mm', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                            >
                                <div className="absolute right-0 bottom-0 w-[50%] h-[100%] overflow-hidden pointer-events-none z-0">
                                    <div className="absolute right-[-20%] bottom-[-20%] w-[150%] h-[150%] bg-[#7a1318] transform -rotate-45 translate-x-1/2 translate-y-1/4"></div>
                                    <div className="absolute right-[-20%] bottom-[-20%] w-[120%] h-[120%] bg-[#a31a20] transform -rotate-45 translate-x-1/3 translate-y-1/3"></div>
                                </div>

                                <div className="relative z-10 w-full h-full flex flex-col">
                                    <div className="flex justify-between items-center p-2 mb-1">
                                     <div className="flex items-center">
                                            {settings?.logo ? (
                                                <img src={settings.logo} alt="Logo" className="w-8 h-8 object-contain" />
                                            ) : (
                                                <div className="w-8 h-8 bg-gray-900 text-white flex items-center justify-center text-[5px] font-bold rounded">LOGO</div>
                                            )}
                                            <div className="ml-1 leading-[1.1] max-w-[80px]">
                                                <h2 className="text-[9px] font-black uppercase text-black line-clamp-2 leading-tight">
                                                    {settings?.school_name || 'LYCEE DE HOLL-HOLL'}
                                                </h2>
                                            </div>
                                        </div>
                                        <h2 className="text-[#a31a20] text-[15px] font-black italic tracking-tighter uppercase mr-2" style={{ fontFamily: 'Georgia, serif'}}>CONDITIONS D'UTILISATION</h2>
                                    </div>
                                    
                                    <div className="flex-1 bg-[#a31a20] text-white p-3 border-l-[12px] border-white z-10 shadow-inner flex flex-col justify-center">
                                        <ol className="list-decimal pl-6 pr-2 text-[10px] font-medium space-y-[6px] leading-[1.3] drop-shadow-sm tracking-[0.01em]">
                                            <li>Cette carte est intransmissible.</li>
                                            <li>Elle doit être présentée sur demande.</li>
                                            <li>Toute perte doit être signalée immédiatement.</li>
                                            <li>Tout mauvais usage peut entraîner une suspension.</li>
                                            <li>Valable uniquement pendant les périodes des examens.</li>
                                        </ol>
                                    </div>
                                    
                                    <div className="h-10 bg-white flex items-center text-[10px] font-bold text-gray-800 px-6 gap-8">
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 rounded-full border border-[#a31a20] text-[#a31a20] flex items-center justify-center mr-1.5 text-[8px] bg-red-50">📞</div>
                                            77 77 82 87
                                        </div>
                                        <div className="flex items-center z-10">
                                            <div className="w-4 h-4 rounded-full border border-[#a31a20] text-[#a31a20] flex items-center justify-center mr-1.5 text-[8px] bg-red-50">✉</div>
                                            sahfyrha638@gmail.com
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 1.5cm; }
                    body { background: white !important; padding: 0 !important; margin: 0 !important; color: black; }
                    .print\\:hidden { display: none !important; }
                    nav, .sidebar, .navbar, .header-dashboard { display: none !important; }
                    #print-area { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
                }
            `}</style>
        </div>
    );
};

export default Eleves;
