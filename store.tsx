
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction, TransactionStatus, Product, Supplier, Sale, Delivery, User, Customer, AppView, CompanySettings, Category, CategoryGroup, ProductionOrder, FurnitureSpecs, Notification, Quote, Order, StockMovement, CardFee } from './types';
import { supabase } from './lib/supabase';
import { parseISO, formatISO, isSameMonth, getUUID } from './lib/utils';

interface AppState {
  currentView: AppView;
  navigateTo: (view: AppView) => void;

  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;

  transactions: Transaction[];
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  deliveries: Delivery[];
  users: User[];
  productionOrders: ProductionOrder[];
  quotes: Quote[];
  orders: Order[];
  stockMovements: StockMovement[];
  simulations: any[];

  // New Settings State
  companySettings: CompanySettings;
  categories: Category[];
  categoryGroups: CategoryGroup[];

  addTransaction: (t: Transaction) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  splitTransactionPayment: (originalId: string, paidAmount: number, method: string, notes: string, date: string) => Promise<void>;

  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;

  addSale: (s: Sale) => void;
  updateSale: (s: Sale) => void;
  deleteSale: (id: string) => void;

  addOrder: (o: Order) => void;
  updateOrder: (o: Order) => void;
  deleteOrder: (id: string) => void;

  addSupplier: (s: Supplier) => void;
  updateSupplier: (s: Supplier) => void;
  deleteSupplier: (id: string) => void;

  addCustomer: (c: Customer) => void;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;

  addDelivery: (d: Delivery) => void;
  updateDeliveryStatus: (id: string, status: Delivery['status']) => void;
  updateDelivery: (d: Delivery) => void; // New function
  deleteDelivery: (id: string) => void;

  // Production Actions
  addProductionOrder: (p: ProductionOrder) => void;
  updateProductionOrderStatus: (id: string, status: ProductionOrder['status']) => void;
  deleteProductionOrder: (id: string) => void;

  // Settings Actions
  updateCompanySettings: (s: CompanySettings) => void;
  addCategory: (c: Category) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  addCategoryGroup: (g: CategoryGroup) => void;
  updateCategoryGroup: (g: CategoryGroup) => void;
  deleteCategoryGroup: (id: string) => void;
  addUser: (u: User) => void;
  updateUser: (u: User) => void; // Added update
  deleteUser: (id: string) => void;

  // Quotes Actions
  addQuote: (q: Quote) => void;
  updateQuote: (q: Quote) => void;
  deleteQuote: (id: string) => void;

  addStockMovement: (m: StockMovement) => void;
  registerStockEntry: (productId: string, quantity: number, cost: number, date: string, observations?: string) => Promise<void>;

  // Generic import function
  importData: (module: string, data: any[]) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;

  isLoading: boolean;
  editingSaleId: string | null;
  setEditingSaleId: (id: string | null) => void;
  cardFees: CardFee[];
  addCardFee: (f: CardFee) => Promise<boolean>;
  updateCardFee: (f: CardFee) => Promise<boolean>;
  deleteCardFee: (id: string) => Promise<boolean>;
  
