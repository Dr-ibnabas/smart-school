import { BACKEND_URL } from '../services/api';

/**
 * Résout une URL d'asset servie par le backend (`/uploads/...`) en URL
 * absolue compatible dev + prod.
 *
 * - En dev : Vite proxifie /uploads → localhost:3001, on peut laisser la
 *   chemin relatif. Mais on préfixe quand même pour être robuste si le proxy
 *   est désactivé.
 * - En prod : BACKEND_URL pointe vers le domaine du backend hébergé
 *   (Railway/Render). On préfixe donc systématiquement.
 *
 * Comportements spéciaux :
 *   resolveAssetUrl(null) === ''
 *   resolveAssetUrl('https://cdn.example/x.png') === 'https://cdn.example/x.png' (déjà absolu)
 *   resolveAssetUrl('/uploads/x.png') === '<BACKEND_URL>/uploads/x.png'
 */
export const resolveAssetUrl = (path?: string | null): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith('/')) return path; // ne préfixe pas les chemins relatifs non standards
  return `${BACKEND_URL}${path}`;
};
