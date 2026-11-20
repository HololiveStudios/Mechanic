import { pool } from '../db/connection';
import { verifyToken } from '../services/auth';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const workOrderRoutes: Record<string, (req: Request) => Promise<Response>> = {
  'POST /wo': async (req: Request) => {
    const decoded = await verifyToken(req);
    if (!decoded) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { clientId, vehicle, description, estimatedDelivery, items } = await req.json();

    const codeResult = await pool.query(
      'SELECT COUNT(*) as count FROM work_orders WHERE tenant_id = $1',
      [decoded.tenant_id]
    );
    const count = parseInt(codeResult.rows[0].count) + 1;
    const code = `WO-${String(count).padStart(4, '0')}`;

    const woResult = await pool.query(
      `INSERT INTO work_orders (code, tenant_id, client_id, vehicle_plate, vehicle_model, description, estimated_delivery)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, code, created_at`,
      [code, decoded.tenant_id, clientId, vehicle.plate, vehicle.model, description, estimatedDelivery]
    );

    const wo = woResult.rows[0];

    for (const item of items) {
      await pool.query(
        'INSERT INTO work_order_items (wo_id, type, description, qty, unit_price) VALUES ($1, $2, $3, $4, $5)',
        [wo.id, item.type, item.description, item.qty, item.unitPrice]
      );
    }

    await redis.publish('wo:events', JSON.stringify({
      event: 'wo:created',
      data: { woId: wo.id, summary: `${code} - ${vehicle.plate}` },
      meta: { sentAt: new Date().toISOString(), traceId: crypto.randomUUID() }
    }));

    return new Response(JSON.stringify(wo), { 
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  'GET /wo': async (req: Request) => {
    const decoded = await verifyToken(req);
    if (!decoded) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let query = `
      SELECT wo.*, 
             u.name as client_name,
             m.name as mechanic_name
      FROM work_orders wo
      JOIN users u ON wo.client_id = u.id
      LEFT JOIN users m ON wo.mechanic_id = m.id
      WHERE wo.tenant_id = $1
    `;

    if (decoded.role === 'client') {
      query += ` AND wo.client_id = $2`;
      const result = await pool.query(query, [decoded.tenant_id, decoded.id]);
      return new Response(JSON.stringify(result.rows), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (decoded.role === 'mechanic') {
      query += ` AND wo.mechanic_id = $2`;
      const result = await pool.query(query, [decoded.tenant_id, decoded.id]);
      return new Response(JSON.stringify(result.rows), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await pool.query(query, [decoded.tenant_id]);
    return new Response(JSON.stringify(result.rows), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  'GET /wo/:id': async (req: Request) => {
    const decoded = await verifyToken(req);
    if (!decoded) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const id = url.pathname.split('/')[2];

    const woResult = await pool.query(
      `SELECT wo.*, 
              u.name as client_name, u.phone as client_phone,
              m.name as mechanic_name
       FROM work_orders wo
       JOIN users u ON wo.client_id = u.id
       LEFT JOIN users m ON wo.mechanic_id = m.id
       WHERE wo.id = $1 AND wo.tenant_id = $2`,
      [id, decoded.tenant_id]
    );

    if (woResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Work order not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const wo = woResult.rows[0];

    const itemsResult = await pool.query('SELECT * FROM work_order_items WHERE wo_id = $1', [id]);
    const updatesResult = await pool.query(
      `SELECT wu.*, u.name as user_name 
       FROM wo_updates wu 
       JOIN users u ON wu.user_id = u.id 
       WHERE wu.wo_id = $1 
       ORDER BY wu.created_at ASC`, 
      [id]
    );
    const attachmentsResult = await pool.query('SELECT * FROM attachments WHERE wo_id = $1', [id]);

    return new Response(JSON.stringify({
      ...wo,
      items: itemsResult.rows,
      updates: updatesResult.rows,
      attachments: attachmentsResult.rows,
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  'POST /wo/:id/updates': async (req: Request) => {
    const decoded = await verifyToken(req);
    if (!decoded) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const woId = url.pathname.split('/')[2];
    const { type, payload } = await req.json();

    const updateResult = await pool.query(
      'INSERT INTO wo_updates (wo_id, user_id, type, payload) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
      [woId, decoded.id, type, JSON.stringify(payload)]
    );

    const update = updateResult.rows[0];

    if (type === 'status_change') {
      await pool.query(
        'UPDATE work_orders SET status = $1, updated_at = NOW(), version = version + 1 WHERE id = $2',
        [payload.newStatus, woId]
      );
    }

    const woResult = await pool.query('SELECT * FROM work_orders WHERE id = $1', [woId]);
    const wo = woResult.rows[0];

    await redis.publish('wo:events', JSON.stringify({
      event: 'wo:updated',
      data: {
        woId,
        changeType: type,
        updateId: update.id,
        summary: `Status changed to ${payload.newStatus || 'updated'}`,
        byUser: { id: decoded.id, name: decoded.name, role: decoded.role }
      },
      meta: { sentAt: new Date().toISOString(), traceId: crypto.randomUUID() }
    }));

    if (type === 'status_change' && payload.newStatus === 'awaiting_part') {
      await pool.query(
        `INSERT INTO notifications (user_id, wo_id, type, title, body, payload)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          wo.client_id,
          woId,
          'approval_request',
          'Aprovação necessária',
          `A OS ${wo.code} precisa de aprovação para compra de peças`,
          JSON.stringify({ 
            actions: [
              { id: 'approve', label: 'Aprovar', deepLink: `/wo/${woId}/approve`, method: 'POST' },
              { id: 'reject', label: 'Rejeitar', deepLink: `/wo/${woId}/reject`, method: 'POST' }
            ] 
          })
        ]
      );

      await redis.publish('notification:queue', JSON.stringify({ 
        notificationId: (await pool.query('SELECT id FROM notifications ORDER BY created_at DESC LIMIT 1')).rows[0].id 
      }));
    }

    return new Response(JSON.stringify(update), { 
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};