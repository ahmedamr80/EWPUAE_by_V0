"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Event, Registration, User } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, MoreVertical, CheckCircle, XCircle, ArrowUp, Download } from "lucide-react"

interface PlayerWithRegistration {
  user: User
  registration: Registration
}

export default function EventRegistrationsPage() {
  const params = useParams()
  const router = useRouter()
  const { isAdmin, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const eventId = params.eventId as string

  const [event, setEvent] = useState<Event | null>(null)
  const [players, setPlayers] = useState<PlayerWithRegistration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/events")
    }
  }, [isAdmin, authLoading, router])

  useEffect(() => {
    if (!eventId || !isAdmin) return

    // Listen to event
    const unsubEvent = onSnapshot(doc(db, "events", eventId), (docSnap) => {
      if (docSnap.exists()) {
        setEvent({ eventId: docSnap.id, ...docSnap.data() } as Event)
      }
    })

    // Listen to registrations
    const regQuery = query(collection(db, "registrations"), where("eventId", "==", eventId))
    const unsubReg = onSnapshot(regQuery, async (snapshot) => {
      const regsData: Registration[] = []
      snapshot.forEach((docSnap) => {
        regsData.push({ registrationId: docSnap.id, ...docSnap.data() } as Registration)
      })

      // Fetch player details
      const playerIds = Array.from(new Set(regsData.map((r) => r.playerId)))
      const playersData: PlayerWithRegistration[] = []

      for (const playerId of playerIds) {
        const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", playerId)))
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data() as User
          const reg = regsData.find((r) => r.playerId === playerId)
          if (reg) {
            playersData.push({ user: userData, registration: reg })
          }
        }
      }

      setPlayers(playersData)
      setLoading(false)
    })

    return () => {
      unsubEvent()
      unsubReg()
    }
  }, [eventId, isAdmin])

  const promoteFromWaitlist = async (registration: Registration) => {
    try {
      await updateDoc(doc(db, "registrations", registration.registrationId), {
        status: "CONFIRMED",
        waitlistPosition: null,
      })
      toast({
        title: "Player promoted",
        description: "Player has been moved from waitlist to confirmed.",
      })
    } catch (error) {
      toast({
        title: "Promotion failed",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const removeRegistration = async (registration: Registration) => {
    try {
      await deleteDoc(doc(db, "registrations", registration.registrationId))
      toast({
        title: "Registration removed",
        description: "Player has been removed from the event.",
      })
    } catch (error) {
      toast({
        title: "Removal failed",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Phone", "Status", "Registered At"]
    const rows = players.map((p) => [
      p.user.fullName,
      p.user.email,
      p.user.phone || "",
      p.registration.status,
      p.registration.registeredAt?.toDate?.()?.toISOString() || "",
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${event?.eventName || "event"}-registrations.csv`
    a.click()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const confirmedPlayers = players.filter((p) => p.registration.status === "CONFIRMED")
  const waitlistPlayers = players
    .filter((p) => p.registration.status === "WAITLIST")
    .sort((a, b) => (a.registration.waitlistPosition || 0) - (b.registration.waitlistPosition || 0))

  if (authLoading || loading) {
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
        <div className="flex-1">
          <h1 className="text-xl font-bold">{event?.eventName}</h1>
          <p className="text-sm text-muted-foreground">Manage registrations</p>
        </div>
        <Button variant="outline" size="icon" onClick={exportToCSV}>
          <Download className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <Card className="flex-1">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{confirmedPlayers.length}</p>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{waitlistPlayers.length}</p>
            <p className="text-xs text-muted-foreground">Waitlist</p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{event?.slotsAvailable}</p>
            <p className="text-xs text-muted-foreground">Capacity</p>
          </CardContent>
        </Card>
      </div>

      {/* Confirmed Players */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-success" />
            Confirmed ({confirmedPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {confirmedPlayers.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No confirmed registrations</p>
          ) : (
            <div className="space-y-3">
              {confirmedPlayers.map((player) => (
                <div key={player.registration.registrationId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={player.user.photoUrl || ""} />
                      <AvatarFallback className="bg-secondary">{getInitials(player.user.fullName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{player.user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{player.user.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => removeRegistration(player.registration)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waitlist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Badge variant="outline" className="h-5 px-2">
              {waitlistPlayers.length}
            </Badge>
            Waitlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          {waitlistPlayers.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No players on waitlist</p>
          ) : (
            <div className="space-y-3">
              {waitlistPlayers.map((player) => (
                <div key={player.registration.registrationId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      #{player.registration.waitlistPosition}
                    </div>
                    <div>
                      <p className="font-medium">{player.user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{player.user.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => promoteFromWaitlist(player.registration)}>
                        <ArrowUp className="mr-2 h-4 w-4" />
                        Promote to Confirmed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => removeRegistration(player.registration)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
