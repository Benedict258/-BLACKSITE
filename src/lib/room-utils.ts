import { supabase } from "@/integrations/supabase/client";
import { sha256 } from "js-sha256";

// Generate a room code (8 chars, alphanumeric uppercase, human-friendly)
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like O, 0, I, 1
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a secure owner token
export function generateOwnerToken(): string {
  return `owner_${Math.random().toString(36).substring(2)}_${Date.now()}`;
}

// Simple hash function for tokens and passwords
export async function hashString(input: string): Promise<string> {
  try {
    const subtle = (globalThis as any)?.crypto?.subtle;
    if (subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // fall through to JS implementation
  }

  // Fallback (works in non-secure contexts): js-sha256 returns hex string
  return sha256(input);
}

// Validate room code format
export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}

// Format display name
export function formatDisplayName(name: string): string {
  return name.trim().slice(0, 25);
}

// Check if display name is banned in room
export async function isDisplayNameBanned(roomId: string, displayName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('bans')
    .select('id')
    .eq('room_id', roomId)
    .eq('display_name', displayName)
    .or('expires_at.is.null,expires_at.gt.now()')
    .limit(1);

  return !error && data && data.length > 0;
}

// Calculate expiry timestamp
export function calculateExpiry(expiryOption: string): Date | null {
  if (expiryOption === 'never') return null;
  
  const now = new Date();
  const match = expiryOption.match(/^(\d+)([hd])$/);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  if (unit === 'h') {
    return new Date(now.getTime() + value * 60 * 60 * 1000);
  } else if (unit === 'd') {
    return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
  }
  
  return null;
}