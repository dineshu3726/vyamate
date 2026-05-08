import webpush from 'web-push';
import { subscriptionsDb, usersDb } from '../models/db';

webpush.setVapidDetails(
  'mailto:admin@vyamate.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = '/',
): Promise<void> {
  const subs = await new Promise<any[]>((resolve, reject) => {
    subscriptionsDb.find({ userId }, (err: Error | null, docs: any[]) => {
      if (err) reject(err); else resolve(docs);
    });
  });

  const payload = JSON.stringify({ title, body, url });

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, payload);
      } catch (err: any) {
        // Remove expired / invalid subscriptions (410 Gone)
        if (err.statusCode === 410 || err.statusCode === 404) {
          subscriptionsDb.remove({ _id: s._id }, {}, () => {});
        }
      }
    }),
  );
}

export async function getUserName(userId: string): Promise<string> {
  return new Promise((resolve) => {
    usersDb.findOne({ _id: userId }, (err: Error | null, doc: any) => {
      resolve(doc?.name || 'Someone');
    });
  });
}
