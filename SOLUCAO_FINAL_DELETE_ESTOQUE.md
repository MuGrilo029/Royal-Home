# 🚨 SOLUÇÃO PARA PROBLEMA DE DELETE NO ESTOQUE

Você ainda não consegue apagar? Vou resolver de forma DEFINITIVA.

---

## 🎯 O Problema Real

Pode ser **2 coisas**:

1. **RLS Policy bloqueia DELETE** (mais provável)
2. **RLS Policy verifica ADMIN** e o usuário não tem essa role

---

## ✅ SOLUÇÃO RÁPIDA (2 minutos)

### Opção A: Desabilitar RLS (Mais fácil - Teste rápido)

1. **Supabase Dashboard** → Clique na tabela **products**
2. Clique no **ícone de informação** (i) no topo direito
3. Procure por **"RLS disabled"** ou **"RLS enabled"**
4. Se disser **"RLS enabled"**, clique em **"Disable RLS"**
5. Repita para: `stock_movements`, `suppliers`, `customers`

**Teste agora:**
- Volte para a app
- Tente deletar um produto
- Deve funcionar! ✅

---

### Opção B: Usar SQL (Se Opção A não funcionar)

1. **Supabase Dashboard** → **SQL Editor** → **New Query**
2. Cole TUDO do arquivo: **SQL_NUCLEAR_SOLUTION.sql**
3. Clique em **Run**
4. Procure pela última query (SELECT de verificação)
5. Deve retornar as policies criadas

**Teste agora:**
- Volte para a app
- Tente deletar um produto
- Deve funcionar! ✅

---

## 🔍 Se AINDA Não Funcionar

Execute este SQL para DEBUG:

```sql
-- Ver quais policies existem
SELECT schemaname, tablename, policyname, qual 
FROM pg_policies 
WHERE tablename = 'products';

-- Ver se RLS está habilitado
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname IN ('products', 'stock_movements', 'suppliers', 'customers');
```

Se `relrowsecurity` = `true`, RLS está habilitado.
Se `relrowsecurity` = `false`, RLS está desabilitado.

---

## 📋 Checklist de Debug

- [ ] RLS está desabilitado nas tabelas?
- [ ] Policies existem e permitem DELETE?
- [ ] Usuário está logado (não é anônimo)?
- [ ] Abri DevTools (F12) e vejo erros?

---

## 💬 Mensagem de Erro no DevTools

Abra **F12** → **Console** e tente deletar um produto.

Se houver erro, compartilhe a mensagem:
- Procure por **"Erro ao deletar"**
- Copie toda a mensagem de erro
- Envie para eu debugar
