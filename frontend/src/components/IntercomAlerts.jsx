import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { api } from '../utils/api';

export default function IntercomAlerts({ currentUser }) {
  const [alerts, setAlerts] = useState([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpDetails, setHelpDetails] = useState({
    floor: '',
    bed: '',
    message: ''
  });

  const role = currentUser.role;

  useEffect(() => {
    fetchActiveAlerts();

    // Establish WebSocket Connection
    const socket = io();
    
    socket.on('connect', () => {
      console.log('[Socket] Connected to server.');
    });

    socket.on('new_alert', (newAlert) => {
      // Add if not already present
      setAlerts(prev => {
        if (prev.some(a => a.id === newAlert.id || a._id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });
      // Play synthetic alert sound for all staff, doctors, and peons
      if (role !== 'user') {
        playAlertSound();
      }
    });

    socket.on('resolve_alert', (data) => {
      setAlerts(prev => prev.filter(a => (a._id || a.id) !== data.id));
    });

    return () => {
      socket.disconnect();
    };
  }, [role]);

  const fetchActiveAlerts = async () => {
    try {
      const data = await api.getActiveAlerts();
      setAlerts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}
  };

  // Patient triggering general NEED HELP alert
  const handlePatientHelp = async () => {
    const floor = currentUser.allocated_floor;
    const bed = currentUser.allocated_bed;
    if (!floor || !bed) {
      alert('Your inpatient floor or bed was not found. Please contact Admin.');
      return;
    }

    try {
      await api.triggerCallAlert({
        target_role: 'staff', // Routed to Staff/Nurses by default
        floor,
        bed,
        message: `EMERGENCY HELP REQUEST: Patient needs assistance immediately!`
      });
      alert('Emergency Help Alert has been broadcast to all shift stations.');
    } catch (err) {
      alert(err.message);
    }
  };

  // Doctor / Staff opening modal to trigger HELP alert
  const openHelpModal = () => {
    setHelpDetails({
      floor: '',
      bed: '',
      message: ''
    });
    setShowHelpModal(true);
  };

  const handleHelpSubmit = async (e) => {
    e.preventDefault();
    try {
      // Broadcast alerts targeting nurses (staff), doctors, or peons
      await api.triggerCallAlert({
        target_role: role === 'doctor' ? 'staff' : 'doctor', // Doctors ping staff, Staff pings doctors
        floor: parseInt(helpDetails.floor),
        bed: parseInt(helpDetails.bed),
        message: helpDetails.message || `URGENT HELP NEEDED: Action requested by ${role.toUpperCase()}`
      });
      setShowHelpModal(false);
      alert('Help Request Broadcasted.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await api.resolveAlert(alertId);
      fetchActiveAlerts();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* NEED HELP ACTION BUTTON PANEL */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-white text-center shadow-lg">
        <h3 className="text-md font-bold mb-3 uppercase tracking-wider">Intercom Emergency Signaling</h3>
        {role === 'user' ? (
          <div>
            <p className="text-slate-400 text-xs mb-4">Click below to alert all nurses and medical personnel on duty immediately.</p>
            <button
              onClick={handlePatientHelp}
              className="bg-red-600 hover:bg-red-700 font-extrabold text-lg py-4 px-8 rounded-xl transition shadow-lg inline-flex items-center gap-2 cursor-pointer w-full max-w-sm justify-center select-none animate-pulse"
            >
              ⚠️ NEED HELP
            </button>
          </div>
        ) : (
          <div>
            <p className="text-slate-400 text-xs mb-4">Broadcast a location-based help request to coordination centers.</p>
            <button
              onClick={openHelpModal}
              className="bg-red-600 hover:bg-red-700 font-extrabold text-sm py-3 px-6 rounded-lg transition shadow-md inline-flex items-center gap-1.5 cursor-pointer select-none"
            >
              ⚠️ NEED HELP
            </button>
          </div>
        )}
      </div>

      {/* DYNAMIC FLASHING HELP ALERTS GRID FOR GENERAL DUTY PERSONNEL */}
      {role !== 'user' && alerts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 animate-pulse">
          <h3 className="text-red-800 font-extrabold text-lg mb-4 flex items-center gap-2">
            <span>🚨 ACTIVE HELP ALERTS</span>
            <span className="text-xs bg-red-800 text-white py-0.5 px-2 rounded-full font-bold">
              {alerts.length}
            </span>
          </h3>

          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert._id || alert.id}
                className="bg-white border border-red-200 rounded-lg p-4 flex justify-between items-center shadow-md text-slate-800"
              >
                <div>
                  <div className="text-sm font-extrabold text-red-700">
                    Floor {alert.floor} / Bed {alert.bed}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 font-semibold">{alert.message}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Logged: {new Date(alert.createdAt || Date.now()).toLocaleTimeString()}
                  </div>
                </div>
                <button
                  onClick={() => handleResolve(alert._id || alert.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-4 rounded-lg transition cursor-pointer"
                >
                  Resolve Alert
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HELP POPUP MODAL (Location input for Staff/Doctor) */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full max-w-md text-slate-800">
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wide text-red-700 flex items-center gap-1.5">
              <span>⚠️</span> Trigger Help Broadcast
            </h3>
            
            <form onSubmit={handleHelpSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Target Floor (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={helpDetails.floor}
                  onChange={(e) => setHelpDetails({ ...helpDetails, floor: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Target Bed/Room Location (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={helpDetails.bed}
                  onChange={(e) => setHelpDetails({ ...helpDetails, bed: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-bold mb-1">Help Note</label>
                <textarea
                  value={helpDetails.message}
                  onChange={(e) => setHelpDetails({ ...helpDetails, message: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200 h-20 resize-none"
                  placeholder="Describe what help is needed..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-lg transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg transition text-xs"
                >
                  Broadcast Help
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
