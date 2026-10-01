import React, { useState } from 'react';
import { api } from '../utils/api';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoCreds = [
    { label: 'Admin', email: 'admin@medibot.com', pw: 'admin123', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200' },
    { label: 'Doctor (Day)', email: 'doctor1@medibot.com', pw: 'doctor123', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200' },
    { label: 'Doctor (Night)', email: 'doctor6@medibot.com', pw: 'doctor123', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200' },
    { label: 'Staff/Nurse (Day)', email: 'staff1@medibot.com', pw: 'staff123', color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-200' },
    { label: 'Staff/Nurse (Night)', email: 'staff26@medibot.com', pw: 'staff123', color: 'bg-teal-100 text-teal-700 hover:bg-teal-200 border-teal-200' },
    { label: 'Peon Orderly', email: 'peon1@medibot.com', pw: 'peon123', color: 'bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200' },
    { label: 'Chemist Pharmacy', email: 'chemist@medibot.com', pw: 'chemist123', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200' },
    { label: 'Patient User', email: 'patient@medibot.com', pw: 'patient123', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200' }
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('medibot_token', data.access_token);
      localStorage.setItem('medibot_user', JSON.stringify(data));
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (emailVal, passVal) => {
    setEmail(emailVal);
    setPassword(passVal);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        
        {/* Left Side: Brand and Info */}
        <div className="flex-1 p-8 flex flex-col justify-center bg-gradient-to-br from-indigo-900 via-slate-800 to-indigo-950 text-white">
          <div className="mb-6 flex items-center gap-3">
            <span className="text-4xl">⚕️</span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-wider">MEDIBOT</h1>
              <p className="text-xs text-indigo-400 font-semibold tracking-widest uppercase">Hospital Logistics & Billing</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Enterprise-ready automation dashboard monitoring 5 floors, 50 beds, shift workloads, real-time calling mesh, and medical shop billing.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-indigo-400">✔</span> Real-Time WebSocket Alerts
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-indigo-400">✔</span> Automated Mongoose Bill Ledgers
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-indigo-400">✔</span> Shift Management for Day & Night Teams
            </div>
          </div>
        </div>

        {/* Right Side: Login Form and Demo Credentials */}
        <div className="flex-1 p-8 bg-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
            <p className="text-slate-400 text-xs mb-6">Access your specific dashboard role</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-bold mb-1 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-700 text-white text-sm rounded-lg p-2.5 outline-none border border-slate-600 focus:border-indigo-500"
                  placeholder="name@medibot.com"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-bold mb-1 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-700 text-white text-sm rounded-lg p-2.5 outline-none border border-slate-600 focus:border-indigo-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="p-3 text-xs bg-red-950 border border-red-800 text-red-400 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg text-sm p-3 transition disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3">Quick Demo Login</h4>
            <div className="grid grid-cols-2 gap-2">
              {demoCreds.map((cred) => (
                <button
                  key={cred.label}
                  onClick={() => handleQuickLogin(cred.email, cred.pw)}
                  className={`text-[10px] font-bold py-1.5 px-2 border rounded-md transition cursor-pointer text-center truncate ${cred.color}`}
                >
                  {cred.label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
