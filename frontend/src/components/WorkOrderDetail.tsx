import { useState, useEffect } from 'react';

interface WorkOrderDetailProps {
  woId: string;
  accessToken: string;
  onBack: () => void;
}

export default function WorkOrderDetail({ woId, accessToken, onBack }: WorkOrderDetailProps) {
  const [wo, setWo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchWO();
  }, [woId]);

  async function fetchWO() {
    try {
      const response = await fetch(`/api/wo/${woId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await response.json();
      setWo(data);
    } catch (error) {
      console.error('Failed to fetch WO:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    try {
      await fetch(`/api/wo/${woId}/updates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'status_change',
          payload: { newStatus },
        }),
      });
      fetchWO();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Falha ao atualizar status');
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;

    try {
      await fetch(`/api/wo/${woId}/updates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'note',
          payload: { text: newNote },
        }),
      });
      setNewNote('');
      fetchWO();
    } catch (error) {
      console.error('Failed to add note:', error);
      alert('Falha ao adicionar nota');
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('woId', woId);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      await fetch(`/api/wo/${woId}/updates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'photo',
          payload: { url: data.url, fileId: data.id },
        }),
      });

      fetchWO();
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Falha ao fazer upload do arquivo');
    } finally {
      setUploadingFile(false);
    }
  }

  async function downloadPDF() {
    try {
      const response = await fetch(`/api/wo/${woId}/pdf`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OS-${wo.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Falha ao gerar PDF');
    }
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

  function getUpdateTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      status_change: 'Mudança de Status',
      note: 'Nota',
      photo: 'Foto Anexada',
      price_change: 'Alteração de Preço',
      approval: 'Aprovação',
      rejection: 'Rejeição',
    };
    return labels[type] || type;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Ordem de serviço não encontrada</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Voltar
              </button>
              <h1 className="text-xl font-bold text-gray-900">{wo.code}</h1>
            </div>
            <button
              onClick={downloadPDF}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
            >
              Baixar PDF
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{wo.code}</h2>
                  <span className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${getStatusColor(wo.status)}`}>
                    {getStatusLabel(wo.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">Cliente</h3>
                  <p className="text-gray-900">{wo.client_name}</p>
                  <p className="text-gray-600 text-sm">{wo.client_phone}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">Veículo</h3>
                  <p className="text-gray-900 font-medium">{wo.vehicle_plate}</p>
                  <p className="text-gray-600 text-sm">{wo.vehicle_model}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Descrição</h3>
                <p className="text-gray-900">{wo.description}</p>
              </div>

              {wo.estimated_delivery && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">Entrega Estimada</h3>
                  <p className="text-gray-900">
                    {new Date(wo.estimated_delivery).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Itens e Serviços</h3>
                <div className="space-y-2">
                  {wo.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.description}</p>
                        <p className="text-sm text-gray-600">
                          {item.type === 'service' ? 'Serviço' : 'Peça'} - Qtd: {item.qty}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          R$ {parseFloat(item.total_price).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Unit: R$ {parseFloat(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900">
                    R$ {parseFloat(wo.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-2 gap-3">
                {wo.status === 'created' && (
                  <button
                    onClick={() => updateStatus('in_analysis')}
                    className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Iniciar Análise
                  </button>
                )}
                {wo.status === 'in_analysis' && (
                  <>
                    <button
                      onClick={() => updateStatus('in_service')}
                      className="bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-semibold"
                    >
                      Iniciar Serviço
                    </button>
                    <button
                      onClick={() => updateStatus('awaiting_part')}
                      className="bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 font-semibold"
                    >
                      Aguardar Peça
                    </button>
                  </>
                )}
                {wo.status === 'awaiting_part' && (
                  <button
                    onClick={() => updateStatus('in_service')}
                    className="bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-semibold"
                  >
                    Retomar Serviço
                  </button>
                )}
                {wo.status === 'in_service' && (
                  <button
                    onClick={() => updateStatus('completed')}
                    className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Concluir
                  </button>
                )}
                <label className="bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 font-semibold text-center cursor-pointer">
                  {uploadingFile ? 'Enviando...' : 'Anexar Foto'}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                </label>
              </div>
            </div>

{wo.attachments && wo.attachments.length > 0 && (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Anexos</h3>
    <div className="grid grid-cols-3 gap-4">
      {wo.attachments.map((attachment: any) => (
        <a
          key={attachment.id}
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative group"
        >
          {attachment.mime_type.startsWith('image/') ? (
            <img
              src={attachment.url}
              alt="Anexo"
              className="w-full h-32 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-600">Arquivo</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
            <span className="text-white opacity-0 group-hover:opacity-100">Ver</span>
          </div>
        </a>
      ))}
    </div>
  </div>
)}

          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Nota</h3>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                rows={3}
                placeholder="Escreva uma observação..."
              />
              <button
                onClick={addNote}
                disabled={!newNote.trim()}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Adicionar
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico</h3>
              <div className="space-y-4">
                {wo.updates && wo.updates.length > 0 ? (
                  wo.updates.map((update: any) => (
                    <div key={update.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-gray-900">
                          {getUpdateTypeLabel(update.type)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(update.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{update.user_name}</p>
                      {update.payload && update.payload.text && (
                        <p className="text-sm text-gray-800 mt-1">{update.payload.text}</p>
                      )}
                      {update.payload && update.payload.newStatus && (
                        <p className="text-sm text-gray-800 mt-1">
                          Status: {getStatusLabel(update.payload.newStatus)}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Nenhuma atualização ainda</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}