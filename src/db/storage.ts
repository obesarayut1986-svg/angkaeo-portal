import {
  Division,
  Village,
  User,
  EDocument,
  DocAttachment,
  RepairItem,
  LicenseTypeConfig,
  LicenseApplication,
  DutyRosterEntry,
  OrganizationEvent,
  MaterialCategory,
  MaterialItem,
  MaterialTransaction,
  MaterialRequisition,
  CmsSettings,
  PdpaAccessLog,
  DocType,
  DocTrackingEvent,
  SarabanReceiptAuditLog,
} from '../types';

import {
  INITIAL_DIVISIONS,
  INITIAL_VILLAGES,
  INITIAL_USERS,
  INITIAL_DOCUMENTS,
  INITIAL_REPAIRS,
  INITIAL_LICENSE_TYPES,
  INITIAL_LICENSE_APPLICATIONS,
  INITIAL_DUTY_ROSTERS,
  INITIAL_EVENTS,
  INITIAL_MATERIAL_CATEGORIES,
  INITIAL_MATERIALS,
  INITIAL_MATERIAL_TRANSACTIONS,
  INITIAL_MATERIAL_REQUISITIONS,
  INITIAL_CMS,
  INITIAL_PDPA_LOGS,
} from './initialData';

const STORAGE_KEYS = {
  DIVISIONS: 'angkaeo_divisions_v1',
  VILLAGES: 'angkaeo_villages_v1',
  USERS: 'angkaeo_users_v1',
  DOCUMENTS: 'angkaeo_documents_v1',
  REPAIRS: 'angkaeo_repairs_v1',
  LICENSE_TYPES: 'angkaeo_license_types_v1',
  LICENSE_APPS: 'angkaeo_license_apps_v1',
  DUTY_ROSTERS: 'angkaeo_duty_rosters_v1',
  EVENTS: 'angkaeo_events_v1',
  MATERIAL_CATS: 'angkaeo_material_cats_v1',
  MATERIALS: 'angkaeo_materials_v1',
  MATERIAL_TXS: 'angkaeo_material_txs_v1',
  REQUISITIONS: 'angkaeo_requisitions_v1',
  CMS: 'angkaeo_cms_v1',
  PDPA_LOGS: 'angkaeo_pdpa_logs_v1',
};

// Simple event dispatcher for real-time reactivity inside the React tree
type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Listener notify error', e);
    }
  });
}

export function subscribeStorage(callback: Listener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getStoredItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (e) {
    console.error(`Failed to parse storage key ${key}`, e);
    return defaultValue;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyListeners();
  } catch (e: any) {
    console.error(`Failed to write storage key ${key}`, e);
    // If quota exceeded due to large attachments or logs, sanitize large dataUrl to save successfully
    if (e?.name === 'QuotaExceededError' || e?.message?.includes('quota') || e?.code === 22) {
      try {
        if (key === STORAGE_KEYS.DOCUMENTS && Array.isArray(value)) {
          const sanitizedDocs = (value as any[]).map((doc) => ({
            ...doc,
            attachments: (doc.attachments || []).map((att: any) => ({
              ...att,
              // Strip overly large base64 strings if storage is completely full
              dataUrl: att.dataUrl && att.dataUrl.length > 50000 ? '' : att.dataUrl,
            })),
          }));
          localStorage.setItem(key, JSON.stringify(sanitizedDocs));
          notifyListeners();
          return;
        }
      } catch (inner) {
        console.error('Fallback sanitize write failed:', inner);
      }
    }
  }
}

