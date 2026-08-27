/**
 * get-gmail-token.ts
 *
 * הרצה חד-פעמית (מקומית, על המחשב שלך) כדי לקבל GMAIL_REFRESH_TOKEN
 * לשליחת מייל דרך Gmail API. ראה EMAIL_SETUP.md.
 *
 * הרצה:
 *   cd server/api
 *   GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=yyy npx ts-node-dev --transpile-only src/scripts/get-gmail-token.ts
 *
 * הסקריפט יפתח דפדפן (או ידפיס קישור), תאשר עם חשבון ה-Gmail השולח,
 * והוא ידפיס את ה-refresh token. שים אותו ב-env של השרת.
 */

import http from 'http';
import { exec } from 'child_process';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const PORT = 53682; // פורט מקומי שרירותי לקליטת ה-redirect
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPE = 'https://www.googleapis.com/auth/gmail.send';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ חסר GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET ב-env.\n');
  console.error('דוגמה:');
  console.error('  GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... npx ts-node-dev --transpile-only src/scripts/get-gmail-token.ts\n');
  process.exit(1);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent', // כופה החזרת refresh_token גם אם כבר אישרת בעבר
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '', REDIRECT_URI);
  const code = url.searchParams.get('code');
  const err = url.searchParams.get('error');

  if (err) {
    res.end(`Auth failed: ${err}. אפשר לסגור את החלון.`);
    console.error(`\n❌ האישור נכשל: ${err}\n`);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.end('אין code. אפשר לסגור את החלון.');
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const data = (await tokenRes.json()) as { refresh_token?: string; error?: string; error_description?: string };

    if (!data.refresh_token) {
      res.end('לא התקבל refresh_token. בדוק את הטרמינל.');
      console.error('\n❌ לא התקבל refresh_token:', data.error_description || data.error || data);
      console.error('טיפ: אם כבר אישרת בעבר, בטל את הגישה ב-https://myaccount.google.com/permissions ונסה שוב.\n');
      server.close();
      process.exit(1);
    }

    res.end('✅ הצלחה! אפשר לסגור את החלון ולחזור לטרמינל.');
    console.log('\n✅ GMAIL_REFRESH_TOKEN:\n');
    console.log(data.refresh_token);
    console.log('\nשים את זה ב-env של השרת (ביחד עם GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET).\n');
    server.close();
    process.exit(0);
  } catch (e) {
    res.end('שגיאה בהחלפת ה-code. בדוק את הטרמינל.');
    console.error('\n❌ שגיאה:', (e as Error).message, '\n');
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log('\n🔗 פותח דפדפן לאישור. אם לא נפתח, פתח ידנית:\n');
  console.log(authUrl + '\n');
  const open =
    process.platform === 'darwin' ? 'open' :
    process.platform === 'win32' ? 'start ""' :
    'xdg-open';
  exec(`${open} "${authUrl}"`, () => { /* אם נכשל - המשתמש יפתח ידנית */ });
});
