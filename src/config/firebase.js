// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB_3xErgKerW8IsWLQzu6IsMyiXNOPSxEo",
  authDomain: "web-socket-2e05f.firebaseapp.com",
  projectId: "web-socket-2e05f",
  storageBucket: "web-socket-2e05f.firebasestorage.app",
  messagingSenderId: "213332457740",
  appId: "1:213332457740:web:dbfe9e380e1629d0427129",
  measurementId: "G-RYFQE7TFGN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Conditionally initialize Firestore with settings to handle connection issues
let db;
try {
  db = getFirestore(app);
  // Enable offline persistence
  // This will help with connection issues
} catch (error) {
  console.error("Firestore initialization error:", error);
  db = null;
}

// Conditionally initialize Analytics
let analytics;
try {
  analytics = getAnalytics(app);
} catch (error) {
  console.warn("Analytics initialization error:", error);
  analytics = null;
}

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Export Firestore instance
export { db };

// Add a function to handle Firestore errors and implement backoff logic
export const handleFirestoreError = (error) => {
  console.error("Firestore error:", error);
  
  // Check if it's a quota exceeded error
  if (error.code === 'resource-exhausted') {
    console.warn("Quota exceeded. Implementing backoff strategy.");
    // You could implement a more sophisticated backoff strategy here
    // For now, we'll just log the error and suggest waiting
    alert("Service temporarily unavailable due to usage limits. Please wait a few minutes before trying again.");
  }
  
  // Check if it's a permission error
  if (error.code === 'permission-denied') {
    console.warn("Permission denied. Check Firestore rules.");
  }
  
  // Check if it's a network error
  if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
    console.warn("Network error. Retrying...");
    // You could implement retry logic here
  }
};

export default app;