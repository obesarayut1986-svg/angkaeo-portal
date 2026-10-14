/**
 * Data Types & Contracts for
 * องค์การบริหารส่วนตำบลอ่างแก้ว อ.โพธิ์ทอง จ.อ่างทอง Intranet & Public Portal
 */

export type UserRole = 
  | 'super_admin'            // ผู้ดูแลระบบหลัก (มีสิทธิ์ทุกอย่าง จัดการผู้ใช้ ตั้งค่าระบบ)
  | 'executive'              // ผู้บริหาร (นายก อบต. / ปลัด อบต.)
  | 'division_director'      // ผู้อำนวยการกอง (หัวหน้ากอง Approver อนุมัติคำขอเบิก)
  | 'central_saraban'        // สารบรรณกลาง (สำนักปลัด - ลงรับ/ส่ง/จ่ายหนังสือ จัดเวร)
  | 'division_admin'         // สารบรรณกอง/แอดมินกอง (กดรับหนังสือ)
  | 'division_stock_officer' // เจ้าหน้าที่คลังพัสดุประจำกอง (จัดการสต็อก อนุมัติเบิกจ่าย/ตัดสต็อก)
  | 'technician'             // ช่างซ่อม (กองช่าง อัปเดตงานซ่อม)
  | 'hr_staff'               // บุคลากร (จัดการเวรและกิจกรรม)
  | 'staff';                 // ผู้ใช้ทั่วไป (Requester เขียนใบเบิก ค้นหาเฉพาะกองตนเอง)

export interface UserPermission {
  canUseSarabanCentral: boolean;     // สารบรรณกลาง
  canUseSarabanDivision: boolean;    // สารบรรณกอง
  canEditSarabanReceiptNo: boolean;  // สิทธิ์แก้เลขรับสารบรรณ (Admin หรือ สารบรรณกลางพิเศษ)
  canManageRepairs: boolean;         // จัดการงานซ่อม/ช่าง
  canApproveLicenseStep1: boolean;   // อนุมัติใบอนุญาตขั้น 1 (หัวหน้ากอง)
  canApproveLicenseStep2: boolean;   // อนุมัติใบอนุญาตขั้น 2 (ปลัด/นายก)
  canManageLicenseForms: boolean;    // จัดการฟอร์มใบอนุญาต (Dynamic Builder)
  canManageDutyRoster: boolean;      // จัดตารางเวรปฏิบัติหน้าที่
  canManageInventory: boolean;       // แอดมินจัดการวัสดุ
  canApproveInventory: boolean;      // ผอ.กอง อนุมัติเบิกวัสดุ
  canManageUsers: boolean;           // จัดการผู้ใช้
  canManageCms: boolean;             // ตั้งค่า CMS/หัวเว็บ
  canRequestMaterial?: boolean;      // ผู้ใช้ทั่วไป เขียนใบเบิกวัสดุ
  canApproveRequisition?: boolean;   // หัวหน้ากอง อนุมัติใบเบิกของกองตัวเอง
  canDispenseMaterial?: boolean;     // จนท.คลังพัสดุกอง จ่ายพัสดุและตัดสต็อก
  canManageDivisionStock?: boolean;  // จนท.คลังพัสดุกอง จัดการสต็อกของกองตัวเอง
}

