import React, { useState } from 'react';
import {
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MapPin,
  TrendingUp,
  BarChart3,
  Flame,
  UserCheck,
  Upload,
  Calendar,
  Filter,
  Search,
  Plus,
  Eye,
  Check,
  Phone,
  Building,
  Download,
} from 'lucide-react';
import { RepairItem, RepairStatus, RepairCategory, RepairUrgency, Village } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import {
  updateRepairStatus,
  logPdpaAction,
  getVillages,
} from '../../../db/storage';
import { exportRepairsToExcel } from '../../../utils/exportUtils';
import { InteractiveMap } from '../../common/InteractiveMap';

interface RepairModuleProps {
  repairs: RepairItem[];
}

export const RepairModule: React.FC<RepairModuleProps> = ({ repairs }) => {
  const { currentUser, canAccess } = useAuth();

  const [activeTab, setActiveTab] = useState<'list' | 'stats_kpi'>('list');
  const [villagesList] = useState<Village[]>(getVillages());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Repair for Modal (Update status & technician completion)
  const [editingRepair, setEditingRepair] = useState<RepairItem | null>(null);
  const [updateStatus, setUpdateStatus] = useState<RepairStatus>('in_progress');
  const [assignedTechName, setAssignedTechName] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);
  const [viewDetailRepair, setViewDetailRepair] = useState<RepairItem | null>(null);

  const canManageRepairs =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'division_director' ||
    currentUser?.role === 'technician' ||
    canAccess('canManageRepairs');

  // Filtered list
  const filteredRepairs = repairs.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTicket = r.ticketId.toLowerCase().includes(q);
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchLoc = r.locationAddress.toLowerCase().includes(q);
      const matchReporter = r.reporterName.toLowerCase().includes(q);
      if (!matchTicket && !matchDesc && !matchLoc && !matchReporter) return false;
    }
    return true;
  });

  // Calculate Statistics & KPI
  const totalCount = repairs.length;
  const completedCount = repairs.filter((r) => r.status === 'completed').length;
  const inProgressCount = repairs.filter((r) => r.status === 'in_progress').length;
  const pendingCount = repairs.filter((r) => r.status === 'pending').length;
  const cancelledCount = repairs.filter((r) => r.status === 'cancelled').length;

  const kpiSuccessRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Breakdown by Category
  const categoriesList: RepairCategory[] = [
    'ไฟฟ้าสาธารณะ ไฟทาง',
    'ประปาหมู่บ้าน',
    'ถนนชำรุด/เป็นหลุมเป็นบ่อ',
    'ทางระบายน้ำอุดตัน น้ำท่วมขัง',
    'คำร้องอื่นๆ',
  ];

  const categoryStats = categoriesList.map((cat) => {
    const items = repairs.filter((r) => r.category === cat);
    const count = items.length;
    const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

    // Average duration in hours (MTTR) for completed items
    const completedItems = items.filter((r) => r.status === 'completed' && r.durationHours);
    const avgHours =
      completedItems.length > 0
        ? (
            completedItems.reduce((acc, c) => acc + (c.durationHours || 0), 0) /
            completedItems.length
          ).toFixed(1)
        : '-';

    return {
      category: cat,
      count,
      percent,
      avgHours,
    };
  });

  const handleOpenEdit = (repair: RepairItem) => {
    setEditingRepair(repair);
    setUpdateStatus(repair.status);
    setAssignedTechName(repair.assignedTechnician || currentUser?.fullName || '');
    setCompletionNotes(repair.completionNotes || '');
    setCompletionPhotos(
      repair.completionPhotos || [
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop&q=80',
      ]
    );
  };

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRepair) return;

    updateRepairStatus(
      editingRepair.id,
      updateStatus,
      assignedTechName.trim(),
      completionNotes.trim(),
      updateStatus === 'completed' ? completionPhotos : editingRepair.completionPhotos
    );

    logPdpaAction(
      currentUser?.fullName || 'ช่างซ่อม',
      currentUser?.role || 'technician',
      'update',
      'repair_management',
      editingRepair.ticketId,
      `อัปเดตสถานะงานซ่อม ${editingRepair.ticketId} เป็น ${updateStatus}`
    );

    setEditingRepair(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                ระบบบริหารจัดการงานแจ้งซ่อม (กองช่าง)
              </h2>
              <p className="text-xs text-slate-500">
                รับเรื่องจากประชาชนและเจ้าหน้าที่ • บันทึกการปฏิบัติงานของช่าง • แดชบอร์ดสถิติ & KPI ({villagesList.length} หมู่บ้านตำบลอ่างแก้ว)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportRepairsToExcel(repairs)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              title="ส่งออกรายงานสรุปงานแจ้งซ่อมบำรุงเป็นไฟล์ Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รายการแจ้งซ่อมทั้งหมด
              </button>
              <button
                onClick={() => setActiveTab('stats_kpi')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'stats_kpi'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>รายงานสถิติ & แผนที่ความร้อน (Heatmap)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick KPI stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
            <div className="text-[11px] font-semibold text-blue-700">คำร้องทั้งหมด</div>
            <div className="text-xl font-bold text-blue-950 mt-0.5">{totalCount} งาน</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
            <div className="text-[11px] font-semibold text-amber-700">กำลังดำเนินการ</div>
            <div className="text-xl font-bold text-amber-950 mt-0.5">{inProgressCount} งาน</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="text-[11px] font-semibold text-emerald-700">ซ่อมเสร็จสิ้น (KPI)</div>
            <div className="text-xl font-bold text-emerald-950 mt-0.5">
              {completedCount} งาน ({kpiSuccessRate}%)
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
            <div className="text-[11px] font-semibold text-rose-700">รอดำเนินการ</div>
            <div className="text-xl font-bold text-rose-950 mt-0.5">{pendingCount} งาน</div>
          </div>
        </div>
      </div>

      {/* ================= TAB 1: LIST VIEW ================= */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหา Ticket ID, ผู้แจ้ง, รายละเอียด..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
              >
                <option value="all">สถานะ: ทั้งหมด</option>
                <option value="pending">รอดำเนินการ (Pending)</option>
                <option value="in_progress">กำลังดำเนินการ (In Progress)</option>
                <option value="completed">ซ่อมเสร็จสิ้น (Completed)</option>
                <option value="cancelled">ยกเลิก (Cancelled)</option>
              </select>
            </div>
            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
              >
                <option value="all">หมวดหมู่: ทั้งหมด</option>
                {categoriesList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Ticket ID</th>
                    <th className="py-3 px-4">ประเภทงาน</th>
                    <th className="py-3 px-4">สถานที่ / พิกัด</th>
                    <th className="py-3 px-4">ผู้แจ้งเรื่อง</th>
                    <th className="py-3 px-4">ความเร่งด่วน</th>
                    <th className="py-3 px-4">ช่างผู้รับผิดชอบ</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRepairs.map((repair) => (
                    <tr key={repair.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">
                        {repair.ticketId}
                        <span className="block text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                          {repair.createdAt}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{repair.category}</span>
                        <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs mt-0.5">
                          {repair.description}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">หมู่ {repair.villageNo}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {repair.locationAddress}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800">{repair.reporterName}</div>
                        <div className="text-[11px] text-slate-400">{repair.reporterPhone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            repair.urgency === 'ด่วนที่สุด'
                              ? 'bg-rose-100 text-rose-700'
                              : repair.urgency === 'ด่วน'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {repair.urgency}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {repair.assignedTechnician ? (
                          <span className="text-indigo-900 font-medium">{repair.assignedTechnician}</span>
                        ) : (
                          <span className="text-slate-400 italic">ยังไม่ได้มอบหมาย</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${
                            repair.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : repair.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800'
                              : repair.status === 'cancelled'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {repair.status === 'completed'
                            ? 'เสร็จสิ้น'
                            : repair.status === 'in_progress'
                            ? 'กำลังซ่อม'
                            : repair.status === 'cancelled'
                            ? 'ยกเลิก'
                            : 'รอดำเนินการ'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => setViewDetailRepair(repair)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] transition cursor-pointer"
                        >
                          ดูรายละเอียด
                        </button>
                        {canManageRepairs && (
                          <button
                            onClick={() => handleOpenEdit(repair)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition cursor-pointer"
                          >
                            อัปเดตงาน
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: STATS, KPI, MTTR & HEATMAP ================= */}
      {activeTab === 'stats_kpi' && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>ภาพรวมประสิทธิภาพการให้บริการประชาชน (KPI & Performance Metrics)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* KPI 1: Completion Rate */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    อัตราความสำเร็จในการปิดงาน (Resolution Rate)
                  </div>
                  <div className="text-3xl font-black text-emerald-600 mt-2">
                    {kpiSuccessRate}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    ปิดงานแล้ว {completedCount} จากทั้งหมด {totalCount} รายการ
                  </p>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${kpiSuccessRate}%` }} />
                </div>
              </div>

              {/* KPI 2: Mean Time to Repair (MTTR) */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ระยะเวลาเฉลี่ยในการซ่อมแซม (MTTR)
                  </div>
                  <div className="text-3xl font-black text-blue-600 mt-2">
                    18.6 <span className="text-sm font-normal text-slate-500">ชั่วโมง</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    คำนวณตั้งแต่ประชาชนแจ้งเรื่องจนกระทั่งนายช่างบันทึกปิดงานเสร็จสิ้น
                  </p>
                </div>
                <div className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 mt-4">
                  ★ มาตรฐานบริการ อบต.อ่างแก้ว: ไม่เกิน 48 ชม.
                </div>
              </div>

              {/* KPI 3: Priority Breakdown */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    สัดส่วนตามความเร่งด่วน
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-rose-700 font-semibold">ด่วนที่สุด (อันตรายต่อชีวิต/ทรัพย์สิน)</span>
                      <span className="font-mono font-bold">
                        {repairs.filter((r) => r.urgency === 'ด่วนที่สุด').length} งาน
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-amber-700 font-semibold">ด่วน</span>
                      <span className="font-mono font-bold">
                        {repairs.filter((r) => r.urgency === 'ด่วน').length} งาน
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">ปกติ</span>
                      <span className="font-mono font-bold">
                        {repairs.filter((r) => r.urgency === 'ปกติ').length} งาน
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Table by Category */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 font-heading mb-4">
              สถิติแยกตามประเภทงานซ่อมแซมสาธารณูปโภค
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ประเภทสาธารณูปโภค</th>
                    <th className="py-3 px-4">จำนวนเรื่อง</th>
                    <th className="py-3 px-4">สัดส่วน (%)</th>
                    <th className="py-3 px-4">แผนภูมิสัดส่วน</th>
                    <th className="py-3 px-4 text-right">เวลาเฉลี่ยในการซ่อม (ชั่วโมง)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryStats.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-800">{item.category}</td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{item.count} เรื่อง</td>
                      <td className="py-3 px-4 font-mono font-semibold">{item.percent}%</td>
                      <td className="py-3 px-4 w-48">
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${Math.max(5, item.percent)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                        {item.avgHours !== '-' ? `${item.avgHours} ชม.` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Heatmap & Problem Clustering Map */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-600" />
                  <span>แผนที่ความร้อน (Heatmap & Cluster Map) วิเคราะห์จุดเกิดปัญหาซ้ำซาก</span>
                </h3>
                <p className="text-xs text-slate-500">
                  สำหรับผู้บริหาร (นายก/ปลัด/ผอ.กองช่าง) วิเคราะห์ความหนาแน่นเพื่อวางแผนตั้งงบประมาณปรับปรุงครั้งใหญ่
                </p>
              </div>
            </div>

            <InteractiveMap mode="heatmap" repairs={repairs} height="400px" />
          </div>
        </div>
      )}

      {/* Modal: Update Repair Status & Technician Post-Repair Photos */}
      {editingRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  อัปเดตสถานะการซ่อมแซม: {editingRepair.ticketId}
                </h3>
                <p className="text-[11px] text-slate-500">{editingRepair.category} • หมู่ {editingRepair.villageNo}</p>
              </div>
              <button onClick={() => setEditingRepair(null)}><XCircle className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เปลี่ยนสถานะงาน <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUpdateStatus('in_progress')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                      updateStatus === 'in_progress'
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    กำลังดำเนินการ (In Progress)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateStatus('completed')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                      updateStatus === 'completed'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    ซ่อมเสร็จสิ้น (Completed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateStatus('cancelled')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                      updateStatus === 'cancelled'
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    ยกเลิก/ไม่อยู่ในอำนาจ
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateStatus('pending')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                      updateStatus === 'pending'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    รอดำเนินการ (Pending)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  นายช่าง / เจ้าหน้าที่ผู้รับผิดชอบ
                </label>
                <input
                  type="text"
                  placeholder="เช่น นายสมชาย ขยันซ่อม (นายช่างโยธา)"
                  value={assignedTechName}
                  onChange={(e) => setAssignedTechName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  บันทึกการซ่อม / ผลการดำเนินงาน
                </label>
                <textarea
                  rows={3}
                  placeholder="เช่น เปลี่ยนหลอดไฟ LED 50W เรียบร้อย หรือ ตัดต่อท่อ PVC พร้อมทดสอบการไหลของน้ำ..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              {/* Post-repair photos */}
              {updateStatus === 'completed' && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-emerald-900">
                      แนบภาพถ่ายหลังซ่อมเสร็จ (After Photos)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setCompletionPhotos([
                          ...completionPhotos,
                          'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=80',
                        ])
                      }
                      className="text-emerald-700 hover:text-emerald-900 font-semibold"
                    >
                      + เพิ่มรูป
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {completionPhotos.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="After"
                        className="w-full aspect-video object-cover rounded-lg border border-emerald-300"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingRepair(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow"
                >
                  บันทึกการอัปเดต
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details */}
      {viewDetailRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-sm text-slate-900">รายละเอียดงานแจ้งซ่อม {viewDetailRepair.ticketId}</h3>
              <button onClick={() => setViewDetailRepair(null)}><XCircle className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-2">
              <div><strong>ประเภท:</strong> {viewDetailRepair.category} ({viewDetailRepair.urgency})</div>
              <div><strong>สถานที่:</strong> {viewDetailRepair.locationAddress} (หมู่ {viewDetailRepair.villageNo})</div>
              <div><strong>ผู้แจ้ง:</strong> {viewDetailRepair.reporterName} ({viewDetailRepair.reporterPhone})</div>
              <div><strong>รายละเอียด:</strong> {viewDetailRepair.description}</div>
              {viewDetailRepair.completionNotes && (
                <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-900">
                  <strong>บันทึกช่าง:</strong> {viewDetailRepair.completionNotes}
                </div>
              )}
            </div>
            <div className="pt-2">
              <InteractiveMap mode="view" initialCoords={viewDetailRepair.coordinates} height="180px" />
            </div>
            <div className="flex justify-end pt-2 border-t">
              <button onClick={() => setViewDetailRepair(null)} className="px-4 py-1.5 bg-slate-100 rounded-lg">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
