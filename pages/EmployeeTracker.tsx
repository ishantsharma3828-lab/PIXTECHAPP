import React, { useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import * as tracker from '../services/trackerBridge';

// ─── Icons ────────────────────────────────────────────────────────────────────
const CheckInIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
  </svg>
);
const CheckOutIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const ScanIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ─── Section tabs ─────────────────────────────────────────────────────────────
type Tab = 'attendance' | 'duties' | 'kpis' | 'notes' | 'scanner';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'attendance', label: 'Attendance', emoji: '🕐' },
  { id: 'duties', label: 'Duties', emoji: '✅' },
  { id: 'kpis', label: 'KPIs', emoji: '📊' },
  { id: 'notes', label: 'Notes', emoji: '📝' },
  { id: 'scanner', label: 'Scanner', emoji: '📷' },
];

// ─── Main Component ────────────────────────────────────────────────────────────
const EmployeeTracker: React.FC = () => {
  const user = authService.getCurrentUser();
  const userId = user?.id ?? 'guest';
  const userName = user?.fullName ?? user?.username ?? 'Employee';

  const [activeTab, setActiveTab] = useState<Tab>('attendance');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Attendance
  const [attendanceLogs, setAttendanceLogs] = useState<tracker.AttendanceLog[]>([]);
  // Duties
  const [duties, setDuties] = useState<tracker.DutyItem[]>([]);
  const [newDuty, setNewDuty] = useState('');
  // KPIs
  const [kpis, setKpis] = useState<tracker.KpiItem[]>([]);
  const [kpiForm, setKpiForm] = useState({ title: '', target: '', unit: '' });
  // Notes
  const [notes, setNotes] = useState<tracker.NoteItem[]>([]);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  // Scanner
  const [missingProducts, setMissingProducts] = useState<tracker.MissingProduct[]>([]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [logs, d, k, n, mp] = await Promise.all([
        tracker.getAttendanceLogs(userId),
        tracker.getDuties(userId),
        tracker.getKpis(userId),
        tracker.getNotes(userId),
        tracker.getMissingProducts(),
      ]);
      setAttendanceLogs(logs);
      setDuties(d);
      setKpis(k);
      setNotes(n);
      setMissingProducts(mp);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Attendance ──────────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    await tracker.checkIn(userId, userName);
    showToast('✅ Checked in successfully!');
    loadData();
  };
  const handleCheckOut = async () => {
    await tracker.checkOut(userId, userName);
    showToast('👋 Checked out successfully!');
    loadData();
  };

  const todayLogs = attendanceLogs.filter((l) => {
    const d = new Date(l.timestampMs);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const lastAction = todayLogs[0];

  // ─── Scanner ─────────────────────────────────────────────────────────────────
  const handleScan = async () => {
    const code = await tracker.scanBarcode();
    if (code) {
      await tracker.addMissingProduct(code, `Product (${code})`, userName);
      showToast('📷 Product logged!');
      loadData();
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-4 md:p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all animate-fade-in
          ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-xl font-bold shadow-lg">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-indigo-300 font-medium uppercase tracking-wider">Employee Tracker</p>
            <h1 className="text-xl font-bold">{userName}</h1>
          </div>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick Status Card */}
      <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">Today's Status</p>
            {lastAction ? (
              <p className="font-semibold text-white">
                Last: <span className={lastAction.type === 'check_in' ? 'text-emerald-400' : 'text-red-400'}>
                  {lastAction.type === 'check_in' ? 'Checked In' : 'Checked Out'}
                </span>{' '}
                at {new Date(lastAction.timestampMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                {lastAction.source === 'auto_geo' && <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">Auto</span>}
              </p>
            ) : (
              <p className="font-semibold text-slate-400">No activity today</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCheckIn}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-3 py-2 rounded-xl transition-all text-sm shadow-lg shadow-emerald-500/20"
            >
              <CheckInIcon /> In
            </button>
            <button
              onClick={handleCheckOut}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-400 text-white font-semibold px-3 py-2 rounded-xl transition-all text-sm shadow-lg shadow-red-500/20"
            >
              <CheckOutIcon /> Out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
              ${activeTab === tab.id
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
          >
            <span>{tab.emoji}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Attendance Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg text-white">Attendance Log</h2>
          {attendanceLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No attendance records yet.</div>
          ) : (
            <div className="space-y-2">
              {attendanceLogs.map((log) => (
                <div key={log.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${log.type === 'check_in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {log.type === 'check_in' ? <CheckInIcon /> : <CheckOutIcon />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{log.type === 'check_in' ? 'Check In' : 'Check Out'}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(log.timestampMs).toLocaleDateString()} · {new Date(log.timestampMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${log.source === 'auto_geo' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-500/20 text-slate-300'}`}>
                    {log.source === 'auto_geo' ? '📍 Auto' : '👆 Manual'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Duties Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'duties' && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg">My Duties</h2>
          <div className="flex gap-2">
            <input
              value={newDuty}
              onChange={(e) => setNewDuty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newDuty.trim()) {
                  tracker.addDuty(userId, newDuty.trim()).then(() => { setNewDuty(''); loadData(); });
                }
              }}
              placeholder="Add a duty..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={() => {
                if (newDuty.trim()) tracker.addDuty(userId, newDuty.trim()).then(() => { setNewDuty(''); loadData(); });
              }}
              className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2.5 rounded-xl transition-all"
            >
              <PlusIcon />
            </button>
          </div>
          <div className="space-y-2">
            {duties.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No duties added. Start adding tasks!</div>
            ) : duties.map((duty) => (
              <div key={duty.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <button
                  onClick={() => tracker.toggleDuty(userId, duty.id).then(loadData)}
                  className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all flex-shrink-0 ${duty.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 hover:border-indigo-400'}`}
                >
                  {duty.isCompleted && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </button>
                <span className={`flex-1 text-sm ${duty.isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>{duty.title}</span>
                <button onClick={() => tracker.deleteDuty(userId, duty.id).then(loadData)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'kpis' && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg">My KPIs</h2>
          {/* Add form */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Add KPI</p>
            <div className="flex gap-2 flex-wrap">
              <input value={kpiForm.title} onChange={(e) => setKpiForm({ ...kpiForm, title: e.target.value })} placeholder="Title (e.g. Sales)" className="flex-1 min-w-[140px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              <input value={kpiForm.target} onChange={(e) => setKpiForm({ ...kpiForm, target: e.target.value })} placeholder="Target" type="number" className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              <input value={kpiForm.unit} onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })} placeholder="Unit" className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              <button onClick={() => {
                if (kpiForm.title && kpiForm.target) {
                  tracker.addKpi(userId, kpiForm.title, parseFloat(kpiForm.target), kpiForm.unit || 'units').then(() => { setKpiForm({ title: '', target: '', unit: '' }); loadData(); });
                }
              }} className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-sm transition-all">
                Add
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {kpis.length === 0 ? <div className="text-center py-10 text-slate-500">No KPIs yet. Track your goals!</div>
              : kpis.map((kpi) => {
                const pct = Math.min(100, Math.round((kpi.currentValue / kpi.targetValue) * 100));
                return (
                  <div key={kpi.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{kpi.title}</p>
                        <p className="text-xs text-slate-400">{kpi.currentValue} / {kpi.targetValue} {kpi.unit}</p>
                      </div>
                      <span className={`text-sm font-bold ${pct >= 100 ? 'text-emerald-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        defaultValue={kpi.currentValue}
                        onBlur={(e) => tracker.updateKpi(userId, kpi.id, parseFloat(e.target.value) || 0).then(loadData)}
                        className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-xs text-slate-500">{kpi.unit}</span>
                      <button onClick={() => tracker.deleteKpi(userId, kpi.id).then(loadData)} className="ml-auto text-slate-600 hover:text-red-400">
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Notes Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg">My Notes</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <input value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} placeholder="Title..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
            <textarea value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} placeholder="Write your note..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none" />
            <button onClick={() => {
              if (noteForm.title && noteForm.content) {
                tracker.addNote(userId, noteForm.title, noteForm.content).then(() => { setNoteForm({ title: '', content: '' }); loadData(); });
              }
            }} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-2 rounded-xl text-sm font-medium transition-all">
              Save Note
            </button>
          </div>
          <div className="space-y-3">
            {notes.length === 0 ? <div className="text-center py-10 text-slate-500">No notes yet.</div>
              : notes.map((note) => (
                <div key={note.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold">{note.title}</p>
                    <button onClick={() => tracker.deleteNote(userId, note.id).then(loadData)} className="text-slate-600 hover:text-red-400 ml-2 flex-shrink-0">
                      <TrashIcon />
                    </button>
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-slate-500 mt-2">{new Date(note.dateMs).toLocaleString()}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Scanner Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'scanner' && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg">Barcode Scanner</h2>
          <button
            onClick={handleScan}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-500/25"
          >
            <ScanIcon /> Scan Missing Product
          </button>
          <h3 className="font-semibold text-slate-300 mt-2">Missing Products Log</h3>
          <div className="space-y-2">
            {missingProducts.length === 0 ? <div className="text-center py-10 text-slate-500">No missing products logged.</div>
              : missingProducts.map((p) => (
                <div key={p.id} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.barcode}</p>
                    <p className="text-xs text-slate-500">{new Date(p.reportedMs).toLocaleString()} · by {p.reportedBy}</p>
                  </div>
                  <button onClick={() => tracker.deleteMissingProduct(p.id).then(loadData)} className="text-slate-600 hover:text-red-400">
                    <TrashIcon />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTracker;
