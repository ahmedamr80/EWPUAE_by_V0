"use client"

import { useEffect, useState } from "react"
import { getPublicEvents, type EventWithStatus } from "@/lib/event-actions"
import { calculateEventStatus } from "@/lib/date-utils"
import { EventCard } from "@/components/events/event-card"
import { EventFilters } from "@/components/events/event-filters"
import { Spinner } from "@/components/ui/spinner"
import { Calendar } from "lucide-react"

type FilterStatus = "all" | "Upcoming" | "Active" | "Past"

import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Registration } from "@/lib/types"

export default function EventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<EventWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>("all")
  const [userRegistrations, setUserRegistrations] = useState<Record<string, Registration>>({})

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      // 1. Fetch Events
      const eventsResponse = await getPublicEvents({ upcomingOnly: false })
      if (eventsResponse.data) {
        setEvents(eventsResponse.data)
      }

      // 2. Fetch User Registrations (if logged in)
      if (user) {
        try {
          const q = query(
            collection(db, "registrations"),
            where("playerId", "==", user.uid),
            where("status", "!=", "WITHDRAWN")
          )
          const snapshot = await getDocs(q)
          const regsMap: Record<string, Registration> = {}
          snapshot.forEach((doc) => {
            const data = doc.data() as Registration
            regsMap[data.eventId] = data
          })
          setUserRegistrations(regsMap)
        } catch (error) {
          console.error("Error fetching user registrations:", error)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [user])

  // Process events to determine dynamic status
  const processedEvents = events.map((event) => {
    // Calculate dynamic status
    // If DB says 'Cancelled', keep it. Otherwise use derived status.
    const dynamicStatus = event.status === "Cancelled"
      ? "Cancelled"
      : calculateEventStatus(event.dateTime, event.duration)

    return {
      ...event,
      status: dynamicStatus, // Override status for display
    } as EventWithStatus
  })

  // Group events by status
  const activeEvents = processedEvents.filter((e) => e.status === "Active")
  const upcomingEvents = processedEvents.filter((e) => e.status === "Upcoming")

  // Past events come sorted ASC (oldest first) from DB. 
  // We usually want to see the most recent past events first, so we reverse them.
  const pastEvents = processedEvents.filter((e) => e.status === "Past").reverse()

  // Determine what to show based on filter
  const showActive = (filter === "all" || filter === "Active") && activeEvents.length > 0
  const showUpcoming = (filter === "all" || filter === "Upcoming") && upcomingEvents.length > 0
  const showPast = (filter === "all" || filter === "Past") && pastEvents.length > 0

  const hasEventsToShow = showActive || showUpcoming || showPast

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground">Find and register for Padel events</p>
        </div>
      </div>

      <EventFilters currentFilter={filter} onFilterChange={setFilter} />

      {!hasEventsToShow ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No events found</h3>
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? "Check back later for new events" : `No ${filter.toLowerCase()} events`}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {showActive && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-primary">Happening Now</h2>
              <div className="grid gap-4">
                {activeEvents.map((event) => (
                  <EventCard
                    key={event.eventId}
                    event={event}
                    userRegistrationStatus={userRegistrations[event.eventId]?.status}
                  />
                ))}
              </div>
            </section>
          )}

          {showUpcoming && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Upcoming Events</h2>
              <div className="grid gap-4">
                {upcomingEvents.map((event, index) => (
                  <EventCard
                    key={event.eventId}
                    event={event}
                    priority={index < 2}
                    userRegistrationStatus={userRegistrations[event.eventId]?.status}
                  />
                ))}
              </div>
            </section>
          )}

          {showPast && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-muted-foreground">Past Events</h2>
              <div className="grid gap-4">
                {pastEvents.map((event) => (
                  <EventCard
                    key={event.eventId}
                    event={event}
                    isPast
                    userRegistrationStatus={userRegistrations[event.eventId]?.status}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
