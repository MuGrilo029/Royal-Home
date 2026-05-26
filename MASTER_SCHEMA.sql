-- ============================================================
-- MASTER SCHEMA - ROYAL HOME (GESTÃO PRO)
-- ============================================================
-- Este arquivo consolida todas as tabelas, políticas (RLS), 
-- e configurações necessárias para o funcionamento do sistema.
-- ============================================================

-- 1. PERFIS DE USUÁRIO
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  name TEXT,
  email TEXT,
  department TEXT,
  roles TEXT[] DEFAULT '{ADMIN}'
);

CREATE TABLE IF NOT EXISTS category_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CATEGORIAS
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- PRODUCT, EXPENSE, INCOME, SUPPLIER, USER
  group_id UUID REFERENCES category_groups(id) ON DELETE SET NULL,
  is_cmv BOOLEAN DEFAULT FALSE
);

-- 3. CONFIGURAÇÕES DA EMPRESA
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  cnpj TEXT,
  phone TEXT,
  address TEXT,
  receipt_message TEXT,
  logo TEXT,
  primary_color TEXT DEFAULT '#1a1a1a',
  secondary_color TEXT DEFAULT '#E5E7EB',
  terms_and_conditions TEXT,
  order_issuance_config TEXT DEFAULT 'SIMPLE'
);

-- 4. CLIENTES
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. FORNECEDORES
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  cpf_cnpj TEXT,
  contact TEXT,
  address TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PRODUTOS
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  sku TEXT,
  category TEXT,
  image TEXT,
  description TEXT,
  entry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. VENDAS
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  delivery_type TEXT, -- PICKUP, DELIVERY
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  payment_method TEXT,
  payment_type TEXT, -- FULL, PARTIAL
  down_payment NUMERIC DEFAULT 0,
  down_payment_method TEXT,
  remaining_amount NUMERIC DEFAULT 0,
  remaining_payment_method TEXT,
  remaining_status TEXT DEFAULT 'PENDING',
  status TEXT DEFAULT 'COMPLETED', -- COMPLETED, PENDING
  observations TEXT,
  delivery_date TIMESTAMP WITH TIME ZONE,
  card_fee_amount NUMERIC DEFAULT 0,
  card_fee_percentage NUMERIC DEFAULT 0,
  card_installments INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. ITENS DA VENDA
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  service_type TEXT,
  service_specs TEXT, -- JSON FurnitureSpecs
  color TEXT,
  by_order BOOLEAN DEFAULT FALSE
);

-- 9. TRANSAÇÕES FINANCEIRAS
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL, -- INCOME, EXPENSE
  category TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'PENDING', -- PENDING, PAID, LATE
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  has_boleto BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,
  account_type TEXT DEFAULT 'VARIABLE', -- FIXED, VARIABLE
  installments_total INTEGER DEFAULT 1,
  current_installment INTEGER DEFAULT 1,
  paid_amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9.1. HISTÓRICO DE PAGAMENTOS
CREATE TABLE IF NOT EXISTS transaction_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. MOVIMENTAÇÕES DE ESTOQUE (LOG)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT,
  quantity INTEGER NOT NULL,
  type TEXT NOT NULL, -- SALE, PURCHASE, ADJUSTMENT, RETURN
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  observations TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. ORDENS DE PRODUÇÃO
CREATE TABLE IF NOT EXISTS production_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  item_name TEXT,
  specs TEXT, -- JSON FurnitureSpecs
  quantity INTEGER DEFAULT 1,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. ENTREGAS
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT,
  address TEXT,
  date DATE,
  scheduled_time TEXT,
  status TEXT DEFAULT 'PENDING', -- PENDING, IN_ROUTE, DELIVERED, CANCELED
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  production_order_id UUID REFERENCES production_orders(id) ON DELETE CASCADE,
  notes TEXT,
  origin TEXT, -- SALES, PRODUCTION
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. ORÇAMENTOS
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  discount NUMERIC DEFAULT 0,
  validity_days INTEGER DEFAULT 15,
  observations TEXT,
  payment_method TEXT,
  payment_type TEXT,
  down_payment NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  remaining_status TEXT DEFAULT 'PENDING',
  remaining_payment_method TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. ITENS DO ORÇAMENTO
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  service_type TEXT,
  service_specs TEXT,
  image TEXT,
  description TEXT
);

-- 15. PEDIDOS (COMPRA/FORNECEDOR)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  customer_name TEXT,
  product_name TEXT,
  quantity INTEGER DEFAULT 0,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'PENDING', -- PENDING, ORDERED, RECEIVED, CANCELLED
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. TAXAS DE CARTÃO
CREATE TABLE IF NOT EXISTS card_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  installments INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. SIMULAÇÕES FINANCEIRAS
CREATE TABLE IF NOT EXISTS simulations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  group_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- RLS (ROW LEVEL SECURITY)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;

-- 0. FUNÇÃO AUXILIAR DE SEGURANÇA (Evita Recursão Infinita no RLS)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND roles @> '{ADMIN}'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. PROFILES: Cada usuário vê o seu próprio, admins vêm todos.
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- 2. Configurações da Empresa: Todos logados lêem, apenas Admins editam.
DROP POLICY IF EXISTS "Authenticated can view settings" ON company_settings;
CREATE POLICY "Authenticated can view settings" ON company_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can update settings" ON company_settings;
CREATE POLICY "Admins can update settings" ON company_settings
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- 3. Tabelas de Operação (Vendas, Produtos, Clientes, etc): 
-- Todos logados podem Ler, Inserir e Atualizar. 
-- Apenas Admins podem Excluir.

DO $$ 
DECLARE 
  t text;
  tables text[] := ARRAY[
    'categories', 'category_groups', 'customers', 'suppliers', 'products', 
    'sales', 'sale_items', 'transactions', 'transaction_payments', 
    'production_orders', 'deliveries', 'quotes', 'quote_items', 
    'stock_movements', 'orders', 'card_fees', 'simulations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop old policies if exist
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated read" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated insert" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated update" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins delete" ON %I', t);
    
    -- Read access for all authenticated
    EXECUTE format('CREATE POLICY "Authenticated read" ON %I FOR SELECT TO authenticated USING (true)', t);
    
    -- Insert access for all authenticated
    EXECUTE format('CREATE POLICY "Authenticated insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)', t);
    
    -- Update access for all authenticated
    EXECUTE format('CREATE POLICY "Authenticated update" ON %I FOR UPDATE TO authenticated USING (true)', t);
    
    -- Delete access ONLY FOR ADMINS
    EXECUTE format('CREATE POLICY "Admins delete" ON %I FOR DELETE TO authenticated USING (public.is_admin(auth.uid()))', t);
  END LOOP;
END $$;

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

-- 1. Optimize Sales by Date and Status
CREATE INDEX IF NOT EXISTS idx_sales_date_status ON sales (date, status);

-- 2. Optimize Transactions by Date and Status
CREATE INDEX IF NOT EXISTS idx_transactions_date_status ON transactions (date, status);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON transactions (due_date);

-- 3. Optimize Sale Items for CMV calculations
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items (product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id);

-- 4. Optimize Customers and Suppliers for quick lookups
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (name);

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, roles)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', '{ADMIN}')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- STORAGE SETUP
-- ============================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND auth.role() = 'authenticated');
