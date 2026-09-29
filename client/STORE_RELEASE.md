# העלאה ל-App Store ול-Google Play

מסמך עבודה מסודר: מה כבר מוכן בקוד, ומה נשאר לעשות, לפי הסדר, כדי להגיש
את שתי האפליקציות ולקבל אישור מהר.

האפליקציה הנייטיב (Capacitor) טוענת את האתר החי `https://smart-basket.vercel.app`
(ראו `capacitor.config.ts`). כל שינוי באתר מגיע לאפליקציה בלי גרסה חדשה בחנות.
גרסה חדשה בחנות נדרשת רק כשמשנים פלאגינים נייטיב, אייקונים, הרשאות או קבצים
בתיקיות `ios/` ו-`android/`.

---

## מה כבר מוכן בקוד

| נושא | מצב |
|---|---|
| רכישת Pro בחנויות (RevenueCat), שחזור רכישות, ניהול מנוי | מוכן |
| Sign in with Apple ב-iOS (חובה כשיש כניסה עם גוגל, הנחיה 4.8) | מוכן, בשרת ובאפליקציה |
| מחיקת חשבון מתוך האפליקציה (הנחיה 5.1.1) | קיים בהגדרות |
| מסך אופליין ממותג כשנפתחים בלי חיבור (במקום מסך שגיאה ריק) | מוכן |
| הסתרת הצעות "הוסף למסך הבית" ו-Web Push באפליקציה מהחנות | מוכן |
| שוליים בטוחים באנדרואיד (מסך מלא מקצה לקצה) ובאייפון | מוכן |
| iPhone בלבד, מצב אנכי, arm64, עברית כשפת פיתוח | מוכן |
| Privacy Manifest של אפל (`ios/App/App/PrivacyInfo.xcprivacy`) | מוכן |
| הסברי הרשאות (מיקום, מצלמה, תמונות) בעברית | קיימים ב-Info.plist |
| מדיניות פרטיות ותנאי שימוש מעודכנים, כולל סעיף מנוי מתחדש | `/privacy`, `/terms` |
| קישורי תנאים ופרטיות ליד כפתור הרכישה | קיימים |

---

## שלב 1: חשבונות (פעם אחת)

- [ ] **Apple Developer Program**: 99$ לשנה. אישור לוקח בדרך כלל יום עד יומיים.
- [ ] **Google Play Console**: 25$ חד פעמי. חשבון חדש של אדם פרטי צריך
      **בדיקה סגורה של 12 בודקים במשך 14 יום** לפני שמותר לפרסם לכולם.
      כדאי להתחיל את זה כמה שיותר מוקדם (ראו שלב 7).
- [ ] ב-App Store Connect: לחתום על **Paid Apps Agreement** ולמלא פרטי בנק ומס.
      בלי זה מוצרי המנוי לא נטענים באפליקציה.
- [ ] ב-Play Console: להגדיר **פרופיל תשלומים** (Payments profile).

## שלב 2: יצירת האפליקציות בחנויות

- [ ] App Store Connect: אפליקציה חדשה, Bundle ID `com.smartbasket.app`, שם `Smart Basket`,
      שפה ראשית עברית.
- [ ] בפורטל המפתחים של אפל (Identifiers): להפעיל ל-`com.smartbasket.app` את
      **Sign In with Apple** ואת **In-App Purchase**.
- [ ] Play Console: אפליקציה חדשה, package `com.smartbasket.app`, שפת ברירת מחדל עברית.

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

## שלב 6: משתני סביבה

שרת (Render):
- [ ] `REVENUECAT_SECRET_KEY` המפתח הסודי `sk_...`
- [ ] `REVENUECAT_WEBHOOK_AUTH` אותו ערך שהוגדר ב-webhook
- `APPLE_CLIENT_IDS` לא צריך: ברירת המחדל היא `com.smartbasket.app`

לקוח (Vercel), ואחר כך Redeploy:
- [ ] `VITE_REVENUECAT_IOS_KEY` המפתח הציבורי `appl_...`
- [ ] `VITE_REVENUECAT_ANDROID_KEY` המפתח הציבורי `goog_...`
- [ ] `VITE_GOOGLE_IOS_CLIENT_ID` ה-client ID מסוג iOS
- [ ] אחרי הפרסום: `VITE_APP_STORE_URL` ו-`VITE_PLAY_STORE_URL`. עד אז עמוד המנוי
      באתר כותב "האפליקציה תהיה זמינה בחנויות בקרוב".

