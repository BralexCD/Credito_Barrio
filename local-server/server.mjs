import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createApp } from './app.mjs';
import { generateStatements, getLimaDateString, getLimaDateTimeString } from './domain.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const DB_PATH = process.env.DB_PATH || join(__dirname, 'data', 'credit.sqlite');

const appInstance = createApp({
  dbPath: DB_PATH,
  seed: true,
});

const { server, db } = appInstance;

// Automatic statement closure on boot and periodically using actual Lima date and time
function runAutomaticClosure() {
  try {
    const today = getLimaDateString();
    const currentDateTime = getLimaDateTimeString();
    const result = generateStatements(db, { role: 'SYSTEM' }, today, currentDateTime);
    if (result.created > 0) {
      console.log(`[Auto-Closure] Successfully generated ${result.created} pending statements for ${today} (${currentDateTime})`);
    }
  } catch (err) {
    console.error('[Auto-Closure] Error during statement closure:', err.message);
  }
}

server.listen(PORT, HOST, () => {
  console.log(`[Crédito Barrio] Server running at http://${HOST}:${PORT}`);
  runAutomaticClosure();

  // Run auto-closure every hour
  const timer = setInterval(runAutomaticClosure, 60 * 60 * 1000);
  timer.unref();
});

function gracefulShutdown() {
  console.log('\n[Crédito Barrio] Shutting down gracefully...');
  appInstance.close();
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