// ----------------- PDPA Logging -----------------
export function logPdpaAction(
  actorName: string,
  actorRole: string,
  action: PdpaAccessLog['action'],
  targetResource: string,
  targetId: string,
  details: string
) {
  const current = getStoredItem<PdpaAccessLog[]>(STORAGE_KEYS.PDPA_LOGS, INITIAL_PDPA_LOGS);
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const newLog: PdpaAccessLog = {
    id: `pdpa-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp,
    actorName,
    actorRole,
    action,
    targetResource,
    targetId,
    details,
  };
  setStoredItem(STORAGE_KEYS.PDPA_LOGS, [newLog, ...current]);
}

export function getPdpaLogs(): PdpaAccessLog[] {
  return getStoredItem<PdpaAccessLog[]>(STORAGE_KEYS.PDPA_LOGS, INITIAL_PDPA_LOGS);
}

// ----------------- Divisions -----------------
export function getDivisions(): Division[] {
  return getStoredItem<Division[]>(STORAGE_KEYS.DIVISIONS, INITIAL_DIVISIONS);
}

export function addDivision(name: string, code: string, directorName?: string, shortCode?: string): Division {
  const divisions = getDivisions();
  const newDiv: Division = {
    id: `div-${Date.now()}`,
    name,
    code,
    shortCode: shortCode || code.slice(0, 2),
    directorName,
    isDefault: false,
  };
  setStoredItem(STORAGE_KEYS.DIVISIONS, [...divisions, newDiv]);
  return newDiv;
}

// ----------------- Villages (หมู่บ้านในตำบลอ่างแก้ว) -----------------
export function getVillages(): Village[] {
  return getStoredItem<Village[]>(STORAGE_KEYS.VILLAGES, INITIAL_VILLAGES);
}

export function saveVillage(village: Village): void {
  const villages = getVillages();
  const idx = villages.findIndex((v) => v.id === village.id);
  if (idx >= 0) {
    villages[idx] = village;
  } else {
    villages.push(village);
  }
  villages.sort((a, b) => a.no - b.no);
  setStoredItem(STORAGE_KEYS.VILLAGES, villages);
}

export function addVillage(no: number, name: string, description?: string, lat?: number, lng?: number): Village {
  const villages = getVillages();
  const newVil: Village = {
    id: `vil-${Date.now()}`,
    no,
    name,
    description: description || `หมู่ที่ ${no} ตำบลอ่างแก้ว`,
    lat: lat ?? parseFloat((14.6852 + (Math.random() - 0.5) * 0.015).toFixed(4)),
    lng: lng ?? parseFloat((100.3521 + (Math.random() - 0.5) * 0.015).toFixed(4)),
  };
  saveVillage(newVil);
  return newVil;
}

export function deleteVillage(villageId: string): void {
  const villages = getVillages().filter((v) => v.id !== villageId);
  setStoredItem(STORAGE_KEYS.VILLAGES, villages);
}

export function resetVillagesToDefault(): void {
  setStoredItem(STORAGE_KEYS.VILLAGES, INITIAL_VILLAGES);
}

// ----------------- Users -----------------
export function getUsers(): User[] {
  return getStoredItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
}

export function saveUser(user: User): void {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = { ...user, updatedAt: new Date().toISOString().split('T')[0] };
  } else {
    users.push(user);
  }
  setStoredItem(STORAGE_KEYS.USERS, users);
}

export function deleteUser(userId: string): void {
  const users = getUsers().filter((u) => u.id !== userId);
  setStoredItem(STORAGE_KEYS.USERS, users);
}

export function toggleUserStatus(userId: string): void {
  const users = getUsers().map((u) => {
    if (u.id === userId) {
      return { ...u, isActive: !u.isActive };
    }
    return u;
  });
  setStoredItem(STORAGE_KEYS.USERS, users);
}

// ----------------- CMS -----------------
export function getCmsSettings(): CmsSettings {
  const stored = getStoredItem<CmsSettings>(STORAGE_KEYS.CMS, INITIAL_CMS);
  return {
    ...INITIAL_CMS,
    ...stored,
    currentFiscalYear: stored.currentFiscalYear || '2570',
  };
}

export function getCurrentFiscalYear(): string {
  const cms = getCmsSettings();
  if (cms.currentFiscalYear && cms.currentFiscalYear.trim()) {
    return cms.currentFiscalYear.trim();
  }
  const now = new Date();
  const beYear = now.getFullYear() + 543;
  return String(now.getMonth() >= 9 ? beYear + 1 : beYear);
}

export function saveCmsSettings(settings: CmsSettings): void {
  setStoredItem(STORAGE_KEYS.CMS, settings);
}

// ----------------- E-Documents -----------------
export function getDocuments(): EDocument[] {
  return getStoredItem<EDocument[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
}

export function getNextReceiptNo(fiscalYear: string): string {
  const docs = getDocuments().filter((d) => d.fiscalYear === fiscalYear);
  let maxSeq = 0;
  for (const d of docs) {
    const parts = d.receiptNo.split('/');
    if (parts.length > 0) {
      const num = parseInt(parts[0], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  const nextSeq = maxSeq + 1;
  return `${String(nextSeq).padStart(4, '0')}/${fiscalYear}`;
}

export function getNextDivisionReceiptNo(divisionId: string, fiscalYear: string): string {
  const docs = getDocuments().filter(
    (d) => d.dispatchedToDivisionId === divisionId && d.fiscalYear === fiscalYear && d.divisionReceiptNo
  );
  let maxSeq = 0;
  for (const d of docs) {
    if (!d.divisionReceiptNo) continue;
    // Extract numeric portion e.g. "0001/2570", "001", "กค 0002/2570"
    const match = d.divisionReceiptNo.match(/\b(\d+)(?:\/\d+)?$/) || d.divisionReceiptNo.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  const nextSeq = maxSeq + 1;
  return `${String(nextSeq).padStart(4, '0')}/${fiscalYear}`;
}

export function createDocument(doc: Omit<EDocument, 'id' | 'timeline' | 'auditLogs' | 'status'>): EDocument {
  const docs = getDocuments();
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const initialTimeline: DocTrackingEvent[] = [
    {
      id: `tl-${Date.now()}-1`,
      timestamp: timeStr,
      step: 'ลงทะเบียนรับ',
      actionBy: doc.registeredBy,
      roleName: 'สารบรรณกลาง (สำนักปลัด)',
      note: `ลงทะเบียนรับเลขที่ ${doc.receiptNo} ในระบบสารบรรณกลาง`,
    },
  ];

  let status: EDocument['status'] = 'registered';
  if (doc.dispatchedToDivisionId && doc.dispatchedToDivisionName) {
    status = 'dispatched';
    initialTimeline.push({
      id: `tl-${Date.now()}-2`,
      timestamp: timeStr,
      step: 'จ่ายหนังสือ',
      actionBy: doc.registeredBy,
      roleName: 'สารบรรณกลาง (สำนักปลัด)',
      toDivision: doc.dispatchedToDivisionName,
      note: `จ่ายหนังสือไปยัง ${doc.dispatchedToDivisionName}`,
    });
  }

  const newDoc: EDocument = {
    ...doc,
    id: `doc-${Date.now()}`,
    status,
    timeline: initialTimeline,
    auditLogs: [],
  };

  setStoredItem(STORAGE_KEYS.DOCUMENTS, [newDoc, ...docs]);
  return newDoc;
}

export function dispatchDocument(docId: string, divisionId: string, divisionName: string, actorName: string): void {
  const docs = getDocuments();
  const idx = docs.findIndex((d) => d.id === docId);
  if (idx === -1) return;

  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newEvent: DocTrackingEvent = {
    id: `tl-${Date.now()}`,
    timestamp: timeStr,
    step: 'จ่ายหนังสือ',
    actionBy: actorName,
    roleName: 'สารบรรณกลาง (สำนักปลัด)',
    toDivision: divisionName,
    note: `จ่ายหนังสือส่งต่อไปยัง ${divisionName}`,
  };

  docs[idx] = {
    ...docs[idx],
    dispatchedToDivisionId: divisionId,
    dispatchedToDivisionName: divisionName,
    status: 'dispatched',
    timeline: [...docs[idx].timeline, newEvent],
  };

  setStoredItem(STORAGE_KEYS.DOCUMENTS, docs);
}

export function acknowledgeDocument(
  docId: string,
  actorName: string,
  roleName: string,
  customDivisionReceiptNo?: string
): void {
  const docs = getDocuments();
  const idx = docs.findIndex((d) => d.id === docId);
  if (idx === -1) return;

  const doc = docs[idx];
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const divReceiptNo =
    customDivisionReceiptNo?.trim() ||
    getNextDivisionReceiptNo(doc.dispatchedToDivisionId || '', doc.fiscalYear || '2570');

  const newEvent: DocTrackingEvent = {
    id: `tl-${Date.now()}`,
    timestamp: timeStr,
    step: 'กองรับเอกสาร',
    actionBy: actorName,
    roleName: roleName,
    note: `${doc.dispatchedToDivisionName || 'สารบรรณกอง'} กดรับเอกสารเรียบร้อยแล้ว (เลขรับกอง: ${divReceiptNo})`,
  };

  docs[idx] = {
    ...doc,
    status: 'acknowledged',
    divisionReceiptNo: divReceiptNo,
    divisionReceivedDate: timeStr,
    acknowledgedBy: `${actorName} (${roleName})`,
    acknowledgedAt: timeStr,
    timeline: [...doc.timeline, newEvent],
  };

  setStoredItem(STORAGE_KEYS.DOCUMENTS, docs);
}

export function addAttachmentToDocument(
  docId: string,
  attachment: DocAttachment,
  actorName: string
): void {
  const docs = getDocuments();
  const idx = docs.findIndex((d) => d.id === docId);
  if (idx === -1) return;

  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const existingAttachments = docs[idx].attachments || [];

  const newEvent: DocTrackingEvent = {
    id: `tl-${Date.now()}`,
    timestamp: timeStr,
    step: 'แนบเอกสารเพิ่มเติม',
    actionBy: actorName,
    roleName: 'เจ้าหน้าที่ผู้แนบไฟล์',
    note: `แนบเอกสารเพิ่มเติม: ${attachment.name} (${attachment.fileSize})`,
  };

  docs[idx] = {
    ...docs[idx],
    attachments: [...existingAttachments, attachment],
    timeline: [...(docs[idx].timeline || []), newEvent],
  };
  setStoredItem(STORAGE_KEYS.DOCUMENTS, docs);
}

export function removeAttachmentFromDocument(
  docId: string,
  attachmentId: string
): void {
  const docs = getDocuments();
  const idx = docs.findIndex((d) => d.id === docId);
  if (idx === -1) return;

  const existingAttachments = docs[idx].attachments || [];
  docs[idx] = {
    ...docs[idx],
    attachments: existingAttachments.filter((a) => a.id !== attachmentId),
  };
  setStoredItem(STORAGE_KEYS.DOCUMENTS, docs);
}

// Special condition: Admin or central saraban with special right can edit receiptNo with Audit Log!
export function editDocumentReceiptNo(
  docId: string,
  newReceiptNo: string,
  reason: string,
  actorName: string
): void {
  const docs = getDocuments();
  const idx = docs.findIndex((d) => d.id === docId);
  if (idx === -1) return;

  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const auditLog: SarabanReceiptAuditLog = {
    id: `audit-${Date.now()}`,
    docId,
    oldReceiptNo: docs[idx].receiptNo,
    newReceiptNo,
    changedBy: actorName,
    changedAt: timeStr,
    reason: reason || 'แก้ไขเลขที่รับย้อนหลัง/ปรับปรุงข้อผิดพลาดการคีย์ข้อมูล',
  };

  docs[idx] = {
    ...docs[idx],
    receiptNo: newReceiptNo,
    auditLogs: [...(docs[idx].auditLogs || []), auditLog],
  };

  setStoredItem(STORAGE_KEYS.DOCUMENTS, docs);
}

export function updateDocument(doc: EDocument): void {
  const docs = getDocuments();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx !== -1) {
    docs[idx] = doc;
    setStoredItem(STORAGE_KEYS.DOCUMENTS, docs);
  }
}

export function deleteDocument(docId: string, actorName: string = 'เจ้าหน้าที่'): boolean {
  const docs = getDocuments();
  const targetDoc = docs.find((d) => d.id === docId);
  if (!targetDoc) return false;

  const remaining = docs.filter((d) => d.id !== docId);
  setStoredItem(STORAGE_KEYS.DOCUMENTS, remaining);

  logPdpaAction(
    actorName,
    'central_saraban',
    'delete',
    'edocument',
    docId,
    `ลบหนังสือราชการออกจากระบบ: เลขที่รับ ${targetDoc.receiptNo} (${targetDoc.subject})`
  );

  return true;
}

// ----------------- Repairs -----------------
export function getRepairs(): RepairItem[] {
  return getStoredItem<RepairItem[]>(STORAGE_KEYS.REPAIRS, INITIAL_REPAIRS);
}

export function createRepair(repair: Omit<RepairItem, 'id' | 'ticketId' | 'status' | 'createdAt'>): RepairItem {
  const repairs = getRepairs();
  const now = new Date();
  const fiscalYear = getCurrentFiscalYear();
  const ticketSeq = String(repairs.length + 1).padStart(4, '0');
  const ticketId = `REP-${fiscalYear}-${ticketSeq}`;
  const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newRepair: RepairItem = {
    ...repair,
    id: `rep-${Date.now()}`,
    ticketId,
    status: 'pending',
    createdAt,
  };

  setStoredItem(STORAGE_KEYS.REPAIRS, [newRepair, ...repairs]);
  return newRepair;
}

export function updateRepairStatus(
  id: string,
  status: RepairItem['status'],
  assignedTechnician?: string,
  completionNotes?: string,
  completionPhotos?: string[]
): void {
  const repairs = getRepairs();
  const idx = repairs.findIndex((r) => r.id === id);
  if (idx === -1) return;

  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let durationHours = repairs[idx].durationHours;
  if (status === 'completed' && !repairs[idx].repairedAt) {
    // calculate rough hours since createdAt
    const createdDate = new Date(repairs[idx].createdAt.replace(' ', 'T'));
    const diffMs = Math.max(1, now.getTime() - (isNaN(createdDate.getTime()) ? Date.now() - 3600000 * 24 : createdDate.getTime()));
    durationHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1));
  }

  repairs[idx] = {
    ...repairs[idx],
    status,
    assignedTechnician: assignedTechnician ?? repairs[idx].assignedTechnician,
    completionNotes: completionNotes ?? repairs[idx].completionNotes,
    completionPhotos: completionPhotos ?? repairs[idx].completionPhotos,
    repairedAt: status === 'completed' ? timeStr : repairs[idx].repairedAt,
    durationHours,
  };

  setStoredItem(STORAGE_KEYS.REPAIRS, repairs);
}

// ----------------- License Types & Applications -----------------
export function getLicenseTypes(): LicenseTypeConfig[] {
  const stored = getStoredItem<LicenseTypeConfig[]>(STORAGE_KEYS.LICENSE_TYPES, INITIAL_LICENSE_TYPES);
  const missing = INITIAL_LICENSE_TYPES.filter((init) => !stored.some((s) => s.id === init.id));
  // If health license options are outdated, update it
  let updated = false;
  const list = stored.map((item) => {
    const initMatch = INITIAL_LICENSE_TYPES.find((init) => init.id === item.id);
    if (initMatch && item.id === 'lic-health') {
      const initCatField = initMatch.customFields.find((f) => f.id === 'f_biz_category');
      const itemCatField = item.customFields.find((f) => f.id === 'f_biz_category');
      if (initCatField && (!itemCatField || (initCatField.options?.length || 0) > (itemCatField.options?.length || 0))) {
        updated = true;
        return { ...item, customFields: initMatch.customFields };
      }
    }
    return item;
  });

  if (missing.length > 0 || updated) {
    const result = [...list, ...missing];
    setStoredItem(STORAGE_KEYS.LICENSE_TYPES, result);
    return result;
  }
  return stored;
}

export function saveLicenseType(config: LicenseTypeConfig): void {
  const types = getLicenseTypes();
  const idx = types.findIndex((t) => t.id === config.id);
  if (idx >= 0) {
    types[idx] = config;
  } else {
    types.push(config);
  }
  setStoredItem(STORAGE_KEYS.LICENSE_TYPES, types);
}

export function getLicenseApplications(): LicenseApplication[] {
  return getStoredItem<LicenseApplication[]>(STORAGE_KEYS.LICENSE_APPS, INITIAL_LICENSE_APPLICATIONS);
}

export function createLicenseApplication(
  app: Omit<LicenseApplication, 'id' | 'applicationNo' | 'status' | 'submittedAt'>
): LicenseApplication {
  const apps = getLicenseApplications();
  const now = new Date();
  const fiscalYear = getCurrentFiscalYear();
  const appSeq = String(apps.length + 1).padStart(3, '0');
  const applicationNo = `LIC-${fiscalYear}-${appSeq}`;
  const submittedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newApp: LicenseApplication = {
    ...app,
    id: `app-${Date.now()}`,
    applicationNo,
    status: 'submitted',
    submittedAt,
  };

  setStoredItem(STORAGE_KEYS.LICENSE_APPS, [newApp, ...apps]);
  return newApp;
}

export function reviewLicenseStep1(appId: string, reviewerName: string, approved: boolean, comment: string): void {
  const apps = getLicenseApplications();
  const idx = apps.findIndex((a) => a.id === appId);
  if (idx === -1) return;

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  apps[idx] = {
    ...apps[idx],
    status: approved ? 'step1_approved' : 'step1_rejected',
    step1Review: {
      reviewerName,
      approved,
      comment,
      timestamp,
    },
  };

  setStoredItem(STORAGE_KEYS.LICENSE_APPS, apps);
}

export function approveLicenseStep2(
  appId: string,
  approverName: string,
  approved: boolean,
  comment: string,
  licenseCertNo?: string
): void {
  const apps = getLicenseApplications();
  const idx = apps.findIndex((a) => a.id === appId);
  if (idx === -1) return;

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const issuedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  apps[idx] = {
    ...apps[idx],
    status: approved ? 'step2_approved' : 'step2_rejected',
    step2Approval: {
      approverName,
      approved,
      comment,
      timestamp,
      licenseCertNo: licenseCertNo || `อบต.อก-${Date.now().toString().slice(-4)}/${getCurrentFiscalYear()}`,
      issuedDate,
    },
  };

  setStoredItem(STORAGE_KEYS.LICENSE_APPS, apps);
}

// ----------------- Calendar & Duty Rosters -----------------
export function getDutyRosters(): DutyRosterEntry[] {
  return getStoredItem<DutyRosterEntry[]>(STORAGE_KEYS.DUTY_ROSTERS, INITIAL_DUTY_ROSTERS);
}

export function saveDutyRoster(entry: DutyRosterEntry): void {
  const rosters = getDutyRosters();
  const idx = rosters.findIndex((r) => r.id === entry.id);
  if (idx >= 0) {
    rosters[idx] = entry;
  } else {
    rosters.push(entry);
  }
  setStoredItem(STORAGE_KEYS.DUTY_ROSTERS, rosters);
}

export function deleteDutyRoster(id: string): void {
  const rosters = getDutyRosters().filter((r) => r.id !== id);
  setStoredItem(STORAGE_KEYS.DUTY_ROSTERS, rosters);
}

export function getEvents(): OrganizationEvent[] {
  return getStoredItem<OrganizationEvent[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
}

export function saveEvent(event: OrganizationEvent): void {
  const events = getEvents();
  const idx = events.findIndex((e) => e.id === event.id);
  if (idx >= 0) {
    events[idx] = event;
  } else {
    events.unshift(event);
  }
  setStoredItem(STORAGE_KEYS.EVENTS, events);
}

export function deleteEvent(id: string): void {
  const events = getEvents().filter((e) => e.id !== id);
  setStoredItem(STORAGE_KEYS.EVENTS, events);
}

// ----------------- Inventory / Materials (พ.ด.4) -----------------
export function getMaterialCategories(): MaterialCategory[] {
  const stored = getStoredItem<MaterialCategory[]>(STORAGE_KEYS.MATERIAL_CATS, INITIAL_MATERIAL_CATEGORIES);
  const missing = INITIAL_MATERIAL_CATEGORIES.filter((c) => !stored.some((s) => s.name === c.name));
  if (missing.length > 0) {
    const merged = [...stored, ...missing];
    setStoredItem(STORAGE_KEYS.MATERIAL_CATS, merged);
    return merged;
  }
  return stored;
}

export function addMaterialCategory(name: string): MaterialCategory {
  const trimmed = name.trim();
  const cats = getMaterialCategories();
  const existing = cats.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    return existing;
  }
  const newCat: MaterialCategory = {
    id: `cat-${Date.now()}`,
    name: trimmed,
  };
  setStoredItem(STORAGE_KEYS.MATERIAL_CATS, [...cats, newCat]);
  return newCat;
}

export function getMaterials(): MaterialItem[] {
  return getStoredItem<MaterialItem[]>(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);
}

export function saveMaterial(item: MaterialItem): void {
  const materials = getMaterials();
  const idx = materials.findIndex((m) => m.id === item.id);
  if (idx >= 0) {
    materials[idx] = item;
  } else {
    materials.push(item);
  }
  setStoredItem(STORAGE_KEYS.MATERIALS, materials);
}

export function deleteMaterial(materialId: string): void {
  const materials = getMaterials().filter((m) => m.id !== materialId);
  setStoredItem(STORAGE_KEYS.MATERIALS, materials);
}

export function deleteMaterialCategory(categoryId: string): void {
  const cats = getMaterialCategories().filter((c) => c.id !== categoryId);
  setStoredItem(STORAGE_KEYS.MATERIAL_CATS, cats);
}

export function getMaterialTransactions(): MaterialTransaction[] {
  return getStoredItem<MaterialTransaction[]>(STORAGE_KEYS.MATERIAL_TXS, INITIAL_MATERIAL_TRANSACTIONS);
}

export function createMaterialTransaction(
  tx: Omit<MaterialTransaction, 'id' | 'balanceQuantity'>,
  autoApprove: boolean = false
): MaterialTransaction {
  const txs = getMaterialTransactions();
  const materials = getMaterials();
  const matIdx = materials.findIndex((m) => m.id === tx.materialId);

  let currentStock = matIdx >= 0 ? materials[matIdx].currentStock : 0;
  let newBalance = currentStock;

  if (autoApprove || tx.status === 'approved') {
    if (tx.transactionType === 'in') {
      newBalance = currentStock + tx.quantity;
    } else {
      newBalance = Math.max(0, currentStock - tx.quantity);
    }

    if (matIdx >= 0) {
      materials[matIdx].currentStock = newBalance;
      setStoredItem(STORAGE_KEYS.MATERIALS, materials);
    }
  }

  const newTx: MaterialTransaction = {
    ...tx,
    id: `tx-${Date.now()}`,
    balanceQuantity: newBalance,
    status: autoApprove ? 'approved' : tx.status,
  };

  setStoredItem(STORAGE_KEYS.MATERIAL_TXS, [newTx, ...txs]);
  return newTx;
}

export function approveMaterialTransaction(txId: string, approvedBy: string): void {
  const txs = getMaterialTransactions();
  const idx = txs.findIndex((t) => t.id === txId);
  if (idx === -1) return;

  const tx = txs[idx];
  if (tx.status === 'approved') return;

  const materials = getMaterials();
  const matIdx = materials.findIndex((m) => m.id === tx.materialId);
  let newBalance = matIdx >= 0 ? materials[matIdx].currentStock : 0;

  if (tx.transactionType === 'in') {
    newBalance += tx.quantity;
  } else {
    newBalance = Math.max(0, newBalance - tx.quantity);
  }

  if (matIdx >= 0) {
    materials[matIdx].currentStock = newBalance;
    setStoredItem(STORAGE_KEYS.MATERIALS, materials);
  }

  txs[idx] = {
    ...tx,
    status: 'approved',
    approvedBy,
    balanceQuantity: newBalance,
  };

  setStoredItem(STORAGE_KEYS.MATERIAL_TXS, txs);
}

// ----------------- ใบเบิกวัสดุ (Material Requisitions) -----------------
export function getMaterialRequisitions(): MaterialRequisition[] {
  return getStoredItem<MaterialRequisition[]>(STORAGE_KEYS.REQUISITIONS, INITIAL_MATERIAL_REQUISITIONS);
}

export function saveMaterialRequisition(req: MaterialRequisition): void {
  const reqs = getMaterialRequisitions();
  const idx = reqs.findIndex((r) => r.id === req.id);
  if (idx >= 0) {
    reqs[idx] = req;
  } else {
    reqs.unshift(req);
  }
  setStoredItem(STORAGE_KEYS.REQUISITIONS, reqs);
}

export function generateRequisitionNo(divisionShortCode: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const period = `${yyyy}${mm}`;
  const prefix = `${divisionShortCode}-${period}-`;

  const reqs = getMaterialRequisitions();
  const matching = reqs.filter((r) => r.reqNo && r.reqNo.startsWith(prefix));

  let maxSeq = 0;
  matching.forEach((r) => {
    const parts = r.reqNo.split('-');
    if (parts.length >= 3) {
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${nextSeq}`;
}

export function createMaterialRequisition(
  data: Omit<MaterialRequisition, 'id' | 'reqNo' | 'status' | 'createdAt' | 'updatedAt'>
): MaterialRequisition {
  const reqNo = generateRequisitionNo(data.divisionShortCode);
  const now = new Date().toISOString();
  const newReq: MaterialRequisition = {
    ...data,
    id: `req-${Date.now()}`,
    reqNo,
    status: 'pending_approver',
    createdAt: now,
    updatedAt: now,
  };

  const reqs = getMaterialRequisitions();
  setStoredItem(STORAGE_KEYS.REQUISITIONS, [newReq, ...reqs]);
  return newReq;
}

export function approveRequisitionByDirector(
  reqId: string,
  approverId: string,
  approverName: string,
  comment?: string
): void {
  const reqs = getMaterialRequisitions();
  const idx = reqs.findIndex((r) => r.id === reqId);
  if (idx === -1) return;

  const req = reqs[idx];
  if (req.status === 'completed') return;

  const thaiTime = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  // เมื่อมีคำขอ ส่งให้ ผอ.อนุมัติ แล้วระบบทำการตัดยอดทันที
  const materials = getMaterials();
  const txs = getMaterialTransactions();
  const todayStr = new Date().toISOString().split('T')[0];

  req.items.forEach((item) => {
    const matIdx = materials.findIndex((m) => m.id === item.materialId);
    let newBal = 0;
    if (matIdx >= 0) {
      newBal = Math.max(0, materials[matIdx].currentStock - item.quantity);
      materials[matIdx].currentStock = newBal;
    }

    // บันทึกรายการตัดยอดจ่ายออกลงสมุดบัญชีพัสดุ พ.ด.๔
    const newTx: MaterialTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      docNo: req.reqNo,
      materialId: item.materialId,
      materialName: item.materialName,
      divisionId: req.divisionId,
      transactionType: 'out',
      partyName: `${req.requesterName} (${req.requesterPosition})`,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      balanceQuantity: newBal,
      transactionDate: todayStr,
      fiscalYear: req.fiscalYear,
      approvedBy: `${approverName} (ผอ.กอง)`,
      status: 'approved',
      note: req.purpose,
    };
    txs.push(newTx);
  });

  setStoredItem(STORAGE_KEYS.MATERIALS, materials);
  setStoredItem(STORAGE_KEYS.MATERIAL_TXS, txs);

  reqs[idx] = {
    ...req,
    status: 'completed',
    approverId,
    approverName,
    approvedAt: thaiTime,
    approverComment: comment || 'ผู้อำนวยการกองอนุมัติการเบิก และระบบทำการตัดยอดสต็อกพัสดุเรียบร้อยแล้ว',
    dispenserName: 'ระบบตัดยอดสต็อกอัตโนมัติ (ผอ.อนุมัติ)',
    dispensedAt: thaiTime,
    updatedAt: new Date().toISOString(),
  };
  setStoredItem(STORAGE_KEYS.REQUISITIONS, reqs);
}

