# העלאה ל-App Store ול-Google Play

מסמך עבודה מסודר: מה כבר מוכן בקוד, ומה נשאר לעשות, לפי הסדר, כדי להגיש
את שתי האפליקציות ולקבל אישור מהר.

האפליקציה הנייטיב (Capacitor) טוענת את האתר החי `https://prod-smart-basket.vercel.app`
(ראו `capacitor.config.ts`). כל שינוי באתר מגיע לאפליקציה בלי גרסה חדשה בחנות.
גרסה חדשה בחנות נדרשת רק כשמשנים פלאגינים נייטיב, אייקונים, הרשאות או קבצים
בתיקיות `ios/` ו-`android/`.

---

## מה כבר מוכן בקוד

| נושא | מצב |
|---|---|
| רכישת Pro בחנויות (RevenueCat), שחזור רכישות, ניהול מנוי | מוכן |
| Sign in with Apple ב-iOS (חובה כשיש כניסה עם גוגל, הנחיה 4.8) | מוכן, בשרת ובאפליקציה |
| התראות באפליקציות: FCM באנדרואיד, APNs ב-iOS, לחיצה פותחת את המסך הנכון | מוכן, מחכה למפתחות |
| מחיקת חשבון מתוך האפליקציה (הנחיה 5.1.1), בשם ברור "מחיקת החשבון" | קיים בהגדרות |
| מסך אופליין ממותג כשנפתחים בלי חיבור (במקום מסך שגיאה ריק) | מוכן |
| הסתרת הצעת "הוסף למסך הבית" באפליקציה מהחנות | מוכן |
| שוליים בטוחים באנדרואיד (מסך מלא מקצה לקצה) ובאייפון | מוכן |
| iPhone בלבד, מצב אנכי, arm64, עברית כשפת פיתוח | מוכן |
| Privacy Manifest של אפל, entitlements ל-Apple Sign In ולהתראות | מוכן |
| אייקון התראה לבן ואחיד באנדרואיד, וערוץ התראות | מוכן |
| הסברי הרשאות (מיקום, מצלמה, תמונות) בעברית | קיימים ב-Info.plist |
| מדיניות פרטיות ותנאי שימוש מעודכנים, כולל סעיף מנוי מתחדש | `/privacy`, `/terms` |
| קישורי תנאים ופרטיות ליד כפתור הרכישה | קיימים |

---

## שלב 0: מיזוג ל-main (חובה לפני בנייה לחנות)

האפליקציה מהחנות טוענת את **האתר של הפרודקשן**, שנבנה מענף `main`. כל העבודה
על החנויות (Apple Sign In, התראות, מסך אופליין, מדיניות פרטיות) נמצאת כרגע
ב-`non-prod` בלבד. בלי מיזוג, האפליקציה בחנות תיטען בלי כל אלה, ואפל תדחה אותה.

- [ ] למזג `non-prod` ל-`main` ולפרוס את השרת והאתר של הפרודקשן.
- [ ] **החלטה שצריך לקבל לפני המיזוג:** מנוי Pro והמכסות היומיות (Freemium) נמצאים
      היום רק ב-non-prod. רכישה בחנות דורשת אותם, אז במיזוג הזה הם עולים גם לפרודקשן.
- בדיקה על non-prod לפני המיזוג: אפשר לבנות אפליקציה שמצביעה על אתר ה-non-prod עם
  `CAP_SERVER_URL=<כתובת האתר של non-prod> npx cap sync`. **לא להעלות בנייה כזו לחנות.**

## האם צריך להחליף כתובות (URL)?

> **אזהרה:** הכתובת `smart-basket.vercel.app` (בלי `prod-`) **אינה שלנו**. זה אתר של
> מישהו אחר. הכתובת של הפרודקשן היא `prod-smart-basket.vercel.app`, והיא מופיעה בכל
> הקבצים. לא להחזיר את הכתובת הישנה.

