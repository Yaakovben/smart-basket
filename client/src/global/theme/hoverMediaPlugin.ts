import type { Element, Middleware } from 'stylis';

// בטלפון אין עכבר, אבל הדפדפן מפעיל :hover בנגיעה ומשאיר אותו "תקוע" עד
// הנגיעה הבאה במקום אחר: כפתור נשאר מודגש או בהיר אחרי שכבר לחצו עליו.
// התוסף עוטף כל כלל שיש בו :hover ב-@media (hover: hover), כך שאפקטי מעבר
// העכבר פועלים רק במכשיר עם עכבר, בכל האפליקציה בבת אחת (כולל ה-theme של
// MUI וכל ה-sx), בלי לגעת בכל רכיב. המשוב בנגיעה מגיע מ-:active.
const WRAPPED = Symbol('hoverMediaWrapped');

type MarkedElement = Element & { [WRAPPED]?: true };

export const hoverMediaPlugin: Middleware = (element) => {
  const el = element as MarkedElement;
  if (el.type !== 'rule' || el[WRAPPED]) return;
  const selectors = Array.isArray(el.props) ? el.props : [el.props];
  if (!selectors.some((s) => s.includes(':hover'))) return;

  // העתק של הכלל בתוך מעטפת מדיה. ההעתק מסומן כדי שלא ייעטף שוב כשהוא עובר
  // בתוספים פעם נוספת, ו-root שלו מוגדר כדי שלא יוכנס לגיליון בנפרד.
  const inner = { ...el, [WRAPPED]: true, parent: el, root: el } as MarkedElement;
  el.type = '@media';
  el.value = '@media (hover: hover)';
  el.props = ['(hover: hover)'];
  el.children = [inner];
};
