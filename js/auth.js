// ================================================================
// AUTH.JS - Authentication functions
// ================================================================

import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { app } from './firebase-config.js';

const auth = getAuth(app);
const db = getFirestore(app);

// ================================================================
// REGISTER - Create new user account
// ================================================================

export async function register(email, password, username, fullName = '') {
  try {
    // ===== REMOVED ALL USERNAME RESTRICTIONS =====
    // No validation on username - can be anything
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

    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

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

    return { 
      success: true, 
      user: user,
      username: trimmedUsername 
    };

  } catch (error) {
    console.error('Registration error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// ================================================================
// LOGIN - Sign in existing user
// ================================================================

export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    let userData = {};
    if (userDoc.exists()) {
      userData = userDoc.data();
    }

    return { 
      success: true, 
      user: user,
      userData: userData
    };

  } catch (error) {
    console.error('Login error:', error);
    
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
      error: errorMessage 
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
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
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
    console.error('Get user data error:', error);
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
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Update profile error:', error);
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
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Reset password error:', error);
    
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
    callback(user);
  });
}

// ================================================================
// CHECK USERNAME AVAILABILITY - Check if username exists
// ================================================================

export async function checkUsernameAvailability(username) {
  try {
    // This is a simple check - you may want to implement a more robust check
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(q);
    return { 
      available: snapshot.empty,
      exists: !snapshot.empty
    };
  } catch (error) {
    console.error('Check username error:', error);
    return { 
      available: false, 
      error: error.message 
    };
  }
}
