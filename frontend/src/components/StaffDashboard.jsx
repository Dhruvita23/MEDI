import React, { useState, useEffect } from 'react';
import IntercomAlerts from './IntercomAlerts';
import { api } from '../utils/api';

export default function StaffDashboard({ currentUser }) {
  const [beds, setBeds] = useState([]);

  useEffect(() => {
    fetchBeds();
  }, []);

  const fetchBeds = async () => {
    try {
      const data = await api.getBeds();
      setBeds(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Columns: Operations */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Welcome card */}
        <div className="bg-gradient-to-r from-cyan-700 to-teal-600 text-white rounded-xl shadow-sm p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Welcome, {currentUser.full_name}!</h2>
            <p className="text-xs text-cyan-200 mt-1 font-semibold uppercase tracking-wider">
              Shift: {currentUser.duty_shift || 'N/A'} Shift Staff/Nurse
            </p>
          </div>
          <span className="text-4xl">🧑‍⚕️</span>
        </div>

        {/* Intercom Panel */}
        <IntercomAlerts currentUser={currentUser} />

        {/* Live Bed Occupancy Map */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
          <h3 className="text-lg font-bold mb-4">Ward Bed Allocation Map</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((floor) => {
              const floorBeds = beds.filter(b => b.floor === floor);
              return (
                <div key={floor} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <h4 className="font-bold text-slate-400 text-[10px] mb-1.5 uppercase tracking-wider">Floor {floor}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
                    {floorBeds.map((bed) => (
                      <div
                        key={bed.bed_number}
                        className={`p-2 rounded border text-center text-xs font-semibold ${bed.is_occupied ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}
                      >
                        <div>B-{bed.bed_number}</div>
                        <div className="text-[9px] font-normal opacity-80 truncate">{bed.is_occupied ? 'Occupied' : 'Vacant'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Right Column: Information */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
          <h3 className="text-md font-bold mb-3 border-b border-slate-100 pb-2">Shift Duties</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Exactly 50 Staff system-wide. Divide strictly by duty shifts: 25 assigned to the Day Shift, 25 assigned to the Night Shift.
            Coordinate calling signals with Doctors and Peons. Input location (floor and bed) inside call forms.
          </p>
        </div>
      </div>

    </div>
  );
}
