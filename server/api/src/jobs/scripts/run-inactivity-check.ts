/**
 * סקריפט הרצה ידנית לתזכורת "שבת בפתח".
 * הפעלה: npm run check-inactivity
 * מצב יבש (בלי לשלוח בפועל, רק מדפיס מועמדים): npm run check-inactivity -- --dry-run
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../../config/environment';
import { logger } from '../../config/logger';
import { UserDAL } from '../../dal';
import { runInactivityCheck } from '../inactivityReminder.job';

const INACTIVITY_DAYS = 21;

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  logger.info('Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  logger.info('Connected.');

  if (dryRun) {
    const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);
    const ids = await UserDAL.findInactiveUnnotified(cutoff);
    logger.info(`[dry-run] ${ids.length} inactive candidate(s) (cutoff: ${cutoff.toISOString()})`);
    if (ids.length > 0) {
      const users = await UserDAL.find({ _id: { $in: ids } });
      users.forEach(u => logger.info(`  - ${u.email} (${u.name})`));
    }
  } else {
    const { notified } = await runInactivityCheck('manual');
    logger.info(`Notified ${notified} user(s).`);
  }

  await mongoose.disconnect();
  logger.info('Disconnected.');
}

main().catch(err => {
  logger.error('Fatal error in run-inactivity-check:', err);
  process.exit(1);
});
