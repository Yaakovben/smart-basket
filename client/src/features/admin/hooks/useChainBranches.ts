// useChainBranches - הרחבת/כיווץ רשת ברשימה, טעינת הסניפים שלה, והוספה/מחיקה/ניקוי ידניים.

import { useState } from 'react';
import { haptic } from '../../../global/helpers';
import { priceComparisonApi } from '../../priceComparison';
import type { ChainBranch, NewBranchForm, SyncFeedback } from '../types/priceSync-types';

interface UseChainBranchesArgs {
  setFeedback: (feedback: SyncFeedback | null) => void;
  load: () => void;
}

const EMPTY_NEW_BRANCH: NewBranchForm = { storeName: '', city: '', address: '', lat: '', lng: '' };

export function useChainBranches({ setFeedback, load }: UseChainBranchesArgs) {
  // הרחבת רשת - בלחיצה טוענים את הסניפים שלה
  const [expandedChain, setExpandedChain] = useState<string | null>(null);
  const [chainBranches, setChainBranches] = useState<Map<string, ChainBranch[]>>(new Map());
  const [loadingChain, setLoadingChain] = useState<string | null>(null);
  // טופס הוספת סניף ידנית - פעיל לכל רשת בנפרד
  const [addingBranch, setAddingBranch] = useState<string | null>(null);
  const [newBranch, setNewBranch] = useState<NewBranchForm>(EMPTY_NEW_BRANCH);

  const resetChainBranches = () => setChainBranches(new Map());

  const refreshChainBranches = async (chainId: string) => {
    try {
      const res = await priceComparisonApi.getBranchesByChain(chainId);
      setChainBranches(prev => new Map(prev).set(chainId, res.branches));
    } catch { /* ignore */ }
  };

  const handleAddBranch = async (chainId: string) => {
    const lat = parseFloat(newBranch.lat);
    const lng = parseFloat(newBranch.lng);
    if (!newBranch.storeName.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setFeedback({ msg: 'חובה: שם, lat, lng תקפים', tone: 'error' });
      return;
    }
    haptic('medium');
    const res = await priceComparisonApi.upsertBranch({
      chainId, storeName: newBranch.storeName.trim(),
      city: newBranch.city.trim(), address: newBranch.address.trim(),
      lat, lng,
    });
    if (res.success) {
      setNewBranch(EMPTY_NEW_BRANCH);
      setAddingBranch(null);
      await refreshChainBranches(chainId);
      load();
      setFeedback({ msg: '✓ סניף נוסף', tone: 'info' });
    } else {
      setFeedback({ msg: `שגיאה: ${res.message}`, tone: 'error' });
    }
  };

  const handleDeleteBranch = async (chainId: string, branchId: string) => {
    if (!confirm('למחוק את הסניף?')) return;
    haptic('medium');
    const res = await priceComparisonApi.deleteBranch(branchId);
    if (res.success) {
      await refreshChainBranches(chainId);
      load();
    } else {
      setFeedback({ msg: `שגיאה: ${res.message}`, tone: 'error' });
    }
  };

  const toggleChain = async (chainId: string) => {
    haptic('light');
    if (expandedChain === chainId) { setExpandedChain(null); return; }
    setExpandedChain(chainId);
    if (chainBranches.has(chainId)) return;
    setLoadingChain(chainId);
    try {
      const res = await priceComparisonApi.getBranchesByChain(chainId);
      setChainBranches(prev => new Map(prev).set(chainId, res.branches));
    } catch {
      setChainBranches(prev => new Map(prev).set(chainId, []));
    } finally { setLoadingChain(null); }
  };

  // מחיקה של סניפי seed לא-מאומתים (לא OSM ולא ידני)
  const handleCleanup = async () => {
    if (!confirm('למחוק את כל הסניפים מה-seed הישן? יישארו רק סניפים מ-OSM ומהוספה ידנית.')) return;
    haptic('medium');
    const res = await priceComparisonApi.cleanupUnverifiedBranches();
    setFeedback({
      msg: res.success ? `✓ נמחקו ${res.deletedCount} סניפים לא-מאומתים` : `שגיאה: ${res.message}`,
      tone: res.success ? 'info' : 'error',
    });
    load();
    resetChainBranches();
  };

  return {
    expandedChain, chainBranches, loadingChain,
    addingBranch, setAddingBranch, newBranch, setNewBranch,
    handleAddBranch, handleDeleteBranch, toggleChain, handleCleanup, resetChainBranches,
  };
}
