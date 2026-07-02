// ================================================================
// AUTH.JS - Authentication functions (Username restrictions removed)
// ================================================================

import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { app } from './firebase-config.js';

const auth = getAuth(app);
const db = getFirestore(app);

// ================================================================
// REGISTER - Create new user account (No username restrictions)
// ================================================================

export async function register(email, password, username, fullName = '') {
  try {
    // ===== REMOVED ALL USERNAME RESTRICTIONS =====
    // Username can be anything - no length or character restrictions
    // Only check if username exists (not empty)
    
    if (!username || username.trim() === '') {
      return { success: false, error: 'Username is required' };
    }

    if (!email || email.trim() === '') {
      return { success: false, error: 'Email is required' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const trimmedUsername = username.trim();
    const trimmedFullName = fullName.trim() || trimmedUsername;

    console.log('📝 Registering user:', { username: trimmedUsername, email });

    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('✅ User created:', user.uid);

    // Update profile with display name
    await updateProfile(user, {
      displayName: trimmedFullName
    });

    // Create user document in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      username: trimmedUsername,
      name: trimmedFullName,
      email: email,
      avatar: null,
      bio: '',
      website: '',
      friends: [],
      besties: [],
      posts: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ User document created in Firestore');

    // Create wallet document
    const walletRef = doc(db, 'wallets', user.uid);
    await setDoc(walletRef, {
      userId: user.uid,
      chicken: 10,
      lion: 5,
      fish: 8,
      bike: 3,
      createdAt: serverTimestamp()
    });

    console.log('✅ Wallet created');

    return { 
      success: true, 
      user: user,
      username: trimmedUsername,
      uid: user.uid
    };

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    let errorMessage = error.message;
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered. Please use a different email or login.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address. Please check and try again.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Please use a stronger password.';
    } else if (error.code === 'auth/configuration-not-found') {
      errorMessage = 'Firebase Authentication is not enabled. Please enable Email/Password in Firebase Console.';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Email/Password sign-in is not enabled. Please enable it in Firebase Console.';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      code: error.code
    };
  }
}

// ================================================================
// LOGIN - Sign in existing user
// ================================================================

export async function login(email, password) {
  try {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    let userData = {};
    if (userDoc.exists()) {
      userData = userDoc.data();
    } else {
      // If user document doesn't exist, create one
      await setDoc(userRef, {
        uid: user.uid,
        username: user.displayName || 'user_' + user.uid.substring(0, 6),
        name: user.displayName || 'User',
        email: user.email,
        avatar: null,
        bio: '',
        website: '',
        friends: [],
        besties: [],
        posts: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      userData = { username: user.displayName || 'user_' + user.uid.substring(0, 6) };
    }

    return { 
      success: true, 
      user: user,
      userData: userData
    };

  } catch (error) {
    console.error('❌ Login error:', error);
    
    let errorMessage = 'Invalid email or password';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later.';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      code: error.code
    };
  }
}

// ================================================================
// LOGOUT - Sign out current user
// ================================================================

export async function logout() {
  try {
    await signOut(auth);
    // Clear local storage
    localStorage.removeItem('userProfile');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('recentSearches');
    console.log('✅ Logged out successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Logout error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// ================================================================
// GET CURRENT USER - Get currently logged in user
// ================================================================

export function getCurrentUser() {
  return auth.currentUser;
}

// ================================================================
// GET USER DATA - Get user data from Firestore
// ================================================================

export async function getUserData(uid) {
  try {
    if (!uid) {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'No user logged in' };
      }
      uid = currentUser.uid;
    }

    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { 
        success: true, 
        data: userDoc.data() 
      };
    } else {
      return { 
        success: false, 
        error: 'User not found' 
      };
    }
  } catch (error) {
    console.error('❌ Get user data error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// ================================================================
// UPDATE USER PROFILE - Update user profile in Firestore
// ================================================================

export async function updateUserProfile(uid, updates) {
  try {
    if (!uid) {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'No user logged in' };
      }
      uid = currentUser.uid;
    }

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // Update local storage
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    localStorage.setItem('userProfile', JSON.stringify({ ...profile, ...updates }));
    
    return { success: true };
  } catch (error) {
    console.error('❌ Update profile error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// ================================================================
// RESET PASSWORD - Send password reset email
// ================================================================

export async function resetPassword(email) {
  try {
    if (!email) {
      return { success: false, error: 'Email is required' };
    }
    
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('❌ Reset password error:', error);
    
    let errorMessage = 'Failed to send reset email';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

// ================================================================
// AUTH STATE LISTENER - Listen for auth state changes
// ================================================================

export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      callback(user);
    } else {
      // User is signed out
      callback(null);
    }
  });
}

// ================================================================
// CHECK USERNAME AVAILABILITY - Check if username exists
// ================================================================

export async function checkUsernameAvailability(username) {
  try {
    if (!username) {
      return { available: false, error: 'Username is required' };
    }
    
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(q);
    return { 
      available: snapshot.empty,
      exists: !snapshot.empty
    };
  } catch (error) {
    console.error('❌ Check username error:', error);
    return { 
      available: false, 
      error: error.message 
    };
  }
}

// ================================================================
// REQUIRE AUTH - Check if user is authenticated (for page protection)
// ================================================================

export function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    return false;
  }
  return true;
}

// ================================================================
// GET AUTH TOKEN - Get Firebase ID token for backend authentication
// ================================================================

export async function getAuthToken() {
  const user = getCurrentUser();
  if (!user) {
    return null;
  }
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('❌ Get auth token error:', error);
    return null;
  }
}

// ================================================================
// SYNC USER PROFILE - Sync local profile with Firestore
// ================================================================

export async function syncUserProfile() {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'No user logged in' };
  }

  try {
    const result = await getUserData(user.uid);
    if (result.success) {
      localStorage.setItem('userProfile', JSON.stringify(result.data));
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
  } catch (error) {
    console.error('❌ Sync profile error:', error);
    return { success: false, error: error.message };
  }
}
