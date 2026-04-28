import { Schema, model, type Document, Types } from 'mongoose';
import type { ChainId } from './Price.model';

/**
 * Branch — סניף פיזי של רשת שופרמרקט.
 * הנתונים נטענים מקובצי Stores*.xml בפורטל השקיפות הממשלתי.
 * סניפים ללא lat/lng עוברים geocoding דרך Nominatim (עם cache).
 */
export interface IBranchDoc extends Document {
  _id: Types.ObjectId;
  chainId: ChainId;
  chainName: string;
  // מזהה הסניף בפורטל (ייחודי בתוך הרשת - לא בהכרח ייחודי גלובלית)
  storeId: string;
  storeName: string;
  address?: string;
  city?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  // מקור הקואורדינטות: 'portal' (הגיע בקובץ), 'geocoded' (דרך Nominatim), 'unknown'
  coordSource: 'portal' | 'geocoded' | 'unknown';
  // תת-מותג ברשת (AM:PM, פרש מרקט, היפר וכו') וסוג סניף
  subChainId?: string;
  subChainName?: string;
  storeType?: string;
  // מתי עודכן מה-portal לאחרונה
  lastSyncedAt: Date;
  updatedAt: Date;
  createdAt: Date;
}

const branchSchema = new Schema<IBranchDoc>(
  {
    chainId: { type: String, required: true, index: true },
    chainName: { type: String, required: true },
    storeId: { type: String, required: true },
    storeName: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    zipCode: { type: String },
    lat: { type: Number },
    lng: { type: Number },
    coordSource: { type: String, enum: ['portal', 'geocoded', 'unknown'], default: 'unknown' },
    subChainId: { type: String },
    subChainName: { type: String },
    storeType: { type: String },
    lastSyncedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: true,
    collection: 'branches',
    toJSON: {
      transform: (_, ret) => {
        const { _id, __v, ...rest } = ret;
        return { ...rest, id: _id.toString() };
      },
    },
  }
);

// ייחודיות: סניף אחד לכל (chain, storeId)
branchSchema.index({ chainId: 1, storeId: 1 }, { unique: true });
// חיפוש מהיר לפי מיקום - מאפשר לעתיד גם geoWithin במונגו (2dsphere)
branchSchema.index({ chainId: 1, lat: 1, lng: 1 });

export const Branch = model<IBranchDoc>('Branch', branchSchema);
