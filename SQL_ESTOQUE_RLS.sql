-- ⭐ COPIE E COLE APENAS O SQL ABAIXO NO SUPABASE ⭐

-- Tabela: PRODUCTS
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;

CREATE POLICY "products_select"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products_insert"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "products_update"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "products_delete"
  ON products
  FOR DELETE
  TO authenticated
  USING (true);

-- Tabela: STOCK_MOVEMENTS
DROP POLICY IF EXISTS "stock_movements_select" ON stock_movements;
DROP POLICY IF EXISTS "stock_movements_insert" ON stock_movements;
DROP POLICY IF EXISTS "stock_movements_delete" ON stock_movements;

CREATE POLICY "stock_movements_select"
  ON stock_movements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "stock_movements_insert"
  ON stock_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "stock_movements_delete"
  ON stock_movements
  FOR DELETE
  TO authenticated
  USING (true);

-- Tabela: SUPPLIERS
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
DROP POLICY IF EXISTS "suppliers_delete" ON suppliers;

CREATE POLICY "suppliers_select"
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "suppliers_insert"
  ON suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "suppliers_update"
  ON suppliers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "suppliers_delete"
  ON suppliers
  FOR DELETE
  TO authenticated
  USING (true);

-- Tabela: CUSTOMERS
DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;

CREATE POLICY "customers_select"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "customers_insert"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "customers_update"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "customers_delete"
  ON customers
  FOR DELETE
  TO authenticated
  USING (true);
