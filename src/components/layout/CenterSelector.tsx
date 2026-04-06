import { Building2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const centers = [
  { id: "all", name: "Todos los centros" },
  { id: "1", name: "Centro Madrid Norte" },
  { id: "2", name: "Centro Madrid Sur" },
  { id: "3", name: "Centro Barcelona" },
  { id: "4", name: "Centro Valencia" },
];

export function CenterSelector() {
  const [selected, setSelected] = useState(centers[0]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-sm font-medium">
          <Building2 className="h-4 w-4 text-primary" />
          {selected.name}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {centers.map((center) => (
          <DropdownMenuItem
            key={center.id}
            onClick={() => setSelected(center)}
            className={selected.id === center.id ? "bg-primary/10 text-primary" : ""}
          >
            <Building2 className="h-4 w-4 mr-2" />
            {center.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
