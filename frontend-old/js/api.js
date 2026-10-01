/* js/api.js — All backend API calls */

const API_BASE = 'http://127.0.0.1:8000/api'; // Ensure this matches your backend URL

function getToken() {
  return localStorage.getItem('medibot_token');
}

async function apiCall(method, path, body = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const opts = {
    method,
    headers,
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(API_BASE + path, opts);
  const responseText = await res.text(); // Read body ONCE as text

  let responseJson = null;
  try {
    if (responseText) { // Only try to parse if there's text
      responseJson = JSON.parse(responseText);
    }
  } catch (e) {
    // If parsing fails, responseJson remains null.
    // This means the response was not valid JSON.
  }

  if (!res.ok) {
    // If the response was not OK, throw an error.
    // Prioritize 'detail' from JSON, then raw text, then a generic message.
    throw new Error(responseJson?.detail || responseText || `Server error: ${res.status} ${res.statusText}`);
  }

  // If response was OK (res.ok is true)
  if (res.status === 204) {
    return {}; // No content, return empty object
  }

  // For other successful responses (e.g., 200 OK), we expect JSON.
  if (responseJson) {
    return responseJson;
  } else {
    // This case means res.ok was true, but the response was not 204 and not valid JSON.
    // This is an unexpected scenario for an API designed to return JSON.
    throw new Error(`Expected JSON response for ${path} but received: ${responseText}`);
  }
}

/* AUTH */
const API = {
  getToken: getToken,
  login: async (email, password) => {
    return apiCall('POST', '/auth/login', { email, password });
  },

  /* ADMIN */
  // The 'seed-beds' endpoint is a script, not an API route.
  // seedBeds:          ()         => apiCall('POST', '/admin/seed-beds'),
  getBeds: () => apiCall('GET', '/admin/beds'),
  admitPatient: (payload) => apiCall('POST', '/admin/admit-patient', payload),
  toggleStatus: (id) => apiCall('PATCH', `/admin/toggle-status/${id}`),

  /* ORDERS */
  staffOrder: (payload) => apiCall('POST', '/orders/staff', payload),
  patientOrder: (payload) => apiCall('POST', '/orders/patient', payload),
  getOrders: () => apiCall('GET', '/orders/'),
  updateOrderStatus: (orderId, newStatus) => apiCall('PATCH', `/orders/${orderId}/status`, { new_status: newStatus }),
};