  // Simulation Actions
  addSimulations: (sims: any[]) => Promise<void>;
  deleteSimulationGroup: (groupId: string) => Promise<void>;
  clearSimulations: () => Promise<void>;
  // Pending Sale (from Quote Conversion)
  pendingSale: Partial<Sale> | null;
  setPendingSale: (sale: Partial<Sale> | null) => void;
  isInitialized: boolean;
  refreshData: (silent?: boolean) => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

const STORAGE_KEY = 'ROYAL_HOME_DB_V1';
const THEME_KEY = 'ROYAL_HOME_THEME';

const MOCK_DATA = {
  transactions: [
    { id: '1', description: 'Venda Consultoria', amount: 5000, type: 'INCOME', category: 'Serviços', date: '2023-10-25', dueDate: '2023-10-25', status: 'PAID' },
    { id: '2', description: 'Conta de Luz', amount: 350, type: 'EXPENSE', category: 'Energia', date: '2023-10-20', dueDate: '2023-10-28', status: 'PENDING', hasBoleto: true },
    { id: '3', description: 'Fornecedor A', amount: 1200, type: 'EXPENSE', category: 'Matéria Prima', date: '2023-10-15', dueDate: '2023-10-15', status: 'LATE' },
  ],
  products: [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Cadeira Escritório Ergo', sku: 'CAD-001', price: 450, cost: 200, quantity: 15, minStock: 5, category: 'Cadeiras' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Mesa de Reunião Vidro', sku: 'MES-002', price: 1200, cost: 600, quantity: 5, minStock: 2, category: 'Mesas' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Sofá Retrátil 3L', sku: 'SOF-001', price: 2500, cost: 1200, quantity: 3, minStock: 2, category: 'Sofás', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800&auto=format&fit=crop', description: 'Sofá de alto padrão com design contemporâneo, revestido em linho importado.' },
    { id: '44444444-4444-4444-4444-444444444444', name: 'Reforma de Sofá (Mão de Obra)', sku: 'SERV-001', price: 800, cost: 0, quantity: 0, minStock: 0, category: 'Serviços' },
  ],
  suppliers: [
    { id: '55555555-5555-5555-5555-555555555555', name: 'Móveis & Cia', companyName: 'Indústria Móveis LTDA', cpfCnpj: '12.345.678/0001-99', contact: 'Carlos (11) 9999-9999', address: 'Rua das Indústrias, 100', category: 'Matéria Prima' }
  ],
  customers: [
    { id: '66666666-6666-6666-6666-666666666666', name: 'João da Silva', phone: '(11) 98765-4321', cpfCnpj: '123.456.789-00', email: 'joao@email.com', address: 'Rua das Flores, 123, São Paulo - SP' },
  ],
  sales: [],
  deliveries: [],
  productionOrders: [],
  users: [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Administrador', email: 'contato@royalhome.com', roles: ['ADMIN'], department: 'Diretoria' }
  ],
  companySettings: {
    name: 'Gestão Pro Master',
    cnpj: '00.000.000/0001-00',
    phone: '(11) 9999-9999',
    address: 'Rua Principal, 100 - Centro',
    receiptMessage: 'Obrigado pela preferência! Volte sempre.',
    logo: '',
    primaryColor: '#1a1a1a', // Dark
    secondaryColor: '#E5E7EB', // Gray-200
    termsAndConditions: ''
  },
  categories: [
    // Produtos
    { id: 'c111c111-1111-1111-1111-111111111111', name: 'Sofás', type: 'PRODUCT', groupId: 'g444g444-4444-4444-4444-444444444444' },
    { id: 'c222c222-2222-2222-2222-222222222222', name: 'Mesas', type: 'PRODUCT', groupId: 'g444g444-4444-4444-4444-444444444444' },
    { id: 'c333c333-3333-3333-3333-333333333333', name: 'Poltronas', type: 'PRODUCT', groupId: 'g444g444-4444-4444-4444-444444444444' },
    { id: 'c444c444-4444-4444-4444-444444444444', name: 'Cadeiras', type: 'PRODUCT', groupId: 'g444g444-4444-4444-4444-444444444444' },
    { id: 'c555c555-5555-5555-5555-555555555555', name: 'Serviços', type: 'PRODUCT' },
    // Despesas
    { id: 'e777e777-7777-7777-7777-777777777777', name: 'Operacional', type: 'EXPENSE', groupId: 'g111g111-1111-1111-1111-111111111111' },
    { id: 'e888e888-8888-8888-8888-888888888888', name: 'Matéria Prima', type: 'EXPENSE', groupId: 'g444g444-4444-4444-4444-444444444444' },
    { id: 'e999e999-9999-9999-9999-999977777777', name: 'Impostos', type: 'EXPENSE', groupId: 'g111g111-1111-1111-1111-111111111111' },
    { id: 'e12e1212-1212-1212-1212-121212121212', name: 'Energia', type: 'EXPENSE', groupId: 'g444g444-4444-4444-4444-444444444444' },
    { id: 'e13e1313-1313-1313-1313-131313131313', name: 'Água', type: 'EXPENSE', groupId: 'g444g444-4444-4444-4444-444444444444' },
    { id: 'e14e1414-1414-1414-1414-141414141414', name: 'Pessoal', type: 'EXPENSE', groupId: 'g333g333-3333-3333-3333-333333333333' },
    // Receitas
    { id: 'i10i1010-1010-1010-1010-101010101010', name: 'Vendas', type: 'INCOME' },
    { id: 'i11i1111-1111-1111-1111-111111111111', name: 'Serviços', type: 'INCOME' },
    { id: 'i15i1515-1515-1515-1515-151515151515', name: 'Rendimentos', type: 'INCOME' },
    // Fornecedores
    { id: 's16s1616-1616-1616-1616-161616161616', name: 'Tecidos', type: 'SUPPLIER' },
    { id: 's17s1717-1717-1717-1717-171717171717', name: 'Madeiras', type: 'SUPPLIER' },
    { id: 's18s1818-1818-1818-1818-181818181818', name: 'Transporte', type: 'SUPPLIER' },
    // Usuários/Departamentos
    { id: 'u19u1919-1919-1919-1919-191919191919', name: 'Diretoria', type: 'USER' },
    { id: 'u20u2020-2020-2020-2020-202020202020', name: 'Comercial', type: 'USER' },
    { id: 'u21u2121-2121-2121-2121-212121212121', name: 'Financeiro', type: 'USER' },
    { id: 'u22u2222-2222-2222-2222-222222222222', name: 'Produção', type: 'USER' },
  ],
  quotes: [],
  orders: [],
  stockMovements: [],
  categoryGroups: [
    { id: 'g111g111-1111-1111-1111-111111111111', name: 'Logística', createdAt: new Date().toISOString() },
    { id: 'g222g222-2222-2222-2222-222222222222', name: 'Alimentação', createdAt: new Date().toISOString() },
    { id: 'g333g333-3333-3333-3333-333333333333', name: 'Pessoal', createdAt: new Date().toISOString() },
    { id: 'g444g444-4444-4444-4444-444444444444', name: 'Insumos', createdAt: new Date().toISOString() }
  ],
  cardFees: []
} as any;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<any>(MOCK_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [simulations, setSimulations] = useState<any[]>([]);

  const refreshData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      console.log(`🚀 STORE: Iniciando carregamento de dados${silent ? ' (SILENCIO)' : ''}...`);

      const safeQuery = async (query: any, tableName: string) => {
        try {
          const { data, error } = await query;
          if (error) {
            console.error(`⚠️ STORE: Erro ao carregar ${tableName}:`, error);
            return null;
          }
          return data;
        } catch (err) {
          console.error(`❌ STORE: Falha crítica na query ${tableName}:`, err);
          return null;
        }
      };

      const [
        productsData,
        suppliersData,
        customersData,
        categoriesData,
        groupsData,
        usersData,
        settingsData,
        transData,
        salesData,
        prodData,
        delData,
        quotesData,
        oData,
        stockMovementsData,
        cardFeesData,
        simulationsData
      ] = await Promise.all([
        safeQuery(supabase.from('products').select('*').order('name'), 'products'),
        safeQuery(supabase.from('suppliers').select('*').order('name'), 'suppliers'),
        safeQuery(supabase.from('customers').select('*').order('name'), 'customers'),
        safeQuery(supabase.from('categories').select('*'), 'categories'),
        safeQuery(supabase.from('category_groups').select('*'), 'category_groups'),
        safeQuery(supabase.from('profiles').select('*'), 'profiles'),
        supabase.from('company_settings').select('*').single().then(res => res.data),
        safeQuery(supabase.from('transactions').select('*').order('date', { ascending: false }).limit(2000), 'transactions'),
        safeQuery(supabase.from('sales').select('*, sale_items(*)').order('date', { ascending: false }).limit(1000), 'sales'),
        safeQuery(supabase.from('production_orders').select('*').order('date', { ascending: false }), 'production_orders'),
        safeQuery(supabase.from('deliveries').select('*').order('date', { ascending: false }), 'deliveries'),
        safeQuery(supabase.from('quotes').select('*, quote_items(*)').order('date', { ascending: false }).limit(500), 'quotes'),
        safeQuery(supabase.from('orders').select('*').order('date', { ascending: false }), 'orders'),
        safeQuery(supabase.from('stock_movements').select('*').order('date', { ascending: false }).limit(1000), 'stock_movements'),
        safeQuery(supabase.from('card_fees').select('*').order('installments'), 'card_fees'),
        safeQuery(supabase.from('simulations').select('*'), 'simulations')
      ]);

      const todayStr = formatISO(new Date());

      const formattedProducts = (productsData || []).map((p: any) => ({
        id: p.id || getUUID(),
        name: p.name || 'Produto sem nome',
        price: Number(p.price) || 0,
        cost: Number(p.cost) || 0,
        quantity: Number(p.quantity) || 0,
        minStock: Number(p.min_stock) || 0,
        sku: p.sku || '',
        category: p.category || 'Geral',
        image: p.image || '',
        description: p.description || '',
        entryDate: p.entry_date || todayStr.split('T')[0]
      }));

      const formattedSuppliers = (suppliersData || []).map((s: any) => ({
        id: s.id, name: s.name, companyName: s.company_name, cpfCnpj: s.cpf_cnpj, contact: s.contact, address: s.address, category: s.category
      }));

      const formattedCustomers = (customersData || []).map((c: any) => ({
        id: c.id || getUUID(), name: c.name || 'Cliente sem nome', cpfCnpj: c.cpf_cnpj || '', phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || ''
      }));

      const formattedCategories = (categoriesData || []).map((c: any) => ({
        id: c.id, name: c.name, type: c.type, groupId: c.group_id, isCmv: c.is_cmv
      }));

      const formattedGroups = (groupsData || []).map((g: any) => ({
        id: g.id, name: g.name, description: g.description, createdAt: g.created_at
      }));

      const formattedUsers = (usersData || []).map((u: any) => ({
        id: u.id, name: u.name || 'Usuário', email: u.email || '', department: u.department, roles: u.roles || []
      }));

      let formattedSettings = MOCK_DATA.companySettings;
      if (settingsData) {
        formattedSettings = {
          name: settingsData.name,
          cnpj: settingsData.cnpj,
          phone: settingsData.phone,
          address: settingsData.address,
          receiptMessage: settingsData.receipt_message,
          logo: settingsData.logo,
          primaryColor: settingsData.primary_color,
          secondaryColor: settingsData.secondary_color,
          termsAndConditions: settingsData.terms_and_conditions
        };
      }

      const todayDateOnly = new Date().toISOString().split('T')[0];
      const formattedTransactions = (transData || []).map((t: any) => {
        let status = t.status || 'PENDING';
        const dueDate = t.due_date || t.date || todayStr.split('T')[0];
        
        // Auto-detect LATE status
        if (status === 'PENDING' && dueDate < todayDateOnly) {
          status = 'LATE';
        }

        return {
          id: t.id, 
          description: t.description || 'Sem descrição', 
          amount: Number(t.amount) || 0, 
          type: t.type || 'EXPENSE', 
          category: t.category || 'Geral', 
          date: t.date || todayStr, 
          dueDate: dueDate, 
          status: status, 
          supplierId: t.supplier_id, 
          hasBoleto: !!t.has_boleto, 
          attachmentUrl: t.attachment_url || '', 
          accountType: t.account_type || 'VARIABLE', 
          installmentsTotal: t.installments_total || 1, 
          currentInstallment: t.current_installment || 1, 
          saleId: t.sale_id
        };
      });

      const formattedSales = (salesData || []).map((s: any) => ({
        id: s.id, customerName: s.customer_name || 'Cliente Final', customerPhone: s.customer_phone || '', customerAddress: s.customer_address || '', deliveryType: s.delivery_type || 'PICKUP', deliveryDate: s.delivery_date, date: s.date || todayStr, total: Number(s.total) || 0, discount: Number(s.discount) || 0, paymentMethod: s.payment_method || 'CASH', paymentType: s.payment_type || 'FULL', downPayment: Number(s.down_payment) || 0, remainingAmount: Number(s.remaining_amount) || 0, status: s.status || 'COMPLETED', observations: s.observations || '', remainingStatus: s.remaining_status || 'PAID',
        cardFeeAmount: Number(s.card_fee_amount) || 0,
        cardFeePercentage: Number(s.card_fee_percentage) || 0,
        cardInstallments: Number(s.card_installments) || 0,
        items: s.sale_items?.map((i: any) => ({
          id: i.id, productId: i.product_id, productName: i.product_name, description: i.description, quantity: i.quantity, unitPrice: i.unit_price, category: i.category, color: i.color, byOrder: i.by_order
        })) || []
      }));

      const formattedProd = (prodData || []).map((p: any) => ({
        id: p.id, saleId: p.sale_id, customerName: p.customer_name, customerPhone: p.customer_phone, customerAddress: p.customer_address, itemName: p.item_name, specs: p.specs, quantity: p.quantity, date: p.date, status: p.status
      }));

      const formattedDel = (delData || []).map((d: any) => ({
        id: d.id, customerName: d.customer_name, address: d.address, date: d.date, scheduledTime: d.scheduled_time, status: d.status, saleId: d.sale_id, productionOrderId: d.production_order_id, notes: d.notes, origin: d.origin
      }));

      const formattedQuotes = (quotesData || []).map((q: any) => ({
        id: q.id,
        quoteNumber: q.quote_number,
        clientName: q.client_name,
        clientPhone: q.client_phone,
        discount: Number(q.discount) || 0,
        validityDays: Number(q.validity_days) || 15,
        paymentMethod: q.payment_method || 'Dinheiro',
        paymentType: q.payment_type || 'FULL',
        downPayment: Number(q.down_payment) || 0,
        remainingAmount: Number(q.remaining_amount) || 0,
        remainingStatus: q.remaining_status || 'PENDING',
        remainingPaymentMethod: q.remaining_payment_method || '',
        observations: q.observations || '',
        subtotal: Number(q.subtotal) || 0,
        total: Number(q.total) || 0,
        date: q.date || todayStr,
        items: q.quote_items?.map((i: any) => ({
          id: i.id, quoteId: i.quote_id, productId: i.product_id, productName: i.product_name, productSku: i.product_sku || '', quantity: Number(i.quantity) || 0, unitPrice: Number(i.unit_price) || 0, total: Number(i.total) || 0, category: i.category || '', image: i.image || '', description: i.description || '', serviceType: i.service_type, serviceSpecs: i.service_specs
        })) || []
      }));

      const formattedOrders = (oData || []).map((o: any) => ({
        id: o.id, saleId: o.sale_id, productId: o.product_id, customerName: o.customer_name, productName: o.product_name, quantity: o.quantity, date: o.date, status: o.status, notes: o.notes
      }));

      const formattedStockMovements = (stockMovementsData || []).map((m: any) => ({
        id: m.id, productId: m.product_id, productName: m.product_name, quantity: m.quantity, type: m.type, date: m.date, observations: m.observations, userId: m.user_id
      }));

      const formattedCardFees = (cardFeesData || []).map((f: any) => ({
        id: f.id, installments: f.installments, percentage: Number(f.percentage) || 0
      }));

      setData({
        products: formattedProducts,
        suppliers: formattedSuppliers,
        customers: formattedCustomers,
        categories: formattedCategories,
        categoryGroups: formattedGroups,
        users: formattedUsers,
        companySettings: formattedSettings,
        transactions: formattedTransactions,
        sales: formattedSales,
        productionOrders: formattedProd,
        deliveries: formattedDel,
        quotes: formattedQuotes,
        orders: formattedOrders,
        stockMovements: formattedStockMovements,
        cardFees: formattedCardFees
      });

      setSimulations((simulationsData || []).map((s: any) => ({
        id: s.id, description: s.description, amount: Number(s.amount), dueDate: s.due_date, groupId: s.group_id
      })));

    } catch (error: any) {
      console.error('Error fetching data:', error);
      addNotification(`Erro de conexão: ${error.message || 'Verifique suas credenciais Supabase'}`, 'error');
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  // Initial Data Fetch from Supabase
  useEffect(() => {
    refreshData();

    // --- REALTIME SUBSCRIPTIONS ---
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_orders' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_settings' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_fees' }, () => refreshData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'simulations' }, () => refreshData(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- RECURRENCE CHECK FOR FIXED ACCOUNTS ---
  useEffect(() => {
    if (isInitialized && data.transactions.length > 0) {
      checkRecurringFixedAccounts(data.transactions);
    }
  }, [isInitialized]);

  const checkRecurringFixedAccounts = async (currentTransactions: Transaction[]) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayStr = formatISO(today);

    // 1. Identificar Contas Fixas (Apenas as "Infinitas", sem parcelas definidas)
    const fixedAccounts = currentTransactions.filter((t: Transaction) =>
      t.accountType === 'FIXED' &&
      t.type === 'EXPENSE' &&
      (!t.installmentsTotal || t.installmentsTotal === 0)
    );

    // 2. Agrupar por "Assinatura" (Descrição + Valor + Categoria) para evitar duplicatas erradas
    // Mas a lógica mais segura é verificar se JÁ EXISTE uma conta fixa com a mesma descrição E mesmo mês de vencimento.

    const transactionsToCreate: Transaction[] = [];

    // Para cada conta fixa existente...
    fixedAccounts.forEach((fixed: Transaction) => {
      // Ignorar se já for do mês atual (pois ela é a própria referência)
      const fixedDate = new Date(fixed.dueDate);
      if (fixedDate.getMonth() === currentMonth && fixedDate.getFullYear() === currentYear) {
        return;
      }

      // SAFETY CHECK: Prevent processing if the fixed account is from a future date
      if (fixedDate > today) return;

      // Verificar se já existe cópia no mês atual
      const alreadyExists = currentTransactions.some((t: Transaction) =>
        t.description === fixed.description &&
        t.category === fixed.category &&
        t.amount === fixed.amount &&
        isSameMonth(t.dueDate, todayStr)
      );

      if (!alreadyExists) {
        const newDueDate = parseISO(fixed.dueDate);
        newDueDate.setMonth(today.getMonth());
        newDueDate.setFullYear(today.getFullYear());

        const dueDateStr = formatISO(newDueDate);
        const newTransaction: Transaction = {
          id: getUUID(),
          description: fixed.description,
          amount: fixed.amount,
          type: 'EXPENSE',
          category: fixed.category,
          date: todayStr,
          dueDate: dueDateStr,
          status: (dueDateStr < todayStr) ? 'LATE' : 'PENDING',
          accountType: 'FIXED',
          hasBoleto: fixed.hasBoleto
        };

        transactionsToCreate.push(newTransaction);
      }
    });

    if (transactionsToCreate.length > 0) {
      console.log(`🔄 Gerando ${transactionsToCreate.length} contas fixas para o mês atual...`);

      // Adicionar ao Estado Local
      setData((prev: any) => ({
        ...prev,
        transactions: [...prev.transactions, ...transactionsToCreate]
      }));

      // Salvar no Supabase
      const dbTransactions = transactionsToCreate.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: t.date,
        due_date: t.dueDate,
        status: t.status,
        has_boleto: t.hasBoleto,
        account_type: 'FIXED'
      }));

      const { error } = await supabase.from('transactions').insert(dbTransactions);
      if (error) console.error('Error generating recurring fixed accounts:', error);
      else addNotification(`${transactionsToCreate.length} contas fixas geradas para este mês.`, 'info');
    }
  };

  const [currentView, setCurrentView] = useState<AppView>(() => {
    const storedView = localStorage.getItem('ROYAL_HOME_CURRENT_VIEW');
    return (storedView as AppView) || 'DASHBOARD';
  });

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    return storedTheme === 'dark';
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = getUUID();
    setNotifications(prev => [...prev, { id, message, type }]);

    // Auto remove after 3 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 3000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  useEffect(() => {
    let changed = false;
    const newData = { ...data };

    if (!newData.companySettings) {
      newData.companySettings = MOCK_DATA.companySettings;
      changed = true;
    }
    if (!newData.categories || (newData.categories.length > 0 && newData.categories[0].type === 'FINANCIAL')) {
      newData.categories = MOCK_DATA.categories;
      changed = true;
    }
    if (!newData.productionOrders) {
      newData.productionOrders = [];
      changed = true;
    }
    if (!newData.stockMovements) {
      newData.stockMovements = [];
      changed = true;
    }

    // Ensure admin has roles array if migrating from old version
    if (newData.users && newData.users.length > 0 && !Array.isArray(newData.users[0].roles)) {
      newData.users = MOCK_DATA.users;
      changed = true;
    }

    if (changed) setData(newData);
  }, []);

  useEffect(() => {
    // Sync with LocalStorage as backup (or removed if fully migrated)
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isInitialized]);

  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [pendingSale, setPendingSale] = useState<Partial<Sale> | null>(null);

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    localStorage.setItem('ROYAL_HOME_CURRENT_VIEW', view);
    // Auto-clear editing state when navigating AWAY from Sales if needed, 
    // but better to handle it inside Sales.tsx or explicitly.
  };


  const addTransaction = async (t: Transaction) => {
    // LOGICA DE PARCELAMENTO FIXO
    if (t.accountType === 'FIXED' && t.installmentsTotal && t.installmentsTotal > 1) {
      const transactionsToInsert: Transaction[] = [];

      for (let i = 0; i < t.installmentsTotal; i++) {
        // Calculate new month/year
        const newDate = parseISO(t.date);
        newDate.setMonth(newDate.getMonth() + i);

        const newDueDate = parseISO(t.dueDate);
        newDueDate.setMonth(newDueDate.getMonth() + i);

        // Adjust for month overflow (e.g. 31/01 -> 28/02)
        const originalDay = Number(t.dueDate.split('-')[2]);
        if (newDueDate.getDate() !== originalDay) {
          newDueDate.setDate(0);
        }

        const originalStartDay = Number(t.date.split('-')[2]);
        if (newDate.getDate() !== originalStartDay) {
          newDate.setDate(0);
        }

        const dateStr = formatISO(newDate);
        const dueDateStr = formatISO(newDueDate);
        const todayStr = formatISO(new Date());

        transactionsToInsert.push({
          ...t,
          id: i === 0 ? t.id : getUUID(),
          description: `${t.description} (${i + 1}/${t.installmentsTotal})`,
          date: dateStr,
          dueDate: dueDateStr,
          status: (t.status === 'PENDING' && dueDateStr < todayStr) ? 'LATE' : t.status,
          currentInstallment: i + 1,
          installmentsTotal: t.installmentsTotal
        });
      }

      // Optimistic
      setData((prev: any) => ({ ...prev, transactions: [...prev.transactions, ...transactionsToInsert] }));

      // Supabase Batch Insert
      const dbTransactions = transactionsToInsert.map(tx => ({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        date: tx.date,
        due_date: tx.dueDate,
        status: tx.status,
        supplier_id: tx.supplierId,
        has_boleto: tx.hasBoleto,
        attachment_url: tx.attachmentUrl,
        account_type: 'FIXED',
        payment_method: tx.paymentMethod
      }));

      const { error } = await supabase.from('transactions').insert(dbTransactions);

      if (error) {
        console.error('Error adding fixed installments:', error);
        addNotification('Erro ao salvar parcelas.', 'error');
      } else {
        addNotification(`${t.installmentsTotal} parcelas agendadas com sucesso!`, 'success');
      }
      return;
    }

    const todayStr = formatISO(new Date());
    const finalStatus = (t.status === 'PENDING' && t.dueDate < todayStr) ? 'LATE' : t.status;
    const finalTransaction = { ...t, status: finalStatus };

    setData((prev: any) => ({ ...prev, transactions: [...prev.transactions, finalTransaction] }));

    // Capture the error to handle the fallback logic
    const { error } = await supabase.from('transactions').insert({
      id: finalTransaction.id,
      description: finalTransaction.description,
      amount: finalTransaction.amount,
      type: finalTransaction.type,
      category: finalTransaction.category,
      date: finalTransaction.date,
      due_date: finalTransaction.dueDate,
      status: finalTransaction.status,
      supplier_id: finalTransaction.supplierId,
      has_boleto: finalTransaction.hasBoleto,
      attachment_url: finalTransaction.attachmentUrl,
      account_type: finalTransaction.accountType || 'VARIABLE',
      installments_total: finalTransaction.installmentsTotal,
      current_installment: finalTransaction.currentInstallment,
      payment_method: finalTransaction.paymentMethod
    });

    // Fallback: Se der erro de coluna inexistente, tenta salvar sem o account_type
    if (error && error.message.includes('account_type')) {
      console.warn('Column account_type missing. Saving without it.');
      await supabase.from('transactions').insert({
        id: finalTransaction.id,
        description: finalTransaction.description,
        amount: finalTransaction.amount,
        type: finalTransaction.type,
        category: finalTransaction.category,
        date: finalTransaction.date,
        due_date: finalTransaction.dueDate,
        status: finalTransaction.status,
        has_boleto: finalTransaction.hasBoleto,
        attachment_url: finalTransaction.attachmentUrl,
        payment_method: finalTransaction.paymentMethod
      });
      addNotification('Aviso: Funcionalidade de conta fixa indisponível (Banco desatualizado).', 'info');
    } else if (error) {
      console.error('Error adding transaction:', error);
      addNotification('Erro ao salvar transação.', 'error');
    }
  };

  const splitTransactionPayment = async (originalId: string, paidAmount: number, method: string, notes: string, date: string) => {
    const original = data.transactions.find((t: Transaction) => t.id === originalId);
    if (!original) return;

    const remainingAmount = original.amount - paidAmount;

    // 1. Create PAID Transaction
    const paidTrans: Transaction = {
      ...original,
      id: getUUID(),
      amount: paidAmount,
      status: 'PAID',
      dueDate: date,
      saleId: original.saleId,
      paymentMethod: method
    };

    const { error: paidError } = await supabase.from('transactions').insert({
      id: paidTrans.id,
      description: paidTrans.description,
      amount: paidTrans.amount,
      type: paidTrans.type,
      category: paidTrans.category,
      date: paidTrans.date,
      due_date: paidTrans.dueDate,
      status: 'PAID',
      has_boleto: paidTrans.hasBoleto,
      account_type: paidTrans.accountType,
      installments_total: paidTrans.installmentsTotal,
      current_installment: paidTrans.currentInstallment,
      sale_id: paidTrans.saleId,
      payment_method: paidTrans.paymentMethod
    });

    if (paidError) {
      addNotification('Erro ao registrar pagamento.', 'error');
      return;
    }

    // 2. Update Original Transaction
    if (remainingAmount <= 0) {
      // If fully paid, just delete or mark original as PAID?
      // User says: "subtract and lanza new transaction". So if R$ 2000 - R$ 2000, original becomes 0.
      // Better to update original to remaining and if 0, maybe mark as PAID or handle gracefully.
      const { error: updateError } = await supabase.from('transactions').update({
        amount: 0,
        status: 'PAID'
      }).eq('id', originalId);

      _updateLocalState(originalId, 0, 'PAID', paidTrans);
    } else {
      const { error: updateError } = await supabase.from('transactions').update({
        amount: remainingAmount
      }).eq('id', originalId);

      _updateLocalState(originalId, remainingAmount, original.status, paidTrans);
    }

    addNotification(`Pagamento de R$ ${paidAmount.toLocaleString('pt-BR')} registrado!`, 'success');
  };

  const _updateLocalState = (originalId: string, newAmount: number, newStatus: TransactionStatus, newTrans: Transaction) => {
    setData((prev: any) => ({
      ...prev,
      transactions: [
        newTrans,
        ...prev.transactions.map((t: Transaction) =>
          t.id === originalId ? { ...t, amount: newAmount, status: newStatus } : t
        )
      ]
    }));
  };

  const updateTransaction = async (t: Transaction) => {
    const todayStr = formatISO(new Date());
    const finalStatus = (t.status === 'PENDING' && t.dueDate < todayStr) ? 'LATE' : t.status;
    const ut = { ...t, status: finalStatus };

    setData((prev: any) => ({ ...prev, transactions: prev.transactions.map((i: Transaction) => i.id === ut.id ? ut : i) }));

    // Unificar atualização em uma única chamada robusta
    const { error } = await supabase.from('transactions').update({
      description: ut.description,
      amount: ut.amount,
      type: ut.type,
      category: ut.category,
      date: ut.date,
      due_date: ut.dueDate,
      status: ut.status,
      supplier_id: ut.supplierId,
      has_boleto: ut.hasBoleto,
      attachment_url: ut.attachmentUrl,
      account_type: ut.accountType || 'VARIABLE',
      installments_total: ut.installmentsTotal,
      current_installment: ut.currentInstallment,
      payment_method: ut.paymentMethod
    }).eq('id', ut.id);

    if (error && error.message.includes('account_type')) {
      console.warn('Column account_type missing. Updating without it.');
      await supabase.from('transactions').update({
        description: ut.description,
        amount: ut.amount,
        type: ut.type,
        category: ut.category,
        date: ut.date,
        due_date: ut.dueDate,
        status: ut.status,
        supplier_id: ut.supplierId,
        has_boleto: ut.hasBoleto,
        attachment_url: ut.attachmentUrl,
        installments_total: ut.installmentsTotal,
        current_installment: ut.currentInstallment
      }).eq('id', ut.id);
      addNotification('Aviso: Funcionalidade de conta fixa indisponível (Banco desatualizado).', 'info');
    } else if (error) {
      addNotification('Erro ao atualizar transação.', 'error');
    }
  };

  const deleteTransaction = async (id: string) => {
    setData((prev: any) => ({ ...prev, transactions: prev.transactions.filter((t: Transaction) => t.id !== id) }));
    await supabase.from('transactions').delete().eq('id', id);
  };

  const addProduct = async (p: Product) => {
    // Optimistic Update
    setData((prev: any) => ({ ...prev, products: [...prev.products, p] }));

    // Supabase Insert
    const { error } = await supabase.from('products').insert({
      id: p.id,
      name: p.name,
      price: p.price,
      cost: p.cost,
      quantity: p.quantity,
      min_stock: p.minStock,
      sku: p.sku,
      category: p.category,
      image: p.image,
      description: p.description,
      entry_date: p.entryDate
    });

    if (error) {
      console.error('Error adding product:', error);
      addNotification('Erro ao salvar produto no banco de dados', 'error');
    } else {
      addNotification('Produto salvo com sucesso', 'success');
    }
  };

  const updateProduct = async (p: Product) => {
    // Audit check: log adjustment if quantity changed manually
    const oldProduct = data.products.find((prod: Product) => prod.id === p.id);
    if (oldProduct && oldProduct.quantity !== p.quantity) {
      const diff = p.quantity - oldProduct.quantity;
      if (Math.abs(diff) > 0) {
        await addStockMovement({
          id: getUUID(),
          productId: p.id,
          productName: p.name,
          quantity: diff,
          type: 'ADJUSTMENT',
          date: new Date().toISOString(),
          observations: 'Ajuste manual de estoque via painel'
        });
      }
    }

    setData((prev: any) => ({ ...prev, products: prev.products.map((i: Product) => i.id === p.id ? p : i) }));

    const { error } = await supabase.from('products').update({
      name: p.name,
      price: p.price,
      cost: p.cost,
      quantity: p.quantity,
      min_stock: p.minStock,
      sku: p.sku,
      category: p.category,
      image: p.image,
      description: p.description,
      entry_date: p.entryDate
    }).eq('id', p.id);

    if (error) addNotification('Erro ao atualizar produto', 'error');
  };

  const deleteProduct = async (id: string) => {
    const oldProduct = data.products.find((p: Product) => p.id === id);
    setData((prev: any) => ({ ...prev, products: prev.products.filter((i: Product) => i.id !== id) }));
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar produto:', error);
      addNotification('Erro ao deletar produto: ' + error.message, 'error');
      if (oldProduct) {
        setData((prev: any) => ({ ...prev, products: [...prev.products, oldProduct] }));
      }
    } else {
      addNotification('Produto deletado com sucesso', 'success');
    }
  };

  const registerStockEntry = async (productId: string, quantity: number, cost: number, date: string, observations?: string) => {
    const product = data.products.find(p => p.id === productId);
    if (!product) return;

    const newQuantity = product.quantity + quantity;

    // 1. Update local state
    setData((prev: any) => ({
      ...prev,
      products: prev.products.map((p: Product) => p.id === productId ? { ...p, quantity: newQuantity, cost, entryDate: date } : p)
    }));

    // 2. Update DB
    const { error: productError } = await supabase.from('products').update({
      quantity: newQuantity,
      cost,
      entry_date: date
    }).eq('id', productId);

    if (productError) {
      console.error('Error updating stock entry:', productError);
      addNotification('Erro ao atualizar estoque', 'error');
      return;
    }

    // 3. Log Stock Movement
    await addStockMovement({
      id: getUUID(),
      productId,
      productName: product.name,
      quantity,
      type: 'PURCHASE',
      date: date,
      observations: observations || 'Entrada manual de estoque'
    });

    addNotification(`Entrada de ${quantity} unidades registrada com sucesso`, 'success');
  };

  const addSale = async (s: Sale) => {
    if (!s.items || s.items.length === 0) {
      addNotification('Erro: Não é possível salvar uma venda sem itens.', 'error');
      return false;
    }

    setData((prev: any) => ({ ...prev, sales: [...prev.sales, s] }));

    // 1. Insert Sales Record
    let { error } = await supabase.from('sales').insert({
      id: s.id,
      customer_name: s.customerName,
      customer_phone: s.customerPhone,
      customer_address: s.customerAddress,
      delivery_type: s.deliveryType,
      date: s.date,
      total: s.total,
      discount: s.discount,
      payment_method: s.paymentMethod,
      down_payment_method: s.downPaymentMethod,
      remaining_payment_method: s.remainingPaymentMethod,
      payment_type: s.paymentType,
      down_payment: s.downPayment,
      remaining_amount: s.remainingAmount,
      status: s.status,
      observations: s.observations,
      delivery_date: s.deliveryDate || null,
      card_fee_amount: s.cardFeeAmount || 0,
      card_fee_percentage: s.cardFeePercentage || 0,
      card_installments: s.cardInstallments || 0
    });

    // Fallback: If table exists but missing the card_fee_amount or delivery_date columns
    if (error && (error.message.includes('card_fee_amount') || error.message.includes('delivery_date'))) {
      console.warn('⚠️ Column card_fee_amount or delivery_date missing in sales table. Retrying insert without card fee and delivery date columns...');
      const fallbackRes = await supabase.from('sales').insert({
        id: s.id,
        customer_name: s.customerName,
        customer_phone: s.customerPhone,
        customer_address: s.customerAddress,
        delivery_type: s.deliveryType,
        date: s.date,
        total: s.total,
        discount: s.discount,
        payment_method: s.paymentMethod,
        down_payment_method: s.downPaymentMethod,
        remaining_payment_method: s.remainingPaymentMethod,
        payment_type: s.paymentType,
        down_payment: s.downPayment,
        remaining_amount: s.remainingAmount,
        status: s.status,
        observations: s.observations
      });
      error = fallbackRes.error;
      if (!error) {
        addNotification('Aviso: Venda cadastrada sem taxas de cartão/data de entrega (Banco desatualizado).', 'info');
      }
    }

    if (error) {
      console.error('❌ STORE: Erro ao inserir cabeçalho da venda:', error);
      addNotification(`Erro ao criar venda: ${error.message}`, 'error');
      // Rollback otimista
      setData((prev: any) => ({ ...prev, sales: prev.sales.filter((sale: Sale) => sale.id !== s.id) }));
      return false;
    }

    if (!error) {
      // 2. PREPARE ITEMS & STOCK LOGIC
      // We process items first to determine their final state (byOrder or not)
      const processedItems = [];

      for (const item of s.items) {
        // Clone item to avoid mutation issues
        const processingItem = { ...item };

        if (processingItem.category !== 'Serviços' && processingItem.serviceType !== 'INTERNAL') {
          const product = data.products.find((p: Product) => p.id === processingItem.productId);

          if (product) {
            // 2A. Auto-detect "Encomenda" if stock is 0 or less
            // FORCE byOrder to true if stock is insufficient
            if (product.quantity <= 0) {
              processingItem.byOrder = true;
            }

            // 2B. Handle Logic based on byOrder status
            if (processingItem.byOrder) {
              // Create Order
              const newOrder: Order = {
                id: getUUID(),
                saleId: s.id,
                productId: processingItem.productId,
                customerName: s.customerName,
                productName: processingItem.productName,
                quantity: processingItem.quantity,
                date: s.date,
                status: 'PENDING',
                notes: `Encomenda de Venda #${s.id.slice(0, 4)}`
              };
              await addOrder(newOrder);
            } else {
              // Reduce Stock
              const newQty = product.quantity - processingItem.quantity;
              await updateProduct({ ...product, quantity: newQty });

              addStockMovement({
                id: getUUID(),
                productId: processingItem.productId,
                productName: processingItem.productName,
                quantity: -processingItem.quantity,
                type: 'SALE',
                date: s.date,
                observations: `Venda #${s.id.slice(0, 4)}`
              });
            }
          }
        }
        processedItems.push(processingItem);
      }

      // 3. Insert Sale Items
      console.log('📦 STORE: Preparando itens para inserção:', processedItems);

      const itemsToInsert = processedItems.map(i => {
        const productExists = data.products.some((p: Product) => p.id === i.productId);
        // Clean log: Only warn if it's NOT a custom item (meaning it should have an ID but doesn't)
        if (!i.productId && i.category !== 'Personalizado') {
          console.warn('⚠️ STORE: Item sem productId detectado (pode ser item avulso ou erro):', i.productName);
        }

        return {
          sale_id: s.id,
          product_id: (i.productId && productExists) ? i.productId : null,
          product_name: i.productName || 'Item sem nome',
          description: i.description,
          quantity: i.quantity || 1,
          unit_price: i.unitPrice || 0,
          category: i.category || 'Geral',
          service_type: i.serviceType,
          service_specs: typeof i.serviceSpecs === 'object' ? JSON.stringify(i.serviceSpecs) : i.serviceSpecs,
          color: i.color,
          by_order: i.byOrder
        };
      });

      console.log(`📦 STORE: Enviando ${itemsToInsert.length} itens para o Supabase...`, itemsToInsert);
      const { data: insertedItems, error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert).select();

      if (itemsError) {
        console.error('❌ STORE: Erro ao inserir itens da venda:', itemsError);
        addNotification(`Erro nos itens da venda: ${itemsError.message}`, 'error');
      } else {
        console.log('✅ STORE: Itens da venda inseridos com sucesso:', insertedItems);
        addNotification('Venda finalizada com sucesso', 'success');
      }

      // 3. FINANCIAL INTEGRATION (Auto-Transactions)
      if (s.cardFeeAmount && s.cardFeeAmount > 0) {
        const feeTrans: Transaction = {
          id: getUUID(),
          description: `Taxa de Cartão Venda #${s.id.slice(0, 4)}`,
          amount: s.cardFeeAmount,
          type: 'EXPENSE',
          category: 'Taxas e Impostos',
          date: s.date,
          dueDate: s.date,
          status: 'PAID',
          saleId: s.id,
          paymentMethod: s.paymentMethod
        };
        await addTransaction(feeTrans);
      }

      if (s.downPayment && s.downPayment > 0) {
        const downTrans: Transaction = {
          id: getUUID(),
          description: `Entrada Venda #${s.id.slice(0, 4)} - ${s.customerName}`,
          amount: s.downPayment,
          type: 'INCOME',
          category: 'Vendas',
          date: s.date,
          dueDate: s.date,
          status: 'PAID',
          saleId: s.id,
          paymentMethod: s.downPaymentMethod || s.paymentMethod
        };
        await addTransaction(downTrans);
      } else if (s.paymentType === 'FULL') {
        const fullTrans: Transaction = {
          id: getUUID(),
          description: `Venda #${s.id.slice(0, 4)} - ${s.customerName}`,
          amount: s.total,
          type: 'INCOME',
          category: 'Vendas',
          date: s.date,
          dueDate: s.date,
          status: 'PAID',
          saleId: s.id,
          paymentMethod: s.paymentMethod
        };
        await addTransaction(fullTrans);
      }

      if (s.paymentType === 'PARTIAL' && s.remainingAmount && s.remainingAmount > 0) {
        const status = s.remainingStatus === 'PAID' ? 'PAID' : 'PENDING';
        const remTrans: Transaction = {
          id: getUUID(),
          description: `Restante Venda #${s.id.slice(0, 4)} - ${s.customerName}`,
          amount: s.remainingAmount,
          type: 'INCOME',
          category: 'Vendas',
          date: s.date,
          dueDate: s.deliveryDate || s.date,
          status: status,
          saleId: s.id,
          paymentMethod: s.remainingPaymentMethod || s.paymentMethod
        };
        await addTransaction(remTrans);
      }



      // --- NEW LOGIC: Create Delivery or Production Order ---
      let hasProduction = false;

      for (const item of s.items) {
        if (item.category === 'Serviços' || item.serviceType === 'INTERNAL') {
          hasProduction = true;
          // Create Production Order
          const prodOrder: ProductionOrder = {
            id: getUUID(),
            saleId: s.id,
            customerName: s.customerName,
            customerPhone: s.customerPhone,
            customerAddress: s.customerAddress,
            itemName: item.productName,
            specs: item.serviceSpecs || '',
            quantity: item.quantity,
            date: formatISO(new Date()),
            status: 'PENDING'
          };
          await addProductionOrder(prodOrder);
        }
      }

      // If it's a delivery sale, create delivery ONLY for items that are ready (In Stock)
      // Services go to Production -> Delivery (on Complete)
      // Out of Stock go to Orders -> Delivery (on Receive)
      if (s.deliveryType === 'DELIVERY') {
        const readyItems = processedItems.filter(i => {
          const isService = i.category === 'Serviços' || i.serviceType === 'INTERNAL';
          const isMsg = i.byOrder; // If it was marked as byOrder, it's not ready
          return !isService && !isMsg;
        });

        if (readyItems.length > 0) {
          // Formata detalhes APENAS dos itens prontos
          const itemDetails = readyItems.map(i => {
            let line = `${i.quantity}x ${i.productName}`;
            if (i.serviceSpecs) {
              const readable = formatSpecsForDelivery(i.serviceSpecs);
              line += `\n   » ${readable}`;
            }
            return line;
          }).join('\n');

          const delivery: Delivery = {
            id: getUUID(),
            customerName: s.customerName,
            address: s.customerAddress || 'Endereço não informado',
            date: s.deliveryDate || s.date,
            status: 'PENDING',
            saleId: s.id,
            notes: `${itemDetails}`,
            origin: 'SALES'
          };
          await addDelivery(delivery);
        }
      }

      return true;
    }
    return false;
  };

  const updateSale = async (s: Sale) => {
    if (!s.items || s.items.length === 0) {
      addNotification('Erro: Não é possível atualizar uma venda removendo todos os itens.', 'error');
      return false;
    }

    const previousSale = data.sales.find((item: Sale) => item.id === s.id);
    setData((prev: any) => ({ ...prev, sales: prev.sales.map((item: Sale) => item.id === s.id ? s : item) }));

    let { error } = await supabase.from('sales').update({
      customer_name: s.customerName,
      customer_phone: s.customerPhone,
      customer_address: s.customerAddress,
      delivery_type: s.deliveryType,
      date: s.date,
      total: s.total,
      discount: s.discount,
      payment_method: s.paymentMethod,
      down_payment_method: s.downPaymentMethod,
      remaining_payment_method: s.remainingPaymentMethod,
      payment_type: s.paymentType,
      down_payment: s.downPayment,
      remaining_amount: s.remainingAmount,
      status: s.status,
      observations: s.observations,
      delivery_date: s.deliveryDate || null,
      card_fee_amount: s.cardFeeAmount || 0,
      card_fee_percentage: s.cardFeePercentage || 0,
      card_installments: s.cardInstallments || 0
    }).eq('id', s.id);

    // Fallback: If table exists but missing the card_fee_amount or delivery_date columns
    if (error && (error.message.includes('card_fee_amount') || error.message.includes('delivery_date'))) {
      console.warn('⚠️ Column card_fee_amount or delivery_date missing in sales table. Retrying update without card fee and delivery date columns...');
      const fallbackRes = await supabase.from('sales').update({
        customer_name: s.customerName,
        customer_phone: s.customerPhone,
        customer_address: s.customerAddress,
        delivery_type: s.deliveryType,
        date: s.date,
        total: s.total,
        discount: s.discount,
        payment_method: s.paymentMethod,
        down_payment_method: s.downPaymentMethod,
        remaining_payment_method: s.remainingPaymentMethod,
        payment_type: s.paymentType,
        down_payment: s.downPayment,
        remaining_amount: s.remainingAmount,
        status: s.status,
        observations: s.observations
      }).eq('id', s.id);
      error = fallbackRes.error;
      if (!error) {
        addNotification('Aviso: Venda atualizada sem taxas de cartão/data de entrega (Banco desatualizado).', 'info');
      }
    }

    if (error) {
      console.error('❌ STORE: Erro ao atualizar cabeçalho da venda:', error);
      addNotification(`Erro ao salvar venda: ${error.message}`, 'error');
      // Rollback
      if (previousSale) {
        setData((prev: any) => ({ ...prev, sales: prev.sales.map((item: Sale) => item.id === s.id ? previousSale : item) }));
      }
      return false;
    }

    if (!error) {
      // Clear and re-insert items to ensure sync
      const { error: deleteError } = await supabase.from('sale_items').delete().eq('sale_id', s.id);

      if (deleteError) {
        console.error('❌ STORE: Erro crítico ao limpar itens antigos:', deleteError);
        addNotification('Erro ao limpar itens antigos. A venda pode estar duplicada.', 'error');
        return false; // Stop execution to prevent mess
      }

      console.log(`📦 STORE: Inserindo novos itens para venda ${s.id}...`, s.items);

      const items = s.items.map(i => {
        // FK Safety: Only send product_id if it exists in the products table
        // We trust the productId passed from Sales.tsx more now
        const productExists = data.products.some((p: Product) => p.id === i.productId);
        // Clean log: Only warn if it's NOT a custom item
        if (!i.productId && i.category !== 'Personalizado') {
          console.warn('⚠️ STORE: Item sem productId detectado (update):', i.productName);
        }

        return {
          sale_id: s.id,
          product_id: (i.productId && productExists) ? i.productId : null, // Ensure valid UUID or null
          product_name: i.productName || 'Item sem nome',
          description: i.description,
          quantity: i.quantity || 1,
          unit_price: i.unitPrice || 0,
          category: i.category || 'Geral',
          service_type: i.serviceType,
          service_specs: typeof i.serviceSpecs === 'object' ? JSON.stringify(i.serviceSpecs) : i.serviceSpecs,
          color: i.color,
          by_order: i.byOrder
        };
      });

      if (items.length > 0) {
        const { data: updatedItems, error: itemsError } = await supabase.from('sale_items').insert(items).select();

        if (itemsError) {
          console.error('❌ STORE: Erro ao reinserir itens da venda:', itemsError);
          addNotification(`Erro ao salvar itens: ${itemsError.message}`, 'error');
        } else {
          console.log('✅ STORE: Itens da venda atualizados com sucesso:', updatedItems);
          addNotification('Venda e produtos atualizados com sucesso!', 'success');

          // Update local state to ensure UI reflects the changes immediately with the new IDs if needed
          const newLocalItems = updatedItems?.map((ui: any) => ({
            id: ui.id,
            productId: ui.product_id,
            productName: ui.product_name,
            description: ui.description,
            quantity: ui.quantity,
            unitPrice: ui.unit_price,
            category: ui.category,
            serviceType: ui.service_type,
            serviceSpecs: ui.service_specs,
            color: ui.color,
            byOrder: ui.by_order
          }));

          // Update the specific sale in local state with the confirmed items from DB
          setData((prev: any) => ({
            ...prev,
            sales: prev.sales.map((item: Sale) => item.id === s.id ? { ...s, items: newLocalItems || s.items } : item)
          }));

          return true;
        }
      } else {
        console.warn('⚠️ STORE: Venda salva sem itens (lista vazia).');
        addNotification('Venda salva, mas sem itens.', 'info');
        return true;
      }
    } else {
      console.error('❌ STORE: Erro ao atualizar cabeçalho da venda:', error);
      addNotification(`Erro ao salvar venda: ${error.message}`, 'error');
      return false;
    }
  };

  const deleteSale = async (id: string) => {
    console.log('📦 STORE: Iniciando exclusão definitiva no banco:', id);
    try {
      // 0. FETCH ITEMS TO RESTORE STOCK (Before Deletion)
      const { data: saleItems } = await supabase.from('sale_items').select('*').eq('sale_id', id);

      if (saleItems) {
        for (const item of saleItems) {
          // Restore stock ONLY if it was NOT made to order (i.e. taken from stock)
          if (!item.by_order && item.product_id) {
            const product = data.products.find((p: Product) => p.id === item.product_id);
            if (product) {
              await updateProduct({ ...product, quantity: product.quantity + item.quantity });
              // Log return
              addStockMovement({
                id: getUUID(),
                productId: item.product_id,
                productName: item.product_name,
                quantity: item.quantity, // Positive for return
                type: 'RETURN',
                date: new Date().toISOString(),
                observations: `Estorno de Venda EXCLUÍDA #${id.slice(0, 4)}`
              });
            }
          }
        }
      }

      // 1. Limpeza agressiva no estado local para feedback imediato
      setData((prev: any) => ({
        ...prev,
        sales: prev.sales.filter((s: Sale) => s.id !== id),
        productionOrders: (prev.productionOrders || []).filter((o: ProductionOrder) => o.saleId !== id),
        deliveries: (prev.deliveries || []).filter((d: Delivery) => d.saleId !== id),
        orders: (prev.orders || []).filter((o: Order) => o.saleId !== id),
        // Filter transactions for immediate UI update (matches description pattern)
        transactions: prev.transactions.filter((t: Transaction) => !t.description.includes(id.slice(0, 4)))
      }));

      // 2. Remoção no Supabase
      // Clean up linked transactions (using description pattern matching as fallback for now)
      // Note: Ideal would be a sale_id column in transactions, but description match works for generated ones.
      const { error: transError } = await supabase.from('transactions').delete().ilike('description', `%Venda #${id.slice(0, 4)}%`);
      if (transError) console.error('Erro ao excluir transações vinculadas:', transError);

      await supabase.from('sale_items').delete().eq('sale_id', id);
      await supabase.from('production_orders').delete().eq('sale_id', id);
      await supabase.from('deliveries').delete().eq('sale_id', id);
      await supabase.from('orders').delete().eq('sale_id', id); // Remove linked Encomendas

      const { error } = await supabase.from('sales').delete().eq('id', id);

      if (error) {
        console.error('❌ STORE: Erro ao deletar do Supabase:', error);
        addNotification(`Erro no banco: ${error.message}`, 'error');
      } else {
        console.log('✅ STORE: Venda removida com sucesso!');
        addNotification('Venda e produtos devolvidos ao estoque (se aplicável).', 'info');
      }
    } catch (err: any) {
      console.error('⚠️ STORE: Falha crítica na exclusão:', err);
      addNotification('Erro ao processar exclusão', 'error');
    }
  };

  const addStockMovement = async (m: StockMovement) => {
    setData((prev: any) => ({ ...prev, stockMovements: [m, ...(prev.stockMovements || [])] }));
    const { error } = await supabase.from('stock_movements').insert({
      id: m.id,
      product_id: m.productId,
      product_name: m.productName,
      quantity: m.quantity,
      type: m.type,
      date: m.date,
      observations: m.observations,
      user_id: m.userId
    });
    if (error) console.error('Erro ao salvar log de estoque:', error);
  };

  const addSupplier = async (s: Supplier) => {
    setData((prev: any) => ({ ...prev, suppliers: [...prev.suppliers, s] }));

    const { error } = await supabase.from('suppliers').insert({
      id: s.id,
      name: s.name,
      company_name: s.companyName,
      cpf_cnpj: s.cpfCnpj,
      contact: s.contact,
      address: s.address,
      category: s.category
    });

    if (error) addNotification('Erro ao salvar fornecedor', 'error');
  };

  const updateSupplier = async (s: Supplier) => {
    setData((prev: any) => ({ ...prev, suppliers: prev.suppliers.map((i: Supplier) => i.id === s.id ? s : i) }));

    const { error } = await supabase.from('suppliers').update({
      name: s.name,
      company_name: s.companyName,
      cpf_cnpj: s.cpfCnpj,
      contact: s.contact,
      address: s.address,
      category: s.category
    }).eq('id', s.id);

    if (error) addNotification('Erro ao atualizar fornecedor', 'error');
  };

  const deleteSupplier = async (id: string) => {
    setData((prev: any) => ({ ...prev, suppliers: prev.suppliers.filter((i: Supplier) => i.id !== id) }));
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) addNotification('Erro ao deletar fornecedor', 'error');
  };

  const addCustomer = async (c: Customer) => {
    setData((prev: any) => ({ ...prev, customers: [...prev.customers, c] }));

    const { error } = await supabase.from('customers').insert({
      id: c.id,
      name: c.name,
      cpf_cnpj: c.cpfCnpj,
      phone: c.phone,
      email: c.email,
      address: c.address,
      notes: c.notes
    });

    if (error) addNotification('Erro ao salvar cliente', 'error');
  };

  const updateCustomer = async (c: Customer) => {
    setData((prev: any) => ({ ...prev, customers: prev.customers.map((i: Customer) => i.id === c.id ? c : i) }));

    const { error } = await supabase.from('customers').update({
      name: c.name,
      cpf_cnpj: c.cpfCnpj,
      phone: c.phone,
      email: c.email,
      address: c.address,
      notes: c.notes
    }).eq('id', c.id);

    if (error) addNotification('Erro ao atualizar cliente', 'error');
  };

  const deleteCustomer = async (id: string) => {
    setData((prev: any) => ({ ...prev, customers: prev.customers.filter((i: Customer) => i.id !== id) }));
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) addNotification('Erro ao deletar cliente', 'error');
  };

  const addDelivery = async (d: Delivery) => {
    setData((prev: any) => ({ ...prev, deliveries: [...prev.deliveries, d] }));
    const { error } = await supabase.from('deliveries').insert({
      id: d.id,
      customer_name: d.customerName,
      address: d.address,
      date: d.date,
      scheduled_time: d.scheduledTime,
      status: d.status,
      sale_id: d.saleId,
      production_order_id: d.productionOrderId,
      notes: d.notes,
      origin: d.origin
    });
    if (error) {
      console.error('Erro ao salvar entrega:', error);
      addNotification('Erro ao salvar entrega: ' + error.message, 'error');
      // Rollback local state
      setData((prev: any) => ({ ...prev, deliveries: prev.deliveries.filter((del: Delivery) => del.id !== d.id) }));
    }
  };

  const updateDeliveryStatus = async (id: string, status: Delivery['status']) => {
    const oldDelivery = data.deliveries.find((d: Delivery) => d.id === id);
    setData((prev: any) => ({ ...prev, deliveries: prev.deliveries.map((d: Delivery) => d.id === id ? { ...d, status } : d) }));
    const { error } = await supabase.from('deliveries').update({ status }).eq('id', id);
    if (error) {
      console.error('Erro ao atualizar status da entrega:', error);
      addNotification('Erro ao atualizar entrega: ' + error.message, 'error');
      // Rollback
      if (oldDelivery) {
        setData((prev: any) => ({ ...prev, deliveries: prev.deliveries.map((d: Delivery) => d.id === id ? oldDelivery : d) }));
      }
    } else {
      addNotification('Status da entrega atualizado com sucesso', 'success');
    }
  };

  const updateDelivery = async (d: Delivery) => {
    const oldDelivery = data.deliveries.find((i: Delivery) => i.id === d.id);
    setData((prev: any) => ({ ...prev, deliveries: prev.deliveries.map((i: Delivery) => i.id === d.id ? d : i) }));
    const { error } = await supabase.from('deliveries').update({
      date: d.date,
      scheduled_time: d.scheduledTime,
      status: d.status,
      notes: d.notes
    }).eq('id', d.id);
    if (error) {
      console.error('Erro ao atualizar entrega:', error);
      addNotification('Erro ao atualizar entrega: ' + error.message, 'error');
      // Rollback
      if (oldDelivery) {
        setData((prev: any) => ({ ...prev, deliveries: prev.deliveries.map((i: Delivery) => i.id === d.id ? oldDelivery : i) }));
      }
    } else {
      addNotification('Entrega atualizada com sucesso', 'success');
    }
  };

  const deleteDelivery = async (id: string) => {
    const oldDelivery = data.deliveries.find((d: Delivery) => d.id === id);
    setData((prev: any) => ({ ...prev, deliveries: prev.deliveries.filter((d: Delivery) => d.id !== id) }));
    const { error } = await supabase.from('deliveries').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar entrega:', error);
      addNotification('Erro ao deletar entrega: ' + error.message, 'error');
      if (oldDelivery) {
        setData((prev: any) => ({ ...prev, deliveries: [...prev.deliveries, oldDelivery] }));
      }
    } else {
      addNotification('Entrega deletada com sucesso', 'success');
    }
  };

  // Helper to format specs for delivery notes (Detailed for Driver)
  const formatSpecsForDelivery = (specsStr: string): string => {
    try {
      const s: FurnitureSpecs = JSON.parse(specsStr);
      let desc = [];

      if (s.model) desc.push(`Modelo: ${s.model}`);
      if (s.modules && s.modules.length > 0) desc.push(`Módulos: ${s.modules.join('+')}`);
      if (s.seatsCount && s.seatsCount.length > 0) desc.push(`Assentos: ${s.seatsCount.join(',')}`);

      // Detalhes técnicos importantes para transporte
      if (s.arm?.types?.length) desc.push(`Braço: ${s.arm.types.join('/')}`);
      if (s.backrestConfig?.types?.includes('Solta')) desc.push('Almofada Solta (Cuidado)');

      if (s.observations) desc.push(`Obs: ${s.observations}`);

      return desc.join('. ');
    } catch {
      return specsStr; // Fallback se for texto simples
    }
  };

  const addProductionOrder = async (p: ProductionOrder) => {
    setData((prev: any) => ({ ...prev, productionOrders: [...prev.productionOrders, p] }));
    const { error } = await supabase.from('production_orders').insert({
      id: p.id,
      sale_id: p.saleId,
      customer_name: p.customerName,
      customer_phone: p.customerPhone,
      customer_address: p.customerAddress,
      item_name: p.itemName,
      specs: p.specs,
      quantity: p.quantity,
      date: p.date,
      status: p.status
    });
    if (error) {
      console.error('Erro ao salvar ordem de produção:', error);
      addNotification('Erro ao salvar produção: ' + error.message, 'error');
      setData((prev: any) => ({ ...prev, productionOrders: prev.productionOrders.filter((o: ProductionOrder) => o.id !== p.id) }));
    }
  };

  const deleteProductionOrder = async (id: string) => {
    const oldOrder = data.productionOrders.find((o: ProductionOrder) => o.id === id);
    setData((prev: any) => ({ ...prev, productionOrders: prev.productionOrders.filter((o: ProductionOrder) => o.id !== id) }));
    const { error } = await supabase.from('production_orders').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar ordem de produção:', error);
      addNotification('Erro ao deletar produção: ' + error.message, 'error');
      if (oldOrder) {
        setData((prev: any) => ({ ...prev, productionOrders: [...prev.productionOrders, oldOrder] }));
      }
    } else {
      addNotification('Produção deletada com sucesso', 'success');
    }
  };

  const updateProductionOrderStatus = async (id: string, status: ProductionOrder['status']) => {
    const oldOrder = data.productionOrders.find((o: ProductionOrder) => o.id === id);
    setData((prev: any) => {
      let newDeliveries = [...prev.deliveries];
      const order = prev.productionOrders.find((o: ProductionOrder) => o.id === id);

      // --- AUTOMAÇÃO: CRIAR ENTREGA QUANDO CONCLUIR PRODUÇÃO ---
      if (status === 'COMPLETED' && order) {
        // Verifica se já existe entrega para esta OS para evitar duplicidade
        const existingDelivery = prev.deliveries.find((d: Delivery) => d.productionOrderId === id);

        if (!existingDelivery) {
          // Formata as especificações técnicas para que o motorista saiba o que está levando
          const readableSpecs = formatSpecsForDelivery(order.specs);

          // Define endereço com fallback claro
          const deliveryAddress = order.customerAddress && order.customerAddress.length > 5
            ? order.customerAddress
            : 'Retirada na Loja / Endereço não informado';

          // Formata telefone para o link de WhatsApp funcionar (regex do Deliveries.tsx: /\(\d{2}\)\s\d{4,5}-\d{4}/)
          const phoneInfo = order.customerPhone ? `Contato: ${order.customerPhone}` : 'Contato não informado';

          newDeliveries.unshift({
            id: getUUID(),
            customerName: order.customerName,
            address: deliveryAddress,
            date: new Date().toISOString().split('T')[0],
            status: 'PENDING',
            saleId: order.saleId,
            productionOrderId: order.id, // Link com a OS
            // Monta uma nota bem detalhada
            notes: `Item: ${order.itemName}. Detalhes: ${readableSpecs}. ${phoneInfo}.`,
            origin: 'PRODUCTION'
          });
        }
      }
      // --- REMOVER ENTREGA SE VOLTAR STATUS ---
      else if ((status === 'IN_PROGRESS' || status === 'PENDING') && order) {
        // Remove a entrega associada se ela ainda estiver como PENDING
        newDeliveries = newDeliveries.filter(d => {
          // Mantém se não for da OS atual
          if (d.productionOrderId !== id) return true;
          // Se for da OS atual, só remove se estiver como PENDING (se já saiu para entrega, mantém)
          return d.status !== 'PENDING';
        });
      }

      const newOrders = prev.productionOrders.map((o: ProductionOrder) => o.id === id ? { ...o, status } : o);

      return {
        ...prev,
        productionOrders: newOrders,
        deliveries: newDeliveries
      };
    });

    // Persist to Supabase with error handling
    const { error } = await supabase.from('production_orders').update({ status }).eq('id', id);
    if (error) {
      console.error('Erro ao atualizar status da produção:', error);
      addNotification('Erro ao atualizar produção: ' + error.message, 'error');
      // Rollback
      if (oldOrder) {
        setData((prev: any) => ({
          ...prev,
          productionOrders: prev.productionOrders.map((o: ProductionOrder) => o.id === id ? oldOrder : o)
        }));
      }
    } else {
      addNotification('Status da produção atualizado com sucesso', 'success');
    }
  };

  const updateCompanySettings = async (s: CompanySettings) => {
    setData((prev: any) => ({ ...prev, companySettings: s }));

    // Upsert logic for single row settings
    let existing: any = null;
    let fetchError: any = null;
    try {
      const res = await supabase.from('company_settings').select('id').limit(1).single();
      existing = res.data;
      fetchError = res.error;
    } catch (e) {
      // Ignore promise rejection
    }

    const payload = {
      name: s.name,
      cnpj: s.cnpj,
      phone: s.phone,
      address: s.address,
      receipt_message: s.receiptMessage,
      logo: s.logo,
      primary_color: s.primaryColor,
      secondary_color: s.secondaryColor,
      terms_and_conditions: s.termsAndConditions
    };

    if (existing?.id) {
      console.log('Atualizando configuração com ID:', existing.id);
      const { error } = await supabase.from('company_settings').update(payload).eq('id', existing.id);
      if (error) {
        console.error('Erro ao atualizar configuração:', error);
        addNotification('Erro ao salvar configuração: ' + error.message, 'error');
        // Rollback
        setData((prev: any) => ({ ...prev, companySettings: data.companySettings }));
      } else {
        console.log('Configuração atualizada com sucesso');
        addNotification('Configurações salvas com sucesso', 'success');
      }
    } else {
      console.log('Criando nova configuração');
      // Add ID for new config
      const configWithId = { id: getUUID(), ...payload };
      const { error } = await supabase.from('company_settings').insert([configWithId]);
      if (error) {
        console.error('Erro ao criar configuração:', error);
        addNotification('Erro ao salvar configuração: ' + error.message, 'error');
        // Rollback
        setData((prev: any) => ({ ...prev, companySettings: data.companySettings }));
      } else {
        console.log('Configuração criada com sucesso');
        addNotification('Configurações salvas com sucesso', 'success');
      }
    }
  };

  const addCategory = async (c: Category) => {
    setData((prev: any) => ({ ...prev, categories: [...prev.categories, c] }));
    const { error } = await supabase.from('categories').insert({
      id: c.id,
      name: c.name,
      type: c.type,
      group_id: c.groupId,
      is_cmv: c.isCmv
    });

    if (error && error.message.includes('is_cmv')) {
      // Fallback if column doesn't exist yet
      const { error: fallbackError } = await supabase.from('categories').insert({
        id: c.id,
        name: c.name,
        type: c.type,
        group_id: c.groupId
      });
      if (fallbackError) addNotification(`Erro ao salvar categoria: ${fallbackError.message}`, 'error');
      else addNotification('Categoria salva (Aviso: Rode o SQL para habilitar CMV)', 'info');
    } else if (error) {
      console.error('Error adding category:', error);
      addNotification(`Erro ao salvar categoria: ${error.message}`, 'error');
    } else {
      addNotification('Categoria salva com sucesso', 'success');
    }
  };

  const updateCategory = async (c: Category) => {
    const oldCategory = data.categories.find((cat: Category) => cat.id === c.id);
    const oldName = oldCategory ? oldCategory.name : null;
    const nameChanged = oldName && oldName !== c.name;

    setData((prev: any) => {
      const updatedCategories = prev.categories.map((item: Category) => item.id === c.id ? c : item);
      let updatedTransactions = prev.transactions;
      
      if (nameChanged) {
        updatedTransactions = prev.transactions.map((t: Transaction) => 
          t.category === oldName ? { ...t, category: c.name } : t
        );
      }

      return {
        ...prev,
        categories: updatedCategories,
        transactions: updatedTransactions
      };
    });

    const { error } = await supabase.from('categories').update({
      name: c.name,
      type: c.type,
      group_id: c.groupId,
      is_cmv: c.isCmv
    }).eq('id', c.id);

    if (nameChanged) {
      const { error: txError } = await supabase.from('transactions')
        .update({ category: c.name })
        .eq('category', oldName);
        
      if (txError) {
        console.error('Erro ao atualizar categoria nas transações:', txError);
      }
    }

    if (error && error.message.includes('is_cmv')) {
      // Fallback if column doesn't exist yet
      const { error: fallbackError } = await supabase.from('categories').update({
        name: c.name,
        type: c.type,
        group_id: c.groupId
      }).eq('id', c.id);
      if (fallbackError) addNotification(`Erro ao atualizar categoria: ${fallbackError.message}`, 'error');
      else addNotification('Categoria e transações atualizadas (Aviso: Rode o SQL para habilitar CMV)', 'info');
    } else if (error) {
      console.error('Error updating category:', error);
      addNotification(`Erro ao atualizar categoria: ${error.message}`, 'error');
    } else {
      addNotification(nameChanged ? 'Categoria e transações atualizadas com sucesso' : 'Categoria atualizada com sucesso', 'success');
    }
  };

  const addCategoryGroup = async (g: CategoryGroup) => {
    setData((prev: any) => ({ ...prev, categoryGroups: [...prev.categoryGroups, g] }));
    const { error } = await supabase.from('category_groups').insert({
      id: g.id,
      name: g.name,
      description: g.description,
      created_at: g.createdAt
    });
    if (error) {
      console.error('Error adding category group:', error);
      addNotification(`Erro ao salvar grupo: ${error.message}`, 'error');
    } else {
      addNotification('Grupo salvo com sucesso', 'success');
    }
  };

  const updateCategoryGroup = async (g: CategoryGroup) => {
    setData((prev: any) => ({ ...prev, categoryGroups: prev.categoryGroups.map((item: CategoryGroup) => item.id === g.id ? g : item) }));
    const { error } = await supabase.from('category_groups').update({
      name: g.name,
      description: g.description
    }).eq('id', g.id);
    if (error) {
      console.error('Error updating category group:', error);
      addNotification(`Erro ao atualizar grupo: ${error.message}`, 'error');
    } else {
      addNotification('Grupo atualizado com sucesso', 'success');
    }
  };

  const deleteCategoryGroup = async (id: string) => {
    setData((prev: any) => ({
      ...prev,
      categoryGroups: prev.categoryGroups.filter((g: CategoryGroup) => g.id !== id),
      // Set groupId to null for categories in this group
      categories: prev.categories.map((c: Category) => c.groupId === id ? { ...c, groupId: undefined } : c)
    }));
    const { error } = await supabase.from('category_groups').delete().eq('id', id);
    if (error) {
      console.error('Error deleting category group:', error);
      addNotification(`Erro ao deletar grupo: ${error.message}`, 'error');
    } else {
      addNotification('Grupo deletado com sucesso', 'success');
    }
  };

  const deleteCategory = async (id: string) => {
    const oldCategory = data.categories.find((c: Category) => c.id === id);
    setData((prev: any) => ({ ...prev, categories: prev.categories.filter((c: Category) => c.id !== id) }));
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar categoria:', error);
      addNotification('Erro ao deletar categoria: ' + error.message, 'error');
      if (oldCategory) {
        setData((prev: any) => ({ ...prev, categories: [...prev.categories, oldCategory] }));
      }
    } else {
      addNotification('Categoria deletada com sucesso', 'success');
    }
  };

  // User Actions (Profiles)
  // Note: Creating a new user via 'addUser' won't create Auth login, only a profile record (if RLS allows).
  // Ideally users should Sign Up. Here we can only manage existing profiles.

  const addUser = async (u: User) => {
    // Only update local state for visual feedback, but warn about Auth
    setData((prev: any) => ({ ...prev, users: [...prev.users, u] }));
    addNotification('Para criar login real, o usuário deve se cadastrar na tela inicial. Criando apenas registro local...', 'info');

    // Attempt insert into profiles if possible (will fail if ID not in auth.users due to FK)
    // So we skip DB insert here to avoid crash, unless we have a real ID.
  };

  const updateUser = async (u: User) => {
    setData((prev: any) => ({ ...prev, users: prev.users.map((item: User) => item.id === u.id ? u : item) }));

    await supabase.from('profiles').update({
      name: u.name,
      // email is usually managed by Auth, but we can update profile copy
      department: u.department,
      roles: u.roles
    }).eq('id', u.id);
  };

  const deleteUser = async (id: string) => {
    const oldUser = data.users.find((u: User) => u.id === id);
    setData((prev: any) => ({ ...prev, users: prev.users.filter((u: User) => u.id !== id) }));
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar usuário:', error);
      addNotification('Erro ao deletar usuário: ' + error.message, 'error');
      if (oldUser) {
        setData((prev: any) => ({ ...prev, users: [...prev.users, oldUser] }));
      }
    } else {
      addNotification('Usuário deletado com sucesso', 'success');
    }
  };

  const addQuote = async (q: Quote) => {
    setData((prev: any) => ({ ...prev, quotes: [q, ...prev.quotes] })); // Add to top

    // 1. Insert Quote
    const { error } = await supabase.from('quotes').insert({
      id: q.id,
      quote_number: q.quoteNumber,
      client_name: q.clientName,
      client_phone: q.clientPhone,
      discount: q.discount,
      validity_days: q.validityDays,
      observations: q.observations,
      payment_method: q.paymentMethod,
      payment_type: q.paymentType,
      down_payment: q.downPayment,
      remaining_amount: q.remainingAmount,
      remaining_status: q.remainingStatus,
      remaining_payment_method: q.remainingPaymentMethod,
      subtotal: q.subtotal,
      total: q.total,
      date: q.date
    });

    if (error) {
      console.error('Error adding quote:', error);
      addNotification('Erro ao salvar orçamento', 'error');
    } else {
      // 2. Insert Items
      const items = q.items.map(i => ({
        id: i.id,
        quote_id: q.id,
        product_id: i.productId,
        product_name: i.productName,
        product_sku: i.productSku,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total: i.total,
        service_type: i.serviceType,
        service_specs: i.serviceSpecs,
        image: i.image,
        category: i.category,
        description: i.description
      }));
      const { error: itemsError } = await supabase.from('quote_items').insert(items);

      if (itemsError) {
        console.error('Error adding quote items:', itemsError);
        addNotification('Orçamento salvo, mas houve erro nos itens', 'info');
      } else {
        addNotification('Orçamento salvo com sucesso', 'success');
      }
      return true;
    }
    return false;
  };

  const updateQuote = async (q: Quote) => {
    setData((prev: any) => ({ ...prev, quotes: prev.quotes.map((item: Quote) => item.id === q.id ? q : item) }));

    const { error } = await supabase.from('quotes').update({
      client_name: q.clientName,
      client_phone: q.clientPhone,
      discount: q.discount,
      validity_days: q.validityDays,
      observations: q.observations,
      payment_method: q.paymentMethod,
      payment_type: q.paymentType,
      down_payment: q.downPayment,
      remaining_amount: q.remainingAmount,
      remaining_status: q.remainingStatus,
      remaining_payment_method: q.remainingPaymentMethod,
      subtotal: q.subtotal,
      total: q.total,
      date: q.date
    }).eq('id', q.id);

    if (error) {
      addNotification('Erro ao atualizar orçamento', 'error');
    } else {
      // Replace items: Delete all and re-insert
      await supabase.from('quote_items').delete().eq('quote_id', q.id);

      const items = q.items.map(i => ({
        id: i.id,
        quote_id: q.id,
        product_id: i.productId,
        product_name: i.productName,
        product_sku: i.productSku,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total: i.total,
        service_type: i.serviceType,
        service_specs: i.serviceSpecs,
        image: i.image,
        category: i.category,
        description: i.description
      }));
      await supabase.from('quote_items').insert(items);
      addNotification('Orçamento atualizado', 'success');
      return true;
    }
    return false;
  };

  const deleteQuote = async (id: string) => {
    setData((prev: any) => ({ ...prev, quotes: prev.quotes.filter((q: Quote) => q.id !== id) }));
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) addNotification('Erro ao remover orçamento', 'error');
    else addNotification('Orçamento removido', 'info');
  };

  const addOrder = async (o: Order) => {
    setData((prev: any) => ({ ...prev, orders: [o, ...prev.orders] }));
    const { error } = await supabase.from('orders').insert({
      id: o.id,
      sale_id: o.saleId,
      product_id: o.productId,
      customer_name: o.customerName,
      product_name: o.productName,
      quantity: o.quantity,
      date: o.date,
      status: o.status,
      notes: o.notes
    });
    if (error) {
      console.error('Erro ao salvar encomenda:', error);
      addNotification('Erro ao salvar encomenda: ' + error.message, 'error');
      // Rollback
      setData((prev: any) => ({ ...prev, orders: prev.orders.filter((item: Order) => item.id !== o.id) }));
    } else {
      addNotification('Encomenda salva com sucesso', 'success');
    }
  };

  const updateOrder = async (o: Order) => {
    const oldOrder = data.orders.find(item => item.id === o.id);

    // Reposição de estoque quando marcar como RECEBIDO
    if (oldOrder && oldOrder.status !== 'RECEIVED' && o.status === 'RECEIVED') {

      // NEW LOGIC: Only add to stock if it is NOT linked to a Sale
      if (!o.saleId) {
        const product = data.products.find(p => p.id === o.productId);
        if (product) {
          await updateProduct({
            ...product,
            quantity: product.quantity + o.quantity
          });
          addNotification(`Estoque de ${o.productName} reposto (+${o.quantity})`, 'success');
        }
      } else {
        // It's for a sale, so we just mark as received but don't add to general stock
        // Instead, we might want to notify that it's ready for delivery
        addNotification(`Encomenda da Venda recebida. Pronto para entrega/retirada.`, 'info');
      }

      // AUTO-DELIVERY: Create delivery record Se for VENDA e entrega for requerida
      if (o.saleId) {
        const sale = data.sales.find((s: Sale) => s.id === o.saleId);
        if (sale && sale.deliveryType === 'DELIVERY') {
          const saleOrders = data.orders.filter((ord: Order) => ord.saleId === o.saleId);
          // allReceived verifica se TODOS os itens da venda (incluindo o que está sendo atualizado AGORA) estão RECEIVED
          const allReceived = saleOrders.every((ord: Order) => ord.id === o.id ? true : ord.status === 'RECEIVED');

          if (allReceived) {
            const existingDelivery = data.deliveries.find((d: Delivery) => d.saleId === o.saleId && d.origin === 'SALES');

            if (!existingDelivery) {
              const notes = saleOrders.map((ord: Order) => {
                const qty = ord.id === o.id ? o.quantity : ord.quantity;
                const name = ord.id === o.id ? o.productName : ord.productName;
                return `Item: ${name} (Qtd: ${qty})`;
              }).join('\\n');

              const delivery: Delivery = {
                id: getUUID(),
                customerName: o.customerName || sale.customerName,
                address: sale.customerAddress || 'Endereço não informado',
                date: new Date().toISOString().split('T')[0],
                status: 'PENDING',
                saleId: o.saleId,
                notes: notes,
                origin: 'SALES'
              };
              await addDelivery(delivery);
              addNotification('Todos os itens chegaram! Entrega única gerada para envio.', 'success');
            }
          } else {
             addNotification('Item recebido. Faltam outros itens do pedido chegarem para liberar a entrega.', 'info');
          }
        }
      }
    }
    // Reverter estoque se desmarcar como RECEBIDO (opcional, mas evita erros)
    else if (oldOrder && oldOrder.status === 'RECEIVED' && o.status !== 'RECEIVED') {
      // Only reduce if we added it (i.e. no saleId)
      if (!o.saleId) {
        const product = data.products.find(p => p.id === o.productId);
        if (product) {
          await updateProduct({ ...product, quantity: product.quantity - o.quantity });
          addNotification(`Estoque de ${o.productName} estornado (-${o.quantity})`, 'info');
        }
      }
    }

    setData((prev: any) => ({ ...prev, orders: prev.orders.map((item: Order) => item.id === o.id ? o : item) }));
    const { error } = await supabase.from('orders').update({
      status: o.status,
      notes: o.notes
    }).eq('id', o.id);
    if (error) {
      console.error('Erro ao atualizar encomenda:', error);
      addNotification('Erro ao atualizar encomenda: ' + error.message, 'error');
      // Rollback
      if (oldOrder) {
        setData((prev: any) => ({ ...prev, orders: prev.orders.map((item: Order) => item.id === o.id ? oldOrder : item) }));
      }
    } else {
      addNotification('Encomenda atualizada com sucesso', 'success');
    }
  };

  const deleteOrder = async (id: string) => {
    const oldOrder = data.orders.find((o: Order) => o.id === id);
    setData((prev: any) => ({ ...prev, orders: prev.orders.filter((o: Order) => o.id !== id) }));
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar encomenda:', error);
      addNotification('Erro ao deletar encomenda: ' + error.message, 'error');
      if (oldOrder) {
        setData((prev: any) => ({ ...prev, orders: [...prev.orders, oldOrder] }));
      }
    } else {
      addNotification('Encomenda deletada com sucesso', 'success');
    }
  };

  const addCardFee = async (f: CardFee) => {
    setData((prev: any) => ({ ...prev, cardFees: [...prev.cardFees, f] }));
    const { error } = await supabase.from('card_fees').insert({
      id: f.id,
      installments: f.installments,
      percentage: f.percentage
    });
    if (error) {
      addNotification('Erro ao salvar taxa', 'error');
      return false;
    }
    return true;
  };

  const updateCardFee = async (f: CardFee) => {
    setData((prev: any) => ({ ...prev, cardFees: prev.cardFees.map((item: CardFee) => item.id === f.id ? f : item) }));
    const { error } = await supabase.from('card_fees').update({
      installments: f.installments,
      percentage: f.percentage
    }).eq('id', f.id);
    if (error) {
      addNotification('Erro ao atualizar taxa', 'error');
      return false;
    }
    return true;
  };

  const deleteCardFee = async (id: string) => {
    setData((prev: any) => ({ ...prev, cardFees: prev.cardFees.filter((f: CardFee) => f.id !== id) }));
    const { error } = await supabase.from('card_fees').delete().eq('id', id);
    if (error) {
      addNotification('Erro ao remover taxa', 'error');
      return false;
    }
    return true;
  };

  const importData = async (module: string, data: any[]) => {
    // 1. Optimistic Update (Immediate UI Feedback)
    setData((prev: any) => ({
      ...prev,
      // Map 'payables'/'receivables/transactions' to 'transactions' in store
      [module === 'payables' || module === 'receivables' ? 'transactions' : module]: [
        ...data,
        ...prev[module === 'payables' || module === 'receivables' ? 'transactions' : module]
      ]
    }));

    // 2. Prepare Data for Supabase (Map keys to snake_case)
    let tableName = '';
    let dbData: any[] = [];

    try {
      if (module === 'products') {
        tableName = 'products';
        dbData = data.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          cost: i.cost,
          quantity: i.quantity,
          min_stock: i.minStock,
          sku: i.sku,
          category: i.category
        }));
      } else if (module === 'customers') {
        tableName = 'customers';
        dbData = data.map(i => ({
          id: i.id,
          name: i.name,
          cpf_cnpj: i.cpfCnpj,
          phone: i.phone,
          email: i.email,
          address: i.address
          // notes excluded for now as it's not in standard import
        }));
      } else if (module === 'suppliers') {
        tableName = 'suppliers';
        dbData = data.map(i => ({
          id: i.id,
          name: i.name,
          company_name: i.companyName,
          cpf_cnpj: i.cpfCnpj,
          contact: i.contact,
          address: i.address,
          category: i.category
        }));
      } else if (module === 'transactions' || module === 'payables' || module === 'receivables') {
        tableName = 'transactions';
        dbData = data.map(i => ({
          id: i.id,
          description: i.description,
          amount: i.amount,
          type: i.type,
          category: i.category,
          date: i.date,
          due_date: i.dueDate,
          status: i.status || 'PENDING',
          account_type: i.accountType || 'VARIABLE'
        }));
      } else if (module === 'sales') {
        tableName = 'sales';
        dbData = data.map(i => ({
          id: i.id,
          customer_name: i.customerName,
          total: i.total,
          date: i.date,
          status: 'COMPLETED',
          payment_method: i.paymentMethod || 'CASH',
          payment_type: 'FULL',
          delivery_type: 'PICKUP'
        }));
      }

      if (tableName && dbData.length > 0) {
        console.log(`IMPORT: Saving ${dbData.length} rows to ${tableName}...`);
        const { error } = await supabase.from(tableName).insert(dbData);

        if (error) {
          console.error('IMPORT ERROR:', error);
          addNotification(`Erro ao salvar no banco: ${error.message}`, 'error');
          // Optional: Revert local state here if strict consistency is needed
        } else {
          addNotification('Dados salvos no banco com sucesso!', 'success');
        }
      }
    } catch (err: any) {
      console.error('CRITICAL IMPORT ERROR:', err);
      addNotification('Falha crítica na importação.', 'error');
    }
  };

  const addSimulations = async (sims: any[]) => {
    const formatted = sims.map(s => ({
      id: s.id || getUUID(),
      description: s.description,
      amount: Number(s.amount),
      due_date: s.dueDate.split('T')[0],
      group_id: s.groupId
    }));

    setSimulations(prev => [...prev, ...formatted.map(f => ({
      id: f.id, description: f.description, amount: f.amount, dueDate: f.due_date, groupId: f.group_id
    }))]);

    const { error } = await supabase.from('simulations').insert(formatted);
    if (error) {
      console.error('Error saving simulations:', error);
      addNotification(`Erro no Banco: ${error.message}${error.hint ? ' - ' + error.hint : ''}`, 'error');
    } else {
      addNotification('Projeção salva com sucesso!', 'success');
    }
  };

  const deleteSimulationGroup = async (groupId: string) => {
    setSimulations(prev => prev.filter(s => s.groupId !== groupId));
    const { error } = await supabase.from('simulations').delete().eq('group_id', groupId);
    if (error) {
      console.error('Error deleting simulation group:', error);
      addNotification('Erro ao remover projeção.', 'error');
    }
  };

  const clearSimulations = async () => {
    setSimulations([]);
    const { error } = await supabase.from('simulations').delete().neq('id', '0'); // Delete all
    if (error) {
      console.error('Error clearing simulations:', error);
      addNotification('Erro ao limpar projeções.', 'error');
    } else {
      addNotification('Todas as simulações foram limpas.', 'success');
    }
  };

  return (
    <AppContext.Provider value={{
      currentView,
      navigateTo,
      darkMode,
      toggleDarkMode,
      transactions: data.transactions,
      products: data.products,
      suppliers: data.suppliers,
      customers: data.customers,
      sales: data.sales,
      deliveries: data.deliveries,
      users: data.users,
      productionOrders: data.productionOrders,
      quotes: data.quotes,
      orders: data.orders,
      stockMovements: data.stockMovements,
      companySettings: data.companySettings,
      categories: data.categories,
      categoryGroups: data.categoryGroups,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      splitTransactionPayment,
      addProduct,
      updateProduct,
      deleteProduct,
      addSale,
      updateSale,
      deleteSale,
      addOrder,
      updateOrder,
      deleteOrder,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addDelivery,
      updateDeliveryStatus,
      updateDelivery,
      deleteDelivery,
      addProductionOrder,
      updateProductionOrderStatus,
      deleteProductionOrder,
      updateCompanySettings,
      addCategory,
      updateCategory,
      deleteCategory,
      addCategoryGroup,
      updateCategoryGroup,
      deleteCategoryGroup,
      addUser,
      updateUser,
      deleteUser,
      addQuote,
      updateQuote,
      deleteQuote,
      addStockMovement,
      registerStockEntry,
      importData,
      notifications,
      addNotification,
      removeNotification,
      isLoading,
      isInitialized,
      editingSaleId,
      setEditingSaleId,
      cardFees: data.cardFees,
      addCardFee,
      updateCardFee,
      deleteCardFee,
      pendingSale,
      setPendingSale,
      simulations,
      addSimulations,
      deleteSimulationGroup,
      clearSimulations,
      refreshData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
