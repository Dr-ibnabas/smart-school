import { Response } from 'express';

/**
 * Helpers de réponse cohérents pour toutes les routes.
 *
 * Le frontend actuel attend des formats variés selon les endpoints (data, eleves,
 * classes, matieres…). Ces helpers gardent la compatibilité tout en formalisant
 * le contrat. Ils peuvent être adoptés progressivement.
 */

export const ok = (res: Response, payload: Record<string, unknown> = {}) =>
  res.json({ status: 'success', ...payload });

export const created = (res: Response, id: number | string, extras: Record<string, unknown> = {}) =>
  res.status(201).json({ status: 'success', data: { id }, ...extras });

export const fail = (res: Response, status: number, message: string, details?: unknown) =>
  res.status(status).json({
    status: 'error',
    error: message,
    ...(details !== undefined ? { details } : {}),
  });
