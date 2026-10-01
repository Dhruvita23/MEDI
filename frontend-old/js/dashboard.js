/* js/dashboard.js — Role-based dashboard rendering */

const { role, name } = getSession();

/* ── Helpers ── */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.getElementById('modalBody').innerHTML = '';
}

function setContent(html) {
  document.getElementById('contentArea').innerHTML = html;
}

function setTitle(t) {
  document.getElementById('topbarTitle').textContent = t;
}

/* ── Role colour map ── */
const roleColors = {
  admin_staff: '#7c3aed', doctor: '#0d6efd',
  staff: '#0891b2', chemist: '#059669', user: '#d97706'
};

const roleLabels = {
  admin_staff: 'Admin Staff', doctor: 'Doctor',
  staff: 'Staff', chemist: 'Chemist', user: 'Patient'
};

/* ── Sidebar nav config per role ── */
const navConfig = {
  admin_staff: [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'beds', icon: '🛏️', label: 'Bed Grid' },
    { id: 'admit', icon: '➕', label: 'Admit Patient' },
    { id: 'patients', icon: '👥', label: 'Patients' },
    { id: 'orders', icon: '📋', label: 'All Orders' },
  ],
  doctor: [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'neworder', icon: '📝', label: 'New Order' },
    { id: 'orders', icon: '📋', label: 'My Orders' },
  ],
  staff: [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'neworder', icon: '📝', label: 'New Order' },
    { id: 'orders', icon: '📋', label: 'My Orders' },
  ],
  chemist: [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'orders', icon: '📋', label: 'All Orders' },
  ],
  user: [
    { id: 'overview', icon: '🏠', label: 'My Room' },
    { id: 'neworder', icon: '💊', label: 'Place Order' },
    { id: 'orders', icon: '📋', label: 'My Orders' },
  ],
};

/* ── Build sidebar ── */
function buildSidebar() {
  const chip = document.getElementById('roleChip');
  chip.textContent = roleLabels[role] || role;
  chip.style.background = roleColors[role] || '#0d6efd';

  document.getElementById('sidebarUser').innerHTML = `
    <div class="user-name">${name}</div>
    <span class="user-role" style="background:${roleColors[role]}">${roleLabels[role]}</span>
  `;

  const nav = document.getElementById('sidebarNav');
  const items = navConfig[role] || [];
  nav.innerHTML = items.map(item => `
    <div class="nav-item" id="nav-${item.id}" onclick="navigate('${item.id}')">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
    </div>
  `).join('');
}

