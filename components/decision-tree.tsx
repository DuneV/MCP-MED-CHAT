"use client"

import { ChevronRight } from "lucide-react"
import type { DecisionTreeData, DecisionTreeNode } from "@/app/page"

interface DecisionTreeProps {
  data: DecisionTreeData
}

interface TreeNodeProps {
  node: DecisionTreeNode
  level: number
}

function TreeNode({ node, level }: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        {level > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
            {node.value && <span className="text-xs font-medium">{node.value}:</span>}
          </div>
        )}
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            node.isDecision
              ? "bg-primary/10 border border-primary/30 text-primary font-medium"
              : "bg-secondary/10 border border-secondary/30 text-secondary-foreground"
          }`}
        >
          {node.label}
        </div>
      </div>
      {hasChildren && (
        <div className="ml-6 space-y-2 border-l-2 border-border pl-4">
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function DecisionTree({ data }: DecisionTreeProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-card-foreground">{data.title}</h3>
      <div className="space-y-2">
        <TreeNode node={data.root} level={0} />
      </div>
    </div>
  )
}
