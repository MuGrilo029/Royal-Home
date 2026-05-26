# Checklist de Segurança para Hospedagem

Siga estes passos antes de abrir o sistema para o público ou funcionários.

## 1. Configurações no Supabase
- [ ] **CORS**: No dashboard do Supabase (Settings > API), adicione a URL final do seu site (ex: `https://seu-sistema.vercel.app`) à lista de "Allow Origins". Remova o `*` se estiver presente.
- [ ] **Email Auth**: Configure um provedor de email (SMTP) real se for usar convites por email. O padrão do Supabase tem limites estritos.
- [ ] **RLS**: Já aplicamos as políticas no arquivo `MASTER_SCHEMA.sql`. Certifique-se de que elas foram executadas no Editor SQL do Supabase.

## 2. Variáveis de Ambiente (Hosting)
Ao hospedar em plataformas como Vercel ou Netlify, configure as seguintes "Environment Variables":
- `VITE_SUPABASE_URL`: Sua URL do Supabase.
- `VITE_SUPABASE_ANON_KEY`: Sua chave anônima do Supabase.

> [!WARNING]
> Nunca use a `service_role` key no frontend. Isso daria acesso total ao banco de dados para qualquer pessoa.

## 3. Acesso Inicial
- [ ] **Admin**: O primeiro usuário criado via Auth do Supabase terá o papel `ADMIN` por padrão (conforme o trigger que criamos no schema). Use este usuário para configurar os demais.
- [ ] **Senha Forte**: Garanta que todos os usuários usem senhas complexas.

## 4. Auditoria de Dados
- [ ] **Logs de Produção**: O sistema foi limpo de logs de depuração que poderiam expor dados sensíveis no console do navegador.
- [ ] **HTTPS**: Certifique-se de que o site está rodando estritamente sobre HTTPS.
