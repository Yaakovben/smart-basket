# 🧺 SmartBasket — Project Tour

מפה מלאה של הפרויקט. התחל מכאן כדי להכיר את כל הקוד.

---

## 📐 ארכיטקטורה כללית

```
smart-basket/
├── client/              ← React + Vite + MUI + TypeScript (PWA)
├── server/
│   ├── api/            ← Express + MongoDB + JWT
│   └── socket/         ← WebSocket server (Socket.io)
└── ultrareview/        ← review agent (ignore)
```

**3 סביבות**:
- **main** → פרוד (smart-basket.vercel.app)
- **non-prod** → בדיקות (non-prod-smart-basket.vercel.app)
- **dev / persist-local-storage / vanila-ui** → ענפי פיצ'רים

---

## 🎯 לקוח — מבנה הפיצ'רים

`client/src/features/` — כל פיצ'ר בתיקייה נפרדת:

| פיצ'ר | מה זה עושה | קובץ ראשי |
|---|---|---|
| **auth** | התחברות/הרשמה/Google OAuth | `LoginComponent.tsx` |
| **home** | דף הבית, רשימת הרשימות, PWA prompt | `HomeComponent.tsx` |
| **list** | דף רשימה בודדת, מוצרים, שיתוף | `ListComponent.tsx` |
| **settings** | הגדרות, התראות, שפה, ניקוי מטמון | `SettingsComponent.tsx` |
| **insights** | תובנות: מחירים/רשימות/הרגלים/דופק | `InsightsPage.tsx` |
| **priceComparison** | טבלת השוואת מחירים בין רשתות | `ChainComparisonTable.tsx` |
| **daily-faith** | פופאפ חיזוק יומי + ניהול אדמין | `DailyFaithPopup.tsx` |
| **admin** | דשבורד אדמין, ניהול משתמשים | `AdminDashboard.tsx` |
| **profile** | פרופיל משתמש | `ProfilePage.tsx` |
| **legal** | מדיניות פרטיות, תנאים | `PrivacyPolicy.tsx` |
| **utils** | עמודי שירות (ניקוי מטמון) | `ClearCachePage.tsx` |

### מבנה סטנדרטי של פיצ'ר
```
features/<name>/
├── components/       ← ה-UI (tsx)
├── hooks/           ← לוגיקה (React hooks)
├── services/api/    ← בקשות ל-server
├── types/           ← TypeScript types
└── index.ts         ← Public API של הפיצ'ר
```

---

## 🌐 לקוח — תיקיות משותפות

`client/src/global/` — קוד שמשמש את כל הפיצ'רים:

```
global/
├── components/        ← רכיבים משותפים (Modal, Toast, ConfirmModal)
├── context/          ← SettingsContext (theme, language, notifications)
├── constants/        ← קבועים (CATEGORY_ICONS, BRAND_COLORS, STORAGE_KEYS)
├── hooks/            ← useAuth, useLists, useNotifications, usePresence...
├── helpers/          ← utility functions (haptic, dateFormatting, popupCoordinator)
├── i18n/             ← translations.ts (עברית/אנגלית/רוסית)
├── theme/            ← ערכת נושא MUI
└── types/            ← טיפוסים גלובליים (User, List, Product)
```

**ראה קודם**: `global/hooks/index.ts` — כל ה-hooks החשובים כאן.

---

## 🔧 שרת — מבנה

`server/api/src/`:

```
src/
├── server.ts              ← entry point (app.listen)
├── app.ts                 ← Express config, middleware, routes
├── config/
│   ├── environment.ts     ← משתני סביבה (env vars)
│   ├── database.ts        ← MongoDB connection
│   └── logger.ts          ← Winston + Sentry
├── routes/                ← HTTP route definitions
├── controllers/           ← HTTP handlers
├── services/              ← business logic
├── dal/                   ← Data Access Layer (MongoDB queries)
├── models/                ← Mongoose schemas
├── middleware/            ← auth, rate-limit, validation, error handling
├── validators/            ← Joi input validation schemas
├── errors/                ← custom error classes
├── utils/                 ← helpers (asyncHandler, sanitize)
└── features/              ← פיצ'רים עצמאיים (self-contained)
    ├── daily-faith/       ← CRUD של ציטוטי חיזוק
    └── priceComparison/   ← סנכרון מחירים + השוואה
```

### זרימת בקשה טיפוסית
```
HTTP request
  → routes/<name>.routes.ts       (match URL + auth middleware)
  → controllers/<name>.controller (parse req, call service)
  → services/<name>.service.ts    (business logic)
  → dal/<name>.dal.ts             (MongoDB query)
  → Model (Mongoose schema)
  → MongoDB
```

---

## 🗝️ פיצ'רים שחשוב להכיר לעומק

