import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const userCache = new Map();

export function showToast(message, duration = 2000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

export function timeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd';
  return date.toLocaleDateString();
}

export function cleanUsername(username) {
  return (username || '').replace(/^@/, '');
}

export function getAvatarHTML(username) {
  const cached = userCache.get(username);
  if (cached?.avatar && cached.avatar !== 'null') {
    return `<img src="${cached.avatar}" alt="${cleanUsername(username)}" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>';">`;
  }
  return '<i class="fas fa-user"></i>';
}

export async function batchLoadProfiles(usernames) {
  const unique = [...new Set(usernames.filter(u => u && u !== '@anonymous' && !userCache.has(u)))];
  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10);
    try {
      const q = query(collection(db, 'users'), where('username', 'in', batch));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        const data = doc.data();
        userCache.set(data.username, { username: data.username, name: data.name || cleanUsername(data.username), avatar: data.avatar });
      });
    } catch(e) {}
  }
}

export function requireAuth() {
  if (!localStorage.getItem('uid')) {
    window.location.replace('login.html');
    return false;
  }
  return true;
}

export { userCache };