# Event Filtering Implementation Guide

## ✅ Event Fetching Actions Created

**File:** `lib/event-actions.ts`

### Functions Available:

#### 1. **getPublicEvents()** - For Homepage/User View
```tsx
import { getPublicEvents } from "@/lib/event-actions"

// Fetch all public events
const result = await getPublicEvents()

// Fetch upcoming public events only
const result = await getPublicEvents({ upcomingOnly: true })

// Fetch with limit
const result = await getPublicEvents({ upcomingOnly: true, limitCount: 10 })
```

**Critical Features:**
- ✅ Always includes `where('isPublic', '==', true)`
- ✅ Query order matches Firestore Index: (isPublic ASC, dateTime ASC)
- ✅ Returns events with `isPast` and `isUpcoming` flags

#### 2. **getAllEventsForAdmin()** - For Admin Dashboard
```tsx
import { getAllEventsForAdmin } from "@/lib/event-actions"

// Fetch ALL events (public + private)
const result = await getAllEventsForAdmin()

// Admin sees everything - no isPublic filter
```

#### 3. **getEventById()** - Single Event
```tsx
import { getEventById } from "@/lib/event-actions"

const result = await getEventById(eventId)
// Security rules enforce: non-admins cannot access private events
```

#### 4. **Helper Functions**
```tsx
import { canViewEvent, getVisibilityBadge } from "@/lib/event-actions"

// Check if user can view event
const canView = canViewEvent(event, isAdmin)

// Get badge styling
const badge = getVisibilityBadge(event)
// Returns: { text: "Public" | "Private", variant: "default" | "secondary" }
```

---

## 📋 Implementation Examples

### **Example 1: Public Events Page (Homepage)**

```tsx
// app/(app)/events/page.tsx
"use client"

import { useEffect, useState } from "react"
import { getPublicEvents, type EventWithStatus } from "@/lib/event-actions"
import { EventCard } from "@/components/events/event-card"
import { Spinner } from "@/components/ui/spinner"

export default function EventsPage() {
  const [events, setEvents] = useState<EventWithStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      // CRITICAL: Uses getPublicEvents with isPublic filter
      const result = await getPublicEvents({ 
        upcomingOnly: true,  // Only upcoming events
        limitCount: 50 
      })

      if (result.success && result.data) {
        setEvents(result.data)
      }

      setLoading(false)
    }

    fetchEvents()
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Upcoming Events</h1>
      
      {events.length === 0 ? (
        <p className="text-muted-foreground">No upcoming events</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.eventId} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### **Example 2: Admin Events Dashboard**

```tsx
// app/(app)/admin/events/page.tsx
"use client"

import { useEffect, useState } from "react"
import { getAllEventsForAdmin, type EventWithStatus } from "@/lib/event-actions"
import { withAdminProtection } from "@/lib/with-admin-protection"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff } from "lucide-react"

