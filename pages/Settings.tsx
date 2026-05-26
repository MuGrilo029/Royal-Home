

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Input, Select, Table, Modal, formatCpfCnpj, formatPhone } from '../components/UI';
import { Settings as SettingsIcon, Users, Tag, FileText, Building, Trash2, Plus, UserPlus, Briefcase, ShoppingBag, Truck, DollarSign, Edit, CheckSquare, Square, Upload, Image as ImageIcon, Loader2, Palette, FileSpreadsheet, Download, AlertCircle, ArrowRight, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Category, User, CategoryType, UserRole, CategoryGroup, CardFee } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, getUUID } from '../lib/utils';

export const Settings: React.FC = () => {
  const {
    companySettings,
    updateCompanySettings,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    categoryGroups,
    addCategoryGroup,
    updateCategoryGroup,
    deleteCategoryGroup,
    users,
    addUser,
    updateUser,
    deleteUser,
    cardFees,
    addCardFee,
    updateCardFee,
    deleteCardFee
  } = useAppStore();
  const { user } = useAuth();

  const currentUser = users.find(u => u.email === user?.email);
  const userRoles = currentUser?.roles || [];
  const isAdmin = userRoles.includes('ADMIN');

  const hasPermission = (role: string) => isAdmin || userRoles.includes(role as any);

  const [activeTab, setActiveTab] = useState<'GENERAL' | 'CATEGORIES' | 'USERS' | 'ORDERS' | 'IMPORT_EXPORT' | 'FEES'>('GENERAL');

  // Local states for inputs
  const [generalForm, setGeneralForm] = useState(companySettings);
  const [isUploading, setIsUploading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<CategoryType>('PRODUCT');
  const [newCatIsCmv, setNewCatIsCmv] = useState(false);

  const [userModal, setUserModal] = useState(false);
  const [userForm, setUserForm] = useState<Partial<User>>({ roles: [] });

  // Category Edit State
  const [catEditModal, setCatEditModal] = useState(false);
  const [catEditForm, setCatEditForm] = useState<{ id: string, name: string, groupId?: string, isCmv?: boolean }>({ id: '', name: '', isCmv: false });

  // Category Groups State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [groupEditModal, setGroupEditModal] = useState(false);
  const [groupEditForm, setGroupEditForm] = useState<CategoryGroup>({ id: '', name: '', createdAt: '' });
  const [newCatGroupId, setNewCatGroupId] = useState<string | undefined>(undefined);

  // --- Import / Export State ---
  const store = useAppStore();
  const [importModule, setImportModule] = useState('products');
  const [rawPreviewData, setRawPreviewData] = useState<any[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoadingImport, setIsLoadingImport] = useState(false);
  const [feeForm, setFeeForm] = useState<Partial<CardFee>>({ installments: 0, percentage: 0 });
  const [isSavingFee, setIsSavingFee] = useState(false);

  const modules = [
    { id: 'products', name: 'Produtos (Estoque)' },
    { id: 'customers', name: 'Clientes' },
    { id: 'suppliers', name: 'Fornecedores' },
    { id: 'payables', name: 'Contas a Pagar (Financeiro)' },
    { id: 'receivables', name: 'Contas a Receber (Financeiro)' },
    { id: 'sales', name: 'Histórico de Vendas' },
  ];

  const cleanString = (str: string) => str?.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

  const parseCurrency = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const clean = value.replace(/[R$\s]/g, '').replace('.', '').replace(',', '.');
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  const parseDate = (value: any): string => {
    if (!value) return new Date().toISOString().split('T')[0];
    if (typeof value === 'number') {
      const date = new Date((value - (25567 + 2)) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    if (typeof value === 'string' && value.includes('/')) {
      const parts = value.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return new Date(value).toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
  };

  const processImportData = (data: any[], type: string) => {
    return data.map(row => {
      const newItem: any = { id: getUUID() };
      const rowNormalized: { [key: string]: any } = {};
      Object.keys(row).forEach(key => {
        rowNormalized[cleanString(key)] = row[key];
      });

      const findValue = (synonyms: string[]) => {
        for (const syn of synonyms) {
          const foundKey = Object.keys(rowNormalized).find(k => k.includes(syn));
          if (foundKey) return rowNormalized[foundKey];
        }
        return null;
      };

      if (type === 'products') {
        newItem.name = findValue(['nome', 'produto', 'descricao', 'item']) || 'Produto sem nome';
        newItem.sku = findValue(['sku', 'codigo', 'ref', 'id']) || 'N/A';
        newItem.price = parseCurrency(findValue(['preco', 'venda', 'valor', 'unitario']));
        newItem.cost = parseCurrency(findValue(['custo', 'compra']));
        newItem.quantity = parseInt(findValue(['qtd', 'quantidade', 'estoque']) || '0');
        newItem.minStock = parseInt(findValue(['min', 'minimo']) || '5');
        newItem.category = findValue(['categoria', 'grupo', 'tipo']) || 'Geral';
        newItem.entryDate = parseDate(findValue(['entrada', 'data'])) || new Date().toISOString().split('T')[0];
      } else if (type === 'customers' || type === 'suppliers') {
        newItem.name = findValue(['nome', 'cliente', 'fornecedor', 'razao', 'empresa']) || 'Sem Nome';
        newItem.cpfCnpj = findValue(['cpf', 'cnpj', 'doc', 'federal']) || '';
        newItem.phone = findValue(['tel', 'cel', 'fone', 'contato']) || '';
        newItem.email = findValue(['email', 'correio']) || '';
        newItem.address = findValue(['end', 'rua', 'logradouro', 'cidade']) || '';
        if (type === 'suppliers') {
          newItem.companyName = findValue(['razao', 'empresa']) || newItem.name;
          newItem.contact = newItem.phone;
        }
      } else if (type === 'payables' || type === 'receivables') {
        newItem.description = findValue(['desc', 'historico', 'nome', 'titulo']) || (type === 'payables' ? 'Conta a Pagar' : 'Recebimento');
        newItem.amount = parseCurrency(findValue(['valor', 'total', 'pagar', 'receber']));
        newItem.dueDate = parseDate(findValue(['vencimento', 'vencto', 'prazo']));
        newItem.date = parseDate(findValue(['data', 'emissao', 'lançamento']) || newItem.dueDate);
        newItem.category = findValue(['cat', 'classificacao']) || 'Geral';
        newItem.type = type === 'payables' ? 'EXPENSE' : 'INCOME';
        const statusRaw = findValue(['status', 'situacao']);
        if (statusRaw && cleanString(statusRaw).includes('pago')) newItem.status = 'PAID';
        else if (statusRaw && cleanString(statusRaw).includes('recebido')) newItem.status = 'PAID';
        else newItem.status = 'PENDING';
      } else if (type === 'sales') {
        newItem.customerName = findValue(['cliente', 'nome']) || 'Consumidor Final';
        newItem.date = parseDate(findValue(['data', 'emissao']));
        newItem.total = parseCurrency(findValue(['total', 'valor', 'final']));
        newItem.status = 'COMPLETED';
        newItem.paymentMethod = findValue(['pagamento', 'forma', 'metodo']) || 'Dinheiro';
        newItem.paymentType = 'FULL';
        newItem.deliveryType = 'PICKUP';
        newItem.items = [];
      }
      return newItem;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setImportMessage(null);
    setRawPreviewData([]);
    setProcessedData([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        setRawPreviewData(jsonData);
        const processed = processImportData(jsonData, importModule);
        setProcessedData(processed);
      } catch (err) {
        setImportMessage({ type: 'error', text: 'Erro ao ler arquivo. Verifique se é um Excel válido.' });
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  React.useEffect(() => {
    if (rawPreviewData.length > 0) {
      const processed = processImportData(rawPreviewData, importModule);
      setProcessedData(processed);
    }
  }, [importModule, rawPreviewData]);

  const confirmImport = () => {
    if (!processedData.length) return;
    setIsLoadingImport(true);

    setTimeout(() => {
      try {
        let internalModule = importModule;
        if (importModule === 'payables' || importModule === 'receivables') internalModule = 'transactions';
        store.importData(internalModule, processedData);
        setImportMessage({
          type: 'success',
          text: `${processedData.length} registros importados com sucesso para ${modules.find(m => m.id === importModule)?.name}!`
        });
        setRawPreviewData([]);
        setProcessedData([]);
        setFile(null);
      } catch (e) {
        setImportMessage({ type: 'error', text: 'Erro ao processar importação.' });
      }
      setIsLoadingImport(false);
    }, 1000);
  };

  const handleExport = (moduleId: string, type: 'xlsx' | 'csv') => {
    let data: any[] = [];
    if (moduleId === 'payables') {
      data = store.transactions.filter(t => t.type === 'EXPENSE');
    } else if (moduleId === 'receivables') {
      data = store.transactions.filter(t => t.type === 'INCOME');
    } else {
      data = (store as any)[moduleId] || [];
    }

    if (!data || data.length === 0) {
      alert('Sem dados para exportar neste módulo.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${moduleId.toUpperCase()}_${date}.${type}`;
    XLSX.writeFile(wb, fileName);
  };

  // --- Handlers ---

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings(generalForm);
    alert('Configurações salvas com sucesso!');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `company_logo_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    setIsUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from('products') // Using 'products' bucket as it is already configured with public policies
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('products').getPublicUrl(filePath);

      setGeneralForm(prev => ({ ...prev, logo: data.publicUrl }));
      alert('Logo enviada com sucesso!');

    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert('Erro ao enviar logo. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    addCategory({
      id: getUUID(),
      name: newCatName,
      type: newCatType,
      groupId: newCatGroupId,
      isCmv: newCatIsCmv
    });
    setNewCatName('');
    setNewCatGroupId(undefined);
    setNewCatIsCmv(false);
  };

  const handleAddCategoryGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    addCategoryGroup({
      id: getUUID(),
      name: newGroupName,
      description: newGroupDesc,
      createdAt: new Date().toISOString()
    });
    setNewGroupName('');
    setNewGroupDesc('');
  };

  const handleUpdateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catEditForm.name || !catEditForm.id) return;

    const cat = categories.find(c => c.id === catEditForm.id);
    if (cat) {
      updateCategory({ ...cat, name: catEditForm.name, groupId: catEditForm.groupId, isCmv: catEditForm.isCmv });
    }
    setCatEditModal(false);
  };

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupEditForm.name) return;
    updateCategoryGroup(groupEditForm);
    setGroupEditModal(false);
  };

  const openCatEdit = (cat: Category) => {
    setCatEditForm({ id: cat.id, name: cat.name, groupId: cat.groupId, isCmv: cat.isCmv });
    setCatEditModal(true);
  };

  const openGroupEdit = (group: CategoryGroup) => {
    setGroupEditForm({ ...group });
    setGroupEditModal(true);
  };

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setUserForm({ ...user });
    } else {
      setUserForm({ roles: [], department: '' });
    }
    setUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) return;

    const userData = {
      id: userForm.id || getUUID(),
      name: userForm.name,
      email: userForm.email,
      roles: userForm.roles || [],
      department: userForm.department || 'Geral'
    } as User;

    if (userForm.id) {
      updateUser(userData);
    } else {
      addUser(userData);
    }

    setUserModal(false);
    setUserForm({ roles: [] });
  };

  const toggleRole = (role: UserRole) => {
    setUserForm(prev => {
      const currentRoles = prev.roles || [];
      if (currentRoles.includes(role)) {
        return { ...prev, roles: currentRoles.filter(r => r !== role) };
      }
      return { ...prev, roles: [...currentRoles, role] };
    });
  };

  const tabs = [
    { id: 'GENERAL', label: 'Empresa', icon: <Building size={18} /> },
    { id: 'CATEGORIES', label: 'Categorias', icon: <Tag size={18} /> },
    { id: 'USERS', label: 'Usuários', icon: <Users size={18} /> },
    { id: 'ORDERS', label: 'Emissão de Pedido', icon: <FileText size={18} /> },
    { id: 'FEES', label: 'Taxas de Cartão', icon: <DollarSign size={18} /> },
    { id: 'IMPORT_EXPORT', label: 'Importar / Exportar', icon: <FileSpreadsheet size={18} />, permission: 'IMPORT_EXPORT' },
  ].filter(tab => !tab.permission || hasPermission(tab.permission));

  // Helper to render category lists
  const renderCategoryList = (title: string, type: CategoryType, icon: React.ReactNode, colorClass: string) => (
    <div className={`bg-white dark:bg-slate-800 rounded-lg border border-wine-100 dark:border-slate-700 overflow-hidden flex flex-col h-64`}>
      <div className={`px-4 py-3 border-b border-wine-100 dark:border-slate-700 flex items-center justify-between ${colorClass} bg-opacity-10`}>
        <div className="flex items-center gap-2 font-bold text-sm text-wine-900 dark:text-white">
          {icon} {title}
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-700">
          {categories.filter(c => c.type === type).length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {categories.filter(c => c.type === type).map(cat => {
          const groupName = categoryGroups.find(g => g.id === cat.groupId)?.name;
          return (
            <div key={cat.id} className="flex justify-between items-center p-2 hover:bg-wine-50 dark:hover:bg-slate-700 rounded transition-colors group">
              <div className="flex flex-col">
                <span className="text-sm text-wine-800 dark:text-slate-200">{cat.name}</span>
                {groupName && (
                  <span className="text-[10px] text-wine-400 dark:text-slate-500 font-medium -mt-0.5">
                    {groupName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {cat.isCmv && (
                  <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">CMV</span>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openCatEdit(cat)} className="text-wine-500 hover:text-wine-800 dark:text-slate-400 dark:hover:text-white">
                  <Edit size={14} />
                </button>
                <button onClick={() => {
                  if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
                    deleteCategory(cat.id);
                  }
                }} className="text-wine-300 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
          );
        })}
        {categories.filter(c => c.type === type).length === 0 && (
          <p className="text-center text-xs text-wine-300 dark:text-slate-500 py-4">Vazio</p>
        )}
      </div>
    </div>
  );



  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">ADMIN</span>;
      case 'PAYABLES':
      case 'RECEIVABLES':
      case 'BOLETOS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{role}</span>;
      case 'SALES':
      case 'SALES_HISTORY':
      case 'QUOTES':
      case 'CUSTOMERS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">{role}</span>;
      case 'INVENTORY':
      case 'PRODUCTION':
      case 'ORDERS':
      case 'SUPPLIERS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{role}</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-wine-100 text-wine-800 dark:bg-slate-700 dark:text-slate-300">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-wine-900 dark:text-white flex items-center gap-2">
        <SettingsIcon /> Configurações do Sistema
      </h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-wine-200 dark:border-slate-700 pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-medium transition-colors ${activeTab === tab.id
              ? 'bg-white dark:bg-slate-800 text-wine-900 dark:text-white border-x border-t border-wine-200 dark:border-slate-700 shadow-sm relative -mb-[1px]'
              : 'text-wine-500 dark:text-slate-400 hover:text-wine-800 dark:hover:text-white hover:bg-wine-50 dark:hover:bg-slate-700'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-b-xl shadow-sm border border-wine-100 dark:border-slate-700 p-6 min-h-[400px]">

        {/* TAB: GENERAL */}
        {activeTab === 'GENERAL' && (
          <form onSubmit={handleSaveGeneral} className="max-w-2xl space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-wine-900 dark:text-white mb-4">Dados da Empresa</h3>
            <Input
              label="Nome da Empresa / Fantasia"
              value={generalForm.name}
              onChange={e => setGeneralForm({ ...generalForm, name: e.target.value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="CNPJ"
                value={generalForm.cnpj}
                onChange={e => setGeneralForm({ ...generalForm, cnpj: formatCpfCnpj(e.target.value) })}
                maxLength={18}
              />
              <Input
                label="Telefone"
                value={generalForm.phone}
                onChange={e => setGeneralForm({ ...generalForm, phone: formatPhone(e.target.value) })}
                maxLength={15}
              />
            </div>
            <Input
              label="Endereço Completo"
              value={generalForm.address}
              onChange={e => setGeneralForm({ ...generalForm, address: e.target.value })}
            />
            <div className="pt-4">
              <Button type="submit">Salvar Alterações</Button>
            </div>
          </form>
        )}

        {/* TAB: CATEGORIES */}
        {activeTab === 'CATEGORIES' && (
          <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-wine-50 dark:bg-slate-700/50 p-4 rounded-lg border border-wine-100 dark:border-slate-700">
                <h3 className="text-sm font-bold text-wine-900 dark:text-white mb-3 uppercase tracking-wide">Adicionar Nova Categoria</h3>
                <form onSubmit={handleAddCategory} className="flex flex-col lg:flex-row gap-4 lg:items-end">
                  <div className="flex-1 min-w-0">
                    <Input
                      label="Nome da Categoria"
                      placeholder="Ex: Eletrônicos"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Select
                      label="Grupo / Tipo"
                      value={newCatType}
                      onChange={e => setNewCatType(e.target.value as any)}
                      className="bg-white dark:bg-slate-800"
                    >
                      <option value="PRODUCT">Produtos (Estoque)</option>
                      <option value="EXPENSE">Despesas (Pagar)</option>
                      <option value="INCOME">Receitas (Receber)</option>
                      <option value="SUPPLIER">Fornecedores</option>
                      <option value="USER">Usuários (Departamentos)</option>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Select
                      label="Grupo (Pai)"
                      value={newCatGroupId || ''}
                      onChange={e => setNewCatGroupId(e.target.value || undefined)}
                      className="bg-white dark:bg-slate-800"
                    >
                      <option value="">Sem Grupo</option>
                      {categoryGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </Select>
                  </div>
                    <Button type="submit" className="w-full lg:w-auto h-[42px] shrink-0">
                    <Plus size={18} /> Adicionar
                  </Button>
                </form>
                {(newCatType === 'EXPENSE' || newCatType === 'SUPPLIER') && (
                  <div className="mt-3 flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-wine-100 dark:border-slate-700 w-fit">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newCatIsCmv} 
                        onChange={e => setNewCatIsCmv(e.target.checked)}
                        className="w-4 h-4 rounded border-wine-300 text-wine-600 focus:ring-wine-500"
                      />
                      <span className="text-xs font-bold text-wine-900 dark:text-white uppercase">Relacionado ao CMV / Custo Direto</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="bg-wine-50 dark:bg-slate-700/50 p-4 rounded-lg border border-wine-100 dark:border-slate-700">
                <h3 className="text-sm font-bold text-wine-900 dark:text-white mb-3 uppercase tracking-wide">Grupos (Macro)</h3>
                <form onSubmit={handleAddCategoryGroup} className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Novo Grupo (ex: Logística)"
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        className="bg-white dark:bg-slate-800 text-xs h-9"
                      />
                    </div>
                    <Button type="submit" className="h-9 w-9 p-0 flex items-center justify-center">
                      <Plus size={16} />
                    </Button>
                  </div>
                  <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1">
                    {categoryGroups.map(g => (
                      <div key={g.id} className="flex justify-between items-center p-1.5 bg-white dark:bg-slate-800 rounded border border-wine-100 dark:border-slate-700 text-xs group">
                        <span className="text-wine-800 dark:text-slate-200 truncate">{g.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => openGroupEdit(g)} className="text-wine-400 hover:text-wine-800">
                            <Edit size={12} />
                          </button>
                          <button type="button" onClick={() => {
                            if (window.confirm('Tem certeza que deseja excluir este grupo? Todas as categorias vinculadas ficarão sem grupo.')) {
                              deleteCategoryGroup(g.id);
                            }
                          }} className="text-wine-300 hover:text-red-500">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </form>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {renderCategoryList('Produtos', 'PRODUCT', <ShoppingBag size={14} />, 'bg-blue-100 text-blue-800')}
              {renderCategoryList('Despesas', 'EXPENSE', <DollarSign size={14} className="text-red-600" />, 'bg-red-100 text-red-800')}
              {renderCategoryList('Receitas', 'INCOME', <DollarSign size={14} className="text-emerald-600" />, 'bg-emerald-100 text-emerald-800')}
              {renderCategoryList('Fornecedores', 'SUPPLIER', <Truck size={14} />, 'bg-amber-100 text-amber-800')}
              {renderCategoryList('Departamentos', 'USER', <Briefcase size={14} />, 'bg-purple-100 text-purple-800')}
            </div>

            <Modal isOpen={catEditModal} onClose={() => setCatEditModal(false)} title="Editar Categoria">
              <form onSubmit={handleUpdateCategory} className="space-y-4">
                <Input
                  label="Nome da Categoria"
                  value={catEditForm.name}
                  onChange={e => setCatEditForm({ ...catEditForm, name: e.target.value })}
                />
                <Select
                  label="Grupo (Pai)"
                  value={catEditForm.groupId || ''}
                  onChange={e => setCatEditForm({ ...catEditForm, groupId: e.target.value || undefined })}
                >
                  <option value="">Sem Grupo</option>
                  {categoryGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Select>

                {catEditForm.id && (categories.find(c => c.id === catEditForm.id)?.type === 'EXPENSE' || categories.find(c => c.id === catEditForm.id)?.type === 'SUPPLIER') && (
                  <div className="flex items-center gap-2 p-2 bg-wine-50 dark:bg-slate-700/50 rounded-lg border border-wine-100 dark:border-slate-600">
                    <label className="flex items-center gap-2 cursor-pointer w-full">
                      <input 
                        type="checkbox" 
                        checked={catEditForm.isCmv || false} 
                        onChange={e => setCatEditForm({ ...catEditForm, isCmv: e.target.checked })}
                        className="w-4 h-4 rounded border-wine-300 text-wine-600 focus:ring-wine-500"
                      />
                      <span className="text-xs font-bold text-wine-900 dark:text-white uppercase">Relacionado ao CMV / Custo Direto</span>
                    </label>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCatEditModal(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </Modal>

            <Modal isOpen={groupEditModal} onClose={() => setGroupEditModal(false)} title="Editar Grupo">
              <form onSubmit={handleUpdateGroup} className="space-y-4">
                <Input
                  label="Nome do Grupo"
                  value={groupEditForm.name}
                  onChange={e => setGroupEditForm({ ...groupEditForm, name: e.target.value })}
                />
                <div className="flex-1">
                  <label className="text-xs font-semibold text-wine-600 dark:text-wine-300 uppercase tracking-wider block mb-1">Descrição (Opcional)</label>
                  <textarea
                    className="w-full border border-wine-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-wine-500 outline-none h-24 text-black dark:text-white resize-none"
                    value={groupEditForm.description || ''}
                    onChange={e => setGroupEditForm({ ...groupEditForm, description: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setGroupEditModal(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </Modal>
          </div>
        )}

        {/* TAB: USERS */}
        {activeTab === 'USERS' && (
          <div className="animate-fade-in space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-wine-900 dark:text-white">Gestão de Usuários e Permissões</h3>
              <Button onClick={() => handleOpenUserModal()}>
                <UserPlus size={18} /> Novo Usuário
              </Button>
            </div>

            <Table headers={['Nome', 'Email', 'Permissões (Funções)', 'Departamento', 'Ações']}>
              {users.map(u => (
                <tr key={u.id} className="hover:bg-wine-50 dark:hover:bg-slate-700/50">
                  <td className="py-3 px-4 text-wine-900 dark:text-white font-medium">{u.name}</td>
                  <td className="py-3 px-4 text-wine-600 dark:text-slate-300">{u.email}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {u.roles && u.roles.length > 0 ? (
                        u.roles.map(r => <span key={r}>{getRoleBadge(r)}</span>)
                      ) : (
                        <span className="text-xs text-red-400 font-bold">SEM ACESSO</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-wine-500 dark:text-slate-400">{u.department || '-'}</td>
                  <td className="py-3 px-4 flex gap-2">
                    <button
                      onClick={() => handleOpenUserModal(u)}
                      className="p-1 text-wine-500 hover:text-wine-800 dark:text-slate-400 dark:hover:text-white"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </Table>

            <Modal isOpen={userModal} onClose={() => setUserModal(false)} title={userForm.id ? "Editar Usuário" : "Novo Usuário"}>
              <form onSubmit={handleSaveUser} className="space-y-4">
                <Input
                  label="Nome Completo"
                  value={userForm.name || ''}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={userForm.email || ''}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                />
                <Select
                  label="Departamento"
                  value={userForm.department || ''}
                  onChange={e => setUserForm({ ...userForm, department: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {categories.filter(c => c.type === 'USER').map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </Select>

                <div className="pt-2">
                  <label className="text-xs font-semibold text-wine-600 dark:text-wine-300 uppercase tracking-wider block mb-2">
                    Permissões de Acesso (Páginas)
                  </label>

                  <div className="space-y-4">
                    {/* Admin Checkbox */}
                    <div
                      onClick={() => toggleRole('ADMIN')}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${userForm.roles?.includes('ADMIN') ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-100'}`}
                    >
                      {userForm.roles?.includes('ADMIN') ? (
                        <CheckSquare size={20} className="text-red-600 dark:text-red-400" />
                      ) : (
                        <Square size={20} className="text-gray-400 dark:text-slate-500" />
                      )}
                      <div>
                        <span className="font-bold text-sm text-gray-900 dark:text-white block">Acesso Total (Admin)</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">Pode acessar e configurar tudo.</span>
                      </div>
                    </div>

                    {/* Granular Permissions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          category: 'Financeiro',
                          items: [
                            { id: 'PAYABLES', label: 'Contas a Pagar' },
                            { id: 'RECEIVABLES', label: 'Contas a Receber' },
                            { id: 'BOLETOS', label: 'Boletos' },
                          ]
                        },
                        {
                          category: 'Comercial',
                          items: [
                            { id: 'SALES', label: 'Vendas / PDV' },
                            { id: 'SALES_HISTORY', label: 'Histórico de Vendas' },
                            { id: 'QUOTES', label: 'Orçamentos' },
                            { id: 'CUSTOMERS', label: 'Clientes' },
                          ]
                        },
                        {
                          category: 'Estoque / Produção',
                          items: [
                            { id: 'INVENTORY', label: 'Estoque' },
                            { id: 'PRODUCTION', label: 'Produção' },
                            { id: 'ORDERS', label: 'Encomendas' },
                            { id: 'SUPPLIERS', label: 'Fornecedores' },
                          ]
                        },
                        {
                          category: 'Logística / Geral',
                          items: [
                            { id: 'DELIVERIES', label: 'Entregas' },
                            { id: 'DASHBOARD', label: 'Dashboard' },
                            { id: 'REPORTS', label: 'Relatórios' },
                          ]
                        },
                        {
                          category: 'Sistema',
                          items: [
                            { id: 'IMPORT_EXPORT', label: 'Importar / Exportar' },
                            { id: 'SETTINGS', label: 'Configurações' },
                          ]
                        }
                      ].map((group, idx) => (
                        <div key={idx} className="bg-wine-50 dark:bg-slate-700/30 p-3 rounded-lg border border-wine-100 dark:border-slate-700">
                          <h4 className="text-xs font-bold text-wine-800 dark:text-wine-200 uppercase mb-2 border-b border-wine-200 dark:border-slate-600 pb-1">
                            {group.category}
                          </h4>
                          <div className="space-y-1">
                            {group.items.map(item => {
                              const isSelected = userForm.roles?.includes(item.id as any);
                              const isAdmin = userForm.roles?.includes('ADMIN');
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => !isAdmin && toggleRole(item.id as any)}
                                  className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${isAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:bg-wine-100 dark:hover:bg-slate-600'}`}
                                >
                                  {isSelected || isAdmin ? (
                                    <CheckSquare size={16} className="text-wine-700 dark:text-wine-300" />
                                  ) : (
                                    <Square size={16} className="text-wine-300 dark:text-slate-500" />
                                  )}
                                  <span className={`text-sm ${isSelected || isAdmin ? 'text-wine-900 dark:text-white font-medium' : 'text-wine-500 dark:text-slate-400'}`}>
                                    {item.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-wine-400 mt-2">* Marque as páginas que este usuário pode acessar.</p>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setUserModal(false)}>Cancelar</Button>
                  <Button type="submit">Salvar Usuário</Button>
                </div>
              </form>
            </Modal>
          </div>
        )}

        {/* TAB: ORDERS / RECEIPT */}
        {activeTab === 'ORDERS' && (
          <form onSubmit={handleSaveGeneral} className="max-w-4xl animate-fade-in space-y-6">
            <h3 className="text-lg font-semibold text-wine-900 dark:text-white mb-2">Personalização de Pedidos e Recibos (PDF)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Visual Identity */}
              <div className="space-y-6">
                <Card title="Identidade Visual">
                  <div className="space-y-4">
                    {/* Logo Upload */}
                    <div>
                      <label className="block text-xs font-semibold text-wine-700 dark:text-wine-200 uppercase tracking-wide mb-2">
                        Logotipo da Empresa
                      </label>
                      <div className="flex items-center gap-4">
                        {generalForm.logo ? (
                          <div className="relative w-32 h-32 rounded-lg border border-wine-200 overflow-hidden bg-white flex items-center justify-center">
                            <img src={generalForm.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                            <button
                              type="button"
                              onClick={() => setGeneralForm({ ...generalForm, logo: '' })}
                              className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl shadow-sm hover:bg-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-lg border-2 border-wine-200 border-dashed bg-wine-50 dark:bg-slate-700 flex flex-col items-center justify-center text-wine-400">
                            <ImageIcon size={32} />
                            <span className="text-xs mt-1">Sem Logo</span>
                          </div>
                        )}

                        <div className="flex-1">
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-wine-200 border-dashed rounded-lg cursor-pointer bg-wine-50 hover:bg-wine-100 dark:hover:bg-slate-600 transition-colors">
                            {isUploading ? (
                              <div className="flex flex-col items-center text-wine-500">
                                <Loader2 className="animate-spin mb-1" size={20} />
                                <span className="text-xs">Enviando...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center text-wine-500">
                                <Upload size={24} className="mb-1" />
                                <span className="text-sm font-medium">Carregar Logo</span>
                                <span className="text-xs text-wine-400">PNG, JPG (Max 2MB)</span>
                              </div>
                            )}
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-wine-700 dark:text-wine-200 uppercase tracking-wide mb-1">
                          Cor Primária
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                            value={generalForm.primaryColor || '#1a1a1a'}
                            onChange={e => setGeneralForm({ ...generalForm, primaryColor: e.target.value })}
                          />
                          <span className="text-sm font-mono text-wine-600 dark:text-slate-300">{generalForm.primaryColor}</span>
                        </div>
                        <p className="text-xs text-wine-400 mt-1">Usada em títulos e bordas</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-wine-700 dark:text-wine-200 uppercase tracking-wide mb-1">
                          Cor Secundária
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                            value={generalForm.secondaryColor || '#E5E7EB'}
                            onChange={e => setGeneralForm({ ...generalForm, secondaryColor: e.target.value })}
                          />
                          <span className="text-sm font-mono text-wine-600 dark:text-slate-300">{generalForm.secondaryColor}</span>
                        </div>
                        <p className="text-xs text-wine-400 mt-1">Usada em fundos e detalhes</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column: Content */}
              <div className="space-y-6">
                <Card title="Conteúdo do Documento">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1 w-full">
                      <label className="text-xs font-semibold text-wine-600 dark:text-wine-300 uppercase tracking-wider">Mensagem de Rodapé</label>
                      <textarea
                        className="border border-wine-200 dark:border-slate-600 bg-wine-50 dark:bg-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-wine-500 outline-none h-24 text-black dark:text-white resize-none"
                        value={generalForm.receiptMessage}
                        onChange={e => setGeneralForm({ ...generalForm, receiptMessage: e.target.value })}
                        placeholder="Ex: Agradecemos a preferência."
                      />
                    </div>

                    <div className="flex flex-col gap-1 w-full pt-4 border-t border-wine-100 dark:border-slate-700">
                      <label className="text-xs font-semibold text-wine-600 dark:text-wine-300 uppercase tracking-wider mb-2">Modelo de Impressão de Pedido</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'SIMPLE', label: 'Simples', desc: 'Apenas itens' },
                          { id: 'DETAILED', label: 'Detalhado', desc: 'Com specs' },
                          { id: 'WARRANTY', label: 'Com Garantia', desc: 'Inclui termos' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setGeneralForm({ ...generalForm, orderIssuanceConfig: opt.id as any })}
                            className={`p-3 rounded-lg border text-left transition-all ${generalForm.orderIssuanceConfig === opt.id ? 'border-wine-900 bg-wine-50 ring-1 ring-wine-900 dark:bg-slate-700' : 'border-wine-200 hover:border-wine-400'}`}
                          >
                            <p className="text-xs font-bold text-wine-900 dark:text-white">{opt.label}</p>
                            <p className="text-[10px] text-wine-400">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                      <label className="text-xs font-semibold text-wine-600 dark:text-wine-300 uppercase tracking-wider">Termos e Condições (Opcional)</label>
                      <textarea
                        className="border border-wine-200 dark:border-slate-600 bg-wine-50 dark:bg-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-wine-500 outline-none h-40 text-black dark:text-white"
                        value={generalForm.termsAndConditions || ''}
                        onChange={e => setGeneralForm({ ...generalForm, termsAndConditions: e.target.value })}
                        placeholder="Insira aqui os termos de garantia, prazos de entrega e condições gerais de venda que aparecerão em uma página anexa ou no final do pedido."
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="pt-4 flex justify-end border-t border-wine-200 dark:border-slate-700 mt-6">
              <Button type="submit" className="w-full md:w-auto h-12 px-8 text-lg">
                <CheckSquare className="mr-2" size={20} /> Salvar Personalização
              </Button>
            </div>
          </form>
        )}

        {/* TAB: IMPORT / EXPORT */}
        {activeTab === 'IMPORT_EXPORT' && (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-lg font-semibold text-wine-900 dark:text-white mb-2">Importar / Exportar Planilhas</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Import Card */}
              <Card title="Importar Dados Inteligente">
                <div className="space-y-4">
                  <p className="text-sm text-wine-500 dark:text-wine-400">
                    O sistema tentará identificar automaticamente colunas como "Nome", "Valor", "Vencimento", etc.
                  </p>
                  <Select
                    label="Destino da Importação"
                    value={importModule}
                    onChange={e => setImportModule(e.target.value)}
                  >
                    {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>

                  <div className="border-2 border-dashed border-wine-200 dark:border-slate-700 rounded-lg p-6 text-center hover:bg-wine-50 dark:hover:bg-slate-700/30 transition-colors">
                    <input
                      type="file"
                      accept=".xlsx, .csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="fileUpload"
                    />
                    <label htmlFor="fileUpload" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload className="text-wine-400" size={32} />
                      <span className="text-sm font-medium text-wine-600 dark:text-wine-300">
                        {file ? file.name : 'Clique para selecionar arquivo (.xlsx, .csv)'}
                      </span>
                    </label>
                  </div>

                  {processedData.length > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded text-sm text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                      <span className="font-bold flex items-center gap-2">
                        <Check size={16} /> {processedData.length} registros prontos.
                      </span>
                      <p className="text-xs mt-1 opacity-80">As colunas foram mapeadas automaticamente.</p>
                    </div>
                  )}

                  <Button
                    disabled={processedData.length === 0 || isLoadingImport}
                    onClick={confirmImport}
                    className="w-full"
                  >
                    {isLoadingImport ? 'Processando...' : 'Confirmar Importação'}
                  </Button>

                  {importMessage && (
                    <div className={`p-3 rounded flex items-center gap-2 text-sm ${importMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>
                      {importMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                      {importMessage.text}
                    </div>
                  )}
                </div>
              </Card>

              {/* Export Card */}
              <Card title="Exportar Dados">
                <div className="space-y-4">
                  <p className="text-sm text-wine-500 dark:text-wine-400">Selecione um módulo para baixar todos os registros cadastrados.</p>

                  <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {modules.map(m => (
                      <div key={m.id} className="flex justify-between items-center p-3 border border-wine-100 dark:border-slate-700 rounded-lg bg-wine-50 dark:bg-slate-700/50">
                        <span className="font-medium text-wine-700 dark:text-wine-200 text-xs">{m.name}</span>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => handleExport(m.id, 'csv')} className="text-[10px] px-2 py-1 h-auto">
                            CSV
                          </Button>
                          <Button onClick={() => handleExport(m.id, 'xlsx')} className="text-[10px] px-2 py-1 h-auto bg-green-600 hover:bg-green-700 text-white border-none shadow-none">
                            <Download size={12} className="mr-1" /> Excel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Preview Table */}
            {processedData.length > 0 && (
              <Card title="Pré-visualização (Dados Tratados)">
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] text-wine-500 dark:text-wine-400 mb-2 font-bold uppercase tracking-wider">
                    * Abaixo mostramos como os dados foram interpretados pelo sistema.
                  </div>
                  <div className="overflow-x-auto max-h-60 rounded-lg border border-wine-100 dark:border-slate-700">
                    <table className="w-full text-[10px] text-left">
                      <thead className="sticky top-0 bg-wine-100 dark:bg-slate-700">
                        <tr>
                          {processedData[0] && Object.keys(processedData[0]).slice(1, 8).map(key => (
                            <th key={key} className="p-2 border-b border-wine-200 dark:border-slate-600 capitalize text-wine-800 dark:text-white font-black">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {processedData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="border-b border-wine-100 dark:border-slate-800 hover:bg-wine-50 dark:hover:bg-slate-700/50 bg-white dark:bg-slate-800 font-medium">
                            {Object.entries(row).slice(1, 8).map(([key, val], i) => (
                              <td key={i} className="p-2 truncate max-w-[150px] dark:text-slate-300">
                                {key.includes('amount') || key.includes('price') || key.includes('cost') || key.includes('total')
                                  ? formatCurrency(Number(val || 0))
                                  : String(val)
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="text-center p-2 text-[10px] text-wine-400 bg-wine-50 dark:bg-slate-700 font-bold uppercase tracking-widest">
                      Mostrando as primeiras 5 linhas de prévia...
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
        {/* TAB: FEES */}
        {activeTab === 'FEES' && (
          <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-wine-50 dark:bg-slate-700/50 p-4 rounded-lg border border-wine-100 dark:border-slate-700 h-fit">
                <h3 className="text-sm font-bold text-wine-900 dark:text-white mb-3 uppercase tracking-wide">Configurar Nova Taxa</h3>
                <div className="space-y-4">
                  <Select
                    label="Tipo / Parcelas"
                    value={feeForm.installments}
                    onChange={e => setFeeForm({ ...feeForm, installments: Number(e.target.value) })}
                  >
                    <option value={0}>Débito</option>
                    <option value={1}>Crédito à Vista</option>
                    {[...Array(20)].map((_, i) => (
                      <option key={i + 2} value={i + 2}>Crédito {i + 2}x</option>
                    ))}
                  </Select>
                  <Input
                    label="Porcentagem da Taxa (%)"
                    type="number"
                    step="0.01"
                    value={feeForm.percentage}
                    onChange={e => setFeeForm({ ...feeForm, percentage: Number(e.target.value) })}
                    placeholder="Ex: 2.50"
                  />
                  <Button
                    className="w-full"
                    disabled={isSavingFee}
                    onClick={async () => {
                      if (feeForm.percentage === undefined) return;
                      setIsSavingFee(true);
                      const existing = cardFees.find(f => f.installments === feeForm.installments);
                      if (existing) {
                        await updateCardFee({ ...existing, percentage: feeForm.percentage });
                      } else {
                        await addCardFee({
                          id: getUUID(),
                          installments: feeForm.installments || 0,
                          percentage: feeForm.percentage
                        });
                      }
                      setIsSavingFee(false);
                    }}
                  >
                    {isSavingFee ? <Loader2 className="animate-spin" size={18} /> : (cardFees.find(f => f.installments === feeForm.installments) ? 'Atualizar Taxa' : 'Salvar Taxa')}
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-semibold text-wine-900 dark:text-white">Taxas Cadastradas</h3>
                <Table headers={['Descrição', 'Taxa (%)', 'Ações']}>
                  {cardFees.sort((a, b) => a.installments - b.installments).map(fee => (
                    <tr key={fee.id} className="hover:bg-wine-50 dark:hover:bg-slate-700/50">
                      <td className="py-3 px-4 font-medium text-wine-900 dark:text-white">
                        {fee.installments === 0 ? 'Débito' : fee.installments === 1 ? 'Crédito à Vista' : `Crédito ${fee.installments}x`}
                      </td>
                      <td className="py-3 px-4 text-wine-600 dark:text-slate-300">
                        {fee.percentage.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 flex gap-2">
                        <button
                          onClick={() => setFeeForm({ installments: fee.installments, percentage: fee.percentage })}
                          className="p-1 text-wine-500 hover:text-wine-800 dark:text-slate-400 dark:hover:text-white"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Excluir esta taxa?')) {
                              deleteCardFee(fee.id);
                            }
                          }}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cardFees.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-wine-400 dark:text-slate-500 italic">
                        Nenhuma taxa configurada ainda.
                      </td>
                    </tr>
                  )}
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
