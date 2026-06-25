/**
 * CalendarEventPopup.tsx
 * A floating popup banner that appears for employees when there are
 * new calendar events posted by the admin. Shows once per session
 * and can be dismissed.
 */
import React, { useState, useEffect } from 'react';
import * as tracker from '../services/trackerBridge';

const CalendarEventPopup: React.FC = () => {
  const [events, setEvents] = useState<tracker.CalendarEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      const all = await tracker.getCalendarEvents();
      // Show events from the last 7 days
      const recent = all.filter(
        (e) => Date.now() - e.createdAt < 7 * 24 * 60 * 60 * 1000
      );
      const seenKey = 'tracker_seen_events';
      const seen: string[] = JSON.parse(localStorage.getItem(seenKey) ?? '[]');
      const unseen = recent.filter((e) => !seen.includes(e.id));
      if (unseen.length > 0) {
        setEvents(unseen);
        setVisible(true);
      }
    };
    // Check after a brief delay so the app finishes loading
    const timer = setTimeout(load, 2000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    // Mark all current events as seen
    const seenKey = 'tracker_seen_events';
    const seen: string[] = JSON.parse(localStorage.getItem(seenKey) ?? '[]');
    events.forEach((e) => { if (!seen.includes(e.id)) seen.push(e.id); });
    localStorage.setItem(seenKey, JSON.stringify(seen));
    setVisible(false);
  };

  const nextEvent = () => {
    if (currentIndex < events.length - 1) setCurrentIndex((i) => i + 1);
    else dismiss();
  };

  if (!visible || events.length === 0) return null;

  const event = events[currentIndex];

  return (
    <div className="fixed inset-x-4 top-4 z-[300] animate-slide-down">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-4 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-purple-500/30 flex items-center justify-center text-xl flex-shrink-0">📅</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-purple-300 font-medium uppercase tracking-wider">Admin Announcement</span>
              {events.length > 1 && (
                <span className="text-xs text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full">
                  {currentIndex + 1}/{events.length}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-white">{event.title}</p>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{event.body}</p>
            <p className="text-xs text-purple-300 mt-2">
              📅 {new Date(event.dateMs).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Close */}
          <button onClick={dismiss} className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Action row */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={dismiss}
            className="flex-1 text-center text-xs text-slate-400 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            Dismiss All
          </button>
          {events.length > 1 && currentIndex < events.length - 1 && (
            <button
              onClick={nextEvent}
              className="flex-1 text-center text-xs text-white py-2 rounded-xl bg-purple-500/40 hover:bg-purple-500/60 transition-all"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarEventPopup;
