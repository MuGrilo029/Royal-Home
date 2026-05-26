
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Input } from '../components/UI';
import { parseISO, isInRange as utilsIsInRange } from '../lib/utils';
import {
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  BarChart2,
  Activity,
  Box,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  Percent,
  Receipt,
  Tag,
  PackageOpen,
  Archive
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area, LineChart, Line, Legend, PieChart, Pie
} from 'recharts';

type TimeRange = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';
type ComparisonMode = 'PREVIOUS_PERIOD' | 'SAME_PERIOD_LAST_YEAR';

export const Dashboard: React.FC = () => {
  const { transactions, products, sales, categories, categoryGroups } = useAppStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('MONTH');
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('PREVIOUS_PERIOD');

  // Custom Date Range State
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Month/Year Selector State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // --- LOGICA DE DATAS ---

  const getPeriodRange = (period: TimeRange, start?: string, end?: string) => {
    let startDate = new Date();
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (period === 'TODAY') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'WEEK') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'MONTH') {
      startDate = new Date(selectedYear, selectedMonth, 1);
      endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
    } else if (period === 'YEAR') {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
    } else if (period === 'CUSTOM' && start && end) {
      startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
    }
    return { startDate, endDate };
  };

  const getPreviousPeriodRange = (period: TimeRange, mode: ComparisonMode, start?: string, end?: string) => {
    const { startDate, endDate } = getPeriodRange(period, start, end);

    if (mode === 'SAME_PERIOD_LAST_YEAR') {
      const prevStartDate = new Date(startDate);
      prevStartDate.setFullYear(startDate.getFullYear() - 1);
      const prevEndDate = new Date(endDate);
      prevEndDate.setFullYear(endDate.getFullYear() - 1);
      return { prevStartDate, prevEndDate };
    }

    const diff = endDate.getTime() - startDate.getTime() + 1;
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - (diff - 1));

    return { prevStartDate, prevEndDate };
  };

  const isInRange = (dateString: string, start: Date, end: Date) => {
    if (!dateString) return false;
    const dateToCheck = parseISO(dateString);
    // Comparação simples de objetos Date que já foram normalizados pelo parseISO
    return dateToCheck >= start && dateToCheck <= end;
  };

  const { startDate, endDate } = getPeriodRange(timeRange, customStart, customEnd);
  const { prevStartDate, prevEndDate } = getPreviousPeriodRange(timeRange, customStart, customEnd);

  // --- DADOS CALCULADOS ---

  const COST_KEYWORDS = ['matéria prima', 'insumo', 'produção', 'custo variável', 'cmv', 'frete de compra'];

  const isDirectCost = (catObject: any, categoryName: string, groupName?: string) => {
      if (catObject?.isCmv) return true;
      const cat = (categoryName || '').toLowerCase();
      const grp = (groupName || '').toLowerCase();
      return COST_KEYWORDS.some(kw => cat.includes(kw) || grp.includes(kw));
  };

  const matchCategory = (catName: string, categoriesList: any[]) => {
      if (!catName) return undefined;
      const exactIdMatch = categoriesList.find(c => c.id === catName);
      if (exactIdMatch) return exactIdMatch;
      const normalizedTarget = catName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      if (!normalizedTarget) return undefined;
      const matches = categoriesList.filter(c => 
          (c.name || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === normalizedTarget
      );
      return matches.find(c => c.type === 'EXPENSE') || matches[0];
  };

  const getStats = (start: Date, end: Date) => {
    // Filtragem robusta usando as datas de início e fim calculadas
    const filteredTrans = (transactions || []).filter(t => isInRange(t.dueDate, start, end));
    const filteredSales = (sales || []).filter(s => isInRange(s.date, start, end));

    const income = filteredTrans.filter(t => t.type === 'INCOME' && t.status === 'PAID').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const expenses = filteredTrans.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    // Contagem de vendas e itens (considerando apenas vendas não canceladas)
    const activeSales = filteredSales.filter(s => s.status !== 'CANCELLED');
    const salesCount = activeSales.length;
    const itemsCount = activeSales.reduce((acc, s) => acc + (s.items?.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) || 0), 0);

    // Receita: Vendas COMPLETED ou PENDING (desde que não CANCELLED)
    const revenue = activeSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

    const balance = income - expenses;
    const margin = income > 0 ? (balance / income) * 100 : 0;
    const ticketMedia = salesCount > 0 ? revenue / salesCount : 0;

    const pendingIncome = filteredTrans.filter(t => t.type === 'INCOME' && (t.status === 'PENDING' || t.status === 'LATE')).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const pendingExpenses = filteredTrans.filter(t => t.type === 'EXPENSE' && (t.status === 'PENDING' || t.status === 'LATE')).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const cmv = filteredTrans.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').filter(t => {
        const category = matchCategory(t.category || '', categories || []);
        const group = (categoryGroups || []).find(g => g.id === category?.groupId);
        return isDirectCost(category, t.category || '', group?.name);
    }).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    return { income, expenses, balance, margin, ticketMedia, salesCount, itemsCount, revenue, pendingIncome, pendingExpenses, cmv };
  };

  const currentStats = useMemo(() => getStats(startDate, endDate), [transactions, sales, timeRange, selectedMonth, selectedYear, customStart, customEnd, categories, categoryGroups]);
  const prevStats = useMemo(() => getStats(prevStartDate, prevEndDate), [transactions, sales, timeRange, selectedMonth, selectedYear, customStart, customEnd, comparisonMode, categories, categoryGroups]);

  // --- CHARTS DATA ---

  const cashFlowData = useMemo(() => {
    const data: any[] = [];
    let current = new Date(startDate);

    // Limits the number of points for clarity
    const maxPoints = 31;
    let step = 1;
    if (timeRange === 'YEAR') step = 1; // Will step by month

    while (current <= endDate && data.length < 100) {
      const label = timeRange === 'YEAR'
        ? current.toLocaleString('pt-BR', { month: 'short' })
        : current.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(current);
      if (timeRange === 'YEAR') {
        dayEnd.setMonth(current.getMonth() + 1, 0);
        dayEnd.setHours(23, 59, 59, 999);
      } else {
        dayEnd.setHours(23, 59, 59, 999);
      }

      const stats = getStats(dayStart, dayEnd);
      data.push({
        name: label,
        receita: stats.income,
        despesa: stats.expenses,
        saldo: stats.balance
      });

      if (timeRange === 'YEAR') {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setDate(current.getDate() + 1);
      }
    }
    return data;
  }, [startDate, endDate, transactions, sales, timeRange]);

  const revenueVsExpenseData = [
    { name: 'Receita', value: currentStats.income, color: '#10b981' },
    { name: 'Despesa', value: currentStats.expenses, color: '#ef4444' }
  ];

  // --- ESTOQUE E ITENS PARADOS ---
  const stockStats = useMemo(() => {
    const lowStock = (products || []).filter(p => p.minStock > 0 && p.quantity <= p.minStock).length;
    const totalStockValue = (products || []).reduce((acc, p) => acc + (p.quantity * (p.cost || 0)), 0);
    const totalPotentialRevenue = (products || []).reduce((acc, p) => acc + (p.quantity * p.price), 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const itemsWithSales = new Set();
    sales.filter(s => s.status !== 'CANCELLED' && new Date(s.date) > thirtyDaysAgo).forEach(s => {
      s.items.forEach(i => itemsWithSales.add(i.productId));
    });

    const stagnantItems = products.filter(p => {
      const hasNoSales = !itemsWithSales.has(p.id);
      const isInStock = p.quantity > 0;
      const isOldEnough = p.entryDate ? new Date(p.entryDate) < thirtyDaysAgo : true;
      return hasNoSales && isInStock && isOldEnough;
    }).length;

    return { lowStock, totalStockValue, stagnantItems, totalPotentialRevenue };
  }, [products, sales]);

  const topProducts = useMemo(() => {
    const stats: Record<string, { name: string, qty: number, revenue: number }> = {};
    const filtered = (sales || [])
      .filter(s => s.status !== 'CANCELLED' && isInRange(s.date, startDate, endDate));

    filtered.forEach(sale => {
      // Calculate discount factor for this sale
      const saleGrossTotal = (sale.items || []).reduce((sum, item) =>
        sum + ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)), 0
      );

      const discountFactor = saleGrossTotal > 0 ? (Number(sale.total) / saleGrossTotal) : 1;

      (sale.items || []).forEach(item => {
        // Use productId as key, or productName for custom items ("Avulso")
        const key = item.productId || item.productName || 'Desconhecido';
        if (!stats[key]) {
          stats[key] = { name: item.productName || 'Produto', qty: 0, revenue: 0 };
        }

        const itemGross = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
        stats[key].qty += (Number(item.quantity) || 0);
        stats[key].revenue += (itemGross * discountFactor);
      });
    });
    return Object.values(stats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [sales, startDate, endDate]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">

      {/* HEADER & FILTERS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-wine-900 dark:text-white uppercase tracking-tighter">Dashboard Estratégico</h1>
          <p className="text-wine-500 dark:text-slate-400 text-sm font-medium">Controle financeiro e análise de performance</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-wine-100 dark:border-slate-700 shadow-xl flex flex-col md:flex-row items-center gap-2">
          <div className="flex bg-wine-50 dark:bg-slate-700 p-1 rounded-xl">
            {[
              { id: 'TODAY', label: 'Hoje' },
              { id: 'WEEK', label: '7 Dias' },
              { id: 'MONTH', label: 'Mês' },
              { id: 'YEAR', label: 'Ano' },
              { id: 'CUSTOM', label: 'Personalizado' }
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setTimeRange(r.id as TimeRange)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeRange === r.id ? 'bg-wine-900 text-white shadow-lg' : 'text-wine-500 hover:bg-wine-100'}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {(timeRange === 'MONTH' || timeRange === 'YEAR') && (
              <>
                {timeRange === 'MONTH' && (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-transparent border border-wine-100 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-bold text-wine-900 dark:text-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>
                    ))}
                  </select>
                )}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent border border-wine-100 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-bold text-wine-900 dark:text-white"
                >
                  {[2024, 2025, 2026].map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </>
            )}
            {timeRange === 'CUSTOM' && (
              <div className="flex items-center gap-2">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-xs p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                <span className="text-wine-300">-</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-xs p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
              </div>
            )}

            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-wine-100 dark:border-slate-700">
              <span className="text-[10px] font-black uppercase text-wine-400">Comparar:</span>
              <select
                value={comparisonMode}
                onChange={(e) => setComparisonMode(e.target.value as ComparisonMode)}
                className="bg-transparent border border-wine-100 dark:border-slate-600 rounded-lg px-2 py-2 text-xs font-bold text-wine-900 dark:text-white"
              >
                <option value="PREVIOUS_PERIOD">Anterior</option>
                <option value="SAME_PERIOD_LAST_YEAR">Ano Anterior</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3-PANEL SUMMARY LAYER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* PANEL 1: RESULTADO FINANCEIRO */}
        <SummaryPanel 
          title="Resultado Financeiro" 
          heroLabel="Lucro Líquido" 
          heroValue={currentStats.balance} 
          heroPrevValue={prevStats.balance} 
          icon={<DollarSign size={24} />} 
          isCurrency
        >
          <MetricMiniCard label="Receita Bruta" value={currentStats.income} prevValue={prevStats.income} icon={<ArrowUpCircle size={14} />} isCurrency />
          <MetricMiniCard label="Despesas" value={currentStats.expenses} prevValue={prevStats.expenses} icon={<ArrowDownCircle size={14} />} isCurrency inverseColor />
          <MetricMiniCard label="A Receber" value={currentStats.pendingIncome} prevValue={prevStats.pendingIncome} icon={<Clock size={14} />} isCurrency />
          <MetricMiniCard label="A Pagar" value={currentStats.pendingExpenses} prevValue={prevStats.pendingExpenses} icon={<Calendar size={14} />} isCurrency inverseColor />
        </SummaryPanel>

        {/* PANEL 2: PERFORMANCE COMERCIAL */}
        <SummaryPanel 
          title="Performance Comercial" 
          heroLabel="Faturamento Bruto" 
          heroValue={currentStats.revenue} 
          heroPrevValue={prevStats.revenue} 
          icon={<TrendingUp size={24} />} 
          isCurrency
        >
          <MetricMiniCard label="Ticket Médio" value={currentStats.ticketMedia} prevValue={prevStats.ticketMedia} icon={<Receipt size={14} />} isCurrency />
          <MetricMiniCard label="Margem" value={currentStats.margin} prevValue={prevStats.margin} icon={<Percent size={14} />} isPercent />
          <MetricMiniCard label="Custo (CMV)" value={currentStats.cmv} prevValue={prevStats.cmv} icon={<Box size={14} />} isCurrency inverseColor />
          <MetricMiniCard label="Vendas" value={currentStats.salesCount} prevValue={prevStats.salesCount} icon={<Tag size={14} />} />
        </SummaryPanel>

        {/* PANEL 3: VISÃO DE ESTOQUE */}
        <SummaryPanel 
          title="Visão de Estoque" 
          heroLabel="Total em Estoque" 
          heroValue={stockStats.totalStockValue} 
          heroPrevValue={stockStats.totalStockValue} 
          icon={<Package size={24} />} 
          isCurrency
        >
          <MetricMiniCard label="Vendidos" value={currentStats.itemsCount} prevValue={prevStats.itemsCount} icon={<PackageOpen size={14} />} />
          <MetricMiniCard label="Est. Crítico" value={stockStats.lowStock} prevValue={stockStats.lowStock} icon={<AlertCircle size={14} />} inverseColor />
          <MetricMiniCard label="Baixo Giro" value={stockStats.stagnantItems} prevValue={stockStats.stagnantItems} icon={<Archive size={14} />} inverseColor />
          <MetricMiniCard label="Potencial" value={stockStats.totalPotentialRevenue} prevValue={stockStats.totalPotentialRevenue} icon={<Sparkles size={14} />} isCurrency />
        </SummaryPanel>

      </div>

      {/* MAIN CHARTS SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* CASH FLOW - 2/3 width */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-wine-900 dark:text-white flex items-center gap-2 uppercase tracking-wider"><BarChart2 size={18} /> Fluxo Financeiro Detalhado</h3>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(val) => `R$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                  <Area type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                  <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TOP PRODUCTS */}
            <Card className="p-6">
              <h3 className="font-bold text-wine-900 dark:text-white mb-4 uppercase text-xs tracking-widest flex items-center gap-2"><Sparkles size={16} className="text-amber-500" /> Top 5 Produtos (Receita)</h3>
              <div className="space-y-4">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-wine-50 dark:bg-slate-700/50 rounded-xl border border-wine-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-wine-900 text-white flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                      <div>
                        <p className="text-sm font-bold text-wine-900 dark:text-white truncate max-w-[150px]">{p.name}</p>
                        <p className="text-[10px] text-wine-400">{p.qty} unidades vendidas</p>
                      </div>
                    </div>
                    <p className="font-black text-emerald-600">R$ {p.revenue.toLocaleString()}</p>
                  </div>
                ))}
                {topProducts.length === 0 && <p className="text-center py-10 text-wine-300">Sem dados no período</p>}
              </div>
            </Card>

            {/* REVENUE VS EXPENSE DONUT */}
            <Card className="p-6">
              <h3 className="font-bold text-wine-900 dark:text-white mb-4 uppercase text-xs tracking-widest flex items-center gap-2"><PieIcon size={16} className="text-indigo-500" /> Composição Financeira</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueVsExpenseData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {revenueVsExpenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-center">
                <p className="text-[10px] uppercase font-bold text-blue-600 mb-1">Resultado Líquido</p>
                <p className={`text-2xl font-black ${currentStats.balance >= 0 ? 'text-blue-700' : 'text-red-600'}`}>R$ {currentStats.balance.toLocaleString()}</p>
              </div>
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN: STOCK STATUS & IA (1/3 width) */}
        <div className="space-y-6">

          {/* STOCK DASHBOARD */}
          <Card className="p-6 bg-wine-900 text-white border-none shadow-2xl overflow-hidden relative">
            <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12"><Box size={200} /></div>
            <h3 className="font-bold text-white mb-6 uppercase text-sm tracking-widest flex items-center gap-2 relative z-10"><Package size={18} /> Panorama do Estoque</h3>

            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <div><p className="text-wine-200 text-xs uppercase font-bold">Valor do Estoque (Custo)</p><p className="text-2xl font-black">R$ {stockStats.totalStockValue.toLocaleString()}</p></div>
                <div className="text-right"><p className="text-wine-200 text-[10px] uppercase font-bold">Potencial Venda</p><p className="text-sm font-bold text-emerald-400">R$ {stockStats.totalPotentialRevenue.toLocaleString()}</p></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl ${stockStats.lowStock > 0 ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/5 border border-white/10'}`}>
                  <p className="text-[10px] font-black uppercase text-wine-200 mb-1">Estoque Baixo</p>
                  <p className={`text-2xl font-black ${stockStats.lowStock > 0 ? 'text-red-300' : 'text-white'}`}>{stockStats.lowStock}</p>
                </div>
                <div className={`p-4 rounded-2xl ${stockStats.stagnantItems > 5 ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5 border border-white/10'}`}>
                  <p className="text-[10px] font-black uppercase text-wine-200 mb-1">Itens Parados</p>
                  <p className={`text-2xl font-black ${stockStats.stagnantItems > 5 ? 'text-amber-300' : 'text-white'}`}>{stockStats.stagnantItems}</p>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black uppercase text-wine-200 mb-1 flex items-center justify-between">
                  Saúde do Inventário
                  <span className="text-[8px] bg-wine-800 px-1.5 py-0.5 rounded text-wine-300">ESTIMADO</span>
                </p>
                <div className="w-full bg-white/10 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${stockStats.stagnantItems < products.length / 4 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${products.length > 0 ? Math.max(10, 100 - (stockStats.stagnantItems / products.length * 100)) : 100}%` }}
                  ></div>
                </div>
                <p className="text-[10px] mt-2 text-wine-300">{products.length > 0 ? (100 - (stockStats.stagnantItems / products.length * 100)).toFixed(0) : 100}% dos itens estão saudáveis</p>
              </div>
            </div>
          </Card>

          {/* FUTURE IA INSIGHT LAYER */}
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 transition-transform group-hover:scale-110"><Sparkles size={80} /></div>
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><Activity size={20} /></div>
              <div><h4 className="font-bold text-sm tracking-tight">Análise Preditiva</h4><p className="text-[10px] text-indigo-200">Insights em tempo real</p></div>
            </div>

            <div className="space-y-3 relative z-10">
              {currentStats.margin < 15 && (
                <div className="bg-white/10 border border-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <p className="text-xs font-bold flex items-center gap-2 text-amber-300"><AlertCircle size={14} /> Margem sob pressão</p>
                  <p className="text-[10px] text-indigo-100 mt-1 opacity-80">Sua margem atual de {currentStats.margin.toFixed(1)}% está abaixo da meta do setor. Avalie reajustes nos preços.</p>
                </div>
              )}
              {currentStats.salesCount > prevStats.salesCount && (
                <div className="bg-white/10 border border-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <p className="text-xs font-bold flex items-center gap-2 text-emerald-300"><TrendingUp size={14} /> Crescimento em Volume</p>
                  <p className="text-[10px] text-indigo-100 mt-1 opacity-80">Você realizou {prevStats.salesCount > 0 ? (((currentStats.salesCount - prevStats.salesCount) / prevStats.salesCount) * 100).toFixed(0) : 100}% mais vendas do que no período anterior.</p>
                </div>
              )}
              <Button className="w-full bg-white text-indigo-900 hover:bg-white/90 border-none font-black text-[10px] uppercase mt-4 h-10 shadow-lg group">
                Explorar Oportunidades <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

const calcChange = (curr: number, prev: number) => {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
};

const SummaryPanel = ({ title, heroLabel, heroValue, heroPrevValue, heroInverse, icon, children, isCurrency, isPercent }: any) => {
  const change = calcChange(heroValue, heroPrevValue);
  const isPositive = change >= 0;
  const isGood = heroInverse ? !isPositive : isPositive;
  const isNeutral = change === 0;

  return (
    <Card className="p-6 flex flex-col h-full bg-white dark:bg-slate-800 border border-wine-50 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute -right-6 -top-6 opacity-[0.03] transform scale-[2] pointer-events-none group-hover:scale-[2.2] transition-transform duration-500 text-wine-900 dark:text-white">
        {icon}
      </div>
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2.5 bg-gray-50 dark:bg-slate-700 text-wine-900 dark:text-white rounded-xl shadow-inner">
          {icon}
        </div>
        <h3 className="font-black uppercase tracking-widest text-[11px] text-wine-400 dark:text-wine-300">{title}</h3>
      </div>

      <div className="mb-6 relative z-10">
        <p className="text-[10px] uppercase font-bold text-wine-300 dark:text-slate-400 mb-1 tracking-widest">{heroLabel}</p>
        <div className="flex items-end gap-3">
          <h2 className="text-3xl font-black text-wine-900 dark:text-white tracking-tighter truncate">
            {isCurrency ? `R$ ${heroValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` :
             isPercent ? `${heroValue.toFixed(1)}%` : heroValue.toLocaleString()}
          </h2>
          {!isNeutral && (
             <div className={`flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs font-black mb-1 shadow-sm ${isGood ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
               {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} 
               {Math.abs(change).toFixed(0)}%
             </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end relative z-10">
        <div className="bg-gray-50/80 dark:bg-slate-900/50 rounded-2xl p-3 shadow-inner border border-gray-100 dark:border-slate-700/50">
          <div className="grid grid-cols-2 gap-2">
            {children}
          </div>
        </div>
      </div>
    </Card>
  );
};

const MetricMiniCard = ({ label, value, icon, isCurrency, isPercent }: any) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200/60 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group/minicard relative overflow-hidden">
      <div className="flex items-center gap-1.5 mb-2 relative z-10">
         <span className="text-wine-400 dark:text-wine-300 opacity-70 group-hover/minicard:scale-110 transition-transform">
           {icon}
         </span>
         <span className="text-[9px] uppercase font-black text-wine-500/80 dark:text-slate-400 tracking-wider truncate" title={label}>{label}</span>
      </div>
      <div className="flex justify-between items-end relative z-10">
         <span className="text-sm font-black text-wine-900 dark:text-white truncate" title={isCurrency ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : isPercent ? `${value.toFixed(1)}%` : value.toLocaleString()}>
           {isCurrency ? `R$ ${value >= 100000 ? (value / 1000).toFixed(1) + 'k' : value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` :
            isPercent ? `${value.toFixed(1)}%` : value.toLocaleString()}
         </span>
      </div>
    </div>
  );
};
