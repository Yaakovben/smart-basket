/**
 * force-logout-all.ts
 *
 * מגדיל tokenVersion לכל המשתמשים ב-DB פעם אחת - מבטל בבת אחת את כל
 * ה-access/refresh tokens הקיימים בעולם (הם stateless JWT, נבדקים מול
 * tokenVersion ב-DB בכל בקשה מאומתת - ראו auth.middleware.ts). כל משתמש
 * מחובר יקבל 401 בבקשה הבאה שלו ויידרש להתחבר מחדש.
 *
 * שימוש חד-פעמי בלבד, לאחר תקלת תשתית שדורשת שכולם יתחברו מחדש. מריצים
 * ידנית מול סביבת ה-production בפועל: npm run force-logout-all
 * (עם MONGODB_URI של production ב-.env בזמן ההרצה).
 */
import { connectDatabase } from '../config/database';
import { User } from '../models';
import mongoose from 'mongoose';

async function main() {
  await connectDatabase();
  const result = await User.updateMany({}, { $inc: { tokenVersion: 1 } });
  console.log(`נותקו ${result.modifiedCount} משתמשים (tokenVersion עודכן).`);
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('force-logout-all נכשל:', err);
  process.exit(1);
});
