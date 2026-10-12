import React, { useEffect, useRef } from 'react';
import { Printer, Download, X, ExternalLink, FileCheck, CheckCircle } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  htmlContent: string;
  fileName?: string;
  onClose: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  title,
  subtitle = 'ระบบงาน อบต.อ่างแก้ว อ.โพธิ์ทอง จ.อ่างทอง',
  htmlContent,
  fileName = 'official-document',
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    try {
      // 1. Try to open clean print window
      const printWindow = window.open('', '_blank', 'width=850,height=900');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>${title}</title>
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
              <style>
                @page { size: A4 portrait; margin: 15mm; }
                body {
                  font-family: 'Sarabun', 'TH Sarabun New', sans-serif, system-ui;
                  color: #111827;
                  background: #ffffff;
                  margin: 0;
                  padding: 15px;
                  font-size: 13pt;
                  line-height: 1.5;
                }
                .print-container { width: 100%; max-width: 800px; margin: 0 auto; }
                .header-center { text-align: center; margin-bottom: 20px; }
                .garuda { width: 65px; height: auto; margin: 0 auto 10px auto; display: block; }
                .org-title { font-size: 16pt; font-weight: bold; margin: 0; }
                .org-sub { font-size: 13pt; color: #374151; margin-top: 4px; }
                table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12pt; }
                table, th, td { border: 1px solid #333333; }
                th { background-color: #f3f4f6; padding: 7px 5px; font-weight: bold; text-align: center; }
                td { padding: 7px 5px; vertical-align: top; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 35px; page-break-inside: avoid; }
                .sig-box { text-align: center; font-size: 12pt; padding: 10px; }
                .sig-line { margin-top: 40px; border-bottom: 1px dotted #4b5563; width: 70%; margin-left: auto; margin-right: auto; }
                .badge { display: inline-block; padding: 3px 8px; border: 1px solid #9ca3af; border-radius: 4px; font-size: 11pt; }
              </style>
            </head>
            <body>
              <div class="print-container">
                ${htmlContent}
              </div>
              <script>
                window.onload = function() {
                  window.focus();
                  setTimeout(function() {
                    window.print();
                  }, 300);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        // Fallback: window.print() directly
        window.print();
      }
    } catch (e) {
      console.warn('Direct print window blocked or failed, calling window.print directly', e);
      window.print();
    }
  };

  const handleDownloadHtml = () => {
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body {
      font-family: 'Sarabun', 'TH Sarabun New', sans-serif, system-ui;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 14pt;
      line-height: 1.5;
    }
    .print-container { width: 100%; max-width: 800px; margin: 0 auto; }
    .header-center { text-align: center; margin-bottom: 20px; }
    .garuda { width: 65px; height: auto; margin: 0 auto 10px auto; display: block; }
    .org-title { font-size: 16pt; font-weight: bold; margin: 0; }
    .org-sub { font-size: 13pt; color: #374151; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12pt; }
    table, th, td { border: 1px solid #333333; }
    th { background-color: #f3f4f6; padding: 7px 5px; font-weight: bold; text-align: center; }
    td { padding: 7px 5px; vertical-align: top; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 35px; page-break-inside: avoid; }
    .sig-box { text-align: center; font-size: 12pt; padding: 10px; }
    .sig-line { margin-top: 40px; border-bottom: 1px dotted #4b5563; width: 70%; margin-left: auto; margin-right: auto; }
  </style>
</head>
<body>
  <div class="print-container">
    ${htmlContent}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-300">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-lg text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base line-clamp-1">{title}</h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHtml}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition border border-slate-700 cursor-pointer shadow-2xs"
              title="ดาวน์โหลดไฟล์สำหรับเปิดพิมพ์หรือบันทึกเป็น PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ดาวน์โหลดไฟล์/PDF</span>
            </button>
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
              title="สั่งพิมพ์ผ่านเครื่องพิมพ์ (Print)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>สั่งพิมพ์ (Print)</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200 flex flex-col items-center">
          <div
            ref={printAreaRef}
            className="bg-white p-6 sm:p-10 rounded-xl shadow-lg border border-slate-300 max-w-3xl w-full text-slate-900 print-document-sheet"
            style={{ fontFamily: "'Sarabun', 'TH Sarabun New', sans-serif" }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-slate-200 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 text-emerald-700 font-medium">
            <CheckCircle className="w-4 h-4" />
            <span>แบบฟอร์มมาตรฐานราชการ อบต.อ่างแก้ว (กดสั่งพิมพ์ได้ทันทีโดยไม่ค้างหน้าจอ)</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
