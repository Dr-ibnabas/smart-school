/**
 * Logger structuré minimal — pour Smart School.
 *
 * Pourquoi pas Winston/Pino ? On veut zéro dépendance supplémentaire et
 * un format lisible en dev ET parsable en prod (JSON 1-ligne).
 *
 * Niveaux : debug < info < warn < error
 * Filtre via LOG_LEVEL (par défaut : info)
 */
import { IS_PROD } from '../config.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel: Level =
  (process.env.LOG_LEVEL as Level) || (IS_PROD ? 'info' : 'debug');

const should = (lvl: Level) => ORDER[lvl] >= ORDER[minLevel];

const fmt = (lvl: Level, msg: string, meta?: Record<string, unknown>) => {
  const ts = new Date().toISOString();
  if (IS_PROD) {
    // JSON 1-ligne pour les agrégateurs (Logflare, Datadog, etc.)
    return JSON.stringify({ ts, level: lvl, msg, ...meta });
  }
  // Dev : compact + couleurs ANSI optionnelles
  const tag = {
    debug: '\x1b[90mDEBUG\x1b[0m',
    info: '\x1b[36mINFO \x1b[0m',
    warn: '\x1b[33mWARN \x1b[0m',
    error: '\x1b[31mERROR\x1b[0m',
  }[lvl];
  const metaStr = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} ${tag} ${msg}${metaStr}`;
};

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => {
    if (should('debug')) console.log(fmt('debug', msg, meta));
  },
  info: (msg: string, meta?: Record<string, unknown>) => {
    if (should('info')) console.log(fmt('info', msg, meta));
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    if (should('warn')) console.warn(fmt('warn', msg, meta));
  },
  error: (msg: string, meta?: Record<string, unknown>) => {
    if (should('error')) console.error(fmt('error', msg, meta));
  },
};
