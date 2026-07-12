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

export { getToken, getRole, setToken, setRole, api, downloadFile };
