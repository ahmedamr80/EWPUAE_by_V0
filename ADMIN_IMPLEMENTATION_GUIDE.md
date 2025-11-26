# Core Admin & Logic Layer - Implementation Guide

## ✅ Implemented Components

### 1. Date & Timezone Handling ✅
**File:** `lib/date-utils.ts`

**Features:**
- ✅ All dates stored as Firestore `Timestamp`
- ✅ Comparisons use `.toMillis()` instead of string comparison
- ✅ All displays use Asia/Dubai timezone
- ✅ Utilities: `formatEventDateTime()`, `isEventUpcoming()`, `isEventPast()`
- ✅ Form helpers: `combineDateTimeToTimestamp()`, `formatEventDateAndTime()`

**Usage Example:**
```tsx
import { formatEventDateTime, isEventUpcoming, timestampToMillis } from "@/lib/date-utils"

// ✅ Correct: Compare milliseconds
if (timestampToMillis(event.dateTime) > Date.now()) {
  // Event is upcoming
}

// ✅ Correct: Display in Dubai time
const displayDate = formatEventDateTime(event.dateTime, "MMM dd, yyyy 'at' h:mm a")
// Output: "Dec 25, 2024 at 6:00 PM" (Dubai time)

// ❌ Wrong: Don't compare strings
if (event.dateTime > new Date()) // NEVER DO THIS
```

---

### 2. Error Handling System ✅
**File:** `lib/error-utils.ts`

**Features:**
- ✅ Standardized `ApiResponse<T>` format
- ✅ `createSuccessResponse()` and `createErrorResponse()`
- ✅ `handleAsync()` wrapper for try-catch
- ✅ Custom errors: `ValidationError`, `PermissionError`, `ConflictError`
- ✅ Validation helpers: `validateRequired()`, `validateEmail()`, `validatePhone()`

**Usage Example:**
```tsx
import { handleAsync, validateRequired, ApiResponse } from "@/lib/error-utils"

async function createEvent(data: EventData): Promise<ApiResponse<Event>> {
  return handleAsync(async () => {
    // Validate
    validateRequired({ eventName: data.eventName, dateTime: data.dateTime })
    
    // Create event
    const event = await db.collection("events").add(data)
    return event
  }, "Failed to create event")
}

// In component
const result = await createEvent(formData)
if (!result.success) {
  toast({ variant: "destructive", description: result.message })
}
```

---

### 3. Admin Route Protection ✅
**File:** `lib/with-admin-protection.tsx`

**Features:**
- ✅ HOC: `with AdminProtection()` for page-level protection
- ✅ Hook: `useIsAdmin()` to check admin status
- ✅ Hook: `useRequireAdmin()` to enforce admin access
- ✅ Automatic redirects for non-admin users

**Usage Example:**
```tsx
// Protect entire admin page
import { withAdminProtection } from "@/lib/with-admin-protection"

function AdminDashboard() {
  return <div>Admin content</div>
}

export default withAdminProtection(AdminDashboard)

// Or use hooks for conditional rendering
import { useIsAdmin } from "@/lib/with-admin-protection"

function SomeComponent() {
  const isAdmin = useIsAdmin()
  
  return (
    <div>
      {isAdmin && <button>Delete Event</button>}
    </div>
  )
}
```

---

### 4. Shadow Account Support ✅
**Updated:** `lib/types.ts`

**Changes:**
```tsx
export interface User {
  // ... existing fields
  isShadow?: boolean // Shadow account created by admin, pending real user signup
}
```

**Implementation Flow:**
1. Admin creates user → Set `isShadow: true`, no Firebase Auth user
2. Real user signs up → Check for existing shadow account by email
3. If found → Merge Auth UID, set `isShadow: false`, preserve admin data

---

## 🚧 Components to Implement Next

### 5. DataTable Component (TanStack Table)
**File:** `components/admin/data-table.tsx`

**Features to implement:**
- [ ] Generic reusable table component
- [ ] Client-side sorting
- [ ] Search/filter bar
- [ ] Pagination
- [ ] Row actions (Edit, Delete, Duplicate)
- [ ] Mobile-responsive

### 6. Admin Layout with Sidebar
**File:** `components/admin/admin-layout.tsx`

**Features to implement:**
- [ ] Sidebar navigation (Events, Players, Clubs, Settings)
- [ ] Header with user menu
- [ ] Responsive sidebar (mobile drawer)
- [ ] Active route highlighting

### 7. Event Cloning Logic
**File:** `lib/admin-actions.ts`

**Implementation:**
```tsx
async function duplicateEvent(eventId: string): Promise<ApiResponse<Event>> {
  return handleAsync(async () => {
    // 1. Fetch original event
    const originalEvent = await getDoc(doc(db, "events", eventId))
    
    // 2. Strip id, timestamps
    const { id, createdAt, updatedAt, ...eventData } = originalEvent.data()
    
    // 3. Modify for copy
    const newEvent = {
      ...eventData,
      eventName: `${eventData.eventName} (Copy)`,
      status: "DRAFT",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    
    // 4. Create new event
    const newDoc = await addDoc(collection(db, "events"), newEvent)
    return { id: newDoc.id, ...newEvent }
  }, "Failed to duplicate event")
}
```

