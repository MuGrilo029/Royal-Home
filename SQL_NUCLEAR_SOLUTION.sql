-- ⭐ SOLUÇÃO NUCLEAR: REMOVE TUDO E RECRIA DO ZERO ⭐
-- Execute linha por linha ou tudo de uma vez

-- ============================================
-- 1. DESABILITAR RLS NAS TABELAS (OPÇÃO FÁCIL)
-- ============================================
-- Vá para Supabase Dashboard e execute manualmente:
-- Para cada tabela (products, stock_movements, suppliers, customers):
-- 1. Clique na tabela
-- 2. Clique em "Info" (ícone de informação)
-- 3. Clique em "Disable RLS"

-- OU execute este SQL para desabilitar via código:
-- ALTER TABLE products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. OU: RECRIA POLICIES SEM RESTRIÇÕES (SE QUER RLS)
-- ============================================

-- Limpar policies antigas
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;
DROP POLICY IF EXISTS "products_select_public" ON products;
DROP POLICY IF EXISTS "products_insert_public" ON products;
DROP POLICY IF EXISTS "products_update_public" ON products;
DROP POLICY IF EXISTS "products_delete_public" ON products;

-- Recrear simples - permite TUDO para autenticado
CREATE POLICY "allow_select" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_insert" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_update" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete" ON products FOR DELETE TO authenticated USING (true);

-- Para stock_movements
DROP POLICY IF EXISTS "stock_movements_select" ON stock_movements;
DROP POLICY IF EXISTS "stock_movements_insert" ON stock_movements;
DROP POLICY IF EXISTS "stock_movements_delete" ON stock_movements;

CREATE POLICY "allow_select" ON stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_insert" ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_delete" ON stock_movements FOR DELETE TO authenticated USING (true);

-- Para suppliers
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
DROP POLICY IF EXISTS "suppliers_delete" ON suppliers;

CREATE POLICY "allow_select" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_insert" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_update" ON suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete" ON suppliers FOR DELETE TO authenticated USING (true);

-- Para customers
DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;

CREATE POLICY "allow_select" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_insert" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_update" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete" ON customers FOR DELETE TO authenticated USING (true);

-- ============================================
-- 3. VERIFICAR SE FUNCIONOU
-- ============================================
-- Execute isso para ver as policies criadas:
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('products', 'stock_movements', 'suppliers', 'customers')
ORDER BY tablename, policyname;
