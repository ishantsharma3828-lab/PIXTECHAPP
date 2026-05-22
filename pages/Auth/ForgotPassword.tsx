
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isSent, setIsSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsSent(true);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden font-sans text-white">
            {/* Background Glow Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Glass Card */}
            <div className="w-full max-w-[380px] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-2xl relative z-10">

                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-white/10 to-transparent border border-white/5 flex items-center justify-center mb-6 shadow-xl">
                        <img src="icon.png" alt="App Logo" className="w-10 h-10 object-contain drop-shadow-lg" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">Forgot Password?</h1>
                    <p className="text-gray-400 text-sm text-center px-4">Enter your email to receive reset instructions</p>
                </div>

                {!isSent ? (
                    /* Form */
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Input */}
                        <div className="group relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#121217] text-white border border-white/5 rounded-2xl px-5 py-4 text-sm placeholder-gray-600 focus:outline-none focus:border-white/20 focus:bg-[#1a1a20] transition-all pr-14"
                                placeholder="Enter your email"
                                required
                            />

                            {/* The "Arrow" Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group-focus-within:shadow-teal-500/40"
                            >
                                {isLoading ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                )}
                            </button>
                        </div>

                    </form>
                ) : (
                    <div className="text-center py-4 space-y-4 animate-fadeIn">
                        <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-sm text-gray-300">
                            If an account exists for <b>{email}</b>, you will receive an email shortly.
                        </p>
                        <button onClick={() => setIsSent(false)} className="text-xs text-slate-500 hover:text-white underline">Try another email</button>
                    </div>
                )}

                {/* Footer */}
                <p className="text-center text-xs text-slate-500 mt-8">
                    Remembered password? <Link to="/login" className="text-white font-medium hover:underline ml-1">Log In</Link>
                </p>

            </div>
        </div>
    );
};

export default ForgotPassword;
