import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    GraduationCap,
    UserSquare2,
    BookOpen,
    Calendar,
    ArrowUpRight,
    LayoutDashboard,
    ScanLine,
    ShieldCheck,
    LucideIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/api';

interface StatCardProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    color: string;
    delay: number;
    to?: string;
}

const colorMap: Record<string, { bg: string; text: string; lightBg: string }> = {
    'primary':    { bg: 'bg-primary',     text: 'text-primary',     lightBg: 'bg-primary/10' },
    'purple-500': { bg: 'bg-purple-500',  text: 'text-purple-600',  lightBg: 'bg-purple-50' },
    'amber-500':  { bg: 'bg-amber-500',   text: 'text-amber-600',   lightBg: 'bg-amber-50' },
    'red-500':    { bg: 'bg-red-500',     text: 'text-red-600',     lightBg: 'bg-red-50' },
};

const StatCard = ({ icon: Icon, label, value, color, delay, to }: StatCardProps) => {
    const colors = colorMap[color] || colorMap['primary'];
    const navigate = useNavigate();
    const clickable = !!to;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            onClick={clickable ? () => navigate(to!) : undefined}
            className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all ${
                clickable ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''
            }`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 ${colors.lightBg} rounded-xl flex items-center justify-center ${colors.text}`}>
                    <Icon size={20} strokeWidth={2.2} />
                </div>
                {clickable && (
                    <ArrowUpRight size={16} className="text-slate-300" />
                )}
            </div>

            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
        </motion.div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ eleves: 0, classes: 0, professeurs: 0, matieres: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await dashboardService.getStats();
                if (res.status === 'success') {
                    setStats({
                        eleves: res.data.students || 0,
                        classes: res.data.classes || 0,
                        professeurs: res.data.teachers || 0,
                        matieres: res.data.subjects || 0
                    });
                }
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const today = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Prénom : tente user.prenom puis user.displayName (1er mot) sinon fallback
    const firstName: string =
        (user as any)?.prenom ||
        (user as any)?.firstName ||
        user?.displayName?.split(' ')[0] ||
        'Administrateur';

    if (loading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center">
                <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 border-4 border-primary/10 rounded-2xl"></div>
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-2xl animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LayoutDashboard size={22} className="text-primary" />
                    </div>
                </div>
                <p className="text-slate-400 font-medium text-sm">Chargement…</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 mb-3">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse mr-2"></span>
                        <span className="text-[11px] font-semibold text-emerald-700 capitalize">{today}</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                        Bonjour, <span className="text-primary">{firstName}</span> 👋
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Bienvenue sur votre tableau de bord Smart School.
                    </p>
                </div>

                <div className="hidden lg:flex items-center gap-3 bg-white border border-slate-100 px-4 py-2.5 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold">
                        {stats.eleves}
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Élèves inscrits</p>
                        <p className="text-xs font-medium text-slate-600">Année en cours</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid — labels normaux */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users}         label="Élèves"      value={stats.eleves}      color="primary"    delay={0.05} to="/eleves" />
                <StatCard icon={GraduationCap} label="Classes"     value={stats.classes}     color="purple-500" delay={0.1}  to="/classes" />
                <StatCard icon={UserSquare2}   label="Enseignants" value={stats.professeurs} color="amber-500"  delay={0.15} to="/enseignants" />
                <StatCard icon={BookOpen}      label="Matières"    value={stats.matieres}    color="red-500"    delay={0.2}  to="/matieres" />
            </div>

            {/* Body Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activité récente */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm min-h-[320px]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Activité récente</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Les derniers événements administratifs.</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/40">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                            <Calendar className="text-slate-300" size={24} />
                        </div>
                        <p className="text-sm font-semibold text-slate-500">Aucune activité récente</p>
                        <p className="text-xs text-slate-400 mt-1">Les actions effectuées apparaîtront ici.</p>
                    </div>
                </div>

                {/* Side panels */}
                <div className="flex flex-col gap-6">
                    {/* OCR card */}
                    <motion.div
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-slate-900 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-60 h-60 bg-primary rounded-full -mr-32 -mt-32 blur-[80px] opacity-25"></div>

                        <div className="flex items-center gap-3 mb-3 relative z-10">
                            <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
                                <ScanLine className="text-white" size={20} />
                            </div>
                            <h3 className="text-base font-bold tracking-tight">Saisie des notes par IA</h3>
                        </div>

                        <p className="text-white/70 text-sm mb-5 relative z-10">
                            Numérise un bulletin papier ou une feuille de notes — l'IA extrait les données automatiquement.
                        </p>

                        <button
                            onClick={() => navigate('/ocr')}
                            className="w-full bg-white text-slate-900 font-semibold py-2.5 rounded-xl shadow hover:bg-slate-100 transition-colors flex items-center justify-center text-sm relative z-10"
                        >
                            Lancer un scan
                            <ArrowUpRight size={16} className="ml-1.5" />
                        </button>
                    </motion.div>

                    {/* État système */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">État du système</p>
                                <p className="text-sm font-semibold text-slate-900">Tous les services sont actifs</p>
                            </div>
                        </div>
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
