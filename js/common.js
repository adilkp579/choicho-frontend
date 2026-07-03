// ================================================================
// COMMON.JS - Common utility functions
// ================================================================

import { getCurrentUser } from './auth.js';

// ================================================================
// SHOW TOAST - Show toast notification
// ================================================================

export function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.warn('Toast element not found');
    return;
  }
  
  toast.textContent = message;
  toast.className = 'toast show';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = 'toast';
  }, duration);
}

// ================================================================
// TIME AGO - Convert timestamp to "time ago" format
// ================================================================

export function timeAgo(date) {
  if (!date) return 'Recently';
  
  const now = new Date();
  const diff = now - date;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return minutes + 'm';
  if (hours < 24) return hours + 'h';
  if (days < 7) return days + 'd';
  if (weeks < 4) return weeks + 'w';
  if (months < 12) return months + 'mo';
  return years + 'y';
}

// ================================================================
// CLEAN USERNAME - Remove @ symbol and clean username
// ================================================================

export function cleanUsername(username) {
  if (!username) return 'User';
  return username.replace('@', '');
}

// ================================================================
// GET AVATAR HTML - Get avatar HTML for a user
// ================================================================

export function getAvatarHTML(username) {
  if (!username) {
    return '<i class="fas fa-user"></i>';
  }
  
  const initial = username.charAt(0).toUpperCase();
  return `<span style="font-weight:600;font-size:1.1rem;">${initial}</span>`;
}

// ================================================================
// BATCH LOAD PROFILES - Load multiple user profiles
// ================================================================

export async function batchLoadProfiles(userIds) {
  // This is a placeholder - implement if needed
  return {};
}

// ================================================================
// REQUIRE AUTH - Check if user is authenticated (redirects to login)
// ================================================================

export function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.replace('login.html');
    return false;
  }
  return true;
}
