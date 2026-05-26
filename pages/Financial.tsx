
import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select, SearchableSelect, Table, Badge, Modal } from '../components/UI';
import { Plus, CheckCircle, Trash2, Filter, X, Calendar, DollarSign, AlertCircle, Clock, TrendingUp, Sparkles, CalendarCheck, Search, BellRing, PieChart, FileText, Receipt } from 'lucide-react';
import { parseISO, formatISO, formatDisplayDate, getUUID, isInRange as utilsIsInRange } from '../lib/utils';
import { Transaction } from '../types';

export const Financial: React.FC<{ type: 'PAYABLES' | 'RECEIVABLES' | 'BOLETOS' }> = ({ type }) => {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, splitTransactionPayment, categories, categoryGroups, addCategory, addCategoryGroup, suppliers, navigateTo, addNotification } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [paymentDate, setPaymentDate] = useState(formatISO(new Date()));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [printingReceipt, setPrintingReceipt] = useState<{ transaction: Transaction } | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Estado para controlar a visibilidade do filtro
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Date Filter State
  type TimeRange = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';
  const [timeRange, setTimeRange] = useState<TimeRange>('MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Estados dos Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // Status Filter
  const [filterAccountType, setFilterAccountType] = useState<'ALL' | 'FIXED' | 'VARIABLE'>('ALL');

  const isInRange = (dateString: string) => {
    return utilsIsInRange(dateString, timeRange, {
      customStart,
      customEnd,
      selectedMonth,
      selectedYear
    });
  };

  // Logic identifying the view
  const isPayable = type === 'PAYABLES';
  const isBoletoView = type === 'BOLETOS';
  const isReceivable = type === 'RECEIVABLES';

  const [formData, setFormData] = useState<Partial<Transaction>>({});

  // Contar filtros ativos para mostrar badge
  const activeFiltersCount = [filterCategory, filterStatus, filterAccountType !== 'ALL'].filter(Boolean).length;

  // --- HELPER: VERIFICAR URGÊNCIA (7 DIAS) ---
  const checkUrgency = (dateStr: string, status: string) => {
    if (status !== 'PENDING' || isReceivable) return { isUrgent: false, days: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Adiciona T00:00:00 para garantir parse correto no fuso local/UTC basico
    const due = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Urgente se for hoje (0) até daqui a 7 dias. Atrasado (negativo) é tratado como 'LATE' pelo status, mas podemos destacar aqui também se quisermos.
    // Aqui focamos no "Vai vencer"
    const isUrgent = diffDays >= 0 && diffDays <= 7;

    return { isUrgent, days: diffDays };
  };

  // --- FILTRAGEM AVANÇADA ---
  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      // 0. Filtro de Tipo de Conta (Fixo/Variável)
      if (filterAccountType !== 'ALL') {
        const type = t.accountType || 'VARIABLE';
        if (filterAccountType === 'FIXED' && type !== 'FIXED') return false;
        if (filterAccountType === 'VARIABLE' && type === 'FIXED') return false;
      }
      // 1. Filtro de Tipo (Aba)
      if (isBoletoView) {
        if (!t.hasBoleto || t.type !== 'EXPENSE') return false;
      } else if (isPayable) {
        if (t.type !== 'EXPENSE') return false;
        if (t.hasBoleto && t.status !== 'PAID') return false; // Show paid boletos in Accounts Payable
      } else {
        // Receivables
        if (t.type !== 'INCOME') return false;
      }

      // 2. Filtro de Texto (Busca por Descrição)
      if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      // 3. Filtro de Categoria
      if (filterCategory && t.category !== filterCategory) return false;

      // 4. Filtro de Status
      if (filterStatus) {
        if (filterStatus === 'UPCOMING') {
          // "A Vencer" = Pendente dentro do mês filtrado (removemos a trava de 7 dias)
          if (t.status !== 'PENDING') return false;
        } else if (t.status !== filterStatus) {
          return false;
        }
      }

      // 5. Filtro de Data
      if (!isInRange(t.dueDate)) return false;

      return true;
    });
  }, [transactions, isPayable, isBoletoView, searchTerm, filterCategory, filterStatus, timeRange, selectedMonth, selectedYear, customStart, customEnd, filterAccountType]);

  // Filtrar categorias com base na tela
  // Mescla Fornecedores e Categorias de Despesa para Boletos e Contas a Pagar
  // Se for Receber -> INCOME das Categorias
  const availableCategories = useMemo(() => {
    if (isReceivable) {
      return categories.filter(c => c.type === 'INCOME').map(c => ({ id: c.id, name: c.name, type: 'Receita' }));
    }
    
    // Para Payables e Boletos, junta ambos
    const suppliersList = suppliers.map(s => ({ id: s.id, name: s.name, type: 'Fornecedor' }));
    const expenseCats = categories.filter(c => c.type === 'EXPENSE').map(c => ({ id: c.id, name: c.name, type: 'Despesa' }));
    
    return [...suppliersList, ...expenseCats].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, suppliers, isReceivable]);

  // --- CÁLCULOS DE TOTAIS (Baseados nos dados filtrados) ---
  const totals = useMemo(() => {
    return {
      total: filteredData.reduce((acc, t) => acc + t.amount, 0),
      paid: filteredData.filter(t => t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0),
      pending: filteredData.filter(t => t.status === 'PENDING' || t.status === 'LATE').reduce((acc, t) => acc + t.amount, 0),
      late: filteredData.filter(t => t.status === 'LATE').reduce((acc, t) => acc + t.amount, 0),
    };
  }, [filteredData]);

  // --- CONTAS FIXAS TOTAL ---
  const fixedExpensesTotal = useMemo(() => {
    if (!isPayable) return 0;
    return filteredData
      .filter(t => t.accountType === 'FIXED')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredData, isPayable]);

  // --- CONTAGEM DE URGÊNCIAS PARA O BANNER ---
  const urgentCount = useMemo(() => {
    if (isReceivable) return 0;
    return filteredData.filter(t => checkUrgency(t.dueDate, t.status).isUrgent).length;
  }, [filteredData, isReceivable]);

  // --- INTELIGÊNCIA DE BOLETOS (Melhor Data e IA) ---
  const boletoInsights = useMemo(() => {
    if (!isBoletoView) return null;

    // 1. Melhor Data de Compra (Lógica: Fugir do dia com maior volume de pagamentos)
    const expensesByDay: Record<number, number> = {};
    const pendingExpenses = transactions.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING');

    pendingExpenses.forEach(t => {
      const day = new Date(t.dueDate).getDate();
      expensesByDay[day] = (expensesByDay[day] || 0) + t.amount;
    });

    let heaviestDay = 1;
    let maxVal = 0;
    Object.entries(expensesByDay).forEach(([day, val]) => {
      if (val > maxVal) { maxVal = val; heaviestDay = Number(day); }
    });

    // Sugere 15 dias após o dia mais pesado (ciclo de cartão/fluxo)
    let bestDay = heaviestDay + 15;
    if (bestDay > 30) bestDay = bestDay - 30;
    if (bestDay <= 0) bestDay = 1;

    // 2. Dica da IA
    let aiTip = {
      title: "Fluxo sob Controle",
      text: "Seus pagamentos estão em dia. Aproveite para negociar descontos em antecipações.",
      color: "bg-emerald-100 text-emerald-800 border-emerald-200"
    };

    if (totals.late > 0) {
      aiTip = {
        title: "Atenção aos Juros",
        text: `Você possui R$ ${totals.late.toLocaleString('pt-BR')} em atraso. Priorize estes pagamentos para estancar perdas com multas.`,
        color: "bg-red-100 text-red-800 border-red-200"
      };
    } else if (totals.pending > (totals.paid * 2) && totals.paid > 0) {
      aiTip = {
        title: "Alerta de Acúmulo",
        text: "O valor a vencer é o dobro do que já foi pago. Verifique sua previsão de recebimentos para não faltar caixa.",
        color: "bg-amber-100 text-amber-800 border-amber-200"
      };
    }

    return { bestDay, aiTip };
  }, [transactions, isBoletoView, totals]);

  // --- CRUD HANDLERS ---
  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setFormData({ ...transaction });
    } else {
      const today = formatISO(new Date());
      setFormData({
        type: isPayable ? 'EXPENSE' : 'INCOME',
        status: isPayable ? 'PAID' : 'PENDING',
        date: today,
        dueDate: today,
        category: '',
        amount: 0,
        description: '',
        accountType: 'VARIABLE'
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !formData.description || !formData.amount) return;

    setIsSaving(true);
    try {
      const todayStr = formatISO(new Date());
      const transactionData: Partial<Transaction> = {
        id: formData.id || getUUID(),
        description: formData.description!,
        amount: Number(formData.amount),
        type: 'EXPENSE',
        category: formData.category || 'Geral',
        date: formData.date || todayStr,
        dueDate: formData.dueDate || todayStr,
        status: (formData.status as any) || (isPayable ? 'PAID' : 'PENDING'),
        hasBoleto: isBoletoView ? true : (formData.hasBoleto || false),
        accountType: formData.accountType || 'VARIABLE',
        installmentsTotal: formData.installmentsTotal,
        attachmentUrl: formData.attachmentUrl
      };

      if (!isBoletoView) {
        transactionData.type = isPayable ? 'EXPENSE' : 'INCOME';
      }

      if (formData.id) {
        updateTransaction(transactionData as Transaction);
        addNotification('Lançamento atualizado com sucesso!', 'success');
      } else {
        addTransaction(transactionData as Transaction);
        addNotification('Novo lançamento adicionado!', 'success');
      }
      setShowForm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const { sales, companySettings } = useAppStore();

  const handlePrintReceipt = (transaction: Transaction) => {
    setPrintingReceipt({ transaction });
    setTimeout(() => window.print(), 100);
  };

  const handleConfirmDelete = () => {
    if (formData.id) {
      deleteTransaction(formData.id);
      addNotification('Lançamento excluído.', 'info');
      setShowDeleteConfirm(false);
      setShowForm(false);
    }
  };

  const clearFilters = () => {
    setFilterCategory('');
    setFilterStatus('');
    setSearchTerm('');
    setFilterAccountType('ALL');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <Badge color="green">{isPayable || isBoletoView ? 'Pago' : 'Recebido'}</Badge>;
      case 'PENDING': return <Badge color="yellow">Pendente</Badge>;
      case 'LATE': return <Badge color="red">Atrasado</Badge>;
      default: return <Badge color="gray">{status}</Badge>;
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'png';
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('boletos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('boletos').getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, attachmentUrl: data.publicUrl }));
      addNotification('Boleto enviado com sucesso!', 'success');
    } catch (error) {
      console.error('Error uploading:', error);
      addNotification('Erro no upload. Tente novamente.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!showForm || !isBoletoView) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1 || items[i].type === 'application/pdf') {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await handleFileUpload(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste as EventListener);
    return () => window.removeEventListener('paste', handlePaste as EventListener);
  }, [showForm, isBoletoView]);



  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-wine-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-wine-50 dark:bg-wine-900/40 rounded-xl text-wine-600 dark:text-wine-400">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-wine-900 dark:text-white leading-tight">
              {isBoletoView ? 'Controle de Boletos' : (isPayable ? 'Contas a Pagar' : 'Contas a Receber')}
            </h2>
            <p className="text-xs text-wine-500 font-medium">Gestão de fluxo e lançamentos</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filters Group */}
          <div className="flex flex-wrap items-center gap-2 bg-wine-50/50 dark:bg-slate-900/50 p-1.5 rounded-xl border border-wine-100 dark:border-slate-700">
            <div className="flex bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-wine-100/50 dark:border-slate-700/50">
              {[
                { id: 'TODAY', label: 'Hoje' },
                { id: 'WEEK', label: '7 Dias' },
                { id: 'MONTH', label: 'Mês' },
                { id: 'YEAR', label: 'Ano' },
                { id: 'CUSTOM', label: 'Personalizado' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTimeRange(opt.id as TimeRange)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${timeRange === opt.id
                    ? 'bg-wine-900 text-white shadow-sm'
                    : 'text-wine-600 dark:text-wine-400 hover:bg-wine-50 dark:hover:bg-slate-700'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {timeRange === 'MONTH' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-white dark:bg-slate-800 border border-wine-100/50 dark:border-slate-700/50 rounded-lg px-2 py-1.5 text-[10px] font-bold text-wine-800 dark:text-wine-200 outline-none"
                >
                  {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
              )}

              {(timeRange === 'MONTH' || timeRange === 'YEAR') && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white dark:bg-slate-800 border border-wine-100/50 dark:border-slate-700/50 rounded-lg px-2 py-1.5 text-[10px] font-bold text-wine-800 dark:text-wine-200 outline-none"
                >
                  {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}

              {timeRange === 'CUSTOM' && (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-wine-100/50 dark:border-slate-700/50 rounded-lg px-2 py-1.5 text-[10px] font-bold text-wine-800 dark:text-wine-200 outline-none"
                  />
                  <span className="text-wine-300">-</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-wine-100/50 dark:border-slate-700/50 rounded-lg px-2 py-1.5 text-[10px] font-bold text-wine-800 dark:text-wine-200 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPayable && (
              <Button variant="secondary" onClick={() => {
                localStorage.setItem('REPORTS_DEFAULT_TAB', 'EXPENSES');
                navigateTo('REPORTS');
              }} className="h-9 px-3">
                <PieChart size={16} /> <span className="hidden sm:inline ml-1">Relatórios</span>
              </Button>
            )}
            <Button onClick={() => handleOpenModal()} className="h-9 px-3">
              <Plus size={16} /> <span className="hidden sm:inline ml-1">Novo Lançamento</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ALERT BANNER (VENCIMENTO PRÓXIMO) */}
      {!isReceivable && urgentCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-4 flex items-center gap-4 shadow-sm animate-scale-in">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-full text-amber-600 dark:text-amber-400">
            <BellRing size={24} className="animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-amber-800 dark:text-amber-200">Atenção! Vencimentos Próximos</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Você tem <span className="font-bold">{urgentCount} contas</span> vencendo nos próximos 7 dias. Verifique a lista abaixo.
            </p>
          </div>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL GERAL */}
        <Card className="border-l-4 border-l-wine-600">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-wine-500 dark:text-wine-300 uppercase">Total Filtrado</p>
              <h3 className="text-xl font-bold text-wine-900 dark:text-white mt-1">
                R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-wine-50 dark:bg-wine-900/30 rounded text-wine-600 dark:text-wine-200">
              <DollarSign size={18} />
            </div>
          </div>
        </Card>

        {/* PAGO / RECEBIDO */}
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">{isPayable || isBoletoView ? 'Total Pago' : 'Total Recebido'}</p>
              <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                R$ {totals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded text-emerald-600 dark:text-emerald-300">
              <CheckCircle size={18} />
            </div>
          </div>
        </Card>

        {/* PENDENTE */}
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">A Vencer (Pendente)</p>
              <h3 className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                R$ {totals.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded text-amber-600 dark:text-amber-300">
              <Clock size={18} />
            </div>
          </div>
        </Card>

        {/* ATRASADO */}
        <Card className="border-l-4 border-l-red-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Em Atraso</p>
              <h3 className="text-xl font-bold text-red-700 dark:text-red-300 mt-1">
                R$ {totals.late.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded text-red-600 dark:text-red-300">
              <AlertCircle size={18} />
            </div>
          </div>
        </Card>
      </div>

      {/* PAINEL CONTAS FIXAS (Apenas Payables e se Filtro FIXO estiver ativo ou usuário quiser ver resumo) */}
      {isPayable && (filterAccountType === 'FIXED' || fixedExpensesTotal > 0) && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 animate-scale-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-wine-900 dark:text-wine-100">
              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <CalendarCheck size={20} className="text-wine-600 dark:text-wine-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Custo Fixo Mensal</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total de contas recorrentes neste mês</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-wine-900 dark:text-white">
                R$ {fixedExpensesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
            </div>
          </div>
        </div>
      )}

      {/* PAINEL INTELIGENTE (Somente Boletos) */}
      {isBoletoView && boletoInsights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-scale-in">
          {/* Dica de Melhor Data */}
          <div className="bg-gradient-to-r from-wine-800 to-wine-900 rounded-xl p-4 text-white shadow-lg flex items-center justify-between border border-wine-700">
            <div>
              <div className="flex items-center gap-2 mb-1 text-wine-200">
                <CalendarCheck size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Sugestão de Compra</span>
              </div>
              <h4 className="font-bold text-lg">Melhor dia: {boletoInsights.bestDay}</h4>
              <p className="text-xs text-wine-100 opacity-80 mt-1">Baseado nos seus picos de vencimento.</p>
            </div>
            <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <TrendingUp size={20} className="text-emerald-300" />
            </div>
          </div>

          {/* IA Insights */}
          <div className={`rounded-xl p-4 shadow-sm border flex items-start gap-3 ${boletoInsights.aiTip.color} dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200`}>
            <div className="mt-1">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm mb-1">Dica IA: {boletoInsights.aiTip.title}</h4>
              <p className="text-xs opacity-90 leading-relaxed">
                {boletoInsights.aiTip.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLE DE FILTROS & TABELA */}
      <div className="space-y-4">
        {/* Barra de Ferramentas / Busca e Filtro */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Barra de Pesquisa */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 text-wine-400 dark:text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar na descrição..."
              className="w-full pl-10 pr-4 py-2 border border-wine-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-wine-500 bg-white dark:bg-slate-800 text-wine-900 dark:text-white placeholder-wine-400 dark:placeholder-slate-400 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* QUICK STATUS FILTERS (Middle Bar) */}
          <div className="flex-1 flex justify-center">
            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-wine-100 dark:border-slate-700 shadow-sm overflow-x-auto">
              <button
                onClick={() => setFilterStatus(filterStatus === 'PENDING' ? '' : 'PENDING')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${filterStatus === 'PENDING' ? 'bg-amber-100 text-amber-800 border-amber-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <div className={`w-2 h-2 rounded-full ${filterStatus === 'PENDING' ? 'bg-amber-500' : 'bg-amber-400'}`} />
                Pendentes
              </button>

              <button
                onClick={() => setFilterStatus(filterStatus === 'UPCOMING' ? '' : 'UPCOMING')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${filterStatus === 'UPCOMING' ? 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <div className={`w-2 h-2 rounded-full ${filterStatus === 'UPCOMING' ? 'bg-blue-500' : 'bg-blue-400'}`} />
                A Vencer (7 dias)
              </button>

              <button
                onClick={() => setFilterStatus(filterStatus === 'LATE' ? '' : 'LATE')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${filterStatus === 'LATE' ? 'bg-red-100 text-red-800 border-red-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <div className={`w-2 h-2 rounded-full ${filterStatus === 'LATE' ? 'bg-red-500' : 'bg-red-400'}`} />
                Atrasados
              </button>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />

              <button
                onClick={() => setFilterStatus(filterStatus === 'PAID' ? '' : 'PAID')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${filterStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <div className={`w-2 h-2 rounded-full ${filterStatus === 'PAID' ? 'bg-emerald-500' : 'bg-emerald-400'}`} />
                Pagos
              </button>
            </div>
          </div>

          {/* Botão Toggle de Filtros Avançados */}
          <button
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium whitespace-nowrap w-full md:w-auto justify-center
               ${isFilterExpanded
                ? 'bg-wine-100 border-wine-200 text-wine-800 dark:bg-slate-700 dark:border-slate-600 dark:text-white'
                : 'bg-white border-wine-100 text-wine-600 hover:bg-wine-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
          >
            <Filter size={16} />
            Filtros Avançados
            {activeFiltersCount > 0 && (
              <span className="ml-1 bg-wine-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Painel de Filtros (Expansível) */}
        {isFilterExpanded && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-wine-100 dark:border-slate-700 shadow-sm animate-fade-in-down">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <SearchableSelect
                label="Categoria / Fornecedor"
                value={filterCategory}
                onChange={val => setFilterCategory(val)}
                className="bg-white dark:bg-slate-900 h-[42px]"
                options={[
                  { value: '', label: 'Todos' },
                  ...availableCategories.map(c => ({ value: c.name, label: `${c.name} (${c.type})` }))
                ]}
              />

              <Select
                label="Status"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-white dark:bg-slate-900"
              >
                <option value="">Todos os Status</option>
                <option value="PENDING">Pendente</option>
                <option value="PAID">{isPayable || isBoletoView ? 'Pago' : 'Recebido'}</option>
                <option value="LATE">Atrasado</option>
              </Select>

              {isPayable && (
                <Select
                  label="Tipo de Conta"
                  value={filterAccountType}
                  onChange={e => setFilterAccountType(e.target.value as any)}
                  className="bg-white dark:bg-slate-900"
                >
                  <option value="ALL">Todas</option>
                  <option value="FIXED">Fixas (Recorrentes)</option>
                  <option value="VARIABLE">Variáveis</option>
                </Select>
              )}

              <Button
                variant="secondary"
                onClick={clearFilters}
                disabled={activeFiltersCount === 0 && !searchTerm}
                className="h-[42px]" // Alinhamento visual com inputs
              >
                <X size={16} /> Limpar
              </Button>
            </div>
          </div>
        )}

        {/* TABLE */}
        <Card>
          <Table headers={['Descrição', 'Categoria', 'Forma Pgto.', 'Vencimento', 'Valor', 'Status', 'Ações']}>
            {filteredData.map(t => {
              const urgency = checkUrgency(t.dueDate, t.status);

              return (
                <tr
                  key={t.id}
                  className={`hover:bg-wine-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group ${urgency.isUrgent ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
                  onClick={() => handleOpenModal(t)}
                >
                  <td className="py-3 px-4 font-medium text-wine-900 dark:text-wine-100">{t.description}</td>
                  <td className="py-3 px-4 text-wine-500 dark:text-slate-400">{t.category}</td>
                  <td className="py-3 px-4 font-bold text-wine-700 dark:text-wine-300">
                    {t.paymentMethod || '-'}
                  </td>
                  <td className="py-3 px-4 text-wine-700 dark:text-wine-200">
                    <div className="flex flex-col">
                      <span>{formatDisplayDate(t.dueDate)}</span>
                      {urgency.isUrgent && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                          <AlertCircle size={10} />
                          {urgency.days === 0 ? 'Vence Hoje!' : `Vence em ${urgency.days} dias`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-wine-800 dark:text-wine-100">
                    R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                  <td className="py-3 px-4 flex gap-2">
                    {t.status !== 'PAID' && (
                      <button
                        title="Adicionar Pagamento"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTransaction(t);
                          setPaymentAmount(t.amount);
                          setShowPaymentModal(true);
                        }}
                        className="p-1 text-wine-600 hover:bg-wine-50 dark:text-wine-400 dark:hover:bg-wine-900/30 rounded"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                    {t.status === 'PENDING' && (
                      <button
                        title="Marcar como concluído"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const todayStr = new Date().toISOString().split('T')[0];
                          updateTransaction({ ...t, status: 'PAID', dueDate: todayStr, date: todayStr }); 
                        }}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}

                    {t.saleId && t.status === 'PAID' && (
                      <button
                        title="Imprimir Recibo"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintReceipt(t);
                        }}
                        className="p-1 text-wine-600 hover:bg-wine-50 dark:text-wine-400 dark:hover:bg-wine-900/30 rounded"
                      >
                        <Receipt size={18} />
                      </button>
                    )}

                    {t.attachmentUrl && (
                      <a
                        href={t.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver Boleto/Anexo"
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-wine-300 dark:text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Filter size={32} className="opacity-20" />
                    <span>Nenhum registro encontrado.</span>
                  </div>
                </td>
              </tr>
            )}
          </Table>
        </Card>
      </div>

      {/* MODAL PAGAMENTO PARCIAL */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Registrar Pagamento"
      >
        <div className="space-y-4">
          <div className="bg-wine-50 dark:bg-wine-900/20 p-4 rounded-lg border border-wine-100 dark:border-wine-800">
            <p className="text-xs text-wine-600 dark:text-wine-400 font-bold uppercase mb-1">Conta: {selectedTransaction?.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-wine-800 dark:text-wine-200">Valor em Aberto:</span>
              <span className="text-xl font-bold text-wine-900 dark:text-white">
                R$ {(selectedTransaction ? selectedTransaction.amount : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Valor do Pagamento (R$) *"
              type="number"
              value={paymentAmount}
              onChange={e => {
                const val = Number(e.target.value);
                const max = selectedTransaction ? selectedTransaction.amount : 0;
                setPaymentAmount(Math.min(val, max));
              }}
              max={selectedTransaction ? selectedTransaction.amount : 0}
            />

            <Select
              label="Forma de Pagamento"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
            >
              <option value="PIX">PIX</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="TRANSFERENCIA">Transferência</option>
            </Select>

            <Input
              label="Data do Pagamento"
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
            />

            <Input
              label="Observações"
              placeholder="Ex: Pago via app"
              value={paymentNotes}
              onChange={e => setPaymentNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" className="flex-1" onClick={() => setShowPaymentModal(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={paymentAmount <= 0}
              onClick={async () => {
                if (!selectedTransaction || paymentAmount <= 0) return;
                await splitTransactionPayment(
                  selectedTransaction.id,
                  paymentAmount,
                  paymentMethod,
                  paymentNotes,
                  paymentDate
                );
                setShowPaymentModal(false);
                setPaymentAmount(0);
                setPaymentNotes('');
              }}
            >
              Confirmar Pagamento
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL FORM */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={formData.id ? "Editar Lançamento" : (isBoletoView ? "Novo Boleto" : (isPayable ? "Nova Conta a Pagar" : "Nova Conta a Receber"))}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Descrição *"
            placeholder="Ex: Aluguel"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            autoFocus
          />

          {isBoletoView && (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-wine-800 dark:text-wine-200 uppercase mb-1">
                Arquivo do Boleto (PDF/Imagem)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                  id="boleto-upload"
                />
                <label
                  htmlFor="boleto-upload"
                  className={`flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-wine-300 text-wine-700 hover:bg-wine-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  {isUploading ? (
                    'Enviando...'
                  ) : (
                    <>
                      <FileText size={18} />
                      {formData.attachmentUrl ? 'Arquivo Anexado (Clique para alterar)' : 'Selecionar Arquivo'}
                    </>
                  )}
                </label>

                {formData.attachmentUrl && (
                  <div className="flex items-center gap-2">
                    <a
                      href={formData.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline bg-blue-50 px-2 py-1 rounded"
                    >
                      <FileText size={14} />
                      Visualizar
                    </a>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, attachmentUrl: undefined })}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 underline bg-red-50 px-2 py-1 rounded"
                    >
                      <Trash2 size={14} />
                      Remover
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <Input
            label="Valor (R$) *"
            type="number"
            value={formData.amount || ''}
            onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
          />
          <Input
            label="Data de Emissão"
            type="date"
            value={formData.date || ''}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
          />
          <Input
            label="Data de Vencimento"
            type="date"
            value={formData.dueDate || ''}
            onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
          />
          <div className="space-y-1">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SearchableSelect
                  label={isReceivable ? "Categoria" : "Categoria / Fornecedor"}
                  value={formData.category || ''}
                  onChange={val => setFormData({ ...formData, category: val })}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...availableCategories.map(c => ({ value: c.name, label: `${c.name} (${c.type})` }))
                  ]}
                />
              </div>
              {!isBoletoView && (
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(!showCategoryForm)}
                  className="mb-1 p-2 h-10 border border-wine-200 dark:border-slate-600 rounded-lg text-wine-600 dark:text-wine-400 hover:bg-wine-50 dark:hover:bg-slate-700 transition-colors"
                  title="Nova Categoria"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>

            {/* FORMULÁRIO RÁPIDO DE CATEGORIA */}
            {showCategoryForm && !isBoletoView && (
              <div className="p-3 bg-wine-50/50 dark:bg-slate-900/50 rounded-lg border border-wine-100 dark:border-slate-700 animate-fade-in-down space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-wine-800 dark:text-wine-200">Nova Categoria</span>
                  <button type="button" onClick={() => setShowCategoryForm(false)} className="text-wine-400 hover:text-wine-600"><X size={14} /></button>
                </div>

                <Input
                  placeholder="Nome da Categoria"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="h-8 text-xs"
                />

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      label="Grupo"
                      value={newGroupId}
                      onChange={e => setNewGroupId(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="">Sem Grupo</option>
                      {categoryGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGroupForm(!showGroupForm)}
                    className="mb-1 p-1 h-8 border border-wine-200 dark:border-slate-600 rounded text-wine-600 dark:text-wine-400"
                    title="Novo Grupo"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {showGroupForm && (
                  <div className="flex gap-1 animate-fade-in">
                    <Input
                      placeholder="Nome do Grupo"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        if (!newGroupName) return;
                        const group = { id: getUUID(), name: newGroupName, createdAt: new Date().toISOString() };
                        await addCategoryGroup(group);
                        setNewGroupId(group.id);
                        setNewGroupName('');
                        setShowGroupForm(false);
                      }}
                      className="h-8 px-2"
                    >
                      OK
                    </Button>
                  </div>
                )}

                <Button
                  type="button"
                  size="sm"
                  className="w-full h-8 text-xs bg-wine-800"
                  disabled={!newCategoryName || isSavingCategory}
                  onClick={async () => {
                    if (!newCategoryName) return;
                    setIsSavingCategory(true);
                    try {
                      const cat = {
                        id: getUUID(),
                        name: newCategoryName,
                        type: isReceivable ? 'INCOME' : 'EXPENSE',
                        groupId: newGroupId || undefined
                      };
                      await addCategory(cat);
                      setFormData({ ...formData, category: cat.name });
                      setNewCategoryName('');
                      setShowCategoryForm(false);
                    } finally {
                      setIsSavingCategory(false);
                    }
                  }}
                >
                  Salvar Categoria
                </Button>
              </div>
            )}
          </div>

          <Select
            label="Status"
            value={formData.status || 'PENDING'}
            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
          >
            <option value="PENDING">Pendente</option>
            <option value="PAID">{isPayable || isBoletoView ? 'Pago' : 'Recebido'}</option>
            <option value="LATE">Atrasado</option>
          </Select>

          <Select
            label="Forma de Pagamento"
            value={formData.paymentMethod || ''}
            onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
          >
            <option value="">Não especificada</option>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="PIX">PIX</option>
            <option value="CARTÃO">Cartão</option>
            <option value="CARTAO_DEBITO">Cartão de Débito</option>
            <option value="CARTAO_CREDITO">Cartão de Crédito</option>
            <option value="TRANSFERENCIA">Transferência</option>
            <option value="BOLETO">Boleto</option>
          </Select>


          {isPayable && (
            <div className="animate-fade-in-up">
              <label className="block text-xs font-bold text-wine-800 dark:text-wine-200 uppercase mb-1">
                Tipo de Despesa
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, accountType: 'VARIABLE' })}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-all text-sm font-medium flex items-center justify-center gap-2
                      ${formData.accountType !== 'FIXED'
                      ? 'bg-wine-100 border-wine-300 text-wine-900 dark:bg-wine-900/40 dark:border-wine-700 dark:text-white shadow-sm'
                      : 'bg-white border-wine-100 text-gray-400 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'}`}
                >
                  <span>Variável</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, accountType: 'FIXED' })}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-all text-sm font-medium flex items-center justify-center gap-2
                      ${formData.accountType === 'FIXED'
                      ? 'bg-wine-100 border-wine-300 text-wine-900 dark:bg-wine-900/40 dark:border-wine-700 dark:text-white shadow-sm'
                      : 'bg-white border-wine-100 text-gray-400 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'}`}
                >
                  <Sparkles size={14} className={formData.accountType === 'FIXED' ? 'text-wine-600 dark:text-wine-400' : 'grayscale'} />
                  <span>Fixa (Mensal)</span>
                </button>
              </div>

              {formData.accountType === 'FIXED' && (
                <div className="mt-2 flex items-start gap-2 text-[10px] text-wine-600 dark:text-wine-300 bg-wine-50 dark:bg-wine-900/20 p-2 rounded border border-wine-100 dark:border-wine-800/30">
                  <CalendarCheck size={14} />
                  <p>O sistema criará automaticamente uma cópia deste lançamento todo mês.</p>
                </div>
              )}

              {formData.accountType === 'FIXED' && (
                <div className="mt-4 animate-fade-in">
                  <Input
                    label="Repetir por quantas vezes? (Opcional)"
                    placeholder="Ex: 12 (Deixe vazio para repetir para sempre)"
                    type="number"
                    value={formData.installmentsTotal || ''}
                    onChange={e => setFormData({ ...formData, installmentsTotal: Number(e.target.value) })}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Se preenchido, lançará automaticamente as parcelas futuras (ex: Março, Abril...).
                    Se vazio, cria mês a mês.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="md:col-span-2 flex justify-between items-center mt-4 pt-4 border-t border-wine-100 dark:border-slate-700">
            {formData.id && (
              <Button type="button" variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={18} /> Excluir
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isSaving}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-wine-800 dark:text-wine-200">
            Tem certeza que deseja excluir o lançamento <strong>{formData.description}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete}>
              Confirmar Exclusão
            </Button>
          </div>
        </div>
      </Modal>

      {/* PAYMENT RECEIPT TEMPLATE (Adapted for Financial) */}
      <div id="printable-receipt" className="hidden print:block text-black">
        {printingReceipt && (
          <div className="w-full max-w-[150mm] mx-auto border-2 border-black p-8">
            <style>{`
              @media print {
                @page { margin: 0; size: auto; }
                body * { visibility: hidden !important; height: 0; overflow: hidden; }
                #printable-receipt, #printable-receipt * { visibility: visible !important; height: auto !important; overflow: visible !important; }
                #printable-receipt { 
                  position: absolute !important; 
                  left: 0 !important; 
                  top: 0 !important; 
                  width: 100vw !important; 
                  min-height: 100vh !important; 
                  z-index: 9999 !important; 
                  background: white !important; 
                  padding: 15mm !important; 
                  box-sizing: border-box !important;
                }
              }
            `}</style>
            <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-widest">{companySettings.name}</h1>
                <p className="text-sm">RECIBO DE PAGAMENTO</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-bold">Nº {printingReceipt.transaction.id.slice(0, 8)}</p>
                <p>{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-lg"> Recebemos de </p>
              <p className="text-xl font-bold uppercase"> {printingReceipt.transaction.description.split('-')[1] || 'Cliente'} </p>
              <p className="text-lg"> a quantia de: </p>
              <p className="text-2xl font-black"> R$ {printingReceipt.transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} </p>
              <p className="text-sm text-gray-600 italic mt-4"> {printingReceipt.transaction.description} </p>
            </div>

            <div className="mt-20 flex flex-col items-center">
              <div className="border-t border-black w-64 text-center pt-2">
                <p className="font-bold text-xs">{companySettings.name}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Icons for Header
const ArrowDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="m8 12 4 4 4-4" /></svg>
);
const ArrowUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><circle cx="12" cy="12" r="10" /><path d="m16 12-4-4-4 4" /><path d="M12 16V8" /></svg>
);
const FileTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
);
