/**
 * Configuration centralisée du backend Smart School.
 * Valide les variables d'environnement critiques au démarrage et expose
 * des valeurs typées au reste de l'application.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

/* --- JWT --- */
const rawJwtSecret = process.env.JWT_SECRET || '';
if (isProd && (!rawJwtSecret || rawJwtSecret === 'change-me-in-production' || rawJwtSecret.length < 32)) {
  // En prod, on REFUSE de démarrer si le secret n'est pas correctement défini.
  // Cela évite les forgeries triviales de JWT.
  // eslint-disable-next-line no-console
  console.error(
    '\n[FATAL] JWT_SECRET est manquant, trop court ou laissé à sa valeur par défaut.\n' +
    'Générer une valeur de 64+ caractères :\n' +
    '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n'
  );
  process.exit(1);
}
export const JWT_SECRET: string =
  rawJwtSecret || 'dev-only-jwt-secret-do-not-use-in-prod-or-against-real-users';

/* --- CORS --- */
const rawCors = process.env.CORS_ORIGINS || '';
const corsList = rawCors
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

export const CORS_ORIGINS: string[] =
  corsList.length > 0
    ? corsList
    : isProd
      ? [] // En prod, pas de fallback laxiste : si rien n'est défini, rien n'est autorisé.
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];

/* --- Rate-limit /auth/login --- */
export const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX) || 5;
export const AUTH_RATE_LIMIT_WINDOW_MIN = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MIN) || 15;

/* --- Divers --- */
export const PORT = Number(process.env.PORT) || 3001;
export const IS_PROD = isProd;
