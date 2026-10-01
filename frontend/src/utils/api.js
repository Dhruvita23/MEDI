const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('medibot_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  const text = await res.text();
  let json = null;
  try {
    if (text) json = JSON.parse(text);
  } catch (e) {}

  if (!res.ok) {
    throw new Error(json?.detail || text || `Error: ${res.status} ${res.statusText}`);
  }
  return json;
};

export const api = {
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  getPatients: async () => {
    const res = await fetch(`${API_BASE}/admin/patients`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getStaff: async () => {
    const res = await fetch(`${API_BASE}/admin/staff`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getBeds: async () => {
    const res = await fetch(`${API_BASE}/admin/beds`, { headers: getHeaders() });
    return handleResponse(res);
  },

  admitPatient: async (payload) => {
    const res = await fetch(`${API_BASE}/admin/admit-patient`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  dischargePatient: async (patientId) => {
    const res = await fetch(`${API_BASE}/admin/discharge-patient/${patientId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getBilling: async () => {
    const res = await fetch(`${API_BASE}/admin/billing`, { headers: getHeaders() });
    return handleResponse(res);
  },

  compileBilling: async (patientId) => {
    const res = await fetch(`${API_BASE}/admin/billing/compile/${patientId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getInvoicePdfUrl: (invoiceId) => {
    return `${API_BASE}/admin/billing/pdf/${invoiceId}?token=${localStorage.getItem('medibot_token')}`;
  },

  placePatientOrder: async (payload) => {
    const res = await fetch(`${API_BASE}/orders/patient`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  placeStaffOrder: async (payload) => {
    const res = await fetch(`${API_BASE}/orders/staff`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  getOrders: async () => {
    const res = await fetch(`${API_BASE}/orders`, { headers: getHeaders() });
    return handleResponse(res);
  },

  submitChemistCalculation: async (payload) => {
    const res = await fetch(`${API_BASE}/orders/chemist/calculate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  triggerCallAlert: async (payload) => {
    const res = await fetch(`${API_BASE}/alerts/call`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  getActiveAlerts: async () => {
    const res = await fetch(`${API_BASE}/alerts/active`, { headers: getHeaders() });
    return handleResponse(res);
  },

  resolveAlert: async (alertId) => {
    const res = await fetch(`${API_BASE}/alerts/resolve/${alertId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};
