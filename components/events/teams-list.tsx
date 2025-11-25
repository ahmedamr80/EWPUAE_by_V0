"use client"

import type { Event, User, Registration, Team } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock } from "lucide-react"

interface TeamWithPlayers {
  team: Team
  player1: User | null
  player2: User | null
  registration: Registration
}

interface TeamsListProps {
  event: Event
  confirmedTeams: TeamWithPlayers[]
  pendingTeams: TeamWithPlayers[]
}

export function TeamsList({ event, confirmedTeams, pendingTeams }: TeamsListProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-4">
      {/* Confirmed Teams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-success" />
            Confirmed Teams ({confirmedTeams.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {confirmedTeams.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No confirmed teams yet</p>
          ) : (
            <div className="space-y-3">
              {confirmedTeams.map((team) => (
                <div
                  key={team.team.teamId}
                  className="flex items-center gap-4 rounded-lg border border-success/30 bg-success/5 p-3"
                >
                  <div className="flex -space-x-2">
                    <Avatar className="h-10 w-10 border-2 border-background">
                      <AvatarImage src={team.player1?.photoUrl || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(team.player1?.fullName || "P1")}
                      </AvatarFallback>
                    </Avatar>
                    <Avatar className="h-10 w-10 border-2 border-background">
                      <AvatarImage src={team.player2?.photoUrl || ""} />
                      <AvatarFallback className="bg-secondary">
                        {getInitials(team.player2?.fullName || "P2")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {team.player1?.fullName} & {team.player2?.fullName}
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {team.player1?.skillLevel && <span>{team.player1.skillLevel}</span>}
                      {team.player2?.skillLevel && <span>• {team.player2.skillLevel}</span>}
                    </div>
                  </div>
                  <Badge className="bg-success text-success-foreground">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Confirmed
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Teams */}
      {pendingTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-warning" />
              Pending Confirmation ({pendingTeams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTeams.map((team) => (
                <div
                  key={team.team.teamId}
                  className="flex items-center gap-4 rounded-lg border border-warning/30 bg-warning/5 p-3"
                >
                  <div className="flex -space-x-2">
                    <Avatar className="h-10 w-10 border-2 border-background">
                      <AvatarImage src={team.player1?.photoUrl || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(team.player1?.fullName || "P1")}
                      </AvatarFallback>
                    </Avatar>
                    <Avatar className="h-10 w-10 border-2 border-background opacity-50">
                      <AvatarImage src={team.player2?.photoUrl || ""} />
                      <AvatarFallback className="bg-muted">{getInitials(team.player2?.fullName || "?")}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {team.player1?.fullName}
                      <span className="text-muted-foreground"> & </span>
                      <span className="opacity-50">{team.player2?.fullName || "Pending..."}</span>
                    </p>
                    <p className="text-xs text-warning">Waiting for partner confirmation</p>
                  </div>
                  <Badge variant="outline" className="border-warning text-warning">
                    <Clock className="mr-1 h-3 w-3" />
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
