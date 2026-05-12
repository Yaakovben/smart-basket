# Smart Basket — מסמך פרויקט מקיף

> מסמך זה נכתב למטרת הכנה לראיון עבודה / שיתוף עם כלי AI ליצירת תצוגות נוספות.
> המידע נאסף ישירות מהקוד ב-2026-05-12 וכל פרט נבדק מול הקבצים האמיתיים.

---

## 1. סקירת המוצר

**Smart Basket** הוא PWA לניהול רשימות קניות חכמות ומשותפות, עם דגש על השוואת מחירים בין רשתות בישראל.

### תכונות מרכזיות
- **רשימות שיתופיות** עם סנכרון בזמן אמת בין משתתפים (socket.io)
- **השוואת מחירים** בין רשתות (שופרסל, רמי לוי, יוחננוף, ויקטורי, חצי חינם, אושר עד וכו') לרשימה נתונה
- **איתור סניף קרוב** לפי מיקום המשתמש (geolocation + Nominatim geocoding)
- **תובנות אישיות** — דפוסי קנייה, מוצרים מובילים, חיסכון מצטבר
- **ניהול הרשאות** — בעלים, חברים, ניהול חברי רשימה
- **התראות Push** (web-push) להזמנות, סימוני מוצרים וכו'
- **חיזוקי אמונה יומיים** — מודול של ציטוטים יומיים
- **פאנל מנהל** — ניטור DB, סטטוס סנכרון מחירים, ניהול משתמשים
- **התקנה כ-PWA** + תמיכה אופליין חלקית
- **דו-לשוני** — עברית ואנגלית, RTL מלא
- **מצב כהה / בהיר**
- **התחברות עם Google OAuth** + מערכת רגילה (email/password)

### חוויית משתמש מרכזית
- Splash screen מותג (טורקיז + סל)
- אנימציות עדינות (Shimmer לטעינה, TopProgressBar עם עגלה רוכבת)
- Haptic feedback בפעולות מרכזיות
- Pull-to-refresh עם אנימציית סל
- Page transitions עדינות (fade ב-route change)
- Empty states עם CTAs ו-tips
- אינדיקציה ויזואלית של חיבור / משתמש online

---

## 2. ארכיטקטורה כללית

### Microservices (3 שירותים)
```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   Client (PWA)   │◄────►│   API Server     │◄────►│   MongoDB Atlas  │
│   React + Vite   │      │  Express + TS    │      │     (Cloud)      │
│   על Vercel      │      │  על Render       │      └──────────────────┘
└────────┬─────────┘      └──────────────────┘
         │                          │
         │  WebSocket              │
         ▼                          ▼
┌──────────────────┐      ┌──────────────────┐
│  Socket Server   │      │ External APIs    │
│  Node + socket.io│      │ - Nominatim      │
│  על Render       │      │ - חברות הרשתות   │
└──────────────────┘      │ - Google OAuth   │
                          └──────────────────┘
```

### זרימות נתונים מרכזיות
1. **CRUD רגיל** — Client → REST (HTTPS) → API Server → MongoDB
2. **עדכון בזמן אמת** — Client A מסמן מוצר → REST → DB → Socket Server משדר לכל המשתמשים ברשימה
3. **השוואת מחירים** — Cron job בשרת API מסנכרן מחירים מקבצי XML של הרשתות → DB → Client שולח לרשימה ספציפית ומקבל תוצאות מצרפיות
4. **Push** — Service Worker רשום ל-web-push subscription בשרת. השרת שולח דרך VAPID.

---

## 3. Tech Stack מפורט

### Client
| תחום | טכנולוגיה | גרסה | למה |
|------|-----------|------|-----|
| Framework | React | 19.2 | concurrent features, transition API |
| Build | Vite | 7.3 | dev server מהיר, HMR |
| Language | TypeScript | 5.9 | type safety |
| UI Library | MUI (Material-UI) | 7.3 | רכיבים מוכנים, theme system |
| Styling | Emotion + Tailwind | - | sx prop + utilities |
| Router | react-router-dom | 7.12 | data router, lazy routes |
| HTTP | axios | 1.13 | interceptors לרענון JWT |
| Real-time | socket.io-client | 4.8 | חיבור WebSocket עם fallback |
| Auth | @react-oauth/google | 0.13 | Google Sign-In |
| Forms | Native + Zod | 4.3 | validation עקבית |
| QR/Barcode | @zxing/browser | 0.1 | סריקת ברקודים של מוצרים |
| PWA | vite-plugin-pwa + workbox | 1.2 | service worker, manifest |
| Error tracking | @sentry/react | 10.38 | production errors |
| Icons | @mui/icons-material + simple-icons | - | אייקונים גנריים + לוגואים |

### Server (API)
| תחום | טכנולוגיה | גרסה | למה |
|------|-----------|------|-----|
| Runtime | Node.js | - | אקוסיסטם npm |
| Framework | Express | 4.18 | מינימליסטי, גמיש |
| Language | TypeScript | - | type safety |
| ORM | Mongoose | 8.0 | schemas, validation |
| DB | MongoDB Atlas | - | document model מתאים ל-lists |
| Auth | jsonwebtoken + bcrypt | 9.0 / 6.0 | JWT + hashing |
| Validation | Joi | 18.0 | schema validation |
| Security | helmet, cors, express-mongo-sanitize | - | hardening |
| Rate limit | express-rate-limit | 7.5 | DDoS protection |
| Cron | node-cron | 4.2 | סנכרון מחירים אוטומטי |
| XML parse | fast-xml-parser | 5.7 | קבצי המחירים של הרשתות |
| ZIP | adm-zip | 0.5 | unpack של GZ archives |
| HTTP client | axios + tough-cookie | - | session cookies לאתרי הרשתות |
| Push | web-push | 3.6 | VAPID |
| Logging | winston + @logtail | 3.19 | structured logs, cloud logging |
| Sentry | @sentry/node | 10.38 | error tracking |

### Server (Socket)
שירות נפרד שמטפל רק ב-WebSocket events (סנכרון רשימות, "מי online ברשימה").

### תשתית
- **Vercel** — hosting הקליינט (PWA, CDN, free SSL)
- **Render** — hosting השרתים (API + Socket); paid tier
- **MongoDB Atlas** — DB מנוהל
- **Sentry** — error monitoring
- **Logtail** — log aggregation
- **GitHub** — source control

---

## 4. מבנה תיקיות

### Client (`client/src/`)
```
features/                   # מאורגן לפי domain (לא לפי טכנולוגיה)
├── admin/                  # פאנל מנהל (ניטור DB, sync, משתמשים)
├── auth/                   # התחברות, רישום, OAuth
├── daily-faith/            # חיזוקים יומיים
├── home/                   # רשימת הרשימות
├── insights/               # תובנות + השוואת מחירים tab
├── legal/                  # תנאי שימוש, פרטיות
├── list/                   # מסך רשימה בודדת + מוצרים + members
├── priceComparison/        # שכבת ה-API + hooks של מחירים (משותף)
├── profile/                # פרופיל משתמש
├── settings/               # הגדרות (theme, language, mute)
└── utils/                  # קומפוננטות עזר חוצות-domain

global/                     # שיתופי - לכל הפיצ'רים
├── components/             # ConfirmModal, Toast, Shimmer, TopProgressBar...
├── constants/              # קטגוריות, צבעים, אייקונים
├── context/                # SettingsContext (theme, language)
├── helpers/                # haptic, safeStorage, formatters
├── hooks/                  # useServiceWorker, useOnlineStatus
├── theme/                  # createAppTheme(theme, language)
└── types/                  # Product, List, User, Notification

services/                   # שכבת התקשורת
├── api/                    # axios instance + endpoints
└── socket/                 # socket.io client wrapper

router/                     # AppRouter (lazy routes + protected)
```

### Server (`server/api/src/`)
```
features/                   # קומפוזיציה לפי domain
├── daily-faith/
└── priceComparison/        # services, controllers, DAL, models, scripts

routes/                     # endpoints REST
├── auth.routes.ts
├── list.routes.ts
├── product.routes.ts
├── notification.routes.ts
├── push.routes.ts
├── user.routes.ts
├── admin.routes.ts
└── insights.routes.ts

controllers/                # HTTP layer - parsing + responses
services/                   # Business logic
dal/                        # Data Access Layer (Mongoose abstraction)
models/                     # Schemas: User, List, Product, Notification...
validators/                 # Joi schemas (request validation)
middleware/                 # auth, rateLimiter, errorHandler
errors/                     # AppError, AuthError, NotFoundError, ForbiddenError
utils/                      # logger, JWT helpers, env validation
config/                     # env loader, mongo connection, winston
```

**הארכיטקטורה השכבתית (Layered):**
`Routes → Controllers → Services → DAL → Models`

לדוגמה - יצירת רשימה:
1. `POST /api/lists` → list.routes.ts
2. → `listController.create()` — מאמת body דרך Joi
3. → `listService.createForUser()` — לוגיקה (גבולות, validation עסקי)
4. → `ListDAL.create()` — wrapper סביב Mongoose
5. → `List.model.ts` — Schema של MongoDB

---

## 5. מודלים מרכזיים ב-DB

| Model | קולקציה | תיאור |
|-------|---------|-------|
| User | users | אימייל, סיסמה (hashed), שם, פרופיל |
| List | lists | רשימה + מוצרים מוטמעים + חברים + הגדרות התראה |
| Product | products | מוצרי מאסטר (לא של רשימה ספציפית) — אוטוקומפליט |
| Notification | notifications | התראות עצמאיות |
| RefreshToken | refreshtokens | טוקני רענון לאימות מסביב |
| LoginActivity | loginactivities | log התחברויות לאדמין |
| PushSubscription | pushsubscriptions | VAPID subscriptions |
| Branch | branches (priceComparison) | סניפי הרשתות + קואורדינטות |
| Price | prices | מחיר מוצר בסניף + תאריך עדכון |

**החלטה מעניינת:** מוצרים בתוך רשימה הם **embedded subdocuments** של List, לא reference. נימוק: רוב הקריאות הן "תן לי רשימה עם המוצרים שלה" → מבטל joins. החיסרון - חיפוש cross-list יותר יקר.

---

## 6. החלטות הנדסיות בולטות

### Client

**(א) ארגון לפי features**
כל פיצ'ר מכיל את כל הקשור אליו (components, hooks, api, types). מקל על navigation ועל מחיקה של פיצ'רים שלמים.

**(ב) lazy routes**
כל עמוד מרכזי טוען בנפרד עם `React.lazy()`. הקטנת bundle ראשוני מ-2MB ל-~860KB (gzipped 248KB).

**(ג) Service Worker חכם**
- ניהול גרסאות דרך `__BUILD_VERSION__` שמוזרק ב-Vite
- כשמתגלה גרסה חדשה → ניקוי cache + reload עם מסך עדכון מותג (רקטה + halo)
- BFCache handling — `pageshow` עם `persisted=true` → reload (מונע מסך לבן בחזרה מ-WhatsApp/Waze)

**(ד) Cache-then-revalidate ברמת אפליקציה**
- `readCache(key)` / `writeCache(key, data)` ב-localStorage
- ה-UI מציג מ-cache מיידית, ובמקביל פונה לשרת ומעדכן
- מבטל ספינרים בכניסה חוזרת

**(ה) Preconnect ל-API**
`<link rel="preconnect">` מוזרק ב-`main.tsx` מיד בטעינה. חוסך 100-200ms על הבקשה הראשונה (DNS+TCP+TLS handshake במקביל לטעינת ה-JS).

**(ו) Theme dynamic** — `createAppTheme(theme, language)` עם MUI ThemeProvider, מתעדכן רק כש-state רלוונטי משתנה.

**(ז) RTL** — `dir="rtl"` ב-HTML + `direction: 'rtl'` ב-MUI theme, אבל אנימציות תזוזה כמו TopProgressBar בוחרות מימין-לשמאל מודעת.

**(ח) Splash מהיר** — מסך הטעינה הראשוני ב-`index.html` כ-inline HTML+CSS, מופיע **לפני** ש-React טוען. הוסר ב-`hideInitialLoader()` כשהאפליקציה מוכנה.

### Server

**(א) שכבת DAL נפרדת**
שירותים לא מדברים עם Mongoose ישירות. נימוק: בידוד נקי, החלפת DB עתידית, בדיקות יחידה.

**(ב) Custom Error classes + factory methods**
```typescript
throw NotFoundError.list();           // "List not found"
throw ForbiddenError.notOwner();
throw ConflictError.emailExists();
```
`errorHandler` middleware ממפה לפי instance ל-HTTP status code נכון, ושומר על traceability ל-Sentry.

**(ג) JWT עם refresh tokens (rotation)**
- Access token קצר (15 דק'), Refresh ארוך (30 יום)
- Rotation — כל שימוש ב-refresh מפיק טוקן חדש ומבטל את הישן
- מאוחסן ב-IndexedDB גיבוי לעמידות מפני clear localStorage

**(ד) Rate limiting פר IP + פר user**
`express-rate-limit` עם middleware עוטף שמגביל אנדפויינטים רגישים (login, register, refresh) קשה יותר.

**(ה) MongoDB Sanitization**
`express-mongo-sanitize` מנקה מ-payloads מפתחות עם `$` ו-`.` למניעת NoSQL injection.

**(ו) Cron job לסנכרון מחירים**
- רץ אוטומטית בכל סביבה שאינה development
- מוריד קבצי XML מ-portals של הרשתות (חוק חוק שקיפות המחירים)
- Parse, dedupe, upsert ל-DB
- TTL של 2 דק' לזיכרון מטמון של סניפים
- Geocoding דרך Nominatim עם rate limit (1 req/s)

**(ז) Logging - winston + Logtail**
Structured JSON logs, רמות logger, שליחה ל-Logtail בענן ל-search ול-alerts.

---

## 7. PWA — חיוני

### Manifest
`manifest.webmanifest` עם:
- `display: standalone` — אפליקציית "מסך-בית" אמיתית
- אייקונים בכל הגדלים (192, 512, apple-touch-icon)
- `theme_color: #14B8A6` (טורקיז)
- `start_url: /`
- שמות + תיאור בעברית

### Service Worker (vite-plugin-pwa)
- מטמון אוטומטי של נכסים סטטיים
- שליחת `SW_ACTIVATED` event ל-client → reload עם UI עדכון
- ניהול נפרד של Push notifications (VAPID)

### Offline
- `OfflineBanner` כשאין רשת
- localStorage cache לעמודי המפתח
- שמירת WIP של רשימה (פעולות שטרם נשלחו) למקרה של נפילה

---

## 8. אבטחה

| איום | פתרון |
|------|-------|
| XSS | sanitize-html + React escape default |
| NoSQL injection | express-mongo-sanitize |
| CSRF | SameSite cookies + Origin check |
| Brute force | express-rate-limit על login (5 ניסיונות / דקה) |
| Password storage | bcrypt עם salt rounds 10 |
| JWT theft | short access token + refresh rotation + revoke ב-logout |
| HTTPS | enforced ב-Vercel + Render |
| Headers | helmet (HSTS, X-Frame-Options, CSP) |
| Secret leakage | env vars only, .env בגיט ignore |

---

## 9. ביצועים

### Client
- Bundle: 858KB → 248KB gzipped (כולל MUI)
- Lazy loading של עמודים
- Preconnect ל-API
- localStorage cache
- Image optimization (PNG → WebP אופציונלי)
- React 19 concurrent features

### Server
- MongoDB indexing על השדות הנפוצים (`userId`, `listId`, `email`)
- Connection pooling דרך Mongoose
- gzip compression (`compression` middleware)
- 2-minute in-memory cache לסניפים (השוואת מחירים)
- Render paid tier (אין cold starts)

### Real-time
- Socket.io עם fallback ל-long polling
- Room per list — שידור רק למשתמשים באותה רשימה
- Reconnection אוטומטי

---

## 10. תהליכי פיתוח ו-CI/CD

- **Branches:** `main` (production-ish), `non-prod` (staging)
- **Vercel preview deploys** לכל branch
- **Render auto-deploy** מ-main
- **Build verification** ב-commit (TS + lint)
- **No tests יחידה כרגע** — נקודה לשיפור עתידי

---

## 11. נקודות שכדאי להדגיש בראיון

### ארכיטקטורה
1. **Microservices** — שלוש שכבות נפרדות (Client, API, Socket) שמדברות דרך protocols נקיים.
2. **Layered architecture** בשרת — Separation of Concerns ברמה גבוהה.
3. **Feature-based folder structure** בקליינט — קל לגדל.

### React
1. **React 19 + concurrent features** — useTransition, Suspense
2. **Lazy routes** עם code splitting אגרסיבי
3. **Custom hooks** — `useList`, `useUserLocation`, `useServiceWorker` — לוגיקה משוחזרת
4. **Context API** למצב גלובלי קל (settings) במקום Redux

### TypeScript
1. **Shared types** בין client לשרת (טעם של monorepo בלי tooling)
2. **Strict mode** — מוצף לי הרבה באגים מראש
3. **Discriminated unions** ל-error states

### MongoDB
1. **Embedded vs Referenced** — בחירה מודעת לכל מודל
2. **Indexes** על שאילתות חמות
3. **Aggregation pipelines** לתובנות (`$group`, `$lookup`)

### Real-time
1. **Socket.io rooms** — שידור ממוקד
2. **Optimistic updates** בקליינט — UI מגיב מיד, מסונכרן ברקע
3. **Conflict resolution** — last-write-wins לסימוני מוצרים

### Performance
1. **Cold-start mitigation** — preconnect, warm-up ping
2. **Cache layers** — localStorage app-level + browser HTTP cache + DB in-memory
3. **Lighthouse score 90+** ב-PWA (אופציונלי לבדוק)

### UX
1. **PWA full-fledged** — installable, offline, push
2. **Haptic feedback** מתוזמן לפעולות מובילות
3. **Accessibility** — RTL מלא, ARIA labels, color contrast
4. **Loading patterns** מוקפדים — TopProgressBar, Shimmer, Pull-to-refresh

### אתגרים שפתרת (תהליך)
1. **JWT rotation** ללא בעיות race condition
2. **Service Worker versioning** — ניהול עדכונים ללא מסך לבן
3. **Geolocation block detection** — זיהוי דחייה מוחלטת של דפדפן
4. **XML parsing של פורמטים שונים** של רשתות (לא אחיד)
5. **Hebrew text rendering** עם תווים מעורבים LTR/RTL

---

## 12. שאלות שעשויות להישאל ותשובות מומלצות

**"איך מתמודדים עם conflicts ברשימה שיתופית?"**
> אופטימיסטי בצד הקליינט — שינוי מתבצע מיד מקומית, נשלח לשרת, ואם נכשל מתבצע rollback. ל-toggle של מוצר אנחנו משתמשים ב-last-write-wins כי הסיכוי לסתירה אמיתית נמוך. ל-edit של מוצר (שם/כמות) השרת מקבל את המצב המלא, לא diff.

**"למה לא Next.js?"**
> אין צורך ב-SSR — האפליקציה behind login. ה-PWA רץ כ-SPA סטטי על CDN. Next היה מוסיף מורכבות בלי תועלת.

**"איך מאבטחים endpoints?"**
> כל route עם `auth` middleware שמוודא JWT תקין. הרשאות ספציפיות (לדוגמה "רק בעלים יכול למחוק רשימה") נבדקות ב-service layer דרך factory methods של ForbiddenError.

**"מה אם MongoDB נפל?"**
> השרת מחזיר 503 דרך errorHandler. הקליינט מציג ReconnectingBanner ומציג מ-cache localStorage. רכיב OfflineBanner מתחלף ל"מנסה להתחבר מחדש".

**"לאיזה scale זה תוכנן?"**
> נכון לעכשיו ~1000 משתמשים פעילים. ה-bottleneck הראשון יהיה Render single-instance — שדרוג ל-horizontal scaling יחייב להוציא את ה-socket state ל-Redis adapter.

---

## 13. שיפורים שכדאי להזכיר (מודעות לחולשות)

- **בדיקות יחידה / E2E** — חסר. מתוכנן: Vitest לקליינט, Jest + supertest לשרת.
- **CI/CD מלא** — כרגע auto-deploy בלבד. נדרש: pipeline עם lint + typecheck + tests.
- **Monitoring metrics** — Sentry טוב לשגיאות, חסר APM (Datadog/New Relic) לתובנות ביצועים.
- **i18n מלא** — כרגע 2 שפות hardcoded. ספרייה אמיתית (i18next) תאפשר הוספה קלה.
- **Bundle splitting אגרסיבי יותר** — MUI לוקח 96KB gzipped, יש מקום לטרים.
- **Real-time scaling** — Redis adapter ל-socket.io לרבוי instances.

---

## 14. איך נכון ללמוד את הפרויקט — מסלול מומלץ

**מטרת הסעיף:** להגיע למצב שאתה יכול להסביר כל שורת קוד באפליקציה ולהראות שליטה אמיתית בראיון. הסדר כאן מתחיל מהשטח (חוויית משתמש) ויורד פנימה (לוגיקה ואז תשתית). זה הסדר היעיל ביותר כי כל שלב נשען על הקודם.

---

### שלב 0 — הכנה (15 דקות)
1. הרץ את האפליקציה מקומית: `cd client && npm start` + `cd server/api && npm run dev`
2. פתח את ה-DevTools של הדפדפן ב-`Application` tab — שים לב למה שמתאכסן (localStorage, IndexedDB, Service Workers)
3. פתח את ה-Network tab — שים לב לבקשות בזמן שאתה מנווט

**שאלת מבחן:** אתה יכול להסביר מה כל key ב-localStorage עושה?

---

### שלב 1 — חוויית משתמש מצד הקליינט (יום 1-2)

**נקודת התחלה:** `client/index.html` ואז `client/src/main.tsx` ואז `client/src/App.tsx`

**מסלול ידני:**
1. קרא את `index.html` — הבן איך splash screen מופיע **לפני** ש-React טוען בכלל
2. `main.tsx` — איך הקוד מבצע preconnect ל-API ומאתחל את React
3. `App.tsx` — לוגיקת ניהול גרסה (`handleNewVersion`), warm-up ping, providers (Theme, Settings)
4. `router/index.tsx` — כל המסלולים ו-lazy loading
5. עברו על feature אחד שלם — הכי טוב להתחיל ב-**list**:
   - `features/list/components/ListComponent.tsx` (הקומפוננטה)
   - `features/list/hooks/useList.ts` (הלוגיקה)
   - `services/api/list.api.ts` (קריאות לשרת)

**שאלות לבחון עצמך:**
- מה קורה כשמשתמש מסמן מוצר כ"נקנה"? תעקוב מ-click ועד המסך מתעדכן
- איך עובד Pull-to-refresh?
- למה יש cache ב-localStorage?

---

### שלב 2 — מערכת ה-API (יום 3)

**נקודת התחלה:** `server/api/src/server.ts` → `app.ts`

**מסלול ידני:**
1. `server.ts` + `app.ts` — אתחול, middleware chain, חיבור ל-DB
2. בחר route אחד פשוט (`auth.routes.ts`) ועקוב אחרי כל ה-stack:
   - Route → Controller → Service → DAL → Model
3. ראה איך `errorHandler` middleware תופס שגיאות
4. הסתכל על `models/User.model.ts` — איך schema מוגדר עם validation + hooks

**שאלות לבחון עצמך:**
- מה קורה כשבקשת login מגיעה? תעקוב מ-route עד תגובה
- איך עובד refresh token rotation?
- מה ההבדל בין AppError ל-Error רגיל?

---

### שלב 3 — Real-time + Socket Server (יום 4)

**נקודת התחלה:** `client/src/services/socket/socket.service.ts` + `server/socket/`

**מסלול ידני:**
1. איך הקליינט מתחבר ל-socket וברשעה ב-room של הרשימה
2. מה ה-events שעוברים (`product:toggled`, `member:joined` וכו')
3. איך השרת REST מאותת ל-socket server על שינויים
4. שים לב ל-reconnection logic — מה קורה כשהחיבור נשבר

**שאלות:**
- אם שני משתמשים מסמנים אותו מוצר באותו רגע — איזה ניצח?
- איך מתמודדים עם תור ארוך של events אחרי reconnect?

---

### שלב 4 — השוואת מחירים (יום 5-6) — החלק המורכב

זה הפיצ'ר העמוק ביותר טכנית, ומה שיבדיל אותך בראיון.

**מסלול ידני:**
1. `server/api/src/features/priceComparison/` — קרא הכל
2. **`services/priceSyncJob.service.ts`** — cron, איך מורידים XML מהרשתות
3. **`services/branches.service.ts`** — caching, סינון לפי מיקום
4. **`services/geocoder.service.ts`** — Nominatim, retry logic, fallback
5. **בקליינט:** `features/insights/components/InsightsPage.tsx` + `features/priceComparison/`

**שאלות שיביכו אותך אם לא תדע:**
- למה גיאוקודינג רץ עם delay של 1 שנייה?
- מה קורה אם XML של רשת חוזר בפורמט חדש?
- איך נשמר שזה לא יקרוס כשהשרת חוזר אחרי שעות הפוגה?

---

### שלב 5 — PWA, Service Worker, Offline (יום 7)

**מסלול ידני:**
1. `vite.config.ts` — איך vite-plugin-pwa מקונפג
2. `client/public/manifest.webmanifest` — מטא-נתוני האפליקציה
3. `global/hooks/useServiceWorker.ts` — הרשמה ועדכון
4. `index.html` — script של force-reset של SW v2 migration
5. `App.tsx` → `handleNewVersion` → `showUpdateOverlay()` — flow מלא של עדכון

**שאלות:**
- מה קורה כשמשתמש בודק את האפליקציה כל יום וב-day 5 יוצא release חדש?
- איך מתמודדים עם BFCache בחזרה מ-WhatsApp?

---

### שלב 6 — אבטחה ו-edge cases (יום 8)

עבור על:
1. `middleware/auth.middleware.ts` — איך מאמתים JWT
2. `middleware/rateLimiter.middleware.ts` — כל המגבלות
3. `validators/` — כל schema של Joi
4. `errors/` — היררכיית השגיאות
5. כל המיקומים שמשתמשים ב-`safeStorage` — למה?

**שאלות:**
- אם תוקף משיג ה-access token של משתמש, מה הוא יכול לעשות? לכמה זמן?
- איך מונעים DDoS על endpoint login?

---

### שלב 7 — אינטגרציה ו-deploy (יום 9)

1. הסתכל על `vite.config.ts` ו-`tsconfig.json` בקליינט
2. הסתכל על `package.json` scripts בשני הצדדים
3. הבן את ההבדל בין dev/staging/prod
4. עקוב אחרי commit אחד — איך הוא הגיע מ-localhost לפרודקשן?

---

### שלב 8 — שיטות לחזק את הזיכרון

**(א) הסבר בקול רם.** קח כל פיצ'ר ותסביר אותו ל"קיר" כאילו אתה מסביר למראיין. אם תיתקע — חזור לקוד.

**(ב) צייר תרשימים.** Excalidraw / מחברת. תרשים זרימה למוצר→רשימה→סנכרון. תרשים ארכיטקטורה כללי.

**(ג) הוסף פיצ'ר מטופש.** משהו קטן וטיפשי (כפתור "מחק את כל המחסניות") עוזר לעבור על כל ה-stack ידנית. עוצר את עצמך מלשכוח.

**(ד) שבור כוונה.** הפסק את MongoDB. נתק את האינטרנט. נסה לשבור JWT. ראה איך המערכת מתנהגת. **כשמשהו לא נשבר כפי שצפית — זו האזהרה הכי חזקה שיש פער בהבנה.**

**(ה) קרא git log + git diff.** היסטוריית ה-commits מספרת את כל הסיפור של ההחלטות שלך. תזכיר לעצמך **למה** עשית כל דבר. בראיון יבקשו "ספר לי על החלטה הנדסית קשה" — git log הוא ה-cheat sheet שלך.

---

### שלב 9 — הכנה ספציפית לראיון (יום אחרון)

1. **3 גרסאות הצגה של 30 שניות / 2 דקות / 10 דקות** — תרגל פיצ'-לאפקט קצר ועד מעמיק
2. **רשימה של 5 החלטות הנדסיות שאתה גאה בהן** + למה. דוגמאות:
   - Embedded subdocuments ב-MongoDB
   - JWT rotation
   - localStorage cache לפני SW cache
   - Microservices לסוקט נפרד
   - Preconnect ל-API
3. **רשימה של 3 דברים שהיית עושה אחרת היום** — מראה הבנה ביקורתית:
   - בדיקות יחידה מהיום הראשון
   - i18n אמיתי במקום key-value
   - state management — Zustand במקום Context לפיצ'רים גדולים
4. **תרגול שאלות מערכת** — "איך תעצב Twitter?" "איך תעצב WhatsApp?" — האפליקציה שלך נוגעת בהרבה רעיונות דומים (real-time, notifications, offline)

---

### טיפים חשובים לראיון עצמו

1. **אל תיכנס לעומק יתר מיד.** התחל ב-bird's eye view: "האפליקציה היא PWA לרשימות קניות שיתופיות עם השוואת מחירים". רק כשמראיינים שואלים לפרטים, צלול.

2. **תמיד תנמק בחירות.** "בחרתי MongoDB כי..." עדיף 100 מונים מ-"השתמשתי ב-MongoDB". זה מבדיל בין מתכנת לבין מהנדס.

3. **דבר על חולשות באומץ.** "כרגע אין tests, וזה הדבר הראשון שהייתי מוסיף כי..." מראה בגרות מקצועית, לא חולשה.

4. **תהיה מוכן לבקשת live coding.** ייתכן שיבקשו ממך להוסיף פיצ'ר קטן (כפתור, endpoint). תרגל את התהליך מ-route עד UI לפחות 3 פעמים מראש.

5. **אל תפחד לומר "לא יודע".** "לא ניסיתי scaling רציני עדיין, אבל הייתי מתחיל ב-Redis adapter לסוקט". טוב ב-100% מ"כן" שתקרוס בו.

---

### לוח זמנים מוצע

| יום | מטרה | זמן |
|-----|------|-----|
| 1-2 | קליינט - features + state | 6-8 שעות |
| 3   | שרת API + DB | 4-5 שעות |
| 4   | Real-time | 3-4 שעות |
| 5-6 | השוואת מחירים | 6-8 שעות |
| 7   | PWA / SW | 3-4 שעות |
| 8   | אבטחה | 3 שעות |
| 9   | אינטגרציה | 2 שעות |
| 10  | סיכום + הכנה לראיון | 4 שעות |

**סה"כ:** ~32-38 שעות עבודה אינטנסיבית. אם עובדים שעתיים ביום — כשבועיים. אם 6 שעות ביום — שבוע.

---

## נספח: קישורים שימושיים

- **Live site:** https://smart-basket.vercel.app
- **GitHub:** (פרטי)
- **API health:** `GET /health`
- **Admin panel:** `/admin` (דורש משתמש מנהל)

---

*נכתב ב-12 במאי 2026 — הנתונים מבוססים על מצב הקוד באותו יום.*
