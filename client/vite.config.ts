import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

// מחשב hash תוכן על כל src/ + package.json, ולא Date.now() - כך שהגרסה
// משתנה רק כשמשהו רלוונטי ללקוח באמת השתנה, ולא בכל build (כולל deploys
// שנוגעים רק בשרת, או commits ריקים של "trigger redeploy"). מונע את מסך
// "מעדכן גרסה..." המוצג שווא כשלא היה שינוי אמיתי בקליינט.
function hashDir(dir: string, hash: ReturnType<typeof createHash>): void {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      hashDir(full, hash)
    } else {
      hash.update(name)
      hash.update(readFileSync(full))
    }
  }
}

function computeBuildVersion(): string {
  const hash = createHash('sha256')
  hashDir(join(__dirname, 'src'), hash)
  hash.update(readFileSync(join(__dirname, 'package.json')))
  return hash.digest('hex').slice(0, 12)
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Content-hash build ID - משתנה רק כששינוי אמיתי קרה תחת client/src או package.json
    '__BUILD_VERSION__': JSON.stringify(computeBuildVersion()),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // רישום נעשה ידנית ב-useServiceWorker.ts (לא דרך registerSW/virtual:pwa-register) -
      // ראו הערה שם. injectRegister: false מונע מ-vite-plugin-pwa להזריק סקריפט רישום
      // אוטומטי משלו ל-index.html, שהיה מכיל את אותה לוגיקת reload כפוי שעקפנו.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192x192.png', 'icon-512x512.png'],
      devOptions: {
        enabled: false
      },
      injectManifest: {
        // ריק בכוונה - אין יותר שום precaching. גרם לבאג חמור וממושך: SW
        // שכבר מותקן במכשיר המשיך להגיש index.html/JS ישנים מהמטמון שלו
        // *לנצח*, בלי שום קשר למה שבאמת פרוס בשרת - Cache-Control: no-cache
        // בכלל לא נבדק כי הדפדפן לא הגיע ל-HTTP fetch (ה-SW ענה מקומית).
        // ראו sw.ts - כל בקשה, כולל ניווט, הולכת תמיד לרשת.
        globPatterns: [],
      },
      manifest: {
        name: 'Smart Basket',
        short_name: 'Smart Basket',
        description: 'רשימת קניות חכמה - פשוט, נוח, משותף',
        theme_color: '#14B8A6',
        background_color: '#14B8A6',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        dir: 'rtl',
        lang: 'he',
        // קישורי הצטרפות (/join?code=...) שנפתחים ממקום אחר: באנדרואיד
        // כרום מעביר קישורים בתוך ה-scope ל-PWA המותקן במקום ללשונית
        // דפדפן. 'navigate-existing' (ולא 'focus-existing') כדי שאם כבר יש
        // חלון פתוח - הקוד נקלט דרך launchQueue consumer (ראו router/index.tsx),
        // שמנווט בעצמו ל-/join עם ה-query המקורי - בלי לגרום לניווט/רענון
        // מסמך אמיתי. היה כאן 'navigate-existing' (ניווט מסמך אמיתי כדי
        // "לאלץ" את הדפדפן לטעון /join) - עבד, אבל ה-service worker לא
        // עושה שום caching (בכוונה, ראו sw.ts), אז ניווט מסמך אמיתי בלי
        // רשת (לינק הצטרפות שנלחץ בלי קליטה) היה נכשל עם שגיאת רשת במקום
        // סתם לפתוח את האפליקציה שכבר פתוחה. launchQueue הוא הפתרון
        // הסטנדרטי בדיוק בשביל המקרה הזה - "focus-existing" + לוגיקת
        // ניווט משלך בתוך ה-SPA, כמו notificationclick ב-sw.ts (client.focus()
        // + postMessage לניווט, בלי שום ניווט/רענון מסמך אמיתי).
        // (iOS מתעלם מזה - שם קישור https תמיד נפתח ב-Safari; אין דרך
        //  להפנות ל-PWA מותקן בלי אפליקציה נייטיב + Universal Links.
        //  ה-fallback שם הוא מסך הביניים ב-/join - ראו JoinLanding.tsx.)
        launch_handler: { client_mode: 'focus-existing' },
        handle_links: 'preferred',
        // רק purpose: any — האייקונים הנוכחיים ללא safe-zone של 10%, ולכן אסור להכריז עליהם
        // כ-maskable (אחרת אנדרואיד מודרני חותך את הלוגו ומוצג לא עקבי בין מכשירים).
        // כשתוחלף תמונה עם padding מתאים, אפשר להוסיף maskable בקובץ נפרד.
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // פונקציה (לא אובייקט) כי הצורה המקוצרת לא תפסה נכון תת-נתיבים עמוקים
          // כמו react-dom/cjs/react-dom-client.production.js - הוא היה מסתנן
          // ל-entry chunk הראשי במקום ל-vendor-react (552KB לא-ממוזערים!).
          //
          // react/react-dom/react-router ו-mui/emotion חייבים בחתיכה אחת (לא
          // שני chunks נפרדים): מבחן build הראה תלות מעגלית אמיתית בין השניים
          // (vendor-mui מייבא מ-vendor-react וגם ההפך) - ברגע שהם בשני chunks
          // עצמאיים, הטעינה נופלת אקראית ל-"ReferenceError: Cannot access 'X'
          // before initialization" בהתאם לסדר הטעינה בדפדפן. mui/emotion תלויים
          // ב-react גם ככה, אז אין הפסד בשילובם יחד.
          if (/[\\/]react-dom[\\/]|[\\/]react[\\/]|[\\/]react-router[\\/]|[\\/]@mui[\\/]|[\\/]@emotion[\\/]/.test(id)) return 'vendor-react'
          // Socket.io in separate chunk (loaded after auth)
          if (/[\\/]socket\.io-client[\\/]/.test(id)) return 'vendor-socket'
          // Sentry in separate chunk (monitoring can load late)
          if (/[\\/]@sentry[\\/]/.test(id)) return 'vendor-sentry'
          // zxing נטען אך ורק דרך import() דינמי (ראו useQRCameraScanner.ts +
          // QRScanner.tsx) - שם משלו רק לנוחות דיבוג, לא הופך אותו לטעינה מיידית.
          if (/[\\/]@zxing[\\/]/.test(id)) return 'vendor-zxing'
        }
      }
    }
  }
})
