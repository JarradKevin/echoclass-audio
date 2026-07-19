// This file is intentionally checked into the repo with a real config below.
// A Firebase web config is NOT a secret — it identifies which project to talk
// to, and access is controlled by Firestore security rules, not by hiding
// this file. See README-webapp.md for the security rules used here.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  // PASTE_YOUR_FIREBASE_CONFIG_HERE
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const RESULTS_COLLECTION = "echoclass_attempts";
