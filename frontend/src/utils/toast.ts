/**
 * Wrapper autour de react-hot-toast pour avoir un style cohérent
 * et une seule API à utiliser dans toute l'app :
 *
 *   import { notify } from '@/utils/toast'
 *   notify.success('Élève créé')
 *   notify.error('Connexion impossible')
 *   notify.info('Aucune note pour ce trimestre')
 */
import toast from 'react-hot-toast';

export const notify = {
  success: (msg: string) => toast.success(msg, { duration: 3500 }),
  error: (msg: string) => toast.error(msg, { duration: 5000 }),
  info: (msg: string) => toast(msg, { duration: 3500, icon: 'ℹ️' }),
  loading: (msg: string) => toast.loading(msg),
  dismiss: (id?: string) => toast.dismiss(id),
};

export { toast };
