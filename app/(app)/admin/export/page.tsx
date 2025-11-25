"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Event, Registration, User } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ArrowLeft, Download, Users, Calendar, ClipboardList } from "lucide-react"

export default function ExportPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/events")
    }
  }, [isAdmin, authLoading, router])

  const exportPlayers = async () => {
    setExporting("players")
    try {
      const snapshot = await getDocs(query(collection(db, "users"), orderBy("fullName")))
      const players: User[] = []
      snapshot.forEach((doc) => {
        players.push({ uid: doc.id, ...doc.data() } as User)
      })

      const headers = ["Name", "Email", "Phone", "Gender", "Hand", "Position", "Skill Level", "Role"]
      const rows = players.map((p) => [
        p.fullName,
        p.email,
        p.phone || "",
        p.gender || "",
        p.hand || "",
        p.position || "",
        p.skillLevel || "",
        p.role,
      ])

      downloadCSV([headers, ...rows], "players.csv")
    } finally {
      setExporting(null)
    }
  }

  const exportEvents = async () => {
    setExporting("events")
    try {
      const snapshot = await getDocs(query(collection(db, "events"), orderBy("dateTime", "desc")))
      const events: Event[] = []
      snapshot.forEach((doc) => {
        events.push({ eventId: doc.id, ...doc.data() } as Event)
      })

      const headers = ["Event ID", "Name", "Location", "Date", "Status", "Type", "Slots", "Price"]
      const rows = events.map((e) => [
        e.eventId,
        e.eventName,
        e.locationName,
        e.dateTime?.toDate?.()?.toISOString() || "",
        e.status,
        e.isTeamRegistration ? "Teams" : "Players",
        String(e.slotsAvailable),
        String(e.pricePerPlayer),
      ])

      downloadCSV([headers, ...rows], "events.csv")
    } finally {
      setExporting(null)
    }
  }

  const exportRegistrations = async () => {
    setExporting("registrations")
    try {
      const regSnapshot = await getDocs(collection(db, "registrations"))
      const registrations: Registration[] = []
      regSnapshot.forEach((doc) => {
        registrations.push({ registrationId: doc.id, ...doc.data() } as Registration)
      })

      // Get all users for name lookup
      const userSnapshot = await getDocs(collection(db, "users"))
      const users: Record<string, User> = {}
      userSnapshot.forEach((doc) => {
        users[doc.id] = { uid: doc.id, ...doc.data() } as User
      })

      // Get all events for name lookup
      const eventSnapshot = await getDocs(collection(db, "events"))
      const events: Record<string, Event> = {}
      eventSnapshot.forEach((doc) => {
        const data = doc.data()
        events[doc.id] = { ...data, eventId: doc.id } as Event
      })

      const headers = ["Registration ID", "Event", "Player", "Email", "Status", "Partner Status", "Registered At"]
      const rows = registrations.map((r) => [
        r.registrationId,
        events[r.eventId]?.eventName || r.eventId,
        users[r.playerId]?.fullName || r.playerId,
        users[r.playerId]?.email || "",
        r.status,
        r.partnerStatus || "N/A",
        r.registeredAt?.toDate?.()?.toISOString() || "",
      ])

      downloadCSV([headers, ...rows], "registrations.csv")
    } finally {
      setExporting(null)
    }
  }

  const downloadCSV = (data: string[][], filename: string) => {
    const csvContent = data.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Export Data</h1>
          <p className="text-sm text-muted-foreground">Download your data as CSV files</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Players
            </CardTitle>
            <CardDescription>Export all registered players with their profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportPlayers} disabled={exporting === "players"} className="w-full">
              {exporting === "players" ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Players
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Events
            </CardTitle>
            <CardDescription>Export all events with their details and settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportEvents} disabled={exporting === "events"} className="w-full">
              {exporting === "events" ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Events
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Registrations
            </CardTitle>
            <CardDescription>Export all registrations across all events</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportRegistrations} disabled={exporting === "registrations"} className="w-full">
              {exporting === "registrations" ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Registrations
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
