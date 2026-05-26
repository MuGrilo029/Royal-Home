import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Input, Select, Badge, formatCpfCnpj, formatPhone, Modal } from '../components/UI';
import {
  ShoppingCart, Trash2, Plus, Minus, Check, Search, User, MapPin, Phone, FileText, Send,
  Building, Package, CreditCard, DollarSign, X, UserCheck, Truck, Store, Printer,
  AlertCircle, ArrowLeft, ArrowRight, Trash, Edit2, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { Product, Customer, FurnitureSpecs, CardFee } from '../types';
import { formatISO, formatDisplayDate, getUUID, formatCurrency } from '../lib/utils';

interface CartItem extends Product {
  cartQty: number;
  serviceType?: 'INTERNAL' | 'OUTSOURCED';
  serviceSpecs?: string;
  // Optional database record id for editing
  recordId?: string;
  productId?: string; // Optional for custom items (Avulso)
}

type SalesStep = 'POS' | 'CHECKOUT' | 'CONFIRM';

// --- SUB-COMPONENT: SERVICE CONFIG FORM ---
import { ServiceConfigForm } from '../components/ServiceConfigForm';

// --- SUB-COMPONENT: CONFIRMATION VIEW ---
const ConfirmationView: React.FC<{
  customer: { name: string; phone: string; address: string; doc: string };
  items: CartItem[];
  payment: { method: string; downMethod?: string; remainingMethod?: string; type: string; discount: number; downPayment: number; total: number; remainingAmount: number };
  deliveryType: string;
  observations: string;
  isSuccess: boolean;
  isLoading: boolean;
  onBack: () => void;
  onConfirm: (cart: CartItem[]) => void;
  onReset: () => void;
}> = ({ customer, items, payment, deliveryType, observations, isSuccess, isLoading, onBack, onConfirm, onReset }) => {
  return (
    <div className="pb-20">
      <Card className="max-w-4xl mx-auto border-2 border-wine-100 dark:border-slate-700 shadow-2xl overflow-hidden animate-fade-in">
        <div className="bg-wine-900 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg"><FileText size={24} /></div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Revisão do Pedido</h2>
              <p className="text-xs text-wine-200">Confirme todos os dados antes de finalizar o lançamento</p>
            </div>
          </div>
          <button onClick={onBack} disabled={isLoading || isSuccess} className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-8">
          {/* ... (existing fields) ... */}

          {/* Only show details if NOT success yet, or keep showing them? User asked for Success BELOW. 
                Common pattern: Hide details or keep them. 
                User said: "appearing below as it was success green"
            */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ... (keeping structure) ... */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-wine-900 dark:text-wine-400 uppercase tracking-widest flex items-center gap-2"><UserCheck size={16} /> Dados do Cliente</h3>
              <div className="bg-wine-50 dark:bg-slate-700/50 p-4 rounded-xl space-y-2 border border-wine-100 dark:border-slate-700">
                <p className="font-bold text-lg text-wine-900 dark:text-white">{customer.name}</p>
                {/* ... (rest of customer details) ... */}
                <div className="flex flex-col gap-1 text-sm text-wine-600 dark:text-slate-400">
                  <span className="flex items-center gap-2"><Phone size={14} /> {customer.phone || 'N/A'}</span>
                  <span className="flex items-center gap-2 font-mono"><FileText size={14} /> {customer.doc || 'N/A'}</span>
                </div>
                <div className="pt-2 border-t border-wine-100 dark:border-slate-600 mt-2">
                  <p className="text-[10px] uppercase font-bold text-wine-400 mb-1">Logística</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    {deliveryType === 'DELIVERY' ? <Truck size={16} className="text-emerald-600" /> : <Store size={16} className="text-blue-600" />}
                    {deliveryType === 'DELIVERY' ? 'Entrega no Endereço' : 'Retirada na Loja'}
                  </p>
                  {deliveryType === 'DELIVERY' && <p className="text-sm mt-1 text-wine-500 italic">{customer.address}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-wine-900 dark:text-wine-400 uppercase tracking-widest flex items-center gap-2"><DollarSign size={16} /> Condição de Pagamento</h3>
              <div className="bg-wine-50 dark:bg-slate-700/50 p-4 rounded-xl space-y-3 border border-wine-100 dark:border-slate-700">
                {payment.type === 'FULL' ? (
                  <div className="flex justify-between items-center text-sm"><span>Método:</span><span className="font-bold">{payment.method}</span></div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-sm border-b border-wine-100 pb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-wine-400 uppercase">Entrada</span>
                        <span className="font-bold">{payment.downMethod}</span>
                      </div>
                      <span className="font-black text-emerald-600">R$ {payment.downPayment.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-wine-100 pb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-wine-400 uppercase">Restante</span>
                        <span className="font-bold">{payment.remainingMethod}</span>
                      </div>
                      <span className="font-black text-wine-900">R$ {payment.remainingAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm"><span>Status Restante:</span><span className="font-bold">{payment.remainingStatus === 'PAID' ? 'Pago Agora' : 'Pendente'}</span></div>
                  </>
                )}
                <div className="flex justify-between items-center text-sm"><span>Tipo:</span><span>{payment.type === 'PARTIAL' ? 'Entrada + Restante' : 'Integral'}</span></div>
                <div className="pt-2 border-t border-wine-100 flex justify-between items-end"><span className="text-xs font-bold uppercase">Total Final</span><span className="text-2xl font-black">R$ {payment.total.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-wine-900 dark:text-wine-400 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={16} /> Itens</h3>
            <div className="border border-wine-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-wine-50"><tr><th className="px-4 py-3 text-left">Qtd</th><th className="px-4 py-3 text-left">Produto</th><th className="px-4 py-3 text-right">Subtotal</th></tr></thead>
                <tbody className="divide-y divide-wine-50">
                  {items.map((item, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-4 py-3 font-bold">{item.cartQty}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold">{item.name}</div>
                        {item.description && <div className="text-[10px] text-slate-500 italic">{item.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">R$ {(item.price * item.cartQty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {!isSuccess ? (
            <div className="flex gap-4 pt-6">
              <Button onClick={onBack} variant="outline" className="flex-1" disabled={isLoading}>Corrigir</Button>
              <Button onClick={() => onConfirm(items)} className="flex-[2] text-xl h-14 relative" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Processando...
                  </span>
                ) : (
                  "Confirmar Lançamento"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 pt-6 animate-fade-in text-center">
              <div className="p-8 bg-emerald-50 rounded-2xl border-2 border-emerald-200">
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 animat-bounce"><Check size={32} /></div>
                <h4 className="text-2xl font-black text-emerald-900">SUCESSO!</h4>
                <p className="text-emerald-700">Venda realizada com sucesso.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => window.print()} className="h-14 bg-blue-600 flex items-center justify-center gap-2"><Printer size={20} /> Imprimir Pedido</Button>
                <Button onClick={onReset} variant="outline" className="h-14">Nova Venda</Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// --- MAIN COMPONENT: SALES ---
export const Sales: React.FC = () => {
  const { products, addSale, updateSale, sales, editingSaleId, setEditingSaleId, pendingSale, setPendingSale, customers, addCustomer, navigateTo, categories: allCategories, companySettings, currentView, cardFees } = useAppStore();
  const [step, setStep] = useState<SalesStep>('POS');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const [tempCartWithServices, setTempCartWithServices] = useState<CartItem[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerDoc, setCustomerDoc] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [downPaymentMethod, setDownPaymentMethod] = useState('PIX');
  const [remainingPaymentMethod, setRemainingPaymentMethod] = useState('Cartão Crédito');
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [isRemainingPaidNow, setIsRemainingPaidNow] = useState(true); // Default: Paid Now (Split Payment)
  const [downPayment, setDownPayment] = useState<number>(0);
  const [observations, setObservations] = useState('');
  const [installments, setInstallments] = useState(1);
  const [installmentsDown, setInstallmentsDown] = useState(1);
  const [installmentsRemaining, setInstallmentsRemaining] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null); // To store the last sale for printing

  // Track loaded ID to prevent re-running useEffect and overwriting user changes
  const loadedSaleIdRef = React.useRef<string | null>(null);

  // --- RESET FLOW WHEN NAVIGATING TO SALES FROM SIDEBAR ---
  useEffect(() => {
    // If user clicks "Vendas / PDV" in sidebar and we are NOT editing, 
    // or if we are already in SALES and they click it again, reset to POS.
    if (currentView === 'SALES' && !editingSaleId) {
      setStep('POS');
    }
  }, [currentView, editingSaleId]);

  // --- AUTO-LOAD SALE FOR EDITING ---
  useEffect(() => {
    // If we have an ID and it's different from the one we last loaded...
    if (editingSaleId && editingSaleId !== loadedSaleIdRef.current) {
      const sale = sales.find(s => s.id === editingSaleId);
      if (sale) {
        console.log('📦 SALES: Carregando venda para edição:', sale.id);
        loadedSaleIdRef.current = editingSaleId; // Mark as loaded

        // Populate Customer
        setCustomerName(sale.customerName);
        setCustomerPhone(sale.customerPhone || '');
        setCustomerAddress(sale.customerAddress || '');
        setDeliveryType(sale.deliveryType as any);

        // Populate Financials
        setDiscount(sale.discount || 0);
        setIsPartialPayment(sale.paymentType === 'PARTIAL');
        setPaymentMethod(sale.paymentMethod || 'Dinheiro');
        setDownPayment(sale.downPayment || 0);
        setDownPaymentMethod(sale.downPaymentMethod || 'Dinheiro');
        setRemainingPaymentMethod(sale.remainingPaymentMethod || 'Dinheiro');
        setIsRemainingPaidNow(sale.remainingStatus === 'PAID');
        setObservations(sale.observations || '');

        // Populate Cart
        const loadedCart: CartItem[] = sale.items.map(item => {
          const originalProduct = products.find(p => p.id === item.productId);
          return {
            ...originalProduct, // Spread original product properties
            id: item.id || getUUID(), // Unique ID for the cart row (cartId)
            productId: item.productId, // Explicitly keep productId
            name: item.productName, // Override with sale item name
            sku: originalProduct?.sku || '',
            price: item.unitPrice, // Use unitPrice from sale item
            cost: originalProduct?.cost || 0,
            quantity: originalProduct?.quantity || 0, // This is stock quantity
            cartQty: item.quantity, // This is the quantity in the cart
            minStock: originalProduct?.minStock || 0,
            category: item.category, // Override with sale item category
            image: originalProduct?.image,
            serviceType: item.serviceType,
            serviceSpecs: item.serviceSpecs,
            recordId: item.id, // Store the original sale item ID as recordId
            byOrder: item.byOrder // Persist byOrder flag
          } as CartItem;
        });
        setCart(loadedCart);
        setStep('CHECKOUT');
      }
    } else if (!editingSaleId) {
      // If editingSaleId is cleared, reset the ref so we can load again later
      loadedSaleIdRef.current = null;
    }
  }, [editingSaleId, sales, products]);



  // --- HANDLE PENDING SALE (FROM QUOTE CONVERSION) ---
  useEffect(() => {
    if (pendingSale) {
      console.log('📦 SALES: Carregando venda pendente (Orçamento):', pendingSale);

      // Populate Customer
      if (pendingSale.customerName) setCustomerName(pendingSale.customerName);
      if (pendingSale.customerPhone) setCustomerPhone(pendingSale.customerPhone);
      // Phone is usually not in generic Partial<Sale> but we added it in Quote conversion logic

      // Populate Cart
      if (pendingSale.items) {
        const loadedCart: CartItem[] = pendingSale.items.map(item => {
          const originalProduct = products.find(p => p.id === item.productId);
          return {
            ...originalProduct,
            id: item.id || getUUID(), // New Cart ID
            productId: item.productId,
            name: item.productName,
            sku: originalProduct?.sku || '',
            price: item.unitPrice,
            cost: originalProduct?.cost || 0,
            quantity: originalProduct?.quantity || 0,
            cartQty: item.quantity,
            minStock: originalProduct?.minStock || 0,
            category: item.category,
            image: originalProduct?.image,
            serviceType: item.serviceType,
            serviceSpecs: item.serviceSpecs,
            // No recordId since it's a new sale
          } as CartItem;
        });
        setCart(loadedCart);
      }

      // Populate Other Fields
      if (pendingSale.discount) setDiscount(pendingSale.discount);
      if (pendingSale.observations) setObservations(pendingSale.observations);

      setStep('CHECKOUT');
      setPendingSale(null); // Clear after loading
    }
  }, [pendingSale, products, setPendingSale]);


  // New Customer Modal State
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', doc: '', phone: '', address: '' });

  // Custom Item Modal State
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({ name: '', price: '', observations: '' });

  const handleAddCustomItem = () => {
    if (!customItemForm.name || !customItemForm.price) return alert('Nome e Valor são obrigatórios');

    const price = parseFloat(customItemForm.price.toString().replace(',', '.'));
    if (isNaN(price) || price <= 0) return alert('Valor inválido');

    const newItem: CartItem = {
      id: getUUID(),
      // productId is undefined for custom items
      name: customItemForm.name,
      price: price,
      cartQty: 1,
      // Dummy values to satisfy Product interface
      cost: 0,
      quantity: 999, // Infinite stock
      minStock: 0,
      sku: 'AVULSO',
      category: 'Personalizado',
      image: '',
      description: customItemForm.observations,
      entryDate: formatISO(new Date())
    };

    setCart(prev => [...prev, newItem]);
    setShowCustomItemModal(false);
    setCustomItemForm({ name: '', price: '', observations: '' });
  };

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(allCategories?.filter(c => c.type === 'PRODUCT').map(c => c.name) || []))], [allCategories]);
  const paymentMethods = ['Dinheiro', 'Cartão Crédito', 'Cartão Débito', 'PIX', 'Boleto'];

  const filteredProducts = useMemo(() => products.filter(p => (selectedCategory === 'Todos' || p.category === selectedCategory) && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())) && (!onlyInStock || p.quantity > 0)), [products, selectedCategory, searchTerm, onlyInStock]);
  const filteredCustomers = useMemo(() => customerSearch ? (customers || []).filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.cpfCnpj?.includes(customerSearch) || c.phone?.includes(customerSearch)).slice(0, 5) : [], [customers, customerSearch]);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.cartQty), 0);
  const total = Math.max(0, subtotal - discount);
  const remainingAmount = Math.max(0, total - downPayment);

  const calculateFeeAmount = (amount: number, method: string, inst: number) => {
    if (!method.toLowerCase().includes('cartão')) return 0;
    const actualInst = method === 'Cartão Débito' ? 0 : inst;
    const fee = cardFees.find(f => f.installments === actualInst);
    if (!fee) return 0;
    return (amount * fee.percentage) / 100;
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      // If it's a service, always add as a new row to allow different configs
      if (product.category === 'Serviços') {
        return [...prev, { ...product, cartQty: 1, productId: product.id, id: `${product.id} -${getUUID()} ` }];
      }

      const exists = prev.find(item => item.productId === product.id && !item.serviceType);
      if (exists) return prev.map(item => item.productId === product.id && !item.serviceType ? { ...item, cartQty: item.cartQty + 1 } : item);
      return [...prev, { ...product, cartQty: 1, productId: product.id, id: getUUID() }];
    });
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));
  const updateQuantity = (id: string, delta: number) => setCart(prev => prev.map(item => item.id === id ? { ...item, cartQty: Math.max(1, item.cartQty + delta) } : item));
  const updatePrice = (id: string, newPrice: number) => setCart(prev => prev.map(item => item.id === id ? { ...item, price: newPrice } : item));

  const selectCustomer = (c: Customer) => {
    setCustomerName(c.name);
    setCustomerDoc(c.cpfCnpj || '');
    setCustomerPhone(c.phone || '');
    if (c.address) { setCustomerAddress(c.address); setDeliveryType('DELIVERY'); }
    setCustomerSearch(''); setShowCustomerResults(false);
  };

  const goToConfirmation = () => {
    if (!customerName || (deliveryType === 'DELIVERY' && !customerAddress)) return alert('Preencha os dados do cliente.');
    setStep('CONFIRM');
  };

  const updateServiceDetails = (type: 'INTERNAL' | 'OUTSOURCED', specs: string) => {
    const serviceItemsIndices = tempCartWithServices.map((item, index) => item.category === 'Serviços' ? index : -1).filter(i => i !== -1);
    const updatedCart = [...tempCartWithServices];
    updatedCart[serviceItemsIndices[currentServiceIndex]] = { ...updatedCart[serviceItemsIndices[currentServiceIndex]], serviceType: type, serviceSpecs: specs };
    setTempCartWithServices(updatedCart);
    if (currentServiceIndex < serviceItemsIndices.length - 1) setCurrentServiceIndex(prev => prev + 1);
    else { setShowServiceModal(false); setCart(updatedCart); setStep('CHECKOUT'); }
  };

  const processSale = async (finalCart: CartItem[]) => {
    if (isLoading) return;
    setIsLoading(true);

    const saleData = {
      id: editingSaleId || getUUID(),
      customerName: customerName || 'Cliente Balcão',
      customerPhone,
      customerAddress: deliveryType === 'DELIVERY' ? customerAddress : undefined,
      deliveryType,
      date: editingSaleId ? (sales.find(s => s.id === editingSaleId)?.date || formatISO(new Date())) : formatISO(new Date()),
      items: finalCart.map(item => {
        // CRITICAL FIX: Ensure productId is preserved from the CartItem
        // The CartItem might have a 'productId' property (from our load logic) OR inherit 'id' from the Product type if it was just added.
        // We need to be sure we are grabbing the database ID of the product.

        const dbProductId = item.productId || item.id;

        // Validation log
        if (!dbProductId) console.warn('⚠️ SALES: Item sem ID de produto detectado:', item);

        return {
          productId: dbProductId,
          productName: item.name,
          description: item.description,
          quantity: item.cartQty,
          unitPrice: item.price,
          category: item.category,
          serviceType: item.serviceType,
          serviceSpecs: item.serviceSpecs,
          id: item.recordId // If editing, preserve the original sale item ID (optional, but good for reference)
        };
      }),
      total,
      discount,
      paymentMethod,
      downPaymentMethod: isPartialPayment ? downPaymentMethod : undefined,
      remainingPaymentMethod: isPartialPayment ? remainingPaymentMethod : undefined,
      paymentType: isPartialPayment ? 'PARTIAL' : 'FULL',
      downPayment: isPartialPayment ? downPayment : undefined,
      remainingAmount: isPartialPayment ? remainingAmount : undefined,
      remainingStatus: isPartialPayment ? (isRemainingPaidNow ? 'PAID' : 'PENDING') : undefined,
      status: 'COMPLETED' as const,
      observations,
      deliveryDate: deliveryDate || undefined,
      cardFeeAmount: isPartialPayment
        ? (calculateFeeAmount(downPayment, downPaymentMethod, installmentsDown) + calculateFeeAmount(remainingAmount, remainingPaymentMethod, installmentsRemaining))
        : calculateFeeAmount(total, paymentMethod, installments),
      cardInstallments: isPartialPayment ? installmentsRemaining : installments,
      cardFeePercentage: isPartialPayment
        ? undefined // Complex for partial
        : (cardFees.find(f => f.installments === installments)?.percentage)
    };

    let success = false;
    try {
      if (editingSaleId) {
        success = await updateSale(saleData);
        if (success) setEditingSaleId(null);
      } else {
        success = await addSale(saleData);
      }

      if (success) {
        setLastSale(saleData);
        setIsSuccess(true);
      }
    } catch (err) {
      console.error('Erro ao processar venda:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSalesFlow = () => {
    setStep('POS'); setCart([]); setDiscount(0); setCustomerName(''); setCustomerDoc(''); setCustomerPhone(''); setCustomerAddress(''); setDeliveryType('PICKUP'); setDeliveryDate(''); setIsPartialPayment(false); setDownPayment(0); setObservations(''); setIsSuccess(false); setLastSale(null);
    setEditingSaleId(null);
  };

  const handleSaveNewCustomer = () => {
    if (!newCustomerForm.name) return alert('Nome é obrigatório');

    const newCustomer: Customer = {
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
  };

  const serviceItems = tempCartWithServices.filter(item => item.category === 'Serviços');

  return (
    <>
      {showServiceModal && serviceItems[currentServiceIndex] && (
        <Modal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} title="Configuração de Serviço">
          <ServiceConfigForm item={serviceItems[currentServiceIndex]} onConfirm={updateServiceDetails} />
        </Modal>
      )}

      {/* QUICK CUSTOMER MODAL */}
      <Modal isOpen={showNewCustomerModal} onClose={() => setShowNewCustomerModal(false)} title="Novo Cliente Rápido">
        <div className="space-y-4">
          <Input label="Nome *" value={newCustomerForm.name} onChange={e => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })} autoFocus />
          <Input label="CPF/CNPJ" value={newCustomerForm.doc} onChange={e => setNewCustomerForm({ ...newCustomerForm, doc: formatCpfCnpj(e.target.value) })} />
          <Input label="Telefone" value={newCustomerForm.phone} onChange={e => setNewCustomerForm({ ...newCustomerForm, phone: formatPhone(e.target.value) })} maxLength={15} />
          <Input label="Endereço Completo" value={newCustomerForm.address} onChange={e => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })} />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowNewCustomerModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveNewCustomer}>Salvar e Selecionar</Button>
          </div>
        </div>
      </Modal>

      {/* CUSTOM ITEM MODAL */}
      <Modal isOpen={showCustomItemModal} onClose={() => setShowCustomItemModal(false)} title="Adicionar Item Avulso">
        <div className="space-y-4">
          <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm border border-amber-200 flex items-center gap-2">
            <AlertCircle size={16} />
            Este item não será descontado do estoque.
          </div>
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
          <Input
            label="Detalhes / Observações"
            value={customItemForm.observations}
            onChange={e => setCustomItemForm({ ...customItemForm, observations: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCustomItemModal(false)}>Cancelar</Button>
            <Button onClick={handleAddCustomItem}>Adicionar ao Carrinho</Button>
          </div>
        </div>
      </Modal>

      {step === 'CONFIRM' ? (
        <ConfirmationView customer={{ name: customerName, phone: customerPhone, address: customerAddress, doc: customerDoc }} items={cart} payment={{ method: paymentMethod, downMethod: downPaymentMethod, remainingMethod: remainingPaymentMethod, type: isPartialPayment ? 'PARTIAL' : 'FULL', discount, downPayment, total, remainingAmount }} deliveryType={deliveryType} observations={observations} isSuccess={isSuccess} isLoading={isLoading} onBack={() => setStep('CHECKOUT')} onConfirm={processSale} onReset={resetSalesFlow} />
      ) : step === 'CHECKOUT' ? (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in text-black dark:text-white">
          <div className="flex justify-between items-center">
            <button onClick={() => setStep('POS')} className="flex items-center gap-2 text-wine-600 dark:text-wine-300 hover:underline">
              <ArrowLeft size={20} /> Voltar para Produtos
            </button>
            {editingSaleId && (
              <Button variant="ghost" className="text-red-500 hover:bg-red-50 flex items-center gap-2" onClick={resetSalesFlow}>
                <X size={18} /> Cancelar Edição
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 space-y-6">
              <Card title="1. Dados do Cliente">
                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex gap-2">
                      <input className="w-full p-2 border rounded" placeholder="Buscar cliente..." value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setShowCustomerResults(true); }} />
                      <Button onClick={() => setShowNewCustomerModal(true)} title="Novo Cliente" className="px-3"><Plus size={20} /></Button>
                    </div>
                    {showCustomerResults && filteredCustomers.length > 0 && (
                      <div className="absolute w-full bg-white dark:bg-slate-800 border rounded mt-1 z-50">
                        {filteredCustomers.map(c => <div key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-wine-50 cursor-pointer">{c.name}</div>)}
                      </div>
                    )}
                  </div>
                  <Input label="Nome *" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                  <Input label="Doc (CPF/CNPJ)" value={customerDoc} onChange={e => setCustomerDoc(formatCpfCnpj(e.target.value))} />
                  <Input label="Telefone" value={customerPhone} onChange={e => setCustomerPhone(formatPhone(e.target.value))} maxLength={15} />
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant={deliveryType === 'PICKUP' ? 'primary' : 'outline'} onClick={() => setDeliveryType('PICKUP')}>Retirada</Button>
                    <Button variant={deliveryType === 'DELIVERY' ? 'primary' : 'outline'} onClick={() => setDeliveryType('DELIVERY')}>Entrega</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Data de Entrega / Retirada"
                      type="date"
                      value={deliveryDate}
                      onChange={e => setDeliveryDate(e.target.value)}
                    />
                    {deliveryType === 'DELIVERY' && <Input label="Endereço" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />}
                  </div>
                </div>
              </Card>
              <Card title="2. Pagamento & Obs">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-wine-700">
                      <input type="checkbox" className="rounded text-wine-900" checked={isPartialPayment} onChange={e => setIsPartialPayment(e.target.checked)} />
                      Pagamento Parcial (Entrada + Saldo)
                    </label>
                  </div>

                  {isPartialPayment ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in p-4 bg-wine-50 dark:bg-slate-700/50 rounded-lg border border-wine-100 dark:border-slate-600">
                      <div className="space-y-4">
                        <Select label="Método da Entrada" value={downPaymentMethod} onChange={e => setDownPaymentMethod(e.target.value)}>
                          {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                        </Select>
                        {downPaymentMethod === 'Cartão Crédito' && (
                          <Select label="Parcelas (Entrada)" value={installmentsDown} onChange={e => setInstallmentsDown(Number(e.target.value))}>
                            {[...Array(12)].map((_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}x</option>
                            ))}
                          </Select>
                        )}
                        <Input label="Valor da Entrada" type="number" value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} />
                        {downPaymentMethod.toLowerCase().includes('cartão') && (
                          <div className="p-2 bg-white dark:bg-slate-800 rounded border border-wine-100 text-xs text-wine-600">
                            Taxa estimada: {formatCurrency(calculateFeeAmount(downPayment, downPaymentMethod, installmentsDown))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <Select label="Método do Restante" value={remainingPaymentMethod} onChange={e => setRemainingPaymentMethod(e.target.value)}>
                          {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                        </Select>
                        {remainingPaymentMethod === 'Cartão Crédito' && (
                          <Select label="Parcelas (Restante)" value={installmentsRemaining} onChange={e => setInstallmentsRemaining(Number(e.target.value))}>
                            {[...Array(12)].map((_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}x</option>
                            ))}
                          </Select>
                        )}
                        <Input label="Valor Restante" type="number" value={remainingAmount} disabled />
                        {remainingPaymentMethod.toLowerCase().includes('cartão') && (
                          <div className="p-2 bg-white dark:bg-slate-800 rounded border border-wine-100 text-xs text-wine-600">
                            Taxa estimada: {formatCurrency(calculateFeeAmount(remainingAmount, remainingPaymentMethod, installmentsRemaining))}
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-2 flex gap-4 p-2 bg-white dark:bg-slate-800 rounded border border-wine-100 dark:border-slate-600">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="remainingStatus" checked={isRemainingPaidNow} onChange={() => setIsRemainingPaidNow(true)} className="text-wine-900" />
                          <span className="text-sm font-bold">Pago Agora (Divisão de Pagamento)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="remainingStatus" checked={!isRemainingPaidNow} onChange={() => setIsRemainingPaidNow(false)} className="text-wine-900" />
                          <span className="text-sm font-bold text-wine-600">Pagar na Entrega/Futuro</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Select label="Método de Pagamento" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                        {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                      </Select>
                      {paymentMethod === 'Cartão Crédito' && (
                        <Select label="Parcelas" value={installments} onChange={e => setInstallments(Number(e.target.value))}>
                          {[...Array(24)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1}x</option>
                          ))}
                        </Select>
                      )}
                      {paymentMethod.toLowerCase().includes('cartão') && (
                        <div className="p-3 bg-wine-50 dark:bg-slate-700/50 rounded-lg border border-wine-100 text-sm text-wine-900 dark:text-white flex justify-between">
                          <span>Taxa de Cartão Estimada:</span>
                          <span className="font-bold">{formatCurrency(calculateFeeAmount(total, paymentMethod, installments))}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <Input label="Desconto" type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                  <textarea className="w-full p-2 border rounded h-24" placeholder="Obs..." value={observations} onChange={e => setObservations(e.target.value)} />
                </div>
              </Card>
            </div>
            <div className="md:col-span-5">
              <Card title="Resumo">
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between border-b pb-2">
                      <span>{item.cartQty}x {item.name}</span>
                      <span>R$ {(item.price * item.cartQty).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-xl pt-4"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
                  <Button className="w-full h-14 text-lg font-bold" onClick={() => {
                    if (editingSaleId) {
                      if (!customerName || (deliveryType === 'DELIVERY' && !customerAddress)) return alert('Preencha os dados do cliente.');
                      processSale(cart);
                      setStep('CONFIRM');
                    } else {
                      goToConfirmation();
                    }
                  }}>
                    {editingSaleId ? (
                      <span className="flex items-center gap-2">
                        <Check size={24} /> SALVAR VENDA
                      </span>
                    ) : (
                      'Revisar Pedido'
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-140px)]">
          <div className="flex-1 flex flex-col gap-4 lg:overflow-hidden min-h-[50vh]">
            {/* SEARCH & FILTERS */}
            <div className="flex justify-between items-center mb-2 px-1">
              <h2 className="text-xl font-bold text-wine-900 dark:text-white uppercase tracking-tight">Seleção de Produtos</h2>
              {editingSaleId && (
                <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 flex items-center gap-1" onClick={resetSalesFlow}>
                  <X size={14} /> Cancelar Edição
                </Button>
              )}
            </div>
            <Card className="p-4 sticky top-0 z-10 bg-white/95 backdrop-blur">
              <div className="flex flex-col gap-4 w-full">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                  <input
                    className="w-full pl-10 p-2 border rounded bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-wine-500"
                    placeholder="Buscar produtos..."
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
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-300 select-none cursor-pointer" onClick={() => setOnlyInStock(!onlyInStock)}>
                    Apenas estoque
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-wine-900 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
            <div className="flex-1 lg:overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
              {/* ITEM AVULSO CARD */}
              <div
                onClick={() => setShowCustomItemModal(true)}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl border-2 border-dashed border-wine-300 hover:bg-wine-50 dark:hover:bg-slate-700 cursor-pointer flex flex-col items-center justify-center gap-4 min-h-[200px] group transition-all"
              >
                <div className="w-16 h-16 bg-wine-100 rounded-full flex items-center justify-center text-wine-600 group-hover:scale-110 transition-transform">
                  <Plus size={32} />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-sm md:text-lg text-wine-700 dark:text-wine-300">Item Avulso</h3>
                  <p className="text-xs md:text-sm text-gray-400">Adicionar produto</p>
                </div>
                <div className="mt-2 text-wine-900 font-bold opacity-50">
                  R$ 0,00
                </div>
              </div>

              {filteredProducts.map(p => (
                <div key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-slate-800 p-4 rounded-xl border hover:shadow-md cursor-pointer flex flex-col h-fit gap-4">
                  <div>
                    {p.image && <img src={p.image} alt={p.name} className="w-full h-24 md:h-32 object-cover rounded-lg mb-2" />}
                    <h3 className="font-bold text-sm md:text-base line-clamp-2">{p.name}</h3>
                    <p className="text-sm text-gray-400">{p.category}</p>
                  </div>
                  <div className="flex justify-between items-center"><span className="font-bold text-sm md:text-lg truncate">R$ {p.price.toFixed(2)}</span><Plus size={20} className="text-wine-900 shrink-0 ml-1" /></div>
                </div>
              ))}
            </div>
          </div >
          <div className="w-full lg:w-[400px] flex flex-col bg-white dark:bg-slate-800 border-l shadow-xl">
            <div className="p-4 bg-wine-900 text-white flex justify-between font-bold"><div className="flex items-center gap-2"><ShoppingCart /> Carrinho</div><span>{cart.length} itens</span></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? <p className="text-center text-gray-400 mt-20">Vazio</p> : cart.map(item => (
                <div key={item.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-bold text-sm truncate">{item.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-500">R$</span>
                        <input
                          type="number"
                          className="w-20 text-xs border rounded p-1"
                          value={item.price}
                          onChange={e => updatePrice(item.id, Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 border rounded"><Minus size={12} /></button>
                      <span className="w-4 text-center">{item.cartQty}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 border rounded"><Plus size={12} /></button>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-500 ml-2"><Trash size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t space-y-4">
              <div className="flex justify-between font-bold text-xl"><span>Total</span><span>R$ {subtotal.toFixed(2)}</span></div>
              <Button className="w-full h-12" disabled={cart.length === 0} onClick={() => {
                const services = cart.filter(i => i.category === 'Serviços');
                if (services.length > 0) { setTempCartWithServices(cart); setCurrentServiceIndex(0); setShowServiceModal(true); } else setStep('CHECKOUT');
              }}>Prosseguir <ArrowRight className="ml-2" /></Button>
            </div>
          </div>
        </div >
      )}

      {/* Printable Order - Optimized for Single Page */}
      <div id="printable-order" className="hidden print:block text-black">
        {lastSale && (
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
            {/* Header Compacto */}
            <div className="flex justify-between items-start mb-2 border-b-2 border-black pb-2">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-widest mb-1">{companySettings.name}</h1>
                <p>{companySettings.address} | {companySettings.phone}</p>
                <p>CNPJ: {companySettings.cnpj}</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold">PEDIDO #{lastSale.id.slice(0, 6)}</h2>
                <p>{new Date(lastSale.date).toLocaleDateString()} {new Date().toLocaleTimeString().slice(0, 5)}</p>
              </div>
            </div>

            {/* Customer Compacto */}
            <div className="mb-2 p-2 border border-black rounded-md flex justify-between bg-gray-50">
              <div>
                <p><span className="font-bold">Cliente:</span> {lastSale.customerName}</p>
                <p><span className="font-bold">Doc:</span> {customerDoc || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p><span className="font-bold">Tel:</span> {lastSale.customerPhone}</p>
                <p><span className="font-bold">Entrega:</span> {lastSale.deliveryType === 'DELIVERY' ? 'Domicílio' : 'Retirada'}</p>
                {lastSale.deliveryDate && (
                  <p><span className="font-bold">Data Prevista:</span> {new Date(lastSale.deliveryDate).toLocaleDateString()}</p>
                )}
              </div>
            </div>
            {lastSale.deliveryType === 'DELIVERY' && (
              <div className="mb-2 px-2 italic text-[10px]">End: {lastSale.customerAddress}</div>
            )}

            {/* Items Table Compacta */}
            <div className="flex-1 mb-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black text-[10px] uppercase">
                    <th className="py-1">Qtd</th>
                    <th className="py-1">Item / Detalhes</th>
                    <th className="py-1 text-right">Unit.</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="text-[10px]">
                  {lastSale.items.map((item: any, i: number) => (
                    <tr key={i} className="border-b border-gray-200">
                      <td className="py-1 w-8 align-top font-bold">{item.quantity}x</td>
                      <td className="py-1 align-top">
                        <div className="font-bold">{item.productName}</div>
                        {item.description && <div className="text-[9px] text-gray-600 italic leading-tight mb-1">{item.description}</div>}
                        {item.category === 'Serviços' && item.serviceSpecs && (() => {
                          try {
                            const s = JSON.parse(item.serviceSpecs);
                            return (
                              <div className="ml-2 text-[9px] text-gray-600 grid grid-cols-2 gap-x-2">
                                {s.foam && <span>ESP: {s.foam.join(', ')}</span>}
                                {s.arm?.types && <span>BRÇ: {s.arm.types.join(', ')}</span>}
                                {s.seatConfig?.types && <span>ASS: {s.seatConfig.types.join(', ')}</span>}
                                {s.backrestConfig?.types && <span>ENC: {s.backrestConfig.types.join(', ')}</span>}
                                {s.modules && <span>MOD: {s.modules.join('+')}</span>}
                                {s.observations && <div className="col-span-2 italic">Obs: {s.observations}</div>}
                              </div>
                            );
                          } catch (e) { return null; }
                        })()}
                      </td>
                      <td className="py-1 text-right align-top">{item.unitPrice.toFixed(2)}</td>
                      <td className="py-1 text-right align-top font-bold">{(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Footer */}
            <div className="border-t-2 border-black pt-2 mb-4">
              <div className="flex justify-end gap-8 text-sm">
                <div className="text-right">
                  <p>Subtotal: R$ {lastSale.items.reduce((a: number, b: any) => a + (b.quantity * b.unitPrice), 0).toFixed(2)}</p>
                  <p>Desconto: - R$ {lastSale.discount.toFixed(2)}</p>
                  <p className="font-bold text-lg border-t border-black mt-1">TOTAL: R$ {lastSale.total.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-2 text-[10px] flex gap-4 bg-gray-100 p-2 rounded">
                <div>
                  <span className="font-bold">Forma de Pagamento:</span> {lastSale.paymentType === 'PARTIAL' ? 'Parcial / Entrada + Resto' : 'Integral / À Vista'}
                </div>
                {lastSale.paymentType === 'PARTIAL' && (
                  <>
                    <div><span className="font-bold">Entrada:</span> R$ {lastSale.downPayment?.toFixed(2)} ({lastSale.downPaymentMethod})</div>
                    <div>
                      <span className="font-bold">Restante:</span> R$ {lastSale.remainingAmount?.toFixed(2)} ({lastSale.remainingPaymentMethod})
                      <span className="ml-1 font-bold italic">[{lastSale.remainingStatus === 'PAID' ? 'PAGO' : 'PENDENTE'}]</span>
                    </div>
                  </>
                )}
                {lastSale.paymentType === 'FULL' && (
                  <div>Meio: {lastSale.paymentMethod}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-auto pt-8">
              <div className="border-t border-black text-center pt-1">
                <p className="font-bold uppercase tracking-widest text-[10px]">{companySettings?.name?.toUpperCase() || 'SISTEMA'}</p>
                <p className="text-[9px]">Assinatura do Responsável</p>
              </div>
              <div className="border-t border-black text-center pt-1">
                <p className="font-bold uppercase tracking-widest text-[10px]">{lastSale.customerName}</p>
                <p className="text-[9px]">Assinatura do Cliente</p>
              </div>
            </div>

            <div className="text-center text-[8px] text-gray-400 mt-2">
              Emitido por {companySettings?.name?.toUpperCase() || 'SISTEMA'} em {new Date().toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </>
  );
};