import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Building2, Plus, Key, Trash2, Loader2, X, Check,
    Palette, Save, RotateCcw, Upload, ImageIcon, Sun, Moon, Sparkles, Eye
} from 'lucide-react';
import { superAdminService, BACKEND_URL } from '../services/api';
import { notify } from '../utils/toast';
import { resolveAssetUrl } from '../utils/url';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CopiableSecret } from './SuperAdmin';

interface UserRow {
    id: number;
    matricule: string;
    email: string;
    role: string;
    nom: string;
    prenom: string;
}

interface School {
    id: number;
    code: string;
    nom: string;
    devise?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    current_academic_year?: string;
    status: string;
    logo_url?: string;
    stamp_url?: string;
    theme_primary?: string;
    theme_primary_light?: string;
    theme_secondary?: string;
    theme_background?: string;
    theme_accent?: string;
    font_family?: string;
    density?: 'comfortable' | 'compact';
    dark_mode?: 0 | 1;
}

/* ============================================================
 * Polices — locales + Google Fonts (préfixe "Google:" résolu
 * dynamiquement dans ThemeContext)
 * ==========================================================*/
const FONT_CHOICES_LOCAL = [
    { v: 'Inter, system-ui, sans-serif',         l: 'Inter (par défaut)' },
    { v: '"Segoe UI", system-ui, sans-serif',     l: 'Segoe UI' },
    { v: 'Roboto, system-ui, sans-serif',         l: 'Roboto' },
    { v: '"Open Sans", system-ui, sans-serif',    l: 'Open Sans' },
    { v: 'Georgia, serif',                        l: 'Georgia (serif)' },
    { v: '"Times New Roman", Times, serif',       l: 'Times' },
    { v: '"Courier New", monospace',              l: 'Courier' },
];
const FONT_CHOICES_GOOGLE = [
    { v: 'Google:Poppins, system-ui, sans-serif',     l: 'Poppins (Google)' },
    { v: 'Google:Montserrat, system-ui, sans-serif',  l: 'Montserrat (Google)' },
    { v: 'Google:Nunito, system-ui, sans-serif',      l: 'Nunito (Google)' },
    { v: 'Google:Lato, system-ui, sans-serif',        l: 'Lato (Google)' },
    { v: 'Google:Raleway, system-ui, sans-serif',     l: 'Raleway (Google)' },
    { v: 'Google:Playfair Display, serif',             l: 'Playfair Display (Google, serif)' },
    { v: 'Google:Merriweather, serif',                 l: 'Merriweather (Google, serif)' },
    { v: 'Google:Fira Code, monospace',                l: 'Fira Code (Google, mono)' },
];

/* ============================================================
 * Presets — 6 palettes prédéfinies
 * ==========================================================*/
interface ThemePreset {
    name: string;
    primary: string;
    primary_light: string;
    secondary: string;
    background: string;
    accent: string;
}
const THEME_PRESETS: ThemePreset[] = [
    { name: 'Indigo (défaut)', primary: '#1e40af', primary_light: '#3b82f6', secondary: '#0f172a', background: '#f8fafc', accent: '#10b981' },
    { name: 'Émeraude',         primary: '#047857', primary_light: '#10b981', secondary: '#064e3b', background: '#f0fdf4', accent: '#0891b2' },
    { name: 'Rouge institutionnel', primary: '#b91c1c', primary_light: '#ef4444', secondary: '#1f2937', background: '#fef2f2', accent: '#f59e0b' },
    { name: 'Bleu marine',      primary: '#1e3a8a', primary_light: '#3b82f6', secondary: '#172554', background: '#eff6ff', accent: '#06b6d4' },
    { name: 'Violet',           primary: '#6d28d9', primary_light: '#8b5cf6', secondary: '#2e1065', background: '#faf5ff', accent: '#ec4899' },
    { name: 'Orange chaleureux', primary: '#c2410c', primary_light: '#f97316', secondary: '#7c2d12', background: '#fff7ed', accent: '#facc15' },
];

// Conserve l'ancienne constante pour rétro-compat dans le composant.
const FONT_CHOICES = [...FONT_CHOICES_LOCAL, ...FONT_CHOICES_GOOGLE];