function AdminEventsPage() {
  const [events, setEvents] = useState<EventWithStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      // NO isPublic filter - shows all events
      const result = await getAllEventsForAdmin()

      if (result.success && result.data) {
        setEvents(result.data)
      }

      setLoading(false)
    }

    fetchEvents()
  }, [])

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">
        All Events (Admin View)
      </h1>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left">Event Name</th>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Visibility</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr 
                key={event.eventId}
                // Visually distinguish private events
                className={!event.isPublic ? "bg-muted/20 opacity-75" : ""}
              >
                <td className="p-4 font-medium">
                  {event.eventName}
                  {!event.isPublic && (
                    <EyeOff className="inline-block ml-2 h-4 w-4 text-muted-foreground" />
                  )}
                </td>
                <td className="p-4">
                  {event.dateTime.toDate().toLocaleDateString()}
                </td>
                <td className="p-4">
                  {/* Visual badge for visibility */}
                  {event.isPublic ? (
                    <Badge variant="default" className="gap-1">
                      <Eye className="h-3 w-3" />
                      Public
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <EyeOff className="h-3 w-3" />
                      Private
                    </Badge>
                  )}
                </td>
                <td className="p-4">
                  <Badge variant={event.isUpcoming ? "default" : "outline"}>
                    {event.isUpcoming ? "Upcoming" : "Past"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default withAdminProtection(AdminEventsPage)
```

---

### **Example 3: Event Card Component with Visibility Badge**

```tsx
// components/events/event-card.tsx
import { type EventWithStatus } from "@/lib/event-actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEventDateTime } from "@/lib/date-utils"
import { Eye, EyeOff, Calendar, MapPin } from "lucide-react"

interface EventCardProps {
  event: EventWithStatus
  showVisibilityBadge?: boolean  // Show for admin
}

export function EventCard({ event, showVisibilityBadge = false }: EventCardProps) {
  return (
    <Card className={!event.isPublic ? "border-dashed opacity-75" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl">{event.eventName}</CardTitle>
          
          {/* Show visibility badge for admins */}
          {showVisibilityBadge && (
            <Badge 
              variant={event.isPublic ? "default" : "secondary"}
              className="gap-1 text-xs"
            >
              {event.isPublic ? (
                <>
                  <Eye className="h-3 w-3" />
                  Public
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" />
                  Private
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formatEventDateTime(event.dateTime)}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{event.locationName}</span>
        </div>

        {!event.isPublic && showVisibilityBadge && (
          <p className="text-xs text-muted-foreground italic mt-2">
            Only visible to admins and via direct link
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

---

### **Example 4: Conditional Query Based on User Role**

```tsx
// components/events/events-list.tsx
"use client"

import { useEffect, useState } from "react"
import { useIsAdmin } from "@/lib/with-admin-protection"
import { getPublicEvents, getAllEventsForAdmin, type EventWithStatus } from "@/lib/event-actions"

export function EventsList() {
  const [events, setEvents] = useState<EventWithStatus[]>([])
  const isAdmin = useIsAdmin()

  useEffect(() => {
    async function fetchEvents() {
      // Conditional fetching based on role
      const result = isAdmin
        ? await getAllEventsForAdmin({ upcomingOnly: true })
        : await getPublicEvents({ upcomingOnly: true })

      if (result.success && result.data) {
        setEvents(result.data)
      }
    }

    fetchEvents()
  }, [isAdmin])

  return (
    <div>
      {isAdmin && (
        <div className="mb-4 rounded-lg border border-warning bg-warning/10 p-3">
          <p className="text-sm text-warning-foreground">
            👁️ Admin View: Showing all events (public + private)
          </p>
        </div>
      )}

      {/* Render events */}
      {events.map((event) => (
        <EventCard 
          key={event.eventId} 
          event={event} 
          showVisibilityBadge={isAdmin}  // Only show badge to admins
        />
      ))}
    </div>
  )
}
```

---

## 🔍 Visual Distinction for Private Events

### **Option 1: Grayed Out Row (Recommended)**
```tsx
<tr className={!event.isPublic ? "bg-muted/20 opacity-75" : ""}>
  {/* Row content */}
</tr>
```

### **Option 2: Dashed Border**
```tsx
<Card className={!event.isPublic ? "border-dashed border-muted-foreground/50" : ""}>
  {/* Card content */}
</Card>
```

### **Option 3: Icon Indicator**
```tsx
{!event.isPublic && (
  <EyeOff className="h-4 w-4 text-muted-foreground" />
)}
```

### **Option 4: Badge**
```tsx
{!event.isPublic && (
  <Badge variant="secondary" className="gap-1">
    <EyeOff className="h-3 w-3" />
    Private
  </Badge>
)}
```

### **Recommended: Combine Multiple**
```tsx
// Grayed row + icon + badge
<tr className={!event.isPublic ? "bg-muted/20 opacity-75" : ""}>
  <td>
    {event.eventName}
    {!event.isPublic && <EyeOff className="ml-2 h-4 w-4" />}
  </td>
  <td>
    <Badge variant={event.isPublic ? "default" : "secondary"}>
      {event.isPublic ? "Public" : "Private"}
    </Badge>
  </td>
</tr>
```

---

## 📊 Required Firestore Index

**CRITICAL:** Create this composite index in Firebase Console

**Collection:** `events`

**Fields:**
1. `isPublic` - **Ascending**
2. `dateTime` - **Ascending**

**How to Create:**
1. Go to Firebase Console → Firestore → Indexes
2. Click "Create Index"
3. Collection: `events`
4. Add fields in order:
   - `isPublic` (Ascending)
   - `dateTime` (Ascending)
5. Save

**Or click the link when you get "Missing Index" error**

---

## 🧪 Testing Checklist

### Public Query:
- [ ] Regular users only see public events
- [ ] Query order: `where('isPublic', '==', true), orderBy('dateTime', 'asc')`
- [ ] No private events in results

### Admin Query:
- [ ] Admin sees all events (public + private)
- [ ] No `isPublic` filter in query
- [ ] Private events visually distinguished

### Security:
- [ ] Non-admin cannot access private event by ID
- [ ] Security rules enforce `isPublic == true` for non-admins
- [ ] Admins can access any event by ID

### Visual:
- [ ] Private events have visual indicator (grayed/badge/icon)
- [ ] Admin tables show visibility status clearly
- [ ] Public view never shows private events

---

## 📝 Summary

**Created:**
- ✅ `lib/event-actions.ts` - Event fetching utilities

**Key Functions:**
- ✅ `getPublicEvents()` - With `isPublic` filter
- ✅ `getAllEventsForAdmin()` - No filter
- ✅ `getEventById()` - Single event
- ✅ `canViewEvent()` - Permission check
- ✅ `getVisibilityBadge()` - UI helper

**Index Required:**
- ✅ `(isPublic ASC, dateTime ASC)`

**Visual Distinction:**
- ✅ Grayed rows for private events
- ✅ Visibility badges
- ✅ Eye icons (EyeOff for private)

**Next Steps:**
1. Create Firestore index
2. Update homepage to use `getPublicEvents()`
3. Update admin dashboard to use `getAllEventsForAdmin()`
4. Add visual indicators for private events
5. Test both public and admin views

---

**All utilities ready to use!** 🚀
