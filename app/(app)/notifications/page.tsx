"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { Notification, Event, User } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { Bell, UserPlus, UserCheck, UserX, AlertCircle, Calendar, Users, CheckCheck } from "lucide-react"
import { PartnerResponseDialog } from "@/components/events/partner-response-dialog"

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [partnerEvent, setPartnerEvent] = useState<Event | null>(null)
  const [partnerUser, setPartnerUser] = useState<User | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [showPartnerDialog, setShowPartnerDialog] = useState(false)

  useEffect(() => {
    if (!user) return

    const q = query(collection(db, "notifications"), where("userId", "==", user.uid), orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData: Notification[] = []
      snapshot.forEach((docSnap) => {
        notificationsData.push({ id: docSnap.id, ...docSnap.data() } as Notification)
      })
      setNotifications(notificationsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const markAsRead = async (notificationId: string) => {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true,
    })
  }

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.read)
    for (const notification of unreadNotifications) {
      await updateDoc(doc(db, "notifications", notification.id), {
        read: true,
      })
    }
  }

  const handlePartnerInviteClick = async (notification: Notification) => {
    if (!notification.eventId || !notification.fromUserId) return

    // Fetch event details
    const eventDoc = await getDocs(query(collection(db, "events"), where("eventId", "==", notification.eventId)))
    if (!eventDoc.empty) {
      setPartnerEvent({ eventId: eventDoc.docs[0].id, ...eventDoc.docs[0].data() } as Event)
    }

    // Fetch inviter details
    const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", notification.fromUserId)))
    if (!userDoc.empty) {
      setPartnerUser({ uid: userDoc.docs[0].id, ...userDoc.docs[0].data() } as User)
    }

    // Find the team ID from the registration
    const regDoc = await getDocs(
      query(
        collection(db, "registrations"),
        where("eventId", "==", notification.eventId),
        where("playerId", "==", notification.fromUserId),
        where("player2Id", "==", user?.uid),
      ),
    )
    if (!regDoc.empty) {
      setTeamId(regDoc.docs[0].data().teamId)
    }

    setSelectedNotification(notification)
    setShowPartnerDialog(true)

    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read first
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    // Handle different notification types
    if (notification.type === "partner_invite") {
      handlePartnerInviteClick(notification)
    } else if (notification.eventId) {
      router.push(`/events/${notification.eventId}`)
    }
  }

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "partner_invite":
        return <UserPlus className="h-5 w-5 text-info" />
      case "partner_accepted":
        return <UserCheck className="h-5 w-5 text-success" />
      case "partner_denied":
        return <UserX className="h-5 w-5 text-destructive" />
      case "waitlist_promotion":
        return <Calendar className="h-5 w-5 text-primary" />
      case "event_cancelled":
        return <AlertCircle className="h-5 w-5 text-destructive" />
      case "team_cancelled":
        return <Users className="h-5 w-5 text-warning" />
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  const formatTime = (timestamp: { toDate: () => Date }) => {
    const date = timestamp.toDate()
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No notifications</h3>
          <p className="text-sm text-muted-foreground">{"You're all caught up!"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-muted/50",
                !notification.read && "border-primary/50 bg-primary/5",
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className="mt-0.5 flex-shrink-0">{getIcon(notification.type)}</div>
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(notification.createdAt)}</p>
                  {notification.type === "partner_invite" && !notification.read && (
                    <p className="text-xs font-medium text-primary">Tap to respond</p>
                  )}
                </div>
                {!notification.read && <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showPartnerDialog && partnerEvent && partnerUser && teamId && (
        <PartnerResponseDialog
          open={showPartnerDialog}
          onOpenChange={setShowPartnerDialog}
          event={partnerEvent}
          fromUser={partnerUser}
          teamId={teamId}
        />
      )}
    </div>
  )
}
