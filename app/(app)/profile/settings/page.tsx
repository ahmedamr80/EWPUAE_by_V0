"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Bell, Moon, LogOut, Trash2 } from "lucide-react"
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

export default function SettingsPage() {
  const { logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [notifications, setNotifications] = useState({
    partnerInvites: true,
    eventReminders: true,
    waitlistUpdates: true,
  })

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Notifications */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Manage how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="partner-invites">Partner Invites</Label>
            <Switch
              id="partner-invites"
              checked={notifications.partnerInvites}
              onCheckedChange={(checked) => setNotifications({ ...notifications, partnerInvites: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="event-reminders">Event Reminders</Label>
            <Switch
              id="event-reminders"
              checked={notifications.eventReminders}
              onCheckedChange={(checked) => setNotifications({ ...notifications, eventReminders: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="waitlist-updates">Waitlist Updates</Label>
            <Switch
              id="waitlist-updates"
              checked={notifications.waitlistUpdates}
              onCheckedChange={(checked) => setNotifications({ ...notifications, waitlistUpdates: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Moon className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize the app appearance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode">Dark Mode</Label>
            <Switch id="dark-mode" checked={true} disabled />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Dark mode is currently always enabled</p>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Account Actions */}
      <div className="space-y-3">
        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive bg-transparent"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all your data from
                our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  toast({
                    title: "Account deletion",
                    description: "Please contact support to delete your account.",
                  })
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">EveryWherePadel v1.0.0</p>
    </div>
  )
}