### 1. Price Comparison (גדול ומורכב)
**שרת**: `server/api/src/features/priceComparison/`
- `chains/` — 10 adapters, אחד לכל רשת (osher-ad, rami-levy, shufersal...)
- `services/priceSync.service.ts` — קורא לכל ה-adapters, שומר ב-DB
- `services/priceComparison.service.ts` — matching של שמות מוצרים למאגר
- `jobs/priceSync.job.ts` — cron פעמיים ביום (04:00 ו-16:00)

**לקוח**: `client/src/features/priceComparison/`
- `PriceComparisonCard` — המסך הראשי
- `ChainComparisonTable` — טבלת השוואה בין רשתות

### 2. Daily Faith
**שרת**: `features/daily-faith/` — CRUD פשוט (model + dal + controller + routes)  
**לקוח**: `features/daily-faith/`
- `DailyFaithPopup` — הפופאפ עם הקלף הזהוב
- `useDailyFaith` — hook שמחליט מתי להציג (סשן 2+, פעם ביום)
- `DailyFaithManager` — מודאל אדמין להוספת משפטים

### 3. Lists (הלב של האפליקציה)
**שרת**: `routes/list.routes.ts` + `services/list.service.ts` + `dal/list.dal.ts`  
**לקוח**: `features/list/` (הגדול ביותר!)
- `ListComponent.tsx` — המסך
- `useList.ts` — כל הלוגיקה
- `hooks/` — useProducts, usePresence, useDragDrop
- `components/` — ProductRow, ListHeader, ListModals, SwipeItem...

### 4. Auth
מבוסס JWT עם access + refresh tokens:
- `routes/auth.routes.ts` — register/login/google/refresh
- `middleware/auth.middleware.ts` — `authenticate` + `isAdmin`
- שמור ב-HTTPOnly cookie + localStorage

---

## 🔑 דברים שכדאי להכיר

### Popup Coordinator
`global/helpers/popupCoordinator.ts` — מנגנון שמתאם בין 3 popups (daily-faith, PWA install, push-notify) כדי שלא יופיעו ביחד.

### Service Worker (PWA)
`client/src/sw.ts` — קוד ה-SW. מטפל ב:
- caching של assets
- offline mode
- push notifications

### Sockets
`server/socket/` (שרת נפרד!) — משדר בזמן אמת:
- מוצרים חדשים לרשימות משותפות
- notifications
- online users
- לקוח מתחבר דרך `useSocketNotifications`, `usePresence`

### Popups כפולים (בעיה שתוקנה)
המודאל של MUI (`Modal.tsx`) **כבר מטפל ב-scroll**. אל תוסיף `overflow: auto` בתוך מודאל!

---

## 📦 Storage Keys (מה נשמר ב-localStorage)

ראה `global/constants/index.ts` → `STORAGE_KEYS`. העיקריים:
- `sb_settings` — כל ההגדרות (theme, language, notifications)
- `cached_user` — user data (30 ימים)
- `sb_daily_faith_last_shown` — תאריך החיזוק האחרון
- `sb_session_count` — מונה סשנים (לחוקי PopupCoordinator)
- `pwa_install_seen` — האם המשתמש ביטל PWA prompt

---

## 🚦 Cron Jobs שרצים

1. **Price Sync** — פעמיים ביום ב-04:00 וב-16:00 (`priceSync.job.ts`)
2. **Notification cleanup** — TTL index של Mongo מוחק notifications ישנים מ-30 יום אוטומטית

---

## 📝 סגנון קוד

- **עברית בתגובות** (comments)
- **TypeScript strict** — אין `any` חופשי
- **MUI sx prop** לסטיילינג (לא styled-components)
- **No unused vars/imports** (TS strict mode)
- **קבצים ≤ 500 שורות מועדפים** — פיצולים עדיפים על monoliths

---

## 🎓 מסלול הלמידה המומלץ

**שלב 1 (יום 1)** — הבן את הזרימה:
1. `client/src/App.tsx` + `router/index.tsx`
2. `client/src/features/home/HomeComponent.tsx`
3. `server/api/src/app.ts` + `routes/index.ts`

**שלב 2 (יום 2-3)** — feature אחד מקצה לקצה:
- בחר את **daily-faith** (פשוט ומכוסה היטב)
- עבור: client popup → useDailyFaith → API client → server routes → controller → DAL → model

**שלב 3 (שבוע)** — הפיצ'רים המורכבים:
- **priceComparison** (שרת + לקוח)
- **list** (הלוגיקה הכי עמוסה)

**שלב 4** — DevOps:
- `server/api/src/config/environment.ts` — מה env vars צריך
- Render deploy (server)
- Vercel deploy (client)
- MongoDB Atlas (smartbasket_prod vs smartbasket_dev)
