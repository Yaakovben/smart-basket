import { Box, Typography } from '@mui/material';
import type { DbHealth, DbHealthCollection } from '../../../services/api/admin.api';
import { DbHealthCollectionRow } from './DbHealthCollectionRow';
import { splitCollectionName, formatMB } from '../helpers/dbHealthHelpers';

interface DbHealthCollectionsListProps {
  data: DbHealth;
  isDark: boolean;
}

// שני המסדים באותו אשכול Atlas, והמכסה (512MB) משותפת להם:
// prod = הפרודקשן (כולל נתוני המחירים המשותפים), dev = סביבת הבדיקות (non-prod).
const GROUPS: { db: string | null; title: string; color: string }[] = [
  { db: 'prod', title: 'פרודקשן', color: '#0D9488' },
  { db: 'dev', title: 'סביבת בדיקות (non-prod)', color: '#B45309' },
];

const sizeOf = (c: DbHealthCollection) => c.storageSize + c.indexSize;

// רשימת קולקציות מפורטת, בקבוצה לכל מסד: הפרודקשן למעלה וסביבת הבדיקות למטה,
// ובכל קבוצה מהגדולה לקטנה
export const DbHealthCollectionsList = ({ data, isDark }: DbHealthCollectionsListProps) => {
  const byDb = new Map<string | null, DbHealthCollection[]>();
  for (const c of data.collections) {
    const { db } = splitCollectionName(c.name);
    byDb.set(db, [...(byDb.get(db) ?? []), c]);
  }
  const known = new Set(GROUPS.map(g => g.db));
  // מסד בלי קבוצה מוגדרת (או מדידה של מסד אחד בלבד, בלי קידומת) מוצג בסוף בשמו
  const groups = [
    ...GROUPS.filter(g => byDb.has(g.db)),
    ...[...byDb.keys()].filter(db => !known.has(db)).map(db => ({ db, title: db ?? '', color: '#64748B' })),
  ];

  return (
    <>
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.disabled', mb: 1, letterSpacing: 0.3 }}>
        פירוט מלא ({data.collections.length} קולקציות)
      </Typography>
      {groups.map(g => {
        const rows = [...(byDb.get(g.db) ?? [])].sort((a, b) => sizeOf(b) - sizeOf(a));
        const total = rows.reduce((sum, c) => sum + sizeOf(c), 0);
        return (
          <Box key={g.db ?? 'single'} sx={{ mb: 2, '&:last-of-type': { mb: 0 } }}>
            {g.title && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75, px: 0.25 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: g.color, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: g.color }}>{g.title}</Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 600 }}>
                  · {rows.length} קולקציות · {formatMB(total)}
                </Typography>
              </Box>
            )}
            {rows.map(c => (
              <DbHealthCollectionRow key={c.name} collection={c} totalSize={data.totalSize} isDark={isDark} />
            ))}
          </Box>
        );
      })}
    </>
  );
};
