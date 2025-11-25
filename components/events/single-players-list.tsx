"use client"

import { useState } from "react"
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Event, User, Registration } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, Users } from "lucide-react"

interface PlayerWithRegistration {
  user: User
  registration: Registration
}

interface SinglePlayersListProps {
  event: Event
  singlePlayers: PlayerWithRegistration[]
  currentUserRegistration: Registration | null
}

export function SinglePlayersList({ event, singlePlayers, currentUserRegistration }: SinglePlayersListProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loadingPlayer, setLoadingPlayer] = useState<string | null>(null)

  const sendTeamRequest = async (targetPlayer: PlayerWithRegistration) => {
    if (!user || !currentUserRegistration) return

    setLoadingPlayer(targetPlayer.user.uid)
    try {
      // Create team
      const teamRef = doc(collection(db, "teams"))
      await addDoc(collection(db, "teams"), {
        teamId: teamRef.id,
        eventId: event.eventId,
        player1Id: user.uid,
        player2Id: targetPlayer.user.uid,
        player1Confirmed: true,
        player2Confirmed: false,
        createdAt: serverTimestamp(),
      })

      // Update current user's registration
      await updateDoc(doc(db, "registrations", currentUserRegistration.registrationId), {
        partnerStatus: "PENDING",
        player2Id: targetPlayer.user.uid,
        teamId: teamRef.id,
      })

      // Create notification for target player
      await addDoc(collection(db, "notifications"), {
        userId: targetPlayer.user.uid,
        type: "partner_invite",
        title: "Team Up Request",
        message: `${user.displayName || user.email} wants to team up with you for ${event.eventName}`,
        eventId: event.eventId,
        fromUserId: user.uid,
        read: false,
        createdAt: serverTimestamp(),
      })

      toast({
        title: "Request sent!",
        description: `Waiting for ${targetPlayer.user.fullName} to respond.`,
      })
    } catch (error) {
      toast({
        title: "Request failed",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingPlayer(null)
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

  // Only show to single players
  const canRequestTeamUp =
    currentUserRegistration?.partnerStatus === "NONE" || currentUserRegistration?.partnerStatus === "DENIED"

  if (singlePlayers.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-info" />
          Single Players Looking for Partners
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {singlePlayers.map((player) => {
            const isCurrentUser = player.user.uid === user?.uid
            return (
              <div
                key={player.registration.registrationId}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={player.user.photoUrl || ""} />
                    <AvatarFallback className="bg-secondary">{getInitials(player.user.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{player.user.fullName}</p>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {player.user.skillLevel && <span>{player.user.skillLevel}</span>}
                      {player.user.position && <span>• {player.user.position} side</span>}
                    </div>
                  </div>
                </div>
                {!isCurrentUser && canRequestTeamUp && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendTeamRequest(player)}
                    disabled={loadingPlayer === player.user.uid}
                  >
                    {loadingPlayer === player.user.uid ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        <UserPlus className="mr-1 h-4 w-4" />
                        Team Up
                      </>
                    )}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
