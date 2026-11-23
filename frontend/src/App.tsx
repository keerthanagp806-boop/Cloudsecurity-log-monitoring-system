import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { EventsPage } from './pages/EventsPage';
import { AlertsPage } from './pages/AlertsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { RulesPage } from './pages/RulesPage';
import { IngestionPage } from './pages/IngestionPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { api } from './services/api';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [criticalAlertsCount, setCriticalAlertsCount] = useState<number>(0);
  const [totalAlertsCount, setTotalAlertsCount] = useState<number>(0);
  const [openIncidentsCount, setOpenIncidentsCount] = useState<number>(0);

  const fetchBadgeCounts = async () => {
    try {
      const summary = await api.getDashboardSummary();
      setCriticalAlertsCount(summary.critical_alerts || 0);
      setOpenIncidentsCount(summary.open_incidents || 0);
      const alerts = await api.getAlerts();
      setTotalAlertsCount(alerts.length);
    } catch (err) {
      console.warn('Badge metrics sync:', err);
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 15000); // 15s polling
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      <Navbar
        onRefresh={fetchBadgeCounts}
        criticalCount={criticalAlertsCount}
        onNavigateToTab={setActiveTab}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          alertCount={totalAlertsCount}
          incidentCount={openIncidentsCount}
        />

        <main className="flex-1 overflow-y-auto bg-[#0b0f19] pb-12">
          {activeTab === 'overview' && <DashboardPage onNavigateTab={setActiveTab} />}
          {activeTab === 'events' && <EventsPage />}
          {activeTab === 'alerts' && <AlertsPage onNavigateTab={setActiveTab} />}
          {activeTab === 'incidents' && <IncidentsPage />}
          {activeTab === 'rules' && <RulesPage />}
          {activeTab === 'ingestion' && <IngestionPage onNavigateTab={setActiveTab} />}
          {activeTab === 'analytics' && <AnalyticsPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'audit' && <AuditPage />}
          {activeTab === 'ai_assistant' && <AIAssistantPage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
