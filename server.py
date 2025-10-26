# app/main.py

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from local_vector_store import LocalVectorStore
from decision_tree_vsr import decision_tree_vsr

app = FastAPI()
vector_store = LocalVectorStore()

# Permitir CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- MODELOS --------
class QueryRequest(BaseModel):
    question: str
    n_results: Optional[int] = 20

class StrategyInput(BaseModel):
    seasonVSR: Optional[bool] = False
    meanAge: Optional[float] = None
    quantityVaccinatedMothers: Optional[int] = None
    childBornPostVSR_NB: Optional[int] = None

class DecisionInput(BaseModel):
    current_node: Optional[str] = "inicio"
    respuesta: Optional[str] = None
    edad_meses: Optional[float] = None
    peso_kg: Optional[float] = None
    unidad_original: Optional[str] = None


# -------- FUNCIONES --------
def find_node_by_id(node: Dict[str, Any], node_id: str) -> Optional[Dict[str, Any]]:
    """Busca un nodo en el árbol por su id"""
    if node.get("id") == node_id:
        return node
    for key, value in node.items():
        if isinstance(value, dict):
            found = find_node_by_id(value, node_id)
            if found:
                return found
        elif isinstance(value, list):
            for item in value:
                found = find_node_by_id(item, node_id)
                if found:
                    return found
    return None


# -------- ENDPOINTS --------

@app.post("/query")
def query_docs(req: QueryRequest):
    answer = vector_store.query_with_ollama(req.question, req.n_results)
    sources = vector_store.search(req.question, req.n_results)
    return {"answer": answer, "sources": sources}


@app.post("/decision")
def decision_step(data: DecisionInput):
    """Evalúa el árbol de decisión según la respuesta o valores numéricos"""
    current_node = find_node_by_id(decision_tree_vsr, data.current_node)
    if not current_node:
        return {"error": "Nodo no encontrado", "next": "inicio"}

    # Caso: resultado final
    if "resultado" in current_node:
        return {"type": "resultado", "resultado": current_node["resultado"], "detalle": current_node["detalle"]}

    # === Caso numérico (edad o peso) ===
    if current_node.get("inputType") == "number":
        valor = data.edad_meses if "edad" in current_node["pregunta"].lower() else data.peso_kg
        if valor is None:
            return {"error": "Se esperaba un valor numérico."}

        for rango in current_node.get("rangos", []):
            min_v = rango.get("min", 0)
            max_v = rango.get("max", float("inf"))
            if (min_v is None or valor >= min_v) and (max_v is None or valor < max_v):
                # Si el rango tiene resultado directo
                if "resultado" in rango:
                    return {"type": "resultado", "resultado": rango["resultado"], "detalle": rango["detalle"]}
                # O si tiene next_id
                siguiente = find_node_by_id(decision_tree_vsr, rango["next_id"])
                return {"type": "pregunta", "next_id": siguiente.get("id", ""), "pregunta": siguiente.get("pregunta")}

        return {"error": "Valor fuera de rango o no reconocido"}

    # === Caso respuesta Sí/No ===
    if data.respuesta:
        respuesta = data.respuesta.lower().strip()
        if respuesta in ["si", "sí"] and "si" in current_node:
            siguiente = current_node["si"]
        elif respuesta == "no" and "no" in current_node:
            siguiente = current_node["no"]
        else:
            return {"error": "Respuesta no válida para este nodo"}

        if "resultado" in siguiente:
            return {"type": "resultado", "resultado": siguiente["resultado"], "detalle": siguiente["detalle"]}
        return {"type": "pregunta", "next_id": siguiente.get("id", ""), "pregunta": siguiente.get("pregunta")}

    # === Caso opciones de texto ===
    if "opciones" in current_node:
        return {
            "type": "pregunta",
            "next_id": current_node.get("id", ""),
            "pregunta": current_node["pregunta"],
            "opciones": [opt["texto"] for opt in current_node["opciones"]],
        }

    return {"type": "pregunta", "next_id": current_node.get("id", ""), "pregunta": current_node.get("pregunta")}


@app.post("/strategy")
def generate_strategy(data: StrategyInput):
    recomendaciones = []

    if data.seasonVSR:
        recomendaciones.append("Temporada VSR activa: priorizar vacunación materna y refuerzo de medidas preventivas.")
    if data.meanAge and data.meanAge < 6:
        recomendaciones.append("Alta proporción de lactantes jóvenes: reforzar seguimiento pediátrico.")
    if data.quantityVaccinatedMothers and data.quantityVaccinatedMothers < 500:
        recomendaciones.append("Baja cobertura en madres vacunadas: implementar campañas focalizadas.")
    if data.childBornPostVSR_NB and data.childBornPostVSR_NB > 100:
        recomendaciones.append("Aumento de nacimientos post-VSR: ampliar dosis preventivas a recién nacidos de riesgo.")

    if not recomendaciones:
        recomendaciones.append("No se identificaron riesgos significativos. Mantener vigilancia epidemiológica.")

    return {"recomendacion": "\n".join(recomendaciones), "total_factores": len(recomendaciones)}
