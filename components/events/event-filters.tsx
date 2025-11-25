"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FilterStatus = "all" | "Upcoming" | "Active" | "Past"

interface EventFiltersProps {
  currentFilter: FilterStatus
  onFilterChange: (filter: FilterStatus) => void
}

export function EventFilters({ currentFilter, onFilterChange }: EventFiltersProps) {
  const filters: { value: FilterStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "Upcoming", label: "Upcoming" },
    { value: "Active", label: "Live" },
    { value: "Past", label: "Past" },
  ]

  return (
    <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={currentFilter === filter.value ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
          className={cn("flex-shrink-0", currentFilter === filter.value && "bg-primary text-primary-foreground")}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  )
}
