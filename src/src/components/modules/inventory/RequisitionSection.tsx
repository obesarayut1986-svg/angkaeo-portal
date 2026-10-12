import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  Package,
  AlertCircle,
  User,
  Building2,
  Calendar,
  Sparkles,
  Search,
  Check,
  X,
  ChevronRight,
  Eye,
  Layers,
  ArrowDownCircle,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import {
  MaterialItem,
  MaterialRequisition,
  Division,
  RequisitionStatus,
} from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import {
  createMaterialRequisition,
  approveRequisitionByDirector,
  dispenseRequisitionByStockOfficer,
  rejectRequisition,
  generateRequisitionNo,
  logPdpaAction,
} from '../../../db/storage';
import { printHtmlContent } from '../../../utils/printHelper';
import { PrintModal } from '../../common/PrintModal';

interface RequisitionSectionProps {
  materials: MaterialItem[];
  requisitions: MaterialRequisition[];
  divisions: Division[];
  selectedDivisionId: string;
  onSelectDivision: (id: string) => void;
}

export const RequisitionSection: React.FC<RequisitionSectionProps> = ({
  materials,
  requisitions,
  divisions,
  selectedDivisionId,
  onSelectDivision,
}) => {
  const { currentUser, canAccess } = useAuth();

  // Sub-view: 'create' = เขียนใบเบิก, 'list' = รายการคำขอเบิก & อนุมัติ
  const [subView, setSubView] = useState<'create' | 'list'>('create');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Requisition for View / Print Modal
  const [activeReqForPrint, setActiveReqForPrint] = useState<MaterialRequisition | null>(null);
  const [activeReqForDetail, setActiveReqForDetail] = useState<MaterialRequisition | null>(null);

  // Approval / Dispense / Reject Dialog states
  const [approvalModalReq, setApprovalModalReq] = useState<MaterialRequisition | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [dispenseModalReq, setDispenseModalReq] = useState<MaterialRequisition | null>(null);
  const [dispenseComment, setDispenseComment] = useState('');
  const [rejectModalReq, setRejectModalReq] = useState<MaterialRequisition | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Print modal state (safe preview & print without browser freeze)
  const [printModalData, setPrintModalData] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    html: string;
    fileName: string;
  } | null>(null);

  // Filter only my requisitions (especially useful for staff requesters)
  const [onlyMyRequests, setOnlyMyRequests] = useState<boolean>(currentUser?.role === 'staff');

  // Determine current division context
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const effectiveDivisionId = isSuperAdmin
    ? selectedDivisionId || divisions[0]?.id || 'div-palad'
    : currentUser?.divisionId || 'div-palad';

  const currentDiv = divisions.find((d) => d.id === effectiveDivisionId) || divisions[0];

  // Requisition Form States (Following the user's explicit specification)
  // 1. Auto-fill values
  const [previewReqNo, setPreviewReqNo] = useState('');
  const [currentDateTimeThai, setCurrentDateTimeThai] = useState('');

  useEffect(() => {
    if (currentDiv) {
      const code = currentDiv.shortCode || currentDiv.code || 'ปล';
      setPreviewReqNo(generateRequisitionNo(code));
    }
    const nowStr = new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
    setCurrentDateTimeThai(nowStr);
  }, [currentDiv, requisitions]);

  // 2. User Input states
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [reqQuantity, setReqQuantity] = useState<number>(2); // Default 2 as in prompt example
  const [reqPurpose, setReqPurpose] = useState<string>('ใช้สำหรับพิมพ์เอกสารประชุมสภา');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter materials: ONLY show materials belonging to the current division!
  const divisionMaterials = materials.filter((m) => m.divisionId === effectiveDivisionId);

  // Set default selected material when division materials change
  useEffect(() => {
    if (divisionMaterials.length > 0 && (!selectedMaterialId || !divisionMaterials.some(m => m.id === selectedMaterialId))) {
      setSelectedMaterialId(divisionMaterials[0].id);
    }
  }, [divisionMaterials, selectedMaterialId]);

  const activeMaterial = divisionMaterials.find((m) => m.id === selectedMaterialId);

  // 3. System Calculate
  const unitPrice = activeMaterial?.unitPrice || 0;
  const totalPrice = unitPrice * (reqQuantity > 0 ? reqQuantity : 0);
  const stockAvailable = activeMaterial?.currentStock ?? 0;
  const isOverStock = reqQuantity > stockAvailable;

  // Preset purpose choices for rapid entry
  const presetPurposes = [
    'ใช้สำหรับพิมพ์เอกสารประชุมสภา',
    'ใช้ในงานราชการและธุรการประจำวัน',
    'ใช้สำหรับโครงการฝึกอบรม/สัมมนา',
    'งานบริการประชาชนและงานประชาสัมพันธ์',
    'งานซ่อมบำรุงไฟฟ้าและสาธารณูปโภค',
  ];

  // Submission handler
  const handleSubmitRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMaterial) {
      alert('กรุณาเลือกรายการวัสดุ');
      return;
    }
    if (reqQuantity <= 0) {
      alert('กรุณาระบุจำนวนที่ต้องการเบิกอย่างน้อย 1 หน่วย');
      return;
    }
    if (isOverStock) {
      alert(`ไม่สามารถเบิกได้: จำนวนที่ขอเบิก (${reqQuantity}) เกินยอดคงเหลือในคลัง (${stockAvailable})`);
      return;
    }
    if (!reqPurpose.trim()) {
      alert('กรุณาระบุวัตถุประสงค์การเบิก');
      return;
    }

    const shortCode = currentDiv?.shortCode || currentDiv?.code || 'ปล';
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thaiDateTime = new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(now);

    const newReq = createMaterialRequisition({
      divisionId: currentDiv.id,
      divisionName: currentDiv.name,
      divisionShortCode: shortCode,
      requesterId: currentUser?.id || 'unknown',
      requesterName: currentUser?.fullName || 'เจ้าหน้าที่ผู้เบิก',
      requesterPosition: currentUser?.position || 'เจ้าหน้าที่',
      requestDate: todayStr,
      requestDateTime: thaiDateTime,
      purpose: reqPurpose.trim(),
      items: [
        {
          materialId: activeMaterial.id,
          materialCode: activeMaterial.code,
          materialName: activeMaterial.name,
          categoryName: activeMaterial.categoryName,
          unit: activeMaterial.unit,
          quantity: reqQuantity,
          unitPrice: activeMaterial.unitPrice, // ล็อกราคา ณ วันที่เบิก
          totalPrice: totalPrice,
        },
      ],
      totalAmount: totalPrice,
      fiscalYear: '2570',
    });

    logPdpaAction(
      currentUser?.fullName || 'ผู้เบิก',
      currentUser?.role || 'staff',
      'create',
      'material_requisition',
      newReq.reqNo,
      `ยื่นคำขอเบิกวัสดุ ${newReq.reqNo}: ${activeMaterial.name} จำนวน ${reqQuantity} ${activeMaterial.unit} รวมเป็นเงิน ${totalPrice} บาท`
    );

    setSuccessToast(`ส่งคำขอเบิกวัสดุเลขที่ ${newReq.reqNo} สำเร็จแล้ว!`);
    setSubView('list');
    setActiveReqForPrint(newReq); // Ready to print slip
  };

  // Approval action
  const handleConfirmApprove = () => {
    if (!approvalModalReq) return;
    approveRequisitionByDirector(
      approvalModalReq.id,
      currentUser?.id || '',
      currentUser?.fullName || 'หัวหน้ากอง',
      approvalComment.trim() || undefined
    );
    logPdpaAction(
      currentUser?.fullName || 'หัวหน้ากอง',
      'division_director',
      'update',
      'material_requisition_approval',
      approvalModalReq.reqNo,
      `อนุมัติคำขอเบิก ${approvalModalReq.reqNo} ส่งต่อให้ จนท.พัสดุจ่ายของ`
    );
    setApprovalModalReq(null);
    setApprovalComment('');
    setSuccessToast(`อนุมัติคำขอเบิก ${approvalModalReq.reqNo} เรียบร้อยแล้ว`);
  };

  // Dispense action (Deducts stock immediately)
  const handleConfirmDispense = () => {
    if (!dispenseModalReq) return;
    dispenseRequisitionByStockOfficer(
      dispenseModalReq.id,
      currentUser?.id || '',
      currentUser?.fullName || 'จนท.พัสดุ',
      dispenseComment.trim() || undefined
    );
    logPdpaAction(
      currentUser?.fullName || 'จนท.พัสดุ',
      'division_stock_officer',
      'update',
      'material_requisition_dispense',
      dispenseModalReq.reqNo,
      `จ่ายพัสดุและตัดยอดสต็อกตามใบเบิก ${dispenseModalReq.reqNo} สำเร็จ`
    );
    setDispenseModalReq(null);
    setDispenseComment('');
    setSuccessToast(`จ่ายพัสดุและตัดสต็อก ${dispenseModalReq.reqNo} เรียบร้อยแล้ว`);
  };

  // Reject action
  const handleConfirmReject = () => {
    if (!rejectModalReq) return;
    if (!rejectReason.trim()) {
      alert('กรุณาระบุเหตุผลที่ไม่อนุมัติ');
      return;
    }
    rejectRequisition(
      rejectModalReq.id,
      `${currentUser?.fullName} (${currentUser?.position})`,
      rejectReason.trim()
    );
    logPdpaAction(
      currentUser?.fullName || 'ผู้อนุมัติ',
      'division_director',
      'update',
      'material_requisition_reject',
      rejectModalReq.reqNo,
      `ไม่อนุมัติคำขอเบิก ${rejectModalReq.reqNo}: ${rejectReason}`
    );
    setRejectModalReq(null);
    setRejectReason('');
    setSuccessToast(`บันทึกการไม่อนุมัติคำขอเบิก ${rejectModalReq.reqNo} แล้ว`);
  };

  // Role permissions for Requisition Workflow
  const canApproveThisReq = (req: MaterialRequisition) => {
    if (req.status !== 'pending_approver') return false;
    if (isSuperAdmin) return true;
    if (
      (currentUser?.role === 'division_director' ||
        currentUser?.role === 'executive' ||
        canAccess('canApproveRequisition')) &&
      req.divisionId === currentUser?.divisionId
    ) {
      return true;
    }
    return false;
  };

  const canDispenseThisReq = (req: MaterialRequisition) => {
    if (req.status !== 'pending_dispense') return false;
    if (isSuperAdmin) return true;
    if (
      (currentUser?.role === 'division_stock_officer' ||
        currentUser?.role === 'division_admin' ||
        canAccess('canDispenseMaterial')) &&
      req.divisionId === currentUser?.divisionId
    ) {
      return true;
    }
    return false;
  };

  // Filtered Requisitions list
  const filteredRequisitions = requisitions.filter((r) => {
    // If not super admin, non-approvers can see only their division
    if (!isSuperAdmin && r.divisionId !== currentUser?.divisionId) {
      return false;
    }
    // If super admin and a specific division is selected in view
    if (isSuperAdmin && selectedDivisionId && r.divisionId !== selectedDivisionId) {
      return false;
    }
    // Filter only my requisitions if active
    if (onlyMyRequests && r.requesterId !== currentUser?.id) {
      return false;
    }
    if (statusFilter !== 'all' && r.status !== statusFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNo = r.reqNo.toLowerCase().includes(q);
      const matchName = r.requesterName.toLowerCase().includes(q);
      const matchItem = r.items.some((i) => i.materialName.toLowerCase().includes(q));
      if (!matchNo && !matchName && !matchItem) return false;
    }
    return true;
  });

  // Print official Form บ.พ.๑ using safe PrintModal & isolated print
  const handlePrintSlip = (req: MaterialRequisition) => {
    const itemsHtml = req.items
      .map(
        (it, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${it.materialName}</td>
          <td class="text-center">${it.materialCode}</td>
          <td class="text-center">${it.quantity}</td>
          <td class="text-center">${it.unit}</td>
          <td class="text-right">${it.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
          <td class="text-right font-bold">${it.totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
          <td>-</td>
        </tr>
      `
      )
      .join('');

    const slipHtml = `
      <div class="header-center">
        <svg viewBox="0 0 100 100" class="garuda" style="width: 65px; height: 65px;">
          <circle cx="50" cy="50" r="45" stroke="#1e3a8a" stroke-width="4" fill="#f8fafc" />
          <path d="M 50 20 L 60 40 L 80 45 L 65 60 L 70 80 L 50 70 L 30 80 L 35 60 L 20 45 L 40 40 Z" fill="#2563eb" />
        </svg>
        <h1 class="org-title" style="font-size: 16pt;">แบบ บ.พ. ๑ (ใบเบิกพัสดุ)</h1>
        <div class="org-sub" style="font-size: 14pt; font-weight: bold;">องค์การบริหารส่วนตำบลอ่างแก้ว</div>
        <div style="font-size: 12pt; color: #4b5563;">อำเภอโพธิ์ทอง จังหวัดอ่างทอง</div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13pt;">
        <div><strong>เลขที่ใบเบิก:</strong> <span style="font-size: 14pt; font-weight: bold; color: #1e3a8a;">${req.reqNo}</span></div>
        <div><strong>วันที่ขอเบิก:</strong> ${req.requestDateTime || req.requestDate}</div>
      </div>

      <div style="margin-bottom: 12px; font-size: 13pt; line-height: 1.6;">
        <p style="margin: 0;"><strong>เรียน:</strong> ผู้อำนวยการ/หัวหน้า${req.divisionName}</p>
        <p style="margin: 4px 0 0 0;">
          ข้าพเจ้า <strong>${req.requesterName}</strong> ตำแหน่ง <strong>${req.requesterPosition}</strong> 
          สังกัด <strong>${req.divisionName}</strong> มีความประสงค์ขอเบิกพัสดุ/วัสดุ เพื่อนำไปใช้ในราชการ ดังรายการต่อไปนี้:
        </p>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 6%;">ลำดับ</th>
            <th style="width: 35%;">รายการพัสดุ</th>
            <th style="width: 14%;">รหัสพัสดุ</th>
            <th style="width: 8%;">จำนวน</th>
            <th style="width: 8%;">หน่วย</th>
            <th style="width: 12%;">ราคา/หน่วย (บาท)</th>
            <th style="width: 12%;">รวมเป็นเงิน (บาท)</th>
            <th style="width: 5%;">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr>
            <td colspan="6" class="text-right font-bold" style="background: #f9fafb;">รวมเป็นเงินทั้งสิ้น</td>
            <td class="text-right font-bold" style="background: #f9fafb; color: #1e3a8a;">
              ${req.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </td>
            <td style="background: #f9fafb;">บาท</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 10px; font-size: 13pt;">
        <strong>วัตถุประสงค์การนำไปใช้:</strong> ${req.purpose}
      </div>

      <div class="signatures-grid" style="margin-top: 25px;">
        <div class="sig-box">
          <div>(ลงชื่อ)........................................................ ผู้ขอเบิก</div>
          <div style="margin-top: 4px;">(${req.requesterName})</div>
          <div>ตำแหน่ง: ${req.requesterPosition}</div>
          <div>วันที่: ${req.requestDate}</div>
        </div>
        <div class="sig-box">
          <div>(ลงชื่อ)........................................................ ผู้อนุมัติจ่าย</div>
          <div style="margin-top: 4px;">(${req.approverName || '........................................................'})</div>
          <div>ตำแหน่ง: หัวหน้า${req.divisionName}</div>
          <div>วันที่: ${req.approvedAt || '......../......../............'}</div>
        </div>
        <div class="sig-box" style="margin-top: 20px;">
          <div>(ลงชื่อ)........................................................ ผู้จ่ายพัสดุ</div>
          <div style="margin-top: 4px;">(${req.dispenserName || '........................................................'})</div>
          <div>ตำแหน่ง: เจ้าหน้าที่คลังพัสดุประจำกอง</div>
          <div>วันที่: ${req.dispensedAt || '......../......../............'}</div>
        </div>
        <div class="sig-box" style="margin-top: 20px;">
          <div>(ลงชื่อ)........................................................ ผู้รับพัสดุ</div>
          <div style="margin-top: 4px;">(${req.requesterName})</div>
          <div>ตำแหน่ง: ${req.requesterPosition}</div>
          <div>วันที่: ${req.dispensedAt || '......../......../............'}</div>
        </div>
      </div>
    `;

    setPrintModalData({
      isOpen: true,
      title: `แบบ บ.พ. ๑ ใบเบิกพัสดุ (${req.reqNo})`,
      subtitle: `${req.divisionName} • ผู้ขอเบิก: ${req.requesterName} (${req.requesterPosition})`,
      html: slipHtml,
      fileName: `ใบเบิกพัสดุ_${req.reqNo}`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Division Isolation Banner & Selector */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm">
                  คลังพัสดุ: {currentDiv?.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  รหัสย่อ: {currentDiv?.shortCode || currentDiv?.code}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {isSuperAdmin
                  ? 'ผู้ดูแลระบบหลัก: สามารถตรวจสอบและสลับดูแลคลังได้ทั้ง 4 กอง'
                  : `ระบบแยกคุมวัสดุอิสระประจำกอง: คุณมีสิทธิ์จัดการและเบิกวัสดุเฉพาะคลัง${currentDiv?.name}`}
              </p>
            </div>
          </div>

          {/* If Super Admin, allow picking from 4 divisions */}
          {isSuperAdmin ? (
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 px-2">สลับกอง:</span>
              {divisions.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onSelectDivision(d.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    effectiveDivisionId === d.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {d.shortCode || d.code}: {d.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>ผู้ใช้งาน: <strong>{currentUser?.fullName}</strong> ({currentUser?.position})</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub Tabs: Requisition Form vs Tracking */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubView('create')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              subView === 'create'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. เขียนใบขอเบิกวัสดุ (Requisition Form)</span>
          </button>
          <button
            onClick={() => setSubView('list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              subView === 'list'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. ประวัติและการอนุมัติใบเบิก ({filteredRequisitions.length})</span>
          </button>
        </div>
      </div>

      {/* ================= VIEW 1: REQUISITION FORM (FOLLOWING EXACT SPEC) ================= */}
      {subView === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    แบบฟอร์มการขอเบิกวัสดุราชการ
                  </h4>
                  <p className="text-xs text-slate-500">
                    ระบบดึงข้อมูลผู้เบิกอัตโนมัติ และกรองเฉพาะพัสดุในคลัง {currentDiv?.name}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {previewReqNo}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitRequisition} className="space-y-5">
              {/* 1. Auto-Fill Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>1. Auto-Fill (ระบบดึงข้อมูลจากบัญชีผู้ใช้ให้อัตโนมัติ เพื่อลดความผิดพลาด)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-500 block mb-1">เลขที่เอกสาร (ระบบ Gen อัตโนมัติ)</label>
                    <input
                      type="text"
                      readOnly
                      value={previewReqNo}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-mono font-bold text-blue-700 select-all"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      รูปแบบ: [รหัสกอง]-[ปีเดือน]-[ลำดับ]
                    </span>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">วันที่-เวลาที่ทำรายการ (Real-time)</label>
                    <input
                      type="text"
                      readOnly
                      value={currentDateTimeThai}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">ผู้เบิก / สังกัด</label>
                    <input
                      type="text"
                      readOnly
                      value={`${currentUser?.fullName || 'เจ้าหน้าที่'} (${currentDiv?.name})`}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-medium text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 2. User Input Section */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-800">
                  2. User Input (ผู้เบิกเลือกรายการและระบุจำนวน)
                </div>

                {/* Material Select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลือกรายการวัสดุ (ระบบฟิลเตอร์เฉพาะวัสดุใน "คลัง{currentDiv?.name}" เท่านั้น):
                  </label>
                  {divisionMaterials.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      ยังไม่มีรายการวัสดุในคลัง{currentDiv?.name} เจ้าหน้าที่พัสดุประจำกองสามารถเพิ่มรายการในแท็บ "คลังพัสดุประจำกอง" ได้ครับ
                    </div>
                  ) : (
                    <select
                      value={selectedMaterialId}
                      onChange={(e) => setSelectedMaterialId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {divisionMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{m.code}] {m.name} — คงเหลือ: {m.currentStock} {m.unit} (ราคา @{m.unitPrice.toLocaleString('th-TH')} บาท)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Quantity Input + Validation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        จำนวนที่ขอเบิก:
                      </label>
                      {activeMaterial && (
                        <span className="text-xs font-bold text-slate-500">
                          คงเหลือในคลัง: <strong className={activeMaterial.currentStock < 5 ? 'text-rose-600' : 'text-emerald-600'}>{activeMaterial.currentStock}</strong> {activeMaterial.unit}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max={stockAvailable}
                        value={reqQuantity}
                        onChange={(e) => setReqQuantity(parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold text-slate-900 focus:outline-none ${
                          isOverStock
                            ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200'
                            : 'border-slate-300 bg-white'
                        }`}
                      />
                      <span className="text-xs font-semibold text-slate-500 px-2 shrink-0">
                        {activeMaterial?.unit || 'หน่วย'}
                      </span>
                    </div>

                    {/* Immediate validation feedback */}
                    {isOverStock && (
                      <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <strong>แจ้งเตือน:</strong> จำนวนที่ขอเบิก ({reqQuantity} {activeMaterial?.unit}) เกินจำนวนคงเหลือในคลัง ({stockAvailable} {activeMaterial?.unit}) กรุณาระบุจำนวนใหม่
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Purpose presets */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ตัวเลือกวัตถุประสงค์ด่วน:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {presetPurposes.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setReqPurpose(p)}
                          className={`text-[11px] px-2 py-1 rounded-lg border transition cursor-pointer ${
                            reqPurpose === p
                              ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Purpose Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วัตถุประสงค์การนำไปใช้ (ระบุให้ชัดเจน):
                  </label>
                  <textarea
                    rows={2}
                    value={reqPurpose}
                    onChange={(e) => setReqPurpose(e.target.value)}
                    placeholder="เช่น ใช้สำหรับพิมพ์เอกสารประชุมสภา อบต.อ่างแก้ว สมัยสามัญ..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* 3. System Calculate Section */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>3. System Calculate (ระบบคำนวณราคาอัตโนมัติ และบันทึกล็อกราคาลงตารางเบิกจ่าย)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">ราคาต่อหน่วย (Unit Price)</span>
                    <span className="text-base font-bold text-slate-800">
                      {unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿ / {activeMaterial?.unit || 'หน่วย'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">จำนวนที่เบิก</span>
                    <span className="text-base font-bold text-slate-800">
                      {reqQuantity} {activeMaterial?.unit || 'หน่วย'}
                    </span>
                  </div>
                  <div className="bg-blue-600 text-white p-3 rounded-xl shadow-xs">
                    <span className="text-blue-100 block text-[11px]">รวมเป็นเงินทั้งสิ้น</span>
                    <span className="text-lg font-extrabold">
                      {totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  * หมายเหตุ: ระบบจะบันทึกราคา {unitPrice} บาท × {reqQuantity} = {totalPrice} บาท ลงในใบเบิกทันที เพื่อป้องกันปัญหาราคาพัสดุล็อตใหม่เปลี่ยนแปลงในอนาคต
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isOverStock || reqQuantity <= 0 || !activeMaterial}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>ส่งคำขอเบิกวัสดุ (ส่งต่อหัวหน้ากองอนุมัติ)</span>
                </button>
              </div>
            </form>
          </div>

          {/* Workflow & Policy Guide Card */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>ขั้นตอนการเบิกวัสดุ อบต.อ่างแก้ว (3 ขั้น)</span>
              </h4>

              <div className="space-y-3 text-xs">
                {/* Step 1 */}
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 font-bold text-blue-900 mb-1">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">1</span>
                    <span>ผู้ใช้ทั่วไป (Requester)</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    เขียนใบขอเบิก ค้นหาเฉพาะวัสดุในคลังของกองตนเอง ตรวจสอบยอดคงเหลือ และส่งคำขอ
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] flex items-center justify-center">2</span>
                    <span>หัวหน้ากอง (Approver)</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    ผู้อำนวยการกอง/ปลัด อนุมัติคำขอเบิกของพนักงานในกองตนเอง ก่อนส่งต่อไปยังคลังพัสดุ
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 mb-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center">3</span>
                    <span>จนท.คลังพัสดุประจำกอง (Dispenser)</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    ตรวจสอบใบเบิกที่ผ่านการอนุมัติ จ่ายของ และกดยืนยันตัดสต็อกคลังของกองตนเองทันที
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Example Card (Matching user prompt) */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs space-y-3 text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>ตัวอย่างจริงตามระเบียบพัสดุ:</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                เมื่อ "จนท.วิเคราะห์ สำนักปลัด" ขอเบิก <strong>กระดาษ Double A จำนวน 2 รีม</strong>:
                ระบบจะค้นเฉพาะคลังสำนักปลัด ดึงราคา 125 บาท คูณ 2 รีม = 250 บาท 
                และสร้างเลขที่ใบเบิก <strong>ปล-202610-001</strong> ทันที
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: REQUISITION TRACKING & APPROVALS ================= */}
      {subView === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาเลขที่ใบเบิก, ผู้ขอเบิก, วัสดุ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">สถานะ: ทั้งหมด</option>
                <option value="pending_approver">รอหัวหน้ากองอนุมัติ</option>
                <option value="pending_dispense">รอ จนท.พัสดุจ่ายของ/ตัดสต็อก</option>
                <option value="completed">จ่ายพัสดุและตัดสต็อกแล้ว</option>
                <option value="rejected">ไม่อนุมัติ</option>
              </select>

              <button
                onClick={() => setSubView('create')}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>+ เขียนใบเบิกใหม่</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">เลขที่ใบเบิก</th>
                    <th className="py-3 px-4">วันที่-เวลา</th>
                    <th className="py-3 px-4">ผู้ขอเบิก / สังกัด</th>
                    <th className="py-3 px-4">รายการวัสดุที่ขอเบิก</th>
                    <th className="py-3 px-4 text-right">ยอดรวม (บาท)</th>
                    <th className="py-3 px-4">สถานะการดำเนินการ</th>
                    <th className="py-3 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequisitions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        ไม่พบรายการใบเบิกวัสดุในเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredRequisitions.map((req) => {
                      const canApprove = canApproveThisReq(req);
                      const canDispense = canDispenseThisReq(req);

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                            {req.reqNo}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {req.requestDateTime || req.requestDate}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{req.requesterName}</div>
                            <div className="text-[11px] text-slate-400">{req.requesterPosition} • {req.divisionName}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {req.items.map((it, idx) => (
                              <div key={idx} className="font-medium text-slate-800">
                                {it.materialName} ({it.quantity} {it.unit} @{it.unitPrice} ฿)
                              </div>
                            ))}
                            <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                              วัตถุประสงค์: {req.purpose}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            {req.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4">
                            {req.status === 'pending_approver' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>รอหัวหน้ากองอนุมัติ</span>
                              </span>
                            )}
                            {req.status === 'pending_dispense' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                <Package className="w-3 h-3 text-blue-600" />
                                <span>รอ จนท.พัสดุจ่ายของ</span>
                              </span>
                            )}
                            {req.status === 'completed' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>ตัดสต็อกแล้ว</span>
                              </span>
                            )}
                            {req.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>ไม่อนุมัติ</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {/* Approver Button */}
                            {canApprove && (
                              <button
                                onClick={() => {
                                  setApprovalModalReq(req);
                                  setApprovalComment('อนุมัติ ให้เบิกจ่ายได้ตามความจำเป็น');
                                }}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition cursor-pointer"
                              >
                                อนุมัติคำขอ
                              </button>
                            )}

                            {/* Dispenser Button */}
                            {canDispense && (
                              <button
                                onClick={() => {
                                  setDispenseModalReq(req);
                                  setDispenseComment('จ่ายพัสดุและตัดสต็อกเรียบร้อยแล้ว');
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition cursor-pointer"
                              >
                                จ่ายของและตัดสต็อก
                              </button>
                            )}

                            {/* Print Slip Button */}
                            <button
                              onClick={() => handlePrintSlip(req)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] border border-slate-200 transition cursor-pointer inline-flex items-center gap-1"
                              title="พิมพ์ใบเบิกพัสดุ บ.พ.๑"
                            >
                              <Printer className="w-3 h-3 text-blue-600" />
                              <span>พิมพ์ใบเบิก</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: APPROVE REQUISITION ================= */}
      {approvalModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600" />
                <span>อนุมัติคำขอเบิกวัสดุ ({approvalModalReq.reqNo})</span>
              </h3>
              <button onClick={() => setApprovalModalReq(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p>ผู้ขอเบิก: <strong>{approvalModalReq.requesterName}</strong> ({approvalModalReq.divisionName})</p>
              <p>รายการ: <strong>{approvalModalReq.items[0]?.materialName}</strong> ({approvalModalReq.items[0]?.quantity} {approvalModalReq.items[0]?.unit})</p>
              <p>รวมเป็นเงิน: <strong>{approvalModalReq.totalAmount.toLocaleString('th-TH')} บาท</strong></p>
              <p>วัตถุประสงค์: {approvalModalReq.purpose}</p>

              <div className="pt-2">
                <label className="block font-semibold text-slate-700 mb-1">ความเห็น/คำสั่งหัวหน้ากอง:</label>
                <textarea
                  rows={2}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setRejectModalReq(approvalModalReq);
                  setApprovalModalReq(null);
                }}
                className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                ไม่อนุมัติ
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
              >
                ยืนยันการอนุมัติ (ส่งต่อ จนท.พัสดุ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DISPENSE & DEDUCT STOCK ================= */}
      {dispenseModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>จ่ายพัสดุและตัดสต็อก ({dispenseModalReq.reqNo})</span>
              </h3>
              <button onClick={() => setDispenseModalReq(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <p className="font-bold">การตัดยอดสต็อกคลัง{dispenseModalReq.divisionName}:</p>
              <p>
                ระบบจะทำการตัดยอด <strong>{dispenseModalReq.items[0]?.materialName}</strong> ออกจากสต็อกคลังจำนวน <strong>{dispenseModalReq.items[0]?.quantity} {dispenseModalReq.items[0]?.unit}</strong> ทันที
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <p>ผู้รับพัสดุ: <strong>{dispenseModalReq.requesterName}</strong></p>
              <p>ผู้อนุมัติ: <strong>{dispenseModalReq.approverName || 'ผอ.กอง'}</strong></p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">หมายเหตุการจ่ายพัสดุ:</label>
                <input
                  type="text"
                  value={dispenseComment}
                  onChange={(e) => setDispenseComment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setDispenseModalReq(null)}
                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDispense}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                ยืนยันการจ่ายพัสดุ & ตัดสต็อก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REJECT REQUISITION ================= */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>ไม่อนุมัติคำขอเบิก ({rejectModalReq.reqNo})</span>
              </h3>
              <button onClick={() => setRejectModalReq(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-slate-700">ระบุเหตุผลที่ไม่อนุมัติ:</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="เช่น พัสดุชนิดนี้ต้องสงวนไว้สำหรับโครงการสำคัญ หรือให้ปรับลดจำนวน..."
                className="w-full px-3 py-2 border rounded-xl focus:outline-none text-xs"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                บันทึกการไม่อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRINT MODAL (SAFE PREVIEW & NO FREEZE) ================= */}
      {printModalData && (
        <PrintModal
          isOpen={printModalData.isOpen}
          title={printModalData.title}
          subtitle={printModalData.subtitle}
          htmlContent={printModalData.html}
          fileName={printModalData.fileName}
          onClose={() => setPrintModalData(null)}
        />
      )}
    </div>
  );
};