export function dispenseRequisitionByStockOfficer(
  reqId: string,
  dispenserId: string,
  dispenserName: string,
  comment?: string
): void {
  const reqs = getMaterialRequisitions();
  const idx = reqs.findIndex((r) => r.id === reqId);
  if (idx === -1) return;

  const req = reqs[idx];
  if (req.status === 'completed') return;

  const thaiTime = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  // ตัดสต็อกคลังของกองนั้นทันที
  const materials = getMaterials();
  const txs = getMaterialTransactions();
  const todayStr = new Date().toISOString().split('T')[0];

  req.items.forEach((item) => {
    const matIdx = materials.findIndex((m) => m.id === item.materialId);
    let newBal = 0;
    if (matIdx >= 0) {
      newBal = Math.max(0, materials[matIdx].currentStock - item.quantity);
      materials[matIdx].currentStock = newBal;
    }

    // บันทึกทะเบียนประวัติการจ่ายออก
    const newTx: MaterialTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      docNo: req.reqNo,
      materialId: item.materialId,
      materialName: item.materialName,
      divisionId: req.divisionId,
      transactionType: 'out',
      partyName: `${req.requesterName} (${req.requesterPosition})`,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      balanceQuantity: newBal,
      transactionDate: todayStr,
      fiscalYear: req.fiscalYear,
      approvedBy: `${req.approverName || 'หัวหน้ากอง'} / ผู้จ่าย: ${dispenserName}`,
      status: 'approved',
      note: req.purpose,
    };
    txs.unshift(newTx);
  });

  setStoredItem(STORAGE_KEYS.MATERIALS, materials);
  setStoredItem(STORAGE_KEYS.MATERIAL_TXS, txs);

  reqs[idx] = {
    ...req,
    status: 'completed',
    dispenserId,
    dispenserName,
    dispensedAt: thaiTime,
    dispenserComment: comment || 'ตรวจสอบและตัดยอดสต็อกพัสดุเรียบร้อยแล้ว',
    updatedAt: new Date().toISOString(),
  };
  setStoredItem(STORAGE_KEYS.REQUISITIONS, reqs);
}

