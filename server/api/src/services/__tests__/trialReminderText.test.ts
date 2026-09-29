import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysLeft, reminderTitle } from '../trialReminderText';

test('תזכורת סיום Pro במתנה: ימים שנותרו מעוגלים למעלה', () => {
  const now = new Date('2026-10-01T10:00:00Z');
  const h = (hours: number) => new Date(now.getTime() + hours * 3600e3);
  assert.equal(daysLeft(h(20), now), 1);
  assert.equal(daysLeft(h(30), now), 2);
  assert.equal(daysLeft(h(72), now), 3);
  assert.equal(daysLeft(h(-5), now), 1);
});

test('תזכורת סיום Pro במתנה: ניסוח לפי מספר הימים', () => {
  assert.equal(reminderTitle(1), '⏳ ה-Pro במתנה מסתיים מחר');
  assert.equal(reminderTitle(2), '⏳ ה-Pro במתנה מסתיים בעוד יומיים');
  assert.equal(reminderTitle(3), '⏳ ה-Pro במתנה מסתיים בעוד 3 ימים');
});
