// ================================================================
// FIREBASE-CONFIG.JS - Firebase configuration
// ================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2JA1K-fvsPUkWUfvSFhkC-ET8dpPOr0M",
  authDomain: "mychat-a97bf.firebaseapp.com",
  projectId: "mychat-a97bf",
  storageBucket: "mychat-a97bf.appspot.com",
  messagingSenderId: "1075223297969",
  appId: "1:1075223297969:web:3b8e5e3b8e5e3b8e5e3b8e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Backend URL (for S3 uploads - optional)
const BACKEND_URL = 'http://localhost:5001';

export { app, auth, db, storage, BACKEND_URL };
