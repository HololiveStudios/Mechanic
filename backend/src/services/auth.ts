import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

export async function verifyToken(req: Request): Promise<any> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}