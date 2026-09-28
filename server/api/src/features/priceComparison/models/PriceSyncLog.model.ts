import { Schema, model, type Document, Types } from 'mongoose';

/**
 * PriceSyncLog - רשומה לכל שלב סנכרון של רשת (סניפים, מחירים, מבצעים).
 * נשמר במאגר ולא רק בזיכרון, כדי לראות אחרי restart מה נכשל ולמה.
 * נמחק אוטומטית אחרי 30 יום.
 */
export type PriceSyncType = 'stores' | 'price-full' | 'price' | 'promo-full' | 'promo';
export type PriceSyncStatus = 'success' | 'failed' | 'skipped';

export interface IPriceSyncLogDoc extends Document {
  _id: Types.ObjectId;
  chainId: string;
  type: PriceSyncType;
  // מזהה ריצת הסנכרון הכוללת, משותף לכל הרשתות והשלבים באותה ריצה
  runId: string;
  startedAt: Date;
  finishedAt?: Date;
  status: PriceSyncStatus;
  filesDownloaded?: number;
  filesFailed?: number;
  recordsDownloaded?: number;
  recordsInserted?: number;
  recordsUpdated?: number;
  recordsDeleted?: number;
  // שורות בלי ברקוד. נספרות ולא נזרקות בשקט
  recordsUnmatched?: number;
  // נתונים נוספים של השלב (סיבות דילוג, חריגה מתקציב וכו')
  details?: Record<string, unknown>;
  error?: string;
}

const LOG_RETENTION_SECONDS = 30 * 24 * 60 * 60;

const schema = new Schema<IPriceSyncLogDoc>(
  {
    chainId: { type: String, required: true },
    type: { type: String, required: true, enum: ['stores', 'price-full', 'price', 'promo-full', 'promo'] },
    runId: { type: String, required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    status: { type: String, required: true, enum: ['success', 'failed', 'skipped'] },
    filesDownloaded: { type: Number },
    filesFailed: { type: Number },
    recordsDownloaded: { type: Number },
    recordsInserted: { type: Number },
    recordsUpdated: { type: Number },
    recordsDeleted: { type: Number },
    recordsUnmatched: { type: Number },
    details: { type: Schema.Types.Mixed },
    error: { type: String },
  },
  { collection: 'price_sync_logs' }
);

// אוסף קטן וחדש, ולכן אינדקס TTL בטוח כאן (בניגוד ל-prices, ראו priceSync.job.ts)
schema.index({ startedAt: 1 }, { expireAfterSeconds: LOG_RETENTION_SECONDS });
schema.index({ chainId: 1, type: 1, startedAt: -1 });

export const PriceSyncLog = model<IPriceSyncLogDoc>('PriceSyncLog', schema);
