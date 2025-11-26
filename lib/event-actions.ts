/**
 * Event Fetching Actions for EveryWherePadel
 * * CRITICAL: Query order must match Firestore Index exactly
 * Index: (isPublic ASC, dateTime ASC)
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  Timestamp,
  limit,
  type QueryConstraint,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { handleAsync, type ApiResponse } from "@/lib/error-utils"
import { timestampToMillis, calculateEventStatus } from "@/lib/date-utils"
import type { Event } from "@/lib/types"

export interface EventWithStatus extends Event {
  isPast: boolean
  isUpcoming: boolean
  eventId: string
  derivedStatus: "Upcoming" | "Active" | "Past"
}

/**
 * Fetch PUBLIC events for homepage/user view
 * * CRITICAL: Must include where('isPublic', '==', true)
 * Query order matches Firestore Index: (isPublic, dateTime)
 */
export async function getPublicEvents(options?: {
  upcomingOnly?: boolean
  limitCount?: number
}): Promise<ApiResponse<EventWithStatus[]>> {
  return handleAsync(async () => {
    const eventsRef = collection(db, "events")
    const constraints: QueryConstraint[] = []

    // CRITICAL: Always filter by isPublic === true for public view
    // This matches the security rule: allow list: if resource.data.isPublic == true
    constraints.push(where("isPublic", "==", true))

    // Optional: Filter for upcoming events only
    // Note: If we want to support "Past" filter on client side without refetching,
    // we should probably fetch all (or recent past) and filter in memory.
    if (options?.upcomingOnly) {
      constraints.push(where("dateTime", ">=", Timestamp.now()))
    }

    // Order by dateTime (ascending - soonest first)
    // This matches the Firestore Index: (isPublic ASC, dateTime ASC)
    constraints.push(orderBy("dateTime", "asc"))

    // Optional: Limit results
    if (options?.limitCount) {
      constraints.push(limit(options.limitCount))
    }

    const eventsQuery = query(eventsRef, ...constraints)
    const snapshot = await getDocs(eventsQuery)

    const events: EventWithStatus[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Event
      const now = Date.now()
      const eventMillis = data.dateTime ? timestampToMillis(data.dateTime) : 0
      const derivedStatus = calculateEventStatus(data.dateTime, data.duration)

      return {
        ...data,
        eventId: doc.id,
        isPast: eventMillis < now,
        isUpcoming: eventMillis > now,
        derivedStatus,
      }
    })

    console.log(`[getPublicEvents] Fetched ${events.length} public events`)
    return events
  }, "Failed to fetch public events")
}

/**
 * Fetch ALL events for Admin Dashboard
 * * No isPublic filter - shows both public and private/draft events
 */
export async function getAllEventsForAdmin(options?: {
  upcomingOnly?: boolean
  limitCount?: number
}): Promise<ApiResponse<EventWithStatus[]>> {
  return handleAsync(async () => {
    const eventsRef = collection(db, "events")
    const constraints: QueryConstraint[] = []

    // Optional: Filter for upcoming events
    if (options?.upcomingOnly) {
      constraints.push(where("dateTime", ">=", Timestamp.now()))
    }

    // Order by dateTime
    constraints.push(orderBy("dateTime", "asc"))

    // Optional: Limit results
    if (options?.limitCount) {
      constraints.push(limit(options.limitCount))
    }

    const eventsQuery = query(eventsRef, ...constraints)
    const snapshot = await getDocs(eventsQuery)

    const events: EventWithStatus[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Event
      const now = Date.now()
      const eventMillis = data.dateTime ? timestampToMillis(data.dateTime) : 0
      const derivedStatus = calculateEventStatus(data.dateTime, data.duration)

      return {
        ...data,
        eventId: doc.id,
        isPast: eventMillis < now,
        isUpcoming: eventMillis > now,
        derivedStatus,
      }
    })

    console.log(`[getAllEventsForAdmin] Fetched ${events.length} events (public + private)`)
    return events
  }, "Failed to fetch events")
}

/**
 * Fetch events by status for Admin Dashboard
 * Note: This relies on the 'status' field in DB which might be outdated.
 * Use with caution or for specific admin queries.
 */
export async function getEventsByStatus(
  status: "Upcoming" | "Active" | "Past" | "Cancelled",
  isAdmin: boolean
): Promise<ApiResponse<EventWithStatus[]>> {
  return handleAsync(async () => {
    const eventsRef = collection(db, "events")
    const constraints: QueryConstraint[] = []

    // For non-admin users, filter by isPublic
    if (!isAdmin) {
      constraints.push(where("isPublic", "==", true))
    }

    // Filter by status
    if (status === "Upcoming") {
      constraints.push(where("dateTime", ">=", Timestamp.now()))
    } else if (status === "Past") {
      constraints.push(where("dateTime", "<", Timestamp.now()))
    } else if (status === "Cancelled") {
      constraints.push(where("status", "==", "Cancelled"))
    }

    // Sort order depends on status
    constraints.push(orderBy("dateTime", status === "Past" ? "desc" : "asc"))

    const eventsQuery = query(eventsRef, ...constraints)
    const snapshot = await getDocs(eventsQuery)

    const events: EventWithStatus[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Event
      const now = Date.now()
      const eventMillis = data.dateTime ? timestampToMillis(data.dateTime) : 0
      const derivedStatus = calculateEventStatus(data.dateTime, data.duration)

      return {
        ...data,
        eventId: doc.id,
        isPast: eventMillis < now,
        isUpcoming: eventMillis > now,
        derivedStatus,
      }
    })

    return events
  }, `Failed to fetch ${status.toLowerCase()} events`)
}

/**
 * Fetch a single event by ID
 */
export async function getEventById(eventId: string): Promise<ApiResponse<EventWithStatus | null>> {
  return handleAsync(async () => {
    const eventRef = doc(db, "events", eventId)
    const eventDoc = await getDoc(eventRef)

    if (!eventDoc.exists()) {
      return null
    }

    const data = eventDoc.data() as Event
    const now = Date.now()
    const eventMillis = data.dateTime ? timestampToMillis(data.dateTime) : 0
    const derivedStatus = calculateEventStatus(data.dateTime, data.duration)

    const event: EventWithStatus = {
      ...data,
      eventId: eventDoc.id,
      isPast: eventMillis < now,
      isUpcoming: eventMillis > now,
      derivedStatus,
    }

    return event
  }, "Failed to fetch event")
}

/**
 * Get upcoming public events count (for badges, stats)
 */
export async function getUpcomingPublicEventsCount(): Promise<ApiResponse<number>> {
  return handleAsync(async () => {
    const eventsRef = collection(db, "events")
    const eventsQuery = query(
      eventsRef,
      where("isPublic", "==", true),
      where("dateTime", ">=", Timestamp.now())
    )

    const snapshot = await getDocs(eventsQuery)
    return snapshot.size
  }, "Failed to get events count")
}

/**
 * Helper: Check if user can view event
 */
export function canViewEvent(event: Event, isAdmin: boolean): boolean {
  if (isAdmin) return true
  return event.isPublic === true
}

/**
 * Helper: Get visibility badge text
 */
export function getVisibilityBadge(event: Event): {
  text: string
  variant: "default" | "secondary" | "outline" | "destructive"
} {
  if (event.isPublic) {
    return {
      text: "Public",
      variant: "default",
    }
  }

  return {
    text: "Private",
    variant: "secondary",
  }
}