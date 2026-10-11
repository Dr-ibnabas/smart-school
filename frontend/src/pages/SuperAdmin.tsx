import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Plus, Building2, Users, GraduationCap, BookOpen,
    Edit, Trash2, Key, Palette, X, Check, Loader2, AlertCircle, Copy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { superAdminService } from '../services/api';
import { notify } from '../utils/toast';
import { useNavigate } from 'react-router-dom';

interface SchoolRow {
    id: number;
    code: string;
    nom: string;
    devise?: string;
    status: 'active' | 'suspended' | 'archived';
    logo_url?: string;
    theme_primary?: string;
    admin_count: number;
    prof_count: number;
    student_count: number;
    class_count: number;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, string> = {
        active:     'badge-success',
        suspended:  'badge-warning',
        archived:   'badge-neutral',
    };
    return <span className={map[status] || 'badge-neutral'}>{status}</span>;
};

const CopiableSecret: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
    const [copied, setCopied] = useState(false);
    return (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <Key size={16} className="text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
                {label && <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">{label}</div>}
                <div className="font-mono text-sm font-bold text-slate-900 truncate">{value}</div>
            </div>
            <button
                onClick={() => {
                    navigator.clipboard.writeText(value).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                    });
                }}
                className="btn-icon bg-white text-amber-600 border-amber-200 hover:bg-amber-500 hover:text-white"
                title="Copier"
            >
                {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
        </div>
    );
};

