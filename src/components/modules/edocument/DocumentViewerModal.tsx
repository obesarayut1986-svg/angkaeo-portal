import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Eye,
  CheckCircle,
  Building2,
  Calendar,
  Clock,
  Paperclip,
  Share2,
  ExternalLink,
  ShieldCheck,
  History,
} from 'lucide-react';
import { EDocument, DocAttachment } from '../../../types';
import { printHtmlContent } from '../../../utils/printHelper';

interface DocumentViewerModalProps {
  document: EDocument | null;
  onClose: () => void;
  onViewAttachment?: (att: DocAttachment, docTitle: string, receiptNo: string) => void;
  onPrintSlip?: (doc: EDocument) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  onClose,
  onViewAttachment,
  onPrintSlip,
}) => {
  if (!doc) return null;

  const [activeTab, setActiveTab] = useState<'letter' | 'attachments' | 'timeline'>('letter');

  // Format Thai Date
  const formatThaiDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Generate official letter HTML for printing
  const generateOfficialLetterHtml = () => {
    return `
      <div style="font-family: 'Sarabun', 'TH Sarabun New', sans-serif; line-height: 1.6; color: #111827; padding: 30px; font-size: 15pt;">
        <!-- Header with Garuda -->
        <div style="text-align: center; margin-bottom: 20px;">
          <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; fill: #b45309; margin: 0 auto; display: block;">
            <circle cx="50" cy="50" r="45" stroke="#b45309" stroke-width="3" fill="#fffbeb" />
            <path d="M 50 18 L 62 38 L 85 42 L 68 58 L 73 80 L 50 68 L 27 80 L 32 58 L 15 42 L 38 38 Z" fill="#d97706" />
          </svg>
        </div>

        <!-- Document Header Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 60%; vertical-align: top;">
              <strong>ที่:</strong> ${doc.bookNo}
            </td>
            <td style="width: 40%; vertical-align: top; text-align: right;">
              ${doc.fromOrg}<br/>
              ลงวันที่ ${formatThaiDate(doc.bookDate)}
            </td>
          </tr>
        </table>

        <!-- Subject & To -->
        <div style="margin-bottom: 20px; line-height: 1.8;">
          <div><strong>เรื่อง:</strong> ${doc.subject}</div>
          <div><strong>เรียน:</strong> ${doc.toOrg}</div>
          ${doc.urgency !== 'ปกติ' ? `<div style="color: #b91c1c;"><strong>ชั้นความเร็ว:</strong> [ ${doc.urgency} ]</div>` : ''}
          ${doc.secrecy !== 'ปกติ' ? `<div style="color: #c2410c;"><strong>ชั้นความลับ:</strong> [ ${doc.secrecy} ]</div>` : ''}
        </div>

        <!-- Official Body Content -->
        <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 16px; line-height: 1.8;">
          ตามที่องค์การบริหารส่วนตำบลอ่างแก้ว ได้รับหนังสือราชการจาก ${doc.fromOrg} เรื่อง "${doc.subject}" เลขที่หนังสือ ${doc.bookNo} ลงวันที่ ${formatThaiDate(doc.bookDate)} เพื่อประสานงานและดำเนินการตามระเบียบงานสารบรรณนั้น
        </div>

        <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 25px; line-height: 1.8;">
          บัดนี้ งานสารบรรณกลาง สำนักปลัด ได้ดำเนินการลงทะเบียนรับหนังสือเข้าสู่ระบบสารบรรณอิเล็กทรอนิกส์ เลขที่รับ ${doc.receiptNo} และได้มอบหมายให้ ${doc.dispatchedToDivisionName || 'ส่วนราชการที่เกี่ยวข้อง'} ดำเนินการตรวจสอบข้อเท็จจริง และปฏิบัติตามอำนาจหน้าที่ต่อไป
        </div>

        <div style="text-indent: 2.5em; margin-bottom: 40px;">
          จึงเรียนมาเพื่อโปรดทราบและพิจารณาดำเนินการ
        </div>

        <!-- Signatures & Authority -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
          <div style="text-align: center; min-width: 250px;">
            ขอแสดงความนับถือ<br/><br/><br/>
            ( ${doc.registeredBy || 'ผู้ลงนามต้นสังกัด'} )<br/>
            ${doc.fromOrg}
          </div>
        </div>

        <!-- Stamps Box (Digital Receipt Seals) -->
        <div style="display: flex; gap: 20px; margin-top: 30px; border-top: 2px dashed #94a3b8; padding-top: 20px;">
          <!-- Central Receipt Stamp -->
          <div style="border: 2px solid #1e3a8a; border-radius: 8px; padding: 12px; width: 48%; text-align: center; color: #1e3a8a; font-size: 11pt;">
            <div style="font-weight: bold; border-bottom: 1px solid #1e3a8a; padding-bottom: 4px;">อบต.อ่างแก้ว (งานสารบรรณกลาง)</div>
            <div style="padding-top: 6px; text-align: left;">
              <div>เลขที่รับ: <strong>${doc.receiptNo}</strong></div>
              <div>วันที่รับ: ${doc.receiveDate}</div>
              <div>ส่งต่อ: <strong>${doc.dispatchedToDivisionName || 'รอกำหนด'}</strong></div>
            </div>
          </div>

          <!-- Division Receipt Stamp -->
          ${doc.divisionReceiptNo ? `
            <div style="border: 2px solid #059669; border-radius: 8px; padding: 12px; width: 48%; text-align: center; color: #059669; font-size: 11pt;">
              <div style="font-weight: bold; border-bottom: 1px solid #059669; padding-bottom: 4px;">ลงรับ: ${doc.dispatchedToDivisionName || 'กอง'}</div>
              <div style="padding-top: 6px; text-align: left;">
                <div>เลขรับกอง: <strong>${doc.divisionReceiptNo}</strong></div>
                <div>วันที่: ${doc.divisionReceivedDate || doc.acknowledgedAt || '-'}</div>
                <div>ผู้รับ: ${doc.acknowledgedBy || '-'}</div>
              </div>
            </div>
          ` : `
            <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; width: 48%; text-align: center; color: #64748b; font-size: 11pt; display: flex; align-items: center; justify-content: center;">
              (อยู่ระหว่างรอกองที่รับผิดชอบกดลงรับ)
            </div>
          `}
        </div>
      </div>
    `;
  };

  const handlePrintFullLetter = () => {
    const html = generateOfficialLetterHtml();
    printHtmlContent(html, `หนังสือราชการ_${doc.receiptNo}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Ribbon Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileText className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-blue-500/30 px-2 py-0.5 rounded text-blue-200 border border-blue-400/30">
                  เลขที่รับกลาง: {doc.receiptNo}
                </span>
                {doc.divisionReceiptNo && (
                  <span className="font-mono font-bold text-xs bg-emerald-500/30 px-2 py-0.5 rounded text-emerald-200 border border-emerald-400/30">
                    เลขรับกอง: {doc.divisionReceiptNo}
                  </span>
                )}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  doc.urgency === 'ด่วนที่สุด' ? 'bg-rose-500 text-white' :
                  doc.urgency === 'ด่วนมาก' ? 'bg-amber-500 text-slate-900' :
                  doc.urgency === 'ด่วน' ? 'bg-yellow-400 text-slate-900' : 'bg-slate-700 text-slate-200'
                }`}>
                  {doc.urgency}
                </span>
              </div>
              <h3 className="font-bold text-sm text-white line-clamp-1 mt-0.5">
                {doc.subject}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintFullLetter}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              title="พิมพ์เอกสารหนังสือราชการ"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์หนังสือ</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('letter')}
              className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'letter'
                  ? 'border-blue-600 text-blue-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>เนื้อหาหนังสือราชการ</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'attachments'
                  ? 'border-blue-600 text-blue-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>ไฟล์แนบต้นฉบับ ({doc.attachments?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'timeline'
                  ? 'border-blue-600 text-blue-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>เส้นทางเดินหนังสือ ({doc.timeline?.length || 0})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden md:block pb-2.5">
            รอบปีสารบรรณ: <strong className="text-blue-900 font-mono">พ.ศ. {doc.fiscalYear || '2569'} (ปีปฏิทิน)</strong>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          {activeTab === 'letter' && (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Paper Document Canvas */}
              <div className="bg-white rounded-xl shadow-md border border-slate-300 p-6 sm:p-10 font-sans text-slate-900 relative">
                
                {/* Garuda Seal */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 border-2 border-amber-600 flex items-center justify-center shadow-xs">
                    <span className="text-2xl" role="img" aria-label="Garuda">🦅</span>
                  </div>
                  <div className="text-[11px] font-bold text-amber-900 tracking-wider mt-1">
                    หนังสือราชการ • อบต.อ่างแก้ว
                  </div>
                </div>

                {/* Metadata Header Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 mb-4 border-b border-slate-200 text-xs">
                  <div className="space-y-1">
                    <div>
                      <span className="text-slate-500">เลขที่หนังสือจริง:</span>{' '}
                      <span className="font-mono font-bold text-slate-900">{doc.bookNo}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">จากหน่วยงาน:</span>{' '}
                      <span className="font-semibold text-slate-800">{doc.fromOrg}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">ถึง:</span>{' '}
                      <span className="font-semibold text-slate-800">{doc.toOrg}</span>
                    </div>
                  </div>

                  <div className="space-y-1 sm:text-right">
                    <div>
                      <span className="text-slate-500">ลงวันที่:</span>{' '}
                      <span className="font-semibold text-slate-800">{formatThaiDate(doc.bookDate)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">วัน-เวลาลงทะเบียนรับ:</span>{' '}
                      <span className="font-mono text-slate-800">{doc.receiveDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">ประเภทหนังสือ:</span>{' '}
                      <span className="font-semibold text-blue-700">
                        {doc.docType === 'inbound'
                          ? 'หนังสือรับ (ภายนอก)'
                          : doc.docType === 'outbound'
                          ? 'หนังสือส่ง (ภายนอก)'
                          : doc.docType === 'internal'
                          ? 'หนังสือภายใน (บันทึกข้อความ)'
                          : 'คำสั่ง อบต.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subject Block */}
                <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    เรื่อง (Subject):
                  </div>
                  <div className="text-base font-bold text-slate-900 leading-snug">
                    {doc.subject}
                  </div>
                </div>

                {/* Official Letter Body Text */}
                <div className="space-y-4 text-sm leading-relaxed text-slate-800 text-justify">
                  <p className="indent-8">
                    ด้วย{doc.fromOrg} ได้มีหนังสือราชการเลขที่ {doc.bookNo} ลงวันที่ {formatThaiDate(doc.bookDate)} เรื่อง &ldquo;{doc.subject}&rdquo; ส่งถึงองค์การบริหารส่วนตำบลอ่างแก้ว เพื่อโปรดพิจารณาและดำเนินการตามอำนาจหน้าที่
                  </p>

                  <p className="indent-8">
                    ในการนี้ งานสารบรรณกลาง สำนักปลัด องค์การบริหารส่วนตำบลอ่างแก้ว ได้รับเอกสารและลงทะเบียนรับกลางในระบบสารบรรณอิเล็กทรอนิกส์ เลขที่รับ <strong className="font-mono text-blue-900">{doc.receiptNo}</strong> ประจำปีปฏิทิน พ.ศ. {doc.fiscalYear || '2569'} เรียบร้อยแล้ว พร้อมทั้งจ่ายหนังสือส่งต่อไปยัง <strong className="text-indigo-900">{doc.dispatchedToDivisionName || 'ส่วนราชการผู้รับผิดชอบ'}</strong>
                  </p>

                  <p className="indent-8 text-slate-600 text-xs italic">
                    จึงเรียนมาเพื่อโปรดทราบ และให้เจ้าหน้าที่ผู้เกี่ยวข้องดำเนินการตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖ และที่แก้ไขเพิ่มเติม
                  </p>
                </div>

                {/* Digital Official Seals (ตรายางรับหนังสือราชการ) */}
                <div className="mt-8 pt-6 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Central Seal */}
                  <div className="p-3.5 rounded-xl border-2 border-blue-600 bg-blue-50/70 text-blue-900 text-xs">
                    <div className="flex items-center justify-between font-bold border-b border-blue-300 pb-1.5 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-700" />
                        <span>ตรายางรับ: สารบรรณกลาง อบต.อ่างแก้ว</span>
                      </span>
                      <span className="text-[10px] bg-blue-200 px-1.5 py-0.5 rounded font-mono">
                        ยืนยันแล้ว
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div>เลขที่รับกลาง: <strong className="font-mono text-sm">{doc.receiptNo}</strong></div>
                      <div>ลงวันที่รับ: <strong>{doc.receiveDate}</strong></div>
                      <div>ผู้ลงทะเบียน: {doc.registeredBy || 'สารบรรณกลาง'}</div>
                      <div>กองที่รับผิดชอบ: <strong>{doc.dispatchedToDivisionName || 'รอดำเนินการ'}</strong></div>
                    </div>
                  </div>

                  {/* Division Seal */}
                  <div className={`p-3.5 rounded-xl border-2 text-xs ${
                    doc.divisionReceiptNo
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950'
                      : 'border-slate-300 bg-slate-50 text-slate-500'
                  }`}>
                    <div className="flex items-center justify-between font-bold border-b border-current pb-1.5 mb-2 opacity-90">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-700" />
                        <span>ตรายางรับ: {doc.dispatchedToDivisionName || 'สารบรรณกอง'}</span>
                      </span>
                      {doc.divisionReceiptNo && (
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono">
                          ลงรับแล้ว
                        </span>
                      )}
                    </div>
                    {doc.divisionReceiptNo ? (
                      <div className="space-y-1 text-[11px]">
                        <div>เลขรับของกอง: <strong className="font-mono text-sm text-emerald-900">{doc.divisionReceiptNo}</strong></div>
                        <div>วัน-เวลาลงรับ: <strong>{doc.divisionReceivedDate || doc.acknowledgedAt || '-'}</strong></div>
                        <div>ผู้กดลงรับ: {doc.acknowledgedBy || '-'}</div>
                        <div className="text-emerald-700 font-semibold">สถานะ: กองรับหนังสือเข้าสู่ระบบเรียบร้อย</div>
                      </div>
                    ) : (
                      <div className="py-3 text-center text-slate-400">
                        <Clock className="w-5 h-5 mx-auto mb-1 opacity-50" />
                        <span>รอกองที่รับผิดชอบกดลงรับเอกสาร</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Action Ribbon Under Document */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>เอกสารผ่านการลงทะเบียนรับตามระเบียบงานสารบรรณ</span>
                </div>
                <div className="flex items-center gap-2">
                  {onPrintSlip && (
                    <button
                      type="button"
                      onClick={() => onPrintSlip(doc)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                      <span>พิมพ์ใบรับสารบรรณ</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePrintFullLetter}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์หนังสือฉบับเต็ม</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-blue-600" />
                  <span>รายการไฟล์แนบต้นฉบับทั้งหมด ({doc.attachments?.length || 0} รายการ)</span>
                </div>
                <span className="text-[11px] text-blue-700">คลิก &ldquo;เปิดดูฉบับเต็ม&rdquo; เพื่อเปิดอ่านแบบ A4 หรือดาวน์โหลด</span>
              </div>

              {(!doc.attachments || doc.attachments.length === 0) ? (
                <div className="bg-white rounded-xl p-10 text-center border border-slate-200 text-slate-400">
                  <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>ไม่มีไฟล์แนบในหนังสือราชการฉบับนี้</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {doc.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-blue-400 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-blue-50 rounded-xl text-blue-700 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {att.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono">{att.fileSize}</span>
                            <span>•</span>
                            <span>{att.fileType}</span>
                            <span>•</span>
                            <span>แนบเมื่อ: {att.uploadDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewAttachment) {
                              onViewAttachment(att, doc.subject, doc.receiptNo);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>เปิดดูฉบับเต็ม</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="max-w-2xl mx-auto bg-white rounded-xl p-6 border border-slate-200 shadow-2xs">
              <h4 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>ประวัติและเส้นทางเดินหนังสือราชการ (Routing Audit)</span>
              </h4>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {doc.timeline?.map((event, idx) => (
                  <div key={event.id || idx} className="relative">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                      {idx + 1}
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-blue-950">{event.step}</span>
                        <span className="font-mono text-[11px] text-slate-400">{event.timestamp}</span>
                      </div>
                      <div className="text-xs text-slate-700 mt-1">
                        ผู้ปฏิบัติ: <strong className="text-slate-900">{event.actionBy}</strong> ({event.roleName})
                      </div>
                      {event.toDivision && (
                        <div className="text-xs text-indigo-700 font-semibold mt-0.5">
                          ปลายทาง: {event.toDivision}
                        </div>
                      )}
                      {event.note && (
                        <div className="text-[11px] text-slate-500 mt-1 bg-white p-2 rounded border border-slate-200">
                          {event.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-t border-slate-200 text-xs shrink-0">
          <div className="text-[11px] text-slate-500">
            ระบบสารบรรณอิเล็กทรอนิกส์ • อบต.อ่างแก้ว
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
