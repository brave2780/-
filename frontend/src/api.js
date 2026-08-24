const BASE = '/api/pages';

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `요청 실패 (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  list: () => fetch(BASE).then(handle),
  get: (id) => fetch(`${BASE}/${id}`).then(handle),
  create: (data) =>
    fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handle),
  update: (id, data) =>
    fetch(`${BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handle),
  remove: (id) => fetch(`${BASE}/${id}`, { method: 'DELETE' }).then(handle),
};
