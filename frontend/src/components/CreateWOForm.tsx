import { useState } from 'react';

interface CreateWOFormProps {
  accessToken: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateWOForm({ accessToken, onClose, onCreated }: CreateWOFormProps) {
  const [formData, setFormData] = useState({
    clientId: '',
    vehiclePlate: '',
    vehicleModel: '',
    description: '',
    estimatedDelivery: '',
  });
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  function addItem() {
    setItems([...items, { type: 'service', description: '', qty: 1, unitPrice: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: any) {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/wo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: formData.clientId,
          vehicle: {
            plate: formData.vehiclePlate,
            model: formData.vehicleModel,
          },
          description: formData.description,
          estimatedDelivery: formData.estimatedDelivery,
          items,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create WO');
      }

      onCreated();
    } catch (error) {
      console.error('Failed to create WO:', error);
      alert('Falha ao criar OS');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Nova Ordem de Serviço</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente ID
            </label>
            <input
              type="text"
              value={formData.clientId}
              onChange={e => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="UUID do cliente"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placa
              </label>
              <input
                type="text"
                value={formData.vehiclePlate}
                onChange={e => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ABC-1234"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modelo
              </label>
              <input
                type="text"
                value={formData.vehicleModel}
                onChange={e => setFormData({ ...formData, vehicleModel: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Gol 1.0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição do Problema
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Descreva o problema..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entrega Estimada
            </label>
            <input
              type="datetime-local"
              value={formData.estimatedDelivery}
              onChange={e => setFormData({ ...formData, estimatedDelivery: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Itens e Serviços
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Adicionar Item
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-5 gap-2 mb-2">
                <select
                  value={item.type}
                  onChange={e => updateItem(index, 'type', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="service">Serviço</option>
                  <option value="part">Peça</option>
                </select>

                <input
                  type="text"
                  placeholder="Descrição"
                  value={item.description}
                  onChange={e => updateItem(index, 'description', e.target.value)}
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg"
                />

                <input
                  type="number"
                  placeholder="Qtd"
                  value={item.qty}
                  onChange={e => updateItem(index, 'qty', parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  min="1"
                />

                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="R$ 0,00"
                    value={item.unitPrice}
                    onChange={e => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    step="0.01"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="px-2 text-red-600 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Criando...' : 'Criar OS'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}