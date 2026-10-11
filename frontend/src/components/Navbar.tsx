import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, User, LogOut } from 'lucide-react';

/**
 * Retourne le libellé humain d'un rôle technique.
 */
const roleLabel = (role?: string): string => {
    const r = role?.toLowerCase() || '';
    if (r === 'admin') return 'Administrateur';
    if (r === 'prof') return 'Enseignant';
    if (r === 'eleve') return 'Élève';
    return 'Utilisateur';
};

const displayNameOf = (user: any): string => {
    if (!user) return '';
    const full = `${user.prenom || user.firstName || ''} ${user.nom || user.lastName || ''}`.trim();
    return full || user.displayName || user.email || 'Utilisateur';
};

interface NavbarProps {
    toggleSidebar?: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
    const { user, logout } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();

    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement | null>(null);

    // Fermer le dropdown quand on clique en dehors.
    useEffect(() => {
        if (!notifOpen) return;
        const onClick = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [notifOpen]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 z-20">
            <div className="flex items-center flex-1">
                <button
                    onClick={toggleSidebar}
                    className="p-2 mr-4 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden"
                    aria-label="Ouvrir le menu"
                >
                    <Menu size={20} />
                </button>

                <div className="hidden lg:flex items-center mr-8">
                    <span className="text-sm font-bold text-gray-400 italic tracking-wider">
                        {settings?.school_name || settings?.platform_name || 'Smart School'}
                    </span>
                </div>

                <div className="relative max-w-md w-full hidden md:block">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <Search size={18} />
                    </span>
                    <input
                        type="text"
                        aria-label="Rechercher"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                        placeholder="Rechercher..."
                    />
                </div>
            </div>

            <div className="flex items-center space-x-4">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setNotifOpen(o => !o)}
                        aria-label="Notifications"
                        aria-expanded={notifOpen}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg relative transition-colors cursor-pointer"
                    >
                        <Bell size={20} />
                    </button>
                    {notifOpen && (
                        <div
                            role="dialog"
                            aria-label="Liste des notifications"
                            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-30"
                        >
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm font-bold text-gray-800">Notifications</p>
                            </div>
                            <div className="p-6 text-center text-sm text-gray-400">
                                Aucune notification pour le moment.
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-px bg-gray-200 mx-2"></div>

                {/* Profil */}
                <div className="flex items-center group cursor-pointer">
                    <div className="text-right mr-3 hidden sm:block">
                        <p className="text-sm font-semibold text-gray-800 leading-none capitalize">
                            {displayNameOf(user)}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">
                            {roleLabel(user?.role)}
                        </p>
                    </div>
                    <div
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-md border-2 border-white group-hover:shadow-lg transition-all"
                        title={displayNameOf(user)}
                    >
                        <User size={20} />
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    aria-label="Déconnexion"
                    title="Déconnexion"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
};

export default Navbar;
