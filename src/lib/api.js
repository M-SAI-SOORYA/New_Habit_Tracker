const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Unable to complete the request.");
  }
  return payload?.data;
}

export const habitApi = {
  list: () => request("/habits"),
  create: (habit) => request("/habits", { method: "POST", body: JSON.stringify(habit) }),
  update: (id, habit) => request(`/habits/${id}`, { method: "PATCH", body: JSON.stringify(habit) }),
  remove: (id) => request(`/habits/${id}`, { method: "DELETE" }),
  setCompletion: (id, date, completed) => request(`/habits/${id}/completions/${date}`, {
    method: "PUT",
    body: JSON.stringify({ completed }),
  }),
  analytics: (id, through) => request(`/habits/${id}/analytics?through=${encodeURIComponent(through)}`),
};
