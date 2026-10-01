import React from 'react';
import IntercomAlerts from './IntercomAlerts';

export default function PeonDashboard({ currentUser }) {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <div className="lg:col-span-2 space-y-6">
        
        {/* Welcome card */}
        <div className="bg-gradient-to-r from-rose-700 to-pink-600 text-white rounded-xl shadow-sm p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Welcome, {currentUser.full_name}!</h2>
            <p className="text-xs text-rose-200 mt-1 font-semibold uppercase tracking-wider">
              Hospital Messenger / Orderly Service
            </p>
          </div>
          <span className="text-4xl">🏃</span>
        </div>

        {/* Live Intercom Alerts mesh */}
        <IntercomAlerts currentUser={currentUser} />

      </div>

      {/* Info Column */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
          <h3 className="text-md font-bold mb-3 border-b border-slate-100 pb-2">Messenger Operations</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            As a hospital messenger/orderly, please monitor the alert panel closely.
            When a Patient, Doctor, or Staff Nurse calls a Peon, you will receive a flashing real-time notification indicating the exact Floor Number and Bed/Room Location.
            Tap "Resolve Alert" once the messenger request is completed.
          </p>
        </div>
      </div>

    </div>
  );
}
