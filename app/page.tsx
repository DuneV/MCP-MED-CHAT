"use client"

import { useState } from "react"
import { ChatMessage } from "@/components/chat-message"
import { ChatInput } from "@/components/chat-input"
import { FileText } from "lucide-react"

export type ChartData = {
  type: "bar" | "line" | "pie" | "area"
  title: string
  data: Array<{ [key: string]: string | number }>
  xKey: string
  yKeys: string[]
  colors?: string[]
}

export type DecisionTreeNode = {
  id: string
  label: string
  value?: string
  children?: DecisionTreeNode[]
  isDecision?: boolean
}

export type DecisionTreeData = {
  title: string
  root: DecisionTreeNode
}

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Source[]
  chart?: ChartData
  decisionTree?: DecisionTreeData
  timestamp: Date
}

export type Source = {
  id: string
  filename: string
  page?: number
  excerpt?: string
  relevance?: number
}

export default function EpidemiologyChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hola, soy tu asistente de epidemiología. Puedo ayudarte con preguntas sobre enfermedades infecciosas, estadísticas de salud pública, prevención y control de brotes. También puedo mostrarte gráficas y árboles de decisión basados en los datos. ¿En qué puedo ayudarte hoy?",
      timestamp: new Date(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: content,
          n_results: 3,
        }),
      })

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || "No se encontró respuesta en los documentos.",
        sources: data.sources?.map((src: any, i: number) => ({
          id: `s${i}`,
          filename: src.metadata?.filename || "Documento desconocido",
          excerpt: src.document?.slice(0, 200) + "...",
          relevance: src.similarity,
        })),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error al conectar con el backend:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: "Error al conectar con el backend. Verifica que el servidor FastAPI esté corriendo.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Chatbot del Observatorio Jose Felix Patiño</h1>
              <p className="text-sm text-muted-foreground">Asistente especializado con fuentes verificadas por el Observatorio</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                  <FileText className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="rounded-lg bg-card p-4 shadow-sm border border-border">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-primary"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  )
}
