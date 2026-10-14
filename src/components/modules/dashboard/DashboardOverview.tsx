import React, { useState } from 'react';
import {
  FileText,
  Wrench,
  FileCheck2,
  Boxes,
  Calendar,
  Users,
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  Shield,
  Coffee,
  Flame,
  CheckCircle,
  Plus,
} from 'lucide-react';
import {
  EDocument,
  RepairItem,
  LicenseApplication,
  DutyRosterEntry,
  MaterialItem,
  CmsSettings,
  Division,
  Village,
} from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { Sparkles, LayoutDashboard } from 'lucide-react';

interface DashboardOverviewProps {
  cms: CmsSettings;
  documents: EDocument[];
  repairs: RepairItem[];
  applications: LicenseApplication[];
  dutyRosters: DutyRosterEntry[];
  materials: MaterialItem[];
  divisions?: Division[];
  villages?: Village[];
  onNavigateTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  cms,
  documents,
  repairs,
  applications,
  dutyRosters,
  materials,
  divisions = [],
  villages = [],
  onNavigateTab,
}) => {
  const { currentUser } = useAuth();

  // Metrics & Scoping
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isCentralSaraban = currentUser?.role === 'central_saraban';
  const isExecutive = currentUser?.role === 'executive' || currentUser?.role === 'division_director';
  const isGlobal = isSuperAdmin || isCentralSaraban || isExecutive;
  const userDivId = currentUser?.divisionId;

  // View mode: Operational vs Executive BI
  const [viewMode, setViewMode] = useState<'operational' | 'executive'>(
    isExecutive || isSuperAdmin ? 'executive' : 'operational'
  );

  const relevantDocs = documents.filter((d) => {
    if (!isGlobal && userDivId) {
      return d.dispatchedToDivisionId === userDivId;
    }
    return true;
  });

  const pendingDocsCount = documents.filter((d) => {
    if (!isGlobal && userDivId) {
      return d.dispatchedToDivisionId === userDivId && d.status === 'dispatched';
    }
    return d.status === 'dispatched' || d.status === 'registered';
  }).length;

  const pendingRepairsCount = repairs.filter((r) => r.status === 'pending' || r.status === 'in_progress').length;
  const pendingLicenseCount = applications.filter((a) => a.status === 'submitted' || a.status === 'step1_approved').length;
  const lowStockCount = materials.filter((m) => {
    if (!isGlobal && userDivId) {
      if (m.divisionId !== userDivId) return false;
    }
    return m.currentStock <= (m.minStockAlert || 5);
  }).length;

  // Today's Date in string
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingRosters = dutyRosters.slice(0, 3);
  const recentDocs = relevantDocs.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Card styled closely after the user's reference image */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white shadow-md relative overflow-hidden border border-blue-800">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-700/60 border border-blue-400/30 text-xs font-semibold text-blue-200">
                ระบบสารสนเทศภาครัฐและบริหารจัดการภายใน (Intranet)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-xs font-bold">
                ปีงบประมาณ {cms.currentFiscalYear || '2570'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-heading tracking-tight">
              {cms.orgName}
            </h1>
            <p className="text-xs text-blue-200 leading-relaxed max-w-2xl">
              ยินดีต้อนรับ {currentUser?.fullName} ({currentUser?.position} - {currentUser?.divisionName}) เข้าสู่ระบบบริหารจัดการภายใน อบต.อ่างแก้ว
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="bg-white/10 p-1 rounded-xl flex items-center border border-white/20 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('executive')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'executive'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                    : 'text-blue-200 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>แดชบอร์ดผู้บริหาร (BI)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('operational')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'operational'
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'text-blue-200 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>ภาพรวมปฏิบัติการ</span>
              </button>
            </div>

            <button
              onClick={() => onNavigateTab('edocument')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>สารบรรณ</span>
            </button>
            <button
              onClick={() => onNavigateTab('repairs')}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-slate-950" />
              <span>แจ้งซ่อม</span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Executive BI Dashboard if selected */}
      {viewMode === 'executive' ? (
        <ExecutiveDashboard
          cms={cms}
          documents={documents}
          repairs={repairs}
          applications={applications}
          materials={materials}
          divisions={divisions}
          villages={villages}
          onNavigateTab={onNavigateTab}
        />
      ) : (
        <>
          {/* 4 Operational Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Documents */}
        <div
          onClick={() => onNavigateTab('edocument')}
          className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">สารบรรณอิเล็กทรอนิกส์</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-heading">
              {documents.length} <span className="text-xs font-normal text-slate-400">เรื่อง</span>
            </div>
            <div className="text-xs text-amber-700 font-semibold mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>รอรับ/ดำเนินการ: {pendingDocsCount} เรื่อง</span>
            </div>
          </div>
        </div>

        {/* Card 2: Repairs */}
        <div
          onClick={() => onNavigateTab('repairs')}
          className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">แจ้งซ่อมสาธารณูปโภค</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-heading">
              {repairs.length} <span className="text-xs font-normal text-slate-400">งาน</span>
            </div>
            <div className="text-xs text-rose-700 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>กำลังดำเนินการ/รอช่าง: {pendingRepairsCount} งาน</span>
            </div>
          </div>
        </div>

        {/* Card 3: Permits */}
        <div
          onClick={() => onNavigateTab('licenses')}
          className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">คำขอใบอนุญาตออนไลน์</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-heading">
              {applications.length} <span className="text-xs font-normal text-slate-400">คำขอ</span>
            </div>
            <div className="text-xs text-blue-700 font-semibold mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>รออนุมัติ 2 ขั้นตอน: {pendingLicenseCount} คำขอ</span>
            </div>
          </div>
        </div>

        {/* Card 4: Inventory */}
        <div
          onClick={() => onNavigateTab('inventory')}
          className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ทะเบียนพัสดุ (พ.ด.4)</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-heading">
              {materials.length} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {lowStockCount > 0 ? (
                <span className="text-rose-600 font-semibold">สต็อกใกล้หมด {lowStockCount} รายการ</span>
              ) : (
                <span className="text-emerald-700 font-semibold">พัสดุในคลังพร้อมเบิก</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Duty Roster Today & Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Duty Roster Widget (Hoverable Tooltip Display) */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 font-heading flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>ผู้เข้าเวรปฏิบัติหน้าที่เร็วๆ นี้</span>
            </h3>
            <button
              onClick={() => onNavigateTab('calendar')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              ดูทั้งหมด →
            </button>
          </div>

          <div className="space-y-3">
            {upcomingRosters.map((roster) => (
              <div
                key={roster.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/50 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    {roster.shiftType === 'holiday' ? (
                      <Coffee className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    {roster.shiftTitle}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">{roster.dateStr}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">{roster.timeRange}</div>
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  {roster.officers.map((officer, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-800 font-medium">
                        {officer.isLeader && <span className="text-amber-600">★ </span>}
                        {officer.name}
                      </span>
                      <a
                        href={`tel:${officer.phone}`}
                        className="font-mono text-[11px] text-emerald-700 font-bold hover:underline"
                      >
                        {officer.phone}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Recent E-Documents needing action */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 font-heading flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>หนังสือราชการล่าสุดในระบบสารบรรณ</span>
              </h3>
              <p className="text-xs text-slate-500">
                เลขที่รับสารบรรณกลาง • การจ่ายหนังสือเข้ากอง • สถานะการรับเอกสาร
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('edocument')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              เปิดระบบสารบรรณ →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">เลขที่รับ</th>
                  <th className="py-2.5 px-3">เรื่อง</th>
                  <th className="py-2.5 px-3">กองปลายทาง</th>
                  <th className="py-2.5 px-3">สถานะ</th>
                  <th className="py-2.5 px-3 text-right">เอกสารแนบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                      {doc.receiptNo}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{doc.subject}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{doc.bookNo}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-700">
                        {doc.dispatchedToDivisionName || 'ยังไม่จ่าย'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {doc.status === 'acknowledged' ? (
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            รับเรียบร้อยแล้ว
                          </span>
                          {doc.divisionReceiptNo && (
                            <div className="text-[10px] font-mono text-emerald-900 font-semibold">
                              เลขรับกอง: {doc.divisionReceiptNo}
                            </div>
                          )}
                        </div>
                      ) : doc.status === 'dispatched' ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          รอรับหนังสือ
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          ลงทะเบียนรับ
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {doc.attachments.length > 0 ? (
                        <span className="text-[11px] text-blue-600 font-medium">
                          {doc.attachments.length} ไฟล์
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )}
</div>
  );
};
