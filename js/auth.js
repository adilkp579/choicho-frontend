// ================================================================
// AUTH.JS - Authentication functions (Username stored in Firestore)
// ================================================================

import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, 
  query, where, getDocs, updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { app } from './firebase-config.js';

const auth = getAuth(app);
const db = getFirestore(app);

// ================================================================
// GET CURRENT USER - Get currently logged in user
// ================================================================

export function getCurrentUser() {
  const user = auth.currentUser;
  if (user) {
    // Also ensure localStorage has current user
    try {
      const localUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (!localUser.uid || localUser.uid !== user.uid) {
        // Update localStorage with current user
        getUserData(user.uid).then(result => {
          if (result.success) {
            localStorage.setItem('userProfile', JSON.stringify(result.data));
            localStorage.setItem('currentUser', JSON.stringify({
              uid: user.uid,
              username: result.data.username || user.displayName || 'User',
              email: user.email
            }));
          }
        });
      }
    } catch (e) {
      console.warn('LocalStorage sync error:', e);
    }
  }
  return user;
}

// ================================================================
// REGISTER - Create new user account
// ================================================================

export async function register(email, password, username, fullName = '') {
  try {
    // ===== VALIDATION =====
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

    // Step 1: Create user with email and password in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('✅ Firebase Auth user created:', user.uid);

    // Step 2: Update display name in Firebase Auth
    await updateProfile(user, {
      displayName: trimmedFullName
    });

    console.log('✅ Display name updated in Auth');

    // Step 3: Create user document in Firestore with username
    const userRef = doc(db, 'users', user.uid);
    const userData = {
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
    };
    
    await setDoc(userRef, userData);

    console.log('✅ User document created in Firestore with username:', trimmedUsername);

    // Step 4: Create wallet document
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

    // Step 5: Save to localStorage for immediate use
    const profileData = {
      uid: user.uid,
      username: trimmedUsername,
      name: trimmedFullName,
      email: email,
      avatar: null,
      bio: '',
      website: '',
      friends: [],
      besties: [],
      posts: []
    };
    localStorage.setItem('userProfile', JSON.stringify(profileData));
    localStorage.setItem('currentUser', JSON.stringify({ 
      uid: user.uid, 
      username: trimmedUsername,
      email: email 
    }));

    console.log('✅ LocalStorage updated');

    return { 
      success: true, 
      user: user,
      username: trimmedUsername,
      uid: user.uid,
      userData: profileData
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

    // Step 1: Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('✅ User logged in:', user.uid);

    // Step 2: Get user data from Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    let userData = {};
    if (userDoc.exists()) {
      userData = userDoc.data();
      console.log('✅ User data loaded from Firestore:', userData.username);
    } else {
      // If user document doesn't exist, create one
      const newUserData = {
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
      };
      await setDoc(userRef, newUserData);
      userData = newUserData;
      console.log('✅ New user document created');
    }

    // Step 3: Save to localStorage
    localStorage.setItem('userProfile', JSON.stringify(userData));
    localStorage.setItem('currentUser', JSON.stringify({ 
      uid: user.uid, 
      username: userData.username || user.displayName,
      email: user.email 
    }));

    console.log('✅ LocalStorage updated with user data');

    return { 
      success: true, 
      user: user,
      userData: userData,
      username: userData.username
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
      const data = userDoc.data();
      // Update localStorage
      localStorage.setItem('userProfile', JSON.stringify(data));
      localStorage.setItem('currentUser', JSON.stringify({
        uid: uid,
        username: data.username || data.name || 'User',
        email: data.email
      }));
      return { 
        success: true, 
        data: data 
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
    
    // Get current data first
    const userDoc = await getDoc(userRef);
    let currentData = {};
    if (userDoc.exists()) {
      currentData = userDoc.data();
    }

    // Merge updates
    const updatedData = {
      ...currentData,
      ...updates,
      updatedAt: serverTimestamp()
    };

    await setDoc(userRef, updatedData, { merge: true });
    
    console.log('✅ Profile updated in Firestore');

    // Update local storage
    localStorage.setItem('userProfile', JSON.stringify(updatedData));
    
    // Update currentUser in localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (updates.username) {
      currentUser.username = updates.username;
    }
    if (updates.name) {
      currentUser.name = updates.name;
    }
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    return { success: true, data: updatedData };
  } catch (error) {
    console.error('❌ Update profile error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// ================================================================
// UPDATE USERNAME - Update username in Firestore only
// ================================================================

export async function updateUsername(uid, newUsername) {
  try {
    if (!uid) {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'No user logged in' };
      }
      uid = currentUser.uid;
    }

    if (!newUsername || newUsername.trim() === '') {
      return { success: false, error: 'Username is required' };
    }

    // Check if username is already taken
    const q = query(collection(db, 'users'), where('username', '==', newUsername.trim()));
    const snapshot = await getDocs(q);
    
    let usernameTaken = false;
    snapshot.forEach(doc => {
      if (doc.id !== uid) {
        usernameTaken = true;
      }
    });

    if (usernameTaken) {
      return { success: false, error: 'Username is already taken' };
    }

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      username: newUsername.trim(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Username updated in Firestore:', newUsername);

    // Update local storage
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    profile.username = newUsername.trim();
    localStorage.setItem('userProfile', JSON.stringify(profile));

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    currentUser.username = newUsername.trim();
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    return { success: true, username: newUsername.trim() };
  } catch (error) {
    console.error('❌ Update username error:', error);
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
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in - load their data
      try {
        const result = await getUserData(user.uid);
        if (result.success) {
          callback(user, result.data);
        } else {
          callback(user, null);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        callback(user, null);
      }
    } else {
      // User is signed out
      callback(null, null);
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
// REQUIRE AUTH - Check if user is authenticated
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

// ================================================================
// GET USERNAME - Get username from localStorage or Firestore
// ================================================================

export function getUsername() {
  try {
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (profile.username) {
      return profile.username;
    }
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.username) {
      return currentUser.username;
    }
    const authUser = getCurrentUser();
    if (authUser && authUser.displayName) {
      return authUser.displayName;
    }
    return 'User';
  } catch (e) {
    console.warn('Error getting username:', e);
    return 'User';
  }
}

// ================================================================
// GET USER DISPLAY NAME - Get display name
// ================================================================

export function getUserDisplayName() {
  try {
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (profile.name) {
      return profile.name;
    }
    const authUser = getCurrentUser();
    if (authUser && authUser.displayName) {
      return authUser.displayName;
    }
    return getUsername();
  } catch (e) {
    console.warn('Error getting display name:', e);
    return 'User';
  }
}
