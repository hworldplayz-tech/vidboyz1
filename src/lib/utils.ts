import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getUserIp(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching IP:', error);
    // Fallback to a random string if IP fetching fails (e.g. adblocker)
    let fingerprint = localStorage.getItem('visitor_fingerprint');
    if (!fingerprint) {
      fingerprint = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('visitor_fingerprint', fingerprint);
    }
    return fingerprint;
  }
}
