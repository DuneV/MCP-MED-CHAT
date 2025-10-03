import os
import json
from pathlib import Path
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings
import ollama
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader, 
    TextLoader, 
    Docx2txtLoader
)
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LocalVectorStore:
    def __init__(self, collection_name: str = "documentos", persist_directory: str = "./chroma_db"):
        """
        Inicializa el almacén vectorial local
        """
        self.collection_name = collection_name
        self.persist_directory = persist_directory
        
        # Configurar ChromaDB
        self.chroma_client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Crear o obtener colección
        self.collection = self.chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        
        # Configurar text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""]
        )

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Genera embeddings usando Ollama
        """
        embeddings = []
        for text in texts:
            try:
                response = ollama.embeddings(
                    model='nomic-embed-text',
                    prompt=text
                )
                embeddings.append(response['embedding'])
            except Exception as e:
                logger.error(f"Error generando embedding: {e}")
                # Embedding vacío como fallback
                embeddings.append([0.0] * 768)
        
        return embeddings

    def load_document(self, file_path: str) -> List[str]:
        """
        Carga y procesa diferentes tipos de documentos
        """
        file_path = Path(file_path)
        
        try:
            if file_path.suffix.lower() == '.pdf':
                loader = PyPDFLoader(str(file_path))
            elif file_path.suffix.lower() in ['.docx', '.doc']:
                loader = Docx2txtLoader(str(file_path))
            elif file_path.suffix.lower() == '.txt':
                loader = TextLoader(str(file_path), encoding='utf-8')
            else:
                raise ValueError(f"Tipo de archivo no soportado: {file_path.suffix}")
            
            documents = loader.load()
            
            # Dividir en chunks
            texts = []
            for doc in documents:
                chunks = self.text_splitter.split_text(doc.page_content)
                texts.extend(chunks)
            
            return texts
            
        except Exception as e:
            logger.error(f"Error cargando documento {file_path}: {e}")
            return []

    def add_document(self, file_path: str, metadata: Dict[str, Any] = None) -> bool:
        """
        Añade un documento al almacén vectorial
        """
        try:
            # Cargar y procesar documento
            texts = self.load_document(file_path)
            if not texts:
                return False
            
            # Generar embeddings
            embeddings = self.get_embeddings(texts)
            
            # Preparar metadatos
            base_metadata = {
                "source": str(file_path),
                "filename": Path(file_path).name
            }
            if metadata:
                base_metadata.update(metadata)
            
            # Generar IDs únicos
            ids = [f"{Path(file_path).stem}_{i}" for i in range(len(texts))]
            
            # Preparar metadatos para cada chunk
            metadatas = []
            for i, text in enumerate(texts):
                chunk_metadata = base_metadata.copy()
                chunk_metadata.update({
                    "chunk_index": i,
                    "chunk_size": len(text)
                })
                metadatas.append(chunk_metadata)
            
            # Añadir a ChromaDB
            self.collection.add(
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"Documento {file_path} añadido exitosamente ({len(texts)} chunks)")
            return True
            
        except Exception as e:
            logger.error(f"Error añadiendo documento {file_path}: {e}")
            return False

    def search(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """
        Busca documentos similares a la consulta
        """
        try:
            # Generar embedding de la consulta
            query_embedding = self.get_embeddings([query])[0]
            
            # Buscar en ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                include=['documents', 'metadatas', 'distances']
            )
            
            # Formatear resultados
            formatted_results = []
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    'document': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'distance': results['distances'][0][i],
                    'similarity': 1 - results['distances'][0][i]  # Convertir distancia a similitud
                })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error en búsqueda: {e}")
            return []

    def query_with_ollama(self, question: str, n_results: int = 3) -> str:
        """
        Realiza una consulta usando RAG (Retrieval-Augmented Generation)
        """
        try:
            # Buscar documentos relevantes
            search_results = self.search(question, n_results)
            
            if not search_results:
                return "No se encontraron documentos relevantes para tu consulta."
            
            # Preparar contexto
            context = "\n\n".join([
                f"Documento {i+1} (Similitud: {result['similarity']:.2f}):\n{result['document']}"
                for i, result in enumerate(search_results)
            ])
            
            # Crear prompt
            prompt = f"""Basándote únicamente en la siguiente información de documentos, responde la pregunta de manera precisa y detallada:

CONTEXTO:
{context}

PREGUNTA: {question}

INSTRUCCIONES:
- Responde solo con información del contexto proporcionado
- Si la información no está disponible, indícalo claramente
- Cita las fuentes cuando sea relevante
- Sé preciso y conciso

RESPUESTA:"""

            # Generar respuesta con Ollama
            response = ollama.generate(
                model='llama3.1:8b',  # o el modelo que tengas instalado
                prompt=prompt,
                options={
                    'temperature': 0.1,
                    'top_p': 0.9,
                    'max_tokens': 1000
                }
            )
            
            return response['response']
            
        except Exception as e:
            logger.error(f"Error en consulta con Ollama: {e}")
            return f"Error procesando la consulta: {str(e)}"

    def list_documents(self) -> List[str]:
        """
        Lista todos los documentos en el almacén
        """
        try:
            results = self.collection.get(
                include=['metadatas']
            )
            
            # Extraer archivos únicos
            sources = set()
            for metadata in results['metadatas']:
                sources.add(metadata.get('filename', 'Unknown'))
            
            return list(sources)
            
        except Exception as e:
            logger.error(f"Error listando documentos: {e}")
            return []

    def delete_document(self, filename: str) -> bool:
        """
        Elimina un documento del almacén vectorial
        """
        try:
            # Buscar IDs del documento
            results = self.collection.get(
                where={"filename": filename},
                include=['ids']
            )
            
            if results['ids']:
                self.collection.delete(ids=results['ids'])
                logger.info(f"Documento {filename} eliminado exitosamente")
                return True
            else:
                logger.warning(f"Documento {filename} no encontrado")
                return False
                
        except Exception as e:
            logger.error(f"Error eliminando documento {filename}: {e}")
            return False

if __name__ == "__main__":
    vector_store = LocalVectorStore()

    print("=== Añadiendo documentos ===")
    documents = [
        "./DOC_VSR.docx"
    ]
    
    for doc_path in documents:
        if os.path.exists(doc_path):
            success = vector_store.add_document(doc_path)
            print(f"Documento {doc_path}: {'✓ Añadido' if success else '✗ Error'}")
    
    print("\n=== Documentos en el almacén ===")
    docs = vector_store.list_documents()
    for doc in docs:
        print(f"- {doc}")

    print("\n=== Realizando consultas ===")
    questions = [
        "¿Cuál es el tema principal del documento?",
        "¿Qué información importante contiene?",
        "Dame un resumen de los puntos clave"
    ]
    
    for question in questions:
        print(f"\nPregunta: {question}")
        answer = vector_store.query_with_ollama(question)
        print(f"Respuesta: {answer}")
        print("-" * 50)