### 8. Registration Idempotency
**File:** `lib/registration-actions.ts`

**Implementation:**
```tsx
async function registerForEvent(
  eventId: string,
  userId: string
): Promise<ApiResponse<Registration>> {
  return handleAsync(async () => {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Read event
      const eventRef = doc(db, "events", eventId)
      const eventDoc = await transaction.get(eventRef)
      const event = eventDoc.data()
      
      // 2. Check slots available
      if (event.slotsAvailable <= 0) {
        throw new ConflictError("Event is full")
      }
      
      // 3. Check if already registered
      const registrationRef = doc(db, "registrations", `${eventId}_${userId}`)
      const existingReg = await transaction.get(registrationRef)
      
      if (existingReg.exists()) {
        throw new ConflictError("Already registered for this event")
      }
      
      // 4. Write registration
      const registration = {
        eventId,
        playerId: userId,
        status: "CONFIRMED",
        registeredAt: serverTimestamp(),
      }
      transaction.set(registrationRef, registration)
      
      // 5. Decrement slots
      transaction.update(eventRef, {
        slotsAvailable: event.slotsAvailable - 1
      })
      
      return registration
    })
    
    return result
  }, "Failed to register for event")
}
```

### 9. Members Directory
**File:** `app/(app)/members/page.tsx`

**Features:**
- [ ] Grid of user cards
- [ ] Privacy: Only show displayName, photoURL, skillLevel, position
- [ ] Filter by skill level
- [ ] Search by name
- [ ] Auth-protected

### 10. Shadow Account Merge Logic
**File:** `lib/shadow-account-utils.ts`

**Implementation:**
```tsx
async function mergeShadowAccount(
  authUser: FirebaseUser,
  shadowEmail: string
): Promise<ApiResponse<User>> {
  return handleAsync(async () => {
    // 1. Query for shadow account
    const usersRef = collection(db, "users")
    const q = query(
      usersRef,
      where("email", "==", shadowEmail),
      where("isShadow", "==", true)
    )
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      // No shadow account found, create normal user
      return createNewUser(authUser)
    }
    
    // 2. Merge data
    const shadowDoc = snapshot.docs[0]
    const shadowData = shadowDoc.data()
    
    const mergedData = {
      ...shadowData,
      uid: authUser.uid,
      email: authUser.email,
      isShadow: false,
      photoUrl: authUser.photoURL || shadowData.photoUrl,
      updatedAt: serverTimestamp(),
    }
    
    // 3. Delete shadow doc and create real user doc
    await runTransaction(db, async (transaction) => {
      transaction.delete(shadowDoc.ref)
      transaction.set(doc(db, "users", authUser.uid), mergedData)
    })
    
    return mergedData
  }, "Failed to merge shadow account")
}
```

---

## 📋 Implementation Checklist

### Core Utilities ✅
- [x] Date & Timezone utils (`lib/date-utils.ts`)
- [x] Error handling utils (`lib/error-utils.ts`)
- [x] Admin protection HOC (`lib/with-admin-protection.tsx`)
- [x] Shadow account type support (`lib/types.ts`)

### Admin Components 🚧  
- [ ] DataTable component
- [ ] Admin Layout with sidebar
- [ ] Event management table
- [ ] Player management table
- [ ] Club management table

### Business Logic 🚧
- [ ] Event cloning action
- [ ] Registration with idempotency
- [ ] Shadow account creation
- [ ] Shadow account merge on signup
- [ ] Members directory

### Dependencies ✅
- [x] `date-fns` - Date formatting
- [x] `date-fns-tz` - Timezone support
- [x] `@tanstack/react-table` - Table component

---

## 🎯 Next Steps

1. **Install Additional Dependencies** (if needed):
   ```bash
   npm install @tanstack/react-table
   ```

2. **Update Auth Context** to check for shadow accounts on signup

3. **Create DataTable Component** for reusable admin tables

4. **Build Admin Layout** with sidebar navigation

5. **Implement Admin Actions** (CRUD operations)

6. **Create Members Directory** page

7. **Test Shadow Account Flow** end-to-end

---

## 📚 Documentation

All utility functions are documented with JSDoc comments. Import and use:

```tsx
// Date utilities
import { formatEventDateTime, isEventUpcoming } from "@/lib/date-utils"

// Error handling
import { handleAsync, createSuccessResponse } from "@/lib/error-utils"

// Admin protection
import { withAdminProtection, useIsAdmin } from "@/lib/with-admin-protection"
```

---

## 🔒 Security Notes

1. **Admin Actions**: Always verify `user.role === "admin"` on backend
2. **Shadow Accounts**: Only admins can create shadow users
3. **Firestore Rules**: Update to allow shadow account queries
4. **Member Privacy**: Never expose phone/email in members directory

---

**Status**: Core utilities complete. Ready to build admin components.
