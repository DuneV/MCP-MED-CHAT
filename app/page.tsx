// app/page.tsx
// --------------------------------------------------------------------------------
// NOTA: Este archivo (page.tsx) está alojado en: "app/page.tsx"
// --------------------------------------------------------------------------------

"use client"

import { useState, useEffect } from "react"
import { ChatMessage } from "@/components/chat-message"
import { ChatInput } from "@/components/chat-input"
import { FileText, Download, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { procesarCalculo } from "./utils/calculator"

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
  const [mode, setMode] = useState<"chat" | "Calculadora" | "Estrategia">("chat")

  const [showOnboarding, setShowOnboarding] = useState(true)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const [calcFinished, setCalcFinished] = useState(false)
  const [finalPayload, setFinalPayload] = useState<{ resultado: string; detalle: string } | null>(null)

  const [currentNodeId, setCurrentNodeId] = useState<string>("inicio")
  const [currentQuestion, setCurrentQuestion] = useState<string>("¿Es temporada VSR?")
  const [currentOptions, setCurrentOptions] = useState<string[]>([])
  const [awaitingInputType, setAwaitingInputType] = useState<"text" | "number" | null>(null)
  
  const bubbleVariants = {
    initial: { opacity: 0, y: 16, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -12, scale: 0.98 },
  }
  
  const listVariants = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -24 },
  }

  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem("ojfp_onboarding_seen")
    if (seen === "1") setShowOnboarding(false)
  }, [])

  const closeOnboarding = () => {
    setShowOnboarding(false)
    if (dontShowAgain) localStorage.setItem("ojfp_onboarding_seen", "1")
  }

  useEffect(() => {
    if (showOnboarding) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
  }, [showOnboarding])

  const handleModeChange = async (newMode: "chat" | "Calculadora" | "Estrategia") => {
    setMode(newMode)
    setCalcFinished(false)
    setFinalPayload(null)
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          newMode === "Calculadora"
            ? "Iniciando modo Calculadora VSR..."
            : newMode === "Estrategia"
            ? "Modo Estrategia activado. Ingresa los datos epidemiológicos."
            : "Hola, soy tu asistente de epidemiología. Puedo ayudarte con preguntas sobre enfermedades infecciosas, estadísticas de salud pública, prevención y control de brotes. También puedo mostrarte gráficas y árboles de decisión basados en los datos. ¿En qué puedo ayudarte hoy?",
        timestamp: new Date(),
      },
    ])
    setCurrentNodeId("inicio")
    setCurrentQuestion("¿Es temporada VSR?")
    setCurrentOptions([])
    setAwaitingInputType(null)

    if (newMode === "Calculadora") {
      try {
        const response = await fetch("http://localhost:8000/decision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_node: "inicio" }),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = await response.json()

        // Si por diseño el primer nodo ya retorna un resultado
        if (result.type === "resultado") {
          setCalcFinished(true)
          setFinalPayload({ resultado: result.resultado, detalle: result.detalle })
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "assistant",
              content: `**${result.resultado}**\n\n${result.detalle}`,
              timestamp: new Date(),
            },
          ])
          return
        }

        if (result.type === "pregunta") {
          setCurrentNodeId(result.next_id)
          setCurrentQuestion(result.pregunta)
          setCurrentOptions(result.opciones || [])
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: result.pregunta,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, assistantMessage])
        }
      } catch (error) {
        console.error("Error iniciando árbol de decisión:", error)
      }
    }
  }

  const handleSendMessage = async (content: string) => {
    // Evitamos envíos si la calculadora terminó
    if (mode === "Calculadora" && calcFinished) return

    let displayContent = content
    if (mode === "Calculadora") {
      try {
        const parsed = JSON.parse(content)
        displayContent = parsed.respuesta ? `Respuesta: ${parsed.respuesta}` : "Respuesta enviada"
      } catch {
        displayContent = "Respuesta enviada"
      }
    } else if (mode === "Estrategia") {
      displayContent = "Parámetros de estrategia enviados"
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: displayContent,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      if (mode === "Calculadora") {
        const data = JSON.parse(content)
        const response = await fetch("http://localhost:8000/decision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = await response.json()

        if (result.type === "pregunta") {
          setCurrentNodeId(result.next_id)
          setCurrentQuestion(result.pregunta)
          setCurrentOptions(result.opciones || [])

          const questionMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: result.pregunta,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, questionMessage])

          const preguntaLower = (result.pregunta || "").toLowerCase()
          if (preguntaLower.includes("edad") || preguntaLower.includes("peso")) {
            setAwaitingInputType("number")
          } else {
            setAwaitingInputType(null)
          }
        } else if (result.type === "resultado") {
          setCalcFinished(true)
          setFinalPayload({ resultado: result.resultado, detalle: result.detalle })

          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `**${result.resultado}**\n\n${result.detalle}`,
              timestamp: new Date(),
            },
          ])

          // Limpiamos controles
          setCurrentOptions([])
          setAwaitingInputType(null)
        }
        return
      }

      if (mode === "Estrategia") {
        const data = JSON.parse(content)
        const response = await fetch("http://localhost:8000/strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = await response.json()

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Estrategia generada:\n\n${result.recomendacion}`,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])
        return
      }

      const response = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: content,
          n_results: 5,
        }),
      })

      if (!response.ok) throw new Error(`Error HTTP ${response.status}`)

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
    const date = new Date().toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" })
    let markdown = `# Informe de Consulta - Observatorio José Félix Patiño\n\n`
    markdown += `**Fecha de generación:** ${date}\n\n`
    markdown += `---\n\n`

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
    const date = new Date().toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" })

    let html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Informe - Observatorio José Félix Patiño</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #333; }
  h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
  h2 { color: #1e40af; margin-top: 30px; }
  h3 { color: #64748b; }
  .metadata { background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
  .question { background: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
  .answer { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
  .sources { background: #fefce8; padding: 15px; border-radius: 8px; margin: 20px 0; }
  .source-item { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
  .relevance { display: inline-block; background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; }
  .excerpt { font-style: italic; color: #64748b; margin-top: 5px; }
  hr { border: none; border-top: 2px solid #e2e8f0; margin: 40px 0; }
  .footer { text-align: center; margin-top: 50px; color: #64748b; font-size: 0.9em; }
</style>
</head>
<body>
  <h1>Informe de Consulta</h1>
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
        html += `  <h2>Consulta ${Math.floor(index / 2) + 1}</h2>
  <div class="question">
    <strong>Pregunta:</strong><br>${msg.content}
  </div>
`
      } else {
        html += `  <div class="answer">
    <strong>Respuesta:</strong><br><br>
    ${msg.content.replace(/\n/g, "<br>")}
  </div>
`
        if (msg.sources && msg.sources.length > 0) {
          html += `  <div class="sources">
    <h3>📚 Fuentes Consultadas</h3>
`
          msg.sources.forEach((source, i) => {
            html += `    <div class="source-item">
      <strong>${i + 1}. ${source.filename}</strong>
      ${source.relevance ? `<span class="relevance">${(source.relevance * 100).toFixed(1)}% relevante</span>` : ""}
      ${source.excerpt ? `<div class="excerpt">"${source.excerpt}"</div>` : ""}
    </div>
`
          })
          html += `  </div>
`
        }
        html += `  <hr>
`
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
    <div className="flex flex-col h-[100svh] bg-background relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -z-10 opacity-2 hidden sm:block"
      >
        <img
          src="/Logo_background.png"
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-screen-md lg:max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          {/* Primera fila: ícono, título y botones */}
          <div className="flex items-center justify-between">
            {/* Izquierda: ícono + título */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Chatbot del Observatorio José Félix Patiño
                </h1>
                <p className="text-sm text-muted-foreground">
                  Asistente especializado con fuentes verificadas por el Observatorio
                </p>
              </div>
            </div>

            {/* Derecha: dropdowns de modo y descarga */}
            <div className="flex items-center gap-3 flex-col sm:flex-row">
              {/* Dropdown Modo */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                    <FileText className="h-4 w-4" />
                    Modo: {mode}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleModeChange("chat")}>Chat</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleModeChange("Calculadora")}>Calculadora</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleModeChange("Estrategia")}>Estrategia</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Dropdown Descargar */}
              {messages.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
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

          {/* Segunda fila: logos centrados (más pequeños) */}
          <div className="mt-3 hidden sm:flex justify-center items-center gap-x-6">
            <img
              src="/Logo_Universidad_de_los_Andes.png"
              alt="Logo Universidad de los Andes"
              className="h-6 w-auto opacity-90 hover:opacity-100 transition-opacity"
            />
            <img
              src="/Logo_Florida_University.svg"
              alt="Logo Universidad de Florida"
              className="h-6 w-auto opacity-90 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-screen-md lg:max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <LayoutGroup>
            <AnimatePresence mode="wait">
              {/* 👇 al cambiar `mode`, este contenedor se desmonta/monta con transición */}
              <motion.div
                key={mode}
                variants={listVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6 overflow-x-auto"
              >
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      layout
                      variants={bubbleVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <ChatMessage message={message} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <motion.div
                    layout
                    variants={bubbleVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-start gap-3"
                  >
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
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </LayoutGroup>
        </div>
      </div>

      <div
        className={`border-t border-border transition-colors duration-500 ${
          mode === "Calculadora" ? "bg-[#e6f7fb]" : mode === "Estrategia" ? "bg-[#e6f7fb]" : "bg-[#e6f7fb]"
        }`}
      >
        <div className="mx-auto max-w-screen-md lg:max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <ChatInput
                onSend={handleSendMessage}
                disabled={isLoading}
                mode={mode}
                currentNodeId={currentNodeId}
                currentQuestion={currentQuestion}
                options={currentOptions}
                inputType={awaitingInputType}
                finished={calcFinished}
                finalPayload={finalPayload ?? undefined}
                onRestart={() => handleModeChange("Calculadora")}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <footer className="border-t border-border bg-card text-muted-foreground py-1">
        <div className="mx-auto max-w-screen-md lg:max-w-5xl px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>
            © {new Date().getFullYear()} Observatorio José Félix Patiño —{" "}
            <a
              href="https://medicina.uniandes.edu.co/es/investigacion/observatorio-salud-publica"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium hover:underline"
            >
              Universidad de los Andes
            </a>{" "}
            — Desarrollado por el equipo de Epidemiología Computacional
          </p>
        </div>
      </footer>
         {/* === OVERLAY ONBOARDING === */}
        <AnimatePresence>
          {showOnboarding && (
            <motion.div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl"
                initial={{ y: 24, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -16, opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    Aviso &amp; Guía rápida
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Este asistente no reemplaza el juicio clínico ni las guías oficiales.
                    Úsalo como apoyo con fuentes verificadas por el Observatorio.
                  </p>

                  <ol className="mt-4 space-y-2 text-sm text-foreground">
                    <li className="flex gap-2">
                      <span className="font-medium">1.</span>
                      Formula una pregunta en <span className="font-medium">Modo Chat</span> y revisa las fuentes.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">2.</span>
                      En <span className="font-medium">Calculadora</span> responde según el árbol de decisión (edad/peso/unidades).
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">3.</span>
                      En <span className="font-medium">Estrategia</span> ingresa tus parámetros para recomendaciones operativas.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">4.</span>
                      Usa “Descargar Informe” para guardar el resumen (HTML/Markdown).
                    </li>
                  </ol>

                  <div className="mt-5 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={dontShowAgain}
                        onChange={(e) => setDontShowAgain(e.target.checked)}
                      />
                      No volver a mostrar
                    </label>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowOnboarding(false)}>
                        Ver rápido
                      </Button>
                      <Button onClick={closeOnboarding}>
                        Entrar
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  )
}
