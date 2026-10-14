import React, { useState, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  UserCheck,
  ShieldCheck,
  Printer,
  Edit3,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Building2,
  Check,
  X,
  Send,
  Lock,
  Layers,
  ArrowRight,
  Eye,
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
  updateMaterialRequisition,
  cancelOrRevertMaterialRequisition,
  approveRequisitionByDirector,
  dispenseRequisitionByStockOfficer,
  rejectRequisition,
  logPdpaAction,
  getMaterialCategories,
} from '../../../db/storage';

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
  const { currentUser } = useAuth();

  // Role Checks - Strictly enforced from real authentication
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isDirector =
    isSuperAdmin ||
    currentUser?.role === 'division_director' ||
    currentUser?.role === 'executive';
  const isStockOfficer =
    isSuperAdmin ||
    currentUser?.role === 'division_stock_officer' ||
    currentUser?.role === 'division_admin';

  // General Requester / External / Staff
  const isRequesterOnly = !isDirector && !isStockOfficer;

  // Active view tab inside requisition section
  // Note: Requesters NEVER see the 'director_approval' tab!
  const [viewTab, setViewTab] = useState<'create' | 'my_requests' | 'director_approval' | 'all_records'>(
    isDirector ? 'director_approval' : 'create'
  );

  // If a requester somehow had 'director_approval' active, force reset to 'create'
  React.useEffect(() => {
    if (isRequesterOnly && viewTab === 'director_approval') {
      setViewTab('create');
    }
  }, [isRequesterOnly, viewTab]);

  // Current Division
  const currentDiv = divisions.find((d) => d.id === selectedDivisionId) || divisions[0];
  const divisionMaterials = useMemo(() => {
    return materials.filter((m) => m.divisionId === selectedDivisionId);
  }, [materials, selectedDivisionId]);

  // Filtered requisitions for current division
  const divisionReqs = useMemo(() => {
    return requisitions.filter((r) => r.divisionId === selectedDivisionId);
  }, [requisitions, selectedDivisionId]);

  // Requisitions created by the current user (for tracking & mistakes correction)
  const myReqs = useMemo(() => {
    if (isSuperAdmin || isStockOfficer) return divisionReqs;
    return divisionReqs.filter(
      (r) =>
        r.requesterId === currentUser?.id ||
        r.requesterName.trim() === currentUser?.fullName.trim()
    );
  }, [divisionReqs, currentUser, isSuperAdmin, isStockOfficer]);

  // Pending for Director Approval
  const pendingDirectorReqs = useMemo(() => {
    return divisionReqs.filter((r) => r.status === 'pending_approver');
  }, [divisionReqs]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // New Requisition Form State
  const [reqCategoryFilter, setReqCategoryFilter] = useState<string>('all');
  const [reqMaterialId, setReqMaterialId] = useState<string>(divisionMaterials[0]?.id || '');
  const [reqQuantity, setReqQuantity] = useState<number>(1);
  const [reqPurpose, setReqPurpose] = useState('');
  const [reqRequesterName, setReqRequesterName] = useState(currentUser?.fullName || '');
  const [reqRequesterPos, setReqRequesterPos] = useState(currentUser?.position || 'เจ้าหน้าที่ผู้เบิก');
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Available Categories
  const categories = useMemo(() => {
    return getMaterialCategories();
  }, []);

  // Filtered materials by category for requisition form
  const filteredMaterialsForReq = useMemo(() => {
    if (reqCategoryFilter === 'all') {
      return divisionMaterials;
    }
    return divisionMaterials.filter((m) => m.categoryName === reqCategoryFilter);
  }, [divisionMaterials, reqCategoryFilter]);

  // Sync selected material when division or category filter changes
  React.useEffect(() => {
    if (filteredMaterialsForReq.length > 0) {
      const exists = filteredMaterialsForReq.some((m) => m.id === reqMaterialId);
      if (!exists) {
        setReqMaterialId(filteredMaterialsForReq[0].id);
      }
    } else {
      setReqMaterialId('');
    }
  }, [filteredMaterialsForReq, reqMaterialId]);

  // Selected Material for Form
  const selectedMaterial =
    filteredMaterialsForReq.find((m) => m.id === reqMaterialId) ||
    divisionMaterials.find((m) => m.id === reqMaterialId) ||
    materials.find((m) => m.id === reqMaterialId);
  const formUnitPrice = selectedMaterial?.unitPrice || 0;
  const formTotalPrice = formUnitPrice * (reqQuantity > 0 ? reqQuantity : 0);
  const availableStock = selectedMaterial?.currentStock ?? 0;
  const isOverStock = reqQuantity > availableStock;

  // ================= MODAL STATES =================
  // 1. Director Approval Modal
  const [approvalModalReq, setApprovalModalReq] = useState<MaterialRequisition | null>(null);
  const [approvalComment, setApprovalComment] = useState('');

  // 2. Reject Modal
  const [rejectModalReq, setRejectModalReq] = useState<MaterialRequisition | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 3. Edit Mistaken Requisition Modal (For Requester / Officer before approval)
  const [editReqModal, setEditReqModal] = useState<MaterialRequisition | null>(null);
  const [editReqMaterialId, setEditReqMaterialId] = useState('');
  const [editReqQuantity, setEditReqQuantity] = useState<number>(1);
  const [editReqPurpose, setEditReqPurpose] = useState('');
  const [editReqRequesterName, setEditReqRequesterName] = useState('');

  // 4. Cancel / Revert Modal (For Reverting mistaken completed req & returning stock)
  const [revertModalReq, setRevertModalReq] = useState<MaterialRequisition | null>(null);
  const [revertReason, setRevertReason] = useState('');

  // 5. Print Preview Voucher Slip Modal
  const [printModalReq, setPrintModalReq] = useState<MaterialRequisition | null>(null);

  // Handlers
  const handleCreateRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) {
      alert('กรุณาเลือกรายการวัสดุก่อน');
      return;
    }
    if (reqQuantity <= 0) {
      alert('จำนวนที่เบิกต้องมากกว่า 0');
      return;
    }
    if (reqQuantity > availableStock) {
      alert(`สต็อกคงเหลือไม่เพียงพอ (คงเหลือ ${availableStock} ${selectedMaterial.unit})`);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const thaiDateTime = new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());

    const newReq = createMaterialRequisition({
      divisionId: selectedDivisionId,
      divisionName: currentDiv?.name || 'กอง',
      divisionShortCode: currentDiv?.shortCode || currentDiv?.code || 'ปล',
      requesterId: currentUser?.id || `req-ext-${Date.now()}`,
      requesterName: reqRequesterName.trim() || 'ผู้ขอเบิก',
      requesterPosition: reqRequesterPos.trim() || 'เจ้าหน้าที่',
      requestDate: today,
      requestDateTime: thaiDateTime,
      purpose: reqPurpose.trim() || 'เพื่อใช้ในภารกิจงานของหน่วยงาน',
      items: [
        {
          materialId: selectedMaterial.id,
          materialCode: selectedMaterial.code,
          materialName: selectedMaterial.name,
          categoryName: selectedMaterial.categoryName,
          unit: selectedMaterial.unit,
          quantity: reqQuantity,
          unitPrice: formUnitPrice,
          totalPrice: formTotalPrice,
        },
      ],
      totalAmount: formTotalPrice,
      fiscalYear: '2570',
    });

    logPdpaAction(
      reqRequesterName,
      currentUser?.role || 'staff',
      'create',
      'material_requisition',
      newReq.reqNo,
      `สร้างใบขอเบิกพัสดุเลขที่ ${newReq.reqNo} (${selectedMaterial.name} จำนวน ${reqQuantity} ${selectedMaterial.unit})`
    );

    setReqQuantity(1);
    setReqPurpose('');
    setFormSuccessMessage(`ส่งใบขอเบิกเลขที่ ${newReq.reqNo} เรียบร้อยแล้ว! สถานะ: รอ ผอ.กอง พิจารณาอนุมัติ`);
    setTimeout(() => setFormSuccessMessage(null), 6000);
    setViewTab('my_requests');
  };

  // Director Confirm Approval
  const handleConfirmDirectorApprove = () => {
    if (!approvalModalReq) return;
    if (!isDirector) {
      alert('ท่านไม่มีสิทธิ์ในการอนุมัติเบิกพัสดุ (เฉพาะผู้อำนวยการกอง หรือผู้ดูแลระบบเท่านั้น)');
      setApprovalModalReq(null);
      return;
    }

    const approverName = currentUser?.fullName || 'ผู้อำนวยการกอง';
    approveRequisitionByDirector(
      approvalModalReq.id,
      currentUser?.id || 'dir-id',
      approverName,
      approvalComment || 'อนุมัติการเบิกจ่ายตามระเบียบพัสดุ และตัดยอดสต็อกเรียบร้อยแล้ว'
    );

    logPdpaAction(
      approverName,
      'division_director',
      'update',
      'material_requisition_approval',
      approvalModalReq.reqNo,
      `ผอ.กอง อนุมัติใบขอเบิกเลขที่ ${approvalModalReq.reqNo} และระบบตัดยอดสต็อกพัสดุเข้าบัญชี พ.ด.๔ เรียบร้อยแล้ว`
    );

    setApprovalModalReq(null);
    setApprovalComment('');
  };

  // Reject Request
  const handleConfirmReject = () => {
    if (!rejectModalReq) return;
    if (!isDirector) {
      alert('เฉพาะผู้อำนวยการกองเท่านั้นที่มีสิทธิ์ไม่อนุมัติคำขอ');
      setRejectModalReq(null);
      return;
    }

    rejectRequisition(
      rejectModalReq.id,
      currentUser?.fullName || 'ผู้อำนวยการกอง',
      rejectReason || 'ไม่อนุมัติการเบิก'
    );

    setRejectModalReq(null);
    setRejectReason('');
  };

  // Open Edit Modal for Mistaken Requisition
  const handleOpenEditMistake = (req: MaterialRequisition) => {
    setEditReqModal(req);
    setEditReqMaterialId(req.items[0]?.materialId || divisionMaterials[0]?.id || '');
    setEditReqQuantity(req.items[0]?.quantity || 1);
    setEditReqPurpose(req.purpose || '');
    setEditReqRequesterName(req.requesterName || '');
  };

  // Save Edit for Mistaken Requisition
  const handleSaveEditedReq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReqModal) return;

    const chosenMat = divisionMaterials.find((m) => m.id === editReqMaterialId) || materials.find((m) => m.id === editReqMaterialId);
    if (!chosenMat) {
      alert('ไม่พบข้อมูลวัสดุ');
      return;
    }
    if (editReqQuantity <= 0) {
      alert('จำนวนต้องมากกว่า 0');
      return;
    }
    if (editReqQuantity > chosenMat.currentStock) {
      alert(`จำนวนขอเบิกเกินยอดคงเหลือ (คงเหลือ: ${chosenMat.currentStock} ${chosenMat.unit})`);
      return;
    }

    const newUnitPrice = chosenMat.unitPrice || 0;
    const newTotalPrice = newUnitPrice * editReqQuantity;

    updateMaterialRequisition(editReqModal.id, {
      purpose: editReqPurpose,
      requesterName: editReqRequesterName,
      items: [
        {
          materialId: chosenMat.id,
          materialCode: chosenMat.code,
          materialName: chosenMat.name,
          categoryName: chosenMat.categoryName,
          unit: chosenMat.unit,
          quantity: editReqQuantity,
          unitPrice: newUnitPrice,
          totalPrice: newTotalPrice,
        },
      ],
      totalAmount: newTotalPrice,
    });

    logPdpaAction(
      currentUser?.fullName || 'ผู้ใช้งาน',
      currentUser?.role || 'staff',
      'update',
      'material_requisition_correction',
      editReqModal.reqNo,
      `แก้ไขรายการขอเบิกที่ผิดพลาดในใบเบิกเลขที่ ${editReqModal.reqNo}`
    );

    setEditReqModal(null);
  };

  // Cancel / Revert Completed Requisition (คืนยอดสต็อกเข้าคลัง)
  const handleConfirmRevertCompleted = () => {
    if (!revertModalReq) return;
    if (!isStockOfficer && !isDirector) {
      alert('เฉพาะเจ้าหน้าที่คลังพัสดุหรือ ผอ.กอง เท่านั้นที่สามารถยกเลิกและคืนยอดสต็อกได้');
      setRevertModalReq(null);
      return;
    }

    cancelOrRevertMaterialRequisition(
      revertModalReq.id,
      currentUser?.fullName || 'เจ้าหน้าที่พัสดุ',
      revertReason || 'ยกเลิกเนื่องจากเบิกผิดพลาด และนำยอดพัสดุคืนเข้าคลังเรียบร้อยแล้ว'
    );

    logPdpaAction(
      currentUser?.fullName || 'เจ้าหน้าที่พัสดุ',
      currentUser?.role || 'division_stock_officer',
      'update',
      'material_requisition_revert',
      revertModalReq.reqNo,
      `ยกเลิกใบเบิกที่ตัดสต็อกแล้วเลขที่ ${revertModalReq.reqNo} และคืนยอดพัสดุเข้าคลังเรียบร้อยแล้ว (เหตุผล: ${revertReason})`
    );

    setRevertModalReq(null);
    setRevertReason('');
  };

  // Helper status badge renderer
  const renderStatusBadge = (status: RequisitionStatus) => {
    switch (status) {
      case 'pending_approver':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>รอ ผอ.กอง อนุมัติ</span>
          </span>
        );
      case 'pending_dispense':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>ผอ.อนุมัติแล้ว รอรับของ</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>อนุมัติ & ตัดสต็อกแล้ว</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>ไม่อนุมัติ</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>ยกเลิก/คืนสต็อกแล้ว</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* ================= TOP ROLE-AUTHENTICATED HEADER ================= */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ระบบคำขอเบิกพัสดุ & ลำดับการอนุมัติ (กอง{currentDiv?.name})
              </h3>
              <p className="text-xs text-slate-500">
                {isDirector
                  ? '👑 สิทธิ์ผู้อำนวยการกอง: ตรวจสอบและอนุมัติคำขอเบิกของกอง ระบบจะตัดยอดสต็อกเข้าบัญชี พ.ด.๔ ทันทีที่อนุมัติ'
                  : isStockOfficer
                  ? '📦 สิทธิ์เจ้าหน้าที่คลังพัสดุ: ตรวจสอบสต็อก จ่ายพัสดุ และจัดการแก้ไขกรณีเบิกผิดพลาด'
                  : '📝 สิทธิ์ผู้ขอเบิกพัสดุ: เขียนใบขอเบิก ตรวจสอบสถานะ และแก้ไขคำขอกรณีระบุผิดพลาด'}
              </p>
            </div>
          </div>
        </div>

        {/* Current User Role Identity Pill (Read-Only Security Indicator) */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-slate-500">เข้าใช้งานในนาม:</span>
            <strong className="text-slate-800">{currentUser?.fullName || 'ผู้เบิกทั่วไป'}</strong>
            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-100 text-blue-800">
              {currentUser?.position || (isDirector ? 'ผู้อำนวยการกอง' : 'ผู้ขอเบิก')}
            </span>
          </div>
        </div>
      </div>

      {/* ================= NAVIGATION TABS (ROLE-GUARDED) ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {/* Tab 1: Create Request (Available for Everyone) */}
          <button
            type="button"
            onClick={() => setViewTab('create')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
              viewTab === 'create'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เขียนใบเบิกพัสดุ</span>
          </button>

          {/* Tab 2: My Requests & Mistakes Tracking */}
          <button
            type="button"
            onClick={() => setViewTab('my_requests')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
              viewTab === 'my_requests'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>คำขอของฉัน / แก้ไขข้อผิดพลาด</span>
            {myReqs.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                viewTab === 'my_requests' ? 'bg-white text-blue-800 font-bold' : 'bg-slate-200 text-slate-700'
              }`}>
                {myReqs.length}
              </span>
            )}
          </button>

          {/* Tab 3: DIRECTOR ONLY APPROVAL TAB (Strictly hidden from general requesters!) */}
          {isDirector && (
            <button
              type="button"
              onClick={() => setViewTab('director_approval')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                viewTab === 'director_approval'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>รอ ผอ.กอง พิจารณาอนุมัติ</span>
              {pendingDirectorReqs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold animate-pulse">
                  {pendingDirectorReqs.length}
                </span>
              )}
            </button>
          )}

          {/* Tab 4: All Requisitions Ledger (For Director / Stock Officer / Super Admin) */}
          {(isDirector || isStockOfficer) && (
            <button
              type="button"
              onClick={() => setViewTab('all_records')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                viewTab === 'all_records'
                  ? 'bg-slate-800 text-white shadow-xs font-bold'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ทะเบียนใบเบิกทั้งหมด ({divisionReqs.length})</span>
            </button>
          )}
        </div>

        {/* Division Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>สังกัด: <strong>{currentDiv?.name}</strong></span>
        </div>
      </div>

      {/* ================= VIEW 1: CREATE REQUISITION FORM ================= */}
      {viewTab === 'create' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-5">
          <div className="border-b pb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>แบบฟอร์มขอเบิกวัสดุ (ตามระเบียบกระทรวงการคลังฯ)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              กรอกข้อมูลเพื่อส่งเรื่องเสนอ <strong>ผู้อำนวยการ{currentDiv?.name}</strong> พิจารณาอนุมัติการเบิกจ่าย
            </p>
          </div>

          {formSuccessMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{formSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleCreateRequisition} className="space-y-4 text-xs">
            {/* Requester Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อ-สกุล ผู้ขอเบิก <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reqRequesterName}
                  onChange={(e) => setReqRequesterName(e.target.value)}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ตำแหน่ง / หน่วยงาน <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reqRequesterPos}
                  onChange={(e) => setReqRequesterPos(e.target.value)}
                  placeholder="เช่น เจ้าพนักงานธุรการปฏิบัติงาน"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            {/* Material Picker & Stock Inspector */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-900">
                  เลือกประเภทและรายการพัสดุในคลัง ({currentDiv?.name}) <span className="text-rose-600">*</span>
                </label>
                <span className="text-[11px] text-blue-700 font-medium">
                  {filteredMaterialsForReq.length} จาก {divisionMaterials.length} รายการพร้อมให้เบิก
                </span>
              </div>

              {divisionMaterials.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  ⚠️ ยังไม่มีรายการวัสดุในคลังของกองนี้ เจ้าหน้าที่ต้องทำการรับเข้าพัสดุผ่านเมนู &ldquo;รับเข้าวัสดุ&rdquo; ก่อน
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Category Selection Dropdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        เลือกประเภท / หมวดหมู่วัสดุ:
                      </label>
                      <select
                        value={reqCategoryFilter}
                        onChange={(e) => setReqCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-blue-300 bg-white font-bold text-blue-900 text-xs focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      >
                        <option value="all">-- ทุกประเภทวัสดุ ({divisionMaterials.length} รายการ) --</option>
                        {categories.map((c) => {
                          const count = divisionMaterials.filter((m) => m.categoryName === c.name).length;
                          return (
                            <option key={c.id} value={c.name}>
                              {c.name} ({count} รายการ)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        เลือกรายการวัสดุที่จะขอเบิก: <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={reqMaterialId}
                        onChange={(e) => setReqMaterialId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
                      >
                        {filteredMaterialsForReq.length === 0 ? (
                          <option value="">-- ไม่มีรายการวัสดุในหมวดหมู่นี้ --</option>
                        ) : (
                          filteredMaterialsForReq.map((m) => (
                            <option key={m.id} value={m.id}>
                              [{m.categoryName || 'ทั่วไป'}] {m.name} — คงเหลือ: {m.currentStock} {m.unit} | ราคา @{m.unitPrice.toLocaleString()} ฿
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Stock Inspector Card */}
                  {selectedMaterial && (
                    <div className="space-y-2">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-[10px] text-slate-500 block">รหัสวัสดุ</span>
                          <strong className="font-mono text-slate-800">{selectedMaterial.code}</strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-[10px] text-slate-500 block">คงเหลือในคลัง</span>
                          <strong className={`font-mono text-sm ${availableStock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {availableStock} {selectedMaterial.unit}
                          </strong>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-[10px] text-slate-500 block">ราคาต่อหน่วย</span>
                          <strong className="font-mono text-slate-800">
                            {formUnitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                          </strong>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-[10px] text-blue-700 block">รวมเงินที่จะเบิก</span>
                          <strong className="font-mono text-sm text-blue-800">
                            {formTotalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-3 py-1.5 bg-white/80 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                        <span>หมวดหมู่พัสดุ: <strong className="text-blue-800">{selectedMaterial.categoryName || 'ทั่วไป'}</strong></span>
                        <span>สเปก/ขนาด: <span className="text-slate-800">{selectedMaterial.sizeOrSpec || '-'}</span></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quantity and Purpose */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  จำนวนที่ขอเบิก <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={availableStock > 0 ? availableStock : 1}
                    value={reqQuantity}
                    onChange={(e) => setReqQuantity(parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                      isOverStock ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-300 bg-white'
                    }`}
                    required
                  />
                  <span className="text-slate-500 shrink-0 font-medium">{selectedMaterial?.unit || 'หน่วย'}</span>
                </div>
                {isOverStock && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                    ⚠️ จำนวนเบิกเกินยอดคงเหลือ ({availableStock} {selectedMaterial?.unit})
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  วัตถุประสงค์ในการนำไปใช้งาน <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reqPurpose}
                  onChange={(e) => setReqPurpose(e.target.value)}
                  placeholder="เช่น ใช้พิมพ์เอกสารโครงการอบรม หรือ งานบริการประชาชนประจำวัน"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>คำขอจะถูกส่งไปยัง <strong>ผู้อำนวยการ{currentDiv?.name}</strong> เพื่อลงนามอนุมัติตามระเบียบ</span>
              </div>

              <button
                type="submit"
                disabled={isOverStock || availableStock <= 0 || reqQuantity <= 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs transition cursor-pointer text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ส่งใบขอเบิกพัสดุ</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= VIEW 2: MY REQUESTS & MISTAKE CORRECTION ================= */}
      {viewTab === 'my_requests' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>รายการคำขอเบิกพัสดุ & จัดการกรณีเบิกผิดพลาด</span>
              </h4>
              <p className="text-xs text-slate-500">
                ท่านสามารถตรวจสอบสถานะ หรือกด <strong>&ldquo;แก้ไขคำขอ&rdquo;</strong> ได้ทันทีหากระบุข้อมูลผิดพลาดก่อนที่ ผอ.กอง จะอนุมัติ
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewTab('create')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เขียนใบเบิกใหม่</span>
            </button>
          </div>

          {myReqs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
              <p className="text-xs">ยังไม่มีรายการคำขอเบิกพัสดุ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myReqs.map((req) => {
                const item = req.items[0];
                const canEdit = req.status === 'pending_approver';
                const canRevert = req.status === 'completed' && (isStockOfficer || isDirector);

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition bg-slate-50/50 space-y-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-900 bg-blue-100/70 px-2.5 py-0.5 rounded-md text-xs">
                          {req.reqNo}
                        </span>
                        <span className="text-slate-500 text-[11px]">{req.requestDateTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(req.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[11px] text-slate-500 block">รายการวัสดุที่ขอเบิก:</span>
                        <strong className="text-slate-900 text-xs">
                          {item?.materialName}
                        </strong>
                        <span className="text-blue-700 block font-mono text-[11px]">
                          จำนวน {item?.quantity} {item?.unit} (@{item?.unitPrice} ฿)
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">วัตถุประสงค์:</span>
                        <span className="text-slate-700">{req.purpose}</span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">ผู้ขอเบิก:</span>
                        <span className="text-slate-800 font-medium">
                          {req.requesterName} ({req.requesterPosition})
                        </span>
                        {req.approverName && (
                          <span className="text-emerald-700 text-[11px] block mt-0.5">
                            ผู้อนุมัติ: {req.approverName}
                          </span>
                        )}
                        {req.rejectReason && (
                          <span className="text-rose-700 text-[11px] block mt-0.5">
                            เหตุผลที่ไม่อนุมัติ: {req.rejectReason}
                          </span>
                        )}
                        {req.cancelReason && (
                          <span className="text-slate-600 text-[11px] block mt-0.5">
                            เหตุผลที่ยกเลิก: {req.cancelReason}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setPrintModalReq(req)}
                        className="flex items-center gap-1 text-slate-600 hover:text-blue-700 font-semibold text-[11px] cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>พิมพ์ใบเบิกพัสดุ</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {/* Requirement 2: แก้ไขกรณีเบิกผิดพลาด */}
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditMistake(req)}
                              className="flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-[11px] cursor-pointer transition shadow-2xs"
                              title="กรณีพิมพ์จำนวนผิด หรือเลือกรายการผิด สามารถแก้ไขก่อน ผอ. อนุมัติได้"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>แก้ไขคำขอ (เบิกผิดพลาด)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`ยืนยันยกเลิกใบขอเบิกเลขที่ ${req.reqNo} ใช่หรือไม่?`)) {
                                  cancelOrRevertMaterialRequisition(
                                    req.id,
                                    currentUser?.fullName || 'ผู้ขอเบิก',
                                    'ผู้ขอเบิกกดยกเลิกคำขอเนื่องจากระบุผิดพลาด'
                                  );
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-medium text-[11px] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>ยกเลิกคำขอ</span>
                            </button>
                          </>
                        )}

                        {/* Completed Revert by Officer / Admin */}
                        {canRevert && (
                          <button
                            type="button"
                            onClick={() => {
                              setRevertModalReq(req);
                              setRevertReason('');
                            }}
                            className="flex items-center gap-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg font-bold text-[11px] cursor-pointer"
                            title="คืนยอดสต็อกเข้าคลัง และยกเลิกรายการจ่ายออกจากบัญชี พ.ด.๔"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                            <span>คืนสต็อกเข้าคลัง (เบิกผิดพลาด)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 3: DIRECTOR APPROVAL MENU (STRICTLY GUARDED) ================= */}
      {isDirector && viewTab === 'director_approval' && (
        <div className="bg-white rounded-2xl shadow-xs border border-amber-200 overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  พิจารณาอนุมัติคำขอเบิกพัสดุ (สำหรับผู้อำนวยการ{currentDiv?.name})
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                🔒 <strong>สิทธิ์เฉพาะ ผอ.กอง / ปลัด / นายก อบต.:</strong> ผู้เบิกภายนอกไม่สามารถเข้าถึงหน้านี้ได้ เมื่อกดอนุมัติ ระบบจะบันทึกตัดยอดสต็อกลงบัญชี พ.ด.๔ โดยอัตโนมัติ
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              รอพิจารณา: {pendingDirectorReqs.length} รายการ
            </span>
          </div>

          {pendingDirectorReqs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-60" />
              <p className="text-xs font-medium text-slate-600">ไม่มีรายการคำขอเบิกพัสดุตกค้าง</p>
              <p className="text-[11px] text-slate-400">ผู้อำนวยการกองได้พิจารณาอนุมัติคำขอครบถ้วนทุกรายการแล้ว</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {pendingDirectorReqs.map((req) => {
                const item = req.items[0];
                const curMat = divisionMaterials.find((m) => m.id === item?.materialId);
                const hasEnoughStock = (curMat?.currentStock ?? 0) >= (item?.quantity ?? 0);

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-amber-300 bg-amber-50/20 space-y-3 text-xs shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-xs">
                          {req.reqNo}
                        </span>
                        <span className="text-slate-500 text-[11px]">{req.requestDateTime}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[11px]">
                        ⏳ รอ ผอ.กอง อนุมัติ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[11px] text-slate-500 block">รายการที่ขอเบิก:</span>
                        <strong className="text-slate-900 text-xs">
                          {item?.materialName}
                        </strong>
                        <div className="font-mono text-slate-700 text-[11px] mt-0.5">
                          ขอเบิก: <strong className="text-blue-700">{item?.quantity} {item?.unit}</strong>
                          <span className="ml-1 text-slate-500">(คงเหลือในคลัง: {curMat?.currentStock ?? 0} {item?.unit})</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">ผู้ขอเบิก:</span>
                        <span className="text-slate-900 font-semibold">{req.requesterName}</span>
                        <span className="text-slate-500 block text-[11px]">{req.requesterPosition}</span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">วัตถุประสงค์:</span>
                        <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                          {req.purpose}
                        </p>
                      </div>
                    </div>

                    {/* Stock Warning if insufficient */}
                    {!hasEnoughStock && (
                      <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>สต็อกคงเหลือไม่เพียงพอสำหรับการเบิกจ่าย (คงเหลือ {curMat?.currentStock ?? 0} จากที่ขอ {item?.quantity})</span>
                      </div>
                    )}

                    {/* Approver Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-amber-200">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalReq(req);
                          setRejectReason('');
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl font-bold text-xs cursor-pointer"
                      >
                        ❌ ไม่อนุมัติ
                      </button>

                      <button
                        type="button"
                        disabled={!hasEnoughStock}
                        onClick={() => {
                          setApprovalModalReq(req);
                          setApprovalComment('อนุมัติการเบิกจ่ายตามระเบียบพัสดุ');
                        }}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>ผู้อำนวยการกองอนุมัติ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 4: ALL REQUISITIONS LEDGER ================= */}
      {(isDirector || isStockOfficer) && viewTab === 'all_records' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                ทะเบียนคำขอเบิกพัสดุทั้งหมดของ{currentDiv?.name}
              </h4>
              <p className="text-xs text-slate-500">
                รวมประวัติทุกสถานะ เพื่อการตรวจสอบและการบริหารจัดการคลังพัสดุ
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border rounded-xl border-slate-300 bg-white text-xs"
              >
                <option value="all">ทุกสถานะ ({divisionReqs.length})</option>
                <option value="pending_approver">รอ ผอ.อนุมัติ</option>
                <option value="completed">อนุมัติและจ่ายแล้ว</option>
                <option value="rejected">ไม่อนุมัติ</option>
                <option value="cancelled">ยกเลิก/คืนสต็อก</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">เลขที่ใบเบิก</th>
                  <th className="py-2.5 px-3">วันที่</th>
                  <th className="py-2.5 px-3">ผู้ขอเบิก</th>
                  <th className="py-2.5 px-3">รายการพัสดุ</th>
                  <th className="py-2.5 px-3 text-right">จำนวน</th>
                  <th className="py-2.5 px-3 text-right">รวมเงิน (฿)</th>
                  <th className="py-2.5 px-3">สถานะ</th>
                  <th className="py-2.5 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {divisionReqs
                  .filter((r) => filterStatus === 'all' || r.status === filterStatus)
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{r.reqNo}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.requestDate}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800">{r.requesterName}</span>
                        <span className="text-[11px] text-slate-500 block">{r.requesterPosition}</span>
                      </td>
                      <td className="py-2.5 px-3">{r.items[0]?.materialName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {r.items[0]?.quantity} {r.items[0]?.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                        {r.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3">{renderStatusBadge(r.status)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setPrintModalReq(r)}
                          className="px-2 py-1 text-slate-600 hover:text-blue-700 font-medium text-[11px] cursor-pointer"
                        >
                          ใบเบิก
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: DIRECTOR APPROVE CONFIRMATION ================= */}
      {approvalModalReq && isDirector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ผู้อำนวยการกองลงนามอนุมัติใบเบิก ({approvalModalReq.reqNo})</span>
              </h3>
              <button
                type="button"
                onClick={() => setApprovalModalReq(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
              <p className="font-bold">✨ ระบบตัดยอดพัสดุอัตโนมัติ:</p>
              <p>
                เมื่อผู้อำนวยการกองอนุมัติ ระบบจะ <strong>ตัดยอดสต็อกพัสดุ ({approvalModalReq.items[0]?.quantity} {approvalModalReq.items[0]?.unit})</strong> ทันที
                และบันทึกลงในทะเบียนคุมสมุดบัญชี พ.ด.๔ เพื่อความถูกต้องทางบัญชีพัสดุ
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <p>ผู้ขอเบิก: <strong>{approvalModalReq.requesterName}</strong> ({approvalModalReq.requesterPosition})</p>
              <p>รายการ: <strong>{approvalModalReq.items[0]?.materialName}</strong></p>
              <p>จำนวน: <strong className="font-mono text-blue-700">{approvalModalReq.items[0]?.quantity} {approvalModalReq.items[0]?.unit}</strong></p>
              <p>วัตถุประสงค์: {approvalModalReq.purpose}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ความเห็นผู้อำนวยการกอง:
              </label>
              <textarea
                rows={2}
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="อนุมัติการเบิกจ่ายตามระเบียบพัสดุ"
                className="w-full px-3 py-2 border rounded-xl border-slate-300"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setApprovalModalReq(null)}
                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDirectorApprove}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                ยืนยันลงนามอนุมัติ & ตัดสต็อก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REJECT REQUISITION ================= */}
      {rejectModalReq && isDirector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>ไม่อนุมัติคำขอเบิก ({rejectModalReq.reqNo})</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ระบุเหตุผลที่ไม่อนุมัติ: <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="เช่น พัสดุต้องสำรองไว้สำหรับภารกิจเร่งด่วน หรือเกินปริมาณมาตรฐานการใช้งาน"
                className="w-full px-3 py-2 border rounded-xl border-slate-300"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                บันทึกไม่อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT MISTAKEN REQUISITION ================= */}
      {editReqModal && (() => {
        const activeEditMat = divisionMaterials.find((m) => m.id === editReqMaterialId) || materials.find((m) => m.id === editReqMaterialId);
        const editUnitPrice = activeEditMat?.unitPrice || 0;
        const editTotalPrice = editUnitPrice * (editReqQuantity > 0 ? editReqQuantity : 0);
        const editStockAvailable = activeEditMat?.currentStock ?? 0;
        const editIsOverStock = editReqQuantity > editStockAvailable;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  <span>แก้ไขข้อมูลคำขอเบิกกรณีระบุผิดพลาด ({editReqModal.reqNo})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditReqModal(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditedReq} className="space-y-3.5">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed text-[11px]">
                  💡 <strong>แก้ไขข้อผิดพลาด:</strong> ท่านสามารถเปลี่ยนรายการพัสดุ ปรับลด/เพิ่มจำนวน หรือแก้ไขเหตุผล ก่อนที่ ผอ.กอง จะทำการอนุมัติ
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เลือกรายการวัสดุ <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={editReqMaterialId}
                    onChange={(e) => setEditReqMaterialId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {divisionMaterials.map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.code}] {m.name} — ยอดคงเหลือ: {m.currentStock} {m.unit} | @{m.unitPrice} ฿
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      จำนวนที่ขอเบิก <span className="text-rose-600">*</span> (คงเหลือ: {editStockAvailable} {activeEditMat?.unit})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={editStockAvailable}
                      value={editReqQuantity}
                      onChange={(e) => setEditReqQuantity(parseInt(e.target.value) || 0)}
                      className={`w-full px-3 py-2 rounded-xl border font-bold ${
                        editIsOverStock ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-300'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ราคารวมคำนวณใหม่
                    </label>
                    <div className="px-3 py-2 bg-slate-50 border rounded-xl font-bold font-mono text-blue-700">
                      {editTotalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อผู้ขอเบิก
                  </label>
                  <input
                    type="text"
                    value={editReqRequesterName}
                    onChange={(e) => setEditReqRequesterName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    วัตถุประสงค์การนำไปใช้ <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={editReqPurpose}
                    onChange={(e) => setEditReqPurpose(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setEditReqModal(null)}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={editIsOverStock || editReqQuantity <= 0}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    บันทึกการแก้ไขคำขอ
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ================= MODAL: REVERT COMPLETED REQUISITION (RETURN STOCK) ================= */}
      {revertModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>ยกเลิกใบเบิกที่ตัดสต็อกแล้ว / คืนยอดเข้าคลัง</span>
              </h3>
              <button
                type="button"
                onClick={() => setRevertModalReq(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1 text-rose-800">
                  <AlertCircle className="w-4 h-4" />
                  <span>การคืนยอดพัสดุและปรับสมุดบัญชี พ.ด.๔:</span>
                </div>
                <p>
                  เมื่อกดยืนยัน ระบบจะ <strong>นำยอดพัสดุ ({revertModalReq.items[0]?.quantity} {revertModalReq.items[0]?.unit}) คืนกลับเข้าสต็อกคลังของกองทันที</strong> 
                  และยกเลิกรายการจ่ายออกจากสมุดบัญชี พ.ด.๔ เพื่อแก้ไขความผิดพลาด
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 space-y-1">
                <p>เลขที่ใบเบิก: <strong className="font-mono text-blue-800">{revertModalReq.reqNo}</strong></p>
                <p>รายการ: <strong>{revertModalReq.items[0]?.materialName}</strong> ({revertModalReq.items[0]?.quantity} {revertModalReq.items[0]?.unit})</p>
                <p>ผู้ขอเบิก: {revertModalReq.requesterName} ({revertModalReq.divisionName})</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ระบุเหตุผลในการยกเลิก/คืนสต็อก: <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  placeholder="เช่น เบิกผิดประเภท, ระบุจำนวนเกินความจำเป็น หรือพิมพ์เลขผิดพลาด"
                  className="w-full px-3 py-2 border rounded-xl border-slate-300"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setRevertModalReq(null)}
                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold cursor-pointer"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={handleConfirmRevertCompleted}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ยืนยันยกเลิกและคืนสต็อก</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINT VOUCHER SLIP ================= */}
      {printModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                <span>ใบเบิกพัสดุ (เอกสารทางการ) - {printModalReq.reqNo}</span>
              </h3>
              <button
                type="button"
                onClick={() => setPrintModalReq(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Printable Paper Voucher */}
            <div className="p-6 bg-white border border-slate-300 rounded-xl space-y-4 shadow-xs font-serif leading-relaxed text-slate-900">
              <div className="text-center space-y-1 border-b pb-3">
                <h2 className="text-base font-bold font-heading">ใบเบิกพัสดุ</h2>
                <p className="text-xs">องค์การบริหารส่วนตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง</p>
                <p className="text-xs font-mono">กอง: {printModalReq.divisionName} • เลขที่เอกสาร: {printModalReq.reqNo}</p>
              </div>

              <div className="flex justify-between text-xs">
                <span>วันที่ขอเบิก: {printModalReq.requestDate}</span>
                <span>ปีงบประมาณ: {printModalReq.fiscalYear}</span>
              </div>

              <div className="text-xs space-y-1">
                <p>ข้าพเจ้า: <strong>{printModalReq.requesterName}</strong> ตำแหน่ง: <strong>{printModalReq.requesterPosition}</strong></p>
                <p>มีความประสงค์ขอเบิกพัสดุเพื่อใช้ในงาน: <strong>{printModalReq.purpose}</strong></p>
              </div>

              <table className="w-full text-xs border border-slate-400 mt-2">
                <thead className="bg-slate-100 border-b border-slate-400">
                  <tr>
                    <th className="p-2 border-r border-slate-400 text-center">ลำดับ</th>
                    <th className="p-2 border-r border-slate-400">รายการพัสดุ</th>
                    <th className="p-2 border-r border-slate-400 text-right">จำนวน</th>
                    <th className="p-2 border-r border-slate-400 text-right">ราคา/หน่วย</th>
                    <th className="p-2 text-right">รวมเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {printModalReq.items.map((it, idx) => (
                    <tr key={idx} className="border-b border-slate-300">
                      <td className="p-2 border-r border-slate-400 text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-400 font-sans font-bold">{it.materialName}</td>
                      <td className="p-2 border-r border-slate-400 text-right font-mono">{it.quantity} {it.unit}</td>
                      <td className="p-2 border-r border-slate-400 text-right font-mono">{it.unitPrice.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono font-bold">{it.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures Block */}
              <div className="grid grid-cols-2 gap-6 pt-6 text-center text-xs">
                <div className="space-y-8">
                  <p>ลงชื่อ...................................................ผู้ขอเบิก</p>
                  <p>({printModalReq.requesterName})<br />{printModalReq.requesterPosition}</p>
                </div>
                <div className="space-y-8">
                  <p>ลงชื่อ...................................................ผู้อนุมัติ</p>
                  <p>({printModalReq.approverName || 'ผู้อำนวยการกอง'})<br />ผู้อำนวยการ{printModalReq.divisionName}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setPrintModalReq(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์เอกสารนี้</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};