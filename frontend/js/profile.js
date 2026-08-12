// ============================================================================
// File:        profile.js
// Module:      Phase 2 - User Profile Management
// Purpose:     View and edit profile details, default address, store info,
//              and trigger password reset.
//
// ⭐ WHAT THIS FILE IS (plain English):
//   The brain of profile.html. It shows the signed-in user's details, lets
//   them edit their name, phone and saved address (and store info if they're
//   a seller), and emails them a password-reset link on request. The saved
//   address is the same one checkout pre-fills.
// Language:    JavaScript (ES Module)
// ============================================================================

import { db, doc, getDoc, setDoc, sendPasswordResetEmail, auth } from "./firebase.js";
import { toast, requireAuth, logout, formatDate, validatePhone, validatePincode } from "./ui.js";

let session = null;

// populate: copies the user's database record into the page fields.
async function populate() {
    const p = session.profile;
    // Left panel: avatar, name, email, role, member-since.
    document.getElementById('profileAvatar').textContent = (p.firstName || p.email || 'U').charAt(0).toUpperCase();
    document.getElementById('profileName').textContent = p.firstName ? `${p.firstName} ${p.lastName || ''}` : p.email;
    document.getElementById('profileEmail').textContent = p.email || '';
    document.getElementById('profileRole').textContent = p.role || 'buyer';
    document.getElementById('memberSince').textContent = p.createdAt ? `Member since ${formatDate(p.createdAt)}` : '';

    // Form fields.
    document.getElementById('pFirstName').value = p.firstName || '';
    document.getElementById('pLastName').value = p.lastName || '';
    document.getElementById('pPhone').value = p.phone || '';
    document.getElementById('pAddress').value = p.address?.address || '';
    document.getElementById('pCity').value = p.address?.city || '';
    document.getElementById('pState').value = p.address?.state || '';
    document.getElementById('pPincode').value = p.address?.pincode || '';

    // Sellers also get store name / description fields.
    if (p.role === 'seller') {
        document.getElementById('sellerFields').style.display = 'block';
        document.getElementById('pStoreName').value = p.storeName || '';
        document.getElementById('pStoreDesc').value = p.storeDescription || '';
    }
}

// saveProfile: validates the phone/pincode, then merges the form into the
// user's record in the database (merge keeps everything else intact).
async function saveProfile(e) {
    e.preventDefault();
    const phone = document.getElementById('pPhone').value.trim();
    const pincode = document.getElementById('pPincode').value.trim();
    if (phone && !validatePhone(phone)) { toast('Please enter a valid 10-digit phone number', 'error'); return; }
    if (pincode && !validatePincode(pincode)) { toast('Please enter a valid 6-digit pincode', 'error'); return; }

    const data = {
        firstName: document.getElementById('pFirstName').value.trim(),
        lastName: document.getElementById('pLastName').value.trim(),
        phone,
        address: {
            address: document.getElementById('pAddress').value.trim(),
            city: document.getElementById('pCity').value.trim(),
            state: document.getElementById('pState').value.trim(),
            pincode
        },
        updatedAt: new Date()
    };
    if (session.profile.role === 'seller') {
        data.storeName = document.getElementById('pStoreName').value.trim();
        data.storeDescription = document.getElementById('pStoreDesc').value.trim();
    }

    try {
        await setDoc(doc(db, 'users', session.user.uid), data, { merge: true });
        toast('Profile updated successfully!', 'success');
        populate();
    } catch (e) {
        toast('Could not save profile', 'error');
    }
}

// resetPassword: asks Firebase to email a reset link to the user's address.
async function resetPassword() {
    if (!session.profile.email) return;
    try {
        await sendPasswordResetEmail(auth, session.profile.email);
        toast('Password reset email sent', 'success');
    } catch (e) {
        toast('Could not send reset email', 'error');
    }
}

// --- Init ------------------------------------------------------------------------
async function init() {
    session = await requireAuth();
    if (!session) return;
    document.getElementById('userName').textContent = session.profile.firstName
        ? `${session.profile.firstName} ${session.profile.lastName || ''}` : (session.profile.email || 'User');
    document.getElementById('userRole').textContent = session.profile.role || 'buyer';
    document.getElementById('userAvatar').textContent = (session.profile.firstName || session.profile.email || 'U').charAt(0).toUpperCase();
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
    document.getElementById('resetPwdBtn').addEventListener('click', resetPassword);
    await populate();
}

// Start the page brain.
init();