| איפה | הכתובת היום | צריך לשנות? |
|---|---|---|
| האתר שהאפליקציה טוענת (`capacitor.config.ts`) | `https://prod-smart-basket.vercel.app` | לא. רק אם עוברים לדומיין משלכם, ואז גם בנייה חדשה לחנות |
| מסך האופליין (`public/offline.html`, `APP_URL`) | `https://prod-smart-basket.vercel.app/` | לא. אם מחליפים דומיין, לשנות גם כאן |
| Webhook של RevenueCat | `https://smart-basket-api-prod.onrender.com/api/store-billing/webhook` | לא. זה שרת הפרודקשן (לפי ה-proxy ב-main) |
| מדיניות פרטיות ותנאי שימוש בחנויות | `https://prod-smart-basket.vercel.app/privacy`, `/terms` | לא |
| Google OAuth, client מסוג Web (Authorized origins) | כפי שמוגדר היום לאתר | לא. באפליקציה עובדים client מסוג Android ו-iOS (שלב 5) |
| `VITE_APP_STORE_URL`, `VITE_PLAY_STORE_URL` ב-Vercel | לא מוגדרים | כן, אחרי שהאפליקציות פורסמו (שלב 6) |

אם בעתיד עוברים לדומיין משלכם (למשל `app.smartbasket.co.il`): לשנות ב-`capacitor.config.ts`
וב-`public/offline.html`, להוסיף את הדומיין ל-Authorized origins של Google, לבנות גרסה
חדשה לשתי החנויות, ולעדכן את כתובות המדיניות בחנויות.

---

## שלב 1: חשבונות (פעם אחת)

- [ ] **Apple Developer Program**: 99$ לשנה. אישור לוקח בדרך כלל יום עד יומיים.
- [ ] **Google Play Console**: 25$ חד פעמי. חשבון חדש של אדם פרטי צריך
      **בדיקה סגורה של 12 בודקים במשך 14 יום** לפני שמותר לפרסם לכולם.
      כדאי להתחיל את זה כמה שיותר מוקדם (ראו שלב 8).
- [ ] ב-App Store Connect: לחתום על **Paid Apps Agreement** ולמלא פרטי בנק ומס.
      בלי זה מוצרי המנוי לא נטענים באפליקציה.
- [ ] ב-Play Console: להגדיר **פרופיל תשלומים** (Payments profile).
- [ ] **Firebase** (חינמי): פרויקט חדש ב-console.firebase.google.com, להתראות באנדרואיד.

## שלב 2: יצירת האפליקציות

- [ ] App Store Connect: אפליקציה חדשה, Bundle ID `com.smartbasket.app`, שם `Smart Basket`,
      שפה ראשית עברית.
- [ ] בפורטל המפתחים של אפל (Identifiers, `com.smartbasket.app`): להפעיל
      **Sign In with Apple**, **In-App Purchase** ו-**Push Notifications**.
- [ ] Play Console: אפליקציה חדשה, package `com.smartbasket.app`, שפת ברירת מחדל עברית.
- [ ] Firebase: Add app, Android, package `com.smartbasket.app`. להוריד את
      `google-services.json` ולשים ב-`client/android/app/google-services.json`.
      **בלעדיו בניית release נעצרת בכוונה**, כי האפליקציה הייתה קורסת בהפעלת התראות.

## שלב 3: מוצרי מנוי

אותו מזהה בשתי החנויות, למשל `smartbasket_pro_monthly` ו-`smartbasket_pro_yearly`.

- [ ] App Store Connect, Subscriptions: קבוצת מנוי אחת עם שני המוצרים, מחיר,
      ושם ותיאור בעברית ובאנגלית לכל מוצר.
- [ ] Play Console, Monetize, Subscriptions: מוצר עם base plan חודשי ושנתי.

## שלב 4: RevenueCat (חינמי עד 2,500$ הכנסה חודשית)

- [ ] פרויקט חדש, ולחבר אפליקציית iOS ואפליקציית Android (`com.smartbasket.app`).
- [ ] Entitlement בשם `pro`, ולשייך אליו את כל המוצרים.
- [ ] Offering בשם `default` עם חבילות Monthly ו-Annual.
- [ ] Integrations, Webhooks: `https://smart-basket-api-prod.onrender.com/api/store-billing/webhook`,
      ובשדה Authorization ערך אקראי ארוך.

## שלב 5: התחברות עם גוגל באפליקציה

- [ ] Google Cloud Console: OAuth client מסוג **Android**, package `com.smartbasket.app`,
      עם טביעת SHA-1 של מפתח החתימה **וגם** של Play App Signing (מופיעה ב-Play Console
      תחת App integrity אחרי ההעלאה הראשונה).
