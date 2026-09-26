import { AdminSettings, type IAdminSettings, Feedback, SubscriptionRequest } from '../models';

const SETTINGS_KEY = 'global';

/** ההגדרות הגלובליות של האדמין. נוצרות בפעם הראשונה עם ברירות המחדל. */
export async function getAdminSettings(): Promise<IAdminSettings> {
  return AdminSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ) as Promise<IAdminSettings>;
}

export async function updateAdminPushSettings(patch: { pushOnSubscription?: boolean; pushOnFeedback?: boolean }) {
  await getAdminSettings();
  return AdminSettings.findOneAndUpdate({ key: SETTINGS_KEY }, { $set: patch }, { new: true });
}

/** האדמין פתח את מסך המשובים - כל מה שקיים עד עכשיו כבר לא "חדש". */
export async function markFeedbackSeen(): Promise<void> {
  await getAdminSettings();
  await AdminSettings.updateOne({ key: SETTINGS_KEY }, { $set: { feedbackSeenAt: new Date() } });
}

/**
 * מספר הדברים החדשים לאייקונים בכותרת האדמין, והגדרות הפוש.
 * מנויים: דיווחי תשלום שממתינים לאישור (נעלמים כשמאשרים או דוחים).
 * משוב: משובים שהגיעו מאז הפתיחה האחרונה של מסך המשובים.
 */
export async function getAdminAlerts() {
  const settings = await getAdminSettings();
  const [subscriptionPending, feedbackNew] = await Promise.all([
    SubscriptionRequest.countDocuments({ status: 'reported' }),
    Feedback.countDocuments({ createdAt: { $gt: settings.feedbackSeenAt } }),
  ]);
  return {
    subscriptionPending,
    feedbackNew,
    pushOnSubscription: settings.pushOnSubscription,
    pushOnFeedback: settings.pushOnFeedback,
  };
}
