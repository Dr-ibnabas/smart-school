import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    UserSquare2,
    GraduationCap,
    BookOpen,
    FileText,
    ScanLine,
    Edit3,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Key,
    CalendarDays,
    Calendar,
    Shield,
    type LucideIcon
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';

interface SidebarItemProps {
    icon: LucideIcon;
    label: string;
    to: string;
    isCollapsed: boolean;
}

const SidebarItem = ({ icon: Icon, label, to, isCollapsed }: SidebarItemProps) => (
    <NavLink
        to={to}
        className={({ isActive }: { isActive: boolean }) => `
      flex items-center p-3.5 my-1.5 rounded-2xl transition-all duration-300 group cursor-pointer relative overflow-hidden
      ${isActive
                ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/10'
                : 'text-gray-500 hover:bg-gray-900/5 hover:text-primary'}
    `}
    >
        {({ isActive }: { isActive: boolean }) => (
            <>
                <div className={`relative z-10 flex items-center ${isCollapsed ? 'mx-auto' : ''}`}>
                    <Icon size={22} className={`${isCollapsed ? '' : 'mr-4'} transition-all transform group-hover:scale-110`} />
                    {!isCollapsed && <span className="font-extrabold text-[13px] uppercase tracking-wider">{label}</span>}
                </div>
                
                {/* Active Indicator Glow */}
                <div className={`
                    absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 transition-opacity duration-500
                    ${isActive ? 'opacity-100' : 'group-hover:opacity-50'}
                `} />
            </>
        )}
    </NavLink>
);


interface SidebarProps {
    isOpen?: boolean;
    setIsOpen?: (val: boolean) => void;
}

export const Sidebar = ({ isOpen = true, setIsOpen = () => { } }: SidebarProps) => {
    const { user, logout } = useAuth();
    const { settings, logoUrl } = useSettings();
    const navigate = useNavigate();

    const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super_admin';
    const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin';

    // Libellé du rôle pour affichage humain.
    const roleLabel = (() => {
        const r = user?.role?.toLowerCase() || '';
        if (r === 'admin') return 'Administrateur';
        if (r === 'prof') return 'Enseignant';
        if (r === 'eleve') return 'Élève';
        return 'Utilisateur';
    })();

    // Nom à afficher : "Prénom Nom" si dispo, sinon email.
    const fullName = (() => {
        const u: any = user;
        const full = `${u?.prenom || u?.firstName || ''} ${u?.nom || u?.lastName || ''}`.trim();
        return full || u?.displayName || u?.email || 'Utilisateur';
    })();

    const avatarInitial = (
        (user as any)?.prenom?.charAt(0) ||
        (user as any)?.firstName?.charAt(0) ||
        user?.email?.charAt(0) ||
        'U'
    ).toUpperCase();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside
            className={`
        relative h-screen transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-50 flex flex-col
        ${isOpen ? 'w-80' : 'w-24'} p-4
      `}
        >
            <div className={`h-full flex flex-col glass rounded-[2.5rem] overflow-hidden border-white/40 shadow-2xl relative`}>
                {/* Logo Section */}
                <div className="p-8 flex items-center justify-between">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`flex items-center gap-4 ${!isOpen && 'mx-auto'}`}
                    >
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-light rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="relative w-12 h-12 object-contain rounded-2xl bg-white p-2 shadow-lg" />
                            ) : (
                                <div className="relative w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center shadow-xl shadow-gray-900/20">
                                    <span className="text-white font-black text-2xl">{settings?.platform_name?.charAt(0) || 'S'}</span>
                                </div>
                            )}
                            <div className="absolute bottom-[-2px] right-[-2px] w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                        </div>
                        
                        {isOpen && (
                            <div className="flex flex-col">
                                <span className="text-xl font-black text-gray-900 leading-none tracking-tighter">
                                    {settings?.platform_name || 'SmartSchool'}
                                </span>
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">Management Hub</span>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
                    <div className="mb-4">
                        <p className={`text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 px-4 ${!isOpen && 'hidden'}`}>Menu Principal</p>
                        <SidebarItem icon={LayoutDashboard} label="Tableau de bord" to="/dashboard" isCollapsed={!isOpen} />
                        <SidebarItem icon={Users} label="Élèves" to="/eleves" isCollapsed={!isOpen} />
                        <SidebarItem icon={GraduationCap} label="Classes" to="/classes" isCollapsed={!isOpen} />
                        <SidebarItem icon={FileText} label="Bulletin" to="/bulletins" isCollapsed={!isOpen} />
                        <SidebarItem icon={BookOpen} label="Matières" to="/matieres" isCollapsed={!isOpen} />
                        <SidebarItem icon={UserSquare2} label="Enseignants" to="/enseignants" isCollapsed={!isOpen} />
                    </div>

                    <div className="pt-6 mb-4">
                        <div className={`h-px bg-gray-900/5 mx-4 mb-6 ${!isOpen && 'hidden'}`}></div>
                        <p className={`text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 px-4 ${!isOpen && 'hidden'}`}>IA & Outils</p>
                        <SidebarItem icon={ScanLine} label="Saisie par IA" to="/ocr" isCollapsed={!isOpen} />
                        <SidebarItem icon={Edit3} label="Saisie Manuelle" to="/saisie-manuelle" isCollapsed={!isOpen} />
                        <SidebarItem icon={CalendarDays} label="Absences" to="/absences" isCollapsed={!isOpen} />
                        <SidebarItem icon={Calendar} label="Emplois du temps" to="/emplois-du-temps" isCollapsed={!isOpen} />
                    </div>

                    {isAdmin && (
                        <div className="pt-6">
                             <div className={`h-px bg-gray-900/5 mx-4 mb-6 ${!isOpen && 'hidden'}`}></div>
                            <p className={`text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 px-4 ${!isOpen && 'hidden'}`}>Administration</p>
                            <SidebarItem icon={Key} label="Utilisateurs" to="/utilisateurs" isCollapsed={!isOpen} />
                            <SidebarItem icon={Settings} label="Configuration" to="/settings" isCollapsed={!isOpen} />
                        </div>
                    )}

                    {isSuperAdmin && (
                        <div className="pt-6">
                            <div className={`h-px bg-gray-900/5 mx-4 mb-6 ${!isOpen && 'hidden'}`}></div>
                            <p className={`text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 px-4 ${!isOpen && 'hidden'}`}>Super Admin</p>
                            <SidebarItem icon={Shield} label="Gestion des écoles" to="/super-admin" isCollapsed={!isOpen} />
                        </div>
                    )}
                </nav>

                {/* Footer / User Profile */}
                <div className="p-4 mt-auto">
                    <div className={`bg-gray-900/5 rounded-3xl p-4 transition-all duration-300 ${isOpen ? 'flex' : 'flex-col'} items-center gap-3 group hover:bg-white`}>
                        <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                            {avatarInitial}
                        </div>
                        {isOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-gray-900 truncate uppercase mt-[-2px]" title={fullName}>{fullName}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{roleLabel}</p>
                            </div>
                        )}
                        <button 
                            onClick={handleLogout}
                            title="Se déconnecter"
                            className="bg-red-500/10 text-red-500 p-3 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                {/* Collapse Toggle Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-8 h-12 glass border-l-0 rounded-l-none rounded-r-3xl flex items-center justify-center shadow-xl text-primary hover:w-10 hover:text-white hover:bg-primary transition-all duration-300 z-10 group"
                >
                    {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                </button>
            </div>
        </aside>
    );
};

