import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration keys for local storage fallback
const STORAGE_KEY_URL = 'angkaeo_supabase_url';
const STORAGE_KEY_KEY = 'angkaeo_supabase_key';

export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  
  if (envUrl && envKey) {
    return { url: envUrl.trim(), key: envKey.trim() };
  }

  // Fallback to in-app stored settings
  const localUrl = localStorage.getItem(STORAGE_KEY_URL) || '';
  const localKey = localStorage.getItem(STORAGE_KEY_KEY) || '';
  return { url: localUrl.trim(), key: localKey.trim() };
}

export function saveSupabaseCredentials(url: string, key: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, key.trim());
}

export function clearSupabaseCredentials(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  if (!clientInstance) {
    try {
      clientInstance = createClient(url, key);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return clientInstance;
}

export async function testSupabaseConnection(testUrl: string, testKey: string): Promise<{
  success: boolean;
  message: string;
  tablesFound?: boolean;
}> {
  if (!testUrl || !testKey) {
    return { success: false, message: 'กรุณากรอกทั้ง Project URL และ anon API Key ให้ครบถ้วน' };
  }

  // Basic format check
  if (!testUrl.startsWith('https://') || !testUrl.includes('.supabase.co')) {
    return {
      success: false,
      message: 'รูปแบบ Project URL ไม่ถูกต้อง ต้องขึ้นต้นด้วย https:// และลงท้ายด้วย .supabase.co (เช่น https://abcdefghijkl.supabase.co)',
    };
  }

  try {
    const testClient = createClient(testUrl.trim(), testKey.trim());
    
    // Try to query divisions or check health
    const { error } = await testClient.from('divisions').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        // Relation does not exist
        return {
          success: true,
          tablesFound: false,
          message: 'เชื่อมต่อกับ Supabase ได้สำเร็จแล้ว! แต่ยังไม่พบตารางข้อมูล กรุณานำคำสั่ง SQL DDL Schema ไปรันใน SQL Editor บน Supabase',
        };
      }
      return {
        success: false,
        message: `เชื่อมต่อไม่สำเร็จ: ${error.message} (โปรดตรวจสอบว่าคีย์เป็น anon public key หรือไม่)`,
      };
    }

    return {
      success: true,
      tablesFound: true,
      message: 'เชื่อมต่อฐานข้อมูล Supabase สำเร็จสมบูรณ์ 100%! พบตารางข้อมูลพร้อมใช้งาน',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message || String(err)}`,
    };
  }
}
