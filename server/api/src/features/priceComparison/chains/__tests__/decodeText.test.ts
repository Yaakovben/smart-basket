import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'zlib';
import { decodeText, decompressBuffer, parseStoresXml } from '../portalXmlParser';

// מבנה קובץ הסניפים של רמי לוי, שמגיע ב-UTF-16LE עם BOM (ערכי הסניף לדוגמה בלבד)
const STORES = '<Root><ChainID>7290058140886</ChainID><SubChains><SubChain><SubChainID>001</SubChainID><Stores>'
  + '<Store><StoreID>001</StoreID><StoreName>סניף בדיקה</StoreName><Address>רחוב 1</Address><City>3000</City></Store>'
  + '</Stores></SubChain></SubChains></Root>';

const utf16le = (s: string) => Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(s, 'utf16le')]);

test('UTF-16LE עם BOM מפוענח נכון', () => {
  assert.equal(decodeText(utf16le('שלום <a/>')), 'שלום <a/>');
});

test('UTF-16BE עם BOM מפוענח נכון', () => {
  const be = Buffer.from('שלום', 'utf16le');
  be.swap16();
  assert.equal(decodeText(Buffer.concat([Buffer.from([0xfe, 0xff]), be])), 'שלום');
});

test('BOM של UTF-8 מוסר, ובלי BOM קוראים כ-UTF-8', () => {
  assert.equal(decodeText(Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from('<Root/>')])), '<Root/>');
  assert.equal(decodeText(Buffer.from('חלב')), 'חלב');
});

test('קובץ סניפים ב-UTF-16LE, גם דחוס, נקרא עם השמות בעברית', () => {
  for (const buf of [utf16le(STORES), gzipSync(utf16le(STORES))]) {
    assert.equal(decompressBuffer(buf), STORES);
    const stores = parseStoresXml(buf, 'Stores7290058140886-000-20260928-050500.xml');
    assert.equal(stores.length, 1);
    assert.equal(stores[0].storeName, 'סניף בדיקה');
  }
});
