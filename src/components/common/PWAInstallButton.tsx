import React, { useState } from 'react';
import { Smartphone, Download, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'pill';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // If already running in standalone app mode, hide install button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) setInstalledSuccess(true);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // General instructions for browser users
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer shrink-0 ${className}`}
          title="ติดตั้งแอป อบต.อ่างแก้ว บนมือถือ / แท็บเล็ต"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ติดตั้งลงมือถือ</span>
          <span className="sm:hidden">แอป</span>
        </button>
      )}

      {variant === 'pill' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          <span>เพิ่มลงหน้าจอโฮม (Add to Home Screen)</span>
        </button>
      )}

      {variant === 'banner' && (
        <div className={`p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white shadow-md border border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">
                ใช้งาน อบต.อ่างแก้ว สะดวกยิ่งขึ้นบนมือถือ
              </h4>
              <p className="text-xs text-blue-200">
                เพิ่มลงในหน้าจอโฮม (Add to Home Screen) เพื่อแจ้งซ่อมและติดตามงานได้รวดเร็วเหมือนแอปแท้
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>ติดตั้งแอปลงบนมือถือ</span>
          </button>
        </div>
      )}

      {/* iOS Safari & General Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-800 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">
                    วิธีเพิ่มลงหน้าจอโฮมมือถือ
                  </h3>
                  <p className="text-[11px] text-slate-500">สำหรับ iPhone, iPad และ Android</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    บน iPhone (Safari): แตะปุ่ม "แชร์" (Share)
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    ไอคอนสี่เหลี่ยมลูกศรชี้ขึ้น <Share className="w-3 h-3 text-blue-600 inline" /> ที่แถบด้านล่าง
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    เลือก "เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    ไอคอนเครื่องหมายบวก <PlusSquare className="w-3 h-3 text-emerald-600 inline" />
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    กด "เพิ่ม" (Add) ที่มุมขวาบน
                  </p>
                  <p className="text-[11px] text-slate-500">
                    แอปจะปรากฏเป็นไอคอนบนหน้าจอมือถือของคุณทันที เปิดใช้งานได้เต็มจอโดยไม่ต้องพิมพ์ลิงก์อีก!
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  );
};
