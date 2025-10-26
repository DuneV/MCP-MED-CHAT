
export interface DecisionNode {
  id: string
  pregunta?: string
  si?: DecisionNode
  no?: DecisionNode
  opciones?: OptionNode[]
  resultado?: string
  detalle?: string
}

export interface OptionNode {
  condicion: string
  texto?: string
  siguiente?: DecisionNode
  resultado?: string
  detalle?: string
}
