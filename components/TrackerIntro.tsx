/**
 * TrackerIntro.tsx
 * One-time animated introduction screen that shows after the employee's
 * first login. Dismissed by clicking "Let's Go!" and the flag is stored
 * in localStorage so it never shows again.
 */
import React, { useState, useEffect } from 'react';

interface Feature {
  emoji: string;
  title: string;
  desc: string;
  color: string;
}

const FEATURES: Feature[] = [
  {
    emoji: '🕐',
    title: 'Attendance Tracking',
    desc: 'Check in and out with a tap. Your GPS location is recorded automatically when you arrive at the store.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    emoji: '✅',
    title: 'Daily Duties',
    desc: 'Keep a personal checklist of your daily tasks and mark them off as you complete them.',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    emoji: '📊',
    title: 'KPI Tracker',
    desc: 'Set your own performance goals and track your progress with visual indicators.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    emoji: '📷',
    title: 'Barcode Scanner',
    desc: 'Scan any product barcode to instantly report missing or out-of-stock items.',
    color: 'from-orange-500 to-red-500',
  },
];

interface TrackerIntroProps {
  onDismiss: () => void;
}

const TrackerIntro: React.FC<TrackerIntroProps> = ({ onDismiss }) => {
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  const handleNext = () => {
    if (step < FEATURES.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setStep((s) => s + 1);
        setAnimating(false);
      }, 200);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('tracker_intro_shown', 'true');
    onDismiss();
  };

  const feature = FEATURES[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4">
      {/* Skip button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-slate-500 hover:text-white text-sm transition-colors"
      >
        Skip
      </button>

      <div className={`w-full max-w-sm transition-all duration-200 ${animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        {/* Step indicator */}
        <div className="flex gap-2 justify-center mb-8">
          {FEATURES.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-indigo-400' : 'w-3 bg-slate-700'}`}
            />
          ))}
        </div>

        {/* Feature card */}
        <div className="text-center">
          {/* Emoji bubble */}
          <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-5xl mx-auto mb-6 shadow-2xl`}>
            {feature.emoji}
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">{feature.title}</h2>
          <p className="text-slate-400 leading-relaxed px-4">{feature.desc}</p>
        </div>

        {/* Navigation */}
        <div className="mt-10 space-y-3">
          <button
            onClick={handleNext}
            className={`w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r ${feature.color} text-white transition-all hover:opacity-90 shadow-lg`}
          >
            {step < FEATURES.length - 1 ? 'Next →' : "Let's Go! 🚀"}
          </button>
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="w-full py-3 rounded-2xl font-medium text-slate-400 hover:text-white transition-colors text-sm"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Hook: returns true if the intro should be shown (first time only) */
export function useShouldShowTrackerIntro(): boolean {
  return localStorage.getItem('tracker_intro_shown') !== 'true';
}

export default TrackerIntro;
