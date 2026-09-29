// SHA-1 of a string, using the browser's Web Crypto API.
export async function sha1(text) {
  if (typeof crypto === "undefined" || !crypto.subtle) return "";
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
