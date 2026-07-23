import { Box, Typography } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import VerifiedIcon from '@mui/icons-material/Verified';
import EditLocationIcon from '@mui/icons-material/EditLocation';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import { Modal } from '../../../global/components';

// שורה במודאל ההסבר - לא מיוצא, משמשת רק את HelpModal
const SourceRow = ({ icon, label, desc, color, isDark }: { icon: React.ReactNode; label: string; desc: string; color: string; isDark: boolean }) => (
  <Box sx={{
    display: 'flex', alignItems: 'flex-start', gap: 1,
    p: 1, borderRadius: '10px',
    bgcolor: isDark ? `${color}1A` : `${color}10`,
    border: '1px solid', borderColor: `${color}33`,
  }}>
    <Box sx={{ flexShrink: 0, mt: 0.25 }}>{icon}</Box>
    <Box>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color }}>{label}</Typography>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.5 }}>{desc}</Typography>
    </Box>
  </Box>
);

// מודאל הסבר מפורט לאדמין - איך הסניפים והמחירים מגיעים למאגר
export const PriceSyncHelpModal = ({ onClose, isDark }: { onClose: () => void; isDark: boolean }) => (
  <Modal title="איך פועל המאגר?" onClose={onClose}>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13, lineHeight: 1.6 }}>

      {/* סקציה 1: סוגי מקורות לסניפים */}
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0D9488', mb: 1 }}>
          🏪 מקורות הסניפים (לפי דיוק)
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <SourceRow icon={<PublicIcon sx={{ fontSize: 16, color: '#10B981' }} />} label="פורטל" desc="הגיע מקובץ הרשת הרשמי (StoresFull.xml). מדויק 100%." color="#10B981" isDark={isDark} />
          <SourceRow icon={<LocationSearchingIcon sx={{ fontSize: 16, color: '#0D9488' }} />} label="מקורב (geocoded)" desc="כתובת זוהתה אוטומטית דרך Nominatim/LocationIQ. עברה ולידציה (במרחק עד 12 ק&quot;מ ממרכז העיר). מדויק לרוב." color="#0D9488" isDark={isDark} />
          <SourceRow icon={<VerifiedIcon sx={{ fontSize: 16, color: '#10B981' }} />} label="ידני (manual)" desc="הוגדר ידנית באדמין. סנכרון אוטומטי לעולם לא ידרוס אותו." color="#10B981" isDark={isDark} />
          <SourceRow icon={<EditLocationIcon sx={{ fontSize: 16, color: '#F59E0B' }} />} label="לא מדויק (unknown)" desc="קואורדינטות = מרכז העיר. לא מציג מרחק ללקוח (כדי לא להטעות), אבל הניווט עובד דרך הכתובת." color="#F59E0B" isDark={isDark} />
          <SourceRow icon={<LocationOffIcon sx={{ fontSize: 16, color: '#DC2626' }} />} label="חסר מיקום" desc="אין קואורדינטות כלל. הסניף עדיין מוצג אם יש לו כתובת/עיר." color="#DC2626" isDark={isDark} />
        </Box>
      </Box>

      {/* סקציה 2: תהליך הסנכרון */}
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0D9488', mb: 1 }}>
          🔄 תהליך הסנכרון (אוטומטי)
        </Typography>
        <Box sx={{ pl: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography sx={{ fontSize: 12.5 }}>1. <b>04:00 בלילה</b> - cron יומי מפעיל סנכרון מכל הרשתות.</Typography>
          <Typography sx={{ fontSize: 12.5 }}>2. <b>מחירים</b> - שאיבת PriceFull.xml מכל פורטל רשמי, וקובצי מחירים יומיים.</Typography>
          <Typography sx={{ fontSize: 12.5 }}>3. <b>סניפים</b> - שאיבת StoresFull.xml; אם רשת לא פרסמה - נופלים ל-OSM.</Typography>
          <Typography sx={{ fontSize: 12.5 }}>4. <b>Geocoding</b> - לכל סניף שאין קואורדינטות, ניסיון מ-Nominatim ואז LocationIQ.</Typography>
          <Typography sx={{ fontSize: 12.5 }}>5. <b>וולידציה</b> - תוצאה רחוקה יותר מ-12 ק&quot;מ ממרכז העיר נדחית.</Typography>
          <Typography sx={{ fontSize: 12.5 }}>6. <b>ניקוי</b> - מחירים ישנים מ-14 ימים נמחקים אוטומטית.</Typography>
        </Box>
      </Box>

      {/* סקציה 3: אמינות ללקוח */}
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0D9488', mb: 1 }}>
          🛡️ ערבות אמינות
        </Typography>
        <Box sx={{ pl: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography sx={{ fontSize: 12.5 }}>• <b>אם מוצג מרחק ללקוח</b> - הוא מדויק 100% (portal/geocoded מאומת/manual).</Typography>
          <Typography sx={{ fontSize: 12.5 }}>• <b>אם לא מציגים מרחק</b> - מציגים &quot;ניווט לפי כתובת&quot;. הניווט עצמו עובד דרך POI של Waze/Google.</Typography>
          <Typography sx={{ fontSize: 12.5 }}>• <b>לעולם לא מציגים נתון שגוי</b> - עדיף בלי מידע מאשר מידע מטעה.</Typography>
        </Box>
      </Box>

      {/* סקציה 4: רענון ידני */}
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0D9488', mb: 1 }}>
          ⚡ פעולות באדמין
        </Typography>
        <Box sx={{ pl: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography sx={{ fontSize: 12.5 }}>• <b>רענן עכשיו</b> - מפעיל סנכרון מחירים + סניפים מיידי (במקום לחכות ל-04:00).</Typography>
          <Typography sx={{ fontSize: 12.5 }}>• <b>ייבוא המוני</b> - העלאת CSV של סניפים בפעם אחת (לרשתות שלא פרסמו StoresFull).</Typography>
          <Typography sx={{ fontSize: 12.5 }}>• <b>נקה seed</b> - מסיר סניפים שהוטענו מ-KNOWN_BRANCHES (זהירות).</Typography>
        </Box>
      </Box>

    </Box>
  </Modal>
);
