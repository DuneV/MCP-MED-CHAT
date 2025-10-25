"use client"

import { useState } from "react"
import { ChatMessage } from "@/components/chat-message"
import { ChatInput } from "@/components/chat-input"
import { FileText, Download, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
          n_results: 5,
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

  const generateMarkdownReport = () => {
    const date = new Date().toLocaleString("es-CO", {
      dateStyle: "full",
      timeStyle: "short",
    })

    let markdown = `# Informe de Consulta - Observatorio José Félix Patiño\n\n`
    markdown += `**Fecha de generación:** ${date}\n\n`
    markdown += `---\n\n`

    // Filtrar solo mensajes relevantes (excluir el mensaje inicial)
    const relevantMessages = messages.slice(1)

    relevantMessages.forEach((msg, index) => {
      if (msg.role === "user") {
        markdown += `## Consulta ${Math.floor(index / 2) + 1}\n\n`
        markdown += `**Pregunta:** ${msg.content}\n\n`
      } else {
        markdown += `**Respuesta:**\n\n${msg.content}\n\n`

        if (msg.sources && msg.sources.length > 0) {
          markdown += `### Fuentes consultadas:\n\n`
          msg.sources.forEach((source, i) => {
            markdown += `${i + 1}. **${source.filename}**\n`
            if (source.relevance) {
              markdown += `   - Relevancia: ${(source.relevance * 100).toFixed(1)}%\n`
            }
            if (source.excerpt) {
              markdown += `   - Extracto: "${source.excerpt}"\n`
            }
            markdown += `\n`
          })
        }
        markdown += `---\n\n`
      }
    })

    markdown += `\n_Informe generado automáticamente por el Chatbot del Observatorio José Félix Patiño_`

    return markdown
  }

  const generateHTMLReport = () => {
    const date = new Date().toLocaleString("es-CO", {
      dateStyle: "full",
      timeStyle: "short",
    })

    let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe - Observatorio José Félix Patiño</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
        }
        h1 {
            color: #2563eb;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 10px;
        }
        h2 {
            color: #1e40af;
            margin-top: 30px;
        }
        h3 {
            color: #64748b;
        }
        .metadata {
            background: #f1f5f9;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .question {
            background: #eff6ff;
            padding: 15px;
            border-left: 4px solid #2563eb;
            margin: 20px 0;
        }
        .answer {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .sources {
            background: #fefce8;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .source-item {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 4px;
        }
        .relevance {
            display: inline-block;
            background: #22c55e;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: bold;
        }
        .excerpt {
            font-style: italic;
            color: #64748b;
            margin-top: 5px;
        }
        hr {
            border: none;
            border-top: 2px solid #e2e8f0;
            margin: 40px 0;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            color: #64748b;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <h1>📊 Informe de Consulta</h1>
    <div class="metadata">
        <strong>Observatorio José Félix Patiño</strong><br>
        Fecha de generación: ${date}<br>
        Total de consultas: ${Math.floor((messages.length - 1) / 2)}
    </div>
    <hr>
`

    const relevantMessages = messages.slice(1)

    relevantMessages.forEach((msg, index) => {
      if (msg.role === "user") {
        html += `    <h2>Consulta ${Math.floor(index / 2) + 1}</h2>\n`
        html += `    <div class="question">\n`
        html += `        <strong>Pregunta:</strong><br>${msg.content}\n`
        html += `    </div>\n`
      } else {
        html += `    <div class="answer">\n`
        html += `        <strong>Respuesta:</strong><br><br>\n`
        html += `        ${msg.content.replace(/\n/g, "<br>")}\n`
        html += `    </div>\n`

        if (msg.sources && msg.sources.length > 0) {
          html += `    <div class="sources">\n`
          html += `        <h3>📚 Fuentes Consultadas</h3>\n`
          msg.sources.forEach((source, i) => {
            html += `        <div class="source-item">\n`
            html += `            <strong>${i + 1}. ${source.filename}</strong>\n`
            if (source.relevance) {
              html += `            <span class="relevance">${(source.relevance * 100).toFixed(1)}% relevante</span>\n`
            }
            if (source.excerpt) {
              html += `            <div class="excerpt">"${source.excerpt}"</div>\n`
            }
            html += `        </div>\n`
          })
          html += `    </div>\n`
        }
        html += `    <hr>\n`
      }
    })

    html += `
    <div class="footer">
        <p>Informe generado automáticamente por el Chatbot del Observatorio José Félix Patiño</p>
    </div>
</body>
</html>`

    return html
  }

  const downloadReport = (format: "markdown" | "html") => {
    let content: string
    let filename: string
    let mimeType: string

    const timestamp = new Date().toISOString().split("T")[0]

    if (format === "markdown") {
      content = generateMarkdownReport()
      filename = `informe_observatorio_${timestamp}.md`
      mimeType = "text/markdown"
    } else {
      content = generateHTMLReport()
      filename = `informe_observatorio_${timestamp}.html`
      mimeType = "text/html"
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Chatbot del Observatorio Jose Felix Patiño
                </h1>
                <p className="text-sm text-muted-foreground">
                  Asistente especializado con fuentes verificadas por el Observatorio
                </p>
              </div>
            </div>

            {/* Botón de descarga */}
            {messages.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Descargar Informe
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => downloadReport("html")}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Descargar como HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadReport("markdown")}>
                    <FileText className="mr-2 h-4 w-4" />
                    Descargar como Markdown
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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

      <div className="border-t border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  )
}