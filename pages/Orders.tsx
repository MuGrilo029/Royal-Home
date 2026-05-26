import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Badge, Modal, Input } from '../components/UI';
import {
    Package,
    Clock,
    CheckCircle,
    XCircle,
    Truck,
    Search,
    Filter,
    Calendar,
    User,
    ExternalLink,
    ChevronRight,
    AlertCircle,
    Trash2,
    Plus
} from 'lucide-react';
import { Order } from '../types';
import { getUUID, formatISO } from '../lib/utils';

interface OrderGroup {
    saleId: string;
    customerName: string;
    date: string;
    items: Order[];
    status: Order['status'];
    productNames: string;
    totalQuantity: number;
}

export const Orders: React.FC = () => {
    const { orders, updateOrder, deleteOrder, navigateTo, addOrder, addNotification } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [selectedGroup, setSelectedGroup] = useState<OrderGroup | null>(null);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualForm, setManualForm] = useState({
        customerName: '',
        productName: '',
        quantity: 1,
        notes: ''
    });

    const groupedOrders = useMemo(() => {
        const groups: Record<string, OrderGroup> = {};
        orders.forEach(o => {
            const sid = o.saleId || `MANUAL-${o.id}`;
            if (!groups[sid]) {
                groups[sid] = {
                    saleId: sid,
                    customerName: o.customerName,
                    date: o.date,
                    items: [],
                    status: 'PENDING',
                    productNames: '',
                    totalQuantity: 0
                };
            }
            groups[sid].items.push(o);
            groups[sid].totalQuantity += o.quantity;
        });

        // Determine aggregated status and names
        Object.values(groups).forEach(g => {
            g.productNames = Array.from(new Set(g.items.map(i => i.productName))).join(', ');
            
            const allReceived = g.items.every(i => i.status === 'RECEIVED');
            const allCancelled = g.items.every(i => i.status === 'CANCELLED');
            const anyOrderedOrReceived = g.items.some(i => i.status === 'ORDERED' || i.status === 'RECEIVED');
            
            if (allCancelled) g.status = 'CANCELLED';
            else if (allReceived) g.status = 'RECEIVED';
            else if (anyOrderedOrReceived) g.status = 'ORDERED';
            else g.status = 'PENDING';
        });

        return Object.values(groups);
    }, [orders]);

    const activeGroup = useMemo(() => {
        if (!selectedGroup) return null;
        return groupedOrders.find(g => g.saleId === selectedGroup.saleId) || null;
    }, [selectedGroup, groupedOrders]);

    const stats = useMemo(() => {
        return {
            pending: groupedOrders.filter(g => g.status === 'PENDING').length,
            ordered: groupedOrders.filter(g => g.status === 'ORDERED').length,
            received: groupedOrders.filter(g => g.status === 'RECEIVED').length,
        };
    }, [groupedOrders]);

    const filteredGroups = useMemo(() => {
        return groupedOrders.filter(g => {
            const matchesSearch =
                g.productNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (g.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (g.saleId?.includes(searchTerm) || false);

            const matchesStatus = filterStatus === 'ALL' || g.status === filterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [groupedOrders, searchTerm, filterStatus]);

    const getStatusBadge = (status: Order['status']) => {
        switch (status) {
            case 'PENDING': return <Badge color="yellow">A Pedir</Badge>;
            case 'ORDERED': return <Badge color="blue">Pedido Realizado</Badge>;
            case 'RECEIVED': return <Badge color="green">Recebido / Estoque</Badge>;
            case 'CANCELLED': return <Badge color="red">Cancelado</Badge>;
            default: return <Badge color="gray">{status}</Badge>;
        }
    };

    const handleUpdateGroupStatus = (status: Order['status']) => {
        if (selectedGroup) {
            selectedGroup.items.forEach(order => {
                if (order.status !== status) {
                    updateOrder({ ...order, status });
                }
            });
            setShowStatusModal(false);
            setSelectedGroup(null);
        }
    };

    const handleNextStatus = (e: React.MouseEvent, group: OrderGroup) => {
        e.stopPropagation();
        let nextStatus: Order['status'] = group.status;
        if (group.status === 'PENDING') nextStatus = 'ORDERED';
        else if (group.status === 'ORDERED') nextStatus = 'RECEIVED';

        if (nextStatus !== group.status) {
            group.items.forEach(order => {
                if (order.status !== nextStatus) {
                    updateOrder({ ...order, status: nextStatus });
                }
            });
        }
    };

    const handlePrevStatus = (e: React.MouseEvent, group: OrderGroup) => {
        e.stopPropagation();
        let prevStatus: Order['status'] = group.status;
        if (group.status === 'RECEIVED') prevStatus = 'ORDERED';
        else if (group.status === 'ORDERED') prevStatus = 'PENDING';

        if (prevStatus !== group.status) {
             group.items.forEach(order => {
                if (order.status !== prevStatus) {
                    updateOrder({ ...order, status: prevStatus });
                }
            });
        }
    };

    const handleDeleteGroup = (group: OrderGroup) => {
        if (confirm('Tem certeza que deseja remover TODAS as encomendas desta venda?')) {
            group.items.forEach(order => {
                deleteOrder(order.id);
            });
            setShowStatusModal(false);
        }
    };

    const handleCreateManualOrder = async () => {
        if (!manualForm.customerName || !manualForm.productName) {
            alert('Preencha o nome do cliente e o produto.');
            return;
        }

        // addOrder and addNotification are already destructured at the component level

        const newOrder: Order = {
            id: getUUID(),
            customerName: manualForm.customerName,
            productName: manualForm.productName,
            quantity: manualForm.quantity,
            notes: manualForm.notes,
            status: 'PENDING',
            date: formatISO(new Date())
        };

        await addOrder(newOrder);
        addNotification('Encomenda manual criada!', 'success');
        setShowManualModal(false);
        setManualForm({ customerName: '', productName: '', quantity: 1, notes: '' });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-wine-900 dark:text-white flex items-center gap-2">
                        <Package className="text-wine-600" />
                        Gestão de Encomendas
                    </h2>
                    <p className="text-sm text-wine-500 dark:text-slate-400">Controle de itens vendidos sem estoque disponível</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-wine-100 dark:border-slate-700 shadow-sm">
                        <button
                            onClick={() => setFilterStatus('ALL')}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'ALL' ? 'bg-wine-900 text-white shadow-md' : 'text-wine-600 dark:text-slate-400 hover:bg-wine-50'}`}
                        >
                            Todos ({groupedOrders.length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('PENDING')}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'PENDING' ? 'bg-amber-500 text-white shadow-md' : 'text-amber-600 dark:text-slate-400 hover:bg-amber-50'}`}
                        >
                            Pendentes ({stats.pending})
                        </button>
                        <button
                            onClick={() => setFilterStatus('ORDERED')}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'ORDERED' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 dark:text-slate-400 hover:bg-blue-50'}`}
                        >
                            Pedidos ({stats.ordered})
                        </button>
                    </div>

                    <Button onClick={() => setShowManualModal(true)} className="flex items-center gap-2">
                        <Plus size={18} /> Nova Encomenda
                    </Button>
                </div>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Aguardando Pedido</p>
                            <h3 className="text-3xl font-black text-amber-700">{stats.pending}</h3>
                        </div>
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-600"><Clock size={20} /></div>
                    </div>
                </Card>
                <Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Pedidos à Caminho</p>
                            <h3 className="text-3xl font-black text-blue-700">{stats.ordered}</h3>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600"><Truck size={20} /></div>
                    </div>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Recebidos (Mês)</p>
                            <h3 className="text-3xl font-black text-emerald-700">{stats.received}</h3>
                        </div>
                        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><CheckCircle size={20} /></div>
                    </div>
                </Card>
            </div>

            {/* FILTROS E BUSCA */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-wine-300" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por produto, cliente ou ID da venda..."
                        className="w-full pl-10 pr-4 py-2 border border-wine-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-wine-500 bg-white dark:bg-slate-800 text-wine-900 dark:text-white transition-all shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="md:w-auto">
                    <Filter size={18} /> Filtros Avançados
                </Button>
            </div>

            {/* ORDERS LIST */}
            <div className="space-y-4">
                {filteredGroups.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-dashed border-wine-200 dark:border-slate-700">
                        <div className="w-16 h-16 bg-wine-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package size={32} className="text-wine-200" />
                        </div>
                        <h4 className="text-lg font-bold text-wine-900 dark:text-white">Nenhuma encomenda encontrada</h4>
                        <p className="text-sm text-wine-400">Quando vender itens sem estoque, eles aparecerão aqui agrupados por venda.</p>
                    </div>
                ) : (
                    filteredGroups.map(group => (
                        <Card
                            key={group.saleId}
                            className={`hover:shadow-md transition-all cursor-pointer p-0 overflow-hidden border-wine-100 dark:border-slate-700 ${group.status === 'PENDING' ? 'border-l-4 border-l-amber-500' : ''}`}
                            onClick={() => {
                                setSelectedGroup(group);
                                setShowStatusModal(true);
                            }}
                        >
                            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex gap-4 items-center">
                                    <div className={`p-3 rounded-xl ${group.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-wine-50 dark:bg-slate-700 text-wine-600 dark:text-wine-400'}`}>
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-wine-900 dark:text-white line-clamp-1">{group.productNames}</h4>
                                        <div className="flex flex-wrap items-center gap-x-4 text-xs text-wine-500 dark:text-slate-400 mt-1">
                                            <span className="flex items-center gap-1"><User size={12} /> {group.customerName}</span>
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(group.date).toLocaleDateString('pt-BR')}</span>
                                            <span className="font-bold text-wine-800 dark:text-wine-200">Qtd Total: {group.totalQuantity} ({group.items.length} descrições)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                                    <div className="text-left md:text-right hidden sm:block">
                                        <p className="text-[10px] font-bold text-wine-400 uppercase">Venda Relacionada</p>
                                        <p className="text-xs font-mono font-bold text-wine-900 dark:text-wine-100 flex items-center gap-1 group">
                                            {group.saleId?.startsWith('MANUAL-') ? 'Avulso / Manual' : `#${group.saleId.slice(0, 8)}`}
                                            {!group.saleId?.startsWith('MANUAL-') && <ExternalLink size={10} className="group-hover:text-wine-600" />}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end gap-1">
                                            {getStatusBadge(group.status)}
                                            <div className="flex gap-1 mt-1">
                                                <span className="text-[10px] text-wine-400 italic">Clique para ver itens separados</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteGroup(group);
                                                }}
                                                className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Excluir Encomendas da Venda"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <ChevronRight size={18} className="text-wine-200" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* UPDATE STATUS MODAL */}
            <Modal
                isOpen={showStatusModal}
                onClose={() => setShowStatusModal(false)}
                title="Detalhes das Encomendas da Venda"
            >
                {activeGroup && (
                    <div className="space-y-6">
                        <div className="bg-wine-50 dark:bg-slate-700/50 p-4 rounded-xl space-y-2">
                            <h5 className="font-bold text-wine-900 dark:text-white">{activeGroup.productNames}</h5>
                            <p className="text-sm text-wine-600 dark:text-slate-400">Cliente: {activeGroup.customerName}</p>
                            <div className="flex justify-between items-center text-xs mt-2 border-t border-wine-100 dark:border-slate-600 pt-2">
                                <span>Data da Venda: {new Date(activeGroup.date).toLocaleDateString('pt-BR')}</span>
                                <span className="font-bold">Quantidade Total: {activeGroup.totalQuantity}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs font-bold text-wine-400 uppercase tracking-widest">Itens da Encomenda</p>
                            {activeGroup.items.map((item: Order) => (
                                <div key={item.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-wine-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="font-bold text-wine-900 dark:text-white">{item.quantity}x {item.productName}</span>
                                        {getStatusBadge(item.status)}
                                    </div>
                                    
                                    <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-wine-50 dark:border-slate-700">
                                        <button
                                            onClick={() => updateOrder({ ...item, status: 'PENDING' })}
                                            className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-all ${item.status === 'PENDING' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'hover:bg-gray-50 dark:hover:bg-slate-700 border-wine-100 text-wine-600'}`}
                                        >
                                            <Clock size={16} />
                                            <span className="text-[10px] font-bold text-center">A Pedir</span>
                                        </button>
                                        <button
                                            onClick={() => updateOrder({ ...item, status: 'ORDERED' })}
                                            className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-all ${item.status === 'ORDERED' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50 dark:hover:bg-slate-700 border-wine-100 text-wine-600'}`}
                                        >
                                            <Truck size={16} />
                                            <span className="text-[10px] font-bold text-center">Pedido</span>
                                        </button>
                                        <button
                                            onClick={() => updateOrder({ ...item, status: 'RECEIVED' })}
                                            className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-all ${item.status === 'RECEIVED' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'hover:bg-gray-50 dark:hover:bg-slate-700 border-wine-100 text-wine-600'}`}
                                        >
                                            <CheckCircle size={16} />
                                            <span className="text-[10px] font-bold text-center">Chegou</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Tem certeza que deseja remover ESTE item da encomenda?')) {
                                                    deleteOrder(item.id);
                                                    if (activeGroup.items.length === 1) setShowStatusModal(false);
                                                }
                                            }}
                                            className="p-2 rounded border hover:bg-red-50 dark:hover:bg-red-900/20 border-wine-100 text-red-500 transition-all flex flex-col items-center justify-center gap-1"
                                        >
                                            <XCircle size={16} />
                                            <span className="text-[10px] font-bold text-center">Excluir</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-wine-100 dark:border-slate-700">
                            <button
                                onClick={() => handleDeleteGroup(activeGroup)}
                                className="text-red-500 text-xs font-bold hover:underline"
                            >
                                Remover Toda a Encomenda
                            </button>
                            <Button onClick={() => setShowStatusModal(false)}>Fechar</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL: NOVA ENCOMENDA MANUAL */}
            <Modal isOpen={showManualModal} onClose={() => setShowManualModal(false)} title="Nova Encomenda Independente">
                <div className="space-y-4">
                    <Input 
                        label="Nome do Cliente *" 
                        value={manualForm.customerName} 
                        onChange={e => setManualForm({ ...manualForm, customerName: e.target.value })} 
                        placeholder="Ex: João Silva"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Produto *" 
                            value={manualForm.productName} 
                            onChange={e => setManualForm({ ...manualForm, productName: e.target.value })} 
                            placeholder="Ex: Sofá Retrátil"
                        />
                        <Input 
                            label="Quantidade" 
                            type="number"
                            value={manualForm.quantity} 
                            onChange={e => setManualForm({ ...manualForm, quantity: Number(e.target.value) })} 
                        />
                    </div>
                    <textarea 
                        className="w-full p-2 text-sm border rounded-lg h-24 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-wine-500"
                        placeholder="Observações / Notas..."
                        value={manualForm.notes}
                        onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t border-wine-100 dark:border-slate-700">
                        <Button variant="outline" onClick={() => setShowManualModal(false)}>Cancelar</Button>
                        <Button onClick={handleCreateManualOrder}>Criar Encomenda</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
