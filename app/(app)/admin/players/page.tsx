"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { User } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { Search, MoreVertical, Shield, ShieldOff, Users, Download } from "lucide-react"

export default function AdminPlayersPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [players, setPlayers] = useState<User[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/events")
    }
  }, [isAdmin, authLoading, router])

  useEffect(() => {
    if (!isAdmin) return

    const q = query(collection(db, "users"), orderBy("fullName", "asc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const playersData: User[] = []
      snapshot.forEach((doc) => {
        playersData.push({ uid: doc.id, ...doc.data() } as User)
      })
      setPlayers(playersData)
      setFilteredPlayers(playersData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [isAdmin])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPlayers(players)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredPlayers(
        players.filter(
          (p) =>
            p.fullName?.toLowerCase().includes(query) ||
            p.email?.toLowerCase().includes(query) ||
            p.phone?.includes(query),
        ),
      )
    }
  }, [searchQuery, players])

  const toggleAdminRole = async (player: User) => {
    try {
      const newRole = player.role === "admin" ? "player" : "admin"
      await updateDoc(doc(db, "users", player.uid), { role: newRole })
      toast({
        title: "Role updated",
        description: `${player.fullName} is now ${newRole === "admin" ? "an Admin" : "a Player"}`,
      })
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update role. Please try again.",
        variant: "destructive",
      })
    }
  }

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Phone", "Skill Level", "Role"]
    const rows = filteredPlayers.map((p) => [p.fullName, p.email, p.phone || "", p.skillLevel || "", p.role])

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "players.csv"
    a.click()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
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
        <div>
          <h1 className="text-2xl font-bold">Players</h1>
          <p className="text-sm text-muted-foreground">{players.length} registered players</p>
        </div>
        <Button variant="outline" size="icon" onClick={exportToCSV}>
          <Download className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredPlayers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No players found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Try a different search term" : "No players registered yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPlayers.map((player) => (
            <Card key={player.uid}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={player.photoUrl || ""} />
                    <AvatarFallback className="bg-secondary">{getInitials(player.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{player.fullName}</p>
                      {player.role === "admin" && <Badge className="bg-primary/20 text-primary text-xs">Admin</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{player.email}</p>
                    {player.skillLevel && <p className="text-xs text-muted-foreground">{player.skillLevel}</p>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleAdminRole(player)}>
                      {player.role === "admin" ? (
                        <>
                          <ShieldOff className="mr-2 h-4 w-4" />
                          Remove Admin
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Make Admin
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
