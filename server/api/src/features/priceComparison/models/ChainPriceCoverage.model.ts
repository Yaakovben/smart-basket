import { Schema, model, type Document, Types } from 'mongoose';

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
}

const schema = new Schema<IChainPriceCoverageDoc>(
  {
    chainId: { type: String, required: true, unique: true },
    storeIds: { type: [String], default: [] },
    syncedAt: { type: Date, required: true },
  },
  { collection: 'chain_price_coverage' }
);

export const ChainPriceCoverage = model<IChainPriceCoverageDoc>('ChainPriceCoverage', schema);
