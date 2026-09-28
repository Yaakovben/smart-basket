import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStoresXml } from '../portalXmlParser';
import { spreadAcrossSubChains } from '../shufersal.adapter';

// מבנה קובץ הסניפים של שופרסל: שורש <Chain>, ותת-הרשת ברמת SubChain (ערכים לדוגמה)
const SHUFERSAL = '﻿<?xml version="1.0" encoding="UTF-8"?><Chain><ChainID>7290027600007</ChainID><SubChains>'
  + '<SubChain><SubChainID>1</SubChainID><SubChainName>שופרסל שלי</SubChainName><Stores>'
  + '<Store><StoreID>10</StoreID><StoreName>סניף א</StoreName><City>2530</City></Store>'
  + '<Store><StoreID>11</StoreID><StoreName>סניף ב</StoreName></Store></Stores></SubChain>'
  + '<SubChain><SubChainID>6</SubChainID><SubChainName>יש חסד</SubChainName><Stores>'
  + '<Store><StoreID>62</StoreID><StoreName>סניף ג</StoreName></Store></Stores></SubChain>'
  + '</SubChains></Chain>';

test('קובץ סניפים עם שורש Chain נקרא, ותת-הרשת עוברת מההורה לסניפים', () => {
  const stores = parseStoresXml(Buffer.from(SHUFERSAL, 'utf-8'), 'Stores.xml');
  assert.equal(stores.length, 3);
  assert.deepEqual(stores.map(s => [s.storeId, s.subChainId, s.subChainName]), [
    ['10', '1', 'שופרסל שלי'],
    ['11', '1', 'שופרסל שלי'],
    ['62', '6', 'יש חסד'],
  ]);
});

test('תת-רשת שמופיעה בסניף עצמו גוברת על ההורה', () => {
  const xml = '<Root><SubChains><SubChain><SubChainName>הורה</SubChainName><Stores>'
    + '<Store><StoreID>1</StoreID><StoreName>א</StoreName><SubChainName>סניף</SubChainName></Store>'
    + '</Stores></SubChain></SubChains></Root>';
  assert.equal(parseStoresXml(Buffer.from(xml), 'x')[0].subChainName, 'סניף');
});

test('בחירת סניפים לסירוגין בין תתי-רשתות, עד התקרה', () => {
  const f = (subChainId: string, storeId: string) => ({ subChainId, storeId });
  const files = [f('1', '1'), f('1', '2'), f('1', '3'), f('1', '4'), f('6', '62'), f('6', '73'), f('9', '900')];
  assert.deepEqual(spreadAcrossSubChains(files, 5).map(x => x.storeId), ['1', '62', '900', '2', '73']);
  assert.equal(spreadAcrossSubChains(files, 100).length, 7);
});
