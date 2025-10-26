// components/chat-input.tsx
// --------------------------------------------------------------------------------
// NOTA: Este archivo (chat-input.tsx) está alojado en: "components/chat-input.tsx"
// --------------------------------------------------------------------------------

"use client"

import type React from "react"
import { useState, type FormEvent, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  mode?: "chat" | "Calculadora" | "Estrategia"
  currentNodeId?: string
  currentQuestion?: string
  options?: string[]
  inputType?: "text" | "number" | null
  finished?: boolean
  finalPayload?: {
    resultado: string
    detalle: string
  }
  onRestart?: () => void
}

export function ChatInput({
  onSend,
  disabled,
  mode = "chat",
  currentNodeId,
  currentQuestion,
  options,
  inputType,
  finished = false,
  finalPayload,
  onRestart,
}: ChatInputProps) {
  const [input, setInput] = useState("")
  const [seasonVSR, setSeason] = useState<boolean>(false)
  const [meanAge, setMeanAge] = useState<number | null>(null)
  const [quantityVaccinatedMothers, setVaccinatedMothers] = useState<number | null>(null)
  const [childBornPostVSR_NB, setChildBornPostVRS_NB] = useState<number | null>(null)
  const [ageUnit, setAgeUnit] = useState<"horas" | "dias" | "meses">("meses")

  // Reset de unidad al cambiar la pregunta de edad (opcional, seguro)
  useEffect(() => {
    if (currentQuestion?.toLowerCase().includes("edad")) setAgeUnit("meses")
  }, [currentQuestion])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (mode === "Estrategia") {
      onSend(
        JSON.stringify({
          seasonVSR,
          meanAge,
          quantityVaccinatedMothers,
          childBornPostVSR_NB,
          comentario: input,
        })
      )
      // limpiar campos
      setMeanAge(null)
      setVaccinatedMothers(null)
      setChildBornPostVRS_NB(null)
      setSeason(false)
      setInput("")
    } else if (mode === "chat" && input.trim() && !disabled) {
      onSend(input.trim())
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {/* === MODO CHAT === */}
      {mode === "chat" && (
        <div className="flex gap-2 flex-col sm:flex-row">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta sobre epidemiología..."
            disabled={disabled}
            className="min-h-[60px] max-h-[200px] resize-none"
            rows={2}
          />
          <Button
            type="submit"
            disabled={disabled || !input.trim()}
            size="icon"
            className="h-[60px] w-full sm:w-[60px] shrink-0"
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Enviar mensaje</span>
          </Button>
        </div>
      )}

      {/* === MODO CALCULADORA === */}
      {mode === "Calculadora" && (
        <div className="flex flex-col items-center gap-3 w-full">
          {/* 🚫 Si terminó, no mostrar más controles */}
          {finished ? (
            <div className="w-full max-w-lg border border-border rounded-lg bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">Cálculo finalizado</p>
              {finalPayload ? (
                <div className="text-left">
                  <p className="font-semibold">Resultado: {finalPayload.resultado}</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{finalPayload.detalle}</p>
                </div>
              ) : null}
              <div className="mt-3 flex justify-center gap-2">
                {onRestart && (
                  <Button type="button" variant="outline" onClick={onRestart}>
                    Reiniciar calculadora
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Mostrar la pregunta actual */}
              {currentQuestion && (
                <p className="text-sm text-muted-foreground text-center font-medium">
                  {currentQuestion}
                </p>
              )}

              {/* Botones de opciones */}
              {options && options.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 w-full">
                  {options.map((opt) => (
                    <Button
                      key={opt}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onSend(
                          JSON.stringify({
                            current_node: currentNodeId,
                            respuesta: opt,
                          })
                        )
                      }
                      className="w-full sm:w-auto"
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              )}

              {/* Entrada manual (número/texto) */}
              {!options?.length && inputType && (
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md justify-center">
                  <input
                    type={inputType}
                    placeholder={
                      currentQuestion?.toLowerCase().includes("edad")
                        ? "Introduce Cantidad"
                        : inputType === "number"
                        ? "Introduce un valor numérico"
                        : "Escribe tu respuesta"
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={disabled}
                    className="border border-border rounded-md px-3 py-2 w-full min-w-0"
                  />

                  {/* Dropdown de unidad cuando es pregunta de edad */}
                  {currentQuestion?.toLowerCase().includes("edad") && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" disabled={disabled} className="gap-2 w-full sm:w-auto">
                          Unidad: {ageUnit}
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setAgeUnit("horas")}>Horas</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAgeUnit("dias")}>Días</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAgeUnit("meses")}>Meses</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  <Button
                    type="button"
                    disabled={disabled || !input.trim()}
                    className="w-full sm:w-auto"
                    onClick={() => {
                      if (!input.trim()) return
                      let payload: Record<string, any> = { current_node: currentNodeId }

                      if (currentQuestion?.toLowerCase().includes("peso")) {
                        payload.peso_kg = Number(input.trim())
                      } else if (currentQuestion?.toLowerCase().includes("edad")) {
                        const valor = Number(input.trim())
                        let edad_meses = valor
                        if (ageUnit === "horas") edad_meses = valor / (24 * 30)
                        if (ageUnit === "dias") edad_meses = valor / 30

                        payload.edad_meses = edad_meses
                        payload.unidad_original = ageUnit
                      } else {
                        payload.respuesta = input.trim()
                      }

                      onSend(JSON.stringify(payload))
                      setInput("")
                    }}
                  >
                    Enviar
                  </Button>
                </div>
              )}

              {/* Fallback SÍ/NO si no hay opciones ni inputType */}
              {!options?.length && !inputType && (
                <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                  <Button
                    className="w-full"
                    disabled={disabled}
                    onClick={() =>
                      onSend(
                        JSON.stringify({
                          current_node: currentNodeId,
                          respuesta: "si",
                        })
                      )
                    }
                  >
                    Sí
                  </Button>
                  <Button
                    className="w-full"
                    disabled={disabled}
                    onClick={() =>
                      onSend(
                        JSON.stringify({
                          current_node: currentNodeId,
                          respuesta: "no",
                        })
                      )
                    }
                  >
                    No
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* === MODO ESTRATEGIA === */}
      {mode === "Estrategia" && (
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={seasonVSR}
              onChange={(e) => setSeason(e.target.checked)}
              disabled={disabled}
            />
            Temporada VSR activa
          </label>

          <input
            type="number"
            min="0"
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="Edad promedio (meses)"
            className="border border-border rounded-md px-3 py-2"
            onChange={(e) => setMeanAge(Number(e.target.value))}
            disabled={disabled}
          />
          <input
            type="number"
            min="0"
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="Madres vacunadas"
            className="border border-border rounded-md px-3 py-2"
            onChange={(e) => setVaccinatedMothers(Number(e.target.value))}
            disabled={disabled}
          />
          <input
            type="number"
            min="0"
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="Niños nacidos post VSR"
            className="border border-border rounded-md px-3 py-2"
            onChange={(e) => setChildBornPostVRS_NB(Number(e.target.value))}
            disabled={disabled}
          />
          <Textarea
            placeholder="Orientación de la estrategia."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[80px] sm:col-span-2"
            disabled={disabled}
          />

          <Button type="submit" disabled={disabled} className="sm:col-span-2">
            Generar Estrategia
          </Button>
        </div>
      )}
    </form>
  )
}
