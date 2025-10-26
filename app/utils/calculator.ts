
export function procesarCalculo(input: string): string {
  const poblacionMatch = input.match(/poblaci[oó]n\s*=\s*(\d+)/i)
  const dosisMatch = input.match(/dosis\s*=\s*(\d+)/i)

  if (poblacionMatch && dosisMatch) {
    const poblacion = Number(poblacionMatch[1])
    const dosis = Number(dosisMatch[1])
    const cobertura = ((dosis / poblacion) * 100).toFixed(2)
    return `Población: ${poblacion}\nDosis aplicadas: ${dosis}\nCobertura: ${cobertura}%`
  }

  return "Por favor ingresa los valores en el formato: 'población=1000 dosis=500'"
}
