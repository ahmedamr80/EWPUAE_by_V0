# Firebase Security Rules Deployment Guide

## Overview

This guide explains how to deploy Firebase Security Rules for Firestore and Storage to ensure users can properly read and update their data.

---

## 📋 What Changed

### Issue Fixed
- **Problem**: Player data not syncing properly when profile is updated
- **Root Cause**: 
  1. Auth context was using one-time `getDoc` instead of real-time `onSnapshot`
  2. Firebase Security Rules were not configured

### Solutions Implemented
1. ✅ Updated `auth-context.tsx` to use **real-time listeners** (`onSnapshot`)
2. ✅ Created comprehensive **Firestore Security Rules** (`firestore.rules`)
3. ✅ Created **Storage Security Rules** (`storage.rules`)

---

## 🔥 Deploy Firebase Security Rules

### Option 1: Firebase Console (Recommended for Quick Deployment)

#### Firestore Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `db-padel-reg`
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` from your project
5. Paste into the Firebase Console editor
6. Click **Publish**

#### Storage Rules

1. In Firebase Console, navigate to **Storage** → **Rules**
2. Copy the contents from `storage.rules` from your project
3. Paste into the Firebase Console editor
4. Click **Publish**

---

### Option 2: Firebase CLI (Recommended for Project Integration)

#### Prerequisites

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login
```

#### Initialize Firebase (First Time Only)

```bash
# Navigate to your project directory
cd c:\EveryWherePadel\EWP_by_V0

# Initialize Firebase
firebase init
```

When prompted:
- Select **Firestore** and **Storage**
- Choose your existing project: `db-padel-reg`
- Accept default filenames or use `firestore.rules` and `storage.rules`

#### Deploy Rules

```bash
# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Storage rules
firebase deploy --only storage:rules

# Deploy both
firebase deploy --only firestore:rules,storage:rules
```

---

## 🔒 Security Rules Explained

### Firestore Rules (`firestore.rules`)

#### Users Collection
```javascript
match /users/{userId} {
  // ✅ Anyone can read user profiles (needed for player lists)
  allow read: if isSignedIn();
  
  // ✅ Users can create their own profile
  allow create: if isSignedIn() && isOwner(userId);
  
  // ✅ Users can update their own profile OR admins can update any
  allow update: if isSignedIn() && (isOwner(userId) || isAdmin());
  
  // ✅ Only admins can delete users
  allow delete: if isAdmin();
}
```

**What this allows:**
- ✅ Read any user profile (for partner searches, team formation)
- ✅ Update your own profile (name, phone, skill level, etc.)
- ✅ Upload your own profile picture
- ✅ Admins can manage all users

#### Registrations Collection
```javascript
match /registrations/{registrationId} {
  // Users can manage their own registrations
  allow read, update, delete: if isSignedIn() && 
    (resource.data.playerId == request.auth.uid || 
     resource.data.player2Id == request.auth.uid ||
     isAdmin());
  
  // Users can create registrations for themselves
  allow create: if isSignedIn() && 
    request.resource.data.playerId == request.auth.uid;
}
```

**What this allows:**
- ✅ Register for events
- ✅ Withdraw from events
- ✅ Update registration status
- ✅ Partner can update team registration

#### Teams Collection
```javascript
match /teams/{teamId} {
  allow read: if isSignedIn();
  
  allow create: if isSignedIn() && 
    (request.resource.data.player1Id == request.auth.uid || 
     request.resource.data.player2Id == request.auth.uid);
  
  allow update: if isSignedIn() && 
    (resource.data.player1Id == request.auth.uid || 
     resource.data.player2Id == request.auth.uid ||
     isAdmin());
}
```

**What this allows:**
- ✅ Create teams where you're a player
- ✅ Update team confirmation status
- ✅ Dissolve teams you're part of

---

### Storage Rules (`storage.rules`)

#### Profile Pictures
```javascript
match /profile-pictures/{userId}/{fileName} {
  // ✅ Anyone can read profile pictures
  allow read: if isSignedIn();
  
  // ✅ Users can only upload their own pictures (max 5MB, images only)
  allow write: if isSignedIn() && isOwner(userId) && isValidImageUpload();
  
  // ✅ Users can delete their own pictures
  allow delete: if isSignedIn() && isOwner(userId);
}
```

