import React, { useState, useEffect } from 'react';
import { useIsMobile } from './hooks/useIsMobile';
import { AppProvider, useAppStore } from './store';
import { AppView } from './types';
import { Dashboard } from './pages/Dashboard';
import { Financial } from './pages/Financial';
import { Inventory } from './pages/Inventory';
import { Sales } from './pages/Sales';
import { Customers } from './pages/Customers';
import { Settings as SettingsPage } from './pages/Settings';
import { Production } from './pages/Production';
import { Deliveries } from './pages/Deliveries';
import { Suppliers } from './pages/Suppliers';
import { Reports } from './pages/Reports';
import { SalesHistory } from './pages/SalesHistory';
import { Orders } from './pages/Orders';
import { Modules } from './pages/Modules';

import { Quotes } from './pages/Quotes';
import { applyThemeColors } from './lib/utils';
import {
  LayoutDashboard,
  ArrowUpCircle,
  ArrowDownCircle,
  ShoppingBag,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Truck,
  Settings,
  LogOut,
  Menu,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Wrench,
  Moon,
  Sun,
  TrendingUp,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  History,
  RefreshCcw
} from 'lucide-react';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useAppStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 flex flex-col items-end pointer-events-none print:hidden">
      {notifications.map(n => (
        <div
          key={n.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 animate-slide-in-right
            ${n.type === 'success' ? 'bg-emerald-600' : n.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}
          `}
        >
          {n.type === 'success' && <CheckCircle size={18} />}
          {n.type === 'error' && <AlertCircle size={18} />}
          {n.type === 'info' && <Info size={18} />}
          <span className="text-sm font-medium">{n.message}</span>
          <button onClick={() => removeNotification(n.id)} className="ml-2 hover:bg-white/20 p-1 rounded">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};


import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';

const AppContent: React.FC = () => {
  const { currentView, navigateTo, darkMode, toggleDarkMode, companySettings, users, isInitialized, refreshData, addNotification } = useAppStore();
  const { user, loading, signOut } = useAuth(); // Use Auth Context
  const isMobile = useIsMobile();
  const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  const [hasSelectedModule, setHasSelectedModule] = useState(() => {
    return localStorage.getItem('ROYAL_HOME_MODULE_SELECTED') === 'true';
  });

  const updateHasSelectedModule = (val: boolean) => {
    setHasSelectedModule(val);
    if (val) {
      localStorage.setItem('ROYAL_HOME_MODULE_SELECTED', 'true');
    } else {
      localStorage.removeItem('ROYAL_HOME_MODULE_SELECTED');
    }
  };

  // Apply theme colors whenever company settings change
  React.useEffect(() => {
    if (companySettings?.primaryColor || companySettings?.secondaryColor) {
      applyThemeColors(companySettings.primaryColor, companySettings.secondaryColor);
    }
  }, [companySettings.primaryColor, companySettings.secondaryColor]);

  React.useEffect(() => {
    document.title = companySettings?.name || 'Gestão Pro Master';
  }, [companySettings?.name]);

  // Estado para controlar quais categorias estão expandidas
  const [expandedSections, setExpandedSections] = useState({
    geral: true,
    financeiro: true,
    comercial: true,
    operacao: true,
    sistema: true
  });

  if (loading || !isInitialized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-wine-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-700"></div>
          <p className="text-wine-800 dark:text-wine-100 font-medium animate-pulse">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!hasSelectedModule) {
    return (
      <Modules 
        onSelectModule={(view) => {
          navigateTo(view);
          updateHasSelectedModule(true);
        }} 
      />
    );
  }

  // --- PERMISSION LOGIC ---
  const currentUserProfile = users.find(u => u.email === user.email);
  const userRoles = currentUserProfile?.roles || [];

  // If no profile found (or no roles), default to NO ACCESS (except maybe Dashboard if desired, currently strict)
  // For safety during dev, if user is the very first one or specific email, maybe allow?
  // But strictly following user Request: "only selected".
  // Note: currentUserProfile might be undefined if syncing hasn't happened yet or email doesn't match.

  const hasAccess = (view: AppView): boolean => {
    if (userRoles.includes('ADMIN')) return true;
    return userRoles.includes(view);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleNavigate = (view: AppView) => {
    if (hasAccess(view)) {
      navigateTo(view);
      if (isMobile) {
        setSidebarOpen(false);
        setMobileDrawerOpen(false);
      }
    } else {
      alert('Acesso Negado: Você não tem permissão para acessar este módulo.');
    }
  };

  // Simple Router Switch with Permission Check
  const renderView = () => {
    if (!hasAccess(currentView)) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-wine-800 dark:text-slate-300">
          <div className="bg-red-100 dark:bg-red-900/20 p-6 rounded-full mb-4">
            <LogOut size={48} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-center max-w-md">
            Você não tem permissão para acessar o módulo <strong>{currentView}</strong>.
            Entre em contato com o administrador do sistema.
          </p>
          <button
            onClick={() => navigateTo('DASHBOARD')}
            className="mt-6 px-6 py-2 bg-wine-900 text-white rounded-lg hover:bg-wine-800 transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      );
    }

    switch (currentView) {
      case 'DASHBOARD': return <Dashboard />;
      case 'PAYABLES': return <Financial type="PAYABLES" />;
      case 'RECEIVABLES': return <Financial type="RECEIVABLES" />;
      case 'BOLETOS': return <Financial type="BOLETOS" />;
      case 'SALES': return <Sales />;
      case 'SALES_HISTORY': return <SalesHistory />;
      case 'INVENTORY': return <Inventory />;
      case 'CUSTOMERS': return <Customers />;
      case 'PRODUCTION': return <Production />;
      case 'DELIVERIES': return <Deliveries />;
      case 'SETTINGS': return <SettingsPage />;
      case 'SUPPLIERS': return <Suppliers />;
      case 'REPORTS': return <Reports />;
      case 'QUOTES': return <Quotes />;
      case 'ORDERS': return <Orders />;
      default: return <Dashboard />;
    }
  };

  const NavItem = ({ view, icon, label }: { view: AppView, icon: React.ReactNode, label: string }) => {
    if (!hasAccess(view)) return null;

    return (
      <button
        onClick={() => handleNavigate(view)}
        className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-lg transition-colors ${currentView === view ? 'text-white shadow-lg' : 'text-wine-100 hover:bg-white/10'}`}
        style={currentView === view ? { backgroundColor: companySettings.primaryColor } : undefined}
        title={!isSidebarOpen ? label : undefined}
      >
        <div className="shrink-0">{icon}</div>
        {isSidebarOpen && <span className="font-medium truncate">{label}</span>}
      </button>
    );
  };

  const NavCategoryBtn = ({ title, isOpen, onClick, children }: { title: string, isOpen: boolean, onClick: () => void, children?: React.ReactNode }) => {
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center'} py-2 text-xs font-semibold text-wine-300 uppercase tracking-wider hover:text-white transition-colors focus:outline-none mb-1 mt-4 first:mt-2`}
        title={!isSidebarOpen ? title : undefined}
      >
        {isSidebarOpen ? (
          <>
            <span>{title}</span>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </>
        ) : (
          <div className="w-4 h-px bg-wine-700 rounded-full" />
        )}
      </button>
    );
  };

  // Helper to check if a section should be visible
  const hasSectionAccess = (views: AppView[]) => views.some(v => hasAccess(v));

  const MobileBottomNav = () => {
    const navItems: { view: AppView; icon: React.ReactNode; label: string }[] = [
      { view: 'DASHBOARD', icon: <LayoutDashboard size={22} />, label: 'Início' },
      { view: 'SALES', icon: <ShoppingCart size={22} />, label: 'Vendas' },
      { view: 'PRODUCTION', icon: <Wrench size={22} />, label: 'Produção' },
    ];

    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shadow-[0_-2px_20px_rgba(0,0,0,0.08)] z-40 pb-safe transition-colors duration-200">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.filter(item => hasAccess(item.view)).map(item => (
            <button
              key={item.view}
              onClick={() => handleNavigate(item.view)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 ${
                currentView === item.view
                  ? 'text-wine-900 dark:text-white'
                  : 'text-gray-400 dark:text-slate-500'
              }`}
            >
              <div className={`transition-all duration-200 ${currentView === item.view ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-bold tracking-tight ${currentView === item.view ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
              {currentView === item.view && (
                <div className="absolute bottom-1 w-5 h-0.5 rounded-full bg-wine-900 dark:bg-white" />
              )}
            </button>
          ))}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-gray-400 dark:text-slate-500 transition-colors"
          >
            <Menu size={22} />
            <span className="text-[10px] font-bold tracking-tight opacity-60">Menu</span>
          </button>
        </div>
      </div>
    );
  };

  // Full-screen mobile drawer menu
  const MobileDrawer = () => {
    const allNavItems: { view: AppView; icon: React.ReactNode; label: string; section: string }[] = [
      { view: 'DASHBOARD', icon: <LayoutDashboard size={22} />, label: 'Dashboard', section: 'Geral' },
      { view: 'REPORTS', icon: <TrendingUp size={22} />, label: 'Relatórios', section: 'Geral' },
      { view: 'PAYABLES', icon: <ArrowDownCircle size={22} />, label: 'Contas a Pagar', section: 'Financeiro' },
      { view: 'RECEIVABLES', icon: <ArrowUpCircle size={22} />, label: 'Contas a Receber', section: 'Financeiro' },
      { view: 'BOLETOS', icon: <FileText size={22} />, label: 'Boletos', section: 'Financeiro' },
      { view: 'SALES', icon: <ShoppingCart size={22} />, label: 'Vendas / PDV', section: 'Comercial' },
      { view: 'SALES_HISTORY', icon: <History size={22} />, label: 'Histórico de Vendas', section: 'Comercial' },
      { view: 'QUOTES', icon: <FileSpreadsheet size={22} />, label: 'Orçamentos', section: 'Comercial' },
      { view: 'CUSTOMERS', icon: <UserCheck size={22} />, label: 'Clientes', section: 'Comercial' },
      { view: 'INVENTORY', icon: <Package size={22} />, label: 'Estoque', section: 'Operação' },
      { view: 'PRODUCTION', icon: <Wrench size={22} />, label: 'Produção', section: 'Operação' },
      { view: 'SUPPLIERS', icon: <Users size={22} />, label: 'Fornecedores', section: 'Operação' },
      { view: 'ORDERS', icon: <Package size={22} />, label: 'Encomendas', section: 'Operação' },
      { view: 'DELIVERIES', icon: <Truck size={22} />, label: 'Entregas', section: 'Operação' },
      { view: 'SETTINGS', icon: <Settings size={22} />, label: 'Configurações', section: 'Sistema' },
    ];

    const accessibleItems = allNavItems.filter(item => hasAccess(item.view));
    const sections = [...new Set(accessibleItems.map(item => item.section))];

    return (
      <>
        <div
          className={`mobile-drawer-overlay ${isMobileDrawerOpen ? 'open' : ''}`}
          onClick={() => setMobileDrawerOpen(false)}
        />
        <div className={`mobile-drawer ${isMobileDrawerOpen ? 'open' : ''} dark:bg-slate-900`}>
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg" style={{ backgroundColor: companySettings.primaryColor }}>
                {companySettings.name?.charAt(0) || 'G'}
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">{companySettings.name}</h2>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-gray-500"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {sections.map(section => (
              <div key={section}>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 px-3 mb-2">{section}</p>
                <div className="space-y-1">
                  {accessibleItems.filter(item => item.section === section).map(item => (
                    <button
                      key={item.view}
                      onClick={() => handleNavigate(item.view)}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all text-left ${
                        currentView === item.view
                          ? 'bg-gray-900 dark:bg-slate-700 text-white font-bold shadow-md'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`${currentView === item.view ? 'text-white' : 'text-gray-400 dark:text-slate-500'}`}>
                        {item.icon}
                      </div>
                      <span className="text-[15px] font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-3 px-4 py-2">
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-3 text-gray-600 dark:text-slate-300"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                <span className="text-sm font-medium">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
              </button>
            </div>
            <button
              onClick={() => {
                updateHasSelectedModule(false);
                signOut();
                setMobileDrawerOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            >
              <LogOut size={20} />
              <span className="text-sm font-bold">Sair</span>
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${darkMode ? 'dark' : ''} print:h-auto print:overflow-visible theme-colors`}
      style={{
        '--company-primary': companySettings.primaryColor || '#1a1a1a',
        '--company-secondary': companySettings.secondaryColor || '#E5E7EB'
      } as React.CSSProperties}
    >
      <NotificationContainer />

      {/* Desktop Sidebar - hidden on mobile */}
      {!isMobile && (
        <aside
          className={`${isSidebarOpen ? 'w-64' : 'w-20'} relative h-full theme-bg-primary text-white transition-all duration-300 ease-in-out flex flex-col shadow-xl print:hidden`}
        >
          <button 
            onClick={() => updateHasSelectedModule(false)}
            className={`p-6 border-b theme-border-primary flex items-center ${isSidebarOpen ? 'gap-3 justify-start' : 'justify-center'} hover:opacity-90 transition duration-200 text-left w-full focus:outline-none`}
          >
            <TrendingUp className="w-8 h-8 text-white shrink-0" />
            {isSidebarOpen && (
              <span className="text-xl font-bold tracking-tight truncate" title={companySettings.name}>
                {companySettings.name}
              </span>
            )}
          </button>

          <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {/* GERAL */}
            {hasSectionAccess(['DASHBOARD', 'REPORTS']) && (
              <div>
                <NavCategoryBtn
                  title="Geral"
                  isOpen={expandedSections.geral}
                  onClick={() => toggleSection('geral')}
                />
                {(expandedSections.geral || !isSidebarOpen) && (
                  <div className="space-y-1 animate-fade-in-down">
                    <NavItem view="DASHBOARD" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                    <NavItem view="REPORTS" icon={<TrendingUp size={20} />} label="Relatórios" />
                  </div>
                )}
              </div>
            )}

            {/* FINANCEIRO */}
            {hasSectionAccess(['PAYABLES', 'RECEIVABLES', 'BOLETOS']) && (
              <div>
                <NavCategoryBtn
                  title="Financeiro"
                  isOpen={expandedSections.financeiro}
                  onClick={() => toggleSection('financeiro')}
                />
                {(expandedSections.financeiro || !isSidebarOpen) && (
                  <div className="space-y-1 animate-fade-in-down">
                    <NavItem view="PAYABLES" icon={<ArrowDownCircle size={20} />} label="Contas a Pagar" />
                    <NavItem view="RECEIVABLES" icon={<ArrowUpCircle size={20} />} label="Contas a Receber" />
                    <NavItem view="BOLETOS" icon={<FileText size={20} />} label="Boletos" />
                  </div>
                )}
              </div>
            )}

            {/* COMERCIAL */}
            {hasSectionAccess(['SALES', 'SALES_HISTORY', 'QUOTES', 'CUSTOMERS']) && (
              <div>
                <NavCategoryBtn
                  title="Comercial"
                  isOpen={expandedSections.comercial}
                  onClick={() => toggleSection('comercial')}
                />
                {(expandedSections.comercial || !isSidebarOpen) && (
                  <div className="space-y-1 animate-fade-in-down">
                    <NavItem view="SALES" icon={<ShoppingCart size={20} />} label="Vendas / PDV" />
                    <NavItem view="SALES_HISTORY" icon={<History size={20} />} label="Histórico de Vendas" />
                    <NavItem view="QUOTES" icon={<FileSpreadsheet size={20} />} label="Orçamentos" />
                    <NavItem view="CUSTOMERS" icon={<UserCheck size={20} />} label="Clientes" />
                  </div>
                )}
              </div>
            )}

            {/* OPERAÇÃO */}
            {hasSectionAccess(['INVENTORY', 'PRODUCTION', 'SUPPLIERS', 'ORDERS', 'DELIVERIES']) && (
              <div>
                <NavCategoryBtn
                  title="Operação"
                  isOpen={expandedSections.operacao}
                  onClick={() => toggleSection('operacao')}
                />
                {(expandedSections.operacao || !isSidebarOpen) && (
                  <div className="space-y-1 animate-fade-in-down">
                    <NavItem view="INVENTORY" icon={<Package size={20} />} label="Estoque" />
                    <NavItem view="PRODUCTION" icon={<Wrench size={20} />} label="Produção" />
                    <NavItem view="SUPPLIERS" icon={<Users size={20} />} label="Fornecedores" />
                    <NavItem view="ORDERS" icon={<Package size={20} />} label="Encomendas" />
                    <NavItem view="DELIVERIES" icon={<Truck size={20} />} label="Entregas" />
                  </div>
                )}
              </div>
            )}

            {/* SISTEMA */}
            {hasSectionAccess(['IMPORT_EXPORT', 'SETTINGS']) && (
              <div>
                <NavCategoryBtn
                  title="Sistema"
                  isOpen={expandedSections.sistema}
                  onClick={() => toggleSection('sistema')}
                />
                {(expandedSections.sistema || !isSidebarOpen) && (
                  <div className="space-y-1 animate-fade-in-down">
                    <NavItem view="SETTINGS" icon={<Settings size={20} />} label="Configurações" />
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-wine-800">
            {isSidebarOpen && (
              <div className="px-4 py-2 mb-2 text-xs text-wine-300">
                <span className="opacity-75">Acesso: </span>
                <span className="font-bold text-white uppercase">{userRoles.join(', ') || 'Sem Função'}</span>
              </div>
            )}
            <button
              onClick={() => {
                updateHasSelectedModule(false);
                signOut();
              }}
              className={`flex items-center ${isSidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-2 text-wine-200 hover:text-white hover:bg-wine-800 rounded-lg transition-colors w-full`}
              title={!isSidebarOpen ? 'Sair' : undefined}
            >
              <LogOut size={20} className="shrink-0" />
              {isSidebarOpen && <span>Sair</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden print:overflow-visible print:h-auto">
        {/* Topbar */}
        <header className={`${isMobile ? 'h-14 px-4' : 'h-16 px-6'} theme-bg-secondary border-b theme-border-primary flex items-center justify-between shadow-sm z-20 transition-colors duration-200 print:hidden`}>
          {isMobile ? (
            /* Mobile Topbar - simplified */
            <>
              <button
                onClick={() => updateHasSelectedModule(false)}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: companySettings.primaryColor }}>
                  {companySettings.name?.charAt(0) || 'G'}
                </div>
                <span className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[140px]">{companySettings.name}</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    refreshData();
                    addNotification('Sincronizando dados...', 'info');
                  }}
                  className="p-2 rounded-full text-gray-500 dark:text-slate-400"
                >
                  <RefreshCcw size={18} />
                </button>
              </div>
            </>
          ) : (
            /* Desktop Topbar - full */
            <>
              <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="theme-text-primary dark:text-wine-100 hover:opacity-80 transition-colors focus:outline-none" title="Alternar Menu">
                <Menu size={24} />
              </button>

              <div className="flex items-center gap-4 ml-auto">
                <button
                  onClick={() => {
                    refreshData();
                    addNotification('Sincronizando dados...', 'info');
                  }}
                  className="p-2 rounded-full hover:bg-wine-50 dark:hover:bg-slate-700 text-wine-600 dark:text-wine-100 transition-all hover:rotate-180 duration-500"
                  title="Sincronizar Dados"
                >
                  <RefreshCcw size={20} />
                </button>

                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-slate-700 text-wine-600 dark:text-yellow-400 transition-colors"
                  title="Alternar Tema"
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-wine-900 dark:text-white">{user.email}</p>
                  <p className="text-xs text-wine-500 dark:text-slate-400">
                    {currentUserProfile?.department || 'Usuário'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-wine-100 dark:bg-slate-700 text-wine-900 dark:text-wine-100 rounded-full flex items-center justify-center font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              </div>
            </>
          )}
        </header>

        {/* View Area */}
        <main className={`flex-1 overflow-y-auto ${isMobile ? 'p-3 pb-20' : 'p-6'} theme-bg-secondary dark:bg-slate-900 transition-colors duration-200 print:overflow-visible print:h-auto print:p-0`}>
          <div className={`${isMobile ? '' : 'max-w-7xl mx-auto'} animate-fade-in h-full`}>
            {renderView()}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        {isMobile && <MobileBottomNav />}
      </div>

      {/* Mobile Drawer */}
      {isMobile && <MobileDrawer />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
};

export default App;