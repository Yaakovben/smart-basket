# הגדרת שליחת מייל (Gmail API על HTTPS)

שליחת המייל עוברת דרך **Gmail API על HTTPS** (פורט 443), לא SMTP.
Render חוסם/מגביל פורטי SMTP, אבל את פורט 443 אף אחד לא חוסם. המייל נשלח
מהחשבון האמיתי של Google, אז SPF/DKIM/DMARC עוברים והמייל מגיע ל‑Inbox —
בלי דומיין משלך ובלי תשלום.

צריך 4 משתני סביבה בשרת:

```
GMAIL_USER=smartbasket129@gmail.com
GMAIL_CLIENT_ID=<מ-Google Cloud>
GMAIL_CLIENT_SECRET=<מ-Google Cloud>
GMAIL_REFRESH_TOKEN=<מהסקריפט למטה>
```

אם אחד מהם חסר — שליחת המייל היא no‑op שקט (הכפתור בפאנל האדמין יראה
"שירות המייל לא מוגדר").

---

## שלב 1 — פרויקט ב-Google Cloud + הפעלת Gmail API

1. היכנס ל‑https://console.cloud.google.com עם חשבון ה‑Gmail השולח
   (`smartbasket129@gmail.com`).
2. למעלה, ליד הלוגו → **Select a project** → **New Project** → שם: `smart-basket-mail` → **Create**.
3. חיפוש למעלה: **Gmail API** → פתח → **Enable**.

## שלב 2 — OAuth consent screen

1. תפריט צד → **APIs & Services** → **OAuth consent screen**.
2. User Type: **External** → **Create**.
3. App name: `Smart Basket`, User support email: המייל שלך, Developer contact: המייל שלך → **Save and Continue**.
4. **Scopes** → **Save and Continue** (לא צריך להוסיף כלום כאן).
5. **Test users** → **Add users** → הוסף את `smartbasket129@gmail.com` → **Save and Continue**.
6. אפשר להשאיר את האפליקציה במצב **Testing** — refresh token של test user תקף ל‑6 חודשים ומתחדש אוטומטית כל עוד משתמשים בו. (אם רוצים "לנצח" — **Publish App**, לא חובה.)

## שלב 3 — OAuth Client ID

1. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**.
2. Application type: **Desktop app** → Name: `smart-basket-server` → **Create**.
3. תקבל **Client ID** ו‑**Client secret** — שמור אותם.

## שלב 4 — קבלת ה-Refresh Token (הרצה מקומית, פעם אחת)

על המחשב שלך (לא על Render):

```bash
cd server/api
npm install            # אם עוד לא
GMAIL_CLIENT_ID=<...> GMAIL_CLIENT_SECRET=<...> npm run get-gmail-token
```

(ב-Windows PowerShell:)
```powershell
$env:GMAIL_CLIENT_ID="..."; $env:GMAIL_CLIENT_SECRET="..."; npm run get-gmail-token
```

- ייפתח דפדפן → התחבר עם `smartbasket129@gmail.com` → **Allow**.
- אם Google מציג "Google hasn't verified this app" → **Advanced** → **Go to Smart Basket (unsafe)** → **Allow**. (זה בסדר, זו האפליקציה שלך במצב Testing.)
- הטרמינל ידפיס `GMAIL_REFRESH_TOKEN: ...` — העתק אותו.

## שלב 5 — env בשרת (Render)

Render Dashboard → השירות של ה‑API → **Environment**:

| מחק | הוסף |
|---|---|
| `GMAIL_APP_PASSWORD` (אם קיים) | `GMAIL_USER` = `smartbasket129@gmail.com` |
| `BREVO_API_KEY` (אם קיים) | `GMAIL_CLIENT_ID` = מ‑שלב 3 |
| | `GMAIL_CLIENT_SECRET` = מ‑שלב 3 |
| | `GMAIL_REFRESH_TOKEN` = מ‑שלב 4 |

**Save** → Render יעשה redeploy אוטומטית.

## שלב 6 — בדיקה

פאנל אדמין → שליחת מייל → מצב **ספציפי** → בחר את עצמך → שלח.
אמור להגיע ל‑Inbox תוך שניות. אם נכשל — ההודעה במסך תגיד למה בדיוק
(טוקן שגוי / scope חסר / מכסה).

---

## מגבלות
- חשבון Gmail רגיל: **~500 נמענים ליום**. broadcast מוגבל ל‑300 בשליחה אחת.
- אם תגדל מעבר לזה — Google Workspace (~2,000/יום) או ספק ייעודי עם דומיין.

## פתרון תקלות
| שגיאה במסך | פתרון |
|---|---|
| `רענון טוקן Gmail נכשל (invalid_grant)` | ה‑refresh token בוטל/פג. הרץ שוב את שלב 4. אם עדיין — בטל גישה ב‑https://myaccount.google.com/permissions והרץ שוב. |
| `Gmail API 403 ... insufficient ... scope` | ה‑scope לא `gmail.send`. הרץ שוב את שלב 4. |
| `Gmail API 429` | חרגת מהמכסה היומית. חכה לחצות (שעון פסיפיק). |
| הכפתור אומר "לא מוגדר" | אחד מ‑4 המשתנים חסר ב‑env. |
