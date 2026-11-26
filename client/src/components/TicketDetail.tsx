import DOMPurify from "dompurify";
import { type Ticket } from "core/constants/ticket.ts";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";

interface TicketDetailProps {
  ticket: Ticket;
}

export default function TicketDetail({ ticket }: TicketDetailProps) {
  return (
    <>
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3 mb-3">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex-1 min-w-0 break-words">
            {ticket.subject}
          </h1>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
          <div className="break-words">
            <span className="font-medium text-foreground">From:</span>{" "}
            {ticket.senderName} ({ticket.senderEmail})
          </div>
          <div>
            <span className="font-medium text-foreground">Created:</span>{" "}
            {new Date(ticket.createdAt).toLocaleString()}
          </div>
          <div>
            <span className="font-medium text-foreground">Updated:</span>{" "}
            {new Date(ticket.updatedAt).toLocaleString()}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5 sm:pt-6">
          {ticket.bodyHtml ? (
            <div
              className="overflow-x-auto max-w-full break-words [&_img]:max-w-full [&_img]:h-auto [&_table]:max-w-full"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(ticket.bodyHtml),
              }}
            />
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {ticket.body}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
