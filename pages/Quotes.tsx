import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Product, Customer, Quote, QuoteItem, FurnitureSpecs, Sale } from '../types';
import { formatCurrency, formatDisplayDate, getUUID } from '../lib/utils';
import { Card, Button, Input, Select, formatCpfCnpj, formatPhone, Modal } from '../components/UI';
import { Search, ShoppingCart, Trash, Plus, Minus, ArrowRight, ArrowLeft, Printer, FileText, Check, DollarSign, UserCheck, Calendar, Clock, History, Edit, CheckCircle, Trash2, Info, Upload, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

import { ServiceConfigForm } from '../components/ServiceConfigForm';

interface CartItem extends Product {
    quantity: number;
    // Service Fields
    serviceType?: 'INTERNAL' | 'OUTSOURCED';
    serviceSpecs?: string;
    // UI Identity
    cartId: string;
}

type QuotesStep = 'POS' | 'CHECKOUT' | 'CONFIRM';

export const Quotes: React.FC = () => {
    const { products, companySettings, addNotification, addQuote, updateQuote, quotes, deleteQuote, addSale, navigateTo, customers, addCustomer, categories: allCategories, setPendingSale } = useAppStore();

    // View State: 'EDITOR' (New/Edit) or 'HISTORY' (List)
    const [view, setView] = useState<'EDITOR' | 'HISTORY'>('EDITOR');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Editor Step State
    const [step, setStep] = useState<QuotesStep>('POS');

    // Service Configuration State
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
    const [tempCartWithServices, setTempCartWithServices] = useState<CartItem[]>([]);

    // Filter States
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [onlyInStock, setOnlyInStock] = useState(false);
    const [historySearch, setHistorySearch] = useState('');

    // Quote Data
    const [cart, setCart] = useState<CartItem[]>([]);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [validityDays, setValidityDays] = useState(15);
    const [observations, setObservations] = useState('');

    // Payment Data (Replicated from Sales logic)
    const [discount, setDiscount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
    const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL'>('FULL');
    const [downPayment, setDownPayment] = useState(0);
    const [isRemainingPaidNow, setIsRemainingPaidNow] = useState(true); // For Partial (Split vs Future)

    // Customer Search and Modal State
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerResults, setShowCustomerResults] = useState(false);
    const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
    const [newCustomerForm, setNewCustomerForm] = useState({ name: '', doc: '', phone: '', address: '' });

    // Custom Item Modal State
    const [showCustomItemModal, setShowCustomItemModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [customItemForm, setCustomItemForm] = useState({ name: '', price: '', image: '', description: '', category: 'Personalizado' });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt} `;
        const filePath = `${fileName} `;

        setIsUploading(true);

        try {
            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('products').getPublicUrl(filePath);
            setCustomItemForm(prev => ({ ...prev, image: data.publicUrl }));
            addNotification('Imagem enviada com sucesso!', 'success');
        } catch (error: any) {
            console.error('Error uploading image:', error);
            addNotification('Erro ao enviar imagem.', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddCustomItem = () => {
        if (!customItemForm.name || !customItemForm.price) {
            addNotification('Nome e Valor são obrigatórios', 'error');
            return;
        }

        const price = parseFloat(customItemForm.price.toString().replace(',', '.'));
        if (isNaN(price) || price <= 0) {
            addNotification('Valor inválido', 'error');
            return;
        }

        const newItem: CartItem = {
            id: `AVULSO-${getUUID()}`,
            name: customItemForm.name,
            price: price,
            quantity: 1,
            // Dummy values for Product interface
            cost: 0,
            minStock: 0,
            sku: 'AVULSO',
            category: customItemForm.category,
            image: customItemForm.image,
            description: customItemForm.description,
            cartId: `AVULSO-${getUUID()}`
        };

        setCart(prev => [...prev, newItem]);
        setShowCustomItemModal(false);
        setCustomItemForm({ name: '', price: '', image: '', description: '', category: 'Personalizado' });
    };

    // --- COMPUTED VALUES ---

    // Categories for filter
    const categories = useMemo(() => ['Todos', ...Array.from(new Set(allCategories?.filter(c => c.type === 'PRODUCT').map(c => c.name) || []))], [allCategories]);

    // Filtered Products for POS
    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            (selectedCategory === 'Todos' || p.category === selectedCategory) &&
            (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (!onlyInStock || p.quantity > 0)
        );
    }, [products, selectedCategory, searchTerm, onlyInStock]);

    // Filtered History
    const filteredQuotes = useMemo(() => {
        return quotes.filter(q =>
            q.clientName.toLowerCase().includes(historySearch.toLowerCase()) ||
            q.quoteNumber.toLowerCase().includes(historySearch.toLowerCase())
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [quotes, historySearch]);

    // Filtered Customers for Search
    const filteredCustomers = useMemo(() => {
        return customerSearch ? (customers || []).filter(c =>
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.cpfCnpj?.includes(customerSearch) ||
            c.phone?.includes(customerSearch)
        ).slice(0, 5) : [];
    }, [customers, customerSearch]);

    // Financials
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const total = Math.max(0, subtotal - discount);
    const remainingAmount = Math.max(0, total - downPayment);

    // --- ACTIONS ---

    const handleNewQuote = () => {
        setEditingId(null);
        setCart([]);
        setClientName('');
        setClientPhone('');
        setDiscount(0);
        setValidityDays(15);
        setObservations('');
        setPaymentMethod('Dinheiro');
        setPaymentType('FULL');
        setDownPayment(0);
        setIsRemainingPaidNow(true);
        setStep('POS');
        setView('EDITOR');
    };

    const handleLoadQuote = (q: Quote) => {
        setEditingId(q.id);
        setClientName(q.clientName);
        setClientPhone(q.clientPhone || '');
        setDiscount(q.discount);
        setValidityDays(q.validityDays);
        setObservations(q.observations || '');
        setPaymentMethod(q.paymentMethod || 'Dinheiro');
        setPaymentType(q.paymentType || 'FULL');
        setDownPayment(q.downPayment || 0);
        setIsRemainingPaidNow(q.remainingStatus === 'PAID');

        // Rebuild Cart
        const loadedCart: CartItem[] = q.items.map(i => {
            const originalProduct = products.find(p => p.id === i.productId);
            return {
                ...originalProduct,
                id: i.productId,
                name: i.productName,
                sku: i.productSku || '',
                price: i.unitPrice,
                cost: originalProduct?.cost || 0,
                quantity: i.quantity,
                minStock: originalProduct?.minStock || 0,
                category: i.category || originalProduct?.category || '',
                image: i.image || originalProduct?.image,
                description: i.description || originalProduct?.description,
                cartId: `${i.productId} - ${getUUID()}`,
                serviceType: i.serviceType,
                serviceSpecs: i.serviceSpecs
            } as CartItem;
        });
        setCart(loadedCart);
        setStep('CHECKOUT'); // Go straight to review when loading
        setView('EDITOR');
    };

    const handleQuickPrint = (q: Quote) => {
        setEditingId(q.id);
        setClientName(q.clientName);
        setClientPhone(q.clientPhone || '');
        setDiscount(q.discount);
        setValidityDays(q.validityDays);
        setObservations(q.observations || '');
        setPaymentMethod(q.paymentMethod || 'Dinheiro');
        setPaymentType(q.paymentType || 'FULL');
        setDownPayment(q.downPayment || 0);
        setIsRemainingPaidNow(q.remainingStatus === 'PAID');

        const loadedCart: CartItem[] = q.items.map(i => {
            const originalProduct = products.find(p => p.id === i.productId);
            return {
                id: i.productId,
                name: i.productName,
                sku: i.productSku || '',
                price: i.unitPrice,
                cost: originalProduct?.cost || 0,
                quantity: i.quantity,
                minStock: originalProduct?.minStock || 0,
                category: i.category || originalProduct?.category || '',
                image: i.image || originalProduct?.image,
                description: i.description || originalProduct?.description,
            } as CartItem;
        });
        setCart(loadedCart);

        setTimeout(() => {
            window.print();
        }, 150);
    };

    const addToCart = (product: Product) => {
        setCart(prev => {
            // If it's a service, always add as a new row to allow different configs
            if (product.category === 'Serviços') {
                return [...prev, { ...product, quantity: 1, cartId: `${product.id} - ${getUUID()}` }];
            }

            const exists = prev.find(item => item.id === product.id && item.category !== 'Serviços');
            if (exists) {
                return prev.map(item => item.id === product.id && item.category !== 'Serviços' ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1, cartId: `${product.id} - ${getUUID()}` }];
        });
    };

    const updateServiceDetails = (type: 'INTERNAL' | 'OUTSOURCED', specs: string) => {
        const serviceItemsIndices = tempCartWithServices.map((item, index) => item.category === 'Serviços' ? index : -1).filter(i => i !== -1);
        const updatedCart = [...tempCartWithServices];
        updatedCart[serviceItemsIndices[currentServiceIndex]] = {
            ...updatedCart[serviceItemsIndices[currentServiceIndex]],
            serviceType: type,
            serviceSpecs: specs
        };
        setTempCartWithServices(updatedCart);

        if (currentServiceIndex < serviceItemsIndices.length - 1) {
            setCurrentServiceIndex(prev => prev + 1);
        } else {
            setShowServiceModal(false);
            setCart(updatedCart);
            setStep('CHECKOUT');
        }
    };

    const handleProceedToCheckout = () => {
        const services = cart.filter(i => i.category === 'Serviços');
        if (services.length > 0) {
            setTempCartWithServices(cart);
            setCurrentServiceIndex(0);
            // Verify if services already have config (e.g. from loading), if so, maybe skip?
            // For now, always re-check or just open if missing.
            // A simpler approach: Just open modal for all services in sequence to confirm details
            setShowServiceModal(true);
        } else {
            setStep('CHECKOUT');
        }
    };

    const removeFromCart = (cartId: string) => setCart(prev => prev.filter(item => item.cartId !== cartId));

    const updateQuantity = (cartId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.cartId === cartId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const updatePrice = (cartId: string, newPrice: number) => {
        setCart(prev => prev.map(item => item.cartId === cartId ? { ...item, price: newPrice } : item));
    };

    const selectCustomer = (c: any) => {
        setClientName(c.name);
        setClientPhone(c.phone || '');
        setCustomerSearch('');
        setShowCustomerResults(false);
    };

    const handleSaveNewCustomer = () => {
        if (!newCustomerForm.name) return alert('Nome é obrigatório');

        const newCustomer = {
            id: getUUID(),
            name: newCustomerForm.name,
            cpfCnpj: newCustomerForm.doc,
            phone: newCustomerForm.phone,
            address: newCustomerForm.address
        };

        addCustomer(newCustomer);
        selectCustomer(newCustomer);
        setShowNewCustomerModal(false);
        setNewCustomerForm({ name: '', doc: '', phone: '', address: '' });
        addNotification('Cliente cadastrado com sucesso!', 'success');
    };

    const handleSaveQuote = async () => {
        if (cart.length === 0) {
            addNotification('Adicione produtos ao orçamento.', 'error');
            return;
        }
        if (!clientName) {
            addNotification('Informe o nome do cliente.', 'error');
            return;
        }

        const quoteData: Quote = {
            id: editingId || getUUID(),
            quoteNumber: editingId
                ? quotes.find(q => q.id === editingId)?.quoteNumber || `#${Date.now().toString().slice(-6)} `
                : `#${Date.now().toString().slice(-6)} `,
            clientName,
            clientPhone,
            discount,
            validityDays,
            observations,
            paymentMethod,
            paymentType,
            downPayment: paymentType === 'PARTIAL' ? downPayment : undefined,
            remainingAmount: paymentType === 'PARTIAL' ? remainingAmount : undefined,
            remainingStatus: paymentType === 'PARTIAL' ? (isRemainingPaidNow ? 'PAID' : 'PENDING') : undefined,
            subtotal,
            total,
            date: new Date().toISOString(),
            items: cart.map(item => ({
                id: getUUID(),
                quoteId: editingId || '',
                productId: item.id.startsWith('AVULSO') ? undefined : item.id,
                productName: item.name,
                productSku: item.sku,
                category: item.category,
                image: item.image,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.price,
                total: item.price * item.quantity,
                serviceType: item.serviceType,
                serviceSpecs: item.serviceSpecs
            }))
        };

        const success = editingId ? await updateQuote(quoteData) : await addQuote(quoteData);

        if (success) {
            setStep('CONFIRM'); // Show confirmation/print view
        }
    };

    const handleConvertToSale = (q: Quote) => {
        if (confirm(`Converter orçamento ${q.quoteNumber} em Venda ?\nVocê será redirecionado para o PDV para conferir e finalizar.`)) {
            const saleData: Partial<Sale> = {
                customerName: q.clientName,
                customerPhone: q.clientPhone,
                deliveryType: 'PICKUP', // Default, user can change in POS
                items: q.items.map(i => ({
                    productId: i.productId,
                    productName: i.productName,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    category: i.category,
                    serviceType: i.serviceType as "INTERNAL" | "OUTSOURCED",
                    serviceSpecs: i.serviceSpecs,
                    id: getUUID(), // new random ID for the POS CartItem logic
                })),
                discount: q.discount,
                observations: q.observations
                // Payment info is usually reset or can be passed if we map it carefully.
                // For now, let's pass it so it pre-fills if possible.
                // paymentMethod: q.paymentMethod,
                // paymentType: q.paymentType as any,
                // downPayment: q.downPayment,
            };

            setPendingSale(saleData);
            addNotification('Carregando dados no PDV para conferência...', 'info');
            setTimeout(() => {
                navigateTo('SALES');
            }, 500);
        }
    };

    // --- RENDERERS ---

    const serviceItems = tempCartWithServices.filter(item => item.category === 'Serviços');

    const renderPOS = () => (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">

            {showServiceModal && serviceItems[currentServiceIndex] && (
                <Modal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} title="Configuração de Serviço (Orçamento)">
                    <ServiceConfigForm item={serviceItems[currentServiceIndex]} onConfirm={updateServiceDetails} initialSpecs={serviceItems[currentServiceIndex].serviceSpecs} />
                </Modal>
            )}
            {/* Left: Product Grid */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <Card className="p-4 flex flex-col gap-4 sticky top-0 z-10 bg-white/95 backdrop-blur">
                    <div className="flex gap-2 w-full">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                            <input
                                className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-wine-500"
                                placeholder="Buscar produtos..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setView('HISTORY')}
                            className="px-3"
                            title="Ver Histórico"
                        >
                            <History size={20} />
                        </Button>
                    </div>

                    <div className="flex items-center gap-3 px-1">
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
                        <span className="text-sm font-bold text-slate-700 dark:text-gray-300 select-none cursor-pointer" onClick={() => setOnlyInStock(!onlyInStock)}>
                            Apenas estoque
                        </span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar w-full">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                                    ? 'bg-wine-900 text-white'
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                    } `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 custom-scrollbar">
                    {/* ITEM AVULSO CARD */}
                    <div
                        onClick={() => setShowCustomItemModal(true)}
                        className="bg-white dark:bg-slate-800 p-3 rounded-xl border-2 border-dashed border-wine-300 hover:bg-wine-50 dark:hover:bg-slate-700/50 cursor-pointer flex items-center gap-4 group transition-all"
                    >
                        <div className="w-16 h-16 bg-wine-100 dark:bg-wine-900/30 rounded-lg flex items-center justify-center text-wine-600 group-hover:scale-110 transition-transform">
                            <Plus size={32} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-wine-700 dark:text-wine-300">Item Avulso</h3>
                            <p className="text-xs text-gray-400">Adicionar produto sem estoque</p>
                        </div>
                        <div className="text-right">
                            <span className="font-black text-wine-900/40">R$ 0,00</span>
                        </div>
                    </div>

                    {filteredProducts.map(p => (
                        <div
                            key={p.id}
                            onClick={() => addToCart(p)}
                            className="bg-white dark:bg-slate-800 p-3 rounded-xl border hover:shadow-md hover:border-wine-300 dark:hover:border-wine-800 cursor-pointer flex items-center gap-4 group transition-all"
                        >
                            {/* Product Image/Thumbnail */}
                            <div className="w-16 h-16 flex-shrink-0 bg-wine-50 dark:bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center text-wine-200 dark:text-slate-500 border border-wine-100 dark:border-slate-600">
                                {p.image ? (
                                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                ) : (
                                    <ShoppingCart size={24} />
                                )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{p.name}</h3>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                    <span className="font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{p.sku}</span>
                                    <span className="truncate">{p.category}</span>
                                </div>
                            </div>

                            {/* Price and Action */}
                            <div className="text-right flex flex-col items-end gap-1">
                                <span className="font-black text-wine-700 dark:text-wine-400">R$ {p.price.toFixed(2)}</span>
                                <div className="bg-wine-100 dark:bg-wine-900/50 p-1.5 rounded-full text-wine-700 dark:text-wine-300 group-hover:bg-wine-600 group-hover:text-white transition-colors">
                                    <Plus size={16} />
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-gray-400 py-10">
                            <Search size={48} className="mb-2 opacity-20" />
                            <p>Nenhum produto encontrado.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Cart Sidebar */}
            <div className="w-full lg:w-[400px] flex flex-col bg-white dark:bg-slate-800 border-l dark:border-slate-700 shadow-xl lg:h-full rounded-tl-xl lg:rounded-none z-20">
                <div className="p-4 bg-wine-900 text-white flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2">
                        <ShoppingCart size={20} /> Orçamento
                    </div>
                    <span className="bg-wine-800 px-2 py-0.5 rounded text-sm">{cart.length} itens</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                                <ShoppingCart size={24} className="opacity-50" />
                            </div>
                            <p>Seu carrinho está vazio</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.cartId} className="p-3 border dark:border-slate-700 rounded-lg space-y-2 bg-gray-50 dark:bg-slate-700/30">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <p className="font-bold text-sm truncate text-gray-800 dark:text-white">{item.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500">Unitário: R$</span>
                                            <input
                                                type="number"
                                                className="w-20 text-xs border rounded p-1 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                                value={item.price}
                                                onChange={e => updatePrice(item.cartId, Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                    <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 hover:text-red-600 p-1">
                                        <Trash size={16} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t dark:border-slate-700">
                                    <div className="font-bold text-wine-700 dark:text-wine-300 text-sm">
                                        R$ {(item.price * item.quantity).toFixed(2)}
                                    </div>
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-700 rounded border dark:border-slate-600">
                                        <button onClick={() => updateQuantity(item.cartId, -1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-l"><Minus size={14} /></button>
                                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.cartId, 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-r"><Plus size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-800 space-y-4">
                    <div className="flex justify-between font-bold text-xl text-gray-800 dark:text-white">
                        <span>Total</span>
                        <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                    <Button
                        className="w-full h-12 text-lg font-bold shadow-lg shadow-wine-200 dark:shadow-none"
                        disabled={cart.length === 0}
                        onClick={handleProceedToCheckout}
                    >
                        Continuar <ArrowRight className="ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderCheckout = () => (
        <div className="max-w-5xl mx-auto pb-20 animate-fade-in">
            <button onClick={() => setStep('POS')} className="flex items-center gap-2 text-wine-600 dark:text-wine-300 mb-6 font-medium hover:underline">
                <ArrowLeft size={20} /> Voltar para Produtos
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-6">
                    {/* CUSTOMER CARD */}
                    <Card title="1. Dados do Cliente" className="border-t-4 border-t-wine-600">
                        <div className="grid gap-4">
                            <div className="relative">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                                        <input
                                            className="w-full pl-10 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-wine-500"
                                            placeholder="Buscar cliente existente..."
                                            value={customerSearch}
                                            onChange={e => { setCustomerSearch(e.target.value); setShowCustomerResults(true); }}
                                        />
                                    </div>
                                    <Button
                                        onClick={() => setShowNewCustomerModal(true)}
                                        title="Novo Cliente"
                                        className="px-3"
                                    >
                                        <Plus size={20} />
                                    </Button>
                                </div>

                                {showCustomerResults && filteredCustomers.length > 0 && (
                                    <div className="absolute w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded mt-1 z-50 shadow-xl max-h-60 overflow-y-auto">
                                        {filteredCustomers.map(c => (
                                            <div
                                                key={c.id}
                                                onClick={() => selectCustomer(c)}
                                                className="p-3 hover:bg-wine-50 dark:hover:bg-slate-700 cursor-pointer border-b last:border-0 dark:border-slate-700 flex flex-col"
                                            >
                                                <span className="font-bold text-gray-800 dark:text-white">{c.name}</span>
                                                <span className="text-xs text-gray-500">{c.phone || c.cpfCnpj || 'Sem contato'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Input
                                label="Nome do Cliente *"
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                placeholder="Nome completo"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Telefone / Contato"
                                    value={clientPhone}
                                    onChange={e => setClientPhone(formatPhone(e.target.value))}
                                    maxLength={15}
                                    placeholder="(00) 00000-0000"
                                />
                                <Input
                                    label="Validade (Dias)"
                                    type="number"
                                    value={validityDays}
                                    onChange={e => setValidityDays(Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* PAYMENT & OBS CARD */}
                    <Card title="2. Pagamento & Detalhes" className="border-t-4 border-t-wine-600">
                        <div className="space-y-4">
                            {/* Payment Type Selection */}
                            <div>
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Condição de Pagamento</label>
                                <div className="flex p-1 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                    <button
                                        onClick={() => setPaymentType('FULL')}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${paymentType === 'FULL' ? 'bg-white shadow text-wine-700' : 'text-gray-500 hover:text-gray-700'} `}
                                    >
                                        Integral / À Vista
                                    </button>
                                    <button
                                        onClick={() => setPaymentType('PARTIAL')}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${paymentType === 'PARTIAL' ? 'bg-white shadow text-wine-700' : 'text-gray-500 hover:text-gray-700'} `}
                                    >
                                        Parcial (Entrada +)
                                    </button>
                                </div>
                            </div>

                            {paymentType === 'PARTIAL' ? (
                                <div className="p-4 bg-wine-50 dark:bg-slate-700/50 rounded-lg border border-wine-100 dark:border-slate-600 grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <Input
                                            label="Valor Entrada (R$)"
                                            type="number"
                                            value={downPayment}
                                            onChange={e => setDownPayment(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <Select
                                            label="Meio da Entrada"
                                            value={paymentMethod}
                                            onChange={e => setPaymentMethod(e.target.value)}
                                        >
                                            {['Dinheiro', 'PIX', 'Cartão Crédito', 'Cartão Débito', 'Boleto'].map(m => <option key={m} value={m}>{m}</option>)}
                                        </Select>
                                    </div>
                                    <div className="col-span-2 p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-600">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold uppercase text-gray-500">Restante a Pagar</span>
                                            <span className="font-bold text-lg">R$ {(total - downPayment).toFixed(2)}</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" checked={isRemainingPaidNow} onChange={() => setIsRemainingPaidNow(true)} className="text-wine-600" />
                                                <span className="text-sm">Pago Agora (Divisão)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" checked={!isRemainingPaidNow} onChange={() => setIsRemainingPaidNow(false)} className="text-wine-600" />
                                                <span className="text-sm">Futuro / Entrega</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Select
                                    label="Método de Pagamento"
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                >
                                    {['Dinheiro', 'PIX', 'Cartão Crédito', 'Cartão Débito', 'Boleto'].map(m => <option key={m} value={m}>{m}</option>)}
                                </Select>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <Input
                                        label="Desconto (R$)"
                                        type="number"
                                        value={discount}
                                        onChange={e => setDiscount(Number(e.target.value))}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 block">Observações</label>
                                    <textarea
                                        className="w-full p-2 border rounded-lg h-[42px] focus:h-24 transition-all bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        placeholder="Detalhes da entrega, condições..."
                                        value={observations}
                                        onChange={e => setObservations(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="md:col-span-5">
                    <Card title="Resumo do Orçamento" className="sticky top-4">
                        <div className="space-y-4">
                            <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                {cart.map(item => (
                                    <div key={item.cartId} className="flex justify-between text-sm border-b border-gray-100 dark:border-slate-700 pb-2">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.quantity}x {item.name}</span>
                                            <span className="text-xs text-gray-500">{item.sku}</span>
                                            {item.category === 'Serviços' && item.serviceType && (
                                                <span className="text-[10px] text-wine-600 font-bold bg-wine-50 px-1 rounded w-fit">
                                                    {item.serviceType === 'INTERNAL' ? 'OS INTERNA' : 'TERCEIRIZADO'}
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-slate-700 space-y-2">
                                <div className="flex justify-between text-gray-500">
                                    <span>Subtotal</span>
                                    <span>R$ {subtotal.toFixed(2)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-red-500">
                                        <span>Desconto</span>
                                        <span>- R$ {discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-2xl font-black text-wine-800 dark:text-white pt-2 border-t">
                                    <span>Total</span>
                                    <span>R$ {total.toFixed(2)}</span>
                                </div>
                            </div>

                            <Button onClick={handleSaveQuote} className="w-full h-14 text-lg bg-wine-600 hover:bg-wine-700 shadow-lg">
                                <b className="uppercase mr-2">Salvar Orçamento</b>
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );

    const renderConfirmation = () => (
        <div className="max-w-4xl mx-auto py-10 animate-fade-in text-center space-y-8">
            <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-700">
                <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200 dark:shadow-none animate-bounce-short">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-black text-emerald-800 dark:text-emerald-400 mb-2">Orçamento Salvo!</h2>
                <p className="text-emerald-600 dark:text-emerald-300">Todas as informações foram registradas no histórico.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                <Button onClick={() => window.print()} className="h-14 text-lg bg-gray-800 hover:bg-gray-900 flex items-center justify-center gap-2 shadow-xl">
                    <Printer size={24} /> Imprimir Orçamento
                </Button>
                <Button onClick={() => { setView('HISTORY'); setStep('POS'); }} variant="outline" className="h-14 text-lg border-2">
                    Ir para Histórico
                </Button>
            </div>

            <button onClick={handleNewQuote} className="text-wine-600 hover:underline font-bold">
                Criar Novo Orçamento
            </button>
        </div>
    );

    const renderHistory = () => (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header / Filter */}
            <div className="flex justify-between items-center mb-6">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                    <input
                        className="w-full pl-10 p-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        placeholder="Buscar cliente, número..."
                        value={historySearch}
                        onChange={e => setHistorySearch(e.target.value)}
                    />
                </div>
                <Button onClick={handleNewQuote} className="ml-4 gap-2 shadow-md">
                    <Plus size={20} /> Novo Orçamento
                </Button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 custom-scrollbar">
                {filteredQuotes.map(quote => (
                    <Card key={quote.id} className="hover:shadow-lg transition-all border-wine-100 dark:border-slate-700 flex flex-col group">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 line-clamp-1" title={quote.clientName}>{quote.clientName}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <span className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 font-mono">{quote.quoteNumber}</span>
                                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(quote.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-black text-xl text-wine-700 dark:text-wine-400">R$ {quote.total.toFixed(2)}</span>
                                <span className="text-xs text-gray-400">{quote.items.length} itens</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300 flex-1 mb-4 space-y-1">
                            {quote.items.slice(0, 3).map((i, idx) => (
                                <div key={idx} className="flex justify-between border-b border-gray-100 dark:border-slate-700 pb-1 last:border-0 last:pb-0">
                                    <span className="truncate flex-1 pr-2">{i.quantity}x {i.productName}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">R$ {(i.total).toFixed(0)}</span>
                                </div>
                            ))}
                            {quote.items.length > 3 && <div className="text-center text-xs italic opacity-60 pt-1">+ {quote.items.length - 3} itens...</div>}
                        </div>

                        <div className="grid grid-cols-2 gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="sm" onClick={() => handleLoadQuote(quote)} className="gap-2">
                                <Edit size={14} /> Editar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleQuickPrint(quote)} className="gap-2 border-slate-300">
                                <Printer size={14} /> Imprimir
                            </Button>
                            <Button variant="primary" size="sm" onClick={() => handleConvertToSale(quote)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 border-none text-white">
                                <DollarSign size={14} /> Vender
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteQuote(quote.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                                <Trash2 size={14} /> Excluir
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            {/* Main Content Area */}
            {view === 'HISTORY' ? renderHistory() : (
                step === 'POS' ? renderPOS() : (
                    step === 'CHECKOUT' ? renderCheckout() : renderConfirmation()
                )
            )}

            {/* PRINT TEMPLATE (Hidden from screen) */}
            {/* PRINT TEMPLATE (Hidden from screen) */}
            <style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
@media print {
    @page { margin: 0; size: auto; }
    body * { visibility: hidden !important; height: 0 !important; overflow: hidden !important; }
    #printable-quote, #printable-quote * { visibility: visible !important; height: auto !important; overflow: visible !important; }
    #printable-quote { 
        position: absolute !important; 
        left: 0 !important; 
        top: 0 !important; 
        width: 100vw !important; 
        min-height: 100vh !important; 
        z-index: 9999 !important; 
        background: white !important; 
        padding: 20mm !important; 
        box-sizing: border-box !important;
        font-family: 'Inter', sans-serif !important;
    }
    .premium-header { border-bottom: 2px solid #d4982a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
    .quote-tag { background: #d4982a; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 900; text-transform: uppercase; font-size: 10px; letter-spacing: 2px; }
    .client-block { background: #f8fafc; border-left: 4px solid #d4982a; padding: 15px 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px; display: flex; justify-content: space-between; }
    .item-row { display: flex; gap: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 15px; page-break-inside: avoid; align-items: center; }
    .item-thumb { width: 90px; height: 90px; border-radius: 8px; object-fit: cover; background: #f1f5f9; border: 1px solid #f1f5f9; flex-shrink: 0; }
    .item-info { flex: 1; display: grid; grid-template-columns: 2fr 1fr; gap: 10px; }
    .item-meta { font-size: 11px; color: #64748b; margin-top: 4px; }
    .item-price-block { text-align: right; width: 140px; border-left: 1px solid #f1f5f9; padding-left: 15px; }
    .totals-box { margin-left: auto; width: 250px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-top: 30px; }
    .total-line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .total-final { font-size: 20px; font-weight: 900; color: #d4982a; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 5px; }
    .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 12px; }
    .signature-line { border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 10px; text-align: center; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
}
`}</style>

            <div id="printable-quote" className="hidden print:block w-full max-w-[210mm] mx-auto p-0">
                {/* Header */}
                <div className="premium-header">
                    <div className="flex items-center gap-6">
                        {companySettings.logo ? (
                            <img src={companySettings.logo} alt="Logo" className="w-20 h-20 object-contain" />
                        ) : (
                            <div className="w-16 h-16 bg-[#d4982a] text-white flex items-center justify-center rounded-lg font-black text-xl">
                                {companySettings.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-black text-[#d4982a] leading-none mb-2">{companySettings.name}</h1>
                            <div className="text-[10px] text-slate-500 space-y-0.5 uppercase font-bold tracking-tight">
                                <p>{companySettings.address}</p>
                                <p>CNPJ: {companySettings.cnpj} | {companySettings.phone}</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="quote-tag mb-2 inline-block">Proposta Comercial</span>
                        <p className="text-xl font-black text-slate-800 tracking-tighter">
                            {editingId ? quotes.find(q => q.id === editingId)?.quoteNumber : `#${Date.now().toString().slice(-6)} `}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Emissão: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Client Block */}
                <div className="client-block">
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Destinatário</span>
                        <p className="text-lg font-black text-slate-800">{clientName || 'Consumidor'}</p>
                        {clientPhone && <p className="text-sm font-bold text-slate-500">{clientPhone}</p>}
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Garantia / Validade</span>
                        <p className="text-sm font-black text-slate-800">{validityDays} dias corridos</p>
                    </div>
                </div>

                {/* List of Items */}
                <div className="mb-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-4 h-[2px] bg-[#d4982a]"></span> Descrição dos Itens e Serviços
                    </h3>

                    {cart.map((item, i) => (
                        <div key={i} className="item-row">
                            {item.image ? (
                                <img src={item.image} alt={item.name} className="item-thumb" />
                            ) : (
                                <div className="item-thumb flex items-center justify-center text-slate-300">
                                    <ShoppingCart size={32} />
                                </div>
                            )}

                            <div className="item-info">
                                <div>
                                    <p className="font-black text-slate-800 leading-tight mb-1">{item.name}</p>
                                    <div className="flex gap-2 mb-1">
                                        <span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase">Ref: {item.sku}</span>
                                        <span className="text-[9px] font-black bg-[#d4982a]/10 px-2 py-0.5 rounded text-[#d4982a] uppercase">{item.category}</span>
                                    </div>
                                    {item.description && (
                                        <p className="text-[10px] text-slate-500 italic mt-1 leading-tight">{item.description}</p>
                                    )}
                                    {item.serviceSpecs && (
                                        <p className="text-[9px] text-wine-600 font-bold mt-1 uppercase tracking-tight">Obs: {item.serviceSpecs}</p>
                                    )}
                                </div>

                                <div className="item-price-block">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                        <span>QTD:</span>
                                        <span className="text-slate-800">{item.quantity} un</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2">
                                        <span>UNITÁRIO:</span>
                                        <span className="text-slate-800">R$ {item.price.toFixed(2)}</span>
                                    </div>
                                    <div className="border-t border-slate-50 pt-2 text-[#d4982a]">
                                        <p className="text-[9px] font-black uppercase tracking-widest mb-1">Total Item</p>
                                        <p className="text-lg font-black">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="totals-box">
                    <div className="total-line">
                        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Subtotal Bruto</span>
                        <span className="font-bold">R$ {subtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                        <div className="total-line text-emerald-600">
                            <span className="font-bold uppercase text-[10px] tracking-widest">Desconto</span>
                            <span className="font-bold">- R$ {discount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="total-final">
                        <div className="text-[9px] uppercase tracking-widest mb-1 text-slate-400 leading-none">Investimento Total</div>
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-black mr-2">R$</span>
                            <span>{total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Observation & Footer */}
                <div className="footer-grid">
                    <div>
                        <div className="mt-0 text-[10px] font-bold text-slate-500 space-y-1">
                            <p>Pagamento: <span className="text-slate-800 font-black">{paymentMethod}</span></p>
                            <p>Modalidade: <span className="text-slate-800 font-black">{paymentType === 'FULL' ? 'À VISTA' : 'ENTRADA + PARCELAMENTO'}</span></p>
                        </div>
                    </div>
                    <div className="flex flex-col justify-end">
                        {/* Signatures removed as per user request */}
                    </div>
                </div>

                <div className="mt-10 text-center text-[9px] text-slate-300 font-black uppercase tracking-[3px]">
                    {companySettings.name} - Estilo e Conforto para o seu ambiente
                </div>
            </div>

            {/* QUICK CUSTOMER MODAL */}
            <Modal isOpen={showNewCustomerModal} onClose={() => setShowNewCustomerModal(false)} title="Novo Cliente Rápido">
                <div className="space-y-4">
                    <Input
                        label="Nome *"
                        value={newCustomerForm.name}
                        onChange={e => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                        autoFocus
                    />
                    <Input
                        label="CPF/CNPJ"
                        value={newCustomerForm.doc}
                        onChange={e => setNewCustomerForm({ ...newCustomerForm, doc: formatCpfCnpj(e.target.value) })}
                    />
                    <Input
                        label="Telefone"
                        value={newCustomerForm.phone}
                        onChange={e => setNewCustomerForm({ ...newCustomerForm, phone: formatPhone(e.target.value) })}
                        maxLength={15}
                    />
                    <Input
                        label="Endereço Completo"
                        value={newCustomerForm.address}
                        onChange={e => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowNewCustomerModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveNewCustomer}>Salvar e Selecionar</Button>
                    </div>
                </div>
            </Modal>

            {/* CUSTOM ITEM MODAL */}
            <Modal isOpen={showCustomItemModal} onClose={() => setShowCustomItemModal(false)} title="Adicionar Item Avulso">
                <div className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-3 rounded-lg text-sm border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                        <AlertCircle size={16} />
                        Este item não será descontado do estoque.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Descrição do Item / Serviço *"
                            value={customItemForm.name}
                            onChange={e => setCustomItemForm({ ...customItemForm, name: e.target.value })}
                            autoFocus
                        />
                        <Input
                            label="Valor Unitário (R$) *"
                            type="number"
                            value={customItemForm.price}
                            onChange={e => setCustomItemForm({ ...customItemForm, price: e.target.value })}
                        />
                        <Select
                            label="Categoria"
                            value={customItemForm.category}
                            onChange={e => setCustomItemForm({ ...customItemForm, category: e.target.value })}
                        >
                            {/* Reusing categories state but without 'Todos' */}
                            {categories.filter(c => c !== 'Todos').map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                            <option value="Personalizado">Personalizado</option>
                        </Select>
                        <Input
                            label="Detalhes / Observações"
                            value={customItemForm.description}
                            onChange={e => setCustomItemForm({ ...customItemForm, description: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-wine-700 dark:text-wine-200 uppercase tracking-wide">
                            Imagem do Item (Opcional)
                        </label>
                        <div className="flex items-center gap-4">
                            {customItemForm.image && (
                                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-wine-200">
                                    <img src={customItemForm.image} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setCustomItemForm({ ...customItemForm, image: '' })}
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
                                            <span className="text-sm font-medium text-center">Clique para enviar <br />Foto/Referência</span>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowCustomItemModal(false)}>Cancelar</Button>
                        <Button onClick={handleAddCustomItem} disabled={isUploading}>Adicionar ao Orçamento</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
