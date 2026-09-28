import { PriceSyncLog, type IPriceSyncLogDoc, type PriceSyncType, type PriceSyncStatus } from '../models/PriceSyncLog.model';
import { logger } from '../../../config/logger';

export type SyncLogFields = Partial<Pick<IPriceSyncLogDoc,
  'filesDownloaded' | 'filesFailed' | 'recordsDownloaded' | 'recordsInserted' | 'recordsUpdated'
  | 'recordsDeleted' | 'recordsUnmatched' | 'details' | 'error'>>;

export const PriceSyncLogDAL = {
  /**
   * רושם שלב סנכרון שהסתיים. כשל בכתיבת הלוג לא מפיל את הסנכרון עצמו:
   * הלוג הוא כלי אבחון, והמחירים חשובים יותר.
   */
  async record(input: {
    chainId: string;
    type: PriceSyncType;
    runId: string;
    startedAt: Date;
    status: PriceSyncStatus;
  } & SyncLogFields): Promise<void> {
    try {
      await PriceSyncLog.create({ ...input, finishedAt: new Date() });
    } catch (err) {
      logger.warn(`[price-sync-log] failed to record ${input.chainId}/${input.type}: ${err instanceof Error ? err.message : err}`);
    }
  },

  // הרשומה האחרונה לכל (רשת, שלב)
  async latestPerChain(): Promise<IPriceSyncLogDoc[]> {
    return PriceSyncLog.aggregate([
      { $sort: { startedAt: -1 } },
      { $group: { _id: { chainId: '$chainId', type: '$type' }, doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { chainId: 1, type: 1 } },
    ]);
  },

  async recent(limit: number, chainId?: string): Promise<IPriceSyncLogDoc[]> {
    return PriceSyncLog.find(chainId ? { chainId } : {}).sort({ startedAt: -1 }).limit(limit).lean<IPriceSyncLogDoc[]>();
  },
};
