import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Send,
  CheckCircle,
  Eye,
  Printer,
  History,
  Edit3,
  Paperclip,
  Clock,
  Building2,
  Calendar,
  AlertCircle,
  X,
  FileDown,
  Upload,
} from 'lucide-react';
import { EDocument, DocType, DocAttachment, Division } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import {
  createDocument,
  dispatchDocument,
  acknowledgeDocument,
  editDocumentReceiptNo,
  getNextReceiptNo,
  addAttachmentToDocument,
  removeAttachmentFromDocument,
  logPdpaAction,
} from '../../../db/storage';
import { FileViewerModal } from '../../common/FileViewerModal';
import { PrintModal } from '../../common/PrintModal';
import { printHtmlContent } from '../../../utils/printHelper';

interface EDocumentModuleProps {
  documents: EDocument[];
  divisions: Division[];
}

export const EDocumentModule: React.FC<EDocumentModuleProps> = ({
  documents,
  divisions,
}) => {
  const { currentUser, canAccess } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDivision, setFilterDivision] = useState<string>('all');
  const [filterFiscalYear, setFilterFiscalYear] = useState<string>('2570');
  const [newDocFiscalYear, setNewDocFiscalYear] = useState<string>('2570');

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [dispatchModalDoc, setDispatchModalDoc] = useState<EDocument | null>(null);
  const [selectedDivisionToDispatch, setSelectedDivisionToDispatch] = useState<string>(divisions[0]?.id || '');
  const [editReceiptDoc, setEditReceiptDoc] = useState<EDocument | null>(null);
  const [newReceiptNoInput, setNewReceiptNoInput] = useState('');
  const [editReceiptReason, setEditReceiptReason] = useState('');
  const [viewingAttachment, setViewingAttachment] = useState<{
    att: DocAttachment;
    docTitle: string;
    receiptNo: string;
  } | null>(null);
  const [timelineModalDoc, setTimelineModalDoc] = useState<EDocument | null>(null);

  // New Document Registration Form
  const [newDocType, setNewDocType] = useState<DocType>('inbound');
  const [newBookNo, setNewBookNo] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newFromOrg, setNewFromOrg] = useState('');
  const [newToOrg, setNewToOrg] = useState('นายกองค์การบริหารส่วนตำบลอ่างแก้ว');
  const [newBookDate, setNewBookDate] = useState(new Date().toISOString().split('T')[0]);
  const [newReceiveDate, setNewReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [newUrgency, setNewUrgency] = useState<EDocument['urgency']>('ปกติ');
  const [newSecrecy, setNewSecrecy] = useState<EDocument['secrecy']>('ปกติ');
  const [newDispatchedDivId, setNewDispatchedDivId] = useState<string>('');
  const [tempAttachments, setTempAttachments] = useState<DocAttachment[]>([
    {
      id: `att-sample-1`,
      name: 'หนังสือราชการต้นฉบับ_ว1234.pdf',
      fileType: 'application/pdf',
      fileSize: '1.4 MB',
      uploadDate: new Date().toISOString().split('T')[0],
    },
  ]);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const extraFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // States for attaching documents to existing records
  const [attachModalDoc, setAttachModalDoc] = useState<EDocument | null>(null);
  const [attachSuccessMsg, setAttachSuccessMsg] = useState<string | null>(null);

  // State for PrintModal
  const [printSlipModalData, setPrintSlipModalData] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    html: string;
    fileName: string;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      // Read small files (< 1.5MB) as base64 for offline preview; for larger files use blob URL to avoid quota limit
      if (file.size <= 1.5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          const newAtt: DocAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: sizeStr,
            dataUrl: reader.result as string,
            uploadDate: new Date().toISOString().split('T')[0],
          };
          setTempAttachments((prev) => [...prev, newAtt]);
        };
        reader.readAsDataURL(file);
      } else {
        const objectUrl = URL.createObjectURL(file);
        const newAtt: DocAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: sizeStr,
          dataUrl: objectUrl,
          uploadDate: new Date().toISOString().split('T')[0],
        };
        setTempAttachments((prev) => [...prev, newAtt]);
      }
    });

    if (e.target) e.target.value = '';
  };

  const handleUploadExtraAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!attachModalDoc) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      const saveAtt = (dataUrlStr?: string) => {
        const newAtt: DocAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: sizeStr,
          dataUrl: dataUrlStr,
          uploadDate: new Date().toISOString().split('T')[0],
        };
        addAttachmentToDocument(attachModalDoc.id, newAtt, currentUser?.fullName || 'เจ้าหน้าที่');
        setAttachSuccessMsg(`แนบไฟล์ ${file.name} เรียบร้อยแล้ว`);
        setTimeout(() => setAttachSuccessMsg(null), 3000);
      };

      if (file.size <= 1.5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => saveAtt(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        saveAtt(URL.createObjectURL(file));
      }
    });

    if (e.target) e.target.value = '';
  };

  const printDocumentSlip = (doc: EDocument) => {
    const attachmentsList =
      doc.attachments && doc.attachments.length > 0
        ? doc.attachments
            .map((a, i) => `<li>${i + 1}. ${a.name} (${a.fileSize})</li>`)
            .join('')
        : '<li>- ไม่มีไฟล์แนบ -</li>';

    const slipHtml = `
      <div class="header-center">
        <svg viewBox="0 0 100 100" class="garuda" style="width: 60px; height: 60px;">
          <circle cx="50" cy="50" r="45" stroke="#1e3a8a" stroke-width="4" fill="#f8fafc" />
          <path d="M 50 20 L 60 40 L 80 45 L 65 60 L 70 80 L 50 70 L 30 80 L 35 60 L 20 45 L 40 40 Z" fill="#2563eb" />
        </svg>
        <h1 class="org-title">องค์การบริหารส่วนตำบลอ่างแก้ว</h1>
        <div class="org-sub">ตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง 14120</div>
        <div style="margin-top: 10px; font-weight: bold; font-size: 15pt; text-decoration: underline;">
          ใบลงทะเบียนรับหนังสือราชการ (E-Saraban Slip)
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13pt;">
        <div><strong>เลขที่รับสารบรรณ:</strong> <span style="font-size: 16pt; font-weight: bold; color: #1e3a8a;">${doc.receiptNo}</span></div>
        <div><strong>ปีงบประมาณ:</strong> ${doc.fiscalYear || '2570'}</div>
      </div>

      <table>
        <tr>
          <td style="width: 25%; font-weight: bold; background: #f9fafb;">เลขที่หนังสือจริง</td>
          <td>${doc.bookNo || '-'}</td>
          <td style="width: 20%; font-weight: bold; background: #f9fafb;">ลงวันที่</td>
          <td>${doc.bookDate || '-'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background: #f9fafb;">จาก (หน่วยงานต้นทาง)</td>
          <td>${doc.fromOrg || '-'}</td>
          <td style="font-weight: bold; background: #f9fafb;">ถึง</td>
          <td>${doc.toOrg || 'อบต.อ่างแก้ว'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background: #f9fafb;">เรื่อง</td>
          <td colspan="3" style="font-size: 14pt; font-weight: bold;">${doc.subject}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background: #f9fafb;">ชั้นความเร็ว</td>
          <td>${doc.urgency}</td>
          <td style="font-weight: bold; background: #f9fafb;">ชั้นความลับ</td>
          <td>${doc.secrecy}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background: #f9fafb;">วัน-เวลาลงทะเบียนรับ</td>
          <td>${doc.receiveDate}</td>
          <td style="font-weight: bold; background: #f9fafb;">ผู้ลงทะเบียน</td>
          <td>${doc.registeredBy}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background: #f9fafb;">หน่วยงานที่รับผิดชอบ</td>
          <td colspan="3">${doc.dispatchedToDivisionName || 'รอดำเนินการส่งต่อเข้ากอง'}</td>
        </tr>
      </table>

      <div style="margin-top: 15px; font-size: 13pt;">
        <strong>รายการเอกสารแนบต้นฉบับ:</strong>
        <ul style="margin-top: 5px; padding-left: 20px;">
          ${attachmentsList}
        </ul>
      </div>

      <div style="margin-top: 20px; padding: 12px; border: 1px dashed #4b5563; font-size: 12pt; background: #fafafa;">
        <strong>คำสั่ง / การเกษียณหนังสือ:</strong>
        <div style="height: 50px;"></div>
      </div>

      <div class="signatures-grid">
        <div class="sig-box">
          <div>ผู้รับหนังสือ (งานสารบรรณกลาง)</div>
          <div class="sig-line"></div>
          <div>(......................................................)</div>
          <div>เจ้าหน้าที่สารบรรณกลาง</div>
          <div>วันที่ ......../......../............</div>
        </div>
        <div class="sig-box">
          <div>ผู้รับหนังสือ (สารบรรณกอง/ส่วนราชการ)</div>
          <div class="sig-line"></div>
          <div>(......................................................)</div>
          <div>${doc.acknowledgedBy || 'เจ้าหน้าที่ผู้รับเอกสาร'}</div>
          <div>วันที่ ......../......../............</div>
        </div>
      </div>
    `;

    setPrintSlipModalData({
      isOpen: true,
      title: `ใบลงทะเบียนรับหนังสือราชการ (${doc.receiptNo})`,
      subtitle: `เรื่อง: ${doc.subject} • ประจำปีงบประมาณ ${doc.fiscalYear || '2570'}`,
      html: slipHtml,
      fileName: `ใบรับหนังสือ_${doc.receiptNo}`,
    });
  };

  // Permissions check
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isCentralSaraban =
    currentUser?.role === 'central_saraban' ||
    canAccess('canUseSarabanCentral') ||
    isSuperAdmin;
  const canEditReceiptNo =
    canAccess('canEditSarabanReceiptNo') || isSuperAdmin;
  const isDivisionStaff =
    currentUser?.role === 'division_admin' ||
    currentUser?.role === 'division_director' ||
    canAccess('canUseSarabanDivision');

  // Filtered Documents
  const filteredDocs = documents.filter((doc) => {
    if (filterType !== 'all' && doc.docType !== filterType) return false;
    if (filterDivision !== 'all' && doc.dispatchedToDivisionId !== filterDivision) return false;
    if (filterFiscalYear && filterFiscalYear !== 'all' && doc.fiscalYear !== filterFiscalYear) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = doc.subject.toLowerCase().includes(q);
      const matchBook = doc.bookNo.toLowerCase().includes(q);
      const matchReceipt = doc.receiptNo.toLowerCase().includes(q);
      const matchFrom = doc.fromOrg.toLowerCase().includes(q);
      if (!matchSubject && !matchBook && !matchReceipt && !matchFrom) return false;
    }
    return true;
  });

  const handleOpenRegisterModal = () => {
    setNewBookNo('');
    setNewSubject('');
    setNewFromOrg('');
    setNewDispatchedDivId('');
    setNewDocFiscalYear(filterFiscalYear !== 'all' ? filterFiscalYear : '2570');
    setIsRegisterModalOpen(true);
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newBookNo.trim() || !newFromOrg.trim()) {
      alert('กรุณากรอกข้อมูล เรื่อง, เลขที่หนังสือ และจากหน่วยงาน ให้ครบถ้วน');
      return;
    }

    const regYear = newDocFiscalYear.trim() || '2570';
    const autoReceiptNo = getNextReceiptNo(regYear);
    const targetDiv = divisions.find((d) => d.id === newDispatchedDivId);

    const created = createDocument({
      docType: newDocType,
      fiscalYear: regYear,
      receiptNo: autoReceiptNo,
      bookNo: newBookNo.trim(),
      subject: newSubject.trim(),
      fromOrg: newFromOrg.trim(),
      toOrg: newToOrg.trim(),
      bookDate: newBookDate,
      receiveDate: newReceiveDate,
      urgency: newUrgency,
      secrecy: newSecrecy,
      dispatchedToDivisionId: targetDiv?.id,
      dispatchedToDivisionName: targetDiv?.name,
      attachments: tempAttachments,
      registeredBy: currentUser?.fullName || 'สารบรรณกลาง',
    });

    logPdpaAction(
      currentUser?.fullName || 'สารบรรณกลาง',
      currentUser?.role || 'central_saraban',
      'create',
      'edocument',
      created.id,
      `ลงทะเบียนรับหนังสือราชการ: ${created.subject} (เลขที่รับ ${created.receiptNo})`
    );

    setIsRegisterModalOpen(false);
  };

  const handleDispatchDoc = () => {
    if (!dispatchModalDoc || !selectedDivisionToDispatch) return;
    const div = divisions.find((d) => d.id === selectedDivisionToDispatch);
    if (!div) return;

    dispatchDocument(
      dispatchModalDoc.id,
      div.id,
      div.name,
      currentUser?.fullName || 'สารบรรณกลาง'
    );

    logPdpaAction(
      currentUser?.fullName || 'สารบรรณกลาง',
      currentUser?.role || 'central_saraban',
      'update',
      'edocument_dispatch',
      dispatchModalDoc.id,
      `จ่ายหนังสือเลขที่รับ ${dispatchModalDoc.receiptNo} ไปยัง ${div.name}`
    );

    setDispatchModalDoc(null);
  };

  const handleAcknowledge = (doc: EDocument) => {
    acknowledgeDocument(
      doc.id,
      currentUser?.fullName || 'สารบรรณกอง',
      currentUser?.position || 'สารบรรณกอง'
    );

    logPdpaAction(
      currentUser?.fullName || 'สารบรรณกอง',
      currentUser?.role || 'division_admin',
      'update',
      'edocument_acknowledge',
      doc.id,
      `กองรับเอกสารเลขที่รับ ${doc.receiptNo} (${doc.subject})`
    );
  };

  const handleSaveReceiptNoEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReceiptDoc || !newReceiptNoInput.trim()) return;

    editDocumentReceiptNo(
      editReceiptDoc.id,
      newReceiptNoInput.trim(),
      editReceiptReason.trim() || 'แก้ไขเลขที่รับย้อนหลังตามสมุดทะเบียนรับ',
      currentUser?.fullName || 'Admin'
    );

    logPdpaAction(
      currentUser?.fullName || 'Admin',
      currentUser?.role || 'super_admin',
      'update',
      'edocument_receipt_no_audit',
      editReceiptDoc.id,
      `แก้ไขเลขที่รับจาก ${editReceiptDoc.receiptNo} เป็น ${newReceiptNoInput.trim()} (เหตุผล: ${editReceiptReason})`
    );

    setEditReceiptDoc(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Ribbon */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-heading">
                  ระบบสารบรรณอิเล็กทรอนิกส์ (E-Document)
                </h2>
                <p className="text-xs text-slate-500">
                  ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ • ทะเบียนรับ-ส่งกลาง และการจ่ายหนังสือสู่กอง
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {isCentralSaraban ? (
              <button
                onClick={handleOpenRegisterModal}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>ลงทะเบียนรับหนังสือใหม่</span>
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>สิทธิ์สารบรรณกอง: สามารถกดรับ ดูเอกสารแนบ และพิมพ์เอกสาร</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Ribbon Bar (Styled nicely like modern Thai ERP) */}
        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหา: เลขที่หนังสือ, เลขรับ, เรื่อง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          {/* Doc Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
            >
              <option value="all">ประเภท: ทั้งหมด (รับ/ส่ง/ภายใน/คำสั่ง)</option>
              <option value="inbound">หนังสือรับ (ภายนอก)</option>
              <option value="outbound">หนังสือส่ง (ภายนอก)</option>
              <option value="internal">หนังสือภายใน (บันทึกข้อความ)</option>
              <option value="order">คำสั่ง อบต.</option>
            </select>
          </div>

          {/* Division Filter */}
          <div>
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
            >
              <option value="all">สังกัดกอง: ทุกกอง</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Fiscal Year Filter */}
          <div>
            <select
              value={filterFiscalYear}
              onChange={(e) => setFilterFiscalYear(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none font-semibold text-blue-900"
            >
              <option value="2571">ปีงบประมาณ 2571</option>
              <option value="2570">ปีงบประมาณ 2570 (ปัจจุบัน)</option>
              <option value="2569">ปีงบประมาณ 2569</option>
              <option value="2568">ปีงบประมาณ 2568</option>
              <option value="all">ทุกปีงบประมาณ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-800">
              ทะเบียนคุมหนังสือราชการ ({filteredDocs.length} รายการ)
            </h3>
            <span className="text-[11px] text-slate-400">
              (เลขที่รับรันอัตโนมัติ ไม่ใช่เลขที่หนังสือ)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">เลขที่รับ</th>
                <th className="py-3 px-4">เลขที่หนังสือ / เรื่อง</th>
                <th className="py-3 px-4">จากหน่วยงาน / ถึง</th>
                <th className="py-3 px-4">ลงวันที่ / ลงรับ</th>
                <th className="py-3 px-4">กองที่รับผิดชอบ</th>
                <th className="py-3 px-4">สถานะ & Timeline</th>
                <th className="py-3 px-4 text-center">เอกสารแนบ</th>
                <th className="py-3 px-4 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    ไม่พบเอกสารตามเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const isCurrentDivisionDoc =
                    currentUser?.divisionId === doc.dispatchedToDivisionId;
                  const canAcknowledge =
                    isDivisionStaff &&
                    doc.status === 'dispatched' &&
                    (isCurrentDivisionDoc || isSuperAdmin);

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                      {/* Receipt No (with Audit Log badge and Edit button) */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-blue-900 text-sm">
                          <span>{doc.receiptNo}</span>
                          {canEditReceiptNo && (
                            <button
                              onClick={() => {
                                setEditReceiptDoc(doc);
                                setNewReceiptNoInput(doc.receiptNo);
                                setEditReceiptReason('');
                              }}
                              className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition cursor-pointer"
                              title="แก้ไขเลขที่รับ (บันทึก Audit Log)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {doc.auditLogs && doc.auditLogs.length > 0 && (
                          <div className="mt-1">
                            <span
                              className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer"
                              title={`แก้ไขโดย: ${doc.auditLogs[0].changedBy} (เดิมคือ ${doc.auditLogs[0].oldReceiptNo}) เหตุผล: ${doc.auditLogs[0].reason}`}
                            >
                              มีการแก้ไขเลขรับ ({doc.auditLogs.length})
                            </span>
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {doc.docType === 'inbound'
                            ? 'หนังสือรับ'
                            : doc.docType === 'outbound'
                            ? 'หนังสือส่ง'
                            : doc.docType === 'internal'
                            ? 'บันทึกภายใน'
                            : 'คำสั่ง'}
                        </span>
                      </td>

                      {/* Book No & Subject */}
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-mono text-[11px] text-slate-500 font-medium">
                          {doc.bookNo}
                        </div>
                        <div className="font-semibold text-slate-900 text-xs mt-0.5 line-clamp-2">
                          {doc.subject}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              doc.urgency === 'ด่วนที่สุด'
                                ? 'bg-rose-100 text-rose-700'
                                : doc.urgency === 'ด่วนมาก'
                                ? 'bg-amber-100 text-amber-800'
                                : doc.urgency === 'ด่วน'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {doc.urgency}
                          </span>
                        </div>
                      </td>

                      {/* From / To */}
                      <td className="py-3 px-4 align-top text-xs">
                        <div className="text-slate-800 font-medium">{doc.fromOrg}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">ถึง: {doc.toOrg}</div>
                      </td>

                      {/* Book Date / Receive Date */}
                      <td className="py-3 px-4 align-top text-[11px] text-slate-600">
                        <div>ลงวันที่: {doc.bookDate}</div>
                        <div className="text-slate-400">ลงรับ: {doc.receiveDate}</div>
                      </td>

                      {/* Dispatched Division */}
                      <td className="py-3 px-4 align-top">
                        {doc.dispatchedToDivisionName ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg">
                            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                            {doc.dispatchedToDivisionName}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            ยังไม่ได้จ่ายหนังสือ
                          </span>
                        )}
                      </td>

                      {/* Status & Timeline Button */}
                      <td className="py-3 px-4 align-top">
                        {doc.status === 'acknowledged' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> กองรับเอกสารแล้ว
                          </span>
                        ) : doc.status === 'dispatched' ? (
                          <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                            <Clock className="w-3 h-3 text-blue-600" /> จ่ายแล้ว (รอกองรับ)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                            ลงทะเบียนรับ
                          </span>
                        )}

                        <button
                          onClick={() => setTimelineModalDoc(doc)}
                          className="mt-1 text-[11px] text-blue-600 hover:text-blue-800 block cursor-pointer flex items-center gap-0.5"
                        >
                          <History className="w-3 h-3 inline" /> ดู Timeline เส้นทาง
                        </button>
                      </td>

                      {/* Attachments & View Full File */}
                      <td className="py-3 px-4 align-top text-center">
                        {doc.attachments && doc.attachments.length > 0 ? (
                          <div className="space-y-1.5">
                            {doc.attachments.map((att) => (
                              <button
                                key={att.id}
                                onClick={() =>
                                  setViewingAttachment({
                                    att,
                                    docTitle: doc.subject,
                                    receiptNo: doc.receiptNo,
                                  })
                                }
                                className="w-full inline-flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-300 text-xs font-semibold transition cursor-pointer shadow-2xs group"
                                title={`คลิกเพื่อเปิดดูไฟล์แนบฉบับเต็ม: ${att.name}`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <Eye className="w-3.5 h-3.5 text-blue-600 group-hover:text-white shrink-0" />
                                  <span className="truncate max-w-[110px] text-left">{att.name}</span>
                                </div>
                                <span className="text-[10px] bg-white group-hover:bg-blue-700 group-hover:text-white px-1.5 py-0.5 rounded text-blue-700 font-mono shrink-0">
                                  ดูเต็ม
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-[11px] mb-1">ไม่มีไฟล์แนบ</div>
                        )}
                        <button
                          type="button"
                          onClick={() => setAttachModalDoc(doc)}
                          className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold transition cursor-pointer shadow-2xs"
                          title="แนบไฟล์เอกสารเพิ่มเติมเข้าหนังสือนี้"
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>+ แนบไฟล์</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-top text-right space-y-1">
                        {/* If dispatched, division admin can ACKNOWLEDGE */}
                        {canAcknowledge && (
                          <button
                            onClick={() => handleAcknowledge(doc)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>กดรับเอกสาร</span>
                          </button>
                        )}

                        {/* Central Saraban can Dispatch */}
                        {isCentralSaraban && doc.status === 'registered' && (
                          <button
                            onClick={() => {
                              setDispatchModalDoc(doc);
                              setSelectedDivisionToDispatch(divisions[0]?.id || '');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <Send className="w-3 h-3" />
                            <span>จ่ายหนังสือเข้ากอง</span>
                          </button>
                        )}

                        {/* Print official document slip */}
                        <button
                          onClick={() => printDocumentSlip(doc)}
                          className="px-2 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-medium ml-auto"
                          title="พิมพ์ใบรับหนังสือราชการ (ไม่ค้าง)"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-600" />
                          <span>พิมพ์ใบรับ</span>
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

      {/* Modal: Register New Document (Central Saraban Only) */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-900 text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-sm">ลงทะเบียนรับหนังสือใหม่ (สารบรรณกลาง สำนักปลัด)</h3>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">ปีงบประมาณ:</span>
                  <input
                    type="text"
                    value={newDocFiscalYear}
                    onChange={(e) => setNewDocFiscalYear(e.target.value)}
                    placeholder="2570"
                    className="w-20 px-2 py-1 rounded-lg border border-blue-300 bg-white font-mono font-bold text-center text-blue-900"
                  />
                  <span>
                    เลขที่รับอัตโนมัติ:{' '}
                    <span className="font-mono font-bold text-sm text-blue-800">
                      {getNextReceiptNo(newDocFiscalYear || '2570')}
                    </span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">(รันต่อเนื่องตามระเบียบสารบรรณ)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ประเภทหนังสือ</label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as DocType)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="inbound">หนังสือรับ (ภายนอก)</option>
                    <option value="outbound">หนังสือส่ง (ภายนอก)</option>
                    <option value="internal">หนังสือภายใน (บันทึกข้อความ)</option>
                    <option value="order">คำสั่ง อบต.</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เลขที่หนังสือจริง <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น มท 0808.2/ว 5432 หรือ อธ 0023/123"
                    value={newBookNo}
                    onChange={(e) => setNewBookNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    เรื่อง <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ระบุชื่อเรื่องหนังสือราชการให้ชัดเจน"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    จาก (หน่วยงานต้นทาง) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ที่ว่าการอำเภอโพธิ์ทอง หรือ กรมส่งเสริมฯ"
                    value={newFromOrg}
                    onChange={(e) => setNewFromOrg(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ถึง</label>
                  <input
                    type="text"
                    value={newToOrg}
                    onChange={(e) => setNewToOrg(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ลงวันที่</label>
                  <input
                    type="date"
                    value={newBookDate}
                    onChange={(e) => setNewBookDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">วันที่ลงรับ</label>
                  <input
                    type="date"
                    value={newReceiveDate}
                    onChange={(e) => setNewReceiveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชั้นความเร็ว</label>
                  <select
                    value={newUrgency}
                    onChange={(e) => setNewUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="ปกติ">ปกติ</option>
                    <option value="ด่วน">ด่วน</option>
                    <option value="ด่วนมาก">ด่วนมาก</option>
                    <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    จ่ายหนังสือไปยังกอง (ทันที)
                  </label>
                  <select
                    value={newDispatchedDivId}
                    onChange={(e) => setNewDispatchedDivId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">-- ยังไม่จ่ายหนังสือ --</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-700 text-xs">
                    แนบไฟล์เอกสารต้นฉบับ (PDF, DOCX, ภาพ, Excel)
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg text-xs font-semibold cursor-pointer transition shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>เลือกไฟล์จากเครื่อง</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Drag-drop or select area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 text-center cursor-pointer bg-slate-50/60 hover:bg-blue-50/40 transition mb-2"
                >
                  <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                  <p className="text-xs text-slate-600 font-medium">
                    คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                  </p>
                  <p className="text-[10px] text-slate-400">
                    รองรับไฟล์ PDF, Word (.docx), Excel, รูปภาพ (.png, .jpg) ได้หลายไฟล์ต่อ 1 เลขรับ
                  </p>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {tempAttachments.map((att, idx) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{att.name}</span>
                        <span className="text-[10px] text-slate-400">({att.fileSize})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTempAttachments(tempAttachments.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        title="ลบไฟล์"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow cursor-pointer"
                >
                  บันทึกลงทะเบียนรับ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dispatch Document to Division (จ่ายหนังสือ) */}
      {dispatchModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              <span>จ่ายหนังสือไปยังกอง / ฝ่าย</span>
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div><strong>เลขที่รับ:</strong> {dispatchModalDoc.receiptNo}</div>
              <div><strong>เรื่อง:</strong> {dispatchModalDoc.subject}</div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                เลือกสารบรรณกองปลายทาง
              </label>
              <select
                value={selectedDivisionToDispatch}
                onChange={(e) => setSelectedDivisionToDispatch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.directorName})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setDispatchModalDoc(null)}
                className="px-3 py-1.5 border rounded-lg hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDispatchDoc}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow"
              >
                ยืนยันการจ่ายหนังสือ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Receipt Number (with Mandatory Audit Log) */}
      {editReceiptDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>แก้ไขเลขที่รับ (Audit Log บันทึกประวัติ)</span>
              </h3>
              <button onClick={() => setEditReceiptDoc(null)}><X className="w-4 h-4" /></button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              <strong>เงื่อนไขตามระเบียบงานสารบรรณ:</strong> การแก้ไขเลขที่รับจะต้องบันทึกประวัติการแก้ไข (Audit Log)
              ไว้เสมอว่าใครเป็นผู้แก้ไข แก้ไขเมื่อใด และเลขเดิมคืออะไร เพื่อความโปร่งใสและตรวจสอบได้
            </div>

            <form onSubmit={handleSaveReceiptNoEdit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลขที่รับเดิม</label>
                <input
                  type="text"
                  disabled
                  value={editReceiptDoc.receiptNo}
                  className="w-full px-3 py-2 bg-slate-100 rounded-lg border border-slate-200 font-mono text-slate-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลขที่รับใหม่ที่ต้องการแก้ไข <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 0120/2569"
                  value={newReceiptNoInput}
                  onChange={(e) => setNewReceiptNoInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-blue-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เหตุผลความจำเป็นในการแก้ไข <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="เช่น ลงรับย้อนหลังตามสมุดทะเบียนรับจริง หรือ แก้ไขความผิดพลาดจากการคีย์"
                  value={editReceiptReason}
                  onChange={(e) => setEditReceiptReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditReceiptDoc(null)}
                  className="px-3 py-1.5 border rounded-lg hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow"
                >
                  บันทึกการแก้ไขเลขรับ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document Timeline Tracking (Document Journey) */}
      {timelineModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Timeline เส้นทางการเดินทางของเอกสาร</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  เลขที่รับ {timelineModalDoc.receiptNo} • {timelineModalDoc.subject}
                </span>
              </div>
              <button onClick={() => setTimelineModalDoc(null)}><X className="w-4 h-4" /></button>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200">
              {timelineModalDoc.timeline.map((event, idx) => (
                <div key={event.id || idx} className="relative">
                  <span className="absolute -left-6 top-0 w-4 h-4 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100" />
                  <div className="font-bold text-xs text-slate-800">{event.step}</div>
                  <div className="text-[11px] text-slate-500">{event.timestamp}</div>
                  <div className="text-xs text-blue-900 mt-0.5">
                    โดย: {event.actionBy} ({event.roleName})
                  </div>
                  {event.toDivision && (
                    <div className="text-[11px] text-indigo-700 font-medium">
                      จ่ายต่อไปยัง: {event.toDivision}
                    </div>
                  )}
                  {event.note && (
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 mt-1 text-[11px] text-slate-600">
                      {event.note}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Audit log history if any */}
            {timelineModalDoc.auditLogs && timelineModalDoc.auditLogs.length > 0 && (
              <div className="pt-3 border-t">
                <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>ประวัติการแก้ไขเลขที่รับ (Audit Trail)</span>
                </h4>
                <div className="space-y-1.5">
                  {timelineModalDoc.auditLogs.map((log) => (
                    <div key={log.id} className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px]">
                      <div>
                        เลขเดิม: <span className="line-through text-slate-500">{log.oldReceiptNo}</span> → แก้เป็น: <strong>{log.newReceiptNo}</strong>
                      </div>
                      <div className="text-slate-500">
                        ผู้แก้: {log.changedBy} เมื่อ {log.changedAt}
                      </div>
                      <div className="text-amber-800 italic mt-0.5">เหตุผล: {log.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setTimelineModalDoc(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal (View & Print) */}
      <FileViewerModal
        attachment={viewingAttachment ? viewingAttachment.att : null}
        documentTitle={viewingAttachment?.docTitle}
        receiptNo={viewingAttachment?.receiptNo}
        onClose={() => setViewingAttachment(null)}
      />

      {/* ================= MODAL: ATTACH FILES TO EXISTING DOCUMENT ================= */}
      {attachModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-900 text-white">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-blue-300" />
                <div>
                  <h3 className="font-bold text-sm">แนบไฟล์เอกสารราชการเพิ่มเติม</h3>
                  <p className="text-[11px] text-blue-200">
                    เลขที่รับ: {attachModalDoc.receiptNo} • {attachModalDoc.subject}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAttachModalDoc(null);
                  setAttachSuccessMsg(null);
                }}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {attachSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{attachSuccessMsg}</span>
                </div>
              )}

              {/* Upload Drop Zone */}
              <div
                onClick={() => extraFileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-600 rounded-2xl p-6 text-center cursor-pointer bg-blue-50/50 hover:bg-blue-50 transition"
              >
                <Upload className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="font-bold text-slate-800 text-sm">คลิกเพื่อเลือกไฟล์แนบจากเครื่อง</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  รองรับ PDF, Word (.docx), Excel, ไฟล์ภาพสแกน (.png, .jpg)
                </p>
                <input
                  type="file"
                  ref={extraFileInputRef}
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                  className="hidden"
                  onChange={handleUploadExtraAttachment}
                />
              </div>

              {/* Current Attachments List */}
              <div>
                <h4 className="font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span>รายการไฟล์แนบในหนังสือนี้ ({attachModalDoc.attachments?.length || 0} ไฟล์):</span>
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {attachModalDoc.attachments && attachModalDoc.attachments.length > 0 ? (
                    attachModalDoc.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-medium text-slate-800 truncate">{att.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">({att.fileSize})</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setViewingAttachment({
                                att,
                                docTitle: attachModalDoc.subject,
                                receiptNo: attachModalDoc.receiptNo,
                              })
                            }
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="ดูเอกสาร"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAttachmentFromDocument(attachModalDoc.id, att.id)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                            title="ลบไฟล์แนบ"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-400">ยังไม่มีไฟล์แนบในหนังสือฉบับนี้</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setAttachModalDoc(null);
                  setAttachSuccessMsg(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs"
              >
                เสร็จสิ้น / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRINT MODAL (SAFE PREVIEW & NO FREEZE) ================= */}
      {printSlipModalData && (
        <PrintModal
          isOpen={printSlipModalData.isOpen}
          title={printSlipModalData.title}
          subtitle={printSlipModalData.subtitle}
          htmlContent={printSlipModalData.html}
          fileName={printSlipModalData.fileName}
          onClose={() => setPrintSlipModalData(null)}
        />
      )}
    </div>
  );
};