## שלב 7: בנייה והעלאה

### Android (אפשר מ-Windows)
- [ ] מפתח חתימה, פעם אחת בלבד:
  ```
  keytool -genkey -v -keystore android/app/release.jks -alias smartbasket -keyalg RSA -keysize 2048 -validity 10000
  ```
  ולצור `android/keystore.properties` (לא נכנס ל-git):
  ```
  storeFile=release.jks
  storePassword=...
  keyAlias=smartbasket
  keyPassword=...
  ```
  **לגבות את הקובץ והסיסמאות במקום בטוח. בלעדיהם אי אפשר לעדכן את האפליקציה לעולם.**
- [ ] `npm run cap:android`, ובאנדרואיד סטודיו: Build, Generate Signed Bundle (AAB).
- [ ] להעלות ל-**Closed testing**, להוסיף 12 בודקים (אימיילים של גוגל), ולהשאיר
      אותם פעילים 14 יום. אחר כך להגיש ל-Production.

### iOS (דורש Mac)
- [ ] `npm run cap:ios`. ב-Xcode, Signing & Capabilities: לבחור את הצוות, ולוודא שמופיעים
      **Sign In with Apple** (מגיע מהקובץ `App.entitlements`) ו-**In-App Purchase** (להוסיף).
- [ ] Product, Archive, ואז Distribute App ל-App Store Connect.
- [ ] לבדוק ב-TestFlight לפני ההגשה: כניסה עם גוגל, עם Apple ועם אימייל, רכישת מנוי
      ב-Sandbox, שחזור רכישות, ופתיחה במצב טיסה (אמור להופיע מסך האופליין).
- אין Mac? אפשר לבנות בענן עם Codemagic או Ionic Appflow.

## שלב 8: חשבון לבודקים

- [ ] לצור משתמש קבוע עם אימייל וסיסמה, לדוגמה `review@...`, עם כמה רשימות ומוצרים,
      וקבוצה אחת משותפת, כדי שהבודק יראה את האפליקציה בפעולה.
- [ ] לא לתת לחשבון הזה Pro קבוע: הבודקים של אפל צריכים לראות ולבדוק את מסך הרכישה.

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
• עובדת גם בקליטה חלשה: השינויים נשמרים ומסונכרנים כשהחיבור חוזר
• תובנות על הרגלי הקנייה וההוצאות שלך

Smart Basket Pro פותח את כל האפשרויות בלי הגבלה: רשימות וקבוצות בלי הגבלה,
עוזר AI והשוואות מחירים בלי מכסה יומית. המנוי מתחדש אוטומטית וניתן לביטול
בכל עת בהגדרות החשבון בחנות.

תנאי שימוש: https://smart-basket.vercel.app/terms
מדיניות פרטיות: https://smart-basket.vercel.app/privacy
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
• Works on a weak connection: changes are saved and synced when you are back online
• Insights into your shopping habits and spending

Smart Basket Pro unlocks everything: unlimited lists and groups, and unlimited
AI assistant and price comparisons. The subscription renews automatically and
can be cancelled anytime in your store account settings.

Terms of Use: https://smart-basket.vercel.app/terms
Privacy Policy: https://smart-basket.vercel.app/privacy
```

### מילות מפתח (App Store, עד 100 תווים)
```
רשימת קניות,קניות,סופר,רשימה משותפת,מכולת,השוואת מחירים,shopping list,grocery
```

### פרטים נוספים
- קטגוריה: **Shopping** (משנית: Productivity)
- כתובת תמיכה ו-Marketing URL: `https://smart-basket.vercel.app`
- מדיניות פרטיות: `https://smart-basket.vercel.app/privacy`
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
Purchase (Settings > Manage subscription). Sign in with Apple and Google are
available on the login screen. Account deletion: Settings > Delete Account.
Location is optional and used only to show nearby store branches for price
comparison. Camera is used to scan barcodes and photos of shopping lists.
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

- **התראות נייטיב** (Firebase Cloud Messaging ו-APNs): היום התראות Push עובדות
  באתר ובאפליקציה שהותקנה ממנו, אבל לא באפליקציה מהחנות. בינתיים הן מוסתרות שם.
- **ביטול אסימון Apple במחיקת חשבון**: אפל ממליצה לבטל את הרשאת Sign in with Apple
  דרך ה-REST API שלה כשמשתמש מוחק חשבון. דורש מפתח `.p8` מפורטל המפתחים.
