import { pool } from '../db/connection';
import { verifyToken } from '../services/auth';
import crypto from 'crypto';

export const paymentRoutes: Record<string, (req: Request) => Promise<Response>> = {
  'POST /payments/create-link': async (req: Request) => {
    const decoded = await verifyToken(req);
    if (!decoded) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { woId, amount, method } = await req.json();

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const paymentUrl = `${process.env.APP_URL}/payment/${woId}`;

    const paymentResult = await pool.query(
      `INSERT INTO payments (wo_id, amount, method, payment_url, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, payment_url, expires_at`,
      [woId, amount, method, paymentUrl, expiresAt]
    );

    return new Response(JSON.stringify(paymentResult.rows[0]), { 
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  'POST /payments/webhook': async (req: Request) => {
    const signature = req.headers.get('X-Payment-Signature');
    const body = await req.text();

    const expectedSignature = crypto
      .createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET || 'webhook-secret')
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const payload = JSON.parse(body);

    await pool.query(
      'UPDATE payments SET status = $1, paid_at = NOW() WHERE id = $2',
      [payload.status, payload.paymentId]
    );

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};