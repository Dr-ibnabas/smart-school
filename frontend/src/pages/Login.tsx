import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, Building2, Eye, EyeOff } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { BACKEND_URL, schoolPublicService } from '../services/api';
import { resolveAssetUrl } from '../utils/url';

/**
 * Extrait un code école potentiel à partir de l'input.
 *   - "HOLLHOLL-ADMIN"        → "HOLLHOLL"
 *   - "PROF-HOLLHOLL"         → "HOLLHOLL"  (segment le plus long après '-')
 *   - "admin@hollholl.smartschool" → "HOLLHOLL"
 *   - "ADMIN-001"             → null  (réservé super-admin)
 *   - "user@gmail.com"        → null  (pas de format école détecté)
 */
function extractSchoolCode(input: string): string | null {
    const v = input.trim();
    if (!v) return null;

    // Cas email : prend le sous-domaine avant ".smartschool" si présent
    if (v.includes('@')) {
        const domain = v.split('@')[1] || '';
        const m = domain.match(/^([a-z0-9_-]+)\.smartschool/i);
        if (m && m[1].toLowerCase() !== 'default') return m[1].toUpperCase();
        return null;
    }

    // Cas matricule avec tirets : on prend tous les segments alphabétiques
    // et on choisit le plus long (heuristique simple : c'est très souvent le code école)
    const parts = v.split(/[-_]/).filter(p => p.length >= 3 && /^[A-Za-z]+$/.test(p));
    if (parts.length === 0) return null;

    // Cas spécial : "ADMIN-001" → on évite de prendre "ADMIN" comme code
    const ignored = new Set(['ADMIN', 'PROF', 'ELEVE', 'PRINCIPAL']);
    const candidate = parts
        .filter(p => !ignored.has(p.toUpperCase()))
        .sort((a, b) => b.length - a.length)[0];
    if (!candidate) return null;
    return candidate.toUpperCase();
}

