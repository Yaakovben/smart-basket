import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// הכתובת הרשמית של האתר. גוגל מדרג רק אותה, גם כשנכנסים מהכתובת הישנה
// ב-vercel.app, כך שהדירוג לא מתפצל בין שתי כתובות לאותו תוכן.
const SITE_ORIGIN = 'https://smart-basket.app';

// מעדכן את קישור ה-canonical בכל מעבר דף, כדי שכל דף יצביע על עצמו ולא על
// דף הבית (אחרת גוגל היה מתייחס לכל הדפים ככפילויות של דף הבית)
export const CanonicalLink = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = `${SITE_ORIGIN}${pathname}`;
  }, [pathname]);
  return null;
};
