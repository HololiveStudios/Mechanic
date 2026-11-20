import puppeteer from 'puppeteer';
import { pool } from '../db/connection';
import { verifyToken } from '../services/auth';

export const pdfRoutes: Record<string, (req: Request) => Promise<Response>> = {
  'GET /wo/:id/pdf': async (req: Request) => {
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
      `SELECT wo.*, u.name as client_name, u.phone as client_phone
       FROM work_orders wo
       JOIN users u ON wo.client_id = u.id
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

    const itemsResult = await pool.query(
      'SELECT * FROM work_order_items WHERE wo_id = $1',
      [id]
    );

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      padding: 40px; 
      color: #333;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 { 
      color: #1f2937; 
      font-size: 28px;
      margin-bottom: 10px;
    }
    .info-section {
      margin-bottom: 25px;
    }
    .info-label {
      font-weight: bold;
      color: #4b5563;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 14px;
      margin-bottom: 15px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 20px; 
    }
    th, td { 
      border: 1px solid #d1d5db; 
      padding: 12px; 
      text-align: left; 
    }
    th { 
      background-color: #f3f4f6; 
      font-weight: bold;
      color: #374151;
    }
    .total { 
      font-weight: bold; 
      text-align: right; 
      margin-top: 20px;
      font-size: 18px;
      color: #1f2937;
    }
    .status {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      color: white;
      background-color: #6b7280;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #d1d5db;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Ordem de Serviço ${wo.code}</h1>
    <span class="status">${wo.status}</span>
  </div>

  <div class="info-section">
    <div class="info-label">Cliente</div>
    <div class="info-value">${wo.client_name}</div>
    
    <div class="info-label">Telefone</div>
    <div class="info-value">${wo.client_phone}</div>
    
    <div class="info-label">Veículo</div>
    <div class="info-value">${wo.vehicle_plate} - ${wo.vehicle_model}</div>
    
    <div class="info-label">Descrição</div>
    <div class="info-value">${wo.description}</div>
    
    <div class="info-label">Data de Criação</div>
    <div class="info-value">${new Date(wo.created_at).toLocaleString('pt-BR')}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Tipo</th>
        <th>Qtd</th>
        <th>Valor Unit.</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsResult.rows.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.type === 'service' ? 'Serviço' : 'Peça'}</td>
          <td>${item.qty}</td>
          <td>R$ ${parseFloat(item.unit_price).toFixed(2)}</td>
          <td>R$ ${parseFloat(item.total_price).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <p class="total">Total: R$ ${parseFloat(wo.total_amount).toFixed(2)}</p>

  <div class="footer">
    Documento gerado em ${new Date().toLocaleString('pt-BR')}
  </div>
</body>
</html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ 
      format: 'A4',
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });
    await browser.close();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="OS-${wo.code}.pdf"`,
      },
    });
  },
};