from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from local_vector_store import LocalVectorStore

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
vector_store = LocalVectorStore()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str
    n_results: Optional[int] = 20

@app.post("/query")
def query_docs(req: QueryRequest):
    answer = vector_store.query_with_ollama(req.question, req.n_results)
    sources = vector_store.search(req.question, req.n_results)
    return {"answer": answer, "sources": sources}
