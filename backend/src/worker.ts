import { Pool } from 'pg';
import Redis from 'ioredis';
import twilio from 'twilio';
import admin from 'firebase-admin';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://oficina:oficina123@localhost:5432/oficina',
});

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const T1_TIMEOUT_MS = 60 * 60 * 1000;
const T2_TIMEOUT_MS = 24 * 60 * 60 * 1000;

async function sendPushNotification(userId: string, notification: any): Promise<boolean> {
  const userResult = await pool.query(
    'SELECT fcm_token FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0 || !userResult.rows[0].fcm_token) {
    console.log(`No FCM token for user ${userId}`);
    return false;
  }

  const message = {
    token: userResult.rows[0].fcm_token,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: notification.payload || {},
  };

  try {
    await admin.messaging().send(message);
    console.log(`Push notification sent to user ${userId}`);
    return true;
  } catch (error) {
    console.error('FCM send failed', error);
    return false;
  }
}

async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`SMS sent to ${phone}`);
    return true;
  } catch (error) {
    console.error('SMS send failed', error);
    return false;
  }
}

async function makeCall(phone: string, woCode: string): Promise<boolean> {
  try {
    await twilioClient.calls.create({
      url: `${process.env.APP_URL}/api/twiml/approval/${woCode}`,
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER,
    });
    console.log(`Call initiated to ${phone}`);
    return true;
  } catch (error) {
    console.error('Call failed', error);
    return false;
  }
}

async function processNotification(notificationId: string) {
  const notifResult = await pool.query(
    'SELECT n.*, u.phone, wo.code FROM notifications n JOIN users u ON n.user_id = u.id JOIN work_orders wo ON n.wo_id = wo.id WHERE n.id = $1',
    [notificationId]
  );

  if (notifResult.rows.length === 0) {
    console.log(`Notification ${notificationId} not found`);
    return;
  }

  const notif = notifResult.rows[0];

  const pushSent = await sendPushNotification(notif.user_id, {
    title: notif.title,
    body: notif.body,
    payload: notif.payload,
  });

  await redis.publish('wo:events', JSON.stringify({
    event: 'notification:action',
    data: {
      notificationId: notif.id,
      woId: notif.wo_id,
      title: notif.title,
      body: notif.body,
      actions: notif.payload?.actions || [],
    },
    meta: { sentAt: new Date().toISOString(), traceId: crypto.randomUUID() }
  }));

  await pool.query(
    'UPDATE notifications SET status = $1, sent_at = NOW() WHERE id = $2',
    [pushSent ? 'sent' : 'failed', notif.id]
  );

  if (pushSent) {
    setTimeout(async () => {
      const ackResult = await pool.query(
        'SELECT ack_at FROM notifications WHERE id = $1',
        [notif.id]
      );

      if (ackResult.rows.length > 0 && !ackResult.rows[0].ack_at) {
        console.log(`No ack for notification ${notif.id}, sending SMS fallback`);
        
        const smsMessage = `${notif.title}: ${notif.body}. Acesse ${process.env.APP_URL}/wo/${notif.wo_id}`;
        await sendSMS(notif.phone, smsMessage);
        
        await pool.query(
          'INSERT INTO notifications (user_id, wo_id, type, title, body, status, sent_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
          [notif.user_id, notif.wo_id, 'sms_fallback', 'SMS enviado', smsMessage, 'sent']
        );

        setTimeout(async () => {
          const ackResult2 = await pool.query(
            'SELECT ack_at FROM notifications WHERE id = $1',
            [notif.id]
          );

          if (ackResult2.rows.length > 0 && !ackResult2.rows[0].ack_at) {
            console.log(`No ack for notification ${notif.id}, making call fallback`);
            
            await makeCall(notif.phone, notif.code);

            const adminResult = await pool.query(
              'SELECT id FROM users WHERE tenant_id = (SELECT tenant_id FROM work_orders WHERE id = $1) AND role = $2 LIMIT 1',
              [notif.wo_id, 'admin']
            );

            if (adminResult.rows.length > 0) {
              await pool.query(
                'INSERT INTO notifications (user_id, wo_id, type, title, body, status, sent_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                [
                  adminResult.rows[0].id,
                  notif.wo_id,
                  'escalation',
                  'Cliente não respondeu',
                  `Cliente da OS ${notif.code} não respondeu após push, SMS e chamada`,
                  'sent'
                ]
              );
            }
          }
        }, T2_TIMEOUT_MS - T1_TIMEOUT_MS);
      }
    }, T1_TIMEOUT_MS);
  }
}

async function startWorker() {
  const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  await subscriber.subscribe('notification:queue');

  subscriber.on('message', async (channel, message) => {
    if (channel === 'notification:queue') {
      const { notificationId } = JSON.parse(message);
      console.log(`Processing notification ${notificationId}`);
      await processNotification(notificationId);
    }
  });

  console.log('Notification worker started');
}

startWorker().catch(console.error);