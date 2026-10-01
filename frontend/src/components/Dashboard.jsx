import React, { useState, useEffect } from 'react';
import AdminDashboard from './AdminDashboard';
import DoctorDashboard from './DoctorDashboard';
import StaffDashboard from './StaffDashboard';
import PeonDashboard from './PeonDashboard';
import ChemistDashboard from './ChemistDashboard';
import PatientDashboard from './PatientDashboard';
import UserProfile from './UserProfile';

export default function Dashboard({ currentUser, onLogout }) {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const parseHash = () => {
    // Format: #/profile/:role/:userId
    const parts = hash.split('/');
    if (parts[1] === 'profile' && parts[2] && parts[3]) {
      return {
        isProfile: true,
        params: {
          role: parts[2],
          userId: parts[3]
        }
      };
    }
    return { isProfile: false, params: {} };
  };

  const parsedHash = parseHash();
  const role = currentUser.role;

  const renderRoleDashboard = () => {
    if (parsedHash.isProfile) {
      return (
        <UserProfile
          matchParams={parsedHash.params}
          currentUser={currentUser}
          onBack={() => { window.location.hash = '#/'; }}
        />
      );
    }

    switch (role) {
      case 'admin':
        return <AdminDashboard />;
      case 'doctor':
        return <DoctorDashboard currentUser={currentUser} />;
      case 'staff':
        return <StaffDashboard currentUser={currentUser} />;
      case 'peon':
        return <PeonDashboard currentUser={currentUser} />;
      case 'chemist':
        return <ChemistDashboard />;
      case 'user':
        return <PatientDashboard currentUser={currentUser} />;
      default:
        return (
          <div className="flex items-center justify-center min-h-[50vh] text-slate-500 font-semibold">
            Unknown user role. Please contact system admin.
          </div>
        );
    }
  };

  const roleLabels = {
    admin: 'Supreme Admin',
    doctor: 'Doctor',
    staff: 'Staff Nurse',
    peon: 'Messenger Peon',
    chemist: 'Chemist Pharmacist',
    user: 'Patient Inpatient'
  };

  const roleBadgeColors = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    doctor: 'bg-blue-100 text-blue-800 border-blue-200',
    staff: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    peon: 'bg-rose-100 text-rose-800 border-rose-200',
    chemist: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    user: 'bg-amber-100 text-amber-800 border-amber-200'
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚕️</span>
            <div>
              <a href="#/" className="font-extrabold tracking-wider text-md hover:text-indigo-400 transition">MEDIBOT</a>
              <span className="hidden sm:inline-block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-3 border-l border-slate-700 pl-3">
                Hospital Enterprise Systems
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              {currentUser.role === 'user' ? (
                <a href={`#/profile/user/${currentUser.user_id}`} className="text-xs font-bold text-slate-200 hover:underline">
                  {currentUser.full_name}
                </a>
              ) : (
                <a href={`#/profile/${currentUser.role}/${currentUser.user_id}`} className="text-xs font-bold text-slate-200 hover:underline">
                  {currentUser.full_name}
                </a>
              )}
              <span className={`text-[10px] font-extrabold border px-2 py-0.5 rounded-full mt-0.5 w-fit ml-auto ${roleBadgeColors[role] || 'bg-slate-100'}`}>
                {roleLabels[role] || role}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 px-3.5 border border-slate-700 rounded-lg transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main workspace */}
      <main className="flex-grow">
        {renderRoleDashboard()}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-slate-400 text-xs">
        <p>MEDIBOT Hospital Management & logistics Network &copy; 2026 &mdash; CHARUSAT SEM 5</p>
      </footer>

    </div>
  );
}
