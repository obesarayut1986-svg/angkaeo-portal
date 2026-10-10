import React from 'react';
import { X, Printer, Download, FileText, CheckCircle } from 'lucide-react';
import { DocAttachment } from '../../types';

interface FileViewerModalProps {
  attachment: DocAttachment | null;
  documentTitle?: string;
  receiptNo?: string;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  attachment,
  documentTitle,
  receiptNo,
  onClose,
}) => {
  if (!attachment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-lg text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base line-clamp-1">{attachment.name}</h3>
              <p className="text-xs text-slate-400">
                ขนาด: {attachment.fileSize} • วันที่แนบ: {attachment.uploadDate} {receiptNo && `• เลขที่รับ ${receiptNo}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition shadow"
              title="พิมพ์เอกสารแนบ"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex flex-col items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-300 max-w-2xl w-full text-slate-800 print:shadow-none print:border-none">
            {/* Official Header Mockup inside Document */}
            <div className="border-b-2 border-slate-800 pb-4 mb-6 text-center">
              <div className="inline-block w-12 h-12 mb-2">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-blue-900">
                  <circle cx="50" cy="50" r="45" stroke="#1e3a8a" strokeWidth="4" fill="#f8fafc" />
                  <path d="M 50 20 L 60 40 L 80 45 L 65 60 L 70 80 L 50 70 L 30 80 L 35 60 L 20 45 L 40 40 Z" fill="#2563eb" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                องค์การบริหารส่วนตำบลอ่างแก้ว
              </h2>
              <p className="text-xs text-slate-600">
                ตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง 14120
              </p>
              {receiptNo && (
                <div className="mt-2 inline-block px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-md text-xs font-semibold">
                  เลขที่รับสารบรรณ: {receiptNo}
                </div>
              )}
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-slate-700">
              <div className="flex justify-between text-xs text-slate-500 border-b pb-2">
                <span>เอกสารแนบต้นฉบับ: <strong>{attachment.name}</strong></span>
                <span>ตรวจสอบลายมือชื่ออิเล็กทรอนิกส์: <CheckCircle className="w-3.5 h-3.5 inline text-emerald-600" /> สมบูรณ์</span>
              </div>
              {documentTitle && (
                <div>
                  <span className="font-semibold text-slate-900">เรื่อง:</span> {documentTitle}
                </div>
              )}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
                <p className="font-medium text-slate-800">
                  รายละเอียดการแนบเอกสารตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ:
                </p>
                <p>
                  เอกสารนี้ถูกจัดเก็บในรูปแบบดิจิทัล (E-Document) ได้รับการรับรองและลงทะเบียนรับโดยระบบสารบรรณอิเล็กทรอนิกส์ อบต.อ่างแก้ว เจ้าหน้าที่สารบรรณกองสามารถเปิดตรวจสอบเนื้อหาและสั่งพิมพ์เพื่อเสนอผู้บังคับบัญชาตามลำดับขั้นได้
                </p>
              </div>

              {/* Simulated document pages */}
              <div className="border border-dashed border-slate-300 rounded p-6 text-center text-xs text-slate-400 bg-white">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-slate-600">{attachment.name}</p>
                <p>ไฟล์ดิจิทัลพร้อมพิมพ์และส่งต่อภายในกอง ({attachment.fileType})</p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t flex justify-between items-center text-xs text-slate-500">
              <span>ลงรับวันที่: {attachment.uploadDate}</span>
              <span>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-slate-200 text-xs text-slate-500">
          <span>ระบบสารบรรณอิเล็กทรอนิกส์ อบต.อ่างแก้ว (PDPA & ระเบียบสารบรรณ Compliant)</span>
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
