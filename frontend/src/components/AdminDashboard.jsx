import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('beds');
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [bills, setBills] = useState([]);

  // Admit Form state
  const [admitForm, setAdmitForm] = useState({
    full_name: '',
    email: '',
    password: '',
    allocated_floor: '',
    allocated_bed: '',
    age: '',
    gender: 'Male',
    contact: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Add Staff Form state
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'doctor',
    duty_shift: 'day',
    contact_info: '',
    qualification: '',
    assigned_department: 'General Medicine'
  });
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'beds') {
        const data = await api.getBeds();
        setBeds(data);
      } else if (activeTab === 'patients') {
        const data = await api.getPatients();
        setPatients(data);
      } else if (activeTab === 'staff') {
        const data = await api.getStaff();
        setStaff(data);
      } else if (activeTab === 'billing') {
        const data = await api.getBilling();
        setBills(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdmitSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      const payload = {
        ...admitForm,
        allocated_floor: parseInt(admitForm.allocated_floor),
        allocated_bed: parseInt(admitForm.allocated_bed),
        age: parseInt(admitForm.age) || 30
      };
      const res = await api.admitPatient(payload);
      setFormSuccess(`Patient admitted! Profile URL generated: #/profile/user/${res.patient_id}`);
      setAdmitForm({ full_name: '', email: '', password: '', allocated_floor: '', allocated_bed: '', age: '', gender: 'Male', contact: '' });
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Error admitting patient.');
    }
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setStaffError('');
    setStaffSuccess('');
    try {
      const res = await fetch('/api/admin/add-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('medibot_token')}`
        },
        body: JSON.stringify(staffForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      setStaffSuccess(`Staff provisioned successfully! Profile URL generated: #/profile/${staffForm.role}/${data.user_id}`);
      setStaffForm({
        full_name: '',
        email: '',
        password: '',
        role: 'doctor',
        duty_shift: 'day',
        contact_info: '',
        qualification: '',
        assigned_department: 'General Medicine'
      });
      fetchData();
    } catch (err) {
      setStaffError(err.message || 'Error provisioning staff member.');
    }
  };

  const handleDischarge = async (patientId) => {
    if (!window.confirm('Are you sure you want to discharge this patient?')) return;
    try {
      const res = await api.dischargePatient(patientId);
      alert(res.message);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCompileBill = async (patientId) => {
    try {
      const res = await api.compileBilling(patientId);
      alert(`Invoice compiled: ${res.invoice_id}`);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Group staff by role and shift
  const doctors = staff.filter(s => s.role === 'doctor');
  const dayDoctors = doctors.filter(d => d.duty_shift === 'day');
  const nightDoctors = doctors.filter(d => d.duty_shift === 'night');

  const nurses = staff.filter(s => s.role === 'staff');
  const dayNurses = nurses.filter(n => n.duty_shift === 'day');
  const nightNurses = nurses.filter(n => n.duty_shift === 'night');

  const peons = staff.filter(s => s.role === 'peon');
  const chemists = staff.filter(s => s.role === 'chemist');

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 md:p-8">
      
      {/* Navigation tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('beds')}
          className={`py-2.5 px-4 font-semibold text-sm rounded-t-lg transition cursor-pointer ${activeTab === 'beds' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          🛏️ Bed Grid Map
        </button>
        <button
          onClick={() => setActiveTab('patients')}
          className={`py-2.5 px-4 font-semibold text-sm rounded-t-lg transition cursor-pointer ${activeTab === 'patients' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          👥 Patient Admissions
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`py-2.5 px-4 font-semibold text-sm rounded-t-lg transition cursor-pointer ${activeTab === 'staff' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          🩺 Staff Work Shifts
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`py-2.5 px-4 font-semibold text-sm rounded-t-lg transition cursor-pointer ${activeTab === 'billing' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          💵 Hospital Invoicing
        </button>
      </div>

      {/* BED GRID VIEW */}
      {activeTab === 'beds' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Hospital Bed Occupancy Map</h2>
            <div className="flex gap-4 text-xs font-semibold">
              <span className="text-emerald-600">🟢 Available</span>
              <span className="text-rose-600">🔴 Occupied</span>
            </div>
          </div>

          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((floor) => {
              const floorBeds = beds.filter(b => b.floor === floor);
              return (
                <div key={floor} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <h4 className="font-bold text-slate-500 mb-2 uppercase tracking-wide text-xs">Floor {floor}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-3">
                    {floorBeds.map((bed) => (
                      <div
                        key={bed.bed_number}
                        className={`p-3 rounded-lg border text-center transition flex flex-col justify-center items-center aspect-square ${bed.is_occupied ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}
                      >
                        <span className="text-lg font-bold">B-{bed.bed_number}</span>
                        {bed.is_occupied ? (
                          <a
                            href={`#/profile/user/${bed.current_patient_id?._id}`}
                            className="text-[10px] mt-1 font-bold underline hover:text-indigo-600 truncate block w-full text-center"
                          >
                            {bed.current_patient_id?.full_name || 'View Profile'}
                          </a>
                        ) : (
                          <span className="text-[10px] mt-1 font-semibold opacity-85">Available</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PATIENTS REGISTRY & ADMISSION */}
      {activeTab === 'patients' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Admit Patient Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col h-fit">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Admit New Patient</h3>
            
            <form onSubmit={handleAdmitSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={admitForm.full_name}
                  onChange={(e) => setAdmitForm({ ...admitForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-1">Age</label>
                  <input
                    type="number"
                    value={admitForm.age}
                    onChange={(e) => setAdmitForm({ ...admitForm, age: e.target.value })}
                    className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-1">Gender</label>
                  <select
                    value={admitForm.gender}
                    onChange={(e) => setAdmitForm({ ...admitForm, gender: e.target.value })}
                    className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200 focus:border-indigo-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={admitForm.contact}
                  onChange={(e) => setAdmitForm({ ...admitForm, contact: e.target.value })}
                  placeholder="+91 "
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={admitForm.email}
                  onChange={(e) => setAdmitForm({ ...admitForm, email: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Login Password</label>
                <input
                  type="password"
                  value={admitForm.password}
                  onChange={(e) => setAdmitForm({ ...admitForm, password: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-1">Floor (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={admitForm.allocated_floor}
                    onChange={(e) => setAdmitForm({ ...admitForm, allocated_floor: e.target.value })}
                    className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-xs font-bold mb-1">Bed (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={admitForm.allocated_bed}
                    onChange={(e) => setAdmitForm({ ...admitForm, allocated_bed: e.target.value })}
                    className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {formError && <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg">{formError}</div>}
              {formSuccess && <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg">{formSuccess}</div>}

              <button type="submit" className="w-full text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg text-sm p-3 transition cursor-pointer">
                Admit & Provision Profile
              </button>
            </form>
          </div>

          {/* Patients Registry */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 lg:col-span-2 overflow-x-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Inpatient Registry</h3>
            <table className="min-w-full text-sm text-left text-slate-600">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Name (Click Profile)</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Bed Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((pat) => (
                  <tr key={pat._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold">
                      <a href={`#/profile/user/${pat._id}`} className="text-indigo-600 hover:text-indigo-800 underline">
                        {pat.full_name}
                      </a>
                    </td>
                    <td className="py-3 px-4">{pat.email}</td>
                    <td className="py-3 px-4 font-semibold">Floor {pat.patient_details?.allocated_floor} / Bed {pat.patient_details?.allocated_bed}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full font-bold ${pat.account_status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {pat.account_status === 'Active' ? 'Admitted' : 'Discharged'}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      {pat.account_status === 'Active' ? (
                        <>
                          <button
                            onClick={() => handleDischarge(pat._id)}
                            className="bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs font-bold py-1.5 px-3 rounded-lg transition cursor-pointer"
                          >
                            Discharge
                          </button>
                          <button
                            onClick={() => handleCompileBill(pat._id)}
                            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs font-bold py-1.5 px-3 rounded-lg transition cursor-pointer"
                          >
                            Compile Bill
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SHIFT REGISTRY & PERSONNEL ADDITION */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Add Staff form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col h-fit">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Provision Staff Account</h3>
            
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Role Type</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 border border-slate-200"
                >
                  <option value="doctor">Doctor</option>
                  <option value="staff">Staff Nurse</option>
                  <option value="peon">Peon orderly</option>
                  <option value="chemist">Chemist Pharmacist</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Duty Shift Tier</label>
                <select
                  value={staffForm.duty_shift}
                  onChange={(e) => setStaffForm({ ...staffForm, duty_shift: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 border border-slate-200"
                >
                  <option value="day">Day Shift</option>
                  <option value="night">Night Shift</option>
                  <option value="none">None (Peons/Chemists)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Qualification</label>
                <input
                  type="text"
                  value={staffForm.qualification}
                  onChange={(e) => setStaffForm({ ...staffForm, qualification: e.target.value })}
                  placeholder="e.g. MD Cardiology / B.Sc. Nursing"
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 border border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Assigned Department</label>
                <input
                  type="text"
                  value={staffForm.assigned_department}
                  onChange={(e) => setStaffForm({ ...staffForm, assigned_department: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 border border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={staffForm.contact_info}
                  onChange={(e) => setStaffForm({ ...staffForm, contact_info: e.target.value })}
                  placeholder="+91 "
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 border border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 border border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Login Password</label>
                <input
                  type="password"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 border border-slate-200"
                  required
                />
              </div>

              {staffError && <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg">{staffError}</div>}
              {staffSuccess && <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg">{staffSuccess}</div>}

              <button type="submit" className="w-full text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg text-sm p-3 transition cursor-pointer">
                Create Staff & Generate Profile
              </button>
            </form>
          </div>

          {/* Registries lists */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 lg:col-span-2 overflow-x-auto space-y-6">
            
            {/* Doctors */}
            <div>
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 text-sm mb-3">🩺 Medical Staff Doctors Registry</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 mb-2">🟢 Day Doctors</h4>
                  <ul className="space-y-1 text-xs">
                    {dayDoctors.map(d => (
                      <li key={d._id} className="p-2 bg-slate-50 border rounded-lg flex justify-between">
                        <a href={`#/profile/doctor/${d._id}`} className="font-semibold text-indigo-600 hover:underline">{d.full_name}</a>
                        <span className="text-[10px] text-slate-400 font-mono">{d.employee_id}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-700 mb-2">🌙 Night Doctors</h4>
                  <ul className="space-y-1 text-xs">
                    {nightDoctors.map(d => (
                      <li key={d._id} className="p-2 bg-slate-50 border rounded-lg flex justify-between">
                        <a href={`#/profile/doctor/${d._id}`} className="font-semibold text-indigo-600 hover:underline">{d.full_name}</a>
                        <span className="text-[10px] text-slate-400 font-mono">{d.employee_id}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Nurses/Staff */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 text-sm mb-3">👥 Nursing staff Registry</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="max-h-56 overflow-y-auto pr-1">
                  <h4 className="text-xs font-bold text-emerald-700 mb-2 sticky top-0 bg-white">🟢 Day Nurses</h4>
                  <ul className="space-y-1 text-xs">
                    {dayNurses.map(n => (
                      <li key={n._id} className="p-2 bg-slate-50 border rounded-lg flex justify-between">
                        <a href={`#/profile/staff/${n._id}`} className="font-semibold text-indigo-600 hover:underline">{n.full_name}</a>
                        <span className="text-slate-400">{n.employee_id}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="max-h-56 overflow-y-auto pr-1">
                  <h4 className="text-xs font-bold text-indigo-700 mb-2 sticky top-0 bg-white">🌙 Night Nurses</h4>
                  <ul className="space-y-1 text-xs">
                    {nightNurses.map(n => (
                      <li key={n._id} className="p-2 bg-slate-50 border rounded-lg flex justify-between">
                        <a href={`#/profile/staff/${n._id}`} className="font-semibold text-indigo-600 hover:underline">{n.full_name}</a>
                        <span className="text-slate-400">{n.employee_id}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Peons */}
            <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2">🏃 Messengers Peons</h4>
                <ul className="space-y-1 text-xs">
                  {peons.map(p => (
                    <li key={p._id} className="p-2 bg-slate-50 border rounded-lg flex justify-between">
                      <a href={`#/profile/peon/${p._id}`} className="font-semibold text-indigo-600 hover:underline">{p.full_name}</a>
                      <span className="text-[10px] text-slate-400 font-mono">{p.employee_id}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2">💊 Pharmacists chemists</h4>
                <ul className="space-y-1 text-xs">
                  {chemists.map(c => (
                    <li key={c._id} className="p-2 bg-slate-50 border rounded-lg flex justify-between">
                      <a href={`#/profile/chemist/${c._id}`} className="font-semibold text-indigo-600 hover:underline">{c.full_name}</a>
                      <span className="text-[10px] text-slate-400 font-mono">{c.employee_id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* BILLING MODULE */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 overflow-x-auto">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Patient Billing & PDF Invoicing</h2>
          
          <table className="min-w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Grand Total</th>
                <th className="py-3 px-4">Generated Date</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600">{bill.invoice_id}</td>
                  <td className="py-3 px-4">
                    <a href={`#/profile/user/${bill.patient_id?._id}`} className="font-semibold text-indigo-600 hover:underline block">
                      {bill.patient_id?.full_name || 'Discharged Patient'}
                    </a>
                    <div className="text-xs text-slate-400">{bill.patient_id?.email}</div>
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold">
                    Floor {bill.patient_id?.patient_details?.allocated_floor || 'N/A'} / Bed {bill.patient_id?.patient_details?.allocated_bed || 'N/A'}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">Rs. {bill.grand_total}</td>
                  <td className="py-3 px-4 text-slate-400">{new Date(bill.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <a
                      href={api.getInvoicePdfUrl(bill.invoice_id)}
                      download
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      ⬇️ Download PDF
                    </a>
                  </td>
                </tr>
              ))}
              {bills.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-slate-400">No invoices compiled yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
