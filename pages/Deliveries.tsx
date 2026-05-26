
import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Modal, Input, Badge } from '../components/UI';
import { Truck, MapPin, Phone, Clock, Calendar, CheckCircle, Navigation, Edit2, MessageCircle, Printer, FileText, Trash2, Kanban, RotateCcw } from 'lucide-react';
import { Delivery } from '../types';

const getWhatsAppLink = (notes?: string) => {
  const phoneMatch = notes?.match(/\(\d{2}\)\s\d{4,5}-\d{4}/);
  if (phoneMatch) {
    const cleanPhone = phoneMatch[0].replace(/\D/g, '');
    return `https://wa.me/55${cleanPhone}`;
  }
  return null;
};

// Componente para o Recibo Impresso (Fica escondido na tela, só aparece no print)
const PrintableReceipt: React.FC<{ delivery: Delivery; company: any }> = ({ delivery, company }) => {
  const renderVia = (showSignatures: boolean) => (
    <div className="p-5 border-2 border-wine-900 rounded-lg bg-white text-black mb-4 last:mb-0 relative min-h-[380px] flex flex-col font-sans">
      <div className="flex justify-between items-start border-b-2 border-wine-900 pb-2 mb-2">
        <div className="flex items-center gap-3">
          {company.logo && <img src={company.logo} alt="Logo" className="w-12 h-12 object-contain" />}
          <div>
            <h2 className="text-lg font-bold uppercase leading-tight">{company.name}</h2>
            <p className="text-[10px] leading-tight">{company.address}</p>
            <p className="text-[10px] leading-tight">CNPJ: {company.cnpj} | Tel: {company.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-md font-bold text-wine-900 leading-tight">RECIBO DE ENTREGA</h3>
          <p className="text-xs font-bold">#{delivery.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-[10px]">Impressão: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="space-y-0.5">
          <h4 className="text-[10px] font-bold uppercase text-wine-800 border-b border-wine-100">Dados do Cliente</h4>
          <p className="text-xs font-bold">{delivery.customerName}</p>
          <p className="text-[10px] leading-tight">{delivery.address}</p>
          <p className="text-[10px] font-medium">
            {delivery.notes?.match(/\(\d{2}\)\s\d{4,5}-\d{4}/)?.[0] || 'Contato não informado'}
          </p>
        </div>
        <div className="space-y-0.5 text-right">
          <h4 className="text-[10px] font-bold uppercase text-wine-800 border-b border-wine-100">Informações de Entrega</h4>
          <p className="text-xs font-bold">Previsão: {new Date(delivery.date).toLocaleDateString('pt-BR')}</p>
          {delivery.scheduledTime && <p className="text-xs font-bold text-wine-700">Horário: {delivery.scheduledTime}</p>}
          <p className="text-[10px] text-wine-600">Origem: {delivery.origin === 'PRODUCTION' ? 'Produção' : 'Venda Direta'}</p>
        </div>
      </div>

      <div className="flex-1 border-t-2 border-wine-900 pt-2 mt-1">
        <h4 className="text-[10px] font-bold uppercase mb-1">Itens e Especificações Técnicas:</h4>
        <div className="bg-wine-50 p-3 rounded border border-wine-200 min-h-[100px] text-[11px] leading-snug whitespace-pre-wrap">
          {delivery.notes || "Sem detalhes adicionais."}
        </div>
      </div>

      {showSignatures ? (
        <div className="mt-4 grid grid-cols-2 gap-8 pt-4 border-t border-dashed border-wine-300">
          <div className="text-center">
            <div className="w-full border-b border-black mb-1"></div>
            <p className="text-[9px] uppercase font-bold text-wine-900">{company.name}</p>
          </div>
          <div className="text-center">
            <div className="w-full border-b border-black mb-1"></div>
            <p className="text-[9px] uppercase font-bold">Assinatura do Cliente (Recebedor)</p>
            <p className="text-[8px]">Recebido em: ____/____/____  RG/CPF: ____________</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-dashed border-wine-300 flex flex-col items-center justify-center flex-1">
          <p className="text-[11px] font-bold text-wine-900 uppercase mb-4">Sua opinião é muito importante para nós!</p>
          <div className="bg-white p-2 border-2 border-wine-200 rounded-xl shadow-sm">
            <img
              src={`https://quickchart.io/qr?text=${encodeURIComponent('https://g.page/r/CcDa5AQjP8cvEAE/review')}&size=120&margin=1&ecLevel=H`}
              alt="QR Code"
              className="w-32 h-32"
            />
          </div>
        </div>
      )}

      <div className="absolute top-2 right-2 opacity-10 transform rotate-12 pointer-events-none">
        <Truck size={40} />
      </div>
    </div>
  );

  return (
    <div id="receipt-print-area" className="hidden print:block fixed inset-0 z-[9999] bg-white text-black p-6 overflow-visible">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden !important; }
          #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
          #receipt-print-area { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 210mm !important; 
            height: 297mm !important; 
            margin: 0 !important; 
            padding: 10mm !important;
            background: white !important;
          }
          .print-split { border-top: 1px dashed #000; margin: 15mm 0; }
        }
      `}</style>
      <div className="flex flex-col h-full">
        {renderVia(true)}
        <div className="print-split"></div>
        {renderVia(false)}
      </div>
    </div>
  );
};

const getDeliveryStatusColor = (delivery: Delivery) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (delivery.status === 'DELIVERED') return 'green';

  const deliveryDate = new Date(delivery.date + 'T12:00:00'); // Fix time zone offset for comparison
  deliveryDate.setHours(0, 0, 0, 0);

  if (deliveryDate < today) return 'red'; // Late
  if (deliveryDate.getTime() === today.getTime() || deliveryDate.getTime() === tomorrow.getTime()) return 'yellow'; // Urgent/Upcoming

  return 'slate'; // Future
};

const DeliveryCard: React.FC<{ delivery: Delivery; onEdit: (d: Delivery) => void; onPrint: (d: Delivery) => void }> = ({ delivery, onEdit, onPrint }) => {
  const { updateDeliveryStatus, deleteDelivery } = useAppStore();
  const waLink = getWhatsAppLink(delivery.notes);
  const statusColor = getDeliveryStatusColor(delivery);

  const borderColor = {
    red: 'border-l-4 border-l-red-500',
    yellow: 'border-l-4 border-l-yellow-500',
    green: 'border-l-4 border-l-emerald-500',
    slate: 'border-l-4 border-l-slate-300 dark:border-l-slate-600'
  }[statusColor];

  const dateBadgeColor = {
    red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
    slate: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
  }[statusColor];

  return (
    <div className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-wine-100 dark:border-slate-700 hover:shadow-md transition-all group relative animate-fade-in ${borderColor}`}>
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-bold text-wine-900 dark:text-wine-100 bg-wine-50 dark:bg-wine-900/50 px-2 py-1 rounded">
          #{delivery.id.slice(0, 4)}
        </span>
        <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded font-bold ${dateBadgeColor}`}>
          <Calendar size={12} />
          {new Date(delivery.date).toLocaleDateString('pt-BR')}
          {delivery.scheduledTime && (
            <span className="flex items-center gap-1 ml-1 font-bold text-wine-700 dark:text-wine-300">
              <Clock size={12} /> {delivery.scheduledTime}
            </span>
          )}
        </div>
      </div>

      <h4 className="font-bold text-wine-900 dark:text-white mb-1 text-lg">{delivery.customerName}</h4>

      <div className="space-y-2 mt-3">
        <div className="flex items-start gap-2 text-sm text-wine-700 dark:text-slate-300 bg-wine-50 dark:bg-slate-700/50 p-2 rounded-lg">
          <MapPin size={16} className="shrink-0 mt-0.5 text-wine-500" />
          <span className="break-words">{delivery.address}</span>
        </div>

        {delivery.notes && (
          <div className="text-xs text-wine-600 dark:text-slate-400 p-2 border border-dashed border-wine-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800">
            {delivery.notes}
          </div>
        )}

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-bold rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <MessageCircle size={16} /> Contatar via WhatsApp
          </a>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 mt-4 border-t border-wine-50 dark:border-slate-700">
        {/* Actions based on Status */}
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(delivery)}
            className="p-2 text-wine-500 hover:bg-wine-50 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Editar / Agendar"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => {
              if (confirm('Deseja excluir esta entrega?')) {
                deleteDelivery(delivery.id);
              }
            }}
            className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
            title="Excluir Entrega"
          >
            <Trash2 size={18} />
          </button>
          {delivery.status === 'IN_ROUTE' && (
            <button
              onClick={() => onPrint(delivery)}
              className="p-2 text-blue-500 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Imprimir Recibo"
            >
              <Printer size={18} />
            </button>
          )}
        </div>

        <div>
          {delivery.status === 'PENDING' && (
            <Button
              onClick={() => updateDeliveryStatus(delivery.id, 'IN_ROUTE')}
              className="text-xs px-3 py-1.5"
            >
              <Navigation size={14} className="mr-1" /> Iniciar Rota
            </Button>
          )}
          {delivery.status === 'IN_ROUTE' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateDeliveryStatus(delivery.id, 'PENDING')}
                className="p-2 text-wine-400 hover:bg-wine-50 rounded-lg transition-colors"
                title="Voltar para Aguardando"
              >
                <RotateCcw size={16} />
              </button>
              <Button
                onClick={() => updateDeliveryStatus(delivery.id, 'DELIVERED')}
                className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle size={14} className="mr-1" /> Entregue
              </Button>
            </div>
          )}
          {delivery.status === 'DELIVERED' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateDeliveryStatus(delivery.id, 'IN_ROUTE')}
                className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors border border-orange-100"
                title="Voltar para Rota"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => onPrint(delivery)}
                className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                title="Imprimir Recibo"
              >
                <Printer size={16} />
              </button>
              <Badge color="green">Concluído</Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Deliveries: React.FC = () => {
  const { deliveries, updateDelivery, companySettings } = useAppStore();
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [deliveryToPrint, setDeliveryToPrint] = useState<Delivery | null>(null);

  // Date Filter State
  type TimeRange = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';
  const [timeRange, setTimeRange] = useState<TimeRange>('MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // View Mode
  const [viewMode, setViewMode] = useState<'BOARD' | 'CALENDAR'>('BOARD');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);

  // Helper Grouping Logic
  type GroupedDeliveries = { [date: string]: Delivery[] };

  const groupPendingByDate = (pendingList: Delivery[]) => {
    const groups: GroupedDeliveries = {};
    pendingList.sort((a, b) => {
      const dateA = a.date || '9999-99-99';
      const dateB = b.date || '9999-99-99';
      return dateA.localeCompare(dateB);
    });

    pendingList.forEach(d => {
      const key = d.date || 'NoDate';
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return groups;
  };

  // Calendar Logic
  const getCalendarDays = (month: number, year: number) => {
    const days = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startPad = firstDay.getDay(); // 0 = Sunday
    const totalDays = lastDay.getDate();

    // Previous Month Padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPad - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, dateStr: new Date(year, month - 1, prevMonthLastDay - i).toISOString().split('T')[0] });
    }

    // Current Month
    for (let i = 1; i <= totalDays; i++) {
      // Fix timezone issue for ISO string locally
      const d = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, isCurrentMonth: true, dateStr });
    }

    // Next Month Padding
    const remaining = 42 - days.length; // 6 rows * 7 cols
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, isCurrentMonth: false, dateStr });
    }
    return days;
  };

  const calendarDays = getCalendarDays(selectedMonth, selectedYear);



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

  // Form State for Scheduling
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');

  // --- Filtragem ---
  const filteredDeliveries = deliveries.filter(d => isInRange(d.date));

  const pending = filteredDeliveries.filter(d => d.status === 'PENDING');
  const inRoute = filteredDeliveries.filter(d => d.status === 'IN_ROUTE');
  const delivered = filteredDeliveries.filter(d => d.status === 'DELIVERED');
  const pendingGroups = groupPendingByDate(pending);


  const openScheduleModal = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setScheduleDate(delivery.date || new Date().toISOString().split('T')[0]);
    setScheduleTime(delivery.scheduledTime || '');
    setScheduleNotes(delivery.notes || '');
    setShowScheduleModal(true);
  };

  const handlePrint = (delivery: Delivery) => {
    setDeliveryToPrint(delivery);
    // Timeout maior (2s) para garantir carga de imagens externas em conexões lentas
    setTimeout(() => {
      window.print();
    }, 2000);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery) return;

    updateDelivery({
      ...selectedDelivery,
      date: scheduleDate,
      scheduledTime: scheduleTime,
      notes: scheduleNotes
    });

    setShowScheduleModal(false);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      {/* Recibo Impresso Oculto */}
      {deliveryToPrint && <PrintableReceipt delivery={deliveryToPrint} company={companySettings} />}

      <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-wine-900 dark:text-white flex items-center gap-2">
            <Truck /> Controle Logístico & Entregas
          </h2>
          <p className="text-wine-500 dark:text-slate-400 text-sm mt-1">
            Organize o roteiro, visualize endereços e contatos, e defina horários de entrega.
          </p>
        </div>

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
      </div>

      {/* VIEW TOGGLE & CONTENT */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* VIEW SELECTOR */}
        <div className="flex justify-end mb-4">
          <div className="bg-wine-50 dark:bg-slate-700 p-1 rounded-lg flex gap-1">
            <button
              onClick={() => setViewMode('BOARD')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-2 ${viewMode === 'BOARD' ? 'bg-white shadow text-wine-900' : 'text-wine-400 hover:text-wine-800'}`}
            >
              <Kanban size={16} /> Quadro
            </button>
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-2 ${viewMode === 'CALENDAR' ? 'bg-white shadow text-wine-900' : 'text-wine-400 hover:text-wine-800'}`}
            >
              <Calendar size={16} /> Calendário
            </button>
          </div>
        </div>

        {viewMode === 'BOARD' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 overflow-x-auto pb-2">

            {/* PENDING COLUMN (GROUPED BY DATE) */}
            <div className="bg-wine-50/50 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col border border-wine-100 dark:border-slate-700 min-w-[300px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-wine-800 dark:text-wine-100 flex items-center gap-2">
                  <Clock size={18} /> Aguardando / Agendar
                </h3>
                <span className="bg-wine-200 dark:bg-slate-600 text-wine-800 dark:text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pending.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                {Object.keys(pendingGroups).sort().map(dateKey => (
                  <div key={dateKey} className="space-y-2">
                    <div className="sticky top-0 z-10 bg-wine-100/90 dark:bg-slate-700/90 backdrop-blur px-3 py-1 rounded text-xs font-bold text-wine-900 dark:text-white shadow-sm flex justify-between items-center">
                      <span>
                        {dateKey === 'NoDate'
                          ? 'Sem Data Definida'
                          : new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                      </span>
                      <span className="text-[10px] opacity-70">{pendingGroups[dateKey].length} itens</span>
                    </div>
                    {pendingGroups[dateKey].map(d => (
                      <DeliveryCard key={d.id} delivery={d} onEdit={openScheduleModal} onPrint={handlePrint} />
                    ))}
                  </div>
                ))}
                {pending.length === 0 && <p className="text-center text-xs text-wine-300 dark:text-slate-500 py-4">Nenhuma entrega pendente</p>}
              </div>
            </div>

            {/* IN ROUTE COLUMN (FLAT) */}
            <div className="bg-blue-50/30 dark:bg-blue-900/10 rounded-xl p-4 flex flex-col border border-blue-100 dark:border-blue-900/30 min-w-[300px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <Truck size={18} /> Em Rota
                </h3>
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-bold px-2 py-0.5 rounded-full">
                  {inRoute.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {inRoute.map(d => <DeliveryCard key={d.id} delivery={d} onEdit={openScheduleModal} onPrint={handlePrint} />)}
                {inRoute.length === 0 && <p className="text-center text-xs text-blue-300 dark:text-slate-500 py-4">Nenhum veículo em rota</p>}
              </div>
            </div>

            {/* DELIVERED COLUMN (FLAT) */}
            <div className="bg-emerald-50/30 dark:bg-emerald-900/10 rounded-xl p-4 flex flex-col border border-emerald-100 dark:border-emerald-900/30 min-w-[300px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle size={18} /> Entregues
                </h3>
                <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold px-2 py-0.5 rounded-full">
                  {delivered.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {/* Group Delivered by Date too? User asked for simplicity in Waiting mostly, but grouping delivered by day is nice history */}
                {delivered.map(d => <DeliveryCard key={d.id} delivery={d} onEdit={openScheduleModal} onPrint={handlePrint} />)}
                {delivered.length === 0 && <p className="text-center text-xs text-emerald-300 dark:text-slate-500 py-4">Histórico vazio</p>}
              </div>
            </div>
          </div>
        ) : (
          /* CALENDAR VIEW */
          <div className="flex-1 bg-white dark:bg-slate-800 border border-wine-100 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col">
            {/* Calendar Header Days */}
            <div className="grid grid-cols-7 border-b border-wine-100 dark:border-slate-700 bg-wine-50 dark:bg-slate-700">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-2 text-center text-xs font-bold text-wine-800 dark:text-wine-200 uppercase">{day}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-6">
              {calendarDays.map((dayObj, idx) => {
                const dayDeliveries = deliveries.filter(d => d.date === dayObj.dateStr);
                const isToday = dayObj.dateStr === new Date().toISOString().split('T')[0];
                // Logic to categorize deliveries for the calendar cell
                const lateCount = dayDeliveries.filter(d => d.status !== 'DELIVERED' && getDeliveryStatusColor(d) === 'red').length;
                const urgentCount = dayDeliveries.filter(d => d.status !== 'DELIVERED' && getDeliveryStatusColor(d) === 'yellow').length;
                const futureCount = dayDeliveries.filter(d => d.status !== 'DELIVERED' && getDeliveryStatusColor(d) === 'slate').length;
                // We can treat 'green' (delivered) separately or just filter by status='DELIVERED'
                const deliveredCount = dayDeliveries.filter(d => d.status === 'DELIVERED').length;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedCalendarDay(dayObj.dateStr);
                    }}
                    className={`
                            border-r border-b border-wine-50 dark:border-slate-700 p-2 min-h-[80px] hover:bg-wine-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer relative flex flex-col justify-between
                            ${dayObj.isCurrentMonth ? '' : 'bg-gray-50/50 dark:bg-slate-900/50 text-gray-400'}
                            ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10 shadow-inner' : ''}
                          `}
                  >
                    <span className={`text-xs font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                      {dayObj.day}
                    </span>

                    <div className="flex flex-col gap-1 w-full">
                      {/* Priority: Late > Urgent > Future > Delivered */}
                      {lateCount > 0 && (
                        <div className="text-[10px] bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900 flex justify-between items-center font-bold">
                          <span>Atrasados</span>
                          <span>{lateCount}</span>
                        </div>
                      )}
                      {urgentCount > 0 && (
                        <div className="text-[10px] bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-900 flex justify-between items-center font-bold">
                          <span>{isToday ? 'Hoje' : 'Próximos'}</span>
                          <span>{urgentCount}</span>
                        </div>
                      )}
                      {futureCount > 0 && (
                        <div className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 flex justify-between items-center">
                          <span>Agendados</span>
                          <span>{futureCount}</span>
                        </div>
                      )}
                      {deliveredCount > 0 && (
                        <div className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50 flex justify-between items-center opacity-80">
                          <span>Entregues</span>
                          <span>{deliveredCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* SCHEDULE MODAL */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Detalhes da Entrega"
      >
        <form onSubmit={handleSaveSchedule} className="space-y-4">
          <div className="bg-wine-50 dark:bg-slate-700 p-3 rounded-lg mb-4">
            <p className="font-bold text-wine-900 dark:text-white">{selectedDelivery?.customerName}</p>
            <p className="text-sm text-wine-600 dark:text-slate-300 flex items-center gap-1 mt-1">
              <MapPin size={14} /> {selectedDelivery?.address}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data Prevista"
              type="date"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
            />
            <Input
              label="Hora / Período"
              type="time"
              value={scheduleTime}
              onChange={e => setScheduleTime(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1 w-full">
            <label className="text-xs font-semibold text-wine-600 dark:text-wine-300 uppercase tracking-wider">Observações / Instruções</label>
            <textarea
              className="border border-wine-200 dark:border-slate-600 bg-wine-50 dark:bg-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-wine-500 outline-none h-24 text-black dark:text-white placeholder-wine-400"
              value={scheduleNotes}
              onChange={e => setScheduleNotes(e.target.value)}
              placeholder="Ex: Tocar interfone 102. Entregar somente pela manhã."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowScheduleModal(false)}>Cancelar</Button>
            <Button type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Modal>
      {/* SELECTED DAY MODAL (CALENDAR VIEW) */}
      <Modal
        isOpen={!!selectedCalendarDay}
        onClose={() => setSelectedCalendarDay(null)}
        title={selectedCalendarDay ? `Entregas do Dia: ${new Date(selectedCalendarDay + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
          {selectedCalendarDay && deliveries.filter(d => d.date === selectedCalendarDay).length === 0 && (
            <p className="text-center text-gray-400 py-4">Nenhuma entrega agendada para este dia.</p>
          )}
          {selectedCalendarDay && deliveries.filter(d => d.date === selectedCalendarDay).map(d => (
            <DeliveryCard key={d.id} delivery={d} onEdit={(del) => { setSelectedCalendarDay(null); openScheduleModal(del); }} onPrint={handlePrint} />
          ))}
        </div>
      </Modal>
    </div>
  );
};
