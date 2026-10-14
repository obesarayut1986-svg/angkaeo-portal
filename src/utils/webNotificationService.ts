// Web Push & Browser Notification Helper Service
// Completely free, unlimited, and runs client-side with native Browser Notifications, Web Audio chime, and Mobile Badging

export interface WebNotificationOptions {
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
}

// 1. Play crystal-clear notification chime using Web Audio API (no external MP3/WAV needed)
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Two-tone bell chord (E5 -> G#5)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.exponentialRampToValueAtTime(830.61, now + 0.12); // G#5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.5, now); // Harmonic E6
    osc2.frequency.exponentialRampToValueAtTime(1661.2, now + 0.12);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch {
    // AudioContext might be restricted until user gesture, safely ignore
  }
}

// 2. Mobile Device Vibration
export function triggerVibration(pattern: number[] = [120, 80, 120]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error
    }
  }
}

// 3. Web Badging API (Red count on phone app icon)
export function updateAppBadge(count: number) {
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    try {
      if (count > 0) {
        (navigator as any).setAppBadge(count).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    } catch {
      // Ignore
    }
  }
}

// 4. Notification Permission Checks
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return Notification.permission;
  }
}

// 5. Send Live Notification
export function sendWebNotification(title: string, options: WebNotificationOptions): boolean {
  // Always trigger sound & vibration if enabled in options
  if (!options.silent) {
    playNotificationChime();
    triggerVibration();
  }

  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const n = new Notification(title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: options.tag || `angkeaw-${Date.now()}`,
      data: options.data,
      requireInteraction: options.requireInteraction ?? false,
    });

    n.onclick = () => {
      window.focus();
      n.close();
    };

    return true;
  } catch (err) {
    console.warn('Failed to display native notification:', err);
    return false;
  }
}
