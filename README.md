# 🛒 Smart Basket

אפליקציית רשימות קניות שיתופית בזמן אמת - PWA עם תמיכה מלאה במובייל.

---

## תוכן עניינים

- [ארכיטקטורה כללית](#ארכיטקטורה-כללית)
- [מבנה הפרויקט](#מבנה-הפרויקט)
- [טכנולוגיות](#טכנולוגיות)
- [מודלים (DB)](#מודלים-db)
- [זרימת אימות (Auth Flow)](#זרימת-אימות-auth-flow)
- [API Endpoints](#api-endpoints)
- [זרימת Socket בזמן אמת](#זרימת-socket-בזמן-אמת)
- [Redis - תקשורת בין שרתים](#redis---תקשורת-בין-שרתים)
- [Push Notifications](#push-notifications)
- [הקמת סביבת פיתוח](#הקמת-סביבת-פיתוח)
- [משתני סביבה](#משתני-סביבה)
- [תשתית פרודקשן](#תשתית-פרודקשן)
- [Deploy](#deploy)
- [ניטור ולוגים](#ניטור-ולוגים)
- [אבטחה](#אבטחה)

---

## ארכיטקטורה כללית

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Client     │────▶│   API Server     │────▶│   MongoDB Atlas  │
│  (React PWA) │     │  (Express:5000)  │     │                  │
│   Vercel     │     │  Oracle Cloud    │     └──────────────────┘
└──────┬───────┘     └──────────────────┘
       │                      ▲
       │ WebSocket            │ Redis pub/sub
       ▼                      │
┌──────────────────┐     ┌────┴─────┐
│  Socket Server   │────▶│  Redis   │
│ (Socket.io:5001) │     │(אופציונלי)│
│  Oracle Cloud    │     └──────────┘
└──────────────────┘
```

**שרת ה-API** מטפל בכל הלוגיקה העסקית - CRUD, אימות, התראות.
**שרת ה-Socket** מטפל רק בסנכרון בזמן אמת - מי מחובר, שינויים במוצרים, התראות live.
**Redis** (אופציונלי) - מאפשר לשרת ה-API לשלוח אירועים לשרת ה-Socket כשיש שינוי.

---

## מבנה הפרויקט

```
smart-basket/
├── client/                    # React PWA (Vite)
│   ├── src/
│   │   ├── features/          # פיצ'רים מאורגנים לפי תחום
│   │   │   ├── auth/          # התחברות, הרשמה
│   │   │   ├── home/          # דף הבית - רשימת הרשימות
│   │   │   ├── list/          # דף רשימה בודדת + מוצרים
│   │   │   ├── profile/       # פרופיל משתמש
│   │   │   ├── settings/      # הגדרות + התראות
│   │   │   └── admin/         # פאנל ניהול (admin בלבד)
│   │   ├── global/
│   │   │   ├── hooks/         # useAuth, useLists, usePresence, usePushNotifications
│   │   │   ├── context/       # SettingsContext (שפה, ערכת נושא, התראות)
│   │   │   ├── components/    # Modal, Toast, PageLoader
│   │   │   ├── i18n/          # תרגומים (עברית, אנגלית, רוסית)
│   │   │   └── types/         # טיפוסים גלובליים
│   │   ├── services/
│   │   │   ├── api/           # Axios client + API functions
│   │   │   └── socket/        # Socket.io client service
│   │   ├── router/            # React Router + Protected Routes
│   │   └── App.tsx            # נקודת כניסה + ניהול גרסאות
│   ├── vercel.json            # הגדרות Vercel (cache, rewrites)
│   └── vite.config.ts         # PWA, code splitting, build version
│
├── server/
│   ├── api/                   # שרת Express REST API
│   │   └── src/
│   │       ├── config/        # environment, logger, swagger, db
│   │       ├── controllers/   # טיפול בבקשות HTTP
│   │       ├── dal/           # Data Access Layer (שכבת גישה ל-DB)
│   │       ├── errors/        # AppError, AuthError, ForbiddenError...
│   │       ├── middleware/     # auth, rateLimiter, error handler, validate
│   │       ├── models/        # Mongoose schemas
│   │       ├── routes/        # הגדרת endpoints
│   │       ├── services/      # לוגיקה עסקית
│   │       ├── types/         # טיפוסים
│   │       ├── utils/         # sanitize, asyncHandler
│   │       └── validators/    # Joi validation schemas
│   │
│   └── socket/                # שרת Socket.io
│       └── src/
│           ├── config/        # environment, logger
│           ├── handlers/      # list, product, notification handlers
│           ├── middleware/     # auth, rateLimiter
│           ├── services/      # redis, api service
│           └── types/         # טיפוסי socket events
│
├── shared/                    # טיפוסים משותפים (client + server)
│   └── types/
│
├── deploy/                    # קבצי deploy (Docker + Caddy)
│   ├── Caddyfile              # Reverse proxy + auto-SSL
│   ├── docker-compose.yml     # (לא בשימוש - משתמשים ב-PM2)
│   └── .env.example
│
└── .github/workflows/
    └── deploy.yml             # GitHub Actions - deploy אוטומטי
```

---

## טכנולוגיות

### קליינט
| טכנולוגיה | שימוש |
|-----------|-------|
| React 19 | UI framework |
| TypeScript 5.9 | type safety |
| Vite 7 | build tool |
| MUI 7 | component library |
| Tailwind CSS 4 | utility styles |
| Socket.io Client | real-time |
| Axios | HTTP requests |
| Zod | runtime validation |
| Sentry | error monitoring |
| Vite PWA | service worker, offline |

### שרת API
| טכנולוגיה | שימוש |
|-----------|-------|
| Express 4 | HTTP framework |
| Mongoose 8 | MongoDB ODM |
| JWT (jsonwebtoken) | אימות |
| Bcrypt | הצפנת סיסמאות (salt: 12) |
| Joi | validation |
| Helmet | security headers |
| express-rate-limit | הגבלת קצב |
| express-mongo-sanitize | מניעת NoSQL injection |
| sanitize-html | מניעת XSS |
| Winston | logging |
| Logtail | cloud logging (BetterStack) |
| Sentry | error monitoring |
| web-push | Push Notifications |
| Swagger | API docs |

### שרת Socket
| טכנולוגיה | שימוש |
|-----------|-------|
| Socket.io 4 | WebSocket |
| ioredis | Redis client |
| jsonwebtoken | אימות טוקנים |
| Winston + Logtail | logging |
| Sentry | error monitoring |

---

## מודלים (DB)

### User
```
{
  name:           String    (2-50 תווים, חובה)
  email:          String    (unique, lowercase, חובה)
  password:       String    (min 8, מוצפן bcrypt, select: false)
  avatarColor:    String    (ברירת מחדל: '#14B8A6')
  avatarEmoji:    String    (ברירת מחדל: '')
  googleId:       String    (unique sparse - למשתמשי Google)
  isAdmin:        Boolean   (ברירת מחדל: false)
  mutedGroupIds:  ObjectId[] (רשימות מושתקות)
  createdAt, updatedAt
}
אינדקסים: email (unique), googleId (unique sparse)
```

### List
```
{
  name:       String     (2-50 תווים, חובה)
  icon:       String     (ברירת מחדל: '🛒')
  color:      String     (ברירת מחדל: '#14B8A6')
  isGroup:    Boolean    (false = אישית, true = קבוצתית)
  owner:      ObjectId   (ref: User, חובה)
  members:    [{
    user:     ObjectId   (ref: User)
    isAdmin:  Boolean
    joinedAt: Date
  }]
  inviteCode: String     (6 תווים, unique sparse - רק לקבוצות)
  password:   String     (4 תווים plaintext - קוד גישה לקבוצה, מוצג למשתמשים)
  createdAt, updatedAt
}
אינדקסים: owner+isGroup, members.user, owner+updatedAt, members.user+updatedAt, inviteCode (unique sparse)
```

### Product
```
{
  listId:      ObjectId  (ref: List, חובה)
  name:        String    (1-100 תווים, חובה)
  quantity:    Number    (1-99999, ברירת מחדל: 1)
  unit:        Enum      ('יח׳' | 'ק״ג' | 'גרם' | 'ליטר')
  category:    Enum      ('מוצרי חלב' | 'מאפים' | 'ירקות' | 'פירות' | 'בשר' | 'משקאות' | 'ממתקים' | 'ניקיון' | 'אחר')
  isPurchased: Boolean   (ברירת מחדל: false)
  addedBy:     ObjectId  (ref: User, חובה)
  position:    Number    (ברירת מחדל: 0)
  createdAt, updatedAt
}
אינדקסים: listId+position, listId+isPurchased
```

### Notification
```
{
  type:         Enum     ('join' | 'leave' | 'removed' | 'product_add' | 'product_update' |
                          'product_delete' | 'product_purchase' | 'product_unpurchase' |
                          'member_removed' | 'list_deleted' | 'list_update')
  listId:       ObjectId
  listName:     String
  targetUserId: ObjectId  (מי מקבל את ההתראה)
  actorId:      ObjectId  (מי עשה את הפעולה)
  actorName:    String
  productId:    String    (אופציונלי)
  productName:  String    (אופציונלי)
  read:         Boolean   (ברירת מחדל: false)
  createdAt
}
אינדקסים: targetUserId+read+createdAt, listId, actorId
TTL: נמחק אוטומטית אחרי 30 יום
```

### RefreshToken
```
{
  user:      ObjectId  (ref: User)
  token:     String    (crypto.randomBytes(64) - unique)
  expiresAt: Date
}
TTL: נמחק אוטומטית כשפג תוקף
```

### PushSubscription
```
{
  userId:   ObjectId
  endpoint: String (unique)
  keys:     { p256dh, auth }
}
```

### LoginActivity
```
{
  user:      ObjectId (ref: User)
  method:    'email' | 'google'
  ip:        String
  userAgent: String
  createdAt
}
TTL: נמחק אוטומטית אחרי 90 יום
```

---

## זרימת אימות (Auth Flow)

### הרשמה / התחברות באימייל
```
1. קליינט → POST /api/auth/check-email { email }
   ← { exists: boolean, isGoogleUser: boolean }

2א. משתמש חדש → POST /api/auth/register { name, email, password }
2ב. משתמש קיים → POST /api/auth/login { email, password }
   ← { accessToken, refreshToken, user }

3. accessToken נשמר ב-localStorage (תפוגה: 15 דקות)
4. refreshToken נשמר ב-localStorage (תפוגה: 7 ימים)
```

### התחברות עם Google
```
1. קליינט → Google OAuth popup → מקבל credential
2. קליינט → POST /api/auth/google { accessToken: credential }
3. שרת → מאמת מול Google, יוצר/מקשר משתמש
   ← { accessToken, refreshToken, user }
```

### רענון טוקן (אוטומטי)
```
1. בקשת API מחזירה 401
2. Axios interceptor תופס → POST /api/auth/refresh { refreshToken }
3. שרת מבצע Token Rotation:
   - מאמת refresh token ב-DB
   - יוצר access + refresh חדשים
   - מעדכן את ה-refresh ב-DB (אטומי - מניעת race condition)
   ← { accessToken, refreshToken }
4. כל בקשות שנכשלו ממתינות בתור ומתבצעות עם הטוקן החדש
```

### Middleware אימות
```
כל בקשה מוגנת:
  Authorization: Bearer <accessToken>
  → jwt.verify() → שליפת User מ-DB → req.user = { id, email, isAdmin }
```

---

## API Endpoints

### אימות (Auth) - `/api/auth`
| Method | Path | תיאור | Rate Limit |
|--------|------|--------|------------|
| POST | `/check-email` | בדיקה אם אימייל קיים | 20/15min |
| POST | `/register` | הרשמה | 3/hour |
| POST | `/login` | התחברות | 5/15min |
| POST | `/google` | התחברות Google | 5/15min |
| POST | `/refresh` | רענון טוקן | 20/15min |
| POST | `/logout` | התנתקות | 20/15min |

### רשימות (Lists) - `/api/lists` (דורש אימות)
| Method | Path | תיאור |
|--------|------|--------|
| GET | `/` | כל הרשימות של המשתמש (בעלים + חבר) |
| POST | `/` | יצירת רשימה חדשה |
| POST | `/join` | הצטרפות לקבוצה (inviteCode + password) |
| GET | `/:id` | רשימה בודדת עם מוצרים |
| PUT | `/:id` | עדכון רשימה |
| DELETE | `/:id` | מחיקת רשימה (בעלים בלבד) |
| POST | `/:id/leave` | עזיבת קבוצה |
| DELETE | `/:id/members/:memberId` | הסרת חבר (בעלים/מנהל) |
| PATCH | `/:id/members/:memberId/admin` | שינוי סטטוס מנהל (בעלים בלבד) |

### מוצרים (Products) - `/api/lists/:listId/products` (דורש אימות)
| Method | Path | תיאור |
|--------|------|--------|
| POST | `/` | הוספת מוצר |
| PUT | `/:productId` | עדכון מוצר |
| PATCH | `/:productId/toggle` | סימון/ביטול "נקנה" |
| DELETE | `/:productId` | מחיקת מוצר |
| PUT | `/reorder` | שינוי סדר מוצרים |

### משתמש (User) - `/api/users` (דורש אימות)
| Method | Path | תיאור |
|--------|------|--------|
| GET | `/me` | פרופיל |
| PUT | `/me` | עדכון פרופיל |
| POST | `/me/change-password` | שינוי סיסמה |
| POST | `/me/muted-groups/toggle` | השתקת/ביטול השתקת קבוצה |
| DELETE | `/me` | מחיקת חשבון |

### התראות (Notifications) - `/api/notifications` (דורש אימות)
| Method | Path | תיאור |
|--------|------|--------|
| GET | `/` | כל ההתראות (עם pagination) |
| GET | `/unread-count` | מספר התראות שלא נקראו |
| PUT | `/read-all` | סימון הכל כנקרא |
| PUT | `/:id/read` | סימון התראה בודדת כנקראה |
| POST | `/` | יצירת התראה (פנימי - Socket Server) |
| POST | `/broadcast` | שידור התראות לחברי רשימה (פנימי) |

### ניהול (Admin) - `/api/admin` (דורש אימות + isAdmin)
| Method | Path | תיאור |
|--------|------|--------|
| GET | `/users` | כל המשתמשים |
| GET | `/activity` | לוג פעילות כניסה |
| GET | `/stats` | סטטיסטיקות |
| DELETE | `/users/:userId` | מחיקת משתמש |

### Health Check
| Method | Path | תיאור |
|--------|------|--------|
| GET | `/health` | בדיקת תקינות (DB status) |

---

## זרימת Socket בזמן אמת

### חיבור
```
1. קליינט מתחבר עם: { auth: { token: accessToken } }
2. שרת מאמת JWT → מוצא userId, email, name
3. קליינט מצטרף לחדר אישי: user:{userId}
4. שרת עוקב אחרי משתמשים מחוברים (Map<userId, Set<socketId>>)
```

### אירועי רשימה (Client → Server)
| Event | Data | תיאור |
|-------|------|--------|
| `join:list` | `listId` | כניסה לחדר רשימה (עם בדיקת הרשאה מול API) |
| `leave:list` | `listId` | יציאה מחדר רשימה |

### אירועי מוצרים (Client → Server → Broadcast)
| Event In | Event Out | תיאור |
|----------|-----------|--------|
| `product:add` | `product:added` | הוספת מוצר |
| `product:update` | `product:updated` | עדכון מוצר |
| `product:toggle` | `product:toggled` | סימון נקנה/לא |
| `product:delete` | `product:deleted` | מחיקת מוצר |

### אירועי התראות (Client → Server → Broadcast)
| Event In | Event Out | תיאור |
|----------|-----------|--------|
| `member:join` | `notification:new` | חבר הצטרף |
| `member:leave` | `notification:new` | חבר עזב |
| `member:remove` | `notification:new` | חבר הוסר |
| `list:update` | `notification:new` | רשימה עודכנה |
| `list:delete` | `notification:new` | רשימה נמחקה |

### אירועי נוכחות (Server → Client)
| Event | Data | תיאור |
|-------|------|--------|
| `presence:update` | `{ listId, userIds }` | רשימת מחוברים לרשימה |
| `user:joined` | `{ listId, userId, userName }` | משתמש נכנס |
| `user:left` | `{ listId, userId }` | משתמש יצא |

### רענון טוקן בSocket
```
1. connect_error עם שגיאת auth
2. קליינט → POST /api/auth/refresh (fetch, לא axios)
3. קליינט → emit('token:refresh', newAccessToken)
4. שרת → jwt.verify() + userId match → מעדכן
```

---

## Redis - תקשורת בין שרתים

```
שרת API ────publish───▶ Redis channel: "smart-basket:events" ────subscribe───▶ שרת Socket
```

### אירועים שעוברים ב-Redis
| type | מתי | מה קורה |
|------|-----|---------|
| `product:added` | מוצר נוסף דרך API | Socket משדר לחדר הרשימה |
| `product:toggled` | מוצר סומן/בוטל | Socket משדר לחדר הרשימה |
| `product:deleted` | מוצר נמחק | Socket משדר לחדר הרשימה |
| `notification` | התראה נוצרה | Socket משדר לחדר הרשימה |
| `user:deleted` | משתמש נמחק (admin) | Socket מנתק את כל ה-sockets של המשתמש |

**ללא Redis:** השרת עובד במצב single-instance. אירועי Socket רצים ישירות ב-handlers.

---

## Push Notifications

### הזרימה
```
1. קליינט → מבקש הרשאת Notification מהדפדפן
2. קליינט → נרשם ל-push subscription (VAPID key)
3. קליינט → POST /api/notifications/push/subscribe { subscription }
4. כשמתרחש אירוע (מוצר נוסף, חבר הצטרף וכו'):
   שרת → web-push.sendNotification() → Push Service → דפדפן המשתמש
```

### הגדרות VAPID
```bash
# יצירת מפתחות:
npx web-push generate-vapid-keys
```

---

## הקמת סביבת פיתוח

### דרישות
- Node.js 20+
- MongoDB (מקומי או Atlas)
- Redis (אופציונלי - רק אם צריך multi-instance)

### התקנה
```bash
# שיבוט הפרויקט
git clone <repo-url>
cd smart-basket

# התקנת dependencies - כל תת-פרויקט בנפרד
cd client && npm install
cd ../server/api && npm install
cd ../socket && npm install

# הגדרת משתני סביבה
cp server/api/.env.example server/api/.env
cp server/socket/.env.example server/socket/.env
cp client/.env.example client/.env
# ערוך את כל קבצי .env עם הערכים שלך
```

### הרצה בפיתוח
```bash
# טרמינל 1 - API Server
cd server/api && npm run dev    # http://localhost:5000

# טרמינל 2 - Socket Server
cd server/socket && npm run dev # http://localhost:5001

# טרמינל 3 - Client
cd client && npm start          # http://localhost:5173
```

### Build
```bash
cd server/api && npm run build     # → dist/
cd server/socket && npm run build  # → dist/
cd client && npm run build         # → dist/
```

---

## משתני סביבה

### שרת API (`server/api/.env`)
| משתנה | חובה | ברירת מחדל | תיאור |
|-------|------|-----------|--------|
| `NODE_ENV` | כן | `development` | `development` / `production` |
| `PORT` | כן | `5000` | פורט השרת |
| `MONGODB_URI` | כן | - | חיבור ל-MongoDB |
| `JWT_ACCESS_SECRET` | כן | - | סוד JWT (מינימום 32 תווים) |
| `JWT_REFRESH_SECRET` | כן | - | סוד Refresh Token (מינימום 32 תווים) |
| `JWT_ACCESS_EXPIRES_IN` | לא | `15m` | תפוגת Access Token |
| `JWT_REFRESH_EXPIRES_IN` | לא | `7d` | תפוגת Refresh Token |
| `GOOGLE_CLIENT_ID` | לא | - | Google OAuth Client ID |
| `CORS_ORIGIN` | כן | `http://localhost:5173` | Origins מותרים (מופרדים בפסיק) |
| `ADMIN_EMAIL` | כן | - | אימייל Admin (מקבל הרשאות אוטומטית) |
| `VAPID_PUBLIC_KEY` | לא | - | מפתח VAPID ציבורי (push) |
| `VAPID_PRIVATE_KEY` | לא | - | מפתח VAPID פרטי |
| `VAPID_EMAIL` | לא | - | אימייל VAPID |
| `SENTRY_DSN` | לא | - | Sentry DSN (פעיל רק בproduction) |
| `LOGTAIL_TOKEN` | לא | - | BetterStack Logtail token |

### שרת Socket (`server/socket/.env`)
| משתנה | חובה | ברירת מחדל | תיאור |
|-------|------|-----------|--------|
| `PORT` | כן | `5001` | פורט השרת |
| `NODE_ENV` | כן | `development` | סביבה |
| `JWT_ACCESS_SECRET` | כן | - | **חייב להיות זהה לשרת API** |
| `CORS_ORIGIN` | כן | `http://localhost:5173` | Origins מותרים |
| `API_URL` | כן | `http://localhost:5000/api` | כתובת שרת API |
| `ADMIN_EMAIL` | לא | - | **חייב להיות זהה לשרת API** |
| `REDIS_URL` | לא | - | חיבור Redis |
| `SENTRY_DSN` | לא | - | Sentry DSN |
| `LOGTAIL_TOKEN` | לא | - | BetterStack token |

### קליינט (`client/.env`)
| משתנה | חובה | ברירת מחדל | תיאור |
|-------|------|-----------|--------|
| `VITE_API_URL` | כן | `http://localhost:5000/api` | כתובת ה-API |
| `VITE_SOCKET_URL` | כן | `http://localhost:5001` | כתובת ה-Socket |
| `VITE_GOOGLE_CLIENT_ID` | לא | - | Google OAuth Client ID |
| `VITE_SENTRY_DSN` | לא | - | Sentry DSN |
| `VITE_VAPID_PUBLIC_KEY` | לא | - | מפתח VAPID ציבורי |

---

## תשתית פרודקשן

### ארכיטקטורת הפריסה
```
┌─────────────────────────────────────────────────┐
│              Oracle Cloud VM                     │
│                                                  │
│  ┌─────────────┐   ┌──────────────────────────┐ │
│  │   Caddy     │──▶│  PM2                     │ │
│  │  (port 443) │   │  ├── api     (port 5000) │ │
│  │  auto-SSL   │   │  └── socket  (port 5001) │ │
│  └─────────────┘   └──────────────────────────┘ │
│                                                  │
└─────────────────────────────────────────────────┘

┌─────────────┐     ┌──────────────────┐
│   Vercel    │     │  MongoDB Atlas   │
│  (Client)   │     │  (Database)      │
└─────────────┘     └──────────────────┘
```

### Caddy (Reverse Proxy + SSL)
```
# deploy/Caddyfile
{$API_DOMAIN}    → reverse_proxy localhost:5000
{$SOCKET_DOMAIN} → reverse_proxy localhost:5001
```
Caddy מנפיק SSL אוטומטית מ-Let's Encrypt ומחדש אותם.

### PM2 (Process Manager)
```bash
# ecosystem.config.js (על השרת)
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # הפעלה אוטומטית עם boot
```

### Vercel (Client)
- Build: `npm run build`
- Output: `dist/`
- Framework: Vite
- `vercel.json` מגדיר:
  - Cache-Control: `no-cache` לקבצים קריטיים (index.html, sw.js, version.json)
  - SPA rewrite: כל path → `index.html`

---

## Deploy

### Deploy אוטומטי (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
# טריגר: push ל-main עם שינויים ב-server/ או deploy/
# מה קורה:
#   1. SSH לשרת Oracle
#   2. git pull origin main
#   3. npm ci + npm run build (API + Socket)
#   4. pm2 restart + pm2 save
```

**GitHub Secrets נדרשים:**
| Secret | תיאור |
|--------|--------|
| `ORACLE_HOST` | IP של שרת Oracle |
| `ORACLE_USER` | שם משתמש SSH |
| `ORACLE_SSH_KEY` | מפתח SSH פרטי |

### Deploy ידני
```bash
# על שרת Oracle:
cd ~/smart-basket
git pull origin main
cd server/api && npm ci && npm run build
cd ../socket && npm ci && npm run build
cd ~/smart-basket
pm2 restart ecosystem.config.js --update-env
pm2 save
```

### Deploy קליינט
Vercel עושה deploy אוטומטי על כל push ל-main (client/ changes).

---

## ניטור ולוגים

### Sentry (שגיאות)
- שרת API: שגיאות 500+ נשלחות ל-Sentry (production בלבד)
- שרת Socket: שגיאות connection/handler
- קליינט: שגיאות React + API

### Logtail / BetterStack (לוגים)
- Winston logger → Logtail transport
- רמות: error, warn, info, debug
- Production: info ומעלה
- Development: debug ומעלה (צבעוני)

### Health Check
```bash
curl https://api-domain.com/health
# { "status": "ok", "db": true, "timestamp": "..." }
```

---

## אבטחה

### שכבות הגנה
| שכבה | טכנולוגיה | הגדרה |
|------|-----------|--------|
| Headers | Helmet.js | X-Frame-Options, CSP, HSTS |
| HTTPS | Caddy auto-SSL | Let's Encrypt |
| CORS | express cors | origins מוגדרים, credentials |
| Rate Limiting | express-rate-limit | 5 רמות (כללי, auth, login, register, join) |
| NoSQL Injection | express-mongo-sanitize | middleware גלובלי |
| XSS | sanitize-html | כל input טקסטואלי |
| Auth | JWT + bcrypt | access 15min, refresh 7d, salt 12 |
| Token Rotation | atomic update | מניעת שימוש חוזר ב-refresh token |
| Password | select: false | סיסמה לא חוזרת ב-API responses |
| Input Validation | Joi schemas | כל endpoint מאומת |
| Admin | isAdmin middleware | בדיקת תפקיד בכל בקשת admin |
| Socket Auth | JWT verify | כל חיבור socket חייב טוקן תקף |
| Socket Rate Limit | in-memory window | 50 אירועים ל-10 שניות |

### Rate Limits
| Endpoint | הגבלה |
|----------|-------|
| כללי API | 100 בקשות / 15 דקות |
| Auth | 20 בקשות / 15 דקות |
| Login | 5 ניסיונות / 15 דקות |
| Register | 3 ניסיונות / שעה |
| Join Group | 10 ניסיונות / 15 דקות |
| Socket Events | 50 אירועים / 10 שניות |

---

## שכבות השרת (Architecture Pattern)

```
Request
  ↓
Routes          # הגדרת endpoint + middleware chain
  ↓
Middleware      # authenticate, validate, rateLimiter
  ↓
Controllers     # פירוק request, קריאה ל-service, עיצוב response
  ↓
Services        # לוגיקה עסקית, הרשאות, תיאום בין DALs
  ↓
DAL             # Data Access Layer - שאילתות MongoDB בלבד
  ↓
Models          # Mongoose schemas, validation, hooks
```

### כללים
- **Controllers** לא ניגשים ישירות ל-DB - תמיד דרך Services
- **Services** לא ניגשים ישירות ל-Mongoose - תמיד דרך DAL
- **DAL** יורש מ-`BaseDAL` עם פעולות בסיסיות (findById, create, update, delete)
- **שגיאות** מוגדרות בקלאסים ייעודיים עם factory methods:
  ```typescript
  throw NotFoundError.list();
  throw ForbiddenError.notOwner();
  throw ConflictError.emailExists();
  throw AuthError.tokenExpired();
  ```