let currentPage = '';
function navigate(page) {
  if (window.stopCamera) window.stopCamera();
  if (window.stopListening) window.stopListening();
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');

  const pages = {
    overview: renderOverview,
    beds: renderBeds,
    admit: renderAdmit,
    patients: renderPatients,
    orders: renderOrders,
    neworder: renderNewOrder,
  };

  if (pages[page]) pages[page]();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ============================================================
   OVERVIEW
   ============================================================ */
async function renderOverview() {
  setTitle('Overview');

  if (role === 'user') {
    renderPatientOverview();
    return;
  }

  setContent(`<div class="loading-screen"><div class="spinner-lg"></div><p>Loading...</p></div>`);

  try {
    const [beds, orders] = await Promise.all([
      role === 'admin_staff' || role === 'chemist' ? API.getBeds() : Promise.resolve([]),
      API.getOrders()
    ]);

    const totalBeds = beds.length;
    const occupiedBeds = beds.filter(b => b.is_occupied).length;
    const freeBeds = totalBeds - occupiedBeds;
    const pendingOrders = orders.filter(o => o.order_status === 'pending').length;
    const totalOrders = orders.length;

    setContent(`
      <div class="welcome-card">
        <div>
          <h2>Welcome back, ${name}!</h2>
          <p>${roleLabels[role]} &mdash; MEDIBOT Hospital System</p>
        </div>
        <div class="welcome-icon">🏥</div>
      </div>

      <div class="stats-grid">
        ${role === 'admin_staff' ? `
        <div class="stat-card">
          <div class="stat-icon">🛏️</div>
          <div><div class="stat-value">${totalBeds}</div><div class="stat-label">Total Beds</div></div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">✅</div>
          <div><div class="stat-value">${freeBeds}</div><div class="stat-label">Available Beds</div></div>
        </div>
        <div class="stat-card red">
          <div class="stat-icon">🔴</div>
          <div><div class="stat-value">${occupiedBeds}</div><div class="stat-label">Occupied Beds</div></div>
        </div>
        ` : ''}
        <div class="stat-card yellow">
          <div class="stat-icon">⏳</div>
          <div><div class="stat-value">${pendingOrders}</div><div class="stat-label">Pending Orders</div></div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon">📋</div>
          <div><div class="stat-value">${totalOrders}</div><div class="stat-label">Total Orders</div></div>
        </div>
      </div>

      ${orders.length > 0 ? `
      <div class="panel">
        <div class="panel-header"><h3>Recent Orders</h3></div>
        <div class="panel-body">
          <div class="table-wrap">${buildOrdersTable(orders.slice(0, 5), false)}</div>
        </div>
      </div>` : ''}
    `);
  } catch (err) {
    setContent(`<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`);
  }
}

/* ── Patient overview ── */
function renderPatientOverview() {
  const token = API.getToken();
  let floor = '?', bed = '?';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    floor = payload.allocated_floor;
    bed = payload.allocated_bed;
  } catch (e) { }

  setContent(`
    <div class="patient-info-card">
      <h3>Your Room Information</h3>
      <div class="patient-info-grid">
        <div class="patient-info-item">
          <div class="label">Floor</div>
          <div class="value">Floor ${floor}</div>
        </div>
        <div class="patient-info-item">
          <div class="label">Bed Number</div>
          <div class="value">Bed ${bed}</div>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🏥</div>
        <div><div class="stat-value">Floor ${floor}</div><div class="stat-label">Your Floor</div></div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">🛏️</div>
        <div><div class="stat-value">Bed ${bed}</div><div class="stat-label">Your Bed</div></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h3>Quick Actions</h3>
      </div>
      <div class="panel-body" style="display:flex;gap:12px;flex-wrap:wrap;">
        <button class="btn btn-solid-blue" onclick="navigate('neworder')">💊 Place New Order</button>
        <button class="btn btn-solid-green" onclick="navigate('orders')">📋 View My Orders</button>
      </div>
    </div>
  `);
}

/* ============================================================
   BED GRID (Admin)
   ============================================================ */
async function renderBeds() {
  setTitle('Bed Occupancy Grid');
  setContent(`<div class="loading-screen"><div class="spinner-lg"></div><p>Loading beds...</p></div>`);

  try {
    const beds = await API.getBeds();
    const byFloor = {};
    beds.forEach(b => {
      if (!byFloor[b.floor]) byFloor[b.floor] = [];
      byFloor[b.floor].push(b);
    });

    const occupied = beds.filter(b => b.is_occupied).length;
    const free = beds.length - occupied;

    let html = `
      <div class="stats-grid" style="margin-bottom:24px;">
        <div class="stat-card"><div class="stat-icon">🛏️</div>
          <div><div class="stat-value">${beds.length}</div><div class="stat-label">Total Beds</div></div></div>
        <div class="stat-card green"><div class="stat-icon">✅</div>
          <div><div class="stat-value">${free}</div><div class="stat-label">Available</div></div></div>
        <div class="stat-card red"><div class="stat-icon">🔴</div>
          <div><div class="stat-value">${occupied}</div><div class="stat-label">Occupied</div></div></div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <h3>Bed Map</h3>
          <div style="display:flex;gap:12px;font-size:13px;">
            <span style="color:#166534;">🟢 Free</span>
            <span style="color:#991b1b;">🔴 Occupied</span>
          </div>
        </div>
        <div class="panel-body">
    `;

    for (let f = 1; f <= 5; f++) {
      const floorBeds = byFloor[f] || [];
      html += `<div class="floor-section">
        <div class="floor-label">Floor ${f}</div>
        <div class="bed-grid">`;
      floorBeds.forEach(b => {
        const cls = b.is_occupied ? 'occupied' : 'free';
        const lbl = b.is_occupied ? 'Occupied' : 'Free';
        html += `<div class="bed-cell ${cls}" title="Floor ${b.floor} Bed ${b.bed_number} — ${lbl}">
          <span class="bed-num">${b.bed_number}</span>
          <span class="bed-lbl">${lbl}</span>
        </div>`;
      });
      html += `</div></div>`;
    }

    html += `</div></div>`;
    setContent(html);
  } catch (err) {
    setContent(`<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`);
  }
}

