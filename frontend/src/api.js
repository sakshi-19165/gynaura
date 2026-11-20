const API_BASE = '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const token = localStorage.getItem('gynaura_token');
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, { ...options, headers });
  
  let data = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (e) {
      // JSON parse error or empty body
    }
  }

  if (!res.ok) {
    if (
      res.status === 401 &&
      token &&
      !path.startsWith('/auth/login') &&
      !path.startsWith('/auth/admin-login') &&
      !path.startsWith('/auth/google')
    ) {
      clearSession();
    }
    const message = data?.detail || data?.message || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export async function apiGet(path) {
  return request(path, { method: 'GET' });
}

export async function apiPost(path, body) {
  return request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function apiPatch(path, body) {
  return request(path, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path) {
  return request(path, { method: 'DELETE' });
}

export function getSession() {
  try {
    const raw = localStorage.getItem('gynaura_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  if (!session) return;
  localStorage.setItem('gynaura_session', JSON.stringify(session));
  if (session.token) {
    localStorage.setItem('gynaura_token', session.token);
  }
  window.dispatchEvent(new Event('gynaura-auth'));
}

export function clearSession() {
  localStorage.removeItem('gynaura_session');
  localStorage.removeItem('gynaura_token');
  window.dispatchEvent(new Event('gynaura-auth'));
}
