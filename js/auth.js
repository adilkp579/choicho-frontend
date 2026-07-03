// ================================================================
// AUTHENTICATION MODULE
// ================================================================

import { 
  auth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  sendEmailVerification,
  db,
  BACKEND_URL
} from './firebase-config.js';
import { showToast } from './common.js';
import { collection, query, where, getDocs, doc, setDoc, addDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ================================================================
// Simple password hash (for Firestore fallback)
// ================================================================

function hashPassword(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    const c = pw.charCodeAt(i);
    h = ((h << 5) - h) + c;
    h = h & h;
  }
  return 'h_' + Math.abs(h).toString(16);
}

// ================================================================
// LOGIN with Email/Password
// ================================================================

export async function login(usernameOrEmail, password) {
  try {
    let email = usernameOrEmail;
    let userData = null;
    
    // If not email, try to find email from username
    if (!usernameOrEmail.includes('@')) {
      const usernameToSearch = usernameOrEmail.startsWith('@') ? usernameOrEmail : '@' + usernameOrEmail;
      const q = query(
        collection(db, 'users'), 
        where('username', '==', usernameToSearch)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        userData = snapshot.docs[0].data();
        email = userData.email || usernameOrEmail + '@choicho.com';
      }
    } else {
      // Try to find by email
      const q = query(collection(db, 'users'), where('email', '==', usernameOrEmail));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        userData = snapshot.docs[0].data();
      }
    }
    
    // Try Firebase Auth
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem('uid', userCredential.user.uid);
      
      if (userData) {
        localStorage.setItem('currentUser', userData.username);
        localStorage.setItem('userProfile', JSON.stringify(userData));
      }
      
      return { success: true, user: userCredential.user };
    } catch (authError) {
      // If user not found, try to create account
      if (authError.code === 'auth/user-not-found' && userData) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          localStorage.setItem('uid', userCredential.user.uid);
          localStorage.setItem('currentUser', userData.username);
          localStorage.setItem('userProfile', JSON.stringify(userData));
          return { success: true, user: userCredential.user };
        } catch (createError) {
          console.warn('Account creation failed:', createError);
        }
      }
      
      // Fallback to Firestore auth
      if (userData && userData.password === hashPassword(password)) {
        // Try anonymous auth for session
        try {
          const guestCred = await signInAnonymously(auth);
          localStorage.setItem('uid', guestCred.user.uid);
        } catch (e) {
          localStorage.setItem('uid', 'firestore_' + userData.username.replace('@', ''));
        }
        localStorage.setItem('currentUser', userData.username);
        localStorage.setItem('userProfile', JSON.stringify(userData));
        return { success: true, user: userData };
      }
      
      throw authError;
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// ================================================================
// REGISTER new user - NO USERNAME RESTRICTIONS
// ================================================================

export async function register(name, username, email, password) {
  try {
    // ===== VALIDATION =====
    if (!name || !username || !email || !password) {
      return { success: false, error: 'All fields required' };
    }
    
    // ===== REMOVED USERNAME RESTRICTIONS =====
    // Username can be ANYTHING - no length or character limits
    // Only check if username is not empty
    if (!username || username.trim() === '') {
      return { success: false, error: 'Username is required' };
    }
    
    if (!email || !email.includes('@') || !email.includes('.')) {
      return { success: false, error: 'Invalid email' };
    }
    
    if (password.length < 6) {
      return { success: false, error: 'Password min 6 chars' };
    }
    
    // Clean username - add @ prefix for consistency
    const cleanUsername = username.startsWith('@') ? username : '@' + username;
    
    // Check if username exists in Firestore
    const existingUser = await getDocs(query(collection(db, 'users'), where('username', '==', cleanUsername)));
    if (!existingUser.empty) {
      return { success: false, error: 'Username taken' };
    }
    
    // Check if email exists in Firestore
    const existingEmail = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
    if (!existingEmail.empty) {
      return { success: false, error: 'Email registered' };
    }
    
    // Try Firebase Auth
    let firebaseUser = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      firebaseUser = userCredential.user;
      
      // Update profile with display name
      await updateProfile(firebaseUser, { displayName: name });
      localStorage.setItem('uid', firebaseUser.uid);
    } catch (authError) {
      console.warn('Firebase Auth registration failed:', authError);
      // Continue with Firestore only
    }
    
    // Create user in Firestore
    const userData = {
      name: name,
      username: cleanUsername,
      email: email,
      password: hashPassword(password),
      avatar: null,
      bio: '',
      website: '',
      friends: [],
      besties: [],
      posts: [],
      createdAt: serverTimestamp()
    };
    
    const userRef = await addDoc(collection(db, 'users'), userData);
    
    // Create wallet
    await setDoc(doc(db, 'wallets', userRef.id), {
      userId: userRef.id,
      username: cleanUsername,
      chicken: 10,
      lion: 5,
      fish: 8,
      bike: 3,
      createdAt: serverTimestamp()
    });
    
    // Save to localStorage
    const profile = {
      username: cleanUsername,
      name: name,
      bio: '',
      website: '',
      avatar: null,
      friends: [],
      besties: [],
      posts: []
    };
    localStorage.setItem('userProfile', JSON.stringify(profile));
    localStorage.setItem('currentUser', cleanUsername);
    
    if (!firebaseUser) {
      localStorage.setItem('uid', userRef.id);
    }
    
    return { success: true, userId: userRef.id };
    
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
}

// ================================================================
// UPDATE USER PROFILE
// ================================================================

export async function updateUserProfile(uid, data) {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    // Update Firebase Auth profile if needed
    const user = auth.currentUser;
    if (user && data.name) {
      await updateProfile(user, { displayName: data.name });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: error.message };
  }
}

// ================================================================
// UPDATE AVATAR
// ================================================================

export async function updateUserAvatar(uid, avatarUrl) {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      avatar: avatarUrl,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Update avatar error:', error);
    return { success: false, error: error.message };
  }
}

// ================================================================
// SEND PASSWORD RESET EMAIL
// ================================================================

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: error.message };
  }
}

// ================================================================
// SEND EMAIL VERIFICATION
// ================================================================

export async function verifyEmail() {
  try {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
      return { success: true };
    }
    return { success: false, error: 'No user logged in' };
  } catch (error) {
    console.error('Email verification error:', error);
    return { success: false, error: error.message };
  }
}

// ================================================================
// LOGOUT
// ================================================================

export function logout() {
  signOut(auth).catch(() => {});
  localStorage.removeItem('uid');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userProfile');
  window.location.href = 'login.html';
}

// ================================================================
// GET CURRENT USER
// ================================================================

export function getCurrentUser() {
  return {
    uid: localStorage.getItem('uid'),
    username: localStorage.getItem('currentUser') || '@anonymous'
  };
}

// ================================================================
// CHECK AUTH STATE
// ================================================================

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ================================================================
// GET AUTH TOKEN (for backend API)
// ================================================================

export async function getAuthToken() {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return localStorage.getItem('uid') || null;
}
