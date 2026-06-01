# Guia de Configuração: Supabase + Vercel

## ✅ Corrigidas 8 Funções Críticas
1. **addProductionOrder** - Agora trata erros de insert
2. **deleteProductionOrder** - Agora trata erros com rollback
3. **deleteDelivery** - Agora trata erros com rollback
4. **saveCompanySettings** - Agora trata erros com rollback
5. **deleteCategory** - Agora trata erros com rollback
6. **deleteUser** - Agora trata erros com rollback
7. **deleteOrder** - Agora trata erros com rollback
8. **saveCompanySettings** (atualizada) - Notificações de sucesso/erro

## 🔧 Configuração no Vercel

### Passo 1: Acessar Vercel Dashboard
1. Vá para https://vercel.com/dashboard
2. Selecione seu projeto "gestao-pro" ou similar

### Passo 2: Adicionar Environment Variables
1. Clique em "Settings"
2. Clique em "Environment Variables"
3. Adicione estas 2 variáveis:

| Variable Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://atxmjddomjkxitkmlmgm.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eG1qZGRvbWpreGl0a21sbWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzU4NDEsImV4cCI6MjA5NTA1MTg0MX0.Fb28L0b9uKD9IxyJScSEvnfIazx0PQigavEasLUEU9Y` |

### Passo 3: Selecione Environments
- ✅ Production
- ✅ Preview  
- ✅ Development

### Passo 4: Deploy
1. Clique em "Deployments"
2. Clique em "Redeploy" na versão mais recente
3. Aguarde o deploy finalizar

## 🧪 Testar Localmente
1. Execute: `npm run dev`
2. Tente **adicionar** um item (e.g., pedido, entrega)
3. Tente **editar** um item
4. Tente **deletar** um item
5. Observe as notificações de sucesso/erro
6. Recarregue a página e verifique se os dados persistem

## 🔍 Debugar Erros
Abra DevTools (F12) e procure por logs que começam com "Erro ao":
```
Erro ao salvar produção: ...
Erro ao deletar entrega: ...
```

## ⚠️ Problemas Comuns

### "Supabase credentials missing"
- Verifique se `.env.local` tem as credenciais corretas
- No Vercel, confira se as variáveis estão em "Production"

### Dados não salvam na primeira vez
- Todos os inserts/updates agora têm tratamento de erro
- Observe a notificação e os logs no console (F12)

### "Database error" ao deletar
- Pode ser Cascading Delete - relacionamentos entre tabelas
- Verifique as RLS policies no Supabase

## 📝 Próximas Otimizações (Opcional)
- Implementar retry automático em conexões fracas
- Adicionar timestamps de sincronização
- Implementar fila offline (usando IndexedDB)