const SuperAdmin: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [schools, setSchools] = useState<SchoolRow[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [createOpen, setCreateOpen] = useState(false);
    const [newSchool, setNewSchool] = useState({
        code: '', nom: '', devise: '', address: '', phone: '', email: '', current_academic_year: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [createdAdmin, setCreatedAdmin] = useState<{ matricule: string; email: string; temp_password: string } | null>(null);

    const [resetInfo, setResetInfo] = useState<{ user_name: string; temp_password: string } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [s, st] = await Promise.all([
                superAdminService.listSchools(),
                superAdminService.stats(),
            ]);
            setSchools(s.data || []);
            setStats(st.data || null);
        } catch (err: any) {
            notify.error(err?.message || 'Erreur de chargement.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role !== 'super_admin') {
            navigate('/dashboard');
            return;
        }
        load();
    }, [user, navigate]);

    const submitNewSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await superAdminService.createSchool(newSchool);
            notify.success('École créée');
            setCreateOpen(false);
            setNewSchool({ code: '', nom: '', devise: '', address: '', phone: '', email: '', current_academic_year: '' });
            if (res.admin) setCreatedAdmin(res.admin);
            load();
        } catch (err: any) {
            notify.error(err?.message || 'Création impossible.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetPassword = async (userId: number | string, name: string) => {
        if (!window.confirm(`Réinitialiser le mot de passe de ${name} ?\nL'ancien mot de passe sera invalidé.`)) return;
        try {
            const res = await superAdminService.resetPassword(userId);
            setResetInfo({ user_name: name, temp_password: res.temp_password });
        } catch (err: any) {
            notify.error(err?.message || 'Réinitialisation impossible.');
        }
    };

    const handleDeleteSchool = async (school: SchoolRow) => {
        if (!window.confirm(`Supprimer définitivement l'école « ${school.nom} » ?`)) return;
        try {
            await superAdminService.deleteSchool(school.id);
            notify.success('École supprimée');
            load();
        } catch (err: any) {
            notify.error(err?.message || 'Suppression impossible.');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title mb-1">
                        <div className="page-title-icon">
                            <Shield className="text-primary" size={20} />
                        </div>
                        Super Administration
                    </h1>
                    <p className="page-subtitle">Gestion globale des écoles et des principaux.</p>
                </div>
                <button onClick={() => setCreateOpen(true)} className="btn-primary">
                    <Plus size={18} />
                    Nouvelle école
                </button>
            </div>

            {/* Stats globales */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="stat-card flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Écoles actives</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.schools_active}</p>
                        </div>
                        <Building2 className="text-primary" size={24} />
                    </div>
                    <div className="stat-card flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Principaux</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.admins}</p>
                        </div>
                        <Shield className="text-amber-500" size={24} />
                    </div>
                    <div className="stat-card flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Enseignants</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.profs}</p>
                        </div>
                        <Users className="text-purple-500" size={24} />
                    </div>
                    <div className="stat-card flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Élèves</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.students}</p>
                        </div>
                        <GraduationCap className="text-emerald-500" size={24} />
                    </div>
                </div>
            )}

            {/* Liste des écoles */}
            <div className="surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="table-head border-b border-slate-100">
                                <th className="px-4 py-3">École</th>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3 text-center">Statut</th>
                                <th className="px-4 py-3 text-center">Élèves</th>
                                <th className="px-4 py-3 text-center">Classes</th>
                                <th className="px-4 py-3 text-center">Profs</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="py-16 text-center">
                                    <Loader2 className="mx-auto text-primary animate-spin" size={28} />
                                </td></tr>
                            ) : schools.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                                    Aucune école. Crée-en une pour commencer.
                                </td></tr>
                            ) : (
                                schools.map(school => (
                                    <tr key={school.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm text-white shrink-0"
                                                    style={{ background: school.theme_primary || '#1e40af' }}
                                                >
                                                    {school.nom.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">{school.nom}</p>
                                                    {school.devise && <p className="text-[11px] text-slate-500 italic truncate">« {school.devise} »</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">{school.code}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center"><StatusBadge status={school.status} /></td>
                                        <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">{school.student_count}</td>
                                        <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">{school.class_count}</td>
                                        <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">{school.prof_count}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex items-center gap-1.5">
                                                <button
                                                    onClick={() => navigate(`/super-admin/school/${school.id}`)}
                                                    className="btn-icon text-indigo-500 bg-white border-indigo-50 hover:bg-indigo-500 hover:text-white"
                                                    title="Gérer (admins, thème)"
                                                    aria-label="Gérer"
                                                >
                                                    <Edit size={15} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/super-admin/school/${school.id}/theme`)}
                                                    className="btn-icon text-amber-500 bg-white border-amber-50 hover:bg-amber-500 hover:text-white"
                                                    title="Personnaliser le thème"
                                                    aria-label="Thème"
                                                >
                                                    <Palette size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSchool(school)}
                                                    className="btn-icon text-red-500 bg-white border-red-50 hover:bg-red-500 hover:text-white"
                                                    title="Supprimer"
                                                    aria-label="Supprimer"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal CRÉATION école */}
            <AnimatePresence>
                {createOpen && (
                    <div className="modal-backdrop">
                        <motion.div
                            initial={{ scale: 0.97, opacity: 0, y: 12 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.97, opacity: 0 }}
                            className="modal-panel"
                        >
                            <div className="modal-header">
                                <h3 className="text-base font-bold text-slate-900">Nouvelle école</h3>
                                <button onClick={() => setCreateOpen(false)} className="modal-close" aria-label="Fermer"><X size={18} /></button>
                            </div>
                            <form onSubmit={submitNewSchool}>
                                <div className="modal-body">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Code unique *</label>
                                        <input
                                            required
                                            value={newSchool.code}
                                            onChange={e => setNewSchool({ ...newSchool, code: e.target.value })}
                                            placeholder="HOLLHOLL"
                                            className="input font-mono uppercase"
                                            pattern="[A-Za-z0-9_-]+"
                                            title="Lettres, chiffres, - et _ uniquement"
                                        />
                                        <p className="text-[11px] text-slate-400 mt-1">Identifiant court, pas d'espaces. Sera utilisé pour les matricules (ex : <code>HOLLHOLL-ADMIN</code>).</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nom complet de l'école *</label>
                                        <input
                                            required
                                            value={newSchool.nom}
                                            onChange={e => setNewSchool({ ...newSchool, nom: e.target.value })}
                                            placeholder="Collège DE HOLL-HOLL"
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Devise (optionnel)</label>
                                        <input
                                            value={newSchool.devise}
                                            onChange={e => setNewSchool({ ...newSchool, devise: e.target.value })}
                                            placeholder="Excellence et discipline"
                                            className="input"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Téléphone</label>
                                            <input value={newSchool.phone} onChange={e => setNewSchool({ ...newSchool, phone: e.target.value })} className="input" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                                            <input type="email" value={newSchool.email} onChange={e => setNewSchool({ ...newSchool, email: e.target.value })} className="input" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Année scolaire en cours</label>
                                        <input value={newSchool.current_academic_year} onChange={e => setNewSchool({ ...newSchool, current_academic_year: e.target.value })} placeholder="2026/2027" className="input" />
                                    </div>
                                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl text-xs text-primary/80">
                                        <AlertCircle size={14} className="inline mr-1" />
                                        À la création, un <strong>compte principal</strong> est automatiquement généré avec un mot de passe temporaire que tu devras transmettre.
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">Annuler</button>
                                    <button type="submit" disabled={submitting} className="btn-primary">
                                        {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                        Créer l'école
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal SUCCESS — affichage du mdp temporaire admin */}
            <AnimatePresence>
                {createdAdmin && (
                    <div className="modal-backdrop">
                        <motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }} className="modal-panel">
                            <div className="modal-header">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Check size={18} className="text-emerald-600" /> École créée
                                </h3>
                            </div>
                            <div className="modal-body">
                                <p className="text-sm text-slate-600">
                                    Voici les identifiants du <strong>principal</strong> de cette école.
                                    Notez-les ou copiez-les <strong>maintenant</strong> — le mot de passe ne sera plus affiché.
                                </p>
                                <div className="space-y-2">
                                    <CopiableSecret label="Matricule" value={createdAdmin.matricule} />
                                    <CopiableSecret label="Email" value={createdAdmin.email} />
                                    <CopiableSecret label="Mot de passe temporaire" value={createdAdmin.temp_password} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button onClick={() => setCreatedAdmin(null)} className="btn-primary">
                                    J'ai noté les identifiants
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal RESET PASSWORD result */}
            <AnimatePresence>
                {resetInfo && (
                    <div className="modal-backdrop">
                        <motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }} className="modal-panel">
                            <div className="modal-header">
                                <h3 className="text-base font-bold text-slate-900">Mot de passe réinitialisé</h3>
                            </div>
                            <div className="modal-body">
                                <p className="text-sm text-slate-600">
                                    Nouveau mot de passe pour <strong>{resetInfo.user_name}</strong> :
                                </p>
                                <CopiableSecret label="Mot de passe temporaire" value={resetInfo.temp_password} />
                                <p className="text-xs text-slate-400">L'ancien mot de passe est invalidé. Communique celui-ci à l'utilisateur.</p>
                            </div>
                            <div className="modal-footer">
                                <button onClick={() => setResetInfo(null)} className="btn-primary">OK</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SuperAdmin;
// Exporté pour utilisation par la sous-page école dédiée
export { CopiableSecret };
