import { useState, useEffect } from 'react';
import CreateWOForm from './CreateWOForm';
import WorkOrderDetail from './WorkOrderDetail';

interface DashboardProps {
  user: any;
  accessToken: string;
  onLogout: () => void;
}

export default function Dashboard({ user, accessToken, onLogout }: DashboardProps) {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [selectedWO, setSelectedWO] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    fetchWorkOrders();
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  async function fetchWorkOrders() {
    try {
      const response = await fetch('/api/wo', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      setWorkOrders(data);
    } catch (error) {
      console.error('Failed to fetch work orders:', error);
    }
  }

  function connectWebSocket() {
    const websocket = new WebSocket(`ws://localhost:3001/ws?token=${accessToken}`);

    websocket.onopen = () => {
      console.log('WebSocket connected');
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.event === 'wo:updated' || message.event === 'wo:created') {
        fetchWorkOrders();
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);
  }

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      created: 'bg-gray-500',
      in_analysis: 'bg-blue-500',
      awaiting_part: 'bg-yellow-500',
      in_service: 'bg-purple-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      created: 'Criada',
      in_analysis: 'Em Análise',
      awaiting_part: 'Aguardando Peça',
      in_service: 'Em Serviço',
      completed: 'Concluída',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  }

  if (selectedWO) {
    return (
      <WorkOrderDetail
        woId={selectedWO}
        accessToken={accessToken}
        onBack={() => setSelectedWO(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">Oficina Manager</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-700 font-medium">{user.name}</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                {user.role === 'admin' ? 'Admin' : user.role === 'mechanic' ? 'Mecânico' : 'Cliente'}
              </span>
              <button
                onClick={onLogout}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h2>
          
          {(user.role === 'admin' || user.role === 'mechanic') && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              + Nova OS
            </button>
          )}
        </div>

        {workOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhuma ordem de serviço encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workOrders.map((wo) => (
              <div
                key={wo.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow cursor-pointer border border-gray-200"
                onClick={() => setSelectedWO(wo.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{wo.code}</h3>
                  <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${getStatusColor(wo.status)}`}>
                    {getStatusLabel(wo.status)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-700 font-medium">{wo.vehicle_plate}</p>
                  </div>
                  <p className="text-gray-600 text-sm">{wo.vehicle_model}</p>
                  <p className="text-gray-500 text-sm">{wo.client_name}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Criado em {new Date(wo.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateForm && (
        <CreateWOForm
          accessToken={accessToken}
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false);
            fetchWorkOrders();
          }}
        />
      )}
    </div>
  );
}