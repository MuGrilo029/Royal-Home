# 🔓 RLS Policies para Estoque - Corrigir Delete

## ⚠️ Problema
Não consegue apagar produtos do estoque porque as **RLS Policies** estão bloqueando DELETE na tabela `products`.

---

## ✅ SOLUÇÃO: Execute este SQL no Supabase

### Tabela: `products`

```sql
-- Remover policies antigas
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;

-- Permitir SELECT para todos autenticados
CREATE POLICY "products_select"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir INSERT para todos autenticados (ou apenas ADMIN/ESTOQUE)
CREATE POLICY "products_insert"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir UPDATE para todos autenticados
CREATE POLICY "products_update"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ⭐ CRITICAL: Permitir DELETE
CREATE POLICY "products_delete"
  ON products
  FOR DELETE
  TO authenticated
  USING (true);
```

### Tabela: `stock_movements`

```sql
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
```

### Tabelas: `suppliers`, `customers`

```sql
-- SUPPLIERS
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

-- CUSTOMERS
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
```

---

## 🧪 Teste Imediato

1. **Abra o Supabase Dashboard**
2. **SQL Editor** → **New Query**
3. Cole o SQL acima (comece com `products`)
4. Clique em **Run**
5. Volte para o app e tente **deletar um produto**
6. Deve aparecer: ✅ *"Produto deletado com sucesso"*

---

## 🔍 Se Não Funcionar

Abra DevTools (F12) → Console e execute:

```javascript
// Teste DELETE manualmente
const { error } = await supabase
  .from('products')
  .delete()
  .eq('id', 'algum-id-de-teste');

console.log('Erro ao deletar:', error);
```

Se tiver erro de permissão, significa que RLS ainda está bloqueando.

---

## 🔐 Versão com Permissões (Produção)

Se quer apenas usuarios com permissão `ESTOQUE`:

```sql
CREATE POLICY "products_delete_estoque"
  ON products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()
      AND (
        profiles.roles::jsonb @> '"ADMIN"'::jsonb
        OR profiles.roles::jsonb @> '"ESTOQUE"'::jsonb
      )
    )
  );
```

---

## 📝 Sobre o GitHub

**Você faz o commit**, não eu. As mudanças foram feitas localmente no seu arquivo `store.tsx`. Você precisa:

```bash
# Terminal/PowerShell
git add store.tsx
git commit -m "Fix: melhorar tratamento de erro em deleteProduct"
git push origin main
```

Ou use a UI do VS Code:
1. Clique em **Source Control** (Ctrl+Shift+G)
2. Veja `store.tsx` como modificado
3. Clique em **+** para staged
4. Escreva mensagem: `Fix: melhorar tratamento de erro em deleteProduct`
5. Clique em **✓ Commit**
6. Clique em **⬆ Push**