export interface User {
  id: string;
  username: string;
  password?: string; // encrypted or hashed mock string
  fullName: string;
  position: string;
  divisionId: string;    // รหัสกอง/สำนัก
  divisionName: string;  // ชื่อกอง
  role: UserRole;
  phone: string;
  avatarUrl?: string;
  permissions: UserPermission;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Division {
  id: string;
  name: string;
  code: string;          // เช่น สป, กค, กช, กศ
  shortCode: string;     // เช่น ปล, คล, ชง, ศษ สำหรับเลขที่เอกสาร
  directorName?: string;
  isDefault?: boolean;   // 4 กองหลัก
}

export interface Village {
  id: string;
  no: number;
  name: string;
  description?: string;
  lat: number;
  lng: number;
}

// 1. ระบบสารบรรณอิเล็กทรอนิกส์
export type DocType = 'inbound' | 'outbound' | 'internal' | 'order';
export type DocStatus = 'registered' | 'dispatched' | 'acknowledged' | 'archived';

export interface DocAttachment {
  id: string;
  name: string;
  fileType: string;
  fileSize: string;
  dataUrl?: string;
  uploadDate: string;
}

export interface DocTrackingEvent {
  id: string;
  timestamp: string;
  step: 'ลงทะเบียนรับ' | 'จ่ายหนังสือ' | 'กองรับเอกสาร' | 'เกษียณหนังสือ' | 'แนบเอกสารเพิ่มเติม' | 'เสร็จสิ้น';
  actionBy: string;
  roleName: string;
  toDivision?: string;
  note?: string;
}

export interface SarabanReceiptAuditLog {
  id: string;
  docId: string;
  oldReceiptNo: string;
  newReceiptNo: string;
  changedBy: string;
  changedAt: string;
  reason: string;
}

export interface EDocument {
  id: string;
  docType: DocType;
  fiscalYear: string;         // ปีงบประมาณ เช่น 2569
  receiptNo: string;          // เลขที่รับ (รันอัตโนมัติ เช่น 0124/2569 หรือ 0001/2569)
  bookNo: string;             // เลขที่หนังสือจริง เช่น มท 0808.2/ว 1234
  subject: string;            // เรื่อง
  fromOrg: string;            // จาก (หน่วยงานต้นทาง)
  toOrg: string;              // ถึง
  bookDate: string;           // ลงวันที่
  receiveDate: string;        // วันที่ลงรับ
  urgency: 'ปกติ' | 'ด่วน' | 'ด่วนมาก' | 'ด่วนที่สุด';
  secrecy: 'ปกติ' | 'ลับ' | 'ลับมาก' | 'ลับที่สุด';
  dispatchedToDivisionId?: string;
  dispatchedToDivisionName?: string;
  divisionReceiptNo?: string;        // เลขรับของกอง (รันอัตโนมัติแยกตามแต่ละกอง เช่น 0001/2570)
  divisionReceivedDate?: string;     // วันที่/เวลาที่กองกดรับหนังสือ
  status: DocStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  attachments: DocAttachment[];
  timeline: DocTrackingEvent[];
  auditLogs: SarabanReceiptAuditLog[];
  registeredBy: string;
}

// 2. ระบบแจ้งซ่อม (Repair)
export type RepairUrgency = 'ปกติ' | 'ด่วน' | 'ด่วนที่สุด';
export type RepairStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type RepairCategory = 
  | 'ไฟฟ้าสาธารณะ ไฟทาง' 
  | 'ประปาหมู่บ้าน' 
  | 'ถนนชำรุด/เป็นหลุมเป็นบ่อ' 
  | 'ทางระบายน้ำอุดตัน น้ำท่วมขัง' 
  | 'คำร้องอื่นๆ';

export interface RepairItem {
  id: string;
  ticketId: string;           // เลขใบแจ้งซ่อม เช่น REP-2569-0012
  isPublic: boolean;          // แจ้งจากประชาชน หรือ เจ้าหน้าที่
  reporterName: string;
  reporterPhone: string;
  reporterCitizenIdMasked?: string;
  category: RepairCategory;
  urgency: RepairUrgency;
  description: string;
  locationAddress: string;
  villageNo: number;          // หมู่ที่ 1-6 ตำบลอ่างแก้ว
  coordinates: {
    lat: number;
    lng: number;
  };
  damagePhotos: string[];     // รูปความเสียหาย (ก่อนซ่อม)
  status: RepairStatus;
  createdAt: string;
  assignedTechnician?: string;
  repairedAt?: string;
  completionNotes?: string;
  completionPhotos?: string[]; // รูปหลังซ่อมเสร็จ
  durationHours?: number;     // สำหรับคำนวณระยะเวลาเฉลี่ย
}

// 3. ระบบขอใบอนุญาตออนไลน์ (E-License & Public Permit)
export type LicenseStatus = 
  | 'draft' 
  | 'submitted' 
  | 'step1_approved' // ผ่านหัวหน้ากอง
  | 'step1_rejected' 
  | 'step2_approved' // อนุมัติแล้ว (ปลัด/นายก)
  | 'step2_rejected';

export type DynamicFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'radio' | 'checkbox';

export interface DynamicFormField {
  id: string;
  label: string;
  fieldType: DynamicFieldType;
  required: boolean;
  options?: string[]; // สำหรับ select, radio
  placeholder?: string;
}

export interface LicenseTypeConfig {
  id: string;
  code: string;
  title: string;
  divisionId: string;
  divisionName: string;
  description: string;
  fee: number;
  estimatedDays: number;
  requiredDocuments: string[]; // e.g. ["สำเนาบัตรประชาชน", "สำเนาทะเบียนบ้าน", "โฉนดที่ดิน", "แผนผังแบบแปลน"]
  customFields: DynamicFormField[];
  isActive: boolean;
}

export interface LicenseApplication {
  id: string;
  applicationNo: string; // เช่น LIC-2569-005
  licenseTypeId: string;
  licenseTitle: string;
  divisionId: string;
  applicantCitizenId: string; // เลขบัตรประชาชน
  applicantName: string;
  applicantPhone: string;
  applicantAddress: string;
  formValues: Record<string, any>;
  attachedFiles: {
    docName: string;
    fileName: string;
    dataUrl?: string;
    uploadDate: string;
  }[];
  status: LicenseStatus;
  submittedAt: string;
  step1Review?: {
    reviewerName: string;
    approved: boolean;
    comment: string;
    timestamp: string;
  };
  step2Approval?: {
    approverName: string;
    approved: boolean;
    comment: string;
    timestamp: string;
    licenseCertNo?: string;
    issuedDate?: string;
  };
}

// 4. ระบบกิจกรรมและปฏิทินเวรปฏิบัติงาน (Calendar & Duty Roster)
export type DutyShiftType = 'holiday' | 'disaster_prevention'; // เวรวันหยุด (08:30-16:30) หรือ เวรป้องกันฯ (18:00-06:00)

export interface DutyOfficer {
  name: string;
  position: string;
  phone: string;
  isLeader?: boolean;
}

export interface DutyRosterEntry {
  id: string;
  dateStr: string; // YYYY-MM-DD
  shiftType: DutyShiftType;
  shiftTitle: string;
  timeRange: string; // '08:30 - 16:30 น.' หรือ '18:00 - 06:00 น.'
  officers: DutyOfficer[];
  divisionName: string;
  createdBy: string;
  updatedAt: string;
}

export interface OrganizationEvent {
  id: string;
  dateStr: string; // YYYY-MM-DD
  title: string;
  location: string;
  timeRange: string;
  description: string;
  divisionName: string;
  photos: string[];
  summaryReport?: string;
  createdBy: string;
}

// 5. ระบบทะเบียนและบัญชีวัสดุ (Inventory / พ.ด.4)
export type StockTransactionType = 'in' | 'out'; // รับเข้า หรือ จ่ายออก

export interface MaterialCategory {
  id: string;
  name: string; // e.g. "วัสดุสำนักงาน", "วัสดุงานบ้านงานครัว", "วัสดุคอมพิวเตอร์", "วัสดุก่อสร้าง"
}

export interface MaterialItem {
  id: string;
  divisionId: string;
  divisionName: string;
  code: string;           // รหัสพัสดุ (๕)
  name: string;           // ชื่อหรือชนิดวัสดุ (๔)
  categoryName: string;   // ประเภทวัสดุ (๓)
  sizeOrSpec?: string;    // ขนาดหรือลักษณะ
  unit: string;           // หน่วยที่นับ (๖)
  currentStock: number;   // ยอดคงเหลือปัจจุบัน
  unitPrice: number;      // ราคาต่อหน่วย (บาท)
  minStockAlert?: number; // จุดสั่งซื้อ
  sheetNo?: string;       // แผ่นที่ (๑)
  storageLocation?: string; // ที่เก็บ
  maxStock?: number;      // จำนวนอย่างสูง (๗)
  minStock?: number;      // จำนวนอย่างต่ำ (๗)
  createdAt: string;
}

export interface MaterialTransaction {
  id: string;
  docNo: string;          // เลขที่เอกสาร (เช่น ใบสั่งซื้อ, ใบเบิกวัสดุ กช-2569-01)
  materialId: string;
  materialName: string;
  divisionId: string;     // กองเจ้าของพัสดุ
  borrowingDivisionId?: string; // ในกรณีเบิกข้ามกอง
  transactionType: StockTransactionType; // 'in' = รับ, 'out' = จ่าย
  partyName: string;      // รับจากร้าน... หรือ จ่ายให้ นาย... ตำแหน่ง...
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  balanceQuantity: number;
  transactionDate: string; // วันที่ทำรายการ (YYYY-MM-DD)
  fiscalYear: string;     // ปีงบประมาณ
  approvedBy?: string;    // ผู้อำนวยการกองที่อนุมัติ
  status: 'pending_approval' | 'approved' | 'rejected';
  signature?: string;     // ลายมือชื่อ
  signatoryName?: string; // ชื่อผู้ลงนามรับ/จ่าย
  note?: string;          // หมายเหตุ
}

// 5.1 ระบบใบเบิกวัสดุ (Material Requisitions) แยก 4 กอง
export type RequisitionStatus =
  | 'pending_approver'  // รอหัวหน้ากองอนุมัติ
  | 'pending_dispense'  // หัวหน้ากองอนุมัติแล้ว รอ จนท.พัสดุจ่ายวัสดุ/ตัดสต็อก
  | 'completed'         // จ่ายวัสดุและตัดสต็อกเรียบร้อยแล้ว
  | 'rejected'          // ไม่อนุมัติ
  | 'cancelled';        // ยกเลิก / แก้ไขข้อผิดพลาด

export interface RequisitionItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  categoryName: string;
  unit: string;
  quantity: number;
  unitPrice: number;    // ราคาต่อหน่วย (บาท) ณ วันที่เบิก (ล็อกราคา)
  totalPrice: number;   // รวมเป็นเงิน (quantity * unitPrice)
}