/** Debounce simple */
function useDebounced<T>(value: T, ms: number): T {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

export const Login = () => {
    const [emailOrMatricule, setEmailOrMatricule] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { settings, loading: settingsLoading } = useSettings();
    const { login } = useAuth();
    const { theme, setTheme } = useTheme();

    // ─────────────────────────────────────────────────────────────
    // Détection live de l'école à partir du matricule / email
    // ─────────────────────────────────────────────────────────────
    const detectedCode = useMemo(() => extractSchoolCode(emailOrMatricule), [emailOrMatricule]);
    const debouncedCode = useDebounced(detectedCode, 350);

    const [detectedSchool, setDetectedSchool] = useState<any>(null);
    const [detecting, setDetecting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        if (!debouncedCode) {
            setDetectedSchool(null);
            return;
        }
        setDetecting(true);
        schoolPublicService.getByCode(debouncedCode)
            .then(res => {
                if (cancelled) return;
                const s = res.data;
                setDetectedSchool(s);
                // Applique le thème en live
                setTheme({
                    id: s.id,
                    code: s.code,
                    nom: s.nom,
                    devise: s.devise,
                    logo_url: s.logo_url,
                    theme_primary: s.theme_primary,
                    theme_primary_light: s.theme_primary_light,
                    theme_secondary: s.theme_secondary,
                    theme_background: s.theme_background,
                    theme_accent: s.theme_accent,
                    font_family: s.font_family,
                    density: s.density,
                    dark_mode: s.dark_mode,
                });
            })
            .catch(() => {
                if (!cancelled) setDetectedSchool(null);
            })
            .finally(() => { if (!cancelled) setDetecting(false); });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedCode]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const identifier = emailOrMatricule.trim();

            const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: identifier, password })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error(
                        data.error ||
                        'Trop de tentatives. Patientez quelques minutes avant de réessayer.'
                    );
                }
                throw new Error(data.error || 'Identifiants invalides.');
            }

            if (!data.token || !data.user) {
                throw new Error('Réponse serveur inattendue.');
            }

            // Si le backend renvoie l'école associée → on applique son thème
            if (data.school) {
                setTheme({
                    id: data.school.id,
                    code: data.school.code,
                    nom: data.school.nom,
                    devise: data.school.devise,
                    logo_url: data.school.logo_url,
                    stamp_url: data.school.stamp_url,
                    theme_primary: data.school.theme_primary,
                    theme_primary_light: data.school.theme_primary_light,
                    theme_secondary: data.school.theme_secondary,
                    theme_background: data.school.theme_background,
                    theme_accent: data.school.theme_accent,
                    font_family: data.school.font_family,
                    density: data.school.density,
                    dark_mode: data.school.dark_mode,
                });
            }

            login(data.token, data.user);
            navigate(data.user?.role === 'super_admin' ? '/super-admin' : '/dashboard');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err?.message || 'Identifiants invalides ou compte inexistant.');
        } finally {
            setIsLoading(false);
        }
    };

    if (settingsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Si une école est détectée, on affiche son logo et son nom.
    // Sinon on retombe sur les settings globaux (anciens) ou un placeholder.
    const displayedLogo = detectedSchool?.logo_url
        ? resolveAssetUrl(detectedSchool.logo_url)
        : (theme.logo_url ? resolveAssetUrl(theme.logo_url) : null);
    const displayedName = detectedSchool?.nom || theme.nom || settings?.platform_name || 'Smart School';
    const displayedDevise = detectedSchool?.devise || theme.devise || settings?.school_name;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background décoratif (couleurs primaires de l'école si détectée) */}
            <div className="absolute top-0 -left-20 w-80 h-80 bg-primary opacity-10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 -right-20 w-80 h-80 bg-secondary opacity-10 rounded-full blur-3xl animate-pulse delay-700"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full glass p-8 rounded-3xl shadow-2xl relative z-10"
            >
                {/* Logo + nom + devise (live) */}
                <div className="text-center mb-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={displayedLogo || displayedName}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            {displayedLogo ? (
                                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-2 overflow-hidden border border-gray-100">
                                    <img src={displayedLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                            ) : (
                                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                                    <span className="text-white font-bold text-3xl">{displayedName.charAt(0).toUpperCase()}</span>
                                </div>
                            )}
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{displayedName}</h1>
                            {displayedDevise && (
                                <p className="text-gray-500 mt-1 italic text-sm">« {displayedDevise} »</p>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Indicateur détection école */}
                <AnimatePresence>
                    {detectedCode && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4 overflow-hidden"
                        >
                            <div className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 ${
                                detectedSchool
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : detecting
                                        ? 'bg-slate-50 text-slate-500 border border-slate-100'
                                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                                {detecting
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <Building2 size={14} />}
                                <span className="font-semibold">
                                    {detecting && 'Détection de l\'école…'}
                                    {!detecting && detectedSchool && `${detectedSchool.nom} reconnu`}
                                    {!detecting && !detectedSchool && `École "${detectedCode}" introuvable — vérifie ton matricule.`}
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="login-id" className="block text-xs font-semibold text-gray-700 mb-1.5 ml-1">
                            Matricule ou e-mail
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                <Mail size={16} />
                            </span>
                            <input
                                id="login-id"
                                type="text"
                                value={emailOrMatricule}
                                onChange={(e) => setEmailOrMatricule(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white/70 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 text-sm"
                                placeholder="Ex : HOLLHOLL-ADMIN ou ADMIN-001"
                                autoComplete="username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="login-pwd" className="block text-xs font-semibold text-gray-700 mb-1.5 ml-1">
                            Mot de passe
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                <Lock size={16} />
                            </span>
                            <input
                                id="login-pwd"
                                type={showPwd ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl leading-5 bg-white/70 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 text-sm"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(s => !s)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            >
                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center">
                            <input type="checkbox" id="remember" className="h-3.5 w-3.5 text-primary focus:ring-primary border-gray-300 rounded" />
                            <label htmlFor="remember" className="ml-2 block text-[11px] text-gray-500">Se souvenir de moi</label>
                        </div>
                        <a href="#" className="text-[11px] font-semibold text-primary hover:underline">Mot de passe oublié ?</a>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center py-3 px-4 bg-primary text-white font-semibold rounded-xl shadow-md shadow-primary/30 hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all active:scale-[0.98] disabled:opacity-60"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin mr-2" size={18} />
                        ) : (
                            <>
                                Se connecter
                                <ArrowRight className="ml-2" size={16} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                        Powered by <span className="text-primary opacity-80">LARIA</span>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
