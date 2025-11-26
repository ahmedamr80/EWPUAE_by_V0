"use client"

import Link from "next/link"
import Image from "next/image"
import type { Event } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Calendar, MapPin, Users, Clock } from "lucide-react"

interface EventCardProps {
  event: Event
  isPast?: boolean
  priority?: boolean
  userRegistrationStatus?: "CONFIRMED" | "WAITLIST" | "PENDING" | "WITHDRAWN" | null
}

export function EventCard({ event, isPast, priority = false, userRegistrationStatus }: EventCardProps) {
  const formatDate = (timestamp: { toDate: () => Date }) => {
    const date = timestamp.toDate()
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
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

  const getStatusBadge = () => {
    if (userRegistrationStatus === "CONFIRMED") {
      return <Badge className="bg-green-500 text-white">Registered</Badge>
    }
    if (userRegistrationStatus === "WAITLIST") {
      return <Badge className="bg-orange-500 text-white">Waitlist</Badge>
    }
    if (userRegistrationStatus === "PENDING") {
      return <Badge className="bg-yellow-500 text-black">Pending</Badge>
    }

    switch (event.status) {
      case "Active":
        return <Badge className="bg-success text-success-foreground">Live</Badge>
      case "Upcoming":
        return <Badge variant="secondary">Upcoming</Badge>
      case "Cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">Past</Badge>
    }
  }

  return (
    <Link href={`/events/${event.eventId}`}>
      <Card
        className={cn("overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg", isPast && "opacity-70")}
      >
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={event.logoUrl || `/placeholder.svg?height=200&width=400&query=padel court ${event.eventName}`}
            alt={event.eventName}
            fill
            className="object-cover"
            priority={priority}
          />
          <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/20 to-transparent" />
          <div className="absolute right-3 top-3">{getStatusBadge()}</div>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="line-clamp-1 text-lg font-bold">{event.eventName}</h3>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{formatDate(event.dateTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{formatTime(event.dateTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{event.locationName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              <span>
                {event.slotsAvailable} {event.unitType}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-lg font-bold text-primary">
              AED {event.pricePerPlayer}
              <span className="text-xs font-normal text-muted-foreground"> / player</span>
            </span>
            {event.isTeamRegistration && (
              <Badge variant="outline" className="border-primary/50 text-primary">
                Team Event
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
