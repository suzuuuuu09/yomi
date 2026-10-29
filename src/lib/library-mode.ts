const MODE_KEY = "yomi:library-mode";
let guestMode: boolean | undefined;

export function isGuestMode(): boolean {
  if (guestMode !== undefined) return guestMode;
  try {
    if (typeof localStorage === "undefined") return false;
    guestMode = localStorage.getItem(MODE_KEY) === "guest";
  } catch {
    guestMode = false;
  }
  return guestMode;
}

export function startGuestMode() {
  localStorage.setItem(MODE_KEY, "guest");
  guestMode = true;
}

export function startAccountMode() {
  localStorage.setItem(MODE_KEY, "account");
  guestMode = false;
}
