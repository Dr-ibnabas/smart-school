import React, { useState, useEffect } from 'react';
import { 
    Users, Plus, Search, Mail, Shield, Trash2, 
    CheckCircle2, XCircle, Loader2, Key, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../services/api';
import { notify } from '../utils/toast';

const Utilisateurs = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        matricule: '',
        password: '',
        role: 'teacher' as 'admin' | 'teacher'
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const res = await userService.getAll();
            setUsers(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await userService.create(formData);
            setShowModal(false);
            setFormData({ name: '', matricule: '', password: '', role: 'teacher' });
            loadUsers();
        } catch (err: any) {
            setError(err.message || "Erreur lors de la création");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (uid: string) => {
        if (!window.confirm("Supprimer cet utilisateur ?")) return;
        try {
            await userService.delete(uid);
            notify.success("Utilisateur supprimé");
            loadUsers();
        } catch (err: any) {
            console.error('Delete user error:', err);
            notify.error(err?.message || "Erreur lors de la suppression");
        }
    };

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.matricule?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center mb-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-inner">
                            <Shield className="text-primary" size={20} />
                        </div>
                        Utilisateurs
                    </h1>
                    <span className="text-slate-500 text-xs font-semibold inline-flex items-center bg-white/50 px-3 py-1 rounded-full border border-white/40 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse mr-2"></span>
                        {users.length} compte{users.length > 1 ? 's' : ''} actif{users.length > 1 ? 's' : ''}
                    </span>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-md shadow-primary/20 hover:bg-primary-light active:scale-95 transition-all flex-shrink-0"
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Nouvel utilisateur</span>
                    <span className="sm:hidden">Nouveau</span>
                </button>
            </div>

            {/* Error Notification */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-5 rounded-[2rem] bg-red-500/10 border border-red-500/20 text-red-800 backdrop-blur-xl flex items-center justify-between shadow-2xl"
                    >
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center mr-4 shadow-lg">
                                <AlertCircle size={20} />
                            </div>
                            <p className="text-sm font-black uppercase tracking-widest leading-none">Erreur: <span className="font-bold opacity-80">{error}</span></p>
                        </div>
                        <button onClick={() => setError(null)} className="p-3 hover:bg-black/5 rounded-2xl transition-all">
                            <X size={20} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search - Modernized */}
            <div className="premium-card glass p-3 flex items-center border-0 shadow-2xl bg-white/40">
                <div className="relative flex-1 group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={24} />
                    <input
                        type="text"
                        placeholder="Rechercher un membre par nom ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-16 pr-8 py-4 bg-transparent outline-none font-black text-slate-800 placeholder:text-slate-400 placeholder:font-bold text-lg"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="overflow-hidden border-0 shadow-sm bg-white/40 rounded-2xl glass">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200/50">
                                <th className="px-4 py-3">Utilisateur</th>
                                <th className="px-4 py-3">Matricule</th>
                                <th className="px-4 py-3 text-center">Rôle</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <div className="relative inline-block">
                                            <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <p className="text-sm font-semibold text-slate-400">Aucun compte trouvé</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user, idx) => {
                                    const displayName = user.name || `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || '?';
                                    const initial = (displayName.charAt(0) || '?').toUpperCase();
                                    return (
                                    <motion.tr
                                        key={user.uid || user.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="hover:bg-white/60 transition-colors group"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0 ${
                                                    user.role === 'admin'
                                                        ? 'bg-gradient-to-br from-slate-900 to-indigo-900'
                                                        : 'bg-gradient-to-br from-primary to-primary-light'
                                                }`}>
                                                    {initial}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                                        {displayName}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 truncate">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                                <Key size={12} className="text-slate-400" />
                                                {user.matricule || user.email?.split('@')[0]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                                                user.role === 'admin'
                                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                                                    : 'bg-primary/5 border-primary/10 text-primary'
                                            }`}>
                                                {user.role === 'admin' ? 'Administrateur' : user.role === 'prof' ? 'Enseignant' : user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDelete(user.uid || user.id)}
                                                className="w-8 h-8 inline-flex items-center justify-center text-red-500 bg-white hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm border border-red-50"
                                                title="Supprimer"
                                                aria-label="Supprimer"
                                            >
                                                <Trash2 size={15} strokeWidth={2.5} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Creation Modal - Premium Version */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            className="bg-white/95 w-full max-w-md rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden border border-white/60 backdrop-blur-2xl"
                        >
                            <div className="bg-gradient-to-br from-slate-900 to-primary p-12 text-white relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <div className="relative z-10">
                                    <h3 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">Compte</h3>
                                    <p className="text-white/60 font-bold text-xs uppercase tracking-[0.3em] pl-1">Nouvel Utilisateur Système</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 p-4 bg-white/10 hover:bg-white/20 rounded-[2rem] transition-all backdrop-blur-md">
                                    <X size={28} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-12 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Nom de l'administrateur</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: Jean Dupont"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-800 placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all text-lg shadow-inner"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Matricule</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="ADM-001"
                                            value={formData.matricule}
                                            onChange={(e) => setFormData({...formData, matricule: e.target.value})}
                                            className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-primary placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all text-lg shadow-inner font-mono"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Rôle</label>
                                        <select
                                            className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-800 appearance-none focus:ring-4 focus:ring-primary/10 transition-all text-lg cursor-pointer shadow-inner"
                                            value={formData.role}
                                            onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                                        >
                                            <option value="teacher">Professeur</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Mot de passe provisoire</label>
                                    <input
                                        required
                                        type="password"
                                        placeholder="********"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-800 placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all text-lg shadow-inner"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-6 bg-slate-900 text-white font-black uppercase tracking-[0.3em] rounded-3xl shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)] hover:bg-primary transition-all flex items-center justify-center disabled:opacity-50 group mt-4 transform active:scale-95"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="animate-spin mr-3" size={28} />
                                    ) : (
                                        <UserCheck className="mr-3 group-hover:scale-125 transition-transform" size={28} strokeWidth={3} />
                                    )}
                                    Valider l'Accès
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
export default Utilisateurs;
