// יוצר את כל האייקונים ומסכי הפתיחה של האפליקציות מהחנות מתוך העיצוב של
// public/favicon.svg (אותו סל, אותו וי, ואותו Y מוסתר).
//
// הרצה (sharp לא נמצא בתלויות של הפרויקט, ולכן מתקינים אותו זמנית):
//   cd client && npx -y -p sharp@0.33 node resources/generate-app-assets.mjs
//
// למה לא @capacitor/assets: הוא יצר אייקון iOS עם פינות מעוגלות "אפויות"
// (אפל מעגלת בעצמה, ונשארו שאריות לבנות בפינות), שכבה קדמית באנדרואיד שכוללת
// את כל הריבוע (אייקון בתוך אייקון), ומסכי פתיחה שבהם האייקון נמתח על כל המסך.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';

const BG_FROM = '#14B8A6';
const BG_TO = '#0D9488';

const defs = `
  <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="${BG_FROM}"/>
    <stop offset="100%" stop-color="${BG_TO}"/>
  </linearGradient>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000" flood-opacity="0.12"/>
  </filter>`;

// הסל, ה-Y המוסתר והווי, בקואורדינטות של תיבה 512x512 (כמו ב-favicon.svg)
const mark = `
  <g filter="url(#shadow)">
    <path d="M150 228 L176 368 C178 380 187 392 200 392 L312 392 C325 392 334 380 336 368 L362 228 C363 222 359 217 353 217 L159 217 C153 217 149 222 150 228 Z" fill="white"/>
    <path d="M192 210 C192 178 210 142 256 142 C302 142 320 178 320 210" stroke="white" stroke-width="22" fill="none" stroke-linecap="round"/>
  </g>
  <path d="M230 250 L256 286 L282 250" stroke="#0D9488" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.055"/>
  <line x1="256" y1="286" x2="256" y2="345" stroke="#0D9488" stroke-width="4.5" stroke-linecap="round" opacity="0.055"/>
  <path d="M216 286 L248 318 L304 258" stroke="#14B8A6" stroke-width="20" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

// shape: 'square' (בלי עיגול, למערכת שמעגלת לבד), 'rounded', 'circle', 'none' (שקוף)
const iconSvg = (shape) => {
  const bg = shape === 'square' ? '<rect width="512" height="512" fill="url(#bg)"/>'
    : shape === 'rounded' ? '<rect width="512" height="512" rx="112" fill="url(#bg)"/>'
    : shape === 'circle' ? '<circle cx="256" cy="256" r="256" fill="url(#bg)"/>'
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${defs}</defs>${bg}${mark}</svg>`;
};

const backgroundOnlySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${defs}</defs><rect width="512" height="512" fill="url(#bg)"/></svg>`;

// מסך פתיחה: רקע טורקיז מלא וסל במרכז, בגובה של כשליש מהצלע הקצרה
const splashSvg = (w, h) => {
  const s = (Math.min(w, h) * 0.34) / 250; // גובה הסל הוא 250 יחידות
  const tx = w / 2 - 256 * s;
  const ty = h / 2 - 267 * s; // מרכז הסל (אנכית) הוא 267
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>${defs}</defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <g transform="translate(${tx} ${ty}) scale(${s})">${mark}</g>
  </svg>`;
};

// intrinsic: הגודל הטבעי של ה-SVG (512 לאייקון, רוחב המסך למסך פתיחה). מציירים
// בפי שניים ואז מקטינים, כדי שהקצוות יהיו חלקים.
const out = async (path, svg, size, { opaque = false, intrinsic = 512 } = {}) => {
  mkdirSync(dirname(path), { recursive: true });
  const [w, h] = Array.isArray(size) ? size : [size, size];
  let img = sharp(Buffer.from(svg), { density: 72 * 2 * Math.max(w, h) / intrinsic, limitInputPixels: false })
    .resize(w, h);
  // אפל דוחה אייקון עם ערוץ שקיפות, גם אם הוא אטום בפועל
  if (opaque) img = img.flatten({ background: BG_FROM }).removeAlpha();
  writeFileSync(path, await img.png({ compressionLevel: 9 }).toBuffer());
  console.log('✓', path);
};

const RES = 'android/app/src/main/res';
const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

