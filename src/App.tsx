/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  getDocuments,
  getRepairs,
  getLicenseTypes,
  getLicenseApplications,
  getDutyRosters,
  getEvents,
  getMaterials,
  getMaterialTransactions,
  getMaterialCategories,
  getDivisions,
  getCmsSettings,
  getUsers,
  getPdpaLogs,
  subscribeStorage,
} from './db/storage';
import {
  EDocument,
  RepairItem,
  LicenseTypeConfig,
  LicenseApplication,
  DutyRosterEntry,
  OrganizationEvent,
  MaterialItem,
  MaterialTransaction,
  MaterialCategory,
  Division,
  CmsSettings,
  User,
  PdpaAccessLog,
} from './types';

// Layout
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';

// Modules
import { PublicPortal } from './components/modules/public/PublicPortal';
import { DashboardOverview } from './components/modules/dashboard/DashboardOverview';
import { EDocumentModule } from './components/modules/edocument/EDocumentModule';
import { RepairModule } from './components/modules/repair/RepairModule';
import { LicenseModule } from './components/modules/license/LicenseModule';
import { CalendarModule } from './components/modules/calendar/CalendarModule';
import { InventoryModule } from './components/modules/inventory/InventoryModule';
import { AdminManagement } from './components/modules/admin/AdminManagement';

// Modals
import { LoginModal } from './components/modules/auth/LoginModal';
import { ProfileModal } from './components/modules/profile/ProfileModal';

function MainApp() {
  const { currentUser, isAuthenticated } = useAuth();

  // Mode: Public Portal vs Intranet
  const [isPublicMode, setIsPublicMode] = useState<boolean>(!isAuthenticated);

  // Active navigation tab inside Intranet
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Reactive DB States
  const [documents, setDocuments] = useState<EDocument[]>(getDocuments());
  const [repairs, setRepairs] = useState<RepairItem[]>(getRepairs());
  const [licenseTypes, setLicenseTypes] = useState<LicenseTypeConfig[]>(getLicenseTypes());
  const [licenseApps, setLicenseApps] = useState<LicenseApplication[]>(getLicenseApplications());
  const [dutyRosters, setDutyRosters] = useState<DutyRosterEntry[]>(getDutyRosters());
  const [events, setEvents] = useState<OrganizationEvent[]>(getEvents());
  const [materials, setMaterials] = useState<MaterialItem[]>(getMaterials());
  const [materialTxs, setMaterialTxs] = useState<MaterialTransaction[]>(getMaterialTransactions());
  const [materialCats, setMaterialCats] = useState<MaterialCategory[]>(getMaterialCategories());
  const [divisions, setDivisions] = useState<Division[]>(getDivisions());
  const [cms, setCms] = useState<CmsSettings>(getCmsSettings());
  const [users, setUsers] = useState<User[]>(getUsers());
  const [pdpaLogs, setPdpaLogs] = useState<PdpaAccessLog[]>(getPdpaLogs());

  const refreshAllData = () => {
    setDocuments(getDocuments());
    setRepairs(getRepairs());
    setLicenseTypes(getLicenseTypes());
    setLicenseApps(getLicenseApplications());
    setDutyRosters(getDutyRosters());
    setEvents(getEvents());
    setMaterials(getMaterials());
    setMaterialTxs(getMaterialTransactions());
    setMaterialCats(getMaterialCategories());
    setDivisions(getDivisions());
    setCms(getCmsSettings());
    setUsers(getUsers());
    setPdpaLogs(getPdpaLogs());
  };

  useEffect(() => {
    refreshAllData();
    const unsubscribe = subscribeStorage(() => {
      refreshAllData();
    });
    return unsubscribe;
  }, []);

  // When authentication changes, auto-switch to Intranet if logged in
  useEffect(() => {
    if (isAuthenticated) {
      setIsPublicMode(false);
    } else {
      setIsPublicMode(true);
    }
  }, [isAuthenticated]);

  // Counts for sidebar badges
  const pendingRepairsCount = repairs.filter((r) => r.status === 'pending' || r.status === 'in_progress').length;
  const pendingDocsCount = documents.filter((d) => d.status === 'dispatched' || d.status === 'registered').length;
  const pendingLicensesCount = licenseApps.filter((a) => a.status === 'submitted' || a.status === 'step1_approved').length;
  const pendingMaterialsCount = materialTxs.filter((t) => t.status === 'pending_approval').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        cms={cms}
        activeView={isPublicMode ? 'public' : currentTab}
        isPublicMode={isPublicMode}
        onTogglePublicMode={(pub) => {
          setIsPublicMode(pub);
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Main View Area */}
      {isPublicMode ? (
        /* Public Portal for Citizens */
        <PublicPortal
          cms={cms}
          repairs={repairs}
          onOpenStaffLogin={() => setIsLoginModalOpen(true)}
        />
      ) : (
        /* Internal Staff Intranet */
        <div className="flex-1 flex overflow-hidden">
          {/* Royal Blue Left Sidebar (Styled after reference image) */}
          <Sidebar
            currentTab={currentTab}
            onSelectTab={(tab) => setCurrentTab(tab)}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            pendingRepairsCount={pendingRepairsCount}
            pendingDocsCount={pendingDocsCount}
            pendingLicensesCount={pendingLicensesCount}
            pendingMaterialsCount={pendingMaterialsCount}
          />

          {/* Intranet Main Content Screen */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {currentTab === 'dashboard' && (
                <DashboardOverview
                  cms={cms}
                  documents={documents}
                  repairs={repairs}
                  applications={licenseApps}
                  dutyRosters={dutyRosters}
                  materials={materials}
                  onNavigateTab={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'edocument' && (
                <EDocumentModule
                  documents={documents}
                  divisions={divisions}
                />
              )}

              {currentTab === 'repairs' && (
                <RepairModule
                  repairs={repairs}
                />
              )}

              {currentTab === 'licenses' && (
                <LicenseModule
                  applications={licenseApps}
                  licenseTypes={licenseTypes}
                  divisions={divisions}
                />
              )}

              {currentTab === 'calendar' && (
                <CalendarModule
                  dutyRosters={dutyRosters}
                  events={events}
                />
              )}

              {currentTab === 'inventory' && (
                <InventoryModule
                  materials={materials}
                  transactions={materialTxs}
                  categories={materialCats}
                  divisions={divisions}
                />
              )}

              {(currentTab === 'admin_users' || currentTab === 'admin_villages' || currentTab === 'admin_cms') && (
                <AdminManagement
                  users={users}
                  divisions={divisions}
                  cms={cms}
                  pdpaLogs={pdpaLogs}
                  initialSubTab={currentTab === 'admin_villages' ? 'villages' : currentTab === 'admin_cms' ? 'cms' : 'users'}
                />
              )}
            </div>
          </main>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          setIsPublicMode(false);
          setCurrentTab('dashboard');
        }}
      />

      {/* Profile & Password Edit Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
