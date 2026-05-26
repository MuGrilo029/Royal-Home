
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Input, Select, Badge, formatCpfCnpj, formatPhone, Modal } from '../components/UI';
import {
    Search,
    FileText,
    Calendar,
    DollarSign,
    ShoppingBag,
    Activity,
    TrendingUp,
    Edit,
    Trash2,
    Printer,
    ChevronRight,
    X,
    Eye,
    ShoppingCart,
    Clock,
    UserCheck,
    Truck,
    Store,
    Receipt
} from 'lucide-react';
import { Sale, SaleItem, Product } from '../types';
import { parseISO, isInRange as utilsIsInRange } from '../lib/utils';


export const SalesHistory: React.FC = () => {
    const { sales, products, transactions, updateSale, deleteSale, companySettings, setEditingSaleId, navigateTo } = useAppStore();

    // --- FILTERS STATE ---
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'>('MONTH');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // --- MODAL STATE ---
    const [viewingSale, setViewingSale] = useState<Sale | null>(null);
    const [printingReceipt, setPrintingReceipt] = useState<{ sale: Sale; transaction: any } | null>(null);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

    // --- DATE FILTER LOGIC (Reused from Reports) ---
    const isInRange = (dateString: string) => {
        return utilsIsInRange(dateString, timeRange, {
            customStart,
            customEnd,
            selectedMonth,
            selectedYear
        });
    };

    // --- COMPUTED DATA ---
    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            const matchesSearch =
                s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.customerPhone && s.customerPhone.includes(searchTerm)) ||
                s.id.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
            const matchesDate = isInRange(s.date);

            return matchesSearch && matchesStatus && matchesDate;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, searchTerm, statusFilter, timeRange, selectedMonth, selectedYear, customStart, customEnd]);

    const summary = useMemo(() => {
        const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
        const count = filteredSales.length;
        const avgTicket = count > 0 ? totalRevenue / count : 0;

        let totalCost = 0;
        filteredSales.forEach(s => {
            s.items.forEach(item => {
                const prod = products.find(p => p.id === item.productId);
                totalCost += (item.quantity * (prod?.cost || 0));
            });
        });
        const profit = totalRevenue - totalCost;

        return { totalRevenue, count, avgTicket, profit };
    }, [filteredSales, products]);

    // --- ACTIONS ---
    const handlePrintQuick = (sale: Sale) => {
        setViewingSale(sale);
        setTimeout(() => window.print(), 100);
    };

    const handlePrintReceipt = (sale: Sale, transaction: any) => {
        setPrintingReceipt({ sale, transaction });
        setTimeout(() => window.print(), 100);
    };

    const handleEditSale = (sale: Sale) => {
        setEditingSaleId(sale.id);
        navigateTo('SALES');
    };

    const handleDelete = () => {
        if (showDeleteModal) {
            deleteSale(showDeleteModal);
            setShowDeleteModal(null);
        }
    };

    // --- UI COMPONENTS ---
    const SummaryCard = ({ title, value, icon, color }: any) => (
        <Card className="p-4 flex flex-col justify-between border-wine-100 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black uppercase text-wine-400 tracking-widest">{title}</span>
                <div className={`p-2 bg-gray-50 dark:bg-slate-700 rounded-lg ${color}`}>{icon}</div>
            </div>
            <h3 className={`text-xl font-black ${color}`}>{value}</h3>
        </Card>
    );

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-wine-900 dark:text-white tracking-tighter uppercase">Histórico de Vendas</h2>
                    <p className="text-wine-500 text-sm font-medium">Gestão e análise de transações passadas</p>
                </div>

                {/* Advanced Filter Bar (Dashboard Style) */}
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
                                onClick={() => setTimeRange(r.id as any)}
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
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={e => setCustomStart(e.target.value)}
                                    className="text-xs p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                                />
                                <span className="text-wine-300">-</span>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={e => setCustomEnd(e.target.value)}
                                    className="text-xs p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard title="Quantidade" value={summary.count} icon={<ShoppingBag size={20} />} color="text-wine-600" />
                <SummaryCard title="Valor Faturado" value={`R$ ${summary.totalRevenue.toLocaleString()}`} icon={<DollarSign size={20} />} color="text-emerald-600" />
                <SummaryCard title="Ticket Médio" value={`R$ ${summary.avgTicket.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} icon={<Activity size={20} />} color="text-blue-600" />
                <SummaryCard title="Lucro Estimado" value={`R$ ${summary.profit.toLocaleString()}`} icon={<TrendingUp size={20} />} color="text-emerald-500" />
            </div>

            {/* Filter Bar */}
            <Card className="p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                        className="w-full pl-10 p-2 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        placeholder="Buscar cliente, telefone ou ID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="ALL">Todos Status</option>
                        <option value="COMPLETED">Concluída</option>
                        <option value="CANCELLED">Cancelada</option>
                    </Select>
                </div>
            </Card>

            {/* Sales Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-wine-50 dark:bg-slate-700 text-wine-900 dark:text-white uppercase text-[10px] font-black">
                            <tr>
                                <th className="p-4">Nº Venda</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Data</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-wine-100 dark:divide-slate-700">
                            {filteredSales.map(sale => (
                                <tr key={sale.id} className="hover:bg-wine-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4 font-mono text-xs text-wine-600 dark:text-wine-400">#{sale.id.slice(0, 8)}</td>
                                    <td className="p-4 font-bold text-slate-800 dark:text-white">{sale.customerName}</td>
                                    <td className="p-4 text-slate-500">{new Date(sale.date).toLocaleDateString()}</td>
                                    <td className="p-4 text-right font-black text-wine-800 dark:text-white">R$ {sale.total.toFixed(2)}</td>
                                    <td className="p-4 text-center">
                                        <Badge color={sale.status === 'COMPLETED' ? 'green' : 'red'}>
                                            {sale.status === 'COMPLETED' ? 'CONCLUÍDA' : 'CANCELADA'}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setViewingSale(sale)}
                                                className="p-2 hover:bg-wine-100 dark:hover:bg-slate-600 rounded-lg text-wine-600 transition-colors"
                                                title="Ver Detalhes"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEditSale(sale)}
                                                className="p-2 hover:bg-blue-100 dark:hover:bg-slate-600 rounded-lg text-blue-600 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handlePrintQuick(sale)}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg text-gray-600 transition-colors"
                                                title="Imprimir"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteModal(sale.id)}
                                                className="p-2 hover:bg-red-100 dark:hover:bg-slate-600 rounded-lg text-red-600 transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* VIEW MODAL */}
            {viewingSale && (
                <Modal isOpen={!!viewingSale} onClose={() => setViewingSale(null)} title={`Venda #${viewingSale.id.slice(0, 8)}`}>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Cliente</p>
                                <p className="font-bold text-slate-800 dark:text-white">{viewingSale.customerName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Data</p>
                                <p className="font-bold text-slate-800 dark:text-white">{new Date(viewingSale.date).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="p-3 text-left">Qtd</th>
                                        <th className="p-3 text-left">Produto</th>
                                        <th className="p-3 text-right">Unit.</th>
                                        <th className="p-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                    {viewingSale.items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="p-3 font-bold">{item.quantity}x</td>
                                            <td className="p-3">
                                                <div className="font-bold">{item.productName}</div>
                                                {item.description && <div className="text-[10px] text-slate-500 italic">{item.description}</div>}
                                            </td>
                                            <td className="p-3 text-right">R$ {item.unitPrice.toFixed(2)}</td>
                                            <td className="p-3 text-right font-bold">R$ {(item.quantity * item.unitPrice).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-wine-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-3">
                            <div className="flex justify-between items-center mb-2 border-b border-wine-100 dark:border-slate-700 pb-2">
                                <h4 className="text-[10px] font-black uppercase text-wine-900 dark:text-wine-200">Histórico de Pagamentos</h4>
                                <Badge color={viewingSale.status === 'COMPLETED' ? 'green' : 'red'}>
                                    {viewingSale.status === 'COMPLETED' ? 'CONCLUÍDO' : 'CANCELADO'}
                                </Badge>
                            </div>

                            <div className="space-y-2">
                                {(() => {
                                    const saleTransactions = transactions.filter(t => t.type === 'INCOME' && (t.saleId === viewingSale.id || (t.description && t.description.includes(`Venda #${viewingSale.id.slice(0, 4)}`))));
                                    return saleTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((t, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs bg-white dark:bg-slate-800 p-2 rounded-lg border border-wine-50 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    <DollarSign size={14} />
                                                </div>
                                                <div>
                                                    <p className="font-bold dark:text-white">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase">{new Date(t.date).toLocaleDateString()} - {t.status === 'PAID' ? 'PAGO' : 'PENDENTE'}</p>
                                                </div>
                                            </div>
                                            {t.status === 'PAID' && (
                                                <button
                                                    onClick={() => handlePrintReceipt(viewingSale, t)}
                                                    className="p-1.5 hover:bg-wine-50 dark:hover:bg-slate-700 rounded text-wine-600"
                                                    title="Imprimir Comprovante"
                                                >
                                                    <Receipt size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>

                            <div className="flex justify-between items-end pt-2 border-t border-wine-100 dark:border-slate-700">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-wine-400">Total da Venda</p>
                                    <p className="text-lg font-black text-wine-900 dark:text-white">R$ {viewingSale.total.toFixed(2).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-amber-500">Saldo Devedor</p>
                                    <p className="text-lg font-black text-amber-600">
                                        R$ {(viewingSale.total - transactions.filter(t => t.status === 'PAID' && t.type === 'INCOME' && (t.saleId === viewingSale.id || (t.description && t.description.includes(`Venda #${viewingSale.id.slice(0, 4)}`)))).reduce((acc, current) => acc + current.amount, 0)).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {viewingSale.observations && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-xs italic text-slate-600 dark:text-slate-400">
                                "{viewingSale.observations}"
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setViewingSale(null)}>Fechar</Button>
                            <Button onClick={() => { setViewingSale(null); handleEditSale(viewingSale); }} className="gap-2">
                                <Edit size={16} /> Editar Venda
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* OLD EDIT MODAL REMOVED - NOW USES SALES PAGE FOR EDITING */}

            {/* DELETE CONFIRMATION */}
            <Modal isOpen={!!showDeleteModal} onClose={() => setShowDeleteModal(null)} title="Confirmar Exclusão">
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-400">Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita e afetará o faturamento.</p>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowDeleteModal(null)}>Manter Venda</Button>
                        <Button variant="danger" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 border-none">Sim, Excluir</Button>
                    </div>
                </div>
            </Modal>

            {/* PRINTABLE TEMPLATE (Reused from Sales) */}
            <div id="printable-order" className="hidden print:block text-black">
                {viewingSale && (
                    <div className="w-full h-full font-sans leading-tight p-4 max-w-[210mm] mx-auto">
                        <style>{`
                          @media print {
                            @page { margin: 0; size: auto; }
                            body * { visibility: hidden !important; height: 0 !important; overflow: hidden !important; }
                            #printable-order, #printable-order * { visibility: visible !important; height: auto !important; overflow: visible !important; }
                            #printable-order { 
                              position: absolute !important; 
                              left: 0 !important; 
                              top: 0 !important; 
                              width: 100vw !important; 
                              min-height: 100vh !important; 
                              z-index: 9999 !important; 
                              background: white !important; 
                              padding: 20mm !important; 
                              box-sizing: border-box !important;
                            }
                          }
                        `}</style>
                        <div className="flex justify-between items-start mb-2 border-b-2 border-black pb-2">
                            <div>
                                <h1 className="text-xl font-bold uppercase tracking-widest mb-1">{companySettings.name}</h1>
                                <p>{companySettings.address} | {companySettings.phone}</p>
                                <p>CNPJ: {companySettings.cnpj}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-lg font-bold uppercase">PEDIDO DE VENDA</h2>
                                <p>#{viewingSale.id.slice(0, 8)}</p>
                                <p>{new Date(viewingSale.date).toLocaleDateString()} {new Date(viewingSale.date).toLocaleTimeString().slice(0, 5)}</p>
                            </div>
                        </div>

                        <div className="mb-2 p-2 border border-black rounded-md flex justify-between bg-gray-50">
                            <div>
                                <p><span className="font-bold">Cliente:</span> {viewingSale.customerName}</p>
                                <p><span className="font-bold">Telefone:</span> {viewingSale.customerPhone || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                                <p><span className="font-bold">Status:</span> {viewingSale.status === 'COMPLETED' ? 'CONCLUÍDO' : 'CANCELADO'}</p>
                                <p><span className="font-bold">Entrega:</span> {viewingSale.deliveryType === 'DELIVERY' ? 'Domicílio' : 'Retirada'}</p>
                            </div>
                        </div>

                        <div className="flex-1 mb-2">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-black text-[10px] uppercase">
                                        <th className="py-1">Qtd</th>
                                        <th className="py-1">Item / Descrição</th>
                                        <th className="py-1 text-right">Unit.</th>
                                        <th className="py-1 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px]">
                                    {viewingSale.items.map((item: SaleItem, i: number) => (
                                        <tr key={i} className="border-b border-gray-200">
                                            <td className="py-1 w-8 align-top font-bold">{item.quantity}x</td>
                                            <td className="py-1 align-top">
                                                <div className="font-bold">{item.productName}</div>
                                                {item.description && <div className="text-[9px] text-gray-600 italic leading-tight">{item.description}</div>}
                                            </td>
                                            <td className="py-1 text-right align-top">R$ {item.unitPrice.toFixed(2)}</td>
                                            <td className="py-1 text-right align-top font-bold">R$ {(item.quantity * item.unitPrice).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Financial Summary and Transactions Footer */}
                        <div className="border-t-2 border-black pt-2 mb-4">
                            <div className="flex justify-end gap-8 text-sm">
                                <div className="text-right">
                                    <p className="text-xs">Subtotal: R$ {viewingSale.items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0).toFixed(2)}</p>
                                    <p className="text-xs">Desconto: - R$ {(viewingSale.discount || 0).toFixed(2)}</p>
                                    <p className="font-bold text-lg border-t border-black mt-1">TOTAL: R$ {viewingSale.total.toFixed(2)}</p>
                                </div>
                            </div>
                            
                            <div className="mt-2 text-[10px] flex gap-4 bg-gray-100 p-2 rounded">
                                <div>
                                    <span className="font-bold">Forma de Pagamento:</span> {viewingSale.paymentType === 'PARTIAL' ? 'Parcial / Entrada + Resto' : 'Integral / À Vista'}
                                </div>
                                {viewingSale.paymentType === 'PARTIAL' && (
                                    <>
                                        <div><span className="font-bold">Entrada:</span> R$ {viewingSale.downPayment?.toFixed(2)} ({viewingSale.downPaymentMethod})</div>
                                        <div>
                                            <span className="font-bold">Restante:</span> R$ {viewingSale.remainingAmount?.toFixed(2)} ({viewingSale.remainingPaymentMethod})
                                        </div>
                                    </>
                                )}
                                {viewingSale.paymentType === 'FULL' && (
                                    <div>Meio: {viewingSale.paymentMethod}</div>
                                )}
                            </div>

                            {/* Histórico de Pagamentos */}
                            <div className="mt-4 pt-2 border-t border-gray-300">
                                <p className="font-bold text-[10px] uppercase mb-1">Histórico de Pagamentos</p>
                                <div className="space-y-1">
                                    {(() => {
                                        const paidTransactions = transactions.filter(t => t.status === 'PAID' && t.type === 'INCOME' && (t.saleId === viewingSale.id || (t.description && t.description.includes(`Venda #${viewingSale.id.slice(0, 4)}`))));
                                        return (
                                            <>
                                                {paidTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                                    .map((t, idx) => (
                                                        <div key={idx} className="flex justify-between text-[10px] border-b border-gray-200 border-dotted pb-1">
                                                            <span>{new Date(t.date).toLocaleDateString()} - <span className="font-bold text-gray-700">{t.category || (idx === 0 && viewingSale.paymentType === 'PARTIAL' ? 'Entrada' : 'Pagamento')}</span></span>
                                                            <span className="font-bold text-green-700">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                ))}
                                                {paidTransactions.length === 0 && (
                                                    <p className="text-[10px] italic text-gray-500">Nenhum pagamento registrado.</p>
                                                )}
                                                <div className="flex justify-end mt-2">
                                                    <p className="text-[10px]">
                                                        <span className="font-bold text-red-600 uppercase">Saldo Devedor:</span>{' '}
                                                        <span className="font-bold text-red-700 text-sm">
                                                            R$ {(viewingSale.total - paidTransactions.reduce((acc, current) => acc + current.amount, 0)).toFixed(2)}
                                                        </span>
                                                    </p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mt-auto pt-8">
                            <div className="border-t border-black text-center pt-1">
                                <p className="font-bold uppercase tracking-widest text-[10px]">{companySettings.name}</p>
                                <p className="text-[9px]">Assinatura do Responsável</p>
                            </div>
                            <div className="border-t border-black text-center pt-1">
                                <p className="font-bold uppercase tracking-widest text-[10px]">{viewingSale.customerName}</p>
                                <p className="text-[9px]">Assinatura do Cliente</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* PAYMENT RECEIPT TEMPLATE */}
            <div id="printable-receipt" className="hidden print:block text-black">
                {printingReceipt && (
                    <div className="w-full max-w-[150mm] mx-auto border-2 border-black p-8 relative">
                        <style>{`
                          @media print {
                            @page { margin: 0; size: auto; }
                            body * { visibility: hidden !important; height: 0 !important; overflow: hidden !important; }
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
                              border: 1px solid #eee !important;
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
                            <p className="text-lg leading-relaxed">
                                Recebemos de <span className="font-bold uppercase">{printingReceipt.sale.customerName}</span>,
                                o valor de <span className="font-bold text-xl">R$ {printingReceipt.transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </p>
                            <p className="text-sm text-gray-600 italic">
                                Referente ao pagamento do pedido <span className="font-bold">#{printingReceipt.sale.id.slice(0, 8)}</span>.
                            </p>
                        </div>

                        <div className="bg-gray-100 p-4 rounded mb-8 grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <p className="font-bold uppercase text-gray-500">Resumo da Venda</p>
                                <p>Total: R$ {printingReceipt.sale.total.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold uppercase text-gray-500">Saldo Restante</p>
                                <p className="font-bold text-lg">
                                    R$ {(printingReceipt.sale.total - transactions.filter(t => t.status === 'PAID' && t.type === 'INCOME' && (t.saleId === printingReceipt.sale.id || (t.description && t.description.includes(`Venda #${printingReceipt.sale.id.slice(0, 4)}`))) && new Date(t.date) <= new Date(printingReceipt.transaction.date)).reduce((acc, current) => acc + current.amount, 0)).toFixed(2)}
                                </p>
                            </div>
                        </div>

                        <div className="mt-20 flex flex-col items-center">
                            <div className="border-t border-black w-64 text-center pt-2">
                                <p className="font-bold text-xs">{companySettings.name}</p>
                                <p className="text-[10px] font-mono">{companySettings.cnpj}</p>
                            </div>
                        </div>

                        <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-gray-400">
                            Comprovante gerado em {new Date().toLocaleString()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
