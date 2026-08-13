import { useState, useEffect, useCallback } from 'react';
import type { List } from '../../../global/types';
import { listsApi } from '../../../services/api';
import { convertApiList } from '../../../global/hooks/converters';

/**
 * useTemplates - שליפת תבניות רשימות של המשתמש.
 * שגיאה בשליפה מוצנעת (offline-graceful) - אין תבניות = הסקשן לא מוצג.
 */
export function useTemplates() {
  const [templates, setTemplates] = useState<List[]>([]);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await listsApi.getTemplates();
      setTemplates(data.map(convertApiList));
    } catch {
      // אין תבניות = הסקשן לא מוצג. לא להציג שגיאה.
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const removeTemplate = useCallback((templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  }, []);

  const addList = useCallback((_newList: List) => {
    // כאשר נוצרת רשימה מתבנית - ניתן להוסיף לרשימת הרשימות הכללית
    // הפונקציה כאן היא placeholder; ה-callback האמיתי מגיע מ-HomeComponent
  }, []);

  // עדכון תבנית בעקבות שינוי isTemplate
  const updateTemplateFlag = useCallback((listId: string, isTemplate: boolean) => {
    if (isTemplate) {
      // אם רשימה הפכה לתבנית - נשלוף מחדש
      fetchTemplates();
    } else {
      setTemplates(prev => prev.filter(t => t.id !== listId));
    }
  }, [fetchTemplates]);

  return { templates, removeTemplate, addList, updateTemplateFlag, fetchTemplates };
}
