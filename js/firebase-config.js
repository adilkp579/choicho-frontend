// ================================================================
// FIREBASE-CONFIG.JS - Firebase configuration
// ================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2JA1K-fvsPUkWUfvSFhkC-ET8dpPOr0M",
  authDomain: "mychat-a97bf.firebaseapp.com",
  projectId: "mychat-a97bf",
  storageBucket: "mychat-a97bf.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
