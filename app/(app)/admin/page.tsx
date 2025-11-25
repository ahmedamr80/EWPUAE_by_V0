"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Event } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Calendar, Users, ClipboardList, Plus, ImageIcon, Download } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    totalPlayers: 0,
    totalRegistrations: 0,
  })
  const [recentEvents, setRecentEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/events")
    }
  }, [isAdmin, authLoading, router])

  useEffect(() => {
    if (!isAdmin) return

    // Fetch events
    const eventsUnsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      const eventsData: Event[] = []
      let upcoming = 0
      snapshot.forEach((doc) => {
        const event = { eventId: doc.id, ...doc.data() } as Event
        eventsData.push(event)
        if (event.status === "Upcoming") upcoming++
      })
      setStats((prev) => ({ ...prev, totalEvents: eventsData.length, upcomingEvents: upcoming }))
      setRecentEvents(eventsData.slice(0, 5))
    })

    // Fetch players count
    const playersUnsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalPlayers: snapshot.size }))
    })

    // Fetch registrations count
    const regsUnsubscribe = onSnapshot(collection(db, "registrations"), (snapshot) => {
      setStats((prev) => ({ ...prev, totalRegistrations: snapshot.size }))
      setLoading(false)
    })

    return () => {
      eventsUnsubscribe()
      playersUnsubscribe()
      regsUnsubscribe()
    }
  }, [isAdmin])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const statCards = [
    { title: "Total Events", value: stats.totalEvents, icon: Calendar, color: "text-primary" },
    { title: "Upcoming Events", value: stats.upcomingEvents, icon: Calendar, color: "text-success" },
    { title: "Total Players", value: stats.totalPlayers, icon: Users, color: "text-info" },
    { title: "Registrations", value: stats.totalRegistrations, icon: ClipboardList, color: "text-warning" },
  ]

  const quickActions = [
    { title: "Create Event", href: "/admin/events/new", icon: Plus },
    { title: "Manage Players", href: "/admin/players", icon: Users },
    { title: "Media Gallery", href: "/admin/gallery", icon: ImageIcon },
    { title: "Export Data", href: "/admin/export", icon: Download },
  ]

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage events, players, and registrations</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Button key={action.href} variant="outline" className="h-auto flex-col gap-2 py-4 bg-transparent" asChild>
                <Link href={action.href}>
                  <action.icon className="h-5 w-5" />
                  <span className="text-xs">{action.title}</span>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Events</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/events">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No events yet</p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <Link
                  key={event.eventId}
                  href={`/admin/events/${event.eventId}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{event.eventName}</p>
                    <p className="text-xs text-muted-foreground">{event.locationName}</p>
                  </div>
                  <span
                    className={`text-xs ${
                      event.status === "Upcoming"
                        ? "text-success"
                        : event.status === "Active"
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}
                  >
                    {event.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
