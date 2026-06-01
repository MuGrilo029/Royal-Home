// 🔍 SCRIPT DE DIAGNÓSTICO - RUN IN BROWSER CONSOLE (F12)
// Copie e cole tudo isso no Console (F12) do seu browser

console.log('=== 🔍 DIAGNÓSTICO SUPABASE ===\n');

// 1. Verificar autenticação
(async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  console.log('1️⃣ AUTENTICAÇÃO');
  if (session?.user) {
    console.log('✅ Usuário logado:', session.user.email);
    console.log('📧 ID:', session.user.id);
  } else {
    console.log('❌ NÃO ESTÁ LOGADO');
    return;
  }

  // 2. Verificar conexão Supabase
  console.log('\n2️⃣ CONEXÃO SUPABASE');
  console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('ANON KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');

  // 3. Testar SELECT (leitura)
  console.log('\n3️⃣ TESTE: SELECT company_settings');
  const { data: settingsData, error: selectError } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1);
  
  if (selectError) {
    console.log('❌ ERRO ao ler:', selectError.message);
  } else {
    console.log('✅ Leitura OK');
    console.log('📊 Dados:', settingsData);
  }

  // 4. Testar UPDATE (atualização)
  console.log('\n4️⃣ TESTE: UPDATE company_settings');
  if (settingsData && settingsData.length > 0) {
    const testId = settingsData[0].id;
    const { error: updateError } = await supabase
      .from('company_settings')
      .update({ name: 'TESTE_' + new Date().getTime() })
      .eq('id', testId);
    
    if (updateError) {
      console.log('❌ ERRO ao atualizar:', updateError.message);
      console.log('📋 Detalhes:', updateError);
    } else {
      console.log('✅ Atualização OK');
    }
  } else {
    console.log('⚠️ Nenhum registro para testar UPDATE');
  }

  // 5. Testar INSERT (inserção)
  console.log('\n5️⃣ TESTE: INSERT company_settings');
  const testId = 'test_' + Date.now();
  const { data: insertData, error: insertError } = await supabase
    .from('company_settings')
    .insert([{ id: testId, name: 'TESTE_INSERT' }]);
  
  if (insertError) {
    console.log('❌ ERRO ao inserir:', insertError.message);
    console.log('📋 Detalhes:', insertError);
  } else {
    console.log('✅ Inserção OK');
    console.log('📊 Dados inseridos:', insertData);
  }

  // 6. Testar DELETE (deleção)
  console.log('\n6️⃣ TESTE: DELETE');
  const { error: deleteError } = await supabase
    .from('company_settings')
    .delete()
    .eq('id', testId);
  
  if (deleteError) {
    console.log('❌ ERRO ao deletar:', deleteError.message);
    console.log('📋 Detalhes:', deleteError);
  } else {
    console.log('✅ Deleção OK');
  }

  // 7. Resumo final
  console.log('\n📋 RESUMO FINAL');
  console.log('================');
  const allTests = [
    { name: 'SELECT', status: !selectError },
    { name: 'UPDATE', status: !updateError },
    { name: 'INSERT', status: !insertError },
    { name: 'DELETE', status: !deleteError }
  ];
  
  allTests.forEach(test => {
    console.log(`${test.status ? '✅' : '❌'} ${test.name}`);
  });

  // 8. Erros encontrados
  const errors = allTests.filter(t => !t.status);
  if (errors.length > 0) {
    console.log('\n⚠️ PROBLEMAS ENCONTRADOS:');
    if (selectError) console.log('   - Problema com leitura (RLS ou permissões)');
    if (updateError) console.log('   - Problema com UPDATE (RLS policies)');
    if (insertError) console.log('   - Problema com INSERT (RLS policies)');
    if (deleteError) console.log('   - Problema com DELETE (RLS policies)');
    console.log('\n💡 Vá para: SUPABASE_RLS_SETUP.md');
  } else {
    console.log('\n✅ TUDO FUNCIONANDO!');
  }
})();
