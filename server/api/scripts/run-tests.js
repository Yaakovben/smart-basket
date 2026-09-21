// מריץ את בדיקות ה-node:test שהודרו ל-dist. אוסף את הקבצים בעצמו במקום להשתמש
// בתבנית glob של `node --test`, כי glob נתמך רק מ-Node 21 ו-CI רץ על Node 20,
// ובגרסאות חדשות (25) ארגומנט של תיקייה כבר לא מתקבל.
const { readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

function collect(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return collect(full);
    return name.endsWith('.test.js') ? [full] : [];
  });
}

const files = collect(join(__dirname, '..', 'dist'));
if (files.length === 0) {
  console.error('לא נמצאו קבצי בדיקה ב-dist. הרץ קודם npm run build.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