**Validation:**
- Max file size: 5MB
- Only image types allowed (`image/*`)
- Users can't upload to other users' folders

---

## 🧪 Testing the Rules

### Test User Profile Update

1. **Login to your app**: `http://localhost:3000/login`
2. **Go to Profile**: Navigate to `/profile`
3. **Update your data**: Change name, phone, skill level, etc.
4. **Click Save Changes**
5. **Verify**: Data should save successfully and update immediately

### Test Real-Time Sync

1. **Open your app in two browser tabs** (same user)
2. **In Tab 1**: Go to `/profile` and update your name
3. **In Tab 2**: The profile should update **automatically** without refresh
4. **Check console**: You should see `[v0] User data updated from Firestore`

### Test Profile Picture Upload

1. **Go to Profile page**
2. **Click camera icon** on avatar
3. **Select an image** (must be <5MB)
4. **Upload should succeed** and avatar should update immediately

### Test Another User's Profile (Should Fail)

Try to manually upload to another user's folder - should be denied:
```javascript
// This should fail with permission denied
const otherUserRef = ref(storage, `profile-pictures/other-user-id/test.jpg`)
await uploadBytes(otherUserRef, file) // ❌ Permission denied
```

---

## ✅ Verification Checklist

After deploying rules, verify:

- [ ] Users can read all user profiles
- [ ] Users can update their own profile
- [ ] Users can upload their own profile picture
- [ ] Users **cannot** update other users' profiles
- [ ] Users **cannot** upload to other users' folders
- [ ] Admins can update any user profile
- [ ] Real-time sync works (profile updates without refresh)
- [ ] Registration creation works
- [ ] Team formation works
- [ ] Notifications work

---

## 🐛 Troubleshooting

### "Permission Denied" Error on Profile Update

**Problem**: Getting permission denied when updating profile

**Solution**:
1. Check if rules are deployed: Firebase Console → Firestore → Rules
2. Verify user is logged in: Check `user` is not null
3. Check user ID matches: `request.auth.uid === userId`

### Real-Time Sync Not Working

**Problem**: Profile doesn't update automatically

**Solution**:
1. Check console for `[v0] User data updated from Firestore`
2. Verify `onSnapshot` listener is set up (check network tab)
3. Clear browser cache and refresh

### Profile Picture Upload Fails

**Problem**: Image upload returns permission denied

**Solution**:
1. Check file size: Must be <5MB
2. Check file type: Must be `image/*`
3. Verify storage rules are deployed
4. Check path matches: `profile-pictures/{userId}/{fileName}`

### Rules Not Taking Effect

**Problem**: Changes to rules not working

**Solution**:
```bash
# Re-deploy rules
firebase deploy --only firestore:rules,storage:rules

# Verify deployment in console
# Firebase Console → Firestore → Rules
# Check "Last Updated" timestamp
```

---

## 📚 Additional Resources

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security Rules Documentation](https://firebase.google.com/docs/storage/security/get-started)
- [Rules Playground](https://firebase.google.com/docs/rules/simulator) - Test rules before deploying

---

## 🎯 Quick Deploy Commands

```bash
# Deploy everything
firebase deploy --only firestore:rules,storage:rules

# Just Firestore
firebase deploy --only firestore:rules

# Just Storage
firebase deploy --only storage:rules

# View rules locally before deploying
cat firestore.rules
cat storage.rules
```

---

## ✅ Summary

**Files Created:**
- `firestore.rules` - Firestore Security Rules
- `storage.rules` - Storage Security Rules
- This deployment guide

**Code Updated:**
- `lib/auth-context.tsx` - Now uses real-time `onSnapshot` listener

**What Works Now:**
- ✅ Profile updates sync in real-time
- ✅ Users can update their own data
- ✅ Users can upload profile pictures
- ✅ Admins can manage all data
- ✅ Proper security enforcement

---

**Deploy the rules now to fix the data sync issue!**
