import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

import express from 'express';
import cors from 'cors';
import path from 'path';
import { CORS_ORIGINS, PORT, IS_PROD } from './config.js';
import { verifyToken } from './middlewares/auth.js';
import { validateBody } from './middlewares/validate.js';
import { AnalyzeSchema } from './schemas.js';
import { logger } from './utils/logger.js';
import apiRouter from './routes.js';
import gradesRouter from './routes-grades.js';
import usersRouter from './routes-users.js';
import settingsRouter from './routes-settings.js';
import absencesRouter from './routes-absences.js';
import timetablesRouter from './routes-timetables.js';
import bulletinsRouter from './routes-bulletins.js';
import superAdminRouter from './routes-super-admin.js';

const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
  model: 'googleai/gemini-2.5-flash',
});

const GradeSchema = z.object({
  subject: z.string().optional(),
  students: z.array(z.object({
    studentName: z.string(),
    grade: z.number(),
    maxGrade: z.number().default(20),
    teacherComments: z.string().optional(),
  }))
});

const app = express();

// ---- CORS strict (whitelist depuis config.ts) ----
app.use(cors({
  origin: (origin, callback) => {
    // Requêtes server-to-server / curl / Postman : pas d'origin → autoriser
    if (!origin) return callback(null, true);
    if (CORS_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`Origine non autorisée par CORS : ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '15mb' }));      // OCR images en base64 — réduit de 50 à 15 Mo
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// ---- /uploads/settings — branding public (logo/tampon affichés sur la page Login)
app.use(
  '/uploads/settings',
  express.static(path.resolve('uploads/settings'), {
    dotfiles: 'deny',           // pas de .htaccess, .env, etc.
    index: false,                // pas de listing
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  })
);

// ---- /uploads/schools — branding d'écoles spécifiques (logos, tampons d'établissement)
app.use(
  '/uploads/schools',
  express.static(path.resolve('uploads/schools'), {
    dotfiles: 'deny',
    index: false,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  })
);

// Tout autre accès à /uploads/* est explicitement refusé.
app.use('/uploads', (_req, res) => res.status(404).json({ error: 'Not Found' }));

// ---- API routers (MySQL) ----
app.use('/api', apiRouter);
app.use('/api', gradesRouter);
app.use('/api', usersRouter);
app.use('/api', settingsRouter);
app.use('/api', absencesRouter);
app.use('/api', timetablesRouter);
app.use('/api', bulletinsRouter);
app.use('/api/super-admin', superAdminRouter);

// Endpoint public : récupère le thème d'une école par code (pour la page de login)
app.get('/api/schools/by-code/:code/public', async (req, res) => {
  try {
    const pool = (await import('./db.js')).default;
    const [rows]: any = await pool.query(
      `SELECT id, code, nom, devise, logo_url,
              theme_primary, theme_primary_light, theme_secondary,
              theme_background, theme_accent, font_family, density, dark_mode
       FROM schools WHERE code = ? AND status = 'active' LIMIT 1`,
      [req.params.code]
    );
    if (!rows[0]) return res.status(404).json({ error: 'École introuvable' });
    res.json({ status: 'success', data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- OCR (Gemini via Genkit) — protégé par auth ----
app.post('/api/analyze-and-save', verifyToken, validateBody(AnalyzeSchema), async (req, res) => {
  try {
    const { image } = req.body as { image: string };

    const result = await ai.generate({
      prompt: [
        { text: "Analyse cette image qui contient une liste de notes d'élèves ou un bulletin. Extrais la matière commune et la liste de TOUS les élèves visibles avec leur note obtenue et la note maximale (souvent 20). S'il y a plusieurs noms, génère un élément dans 'students' pour chacun." },
        { media: { url: image } }
      ],
      output: { schema: GradeSchema },
    });

    const output = result.output;
    if (!output) throw new Error("Échec de l'analyse OCR");

    res.json({
      eleves: output.students.map((s) => ({
        name: s.studentName,
        note: s.grade,
        max: s.maxGrade,
        appreciation: s.teacherComments || ''
      })),
      rawExtract: JSON.stringify(output)
    });
  } catch (error: any) {
    logger.error('OCR Gemini failure', { msg: error?.message || String(error) });
    res.status(500).json({ error: 'Le système LARIA a rencontré une difficulté pour analyser cette image.' });
  }
});

// ---- Health-check public ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime_s: Math.round(process.uptime()) });
});

// ---- Global Error Handler ----
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err?.status || 500;
  logger.error('Unhandled server error', {
    status,
    method: req.method,
    path: req.path,
    msg: err?.message,
  });
  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : (err?.message || 'Bad Request'),
    ...(IS_PROD ? {} : { detail: err?.message })
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Smart School backend démarré`, {
    port: PORT,
    env: IS_PROD ? 'production' : 'development',
    cors: CORS_ORIGINS.length ? CORS_ORIGINS : '(bloqué — aucune origine)',
  });
});

export default app;