export interface MaterialRequisition {
  id: string;
  reqNo: string;              // เลขที่เอกสาร เช่น ปล-202610-001
  divisionId: string;         // สังกัดกอง
  divisionName: string;
  divisionShortCode: string;  // ปล | คล | ชง | ศษ
  requesterId: string;
  requesterName: string;
  requesterPosition: string;
  requestDate: string;        // YYYY-MM-DD
  requestDateTime: string;    // วันที่-เวลาจริง เช่น "10 ต.ค. 2569 เวลา 16:56 น."
  purpose: string;            // วัตถุประสงค์การเบิก
  items: RequisitionItem[];
  totalAmount: number;        // ยอดรวมทั้งสิ้น
  status: RequisitionStatus;

  // ขั้นที่ 1: หัวหน้ากอง (Approver)
  approverId?: string;
  approverName?: string;
  approvedAt?: string;
  approverComment?: string;

  // ขั้นที่ 2: เจ้าหน้าที่คลังพัสดุประจำกอง (Dispenser)
  dispenserId?: string;
  dispenserName?: string;
  dispensedAt?: string;
  dispenserComment?: string;

  // กรณีไม่อนุมัติ
  rejectedBy?: string;
  rejectedAt?: string;
  rejectReason?: string;

  // กรณียกเลิก / แก้ไขข้อผิดพลาด
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;

  fiscalYear: string;
  createdAt: string;
  updatedAt: string;
}

// 6. CMS Settings
export interface CmsSettings {
  orgName: string;
  orgSubName: string;
  currentFiscalYear?: string; // เช่น '2570' (เริ่ม 1 ต.ค. 2569 เป็นปีงบประมาณ 2570)
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  announcementText: string;
  heroHeadline: string;
  heroSubtitle: string;
  logoUrl?: string;
  bannerBgColor?: string;
}

// 7. PDPA Access Log
export interface PdpaAccessLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: 'view' | 'create' | 'update' | 'export' | 'delete';
  targetResource: string;
  targetId: string;
  details: string;
}
