/**
 * API client for the thumbnail backend. In dev, Vite proxies `/api` to the FastAPI server.
 * Override base URL with `VITE_API_BASE` (e.g. production API origin).
 */
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

function getAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(response, fallback) {
  const text = await response.text();
  if (!text) return fallback;

  try {
    const data = JSON.parse(text);
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item) => item.msg || item.message || "Invalid field")
        .join(" ");
    }
  } catch {
    return text;
  }

  return fallback;
}

export async function signUp(payload) {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to create account"));
  }
  return response.json();
}

export async function signIn(payload) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to sign in"));
  }
  return response.json();
}

export async function getCurrentUser(token) {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to load current user"));
  }
  return response.json();
}

export async function signOut(token) {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to sign out"));
  }
  return response.json();
}

/**
 * Upload a headshot image; returns `{ url }` for use as `headshot_url` when creating a job.
 */
export async function uploadHeadshot(file, token) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/upload-headshot`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to upload headshot"));
  }
  return response.json();
}

/**
 * Create a generation job. Backend expects snake_case JSON keys.
 */
export async function createJob(prompt, numThumbnails, headshotUrl, token) {
  const response = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(token),
    },
    body: JSON.stringify({
      prompt: prompt,
      num_thumbnails: numThumbnails,
      headshot_url: headshotUrl,
    }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to create job"));
  }
  return response.json();
}

/**
 * Fetch current job and thumbnails (polling fallback).
 */
export async function getJob(jobId, token) {
  const response = await fetch(`${API_BASE}/jobs/${encodeURIComponent(jobId)}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to load job"));
  }
  return response.json();
}

/**
 * Subscribe to SSE thumbnail and completion events. Returns `EventSource` (caller may `.close()`).
 */
export function subscribeToJob(jobId, handlers, token) {
  const {
    onThumbnailReady,
    onThumbnailFailed,
    onJobCompleted,
    onStreamError,
  } = handlers;

  const tokenQuery = token ? `?access_token=${encodeURIComponent(token)}` : "";
  const url = `${API_BASE}/jobs/${encodeURIComponent(jobId)}/stream${tokenQuery}`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener("thumbnail_ready", (event) => {
    const data = JSON.parse(event.data);
    onThumbnailReady?.(data);
  });

  eventSource.addEventListener("thumbnail_failed", (event) => {
    const data = JSON.parse(event.data);
    onThumbnailFailed?.(data);
  });

  let completed = false;
  eventSource.addEventListener("job_completed", (event) => {
    completed = true;
    const data = JSON.parse(event.data);
    onJobCompleted?.(data);
    eventSource.close();
  });

  eventSource.addEventListener("stream_error", (event) => {
    try {
      const data = JSON.parse(event.data);
      onStreamError?.(data);
    } catch {
      onStreamError?.({ error: event.data });
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    if (completed || eventSource.readyState === EventSource.CLOSED) {
      return;
    }
    onStreamError?.({ error: "EventSource connection error" });
    eventSource.close();
  };

  return eventSource;
}
