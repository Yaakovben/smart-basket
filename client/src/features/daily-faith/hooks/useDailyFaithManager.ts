import { useEffect, useState, useCallback, useMemo } from 'react';
import { dailyFaithApi, type DailyFaith } from '../services/daily-faith.api';
import { haptic } from '../../../global/helpers';
import { normalizeForCompare } from '../helpers/dailyFaithManagerHelpers';

interface DuplicateCandidate {
  attempted: string;
  existing: DailyFaith;
}

// ניהול המצב והלוגיקה של מסך ניהול משפטי החיזוק (רשימה, הוספה, מחיקה, חיפוש, כפילויות)
export function useDailyFaithManager() {
  const [quotes, setQuotes] = useState<DailyFaith[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  // האם החיפוש פתוח (מוצג כ-input). כברירת מחדל סגור - רק אייקון חיפוש
  const [searchOpen, setSearchOpen] = useState(false);
  // ה-quote שממתין לאישור מחיקה ב-popup. null = אין מחיקה פתוחה.
  const [quoteToDelete, setQuoteToDelete] = useState<DailyFaith | null>(null);
  // מועמד לכפילות - מציג אישור להוסיף משפט למרות שקיים זהה
  const [duplicateCandidate, setDuplicateCandidate] = useState<DuplicateCandidate | null>(null);
  // האם מוצג טיפ העיצוב (*bold*) - סגור כברירת מחדל, המנהל פותח רק אם צריך
  const [showFormatTip, setShowFormatTip] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dailyFaithApi.getAll();
      setQuotes(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredQuotes = useMemo(() => {
    if (!search.trim()) return quotes;
    const q = search.trim().toLowerCase();
    return quotes.filter(x => x.text.toLowerCase().includes(q));
  }, [quotes, search]);

  const findDuplicate = useCallback((raw: string): DailyFaith | null => {
    const needle = normalizeForCompare(raw);
    if (!needle) return null;
    return quotes.find(q => normalizeForCompare(q.text) === needle) || null;
  }, [quotes]);

  // ביצוע ההוספה בפועל - משותף לזרם רגיל ולאישור דריסה
  const performAdd = async (rawText: string) => {
    try {
      setSaving(true);
      haptic('light');
      const newQuote = await dailyFaithApi.create(rawText);
      setQuotes((prev) => [newQuote, ...prev]);
      setText('');
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    // בדיקת כפילות — אם קיים משפט זהה, מציגים popup אישור במקום להוסיף מייד
    const dup = findDuplicate(trimmed);
    if (dup) {
      setDuplicateCandidate({ attempted: trimmed, existing: dup });
      return;
    }
    await performAdd(trimmed);
  };

  const confirmDuplicateAdd = async () => {
    if (!duplicateCandidate) return;
    const attempted = duplicateCandidate.attempted;
    setDuplicateCandidate(null);
    await performAdd(attempted);
  };

  const handleDelete = async (id: string) => {
    haptic('light');
    setQuoteToDelete(null);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    try {
      await dailyFaithApi.remove(id);
    } catch {
      load();
    }
  };

  return {
    quotes, text, setText, loading, saving, search, setSearch, searchOpen, setSearchOpen,
    quoteToDelete, setQuoteToDelete, duplicateCandidate, setDuplicateCandidate,
    showFormatTip, setShowFormatTip,
    filteredQuotes, handleAdd, handleDelete, confirmDuplicateAdd,
  };
}
