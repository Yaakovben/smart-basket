import { useState } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

interface ProgressiveImageProps {
  src: string;
  // גרסה זעירה ומטושטשת (cldBlur) שמוצגת עד שה-src החד נטען. undefined
  // (data URL - כבר בזיכרון, אין רשת לחכות לה) - התמונה מוצגת מיד, בלי שכבת ביניים.
  blurSrc?: string;
  alt: string;
  // אטימות סופית לאחר טעינה (למשל 0.45 למוצר "נקנה") - לא 1 קבוע.
  finalOpacity?: number;
  sx?: SxProps<Theme>;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
}

/**
 * תמונה עם "blur-up": מציגה גרסה מטושטשת זעירה (נטענת כמעט מיידית) עד
 * שהגרסה החדה מוכנה, ואז דוהה ביניהן. פותר את ה"רגע הריק" בפעם הראשונה
 * שרואים תמונה - במקום ריבוע צבע שממתין לרשת, רואים משהו מייד.
 *
 * חייבת אב עם position:'relative' וגובה/רוחב מוגדרים - שתי התמונות
 * ממוקמות absolute בתוכו וחופפות.
 */
export const ProgressiveImage = ({ src, blurSrc, alt, finalOpacity = 1, sx, loading, fetchPriority }: ProgressiveImageProps) => {
  const [loaded, setLoaded] = useState(false);
  // איפוס בזמן רינדור (לא ב-useEffect - הדפוס המומלץ ב-React) כשה-src
  // משתנה: למשל התמונה האופטימית-מקומית הוחלפה בכתובת Cloudinary האמיתית
  // אחרי העלאה ברקע. בלי זה התמונה החדשה "קופצת" ישר לחדה כי loaded
  // עדיין true מהתמונה הקודמת.
  const [seenSrc, setSeenSrc] = useState(src);
  if (src !== seenSrc) {
    setSeenSrc(src);
    setLoaded(false);
  }

  return (
    <>
      {blurSrc && (
        <Box
          component="img"
          src={blurSrc}
          alt=""
          aria-hidden="true"
          sx={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            // scale מעט מעל 1 - מסתיר את הקצוות המטושטשים/פיקסלים של
            // הגרסה הזעירה שבורחים מעבר לגבול ה-container.
            filter: 'blur(14px)', transform: 'scale(1.15)',
            opacity: loaded ? 0 : finalOpacity,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      <Box
        component="img"
        src={src}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        onLoad={() => setLoaded(true)}
        sx={{
          position: blurSrc ? 'absolute' : 'static',
          inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', display: 'block',
          opacity: blurSrc && !loaded ? 0 : finalOpacity,
          transition: 'opacity 0.25s ease',
          ...sx,
        }}
      />
    </>
  );
};