- [ ] OAuth client מסוג **iOS** עם Bundle ID `com.smartbasket.app`.
- [ ] ב-Xcode, Info, URL Types: להוסיף URL Scheme עם ה-iOS client ID ההפוך
      (`com.googleusercontent.apps.XXXX`).

## שלב 6: מפתחות התראות ומשתני סביבה

מפתחות להתראות:
- [ ] **אנדרואיד:** Firebase, Project settings, Service accounts, Generate new private key.
      מתקבל קובץ JSON.
- [ ] **iOS:** developer.apple.com, Keys, +, לסמן Apple Push Notifications service.
      להוריד את קובץ ה-`.p8` (אפשר להוריד **פעם אחת בלבד**), ולרשום את Key ID
      ואת Team ID (מופיע בפינה של פורטל המפתחים).

שרת הפרודקשן (Render), ואחר כך Redeploy:
- [ ] `REVENUECAT_SECRET_KEY` המפתח הסודי `sk_...`
- [ ] `REVENUECAT_WEBHOOK_AUTH` אותו ערך שהוגדר ב-webhook
- [ ] `FCM_SERVICE_ACCOUNT` כל תוכן קובץ ה-JSON מ-Firebase (או base64 שלו)
- [ ] `APNS_KEY` תוכן קובץ ה-`.p8` (או base64 שלו)
- [ ] `APNS_KEY_ID` ו-`APNS_TEAM_ID`
- לא צריך: `APPLE_CLIENT_IDS`, `APNS_BUNDLE_ID` (ברירות המחדל נכונות), ו-`APNS_USE_SANDBOX`
  (נשאר false, מתאים ל-TestFlight ולחנות)

### כניסה עם Apple גם באתר (רשות)
באפליקציית iOS הכפתור מופיע בלי שום הגדרה. באתר, בדפדפן ובמסך הבית, הוא מופיע רק אחרי:
- [ ] developer.apple.com, Identifiers, +, **Services IDs**. מזהה לדוגמה: `com.smartbasket.web`.
      לסמן **Sign In with Apple**, Configure, לבחור את ה-App ID הראשי, ולהוסיף:
      Domains: `smart-basket.vercel.app` (ואת דומיין ה-non-prod אם רוצים לבדוק שם),
      Return URLs: `https://smart-basket.vercel.app/` (עם הלוכסן בסוף)
- [ ] בשרת: `APPLE_CLIENT_IDS=com.smartbasket.app,com.smartbasket.web`
- [ ] באתר (Vercel): `VITE_APPLE_WEB_CLIENT_ID=com.smartbasket.web`, ואז Redeploy

האתר (Vercel), ואחר כך Redeploy:
- [ ] `VITE_REVENUECAT_IOS_KEY` המפתח הציבורי `appl_...`
- [ ] `VITE_REVENUECAT_ANDROID_KEY` המפתח הציבורי `goog_...`
- [ ] `VITE_GOOGLE_IOS_CLIENT_ID` ה-client ID מסוג iOS
- [ ] אחרי הפרסום: `VITE_APP_STORE_URL` ו-`VITE_PLAY_STORE_URL`. עד אז עמוד המנוי
      באתר כותב "האפליקציה תהיה זמינה בחנויות בקרוב".

## שלב 7: בנייה

### Android (אפשר מ-Windows)
- [ ] מפתח חתימה, פעם אחת בלבד:
  ```
  keytool -genkey -v -keystore android/app/release.jks -alias smartbasket -keyalg RSA -keysize 2048 -validity 10000
  ```
  וליצור `android/keystore.properties` (לא נכנס ל-git):
  ```
  storeFile=release.jks
  storePassword=...
  keyAlias=smartbasket
  keyPassword=...
  ```
  **לגבות את הקובץ והסיסמאות במקום בטוח. בלעדיהם אי אפשר לעדכן את האפליקציה לעולם.**
- [ ] `npm run cap:android`, ובאנדרואיד סטודיו: Build, Generate Signed Bundle (AAB).
- [ ] לפני כל גרסה חדשה לחנות: להעלות את `versionCode` ב-`android/app/build.gradle`.

### iOS (דורש Mac)
- [ ] על ה-Mac: `npm install` ואז `npm run cap:ios`. זה גם מייצר מחדש את
      `ios/App/CapApp-SPM/Package.swift` עם הנתיבים הנכונים ל-Mac.
