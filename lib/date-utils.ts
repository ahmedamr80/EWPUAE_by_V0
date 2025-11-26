/**
 * Date and Timezone Utilities for EveryWherePadel
 * 
 * Critical: All events are displayed in Asia/Dubai timezone
 * regardless of user's current location
 */

import { format, formatDistanceToNow, isPast, isFuture, addDays } from "date-fns"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"
import type { Timestamp } from "firebase/firestore"

// Dubai timezone constant
export const DUBAI_TIMEZONE = "Asia/Dubai"

/**
 * Convert Firestore Timestamp to milliseconds
 * Use this for comparisons instead of string comparisons
 */
export function timestampToMillis(timestamp: Timestamp | null | undefined): number {
    if (!timestamp) return 0
    return timestamp.toMillis()
}

/**
 * Check if an event is upcoming (future)
 * Correct way: Compare milliseconds, not strings
 */
export function isEventUpcoming(eventDateTime: Timestamp | null | undefined): boolean {
    if (!eventDateTime) return false
    return timestampToMillis(eventDateTime) > Date.now()
}

/**
 * Check if an event is past
 */
export function isEventPast(eventDateTime: Timestamp | null | undefined): boolean {
    if (!eventDateTime) return false
    return timestampToMillis(eventDateTime) < Date.now()
}

/**
 * Format event date/time for display in Dubai timezone
 * Examples:
 * - "Dec 25, 2024 at 6:00 PM" (Dubai time)
 * - "Monday, Dec 25 at 6:00 PM"
 */
export function formatEventDateTime(
    timestamp: Timestamp | null | undefined,
    formatString: string = "MMM dd, yyyy 'at' h:mm a"
): string {
    if (!timestamp) return "Date not set"

    try {
        const date = timestamp.toDate()
        return formatInTimeZone(date, DUBAI_TIMEZONE, formatString)
    } catch (error) {
        console.error("Error formatting date:", error)
        return "Invalid date"
    }
}

/**
 * Format date for display (Dubai timezone)
 * Example: "December 25, 2024"
 */
export function formatEventDate(timestamp: Timestamp | null | undefined): string {
    return formatEventDateTime(timestamp, "MMMM dd, yyyy")
}

/**
 * Format time for display (Dubai timezone)
 * Example: "6:00 PM"
 */
export function formatEventTime(timestamp: Timestamp | null | undefined): string {
    return formatEventDateTime(timestamp, "h:mm a")
}

/**
 * Format date and time separately for forms
 */
export function formatEventDateAndTime(timestamp: Timestamp | null | undefined): {
    date: string // YYYY-MM-DD for input[type="date"]
    time: string // HH:mm for input[type="time"]
} {
    if (!timestamp) {
        return { date: "", time: "" }
    }

    try {
        const date = timestamp.toDate()
        return {
            date: formatInTimeZone(date, DUBAI_TIMEZONE, "yyyy-MM-dd"),
            time: formatInTimeZone(date, DUBAI_TIMEZONE, "HH:mm"),
        }
    } catch (error) {
        console.error("Error formatting date and time:", error)
        return { date: "", time: "" }
    }
}

/**
 * Get relative time string (e.g., "in 2 days", "3 hours ago")
 * Accounts for Dubai timezone
 */
export function getRelativeTimeString(timestamp: Timestamp | null | undefined): string {
    if (!timestamp) return ""

    try {
        const date = timestamp.toDate()
        const dubaiDate = toZonedTime(date, DUBAI_TIMEZONE)
        return formatDistanceToNow(dubaiDate, { addSuffix: true })
    } catch (error) {
        console.error("Error getting relative time:", error)
        return ""
    }
}

/**
 * Get event status based on date
 */
export function getEventStatus(
    eventDateTime: Timestamp | null | undefined,
    currentStatus?: string
): "Upcoming" | "Active" | "Past" | "Cancelled" {
    if (currentStatus === "Cancelled") return "Cancelled"
    if (!eventDateTime) return "Upcoming"

    const now = Date.now()
    const eventMillis = timestampToMillis(eventDateTime)

    if (eventMillis > now) return "Upcoming"
    if (eventMillis <= now && eventMillis > now - (24 * 60 * 60 * 1000)) return "Active"
    return "Past"
}

/**
 * Sort events by date (ascending - soonest first)
 * Use this instead of string sorting
 */
export function sortEventsByDate<T extends { dateTime: Timestamp | null | undefined }>(
    events: T[],
    order: "asc" | "desc" = "asc"
): T[] {
    return [...events].sort((a, b) => {
        const aMillis = timestampToMillis(a.dateTime)
        const bMillis = timestampToMillis(b.dateTime)
        return order === "asc" ? aMillis - bMillis : bMillis - aMillis
    })
}

/**
 * Convert date string and time string to Firestore Timestamp (Dubai timezone)
 * Use for form submissions
 */
export function combineDateTimeToTimestamp(dateStr: string, timeStr: string): Date {
    // Combine date and time strings
    const dateTimeStr = `${dateStr}T${timeStr}:00`

    // Parse as Dubai timezone
    const dubaiDate = toZonedTime(new Date(dateTimeStr), DUBAI_TIMEZONE)

    return dubaiDate
}

/**
 * Check if registration deadline has passed
 */
export function isRegistrationOpen(
    eventDateTime: Timestamp | null | undefined,
    hoursBeforeEvent: number = 2
): boolean {
    if (!eventDateTime) return false

    const deadlineMillis = timestampToMillis(eventDateTime) - (hoursBeforeEvent * 60 * 60 * 1000)
    return Date.now() < deadlineMillis
}

/**
 * Parse duration string to milliseconds
 * Supports: "90 min", "1.5 hours", "2 hr", etc.
 * Default: 60 minutes
 */
export function parseDurationToMillis(durationStr: string | undefined | null): number {
    if (!durationStr) return 60 * 60 * 1000 // Default 1 hour

    const lower = durationStr.toLowerCase().trim()

    try {
        // Handle "min" or "minutes"
        if (lower.includes('min')) {
            const minutes = parseInt(lower.replace(/[^0-9]/g, ''), 10)
            return (isNaN(minutes) ? 60 : minutes) * 60 * 1000
        }

        // Handle "hour", "hr"
        if (lower.includes('hour') || lower.includes('hr')) {
            // Extract float number (e.g. "1.5")
            const matches = lower.match(/[0-9.]+/)
            const hours = matches ? parseFloat(matches[0]) : 1
            return (isNaN(hours) ? 1 : hours) * 60 * 60 * 1000
        }
    } catch (e) {
        console.warn("Error parsing duration:", durationStr, e)
    }

    return 60 * 60 * 1000 // Default fallback
}

/**
 * Calculate dynamic event status based on date and duration
 * Returns: 'Upcoming' | 'Active' | 'Past'
 */
export function calculateEventStatus(
    eventDateTime: Timestamp | null | undefined,
    durationStr: string | undefined | null
): 'Upcoming' | 'Active' | 'Past' {
    if (!eventDateTime) return 'Upcoming'

    const now = Date.now()
    const start = timestampToMillis(eventDateTime)
    const duration = parseDurationToMillis(durationStr)
    const end = start + duration

    if (now < start) return 'Upcoming'
    if (now >= start && now <= end) return 'Active'
    return 'Past'
}
