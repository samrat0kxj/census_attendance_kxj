import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDZmnDrZaxnqNBF65EQkP3tVCNMlzX1sTo",
  authDomain: "gen-lang-client-0843491110.firebaseapp.com",
  projectId: "gen-lang-client-0843491110",
  storageBucket: "gen-lang-client-0843491110.firebasestorage.app",
  messagingSenderId: "920638236206",
  appId: "1:920638236206:web:82f1b4df68ebd56b14e1bf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use custom db with correct database ID if specified in the config
const db = getFirestore(app, "ai-studio-72abf761-2eed-41a8-96aa-f60ed1db12ab");

const storage = getStorage(app);

// Validate Connection to Firestore as per critical constraint
export async function testFirestoreConnection() {
  try {
    // Attempting to read a test document to verify connection
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firestore connection test completed.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.error("Please check your Firebase configuration. Client is offline.");
    } else {
      console.log("Firestore test document lookup (this is normal if document doesn't exist yet):", error);
    }
  }
}

// Run connection test immediately
testFirestoreConnection();

export { app, auth, db, storage };
