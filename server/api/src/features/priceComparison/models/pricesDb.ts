import mongoose from 'mongoose';

/**
 * המסד של נתוני המחירים הציבוריים: מחירים, סניפים, כיסוי סניפים, מבצעים ולוג סנכרון.
 *
 * הנתונים האלה זהים בכל סביבה (מה שהרשתות מפרסמות), ולכן יש מהם עותק אחד משותף
 * ל-prod ול-non-prod. שני עותקים מלאים (כ-250MB כל אחד) לא נכנסים במכסה המשותפת
 * של 512MB באשכול Atlas. נתוני משתמשים (רשימות, תיקוני התאמה) נשארים במסד של כל
 * סביבה (MONGODB_URI).
 *
 * אותו חיבור ואותו מאגר חיבורים (useDb), רק מסד אחר. PRICES_DB_NAME מאפשר לשנות.
 */
export const PRICES_DB_NAME = process.env.PRICES_DB_NAME || 'smartbasket_prod';

export const pricesDb = mongoose.connection.useDb(PRICES_DB_NAME, { useCache: true });
