"use client"

import { useState } from "react"
import { doc, collection, deleteDoc, serverTimestamp, query, where, getDocs, runTransaction } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Event, Registration } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"

interface RegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event
  userRegistration: Registration | null
  spotsLeft: number
}

export function RegisterDialog({ open, onOpenChange, event, userRegistration, spotsLeft }: RegisterDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Use transaction for atomic registration
      await runTransaction(db, async (transaction) => {
        // Get current registration count
        const regQuery = query(
          collection(db, "registrations"),
          where("eventId", "==", event.eventId),
          where("status", "==", "CONFIRMED"),
        )
        const regSnapshot = await getDocs(regQuery)
        const confirmedCount = regSnapshot.size

        // Get waitlist count for position
        const waitlistQuery = query(
          collection(db, "registrations"),
          where("eventId", "==", event.eventId),
          where("status", "==", "WAITLIST"),
        )
        const waitlistSnapshot = await getDocs(waitlistQuery)
        const waitlistCount = waitlistSnapshot.size

        const isConfirmed = confirmedCount < event.slotsAvailable

        // Create registration
        const newRegRef = doc(collection(db, "registrations"))
        transaction.set(newRegRef, {
          registrationId: newRegRef.id,
          eventId: event.eventId,
          playerId: user.uid,
          isPrimary: true,
          status: isConfirmed ? "CONFIRMED" : "WAITLIST",
          waitlistPosition: isConfirmed ? null : waitlistCount + 1,
          registeredAt: serverTimestamp(),
          confirmedAt: isConfirmed ? serverTimestamp() : null,
        })
      })

      toast({
        title: spotsLeft > 0 ? "Registration confirmed!" : "Added to waitlist",
        description:
          spotsLeft > 0
            ? "You have successfully registered for this event."
            : "You'll be notified when a spot opens up.",
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!user || !userRegistration) return

    setLoading(true)
    try {
      await deleteDoc(doc(db, "registrations", userRegistration.registrationId))

      toast({
        title: "Registration withdrawn",
        description: "You have been removed from this event.",
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Withdrawal failed",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (userRegistration) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Registration</DialogTitle>
            <DialogDescription>
              You are currently {userRegistration.status === "CONFIRMED" ? "registered" : "on the waitlist"} for this
              event.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            {userRegistration.status === "CONFIRMED" ? (
              <CheckCircle className="h-8 w-8 text-success" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-warning" />
            )}
            <div>
              <p className="font-medium">
                {userRegistration.status === "CONFIRMED"
                  ? "Spot Confirmed"
                  : `Waitlist Position #${userRegistration.waitlistPosition}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {userRegistration.status === "CONFIRMED"
                  ? "Your spot is secured for this event"
                  : "You'll be notified when a spot opens"}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="destructive" onClick={handleWithdraw} disabled={loading}>
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" /> Withdraw
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{spotsLeft > 0 ? "Register for Event" : "Join Waitlist"}</DialogTitle>
          <DialogDescription>
            {spotsLeft > 0
              ? `There are ${spotsLeft} spots remaining for this event.`
              : "This event is full. Join the waitlist to be notified when a spot opens."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <h4 className="font-medium">{event.eventName}</h4>
            <p className="text-sm text-muted-foreground">{event.locationName}</p>
            <p className="mt-2 text-lg font-bold text-primary">
              AED {event.pricePerPlayer}
              <span className="text-sm font-normal text-muted-foreground"> / player</span>
            </p>
          </div>

          {event.isTeamRegistration && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> This is a team event. After registering, you can invite a partner or be matched
                with other solo players.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRegister} disabled={loading}>
            {loading ? <Spinner size="sm" /> : spotsLeft > 0 ? "Confirm Registration" : "Join Waitlist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
