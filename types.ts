

export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionStatus = 'PENDING' | 'PAID' | 'LATE';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // ISO Date
  dueDate: string; // ISO Date
  status: TransactionStatus;
  supplierId?: string;
  attachmentUrl?: string;
  hasBoleto?: boolean;
  accountType?: 'FIXED' | 'VARIABLE';
  installmentsTotal?: number;
  currentInstallment?: number;
  saleId?: string;
  paymentMethod?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  minStock: number;
  sku: string;
  category?: string;
  image?: string;
  description?: string;
  entryDate?: string;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId?: string;
  productName: string;
  productSku: string;
  category?: string;
  image?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  // Service Fields
  serviceType?: 'INTERNAL' | 'OUTSOURCED';
  serviceSpecs?: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientPhone?: string;
  discount: number;
  validityDays: number;
  observations?: string;
  // Payment Conditions (Replicating Sale logic)
  paymentMethod: string;
  paymentType: 'FULL' | 'PARTIAL';
  downPayment?: number;
  remainingAmount?: number;
  remainingStatus?: 'PAID' | 'PENDING';
  remainingPaymentMethod?: string;

  subtotal: number;
  total: number;
  date: string;
  items: QuoteItem[];
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  cpfCnpj: string;
  contact: string;
  address: string;
  category?: string; // Nova categoria de fornecedor
}

export interface Customer {
  id: string;
  name: string;
  cpfCnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

// Interface detalhada para OS de Estofados
// Interface detalhada para OS de Estofados
export interface FurnitureSpecs {
  model?: string;
  foam?: string[]; // Soft, Selada
  arm?: {
    types?: string[]; // 10cm, 15cm, 20cm, Reto, Pastel
    berola?: { has: boolean; size?: string };
  };
  modules?: string[]; // 1, 2, 3
  seatsCount?: string[]; // 1, 2, 3
  seatConfig?: {
    types?: string[]; // Plw. Quadrado, Plw. Pastel, Barcelna, Quadrado
    ponto?: boolean;
    berola?: { has: boolean; size?: string };
  };
  backrestConfig?: {
    types?: string[]; // Bipartido, Pastel, Fixo, Solta
    ponto?: boolean;
    berola?: { has: boolean; size?: string };
  };
  visualReference?: string; // Base64 or URL
  observations?: string;
}

export interface SaleItem {
  id?: string; // Database ID for the item record
  productId?: string;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  category?: string;
  // Campos para Serviços
  serviceType?: 'INTERNAL' | 'OUTSOURCED';
  serviceSpecs?: string; // Pode conter JSON string do FurnitureSpecs
  color?: string;
  byOrder?: boolean; // Novo campo para baixa de estoque
}

export interface Sale {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryType: 'PICKUP' | 'DELIVERY';
  date: string;
  items: SaleItem[];
  total: number;
  discount: number;

  // Lógica de Pagamento
  paymentMethod: string; // Geral (usado se FULL)
  downPaymentMethod?: string; // Método da Entrada (PIX, etc)
  remainingPaymentMethod?: string; // Método do Restante (Cartão, etc)
  paymentType: 'FULL' | 'PARTIAL';
  downPayment?: number;
  remainingAmount?: number;
  remainingStatus?: 'PAID' | 'PENDING'; // Status do valor restante (Pago na hora vs A Receber)

  status: 'COMPLETED' | 'PENDING';
  observations?: string; // Observações gerais do pedido
  deliveryDate?: string; // ISO Date to match transactions

  // Card Fee Tracking
  cardFeeAmount?: number;
  cardFeePercentage?: number;
  cardInstallments?: number;
}

export interface Order {
  id: string;
  saleId?: string;
  productId?: string;
  customerName: string;
  productName: string;
  quantity: number;
  date: string;
  status: 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  notes?: string;
}

export interface ProductionOrder {
  id: string;
  saleId?: string;
  customerName: string;
  // Novos campos para integração com Entrega
  customerPhone?: string;
  customerAddress?: string;

  itemName: string;
  specs: string; // Pode conter JSON string do FurnitureSpecs
  quantity: number;
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface Delivery {
  id: string;
  customerName: string;
  address: string;
  date: string; // Data prevista
  scheduledTime?: string; // Nova hora agendada
  status: 'PENDING' | 'IN_ROUTE' | 'DELIVERED' | 'CANCELED';
  saleId?: string;
  productionOrderId?: string; // ID da OS que gerou esta entrega
  notes?: string;
  origin?: 'SALES' | 'PRODUCTION';
}

export type UserRole = 'ADMIN' | AppView;

export interface User {
  id: string;
  name: string;
  roles: UserRole[]; // Changed to array for multiple roles
  department?: string; // Novo departamento (categoria de usuário)
  email: string;
}

export interface CompanySettings {
  name: string;
  cnpj: string;
  phone: string;
  address: string;
  receiptMessage: string;
  // Customization
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  termsAndConditions?: string;
  orderIssuanceConfig?: 'SIMPLE' | 'DETAILED' | 'WARRANTY'; // Configuração de emissão de pedido
}

export type CategoryType = 'PRODUCT' | 'EXPENSE' | 'INCOME' | 'SUPPLIER' | 'USER';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  groupId?: string; // Reference to CategoryGroup
  isCmv?: boolean;
}

export interface CategoryGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export type AppView =
  | 'DASHBOARD'
  | 'PAYABLES'
  | 'RECEIVABLES'
  | 'SALES'
  | 'SALES_HISTORY'
  | 'INVENTORY'
  | 'SUPPLIERS'
  | 'CUSTOMERS'
  | 'BOLETOS'
  | 'DELIVERIES'
  | 'PRODUCTION'
  | 'ORDERS'
  | 'REPORTS'
  | 'SETTINGS'
  | 'IMPORT_EXPORT'
  | 'QUOTES'
  | 'STOCK_LOGS';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  quantity: number; // Positive for entry, negative for exit
  type: 'SALE' | 'ADJUSTMENT' | 'PURCHASE' | 'RETURN';
  date: string;
  observations?: string;
  userId?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface CardFee {
  id: string;
  installments: number; // 0 for debit, 1 for credit current, 2+ for installments
  percentage: number;
}