- [ ] ב-Xcode, Signing & Capabilities: לבחור את הצוות, ולוודא שמופיעים
      **Sign In with Apple** ו-**Push Notifications** (מגיעים מ-`App.entitlements`),
      ולהוסיף **In-App Purchase**.
- [ ] Product, Archive, ואז Distribute App ל-App Store Connect.
- [ ] לפני כל גרסה חדשה: להעלות את Build (`CURRENT_PROJECT_VERSION`).
- אין Mac? אפשר לבנות בענן עם Codemagic או Ionic Appflow.

## שלב 8: בדיקה והגשה

- [ ] **Android:** להעלות ל-Closed testing, להוסיף 12 בודקים (אימיילים של גוגל),
      ולהשאיר אותם פעילים 14 יום. אחר כך להגיש ל-Production.
- [ ] **iOS:** לבדוק ב-TestFlight לפני ההגשה.
- [ ] רשימת בדיקה בשתי המערכות:
  - כניסה עם גוגל, עם Apple (iOS) ועם אימייל
  - הגדרות, התראות, הפעלת התראות, ואז שינוי ברשימה משותפת ממכשיר אחר: מגיעה התראה,
    ולחיצה עליה פותחת את הרשימה
  - רכישת מנוי ב-Sandbox, ושחזור רכישות
  - פתיחה במצב טיסה: מופיע מסך האופליין, וכשהחיבור חוזר האפליקציה נטענת לבד
  - סריקת ברקוד (מצלמה), וסניפים קרובים (מיקום)
  - מחיקת חשבון
- [ ] חשבון לבודקים: משתמש קבוע עם אימייל וסיסמה, עם כמה רשימות ומוצרים וקבוצה
      משותפת. לא לתת לו Pro קבוע: הבודקים צריכים לראות את מסך הרכישה.

---

## טקסטים מוכנים להדבקה

### שם וכותרת משנה
- שם: **Smart Basket**
- כותרת משנה (App Store, עד 30 תווים): **רשימת קניות משותפת וחכמה**
- תיאור קצר (Google Play, עד 80 תווים): **רשימות קניות משותפות בזמן אמת, עם עוזר AI והשוואת מחירים**

### תיאור מלא (עברית)
```
Smart Basket הופכת את הקניות המשותפות לפשוטות.

• רשימות משותפות בזמן אמת: כל שינוי מופיע מיד אצל כל בני הבית
• קבוצות: משפחה, שותפים לדירה או חברים, כל אחד מוסיף ומסמן
• הוספה מהירה: הקלדה, סריקת ברקוד, או צילום של רשימה כתובה
• עוזר AI שמציע מוצרים, מסדר את הרשימה ועונה על שאלות
• השוואת מחירים בין רשתות וסניפים קרובים אליך
• סידור אוטומטי לפי מחלקות בסופר, או בסדר שלך
• התראות כשמישהו מעדכן רשימה משותפת
• עובדת גם בקליטה חלשה: השינויים נשמרים ומסונכרנים כשהחיבור חוזר
• תובנות על הרגלי הקנייה וההוצאות שלך

Smart Basket Pro פותח את כל האפשרויות בלי הגבלה: רשימות וקבוצות בלי הגבלה,
עוזר AI והשוואות מחירים בלי מכסה יומית. המנוי מתחדש אוטומטית וניתן לביטול
בכל עת בהגדרות החשבון בחנות.

תנאי שימוש: https://prod-smart-basket.vercel.app/terms
מדיניות פרטיות: https://prod-smart-basket.vercel.app/privacy
```

### Full description (English)
```
Smart Basket makes shared shopping simple.

• Real-time shared lists: every change shows up instantly for everyone
• Groups for family, roommates or friends
• Quick add: type, scan a barcode, or snap a photo of a handwritten list
• AI assistant that suggests products, organizes your list and answers questions
• Price comparison across chains and nearby stores
• Automatic sorting by store aisle, or your own order
• Notifications when someone updates a shared list
• Works on a weak connection: changes are saved and synced when you are back online
• Insights into your shopping habits and spending

Smart Basket Pro unlocks everything: unlimited lists and groups, and unlimited
AI assistant and price comparisons. The subscription renews automatically and
can be cancelled anytime in your store account settings.

Terms of Use: https://prod-smart-basket.vercel.app/terms
Privacy Policy: https://prod-smart-basket.vercel.app/privacy
```

