// useBulkImport - ייבוא המוני של סניפים מטקסט CSV (שם, עיר, כתובת, lat, lng).

import { useState } from 'react';
import { haptic } from '../../../global/helpers';
import { priceComparisonApi } from '../../priceComparison';
import type { SyncFeedback } from '../types/priceSync-types';

interface UseBulkImportArgs {
  setFeedback: (feedback: SyncFeedback | null) => void;
  load: () => void;
  resetChainBranches: () => void;
}

export function useBulkImport({ setFeedback, load, resetChainBranches }: UseBulkImportArgs) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkChainId, setBulkChainId] = useState('shufersal');
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkImport = async () => {
    // פורמט: שורה לסניף - storeName,city,address,lat,lng
    const lines = bulkText.trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const parsed: Array<{ chainId: string; storeName: string; city: string; address: string; lat: number; lng: number }> = [];
    const parseErrors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length < 5) {
        parseErrors.push(`שורה ${i + 1}: צריך 5 ערכים מופרדים בפסיק`);
        continue;
      }
      const [storeName, city, address, latStr, lngStr] = parts;
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!storeName || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        parseErrors.push(`שורה ${i + 1}: שם או lat/lng לא תקפים`);
        continue;
      }
      parsed.push({ chainId: bulkChainId, storeName, city, address, lat, lng });
    }

    if (parsed.length === 0) {
      setFeedback({ msg: `לא נמצאו שורות תקפות. ${parseErrors.slice(0, 2).join('; ')}`, tone: 'error' });
      return;
    }

    setBulkLoading(true);
    haptic('medium');
    const res = await priceComparisonApi.bulkAddBranches(parsed);
    setBulkLoading(false);
    setFeedback({
      msg: res.success
        ? `✓ נוספו ${res.success_count} סניפים` + (res.failed_count ? `, ${res.failed_count} נכשלו` : '')
        : `שגיאה: ${res.message}`,
      tone: res.success ? 'info' : 'error',
    });
    if (res.success) {
      setBulkText('');
      setBulkOpen(false);
      load();
      resetChainBranches();
    }
  };

  return { bulkOpen, setBulkOpen, bulkText, setBulkText, bulkChainId, setBulkChainId, bulkLoading, handleBulkImport };
}
