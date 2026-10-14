import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  BellRing,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  Volume2,
  Vibrate,
  ShieldCheck,
  Send,
  Info,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendWebNotification,
  playNotificationChime,
  triggerVibration,
  updateAppBadge,
} from '../../utils/webNotificationService';

interface WebPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount?: number;
}

export const WebPushModal: React.FC<WebPushModalProps> = ({
  isOpen,
  onClose,
  unreadCount = 1,
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [testSent, setTestSent] = useState(false);
  const [soundTested, setSoundTested] = useState(false);
  const [vibrateTested, setVibrateTested] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      sendWebNotification('อบต.อ่างแก้ว: เปิดรับการแจ้งเตือนสำเร็จ', {
        body: 'ระบบพร้อมส่งการแจ้งเตือนหนังสือราชการและงานด่วนถึงคุณแบบเรียลไทม์',
      });
    }
  };

  const handleSendTestPush = () => {
    const success = sendWebNotification('อบต.อ่างแก้ว (E-Office)', {
      body: '📄 มีหนังสือราชการใหม่: "ขอความอนุเคราะห์ข้อมูลสถิติ" (เลขที่ 0001/2569) ส่งถึงกองของคุณแล้ว',
      tag: 'test-notification',
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3500);
    if (!success && permission !== 'granted') {
      handleRequestPermission();
    }
  };

  const handleTestSound = () => {
    playNotificationChime();
    setSoundTested(true);
    setTimeout(() => setSoundTested(false), 2000);
  };

  const handleTestVibrate = () => {
    triggerVibration([150, 80, 150]);
    setVibrateTested(true);
    setTimeout(() => setVibrateTested(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <BellRing className="w-5 h-5 text-amber-300 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                ระบบแจ้งเตือน Web Push Notification & มือถือ
              </h3>
              <p className="text-xs text-blue-200">
                แจ้งเตือนแบบเรียลไทม์ ฟรี 100% ไม่จำกัดจำนวนครั้ง พร้อมตัวเลขบนไอคอนมือถือ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Permission Status Box */}
          <div className="p-4 rounded-2xl border transition-all">
            {permission === 'granted' ? (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-900">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-sm">การแจ้งเตือนเปิดใช้งานแล้ว (Granted)</div>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    อุปกรณ์และเบราว์เซอร์นี้พร้อมรับการแจ้งเตือนหนังสือราชการและงานด่วนทันทีที่มีเอกสารเข้ามา
                  </p>
                </div>
              </div>
            ) : permission === 'denied' ? (
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-sm">การแจ้งเตือนถูกปิดกั้น (Blocked / Denied)</div>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    โปรดคลิกที่ไอคอนแม่กุญแจ 🔒 ที่แถบพิมพ์ URL ของเบราว์เซอร์ แล้วเลือก &ldquo;อนุญาต (Allow)&rdquo; สำหรับการแจ้งเตือน (Notifications)
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-blue-900">
                <div className="flex items-start gap-2.5">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm">ยังไม่ได้ขอสิทธิ์การแจ้งเตือนบนอุปกรณ์นี้</div>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      กดปุ่มด้านขวาเพื่อให้เบราว์เซอร์แสดงป็อปอัปแจ้งเตือนเวลาที่มีหนังสือราชการใหม่
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs whitespace-nowrap shadow-xs transition cursor-pointer"
                >
                  เปิดรับการแจ้งเตือน
                </button>
              </div>
            )}

            {/* Test Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSendTestPush}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                {testSent ? <Check className="w-4 h-4 text-emerald-300" /> : <Send className="w-4 h-4" />}
                <span>{testSent ? 'ส่งสำเร็จแล้ว!' : 'ทดสอบส่ง Web Push'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestSound}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span>{soundTested ? 'กำลังเล่นเสียง...' : 'ทดสอบเสียงเตือน'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestVibrate}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
              >
                <Vibrate className="w-4 h-4 text-emerald-600" />
                <span>{vibrateTested ? 'สั่นแล้ว' : 'ทดสอบระบบสั่น'}</span>
              </button>
            </div>
          </div>

          {/* Key Answers & Comparisons */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>สรุปข้อเปรียบเทียบ: LINE Official Account vs Web Push Notification</span>
            </h4>

            {/* Comparison Table / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* LINE OA Box */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    LINE Official Account (แพ็กเกจฟรี)
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                    จำกัดโควต้า
                  </span>
                </div>
                <div className="text-[11px] text-amber-900 space-y-1 leading-relaxed">
                  <p>
                    • <strong>โควต้าฟรี:</strong> ให้ส่งได้เพียง <strong>500 ข้อความ/เดือน</strong>
                  </p>
                  <p>
                    • <strong>สำหรับผู้ใช้ 50 คน:</strong> ส่งบรอดแคสต์ 1 ครั้ง จะตัดโควต้า 50 ข้อความทันที!
                  </p>
                  <p className="p-2 bg-amber-100/70 rounded-lg text-amber-950 font-medium">
                    ⚠️ <strong>ดังนั้น:</strong> ส่งหนังสือได้เพียง <strong>10 ฉบับต่อเดือน</strong> (50 คน × 10 ครั้ง = 500) โควต้าจะหมดเกลี้ยง! หากมี 20-30 ฉบับ จะต้องจ่ายเงินซื้อแพ็กเกจ Basic (1,200 บาท/เดือน)
                  </p>
                </div>
              </div>

              {/* Web Push Notification Box */}
              <div className="p-3.5 bg-blue-50 border border-blue-300 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Web Push Notification & App Badge
                  </span>
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">
                    ฟรี 100% ไม่จำกัด
                  </span>
                </div>
                <div className="text-[11px] text-blue-900 space-y-1 leading-relaxed">
                  <p>
                    • <strong>ค่าใช้จ่าย:</strong> <strong>ฟรี 100% ตลอดชีพ</strong> ไม่มีค่าบริการรายเดือน
                  </p>
                  <p>
                    • <strong>จำนวนผู้ใช้ & ข้อความ:</strong> <strong>ไม่จำกัด</strong> ส่งกี่ร้อยกี่พันฉบับต่อเดือนก็ฟรี
                  </p>
                  <p className="p-2 bg-blue-100/70 rounded-lg text-blue-950 font-medium">
                    ✨ <strong>แจ้งเตือนบนไอคอนมือถือ:</strong> มีตัวเลขสีแดง (App Badge) ขึ้นบนไอคอนแอพในโทรศัพท์มือถือตามจำนวนงานจริงทันที!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Role-based Filtering & Exclusions */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>การคัดกรองการแจ้งเตือนตามบทบาทหน้าที่ (Role-Based Filtering)</span>
            </h5>
            <ul className="space-y-1.5 text-[11px] text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span>
                  <strong>หนังสือราชการ:</strong> แจ้งเตือนเฉพาะกองที่ได้รับมอบหมายหนังสือฉบับนั้น และผู้บริหาร/สารบรรณกลางเท่านั้น กองอื่นที่ไม่เกี่ยวข้องจะไม่ถูกรบกวน
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span>
                  <strong>งานแจ้งซ่อมทั่วไป:</strong> แจ้งเตือนเฉพาะกองช่างและผู้บริหาร
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-600 font-bold shrink-0">✕</span>
                <span className="text-rose-950 font-medium">
                  <strong>ตัดระบบวัสดุ/พัสดุออกจากการแจ้งเตือน:</strong> ตามที่ระบุ ระบบจะไม่ส่งการแจ้งเตือนรายการเบิกจ่ายหรือสต็อกพัสดุ เพราะมีจำนวนมาก เพื่อป้องกันไม่ให้ตัวเลขแจ้งเตือนเยอะเกินไป
                </span>
              </li>
            </ul>
          </div>

          {/* How to add to home screen */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-2xl text-[11px] text-indigo-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>📱 คำแนะนำสำหรับผู้ใช้งานมือถือ:</span>
            </div>
            <p>
              • <strong>Android:</strong> เปิดเว็บใน Chrome แล้วกดปุ่มจุดสามจุดมุมบนขวา เลือก &ldquo;ติดตั้งแอปลงในโทรศัพท์&rdquo; (Install App)
            </p>
            <p>
              • <strong>iOS (iPhone/iPad):</strong> เปิดเว็บใน Safari แล้วกดปุ่มแชร์ (สี่เหลี่ยมลูกศรชี้ขึ้น) เลือก &ldquo;เพิ่มไปยังหน้าจอโฮม&rdquo; (Add to Home Screen) รองรับ iOS 16.4+ ขึ้นไป
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            ระบบสารบรรณและแจ้งเตือน อบต.อ่างแก้ว
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
          >
            เข้าใจแล้ว / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
