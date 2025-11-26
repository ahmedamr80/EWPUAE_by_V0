"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Event, Registration, User, Team } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  ArrowLeft,
  Share2,
  UserPlus,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import Image from "next/image"
import { RegisterDialog } from "@/components/events/register-dialog"
import { TeamRegisterDialog } from "@/components/events/team-register-dialog"
import { TeamsList } from "@/components/events/teams-list"
import { SinglePlayersList } from "@/components/events/single-players-list"

interface PlayerWithRegistration {
  user: User
  registration: Registration
}

interface TeamWithPlayers {
  team: Team
  player1: User | null
  player2: User | null
  registration: Registration
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const eventId = params.eventId as string

  const [event, setEvent] = useState<Event | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [players, setPlayers] = useState<PlayerWithRegistration[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [userRegistration, setUserRegistration] = useState<Registration | null>(null)
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)

  useEffect(() => {
    if (!eventId) return

    // Listen to event
    const unsubEvent = onSnapshot(
      doc(db, "events", eventId),
      (docSnap) => {
        if (docSnap.exists()) {
          setEvent({ eventId: docSnap.id, ...docSnap.data() } as Event)
        }
      },
      (error) => {
        console.error("Error fetching event:", error)
        if (error.code === "permission-denied") {
          // Handle permission denied (e.g., redirect or show error state)
          // For now, we just log it, but in a real app we might want to set an error state
          setLoading(false)
        }
      }
    )

    // Listen to registrations
    const regQuery = query(collection(db, "registrations"), where("eventId", "==", eventId))
    const unsubReg = onSnapshot(regQuery, async (snapshot) => {
      const regsData: Registration[] = []
      snapshot.forEach((docSnap) => {
        regsData.push({ registrationId: docSnap.id, ...docSnap.data() } as Registration)
      })
      setRegistrations(regsData)

      // Find current user's registration
      if (user) {
        const userReg = regsData.find((r) => r.playerId === user.uid)
        setUserRegistration(userReg || null)
      }

      // Fetch player details
      const playerIds = [...new Set(regsData.flatMap((r) => [r.playerId, r.player2Id].filter(Boolean)))]
      if (playerIds.length > 0) {
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
      }

      setLoading(false)
    })

    // Listen to teams
    const teamsQuery = query(collection(db, "teams"), where("eventId", "==", eventId))
    const unsubTeams = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData: Team[] = []
      snapshot.forEach((docSnap) => {
        teamsData.push({ teamId: docSnap.id, ...docSnap.data() } as Team)
      })
      setTeams(teamsData)
    })

