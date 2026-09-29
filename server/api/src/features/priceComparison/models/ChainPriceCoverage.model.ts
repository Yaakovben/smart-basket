import { pricesDb } from './pricesDb';
import { Schema, type Document, Types } from 'mongoose';

/**
 * ChainPriceCoverage - אילו סניפים של רשת הופיעו בפיד המחירים האחרון.
 *
 * בתוך מסמכי Price נשמרות חריגות מחיר בלבד (storePrices, ראו
 * services/branchPricing.ts), ולכן היעדר חריגה יכול להיות "אותו מחיר כמו ברשת"
 * או "הסניף לא סונכרן בכלל".
 * המסמך הזה מבדיל ביניהם: רק סניף שמופיע כאן אפשר להסיק עליו מחיר.
 * מסמך אחד לרשת, עם מזהי סניפים מנורמלים (בלי אפסים מובילים).
 */
export interface IChainPriceCoverageDoc extends Document {
  _id: Types.ObjectId;
  chainId: string;
  storeIds: string[];
  syncedAt: Date;
  // הסניפים שקובץ המבצעים שלהם עובד בסנכרון האחרון, בסדר של מפות הביטים בפריטי
  // המבצע. לסניף שלא מופיע כאן אין מידע על מבצעים (לא "אין מבצע").
  promoStoreIds?: string[];
  // ריצת הסנכרון שהמבצעים שלה נקראים. מתעדכן יחד עם promoStoreIds בכתיבה אחת
  promoSyncRunId?: string;
  promoSyncedAt?: Date;
}

const schema = new Schema<IChainPriceCoverageDoc>(
  {
    chainId: { type: String, required: true, unique: true },
    storeIds: { type: [String], default: [] },
    // לא חובה: רשת שטרם סונכרנו לה מחירים עדיין יכולה לקבל כיסוי מבצעים
    syncedAt: { type: Date },
    promoStoreIds: { type: [String], default: undefined },
    promoSyncRunId: { type: String },
    promoSyncedAt: { type: Date },
  },
  { collection: 'chain_price_coverage' }
);

export const ChainPriceCoverage = pricesDb.model<IChainPriceCoverageDoc>('ChainPriceCoverage', schema);
