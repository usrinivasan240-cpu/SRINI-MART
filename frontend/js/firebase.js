// ============================================================================
// File:        firebase.js
// Module:      Shared - Firebase Initialization
// Purpose:     Single source of truth for Firebase config and SDK instances.
// Language:    JavaScript (ES Module)
// ============================================================================

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

const firebaseConfig = {
    apiKey: "AIzaSyDs1gPFDgOocUDQJe24RB4bPdDaqelAlX4",
    authDomain: "srini-mart.firebaseapp.com",
    projectId: "srini-mart",
    storageBucket: "srini-mart.firebasestorage.app",
    messagingSenderId: "1015544028033",
    appId: "1:1015544028033:web:c9bcd10c8813806bbf6680",
    measurementId: "G-QF0R9HCFCW"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

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
