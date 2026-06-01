# ✅ SOLUÇÃO: Liberar Acesso por Permissões (Não apenas ADMIN)

## 🔍 Problema Identificado

Você descobriu que o usuário **"tales"** tem apenas permissões específicas (não é ADMIN):
- ✅ Contas a Pagar
- ✅ Contas a Receber
- ✅ Vendas / PDV
- ✅ Histórico de Vendas
- ✅ Clientes
- ✅ Estoque
- ✅ Dashboard
- ✅ **Configurações** ← Pode acessar!

Mas as **RLS Policies** podem estar bloqueando porque esperam `ADMIN`.

---

## 🔓 SOLUÇÃO RÁPIDA (Desenvolvimento)

### Opção 1: Permitir Todos Autenticados (Mais rápido para testar)

Execute este SQL no Supabase Editor:

```sql
-- Desabilitar e recriar policies de company_settings
DROP POLICY IF EXISTS "company_settings_select" ON company_settings;
DROP POLICY IF EXISTS "company_settings_update" ON company_settings;
DROP POLICY IF EXISTS "company_settings_insert" ON company_settings;

-- Permitir SELECT para todos autenticados
CREATE POLICY "company_settings_select"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir UPDATE para todos autenticados
CREATE POLICY "company_settings_update"
  ON company_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir INSERT para todos autenticados
CREATE POLICY "company_settings_insert"
  ON company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

---

## 🔐 SOLUÇÃO CORRETA (Produção com Permissões)

Se quer apenas usuários com permissão em "Configurações", use:

```sql
-- Criar policy que verifica se usuário tem permissão em profiles.roles
CREATE POLICY "company_settings_update_by_permission"
  ON company_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()
      AND (
        profiles.roles::jsonb @> '"ADMIN"'::jsonb
        OR profiles.roles::jsonb @> '"CONFIGURACOES"'::jsonb
      )
    )
  )
  WITH CHECK (true);

CREATE POLICY "company_settings_insert_by_permission"
  ON company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()
      AND (
        profiles.roles::jsonb @> '"ADMIN"'::jsonb
        OR profiles.roles::jsonb @> '"CONFIGURACOES"'::jsonb
      )
    )
  );
```

---

## 🧪 Teste Agora

### Passo 1: Executar SQL
1. Vá para **Supabase Dashboard** → **SQL Editor**
2. Clique em **New Query**
3. Cole o SQL acima (escolha Opção 1 ou 2)
4. Clique em **Run**

### Passo 2: Testar no App
1. Faça login com usuário **"tales"**
2. Vá para **Settings** → **Empresa**
3. Mude algum campo (ex: Nome)
4. Clique em **Salvar**
5. **Deve aparecer:** ✅ "Configurações salvas com sucesso"

### Passo 3: Verificar no Supabase
1. Vá para **Supabase Dashboard**
2. Clique em **company_settings**
3. Verifique se os dados foram atualizados

---

## 🔍 Para Verificar Policies Existentes

Execute no SQL Editor para ver policies atuais:

```sql
SELECT schemaname, tablename, policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'company_settings'
ORDER BY policyname;
```

---

## 🚨 Se Ainda Assim Não Funcionar

### Verificar Autenticação
Abra o DevTools (F12) → Console e execute:

```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('Usuário:', session?.user?.email);
console.log('ID:', session?.user?.id);
```

### Verificar Roles no Banco
```sql
SELECT id, email, roles FROM profiles WHERE email = 'tales@...';
```

Deve retornar algo como:
```
id | email | roles
---|-------|-------
... | tales@... | ["CONFIGURACOES"]
```

### Teste Manual SELECT
```javascript
const { data, error } = await supabase
  .from('company_settings')
  .select('*')
  .limit(1);
console.log('Erro:', error);
console.log('Dados:', data);
```

---

## 📋 Checklist

- [ ] Executor SQL no Supabase
- [ ] Testar com usuário "tales"
- [ ] Verificar se Settings salva
- [ ] Recarregar página - dados devem persistir
- [ ] Conferir console para erros (F12)

Se houver erro diferente, compartilhe a mensagem de erro completa!
