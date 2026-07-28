import { Product } from '../models';
import type { InsightsData } from './insights.types';

// סטטיסטיקות ברמת קבוצה: מי הכי תורם, מי הכי קונה, פירוט חברים
export async function getGroupStats(lists: { _id: any; name: string; icon: string; isGroup: boolean; owner: any; members: { user: any }[] }[], userId: string): Promise<InsightsData['groupStats']> {
  const groupLists = lists.filter(l => l.isGroup && l.members.length > 0);
  if (groupLists.length === 0) return [];

  // שאילתה נפרדת (עצמאית לגמרי) לכל קבוצה - היה רץ ברצף (עד 5 round-trips
  // ל-DB בזה אחר זה), עכשיו במקביל. משפיע ישירות על זמן תגובה של עמוד
  // התובנות עבור כל משתמש עם יותר מקבוצה אחת.
  const perListResults = await Promise.all(groupLists.slice(0, 5).map(async (list): Promise<InsightsData['groupStats'][number] | null> => {
    const products = await Product.find({ listId: list._id })
      .populate('addedBy', 'name')
      .lean();

    if (products.length === 0) return null;

    // ספירה לפי משתמש: מי הוסיף ומי קנה. שומר גם userId כדי לזהות את המשתמש הנוכחי.
    const memberStats = new Map<string, { id: string; name: string; added: number; purchased: number }>();

    for (const p of products) {
      const addedByName = (p.addedBy && typeof p.addedBy === 'object' && 'name' in p.addedBy)
        ? (p.addedBy as { name: string }).name : 'Unknown';
      const addedById = (p.addedBy && typeof p.addedBy === 'object' && '_id' in p.addedBy)
        ? (p.addedBy as { _id: any })._id.toString() : '';

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
  }));

  return perListResults.filter((r): r is InsightsData['groupStats'][number] => r !== null);
}
