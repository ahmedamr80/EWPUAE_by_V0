"use client"

import { useEffect, useState } from "react"
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Event } from "@/lib/types"
import { EventCard } from "@/components/events/event-card"
import { EventFilters } from "@/components/events/event-filters"
import { Spinner } from "@/components/ui/spinner"
import { Calendar } from "lucide-react"

type FilterStatus = "all" | "Upcoming" | "Active" | "Past"

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>("all")

  useEffect(() => {
    let q = query(collection(db, "events"), orderBy("dateTime", "desc"))

    if (filter !== "all") {
      q = query(collection(db, "events"), where("status", "==", filter), orderBy("dateTime", "desc"))
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData: Event[] = []
      snapshot.forEach((doc) => {
        eventsData.push({ eventId: doc.id, ...doc.data() } as Event)
      })
      setEvents(eventsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [filter])

  // Separate events by status for display
  const upcomingEvents = events.filter((e) => e.status === "Upcoming")
  const activeEvents = events.filter((e) => e.status === "Active")
  const pastEvents = events.filter((e) => e.status === "Past")

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

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No events found</h3>
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? "Check back later for new events" : `No ${filter.toLowerCase()} events`}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filter === "all" && activeEvents.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-primary">Happening Now</h2>
              <div className="grid gap-4">
                {activeEvents.map((event) => (
                  <EventCard key={event.eventId} event={event} />
                ))}
              </div>
            </section>
          )}

          {(filter === "all" || filter === "Upcoming") && upcomingEvents.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Upcoming Events</h2>
              <div className="grid gap-4">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.eventId} event={event} />
                ))}
              </div>
            </section>
          )}

          {(filter === "all" || filter === "Past") && pastEvents.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-muted-foreground">Past Events</h2>
              <div className="grid gap-4">
                {pastEvents.map((event) => (
                  <EventCard key={event.eventId} event={event} isPast />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
