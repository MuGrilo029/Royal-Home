# 📋 Mapeamento de Permissões do Sistema

## Sistema de Roles Implementado

Seu app usa um sistema de **roles por usuário** armazenado em `profiles.roles` (JSON array).

---

## Roles Disponíveis

Baseado na imagem das permissões:

| Role | Descrição | Onde Usado |
|------|-----------|-----------|
| `ADMIN` | Acesso total a tudo | Todas as operações |
| `CONTAS_PAGAR` | Financeiro - Contas a Pagar | Páginas de Financeiro |
| `CONTAS_RECEBER` | Financeiro - Contas a Receber | Páginas de Financeiro |
| `VENDAS_PDV` | Comercial - Vendas/PDV | Páginas de Vendas |
| `HISTORICO_VENDAS` | Comercial - Histórico | Páginas de Relatórios de Vendas |
| `CLIENTES` | Comercial - Clientes | Gestão de Clientes |
| `ESTOQUE` | Estoque/Produção - Estoque | Páginas de Estoque |
| `PRODUCAO` | Estoque/Produção - Produção | Páginas de Produção |
| `ENCOMENDAS` | Estoque/Produção - Encomendas | Páginas de Encomendas |
| `FORNECEDORES` | Estoque/Produção - Fornecedores | Gestão de Fornecedores |
| `ENTREGAS` | Logística - Entregas | Páginas de Entregas |
| `DASHBOARD` | Logística/Geral - Dashboard | Dashboard |
| `RELATORIOS` | Logística/Geral - Relatórios | Páginas de Relatórios |
| `IMPORT_EXPORT` | Sistema - Importar/Exportar | Aba de Import/Export |
| `CONFIGURACOES` | Sistema - Configurações | Abas de Settings |

---

## Usuário "tales" - Permissões Atuais

```json
{
  "id": "...",
  "email": "tales@...",
  "roles": [
    "CONTAS_PAGAR",
    "CONTAS_RECEBER",
    "VENDAS_PDV",
    "HISTORICO_VENDAS",
    "CLIENTES",
    "ESTOQUE",
    "DASHBOARD",
    "CONFIGURACOES"
  ]
}
```

---

## Como o Código Verifica Permissões

### Em Settings.tsx (Código atual)

```typescript
const userRoles = currentUser?.roles || [];  // ["CONTAS_PAGAR", "VENDAS_PDV", ...]
const isAdmin = userRoles.includes('ADMIN');  // false para "tales"

const hasPermission = (role: string) => 
  isAdmin || userRoles.includes(role as any);

// Exemplo de uso:
const canImport = hasPermission('IMPORT_EXPORT');  // false para "tales"
const canAccessGeneral = hasPermission('CONFIGURACOES');  // true para "tales" ✅
```

### Filtragem de Abas em Settings

```typescript
const tabs = [
  { id: 'GENERAL', label: 'Empresa' },  // Sem permission = acessível para todos
  { id: 'CATEGORIES', label: 'Categorias' },  // Sem permission = acessível para todos
  { id: 'USERS', label: 'Usuários' },  // Sem permission = acessível para todos
  { id: 'ORDERS', label: 'Emissão de Pedido' },  // Sem permission = acessível para todos
  { id: 'FEES', label: 'Taxas de Cartão' },  // Sem permission = acessível para todos
  { id: 'IMPORT_EXPORT', label: 'Importar / Exportar', permission: 'IMPORT_EXPORT' },
].filter(tab => !tab.permission || hasPermission(tab.permission));
// Para "tales": Todas as abas EXCETO IMPORT_EXPORT
```

---

## 🔐 Problema Atual

### Frontend ✅ OK
- App permite "tales" acessar Settings
- Permite visualizar todas as abas exceto "Importar/Exportar"

### Backend ❌ PROBLEMA
- RLS Policies no Supabase podem estar verificando se é ADMIN
- Quando "tales" tenta fazer UPDATE em company_settings:
  - Request vai ao Supabase
  - RLS Policy verifica: "É ADMIN?" 
  - Resposta: NÃO
  - Resultado: **BLOCKED**

---

## ✅ Solução Implementada

Vá para [FIX_RLS_PERMISSIONS.md](FIX_RLS_PERMISSIONS.md) e execute o SQL.

As políticas corretas devem ser:

```sql
-- Permitir UPDATE se usuário tiver ADMIN OU CONFIGURACOES
CREATE POLICY "company_settings_update"
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
  );
```

---

## 📝 Como Adicionar Novos Roles

Se precisar adicionar um novo role no futuro:

1. **Defina a constante**:
   ```typescript
   // types.ts ou similar
   type UserRole = 'ADMIN' | 'NOVO_ROLE' | ...;
   ```

2. **Adicione à interface User**:
   ```typescript
   interface User {
     roles: UserRole[];
   }
   ```

3. **Crie a RLS Policy no Supabase**:
   ```sql
   CREATE POLICY "tabela_novo_role"
     ON tabela
     FOR UPDATE
     TO authenticated
     USING (
       profiles.roles::jsonb @> '"NOVO_ROLE"'::jsonb
     );
   ```

4. **Atualize a filtragem em Settings.tsx** (se necessário):
   ```typescript
   { id: 'TAB', label: 'Label', permission: 'NOVO_ROLE' }
   ```

---

## 🧪 Teste de Permissão

Para testar se uma permissão está funcionando:

```javascript
// No Console do DevTools:
const { data: { session } } = await supabase.auth.getSession();
const { data: profile } = await supabase
  .from('profiles')
  .select('roles')
  .eq('id', session.user.id)
  .single();

console.log('Roles de "tales":', profile.roles);
```

---

## 🎯 Próximos Passos

1. ✅ Executar o SQL em [FIX_RLS_PERMISSIONS.md](FIX_RLS_PERMISSIONS.md)
2. ✅ Testar com usuário "tales" 
3. ✅ Verificar se Settings salva
4. ✅ Recarregar página para confirmar persistência
