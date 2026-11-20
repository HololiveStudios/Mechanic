import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../db/connection';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-refresh';

export const authRoutes: Record<string, (req: Request) => Promise<Response>> = {
  'POST /auth/login': async (req: Request) => {
    const { email, password } = await req.json();
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role, tenant_id: user.tenant_id }, 
      JWT_SECRET, 
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { id: user.id }, 
      JWT_REFRESH_SECRET, 
      { expiresIn: '30d' }
    );

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    return new Response(JSON.stringify({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  'POST /auth/refresh': async (req: Request) => {
    const { refreshToken } = await req.json();

    const tokenRecord = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = FALSE AND expires_at > NOW()',
      [refreshToken]
    );

    if (tokenRecord.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid refresh token' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const decoded: any = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    
    if (userResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = userResult.rows[0];
    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role, tenant_id: user.tenant_id }, 
      JWT_SECRET, 
      { expiresIn: '15m' }
    );
    
    const newRefreshToken = jwt.sign(
      { id: user.id }, 
      JWT_REFRESH_SECRET, 
      { expiresIn: '30d' }
    );

    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1', [refreshToken]);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, newRefreshToken, expiresAt]
    );

    return new Response(JSON.stringify({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};