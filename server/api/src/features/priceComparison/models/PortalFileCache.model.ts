import { pricesDb } from './pricesDb';
import { Schema, type Document, Types } from 'mongoose';

/**
 * PortalFileCache - רשימת הקבצים האחרונה שנראתה בפורטל של רשת.
 *
 * laibcatalog (ויקטורי, מחסני השוק) וקרפור מציגים רק את קובצי היום. בלילה ובבוקר
 * המוקדם הרשימה ריקה או חלקית, אבל הקבצים של אתמול עדיין זמינים להורדה בכתובת שלהם
 * (נבדק ב-29.9.2026). לכן שומרים את הרשימה, ובכל סנכרון מאחדים את רשימת היום עם
 * השמורה: כל סניף מקבל את הקובץ העדכני ביותר מבין השתיים.
 */
export interface IPortalFileCacheDoc extends Document {
  _id: Types.ObjectId;
  chainId: string;
  // רשומות הפורטל כמו שהן (שם קובץ, סוג, תאריך, ומה שצריך להורדה)
  entries: Array<Record<string, unknown>>;
  updatedAt: Date;
}

const schema = new Schema<IPortalFileCacheDoc>(
  {
    chainId: { type: String, required: true, unique: true },
    entries: { type: Schema.Types.Mixed, default: [] },
  },
  { collection: 'portal_file_cache', timestamps: { createdAt: false, updatedAt: true } }
);

export const PortalFileCache = pricesDb.model<IPortalFileCacheDoc>('PortalFileCache', schema);
