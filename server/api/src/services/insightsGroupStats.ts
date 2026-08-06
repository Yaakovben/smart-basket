import mongoose from 'mongoose';
import { User } from '../models';
import type { InsightsData } from './insights.types';

interface GroupStatsProduct {
  listId: mongoose.Types.ObjectId;
  addedBy: mongoose.Types.ObjectId;
  isPurchased: boolean;
}

// סטטיסטיקות ברמת קבוצה: מי הכי תורם, מי הכי קונה, פירוט חברים.
// מקבל את allProducts שכבר נשלף פעם אחת ב-insights.service.ts (ולא שולף
// מחדש per-list) - כך שאין כאן שאילתת Product כפולה על אותם נתונים.
export async function getGroupStats(
  lists: { _id: any; name: string; icon: string; isGroup: boolean; owner: any; members: { user: any }[] }[],
  userId: string,
  allProducts: GroupStatsProduct[]
): Promise<InsightsData['groupStats']> {
  const groupLists = lists.filter(l => l.isGroup && l.members.length > 0).slice(0, 5);
  if (groupLists.length === 0) return [];

  const groupListIds = new Set(groupLists.map(l => l._id.toString()));
  const relevantProducts = allProducts.filter(p => groupListIds.has(p.listId.toString()));

  // שמות משתמשים לכל התורמים הרלוונטיים - שאילתה בודדת אחת במקום
  // populate נפרד לכל קבוצה (עד 5 שאילתות Product+populate בעבר).
  const addedByIds = Array.from(new Set(relevantProducts.map(p => p.addedBy?.toString()).filter(Boolean)));
  const users = addedByIds.length > 0
    ? await User.find({ _id: { $in: addedByIds } }, 'name').lean()
    : [];
  const nameById = new Map(users.map(u => [u._id.toString(), u.name]));

  const productsByList = new Map<string, GroupStatsProduct[]>();
  for (const p of relevantProducts) {
    const key = p.listId.toString();
    const arr = productsByList.get(key);
    if (arr) arr.push(p);
    else productsByList.set(key, [p]);
  }

  const perListResults = groupLists.map((list): InsightsData['groupStats'][number] | null => {
    const products = productsByList.get(list._id.toString()) || [];
    if (products.length === 0) return null;

    // ספירה לפי משתמש: מי הוסיף ומי קנה. שומר גם userId כדי לזהות את המשתמש הנוכחי.
    const memberStats = new Map<string, { id: string; name: string; added: number; purchased: number }>();

    for (const p of products) {
      const addedById = p.addedBy ? p.addedBy.toString() : '';
      const addedByName = nameById.get(addedById) || 'Unknown';

      if (!memberStats.has(addedById)) {
        memberStats.set(addedById, { id: addedById, name: addedByName, added: 0, purchased: 0 });
      }
      const stat = memberStats.get(addedById)!;
      stat.added++;
      if (p.isPurchased) stat.purchased++;
    }

    const breakdownFull = Array.from(memberStats.values()).sort((a, b) => (b.added + b.purchased) - (a.added + a.purchased));
    const breakdown = breakdownFull.map(({ name, added, purchased }) => ({ name, added, purchased }));
    const topContributor = breakdownFull.length > 0 ? { name: breakdownFull[0].name, count: breakdownFull[0].added } : null;
    const topBuyer = breakdownFull.reduce((best, cur) => cur.purchased > (best?.count || 0) ? { name: cur.name, count: cur.purchased } : best, null as { name: string; count: number } | null);

    // חישוב תרומה של המשתמש הנוכחי לעומת ממוצע החברים האחרים
    const currentUser = breakdownFull.find(m => m.id === userId);
    const others = breakdownFull.filter(m => m.id !== userId);
    let userContribution: InsightsData['groupStats'][0]['userContribution'] = null;
    if (currentUser) {
      const avgAdded = others.length > 0 ? others.reduce((s, m) => s + m.added, 0) / others.length : 0;
      const avgPurchased = others.length > 0 ? others.reduce((s, m) => s + m.purchased, 0) / others.length : 0;
      // pct: 100 = ממוצע, 200 = פי-2 מהממוצע. 0 כשאין אחרים פעילים.
      const vsAvgAddedPct = avgAdded > 0 ? Math.round((currentUser.added / avgAdded) * 100) : (currentUser.added > 0 ? 999 : 0);
      const vsAvgPurchasedPct = avgPurchased > 0 ? Math.round((currentUser.purchased / avgPurchased) * 100) : (currentUser.purchased > 0 ? 999 : 0);
      const rankAdded = breakdownFull.sort((a, b) => b.added - a.added).findIndex(m => m.id === userId) + 1;
      userContribution = {
        added: currentUser.added,
        purchased: currentUser.purchased,
        vsAvgAddedPct: Math.min(vsAvgAddedPct, 999),
        vsAvgPurchasedPct: Math.min(vsAvgPurchasedPct, 999),
        rankAdded,
      };
    }

    return {
      name: list.name,
      icon: list.icon,
      membersCount: list.members.length + 1,
      topContributor,
      topBuyer,
      memberBreakdown: breakdown,
      userContribution,
    };
  });

  return perListResults.filter((r): r is InsightsData['groupStats'][number] => r !== null);
}
