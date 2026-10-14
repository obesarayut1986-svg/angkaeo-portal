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
  getMaterialRequisitions,
  getMaterialCategories,
  getDivisions,
  getVillages,
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
  MaterialRequisition,
  MaterialCategory,
  Division,
  Village,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Reactive DB States
  const [documents, setDocuments] = useState<EDocument[]>(getDocuments());
  const [repairs, setRepairs] = useState<RepairItem[]>(getRepairs());
  const [licenseTypes, setLicenseTypes] = useState<LicenseTypeConfig[]>(getLicenseTypes());
  const [licenseApps, setLicenseApps] = useState<LicenseApplication[]>(getLicenseApplications());
  const [dutyRosters, setDutyRosters] = useState<DutyRosterEntry[]>(getDutyRosters());
  const [events, setEvents] = useState<OrganizationEvent[]>(getEvents());
  const [materials, setMaterials] = useState<MaterialItem[]>(getMaterials());
  const [materialTxs, setMaterialTxs] = useState<MaterialTransaction[]>(getMaterialTransactions());
  const [requisitions, setRequisitions] = useState<MaterialRequisition[]>(getMaterialRequisitions());
  const [materialCats, setMaterialCats] = useState<MaterialCategory[]>(getMaterialCategories());
  const [divisions, setDivisions] = useState<Division[]>(getDivisions());
  const [villages, setVillages] = useState<Village[]>(getVillages());
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
    setRequisitions(getMaterialRequisitions());
    setMaterialCats(getMaterialCategories());
    setDivisions(getDivisions());
    setVillages(getVillages());
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
  
  // Pending requisitions count for current user's role and division
  const pendingMaterialsCount = requisitions.filter((r) => {
    if (currentUser?.role === 'super_admin') {
      return r.status === 'pending_approver' || r.status === 'pending_dispense';
    }
    if (currentUser?.role === 'division_director') {
      return r.status === 'pending_approver' && r.divisionId === currentUser.divisionId;
    }
    if (currentUser?.role === 'division_stock_officer') {
      return r.status === 'pending_dispense' && r.divisionId === currentUser.divisionId;
    }
    if (currentUser?.role === 'staff') {
      return r.requesterId === currentUser.id && (r.status === 'pending_approver' || r.status === 'pending_dispense');
    }
    return false;
  }).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        cms={cms}
        activeView={isPublicMode ? 'public' : currentTab}
        isPublicMode={isPublicMode}
        onTogglePublicMode={(pub) => {
          setIsPublicMode(pub);
          setIsMobileMenuOpen(false);
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onNavigateTab={(tab) => {
          setIsPublicMode(false);
          setCurrentTab(tab);
        }}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
        <div className="flex-1 flex overflow-hidden relative">
          {/* Royal Blue Left Sidebar (Styled after reference image) */}
          <Sidebar
            currentTab={currentTab}
            onSelectTab={(tab) => {
              setCurrentTab(tab);
              setIsMobileMenuOpen(false);
            }}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            pendingRepairsCount={pendingRepairsCount}
            pendingDocsCount={pendingDocsCount}
            pendingLicensesCount={pendingLicensesCount}
            pendingMaterialsCount={pendingMaterialsCount}
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />

          {/* Intranet Main Content Screen */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-20 lg:pb-6">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
              {currentTab === 'dashboard' && (
                <DashboardOverview
                  cms={cms}
                  documents={documents}
                  repairs={repairs}
                  applications={licenseApps}
                  dutyRosters={dutyRosters}
                  materials={materials}
                  divisions={divisions}
                  villages={villages}
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
                  requisitions={requisitions}
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

          {/* Mobile Bottom Navigation Bar for Intranet */}
          <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 px-2 py-1.5 flex items-center justify-around shadow-lg">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                currentTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className="text-base">🏠</span>
              <span>หน้าหลัก</span>
            </button>
            <button
              onClick={() => setCurrentTab('edocument')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer relative ${
                currentTab === 'edocument' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className="text-base">📄</span>
              <span>สารบรรณ</span>
              {pendingDocsCount > 0 && (
                <span className="absolute top-0 right-1 w-3.5 h-3.5 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {pendingDocsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentTab('repairs')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer relative ${
                currentTab === 'repairs' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className="text-base">🔧</span>
              <span>แจ้งซ่อม</span>
              {pendingRepairsCount > 0 && (
                <span className="absolute top-0 right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {pendingRepairsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentTab('inventory')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer relative ${
                currentTab === 'inventory' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className="text-base">📦</span>
              <span>เบิกพัสดุ</span>
              {pendingMaterialsCount > 0 && (
                <span className="absolute top-0 right-1 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {pendingMaterialsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[10px] font-medium text-slate-500 hover:text-blue-600 transition cursor-pointer"
            >
              <span className="text-base">☰</span>
              <span>เมนูทั้งหมด</span>
            </button>
          </nav>
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
