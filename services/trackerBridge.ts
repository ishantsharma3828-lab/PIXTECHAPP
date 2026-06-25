/**
 * trackerBridge.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * JavaScript-to-Native bridge for the Employee Tracker Capacitor plugin.
 * When running inside the Android WebView (Capacitor), calls are routed to the
 * native TrackerPlugin Kotlin class via window.Capacitor.Plugins.TrackerPlugin.
 *
 * When running in a browser / Electron desktop, every call falls back to a
 * localStorage-backed mock so the UI works without a physical device.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface AttendanceLog {
  id: number;
  userId: string;
  userName: string;
  type: 'check_in' | 'check_out';
  source: 'manual' | 'auto_geo';
  lat: number;
  lng: number;
  timestampMs: number;
}

export interface EmployeeLocation {
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  lastSeenMs: number;
  isInStore: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  body: string;
  dateMs: number;
  createdBy: string;
  createdAt: number;
}

export interface DutyItem {
  id: number;
  title: string;
  isCompleted: boolean;
  dateMs: number;
}

export interface NoteItem {
  id: number;
  title: string;
  content: string;
  dateMs: number;
  userId: string;
}

export interface KpiItem {
  id: number;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
}

// ─── Capacitor detection ────────────────────────────────────────────────────
const isCapacitor = () =>
  typeof (window as any).Capacitor !== 'undefined' &&
  !!(window as any).Capacitor.isNativePlatform?.();

const nativeCall = async <T>(method: string, args?: object): Promise<T> => {
  if (isCapacitor()) {
    return (window as any).Capacitor.Plugins.TrackerPlugin[method](args ?? {});
  }
  throw new Error('MOCK_MODE');
};

// ─── LocalStorage helpers (browser / desktop fallback) ──────────────────────
const lsGet = <T>(key: string, def: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : def;
  } catch {
    return def;
  }
};
const lsSet = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

// ─── Public API ─────────────────────────────────────────────────────────────

/** Record a manual Check-In for the current user */
export async function checkIn(userId: string, userName: string): Promise<void> {
  try {
    await nativeCall<void>('checkIn', { userId, userName });
  } catch {
    const logs = lsGet<AttendanceLog[]>('tracker_attendance', []);
    logs.unshift({
      id: Date.now(),
      userId,
      userName,
      type: 'check_in',
      source: 'manual',
      lat: 0,
      lng: 0,
      timestampMs: Date.now(),
    });
    lsSet('tracker_attendance', logs);
  }
}

/** Record a manual Check-Out for the current user */
export async function checkOut(userId: string, userName: string): Promise<void> {
  try {
    await nativeCall<void>('checkOut', { userId, userName });
  } catch {
    const logs = lsGet<AttendanceLog[]>('tracker_attendance', []);
    logs.unshift({
      id: Date.now(),
      userId,
      userName,
      type: 'check_out',
      source: 'manual',
      lat: 0,
      lng: 0,
      timestampMs: Date.now(),
    });
    lsSet('tracker_attendance', logs);
  }
}

/** Get attendance logs - pass userId to filter, or undefined for all (admin) */
export async function getAttendanceLogs(userId?: string): Promise<AttendanceLog[]> {
  try {
    const result = await nativeCall<{ logs: AttendanceLog[] }>('getAttendanceLogs', { userId });
    return result.logs;
  } catch {
    const all = lsGet<AttendanceLog[]>('tracker_attendance', []);
    return userId ? all.filter((l) => l.userId === userId) : all;
  }
}

/** Get current device GPS location */
export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    return await nativeCall<{ lat: number; lng: number }>('getCurrentLocation');
  } catch {
    // In browser, use Geolocation API
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 5000 }
        );
      } else {
        resolve(null);
      }
    });
  }
}

/** Launch barcode scanner and return scanned value */
export async function scanBarcode(): Promise<string | null> {
  try {
    const result = await nativeCall<{ value: string }>('scanBarcode');
    return result.value;
  } catch {
    // Browser fallback: prompt for manual entry
    return window.prompt('Enter barcode value (browser fallback):');
  }
}

/** Get all employee locations (admin only) */
export async function getAllEmployeeLocations(): Promise<EmployeeLocation[]> {
  try {
    const result = await nativeCall<{ locations: EmployeeLocation[] }>('getAllEmployeeLocations');
    return result.locations;
  } catch {
    return lsGet<EmployeeLocation[]>('tracker_employee_locations', []);
  }
}

// ─── Duties ─────────────────────────────────────────────────────────────────

export async function getDuties(userId: string): Promise<DutyItem[]> {
  try {
    const result = await nativeCall<{ duties: DutyItem[] }>('getDuties', { userId });
    return result.duties;
  } catch {
    return lsGet<DutyItem[]>(`tracker_duties_${userId}`, []);
  }
}

export async function addDuty(userId: string, title: string): Promise<void> {
  try {
    await nativeCall<void>('addDuty', { userId, title });
  } catch {
    const duties = lsGet<DutyItem[]>(`tracker_duties_${userId}`, []);
    duties.push({ id: Date.now(), title, isCompleted: false, dateMs: Date.now() });
    lsSet(`tracker_duties_${userId}`, duties);
  }
}

export async function toggleDuty(userId: string, id: number): Promise<void> {
  try {
    await nativeCall<void>('toggleDuty', { id });
  } catch {
    const duties = lsGet<DutyItem[]>(`tracker_duties_${userId}`, []);
    const idx = duties.findIndex((d) => d.id === id);
    if (idx !== -1) duties[idx].isCompleted = !duties[idx].isCompleted;
    lsSet(`tracker_duties_${userId}`, duties);
  }
}

