// Auth token storage + fetch wrapper. Extracted from main.jsx.
function getToken() { return localStorage.getItem("auth_token") || ""; }
function getRole() { return localStorage.getItem("auth_role") || ""; }
function setToken(t) {
  if (t) localStorage.setItem("auth_token", t);
  else { localStorage.removeItem("auth_token"); localStorage.removeItem("auth_role"); }
}
function setRole(r) { if (r) localStorage.setItem("auth_role", r); else localStorage.removeItem("auth_role"); }

async function api(path, options = {}) {
  const token = getToken();
  const { headers: extraHeaders, ...rest } = options;
  const response = await fetch(path, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(extraHeaders || {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    }
  });
  if (response.status === 401) {
    setToken("");
    window.dispatchEvent(new CustomEvent("auth-logout"));
    throw new Error("Session expired. Please sign in again.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

async function downloadFile(url) {
  const token = getToken();
  const response = await fetch(url, token ? { headers: { "Authorization": `Bearer ${token}` } } : {});
  if (response.status === 401) {
    setToken("");
    window.dispatchEvent(new CustomEvent("auth-logout"));
    throw new Error("Session expired. Please sign in again.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Download failed.");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename = match ? match[1].replace(/['"]/g, "").trim() : "export";
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

async function uploadPdf(url, file) {
  const token = getToken();
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/pdf",
      "X-File-Name": encodeURIComponent(file.name),
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: file
  });
  if (response.status === 401) {
    setToken("");
    window.dispatchEvent(new CustomEvent("auth-logout"));
    throw new Error("Session expired. Please sign in again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "PDF upload failed.");
  return data;
}

async function uploadRecovery(url, file) {
  const token = getToken();
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/zip", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
    body: file
  });
  if (response.status === 401) {
    setToken("");
    window.dispatchEvent(new CustomEvent("auth-logout"));
    throw new Error("Session expired. Please sign in again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Recovery restore failed.");
  return data;
}

async function viewPdf(url) {
  const popup = window.open("", "_blank");
  const token = getToken();
  try {
    const response = await fetch(url, token ? { headers: { "Authorization": `Bearer ${token}` } } : {});
    if (response.status === 401) {
      setToken("");
      window.dispatchEvent(new CustomEvent("auth-logout"));
      throw new Error("Session expired. Please sign in again.");
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "PDF could not be opened.");
    }
    const objectUrl = URL.createObjectURL(await response.blob());
    if (popup) popup.location.href = objectUrl;
    else window.location.href = objectUrl;
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (error) {
    if (popup) popup.close();
    throw error;
  }
}

export { getToken, getRole, setToken, setRole, api, downloadFile, uploadPdf, uploadRecovery, viewPdf };
