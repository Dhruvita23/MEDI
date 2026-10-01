import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function ChemistDashboard() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Compiled items list for calculations
  const [items, setItems] = useState([
    { name: '', price: '' }
  ]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCalculation = (order) => {
    setSelectedOrder(order);
    // Pre-populate items with empty row or map over text items if text order
    if (order.items_list && order.items_list.length > 0) {
      setItems(order.items_list.map(name => ({ name, price: '' })));
    } else {
      setItems([{ name: '', price: '' }]);
    }
  };

  const handleAddItemRow = () => {
    setItems([...items, { name: '', price: '' }]);
  };

  const handleRemoveItemRow = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...items];
    updated[idx][field] = val;
    setItems(updated);
  };

  const handleCalculateSubmit = async (e) => {
    e.preventDefault();
    // Validate inputs
    const validItems = items.filter(item => item.name.trim() !== '' && item.price !== '');
    if (validItems.length === 0) {
      alert('Please add at least one item with a name and price.');
      return;
    }

    try {
      const payload = {
        order_id: selectedOrder.order_id,
        items: validItems.map(item => ({
          name: item.name,
          price: parseFloat(item.price)
        }))
      };

      const res = await api.submitChemistCalculation(payload);
      alert(res.message);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      alert(err.message || 'Error processing calculation.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Orders Queue List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 lg:col-span-2 overflow-x-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Pharmacy Order Intake Queue</h2>
        
        <table className="min-w-full text-sm text-left text-slate-600">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="py-3 px-4">Order ID</th>
              <th className="py-3 px-4">Patient Location</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Order Status</th>
              <th className="py-3 px-4">Subtotal</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 font-mono font-semibold text-slate-700">{o.order_id.slice(0, 8)}...</td>
                <td className="py-3 px-4 font-semibold">
                  {o.patient_id?.full_name || 'Discharged'}
                  <div className="text-[10px] text-slate-400">
                    Floor {o.patient_id?.patient_details?.allocated_floor || 'N/A'} / Bed {o.patient_id?.patient_details?.allocated_bed || 'N/A'}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${o.order_type === 'prescription_upload' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                    {o.order_type === 'prescription_upload' ? '📸 Prescription' : '📝 Text List'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${o.order_status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                    {o.order_status}
                  </span>
                </td>
                <td className="py-3 px-4 font-bold">Rs. {o.subtotal || 0}</td>
                <td className="py-3 px-4">
                  {o.order_status === 'pending' || o.order_status === 'processing' ? (
                    <button
                      onClick={() => handleOpenCalculation(o)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg transition"
                    >
                      ✏️ Process
                    </button>
                  ) : (
                    <span className="text-slate-400 text-xs">Processed</span>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-slate-400">No pharmacy orders in queue.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 2. Side Calculation Workspace */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
        {selectedOrder ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Process Calculation</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <div className="mb-4 text-xs bg-slate-50 border border-slate-100 rounded-lg p-3 text-slate-600 space-y-1">
              <div><span className="font-bold">Patient:</span> {selectedOrder.patient_id?.full_name || 'Discharged'}</div>
              <div><span className="font-bold">Location:</span> Floor {selectedOrder.patient_id?.patient_details?.allocated_floor || 'N/A'} / Bed {selectedOrder.patient_id?.patient_details?.allocated_bed || 'N/A'}</div>
              <div><span className="font-bold">Order ID:</span> {selectedOrder.order_id}</div>
            </div>

            {selectedOrder.order_type === 'prescription_upload' && selectedOrder.prescription_image_url && (
              <div className="mb-4">
                <label className="block text-slate-600 text-xs font-bold mb-1">Prescription Image</label>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 bg-slate-50">
                  <img
                    src={selectedOrder.prescription_image_url}
                    alt="Prescription"
                    className="w-full h-full object-contain cursor-zoom-in"
                    onClick={() => {
                      // Simple browser window popup for viewing large image
                      const w = window.open();
                      w.document.write(`<img src="${selectedOrder.prescription_image_url}" style="max-width:100%; height:auto;" />`);
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Click image to enlarge/zoom.</span>
              </div>
            )}

            <form onSubmit={handleCalculateSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-600 text-xs font-bold mb-2">Itemized Prices</label>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.name}
                        placeholder="Medicine Name"
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className="flex-2 bg-slate-50 text-slate-800 text-xs rounded-lg p-2 outline-none border border-slate-200 focus:border-indigo-500"
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        value={item.price}
                        placeholder="Price"
                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                        className="flex-1 bg-slate-50 text-slate-800 text-xs rounded-lg p-2 outline-none border border-slate-200 focus:border-indigo-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={items.length === 1}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 text-lg font-bold px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="text-indigo-600 hover:text-indigo-700 text-xs font-bold mt-2 inline-flex items-center gap-1"
                >
                  ➕ Add Row
                </button>
              </div>

              <button type="submit" className="w-full text-white bg-emerald-600 hover:bg-emerald-700 font-bold rounded-lg text-sm p-3 transition mt-4">
                Submit Order & Calculate
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
            <span className="text-4xl mb-2">💊</span>
            <p className="text-xs">Select an incoming order card from the queue to start calculations.</p>
          </div>
        )}
      </div>

    </div>
  );
}