const SuperAdminSchool: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { startImpersonation } = useAuth();
    const { setTheme } = useTheme();
    const [school, setSchool] = useState<School | null>(null);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingTheme, setSavingTheme] = useState(false);

    const [addAdminOpen, setAddAdminOpen] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ email: '', matricule: '', nom: '', prenom: '' });
    const [submitting, setSubmitting] = useState(false);
    const [createdAdmin, setCreatedAdmin] = useState<{ matricule?: string; email?: string; temp_password: string } | null>(null);
    const [resetInfo, setResetInfo] = useState<{ user_name: string; temp_password: string } | null>(null);

    // Upload assets
    const logoInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState<'logo' | 'stamp' | null>(null);

    const uploadAsset = async (type: 'logo' | 'stamp', file: File) => {
        if (!school) return;
        setUploading(type);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const token = localStorage.getItem('smartschool_token');
            const r = await fetch(`${BACKEND_URL}/api/super-admin/schools/${school.id}/upload/${type}`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: fd
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data?.error || 'Upload échoué');
            setSchool({ ...school, [type === 'logo' ? 'logo_url' : 'stamp_url']: data.url });
            notify.success(type === 'logo' ? 'Logo mis à jour' : 'Tampon mis à jour');
        } catch (e: any) {
            notify.error(e?.message || "Erreur lors de l'upload");
        } finally {
            setUploading(null);
        }
    };

    const applyPreset = (p: ThemePreset) => {
        if (!school) return;
        setSchool({
            ...school,
            theme_primary: p.primary,
            theme_primary_light: p.primary_light,
            theme_secondary: p.secondary,
            theme_background: p.background,
            theme_accent: p.accent,
        });
    };

    const load = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [s, u] = await Promise.all([
                superAdminService.getSchool(id),
                superAdminService.listUsersOfSchool(id),
            ]);
            setSchool(s.data);
            setUsers(u.data || []);
        } catch (err: any) {
            notify.error(err?.message || 'Erreur de chargement.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-line */ }, [id]);

    const saveTheme = async () => {
        if (!school) return;
        setSavingTheme(true);
        try {
            await superAdminService.updateTheme(school.id, {
                theme_primary: school.theme_primary,
                theme_primary_light: school.theme_primary_light,
                theme_secondary: school.theme_secondary,
                theme_background: school.theme_background,
                theme_accent: school.theme_accent,
                font_family: school.font_family,
                density: school.density,
                dark_mode: !!school.dark_mode ? 1 : 0,
                logo_url: school.logo_url,
                stamp_url: school.stamp_url,
            });
            notify.success('Thème enregistré');
        } catch (err: any) {
            notify.error(err?.message || 'Enregistrement impossible.');
        } finally {
            setSavingTheme(false);
        }
    };

    const resetTheme = () => {
        if (!school) return;
        setSchool({
            ...school,
            theme_primary: '#1e40af',
            theme_primary_light: '#3b82f6',
            theme_secondary: '#0f172a',
            theme_background: '#f8fafc',
            theme_accent: '#10b981',
            font_family: 'Inter, system-ui, sans-serif',
            density: 'comfortable',
            dark_mode: 0,
        });
    };

    const submitAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!school) return;
        setSubmitting(true);
        try {
            const res = await superAdminService.createAdmin(school.id, newAdmin);
            notify.success('Principal créé');
            setAddAdminOpen(false);
            setNewAdmin({ email: '', matricule: '', nom: '', prenom: '' });
            if (res.temp_password) {
                setCreatedAdmin({
                    matricule: newAdmin.matricule || `ADM-...`,
                    email: newAdmin.email,
                    temp_password: res.temp_password,
                });
            }
            load();
        } catch (err: any) {
            notify.error(err?.message || 'Création impossible.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = async (u: UserRow) => {
        const name = `${u.prenom} ${u.nom}`;
        if (!window.confirm(`Réinitialiser le mot de passe de ${name} ?`)) return;
        try {
            const res = await superAdminService.resetPassword(u.id);
            setResetInfo({ user_name: name, temp_password: res.temp_password });
        } catch (err: any) {
            notify.error(err?.message || 'Réinitialisation impossible.');
        }
    };

    const handleDeleteUser = async (u: UserRow) => {
        if (!window.confirm(`Supprimer ${u.prenom} ${u.nom} ?`)) return;
        try {
            await superAdminService.deleteUser(u.id);
            notify.success('Utilisateur supprimé');
            load();
        } catch (err: any) {
            notify.error(err?.message || 'Suppression impossible.');
        }
    };

    const handleImpersonate = async (u: UserRow) => {
        const fullName = `${u.prenom} ${u.nom}`;
        if (!window.confirm(
            `Te connecter en tant que ${fullName} ?\n\n` +
            `Tu verras l'application comme cet utilisateur. ` +
            `Tu pourras revenir en super-admin via le bandeau en haut.`
        )) return;
        try {
            const res = await superAdminService.impersonate(u.id);
            if (!res.token || !res.user) throw new Error('Réponse inattendue.');

            // Bascule du token + applique le thème de l'école de l'utilisateur
            startImpersonation(res.token, res.user);
            if (res.school) {
                setTheme({
                    id: res.school.id, code: res.school.code, nom: res.school.nom,
                    devise: res.school.devise, logo_url: res.school.logo_url, stamp_url: res.school.stamp_url,
                    theme_primary: res.school.theme_primary, theme_primary_light: res.school.theme_primary_light,
                    theme_secondary: res.school.theme_secondary, theme_background: res.school.theme_background,
                    theme_accent: res.school.theme_accent, font_family: res.school.font_family,
                    density: res.school.density, dark_mode: res.school.dark_mode,
                });
            }
            notify.success(`Connecté en tant que ${fullName}`);
            navigate('/dashboard');
        } catch (err: any) {
            notify.error(err?.message || 'Impossible de basculer.');
        }
    };

    if (loading || !school) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
        <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value || '#000000'}
                    onChange={e => onChange(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer bg-white"
                />
                <input
                    type="text"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    className="input font-mono uppercase"
                    placeholder="#000000"
                />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link to="/super-admin" className="btn-icon text-slate-500 bg-white border-slate-200 hover:bg-slate-100" aria-label="Retour">
                    <ArrowLeft size={15} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Building2 size={12} />
                        <span className="font-mono">{school.code}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">{school.nom}</h1>
                </div>
            </div>

            {/* Principaux & enseignants */}
            <div className="surface p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-slate-800">Utilisateurs de cette école ({users.length})</h2>
                    <button onClick={() => setAddAdminOpen(true)} className="btn-primary">
                        <Plus size={16} />
                        Nouveau principal
                    </button>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="table-head border-b border-slate-100">
                                <th className="px-3 py-2">Nom</th>
                                <th className="px-3 py-2">Matricule</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2 text-center">Rôle</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-400">Aucun utilisateur dans cette école.</td></tr>
                            ) : users.map(u => (
                                <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                    <td className="px-3 py-2.5 text-sm font-semibold text-slate-900">{u.prenom} {u.nom}</td>
                                    <td className="px-3 py-2.5"><span className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{u.matricule}</span></td>
                                    <td className="px-3 py-2.5 text-xs text-slate-500">{u.email}</td>
                                    <td className="px-3 py-2.5 text-center">
                                        <span className={u.role === 'admin' ? 'badge-primary' : 'badge-neutral'}>
                                            {u.role === 'admin' ? 'Principal' : u.role === 'prof' ? 'Enseignant' : u.role}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                        <div className="inline-flex gap-1.5">
                                            <button
                                                onClick={() => handleImpersonate(u)}
                                                className="btn-icon text-indigo-500 bg-white border-indigo-50 hover:bg-indigo-500 hover:text-white"
                                                title="Se connecter en tant que cet utilisateur"
                                                aria-label="Impersonation"
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleReset(u)}
                                                className="btn-icon text-amber-500 bg-white border-amber-50 hover:bg-amber-500 hover:text-white"
                                                title="Réinitialiser le mot de passe"
                                                aria-label="Reset mdp"
                                            >
                                                <Key size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u)}
                                                className="btn-icon text-red-500 bg-white border-red-50 hover:bg-red-500 hover:text-white"
                                                title="Supprimer"
                                                aria-label="Supprimer"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Éditeur de thème */}
            <div className="surface p-5">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Palette className="text-primary" size={18} />
                        <h2 className="text-sm font-bold text-slate-800">Personnalisation visuelle</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={resetTheme} className="btn-secondary">
                            <RotateCcw size={14} />
                            Réinitialiser
                        </button>
                        <button onClick={saveTheme} disabled={savingTheme} className="btn-primary">
                            {savingTheme ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Enregistrer le thème
                        </button>
                    </div>
                </div>

                {/* Upload logo + tampon */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                            <ImageIcon size={12} /> Logo de l'école
                        </label>
                        <div
                            onClick={() => logoInputRef.current?.click()}
                            className="relative h-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-primary/40 transition-colors cursor-pointer flex items-center justify-center overflow-hidden group"
                        >
                            {school.logo_url ? (
                                <img src={resolveAssetUrl(school.logo_url)} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                            ) : (
                                <div className="text-center">
                                    <Upload size={20} className="mx-auto text-slate-400 group-hover:text-primary transition-colors" />
                                    <p className="text-[11px] text-slate-500 mt-1">Cliquer pour téléverser</p>
                                </div>
                            )}
                            {uploading === 'logo' && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                    <Loader2 size={20} className="animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadAsset('logo', f); e.target.value = ''; }}
                        />
                        <p className="text-[11px] text-slate-400 mt-1">PNG/JPG/SVG, 2 Mo max.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                            <ImageIcon size={12} /> Tampon du chef d'établissement
                        </label>
                        <div
                            onClick={() => stampInputRef.current?.click()}
                            className="relative h-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-primary/40 transition-colors cursor-pointer flex items-center justify-center overflow-hidden group"
                        >
                            {school.stamp_url ? (
                                <img src={resolveAssetUrl(school.stamp_url)} alt="Tampon" className="max-w-full max-h-full object-contain p-2" />
                            ) : (
                                <div className="text-center">
                                    <Upload size={20} className="mx-auto text-slate-400 group-hover:text-primary transition-colors" />
                                    <p className="text-[11px] text-slate-500 mt-1">Cliquer pour téléverser</p>
                                </div>
                            )}
                            {uploading === 'stamp' && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                    <Loader2 size={20} className="animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                        <input
                            ref={stampInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadAsset('stamp', f); e.target.value = ''; }}
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Recommandé : PNG transparent.</p>
                    </div>
                </div>

                {/* Presets */}
                <div className="mb-6">
                    <label className="block text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                        <Sparkles size={12} /> Palettes prédéfinies
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {THEME_PRESETS.map(p => (
                            <button
                                key={p.name}
                                type="button"
                                onClick={() => applyPreset(p)}
                                className="group p-2 rounded-xl border border-slate-200 hover:border-primary hover:shadow-md transition-all text-left bg-white"
                                title={p.name}
                            >
                                <div className="flex gap-1 mb-1.5">
                                    <span className="block w-5 h-5 rounded" style={{ background: p.primary }} />
                                    <span className="block w-5 h-5 rounded" style={{ background: p.primary_light }} />
                                    <span className="block w-5 h-5 rounded" style={{ background: p.accent }} />
                                </div>
                                <p className="text-[11px] font-semibold text-slate-700 truncate">{p.name}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mode sombre */}
                <div className="mb-6 flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                        {school.dark_mode ? <Moon size={18} className="text-indigo-500" /> : <Sun size={18} className="text-amber-500" />}
                        <div>
                            <p className="text-sm font-semibold text-slate-800">Mode {school.dark_mode ? 'sombre' : 'clair'}</p>
                            <p className="text-[11px] text-slate-500">S'applique à l'app de cette école et à ses bulletins en ligne.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={!!school.dark_mode}
                        onClick={() => setSchool({ ...school, dark_mode: school.dark_mode ? 0 : 1 })}
                        className={`relative inline-flex w-12 h-6 rounded-full transition-colors ${school.dark_mode ? 'bg-primary' : 'bg-slate-300'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${school.dark_mode ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <ColorField
                        label="Couleur primaire"
                        value={school.theme_primary || '#1e40af'}
                        onChange={v => setSchool({ ...school, theme_primary: v })}
                    />
                    <ColorField
                        label="Primaire claire (variante)"
                        value={school.theme_primary_light || '#3b82f6'}
                        onChange={v => setSchool({ ...school, theme_primary_light: v })}
                    />
                    <ColorField
                        label="Couleur secondaire"
                        value={school.theme_secondary || '#0f172a'}
                        onChange={v => setSchool({ ...school, theme_secondary: v })}
                    />
                    <ColorField
                        label="Couleur d'accent"
                        value={school.theme_accent || '#10b981'}
                        onChange={v => setSchool({ ...school, theme_accent: v })}
                    />
                    <ColorField
                        label="Couleur de fond"
                        value={school.theme_background || '#f8fafc'}
                        onChange={v => setSchool({ ...school, theme_background: v })}
                    />
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Police de caractères</label>
                        <select
                            value={school.font_family || ''}
                            onChange={e => setSchool({ ...school, font_family: e.target.value })}
                            className="input cursor-pointer"
                        >
                            {FONT_CHOICES.map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Densité d'interface</label>
                        <select
                            value={school.density || 'comfortable'}
                            onChange={e => setSchool({ ...school, density: e.target.value as any })}
                            className="input cursor-pointer"
                        >
                            <option value="comfortable">Confortable (par défaut)</option>
                            <option value="compact">Compacte</option>
                        </select>
                    </div>
                </div>

                {/* Aperçu live */}
                <div className="mt-6 p-5 rounded-2xl border border-slate-100" style={{ background: school.theme_background }}>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Aperçu</p>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                                style={{ background: school.theme_primary }}
                            >
                                {school.nom.charAt(0)}
                            </div>
                            <div>
                                <div className="text-sm font-bold" style={{ color: school.theme_secondary, fontFamily: school.font_family }}>
                                    {school.nom}
                                </div>
                                {school.devise && (
                                    <div className="text-xs italic" style={{ color: school.theme_secondary + '99', fontFamily: school.font_family }}>
                                        {school.devise}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
                                style={{ background: school.theme_primary, fontFamily: school.font_family }}
                            >
                                Bouton primaire
                            </button>
                            <button
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white"
                                style={{ color: school.theme_secondary, borderColor: school.theme_primary + '33', fontFamily: school.font_family }}
                            >
                                Bouton secondaire
                            </button>
                            <span
                                className="px-2 py-0.5 rounded-md text-[11px] font-semibold border self-center"
                                style={{ background: (school.theme_accent || '#10b981') + '15', color: school.theme_accent, borderColor: (school.theme_accent || '#10b981') + '33' }}
                            >
                                Succès
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal — Nouveau principal */}
            <AnimatePresence>
                {addAdminOpen && (
                    <div className="modal-backdrop">
                        <motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }} className="modal-panel">
                            <div className="modal-header">
                                <h3 className="text-base font-bold text-slate-900">Nouveau principal</h3>
                                <button onClick={() => setAddAdminOpen(false)} className="modal-close" aria-label="Fermer"><X size={18} /></button>
                            </div>
                            <form onSubmit={submitAdmin}>
                                <div className="modal-body">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prénom *</label>
                                            <input required value={newAdmin.prenom} onChange={e => setNewAdmin({ ...newAdmin, prenom: e.target.value })} className="input" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nom *</label>
                                            <input required value={newAdmin.nom} onChange={e => setNewAdmin({ ...newAdmin, nom: e.target.value })} className="input" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email *</label>
                                        <input required type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} className="input" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Matricule (laissez vide pour autogénération)</label>
                                        <input value={newAdmin.matricule} onChange={e => setNewAdmin({ ...newAdmin, matricule: e.target.value })} className="input font-mono uppercase" placeholder={`ADM-...`} />
                                    </div>
                                    <p className="text-[11px] text-slate-400">Un mot de passe temporaire sera généré et affiché une seule fois.</p>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={() => setAddAdminOpen(false)} className="btn-secondary">Annuler</button>
                                    <button type="submit" disabled={submitting} className="btn-primary">
                                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        Créer
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal — Mdp affiché */}
            <AnimatePresence>
                {createdAdmin && (
                    <div className="modal-backdrop">
                        <motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }} className="modal-panel">
                            <div className="modal-header">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><Check className="text-emerald-600" size={18} /> Principal créé</h3>
                            </div>
                            <div className="modal-body">
                                <p className="text-sm text-slate-600">Identifiants à communiquer au principal :</p>
                                <CopiableSecret label="Email" value={createdAdmin.email || ''} />
                                <CopiableSecret label="Mot de passe temporaire" value={createdAdmin.temp_password} />
                            </div>
                            <div className="modal-footer">
                                <button onClick={() => setCreatedAdmin(null)} className="btn-primary">J'ai noté</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal — Reset mdp result */}
            <AnimatePresence>
                {resetInfo && (
                    <div className="modal-backdrop">
                        <motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }} className="modal-panel">
                            <div className="modal-header">
                                <h3 className="text-base font-bold text-slate-900">Mot de passe réinitialisé</h3>
                            </div>
                            <div className="modal-body">
                                <p className="text-sm text-slate-600">Nouveau mot de passe pour <strong>{resetInfo.user_name}</strong> :</p>
                                <CopiableSecret label="Mot de passe temporaire" value={resetInfo.temp_password} />
                                <p className="text-xs text-slate-400">L'ancien mot de passe est invalidé.</p>
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

export default SuperAdminSchool;
