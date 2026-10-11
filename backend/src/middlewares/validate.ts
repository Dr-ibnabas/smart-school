import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware générique de validation de body via un schéma Zod.
 *
 * Usage :
 *   const LoginSchema = z.object({ email: z.string(), password: z.string().min(6) });
 *   router.post('/auth/login', validateBody(LoginSchema), handler);
 *
 * En cas d'échec, renvoie 400 avec la liste des champs en erreur :
 *   { error: 'Données invalides', details: { email: 'Required', ... } }
 *
 * Le body parsé/coercé est disponible dans handler via `req.body`.
 */
export const validateBody = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const err = result.error as ZodError;
      const details: Record<string, string> = {};
      for (const issue of err.issues) {
        const path = issue.path.join('.') || '_root';
        if (!details[path]) details[path] = issue.message;
      }
      return res.status(400).json({ error: 'Données invalides', details });
    }
    req.body = result.data;
    next();
  };
};
