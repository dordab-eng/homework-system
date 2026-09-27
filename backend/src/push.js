import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC,
    process.env.VAPID_PRIVATE
  );
}

export function getPublicKey() {
  return process.env.VAPID_PUBLIC || '';
}

export async function saveSubscription(userId, subscription) {
  await prisma.pushSubscription.upsert({
    where: { userId },
    update: { data: subscription },
    create: { userId, data: subscription },
  });
}

export async function sendToUser(userId, payload) {
  if (!process.env.VAPID_PUBLIC) return null;
  const sub = await prisma.pushSubscription.findUnique({ where: { userId } });
  if (!sub) return null;
  try {
    await webpush.sendNotification(sub.data, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await prisma.pushSubscription.delete({ where: { userId } });
    }
  }
}

export async function sendToUsers(userIds, payload) {
  await Promise.allSettled(userIds.map((id) => sendToUser(id, payload)));
}

export const sendToStudents = sendToUsers;
