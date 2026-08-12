// ============================================================================
// File:        firebase.js
// Module:      Shared - Firebase Initialization
// Purpose:     Single source of truth for Firebase config and SDK instances.
//
// ⭐ WHAT THIS FILE IS (plain English):
//   Every page loads Firebase from Google's servers (no installation needed)
//   and this file is the ONE place that sets up the connection. All the
//   database/auth/storage tools are imported here and handed out to the rest
//   of the app, so other files only ever write "import { db } from './firebase.js'".
// Language:    JavaScript (ES Module)
// ============================================================================

// --- Load the Firebase SDK from Google's free CDN (browser version 10) -------
// These imports give us: the app core, the sign-in system (Auth), the
// database (Firestore), and the file storage (Storage).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    increment,
    onSnapshot,
    writeBatch,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// --- The "keys" that point at OUR project on Firebase -------------------------
// These identify the SriniMart project on Google's cloud. They are safe to
// share in a web app — real security comes from the security rules files
// (firestore.rules / storage.rules), not from keeping these a secret.
const firebaseConfig = {
    apiKey: "AIzaSyDs1gPFDgOocUDQJe24RB4bPdDaqelAlX4",
    authDomain: "srini-mart.firebaseapp.com",
    projectId: "srini-mart",
    storageBucket: "srini-mart.firebasestorage.app",
    messagingSenderId: "1015544028033",
    appId: "1:1015544028033:web:c9bcd10c8813806bbf6680",
    measurementId: "G-QF0R9HCFCW"
};

// --- Create the three main connection objects ---------------------------------
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);        // sign-in system
export const db = getFirestore(app);     // the database
export const storage = getStorage(app);  // the file storage (product photos)

// Re-export firestore helpers so pages only need one import statement.
export {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    increment,
    onSnapshot,
    writeBatch,
    Timestamp,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
};
