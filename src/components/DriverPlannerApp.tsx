import React, { useState, useEffect } from 'react';
import { useDriver } from '../context/DriverContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav, MainTabType } from './BottomNav';
import { DashboardView } from './DashboardView';
import { PlannerView } from './PlannerView';
import { RideAnalyzerView } from './RideAnalyzerView';
import { VehicleCostView } from './VehicleCostView';
import { GoalsView } from './GoalsView';
import { ReportsView } from './ReportsView';
import { InsightsView } from './InsightsView';
import { SettingsView } from './SettingsView';
import { ShiftModal } from './ShiftModal';
import { QuickAddModal } from './QuickAddModal';
import { AlertsModal } from './AlertsModal';
import { MoreMenuModal } from './MoreMenuModal';
import { FuelAdvisorModal } from './FuelAdvisorModal';
import { DriverVoiceModal } from './DriverVoiceModal';
import { DriverModeView } from './DriverModeView';
import { PWAInstallBanner } from './PWAInstallBanner';
import { Mic, Sparkles } from 'lucide-react';

export const DriverPlannerApp: React.FC = () => {
  const { activeSession, isDemoData } = useDriver();

  const [activeTab, setActiveTab] = useState<MainTabType>('dashboard');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showFuelAdvisorModal, setShowFuelAdvisorModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showDriverMode, setShowDriverMode] = useState(false);
  const [quickAddInitialTab, setQuickAddInitialTab] = useState<'earning' | 'ride' | 'fuel' | 'expense' | 'maintenance'>('earning');
  const [quickAddFuelData, setQuickAddFuelData] = useState<{ liters?: number; pricePerLiter?: number; totalAmount?: number; fuelType?: string } | undefined>(undefined);

  // Handle PWA shortcuts from URL (e.g. /?tab=driver-mode or /?action=add-earning)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const actionParam = params.get('action');

    if (tabParam === 'driver-mode') {
      setShowDriverMode(true);
    } else if (tabParam === 'planner') {
      setActiveTab('planner');
    } else if (tabParam === 'ride-analyzer' || tabParam === 'analyzer') {
      setActiveTab('analyzer');
    } else if (tabParam === 'reports') {
      setActiveTab('reports');
    } else if (tabParam === 'goals') {
      setActiveTab('goals');
    } else if (tabParam === 'vehicle') {
      setActiveTab('vehicle');
    } else if (tabParam === 'settings') {
      setActiveTab('settings');
    }

    if (actionParam === 'add-earning') {
      handleOpenQuickAdd('earning');
    } else if (actionParam === 'add-fuel') {
      handleOpenQuickAdd('fuel');
    } else if (actionParam === 'voice') {
      setShowVoiceModal(true);
    }
  }, []);

  const handleOpenQuickAdd = (
    tab: 'earning' | 'ride' | 'fuel' | 'expense' | 'maintenance' = 'earning',
    fuelData?: { liters?: number; pricePerLiter?: number; totalAmount?: number; fuelType?: string }
  ) => {
    setQuickAddInitialTab(tab);
    setQuickAddFuelData(fuelData);
    setShowQuickAddModal(true);
  };

  const handleOpenFuelWithPreFill = (liters: number, price: number, total: number, fuelType: string) => {
    handleOpenQuickAdd('fuel', {
      liters,
      pricePerLiter: price,
      totalAmount: total,
      fuelType,
    });
  };

  return (
    <div
      className="min-h-screen text-slate-100 font-sans antialiased pb-24 md:pb-8 selection:bg-emerald-500 selection:text-slate-950 relative"
      style={{
        background: 'radial-gradient(circle at 10% 20%, #064e3b 0%, #020617 40%), radial-gradient(circle at 90% 80%, #1e1b4b 0%, #020617 50%)',
        minHeight: '100vh',
      }}
    >
      {/* NAVBAR FIXA NO TOPO */}
      <Navbar
        onOpenShiftModal={() => setShowShiftModal(true)}
        onOpenQuickModal={() => handleOpenQuickAdd('earning')}
        onOpenAlertsModal={() => setShowAlertsModal(true)}
        onOpenFuelAdvisorModal={() => setShowFuelAdvisorModal(true)}
        onOpenVoiceModal={() => setShowVoiceModal(true)}
        onOpenDriverMode={() => setShowDriverMode(true)}
      />

      {/* CONTAINER PRINCIPAL */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 px-4 sm:px-6 pt-5">
        
        {/* SIDEBAR DESKTOP */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenVoiceModal={() => setShowVoiceModal(true)}
          onOpenDriverMode={() => setShowDriverMode(true)}
        />

        {/* ÁREA DE VISUALIZAÇÃO PRINCIPAL */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenShiftModal={() => setShowShiftModal(true)}
              onOpenQuickModal={() => handleOpenQuickAdd('earning')}
              onNavigateTab={(tab) => setActiveTab(tab as MainTabType)}
              onOpenFuelAdvisorModal={() => setShowFuelAdvisorModal(true)}
              onOpenQuickFuel={() => handleOpenQuickAdd('fuel')}
            />
          )}

          {activeTab === 'planner' && (
            <PlannerView
              onOpenFuelAdvisor={() => setShowFuelAdvisorModal(true)}
              onOpenQuickModal={handleOpenQuickAdd}
              onOpenShiftModal={() => setShowShiftModal(true)}
            />
          )}

          {activeTab === 'analyzer' && <RideAnalyzerView />}

          {activeTab === 'vehicle' && (
            <VehicleCostView onOpenFuelAdvisor={() => setShowFuelAdvisorModal(true)} />
          )}

          {activeTab === 'goals' && <GoalsView />}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'insights' && <InsightsView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* BOTÃO FLUTUANTE DE VOZ (DRIVER VOICE FAB) */}
      <button
        type="button"
        onClick={() => setShowVoiceModal(true)}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all group ring-4 ring-emerald-500/20"
        title="Driver Voice: Comandos de Voz Naturais (🎙️)"
      >
        <Mic className="w-6 h-6 stroke-[2.5] group-hover:scale-110 transition-transform" />
        <span className="absolute -top-8 right-0 bg-slate-900/90 backdrop-blur-md text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
          Driver Voice 🎙️
        </span>
      </button>

      {/* NAVEGAÇÃO INFERIOR MOBILE */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenQuickModal={() => handleOpenQuickAdd('earning')}
        onOpenMoreMenu={() => setShowMoreMenu(true)}
      />

      {/* MODAL EXPEDIENTE (INICIAR / CRONÔMETRO AO VIVO / ENCERRAR) */}
      <ShiftModal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
      />

      {/* MODAL LANÇAMENTO RÁPIDO (5 BOTÕES DE 1 TOQUE: GANHO, CORRIDA, POSTO, DESPESA, REVISÃO) */}
      <QuickAddModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        initialTab={quickAddInitialTab}
        initialFuelData={quickAddFuelData}
      />

      {/* MODAL CONSULTOR DE ABASTECIMENTO DO DIA ("DEVO ABASTECER HOJE?") */}
      <FuelAdvisorModal
        isOpen={showFuelAdvisorModal}
        onClose={() => setShowFuelAdvisorModal(false)}
        onOpenQuickFuelWithData={handleOpenFuelWithPreFill}
      />

      {/* MODAL CENTRAL DE ALERTAS */}
      <AlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
      />

      {/* MODAL DRIVER VOICE (COMANDOS DE VOZ NATURAIS) */}
      <DriverVoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onOpenDriverMode={() => {
          setShowVoiceModal(false);
          setShowDriverMode(true);
        }}
      />

      {/* VIEW MODO MOTORISTA (COCKPIT ULTRA-SIMPLIFICADO DE DIREÇÃO) */}
      {showDriverMode && (
        <DriverModeView
          onExitDriverMode={() => setShowDriverMode(false)}
          onOpenVoiceModal={() => {
            setShowDriverMode(false);
            setShowVoiceModal(true);
          }}
          onOpenShiftModal={() => {
            setShowDriverMode(false);
            setShowShiftModal(true);
          }}
        />
      )}

      {/* MODAL MENU MOBILE EXPANDIDO ("MAIS") */}
      <MoreMenuModal
        isOpen={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        onSelectTab={setActiveTab}
        onOpenAlerts={() => {
          setShowMoreMenu(false);
          setShowAlertsModal(true);
        }}
        onOpenFuelAdvisor={() => {
          setShowMoreMenu(false);
          setShowFuelAdvisorModal(true);
        }}
        onOpenVoiceModal={() => {
          setShowMoreMenu(false);
          setShowVoiceModal(true);
        }}
        onOpenDriverMode={() => {
          setShowMoreMenu(false);
          setShowDriverMode(true);
        }}
      />

      {/* PWA INSTALL & OFFLINE BANNER */}
      <PWAInstallBanner />
    </div>
  );
};