// ===== iOS =====
await out('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', iconSvg('square'), 1024, { opaque: true });
const IOS_SPLASH = 'ios/App/App/Assets.xcassets/Splash.imageset';
for (const f of [
  'Default@1x~universal~anyany.png', 'Default@2x~universal~anyany.png', 'Default@3x~universal~anyany.png',
  'Default@1x~universal~anyany-dark.png', 'Default@2x~universal~anyany-dark.png', 'Default@3x~universal~anyany-dark.png',
  'splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png',
]) await out(`${IOS_SPLASH}/${f}`, splashSvg(2732, 2732), 2732, { opaque: true, intrinsic: 2732 });

// ===== Android: אייקון מתאים (שכבת רקע מלאה ושכבה קדמית שקופה עם הסל בלבד) =====
for (const [d, k] of Object.entries(DENSITIES)) {
  const legacy = Math.round(48 * k);
  const adaptive = Math.round(108 * k);
  await out(`${RES}/mipmap-${d}/ic_launcher.png`, iconSvg('rounded'), legacy);
  await out(`${RES}/mipmap-${d}/ic_launcher_round.png`, iconSvg('circle'), legacy);
  await out(`${RES}/mipmap-${d}/ic_launcher_background.png`, backgroundOnlySvg, adaptive);
  await out(`${RES}/mipmap-${d}/ic_launcher_foreground.png`, iconSvg('none'), adaptive);
}

// ===== Android: מסכי פתיחה =====
const SPLASH_SIZES = {
  'drawable': [320, 480], 'drawable-night': [320, 240],
  'drawable-port-ldpi': [240, 320], 'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280], 'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-ldpi': [320, 240], 'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720], 'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280],
};
for (const [dir, [w, h]] of Object.entries(SPLASH_SIZES)) {
  await out(`${RES}/${dir}/splash.png`, splashSvg(w, h), [w, h], { opaque: true, intrinsic: Math.max(w, h) });
  const night = dir.replace(/^drawable-(port|land)-/, 'drawable-$1-night-');
  if (night !== dir) await out(`${RES}/${night}/splash.png`, splashSvg(w, h), [w, h], { opaque: true, intrinsic: Math.max(w, h) });
}

// ===== קבצים להעלאה לחנויות ומקור לעתיד =====
await out('resources/icon.png', iconSvg('square'), 1024, { opaque: true });
await out('resources/splash.png', splashSvg(2732, 2732), 2732, { opaque: true, intrinsic: 2732 });
await out('resources/splash-dark.png', splashSvg(2732, 2732), 2732, { opaque: true, intrinsic: 2732 });
await out('resources/store/app-store-icon-1024.png', iconSvg('square'), 1024, { opaque: true });
await out('resources/store/play-store-icon-512.png', iconSvg('square'), 512, { opaque: true });

// גרפיקה ראשית ל-Google Play (חובה, 1024x500): הבאנר בראש דף האפליקציה בחנות.
// הלוגו בצד שמאל, השם והמשפט בעברית בצד ימין. גוגל עלולה לחתוך את השוליים
// ולהציג כפתור הפעלה במרכז, ולכן התוכן החשוב רחוק מהקצוות. בטקסט עברי
// (direction=rtl) הערך start הוא הקצה הימני, ולכן הוא מיושר לימין כמו השם.
const featureGraphicSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>${defs}
    <radialGradient id="glow" cx="80%" cy="10%" r="70%">
      <stop offset="0%" stop-color="#5EEAD4" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#5EEAD4" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <rect width="1024" height="500" fill="url(#glow)"/>
  <circle cx="930" cy="470" r="170" fill="#ffffff" opacity="0.06"/>
  <circle cx="60" cy="40" r="120" fill="#ffffff" opacity="0.05"/>
  <g transform="translate(84 92) scale(0.62)">
    <rect x="0" y="0" width="512" height="512" rx="112" fill="#ffffff" opacity="0.14"/>
    ${mark}
  </g>
  <text x="944" y="222" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="68" font-weight="800" fill="#ffffff">Smart Basket</text>
  <text x="944" y="292" text-anchor="start" direction="rtl" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="600" fill="#ffffff" fill-opacity="0.92">רשימת קניות משותפת וחכמה</text>
  <text x="944" y="342" text-anchor="start" direction="rtl" font-family="Segoe UI, Arial, sans-serif" font-size="27" font-weight="500" fill="#ffffff" fill-opacity="0.78">בזמן אמת, עם עוזר AI והשוואת מחירים</text>
</svg>`;
await out('resources/store/play-feature-graphic-1024x500.png', featureGraphicSvg, [1024, 500], { opaque: true, intrinsic: 1024 });
