import { useState } from "react";
import { type TicketStatus } from "core/constants/ticket-status.ts";
import { type TicketCategory } from "core/constants/ticket-category.ts";
import TicketsTable from "./TicketsTable";
import TicketsFilters from "./TicketsFilters";

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  search?: string;
}

export default function TicketsPage() {
  const [filters, setFilters] = useState<TicketFilters>({});

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Tickets</h1>
      </div>
      <TicketsFilters filters={filters} onChange={setFilters} />
      <TicketsTable filters={filters} />
    </div>
  );
}
