import type { Message } from "@/app/page"
import { SourceCard } from "./source-card"
import { ChartDisplay } from "./chart-display"
import { DecisionTree } from "./decision-tree"
import { User, FileText } from "lucide-react"

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className="flex items-start gap-3">
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-secondary" : "bg-primary"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-secondary-foreground" />
        ) : (
          <FileText className="h-4 w-4 text-primary-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3">
        <div className="rounded-lg bg-card p-4 shadow-sm border border-border">
          <p className="text-sm leading-relaxed text-card-foreground whitespace-pre-wrap text-pretty">
            {message.content}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {message.chart && <ChartDisplay data={message.chart} />}

        {message.decisionTree && <DecisionTree data={message.decisionTree} />}

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fuentes consultadas ({message.sources.length})
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {message.sources.map((source) => (
                <SourceCard key={source.id} source={source} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
