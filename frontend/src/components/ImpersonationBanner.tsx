import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notify } from '../utils/toast';

/**
 * Bandeau rouge affiché en haut de l'app quand le super-admin a
 * basculé en mode "vu comme [User X]".
 */
export const ImpersonationBanner: React.FC = () => {
    const { user, isImpersonating, stopImpersonation } = useAuth();
    const navigate = useNavigate();

    if (!isImpersonating) return null;

    const handleStop = () => {
        const ok = stopImpersonation();
        if (ok) {
            notify.success('Retour en super-administrateur.');
            navigate('/super-admin');
        } else {
            notify.error("Impossible de restaurer la session super-admin.");
        }
    };

    return (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between shadow-md sticky top-0 z-[200]">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                <ShieldAlert size={16} />
                <span className="hidden sm:inline">
                    Mode impersonation actif — connecté en tant que{' '}
                </span>
                <span className="sm:hidden">Connecté en tant que </span>
                <span className="font-bold underline">
                    {user?.prenom} {user?.nom} {user?.matricule ? `(${user.matricule})` : ''}
                </span>
            </div>
            <button
                onClick={handleStop}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950 text-amber-100 text-xs font-semibold hover:bg-amber-900 transition-colors active:scale-95"
            >
                <LogOut size={14} />
                Quitter
            </button>
        </div>
    );
};
