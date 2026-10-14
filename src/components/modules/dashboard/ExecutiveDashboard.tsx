import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  ShieldCheck,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Printer,
  Boxes,
  FileText,
  Wrench,
  FileCheck2,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
  Users,
} from 'lucide-react';
import {
  EDocument,
  RepairItem,
  LicenseApplication,
  MaterialItem,
  Division,
  CmsSettings,
  Village,
} from '../../../types';
import { exportExecutiveKpiToExcel } from '../../../utils/exportUtils';

interface ExecutiveDashboardProps {
  cms: CmsSettings;
  documents: EDocument[];
  repairs: RepairItem[];
  applications: LicenseApplication[];
  materials: MaterialItem[];
  divisions: Division[];
  villages: Village[];
  onNavigateTab: (tab: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  cms,
  documents,
  repairs,
  applications,
  materials,
  divisions,
  villages,
  onNavigateTab,
}) => {
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('2570');

  // 1. Repair Performance Metrics (SLA)
  const totalRepairs = repairs.length;
  const completedRepairs = repairs.filter((r) => r.status === 'completed').length;
  const inProgressRepairs = repairs.filter((r) => r.status === 'in_progress').length;
  const pendingRepairs = repairs.filter((r) => r.status === 'pending').length;
  const urgentRepairs = repairs.filter((r) => r.urgency === 'ด่วนที่สุด').length;
  const repairResolutionRate = totalRepairs > 0 ? ((completedRepairs / totalRepairs) * 100).toFixed(1) : '100';

  // 2. Material Valuation across 4 Divisions
  const totalMaterialValuation = useMemo(() => {
    return materials.reduce((sum, m) => sum + m.currentStock * m.unitPrice, 0);
  }, [materials]);

  const divisionMaterialStats = useMemo(() => {
    return divisions.map((div) => {
      const divMats = materials.filter((m) => m.divisionId === div.id);
      const val = divMats.reduce((sum, m) => sum + m.currentStock * m.unitPrice, 0);
      const lowStockCount = divMats.filter((m) => m.currentStock <= (m.minStockAlert || 5)).length;
      return {
        id: div.id,
        name: div.name,
        shortCode: div.shortCode || div.code,
        itemCount: divMats.length,
        totalValue: val,
        lowStockCount,
        percentage: totalMaterialValuation > 0 ? ((val / totalMaterialValuation) * 100).toFixed(1) : '0',
      };
    });
  }, [divisions, materials, totalMaterialValuation]);

  // 3. Incidents by Village (ม.1 ถึง ม.6)
  const villageStats = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map((vNo) => {
      const matchingVillage = villages.find((v) => v.no === vNo);
      const villageRepairs = repairs.filter((r) => r.villageNo === vNo);
      const completed = villageRepairs.filter((r) => r.status === 'completed').length;
      return {
        no: vNo,
        name: matchingVillage?.name || `หมู่ที่ ${vNo}`,
        total: villageRepairs.length,
        completed,
        pending: villageRepairs.length - completed,
      };
    });
  }, [villages, repairs]);

  // 4. E-Document Performance
  const acknowledgedDocs = documents.filter((d) => d.status === 'acknowledged').length;
  const dispatchedDocs = documents.filter((d) => d.status === 'dispatched').length;
  const docResolutionRate = documents.length > 0 ? ((acknowledgedDocs / documents.length) * 100).toFixed(1) : '100';

  // 5. License Processing
  const approvedLicenses = applications.filter((a) => a.status === 'step2_approved').length;

  const handleExportReport = () => {
    exportExecutiveKpiToExcel(repairs, materials, divisions, documents, applications);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black tracking-wide flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>แดชบอร์ดผู้บริหารระดับสูง (Executive BI)</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-800/80 border border-blue-400/30 text-xs font-medium text-blue-200">
                สำหรับ: นายก อบต. • ปลัด อบต. • ผอ.กอง
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-heading tracking-tight">
              ศูนย์รวมดัชนีชี้วัดผลการดำเนินงาน (KPI Overview)
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/90 leading-relaxed max-w-2xl">
              รายงานตัวชี้วัดความสำเร็จการให้บริการสาธารณะ อัตราการบริหารจัดการพัสดุ 4 กอง
              และประสิทธิภาพการหมุนเวียนงานสารบรรณ {cms.orgName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl border border-white/20 text-xs">
              <Calendar className="w-4 h-4 text-amber-300" />
              <span>ปีงบประมาณ:</span>
              <select
                value={selectedFiscalYear}
                onChange={(e) => setSelectedFiscalYear(e.target.value)}
                className="bg-transparent font-bold text-amber-300 focus:outline-none cursor-pointer"
              >
                <option value="2572" className="text-slate-900">2572</option>
                <option value="2571" className="text-slate-900">2571 (รองรับปี 2571)</option>
                <option value="2570" className="text-slate-900">2570</option>
                <option value="2569" className="text-slate-900">2569</option>
                <option value="2568" className="text-slate-900">2568</option>
              </select>
            </div>

            <button
              onClick={handleExportReport}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition flex items-center gap-2 cursor-pointer"
              title="ส่งออกรายงานสรุปผู้บริหารเป็นไฟล์ Excel"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออกรายงาน Excel (Executive BI)</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 transition flex items-center gap-1.5 cursor-pointer"
              title="พิมพ์รายงานสรุป"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">พิมพ์รายงาน</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Strategic Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Public Service SLA */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ความสำเร็จงานบริการประชาชน
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-heading">
                {repairResolutionRate}%
              </span>
              <span className="text-xs font-semibold text-emerald-600">SLA Success Rate</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${repairResolutionRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>แก้ไขเสร็จแล้ว: {completedRepairs} งาน</span>
              <span>รอดำเนินการ: {pendingRepairs} งาน</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Material Valuation */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              มูลค่าพัสดุในคลังรวม (4 กอง)
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
                {totalMaterialValuation.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs font-semibold text-slate-500">บาท</span>
            </div>
            <div className="text-xs text-blue-700 font-semibold mt-1">
              ครอบคลุม {materials.length} รายการพัสดุ
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
              <span>คลัง 4 กองพร้อมเบิกจ่าย</span>
              <span className="text-amber-600 font-semibold">
                ใกล้หมด {materials.filter((m) => m.currentStock <= (m.minStockAlert || 5)).length} ชนิด
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: E-Document Efficiency */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              การหมุนเวียนหนังสือสารบรรณ
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-heading">
                {docResolutionRate}%
              </span>
              <span className="text-xs font-semibold text-indigo-600">รับหนังสือแล้ว</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${docResolutionRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>ทั้งหมด {documents.length} เรื่อง</span>
              <span className="text-amber-700 font-semibold">รอรับ {dispatchedDocs} เรื่อง</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Digital Services Adoption */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              งานใบอนุญาตดิจิทัล
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 font-heading">
                {applications.length}
              </span>
              <span className="text-xs font-semibold text-slate-500">คำขอออนไลน์</span>
            </div>
            <div className="text-xs text-emerald-700 font-semibold mt-1">
              อนุมัติเสร็จสิ้นแล้ว {approvedLicenses} คำขอ
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
              <span>ลดการใช้กระดาษ 100%</span>
              <span className="text-blue-600 font-semibold">2-Step Approval</span>
            </div>
          </div>
        </div>
      </div>

      {/* Division Material Inventory Breakdown & Village GIS Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: 4 Divisions Material Allocation */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span>มูลค่าและพัสดุคงคลังจำแนกรายกอง (4 กอง)</span>
              </h3>
              <p className="text-xs text-slate-500">
                ข้อมูลตรวจสอบความพร้อมของพัสดุและงบประมาณคงคลังรายหน่วยงาน
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>เปิดระบบคลัง</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {divisionMaterialStats.map((stat) => (
              <div
                key={stat.id}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/40 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center">
                      {stat.shortCode}
                    </span>
                    <div>
                      <span className="font-bold text-xs text-slate-900">{stat.name}</span>
                      <div className="text-[11px] text-slate-500">
                        {stat.itemCount} ชนิดพัสดุ • สต็อกต่ำ {stat.lowStockCount} ชนิด
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-xs text-slate-900">
                      {stat.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </span>
                    <div className="text-[11px] text-blue-600 font-semibold">
                      สัดส่วน {stat.percentage}%
                    </div>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card B: Village GIS Incident Analysis (ม.1 ถึง ม.6) */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-600" />
                <span>สถิติเรื่องร้องเรียนรายหมู่บ้าน (ม.1 – ม.6)</span>
              </h3>
              <p className="text-xs text-slate-500">
                วิเคราะห์ความถี่ของปัญหาโครงสร้างพื้นฐานและสาธารณูปโภคในตำบลอ่างแก้ว
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('repairs')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>ดูแผนที่ GIS</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {villageStats.map((v) => (
              <div
                key={v.no}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 transition text-center space-y-1 shadow-2xs"
              >
                <div className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">
                  ม.{v.no} {v.name.replace(/หมู่ที่\s*\d+\s*/, '')}
                </div>
                <div className="text-2xl font-black text-slate-900 font-heading">
                  {v.total} <span className="text-[11px] font-normal text-slate-400">เรื่อง</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-[10px]">
                  <span className="text-emerald-700 font-semibold">เสร็จ {v.completed}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-amber-700 font-semibold">ค้าง {v.pending}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>ข้อสังเกตเชิงนโยบาย:</strong> งานส่วนใหญ่เป็นไฟฟ้าส่องสว่างสาธารณะและถนนชำรุด ควรจัดสรรงบซ่อมบำรุงประจำไตรมาสรองรับความต้องการเชิงพื้นที่
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
