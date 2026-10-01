import React, { useState, useEffect } from 'react';
import IntercomAlerts from './IntercomAlerts';
import { api } from '../utils/api';

export default function DoctorDashboard({ currentUser }) {
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

  const occupiedBeds = beds.filter(b => b.is_occupied);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Columns: Operations */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Welcome card */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white rounded-xl shadow-sm p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Welcome, {currentUser.full_name}!</h2>
            <p className="text-xs text-indigo-200 mt-1 font-semibold uppercase tracking-wider">
              Shift: {currentUser.duty_shift || 'N/A'} Shift Doctor
            </p>
          </div>
          <span className="text-4xl">🩺</span>
        </div>

        {/* Real-time calling mesh controls */}
        <IntercomAlerts currentUser={currentUser} />

        {/* List of active patients under doctor's watch */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Admitted Patients Lookup</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-slate-600">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {occupiedBeds.map(b => (
                  <tr key={b._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-800">Floor {b.floor} / Bed {b.bed_number}</td>
                    <td className="py-3 px-4 font-medium">{b.current_patient_id?.full_name || 'Discharged'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs bg-rose-100 text-rose-800 rounded-full font-bold">In Treatment</span>
                    </td>
                  </tr>
                ))}
                {occupiedBeds.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-6 text-slate-400">No active patients in beds.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Right Column: Mini Info Cards */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
          <h3 className="text-md font-bold mb-3 border-b border-slate-100 pb-2">Shift Duties Guideline</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Exactly 5 Doctors manage the Day shift system-wide, and 5 Doctors manage the Night shift system-wide.
            Please coordinate calling alerts with Nurses (Staff) and Peons (Hospital messengers) using the signaling panel.
          </p>
        </div>
      </div>

    </div>
  );
}
