import type { Language } from '../../global/types';

// טקסטים של עמוד "סרוק ובדוק איפה הכי זול". מילון מקומי לפיצ'ר, שלוש השפות
// חייבות להכיל אותם מפתחות (נאכף בטיפוס).
const he = {
  title: 'איפה הכי זול?',
  back: 'חזרה',
  idleTitle: 'סרקו ברקוד של מוצר',
  idleBody: 'נראה לכם באיזה סניף קרוב הוא הכי זול, ואיפה הכי זול בכל הארץ.',
  scan: 'סריקת מוצר',
  scanAnother: 'סריקת מוצר נוסף',
  nearbyTitle: 'הכי זול קרוב אליך',
  locationPrompt: 'אפשרו מיקום כדי לראות את הסניפים הזולים בסביבה שלכם.',
  locationBlocked: 'הגישה למיקום חסומה. אפשר לאשר אותה בהגדרות הדפדפן או המכשיר.',
  enableLocation: 'הצגת סניפים קרובים',
  noneNearby: (km: number) => `לא מצאנו את המוצר בסניפים בטווח ${km} ק"מ ממך.`,
  km: (d: number) => `${d} ק"מ`,
  chainPrice: 'מחיר ברשת',
  showMore: (n: number) => `עוד ${n} סניפים`,
  showLess: 'הצג פחות',
  cheapestTitle: 'הכי זול בכל הארץ',
  chainsTitle: 'מחיר בכל רשת',
  chainsNote: 'המחיר שרוב סניפי הרשת גובים.',
  disclaimer: 'מחירי מדף שהרשתות מפרסמות. מבצעים ומחירי מועדון לא נכללים.',
  notFoundTitle: 'המוצר לא נמצא',
  notFoundBody: 'אין לנו מחירים לברקוד הזה ברשתות שאנחנו עוקבים אחריהן.',
  error: 'לא הצלחנו לבדוק את המחירים',
  retry: 'נסו שוב',
};

type PriceScanStrings = typeof he;

const en: PriceScanStrings = {
  title: 'Where is it cheapest?',
  back: 'Back',
  idleTitle: 'Scan a product barcode',
  idleBody: 'We will show you the cheapest store near you, and the cheapest price in the country.',
  scan: 'Scan product',
  scanAnother: 'Scan another product',
  nearbyTitle: 'Cheapest near you',
  locationPrompt: 'Allow location to see the cheapest stores around you.',
  locationBlocked: 'Location access is blocked. You can allow it in your browser or device settings.',
  enableLocation: 'Show nearby stores',
  noneNearby: (km: number) => `We did not find this product in stores within ${km} km of you.`,
  km: (d: number) => `${d} km`,
  chainPrice: 'Chain price',
  showMore: (n: number) => `${n} more stores`,
  showLess: 'Show less',
  cheapestTitle: 'Cheapest in the country',
  chainsTitle: 'Price per chain',
  chainsNote: 'The price most stores of the chain charge.',
  disclaimer: 'Shelf prices published by the chains. Promotions and club prices are not included.',
  notFoundTitle: 'Product not found',
  notFoundBody: 'We have no prices for this barcode in the chains we track.',
  error: 'Could not check prices',
  retry: 'Try again',
};

const ru: PriceScanStrings = {
  title: 'Где дешевле всего?',
  back: 'Назад',
  idleTitle: 'Отсканируйте штрихкод товара',
  idleBody: 'Покажем, в каком магазине рядом он дешевле всего, и самую низкую цену по стране.',
  scan: 'Сканировать товар',
  scanAnother: 'Сканировать ещё товар',
  nearbyTitle: 'Дешевле всего рядом с вами',
  locationPrompt: 'Разрешите геолокацию, чтобы увидеть самые дешёвые магазины поблизости.',
  locationBlocked: 'Доступ к геолокации заблокирован. Его можно разрешить в настройках браузера или устройства.',
  enableLocation: 'Показать магазины рядом',
  noneNearby: (km: number) => `Мы не нашли этот товар в магазинах в радиусе ${km} км от вас.`,
  km: (d: number) => `${d} км`,
  chainPrice: 'Цена сети',
  showMore: (n: number) => `Ещё ${n} магазинов`,
  showLess: 'Свернуть',
  cheapestTitle: 'Дешевле всего по стране',
  chainsTitle: 'Цена в каждой сети',
  chainsNote: 'Цена, которую берут большинство магазинов сети.',
  disclaimer: 'Цены на полках, опубликованные сетями. Акции и клубные цены не учитываются.',
  notFoundTitle: 'Товар не найден',
  notFoundBody: 'У нас нет цен на этот штрихкод в отслеживаемых сетях.',
  error: 'Не удалось проверить цены',
  retry: 'Повторить',
};

const DICTS: Record<Language, PriceScanStrings> = { he, en, ru };

export const getPriceScanStrings = (lang: Language): PriceScanStrings => DICTS[lang] ?? he;