export function rejectRequisition(
  reqId: string,
  rejectedBy: string,
  reason: string
): void {
  const reqs = getMaterialRequisitions();
  const idx = reqs.findIndex((r) => r.id === reqId);
  if (idx === -1) return;

  const thaiTime = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  reqs[idx] = {
    ...reqs[idx],
    status: 'rejected',
    rejectedBy,
    rejectedAt: thaiTime,
    rejectReason: reason || 'ไม่อนุมัติ',
    updatedAt: new Date().toISOString(),
  };
  setStoredItem(STORAGE_KEYS.REQUISITIONS, reqs);
}

export function updateMaterialRequisition(
  reqId: string,
  updates: Partial<MaterialRequisition>
): void {
  const reqs = getMaterialRequisitions();
  const idx = reqs.findIndex((r) => r.id === reqId);
  if (idx === -1) return;

  reqs[idx] = {
    ...reqs[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  setStoredItem(STORAGE_KEYS.REQUISITIONS, reqs);
}

export function cancelOrRevertMaterialRequisition(
  reqId: string,
  cancelledBy: string,
  reason: string
): void {
  const reqs = getMaterialRequisitions();
  const idx = reqs.findIndex((r) => r.id === reqId);
  if (idx === -1) return;

  const req = reqs[idx];
  const thaiTime = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  // หากคำขอนี้เคยได้รับการอนุมัติและตัดสต็อกไปแล้ว (completed) -> คืนยอดสต็อกกลับเข้าคลัง และปรับสมุดบัญชี พ.ด.๔
  if (req.status === 'completed') {
    const materials = getMaterials();
    const txs = getMaterialTransactions();

    req.items.forEach((item) => {
      const matIdx = materials.findIndex((m) => m.id === item.materialId);
      if (matIdx >= 0) {
        materials[matIdx].currentStock += item.quantity;
      }
    });

    // ลบรายการจ่ายออกที่ผูกกับเลขที่ใบเบิกนี้ออกจากบัญชีธุรกรรม
    const remainingTxs = txs.filter((t) => t.docNo !== req.reqNo);

    setStoredItem(STORAGE_KEYS.MATERIALS, materials);
    setStoredItem(STORAGE_KEYS.MATERIAL_TXS, remainingTxs);
  }

  reqs[idx] = {
    ...req,
    status: 'cancelled',
    cancelledBy,
    cancelledAt: thaiTime,
    cancelReason: reason || 'ยกเลิกเนื่องจากเบิกผิดพลาด',
    updatedAt: new Date().toISOString(),
  };
  setStoredItem(STORAGE_KEYS.REQUISITIONS, reqs);
}

// ----------------- Backup / Reset Database -----------------
export function exportEntireDatabaseJson(): string {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    divisions: getDivisions(),
    villages: getVillages(),
    users: getUsers(),
    documents: getDocuments(),
    repairs: getRepairs(),
    licenseTypes: getLicenseTypes(),
    licenseApps: getLicenseApplications(),
    dutyRosters: getDutyRosters(),
    events: getEvents(),
    materialCategories: getMaterialCategories(),
    materials: getMaterials(),
    materialTransactions: getMaterialTransactions(),
    requisitions: getMaterialRequisitions(),
    cms: getCmsSettings(),
    pdpaLogs: getPdpaLogs(),
  };
  return JSON.stringify(data, null, 2);
}

export function importEntireDatabaseJson(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.divisions) setStoredItem(STORAGE_KEYS.DIVISIONS, data.divisions);
    if (data.villages) setStoredItem(STORAGE_KEYS.VILLAGES, data.villages);
    if (data.users) setStoredItem(STORAGE_KEYS.USERS, data.users);
    if (data.documents) setStoredItem(STORAGE_KEYS.DOCUMENTS, data.documents);
    if (data.repairs) setStoredItem(STORAGE_KEYS.REPAIRS, data.repairs);
    if (data.licenseTypes) setStoredItem(STORAGE_KEYS.LICENSE_TYPES, data.licenseTypes);
    if (data.licenseApps) setStoredItem(STORAGE_KEYS.LICENSE_APPS, data.licenseApps);
    if (data.dutyRosters) setStoredItem(STORAGE_KEYS.DUTY_ROSTERS, data.dutyRosters);
    if (data.events) setStoredItem(STORAGE_KEYS.EVENTS, data.events);
    if (data.materialCategories) setStoredItem(STORAGE_KEYS.MATERIAL_CATS, data.materialCategories);
    if (data.materials) setStoredItem(STORAGE_KEYS.MATERIALS, data.materials);
    if (data.materialTransactions) setStoredItem(STORAGE_KEYS.MATERIAL_TXS, data.materialTransactions);
    if (data.requisitions) setStoredItem(STORAGE_KEYS.REQUISITIONS, data.requisitions);
    if (data.cms) setStoredItem(STORAGE_KEYS.CMS, data.cms);
    if (data.pdpaLogs) setStoredItem(STORAGE_KEYS.PDPA_LOGS, data.pdpaLogs);
    return true;
  } catch (e) {
    console.error('Import error', e);
    return false;
  }
}

export function resetDatabaseToDefault(): void {
  localStorage.removeItem(STORAGE_KEYS.DIVISIONS);
  localStorage.removeItem(STORAGE_KEYS.VILLAGES);
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
  localStorage.removeItem(STORAGE_KEYS.REPAIRS);
  localStorage.removeItem(STORAGE_KEYS.LICENSE_TYPES);
  localStorage.removeItem(STORAGE_KEYS.LICENSE_APPS);
  localStorage.removeItem(STORAGE_KEYS.DUTY_ROSTERS);
  localStorage.removeItem(STORAGE_KEYS.EVENTS);
  localStorage.removeItem(STORAGE_KEYS.MATERIAL_CATS);
  localStorage.removeItem(STORAGE_KEYS.MATERIALS);
  localStorage.removeItem(STORAGE_KEYS.MATERIAL_TXS);
  localStorage.removeItem(STORAGE_KEYS.REQUISITIONS);
  localStorage.removeItem(STORAGE_KEYS.CMS);
  localStorage.removeItem(STORAGE_KEYS.PDPA_LOGS);
  notifyListeners();
}
