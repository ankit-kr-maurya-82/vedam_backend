import webpush from "web-push";
import { PushSubscription } from "../models/PushSubscription.model.js";

const vapidPublicKey = process.env.WEB_PUSH_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.WEB_PUSH_PRIVATE_KEY || "";
const vapidSubject =
  process.env.WEB_PUSH_SUBJECT || "mailto:notifications@example.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

const isPushConfigured = () => Boolean(vapidPublicKey && vapidPrivateKey);

const getPushPublicKey = () => vapidPublicKey;

const toWebPushSubscription = (subscription) => ({
  endpoint: subscription.endpoint,
  expirationTime: subscription.expirationTime ?? null,
  keys: {
    auth: subscription.keys.auth,
    p256dh: subscription.keys.p256dh,
  },
});

const sendPushNotificationToUser = async (userId, payload) => {
  if (!isPushConfigured()) {
    return { sent: 0, skipped: true };
  }

  const subscriptions = await PushSubscription.find({
    userId,
    isActive: true,
  }).lean();

  if (!subscriptions.length) {
    return { sent: 0, skipped: false };
  }

  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          toWebPushSubscription(subscription),
          JSON.stringify(payload),
          {
            TTL: 60,
            urgency: "high",
          }
        );

        sent += 1;

        await PushSubscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              lastUsedAt: new Date(),
              isActive: true,
            },
          }
        );
      } catch (error) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: subscription._id });
          return;
        }

        console.error("Push notification send failed:", error.message);
      }
    })
  );

  return { sent, skipped: false };
};

export { getPushPublicKey, isPushConfigured, sendPushNotificationToUser };
