import React, { useState } from 'react';
import {
  Wrench,
  Search,
  FileCheck2,
  Lock,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  Plus,
  Eye,
  ShieldCheck,
  Phone,
  Building,
  Calendar,
  XCircle,
  HelpCircle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { PWAInstallButton } from '../../common/PWAInstallButton';
import {
  RepairItem,
  RepairCategory,
  RepairUrgency,
  LicenseTypeConfig,
  LicenseApplication,
  CmsSettings,
} from '../../../types';
import {
  createRepair,
  getRepairs,
  getLicenseTypes,
  getLicenseApplications,
  createLicenseApplication,
  logPdpaAction,
  getVillages,
} from '../../../db/storage';
import { InteractiveMap } from '../../common/InteractiveMap';

interface PublicPortalProps {
  cms: CmsSettings;
  repairs: RepairItem[];
  onOpenStaffLogin: () => void;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({
  cms,
  repairs,
  onOpenStaffLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'landing' | 'report_repair' | 'track_repair' | 'license_service'>('landing');

  // Tracking Ticket Search State
  const [searchTicket, setSearchTicket] = useState('');
  const [searchedRepair, setSearchedRepair] = useState<RepairItem | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);

  // New Repair Form State
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reporterCitizenId, setReporterCitizenId] = useState('');
  const [repairCategory, setRepairCategory] = useState<RepairCategory>('ไฟฟ้าสาธารณะ ไฟทาง');
  const [repairUrgency, setRepairUrgency] = useState<RepairUrgency>('ปกติ');
  const [repairDescription, setRepairDescription] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [selectedVillageNo, setSelectedVillageNo] = useState<number>(1);
  const [repairCoords, setRepairCoords] = useState<{ lat: number; lng: number }>({
    lat: 14.654922,
    lng: 100.393166,
  });
  const [damagePhotos, setDamagePhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=500&auto=format&fit=crop&q=80',
  ]);
  const [submitSuccessTicket, setSubmitSuccessTicket] = useState<string | null>(null);

  // License Application State
  const licenseTypes = getLicenseTypes();
  const [selectedLicenseType, setSelectedLicenseType] = useState<LicenseTypeConfig>(licenseTypes[0]);
  const [citizenId, setCitizenId] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantAddress, setApplicantAddress] = useState('');
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [licenseSubmitSuccess, setLicenseSubmitSuccess] = useState<string | null>(null);
  const [searchCitizenId, setSearchCitizenId] = useState('');
  const [trackedApplications, setTrackedApplications] = useState<LicenseApplication[]>([]);

  // Filter last 5+ public repairs for quick tracking list
  const recentRepairs = repairs.slice(0, 6);

  const handleSearchTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTicket.trim()) return;

    const query = searchTicket.trim().toUpperCase();
    const found = repairs.find((r) => r.ticketId.toUpperCase() === query);

    if (found) {
      setSearchedRepair(found);
      setSearchNotFound(false);
    } else {
      setSearchedRepair(null);
      setSearchNotFound(true);
    }
  };

  const handleSubmitRepair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterName.trim() || !reporterPhone.trim() || !repairDescription.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุล, เบอร์โทรศัพท์ และรายละเอียดอาการชำรุดให้ครบถ้วน');
      return;
    }

    const maskedId = reporterCitizenId.trim()
      ? `${reporterCitizenId.slice(0, 1)}-${reporterCitizenId.slice(1, 5)}-XXXXX-${reporterCitizenId.slice(-2)}`
      : '1-1504-XXXXX-00-0';

    const newRepair = createRepair({
      isPublic: true,
      reporterName: reporterName.trim(),
      reporterPhone: reporterPhone.trim(),
      reporterCitizenIdMasked: maskedId,
      category: repairCategory,
      urgency: repairUrgency,
      description: repairDescription.trim(),
      locationAddress: locationAddress.trim() || `ใกล้เคียง หมู่ที่ ${selectedVillageNo} ต.อ่างแก้ว`,
      villageNo: selectedVillageNo,
      coordinates: repairCoords,
      damagePhotos: damagePhotos.length > 0 ? damagePhotos : ['https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=500&auto=format&fit=crop&q=80'],
    });

    logPdpaAction(
      reporterName.trim(),
      'citizen',
      'create',
      'repair_ticket',
      newRepair.ticketId,
      `ประชาชนแจ้งซ่อม ${repairCategory} ผ่านหน้าเว็บ (หมู่ ${selectedVillageNo})`
    );

    setSubmitSuccessTicket(newRepair.ticketId);
    // reset form
    setReporterName('');
    setReporterPhone('');
    setReporterCitizenId('');
    setRepairDescription('');
    setLocationAddress('');
  };

  const handleAddSamplePhoto = () => {
    const samples = [
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1542013936693-884638332954?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=500&auto=format&fit=crop&q=80',
    ];
    const nextPhoto = samples[damagePhotos.length % samples.length];
    setDamagePhotos([...damagePhotos, nextPhoto]);
  };

  const handleSubmitLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim() || !citizenId.trim() || !applicantPhone.trim()) {
      alert('กรุณากรอกชื่อผู้ขอ, เลขบัตรประชาชน และเบอร์โทรศัพท์ให้ครบถ้วน');
      return;
    }

    const newApp = createLicenseApplication({
      licenseTypeId: selectedLicenseType.id,
      licenseTitle: selectedLicenseType.title,
      divisionId: selectedLicenseType.divisionId,
      applicantCitizenId: citizenId.trim(),
      applicantName: applicantName.trim(),
      applicantPhone: applicantPhone.trim(),
      applicantAddress: applicantAddress.trim() || 'ตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง',
      formValues: formValues,
      attachedFiles: selectedLicenseType.requiredDocuments.map((docName) => ({
        docName,
        fileName: `${docName}_แนบแล้ว.pdf`,
        uploadDate: new Date().toISOString().split('T')[0],
      })),
    });

    logPdpaAction(
      applicantName.trim(),
      'citizen',
      'create',
      'license_application',
      newApp.applicationNo,
      `ยื่นขอใบอนุญาตออนไลน์: ${selectedLicenseType.title}`
    );

    setLicenseSubmitSuccess(newApp.applicationNo);
  };

  const handleSearchMyLicenses = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCitizenId.trim()) return;

    const cleanId = searchCitizenId.trim().replace(/-/g, '');
    const apps = getLicenseApplications();
    const found = apps.filter((a) => a.applicantCitizenId.replace(/-/g, '').includes(cleanId));
    setTrackedApplications(found);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/80 border border-blue-400/30 text-xs text-blue-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ช่องทางบริการประชาชนอย่างเป็นทางการ อบต.อ่างแก้ว</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-heading text-white">
                {cms.orgName}
              </h1>
              <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
                {cms.heroSubtitle || 'บริการแจ้งซ่อมแซมสาธารณูปโภค ยื่นขอใบอนุญาตออนไลน์ และติดตามสถานะแบบเรียลไทม์ ตลอด 24 ชั่วโมง'}
              </p>
            </div>

            {/* Quick Action Button Box */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full md:w-auto shrink-0">
              <button
                onClick={() => setActiveTab('report_repair')}
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Wrench className="w-5 h-5 text-slate-950" />
                <span>แจ้งซ่อมสาธารณูปโภค (ไม่ต้อง Login)</span>
              </button>
              <button
                onClick={onOpenStaffLogin}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/20 transition cursor-pointer"
              >
                <Lock className="w-4 h-4 text-blue-300" />
                <span>เข้าสู่ระบบเจ้าหน้าที่</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-2 border-t border-blue-800/60 pt-2">
          <button
            onClick={() => setActiveTab('landing')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'landing'
                ? 'border-amber-400 text-amber-400 bg-blue-950/60'
                : 'border-transparent text-blue-200 hover:text-white'
            }`}
          >
            <span>หน้าแรกบริการ</span>
          </button>
          <button
            onClick={() => setActiveTab('report_repair')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'report_repair'
                ? 'border-amber-400 text-amber-400 bg-blue-950/60'
                : 'border-transparent text-blue-200 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>แจ้งเรื่องซ่อมแซม</span>
          </button>
          <button
            onClick={() => setActiveTab('track_repair')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'track_repair'
                ? 'border-amber-400 text-amber-400 bg-blue-950/60'
                : 'border-transparent text-blue-200 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>ติดตามสถานะแจ้งซ่อม (Track Ticket)</span>
          </button>
          <button
            onClick={() => setActiveTab('license_service')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'license_service'
                ? 'border-amber-400 text-amber-400 bg-blue-950/60'
                : 'border-transparent text-blue-200 hover:text-white'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>ยื่นขอใบอนุญาตออนไลน์ (E-License)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ================= TAB: LANDING ================= */}
        {activeTab === 'landing' && (
          <div className="space-y-8">
            {/* PWA Mobile Add to Home Screen Banner */}
            <PWAInstallButton variant="banner" />

            {/* 3 Main Portals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Repair */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">
                    แจ้งเรื่องซ่อมแซมสาธารณูปโภค
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    แจ้งไฟฟ้าสาธารณะดับ ประปาแตก ถนนเป็นหลุมเป็นบ่อ หรือท่อระบายน้ำอุดตัน ปักหมุดพิกัดจริงบนแผนที่ ไม่ต้อง Login
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab('report_repair')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>แจ้งเรื่องทันที</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveTab('track_repair')}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    ค้นหา Ticket
                  </button>
                </div>
              </div>

              {/* Card 2: E-License */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">
                    ยื่นขอใบอนุญาตออนไลน์ (E-License)
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    ขออนุญาตขุดดิน/ถมดิน ก่อสร้างอาคาร อ.1 กิจการที่เป็นอันตรายต่อสุขภาพ หรือขอติดตั้งน้ำประปา พร้อมแนบไฟล์หลักฐาน
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setActiveTab('license_service')}
                    className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>ยื่นคำร้องออนไลน์</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 3: Staff Login */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-heading">
                    ช่องทางเจ้าหน้าที่ อบต. (Intranet)
                  </h3>
                  <p className="text-xs text-blue-200 mt-2 leading-relaxed">
                    ระบบสารบรรณกลาง สารบรรณกอง จัดการงานช่าง อนุมัติใบอนุญาต 2 ขั้นตอน ปฏิทินเวร และระบบทะเบียนวัสดุ พ.ด.4
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10">
                  <button
                    onClick={onOpenStaffLogin}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Lock className="w-4 h-4" />
                    <span>เข้าสู่ระบบ Intranet</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Public Tracking View Banner (Shows >= 5 cases as required) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span>สถานะการดำเนินงานแจ้งซ่อมล่าสุดในตำบลอ่างแก้ว</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    แสดงรายการแจ้งซ่อมสาธารณูปโภคแบบโปร่งใส (คุ้มครองข้อมูลส่วนบุคคลตาม พรบ. PDPA)
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('track_repair')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>ค้นหาด้วยเลข Ticket ของคุณ</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Table / Cards of 5+ items */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-3">เลขที่แจ้งซ่อม</th>
                      <th className="py-3 px-3">ประเภท</th>
                      <th className="py-3 px-3">สถานที่ / หมู่</th>
                      <th className="py-3 px-3">ความเร่งด่วน</th>
                      <th className="py-3 px-3">วันที่แจ้ง</th>
                      <th className="py-3 px-3">สถานะ</th>
                      <th className="py-3 px-3 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentRepairs.map((r) => {
                      const statusBadge =
                        r.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> ซ่อมเสร็จสิ้น
                          </span>
                        ) : r.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" /> อยู่ระหว่างซ่อม
                          </span>
                        ) : r.status === 'cancelled' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                            <XCircle className="w-3 h-3" /> ยกเลิก
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                            <AlertTriangle className="w-3 h-3" /> รอดำเนินการ
                          </span>
                        );

                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-mono font-bold text-blue-900">
                            {r.ticketId}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-800">
                            {r.category}
                          </td>
                          <td className="py-3 px-3 text-slate-600 truncate max-w-[200px]">
                            หมู่ {r.villageNo} ({r.locationAddress})
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                r.urgency === 'ด่วนที่สุด'
                                  ? 'bg-rose-100 text-rose-700'
                                  : r.urgency === 'ด่วน'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {r.urgency}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500">{r.createdAt}</td>
                          <td className="py-3 px-3">{statusBadge}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setSearchedRepair(r);
                                setActiveTab('track_repair');
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-blue-700 font-medium rounded-lg text-[11px] transition cursor-pointer"
                            >
                              ดูรายละเอียด
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Map Preview */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-rose-600" />
                    <span>แผนที่จุดซ่อมบำรุงสาธารณะ ตำบลอ่างแก้ว</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    แสดงพิกัดจุดแจ้งซ่อมของพี่น้องประชาชนในพื้นที่ทั้ง 6 หมู่บ้าน
                  </p>
                </div>
              </div>
              <InteractiveMap mode="view" repairs={repairs} height="320px" />
            </div>
          </div>
        )}

        {/* ================= TAB: REPORT REPAIR ================= */}
        {activeTab === 'report_repair' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-heading">
                  แบบฟอร์มแจ้งเรื่องซ่อมแซมสาธารณูปโภค (ประชาชน)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  ไม่ต้องลงชื่อเข้าสู่ระบบ กรุณาระบุข้อมูลตามจริงเพื่อให้เจ้าหน้าที่กองช่างลงพื้นที่ตรวจสอบได้อย่างรวดเร็ว
                </p>
              </div>
              <button
                onClick={() => setActiveTab('landing')}
                className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ← กลับหน้าแรก
              </button>
            </div>

            {submitSuccessTicket && (
              <div className="p-6 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-emerald-900 space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-base">บันทึกการแจ้งซ่อมเรียบร้อยแล้ว!</h3>
                    <p className="text-xs text-emerald-700">
                      เจ้าหน้าที่กองช่าง อบต.อ่างแก้ว ได้รับเรื่องเข้าสู่ระบบแล้ว
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">เลขที่ใบแจ้งซ่อมของคุณ (Ticket ID)</div>
                    <div className="text-2xl font-black font-mono text-blue-900 tracking-wider">
                      {submitSuccessTicket}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      *โปรดบันทึกเลขที่นี้ไว้สำหรับใช้ค้นหาและติดตามสถานะงาน
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTicket(submitSuccessTicket);
                      setActiveTab('track_repair');
                      setSubmitSuccessTicket(null);
                    }}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    ติดตามสถานะงานนี้ทันที
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitRepair} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              {/* Reporter Basic Identity (PDPA compliant) */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>1. ข้อมูลผู้แจ้งเรื่อง (เพื่อป้องกันการแจ้งเท็จและติดต่อประสานงาน)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อ - นามสกุล <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น นายวิเชียร สมสุข"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เบอร์โทรศัพท์ติดต่อ <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="เช่น 081-234-5678"
                      value={reporterPhone}
                      onChange={(e) => setReporterPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เลขประจำตัวประชาชน (ไม่บังคับ)
                    </label>
                    <input
                      type="text"
                      maxLength={17}
                      placeholder="เลข 13 หลักเพื่อยืนยันตัวตน"
                      value={reporterCitizenId}
                      onChange={(e) => setReporterCitizenId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Repair Details */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-200 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>2. ข้อมูลการแจ้งซ่อมและประเภทปัญหา</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ประเภทงานซ่อมแซม <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={repairCategory}
                      onChange={(e) => setRepairCategory(e.target.value as RepairCategory)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ไฟฟ้าสาธารณะ ไฟทาง">ไฟฟ้าสาธารณะ ไฟทาง</option>
                      <option value="ประปาหมู่บ้าน">ประปาหมู่บ้าน</option>
                      <option value="ถนนชำรุด/เป็นหลุมเป็นบ่อ">ถนนชำรุด/เป็นหลุมเป็นบ่อ</option>
                      <option value="ทางระบายน้ำอุดตัน น้ำท่วมขัง">ทางระบายน้ำอุดตัน น้ำท่วมขัง</option>
                      <option value="คำร้องอื่นๆ">คำร้องอื่นๆ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ความเร่งด่วน <span className="text-rose-600">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['ปกติ', 'ด่วน', 'ด่วนที่สุด'] as RepairUrgency[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setRepairUrgency(u)}
                          className={`py-2 text-xs font-medium rounded-lg border transition cursor-pointer ${
                            repairUrgency === u
                              ? u === 'ด่วนที่สุด'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : u === 'ด่วน'
                                ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                                : 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      อธิบายอาการชำรุดหรือสภาพปัญหา <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="โปรดระบุรายละเอียด เช่น หลอดไฟดับบริเวณหน้าทางเข้าวัด มืดอันตราย หรือ ท่อประปาแตกมีน้ำไหลซึม..."
                      value={repairDescription}
                      onChange={(e) => setRepairDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Location & Real Map Pinning */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <span>3. สถานที่เกิดเหตุและปักหมุดแผนที่ (ใช้แผนที่จริงได้)</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal">
                    *คลิกบนแผนที่เพื่อระบุตำแหน่งจริง
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      หมู่บ้านในตำบลอ่างแก้ว
                    </label>
                    <select
                      value={selectedVillageNo}
                      onChange={(e) => {
                        const no = Number(e.target.value);
                        setSelectedVillageNo(no);
                        const vil = getVillages().find((v) => v.no === no);
                        if (vil && vil.lat && vil.lng) {
                          setRepairCoords({ lat: vil.lat, lng: vil.lng });
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      {getVillages().map((v) => (
                        <option key={v.id || v.no} value={v.no}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      จุดสังเกตหรือสถานที่ใกล้เคียง
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น เยื้องหน้าบ้านผู้ใหญ่บ้าน หรือ หน้าวัดอ่างแก้ว"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                {/* Location coordinates notice pill */}
                <div className="mb-2.5 p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex flex-wrap items-center justify-between text-xs text-blue-900 gap-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-medium">
                      พิกัดที่ปักหมุด: <strong className="font-mono text-blue-700">{repairCoords.lat.toFixed(6)}, {repairCoords.lng.toFixed(6)}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                    แตะที่แผนที่ หรือเลื่อนแล้วกดปุ่ม &ldquo;📍 ปักหมุดตรงจุดกึ่งกลางนี้&rdquo;
                  </span>
                </div>

                {/* Real Interactive SVG GIS Map for Ang Kaeo */}
                <InteractiveMap
                  mode="pin"
                  villages={getVillages()}
                  initialCoords={repairCoords}
                  onLocationSelect={(data) => {
                    setRepairCoords({ lat: data.lat, lng: data.lng });
                    if (data.villageNo) setSelectedVillageNo(data.villageNo);
                    if (data.addressText && !locationAddress) {
                      setLocationAddress(data.addressText);
                    }
                  }}
                  height="340px"
                />
              </div>

              {/* Photos Upload (Damage photos) */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>4. แนบรูปภาพความเสียหาย (ได้มากกว่า 1 รูป)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddSamplePhoto}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มรูปภาพตัวอย่าง</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {damagePhotos.map((photo, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video group">
                      <img src={photo} alt="damage" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setDamagePhotos(damagePhotos.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="ลบรูป"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddSamplePhoto}
                    className="rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center justify-center p-4 transition aspect-video cursor-pointer text-slate-500 hover:text-blue-600"
                  >
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-medium">+ เพิ่มรูปภาพ</span>
                  </button>
                </div>
              </div>

              {/* PDPA Consent statement */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <p>
                  <strong>ประกาศคุ้มครองข้อมูลส่วนบุคคล (PDPA):</strong> ข้อมูลชื่อ เบอร์โทรศัพท์ และพิกัดจะถูกนำไปใช้เฉพาะการติดต่อประสานงานและตรวจสอบพื้นที่ซ่อมแซมสาธารณูปโภคของ อบต.อ่างแก้ว เท่านั้น
                </p>
              </div>

              {/* Form Submit */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('landing')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>ส่งเรื่องแจ้งซ่อม (รับ Ticket ID)</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= TAB: TRACK REPAIR ================= */}
        {activeTab === 'track_repair' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                ติดตามสถานะงานแจ้งซ่อม (Public Tracking View)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                ประชาชนสามารถค้นหาด้วยเลขที่ใบแจ้งซ่อม (Ticket ID เช่น REP-2569-0012) โดยไม่ต้องลงชื่อเข้าสู่ระบบ
              </p>
            </div>

            {/* Search Box */}
            <form onSubmit={handleSearchTicket} className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="กรอกเลขที่ใบแจ้งซ่อม เช่น REP-2569-0012 หรือ REP-2569-0013"
                    value={searchTicket}
                    onChange={(e) => setSearchTicket(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>ค้นหาข้อมูล</span>
                </button>
              </div>

              {searchNotFound && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>ไม่พบข้อมูลเลขที่ใบแจ้งซ่อม "{searchTicket}" กรุณาตรวจสอบตัวสะกดหรือเลือกดูจากรายการล่าสุดด้านล่าง</span>
                </div>
              )}
            </form>

            {/* Display Selected / Searched Repair Details */}
            {searchedRepair && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                  <div>
                    <span className="text-xs text-slate-500">เลขที่ใบแจ้งซ่อม (Ticket ID)</span>
                    <h3 className="text-xl font-black font-mono text-blue-900">{searchedRepair.ticketId}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        searchedRepair.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : searchedRepair.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : searchedRepair.status === 'cancelled'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      สถานะ: {
                        searchedRepair.status === 'completed'
                          ? 'ซ่อมเสร็จสิ้นแล้ว'
                          : searchedRepair.status === 'in_progress'
                          ? 'อยู่ระหว่างดำเนินการซ่อม'
                          : searchedRepair.status === 'cancelled'
                          ? 'ยกเลิก/ไม่อยู่ในอำนาจหน้าที่'
                          : 'รอดำเนินการรับเรื่อง'
                      }
                    </span>
                  </div>
                </div>

                {/* Status Progress Stepper */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                    เส้นทางการดำเนินงาน (Timeline)
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {/* Step 1 */}
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-1 font-bold text-xs">
                        1
                      </div>
                      <div className="font-bold text-blue-900">รอดำเนินการ (Pending)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{searchedRepair.createdAt}</div>
                    </div>
                    {/* Step 2 */}
                    <div
                      className={`p-3 rounded-xl border ${
                        searchedRepair.status === 'in_progress' || searchedRepair.status === 'completed'
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 font-bold text-xs ${
                          searchedRepair.status === 'in_progress' || searchedRepair.status === 'completed'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-300 text-white'
                        }`}
                      >
                        2
                      </div>
                      <div>อยู่ระหว่างซ่อม (In Progress)</div>
                      <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                        {searchedRepair.assignedTechnician || 'กองช่างรับเรื่อง'}
                      </div>
                    </div>
                    {/* Step 3 */}
                    <div
                      className={`p-3 rounded-xl border ${
                        searchedRepair.status === 'completed'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 font-bold text-xs ${
                          searchedRepair.status === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-300 text-white'
                        }`}
                      >
                        3
                      </div>
                      <div>ซ่อมเสร็จสิ้น (Completed)</div>
                      <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                        {searchedRepair.repairedAt || 'รอการปิดงาน'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details & Photos Comparison (Before / After) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500">ประเภท:</span>{' '}
                      <strong className="text-slate-800">{searchedRepair.category}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">ความเร่งด่วน:</span>{' '}
                      <strong className="text-slate-800">{searchedRepair.urgency}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">สถานที่:</span>{' '}
                      <span className="text-slate-800">{searchedRepair.locationAddress} (หมู่ {searchedRepair.villageNo})</span>
                    </div>
                    <div>
                      <span className="text-slate-500">อาการชำรุด:</span>
                      <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 mt-1 text-slate-700">
                        {searchedRepair.description}
                      </p>
                    </div>

                    {searchedRepair.completionNotes && (
                      <div>
                        <span className="text-emerald-700 font-bold">บันทึกการซ่อมของนายช่าง:</span>
                        <p className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 mt-1 text-emerald-900">
                          {searchedRepair.completionNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Photo comparison */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-800">รูปภาพเปรียบเทียบ ก่อน - หลัง ซ่อมแซม</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[11px] font-semibold text-rose-700 mb-1">ภาพความเสียหาย (ก่อน)</div>
                        {searchedRepair.damagePhotos.length > 0 ? (
                          <img
                            src={searchedRepair.damagePhotos[0]}
                            alt="Before"
                            className="w-full aspect-video object-cover rounded-lg border border-slate-300"
                          />
                        ) : (
                          <div className="w-full aspect-video bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                            ไม่มีรูปภาพ
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-emerald-700 mb-1">ภาพหลังซ่อมเสร็จ (หลัง)</div>
                        {searchedRepair.completionPhotos && searchedRepair.completionPhotos.length > 0 ? (
                          <img
                            src={searchedRepair.completionPhotos[0]}
                            alt="After"
                            className="w-full aspect-video object-cover rounded-lg border border-emerald-300 shadow-xs"
                          />
                        ) : (
                          <div className="w-full aspect-video bg-slate-50 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-[10px] text-slate-400 p-2 text-center">
                            <Clock className="w-4 h-4 mb-1 text-slate-300" />
                            <span>อยู่ระหว่างรอช่างอัปเดต</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map location */}
                <div className="pt-2">
                  <h5 className="text-xs font-bold text-slate-800 mb-2">พิกัดสถานที่ในตำบลอ่างแก้ว</h5>
                  <InteractiveMap
                    mode="view"
                    initialCoords={searchedRepair.coordinates}
                    repairs={[searchedRepair]}
                    selectedRepairId={searchedRepair.id}
                    height="200px"
                  />
                </div>
              </div>
            )}

            {/* Quick list of recent 5+ repairs for easy click */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-4">
                เลือกดูสถานะงานแจ้งซ่อมตัวอย่างล่าสุด (อย่างน้อย 5 งาน)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentRepairs.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSearchedRepair(r);
                      setSearchTicket(r.ticketId);
                    }}
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-blue-900">{r.ticketId}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          r.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.status === 'completed' ? 'เสร็จสิ้น' : r.status === 'in_progress' ? 'กำลังซ่อม' : 'รอดำเนินการ'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 truncate">{r.category}</div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">หมู่ {r.villageNo} • {r.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: LICENSE SERVICE (E-LICENSE) ================= */}
        {activeTab === 'license_service' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-heading">
                  ระบบขอใบอนุญาตออนไลน์สำหรับประชาชน (E-License)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  ยื่นคำขอรับใบอนุญาต พร้อมแนบเอกสารหลักฐาน และติดตามผลการอนุมัติ 2 ขั้นตอน (หัวหน้าฝ่าย/กอง & นายก/ปลัด อบต.)
                </p>
              </div>
              <button
                onClick={() => setActiveTab('landing')}
                className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ← กลับหน้าแรก
              </button>
            </div>

            {/* Track My Application Search Bar */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                <span>ตรวจสอบประวัติและติดตามสถานะใบอนุญาตของท่าน</span>
              </h3>
              <form onSubmit={handleSearchMyLicenses} className="flex gap-2">
                <input
                  type="text"
                  placeholder="กรอกเลขประจำตัวประชาชน 13 หลัก เพื่อค้นหาใบอนุญาตของคุณ"
                  value={searchCitizenId}
                  onChange={(e) => setSearchCitizenId(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  ค้นหาคำขอของฉัน
                </button>
              </form>

              {trackedApplications.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-700">รายการคำขอที่พบ ({trackedApplications.length} รายการ):</h4>
                  {trackedApplications.map((app) => (
                    <div key={app.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-blue-900 text-xs">{app.applicationNo}</span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                            app.status === 'step2_approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'step1_approved'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {app.status === 'step2_approved'
                            ? 'อนุมัติออกใบอนุญาตแล้ว'
                            : app.status === 'step1_approved'
                            ? 'ผ่านการตรวจขั้นที่ 1 (รอผู้บริหารลงนาม)'
                            : 'ยื่นคำขอแล้ว (รอตรวจสอบ)'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800">{app.licenseTitle}</div>
                      <div className="text-[11px] text-slate-500">
                        ผู้ยื่น: {app.applicantName} • วันที่ยื่น: {app.submittedAt}
                      </div>

                      {app.status === 'step2_approved' && app.step2Approval && (
                        <div className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between">
                          <div>
                            <div><strong>เลขที่ใบอนุญาต:</strong> {app.step2Approval.licenseCertNo}</div>
                            <div className="text-[11px]">ลงนามอนุมัติโดย: {app.step2Approval.approverName}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => alert(`จำลองการพิมพ์/ดาวน์โหลด e-License ใบอนุญาตเลขที่: ${app.step2Approval?.licenseCertNo}`)}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                          >
                            พิมพ์ใบอนุญาต
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* License Application Form */}
            {licenseSubmitSuccess && (
              <div className="p-6 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-emerald-900 space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-base">ยื่นขอใบอนุญาตออนไลน์สำเร็จ!</h3>
                    <p className="text-xs text-emerald-700">
                      เลขที่คำขอของคุณคือ: <strong>{licenseSubmitSuccess}</strong> ข้อมูลได้ส่งต่อไปยังหัวหน้าส่วนราชการเพื่อตรวจสอบแล้ว
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setLicenseSubmitSuccess(null)}
                  className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  ยื่นคำขอใหม่
                </button>
              </div>
            )}

            <form onSubmit={handleSubmitLicense} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              {/* Select License Type */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  เลือกประเภทใบอนุญาตที่ต้องการยื่นขอ <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {licenseTypes.map((lt) => (
                    <button
                      key={lt.id}
                      type="button"
                      onClick={() => {
                        setSelectedLicenseType(lt);
                        setFormValues({});
                      }}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                        selectedLicenseType.id === lt.id
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{lt.title}</div>
                      <div className="text-[11px] text-blue-700 font-medium mt-0.5">กองผู้รับผิดชอบ: {lt.divisionName}</div>
                      <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{lt.description}</div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>ค่าธรรมเนียม: {lt.fee} บาท</span>
                        <span>ระยะเวลาดำเนินการ: ~{lt.estimatedDays} วันทำการ</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Applicant Profile */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-200 uppercase tracking-wider">
                  ข้อมูลผู้ยื่นคำขอ (ผูกกับตัวบุคคลตามกฎหมาย)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เลขประจำตัวประชาชน (13 หลัก) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น 1-1504-00123-45-6"
                      value={citizenId}
                      onChange={(e) => setCitizenId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อ - นามสกุล ผู้ยื่น <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น นายสมบัติ เจริญทรัพย์"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เบอร์โทรศัพท์ติดต่อ <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="เช่น 081-987-6543"
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ที่อยู่ตามทะเบียนบ้าน
                    </label>
                    <input
                      type="text"
                      placeholder="บ้านเลขที่ หมู่ที่ ตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง"
                      value={applicantAddress}
                      onChange={(e) => setApplicantAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Custom Fields based on License Config */}
              {selectedLicenseType.customFields.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-200 uppercase tracking-wider">
                    ข้อมูลเฉพาะสำหรับ: {selectedLicenseType.title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {selectedLicenseType.customFields.map((field) => (
                      <div key={field.id} className={field.fieldType === 'textarea' ? 'sm:col-span-2' : ''}>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {field.label} {field.required && <span className="text-rose-600">*</span>}
                        </label>

                        {field.fieldType === 'text' && (
                          <input
                            type="text"
                            required={field.required}
                            placeholder={field.placeholder}
                            value={formValues[field.id] || ''}
                            onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                          />
                        )}

                        {field.fieldType === 'number' && (
                          <input
                            type="number"
                            required={field.required}
                            placeholder={field.placeholder}
                            value={formValues[field.id] || ''}
                            onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                          />
                        )}

                        {field.fieldType === 'textarea' && (
                          <textarea
                            rows={3}
                            required={field.required}
                            placeholder={field.placeholder}
                            value={formValues[field.id] || ''}
                            onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                          />
                        )}

                        {field.fieldType === 'select' && (
                          <select
                            required={field.required}
                            value={formValues[field.id] || ''}
                            onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="">-- โปรดเลือก --</option>
                            {field.options?.map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}

                        {field.fieldType === 'radio' && (
                          <div className="space-y-1.5 mt-1">
                            {field.options?.map((opt, i) => (
                              <label key={i} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="radio"
                                  name={field.id}
                                  required={field.required}
                                  checked={formValues[field.id] === opt}
                                  onChange={() => setFormValues({ ...formValues, [field.id]: opt })}
                                  className="text-blue-600"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Documents checklist */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-200 uppercase tracking-wider">
                  เอกสารหลักฐานที่จำเป็น (แนบไฟล์ PDF/ภาพ)
                </h3>
                <div className="space-y-2 mt-3">
                  {selectedLicenseType.requiredDocuments.map((docName, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium text-slate-800">{docName}</span>
                      </div>
                      <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 flex items-center gap-1">
                        <Upload className="w-3 h-3 text-blue-600" />
                        พร้อมแนบไฟล์อัตโนมัติ
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>ยื่นคำขอรับใบอนุญาตออนไลน์</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="mt-16 bg-slate-900 text-white border-t border-slate-800 py-8 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400">
          <div>
            <div className="font-bold text-white text-sm font-heading">{cms.orgName}</div>
            <p className="mt-1">{cms.orgSubName} • รหัสไปรษณีย์ {cms.postalCode}</p>
            <p className="mt-0.5">โทรศัพท์: {cms.phone} • อีเมล: {cms.email}</p>
          </div>
          <div className="text-right">
            <p>© {cms.currentFiscalYear || '2570'} {cms.orgName}. สงวนลิขสิทธิ์</p>
            <p className="text-[11px] text-slate-500 mt-1">
              ระบบสารสนเทศตามระเบียบสารบรรณภาครัฐและ พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