/* ============================================================
   ADMIT PATIENT (Admin)
   ============================================================ */
function renderAdmit() {
  setTitle('Admit New Patient');
  setContent(`
    <div class="panel" style="max-width:600px;">
      <div class="panel-header"><h3>Patient Admission Form</h3></div>
      <div class="panel-body">
        <form id="admitForm">
          <div class="form-grid">
            <div class="form-group form-full">
              <label>Full Name</label>
              <input type="text" id="a_name" placeholder="Patient full name" required/>
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" id="a_email" placeholder="patient@email.com" required/>
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="a_pass" placeholder="Set login password" required/>
            </div>
            <div class="form-group">
              <label>Allocated Floor (1–5)</label>
              <select id="a_floor" required>
                <option value="">Select floor</option>
                ${[1, 2, 3, 4, 5].map(f => `<option value="${f}">Floor ${f}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Allocated Bed (1–10)</label>
              <select id="a_bed" required>
                <option value="">Select bed</option>
                ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(b => `<option value="${b}">Bed ${b}</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="admitError" class="error-msg hidden"></div>
          <div style="margin-top:8px;">
            <button type="submit" class="btn btn-solid-blue" style="width:100%;padding:12px;">
              Admit Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  `);

  document.getElementById('admitForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('admitError');
    errEl.classList.add('hidden');
    const payload = {
      full_name: document.getElementById('a_name').value.trim(),
      email: document.getElementById('a_email').value.trim(),
      password: document.getElementById('a_pass').value,
      allocated_floor: parseInt(document.getElementById('a_floor').value),
      allocated_bed: parseInt(document.getElementById('a_bed').value),
    };
    try {
      const res = await API.admitPatient(payload);
      toast(`Patient admitted! ID: ${res.patient_id}`, 'success');
      e.target.reset();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });
}

/* ============================================================
   PATIENTS LIST (Admin)
   ============================================================ */
async function renderPatients() {
  setTitle('Patients');
  setContent(`<div class="loading-screen"><div class="spinner-lg"></div><p>Loading patients...</p></div>`);

  try {
    const orders = await API.getOrders();
    // We use the orders endpoint to get patient IDs, but we need beds for patient list
    // Show a message to use admit/toggle via bed grid
    const beds = await API.getBeds();
    const occupied = beds.filter(b => b.is_occupied);

    if (occupied.length === 0) {
      setContent(`<div class="empty-state"><div class="empty-icon">👥</div><p>No patients currently admitted.</p>
        <button class="btn btn-solid-blue" style="margin-top:16px;" onclick="navigate('admit')">Admit First Patient</button></div>`);
      return;
    }

    const rows = occupied.map(b => `
      <tr>
        <td><strong>${b.current_patient_id?.slice(-8) || 'N/A'}</strong></td>
        <td>Floor ${b.floor}</td>
        <td>Bed ${b.bed_number}</td>
        <td><span class="status-badge active">Active</span></td>
        <td>
          <button class="btn btn-sm btn-red" onclick="dischargePatient('${b.current_patient_id}')">
            Discharge
          </button>
        </td>
      </tr>
    `).join('');

    setContent(`
      <div class="panel">
        <div class="panel-header">
          <h3>Admitted Patients (${occupied.length})</h3>
          <button class="btn btn-solid-blue btn-sm" onclick="navigate('admit')">+ Admit New</button>
        </div>
        <div class="panel-body">
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th>Patient ID</th><th>Floor</th><th>Bed</th><th>Status</th><th>Action</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  } catch (err) {
    setContent(`<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`);
  }
}

async function dischargePatient(patientId) {
  if (!confirm('Discharge this patient? Their bed will be freed.')) return;
  try {
    const res = await API.toggleStatus(patientId);
    toast(res.message, 'success');
    renderPatients();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ============================================================
   ORDERS LIST
   ============================================================ */
async function renderOrders() {
  setTitle('Orders');
  setContent(`<div class="loading-screen"><div class="spinner-lg"></div><p>Loading orders...</p></div>`);

  try {
    const orders = await API.getOrders();
    const canUpdate = role === 'admin_staff' || role === 'chemist';

    if (orders.length === 0) {
      setContent(`<div class="empty-state"><div class="empty-icon">📋</div><p>No orders found.</p></div>`);
      return;
    }

    setContent(`
      <div class="panel">
        <div class="panel-header">
          <h3>Orders (${orders.length})</h3>
          ${role === 'doctor' || role === 'staff' || role === 'user' ?
        `<button class="btn btn-solid-blue btn-sm" onclick="navigate('neworder')">+ New Order</button>` : ''}
        </div>
        <div class="panel-body">
          <div class="table-wrap">${buildOrdersTable(orders, canUpdate)}</div>
        </div>
      </div>
    `);
  } catch (err) {
    setContent(`<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`);
  }
}

function buildOrdersTable(orders, canUpdate) {
  const rows = orders.map(o => `
    <tr>
      <td><code style="font-size:11px;">${o.order_id?.slice(0, 8)}...</code></td>
      <td>Floor ${o.target_floor} / Bed ${o.target_bed}</td>
      <td>${o.items_list?.join(', ') || '—'}</td>
      <td>
        ${o.prescription_image_url ? 
          `<a href="#" onclick="event.preventDefault(); window.viewPrescription('${o.prescription_image_url}')" class="status-badge ${o.order_type === 'prescription_upload' ? 'processing' : 'pending'}" style="text-decoration:none; display:inline-block; cursor:pointer;">
            🖼️ View
           </a>` : 
          `<span class="status-badge" style="background:#f1f5f9; color:#94a3b8; font-weight:normal;">None</span>`
        }
      </td>
      <td><span class="status-badge ${o.order_status}">${o.order_status}</span></td>
      <td>${o.ordered_by_role}</td>
      ${canUpdate ? `<td>
        <select class="form-group" style="padding:4px 8px;font-size:12px;border-radius:6px;border:1px solid #e2e8f0;"
          onchange="updateStatus('${o.id}', this.value)">
          <option value="">Update...</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </td>` : ''}
    </tr>
  `).join('');

  return `<table>
    <thead><tr>
      <th>Order ID</th><th>Destination</th><th>Items</th>
      <th>Type</th><th>Status</th><th>By</th>
      ${canUpdate ? '<th>Update</th>' : ''}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

async function updateStatus(orderId, newStatus) {
  if (!newStatus) return;
  try {
    await API.updateOrderStatus(orderId, newStatus);
    toast(`Order updated to "${newStatus}"`, 'success');
    renderOrders();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ============================================================
   NEW ORDER
   ============================================================ */
function renderNewOrder() {
  setTitle('Place New Order');
  const isPatient = role === 'user';

  let token = API.getToken();
  let floor = '', bed = '';
  if (isPatient) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      floor = payload.allocated_floor;
      bed = payload.allocated_bed;
    } catch (e) { }
  }

  setContent(`
    <div class="panel" style="max-width:600px;">
      <div class="panel-header">
        <h3>${isPatient ? 'Place Your Order' : 'Create Staff Order'}</h3>
      </div>
      <div class="panel-body">
        ${isPatient ? `
          <div class="patient-info-card" style="margin-bottom:20px;">
            <h3>Your Location (auto-detected)</h3>
            <div class="patient-info-grid">
              <div class="patient-info-item">
                <div class="label">Floor</div><div class="value">Floor ${floor}</div>
              </div>
              <div class="patient-info-item">
                <div class="label">Bed</div><div class="value">Bed ${bed}</div>
              </div>
            </div>
          </div>
        ` : `
          <div class="form-grid">
            <div class="form-group">
              <label>Target Floor (1–5)</label>
              <select id="o_floor" required>
                <option value="">Select floor</option>
                ${[1, 2, 3, 4, 5].map(f => `<option value="${f}">Floor ${f}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Target Bed (1–10)</label>
              <select id="o_bed" required>
                <option value="">Select bed</option>
                ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(b => `<option value="${b}">Bed ${b}</option>`).join('')}
              </select>
            </div>
          </div>
        `}

        <div class="form-group">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <label style="margin-bottom:0;">Items List <span style="color:#94a3b8;font-weight:400;">(press Enter to add)</span></label>
            <button class="btn btn-outline" type="button" id="btnListen" onclick="window.startListening()" style="padding:2px 8px; font-size:12px; display:flex; align-items:center; gap:4px; white-space:nowrap;">
              🎙️ Listen
            </button>
          </div>
          <div class="tags-input-wrap" id="tagsWrap" onclick="document.getElementById('tagInput').focus()">
            <input class="tags-input" id="tagInput" placeholder="Type item and press Enter..."/>
          </div>
          <input type="hidden" id="itemsHidden"/>
        </div>

        <div class="form-group">
          <label>Prescription Image <span style="color:#94a3b8;font-weight:400;">(URL or Capture)</span></label>
          <div style="display:flex; gap:8px;">
            <input type="text" id="o_img" placeholder="https://... or Captured Image Data" oninput="window.handleUrlInput(this.value)" style="flex:1;"/>
            <button class="btn btn-outline" type="button" onclick="window.startCamera()" style="display:flex; align-items:center; gap:6px; white-space:nowrap;">
              📷 Take Photo
            </button>
          </div>
          <div id="cameraContainer" class="hidden" style="margin-top:10px; border:1.5px solid #cbd5e1; border-radius:8px; overflow:hidden; background:#000; display:flex; flex-direction:column; align-items:center; position:relative;">
            <video id="videoFeed" autoplay playsinline style="width:100%; max-height:220px; object-fit:cover;"></video>
            <div style="padding:8px; display:flex; gap:12px; justify-content:center; width:100%; background:rgba(0,0,0,0.6); position:absolute; bottom:0; left:0; right:0;">
              <button class="btn btn-solid-green" type="button" onclick="window.capturePhoto()" style="padding:6px 12px; font-size:12px;">📸 Capture</button>
              <button class="btn btn-solid-red" type="button" onclick="window.stopCamera()" style="padding:6px 12px; font-size:12px;">Cancel</button>
            </div>
          </div>
          <div id="previewContainer" class="hidden" style="margin-top:10px; display:flex; align-items:center; gap:12px;">
            <img id="prescriptionPreview" src="" style="max-height:80px; border-radius:6px; border:1px solid #cbd5e1;"/>
            <button class="btn btn-outline-red" type="button" onclick="window.removePhoto()" style="padding:4px 8px; font-size:12px;">Remove Image</button>
          </div>
        </div>

        <div id="orderError" class="error-msg hidden"></div>
        <button class="btn btn-solid-blue" style="width:100%;padding:12px;margin-top:4px;" onclick="submitOrder()">
          Submit Order
        </button>
      </div>
    </div>
  `);

  /* Tags input logic */
  const items = [];
  const tagInput = document.getElementById('tagInput');
  const tagsWrap = document.getElementById('tagsWrap');

  tagInput.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.value.trim()) {
      e.preventDefault();
      const val = tagInput.value.trim();
      items.push(val);
      const tag = document.createElement('span');
      tag.className = 'tag-item';
      tag.innerHTML = `${val}<span class="tag-remove" onclick="this.parentElement.remove();items.splice(items.indexOf('${val}'),1)">×</span>`;
      tagsWrap.insertBefore(tag, tagInput);
      tagInput.value = '';
    }
  });

  window._getOrderItems = () => items;
}

async function submitOrder() {
  const errEl = document.getElementById('orderError');
  errEl.classList.add('hidden');
  const isPatient = role === 'user';
  const items = window._getOrderItems ? window._getOrderItems() : [];

  if (items.length === 0) {
    errEl.textContent = 'Please add at least one item.';
    errEl.classList.remove('hidden');
    return;
  }

  const imgUrl = document.getElementById('o_img')?.value.trim() || null;

  try {
    if (isPatient) {
      await API.patientOrder({
        items_list: items,
        prescription_image_url: imgUrl || null,
      });
    } else {
      const floor = parseInt(document.getElementById('o_floor')?.value);
      const bed = parseInt(document.getElementById('o_bed')?.value);
      if (!floor || !bed) {
        errEl.textContent = 'Please select target floor and bed.';
        errEl.classList.remove('hidden');
        return;
      }
      await API.staffOrder({
        target_floor: floor,
        target_bed: bed,
        items_list: items,
        order_type: imgUrl ? 'prescription_upload' : 'text_input',
        prescription_image_url: imgUrl || null,
      });
    }
    toast('Order placed successfully!', 'success');
    navigate('orders');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

/* ── Camera Capture Helpers ── */
window.handleUrlInput = (val) => {
  const previewImg = document.getElementById('prescriptionPreview');
  const previewContainer = document.getElementById('previewContainer');
  if (val.trim()) {
    previewImg.src = val.trim();
    previewContainer.classList.remove('hidden');
  } else {
    previewContainer.classList.add('hidden');
  }
};

window.viewPrescription = (url) => {
  openModal('Prescription Image', `<img src="${url}" style="width:100%; max-height:75vh; object-fit:contain; border-radius:8px;" />`);
};

window.startCamera = async () => {
  const video = document.getElementById('videoFeed');
  const container = document.getElementById('cameraContainer');
  const preview = document.getElementById('previewContainer');
  const errEl = document.getElementById('orderError');
  if (errEl) errEl.classList.add('hidden');
  if (preview) preview.classList.add('hidden');
  if (container) container.classList.remove('hidden');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    window.cameraStream = stream;
    if (video) video.srcObject = stream;
  } catch (err) {
    if (errEl) {
      errEl.textContent = 'Camera access denied or unavailable: ' + err.message;
      errEl.classList.remove('hidden');
    }
    if (container) container.classList.add('hidden');
  }
};

window.stopCamera = () => {
  if (window.cameraStream) {
    window.cameraStream.getTracks().forEach(track => track.stop());
    window.cameraStream = null;
  }
  const container = document.getElementById('cameraContainer');
  if (container) container.classList.add('hidden');
};

window.capturePhoto = () => {
  const video = document.getElementById('videoFeed');
  if (!video) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  const dataUrl = canvas.toDataURL('image/jpeg');
  const imgInput = document.getElementById('o_img');
  if (imgInput) imgInput.value = dataUrl;
  
  window.stopCamera();
  
  const previewImg = document.getElementById('prescriptionPreview');
  const previewContainer = document.getElementById('previewContainer');
  if (previewImg) previewImg.src = dataUrl;
  if (previewContainer) previewContainer.classList.remove('hidden');
};

window.removePhoto = () => {
  const imgInput = document.getElementById('o_img');
  if (imgInput) imgInput.value = '';
  const previewContainer = document.getElementById('previewContainer');
  if (previewContainer) previewContainer.classList.add('hidden');
};

/* ── Speech Recognition Helpers ── */
window.startListening = () => {
  const btn = document.getElementById('btnListen');
  const tagInput = document.getElementById('tagInput');
  const errEl = document.getElementById('orderError');
  
  if (errEl) errEl.classList.add('hidden');
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (errEl) {
      errEl.textContent = 'Speech recognition is not supported in this browser. Please try Chrome or Edge.';
      errEl.classList.remove('hidden');
    }
    return;
  }
  
  if (window.isListening) {
    window.stopListening();
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  window.recognitionInstance = recognition;
  window.isListening = true;
  
  btn.innerHTML = '🛑 Stop';
  btn.style.background = '#fee2e2';
  btn.style.color = '#dc2626';
  btn.style.borderColor = '#fca5a5';
  
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    toast(`Recognized: "${text}"`, 'success');
    
    // Split by commas, "and", "plus"
    const words = text.split(/,?\s+and\s+|,\s*|\s+plus\s+/i);
    words.forEach(word => {
      const trimmed = word.trim();
      if (trimmed) {
        const currentItems = window._getOrderItems ? window._getOrderItems() : [];
        if (!currentItems.includes(trimmed)) {
          currentItems.push(trimmed);
          const tagsWrap = document.getElementById('tagsWrap');
          const tag = document.createElement('span');
          tag.className = 'tag-item';
          tag.innerHTML = `${trimmed}<span class="tag-remove" onclick="this.parentElement.remove();window._getOrderItems().splice(window._getOrderItems().indexOf('${trimmed}'),1)">×</span>`;
          tagsWrap.insertBefore(tag, tagInput);
        }
      }
    });
  };
  
  recognition.onerror = (event) => {
    if (event.error !== 'no-speech') {
      if (errEl) {
        errEl.textContent = 'Speech Recognition error: ' + event.error;
        errEl.classList.remove('hidden');
      }
    }
    window.stopListening();
  };
  
  recognition.onend = () => {
    window.stopListening();
  };
  
  recognition.start();
};

window.stopListening = () => {
  window.isListening = false;
  const btn = document.getElementById('btnListen');
  if (btn) {
    btn.innerHTML = '🎙️ Listen';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
  }
  if (window.recognitionInstance) {
    try {
      window.recognitionInstance.stop();
    } catch(e) {}
    window.recognitionInstance = null;
  }
};

/* ============================================================
   INIT
   ============================================================ */
buildSidebar();
const firstPage = (navConfig[role] || [])[0]?.id || 'overview';
navigate(firstPage);
