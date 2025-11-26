# Event Visibility Feature - Implementation Guide

## ✅ Implemented

### 1. Schema Update ✅
**File:** `lib/types.ts`

The `Event` interface already includes `isPublic: boolean`

### 2. Migration Utility ✅
**File:** `lib/event-migration.ts`

Functions created:
- `migrateEventsToPublic()` - Migrates all legacy events
- `getEventsMigrationCount()` - Gets count of events needing migration
- `verifyEventsMigration()` - Verifies migration completion

### 3. Security Rules ✅
**File:** `firestore.rules`

Updated rules:
```javascript
// Events collection - WITH VISIBILITY CONTROL
match /events/{eventId} {
  // Authenticated users can only see public events
  // Admins can see ALL events
  allow read: if isSignedIn() && (resource.data.isPublic == true || isAdmin());
  
  // Only admins can create/update/delete events
  allow create, update, delete: if isAdmin();
}
```

---

## 📋 Implementation Tasks

### ✅ STEP 1: Deploy Updated Firestore Rules

**Deploy the rules:**
```bash
firebase deploy --only firestore:rules
```

**Or via Firebase Console:**
1. Go to Firebase Console → Firestore → Rules
2. Copy contents of `firestore.rules`
3. Paste and Publish

---

### 🚧 STEP 2: Run Migration (BEFORE Adding Visibility Filter to Queries)

**Create Migration Button Component:**

Create `components/admin/migrate-events-button.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { 
  migrateEventsToPublic, 
  getEventsMigrationCount 
} from "@/lib/event-migration"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export function MigrateEventsButton() {
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const { toast } = useToast()

  const checkCount = async () => {
    const result = await getEventsMigrationCount()
    if (result.success && result.data !== undefined) {
      setCount(result.data)
    }
  }

  const handleMigrate = async () => {
    setLoading(true)
    
    const result = await migrateEventsToPublic()
    
    if (result.success && result.data) {
      const { totalProcessed, successCount, failedCount } = result.data
      
      toast({
        title: "Migration Complete!",
        description: `✅ Migrated ${successCount} events. ${failedCount > 0 ? `⚠️ ${failedCount} failed.` : ""}`,
      })
      
      setCount(0) // Reset count after migration
    } else {
      toast({
        variant: "destructive",
        title: "Migration Failed",
        description: result.message || "Failed to migrate events",
      })
    }
    
    setLoading(false)
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-warning" />
          Legacy Event Migration
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Migrate events without the <code className="px-1 py-0.5 rounded bg-muted">isPublic</code> field 
          to ensure they remain visible after adding visibility filters.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={checkCount}
          disabled={loading}
        >
          Check Count
        </Button>
        
        {count !== null && (
          <span className="text-sm">
            {count === 0 ? (
              <span className="text-success flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                All events migrated!
              </span>
            ) : (
              <span className="text-warning">
                {count} event{count !== 1 ? "s" : ""} need{count === 1 ? "s" : ""} migration
              </span>
            )}
          </span>
        )}
      </div>

      <Button 
        onClick={handleMigrate} 
        disabled={loading || count === 0}
        className="w-full"
      >
        {loading ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Migrating Events...
          </>
        ) : (
          "Migrate Events to Public"
        )}
      </Button>
    </div>
  )
}
```

**Add to Admin Dashboard:**
```tsx
// app/(app)/admin/page.tsx
import { MigrateEventsButton } from "@/components/admin/migrate-events-button"

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1>Admin Dashboard</h1>
      
      {/* Add Migration Tool */}
      <MigrateEventsButton />
      
      {/* Rest of dashboard */}
    </div>
  )
}
```

---

### 🚧 STEP 3: Add isPublic Toggle to Event Form

**Update Admin Event Form Component:**

