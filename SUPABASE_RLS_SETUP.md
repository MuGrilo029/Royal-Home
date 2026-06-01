# Configuração de RLS Policies - Supabase

## ⚠️ PROBLEMA IDENTIFICADO
Dados não estão sendo salvos/deletados no Supabase porque as **RLS (Row Level Security) Policies** podem estar bloqueando operações.

---

## 🔓 Solução Rápida (Desenvolvimento)

Se está em **DESENVOLVIMENTO**, desative RLS temporariamente:

1. Vá para **Supabase Dashboard** → seu projeto
2. Clique em **Authentication** → **Policies** (ou vá em **SQL Editor**)
3. Para cada tabela que não funciona, desative RLS:
   - `company_settings` ❌ → Desativar RLS
   - `deliveries` ❌ → Desativar RLS
   - `production_orders` ❌ → Desativar RLS
   - `orders` ❌ → Desativar RLS
   - `categories` ❌ → Desativar RLS

### Teste agora:
1. Tente editar/salvar um item em Settings
2. Abra DevTools (F12) e observe os logs
3. Recarregue a página

---

## 🔒 Solução Correta (Produção)

Para PRODUÇÃO com RLS habilitado, crie essas policies:

### 1. Tabela: `company_settings`

```sql
-- Policy: Allow authenticated users to select
CREATE POLICY "company_settings_select"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to update
CREATE POLICY "company_settings_update"
  ON company_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert
CREATE POLICY "company_settings_insert"
  ON company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

### 2. Tabela: `deliveries`

```sql
CREATE POLICY "deliveries_select"
  ON deliveries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "deliveries_insert"
  ON deliveries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "deliveries_update"
  ON deliveries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "deliveries_delete"
  ON deliveries
  FOR DELETE
  TO authenticated
  USING (true);
```

### 3. Tabela: `production_orders`

```sql
CREATE POLICY "production_orders_select"
  ON production_orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "production_orders_insert"
  ON production_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "production_orders_update"
  ON production_orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "production_orders_delete"
  ON production_orders
  FOR DELETE
  TO authenticated
  USING (true);
```

### 4. Tabela: `orders`

```sql
CREATE POLICY "orders_select"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "orders_insert"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "orders_update"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "orders_delete"
  ON orders
  FOR DELETE
  TO authenticated
  USING (true);
```

### 5. Tabela: `categories`

```sql
CREATE POLICY "categories_select"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "categories_insert"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "categories_update"
  ON categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "categories_delete"
  ON categories
  FOR DELETE
  TO authenticated
  USING (true);
```

---

## 📋 Como Aplicar as Policies

### Opção 1: Via Supabase Dashboard (GUI)
1. Vá para **Supabase Dashboard**
2. Clique em **SQL Editor**
3. Clique em **New Query**
4. Cole o SQL acima para cada tabela
5. Clique em **Run**

### Opção 2: Via SQL Editor Direto
1. Clique em **SQL Editor**
2. Clique em **New Query**
3. Cole todas as policies de uma tabela
4. Execute

---

## 🔍 Verificar Status das Policies

Para ver quais policies existem:

```sql
SELECT * FROM pg_policies;
```

Para listar policies de uma tabela específica:

```sql
SELECT schemaname, tablename, policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'company_settings';
```

---

## 🧪 Testar Após Configurar

1. **Tente salvar configurações:**
   - Vá para Settings → Aba Geral
   - Edite um campo (ex: Nome da Empresa)
   - Clique em Salvar
   - Deve aparecer notificação de sucesso

2. **Tente deletar um item:**
   - Vá para Produção/Entrega/etc
   - Delete um item
   - Deve aparecer notificação de sucesso
   - Recarregue a página - item não deve aparecer

3. **Observe os logs:**
   - F12 → Console
   - Procure por "Erro ao" para identificar problemas
   - Se ver erros de permissão, revise as RLS policies

---

## ⚠️ Se Ainda Não Funcionar

1. **Verifique se está logado:**
   ```javascript
   // No Console do DevTools:
   const { data } = await supabase.auth.getSession();
   console.log(data.session?.user);
   ```

2. **Teste manualmente no SQL:**
   ```sql
   UPDATE company_settings SET name = 'Teste' WHERE id = 'seu-id-aqui';
   ```

3. **Verifique RLS está habilitado:**
   - Table Settings → RLS deve estar **Enabled**

4. **Verifique se policies existem:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'company_settings';
   ```

---

## 📚 Referências
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
