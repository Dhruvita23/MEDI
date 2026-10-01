import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function UserProfile({ matchParams, currentUser, onBack }) {
  const { role, userId } = matchParams;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Active bill total for patients
  const [billTotal, setBillTotal] = useState(0);

  // Forms state
  const [eventForm, setEventForm] = useState({ event: 'Symptom log', note: '' });
  const [dispenseForm, setDispenseForm] = useState({ name: '', quantity: 1, price: '' });
  const [actionLogText, setActionLogText] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const fetchProfileData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.login('', ''); // Trigger token check helper or just fetch directly
    } catch(e) {}

    try {
      const data = await api.getPatients(); // Trigger verification if needed
    } catch(e) {}

    try {
      const fetched = await fetch(`/api/profiles/${userId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('medibot_token')}` }
      });
      const res = await fetched.json();
      if (!fetched.ok) throw new Error(res.detail || 'Failed to fetch profile.');
      setProfile(res);

      if (res.role === 'user') {
        // Compile bill dynamically to get latest total
        try {
          const billingInfo = await api.compileBilling(res._id);
          setBillTotal(billingInfo.grand_total);
        } catch (e) {
          // If no invoice yet, default to flat fees + medication sum
          const medCost = res.patient_details?.medication_log?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
          setBillTotal(3500 + medCost);
        }
      }
    } catch (err) {
      setError(err.message || 'Error fetching profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.note.trim()) return;
    try {
      const res = await fetch(`/api/profiles/${userId}/clinical-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('medibot_token')}`
        },
        body: JSON.stringify(eventForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setProfile(prev => ({
        ...prev,
        patient_details: {
          ...prev.patient_details,
          clinical_history: data.clinical_history
        }
      }));
      setEventForm({ event: 'Symptom log', note: '' });
      alert('Clinical event logged.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDispense = async (e) => {
    e.preventDefault();
    if (!dispenseForm.name.trim() || !dispenseForm.price) return;
    try {
      const res = await fetch(`/api/profiles/${userId}/dispense-medicine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('medibot_token')}`
        },
        body: JSON.stringify({
          name: dispenseForm.name,
          quantity: parseInt(dispenseForm.quantity),
          price: parseFloat(dispenseForm.price)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setProfile(prev => ({
        ...prev,
        patient_details: {
          ...prev.patient_details,
          medication_log: data.medication_log
        }
      }));
      setBillTotal(data.current_bill_price);
      setDispenseForm({ name: '', quantity: 1, price: '' });
      alert('Medicine dispensed. Injected cost to billing ledger.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddDutyLog = async (e) => {
    e.preventDefault();
    if (!actionLogText.trim()) return;
    try {
      const res = await fetch(`/api/profiles/${userId}/duty-log`, { // Support staff logging
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('medibot_token')}`
        },
        body: JSON.stringify({ action: actionLogText })
      });
      // We can also just update local state after mock/save, let's save locally to user log
      const updatedProfile = { ...profile };
      updatedProfile.duty_log.push({ action: actionLogText, timestamp: new Date() });
      // In a real app we hit a duty-log endpoint, here we mimic and update
      setProfile(updatedProfile);
      setActionLogText('');
      alert('Action logged to duty shift audit.');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500 font-semibold">
        Loading Profile Information Page...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded-xl shadow-sm border border-slate-100 text-center">
        <h3 className="text-red-600 font-bold text-lg mb-2">Error Loading Profile</h3>
        <p className="text-sm text-slate-500 mb-4">{error || 'Profile not found.'}</p>
        <button onClick={onBack} className="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs hover:bg-slate-700 transition">
          Go Back
        </button>
      </div>
    );
  }

  const isPatient = profile.role === 'user';

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      
      {/* Header Back controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 px-4 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
        >
          ⬅️ Back to Dashboard
        </button>
        <span className="text-xs text-slate-400 font-mono">Profile Routing: #/profile/{profile.role}/{profile._id}</span>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6 justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="text-4xl p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
            {isPatient ? '🤕' : profile.role === 'doctor' ? '🩺' : '🧑‍⚕️'}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">{profile.full_name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs font-bold bg-slate-100 text-slate-700 py-0.5 px-2 rounded-full border">
                {profile.role.toUpperCase()}
              </span>
              {!isPatient && (
                <span className="text-xs font-mono text-indigo-600 font-bold">
                  ID: {profile.employee_id || 'EMP-N/A'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Balance or Shift badge */}
        {isPatient ? (
          <div className="text-right bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Live Bill Price Ledger</span>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">Rs. {billTotal}</div>
          </div>
        ) : (
          <div className="text-right bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-indigo-800 tracking-wider">Duty shift Assignment</span>
            <div className="text-lg font-extrabold text-indigo-700 mt-1 uppercase">{profile.duty_shift || 'None'} Shift</div>
          </div>
        )}
      </div>

      {/* PATIENT PROFILE WORKSPACE */}
      {isPatient ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Clinical audit registries */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Clinical timeline history */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
              <h3 className="text-lg font-bold mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
                <span>📋 Clinical Diagnostic History Timeline</span>
                <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  {profile.patient_details?.clinical_history?.length || 0} Events
                </span>
              </h3>

              <div className="space-y-4">
                {profile.patient_details?.clinical_history?.map((evt, idx) => (
                  <div key={idx} className="flex gap-4 items-start border-l-2 border-slate-100 pl-4 ml-2 relative">
                    <span className="absolute -left-1.5 top-1.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white"></span>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">{evt.event}</span>
                        <span className="text-[10px] text-slate-400">{new Date(evt.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{evt.note}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Logged by: {evt.logged_by}</span>
                    </div>
                  </div>
                ))}
                {(!profile.patient_details?.clinical_history || profile.patient_details.clinical_history.length === 0) && (
                  <p className="text-xs text-slate-400 text-center py-4">No clinical history recorded yet.</p>
                )}
              </div>
            </div>

            {/* Medication Administration log */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
              <h3 className="text-lg font-bold mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
                <span>💊 Medication Administration Ledger</span>
                <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  {profile.patient_details?.medication_log?.length || 0} Dispenses
                </span>
              </h3>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-slate-600">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Medicine</th>
                      <th className="py-2.5 px-4">Qty</th>
                      <th className="py-2.5 px-4">Dispensed By</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.patient_details?.medication_log?.map((med, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 text-xs">
                        <td className="py-2 px-4 font-semibold text-slate-800">{med.name}</td>
                        <td className="py-2 px-4">{med.quantity}</td>
                        <td className="py-2 px-4">{med.dispensed_by}</td>
                        <td className="py-2 px-4 text-slate-400">{new Date(med.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!profile.patient_details?.medication_log || profile.patient_details.medication_log.length === 0) && (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-slate-400">No medicine has been administered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Column 3: Clinical updates and actions */}
          <div className="space-y-6">
            
            {/* Demographics details */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
              <h3 className="text-md font-bold mb-3 border-b border-slate-100 pb-2">Demographics</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div><span className="font-bold">Email:</span> {profile.email}</div>
                <div><span className="font-bold">Age:</span> {profile.patient_details?.age || 'N/A'} Years</div>
                <div><span className="font-bold">Gender:</span> {profile.patient_details?.gender || 'N/A'}</div>
                <div><span className="font-bold">Contact:</span> {profile.patient_details?.contact || 'N/A'}</div>
                <div><span className="font-bold">Room:</span> Floor {profile.patient_details?.allocated_floor || 'N/A'}, Bed {profile.patient_details?.allocated_bed || 'N/A'}</div>
              </div>
            </div>

            {/* Doctor/Nurse: Add clinical event */}
            {(currentUser.role === 'doctor' || currentUser.role === 'staff' || currentUser.role === 'admin') && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
                <h3 className="text-md font-bold mb-3">Add Clinical Log</h3>
                
                <form onSubmit={handleAddEvent} className="space-y-3">
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-wide">Event Type</label>
                    <select
                      value={eventForm.event}
                      onChange={(e) => setEventForm({ ...eventForm, event: e.target.value })}
                      className="w-full bg-slate-50 text-slate-800 text-xs rounded-lg p-2 outline-none border border-slate-200"
                    >
                      <option value="Symptom log">Symptom log</option>
                      <option value="Diagnosis record">Diagnosis record</option>
                      <option value="Critical incident">Critical incident</option>
                      <option value="General checkup">General checkup</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-wide">Clinical Notes</label>
                    <textarea
                      value={eventForm.note}
                      onChange={(e) => setEventForm({ ...eventForm, note: e.target.value })}
                      placeholder="Add diagnostic details..."
                      className="w-full bg-slate-50 text-slate-800 text-xs rounded-lg p-2 outline-none border border-slate-200 h-20 resize-none"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition">
                    Commit Event Log
                  </button>
                </form>
              </div>
            )}

            {/* Chemist/Staff: Dispense medicine directly */}
            {(currentUser.role === 'chemist' || currentUser.role === 'staff' || currentUser.role === 'admin') && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
                <h3 className="text-md font-bold mb-3">Dispense Drug Log</h3>
                
                <form onSubmit={handleDispense} className="space-y-3">
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-wide">Medicine Name</label>
                    <input
                      type="text"
                      value={dispenseForm.name}
                      onChange={(e) => setDispenseForm({ ...dispenseForm, name: e.target.value })}
                      placeholder="Paracetamol 650mg"
                      className="w-full bg-slate-50 text-slate-800 text-xs rounded-lg p-2 outline-none border border-slate-200"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-wide">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={dispenseForm.quantity}
                        onChange={(e) => setDispenseForm({ ...dispenseForm, quantity: e.target.value })}
                        className="w-full bg-slate-50 text-slate-800 text-xs rounded-lg p-2 outline-none border border-slate-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-wide">Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        value={dispenseForm.price}
                        onChange={(e) => setDispenseForm({ ...dispenseForm, price: e.target.value })}
                        placeholder="Rs."
                        className="w-full bg-slate-50 text-slate-800 text-xs rounded-lg p-2 outline-none border border-slate-200"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs transition">
                    Dispense & Charge
                  </button>
                </form>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* DOCTOR & STAFF WORK PROFILE PAGE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Details & Logs */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
              <h3 className="text-lg font-bold mb-4 border-b border-slate-100 pb-2">Duty Audit Logs</h3>
              <ul className="space-y-3">
                {profile.duty_log?.map((log, idx) => (
                  <li key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">{log.action}</span>
                    <span className="text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                  </li>
                ))}
                {(!profile.duty_log || profile.duty_log.length === 0) && (
                  <li className="text-xs text-slate-400 text-center py-4">No duty action logs.</li>
                )}
              </ul>
            </div>

          </div>

          {/* Details and log form */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
              <h3 className="text-md font-bold mb-3 border-b border-slate-100 pb-2">Employment Credentials</h3>
              
              <div className="space-y-2.5 text-xs text-slate-600">
                <div><span className="font-bold">Qualification:</span> {profile.qualification}</div>
                <div><span className="font-bold">Assigned Department:</span> {profile.assigned_department}</div>
                <div><span className="font-bold">Shift Schedule:</span> {profile.duty_shift || 'None'}</div>
                <div><span className="font-bold">Contact Info:</span> {profile.contact_info}</div>
                <div><span className="font-bold">Official Email:</span> {profile.email}</div>
              </div>
            </div>

            {/* Self-Logging to audit trail */}
            {currentUser.user_id === profile._id && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
                <h3 className="text-md font-bold mb-3">Add Duty Log Event</h3>
                <form onSubmit={handleAddDutyLog} className="space-y-3">
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-wide">Action Description</label>
                    <textarea
                      value={actionLogText}
                      onChange={(e) => setActionLogText(e.target.value)}
                      placeholder="Completed patient ward verification checklist..."
                      className="w-full bg-slate-50 text-slate-800 text-xs rounded-lg p-2.5 outline-none border border-slate-200 h-20 resize-none"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition">
                    Commit Action Log
                  </button>
                </form>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
