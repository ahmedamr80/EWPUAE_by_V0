"use client"

import { useState, useEffect } from "react"
import {
  doc,
  collection,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  runTransaction,
  onSnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Event, Registration, User } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, AlertTriangle, Search, UserPlus, Users } from "lucide-react"

interface TeamRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event
  userRegistration: Registration | null
  spotsLeft: number
}

type RegistrationMode = "with-partner" | "find-partner"

export function TeamRegisterDialog({
  open,
  onOpenChange,
  event,
  userRegistration,
  spotsLeft,
}: TeamRegisterDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<RegistrationMode>("with-partner")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null)
  const [searching, setSearching] = useState(false)

  const isEventPast = (): boolean => {
    if (!event.dateTime) return false
    const eventDate = (event.dateTime as any).toDate ? (event.dateTime as any).toDate() : new Date(event.dateTime as any)
    return eventDate < new Date()
  }

  // Search for players
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const searchLower = searchQuery.toLowerCase()

    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const results: User[] = []
      snapshot.forEach((doc) => {
        const userData = { uid: doc.id, ...doc.data() } as User
        if (
          userData.uid !== user?.uid &&
          (userData.fullName?.toLowerCase().includes(searchLower) ||
            userData.email?.toLowerCase().includes(searchLower))
        ) {
          results.push(userData)
        }
      })
      setSearchResults(results.slice(0, 5))
      setSearching(false)
    })

    return () => unsubscribe()
  }, [searchQuery, user])

  const handleRegisterWithPartner = async () => {
    if (!user || !selectedPartner) return

    if (isEventPast()) {
      toast({
        title: "Cannot register",
        description: "This event has already passed.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    console.log("[v0] Starting team registration with partner:", selectedPartner.fullName)

    try {
      await runTransaction(db, async (transaction) => {
        console.log("[v0] Inside transaction, querying registrations...")

        // Get current registration count
        const regQuery = query(
          collection(db, "registrations"),
          where("eventId", "==", event.eventId),
          where("status", "==", "CONFIRMED"),
        )
        const regSnapshot = await getDocs(regQuery)
        const confirmedCount = regSnapshot.size
        console.log("[v0] Confirmed registrations count:", confirmedCount)

        const isConfirmed = confirmedCount < event.slotsAvailable
        console.log("[v0] Will be confirmed:", isConfirmed)

        // Create team first
        const teamRef = doc(collection(db, "teams"))
        console.log("[v0] Creating team with ID:", teamRef.id)
        transaction.set(teamRef, {
          teamId: teamRef.id,
          eventId: event.eventId,
          player1Id: user.uid,
          player2Id: selectedPartner.uid,
          player1Confirmed: true,
          player2Confirmed: false,
          createdAt: serverTimestamp(),
        })

        // Create registration for player 1 (initiator)
        const reg1Ref = doc(collection(db, "registrations"))
        console.log("[v0] Creating registration with ID:", reg1Ref.id)
        transaction.set(reg1Ref, {
          registrationId: reg1Ref.id,
          eventId: event.eventId,
          playerId: user.uid,
          isPrimary: true,
          status: isConfirmed ? "CONFIRMED" : "WAITLIST",
          partnerStatus: "PENDING",
          player2Id: selectedPartner.uid,
          teamId: teamRef.id,
          registeredAt: serverTimestamp(),
          confirmedAt: isConfirmed ? serverTimestamp() : null,
        })

        // Create notification for partner
        const notifRef = doc(collection(db, "notifications"))
        console.log("[v0] Creating notification with ID:", notifRef.id)
        transaction.set(notifRef, {
          notificationId: notifRef.id,
          userId: selectedPartner.uid,
          type: "partner_invite",
          title: "Partner Invite",
          message: `${user.displayName || user.email} wants to team up with you for ${event.eventName}`,
          eventId: event.eventId,
          fromUserId: user.uid,
          read: false,
          createdAt: serverTimestamp(),
        })
      })

      console.log("[v0] Transaction completed successfully!")
      toast({
        title: "Team registration initiated",
        description: `Waiting for ${selectedPartner.fullName} to confirm the partnership.`,
      })

      onOpenChange(false)
    } catch (error: any) {
      console.log("[v0] Registration error:", error.code, error.message)
      toast({
        title: "Registration failed",
        description:
          error.code === "permission-denied"
            ? "Firestore permissions error. Please check your security rules."
            : error.message || "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSolo = async () => {
    if (!user) return

    if (isEventPast()) {
      toast({
        title: "Cannot register",
        description: "This event has already passed.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    console.log("[v0] Starting solo registration for event:", event.eventId)

    try {
      const regRef = await addDoc(collection(db, "registrations"), {
        eventId: event.eventId,
        playerId: user.uid,
        isPrimary: true,
        status: "WAITLIST", // Singles always start on waitlist until matched
        partnerStatus: "NONE",
        player2Id: null,
        teamId: null,
        registeredAt: serverTimestamp(),
      })

      console.log("[v0] Solo registration created with ID:", regRef.id)

      toast({
        title: "Registered as single player",
        description: "You'll be visible to other players looking for a partner.",
      })

      onOpenChange(false)
    } catch (error: any) {
      console.log("[v0] Solo registration error:", error.code, error.message)
      toast({
        title: "Registration failed",
        description:
          error.code === "permission-denied"
            ? "Firestore permissions error. Please check your security rules."
            : error.message || "Please try again later.",
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
      // If part of a team, handle team dissolution
      if (userRegistration.teamId) {
        const teamDoc = await getDocs(query(collection(db, "teams"), where("teamId", "==", userRegistration.teamId)))
        if (!teamDoc.empty) {
          await deleteDoc(teamDoc.docs[0].ref)
        }

        // Notify partner if exists
        if (userRegistration.player2Id) {
          await addDoc(collection(db, "notifications"), {
            userId: userRegistration.player2Id,
            type: "team_cancelled",
            title: "Team Cancelled",
            message: `Your partner cancelled the registration for ${event.eventName}. You've been moved to single players.`,
            eventId: event.eventId,
            fromUserId: user.uid,
            read: false,
            createdAt: serverTimestamp(),
          })
        }
      }

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (isEventPast()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Has Passed</DialogTitle>
            <DialogDescription>
              This event has already taken place. Registration is no longer available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Existing registration management view
  if (userRegistration) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Team Registration</DialogTitle>
            <DialogDescription>
              {userRegistration.partnerStatus === "CONFIRMED"
                ? "Your team is confirmed!"
                : userRegistration.partnerStatus === "PENDING"
                  ? "Waiting for your partner to confirm"
                  : userRegistration.partnerStatus === "NONE"
                    ? "You're registered as a single player looking for a partner"
                    : "Your partner request was declined"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            {userRegistration.partnerStatus === "CONFIRMED" ? (
              <CheckCircle className="h-8 w-8 text-success" />
            ) : userRegistration.partnerStatus === "PENDING" ? (
              <AlertTriangle className="h-8 w-8 text-warning" />
            ) : (
              <Users className="h-8 w-8 text-info" />
            )}
            <div>
              <p className="font-medium">
                {userRegistration.partnerStatus === "CONFIRMED"
                  ? "Team Confirmed"
                  : userRegistration.partnerStatus === "PENDING"
                    ? "Pending Partner Confirmation"
                    : "Looking for Partner"}
              </p>
              <p className="text-sm text-muted-foreground">
                {userRegistration.status === "CONFIRMED" ? "Your spot is secured" : "On waitlist"}
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

  // New registration flow
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for Team Event</DialogTitle>
          <DialogDescription>This is a team event. Choose how you want to register.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as RegistrationMode)}>
            <div className="flex items-center space-x-2 rounded-lg border border-border p-4">
              <RadioGroupItem value="with-partner" id="with-partner" />
              <Label htmlFor="with-partner" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  <span className="font-medium">Register with a Partner</span>
                </div>
                <p className="text-xs text-muted-foreground">Search and invite someone to team up</p>
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border border-border p-4">
              <RadioGroupItem value="find-partner" id="find-partner" />
              <Label htmlFor="find-partner" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Find me a Partner</span>
                </div>
                <p className="text-xs text-muted-foreground">{"Join as a single player and be matched with others"}</p>
              </Label>
            </div>
          </RadioGroup>

          {mode === "with-partner" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Search for your partner</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {searching && (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((player) => (
                    <div
                      key={player.uid}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${selectedPartner?.uid === player.uid
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                        }`}
                      onClick={() => setSelectedPartner(player)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={player.photoUrl || ""} />
                        <AvatarFallback className="bg-secondary">{getInitials(player.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{player.fullName}</p>
                        <p className="text-xs text-muted-foreground">{player.email}</p>
                      </div>
                      {selectedPartner?.uid === player.uid && <CheckCircle className="h-5 w-5 text-primary" />}
                    </div>
                  ))}
                </div>
              )}

              {selectedPartner && (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm">
                    <strong>Selected Partner:</strong> {selectedPartner.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    They will receive a notification to confirm the partnership.
                  </p>
                </div>
              )}
            </div>
          )}

          {mode === "find-partner" && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                {
                  "You'll be added to the single players list for this event. Other players looking for a partner can invite you to team up."
                }
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border p-4">
            <h4 className="font-medium">{event.eventName}</h4>
            <p className="text-sm text-muted-foreground">{event.locationName}</p>
            <p className="mt-2 text-lg font-bold text-primary">
              AED {event.pricePerPlayer * 2}
              <span className="text-sm font-normal text-muted-foreground"> / team</span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={mode === "with-partner" ? handleRegisterWithPartner : handleRegisterSolo}
            disabled={loading || (mode === "with-partner" && !selectedPartner)}
          >
            {loading ? <Spinner size="sm" /> : mode === "with-partner" ? "Send Partner Invite" : "Register as Single"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
