
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { useIsMobile } from '../hooks/useIsMobile';
import { Card, Badge, Button, Input } from '../components/UI';
import { Wrench, CheckCircle, Clock, PlayCircle, ArrowRight, ArrowLeft, FileText, Image as ImageIcon, User, MapPin, Phone, Calendar, ZoomIn, X, Search, Printer, Plus } from 'lucide-react';
import { ProductionOrder, FurnitureSpecs, Product } from '../types';
import { Modal } from '../components/UI';
import { ServiceConfigForm } from '../components/ServiceConfigForm';
import { getUUID, formatISO } from '../lib/utils';

// Helper to safely parse specs
const parseSpecs = (specsStr: string): FurnitureSpecs | null => {
  try {
    const parsed = JSON.parse(specsStr);
    if (typeof parsed === 'object' && parsed !== null && ('foam' in parsed || 'arm' in parsed || 'model' in parsed)) {
      return parsed as FurnitureSpecs;
    }
    return null;
  } catch (e) {
    return null;
  }
};

// --- SUB-COMPONENT: KANBAN CARD ---
const OrderCard: React.FC<{ order: ProductionOrder; onClick: (order: ProductionOrder) => void; onPrint: (order: ProductionOrder) => void }> = ({ order, onClick, onPrint }) => {
  const { updateProductionOrderStatus, deleteProductionOrder } = useAppStore();
  const furnitureSpecs = parseSpecs(order.specs);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div
      onClick={() => onClick(order)}
      className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-wine-100 dark:border-slate-700 hover:shadow-md hover:border-wine-300 dark:hover:border-slate-500 transition-all group relative flex flex-col gap-2 cursor-pointer"
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-wine-900 dark:text-wine-100 bg-wine-50 dark:bg-wine-900/40 px-2 py-1 rounded">
            #{order.id.slice(0, 4)}
          </span>
          <span className="text-xs text-wine-400">{new Date(order.date).toLocaleDateString()}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Deseja excluir esta Ordem de Produção?')) {
              deleteProductionOrder(order.id);
            }
          }}
          className="p-1 text-wine-300 hover:text-red-500 transition-colors"
          title="Excluir Ordem"
        >
          <X size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onPrint(order); }}
          className="p-1 text-wine-300 hover:text-wine-600 transition-colors ml-1"
          title="Imprimir OS"
        >
          <Printer size={14} />
        </button>
      </div>

      {/* Title */}
      <div>
        <h4 className="font-bold text-wine-900 dark:text-white leading-tight">
          {furnitureSpecs?.model || order.itemName}
        </h4>
        <p className="text-xs text-wine-600 dark:text-slate-400 mt-1">Cliente: {order.customerName}</p>
      </div>

      {/* Visual Reference Preview (Thumbnail) */}
      {furnitureSpecs?.visualReference && (
        <div className="h-20 w-full bg-wine-50 dark:bg-slate-900 rounded overflow-hidden mt-1 border border-wine-100 dark:border-slate-600 relative group-hover:opacity-90 transition-opacity">
          <img src={furnitureSpecs.visualReference} alt="Ref" className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="text-wine-900/50 dark:text-white/50" />
          </div>
        </div>
      )}

      {/* Specs Content (Summary) */}
      {furnitureSpecs ? (
        <div className="bg-wine-50 dark:bg-slate-700/50 p-2 rounded text-xs text-wine-800 dark:text-slate-200 mt-1 border border-wine-100 dark:border-slate-600">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {furnitureSpecs.foam && furnitureSpecs.foam.length > 0 && (
              <div className="col-span-2 truncate"><span className="font-bold">Espuma:</span> {furnitureSpecs.foam.join(', ')}</div>
            )}
            <div className="col-span-2 text-wine-400 dark:text-slate-500 text-[10px] text-center mt-1 font-medium uppercase tracking-wide">
              Ver OS Completa
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-wine-50 dark:bg-slate-700 p-2 rounded text-xs text-wine-800 dark:text-slate-300 mb-2 whitespace-pre-wrap line-clamp-3">
          <span className="font-semibold block mb-1">Especificações:</span>
          {order.specs}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-2 border-t border-wine-50 dark:border-slate-700 mt-1">
        {/* BACKWARDS NAVIGATION */}
        <div>
          {order.status === 'IN_PROGRESS' && (
            <button
              onClick={(e) => { e.stopPropagation(); updateProductionOrderStatus(order.id, 'PENDING'); }}
              className="flex items-center gap-1 text-xs font-bold text-wine-400 hover:text-wine-600 dark:text-slate-500 dark:hover:text-slate-300 px-2 py-1 rounded transition-colors"
              title="Voltar para Pendente"
            >
              <ArrowLeft size={14} /> Voltar
            </button>
          )}
          {order.status === 'COMPLETED' && (
            <button
              onClick={(e) => { e.stopPropagation(); updateProductionOrderStatus(order.id, 'IN_PROGRESS'); }}
              className="flex items-center gap-1 text-xs font-bold text-wine-400 hover:text-wine-600 dark:text-slate-500 dark:hover:text-slate-300 px-2 py-1 rounded transition-colors"
              title="Voltar para Produção"
            >
              <ArrowLeft size={14} /> Voltar
            </button>
          )}
        </div>

        {/* FORWARD NAVIGATION */}
        <div>
          {order.status === 'PENDING' && (
            <button
              onClick={(e) => { e.stopPropagation(); updateProductionOrderStatus(order.id, 'IN_PROGRESS'); }}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 px-2 py-1 rounded transition-colors"
            >
              Iniciar <ArrowRight size={14} />
            </button>
          )}
          {order.status === 'IN_PROGRESS' && (
            showConfirm ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateProductionOrderStatus(order.id, 'COMPLETED');
                    setShowConfirm(false);
                  }}
                  className="text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-2 py-1 rounded transition-colors"
                >
                  Sim
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirm(false);
                  }}
                  className="text-xs font-bold text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 px-2 py-1 rounded transition-colors"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirm(true);
                }}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 px-2 py-1 rounded transition-colors"
              >
                Concluir <CheckCircle size={14} />
              </button>
            )
          )}
          {order.status === 'COMPLETED' && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={14} /> Finalizado
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const Production: React.FC = () => {
  const { productionOrders, updateProductionOrderStatus, addProductionOrder, addNotification, companySettings } = useAppStore();
  const isMobile = useIsMobile();
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmDetail, setShowConfirmDetail] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    customerName: '',
    customerPhone: '',
    itemName: '',
    quantity: 1
  });
  const [manualSpecs, setManualSpecs] = useState<{ type: 'INTERNAL' | 'OUTSOURCED', data: string } | null>(null);
  const [showSpecsModal, setShowSpecsModal] = useState(false);

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('PENDING');

  // Date Filter State
  type TimeRange = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';
  const [timeRange, setTimeRange] = useState<TimeRange>('MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const isInRange = (dateString: string) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const dateToCheck = new Date(d.valueOf() + d.getTimezoneOffset() * 60 * 1000);
    dateToCheck.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (timeRange === 'CUSTOM') {
      if (customStart && dateToCheck < new Date(customStart)) return false;
      if (customEnd && dateToCheck > new Date(customEnd)) return false;
      return true;
    }
    if (timeRange === 'TODAY') return dateToCheck.getTime() === today.getTime();
    if (timeRange === 'WEEK') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return dateToCheck >= weekAgo && dateToCheck <= today;
    }
    if (timeRange === 'MONTH') return dateToCheck.getMonth() === selectedMonth && dateToCheck.getFullYear() === selectedYear;
    if (timeRange === 'YEAR') return dateToCheck.getFullYear() === selectedYear;
    return true;
  };

  // --- FILTRAGEM ---
  const filteredOrders = productionOrders.filter(o => {
    // Filtro de Texto
    const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerPhone && o.customerPhone.includes(searchTerm));

    (o.customerPhone && o.customerPhone.includes(searchTerm));

    // Filtro de Mês / Periodo
    const matchesMonth = isInRange(o.date);

    return matchesSearch && matchesMonth;
  });

  const pending = filteredOrders.filter(o => o.status === 'PENDING');
  const inProgress = filteredOrders.filter(o => o.status === 'IN_PROGRESS');
  const completed = filteredOrders.filter(o => o.status === 'COMPLETED');

  const [printOrder, setPrintOrder] = useState<ProductionOrder | null>(null);

  const handlePrintOS = (order: ProductionOrder) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
      // Clear after print dialog closes (approx) or keep it hidden
      setTimeout(() => setPrintOrder(null), 1000);
    }, 100);
  };

  const handleOpenDetails = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setIsImageZoomed(false);
  };

  const handleBackToBoard = () => {
    setSelectedOrder(null);
    setIsImageZoomed(false);
  };

  const handleCreateManualOrder = async () => {
    if (!manualForm.customerName || !manualForm.itemName || !manualSpecs) {
      alert('Preencha os dados básicos e as especificações da produção.');
      return;
    }

    // addProductionOrder and addNotification are already destructured at the component level

    const newOrder: ProductionOrder = {
      id: getUUID(),
      customerName: manualForm.customerName,
      customerPhone: manualForm.customerPhone,
      itemName: manualForm.itemName,
      quantity: manualForm.quantity,
      specs: manualSpecs.data,
      status: 'PENDING',
      date: formatISO(new Date())
    };

    await addProductionOrder(newOrder);
    addNotification('Ordem de produção manual criada!', 'success');
    
    // Reset state
    setShowManualModal(false);
    setManualForm({ customerName: '', customerPhone: '', itemName: '', quantity: 1 });
    setManualSpecs(null);
  };

  // --- MOBILE LAYOUT ---
  if (isMobile && !selectedOrder) {
    const tabOrders = mobileTab === 'PENDING' ? pending : mobileTab === 'IN_PROGRESS' ? inProgress : completed;

    return (
      <div className="pb-20 pt-4 space-y-4">
        {/* Header */}
        <div className="px-4 mb-2">
          <h1 className="text-lg font-black text-wine-900 dark:text-white">Produção</h1>
          <p className="text-sm text-wine-500 dark:text-slate-400">Gerencie suas ordens</p>
        </div>

        {/* Search */}
        <div className="px-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              className="w-full pl-10 p-2 border rounded-lg mobile-search-input"
              placeholder="Buscar ordem..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 flex gap-2 overflow-x-auto pb-2 snap-x">
          <button
            onClick={() => setMobileTab('PENDING')}
            className={`mobile-tab ${mobileTab === 'PENDING' ? 'active' : ''}`}
          >
            A Fazer {pending.length > 0 && <span className="ml-1 text-xs font-black">{pending.length}</span>}
          </button>
          <button
            onClick={() => setMobileTab('IN_PROGRESS')}
            className={`mobile-tab ${mobileTab === 'IN_PROGRESS' ? 'active' : ''}`}
          >
            Produzindo {inProgress.length > 0 && <span className="ml-1 text-xs font-black">{inProgress.length}</span>}
          </button>
          <button
            onClick={() => setMobileTab('COMPLETED')}
            className={`mobile-tab ${mobileTab === 'COMPLETED' ? 'active' : ''}`}
          >
            Concluído {completed.length > 0 && <span className="ml-1 text-xs font-black">{completed.length}</span>}
          </button>
        </div>

        {/* Order List */}
        <div className="px-4 space-y-2">
          {tabOrders.map(order => (
            <div
              key={order.id}
              onClick={() => handleOpenDetails(order)}
              className="mobile-card flex flex-col gap-2 cursor-pointer border-l-4 border-l-wine-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-bold text-sm text-wine-900 dark:text-white">#{order.id.slice(0, 4)}</p>
                  <p className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm line-clamp-2 max-w-[140px] text-wine-900 dark:text-white">{order.itemName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-wine-100 dark:border-slate-700 pt-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Cliente</p>
                  <p className="font-bold text-sm text-wine-900 dark:text-white">{order.customerName.split(' ')[0]}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (order.status === 'PENDING') {
                      updateProductionOrderStatus(order.id, 'IN_PROGRESS');
                    } else if (order.status === 'IN_PROGRESS') {
                      if (confirm('Deseja marcar como concluído?')) {
                        updateProductionOrderStatus(order.id, 'COMPLETED');
                      }
                    }
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold text-white transition-all ${
                    order.status === 'PENDING' ? 'bg-blue-600 active:bg-blue-700' : 'bg-green-600 active:bg-green-700'
                  }`}
                >
                  {order.status === 'PENDING' ? 'Iniciar' : 'Concluir'}
                </button>
              </div>
            </div>
          ))}
          {tabOrders.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Nenhuma ordem nesta etapa</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- FULL PAGE DETAIL VIEW ---
  if (selectedOrder) {
    const specs = parseSpecs(selectedOrder.specs);

    return (
      <div className="space-y-6 animate-fade-in pb-10">
        {/* Full Screen Image Zoom (Lightbox) */}
        {isImageZoomed && specs?.visualReference && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-scale-in"
            onClick={() => setIsImageZoomed(false)}
          >
            <div className="absolute top-4 right-4 text-white/70 hover:text-white">
              <X size={40} />
            </div>
            <img
              src={specs.visualReference}
              alt="Zoom Ref"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="absolute bottom-6 text-white/50 text-sm">Clique em qualquer lugar para fechar</p>
          </div>
        )}

        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToBoard}
            className="flex items-center gap-2 text-wine-600 hover:text-wine-900 dark:text-slate-300 dark:hover:text-white transition-colors bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-wine-100 dark:border-slate-700 shadow-sm"
          >
            <ArrowLeft size={20} /> Voltar para o Quadro
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-wine-400 dark:text-slate-500 uppercase tracking-wider font-bold">Status Atual</p>
              <Badge color={selectedOrder.status === 'COMPLETED' ? 'green' : (selectedOrder.status === 'IN_PROGRESS' ? 'blue' : 'yellow')}>
                {selectedOrder.status === 'COMPLETED' ? 'Concluído' : (selectedOrder.status === 'IN_PROGRESS' ? 'Em Produção' : 'Pendente')}
              </Badge>
            </div>

            {/* Status Controls in Detail View */}
            <div className="flex gap-2">
              {selectedOrder.status === 'PENDING' && (
                <Button onClick={() => updateProductionOrderStatus(selectedOrder.id, 'IN_PROGRESS')}>
                  Iniciar Produção <PlayCircle size={18} className="ml-2" />
                </Button>
              )}
              {selectedOrder.status === 'IN_PROGRESS' && (
                showConfirmDetail ? (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        updateProductionOrderStatus(selectedOrder.id, 'COMPLETED');
                        setShowConfirmDetail(false);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      Sim
                    </Button>
                    <Button
                      onClick={() => setShowConfirmDetail(false)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
                    >
                      Não
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setShowConfirmDetail(true)}>
                    Concluir Pedido <CheckCircle size={18} className="ml-2" />
                  </Button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Specs & Info (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-t-4 border-t-wine-900">
              <div className="flex justify-between items-start border-b border-wine-100 dark:border-slate-700 pb-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-wine-900 dark:text-white mb-1">
                    {specs?.model || selectedOrder.itemName}
                  </h2>
                  <div className="flex items-center gap-4 text-wine-600 dark:text-slate-400 text-sm">
                    <span className="flex items-center gap-1"><User size={14} /> {selectedOrder.customerName}</span>
                    <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(selectedOrder.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-wine-100 dark:text-slate-700">#{selectedOrder.id.slice(0, 4)}</span>
                </div>
              </div>

              {/* Customer Contact Info */}
              {(selectedOrder.customerPhone || selectedOrder.customerAddress) && (
                <div className="bg-wine-50 dark:bg-slate-700/30 p-4 rounded-lg border border-wine-100 dark:border-slate-700 mb-6 flex flex-wrap gap-6">
                  {selectedOrder.customerPhone && (
                    <div className="flex items-center gap-2 text-wine-800 dark:text-slate-200">
                      <Phone className="text-wine-400" size={18} />
                      <span className="font-semibold">{selectedOrder.customerPhone}</span>
                    </div>
                  )}
                  {selectedOrder.customerAddress && (
                    <div className="flex items-center gap-2 text-wine-800 dark:text-slate-200">
                      <MapPin className="text-wine-400" size={18} />
                      <span>{selectedOrder.customerAddress}</span>
                    </div>
                  )}
                </div>
              )}

              {specs ? (
                <div className="space-y-4">
                  <h3 className="font-bold text-wine-900 dark:text-white flex items-center gap-2 text-lg">
                    <FileText className="text-wine-500" /> Especificações Técnicas
                  </h3>

                  <div className="overflow-hidden rounded-xl border border-wine-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-wine-100 dark:divide-slate-700">
                        <tr className="bg-wine-50 dark:bg-slate-700/50">
                          <td className="py-3 px-4 font-bold text-wine-900 dark:text-white w-1/3 border-r border-wine-100 dark:border-slate-700">Espuma</td>
                          <td className="py-3 px-4 text-wine-800 dark:text-slate-200">{specs.foam?.join(', ') || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-bold text-wine-900 dark:text-white border-r border-wine-100 dark:border-slate-700">Braço</td>
                          <td className="py-3 px-4 text-wine-800 dark:text-slate-200">
                            <div className="flex flex-wrap gap-2 items-center">
                              <span>{specs.arm?.types?.join(', ') || '-'}</span>
                              {specs.arm?.berola?.has && <Badge color="gray">Berola: {specs.arm.berola.size || '?'}cm</Badge>}
                            </div>
                          </td>
                        </tr>
                        <tr className="bg-wine-50 dark:bg-slate-700/50">
                          <td className="py-3 px-4 font-bold text-wine-900 dark:text-white border-r border-wine-100 dark:border-slate-700">Assento</td>
                          <td className="py-3 px-4 text-wine-800 dark:text-slate-200">
                            <div className="flex flex-col gap-1">
                              <span>{specs.seatConfig?.types?.join(', ') || '-'}</span>
                              <div className="flex gap-2">
                                {specs.seatConfig?.ponto && <Badge color="blue">Ponto</Badge>}
                                {specs.seatConfig?.berola?.has && <Badge color="gray">Berola: {specs.seatConfig.berola.size}cm</Badge>}
                              </div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-bold text-wine-900 dark:text-white border-r border-wine-100 dark:border-slate-700">Encosto</td>
                          <td className="py-3 px-4 text-wine-800 dark:text-slate-200">
                            <div className="flex flex-col gap-1">
                              <span>{specs.backrestConfig?.types?.join(', ') || '-'}</span>
                              <div className="flex gap-2">
                                {specs.backrestConfig?.ponto && <Badge color="blue">Ponto</Badge>}
                                {specs.backrestConfig?.berola?.has && <Badge color="gray">Berola: {specs.backrestConfig.berola.size}cm</Badge>}
                              </div>
                            </div>
                          </td>
                        </tr>
                        <tr className="bg-wine-50 dark:bg-slate-700/50">
                          <td className="py-3 px-4 font-bold text-wine-900 dark:text-white border-r border-wine-100 dark:border-slate-700">Módulos</td>
                          <td className="py-3 px-4 text-wine-800 dark:text-slate-200 font-mono text-lg">{specs.modules?.join(' + ') || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {specs.observations && (
                    <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                      <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200 uppercase mb-1">Observações Importantes</p>
                      <p className="text-wine-900 dark:text-white italic text-lg leading-relaxed">"{specs.observations}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 p-6 rounded border border-wine-200 dark:border-slate-700 min-h-[200px]">
                  <p className="font-bold text-wine-900 dark:text-white mb-2 text-lg">Descrição do Pedido:</p>
                  <p className="text-wine-800 dark:text-slate-300 whitespace-pre-wrap text-lg">{selectedOrder.specs}</p>
                </div>
              )}
            </Card>
          </div>

          {/* Right: Visual Reference (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-wine-100 dark:border-slate-700 p-6 sticky top-6">
              <h3 className="font-bold text-wine-900 dark:text-white flex items-center gap-2 mb-4 text-lg">
                <ImageIcon className="text-wine-500" /> Referência Visual
              </h3>

              {specs?.visualReference ? (
                <div className="space-y-3">
                  <div
                    className="relative w-full aspect-square bg-slate-100 dark:bg-slate-900 rounded-lg border-2 border-dashed border-wine-200 dark:border-slate-600 flex items-center justify-center cursor-zoom-in overflow-hidden group"
                    onClick={() => setIsImageZoomed(true)}
                  >
                    <img
                      src={specs.visualReference}
                      alt="Referência Visual"
                      className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="bg-white/90 dark:bg-slate-800/90 text-wine-900 dark:text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-bold backdrop-blur-sm">
                        <ZoomIn size={20} /> Ampliar
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-sm text-wine-400 dark:text-slate-500">
                    Clique na imagem para expandir em tela cheia
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-wine-50 dark:bg-slate-700/30 rounded-lg border-2 border-dashed border-wine-200 dark:border-slate-600 text-wine-400 dark:text-slate-500">
                  <ImageIcon size={64} className="mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma referência visual anexada</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // --- DEFAULT BOARD VIEW ---
  return (
    <>
      <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
        <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-wine-900 dark:text-white flex items-center gap-2">
              <Wrench /> Controle de Produção (OS)
            </h2>
            <p className="text-wine-500 dark:text-slate-400 text-sm mt-1">
              Gerencie o fluxo de produção. Clique nos cards para abrir a OS completa.
            </p>
          </div>

          <Button onClick={() => setShowManualModal(true)} className="flex items-center gap-2">
            <Plus size={18} /> Nova Produção
          </Button>

          {/* BARRA DE FILTROS (MÊS E PESQUISA) */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {/* Advanced Date Filter Bar */}
            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-wine-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center gap-2">
              <div className="flex bg-wine-50 dark:bg-slate-700 p-1 rounded-lg">
                <button
                  onClick={() => setTimeRange('TODAY')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${timeRange === 'TODAY' ? 'bg-white text-wine-900 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-wine-500 hover:text-wine-900 dark:text-slate-400'}`}
                >
                  Hoje
                </button>
                <button
                  onClick={() => setTimeRange('WEEK')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${timeRange === 'WEEK' ? 'bg-white text-wine-900 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-wine-500 hover:text-wine-900 dark:text-slate-400'}`}
                >
                  7 Dias
                </button>
                <button
                  onClick={() => setTimeRange('MONTH')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${timeRange === 'MONTH' ? 'bg-white text-wine-900 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-wine-500 hover:text-wine-900 dark:text-slate-400'}`}
                >
                  Mês
                </button>
                <button
                  onClick={() => setTimeRange('YEAR')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${timeRange === 'YEAR' ? 'bg-white text-wine-900 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-wine-500 hover:text-wine-900 dark:text-slate-400'}`}
                >
                  Ano
                </button>
                <button
                  onClick={() => setTimeRange('CUSTOM')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${timeRange === 'CUSTOM' ? 'bg-white text-wine-900 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-wine-500 hover:text-wine-900 dark:text-slate-400'}`}
                >
                  Personalizado
                </button>
              </div>

              <div className="flex items-center gap-2">
                {(timeRange === 'MONTH' || timeRange === 'YEAR') && (
                  <>
                    {timeRange === 'MONTH' && (
                      <select
                        value={selectedMonth}
                        onChange={(e) => { setSelectedMonth(Number(e.target.value)); setTimeRange('MONTH'); }}
                        className="bg-transparent border border-wine-200 dark:border-slate-600 rounded px-2 py-1.5 text-xs text-wine-800 dark:text-white outline-none focus:border-wine-500"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>
                        ))}
                      </select>
                    )}
                    <select
                      value={selectedYear}
                      onChange={(e) => { setSelectedYear(Number(e.target.value)); if (timeRange !== 'MONTH') setTimeRange('YEAR'); }}
                      className="bg-transparent border border-wine-200 dark:border-slate-600 rounded px-2 py-1.5 text-xs text-wine-800 dark:text-white outline-none focus:border-wine-500"
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </>
                )}

                {timeRange === 'CUSTOM' && (
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={customStart}
                      onChange={e => setCustomStart(e.target.value)}
                      className="border border-wine-200 dark:border-slate-600 rounded px-2 py-1 text-xs outline-none focus:border-wine-500 dark:bg-slate-900 dark:text-white"
                    />
                    <span className="text-wine-300">-</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={e => setCustomEnd(e.target.value)}
                      className="border border-wine-200 dark:border-slate-600 rounded px-2 py-1 text-xs outline-none focus:border-wine-500 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 text-wine-300 dark:text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Filtrar por cliente, item..."
                className="w-full pl-10 pr-4 py-2 border border-wine-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-wine-500 bg-white dark:bg-slate-700 text-black dark:text-white placeholder-wine-400 dark:placeholder-slate-400 shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex md:grid md:grid-cols-3 gap-6 flex-1 min-h-0 overflow-x-auto snap-x snap-mandatory custom-scrollbar pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
          {/* PENDING COLUMN */}
          <div className="bg-wine-50/50 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col border border-wine-100 dark:border-slate-700 min-w-[85vw] sm:min-w-[300px] md:min-w-0 snap-center shrink-0 md:shrink">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-wine-800 dark:text-white flex items-center gap-2">
                <Clock size={18} /> A Fazer
              </h3>
              <span className="bg-wine-200 dark:bg-slate-600 text-wine-800 dark:text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {pending.map(order => <OrderCard key={order.id} order={order} onClick={handleOpenDetails} onPrint={handlePrintOS} />)}
              {pending.length === 0 && <p className="text-center text-xs text-wine-300 dark:text-slate-500 py-4">Nenhum pedido pendente neste mês</p>}
            </div>
          </div>

          {/* IN PROGRESS COLUMN */}
          <div className="bg-blue-50/30 dark:bg-blue-900/10 rounded-xl p-4 flex flex-col border border-blue-100 dark:border-blue-900/30 min-w-[85vw] sm:min-w-[300px] md:min-w-0 snap-center shrink-0 md:shrink">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <PlayCircle size={18} /> Em Produção
              </h3>
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-bold px-2 py-0.5 rounded-full">
                {inProgress.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {inProgress.map(order => <OrderCard key={order.id} order={order} onClick={handleOpenDetails} onPrint={handlePrintOS} />)}
              {inProgress.length === 0 && <p className="text-center text-xs text-blue-300 dark:text-slate-500 py-4">Nada em produção neste mês</p>}
            </div>
          </div>

          {/* COMPLETED COLUMN */}
          <div className="bg-emerald-50/30 dark:bg-emerald-900/10 rounded-xl p-4 flex flex-col border border-emerald-100 dark:border-emerald-900/30 min-w-[85vw] sm:min-w-[300px] md:min-w-0 snap-center shrink-0 md:shrink">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle size={18} /> Concluídos
              </h3>
              <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold px-2 py-0.5 rounded-full">
                {completed.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {completed.map(order => <OrderCard key={order.id} order={order} onClick={handleOpenDetails} onPrint={handlePrintOS} />)}
              {completed.length === 0 && <p className="text-center text-xs text-emerald-300 dark:text-slate-500 py-4">Nenhum pedido concluído neste mês</p>}
            </div>
          </div>
        </div>
      </div>

      {/* PRINTABLE OS */}
      <div id="printable-os" className="hidden print:block text-black font-sans bg-white">
        <style>{`
          @media print {
            @page { margin: 0; size: auto; }
            body * { visibility: hidden; height: 0; overflow: hidden; }
            #printable-os, #printable-os * { visibility: visible; height: auto; overflow: visible; }
            #printable-os { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100vw; 
              min-height: 100vh; 
              z-index: 9999; 
              padding: 20mm; 
              background: white !important; 
              box-sizing: border-box;
            }
            
            .os-container { max-width: 210mm; margin: 0 auto; color: black; font-size: 12px; }
            .os-header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
            .os-title { font-size: 20px; font-weight: bold; color: #333; }
            .os-meta { text-align: right; font-size: 12px; color: #666; }
            
            .section-title { font-size: 14px; font-weight: bold; color: #881337; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 3px; display: flex; align-items: center; gap: 8px; }
            
            .specs-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .specs-table tr { border-bottom: 1px solid #f0f0f0; }
            .specs-table th { text-align: left; padding: 6px 0; width: 25%; color: #881337; font-weight: bold; vertical-align: top; font-size: 11px; }
            .specs-table td { text-align: left; padding: 6px 0; color: #333; vertical-align: top; font-size: 11px; }
            
            .obs-box { background-color: #fffbeb; border-left: 4px solid #fbbf24; padding: 10px; margin-top: 10px; }
            .obs-title { font-weight: bold; font-size: 10px; color: #92400e; margin-bottom: 3px; text-transform: uppercase; }
            .obs-content { font-style: italic; color: #333; font-size: 11px; }
            
            .ref-box { margin-top: 15px; text-align: center; page-break-inside: avoid; }
            .ref-img { max-height: 250px; max-width: 100%; object-fit: contain; border: 1px solid #eee; border-radius: 8px; }
          }
        `}</style>
        {printOrder && (
          <div className="os-container">
            {/* Header */}
            <div className="os-header">
              <div>
                <h1 className="os-title">Ordem de Produção</h1>
                <p className="os-meta" style={{ textAlign: 'left', marginTop: '5px' }}>#{printOrder.id.slice(0, 6)}</p>
              </div>
              <div className="os-meta">
                <p><strong>Cliente:</strong> {printOrder.customerName}</p>
                <p><strong>Data:</strong> {new Date(printOrder.date).toLocaleDateString()}</p>
                <p><strong>Item:</strong> {printOrder.itemName}</p>
              </div>
            </div>

            {/* Content Body */}
            <div>
              <div className="section-title">
                <span>📄</span> Especificações Técnicas
              </div>

              {(() => {
                const s = parseSpecs(printOrder.specs);
                if (!s) return <p className="p-4 bg-gray-50 border">{printOrder.specs}</p>;

                return (
                  <>
                    <table className="specs-table">
                      <tbody>
                        <tr>
                          <th>Modelo</th>
                          <td className="text-lg font-bold">{s.model || printOrder.itemName}</td>
                        </tr>
                        <tr>
                          <th>Espuma</th>
                          <td>{s.foam?.join(', ') || '-'}</td>
                        </tr>
                        <tr>
                          <th>Braço</th>
                          <td>
                            <div>{s.arm?.types?.join(', ') || '-'}</div>
                            {s.arm?.berola?.has && <div className="text-sm text-gray-500 mt-1">Berola: {s.arm.berola.size}cm</div>}
                          </td>
                        </tr>
                        <tr>
                          <th>Assento</th>
                          <td>
                            <div>{s.seatConfig?.types?.join(', ') || '-'}</div>
                            {s.seatConfig?.ponto && <div className="inline-block bg-gray-100 px-2 rounded text-xs mt-1 mr-2">Com Ponto</div>}
                            {s.seatConfig?.berola?.has && <div className="inline-block bg-gray-100 px-2 rounded text-xs mt-1">Berola: {s.seatConfig.berola.size}cm</div>}
                          </td>
                        </tr>
                        <tr>
                          <th>Encosto</th>
                          <td>
                            <div>{s.backrestConfig?.types?.join(', ') || '-'}</div>
                            {s.backrestConfig?.ponto && <div className="inline-block bg-gray-100 px-2 rounded text-xs mt-1 mr-2">Com Ponto</div>}
                            {s.backrestConfig?.berola?.has && <div className="inline-block bg-gray-100 px-2 rounded text-xs mt-1">Berola: {s.backrestConfig.berola.size}cm</div>}
                          </td>
                        </tr>
                        <tr>
                          <th>Módulos</th>
                          <td>{s.modules?.join(' + ') || '-'}</td>
                        </tr>
                        <tr>
                          <th>Qtd. Assentos</th>
                          <td>{s.seatsCount?.join(', ') || '-'}</td>
                        </tr>
                      </tbody>
                    </table>

                    {s.observations && (
                      <div className="obs-box">
                        <div className="obs-title">Observações Importantes</div>
                        <div className="obs-content">"{s.observations}"</div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="mt-12 pt-4 border-t text-center text-xs text-gray-400">
              Impresso por {companySettings?.name?.toUpperCase() || 'SISTEMA'} em {new Date().toLocaleString()}
            </div>

          </div>
        )}
      </div>

      {/* MODAL: NOVA PRODUÇÃO MANUAL */}
      <Modal isOpen={showManualModal} onClose={() => setShowManualModal(false)} title="Nova Produção Independente">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Nome do Cliente *" 
              value={manualForm.customerName} 
              onChange={e => setManualForm({ ...manualForm, customerName: e.target.value })} 
              placeholder="Ex: João Silva"
            />
            <Input 
              label="Telefone" 
              value={manualForm.customerPhone} 
              onChange={e => setManualForm({ ...manualForm, customerPhone: e.target.value })} 
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Item / Modelo *" 
              value={manualForm.itemName} 
              onChange={e => setManualForm({ ...manualForm, itemName: e.target.value })} 
              placeholder="Ex: Sofá Retrátil"
            />
            <Input 
              label="Quantidade" 
              type="number"
              value={manualForm.quantity} 
              onChange={e => setManualForm({ ...manualForm, quantity: Number(e.target.value) })} 
            />
          </div>

          <div className="pt-2">
            <label className="text-xs font-bold uppercase text-wine-600 dark:text-slate-400 mb-1 block">Especificações Técnicas</label>
            {manualSpecs ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex justify-between items-center">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle size={18} />
                  <span className="text-sm font-bold">Especificações Definidas ({manualSpecs.type === 'INTERNAL' ? 'Interna' : 'Terceirizada'})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowSpecsModal(true)}>Alterar</Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full border-dashed" onClick={() => setShowSpecsModal(true)}>
                <Plus size={18} className="mr-2" /> Definir Especificações (OS)
              </Button>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-wine-100 dark:border-slate-700">
            <Button variant="outline" onClick={() => setShowManualModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateManualOrder}>Criar Ordem de Produção</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: DEFINIR ESPECIFICAÇÕES (REUSANDO FORM) */}
      <Modal isOpen={showSpecsModal} onClose={() => setShowSpecsModal(false)} title="Especificações da Produção">
        <ServiceConfigForm 
          item={{ name: manualForm.itemName || 'Produto Manual', category: 'Produção' } as Product}
          initialSpecs={manualSpecs?.data}
          onConfirm={(type, data) => {
            setManualSpecs({ type, data });
            setShowSpecsModal(false);
          }}
        />
      </Modal>
    </>
  );
};
