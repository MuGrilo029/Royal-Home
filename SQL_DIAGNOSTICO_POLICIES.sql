-- 🔍 DIAGNÓSTICO: Ver policies atuais
SELECT schemaname, tablename, policyname, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('products', 'stock_movements', 'suppliers', 'customers')
ORDER BY tablename, policyname;
