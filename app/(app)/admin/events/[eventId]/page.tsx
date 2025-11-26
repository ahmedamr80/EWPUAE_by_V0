"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { doc, updateDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { getEventById } from "@/lib/event-actions"
import { formatEventDateAndTime, combineDateTimeToTimestamp } from "@/lib/date-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function EditEventPage() {
    const { user, isAdmin, loading: authLoading } = useAuth()
    const router = useRouter()
    const params = useParams()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const eventId = params.eventId as string

    const [formData, setFormData] = useState({
        eventName: "",
        locationName: "",
        date: "",
        time: "",
        duration: "90 mins",
        slotsAvailable: 8,
        pricePerPlayer: 77,
        isTeamRegistration: false,
        isPublic: true,
        termsAndConditions: "",
        logoUrl: "",
        status: "Upcoming",
    })

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push("/events")
            return
        }

        async function fetchEvent() {
            if (!eventId) return

            const response = await getEventById(eventId)
            if (response.error || !response.data) {
                toast({
                    title: "Error",
                    description: "Failed to load event details",
                    variant: "destructive",
                })
                router.push("/admin/events")
                return
            }

            const event = response.data
            const { date, time } = formatEventDateAndTime(event.dateTime)

            setFormData({
                eventName: event.eventName,
                locationName: event.locationName,
                date,
                time,
                duration: event.duration,
                slotsAvailable: event.slotsAvailable,
                pricePerPlayer: event.pricePerPlayer,
                isTeamRegistration: event.isTeamRegistration,
                isPublic: event.isPublic,
                termsAndConditions: event.termsAndConditions || "",
                logoUrl: event.logoUrl || "",
                status: event.status,
            })
            setLoading(false)
        }

        if (isAdmin) {
            fetchEvent()
        }
    }, [eventId, isAdmin, authLoading, router, toast])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setSaving(true)
        try {
            const dateTimeTimestamp = combineDateTimeToTimestamp(formData.date, formData.time)

            const eventRef = doc(db, "events", eventId)
            await updateDoc(eventRef, {
                eventName: formData.eventName,
                locationName: formData.locationName,
                dateTime: dateTimeTimestamp,
                duration: formData.duration,
                slotsAvailable: Number(formData.slotsAvailable),
                pricePerPlayer: Number(formData.pricePerPlayer),
                isTeamRegistration: formData.isTeamRegistration,
                unitType: formData.isTeamRegistration ? "Teams" : "Players",
                isPublic: formData.isPublic,
                termsAndConditions: formData.termsAndConditions || null,
                logoUrl: formData.logoUrl || null,
                status: formData.status,
                // Don't update createdAt or adminId usually
            })

            toast({
                title: "Event updated",
                description: "Event details have been saved successfully.",
            })

            router.push("/admin/events")
        } catch (error) {
            console.error("Error updating event:", error)
            toast({
                title: "Update failed",
                description: "Failed to update event. Please try again.",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setSaving(true)
        try {
            // Soft delete by setting status to Cancelled or actually deleting?
            // For now, let's just set status to Cancelled as a safety measure
            // or actually delete if the user really wants to.
            // Given the "Trash2" icon, users usually expect deletion.
            // But let's stick to "Cancelled" status update for safety if not specified.
            // Actually, let's implement status toggle to Cancelled in the form, 
            // and maybe a real delete here if needed. 
            // For this implementation, I'll update status to 'Cancelled' as a soft delete.

            const eventRef = doc(db, "events", eventId)
            await updateDoc(eventRef, {
                status: "Cancelled"
            })

            toast({
                title: "Event cancelled",
                description: "The event has been marked as cancelled.",
            })

            router.push("/admin/events")
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to cancel event.",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <div className="px-4 py-6">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Edit Event</h1>
                        <p className="text-sm text-muted-foreground">Manage event details</p>
                    </div>
                </div>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cancel Event
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will mark the event as Cancelled. Players will be notified.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Keep Event</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Yes, Cancel Event
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
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
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="locationName">Location</Label>
                            <Input
                                id="locationName"
                                value={formData.locationName}
                                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Date</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="time">Time</Label>
                                <Input
                                    id="time"
                                    type="time"
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    required
                                />
                            </div>
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

                        <div className="space-y-2">
                            <Label htmlFor="logoUrl">Event Image URL (optional)</Label>
                            <Input
                                id="logoUrl"
                                value={formData.logoUrl}
                                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="Upcoming">Upcoming</option>
                                <option value="Active">Active</option>
                                <option value="Past">Past</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
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

                <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? (
                        <Spinner size="sm" />
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Save Changes
                        </>
                    )}
                </Button>
            </form>
        </div>
    )
}
