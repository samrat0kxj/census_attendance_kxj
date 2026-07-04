export function generateUserId(name: string, dob: string): string {
  if (!name) return "EMP" + Math.floor(10000 + Math.random() * 90000);
  
  const cleanName = name.replace(/[^A-Za-z]/g, "").toUpperCase();
  const prefix = (cleanName + "XXX").substring(0, 3);
  
  let datePart = "0101";
  if (dob) {
    const parts = dob.split("-"); // Expected format: YYYY-MM-DD
    if (parts.length === 3) {
      const month = parts[1];
      const day = parts[2];
      datePart = `${day}${month}`; // e.g. "2407" for 24th July
    }
  }
  
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const suffix = chars.charAt(Math.floor(Math.random() * chars.length));
  
  return `${prefix}${datePart}${suffix}`;
}

export function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const special = "@#$!%*&";
  const digits = "0123456789";
  
  // Matches prompt example: Ab@57291 (1 Upper, 1 Lower, 1 Special, 5 Digits)
  const u = upper.charAt(Math.floor(Math.random() * upper.length));
  const l = lower.charAt(Math.floor(Math.random() * lower.length));
  const s = special.charAt(Math.floor(Math.random() * special.length));
  
  let d = "";
  for (let i = 0; i < 5; i++) {
    d += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  
  return `${u}${l}${s}${d}`;
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

export function isTimeBetween(currentStr: string, startStr: string, endStr: string): boolean {
  const current = parseTimeToMinutes(currentStr);
  const start = parseTimeToMinutes(startStr);
  const end = parseTimeToMinutes(endStr);
  return current >= start && current <= end;
}

export function formatCurrentTime(): { dateStr: string; timeStr: string } {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${date}`;
  
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // hour 0 should be 12
  const timeStr = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  
  return { dateStr, timeStr };
}

export function getBrowserAndDevice(): { browser: string; device: string } {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  let device = "Desktop";
  
  if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/opr\//i.test(ua)) browser = "Opera";
  else if (/edg/i.test(ua)) browser = "Edge";
  
  if (/mobi|android|iphone|ipad|ipod/i.test(ua)) {
    device = "Mobile";
    if (/ipad|tablet/i.test(ua)) device = "Tablet";
  }
  
  return { browser, device };
}
