import type { List, Product } from '../../../../global/types';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, formatDateShort } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import { getCategoryOrder } from '../../helpers/list-helpers';

interface PrintListViewProps {
  list: List;
  pendingProducts: Product[];
}

// תוכן מיועד להדפסה/שמירה כ-PDF בלבד - מוסתר במסך הרגיל (display:none),
// נחשף רק דרך ה-@media print הגלובלי ב-index.css כשהמשתמש קורא ל-window.print().
// מקובץ לפי קטגוריה - שימושי יותר להליכה בסופר מרשימה שטוחה.
export const PrintListView = ({ list, pendingProducts }: PrintListViewProps) => {
  const { t, settings } = useSettings();

  const grouped = [...pendingProducts]
    .sort((a, b) => getCategoryOrder(a.category) - getCategoryOrder(b.category))
    .reduce<Partial<Record<Product['category'], Product[]>>>((acc, p) => {
      (acc[p.category] ??= []).push(p);
      return acc;
    }, {});

  return (
    <div className="print-list-view" style={{ display: 'none', direction: 'rtl', fontFamily: 'Arial, sans-serif', padding: 24, color: '#000' }}>
      {/* בלי flexbox בכוונה - html2canvas (המצלם את ה-DOM הזה ל-PDF ב-iOS,
          ראו generateListPdf.ts) מסתבך עם flex ב-Safari/WebKit ומשמיט את
          הפריט הראשון (השם) בשורה. float/table נתמכים באמינות בכל המנועים. */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: 12, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ float: 'right', fontSize: 32, marginInlineStart: 10 }}>{list.icon}</div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{list.name}</div>
          <div style={{ fontSize: 12, color: '#555' }}>{formatDateShort(new Date().toISOString(), settings.language)}</div>
        </div>
      </div>

      {pendingProducts.length === 0 ? (
        <div style={{ fontSize: 16 }}>✅ {t('listCompleted')}</div>
      ) : (
        (Object.entries(grouped) as [Product['category'], Product[]][]).map(([category, products]) => (
          <div key={category} style={{ marginBottom: 14, breakInside: 'avoid' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
              {CATEGORY_ICONS[category]} {t(CATEGORY_TRANSLATION_KEYS[category])}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>☐ {p.name}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'left', whiteSpace: 'nowrap', width: '1%' }}>{p.quantity} {p.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      <div style={{ marginTop: 20, fontSize: 11, color: '#888', textAlign: 'center' }}>SmartBasket</div>
    </div>
  );
};
