import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseXmlBuffer } from '../portalXmlParser';

// מבנה פריט בקובץ PriceFull רשמי (חצי חינם, מחסני השוק): השדות נקראים ManufactureName
// ו-ManufactureItemDescription (בלי r), ותאריך העדכון PriceUpdateTime. ערכי הפריט לדוגמה.
const XML = `<Root><ChainID>7290700100008</ChainID><StoreID>219</StoreID><Items><Item>
  <PriceUpdateTime>2026-02-10T16:02:32.000</PriceUpdateTime>
  <ItemCode>7290000000017</ItemCode><ItemType>1</ItemType><ItemName>מוצר בדיקה</ItemName>
  <ManufactureName>יצרן בדיקה</ManufactureName><ManufactureCountry>IL</ManufactureCountry>
  <ManufactureItemDescription>תיאור יצרן</ManufactureItemDescription>
  <UnitQty>גרם</UnitQty><Quantity>400</Quantity><UnitOfMeasure>100גרם</UnitOfMeasure>
  <bIsWeighted>0</bIsWeighted><QtyInPackage>1</QtyInPackage><ItemPrice>18.90</ItemPrice>
  <UnitOfMeasurePrice>4.73</UnitOfMeasurePrice><AllowDiscount>1</AllowDiscount><ItemStatus>1</ItemStatus>
</Item></Items></Root>`;

test('שדות היצרן ותאריך העדכון בשמות הרשמיים נקראים', () => {
  const [item] = parseXmlBuffer(Buffer.from(XML), 'PriceFull7290700100008-000-219-20260928-135600.xml');
  assert.equal(item.manufacturerName, 'יצרן בדיקה');
  assert.equal(item.manufacturerItemDescription, 'תיאור יצרן');
  assert.equal(item.itemPriceUpdateDate, '2026-02-10T16:02:32.000');
  assert.equal(item.manufactureCountry, 'IL');
  assert.equal(item.storeId, '219');
  assert.equal(item.price, 18.9);
  assert.equal(item.unitOfMeasurePrice, 4.73);
  assert.equal(item.quantity, 400);
});
