import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import OCRNotes from './pages/OCRNotes';
import NotesManuelles from './pages/NotesManuelles';

import Eleves from './pages/Eleves';
import Classes from './pages/Classes';
import Bulletins from './pages/Bulletins';
import PlatformSettings from './pages/PlatformSettings';
import Enseignants from './pages/Enseignants';
import Matieres from './pages/Matieres';
import Utilisateurs from './pages/Utilisateurs';
import Absences from './pages/Absences';
import EmploisDuTemps from './pages/EmploisDuTemps';
import SuperAdmin from './pages/SuperAdmin';
import SuperAdminSchool from './pages/SuperAdminSchool';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
    requireTeacher?: boolean;
    requireSuperAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false, requireTeacher = false, requireSuperAdmin = false }: ProtectedRouteProps) => {
    const { user, loading } = useAuth();

    if (loading) return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!user) return <Navigate to="/login" replace />;

    const userRole = user.role?.toLowerCase() || '';

    if (requireSuperAdmin && userRole !== 'super_admin') {
        return <Navigate to="/dashboard" replace />;
    }

    // Le super_admin a TOUS les droits implicites (admin / prof inclus)
    const isSuper = userRole === 'super_admin';

    if (requireAdmin && !isSuper && userRole !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    // Les admins (et super_admin) ont aussi accès aux routes profs
    if (requireTeacher && !isSuper && userRole !== 'prof' && userRole !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<ProtectedRoute><Layout><Navigate to="/dashboard" replace /></Layout></ProtectedRoute>} />

      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      
      <Route path="/ocr" element={<ProtectedRoute><Layout><OCRNotes /></Layout></ProtectedRoute>} />
      <Route path="/saisie-manuelle" element={<ProtectedRoute requireTeacher={true}><Layout><NotesManuelles /></Layout></ProtectedRoute>} />

      <Route path="/eleves" element={<ProtectedRoute><Layout><Eleves /></Layout></ProtectedRoute>} />
      <Route path="/classes" element={<ProtectedRoute requireAdmin={true}><Layout><Classes /></Layout></ProtectedRoute>} />
      <Route path="/bulletins" element={<ProtectedRoute requireAdmin={true}><Layout><Bulletins /></Layout></ProtectedRoute>} />
      <Route path="/enseignants" element={<ProtectedRoute requireAdmin={true}><Layout><Enseignants /></Layout></ProtectedRoute>} />
      <Route path="/matieres" element={<ProtectedRoute requireAdmin={true}><Layout><Matieres /></Layout></ProtectedRoute>} />
      <Route path="/utilisateurs" element={<ProtectedRoute requireAdmin={true}><Layout><Utilisateurs /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute requireAdmin={true}><Layout><PlatformSettings /></Layout></ProtectedRoute>} />
      <Route path="/absences" element={<ProtectedRoute><Layout><Absences /></Layout></ProtectedRoute>} />
      <Route path="/emplois-du-temps" element={<ProtectedRoute><Layout><EmploisDuTemps /></Layout></ProtectedRoute>} />

      {/* Routes Super Admin (rôle 'super_admin' uniquement) */}
      <Route path="/super-admin" element={<ProtectedRoute requireSuperAdmin><Layout><SuperAdmin /></Layout></ProtectedRoute>} />
      <Route path="/super-admin/school/:id" element={<ProtectedRoute requireSuperAdmin><Layout><SuperAdminSchool /></Layout></ProtectedRoute>} />
      <Route path="/super-admin/school/:id/theme" element={<ProtectedRoute requireSuperAdmin><Layout><SuperAdminSchool /></Layout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


export default App;
