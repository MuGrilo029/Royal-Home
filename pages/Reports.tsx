import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { Product } from '../types';
import { Card, Button, Input, Modal } from '../components/UI';
import { parseISO, isInRange as utilsIsInRange } from '../lib/utils';

import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart as PieIcon,
    Download,
    FileText,
    ShoppingBag,
    Package,
    Calendar,
    ArrowRight,
    Filter,
    BarChart2,
    Table as TableIcon,
    Box,
    Activity,
    AlertCircle,
    X,
    Check,
    Target,
    Clock,
    CreditCard,
    AlertTriangle,
    Percent,
    Zap,
    CalendarDays,
    Trash2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, ReferenceLine
} from 'recharts';
import * as XLSX from 'xlsx';

type ReportTab = 'FINANCIAL' | 'SALES' | 'STOCK' | 'EXPENSES' | 'CUSTOMERS' | 'BOLETOS';

const CHART_COLORS = ['#881337', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#f43f5e'];

const COST_KEYWORDS = ['matéria prima', 'insumo', 'produção', 'custo variável', 'cmv', 'frete de compra'];

const formatCurrency = (value: number) => {
    return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const isDirectCost = (catObject: any, categoryName: string, groupName?: string) => {
    if (catObject?.isCmv) return true;
    const cat = (categoryName || '').toLowerCase();
    const grp = (groupName || '').toLowerCase();
    return COST_KEYWORDS.some(kw => cat.includes(kw) || grp.includes(kw));
};

const matchCategory = (catName: string, categories: any[]) => {
    if (!catName) return undefined;
    
    // Suporte a match por ID (caso a categoria tenha sido salva pelo UUID no banco novo)
    const exactIdMatch = categories.find(c => c.id === catName);
    if (exactIdMatch) return exactIdMatch;

    const normalizedTarget = catName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (!normalizedTarget) return undefined;
    
    const matches = categories.filter(c => 
        (c.name || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === normalizedTarget
    );
    
    return matches.find(c => c.type === 'EXPENSE') || matches[0];
};
// --- HELPER COMPONENTS ---
const DRERow = ({ label, value, isNegative, isBold, highlight, onClick }: any) => (
    <div 
        className={`flex justify-between items-center py-1 transition-colors ${onClick ? 'cursor-pointer hover:bg-wine-50/50 dark:hover:bg-slate-700/30 px-2 rounded' : ''} ${highlight ? 'bg-wine-50 dark:bg-slate-700/50 -mx-4 px-4 py-3 rounded-lg' : ''}`}
        onClick={onClick}
    >
        <span className={`text-xs ${isBold ? 'font-black uppercase tracking-tighter' : 'text-wine-600 dark:text-wine-300'} ${isNegative ? 'pl-4' : ''}`}>
            {label}
        </span>
        <span className={`font-mono text-sm ${isBold ? 'font-black' : 'font-medium'} ${isNegative ? 'text-red-500' : 'text-emerald-600'} ${highlight ? 'text-lg' : ''}`}>
            {isNegative ? '-' : ''} R$ {formatCurrency(Math.abs(value))}
        </span>
    </div>
);

const InventoryCard = ({ title, value, icon, color, subtitle }: any) => (
    <Card className="p-6">
        <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase text-wine-400 tracking-widest">{title}</span>
            <div className={`p-2 bg-gray-50 dark:bg-slate-700 rounded-xl ${color}`}>{icon}</div>
        </div>
        <h3 className={`text-2xl font-black ${color}`}>{value}</h3>
        {subtitle && <p className="text-[10px] text-gray-400 mt-2 font-medium leading-tight">{subtitle}</p>}
    </Card>
);



export const Reports: React.FC = () => {
    const { 
        transactions, 
        sales, 
        products, 
        categories, 
        categoryGroups,
        stockMovements,
        simulations,
        addSimulations,
        deleteSimulationGroup,
        clearSimulations,
        addNotification
    } = useAppStore();
    const [activeTab, setActiveTab] = useState<ReportTab>('FINANCIAL');
    const [drillDownGroup, setDrillDownGroup] = useState<string | null>(null);
    const [drillDownModal, setDrillDownModal] = useState<{ 
        isOpen: boolean, 
        title: string, 
        transactions: any[], 
        type: 'EXPENSE' | 'SALE' | 'COST' 
    }>({ 
        isOpen: false, 
        title: '', 
        transactions: [], 
        type: 'EXPENSE' 
    });

    // Carregar aba inicial se vier de um módulo específico
    React.useEffect(() => {
        const savedTab = localStorage.getItem('REPORTS_DEFAULT_TAB');
        if (savedTab) {
            setActiveTab(savedTab as ReportTab);
            localStorage.removeItem('REPORTS_DEFAULT_TAB');
        }
    }, []);

    // --- DATE FILTER STATE ---
    const [showClearSimulationsModal, setShowClearSimulationsModal] = useState(false);
    type TimeRange = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';
    const [timeRange, setTimeRange] = useState<TimeRange>('MONTH');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const isInRange = (dateString: string) => {
        return utilsIsInRange(dateString, timeRange, {
            customStart,
            customEnd,
            selectedMonth,
            selectedYear
        });
    };

    // --- BOLETOS SIMULATION STATE ---
    const [simulateAmount, setSimulateAmount] = useState<number | ''>('');
    const [simulateDesc, setSimulateDesc] = useState('Compra Simulada');
    const [simulateIntervals, setSimulateIntervals] = useState('30, 60, 90');
    const [simulateDate, setSimulateDate] = useState(new Date().toISOString().split('T')[0]);

    const handleAddSimulation = async () => {
        if (!simulateAmount || !simulateIntervals || !simulateDate) return;
        const intervals = simulateIntervals.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (intervals.length === 0) return;

        const groupId = `group-${Date.now()}`;
        const portion = Number(simulateAmount) / intervals.length;

        const [y, m, dLocal] = simulateDate.split('-').map(Number);

        const newSims = intervals.map((days, idx) => {
            const d = new Date(y, m - 1, dLocal);
            d.setDate(d.getDate() + days);
            return {
                groupId: groupId,
                description: `${simulateDesc} ${idx + 1}/${intervals.length}`,
                amount: portion,
                dueDate: d.toISOString()
            };
        });

        await addSimulations(newSims);
        setSimulateAmount('');
    };

    const handleOpenDrillDown = (title: string, trans: any[], type: 'EXPENSE' | 'SALE' | 'COST') => {
        setDrillDownModal({
            isOpen: true,
            title,
            transactions: trans,
            type
        });
    };

    // --- OPTIMIZATION: PRODUCT MAP FOR O(1) LOOKUPS ---
    const productMap = useMemo(() => {
        const map = new Map<string, Product>();
        (products || []).forEach(p => map.set(p.id, p));
        return map;
    }, [products]);

    // --- ANALYTICS CALCULATIONS ---
    const financialReport = useMemo(() => {
        // Para o DRE, usar transações pagas/concluídas (Regime de Caixa) para refletir o saldo real
        const periodTrans = (transactions || []).filter(t => isInRange(t.dueDate) && t.status === 'PAID');
        const periodSales = (sales || []).filter(s => isInRange(s.date) && s.status === 'COMPLETED');

        const revenue = periodTrans.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        const periodExpenses = periodTrans.filter(t => t.type === 'EXPENSE');

        // Separar Despesas em Custos Diretos (Insumos/Produção) e Despesas Operacionais
        const directCostsFromTrans = periodExpenses.filter(t => {
            const category = matchCategory(t.category || '', categories || []);
            const group = (categoryGroups || []).find(g => g.id === category?.groupId);
            return isDirectCost(category, t.category || '', group?.name);
        }).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        const operationalExpenses = periodExpenses.filter(t => {
            const category = matchCategory(t.category || '', categories || []);
            const group = (categoryGroups || []).find(g => g.id === category?.groupId);
            return !isDirectCost(category, t.category || '', group?.name);
        }).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        // Usuário solicitou remover o Custo Base Estoque para não duplicar, pois já lançam despesas manuais.
        const totalCosts = directCostsFromTrans;
        const totalExpenses = operationalExpenses;

        // Group expenses by Category Group for Macro View
        const expensesGrouped = periodExpenses.reduce((acc: Record<string, { id: string, value: number, isCost: boolean }>, t) => {
            const category = matchCategory(t.category || '', categories || []);
            const group = (categoryGroups || []).find(g => g.id === category?.groupId);
            const groupName = group?.name || 'Sem Grupo';
            const groupId = group?.id || 'none';

            // Retira do grupo de despesas operacionais as que já foram contabilizadas no CMV
            if (isDirectCost(category, t.category || '', groupName)) return acc;

            if (!acc[groupName]) {
                acc[groupName] = { id: groupId, value: 0, isCost: false };
            }
            acc[groupName].value += (Number(t.amount) || 0);
            return acc;
        }, {});

        const grossProfit = revenue - totalCosts;
        const netoProfit = revenue - totalCosts - totalExpenses;

        return {
            revenue,
            expensesTotal: totalExpenses,
            costOfGoods: totalCosts,
            cmv: 0,
            directCostsFromTrans,
            grossProfit,
            netoProfit,
            periodTrans,
            expensesGrouped,
            expensesInGroup: (groupId: string | null) => {
                return periodExpenses.filter(t => {
                    const category = matchCategory(t.category || '', categories || []);
                    if (groupId === 'none') return !category?.groupId;
                    return category?.groupId === groupId;
                }).reduce((acc: Record<string, number>, t) => {
                    const cat = t.category || 'Outras Despesas';
                    acc[cat] = (acc[cat] || 0) + (Number(t.amount) || 0);
                    return acc;
                }, {});
            }
        };
    }, [transactions, sales, productMap, timeRange, selectedMonth, selectedYear, customStart, customEnd, categories, categoryGroups]);

    const salesReport = useMemo(() => {
        const periodSales = (sales || []).filter(s => isInRange(s.date) && s.status === 'COMPLETED');
        const productStats: Record<string, any> = {};
        const catStats: Record<string, number> = {};
        let totalRevenue = 0;
        let totalQuantity = 0;
        let totalCost = 0;

        periodSales.forEach(s => {
            totalRevenue += (Number(s.total) || 0);

            // Calculate discount factor so item revenues proportionally sum up to the true sale total
            const saleGrossTotal = (s.items || []).reduce((sum, item) =>
                sum + ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)), 0
            );
            const discountFactor = saleGrossTotal > 0 ? (Number(s.total) / saleGrossTotal) : 1;

            s.items?.forEach(item => {
                const prod = item.productId ? productMap.get(item.productId) : null;
                const currentName = prod ? prod.name : item.productName;
                const currentCategory = prod ? prod.category : item.category;

                const key = item.productId || item.productName || 'Desconhecido';
                if (!productStats[key]) {
                    productStats[key] = { id: key, name: currentName || 'Produto', qty: 0, revenue: 0, category: currentCategory };
                }
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice) || 0;

                const itemGross = price * qty;
                const itemNetRevenue = itemGross * discountFactor;

                productStats[key].qty += qty;
                productStats[key].revenue += itemNetRevenue;
                totalQuantity += qty;

                totalCost += (qty * (Number(prod?.cost) || 0));

                const cat = currentCategory || 'Outros';
                catStats[cat] = (catStats[cat] || 0) + itemNetRevenue;
            });
        });

        const topProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
        const topCategories = Object.entries(catStats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        return {
            topProducts,
            topCategories,
            totalSales: periodSales.length,
            totalRevenue,
            totalQuantity,
            averageTicket: periodSales.length > 0 ? totalRevenue / periodSales.length : 0,
            estimatedProfit: totalRevenue - totalCost
        };
    }, [sales, productMap, timeRange, selectedMonth, selectedYear, customStart, customEnd]);

    const inventoryReport = useMemo(() => {
        const totalValue = (products || []).reduce((acc, p) => acc + ((Number(p.quantity) || 0) * (Number(p.cost) || 0)), 0);
        const lowStock = (products || []).filter(p => (Number(p.minStock) || 0) > 0 && (Number(p.quantity) || 0) <= (Number(p.minStock) || 0));

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        // Baixo Giro: produtos que entraram há mais de 90 dias
        const stagnant = products.filter(p => {
            const isInStock = (Number(p.quantity) || 0) > 0;
            const isOldEnough = p.entryDate ? new Date(p.entryDate) < ninetyDaysAgo : false;
            return isInStock && isOldEnough;
        });

        // Alto Giro: produtos que mais vendem nos últimos 60 dias, ordenados por velocidade de giro
        const recentSales = (sales || []).filter(s => new Date(s.date) > sixtyDaysAgo && s.status === 'COMPLETED');
        const highTurnoverStats: Record<string, { 
            quantity: number, 
            revenue: number, 
            product: Product,
            totalTurnoverDays: number,
            salesCount: number
        }> = {};

        recentSales.forEach(s => {
            s.items?.forEach(item => {
                if (item.productId) {
                    const prod = productMap.get(item.productId);
                    if (prod && prod.entryDate) {
                        // Ignora produtos que sejam serviços (não faz sentido medir giro de serviço)
                        const catName = (prod.category || '').toUpperCase();
                        if (catName.includes('SERVIÇO') || catName.includes('SERVICO')) {
                            return;
                        }

                        const entryDate = new Date(prod.entryDate);
                        // Zera a hora para comparar apenas as datas
                        entryDate.setHours(0, 0, 0, 0);
                        
                        const saleDate = new Date(s.date);
                        saleDate.setHours(0, 0, 0, 0);

                        const diffTime = saleDate.getTime() - entryDate.getTime();
                        
                        // Só contabiliza se a venda ocorreu DEPOIS (ou no mesmo dia) da entrada.
                        // Se diffTime for negativo, a venda é de um lote de estoque antigo.
                        if (diffTime >= 0) {
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            // Considera como Alto Giro apenas se foi vendido em até 60 dias após a entrada
                            if (diffDays <= 60) {
                                if (!highTurnoverStats[item.productId]) {
                                    highTurnoverStats[item.productId] = { 
                                        quantity: 0, 
                                        revenue: 0, 
                                        product: prod,
                                        totalTurnoverDays: 0,
                                        salesCount: 0
                                    };
                                }
                                
                                const stats = highTurnoverStats[item.productId];
                                stats.quantity += (Number(item.quantity) || 0);
                                stats.revenue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                                stats.totalTurnoverDays += diffDays;
                                stats.salesCount += 1;
                            }
                        }
                    }
                }
            });
        });

        const highTurnover = Object.values(highTurnoverStats)
            .filter(stats => stats.salesCount > 0) // Garante que só mostra os que tiveram vendas no critério
            .map(stats => ({
                ...stats,
                avgTurnoverDays: stats.totalTurnoverDays / stats.salesCount
            }))
            .sort((a, b) => a.avgTurnoverDays - b.avgTurnoverDays); // Menor tempo é melhor

        // Previsão de Estoque (Próximos 90 dias)
        // Baseada na média de valor de entrada dos últimos 90 dias
        const past90DaysPurchases = (stockMovements || []).filter(m => 
            m.type === 'PURCHASE' && new Date(m.date) >= ninetyDaysAgo
        );

        let forecast90Days = 0;
        past90DaysPurchases.forEach(m => {
            const prod = productMap.get(m.productId);
            if (prod) {
                forecast90Days += (Number(m.quantity) || 0) * (Number(prod.cost) || 0);
            }
        });

        return { totalValue, lowStock, stagnant, highTurnover, forecast90Days };
    }, [products, sales, productMap, stockMovements]);

    const customerReport = useMemo(() => {
        const periodSales = (sales || []).filter(s => isInRange(s.date) && s.status === 'COMPLETED');
        const customerStats: Record<string, any> = {};

        periodSales.forEach(s => {
            const name = s.customerName || 'Cliente Final';
            if (!customerStats[name]) {
                customerStats[name] = { name, revenue: 0, salesCount: 0, lastSale: s.date };
            }
            customerStats[name].revenue += (Number(s.total) || 0);
            customerStats[name].salesCount += 1;
            if (new Date(s.date) > new Date(customerStats[name].lastSale)) {
                customerStats[name].lastSale = s.date;
            }
        });

        const ranking = Object.values(customerStats)
            .map((c: any) => ({ ...c, averageTicket: c.salesCount > 0 ? c.revenue / c.salesCount : 0 }))
            .sort((a, b) => b.revenue - a.revenue);

        return { ranking };
    }, [sales, timeRange, selectedMonth, selectedYear, customStart, customEnd]);

    // --- STRATEGIC INDICATORS CALCULATIONS ---
    const strategicData = useMemo(() => {
        const today = new Date();
        const now = today.getTime();

        // 1. Médias Históricas (Últimos 3 meses)
        const last3MonthsTrans = (transactions || []).filter(t => {
            const d = new Date(t.date);
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(today.getMonth() - 3);
            return d >= threeMonthsAgo && d <= today;
        });

        const avgFixedExpenses = last3MonthsTrans.filter(t => t.type === 'EXPENSE' && t.accountType === 'FIXED').reduce((acc, t) => acc + (Number(t.amount) || 0), 0) / 3 || 1;
        const avgVariableExpenses = last3MonthsTrans.filter(t => t.type === 'EXPENSE' && t.accountType === 'VARIABLE').reduce((acc, t) => acc + (Number(t.amount) || 0), 0) / 3 || 0;
        const avgMonthlyExpenses = avgFixedExpenses + avgVariableExpenses;

        const last3MonthsSales = (sales || []).filter(s => {
            const d = new Date(s.date);
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(today.getMonth() - 3);
            return d >= threeMonthsAgo && d <= today && s.status === 'COMPLETED';
        });
        const avgMonthlyRevenue = last3MonthsSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0) / 3 || 0;

        // 2. Indicadores do Período Atual
        const periodExpenses = (transactions || []).filter(t => t.type === 'EXPENSE' && isInRange(t.dueDate));
        const fixedExpensesTotal = periodExpenses.filter(t => t.accountType === 'FIXED').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
        const variableExpensesTotal = periodExpenses.filter(t => t.accountType === 'VARIABLE').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        const breakEven = fixedExpensesTotal + variableExpensesTotal;

        const totalIncomeAcrossTime = (transactions || []).filter(t => t.type === 'INCOME' && t.status === 'PAID').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
        const totalExpenseAcrossTime = (transactions || []).filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
        const currentBalance = totalIncomeAcrossTime - totalExpenseAcrossTime;
        const dailyExpense = avgMonthlyExpenses / 30;
        const cashDays = dailyExpense > 0 ? Math.floor(currentBalance / dailyExpense) : 0;

        const periodSales = (sales || []).filter(s => isInRange(s.date));
        const totalSalesAmount = periodSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
        const installmentSalesAmount = periodSales
            .filter(s => {
                const m1 = (s.paymentMethod || '').toLowerCase();
                const m2 = (s.remainingPaymentMethod || '').toLowerCase();
                return m1.includes('cartão') || m1.includes('cartao') || m1.includes('parcelado') || 
                       m2.includes('cartão') || m2.includes('cartao') || m2.includes('parcelado');
            })
            .reduce((acc, s) => acc + (Number(s.total) || 0), 0);
        const creditDependency = totalSalesAmount > 0 ? (installmentSalesAmount / totalSalesAmount) * 100 : 0;

        // 3. Gargalos
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        const lastMonthExpenses = (transactions || []).filter(t => {
            const d = new Date(t.date);
            return t.type === 'EXPENSE' && d >= lastMonth && d <= lastMonthEnd;
        });

        const getCatGrowth = () => {
            const currentByCat: Record<string, number> = {};
            const lastByCat: Record<string, number> = {};
            periodExpenses.forEach(t => { currentByCat[t.category] = (currentByCat[t.category] || 0) + t.amount; });
            lastMonthExpenses.forEach(t => { lastByCat[t.category] = (lastByCat[t.category] || 0) + t.amount; });
            let maxGrowth = -Infinity;
            let topCat = 'Nenhuma';
            Object.keys(currentByCat).forEach(cat => {
                const growth = currentByCat[cat] - (lastByCat[cat] || 0);
                if (growth > maxGrowth) { maxGrowth = growth; topCat = cat; }
            });
            return { cat: topCat, growth: maxGrowth };
        };
        const bottleneckCat = getCatGrowth();

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(today.getDate() - 60);
        const recent60Sales = (sales || []).filter(s => new Date(s.date) >= sixtyDaysAgo);
        const prodTurnover: Record<string, number> = {};
        recent60Sales.forEach(s => s.items?.forEach(i => {
            if (i.productId) prodTurnover[i.productId] = (prodTurnover[i.productId] || 0) + (Number(i.quantity) || 0);
        }));
        const bottleneckProduct = (products || [])
            .map(p => ({
                ...p,
                turnover: prodTurnover[p.id] || 0,
                score: (Number(p.cost) || 0) / (prodTurnover[p.id] || 0.1)
            }))
            .sort((a, b) => b.score - a.score)[0];

        const productVolumeStats: Record<string, { total: number, cost: number }> = {};
        periodSales.forEach(s => {
            s.items?.forEach(item => {
                const name = item.productName || 'Sem Nome';
                if (!productVolumeStats[name]) productVolumeStats[name] = { total: 0, cost: 0 };
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice) || 0;
                const p = item.productId ? productMap.get(item.productId) : null;

                productVolumeStats[name].total += price * qty;
                productVolumeStats[name].cost += qty * (Number(p?.cost) || 0);
            });
        });
        const bottleneckLowMargin = Object.entries(productVolumeStats)
            .map(([name, stats]) => ({
                name,
                total: stats.total,
                margin: stats.total > 0 ? ((stats.total - stats.cost) / stats.total) * 100 : 0
            }))
            .filter(p => p.total > 0)
            .sort((a, b) => b.total - a.total) // Primeiro prioriza volume
            .sort((a, b) => a.margin - b.margin)[0]; // Depois pega a menor margem

        // 4. Previsão de Caixa (Futuro) - REFINADA
        const getProjection = (days: number) => {
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + days);
            const monthsForward = days / 30;

            const inflowPending = (transactions || [])
                .filter(t => t.type === 'INCOME' && (t.status === 'PENDING' || t.status === 'LATE') && new Date(t.dueDate) <= futureDate)
                .reduce((acc, t) => acc + t.amount, 0) +
                (sales || [])
                    .filter(s => s.remainingStatus === 'PENDING' && new Date(s.date) <= futureDate)
                    .reduce((acc, s) => acc + (Number(s.remainingAmount) || 0), 0);

            const outflowPending = (transactions || [])
                .filter(t => t.type === 'EXPENSE' && (t.status === 'PENDING' || t.status === 'LATE') && new Date(t.dueDate) <= futureDate)
                .reduce((acc, t) => acc + t.amount, 0);

            const projectedRevenue = Math.max(inflowPending, (avgMonthlyRevenue * monthsForward) * 0.85);
            const projectedExpenses = Math.max(outflowPending, (avgMonthlyExpenses * monthsForward));

            const projectedBalance = currentBalance + projectedRevenue - projectedExpenses;
            return { projectedBalance, income: projectedRevenue, expenses: projectedExpenses };
        };

        const forecast30 = getProjection(30);
        const forecast60 = getProjection(60);
        const forecast90 = getProjection(90);

        // 5. Alertas
        const alerts = [];
        const periodRevenue = (sales || []).filter(s => isInRange(s.date)).reduce((acc, s) => acc + (Number(s.total) || 0), 0);
        const periodExpenseTotal = periodExpenses.reduce((acc, t) => acc + t.amount, 0);
        if (periodExpenseTotal > periodRevenue) alerts.push({ type: 'danger', msg: 'Despesas superaram as receitas no período!', icon: <TrendingDown size={14} /> });
        if (breakEven > periodRevenue) alerts.push({ type: 'warning', msg: 'Faturamento abaixo do ponto de equilíbrio.', icon: <Target size={14} /> });
        if (cashDays < 15) alerts.push({ type: 'danger', msg: 'Caixa crítico! Menos de 15 dias de reserva.', icon: <Clock size={14} /> });
        const stagnantCount = products.filter(p => (p.quantity || 0) > 0 && (!p.entryDate || (now - new Date(p.entryDate).getTime()) > 90 * 24 * 60 * 60 * 1000)).length;
        if (stagnantCount > 5) alerts.push({ type: 'info', msg: `${stagnantCount} produtos parados há mais de 90 dias.`, icon: <Package size={14} /> });

        // 6. Qualidade da Receita
        const revenueQuality = {
            cash: totalSalesAmount - installmentSalesAmount,
            installment: installmentSalesAmount,
            highTax: periodSales.filter(s => s.paymentMethod.toLowerCase().includes('cartão') && !s.paymentMethod.toLowerCase().includes('débito')).reduce((acc, s) => acc + (Number(s.total) || 0), 0),
            lowTax: periodSales.filter(s => !s.paymentMethod.toLowerCase().includes('cartão') || s.paymentMethod.toLowerCase().includes('débito')).reduce((acc, s) => acc + (Number(s.total) || 0), 0),
            ticketByMethod: periodSales.reduce((acc: Record<string, { total: number, count: number }>, s) => {
                const method = s.paymentMethod || 'Outros';
                if (!acc[method]) acc[method] = { total: 0, count: 0 };
                acc[method].total += (Number(s.total) || 0);
                acc[method].count += 1;
                return acc;
            }, {})
        };

        // 7. Comparativos
        const getPrevYearMonth = () => {
            const start = new Date(today.getFullYear() - 1, today.getMonth(), 1);
            const end = new Date(today.getFullYear() - 1, today.getMonth() + 1, 0);
            return (sales || []).filter(s => { const d = new Date(s.date); return d >= start && d <= end; }).reduce((acc, s) => acc + (Number(s.total) || 0), 0);
        };
        const prevMonthRevenue = (sales || []).filter(s => { const d = new Date(s.date); return d >= lastMonth && d <= lastMonthEnd; }).reduce((acc, s) => acc + (Number(s.total) || 0), 0);

        const comparatives = {
            vsPrevMonth: prevMonthRevenue > 0 ? ((periodRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0,
            vsPrevYear: getPrevYearMonth() > 0 ? ((periodRevenue - getPrevYearMonth()) / getPrevYearMonth()) * 100 : 0,
            avgLast3: avgMonthlyExpenses
        };

        return {
            breakEven, cashDays, creditDependency, bottleneckCat, bottleneckProduct, bottleneckLowMargin,
            forecast: [
                { label: '30 Dias', ...forecast30 },
                { label: '60 Dias', ...forecast60 },
                { label: '90 Dias', ...forecast90 }
            ],
            alerts, revenueQuality, comparatives, currentBalance
        };
    }, [transactions, sales, products, categories, categoryGroups, isInRange, productMap]);

    const cashFlowByCategory = useMemo(() => {
        const paidTrans = financialReport.periodTrans.filter(t => t.status === 'PAID');
        const grouped = paidTrans.reduce((acc: Record<string, { value: number, type: string }>, t) => {
            const cat = t.category || 'Outros';
            if (!acc[cat]) acc[cat] = { value: 0, type: t.type };
            acc[cat].value += t.amount;
            return acc;
        }, {});

        return Object.entries(grouped).map(([name, data]: [string, { value: number, type: string }]) => ({
            name,
            value: data.value,
            type: data.type
        }));
    }, [financialReport.periodTrans]);

    // --- DYNAMIC EVOLUTION DATA (Used for Area/Line Charts) ---
    const expensesEvolutionData = useMemo(() => {
        let startDate: Date;
        let endDate: Date;
        let unit: 'day' | 'month';

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (timeRange === 'MONTH') {
            startDate = new Date(selectedYear, selectedMonth, 1);
            endDate = new Date(selectedYear, selectedMonth + 1, 0);
            unit = 'day';
        } else if (timeRange === 'YEAR') {
            startDate = new Date(selectedYear, 0, 1);
            endDate = new Date(selectedYear, 11, 31);
            unit = 'month';
        } else if (timeRange === 'WEEK') {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            endDate = now;
            unit = 'day';
        } else if (timeRange === 'TODAY') {
            startDate = now;
            endDate = now;
            unit = 'day';
        } else if (timeRange === 'CUSTOM' && customStart && customEnd) {
            const s = customStart.split('-');
            const e = customEnd.split('-');
            startDate = new Date(Number(s[0]), Number(s[1]) - 1, Number(s[2]));
            endDate = new Date(Number(e[0]), Number(e[1]) - 1, Number(e[2]));
            const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
            unit = diffDays > 60 ? 'month' : 'day';
        } else {
            startDate = new Date(selectedYear, selectedMonth, 1);
            endDate = new Date(selectedYear, selectedMonth + 1, 0);
            unit = 'day';
        }

        const tempResult: Record<string, { label: string, value: number, sortKey: string }> = {};
        const cursor = new Date(startDate);
        cursor.setHours(0, 0, 0, 0);

        // 1. Initialize all time points with zero
        const limit = 500;
        let count = 0;
        while (cursor <= endDate && count < limit) {
            const label = unit === 'day'
                ? cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                : cursor.toLocaleDateString('pt-BR', { month: 'short' });

            const sortKey = cursor.toISOString();
            if (!tempResult[label]) {
                tempResult[label] = { label, value: 0, sortKey };
            }

            if (unit === 'day') {
                cursor.setDate(cursor.getDate() + 1);
            } else {
                cursor.setMonth(cursor.getMonth() + 1);
                cursor.setDate(1);
            }
            count++;
        }

        // 2. Aggregate actual data
        let baseExpenses = financialReport.periodTrans.filter(t => t.type === 'EXPENSE');
        if (drillDownGroup) {
            baseExpenses = baseExpenses.filter(t => {
                const category = matchCategory(t.category || '', categories || []);
                if (drillDownGroup === 'none') return !category?.groupId;
                return category?.groupId === drillDownGroup;
            });
        }

        baseExpenses.forEach(t => {
            const d = new Date(t.date);
            const label = unit === 'day'
                ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                : d.toLocaleDateString('pt-BR', { month: 'short' });

            if (tempResult[label]) {
                tempResult[label].value += Number(t.amount) || 0;
            }
        });

        return Object.values(tempResult).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [financialReport.periodTrans, timeRange, selectedMonth, selectedYear, customStart, customEnd, drillDownGroup, categories]);

    // --- MONTHLY DRE ANALYTICS ---
    const [activeMetrics, setActiveMetrics] = useState<string[]>(['faturamento']);
    const [isAccumulated, setIsAccumulated] = useState(false);

    const monthlyData = useMemo(() => {
        const baseData = Array.from({ length: 12 }, (_, monthIdx) => {
            const start = new Date(selectedYear, monthIdx, 1);
            const end = new Date(selectedYear, monthIdx + 1, 0);

            const periodSales = (sales || []).filter(s => {
                const d = new Date(s.date);
                return d >= start && d <= end && s.status === 'COMPLETED';
            });

            const periodTrans = (transactions || []).filter(t => {
                const d = new Date(t.date);
                return d >= start && d <= end && t.status === 'PAID';
            });

            const faturamento = periodSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

            // CMV
            const cmv = periodSales.reduce((acc, s) => acc + (s.items?.reduce((sum, item) => {
                const prod = (products || []).find(p => p.id === item.productId);
                return sum + ((Number(item.quantity) || 0) * (Number(prod?.cost) || 0));
            }, 0) || 0), 0);

            const periodExpenses = periodTrans.filter(t => t.type === 'EXPENSE');

            // Custos Diretos vs Despesas Operacionais
            const directCosts = periodExpenses.filter(t => {
                const category = matchCategory(t.category || '', categories || []);
                const group = categoryGroups.find(g => g.id === category?.groupId);
                return isDirectCost(category, t.category || '', group?.name);
            }).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

            const operationalExpenses = periodExpenses.filter(t => {
                const category = matchCategory(t.category || '', categories || []);
                const group = categoryGroups.find(g => g.id === category?.groupId);
                return !isDirectCost(category, t.category || '', group?.name);
            }).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

            const custos = cmv + directCosts;
            const despesas = operationalExpenses;
            const quantidades = periodSales.reduce((acc, s) => acc + (s.items?.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) || 0), 0);

            return {
                name: new Date(0, monthIdx).toLocaleString('pt-BR', { month: 'short' }),
                faturamento,
                custos,
                despesas,
                lucroLiquido: faturamento - custos - despesas,
                quantidades
            };
        });

        if (!isAccumulated) return baseData;

        // Transform into accumulated data
        let accFaturamento = 0;
        let accCustos = 0;
        let accDespesas = 0;
        let accQuantidades = 0;

        return baseData.map(d => {
            accFaturamento += d.faturamento;
            accCustos += d.custos;
            accDespesas += d.despesas;
            accQuantidades += d.quantidades;

            return {
                ...d,
                faturamento: accFaturamento,
                custos: accCustos,
                despesas: accDespesas,
                lucroBruto: accFaturamento - accCustos,
                lucroLiquido: (accFaturamento - accCustos) - accDespesas,
                quantidades: accQuantidades
            };
        });
    }, [sales, transactions, products, selectedYear, isAccumulated]);

    // --- EXPORT FUNCTION ---
    const exportToExcel = (data: any[], fileName: string) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    };

    // --- RENDER FUNCTIONS ---
    const renderFinancial = () => {
        return (
            <div className="space-y-6">
                {/* 1. ALERTAS FINANCEIROS (PAINEL DE RISCO) */}
                {strategicData.alerts.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        {strategicData.alerts.map((alert, i) => (
                            <div key={i} className={`p-4 rounded-2xl flex items-center gap-3 border shadow-sm ${alert.type === 'danger' ? 'bg-red-50 border-red-100 text-red-700' :
                                alert.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                    'bg-blue-50 border-blue-100 text-blue-700'
                                }`}>
                                <div className={`p-2 rounded-xl ${alert.type === 'danger' ? 'bg-red-100' :
                                    alert.type === 'warning' ? 'bg-amber-100' :
                                        'bg-blue-100'
                                    }`}>
                                    {alert.icon}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-tight">{alert.msg}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* PERFORMANCE E COMPARATIVOS */}
                <Card className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <h3 className="text-lg font-black text-wine-900 dark:text-white uppercase tracking-tighter">Performance Mensal ({selectedYear})</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[10px] text-wine-500 font-bold uppercase">
                                        {isAccumulated ? '📊 Visão Acumulada (YTD)' : '📅 Evolução Mensal'}
                                    </p>
                                    <span className="text-[8px] px-2 py-0.5 bg-wine-50 text-wine-600 rounded-full font-black uppercase">
                                        vs Mês Ant: {strategicData.comparatives.vsPrevMonth > 0 ? '+' : ''}{strategicData.comparatives.vsPrevMonth.toFixed(1)}%
                                    </span>
                                    <span className="text-[8px] px-2 py-0.5 bg-wine-50 text-wine-600 rounded-full font-black uppercase">
                                        vs Ano Ant: {strategicData.comparatives.vsPrevYear > 0 ? '+' : ''}{strategicData.comparatives.vsPrevYear.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex bg-wine-50 dark:bg-slate-700 p-1 rounded-xl">
                                <button onClick={() => setIsAccumulated(false)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!isAccumulated ? 'bg-wine-900 text-white shadow-md' : 'text-wine-500 hover:bg-wine-100'}`}>MENSAL</button>
                                <button onClick={() => setIsAccumulated(true)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${isAccumulated ? 'bg-wine-900 text-white shadow-md' : 'text-wine-500 hover:bg-wine-100'}`}>ACUMULADO</button>
                            </div>

                            <div className="flex flex-wrap gap-1 bg-wine-50 dark:bg-slate-700 p-1 rounded-xl">
                                {[
                                    { id: 'faturamento', label: 'Faturamento', color: '#10b981' },
                                    { id: 'custos', label: 'Custos', color: '#f59e0b' },
                                    { id: 'despesas', label: 'Despesas', color: '#ef4444' },
                                    { id: 'lucroLiquido', label: 'Lucro Líquido', color: '#881337' }
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => {
                                            if (activeMetrics.includes(m.id)) {
                                                if (activeMetrics.length > 1) setActiveMetrics(activeMetrics.filter(id => id !== m.id));
                                            } else {
                                                setActiveMetrics([...activeMetrics, m.id]);
                                            }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border-b-2 ${activeMetrics.includes(m.id) ? 'bg-white dark:bg-slate-600 text-wine-900 dark:text-white shadow-sm' : 'text-wine-500 hover:bg-wine-100'}`}
                                        style={{ borderColor: activeMetrics.includes(m.id) ? m.color : 'transparent' }}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', padding: '16px' }}
                                    cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-wine-100/50 dark:border-slate-700/50">
                                                    <p className="text-xs font-black text-wine-900 dark:text-white uppercase mb-3 pb-2 border-b border-wine-100 dark:border-slate-700">{label} / {selectedYear}</p>
                                                    <div className="space-y-2">
                                                        {payload.map((entry: any, index: number) => (
                                                            <div key={index} className="flex justify-between items-center gap-8">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">{entry.name}</span>
                                                                </div>
                                                                <span className="text-sm font-mono font-black text-wine-900 dark:text-white">R$ {formatCurrency(entry.value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                                {activeMetrics.includes('faturamento') && <Bar dataKey="faturamento" name="Faturamento" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />}
                                {activeMetrics.includes('custos') && <Bar dataKey="custos" name="Custos" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={25} />}
                                {activeMetrics.includes('despesas') && <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={25} />}
                                {activeMetrics.includes('lucroLiquido') && (
                                    <Bar dataKey="lucroLiquido" name="Lucro Líquido" radius={[4, 4, 0, 0]} barSize={25}>
                                        {monthlyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.lucroLiquido >= 0 ? '#10b981' : '#f43f5e'} />
                                        ))}
                                    </Bar>
                                )}
                                <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 2. INDICADORES DE DECISÃO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 border-l-4 border-indigo-500">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ponto de Equilíbrio</h4>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1">R$ {formatCurrency(strategicData.breakEven)}</h3>
                            </div>
                            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl"><Target size={20} /></div>
                        </div>
                        <p className="text-[9px] text-gray-400 font-bold uppercase leading-tight italic">
                            Faturamento mínimo necessário para não ter prejuízo
                        </p>
                    </Card>

                    <Card className="p-6 border-l-4 border-emerald-500">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dias de Caixa</h4>
                                <h3 className={`text-xl font-black mt-1 ${strategicData.cashDays > 30 ? 'text-emerald-600' : strategicData.cashDays > 15 ? 'text-amber-500' : 'text-red-600'}`}>
                                    {strategicData.cashDays} Dias
                                </h3>
                            </div>
                            <div className={`p-2 rounded-xl ${strategicData.cashDays > 30 ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}><Clock size={20} /></div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${strategicData.cashDays > 30 ? 'bg-emerald-500' : strategicData.cashDays > 15 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min((strategicData.cashDays / 60) * 100, 100)}%` }} />
                        </div>
                    </Card>

                    <Card className="p-6 border-l-4 border-orange-500">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dependência de Crédito</h4>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1">{strategicData.creditDependency.toFixed(1)}%</h3>
                            </div>
                            <div className="p-2 bg-orange-50 text-orange-500 rounded-xl"><CreditCard size={20} /></div>
                        </div>
                        <p className="text-[9px] text-gray-400 font-bold uppercase leading-tight italic">
                            Quanto da receita depende de vendas parceladas
                        </p>
                    </Card>
                </div>

                {/* 3. ANÁLISE DE GARGALOS E QUALIDADE DA RECEITA */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6 bg-wine-50/30 border-none shadow-none">
                        <h3 className="text-sm font-black text-wine-900 dark:text-white uppercase mb-4 flex items-center gap-2">
                            <TrendingDown size={16} /> Principais Gargalos Financeiros
                        </h3>
                        <div className="space-y-3">
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-wine-100/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Zap size={14} /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase">Maior Crescimento de Despesa</p>
                                        <p className="text-xs font-bold text-wine-900 dark:text-white truncate max-w-[150px]">{strategicData.bottleneckCat.cat}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-red-600">+{strategicData.bottleneckCat.growth > 0 ? strategicData.bottleneckCat.growth.toFixed(0) : '0'} %</span>
                            </div>

                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-wine-100/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Package size={14} /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase">Menor Giro / Maior Custo</p>
                                        <p className="text-xs font-bold text-wine-900 dark:text-white truncate max-w-[150px]">{strategicData.bottleneckProduct?.name || 'Nenhum'}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-amber-600">R$ {formatCurrency(strategicData.bottleneckProduct?.cost || 0)}</span>
                            </div>

                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-wine-100/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Activity size={14} /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase">Alto Volume / Baixa Margem</p>
                                        <p className="text-xs font-bold text-wine-900 dark:text-white truncate max-w-[150px]">{strategicData.bottleneckLowMargin?.name || 'Nenhum'}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-blue-600">{strategicData.bottleneckLowMargin?.margin.toFixed(1)}% MG</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-black text-wine-900 dark:text-white uppercase mb-4 flex items-center gap-2">
                            <Percent size={16} /> Qualidade da Receita
                        </h3>
                        <div className="grid grid-cols-2 gap-4 h-[120px]">
                            <div className="p-4 bg-emerald-50 rounded-2xl text-center flex flex-col justify-center">
                                <p className="text-[9px] font-black text-emerald-800 uppercase mb-1">À Vista</p>
                                <p className="text-lg font-black text-emerald-900">R$ {formatCurrency(strategicData.revenueQuality.cash)}</p>
                            </div>
                            <div className="p-4 bg-wine-50 rounded-2xl text-center flex flex-col justify-center">
                                <p className="text-[9px] font-black text-wine-800 uppercase mb-1">Parcelada</p>
                                <p className="text-lg font-black text-wine-900">R$ {formatCurrency(strategicData.revenueQuality.installment)}</p>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-wine-100">
                            <div className="flex justify-between items-center text-[10px] font-black text-wine-900 uppercase">
                                <span>Ticket Médio por Canal</span>
                            </div>
                            <div className="mt-2 space-y-1">
                                {Object.entries(strategicData.revenueQuality.ticketByMethod).slice(0, 3).map(([method, stats]: [string, any]) => (
                                    <div key={method} className="flex justify-between text-[11px]">
                                        <span className="text-gray-400 uppercase">{method}</span>
                                        <span className="font-black text-wine-900">R$ {formatCurrency(stats.total / stats.count)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 4. PREVISÃO DE CAIXA (FUTURO) */}
                <Card className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
                        <h3 className="text-lg font-black text-wine-900 dark:text-white uppercase flex items-center gap-2">
                            <CalendarDays size={20} className="text-wine-600" /> Previsão de Caixa (Projeção)
                        </h3>
                        <p className="text-[9px] text-wine-400 font-bold uppercase bg-wine-50 px-3 py-1 rounded-full">
                            Baseado em Médias (Últ. 3 meses) com -15% de margem no faturamento
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {strategicData.forecast.map((f, i) => (
                            <div key={i} className={`p-5 rounded-3xl border-2 transition-all ${f.projectedBalance >= 0 ? 'border-emerald-100 bg-emerald-50/20' : 'border-red-100 bg-red-50/20'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black uppercase text-gray-500">{f.label}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${f.projectedBalance >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {f.projectedBalance >= 0 ? 'Saldo Positivo' : 'Saldo Negativo'}
                                    </span>
                                </div>
                                <h4 className={`text-2xl font-black mb-4 ${f.projectedBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                    R$ {formatCurrency(f.projectedBalance)}
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-gray-400">ENTRADAS PREV.</span>
                                        <span className="text-emerald-600">R$ {formatCurrency(f.income)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-gray-400">SAÍDAS PREV.</span>
                                        <span className="text-red-500">R$ {formatCurrency(f.expenses)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* DRE E FLUXO POR CATEGORIA (EXISTENTES) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-wine-900 dark:text-white uppercase tracking-tighter">Demonstrativo de Resultado (DRE) Detalhado</h3>
                            <Button variant="outline" size="sm" onClick={() => exportToExcel([
                                { Descrição: 'Receita Bruta', Valor: financialReport.revenue },
                                { Descrição: 'Custos (CMV)', Valor: financialReport.costOfGoods },
                                { Descrição: 'Lucro Bruto', Valor: financialReport.grossProfit },
                                ...Object.entries(financialReport.expensesGrouped).map(([cat, data]: [string, any]) => ({ Descrição: `Despesa: ${cat}`, Valor: data.value })),
                                { Descrição: 'Lucro Líquido', Valor: financialReport.netoProfit }
                            ], 'DRE_Detalhado')}><Download size={14} className="mr-2" /> Exportar</Button>
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            <section>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Receitas e Custos Diretos</h4>
                                <DRERow 
                                    label="(+) Receita Operacional Bruta" 
                                    value={financialReport.revenue} 
                                    isBold 
                                    onClick={() => handleOpenDrillDown('Receitas (Entradas)', (transactions || []).filter(t => isInRange(t.dueDate) && t.status === 'PAID' && t.type === 'INCOME'), 'EXPENSE')}
                                />
                                <DRERow 
                                    label="(-) Compras e Despesas (CMV)" 
                                    value={financialReport.directCostsFromTrans} 
                                    isNegative 
                                    onClick={() => {
                                        const directTrans = (transactions || []).filter(t => {
                                            if (!isInRange(t.dueDate) || t.type !== 'EXPENSE' || t.status !== 'PAID') return false;
                                            const category = matchCategory(t.category || '', categories || []);
                                            const group = (categoryGroups || []).find(g => g.id === category?.groupId);
                                            return isDirectCost(category, t.category || '', group?.name);
                                        });
                                        handleOpenDrillDown('Despesas CMV e Custos', directTrans, 'EXPENSE');
                                    }}
                                />
                                <div className="h-px bg-wine-100 my-2" />
                                <DRERow label="(=) LUCRO BRUTO" value={financialReport.grossProfit} isBold highlight isNegative={financialReport.grossProfit < 0} />
                            </section>

                            <section className="mt-6">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Despesas Operacionais</h4>
                                {Object.entries(financialReport.expensesGrouped).filter(([_, data]: [string, any]) => !data.isCost).length === 0 ? (
                                    <p className="text-[10px] text-gray-400 font-bold uppercase py-2">Nenhuma despesa no período</p>
                                ) : Object.entries(financialReport.expensesGrouped)
                                    .filter(([_, data]: [string, any]) => !data.isCost)
                                    .sort((a: any, b: any) => b[1].value - a[1].value)
                                    .map(([groupName, data]: [string, any]) => (
                                        <DRERow 
                                            key={groupName} 
                                            label={`(-) ${groupName}`} 
                                            value={data.value} 
                                            isNegative 
                                            onClick={() => {
                                                const groupTrans = (transactions || []).filter(t => {
                                                    if (!isInRange(t.dueDate) || t.type !== 'EXPENSE' || t.status !== 'PAID') return false;
                                                    const category = matchCategory(t.category || '', categories || []);
                                                    const group = (categoryGroups || []).find(g => g.id === category?.groupId);
                                                    const currentGroupName = group?.name || 'Sem Grupo';
                                                    const currentGroupId = group?.id || 'none';
                                                    
                                                    // Excluir custos diretos para não divergir da soma da linha
                                                    if (isDirectCost(category, t.category || '', currentGroupName)) return false;

                                                    // Compare by ID or name if "Sem Grupo"
                                                    if (data.id === 'none') return currentGroupId === 'none';
                                                    return currentGroupId === data.id;
                                                });
                                                handleOpenDrillDown(`Despesas: ${groupName}`, groupTrans, 'EXPENSE');
                                            }}
                                        />
                                    ))}
                                <div className="h-px bg-wine-100 my-2" />
                                <DRERow label="Total Despesas Operacionais" value={financialReport.expensesTotal} isNegative isBold />
                            </section>

                            <section className="mt-6 pt-4 border-t-2 border-wine-50">
                                <DRERow label="(=) RESULTADO LÍQUIDO DO PERÍODO" value={financialReport.netoProfit} isBold highlight isNegative={financialReport.netoProfit < 0} />
                            </section>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-black text-wine-900 dark:text-white mb-6 uppercase tracking-tighter">Fluxo de Caixa / Categoria</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={cashFlowByCategory}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
                                        {cashFlowByCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.type === 'INCOME' ? '#10b981' : '#ef4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    const renderSales = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <InventoryCard title="Total Faturado" value={`R$ ${formatCurrency(salesReport.totalRevenue)}`} icon={<DollarSign />} color="text-emerald-600" />
                <InventoryCard title="Qtd Vendida" value={salesReport.totalQuantity.toString()} icon={<ShoppingBag />} color="text-wine-600" />
                <InventoryCard title="Ticket Médio" value={`R$ ${formatCurrency(salesReport.averageTicket)}`} icon={<Activity />} color="text-blue-600" />
                <InventoryCard title="Lucro Estimado" value={`R$ ${formatCurrency(salesReport.estimatedProfit)}`} icon={<TrendingUp />} color="text-emerald-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 lg:col-span-2">
                    <h3 className="text-lg font-black text-wine-900 dark:text-white mb-6 uppercase tracking-tighter">Top 10 Produtos</h3>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesReport.topProducts} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(value: number) => [`R$ ${formatCurrency(value)}`, 'Receita']} />
                                <Bar dataKey="revenue" fill="#881337" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card className="p-6">
                    <h3 className="text-lg font-black text-wine-900 dark:text-white mb-6 uppercase tracking-tighter">Por Categoria</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={salesReport.topCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                    {salesReport.topCategories.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => [`R$ ${formatCurrency(value)}`, 'Valor']} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderInventory = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InventoryCard title="Valor Imobilizado" value={`R$ ${formatCurrency(inventoryReport.totalValue)}`} icon={<DollarSign />} color="text-emerald-600" />
                <InventoryCard title="Estoque Baixo / Crítico" value={inventoryReport.lowStock.length.toString()} icon={<AlertCircle />} color="text-red-600" />
                <InventoryCard 
                    title="Orçamento de Compras (90d)" 
                    value={`R$ ${formatCurrency(inventoryReport.forecast90Days)}`} 
                    icon={<TrendingUp />} 
                    color="text-blue-600" 
                    subtitle="Estimativa de gasto necessário para repor o estoque nos próximos 3 meses."
                />
            </div>

            <div className="space-y-6">
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertCircle size={20} /></div>
                            <h3 className="text-lg font-black uppercase tracking-tighter">Reposição Crítica</h3>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => exportToExcel(inventoryReport.lowStock, 'Estoque_Baixo')}><Download size={16} className="mr-2" /> Exportar</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-wine-50 dark:bg-slate-700 text-wine-900 border-b border-wine-100 dark:border-slate-600 dark:text-white uppercase text-[10px] font-black">
                                <tr>
                                    <th className="p-3 rounded-tl-lg">Produto</th>
                                    <th className="p-3">Categoria</th>
                                    <th className="p-3 text-center">Und Medida</th>
                                    <th className="p-3 text-right">Estoque Min.</th>
                                    <th className="p-3 text-right">Quant. Atual</th>
                                    <th className="p-3 rounded-tr-lg text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-wine-50 dark:divide-slate-700/50">
                                {inventoryReport.lowStock.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center text-gray-400 py-8 text-xs font-bold uppercase">Nenhum item em estoque baixo</td>
                                    </tr>
                                )}
                                {inventoryReport.lowStock.map((p, i) => (
                                    <tr key={i} className="hover:bg-wine-50/30 transition-colors">
                                        <td className="p-3 font-bold">{p.name}</td>
                                        <td className="p-3 text-[10px] uppercase font-bold text-wine-500">{p.category}</td>
                                        <td className="p-3 text-center font-bold text-gray-500">{p.unit || 'UN'}</td>
                                        <td className="p-3 text-right font-bold text-gray-500">{p.minStock}</td>
                                        <td className="p-3 text-right font-black text-red-600">{p.quantity}</td>
                                        <td className="p-3">
                                            <div className="w-full max-w-[100px] mx-auto h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-red-500" style={{ width: `${Math.min(((Number(p.quantity) || 0) / (Number(p.minStock) || 1)) * 100, 100)}%` }} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><TrendingUp size={20} /></div>
                            <h3 className="text-lg font-black uppercase tracking-tighter">Alto Giro (Últimos 60 dias)</h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-wine-50 dark:bg-slate-700 text-wine-900 border-b border-wine-100 dark:border-slate-600 dark:text-white uppercase text-[10px] font-black">
                                <tr>
                                    <th className="p-3 rounded-tl-lg">Produto</th>
                                    <th className="p-3">Categoria</th>
                                    <th className="p-3 text-right">Giro Médio</th>
                                    <th className="p-3 text-right">Preço de Venda (Médio)</th>
                                    <th className="p-3 text-right">Quantidade Vendida</th>
                                    <th className="p-3 rounded-tr-lg text-right">Receita Gerada</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-wine-50 dark:divide-slate-700/50">
                                {inventoryReport.highTurnover.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center text-gray-400 py-8 text-xs font-bold uppercase">Nenhuma venda nos últimos 60 dias</td>
                                    </tr>
                                )}
                                {inventoryReport.highTurnover.map((item, i) => (
                                    <tr key={i} className="hover:bg-wine-50/30 transition-colors">
                                        <td className="p-3 font-bold">{item.product.name}</td>
                                        <td className="p-3 text-[10px] uppercase font-bold text-wine-500">{item.product.category}</td>
                                        <td className="p-3 text-right font-black text-amber-600">{item.avgTurnoverDays >= 999 ? 'N/A' : `${Math.round(item.avgTurnoverDays)} dias`}</td>
                                        <td className="p-3 text-right font-bold text-gray-500">R$ {formatCurrency(item.quantity > 0 ? item.revenue / item.quantity : 0)}</td>
                                        <td className="p-3 text-right font-black text-emerald-600">{item.quantity} un.</td>
                                        <td className="p-3 text-right font-black text-emerald-700">R$ {formatCurrency(item.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><ShoppingBag size={20} /></div>
                            <h3 className="text-lg font-black uppercase tracking-tighter">Previsão de Compras (45 dias)</h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-wine-50 dark:bg-slate-700 text-wine-900 border-b border-wine-100 dark:border-slate-600 dark:text-white uppercase text-[10px] font-black">
                                <tr>
                                    <th className="p-3 rounded-tl-lg">Produto</th>
                                    <th className="p-3">Categoria</th>
                                    <th className="p-3 text-right">Velocidade de Venda</th>
                                    <th className="p-3 text-right">Sugestão (45 dias)</th>
                                    <th className="p-3 rounded-tr-lg text-right">Custo Estimado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-wine-50 dark:divide-slate-700/50">
                                {inventoryReport.highTurnover.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center text-gray-400 py-8 text-xs font-bold uppercase">Sem dados suficientes para previsão</td>
                                    </tr>
                                )}
                                {inventoryReport.highTurnover.map((item, i) => {
                                    if (item.avgTurnoverDays >= 999 || item.avgTurnoverDays === 0) return null;
                                    // Formula: (quantity sold / days taken) * 45 days
                                    const suggestedQty = Math.ceil((item.quantity / item.avgTurnoverDays) * 45);
                                    if (suggestedQty <= 0) return null;
                                    const estimatedCost = suggestedQty * (Number(item.product.cost) || 0);
                                    
                                    return (
                                        <tr key={`prev-${i}`} className="hover:bg-wine-50/30 transition-colors">
                                            <td className="p-3 font-bold">{item.product.name}</td>
                                            <td className="p-3 text-[10px] uppercase font-bold text-wine-500">{item.product.category}</td>
                                            <td className="p-3 text-right font-bold text-gray-500">{item.quantity} un. em {Math.round(item.avgTurnoverDays)} dias</td>
                                            <td className="p-3 text-right font-black text-blue-600">{suggestedQty} un.</td>
                                            <td className="p-3 text-right font-black text-blue-700">R$ {formatCurrency(estimatedCost)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Activity size={20} /></div>
                            <h3 className="text-lg font-black uppercase tracking-tighter">Baixo Giro (+90 dias no estoque)</h3>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => exportToExcel(inventoryReport.stagnant, 'Produtos_Baixo_Giro')}><Download size={16} className="mr-2" /> Exportar</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-wine-50 dark:bg-slate-700 text-wine-900 border-b border-wine-100 dark:border-slate-600 dark:text-white uppercase text-[10px] font-black">
                                <tr>
                                    <th className="p-3 rounded-tl-lg">Produto</th>
                                    <th className="p-3">Categoria</th>
                                    <th className="p-3 text-center">Data Entrada</th>
                                    <th className="p-3 text-center">Dias em Estoque</th>
                                    <th className="p-3 text-right">Quant. Atual</th>
                                    <th className="p-3 rounded-tr-lg text-right">Capital Preso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-wine-50 dark:divide-slate-700/50">
                                {inventoryReport.stagnant.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center text-gray-400 py-8 text-xs font-bold uppercase">Nenhum produto de baixo giro</td>
                                    </tr>
                                )}
                                {inventoryReport.stagnant.map((p, i) => {
                                    const entryDate = p.entryDate ? new Date(p.entryDate) : null;
                                    const daysInStock = entryDate ? Math.floor((new Date().getTime() - entryDate.getTime()) / (1000 * 3600 * 24)) : 0;
                                    return (
                                        <tr key={i} className="hover:bg-wine-50/30 transition-colors">
                                            <td className="p-3 font-bold">{p.name}</td>
                                            <td className="p-3 text-[10px] uppercase font-bold text-wine-500">{p.category}</td>
                                            <td className="p-3 text-center font-bold text-gray-500">{entryDate ? entryDate.toLocaleDateString('pt-BR') : 'N/A'}</td>
                                            <td className="p-3 text-center font-bold text-amber-600">{entryDate ? `${daysInStock} dias` : 'N/A'}</td>
                                            <td className="p-3 text-right font-black">{p.quantity} un.</td>
                                            <td className="p-3 text-right font-black text-amber-700">R$ {formatCurrency((Number(p.quantity) || 0) * (Number(p.cost) || 0))}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderExpenses = () => {
        let expenseTrans = transactions.filter(t => t.type === 'EXPENSE' && isInRange(t.dueDate));
        if (drillDownGroup) {
            expenseTrans = expenseTrans.filter(t => {
                const category = matchCategory(t.category || '', categories || []);
                if (drillDownGroup === 'none') return !category?.groupId;
                return category?.groupId === drillDownGroup;
            });
        }
        const totals = {
            total: expenseTrans.reduce((acc, t) => acc + t.amount, 0),
            paid: expenseTrans.filter(t => t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0),
            pending: expenseTrans.filter(t => t.status === 'PENDING' || t.status === 'LATE').reduce((acc, t) => acc + t.amount, 0)
        };

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 border-l-4 border-l-wine-600">
                        <p className="text-[10px] font-black uppercase text-wine-500">Total Despesas</p>
                        <h4 className="text-xl font-black">R$ {formatCurrency(totals.total)}</h4>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-emerald-500">
                        <p className="text-[10px] font-black uppercase text-emerald-600">Pago</p>
                        <h4 className="text-xl font-black">R$ {formatCurrency(totals.paid)}</h4>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-amber-500">
                        <p className="text-[10px] font-black uppercase text-amber-600">Pendente/Atrasado</p>
                        <h4 className="text-xl font-black">R$ {formatCurrency(totals.pending)}</h4>
                    </Card>
                </div>

                <Card className="p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-wine-900 dark:text-white uppercase tracking-tighter">
                            {drillDownGroup ? `Detalhes: ${categoryGroups.find(g => g.id === drillDownGroup)?.name || 'Sem Grupo'}` : 'Gastos por Grupo'}
                        </h3>
                        {drillDownGroup && (
                            <Button variant="ghost" size="sm" onClick={() => setDrillDownGroup(null)} className="text-[10px] uppercase font-bold">
                                <ArrowRight size={14} className="rotate-180 mr-1" /> Voltar ao Macro
                            </Button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        {/* CHART SIDE */}
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={drillDownGroup ?
                                            Object.entries(financialReport.expensesInGroup(drillDownGroup)).map(([name, value]) => ({ name, value })) :
                                            Object.entries(financialReport.expensesGrouped).sort((a: any, b: any) => b[1].value - a[1].value).map(([name, data]: [string, any]) => ({ name, value: data.value, id: data.id }))
                                        }
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%" cy="50%"
                                        outerRadius={100}
                                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                        onClick={(data) => {
                                            if (!drillDownGroup) {
                                                setDrillDownGroup(data.id);
                                            }
                                        }}
                                        style={{ cursor: drillDownGroup ? 'default' : 'pointer' }}
                                    >
                                        {(drillDownGroup ?
                                            Object.entries(financialReport.expensesInGroup(drillDownGroup)) :
                                            Object.entries(financialReport.expensesGrouped).sort((a: any, b: any) => b[1].value - a[1].value)
                                        ).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [`R$ ${formatCurrency(value)}`, 'Total']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        
                        {/* LIST SIDE */}
                        <div className="space-y-3">
                            {!drillDownGroup ? (
                                <>
                                    {Object.entries(financialReport.expensesGrouped).sort((a: any, b: any) => b[1].value - a[1].value).map(([group, data]: [string, any], index) => (
                                        <div
                                            key={group}
                                            className="flex justify-between items-center p-3 bg-wine-50/50 dark:bg-slate-700/50 rounded-xl border border-wine-100/50 dark:border-slate-600/50 hover:bg-wine-100 transition-colors cursor-pointer"
                                            onClick={() => setDrillDownGroup(data.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                                                <span className="text-xs font-black uppercase text-wine-900 dark:text-white tracking-tight">{group}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-mono font-bold text-wine-600 dark:text-wine-300">R$ {formatCurrency(data.value)}</span>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{((data.value / financialReport.expensesTotal) * 100).toFixed(1)}%</p>
                                            </div>
                                        </div>
                                    ))}
                                    <p className="text-[9px] text-center text-wine-400 font-bold uppercase mt-6 pt-4 border-t border-wine-100/50">* Clique em um grupo ou fatia para visualizar detalhes</p>
                                </>
                            ) : (
                                <>
                                    <h4 className="text-sm font-black text-wine-900 dark:text-white uppercase mb-4 tracking-tighter">Composição da Categoria</h4>
                                    <div className="space-y-3">
                                        {Object.entries(financialReport.expensesInGroup(drillDownGroup)).sort((a: any, b: any) => b[1] - a[1]).map(([cat, value]: [string, any], index) => (
                                            <div key={cat} className="flex justify-between items-center p-3 bg-wine-50/50 dark:bg-slate-700/50 rounded-xl border border-wine-100/50 dark:border-slate-600/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                                                    <span className="text-xs font-black uppercase text-wine-900 dark:text-white tracking-tight">{cat}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-mono font-bold text-wine-600 dark:text-wine-300">R$ {formatCurrency(value)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </Card>

                <Card className="p-6 mb-6">
                    <h3 className="text-lg font-black text-wine-900 dark:text-white mb-6 uppercase tracking-tighter">Evolução de Gastos</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={expensesEvolutionData}>
                                    <defs>
                                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#881337" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#881337" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                    <XAxis
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        formatter={(value: number) => [`R$ ${formatCurrency(value)}`, 'Valor']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#881337"
                                        strokeWidth={3}
                                        fill="url(#areaGradient)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                </Card>

                <Card className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-wine-900 dark:text-white uppercase tracking-tighter">Detalhamento de Contas a Pagar</h3>
                        <Button variant="outline" size="sm" onClick={() => exportToExcel(expenseTrans, 'Relatorio_Despesas')}><Download size={14} className="mr-2" /> Excel</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-wine-50 dark:bg-slate-700 text-wine-900 dark:text-white uppercase text-[10px] font-black">
                                <tr>
                                    <th className="p-3">Data</th>
                                    <th className="p-3">Descrição</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-wine-100 dark:divide-slate-700">
                                {expenseTrans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t, i) => (
                                    <tr key={i} className="hover:bg-wine-50/50">
                                        <td className="p-3">{new Date(t.date).toLocaleDateString()}</td>
                                        <td className="p-3 font-bold">{t.description}</td>
                                        <td className="p-3 text-[10px] uppercase font-black">{t.status}</td>
                                        <td className="p-3 text-right font-mono font-bold">R$ {formatCurrency(t.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    const renderCustomers = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Concentração de Vendas (Top 5)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={customerReport.ranking.slice(0, 5)}
                                    dataKey="salesCount"
                                    nameKey="name"
                                    cx="50%" cy="50%"
                                    outerRadius={80}
                                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                >
                                    {customerReport.ranking.slice(0, 5).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => [`${value}`, 'Vendas']} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-wine-50 text-wine-900 uppercase text-[10px] font-black">
                                <tr>
                                    <th className="p-3">Cliente</th>
                                    <th className="p-3 text-right">Faturamento</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerReport.ranking.slice(0, 10).map((c, i) => (
                                    <tr key={i} className="border-b border-wine-50">
                                        <td className="p-3 font-bold">{c.name}</td>
                                        <td className="p-3 text-right font-black text-emerald-600">R$ {formatCurrency(c.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderBoletos = () => {
        // Obter os boletos pendentes/registrados do DB (só despesas marcadas como boleto)
        const realBoletos = (transactions || []).filter(t => t.type === 'EXPENSE' && t.hasBoleto === true && (t.status === 'PENDING' || t.status === 'LATE'));
        
        // Mesclar reais + simulados pra ter o calendário total
        const allItems = [
            ...realBoletos.map(t => ({ ...t, isSimulation: false })),
            ...simulations.map(s => ({ ...s, isSimulation: true }))
        ];

        // Agrupar por MÊS - ANO futuro
        const groupedByMonth: Record<string, typeof allItems> = {};
        
        // Gerar os próximos 6 meses como default, pra sempre mostrar as colunas (começando pelo mês atual)
        const today = new Date();
        for (let i = 0; i < 6; i++) {
            const m = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const key = m.toISOString().slice(0, 7); // "YYYY-MM"
            groupedByMonth[key] = [];
        }

        allItems.forEach(item => {
            const d = new Date(item.dueDate);
            const key = d.toISOString().slice(0, 7);
            if (!groupedByMonth[key]) groupedByMonth[key] = [];
            groupedByMonth[key].push(item);
        });

        const sortedMonths = Object.keys(groupedByMonth).sort();

        return (
            <div className="space-y-6">
                {/* Painel de Simulação Esticado (Top) */}
                <Card className="p-4 w-full">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                        <div>
                            <h3 className="text-sm font-black text-wine-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                <Zap size={16} className="text-amber-500" />
                                Simulador de Boletos
                            </h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Veja o impacto no caixa futuro antes de fechar o negócio</p>
                        </div>
                        {simulations.length > 0 && (
                            <Button variant="outline" size="sm" className="text-[10px] text-red-500 border-red-200" onClick={() => setShowClearSimulationsModal(true)}>
                                Limpar Simulações
                            </Button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end">
                        <Input 
                            label="Descrição" 
                            placeholder="Ex: Máquina"
                            value={simulateDesc}
                            onChange={e => setSimulateDesc(e.target.value)}
                        />
                        <Input 
                            label="Valor Total (R$)" 
                            type="number"
                            placeholder="1000.00"
                            value={simulateAmount}
                            onChange={e => setSimulateAmount(Number(e.target.value) || '')}
                        />
                        <Input 
                            label="Data da Compra" 
                            type="date"
                            value={simulateDate}
                            onChange={e => setSimulateDate(e.target.value)}
                        />
                        <Input 
                            label="Intervalos (Ex: 30, 60)" 
                            placeholder="30, 60, 90"
                            value={simulateIntervals}
                            onChange={e => setSimulateIntervals(e.target.value)}
                        />
                        <Button 
                            className="w-full text-xs h-[42px]" 
                            onClick={handleAddSimulation}
                            disabled={!simulateAmount || !simulateIntervals || !simulateDate}
                        >
                            Adicionar Simulação
                        </Button>
                    </div>
                </Card>

                {/* Timeline de Meses / Kanban */}
                <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                        <div className="flex gap-4 min-w-max pb-2">
                            {sortedMonths.map(monthKey => {
                                const items = groupedByMonth[monthKey];
                                const total = items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                                const isSimulatedTarget = items.some(i => i.isSimulation);
                                const [y, m] = monthKey.split('-');
                                const monthName = new Date(Number(y), Number(m)-1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

                                return (
                                    <div key={monthKey} className={`w-[280px] shrink-0 bg-white dark:bg-slate-800 rounded-2xl border ${isSimulatedTarget ? 'border-amber-300 dark:border-amber-700/50 shadow-md transform scale-[1.02] transition-transform' : 'border-wine-100 dark:border-slate-700'} overflow-hidden flex flex-col`}>
                                        <div className={`p-4 border-b ${isSimulatedTarget ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50' : 'bg-wine-50/50 dark:bg-slate-800 border-wine-100 dark:border-slate-700'}`}>
                                            <h4 className="text-xs font-black uppercase text-gray-500 mb-1">{monthName}</h4>
                                            <h3 className={`text-xl font-black ${isSimulatedTarget ? 'text-amber-700 dark:text-amber-400' : 'text-wine-900 dark:text-white'}`}>
                                                R$ {formatCurrency(total)}
                                            </h3>
                                        </div>
                                        <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[500px] custom-scrollbar bg-gray-50/50 dark:bg-slate-900/20">
                                            {items.length === 0 && (
                                                <p className="text-[10px] uppercase font-bold text-gray-400 text-center py-4">Nenhum boleto</p>
                                            )}
                                            {items.map((item, i) => (
                                                <div key={i} className={`p-3 rounded-xl border ${item.isSimulation ? 'bg-amber-50 border-amber-200 border-dashed dark:bg-amber-900/20 dark:border-amber-700/50' : 'bg-white dark:bg-slate-800 border-wine-100 dark:border-slate-700'} shadow-sm`}>
                                                    <div className="flex justify-between items-start mb-1 gap-2">
                                                        <div className="flex-1">
                                                            <span className="text-xs font-bold text-wine-900 dark:text-white break-words leading-tight block">{item.description}</span>
                                                            {item.isSimulation && (
                                                                <button 
                                                                    onClick={() => deleteSimulationGroup(item.groupId)}
                                                                    className="text-[9px] font-black uppercase text-red-500 hover:text-red-700 mt-1 flex items-center gap-1 transition-colors"
                                                                    title="Excluir compra completa"
                                                                >
                                                                    <Trash2 size={10} /> Excluir Compra
                                                                </button>
                                                            )}
                                                        </div>
                                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${item.isSimulation ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'}`}>
                                                            {new Date(item.dueDate).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-end mt-3">
                                                        <span className={`text-sm font-black tracking-tight ${item.isSimulation ? 'text-amber-600 dark:text-amber-400' : 'text-wine-700 dark:text-wine-400'}`}>
                                                            R$ {formatCurrency(item.amount)}
                                                        </span>
                                                        {item.isSimulation && <span className="text-[8px] font-black uppercase text-amber-500 flex items-center gap-1"><Zap size={8} /> Projeção</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-wine-900 dark:text-white tracking-tighter uppercase">Central de Inteligência</h2>
                    <p className="text-wine-500 text-sm font-medium">Relatórios estratégicos e indicadores em tempo real</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-wine-100 dark:border-slate-700 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full lg:w-auto">
                    <div className="grid grid-cols-3 bg-wine-50 dark:bg-slate-700 p-1 rounded-xl gap-1">
                        {[
                            { id: 'FINANCIAL', label: 'Financeiro', icon: <DollarSign size={14} /> },
                            { id: 'EXPENSES', label: 'Despesas', icon: <TrendingDown size={14} /> },
                            { id: 'SALES', label: 'Vendas', icon: <ShoppingBag size={14} /> },
                            { id: 'CUSTOMERS', label: 'Clientes', icon: <Activity size={14} /> },
                            { id: 'STOCK', label: 'Estoque', icon: <Package size={14} /> },
                            { id: 'BOLETOS', label: 'Boletos', icon: <FileText size={14} /> }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as ReportTab)}
                                className={`px-3 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase transition-all flex justify-center items-center gap-2 shrink-0 ${activeTab === t.id ? 'bg-wine-900 text-white shadow-md' : 'text-wine-500 hover:bg-wine-100'}`}
                            >
                                {t.icon} <span className="sm:inline">{t.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                        <div className="flex bg-wine-50 dark:bg-slate-700 p-1 rounded-xl">
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
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${timeRange === opt.id
                                        ? 'bg-wine-900 text-white shadow-lg'
                                        : 'text-wine-500 hover:bg-wine-100 dark:hover:bg-slate-600'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {timeRange === 'MONTH' && (
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="bg-white dark:bg-slate-800 border border-wine-100 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-bold dark:text-gray-100 outline-none"
                            >
                                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                        )}

                        {(timeRange === 'MONTH' || timeRange === 'YEAR') && (
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-white dark:bg-slate-800 border border-wine-100 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-bold dark:text-gray-100 outline-none"
                            >
                                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}

                        {timeRange === 'CUSTOM' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="bg-white dark:bg-slate-800 border border-wine-100 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-bold dark:text-gray-100"
                                />
                                <span className="text-wine-300">-</span>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="bg-white dark:bg-slate-800 border border-wine-100 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-bold dark:text-gray-100"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'FINANCIAL' && renderFinancial()}
                {activeTab === 'EXPENSES' && renderExpenses()}
                {activeTab === 'SALES' && renderSales()}
                {activeTab === 'STOCK' && renderInventory()}
                {activeTab === 'CUSTOMERS' && renderCustomers()}
                {activeTab === 'BOLETOS' && renderBoletos()}
            </div>
            <Modal 
                isOpen={drillDownModal.isOpen} 
                onClose={() => setDrillDownModal({ ...drillDownModal, isOpen: false })} 
                title={drillDownModal.title}
                maxWidth="max-w-4xl"
            >
                <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-wine-50 dark:bg-slate-700 text-wine-900 border-b border-wine-100 dark:border-slate-600 dark:text-white uppercase text-[10px] font-black sticky top-0 z-10">
                            <tr>
                                <th className="p-3">Data</th>
                                <th className="p-3">{drillDownModal.type === 'SALE' ? 'Cliente' : 'Descrição'}</th>
                                <th className="p-3">Categoria</th>
                                <th className="p-3">Forma Pgto.</th>
                                <th className="p-3 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-wine-50 dark:divide-slate-700/50">
                            {drillDownModal.transactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-400 font-bold uppercase text-xs">Nenhum registro encontrado</td>
                                </tr>
                            )}
                            {drillDownModal.transactions.map((item, i) => {
                                const value = drillDownModal.type === 'COST' 
                                    ? (item.items?.reduce((sum: number, i: any) => {
                                        const prod = products.find(p => p.id === i.productId);
                                        return sum + ((Number(i.quantity) || 0) * (Number(prod?.cost) || 0));
                                      }, 0) || 0)
                                    : (item.amount || item.total || 0);
                                
                                return (
                                    <tr key={i} className="hover:bg-wine-50/30 transition-colors">
                                        <td className="p-3 font-medium text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                                        <td className="p-3 font-bold">{item.description || item.customerName || 'Sem descrição'}</td>
                                        <td className="p-3">
                                            <span className="text-[10px] font-black bg-wine-100 text-wine-700 px-2 py-0.5 rounded-full uppercase">
                                                {item.category || 'Geral'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-[10px] font-bold text-wine-600 uppercase">
                                            {item.paymentMethod || '-'}
                                        </td>
                                        <td className={`p-3 text-right font-black ${drillDownModal.type === 'SALE' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            R$ {formatCurrency(value)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-slate-800/50 sticky bottom-0">
                            <tr className="font-black text-wine-900 dark:text-white">
                                <td colSpan={4} className="p-3 text-right uppercase text-[10px]">Total do Grupo:</td>
                                <td className="p-3 text-right text-base border-t border-wine-200">
                                    R$ {formatCurrency(drillDownModal.transactions.reduce((acc, item) => {
                                         if (drillDownModal.type === 'COST') {
                                             return acc + (item.items?.reduce((sum: number, i: any) => {
                                                const prod = products.find(p => p.id === i.productId);
                                                return sum + ((Number(i.quantity) || 0) * (Number(prod?.cost) || 0));
                                             }, 0) || 0);
                                         }
                                         return acc + (Number(item.amount || item.total) || 0);
                                    }, 0))}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Modal>

            <Modal
                isOpen={showClearSimulationsModal}
                onClose={() => setShowClearSimulationsModal(false)}
                title="Limpar Simulações"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Tem certeza que deseja apagar todas as simulações criadas? Essa ação não pode ser desfeita e removerá todas as projeções do seu calendário.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setShowClearSimulationsModal(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            className="bg-red-600 hover:bg-red-700 text-white" 
                            onClick={() => {
                                clearSimulations();
                                setShowClearSimulationsModal(false);
                            }}
                        >
                            Sim, Limpar Tudo
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};


