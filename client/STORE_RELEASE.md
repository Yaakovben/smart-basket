# העלאה ל-App Store ול-Google Play

האפליקציה הנייטיב (Capacitor) טוענת את האתר החי `https://smart-basket.vercel.app`
(ראו `capacitor.config.ts`). לכן כל שינוי באתר מגיע לאפליקציה בלי גרסה חדשה בחנות.
גרסה חדשה בחנות נדרשת רק כשמשנים פלאגינים נייטיב, אייקונים או הרשאות.

## איך עובד התשלום

| איפה | איך משלמים |
|---|---|
| אתר / PWA | כמו היום: ביט, PayBox, העברה, אישור אדמין |
| אפליקציית iOS | In App Purchase של אפל, מנוי מתחדש |
| אפליקציית Android | Google Play Billing, מנוי מתחדש |

באפליקציות, RevenueCat מנהל את הרכישה מול החנויות. השרת מקבל webhook ומעדכן את המנוי.
מסלול התשלום הידני מוסתר באפליקציות, כי החנויות אוסרות להפנות לתשלום חיצוני.

## צעדים חד פעמיים

### 1. חשבונות מפתח
- Apple Developer Program (99$ לשנה)
- Google Play Console (25$ חד פעמי)

### 2. מוצרי מנוי בחנויות
באותו מזהה בשתי החנויות, למשל `smartbasket_pro_monthly` ו־`smartbasket_pro_yearly`.
- App Store Connect: Subscriptions, קבוצת מנוי אחת עם שני המוצרים. צריך גם לחתום על Paid Apps Agreement.
- Play Console: Monetize, Subscriptions, עם base plan חודשי ושנתי.

### 3. RevenueCat (חינמי עד 2,500$ הכנסה חודשית)
1. יוצרים פרויקט ומחברים אפליקציית iOS ואפליקציית Android (`com.smartbasket.app`).
2. יוצרים Entitlement בשם `pro` ומשייכים אליו את כל המוצרים.
3. יוצרים Offering בשם `default` עם חבילות Monthly ו־Annual.
4. Integrations, Webhooks: כתובת `https://smart-basket-api-prod.onrender.com/api/store-billing/webhook`,
   וב־Authorization header ערך אקראי ארוך.

### 4. משתני סביבה
שרת (Render):
- `REVENUECAT_SECRET_KEY` המפתח הסודי `sk_...`
- `REVENUECAT_WEBHOOK_AUTH` אותו ערך שהוגדר ב-webhook

לקוח (Vercel):
- `VITE_REVENUECAT_IOS_KEY` המפתח הציבורי `appl_...`
- `VITE_REVENUECAT_ANDROID_KEY` המפתח הציבורי `goog_...`
- `VITE_GOOGLE_IOS_CLIENT_ID` client ID מסוג iOS מ-Google Cloud Console

### 5. התחברות Google באפליקציה
- Google Cloud Console: יוצרים OAuth client מסוג Android עם package `com.smartbasket.app`
  וטביעת SHA-1 של מפתח החתימה (וגם של Play App Signing).
- יוצרים OAuth client מסוג iOS עם Bundle ID `com.smartbasket.app`.
- ב-Xcode מוסיפים URL Scheme עם ה-iOS client ID ההפוך (`com.googleusercontent.apps.XXXX`).

### 6. חתימת Android
```
keytool -genkey -v -keystore android/app/release.jks -alias smartbasket -keyalg RSA -keysize 2048 -validity 10000
```
ויוצרים את `android/keystore.properties` (לא נכנס ל-git):
```
storeFile=release.jks
storePassword=...
keyAlias=smartbasket
keyPassword=...
```
לשמור את קובץ המפתח והסיסמאות במקום בטוח. בלעדיהם אי אפשר לעדכן את האפליקציה.

## בנייה
- Android: `npm run cap:android` ואז ב-Android Studio: Build, Generate Signed Bundle (AAB).
- iOS (דורש Mac): `npm run cap:ios`, ב-Xcode מוסיפים את היכולת In-App Purchase, ואז Product, Archive.

## לפני שליחה לסקירה
- מדיניות פרטיות: `https://smart-basket.vercel.app/privacy`
- מחיקת חשבון מתוך האפליקציה: קיימת (הגדרות)
- חשבון בדיקה לסוקרים של אפל וגוגל, עם אימייל וסיסמה
- צילומי מסך ותיאור בעברית ובאנגלית