### מילות מפתח (App Store, עד 100 תווים)
```
רשימת קניות,קניות,סופר,רשימה משותפת,מכולת,השוואת מחירים,shopping list,grocery
```

### פרטים נוספים
- קטגוריה: **Shopping** (משנית: Productivity)
- כתובת תמיכה ו-Marketing URL: `https://prod-smart-basket.vercel.app`
- מדיניות פרטיות: `https://prod-smart-basket.vercel.app/privacy`
- אימייל ליצירת קשר: `smartbasket129@gmail.com`
- דירוג גיל: 4+ (App Store) / Everyone (Google Play). אין תוכן בעייתי, אין צ'אט בין זרים.
- מחיר האפליקציה: חינם, עם רכישות בתוך האפליקציה.

### הערות לבודקים (App Review Notes)
```
Demo account (email sign-in):
Email: <review account email>
Password: <review account password>

Smart Basket is a shared shopping-list app. Lists sync in real time between
members of a group. Pro is an auto-renewing subscription purchased with In-App
Purchase (Settings > Manage Subscription). Sign in with Apple and Google are
available on the login screen. Account deletion: Settings > Delete Account.
Notifications are optional (Settings > Notifications) and are sent when a
shared list changes. Location is optional and used only to show nearby store
branches for price comparison. Camera is used to scan barcodes and photos of
shopping lists.
```

---

## שאלוני פרטיות בחנויות

התשובות חייבות להתאים ל-`PrivacyInfo.xcprivacy` ולמדיניות הפרטיות.

### App Store Connect, App Privacy
- Tracking: **לא** (אין פרסום ואין מעקב בין אפליקציות).
- Data Linked to You, לצורך App Functionality: Name, Email Address, User ID,
  Photos (תמונות מוצרים), Other User Content (רשימות ומוצרים), Purchase History.
- Data Linked to You, לצורך Analytics: User ID, Product Interaction.
- Data Not Linked to You, לצורך App Functionality: Crash Data, Performance Data.
- מיקום: **לא נאסף** (נשלח רק לחישוב סניפים קרובים באותה בקשה ולא נשמר).

### Google Play, Data safety
- האם נאסף או משותף מידע: כן. מוצפן בהעברה: כן. אפשר לבקש מחיקה: כן (מתוך האפליקציה).
- Personal info: Name, Email address, User IDs. מטרה: App functionality, Account management.
- Photos: Photos. מטרה: App functionality.
- App activity: App interactions, Other user-generated content. מטרה: App functionality, Analytics.
- Financial info: Purchase history. מטרה: App functionality.
- App info and performance: Crash logs, Diagnostics. מטרה: App functionality.
- Device or other IDs: לא (טוקן ההתראות משמש רק לשליחת התראות, לא לזיהוי).
- מיקום: לא נאסף (עיבוד בזמן אמת בלבד, לא נשמר).
- Data shared with third parties: לא (ספקי תשתית שפועלים מטעמנו לא נחשבים שיתוף).

---

## צילומי מסך

- iPhone: חובה בגודל **6.9 אינץ'** (1320×2868). אפל מקטינה אוטומטית לשאר הגדלים.
  אין צורך בצילומי אייפד: האפליקציה מוגדרת ל-iPhone בלבד.
- Android: לפחות 2 צילומים לטלפון (מומלץ 1080×1920 ומעלה), וגרפיקה ראשית
  (Feature graphic) בגודל **1024×500**.
- מומלץ 5 עד 8 מסכים, לפי הסדר: רשימה משותפת, הוספה מהירה וסריקה, עוזר AI,
  השוואת מחירים, קבוצה עם חברים, תובנות, Pro.

---

## אחרי ההשקה (לא חוסם אישור)

- **ביטול אסימון Apple במחיקת חשבון**: אפל ממליצה לבטל את הרשאת Sign in with Apple
  דרך ה-REST API שלה כשמשתמש מוחק חשבון. דורש מפתח `.p8` נוסף מפורטל המפתחים.
- **מונה על אייקון האפליקציה** (badge) לפי מספר ההתראות שלא נקראו.
