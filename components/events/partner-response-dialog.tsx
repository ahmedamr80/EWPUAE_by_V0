"use client"

import { useState } from "react"
import { collection, query, where, getDocs, updateDoc, serverTimestamp, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Event, User } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, CheckCircle, XCircle } from "lucide-react"

interface PartnerResponseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event
  fromUser: User
  teamId: string
}

export function PartnerResponseDialog({ open, onOpenChange, event, fromUser, teamId }: PartnerResponseDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Update team
      const teamQuery = query(collection(db, "teams"), where("teamId", "==", teamId))
      const teamSnapshot = await getDocs(teamQuery)
      if (!teamSnapshot.empty) {
        await updateDoc(teamSnapshot.docs[0].ref, {
          player2Confirmed: true,
        })
      }

      // Update initiator's registration
      const regQuery = query(
        collection(db, "registrations"),
        where("teamId", "==", teamId),
        where("isPrimary", "==", true),
      )
      const regSnapshot = await getDocs(regQuery)
      if (!regSnapshot.empty) {
        await updateDoc(regSnapshot.docs[0].ref, {
          partnerStatus: "CONFIRMED",
        })
      }

      // Create registration for player 2 (partner)
      await addDoc(collection(db, "registrations"), {
        eventId: event.eventId,
        playerId: user.uid,
        isPrimary: false,
        status: "CONFIRMED",
        partnerStatus: "CONFIRMED",
        player2Id: fromUser.uid,
        teamId: teamId,
        registeredAt: serverTimestamp(),
        confirmedAt: serverTimestamp(),
      })

      // Notify the initiator
      await addDoc(collection(db, "notifications"), {
        userId: fromUser.uid,
        type: "partner_accepted",
        title: "Partner Accepted",
        message: `${user.displayName || user.email} accepted your team invite for ${event.eventName}!`,
        eventId: event.eventId,
        fromUserId: user.uid,
        read: false,
        createdAt: serverTimestamp(),
      })

      toast({
        title: "Team confirmed!",
        description: `You and ${fromUser.fullName} are now registered as a team.`,
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Failed to accept",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Update initiator's registration to denied
      const regQuery = query(
        collection(db, "registrations"),
        where("teamId", "==", teamId),
        where("isPrimary", "==", true),
      )
      const regSnapshot = await getDocs(regQuery)
      if (!regSnapshot.empty) {
        await updateDoc(regSnapshot.docs[0].ref, {
          partnerStatus: "DENIED",
          player2Id: null,
          teamId: null,
        })
      }

      // Delete the team
      const teamQuery = query(collection(db, "teams"), where("teamId", "==", teamId))
      const teamSnapshot = await getDocs(teamQuery)
      if (!teamSnapshot.empty) {
        await updateDoc(teamSnapshot.docs[0].ref, {
          player2Confirmed: false,
        })
      }

      // Notify the initiator
      await addDoc(collection(db, "notifications"), {
        userId: fromUser.uid,
        type: "partner_denied",
        title: "Partner Declined",
        message: `${user.displayName || user.email} declined your team invite for ${event.eventName}. You're now listed as a single player.`,
        eventId: event.eventId,
        fromUserId: user.uid,
        read: false,
        createdAt: serverTimestamp(),
      })

      toast({
        title: "Invite declined",
        description: "The partner has been notified.",
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Failed to decline",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partner Invite</DialogTitle>
          <DialogDescription>Someone wants to team up with you!</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={fromUser.photoUrl || ""} />
            <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
              {getInitials(fromUser.fullName)}
            </AvatarFallback>
          </Avatar>
          <h3 className="mt-4 text-lg font-semibold">{fromUser.fullName}</h3>
          {fromUser.skillLevel && <p className="text-sm text-muted-foreground">{fromUser.skillLevel}</p>}
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-sm">
            <UserPlus className="h-4 w-4 text-primary" />
            <span>Wants to team up for:</span>
          </div>
          <p className="mt-2 font-medium">{event.eventName}</p>
          <p className="text-sm text-muted-foreground">{event.locationName}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDecline} disabled={loading}>
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" /> Decline
              </>
            )}
          </Button>
          <Button onClick={handleAccept} disabled={loading}>
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" /> Accept
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
