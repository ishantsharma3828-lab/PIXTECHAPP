import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as tracker from '../services/trackerBridge';

// ─── Icons ────────────────────────────────────────────────────────────────────
const MapPinIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-3.36M20 15a9 9 0 01-14.13 3.36" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Mock employee list for demo purposes (in production, pull from userService)
const MOCK_EMPLOYEES = [
  { userId: 'emp1', userName: 'Amine Benali', role: 'cashier' },
  { userId: 'emp2', userName: 'Sara Khalil', role: 'cashier' },
  { userId: 'emp3', userName: 'Yacine Boumediene', role: 'technician' },
];

type AdminTab = 'map' | 'attendance' | 'employees' | 'calendar';

// ─── Simple Map Canvas component ─────────────────────────────────────────────
const LiveMapView: React.FC<{ locations: tracker.EmployeeLocation[] }> = ({ locations }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Draw background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Draw grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Draw store circle
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 40, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(99,102,241,0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(99,102,241,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#6366f1';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STORE', W / 2, H / 2 + 4);

    // Draw employee pins
    const colors = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
    locations.forEach((loc, i) => {
      // Place them around the store in a mock layout
      const angle = (i / locations.length) * Math.PI * 2;
      const dist = loc.isInStore ? 30 : 80 + (i % 3) * 20;
      const x = W / 2 + Math.cos(angle) * dist;
      const y = H / 2 + Math.sin(angle) * dist;

      // Pulse ring for in-store
      if (loc.isInStore) {
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16,185,129,0.2)';
        ctx.fill();
      }

      // Pin
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // Initial
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(loc.userName.charAt(0).toUpperCase(), x, y + 3.5);

      // Name label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '9px sans-serif';
      ctx.fillText(loc.userName.split(' ')[0], x, y + 22);
    });

    // No employee state
    if (locations.length === 0) {
      ctx.fillStyle = '#475569';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No employees online', W / 2, H / 2 + 70);
    }
  }, [locations]);

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={260}
      className="rounded-xl w-full border border-white/10"
      style={{ maxHeight: '260px' }}
    />
  );
};