export async function deleteDuty(userId: string, id: number): Promise<void> {
  try {
    await nativeCall<void>('deleteDuty', { id });
  } catch {
    const duties = lsGet<DutyItem[]>(`tracker_duties_${userId}`, []).filter((d) => d.id !== id);
    lsSet(`tracker_duties_${userId}`, duties);
  }
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function getNotes(userId: string): Promise<NoteItem[]> {
  try {
    const result = await nativeCall<{ notes: NoteItem[] }>('getNotes', { userId });
    return result.notes;
  } catch {
    return lsGet<NoteItem[]>(`tracker_notes_${userId}`, []);
  }
}

export async function addNote(userId: string, title: string, content: string): Promise<void> {
  try {
    await nativeCall<void>('addNote', { userId, title, content });
  } catch {
    const notes = lsGet<NoteItem[]>(`tracker_notes_${userId}`, []);
    notes.unshift({ id: Date.now(), title, content, dateMs: Date.now(), userId });
    lsSet(`tracker_notes_${userId}`, notes);
  }
}

export async function deleteNote(userId: string, id: number): Promise<void> {
  try {
    await nativeCall<void>('deleteNote', { id });
  } catch {
    const notes = lsGet<NoteItem[]>(`tracker_notes_${userId}`, []).filter((n) => n.id !== id);
    lsSet(`tracker_notes_${userId}`, notes);
  }
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

export async function getKpis(userId: string): Promise<KpiItem[]> {
  try {
    const result = await nativeCall<{ kpis: KpiItem[] }>('getKpis', { userId });
    return result.kpis;
  } catch {
    return lsGet<KpiItem[]>(`tracker_kpis_${userId}`, []);
  }
}

export async function addKpi(userId: string, title: string, target: number, unit: string): Promise<void> {
  try {
    await nativeCall<void>('addKpi', { userId, title, target, unit });
  } catch {
    const kpis = lsGet<KpiItem[]>(`tracker_kpis_${userId}`, []);
    kpis.push({ id: Date.now(), title, currentValue: 0, targetValue: target, unit });
    lsSet(`tracker_kpis_${userId}`, kpis);
  }
}

export async function updateKpi(userId: string, id: number, value: number): Promise<void> {
  try {
    await nativeCall<void>('updateKpi', { id, value });
  } catch {
    const kpis = lsGet<KpiItem[]>(`tracker_kpis_${userId}`, []);
    const idx = kpis.findIndex((k) => k.id === id);
    if (idx !== -1) kpis[idx].currentValue = value;
    lsSet(`tracker_kpis_${userId}`, kpis);
  }
}

export async function deleteKpi(userId: string, id: number): Promise<void> {
  try {
    await nativeCall<void>('deleteKpi', { id });
  } catch {
    const kpis = lsGet<KpiItem[]>(`tracker_kpis_${userId}`, []).filter((k) => k.id !== id);
    lsSet(`tracker_kpis_${userId}`, kpis);
  }
}

// ─── Calendar Events (Admin broadcast) ──────────────────────────────────────

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const result = await nativeCall<{ events: CalendarEvent[] }>('getCalendarEvents');
    return result.events;
  } catch {
    return lsGet<CalendarEvent[]>('tracker_calendar_events', []);
  }
}

export async function broadcastEvent(
  title: string,
  body: string,
  dateMs: number,
  createdBy: string
): Promise<void> {
  try {
    await nativeCall<void>('broadcastEvent', { title, body, dateMs, createdBy });
  } catch {
    const events = lsGet<CalendarEvent[]>('tracker_calendar_events', []);
    const newEvent: CalendarEvent = {
      id: `evt_${Date.now()}`,
      title,
      body,
      dateMs,
      createdBy,
      createdAt: Date.now(),
    };
    events.unshift(newEvent);
    lsSet('tracker_calendar_events', events);
  }
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  try {
    await nativeCall<void>('deleteCalendarEvent', { id });
  } catch {
    const events = lsGet<CalendarEvent[]>('tracker_calendar_events', []).filter(
      (e) => e.id !== id
    );
    lsSet('tracker_calendar_events', events);
  }
}

// ─── Missing Products (from scanner) ────────────────────────────────────────

export interface MissingProduct {
  id: number;
  barcode: string;
  name: string;
  reportedMs: number;
  reportedBy: string;
}

export async function getMissingProducts(): Promise<MissingProduct[]> {
  try {
    const result = await nativeCall<{ products: MissingProduct[] }>('getMissingProducts');
    return result.products;
  } catch {
    return lsGet<MissingProduct[]>('tracker_missing_products', []);
  }
}

export async function addMissingProduct(
  barcode: string,
  name: string,
  reportedBy: string
): Promise<void> {
  try {
    await nativeCall<void>('addMissingProduct', { barcode, name, reportedBy });
  } catch {
    const products = lsGet<MissingProduct[]>('tracker_missing_products', []);
    products.unshift({ id: Date.now(), barcode, name, reportedMs: Date.now(), reportedBy });
    lsSet('tracker_missing_products', products);
  }
}

export async function deleteMissingProduct(id: number): Promise<void> {
  try {
    await nativeCall<void>('deleteMissingProduct', { id });
  } catch {
    const products = lsGet<MissingProduct[]>('tracker_missing_products', []).filter(
      (p) => p.id !== id
    );
    lsSet('tracker_missing_products', products);
  }
}
