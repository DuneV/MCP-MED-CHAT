import type { Source } from "@/app/page"
import { FileText, ExternalLink } from "lucide-react"
import { Card } from "@/components/ui/card"

interface SourceCardProps {
  source: Source
}

export function SourceCard({ source }: SourceCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/50">
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-card-foreground truncate">{source.filename}</p>
              {source.page && <p className="text-xs text-muted-foreground">Página {source.page}</p>}
            </div>
          </div>
          <button className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-label="Abrir PDF">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
          </button>
        </div>

        {/* Excerpt */}
        {source.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{source.excerpt}</p>
        )}

        {/* Relevance */}
        {source.relevance && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${source.relevance * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{Math.round(source.relevance * 100)}%</span>
          </div>
        )}
      </div>
    </Card>
  )
}
