"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save } from "lucide-react"

export default function NewEventPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    eventName: "",
    locationName: "",
    dateTime: "",
    duration: "90 mins",
    slotsAvailable: 8,
    pricePerPlayer: 77,
    isTeamRegistration: false,
    isPublic: true,
    termsAndConditions: "",
    logoUrl: "",
  })

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/events")
    }
  }, [isAdmin, authLoading, router])

  const generateEventId = async () => {
    const counterRef = doc(db, "counters", "events")
    const counterDoc = await getDoc(counterRef)

    if (counterDoc.exists()) {
      const currentCount = counterDoc.data().count || 0
      const newCount = currentCount + 1
      await updateDoc(counterRef, { count: newCount })
      return `EVENT${String(newCount).padStart(3, "0")}`
    } else {
      return `EVENT001`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const eventId = await generateEventId()
      const dateTimeObj = new Date(formData.dateTime)

      await addDoc(collection(db, "events"), {
        eventId,
        eventName: formData.eventName,
        locationName: formData.locationName,
        dateTime: dateTimeObj,
        duration: formData.duration,
        slotsAvailable: Number(formData.slotsAvailable),
        pricePerPlayer: Number(formData.pricePerPlayer),
        isTeamRegistration: formData.isTeamRegistration,
        unitType: formData.isTeamRegistration ? "Teams" : "Players",
        isPublic: formData.isPublic,
        termsAndConditions: formData.termsAndConditions || null,
        logoUrl: formData.logoUrl || null,
        adminId: user.uid,
        status: "Upcoming",
        createdAt: serverTimestamp(),
      })

      toast({
        title: "Event created",
        description: "Your event has been created successfully.",
      })

      router.push("/admin/events")
    } catch (error) {
      toast({
        title: "Creation failed",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-2xl font-bold">Create Event</h1>
          <p className="text-sm text-muted-foreground">Set up a new Padel event</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={formData.eventName}
                onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                placeholder="e.g., Weekend Padel Championship"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationName">Location</Label>
              <Input
                id="locationName"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                placeholder="e.g., Zayed Sports City"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateTime">Date & Time</Label>
                <Input
                  id="dateTime"
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="90 mins"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">Event Image URL (optional)</Label>
              <Input
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registration Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isTeamRegistration">Team Registration</Label>
                <p className="text-xs text-muted-foreground">Players must register with a partner</p>
              </div>
              <Switch
                id="isTeamRegistration"
                checked={formData.isTeamRegistration}
                onCheckedChange={(checked) => setFormData({ ...formData, isTeamRegistration: checked })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slotsAvailable">{formData.isTeamRegistration ? "Team Slots" : "Player Slots"}</Label>
                <Input
                  id="slotsAvailable"
                  type="number"
                  min={1}
                  value={formData.slotsAvailable}
                  onChange={(e) => setFormData({ ...formData, slotsAvailable: Number.parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricePerPlayer">Price per Player (AED)</Label>
                <Input
                  id="pricePerPlayer"
                  type="number"
                  min={0}
                  value={formData.pricePerPlayer}
                  onChange={(e) => setFormData({ ...formData, pricePerPlayer: Number.parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            {formData.isTeamRegistration && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>Team Price:</strong> AED {formData.pricePerPlayer * 2} per team ({formData.pricePerPlayer} x 2
                  players)
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isPublic">Public Event</Label>
                <p className="text-xs text-muted-foreground">Visible to all users</p>
              </div>
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.termsAndConditions}
              onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
              placeholder="Enter any terms, rules, or conditions for this event..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Create Event
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