```tsx
// Find your EventForm component and add:

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function EventForm({ event }: { event?: Event }) {
  const [isPublic, setIsPublic] = useState(event?.isPublic ?? true) // Default to true

  return (
    <form>
      {/* ... other form fields ... */}

      {/* Add Public Toggle */}
      <div className="flex items-center justify-between space-y-2 rounded-lg border border-border bg-muted/20 p-4">
        <div className="space-y-0.5">
          <Label htmlFor="public-toggle" className="text-base">
            Public Event
          </Label>
          <p className="text-sm text-muted-foreground">
            If disabled, this event will only be visible via direct link or to Admins.
          </p>
        </div>
        <Switch
          id="public-toggle"
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
      </div>

      {/* ... rest of form ... */}
    </form>
  )
}
```

---

### 🚧 STEP 4: Update Public Event Queries

**Update Homepage/Events List:**

```tsx
// Before: Fetch all events
const eventsRef = collection(db, "events")
const eventsQuery = query(
  eventsRef,
  orderBy("dateTime", "asc")
)

// After: Filter by isPublic === true
const eventsRef = collection(db, "events")
const eventsQuery = query(
  eventsRef,
  where("isPublic", "==", true),  // ✅ Only public events
  orderBy("dateTime", "asc")
)

const snapshot = await getDocs(eventsQuery)
```

**Important:** This query requires a Firestore composite index:
```
Collection: events
Fields: isPublic (Ascending), dateTime (Ascending)
```

**Create the index:**
1. Go to Firebase Console → Firestore → Indexes
2. Click "Create Index"
3. Collection: `events`
4. Fields:
   - `isPublic` - Ascending
   - `dateTime` - Ascending
5. Save

---

### 🚧 STEP 5: Admin Events List (Show All)

**Admin should see all events (public + private):**

```tsx
// In admin dashboard
const { isAdmin } = useIsAdmin()

const eventsQuery = isAdmin
  ? query(collection(db, "events"), orderBy("dateTime", "asc")) // All events
  : query(
      collection(db, "events"), 
      where("isPublic", "==", true),  // Only public
      orderBy("dateTime", "asc")
    )
```

---

## 📊 Testing Checklist

### After Migration:

- [ ] Run migration button - should migrate all legacy events
- [ ] Check count - should be 0 after migration
- [ ] Verify in Firestore - all events should have `isPublic: true`

### Event Creation:

- [ ] Create new event with toggle ON → should be public
- [ ] Create new event with toggle OFF → should be private
- [ ] Edit event and toggle visibility → should update

### Query Testing:

- [ ] Regular user should only see public events
- [ ] Regular user cannot access private event by ID (security rule blocks it)
- [ ] Admin can see all events (public + private)
- [ ] Admin can access private events by ID

### Security Rules:

- [ ] Deploy rules to Firebase
- [ ] Test as regular user - should only see public events
- [ ] Test as admin - should see all events

---

## 🔍 Common Issues

### Issue: "Missing Index" Error

**Error:**
```
The query requires an index. You can create it here: [link]
```

**Solution:**
Click the link in error or manually create index:
- Collection: `events`
- Fields: `isPublic` (Ascending), `dateTime` (Ascending)

### Issue: Existing Events Disappeared

**Cause:** Added `where("isPublic", "==", true)` before migrating

**Solution:**
1. Run migration first
2. Then add the `where` filter to queries

### Issue: Permission Denied

**Cause:** Security rules not deployed

**Solution:**
```bash
firebase deploy --only firestore:rules
```

---

## 📝 Summary

**Created Files:**
- ✅ `lib/event-migration.ts` - Migration functions
- 🚧 `components/admin/migrate-events-button.tsx` - Migration UI (example above)

**Updated Files:**
- ✅ `firestore.rules` - Event visibility enforcement

**Next Steps:**
1. ✅ Deploy Firestore rules
2. ✅ Create migration button component
3. ✅ Add to admin dashboard
4. ✅ Run migration
5. ✅ Add isPublic toggle to event form
6. ✅ Update public event queries with `where("isPublic", "==", true)`
7. ✅ Create Firestore index for (isPublic, dateTime)

---

**All utilities are ready. Follow the steps above to complete implementation!** 🚀
