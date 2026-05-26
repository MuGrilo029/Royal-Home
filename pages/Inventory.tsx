

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Input, Table, Badge, Modal, Select } from '../components/UI';
import { Plus, Trash2, AlertTriangle, DollarSign, Package, TrendingUp, TrendingDown, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { formatDisplayDate, getUUID } from '../lib/utils';

export const Inventory: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, categories, registerStockEntry } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStockEntry, setShowStockEntry] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [stockEntryData, setStockEntryData] = useState({ quantity: 0, cost: 0, date: new Date().toISOString().split('T')[0], observations: '' });
  const [isUploading, setIsUploading] = useState(false);

  // --- FILTERS STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [onlyInStock, setOnlyInStock] = useState(false);

  // --- COMPUTED DATA (Filtered Products) ---
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchesStock = !onlyInStock || p.quantity > 0;
    return matchesSearch && matchesCategory && matchesStock;
  });

  // --- CÁLCULOS TOTAIS DO ESTOQUE (Baseado nos itens filtrados) ---
  const totalItems = filteredProducts.reduce((acc, p) => acc + p.quantity, 0);
  const totalCost = filteredProducts.reduce((acc, p) => acc + (p.cost * p.quantity), 0);
  const totalSalesValue = filteredProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const potentialProfit = totalSalesValue - totalCost;
  const margin = totalSalesValue > 0 ? (potentialProfit / totalSalesValue) * 100 : 0;

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setFormData({ ...product });
    } else {
      setFormData({});
    }
    setIsUploading(false);
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    setIsUploading(true);

    try {
      // 1. Upload to Supabase Storage (Bucket 'products')
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get Public URL
      const { data } = supabase.storage.from('products').getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image: data.publicUrl }));
      alert('Imagem enviada com sucesso!');

    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Erro ao enviar imagem. Verifique se o bucket "products" existe e é público no Supabase.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const productData = {
      id: formData.id || getUUID(),
      name: formData.name!,
      sku: formData.sku || 'N/A',
      quantity: Number(formData.quantity) || 0,
      price: Number(formData.price) || 0,
      cost: Number(formData.cost) || 0,
      minStock: formData.minStock !== undefined ? Number(formData.minStock) : 5,
      category: formData.category || 'Geral',
      image: formData.image || '',
      description: formData.description || ''
    };

    if (formData.id) {
      updateProduct(productData);
    } else {
      addProduct(productData);
    }
    setShowForm(false);
  };

  const handleConfirmDelete = () => {
    if (formData.id) {
      deleteProduct(formData.id);
      setShowDeleteConfirm(false);
      setShowForm(false);
    }
  };

  // Filtrar categorias
  const productCategories = categories.filter(c => c.type === 'PRODUCT');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-black text-wine-900 dark:text-white tracking-tighter uppercase">Controle de Estoque</h2>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto"><Plus size={18} /> Novo Produto</Button>
      </div>

      {/* --- FILTROS DE BUSCA E CATEGORIA (Estilo Dashboard) --- */}
      <Card className="p-4 space-y-4 shadow-xl border-wine-100 dark:border-slate-700">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Plus className="absolute left-3 top-2.5 text-gray-400 rotate-45" size={20} />
            <input
              className="w-full pl-10 p-2 border rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-wine-500"
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 px-2">
            <div
              onClick={() => setOnlyInStock(!onlyInStock)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer flex-shrink-0
                ${onlyInStock ? 'bg-wine-600' : 'bg-gray-200 dark:bg-slate-600'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${onlyInStock ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </div>
            <span className="text-xs font-black uppercase text-wine-500 dark:text-slate-400 select-none cursor-pointer">
              Apenas em Estoque
            </span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {['Todos', ...new Set(productCategories.map(c => c.name))].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-wine-900 text-white shadow-lg scale-105' : 'bg-wine-50 text-wine-500 hover:bg-wine-100 dark:bg-slate-700 dark:text-slate-400'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </Card>

      {/* --- CARDS DE RESUMO DO ESTOQUE --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-wine-500 dark:text-wine-300 uppercase">Qtd. Física Total</p>
              <h3 className="text-2xl font-bold text-wine-900 dark:text-white mt-1">{totalItems}</h3>
              <p className="text-xs text-wine-400 mt-1">Produtos em estoque</p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
              <Package size={20} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-wine-400">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-wine-500 dark:text-wine-300 uppercase">Valor de Custo (Investido)</p>
              <h3 className="text-2xl font-bold text-wine-900 dark:text-white mt-1">
                R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-wine-400 mt-1">Capital parado em estoque</p>
            </div>
            <div className="p-2 bg-wine-50 dark:bg-wine-900/20 rounded-lg text-wine-600 dark:text-wine-400">
              <TrendingDown size={20} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-wine-500 dark:text-wine-300 uppercase">Valor de Venda (Potencial)</p>
              <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                R$ {totalSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-wine-400 mt-1">Faturamento previsto</p>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={20} />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-wine-500 dark:text-wine-300 uppercase">Lucro Projetado</p>
              <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                R$ {potentialProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-wine-400 mt-1">Margem média: {margin.toFixed(1)}%</p>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
              <DollarSign size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={formData.id ? "Editar Produto" : "Cadastrar Novo Produto"}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome do Produto *"
            value={formData.name || ''}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />
          <div className="space-y-1">
            <Input
              label="SKU / Código"
              value={formData.sku || ''}
              onChange={e => setFormData({ ...formData, sku: e.target.value })}
            />
            {formData.id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setStockEntryData({ quantity: 1, cost: formData.cost || 0, date: new Date().toISOString().split('T')[0], observations: '' });
                  setShowStockEntry(true);
                }}
                className="w-full mt-2 border-wine-200 text-wine-600 hover:bg-wine-50"
              >
                <Plus size={14} /> Adicionar Entrada
              </Button>
            )}
          </div>
          <Select
            label="Categoria"
            value={formData.category || ''}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="">Selecione...</option>
            {productCategories.length > 0 ? (
              productCategories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))
            ) : (
              // Fallback caso não tenha categorias cadastradas
              <>
                <option value="Sofás">Sofás</option>
                <option value="Mesas">Mesas</option>
                <option value="Poltronas">Poltronas</option>
                <option value="Cadeiras">Cadeiras</option>
                <option value="Serviços">Serviços</option>
              </>
            )}
          </Select>



          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="block text-xs font-semibold text-wine-700 dark:text-wine-200 uppercase tracking-wide">
              Imagem do Produto
            </label>

            <div className="flex items-center gap-4">
              {formData.image && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-wine-200">
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image: '' })}
                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}

              <div className="flex-1">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-wine-200 border-dashed rounded-lg cursor-pointer bg-wine-50 hover:bg-wine-100 transition-colors">
                  {isUploading ? (
                    <div className="flex flex-col items-center text-wine-500">
                      <Loader2 className="animate-spin mb-1" size={20} />
                      <span className="text-xs">Enviando...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-wine-500">
                      <Upload size={24} className="mb-1" />
                      <span className="text-sm font-medium">Clique para enviar foto</span>
                    </div>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                </label>
              </div>
            </div>
            {/* Fallback URL Input */}
            <input
              className="w-full text-xs text-wine-400 bg-transparent border-b border-wine-100 focus:outline-none focus:border-wine-300 mt-2"
              placeholder="Ou cole uma URL externa aqui..."
              value={formData.image || ''}
              onChange={e => setFormData({ ...formData, image: e.target.value })}
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-semibold text-wine-700 dark:text-wine-200 uppercase tracking-wide mb-1">
              Descrição Detalhada
            </label>
            <textarea
              className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-wine-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-wine-500 dark:text-white transition-all text-sm resize-none h-24"
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva os detalhes luxuosos deste item..."
            />
          </div>

          <Input
            label="Preço Venda (R$)"
            type="number"
            value={formData.price || ''}
            onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
          />
          <Input
            label="Custo (R$)"
            type="number"
            value={formData.cost || ''}
            onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })}
          />
          <Input
            label="Qtd Atual"
            type="number"
            value={formData.quantity || ''}
            onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
          />
          <Input
            label="Estoque Mínimo"
            type="number"
            value={formData.minStock || ''}
            onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })}
          />

          <div className="md:col-span-2 flex justify-between items-center mt-4 pt-4 border-t border-wine-100 dark:border-slate-700">
            {formData.id && (
              <Button type="button" variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={18} /> Excluir
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit">Salvar Produto</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full text-red-600 dark:text-red-400">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="font-bold text-red-900 dark:text-red-100">Atenção! Esta ação é irreversível.</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Você está prestes a excluir um produto do catálogo. Todo o histórico de movimentação vinculado a este ID pode ser afetado em relatórios futuros.
              </p>
            </div>
          </div>

          <div className="bg-wine-50 dark:bg-slate-700 p-4 rounded-lg border border-wine-100 dark:border-slate-600">
            <p className="text-xs font-semibold text-wine-500 dark:text-slate-400 uppercase tracking-wider mb-2">Detalhes do Produto</p>
            <h3 className="text-lg font-bold text-wine-900 dark:text-white mb-2">{formData.name}</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <p><span className="text-wine-600 dark:text-slate-400">SKU:</span> <span className="font-mono font-medium text-wine-900 dark:text-white">{formData.sku}</span></p>
              <p><span className="text-wine-600 dark:text-slate-400">Categoria:</span> <span className="font-medium text-wine-900 dark:text-white">{formData.category}</span></p>
              <p><span className="text-wine-600 dark:text-slate-400">Qtd. em Estoque:</span> <span className="font-bold text-wine-900 dark:text-white">{formData.quantity}</span></p>
              <p><span className="text-wine-600 dark:text-slate-400">Valor de Venda:</span> <span className="font-medium text-wine-900 dark:text-white">R$ {formData.price?.toFixed(2)}</span></p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete}>
              Confirmar e Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL DE ADICIONAR ENTRADA */}
      <Modal
        isOpen={showStockEntry}
        onClose={() => setShowStockEntry(false)}
        title="Adicionar Entrada de Estoque"
      >
        <div className="space-y-4">
          <div className="p-4 bg-wine-50 dark:bg-slate-700/50 rounded-xl border border-wine-100 dark:border-slate-600">
            <h4 className="text-sm font-black uppercase text-wine-900 dark:text-white mb-2">{formData.name}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-wine-500 uppercase">Estoque Atual</p>
                <p className="text-lg font-black text-wine-900 dark:text-white">{formData.quantity}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-wine-500 uppercase">Custo Atual</p>
                <p className="text-lg font-black text-wine-900 dark:text-white">R$ {formData.cost?.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Quantidade a Adicionar *"
              type="number"
              value={stockEntryData.quantity}
              onChange={e => setStockEntryData({ ...stockEntryData, quantity: Number(e.target.value) })}
            />
            <Input
              label="Data da Entrada *"
              type="date"
              value={stockEntryData.date}
              onChange={e => setStockEntryData({ ...stockEntryData, date: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-wine-700 dark:text-wine-200 uppercase tracking-wide">
              Observações
            </label>
            <textarea
              className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-wine-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-wine-500 dark:text-white transition-all text-sm resize-none h-20"
              value={stockEntryData.observations}
              onChange={e => setStockEntryData({ ...stockEntryData, observations: e.target.value })}
              placeholder="Ex: Novo lote recebido, ajuste de preço fornecedor..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-wine-100 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={() => setShowStockEntry(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (stockEntryData.quantity <= 0) {
                  alert('A quantidade deve ser maior que zero.');
                  return;
                }
                await registerStockEntry(
                  formData.id!,
                  stockEntryData.quantity,
                  stockEntryData.cost,
                  stockEntryData.date,
                  stockEntryData.observations
                );
                // Refresh local formData to reflect new state in the edit modal
                setFormData(prev => ({
                  ...prev,
                  quantity: (prev.quantity || 0) + stockEntryData.quantity,
                  cost: stockEntryData.cost
                }));
                setShowStockEntry(false);
              }}
            >
              Confirmar Entrada
            </Button>
          </div>
        </div>
      </Modal>

      <Card>
        <Table headers={['SKU', 'Produto', 'Categoria', 'Custo', 'Venda', 'Qtd', 'Última Entrada', 'Total (Venda)', 'Status']}>
          {filteredProducts.map(p => (
            <tr
              key={p.id}
              className="hover:bg-wine-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
              onClick={() => handleOpenModal(p)}
            >
              <td className="py-3 px-4 text-xs font-mono text-wine-500 dark:text-slate-400">{p.sku}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {p.image && <img src={p.image} className="w-8 h-8 rounded-lg object-cover border border-wine-100" alt="" />}
                  <span className="font-bold text-wine-900 dark:text-wine-100">{p.name}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-xs font-bold text-wine-400 dark:text-slate-400">{p.category || '-'}</td>
              <td className="py-3 px-4 text-wine-900 dark:text-wine-100">R$ {p.cost.toFixed(2)}</td>
              <td className="py-3 px-4 font-black text-wine-900 dark:text-wine-100">R$ {p.price.toFixed(2)}</td>
              <td className="py-3 px-4 text-wine-900 dark:text-wine-100 truncate">{p.quantity}</td>
              <td className="py-3 px-4 text-xs text-wine-500 dark:text-slate-400 font-mono">
                {p.entryDate ? formatDisplayDate(p.entryDate) : '-'}
              </td>
              <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">R$ {(p.price * p.quantity).toFixed(2)}</td>
              <td className="py-3 px-4">
                {p.minStock > 0 && p.quantity <= p.minStock ? (
                  <Badge color="red">Mínimo atingido</Badge>
                ) : (
                  <Badge color="green">OK</Badge>
                )}
              </td>
            </tr>
          ))}
          {filteredProducts.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center py-8 text-wine-300 dark:text-slate-500">Nenhum produto cadastrado.</td>
            </tr>
          )}
        </Table>
      </Card>
    </div >
  );
};