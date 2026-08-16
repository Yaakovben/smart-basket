# Smart Basket — סריקה טכנית מלאה של הפרויקט

> מסמך זה נוצר על ידי סריקה ישירה של הקוד בפועל (routes, models, package.json, מבנה תיקיות) בתאריך 2026-08-16, ולא מבוסס על תיעוד קודם. מיועד להזנה לכלי AI (כמו GPT) ליצירת PDF/מצגת/מסמך נוסף.

---

## 1. מה זה Smart Basket

PWA (Progressive Web App) לניהול רשימות קניות שיתופיות בזמן אמת, עם מנוע השוואת מחירים בין רשתות סופרמרקט בישראל (מבוסס על קבצי ה-XML הציבוריים שרשתות מחויבות לפרסם לפי חוק שקיפות המחירים).

מבנה הריפו — **שלושה שירותים נפרדים** (לא שניים):
```
smart-basket/
├── client/            React SPA (PWA) — Vercel
└── server/
    ├── api/            Express REST API — Render
    └── socket/         שרת Socket.io עצמאי לחלוטין (package.json/deploy נפרד) — Render
```

---

## 2. Tech Stack (מאומת מול package.json בפועל)

### Client (`client/package.json`)
| קטגוריה | ספרייה | גרסה | למה נבחרה |
|---|---|---|---|
| Framework | React | 19.2 | הספרייה הדומיננטית ל-SPA, אקוסיסטם ענק, concurrent rendering (useTransition) לחוויית טעינה חלקה |
| Build tool | Vite | 7.3 | dev server מהיר עם HMR אמיתי, בניית production מהירה מ-Webpack, תמיכה טבעית ב-ESM |
| שפה | TypeScript | 5.9 | type safety בין client לשרת (טיפוסי `Product`/`List` משותפים ברוח), תופס באגים בזמן קומפילציה |
| UI | @mui/material + @mui/icons-material | 7.3 | ספריית קומפוננטות בשלה עם theme system מובנה (בהיר/כהה), חוסך בניית design system מאפס |
| Styling | @emotion/react + @emotion/styled, Tailwind | - | Emotion הוא ה-styling engine שמאחורי ה-`sx` prop של MUI; Tailwind למקרים נקודתיים של utility classes |
| Routing | react-router-dom | 7.12 | ראוטר סטנדרטי ל-React, תומך ב-lazy loading של routes (code splitting) |
| HTTP | axios | 1.13 | interceptors מובנים לרענון JWT אוטומטי בתשובת 401, טיפול נוח יותר מ-fetch גולמי |
| Real-time | socket.io-client | 4.8 | WebSocket עם fallback אוטומטי ל-long-polling ותמיכה מובנית ב-reconnection |
| Auth | @react-oauth/google | 0.13 | אינטגרציית Google Sign-In רשמית, נמנעת מלבנות OAuth flow ידני |
| Validation | zod | 4.3 | ולידציית טפסים/קלט בצד קליינט עם type inference אוטומטי |
| מפות | leaflet + react-leaflet | 1.9 / 5.0 | ספריית מפות open-source (לא Google Maps) — בלי עלות API key, מציגה סניפים קרובים |
| סריקת ברקוד | @zxing/browser + @zxing/library | - | סריקת ברקוד מוצרים דרך מצלמת הדפדפן, בלי native app |
| PWA | vite-plugin-pwa + workbox | 1.2 | מייצר Service Worker + manifest אוטומטית, מאפשר התקנה כאפליקציה ועבודה אופליין |
| Native wrapper | @capacitor/* | 8.x | עוטף את ה-PWA כאפליקציית iOS/Android אמיתית (גישה ל-geolocation, splash screen, status bar) בלי לכתוב קוד native נפרד |
| Error tracking | @sentry/react | 10.38 | תופס שגיאות runtime בפרודקשן עם stack trace אמיתי, לא רק console.error |
| Analytics | posthog-js | 1.407 | מעקב אירועי משתמש (product analytics) להבנת שימוש בפועל |
| Charts | recharts | 3.10 | גרפים לתובנות (הוצאות לאורך זמן וכו') |
| PDF/Canvas | jspdf, html2canvas | - | ייצוא/שיתוף תוכן כתמונה/PDF |
| QR | qrcode.react | 4.2 | הצגת QR code להזמנת חברים לרשימה |

### Server (`server/api/package.json`)
| קטגוריה | ספרייה | גרסה | למה נבחרה |
|---|---|---|---|
| Runtime | Node.js + Express | 4.18 | Express הוא ה-framework המינימליסטי הכי נפוץ ל-REST ב-Node — גמיש, לא כופה מבנה |
| שפה | TypeScript | 5.3 | type safety על כל שכבות ה-API, פחות באגים של "שכחתי שדה" |
| DB / ODM | MongoDB + Mongoose | 8.0 | מודל document מתאים לרשימות/מוצרים (מבנה גמיש, embedded members); Mongoose נותן schema validation + hooks מעל MongoDB הגולמי |
| Auth | jsonwebtoken + bcrypt | 9.0 / 6.0 | JWT ל-stateless auth (לא צריך session store); bcrypt לגיבוב סיסמאות בטוח (salt מובנה) |
| Validation | joi | 18.0 | ולידציית body/query/params מוצהרת בבירור, נפרדת מהלוגיקה העסקית |
| Security | helmet, cors, express-mongo-sanitize, express-rate-limit | - | חבילת hardening סטנדרטית - headers מאובטחים, מניעת NoSQL injection, הגבלת קצב בקשות |
| Push | web-push | 3.6 | מימוש רשמי של Web Push Protocol עם VAPID, בלי צורך ב-Firebase |
| Email | nodemailer | 9.0 | שליחת מייל דרך Gmail SMTP (App Password) — ערוץ גיבוי להתראות אדמין למשתמשים שלא הפעילו push |
| Cron | node-cron | 4.2 | תזמון משימת סנכרון מחירים תקופתית בתוך אותו תהליך, בלי שירות scheduler חיצוני |
| XML parsing | fast-xml-parser | 5.7 | הרשתות מפרסמות מחירים כ-XML — parser מהיר וקל-משקל לפורמט הזה |
| ZIP | adm-zip | 0.5 | קבצי המחירים של הרשתות מגיעים דחוסים (gzip/zip) — פתיחה בזיכרון בלי תלות במערכת קבצים |
| HTTP client (לרשתות) | axios + tough-cookie + http-cookie-agent | - | חלק מפורטלי הרשתות דורשים session cookies בין בקשות — tough-cookie מנהל cookie jar אמיתי |
| Logging | winston + @logtail | 3.19 | structured logging עם רמות (info/warn/error) ושליחה לענן ל-search/alerts, לא רק console.log |
| Error tracking | @sentry/node | 10.38 | תפיסת חריגות שרת בפרודקשן עם context מלא |
| Redis client | ioredis | 5.3 | מפרסם אירועים ל-Redis pub/sub שהשרת השני (Socket) קורא מהם — כך שני שרתים עצמאיים מתואמים בלי לדבר ישירות |
| Sanitize | sanitize-html | 2.17 | ניקוי HTML מסוכן מקלט טקסט חופשי (הערות מוצר וכו') למניעת XSS מאוחסן |

### Socket server (`server/socket/package.json`) — שירות עצמאי, deploy נפרד
| קטגוריה | ספרייה | גרסה | למה נבחרה |
|---|---|---|---|
| Real-time | socket.io | 4.7 | תשתית WebSocket עם rooms מובנים (חדר לכל רשימה) ו-fallback אוטומטי |
| Auth | jsonwebtoken | 9.0 | מאמת את אותו access token שהונפק ע"י שרת ה-API - שני השרתים חולקים JWT secret אך לא DB session |
| Pub/Sub | ioredis | 5.3 | מנוי (subscribe) לאותו ערוץ Redis ששרת ה-API מפרסם אליו - זו הדרך היחידה שבה שני השרתים "מדברים" |
| Logging/monitoring | winston, @logtail, @sentry/node | - | אותו סטאק לוגים/שגיאות כמו שרת ה-API, לצפייה מאוחדת |

**למה שרת Socket נפרד משרת ה-API ולא הכל תהליך אחד:** מפריד עומס I/O-bound (חיבורי WebSocket פתוחים לאורך זמן) מעומס בקשות REST קצרות, ומאפשר לסקל/להפעיל מחדש כל שירות בנפרד בלי להפיל את השני.

### תשתית (Infra)
- **Vercel** — hosting הקליינט (SPA סטטי, CDN, preview deploys לכל branch)
- **Render** — hosting שני שרתי הבאקאנד (API + Socket) כ-2 שירותים נפרדים
- **MongoDB Atlas** — DB מנוהל בענן
- **Sentry** — error monitoring (client + API server + socket server, שלושה DSN/project נפרדים)
- **Logtail** — log aggregation
- **Redis** — ערוץ pub/sub (`smart-basket:events`) בין שרת ה-API לשרת ה-Socket, ראו סעיף 3.1

---

## 3. ארכיטקטורה

```
Client PWA (React, Vercel)
   │  HTTPS/REST                    │  WebSocket
   ▼                                 ▼
API Server (Express, Render) ──publish──► Redis pub/sub ──subscribe──► Socket Server (socket.io, Render)
   │                                                                        │
   ▼                                                                        ▼
MongoDB Atlas                                                    broadcast to socket rooms
   │                                                              (list:<id>, user:<id>)
   ▼
פורטלי שקיפות מחירים (axios, 15 רשתות) — נגישים רק משרת ה-API
```

שכבתיות בשרת: **Routes → Controllers → Services → DAL → Models**

דוגמה מלאה — עדכון מוצר:
1. `PUT /api/lists/:listId/products/:productId` → `product.routes.ts`
2. `product.controller.ts::updateProduct` — שולף `req.body` כ-`UpdateProductInput`, קורא ל-service
3. `product.service.ts::updateProduct` — בודק הרשאת גישה, בונה diff מול הערכים הקיימים, בונה רשומת `editHistory`, מנקה cache של insights/AI assistant
4. `product.dal.ts::updateProductInListWithHistory` — עוטף את קריאת ה-Mongoose (`findOneAndUpdate` עם `$push`+`$slice`)
5. `Product.model.ts` — ה-Schema עצמו

### 3.1 איך זמן-אמת עובד בפועל (API ↔ Redis ↔ Socket server)

שרת ה-API ושרת ה-Socket הם שני תהליכים נפרדים לגמרי (deploy, package.json, וקוד מקור נפרדים תחת `server/api` ו-`server/socket`). הם לא מדברים ישירות זה עם זה — התקשורת עוברת דרך **Redis pub/sub** בערוץ יחיד `smart-basket:events`:

1. הקליינט שולח REST (למשל `PUT /api/lists/:id/products/:pid`) לשרת ה-API
2. שרת ה-API שומר ב-MongoDB, ואז מפרסם (`publish`) אירוע ל-Redis (`product:added`/`toggled`/`deleted`/`notification`/`user:deleted`/`member:kicked`)
3. שרת ה-Socket מנוי (`subscribe`) על אותו ערוץ — מקבל את האירוע ומשדר ל-room המתאים (`list:<id>` או `user:<id>`) לכל הקליינטים המחוברים
4. הקליינטים ברשימה מקבלים את האירוע דרך socket.io ומעדכנים UI

שרת ה-Socket **גם מנהל אימות עצמאי** — כל חיבור socket עובר `authenticateSocket` (בדיקת JWT), ותומך ב-`token:refresh` event לעדכון טוקן על חיבור פתוח בלי לנתק. יש גם מנגנון נוכחות אדמין (`admin:presence` room) שמראה בזמן אמת אילו משתמשים מחוברים, ו-revalidation תקופתי (כל 5 דקות) שמתקן חברות ברשימות אם הודעת Redis אבדה בזמן שה-subscriber היה מנותק.

אם `REDIS_URL` לא מוגדר, שרת ה-Socket עדיין עובד (חיבורים ישירים ל-rooms עדיין פעילים), אך לא מקבל broadcast מהשרת ה-API — כלומר real-time cross-server משתתק בשקט (`getRedisStatus()` מחזיר `'disabled'`).

---

## 4. מבנה תיקיות מלא

### Client — `client/src/`
```
features/                    כל פיצ'ר = תיקייה עצמאית (components/hooks/services/types)
├── admin/                   דשבורד אדמין: משתמשים, activity log, DB health, WiFi/sync status
├── aiAssistant/             צ'אט עוזר AI (ניתוח רשימה/הוצאות)
├── auth/                    login/register/Google OAuth, ניקוי cache
├── daily-faith/             פופאפ חיזוק יומי + ניהול תוכן אדמין
├── home/                    דף הבית — רשימת כל הרשימות של המשתמש
├── insights/                תובנות אישיות/קבוצתיות + טאב השוואת מחירים
├── legal/                   מדיניות פרטיות, תנאי שימוש
├── list/                    מסך רשימה בודדת: מוצרים, חברים, פרטי מוצר, עריכה
├── priceComparison/         שכבת API+hooks משותפת של השוואת מחירים (client-side)
├── profile/                 פרופיל משתמש
├── settings/                הגדרות: theme, שפה, השתקת קבוצות
└── utils/                   עמודי שירות (ClearCachePage וכו')

global/                      קוד חוצה-פיצ'רים
├── components/               Modal, Toast, ConfirmModal, ConnectionStatusIcon, Shimmer...
├── constants/                קטגוריות מוצר, צבעים, אייקונים
├── context/                  SettingsContext (theme+language)
├── helpers/                  haptic, safeStorage, formatDate, getRelativeTime...
├── hooks/                    useServiceWorker, useConnectionStatus, useReliableTap...
├── i18n/translations/        he.ts / en.ts / ru.ts / types.ts
├── theme/                    createAppTheme(theme, language)
└── types/                    Product, List, User, Notification...

services/
├── api/                      axios instance + endpoint modules לפי domain
├── socket/                   עטיפת socket.io-client
└── offlineQueue/              תור פעולות אופליין (IndexedDB) לסנכרון בחזרת רשת

router/                      AppRouter — lazy routes + הגנת auth
```

### Server — `server/api/src/`
```
routes/                      auth, list, product, notification, push, user, admin,
                              insights, ocr, aiAssistant
features/
├── daily-faith/              routes+controller+service+model עצמאי לפיצ'ר
└── priceComparison/           routes, controllers, services, dal, models, chains/,
                                scripts/ (cron jobs עצמאיים)

controllers/                 HTTP layer — parsing body, קריאה ל-service, JSON response
services/                    לוגיקה עסקית
dal/                         Data Access Layer — היחיד שמדבר עם Mongoose ישירות
models/                      User, List, Product, Notification, RefreshToken,
                              LoginActivity, PushSubscription
validators/                  Joi schemas לכל endpoint
middleware/                  auth, rateLimiter, errorHandler, validate
errors/                      AppError + תת-מחלקות (NotFoundError, ForbiddenError...)
utils/                       logger, JWT helpers, sanitizeText
config/                      environment (Joi validation ל-env vars), mongo connection, winston
```

### Socket server — `server/socket/src/`
```
server.ts                    אתחול io, health endpoint, connection lifecycle, admin presence
handlers/
├── list.handler.ts           join/leave לחדרי רשימה + revalidateListMemberships (תיקון תקופתי)
├── notification.handler.ts   שידור התראות
└── product.handler.ts        broadcastProductAdded/Toggled/Deleted
services/
├── redis.service.ts          pub/sub client - initRedis, handleRedisEvent
└── api.service.ts            קריאות חזרה לשרת ה-API (למשל אימות חברות ברשימה)
middleware/
├── auth.middleware.ts         authenticateSocket - מאמת JWT על כל חיבור
└── rateLimiter.middleware.ts  הגבלת קצב לאירועי socket נכנסים
config/                       env validation, logger
```

---

## 5. סכמות DB — Mongoose, מדויק מהקוד

### `User` (collection: `users`)
| שדה | טיפוס | הערות |
|---|---|---|
| name | String | 2-50 תווים |
| email | String | unique, lowercase, regex validated |
| password | String | bcrypt hash, `select: false` (לא מוחזר כברירת מחדל) |
| avatarColor | String | default `#14B8A6` |
| avatarEmoji | String | default ריק |
| googleId | String | sparse unique — למשתמשי Google OAuth |
| isAdmin | Boolean | default false |
| mutedGroupIds | ObjectId[] → List | קבוצות שהמשתמש השתיק התראות מהן |
| listOrder | String[] | סדר תצוגה מותאם אישית של הרשימות |
| tokenVersion | Number | default 0 — עולה בשינוי סיסמה/מחיקת חשבון, מבטל JWTs קיימים |
| timestamps | createdAt, updatedAt | אוטומטי |

אינדקסים: `email` (unique), `googleId` (unique sparse), `mutedGroupIds`, `createdAt: -1`.

### `List` (collection: `lists`)
| שדה | טיפוס | הערות |
|---|---|---|
| name | String | 2-50 תווים |
| icon | String | default `🛒` |
| color | String | default `#14B8A6` |
| isGroup | Boolean | רשימה אישית vs. קבוצתית |
| owner | ObjectId → User | required |
| members | [{ user: ObjectId→User, isAdmin: Boolean, joinedAt: Date }] | embedded subdocuments |
| inviteCode | String | 6 תווים, unique sparse |
| password | String | **plaintext בכוונה** — קוד גישה משותף לקבוצה, לא סוד אישי; timing-safe compare מותאם |

אינדקסים: `inviteCode` (unique), `{owner,isGroup}`, `{members.user}`, `{owner,updatedAt:-1}`, `{members.user,updatedAt:-1}`.

### `Product` (collection: `products`) — **קולקציה נפרדת מ-List, לא embedded**
| שדה | טיפוס | הערות |
|---|---|---|
| listId | ObjectId → List | required, referenced (לא embedded) |
| name | String | 2-100 תווים |
| quantity | Number | 1-99999, default 1 |
| unit | String enum | PRODUCT_UNITS |
| category | String enum | PRODUCT_CATEGORIES |
| isPurchased | Boolean | default false |
| addedBy | ObjectId → User | required |
| updatedBy | ObjectId → User \| null | מי ערך תוכן לאחרונה (לא כולל toggle קנייה) |
| purchasedBy | ObjectId → User \| null | מתאפס ל-null כשמסמנים "לא נקנה" |
| editHistory | Array (עד 10 אחרונים) | ראו פירוט למטה |
| position | Number | סדר במסך |
| note | String | עד 200 תווים |
| clientId | String | idempotency key מהקליינט (offline queue) |

**editHistory** — נוסף לאחרונה, מבנה לכל רשומה:
```
{ editedBy: ObjectId→User, editedAt: Date,
  changes: [{ field: 'name'|'quantity'|'unit'|'category'|'note', oldValue: Mixed, newValue: Mixed }] }
```
נשמר עם `$push + $slice: -10` — עד 10 רשומות אחרונות, הישנות נחתכות אוטומטית.

אינדקסים: `{listId,position}`, `{listId,isPurchased}`, `{addedBy}`, `{listId,clientId}` (unique sparse — idempotency).

### `Notification` (collection: `notifications`)
| שדה | טיפוס |
|---|---|
| type | enum: join, leave, removed, product_add/update/delete/purchase/unpurchase, member_removed, list_deleted, list_update, list_clear |
| listId, listName | הקשר הרשימה |
| actorId, actorName | מי ביצע |
| targetUserId | מי מקבל |
| productId?, productName? | אם רלוונטי |
| read | Boolean default false |

אינדקסים: `{targetUserId,read,createdAt:-1}`, `{listId}`, `{actorId}`, ו-**TTL index** — מחיקה אוטומטית אחרי 30 יום.

### `RefreshToken` (collection: `refreshtokens`)
| שדה | טיפוס |
|---|---|
| token | String unique |
| user | ObjectId → User |
| expiresAt | Date — TTL index, מחיקה אוטומטית בפקיעה |
| previousToken?, previousTokenGraceUntil? | תמיכה ב-rotation עם grace period (מונע race condition בריענון מקבילי) |

### `LoginActivity` (collection: `loginactivities`)
| שדה | טיפוס |
|---|---|
| user, userName, userEmail | |
| loginMethod | enum: email, google, app_open |
| ipAddress?, userAgent? | |

TTL index — מחיקה אוטומטית אחרי 90 יום.

### `PushSubscription` (collection: `pushsubscriptions`)
| שדה | טיפוס |
|---|---|
| userId | ObjectId → User |
| endpoint | String unique |
| keys.p256dh, keys.auth | VAPID keys |

### `Branch` (collection: `branches`, בתוך features/priceComparison)
סניף פיזי של רשת. שדות עיקריים: `chainId`, `chainName`, `storeId`, `storeName`, `address`, `city`, `zipCode`, `lat`/`lng`, `coordSource` (portal/geocoded/manual/unknown), `subChainId/Name`, `storeType`, `openingHours`, `lastSyncedAt`.
אינדקס ייחודי: `{chainId,storeId}`.

### `Price` (collection: `prices`, בתוך features/priceComparison)
שורת מחיר אחת פר (chainId, barcode) — הזולה מבין הסניפים. שדות: `barcode`, `itemName`, `itemNameNormalized` (לחיפוש), `chainId`, `chainName`, `price`, ~15 שדות מטא-דאטה נוספים מהפורטל הממשלתי (יצרן, ארץ ייצור, האם נמכר במשקל וכו'), ושדות אגרגציה: `storesWithPrice`, `priceMin`, `priceMax`, `cheapestStoreId`.
אינדקס ייחודי: `{barcode,chainId}`, טקסט על `itemNameNormalized`.

**15 רשתות נתמכות:** osher_ad, shufersal, rami_levy, yohananof, tiv_taam, keshet, stop_market, politzer, doralon, victory, maayan_2000, shefa_birkat_hashem, super_sapir, netto_hisachon, carrefour.

---

## 6. כל ה-API Endpoints (מהקוד בפועל)

### Auth — `/api/auth`
- `POST /check-email`, `POST /register`, `POST /login`, `POST /google`
- `POST /refresh`, `POST /logout`
- `POST /app-open` (auth) — לוגינג פתיחת אפליקציה

### Lists — `/api/lists`
- `GET /`, `POST /`, `POST /join`
- `GET /:id`, `PUT /:id`, `DELETE /:id`
- `POST /:id/leave`, `DELETE /:id/members/:memberId`, `PATCH /:id/members/:memberId/admin`

### Products — `/api/lists/:listId/products`
- `POST /`, `PUT /reorder`, `DELETE /clear`, `POST /reset`
- `PUT /:productId`, `DELETE /:productId`

### Users — `/api/users`
- `GET /me`, `PUT /me`, `PUT /me/list-order`, `DELETE /me`
- `POST /me/password` (שינוי סיסמה), `POST /me/mute-group`

### Notifications — `/api/notifications`
- `GET /`, `GET /unread-count`, `PUT /read-all`, `PUT /:id/read`
- `POST /`, `POST /broadcast`

### Push — `/api/push`
- `GET /vapid-public-key`, `POST /subscribe`, `POST /unsubscribe`, `GET /status`
- `POST /broadcast` (admin), `POST /send-to-user` (admin)

### Email — `/api/email` (אדמין בלבד, נוסף 2026-08-16)
- `GET /status` — האם שליחת מייל מוגדרת (`GMAIL_APP_PASSWORD` קיים)
- `POST /broadcast` — שליחת מייל לכל המשתמשים, עם אופציה `onlyWithoutPush` (רק למי שלא הפעיל push)
- `POST /send-to-user` — מייל למשתמש ספציפי

### Insights — `/api/insights`
- `GET /` — תובנות אישיות/קבוצתיות

### AI Assistant — `/api/ai-assistant`
- `POST /chat`

### OCR — `/api/ocr`
- `POST /scan-list` — סריקת תמונת רשימת קניות

### Admin — `/api/admin`
- `GET /users`, `GET /activity`, `GET /stats`, `GET /db-health`
- `GET /users/:userId/details`, `DELETE /users/:userId`

### Price Comparison — `/api/price-comparison`
- `GET /`, `GET /barcode/:barcode`, `GET /branches-nearby`
- `POST /refresh`, `POST /refresh-branches`, `POST /load-seed` (admin)
- `GET /test-osm`, `GET /branches/:chainId` (admin)
- `POST /branches`, `POST /branches/bulk`, `POST /branches/cleanup`, `POST /branches/fill-addresses` (admin)
- `DELETE /branches/:id` (admin)
- `GET /status` (admin)

### Daily Faith — `/api/daily-faith` (כולם דורשים authenticate)
- `GET /random` — פתוח לכל משתמש מאומת
- `GET /`, `POST /`, `DELETE /:id` — אדמין בלבד

---

## 7. פיצ'רים מרכזיים — הסבר תפקודי

| פיצ'ר | תיאור |
|---|---|
| **רשימות שיתופיות** | רשימה אישית או קבוצתית; חברי קבוצה מצטרפים דרך invite code (6 תווים) או סיסמת קבוצה; הרשאות owner/admin/member |
| **סנכרון בזמן אמת** | Socket.io — כל שינוי (הוספה/מחיקה/סימון/עריכה) משודר מיידית לכל חברי הרשימה המחוברים |
| **עדכון אופטימיסטי** | הקליינט מעדכן UI מיד לפני תשובת השרת, עם rollback בכשל |
| **תור אופליין** | פעולות שנכשלות מרשת נשמרות ב-IndexedDB ומסתנכרנות אוטומטית בחזרת חיבור |
| **עריכת מוצר + היסטוריה** | כל שמירה שמשנה שם/כמות/יחידה/קטגוריה/הערה נרשמת כ-`editHistory` entry עם diff מדויק (עד 10 אחרונות) |
| **השוואת מחירים** | Cron מוריד XML מ-15 רשתות, מנרמל, שומר מחיר הזול ביותר פר רשת; הקליינט משווה עלות רשימה שלמה בין רשתות |
| **איתור סניף קרוב** | Geolocation בדפדפן + Nominatim geocoding לסניפים חסרי קואורדינטות |
| **תובנות (Insights)** | הוצאות מצטברות, מוצרים נפוצים, סטטיסטיקות קבוצתיות — aggregation pipelines |
| **עוזר AI** | צ'אט שמנתח את הרשימה/ההוצאות ועונה על שאלות (`aiAssistant` feature) |
| **סריקת רשימה מתמונה (OCR)** | מעלים תמונה, OCR.space מזהה טקסט, מוצרים מתווספים אוטומטית |
| **התראות Push** | web-push עם VAPID — הזמנות, שינויים ברשימה, שידור אדמין |
| **שליחת מייל מהאדמין** | Nodemailer דרך Gmail (App Password, נשלח מ-`ADMIN_EMAIL`) — שידור לכולם / רק למי שלא הפעיל push / למשתמש ספציפי, מנוהל מתוך אותו מודל כמו Push broadcast (מתג Push/Email) |
| **חיזוק יומי** | ציטוט/מסר יומי מנוהל ע"י אדמין, מוצג פעם ביום למשתמש |
| **פאנל אדמין** | ניהול משתמשים, מעקב פעילות התחברות, בריאות DB, שליחת push, ניהול סניפים/מחירים ידני |
| **PWA מלא** | מותקן כאפליקציה, offline חלקי, Service Worker עם ניהול גרסאות, splash screen מותאם |
| **רב-לשוני** | עברית/אנגלית/רוסית, RTL מלא |
| **אבטחה** | JWT + refresh rotation, bcrypt, rate limiting, mongo-sanitize, helmet |

---

## 8. אבטחה — סיכום מנגנונים

| נושא | מנגנון |
|---|---|
| סיסמאות | bcrypt salt rounds 12 |
| JWT | access token קצר-טווח + refresh token (rotation + grace period 60 שניות) |
| ביטול טוקנים | `tokenVersion` ב-User, מוטמע ב-JWT payload, מבטל טוקנים ישנים בשינוי סיסמה |
| Rate limiting | `express-rate-limit` על login/register/refresh/AI chat/OCR |
| NoSQL injection | `express-mongo-sanitize` |
| XSS | `sanitize-html` בקלט טקסט חופשי (למשל note), React auto-escape |
| Headers | `helmet` (HSTS, CSP, X-Frame-Options) |
| הרשאות | בדיקת owner/admin/member ברמת ה-service, שגיאות טיפוסיות (`ForbiddenError.notOwner()`) |

---

## 9. תהליכי עבודה (Git)

ענפים קיימים בפועל בריפו:
- **`main`** — production, מסונכרן ל-Render+Vercel prod
- **`non-prod`** — סביבת עבודה/staging, כל הפיתוח היומיומי מתבצע כאן
- **`dev`**, **`persist-local-storage`**, **`vanila-ui`** — ענפי ניסוי/פיצ'ר נקודתיים, לא בשימוש שוטף

מיזוג `non-prod` ל-`main` מתבצע ידנית: `fetch` → build ירוק על `non-prod` (client: `tsc --noEmit` + `vite build`; server: `tsc`) → merge ל-`main` → build ירוק שוב על `main` → push.

---

*מסמך זה נוצר ע"י קריאה ישירה של קובצי הקוד (models, routes, package.json) בתאריך 2026-08-16 — לא מבוסס על הנחות או תיעוד ישן.*
