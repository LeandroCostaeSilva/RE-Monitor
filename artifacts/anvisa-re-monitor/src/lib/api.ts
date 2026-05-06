export function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("anvisa_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