// ─── Main AdminTracker Component ──────────────────────────────────────────────
const AdminTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('map');
  const [employeeLocations, setEmployeeLocations] = useState<tracker.EmployeeLocation[]>([]);
  const [allAttendance, setAllAttendance] = useState<tracker.AttendanceLog[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<tracker.CalendarEvent[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeNotes, setEmployeeNotes] = useState<tracker.NoteItem[]>([]);
  const [employeeLogs, setEmployeeLogs] = useState<tracker.AttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Calendar form
  const [evtForm, setEvtForm] = useState({ title: '', body: '', date: '' });
  const [posting, setPosting] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [locs, allLogs, events] = await Promise.all([
        tracker.getAllEmployeeLocations(),
        tracker.getAttendanceLogs(undefined),
        tracker.getCalendarEvents(),
      ]);
      setEmployeeLocations(locs);
      setAllAttendance(allLogs);
      setCalendarEvents(events);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectEmployee = async (uid: string) => {
    setSelectedEmployee(uid);
    const [n, l] = await Promise.all([
      tracker.getNotes(uid),
      tracker.getAttendanceLogs(uid),
    ]);
    setEmployeeNotes(n);
    setEmployeeLogs(l);
  };

  const handleBroadcastEvent = async () => {
    if (!evtForm.title || !evtForm.body || !evtForm.date) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    setPosting(true);
    try {
      await tracker.broadcastEvent(evtForm.title, evtForm.body, new Date(evtForm.date).getTime(), 'admin');
      setEvtForm({ title: '', body: '', date: '' });
      showToast('📣 Event broadcast to all employees!');
      loadData();
    } finally {
      setPosting(false);
    }
  };

  const ADMIN_TABS: { id: AdminTab; label: string; emoji: string }[] = [
    { id: 'map', label: 'Live Map', emoji: '🗺️' },
    { id: 'attendance', label: 'Attendance', emoji: '🕐' },
    { id: 'employees', label: 'Employees', emoji: '👥' },
    { id: 'calendar', label: 'Events', emoji: '📅' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white p-4 md:p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fade-in
          ${toast.type === 'success' ? 'bg-emerald-500/90' : 'bg-red-500/90'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-purple-300 font-medium uppercase tracking-wider mb-1">Admin Panel</p>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">Employee Monitor</h1>
          <p className="text-sm text-slate-400 mt-1">{MOCK_EMPLOYEES.length} employees tracked</p>
        </div>
        <button
          onClick={loadData}
          className={`flex items-center gap-1.5 bg-white/5 border border-white/10 text-slate-300 px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/10 ${loading ? 'animate-spin' : ''}`}
        >
          <RefreshIcon />
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">
            {employeeLocations.filter((l) => l.isInStore).length}
          </p>
          <p className="text-xs text-slate-400 mt-1">In Store</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">
            {employeeLocations.filter((l) => !l.isInStore).length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Outside</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{allAttendance.filter((l) => {
            return new Date(l.timestampMs).toDateString() === new Date().toDateString();
          }).length}</p>
          <p className="text-xs text-slate-400 mt-1">Actions Today</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
              ${activeTab === tab.id
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
          >
            <span>{tab.emoji}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Live Map ──────────────────────────────────────────────────────── */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold flex items-center gap-2"><MapPinIcon /> Live Locations</h2>
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-full">Updates every 30s</span>
            </div>
            <LiveMapView locations={employeeLocations.length > 0 ? employeeLocations : MOCK_EMPLOYEES.map((e, i) => ({
              userId: e.userId,
              userName: e.userName,
              lat: 0,
              lng: 0,
              lastSeenMs: Date.now() - i * 60000,
              isInStore: i < 2,
            }))} />
          </div>

          {/* Employee location cards */}
          <div className="space-y-2">
            {(employeeLocations.length > 0 ? employeeLocations : MOCK_EMPLOYEES.map((e, i) => ({
              userId: e.userId,
              userName: e.userName,
              lat: 0,
              lng: 0,
              lastSeenMs: Date.now() - i * 120000,
              isInStore: i < 2,
            }))).map((loc) => (
              <div key={loc.userId} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${loc.isInStore ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{loc.userName}</p>
                  <p className="text-xs text-slate-400">
                    {loc.isInStore ? '📍 Inside store' : '🚶 Outside store'} · Last seen {
                      Math.round((Date.now() - loc.lastSeenMs) / 60000)} min ago
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${loc.isInStore ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                  {loc.isInStore ? 'In Store' : 'Away'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Attendance Log (Admin view, all employees) ──────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg">All Attendance Logs</h2>
          <p className="text-xs text-slate-400">
            🟢 <span className="text-emerald-300 font-medium">Auto</span> = detected by GPS proximity · 
            🔵 <span className="text-slate-300 font-medium">Manual</span> = employee pressed button
          </p>
          {allAttendance.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No attendance records yet.</div>
          ) : (
            <div className="space-y-2">
              {allAttendance.map((log) => (
                <div key={log.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${log.type === 'check_in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {log.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{log.userName}</p>
                    <p className="text-xs text-slate-400">
                      {log.type === 'check_in' ? '→ Check In' : '← Check Out'} · {new Date(log.timestampMs).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${log.source === 'auto_geo' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {log.source === 'auto_geo' ? '📍 Auto' : '👆 Manual'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Employees Detail ──────────────────────────────────────────────── */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg">Employee Details</h2>
          {!selectedEmployee ? (
            <div className="space-y-2">
              {MOCK_EMPLOYEES.map((emp) => (
                <button
                  key={emp.userId}
                  onClick={() => handleSelectEmployee(emp.userId)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {emp.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{emp.userName}</p>
                    <p className="text-xs text-slate-400 capitalize">{emp.role}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to employees
              </button>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-3">Attendance History</p>
                {employeeLogs.length === 0 ? (
                  <p className="text-slate-500 text-sm">No records for this employee.</p>
                ) : employeeLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className={`text-sm ${log.type === 'check_in' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {log.type === 'check_in' ? '▶ Check In' : '■ Check Out'}
                    </span>
                    <div className="text-right">
                      <p className="text-xs text-slate-300">{new Date(log.timestampMs).toLocaleTimeString()}</p>
                      <p className="text-xs text-slate-500">{new Date(log.timestampMs).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${log.source === 'auto_geo' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                      {log.source === 'auto_geo' ? 'Auto' : 'Manual'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-3">Notes (Read-Only)</p>
                {employeeNotes.length === 0 ? (
                  <p className="text-slate-500 text-sm">No notes from this employee.</p>
                ) : employeeNotes.map((note) => (
                  <div key={note.id} className="mb-3 pb-3 border-b border-white/5 last:border-0">
                    <p className="text-sm font-semibold">{note.title}</p>
                    <p className="text-xs text-slate-300 mt-1">{note.content}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(note.dateMs).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Calendar & Events ─────────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg flex items-center gap-2"><BellIcon /> Broadcast Events</h2>
          <p className="text-xs text-slate-400">Events you post here will trigger a push notification to all employees and appear in their tracker calendar.</p>

          {/* Post event form */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">New Announcement</p>
            <input
              value={evtForm.title}
              onChange={(e) => setEvtForm({ ...evtForm, title: e.target.value })}
              placeholder="Title (e.g. Team Meeting, Holiday...)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <textarea
              value={evtForm.body}
              onChange={(e) => setEvtForm({ ...evtForm, body: e.target.value })}
              placeholder="Message to all employees..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
            />
            <input
              type="datetime-local"
              value={evtForm.date}
              onChange={(e) => setEvtForm({ ...evtForm, date: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleBroadcastEvent}
              disabled={posting}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <BellIcon /> {posting ? 'Broadcasting...' : 'Broadcast to All Employees'}
            </button>
          </div>

          {/* Events list */}
          <h3 className="font-semibold text-slate-300 flex items-center gap-2"><CalendarIcon /> Posted Events</h3>
          {calendarEvents.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No events posted yet.</div>
          ) : calendarEvents.map((event) => (
            <div key={event.id} className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-sm text-slate-300 mt-1">{event.body}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-xs text-purple-300">📅 {new Date(event.dateMs).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Posted {new Date(event.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => tracker.deleteCalendarEvent(event.id).then(loadData)}
                  className="ml-2 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTracker;
