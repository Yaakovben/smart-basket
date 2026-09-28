import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'zlib';
import { parsePromoXml, parsePromoBuffer, parseIsraelDateTime } from '../promoXmlParser';

// מבנה קבוצות, מקוצר מקובץ אמיתי של רמי לוי (PromoFull7290058140886-001-737)
const GROUPED = `<Root>
  <ChainID>7290058140886</ChainID><SubChainID>001</SubChainID><StoreID>737</StoreID>
  <Promotions>
    <Promotion>
      <PromotionUpdateTime>2026-09-22T00:00:00.000</PromotionUpdateTime>
      <PromotionID>0001407564</PromotionID>
      <PromotionDescription>פחמים 2 ק ג רמי לוי ב9.90</PromotionDescription>
      <PromotionStartDateTime>2026-04-23T00:00:00.000</PromotionStartDateTime>
      <PromotionEndDateTime>2026-12-31T23:59:00.000</PromotionEndDateTime>
      <ClubID>0 - כלל הלקוחות</ClubID>
      <AdditionalIsCoupon>0</AdditionalIsCoupon>
      <Groups><Group><GroupID>1</GroupID><MinPurchaseAmount>0.00</MinPurchaseAmount>
        <PromotionItems>
          <PromotionItem><ItemCode>7290012853999</ItemCode><MinQty>1</MinQty><DiscountedPrice>9.90</DiscountedPrice><bIsWeighted>0</bIsWeighted></PromotionItem>
          <PromotionItem><ItemCode></ItemCode><MinQty>1</MinQty><DiscountedPrice>9.90</DiscountedPrice></PromotionItem>
        </PromotionItems>
      </Group></Groups>
    </Promotion>
    <Promotion>
      <PromotionID>110211</PromotionID>
      <PromotionDescription>הנחה DM 10%</PromotionDescription>
      <ClubID>1 - המועדון החדש</ClubID>
      <AdditionalIsCoupon>1</AdditionalIsCoupon>
      <Groups><Group><PromotionItems><PromotionItem><ItemCode>7290001829455</ItemCode><MinQty>1</MinQty><DiscountedPrice></DiscountedPrice></PromotionItem></PromotionItems></Group></Groups>
    </Promotion>
  </Promotions>
</Root>`;

// מבנה שטוח, מקובץ אמיתי של קשת טעמים (PromoFull7290785400000-001-318)
const FLAT = `<Root>
  <XmlDocVersion>19</XmlDocVersion><ChainId>7290785400000</ChainId><SubChainId>1</SubChainId><StoreId>318</StoreId>
  <Promotions Count="1">
    <Promotion>
      <PromotionId>1153376</PromotionId>
      <PromotionDescription>רום בקרדי לבן 750 מל ב 89.90</PromotionDescription>
      <PromotionUpdateDate>2026-08-04 00:00</PromotionUpdateDate>
      <PromotionStartDate>2026-08-16</PromotionStartDate><PromotionStartHour>00:00:00</PromotionStartHour>
      <PromotionEndDate>2026-10-31</PromotionEndDate><PromotionEndHour>23:59:00</PromotionEndHour>
      <AdditionalRestrictions><AdditionalIsCoupon>0</AdditionalIsCoupon></AdditionalRestrictions>
      <MinQty>1.00</MinQty><DiscountedPrice>89.90</DiscountedPrice>
      <PromotionItems>
        <Item><ItemCode>7290005020346</ItemCode><ItemType>1</ItemType><IsGiftItem>0</IsGiftItem></Item>
      </PromotionItems>
      <Clubs><ClubId>0</ClubId></Clubs>
    </Promotion>
  </Promotions>
</Root>`;

test('מבנה קבוצות: מזהה סניף, פרטי מבצע ופריטים', () => {
  const f = parsePromoXml(GROUPED);
  assert.equal(f.chainCode, '7290058140886');
  assert.equal(f.storeId, '737');
  assert.equal(f.promotions.length, 2);
  const p = f.promotions[0];
  assert.equal(p.promotionId, '0001407564');
  assert.deepEqual(p.clubIds, [0]);
  assert.equal(p.isCoupon, false);
  assert.equal(p.groups.length, 1);
  assert.equal(p.groups[0].items.length, 1);
  assert.equal(p.groups[0].items[0].barcode, '7290012853999');
  assert.equal(p.groups[0].items[0].discountedPrice, 9.9);
  assert.equal(p.groups[0].items[0].minQty, 1);
});

test('פריט בלי ברקוד לא נזרק בשקט: נספר', () => {
  assert.equal(parsePromoXml(GROUPED).itemsWithoutBarcode, 1);
});

test('מועדון וקופון מזוהים', () => {
  const p = parsePromoXml(GROUPED).promotions[1];
  assert.deepEqual(p.clubIds, [1]);
  assert.equal(p.isCoupon, true);
  assert.equal(p.groups[0].items[0].discountedPrice, undefined);
});

test('מבנה שטוח: מחיר וכמות ברמת המבצע חלים על הפריטים', () => {
  const f = parsePromoXml(FLAT);
  assert.equal(f.chainCode, '7290785400000');
  assert.equal(f.storeId, '318');
  const p = f.promotions[0];
  assert.equal(p.promotionId, '1153376');
  assert.deepEqual(p.clubIds, [0]);
  assert.equal(p.isCoupon, false);
  assert.equal(p.groups.length, 1);
  assert.deepEqual(p.groups[0].items[0], {
    barcode: '7290005020346', minQty: 1, discountedPrice: 89.9, discountRate: undefined, isWeighted: undefined, isGift: false,
  });
  // 2026-10-31 23:59 שעון ישראל (חורף, UTC+2)
  assert.equal(p.endDate?.toISOString(), '2026-10-31T21:59:00.000Z');
});

test('קובץ דחוס ב-gzip מפוענח', () => {
  const f = parsePromoBuffer(gzipSync(Buffer.from(FLAT, 'utf-8')));
  assert.equal(f.promotions.length, 1);
});

test('קובץ בלי מבצעים (סופר ספיר מפרסמת כאלה) מחזיר רשימה ריקה', () => {
  const f = parsePromoXml('<Root><ChainID>7290058156016</ChainID><StoreID>399</StoreID><Promotions></Promotions></Root>');
  assert.equal(f.storeId, '399');
  assert.equal(f.promotions.length, 0);
});

test('תאריכים בשעון ישראל: קיץ UTC+3, חורף UTC+2', () => {
  assert.equal(parseIsraelDateTime('2026-07-01T12:00:00.000')?.toISOString(), '2026-07-01T09:00:00.000Z');
  assert.equal(parseIsraelDateTime('2026-12-01', '12:00:00')?.toISOString(), '2026-12-01T10:00:00.000Z');
  assert.equal(parseIsraelDateTime('not a date'), undefined);
  assert.equal(parseIsraelDateTime(undefined), undefined);
});
