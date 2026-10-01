import React, { useState, useRef } from 'react';
import IntercomAlerts from './IntercomAlerts';
import { api } from '../utils/api';

export default function PatientDashboard({ currentUser }) {
  const [items, setItems] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Items Tag input handler
  const handleTagKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim();
      if (!items.includes(val)) {
        setItems([...items, val]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setItems(items.filter(item => item !== tag));
  };

  // Camera integration
  const startCamera = async () => {
    setOrderError('');
    setCapturedImage(null);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setOrderError('Camera access denied or unavailable: ' + err.message);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
    setImgUrl(dataUrl);
    stopCamera();
  };

  const removePhoto = () => {
    setCapturedImage(null);
    setImgUrl('');
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setOrderError('');
    setOrderSuccess('');

    if (items.length === 0 && !imgUrl) {
      setOrderError('Please list at least one item or upload a prescription.');
      return;
    }

    try {
      const payload = {
        items_list: items,
        prescription_image_url: imgUrl || null
      };
      await api.placePatientOrder(payload);
      setOrderSuccess('Order placed successfully! Forwarded to Pharmacy Chemist queue.');
      setItems([]);
      setImgUrl('');
      setCapturedImage(null);
    } catch (err) {
      setOrderError(err.message || 'Error placing order.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Operations column */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Welcome card */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white rounded-xl shadow-sm p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Welcome, {currentUser.full_name}!</h2>
            <p className="text-xs text-amber-200 mt-1 font-semibold uppercase tracking-wider">
              Room Location: Floor {currentUser.allocated_floor} / Bed {currentUser.allocated_bed}
            </p>
          </div>
          <span className="text-4xl">🏥</span>
        </div>

        {/* Emergency intercom flasher */}
        <IntercomAlerts currentUser={currentUser} />

        {/* Order Intake Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
          <h3 className="text-lg font-bold mb-4">Request Pharmacy & Medical Shop Order</h3>

          <form onSubmit={handleOrderSubmit} className="space-y-4">
            
            {/* Tags items list */}
            <div>
              <label className="block text-slate-600 text-xs font-bold mb-2">Items List (Press Enter to add)</label>
              <div className="flex flex-wrap gap-2 p-2 border border-slate-200 rounded-lg bg-slate-50 min-h-12 items-center">
                {items.map((item, idx) => (
                  <span key={idx} className="bg-indigo-100 text-indigo-800 text-xs font-bold py-1 px-2.5 rounded-full flex items-center gap-1.5">
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(item)}
                      className="text-indigo-600 hover:text-indigo-800 font-extrabold text-sm"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="bg-transparent text-sm outline-none flex-1 min-w-28 text-slate-800"
                  placeholder="Type item and press Enter..."
                />
              </div>
            </div>

            {/* Prescription Attachment (URL or Camera) */}
            <div>
              <label className="block text-slate-600 text-xs font-bold mb-2">Prescription Image (URL or Camera Capture)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imgUrl}
                  onChange={(e) => setImgUrl(e.target.value)}
                  placeholder="https://... or Captured Image Data"
                  className="flex-1 bg-slate-50 text-slate-800 text-sm rounded-lg p-2.5 outline-none border border-slate-200 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={cameraActive ? stopCamera : startCamera}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition whitespace-nowrap"
                >
                  {cameraActive ? 'Stop Camera' : '📷 Take Photo'}
                </button>
              </div>

              {/* Camera Feed Video box */}
              {cameraActive && (
                <div className="mt-4 border border-slate-300 rounded-xl overflow-hidden bg-black relative flex flex-col items-center">
                  <video ref={videoRef} autoPlay playsInline className="w-full max-h-60 object-cover"></video>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60 flex justify-center gap-4">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition"
                    >
                      📸 Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Image Preview box */}
              {capturedImage && (
                <div className="mt-4 flex items-center gap-4 border border-slate-100 p-3 rounded-lg bg-slate-50 w-fit">
                  <img src={capturedImage} alt="Captured Prescription" className="max-h-20 border border-slate-200 rounded-md" />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs font-bold py-1.5 px-3 rounded-lg transition"
                  >
                    Remove Photo
                  </button>
                </div>
              )}

            </div>

            {orderError && <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg">{orderError}</div>}
            {orderSuccess && <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg">{orderSuccess}</div>}

            <button
              type="submit"
              className="w-full text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg text-sm p-3 transition"
            >
              Submit Order Request
            </button>

          </form>

        </div>

      </div>

      {/* Info Column */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
          <h3 className="text-md font-bold mb-3 border-b border-slate-100 pb-2">Ward Intercom Guideline</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your bed and floor locations are automatically read when trigger emergency alerts.
            This ensures immediate response times from doctors and nursing staff.
          </p>
        </div>
      </div>

    </div>
  );
}
