import { serve } from 'bun';
import { authRoutes } from './routes/auth';
import { workOrderRoutes } from './routes/workOrders';
import { uploadRoutes } from './routes/upload';
import { pdfRoutes } from './routes/pdf';
import { paymentRoutes } from './routes/payments';
import { startWebSocketServer } from './services/websocket';

const routes = {
  ...authRoutes,
  ...workOrderRoutes,
  ...uploadRoutes,
  ...pdfRoutes,
  ...paymentRoutes,
};

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (req.headers.get('upgrade') === 'websocket') {
      return new Response('WebSocket on port 3001', { status: 426 });
    }

    const routeKey = `${req.method} ${url.pathname}`;
    
    for (const [pattern, handler] of Object.entries(routes)) {
      const regex = new RegExp('^' + pattern.replace(/:\w+/g, '[^/]+') + '$');
      if (regex.test(routeKey)) {
        return handler(req);
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
});

startWebSocketServer();

console.log('API server running on http://localhost:3000');
console.log('WebSocket server running on ws://localhost:3001');