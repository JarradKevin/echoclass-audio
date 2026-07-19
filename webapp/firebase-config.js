// This file is intentionally checked into the repo with a real config below.
// A Firebase web config is NOT a secret — it identifies which project to talk
// to, and access is controlled by Firestore security rules, not by hiding
// this file. See README-webapp.md for the security rules used here.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBcnD0EHi9bk2HosMzJGh_eFBx4XWPAIZI",
  authDomain: "echoclass-44559.firebaseapp.com",
  projectId: "echoclass-44559",
  storageBucket: "echoclass-44559.firebasestorage.app",
  messagingSenderId: "662434370312",
  appId: "1:662434370312:web:ebb5cb5c47f9bf592452bd",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const RESULTS_COLLECTION = "echoclass_attempts";
