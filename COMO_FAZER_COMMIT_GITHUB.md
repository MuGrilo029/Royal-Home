# 📤 Como Fazer Commit no GitHub

Você encontra que fiz as mudanças, mas **você precisa fazer o commit** (enviar para o GitHub).

---

## 🚀 Método 1: VS Code UI (Mais fácil)

### Passo 1: Abra Source Control
Pressione: **Ctrl + Shift + G** (Windows/Linux)

### Passo 2: Veja os Arquivos Modificados
Deve aparecer listado:
- `store.tsx` (modificado - função `deleteProduct` atualizada)
- Qualquer outro arquivo que tenha alterado

### Passo 3: Stage dos Arquivos
Clique no **+** ao lado de `store.tsx` (ou clique em `+` próximo a "Changes" para adicionar todos)

### Passo 4: Escreva a Mensagem de Commit
Na caixa de texto que diz "Message", escreva:
```
Fix: melhorar tratamento de erro em deleteProduct com rollback
```

### Passo 5: Commit
Clique no ✓ (check) acima da caixa de mensagem

### Passo 6: Push (Enviar para GitHub)
Clique em **⋯** (três pontinhos) → **Push**

---

## 💻 Método 2: Terminal (Mais controle)

Abra o PowerShell/Terminal integrado do VS Code (Ctrl + `)

```bash
# Verificar status
git status

# Adicionar arquivo específico
git add store.tsx

# Ou adicionar todos os modificados
git add .

# Fazer commit
git commit -m "Fix: melhorar tratamento de erro em deleteProduct com rollback"

# Enviar para GitHub
git push origin main
```

---

## ✅ Arquivos que Mudaram Hoje

```
✏️ store.tsx
   - Função deleteProduct: agora com rollback e notificações melhoradas
   
📄 Novos arquivos criados:
   - FIX_RLS_PERMISSIONS.md
   - ROLES_PERMISSIONS_GUIDE.md
   - FIX_ESTOQUE_DELETE.md
   - DIAGNOSTIC_SCRIPT.js
   - QUICK_FIX.md
```

---

## 🔍 Verificar se Push funcionou

1. Vá para seu repositório no GitHub
2. Clique em **Commits** 
3. Deve aparecer o commit novo com a mensagem que você escreveu

---

## ⚠️ Se Houver Conflito

Se aparecer erro tipo "could not push", pode ser:

1. **Falta de credenciais:**
   ```bash
   git config --global user.email "seu-email@gmail.com"
   git config --global user.name "Seu Nome"
   ```

2. **Branch diferente:**
   ```bash
   git branch  # Ver branch atual
   git push origin nome-da-branch
   ```

3. **Código desatualizado:**
   ```bash
   git pull origin main
   git push origin main
   ```

---

## 📋 Resumo das Mudanças de Hoje

### ✅ Corrigido

1. **Salvar Configurações (Settings)**
   - Função `updateCompanySettings` com melhor tratamento de erro
   - SQL para RLS policies de `company_settings`

2. **Deletar Produtos (Estoque)**
   - Função `deleteProduct` com rollback automático
   - SQL para RLS policies de `products`, `stock_movements`, etc

3. **Suporte a Permissões de Usuário**
   - Agora funciona com usuários que não são ADMIN
   - Exemplo: "tales" com role "CONFIGURACOES"

### 📚 Documentação Criada

- `FIX_RLS_PERMISSIONS.md` - Configurar RLS para permissões
- `ROLES_PERMISSIONS_GUIDE.md` - Guia de como funcionam as permissões
- `FIX_ESTOQUE_DELETE.md` - RLS para estoque
- `DIAGNOSTIC_SCRIPT.js` - Script para debugar problemas

---

## 🎯 Próximos Passos

1. ✅ Execute o SQL em `FIX_ESTOQUE_DELETE.md`
2. ✅ Teste deletar um produto
3. ✅ Faça commit das mudanças (Método 1 ou 2 acima)
4. ✅ Teste com usuário "tales"
