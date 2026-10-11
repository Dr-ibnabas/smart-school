import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

export interface AuthUserPayload {
  id: number | string;
  email?: string;
  role?: string;
  matricule?: string;
  /** ID de l'école d'appartenance. NULL pour les super_admin (= globaux). */
  school_id?: number | null;
}

// Augmentation du type Express pour avoir req.user typé.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};

/**
 * Middleware de vérification de rôle. À utiliser APRÈS verifyToken.
 *   router.get('/admin/...', verifyToken, requireRole('admin'), handler)
 *
 * NOTE : 'super_admin' a IMPLICITEMENT tous les droits — pas besoin de
 *         le lister à chaque appel.
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role?.toLowerCase();
    if (!role) {
      return res.status(403).json({ error: 'Accès interdit.' });
    }
    if (role === 'super_admin') return next();
    if (!roles.map(r => r.toLowerCase()).includes(role)) {
      return res.status(403).json({ error: 'Accès interdit pour ce rôle.' });
    }
    next();
  };
};

/**
 * Réservé strictement au super-admin global (gestion de la plateforme).
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role?.toLowerCase() !== 'super_admin') {
    return res.status(403).json({ error: 'Accès super-administrateur requis.' });
  }
  next();
};

/**
 * Helper de tenant scoping : retourne un fragment SQL `WHERE school_id = ?`
 * (ou rien si super_admin avec accès global).
 *
 *   const { sql, params } = tenantScope(req)
 *   const [rows] = await pool.query(`SELECT * FROM students ${sql}`, params)
 *
 * Si le super_admin précise ?school_id=X dans la query, on filtre sur X.
 */
export const tenantScope = (
  req: Request,
  prefix = ' AND ',
  column = 'school_id'
): { sql: string; params: any[] } => {
  const role = req.user?.role?.toLowerCase();
  if (role === 'super_admin') {
    const override = req.query.school_id;
    if (override) {
      return { sql: `${prefix}${column} = ?`, params: [override] };
    }
    return { sql: '', params: [] }; // pas de filtrage
  }
  return { sql: `${prefix}${column} = ?`, params: [req.user?.school_id ?? -1] };
};