    return () => {
      unsubEvent()
      unsubReg()
      unsubTeams()
    }
  }, [eventId, user])

  const formatDate = (timestamp: { toDate: () => Date }) => {
    const date = timestamp.toDate()
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timestamp: { toDate: () => Date }) => {
    const date = timestamp.toDate()
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getStatusBadge = (status: Event["status"]) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-success text-success-foreground">Live Now</Badge>
      case "Upcoming":
        return <Badge variant="secondary">Upcoming</Badge>
      case "Cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">Past</Badge>
    }
  }

  // Calculate spots based on event type
  const confirmedCount = event?.isTeamRegistration
    ? registrations.filter((r) => r.status === "CONFIRMED" && r.partnerStatus === "CONFIRMED").length / 2
    : registrations.filter((r) => r.status === "CONFIRMED").length

  const spotsLeft = event ? event.slotsAvailable - confirmedCount : 0

  const handleShare = async () => {
    const shareData = {
      title: event?.eventName || "Padel Event",
      text: `Join me at ${event?.eventName} on ${event?.dateTime ? formatDate(event.dateTime) : ""}!`,
      url: window.location.href,
    }

    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      await navigator.clipboard.writeText(window.location.href)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Prepare team data for display
  const getTeamsWithPlayers = (): { confirmed: TeamWithPlayers[]; pending: TeamWithPlayers[] } => {
    const confirmed: TeamWithPlayers[] = []
    const pending: TeamWithPlayers[] = []

    teams.forEach((team) => {
      const player1 = players.find((p) => p.user.uid === team.player1Id)?.user || null
      const player2 = players.find((p) => p.user.uid === team.player2Id)?.user || null
      const registration = registrations.find((r) => r.teamId === team.teamId && r.isPrimary)

      if (registration) {
        const teamWithPlayers = { team, player1, player2, registration }
        if (team.player1Confirmed && team.player2Confirmed) {
          confirmed.push(teamWithPlayers)
        } else {
          pending.push(teamWithPlayers)
        }
      }
    })

    return { confirmed, pending }
  }

  // Get single players (no partner)
  const singlePlayers = players.filter(
    (p) => p.registration.partnerStatus === "NONE" || p.registration.partnerStatus === "DENIED",
  )

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Event not found</h2>
        <p className="mb-4 text-muted-foreground">This event may have been removed</p>
        <Button onClick={() => router.push("/events")}>Back to Events</Button>
      </div>
    )
  }

  const { confirmed: confirmedTeams, pending: pendingTeams } = getTeamsWithPlayers()

  return (
    <div className="pb-24">
      {/* Header Image */}
      <div className="relative aspect-video w-full">
        <Image
          src={event.logoUrl || `/placeholder.svg?height=300&width=600&query=padel tournament ${event.eventName}`}
          alt={event.eventName}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/50 to-transparent" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4 bg-background/50 backdrop-blur"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 bg-background/50 backdrop-blur"
          onClick={handleShare}
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="px-4">
        {/* Event Info */}
        <div className="-mt-12 relative">
          <div className="flex items-start justify-between">
            <div>
              {getStatusBadge(event.status)}
              <h1 className="mt-2 text-2xl font-bold">{event.eventName}</h1>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(event.dateTime)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="font-medium">{formatTime(event.dateTime)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{event.locationName}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="font-medium">
                  AED {event.isTeamRegistration ? event.pricePerPlayer * 2 : event.pricePerPlayer}
                  <span className="text-xs text-muted-foreground">
                    {event.isTeamRegistration ? " /team" : " /player"}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Capacity Info */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {confirmedCount} / {event.slotsAvailable} {event.unitType}
                </span>
              </div>
              {spotsLeft > 0 ? (
                <Badge variant="outline" className="border-success text-success">
                  {spotsLeft} spots left
                </Badge>
              ) : (
                <Badge variant="outline" className="border-warning text-warning">
                  Full
                </Badge>
              )}
            </div>
            {event.isTeamRegistration && (
              <p className="mt-2 text-sm text-muted-foreground">
                This is a team event. Register with a partner or find one from the single players list.
              </p>
            )}
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Team Event Display */}
        {event.isTeamRegistration ? (
          <div className="space-y-4">
            <TeamsList event={event} confirmedTeams={confirmedTeams} pendingTeams={pendingTeams} />
            <SinglePlayersList event={event} singlePlayers={singlePlayers} currentUserRegistration={userRegistration} />
          </div>
        ) : (
          /* Single Player Event Display */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Registered Players</CardTitle>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No registrations yet. Be the first to register!
                </p>
              ) : (
                <div className="space-y-3">
                  {players
                    .filter((p) => p.registration.status === "CONFIRMED")
                    .map((player) => (
                      <div key={player.registration.registrationId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={player.user.photoUrl || ""} />
                            <AvatarFallback className="bg-secondary">
                              {getInitials(player.user.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{player.user.fullName}</p>
                            {player.user.skillLevel && (
                              <p className="text-xs text-muted-foreground">{player.user.skillLevel}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="border-success text-success">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Confirmed
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      {event.status !== "Cancelled" && event.status !== "Past" && (
        <div className="fixed bottom-16 left-0 right-0 border-t border-border bg-card/95 p-4 backdrop-blur">
          {userRegistration ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {userRegistration.status === "CONFIRMED"
                    ? event.isTeamRegistration && userRegistration.partnerStatus === "CONFIRMED"
                      ? "Team registered!"
                      : userRegistration.partnerStatus === "PENDING"
                        ? "Waiting for partner"
                        : "You're registered!"
                    : "On waitlist"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {userRegistration.status === "WAITLIST" &&
                    userRegistration.partnerStatus === "NONE" &&
                    "Looking for a partner"}
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowRegisterDialog(true)}>
                Manage
              </Button>
            </div>
          ) : (
            <Button className="w-full" size="lg" onClick={() => setShowRegisterDialog(true)}>
              <UserPlus className="mr-2 h-5 w-5" />
              {spotsLeft > 0 ? "Register Now" : "Join Waitlist"}
            </Button>
          )}
        </div>
      )}

      {/* Registration Dialog - conditional based on event type */}
      {event.isTeamRegistration ? (
        <TeamRegisterDialog
          open={showRegisterDialog}
          onOpenChange={setShowRegisterDialog}
          event={event}
          userRegistration={userRegistration}
          spotsLeft={spotsLeft}
        />
      ) : (
        <RegisterDialog
          open={showRegisterDialog}
          onOpenChange={setShowRegisterDialog}
          event={event}
          userRegistration={userRegistration}
          spotsLeft={spotsLeft}
        />
      )}
    </div>
  )
}
