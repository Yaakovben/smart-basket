import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectStoresToPrice, type StoreCandidate } from '../storeSelection';

// ערים בישראל (קירוב): תל אביב, ירושלים, חיפה, באר שבע, אילת
const TLV = { lat: 32.08, lng: 34.78 };
const TLV2 = { lat: 32.09, lng: 34.79 }; // קרוב מאוד לתל אביב
const JLM = { lat: 31.77, lng: 35.21 };
const HFA = { lat: 32.79, lng: 34.99 };
const BSV = { lat: 31.25, lng: 34.79 };
const EIL = { lat: 29.55, lng: 34.95 };

const c = (storeId: string, pos?: { lat: number; lng: number }): StoreCandidate => ({ storeId, ...pos });

test('לא בוחרים יותר מהתקרה', () => {
  const list = Array.from({ length: 30 }, (_, i) => c(String(i), { lat: 31 + i / 30, lng: 34.5 + i / 60 }));
  assert.equal(selectStoresToPrice(list, new Set(), 12).length, 12);
});

test('מעדיפים פיזור גיאוגרפי: לא בוחרים שני סניפים באותה עיר כשיש עיר רחוקה', () => {
  const list = [c('tlv1', TLV), c('tlv2', TLV2), c('eil', EIL), c('hfa', HFA)];
  const picked = selectStoresToPrice(list, new Set(), 3);
  assert.equal(picked.length, 3);
  assert.ok(picked.includes('eil'));
  assert.ok(picked.includes('hfa'));
  // רק אחד משני סניפי תל אביב
  assert.equal(picked.filter(id => id.startsWith('tlv')).length, 1);
});

test('סניפים שכבר מתומחרים נשמרים (יציבות) גם כשהם לא הפיזור האופטימלי', () => {
  const list = [c('tlv1', TLV), c('tlv2', TLV2), c('jlm', JLM), c('bsv', BSV)];
  const picked = selectStoresToPrice(list, new Set(['tlv2']), 2);
  assert.ok(picked.includes('tlv2'));
  assert.equal(picked.length, 2);
});

test('מזהים שונים באפסים מובילים נחשבים אותו סניף', () => {
  const picked = selectStoresToPrice([c('012', TLV), c('12', TLV), c('7', JLM)], new Set(), 5);
  assert.equal(picked.length, 2);
});

test('סניפים בלי קואורדינטות נכנסים רק אחרי אלה עם קואורדינטות', () => {
  const picked = selectStoresToPrice([c('nocoords'), c('a', TLV), c('b', JLM)], new Set(), 2);
  assert.deepEqual(new Set(picked), new Set(['a', 'b']));
});

test('כשיש מקום, גם סניפים בלי קואורדינטות נכללים', () => {
  const picked = selectStoresToPrice([c('nocoords'), c('a', TLV)], new Set(), 5);
  assert.equal(picked.length, 2);
});

test('רשימה ריקה מחזירה ריק', () => {
  assert.deepEqual(selectStoresToPrice([], new Set(), 12), []);
});
