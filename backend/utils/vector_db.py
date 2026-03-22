import os
from typing import List, Optional

# Try to import chromadb, but make it optional
try:
    import chromadb
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    print("Warning: chromadb not available. Vector search features will be disabled.")

# Initialize ChromaDB with persistence (only if available)
chroma_client = None
if CHROMADB_AVAILABLE:
    try:
        os.makedirs("./chroma_db", exist_ok=True)
        chroma_client = chromadb.PersistentClient(path="./chroma_db")
    except Exception as e:
        print(f"Warning: Failed to initialize chromadb: {e}")
        CHROMADB_AVAILABLE = False

# Collection name
COLLECTION_NAME = "lessons"

def get_or_create_collection():
    """Get or create the lessons collection"""
    if not CHROMADB_AVAILABLE or chroma_client is None:
        return None
    try:
        collection = chroma_client.get_collection(name=COLLECTION_NAME)
    except Exception:
        collection = chroma_client.create_collection(name=COLLECTION_NAME)
    return collection

def add_lesson_to_vector_db(lesson_id: int, title: str, content: str):
    """Add lesson content to vector database"""
    if not CHROMADB_AVAILABLE or chroma_client is None:
        print("Warning: Vector DB not available, skipping vector storage")
        return
    
    try:
        collection = get_or_create_collection()
        if collection is None:
            return
        
        # Split content into chunks (for better retrieval)
        chunk_size = 1000
        chunks = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]
        
        ids = [f"{lesson_id}_{i}" for i in range(len(chunks))]
        documents = chunks
        metadatas = [{"lesson_id": lesson_id, "title": title, "chunk_index": i} for i in range(len(chunks))]
        
        collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
    except Exception as e:
        print(f"Warning: Failed to add lesson to vector DB: {e}")

def search_similar_content(query: str, lesson_id: Optional[int] = None, top_k: int = 3) -> List[dict]:
    """Search for similar content in vector database"""
    if not CHROMADB_AVAILABLE or chroma_client is None:
        return []
    
    try:
        collection = get_or_create_collection()
        if collection is None:
            return []
        
        # Build query
        where_filter = {"lesson_id": lesson_id} if lesson_id else None
        
        results = collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where_filter
        )
        
        # Format results
        formatted_results = []
        if results['documents'] and len(results['documents']) > 0:
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    "content": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                    "distance": results['distances'][0][i] if results['distances'] else None
                })
        
        return formatted_results
    except Exception as e:
        print(f"Warning: Failed to search vector DB: {e}")
        return []

def delete_lesson_from_vector_db(lesson_id: int):
    """Delete lesson from vector database"""
    if not CHROMADB_AVAILABLE or chroma_client is None:
        return
    
    try:
        collection = get_or_create_collection()
        if collection is None:
            return
        
        # Get all documents for this lesson
        results = collection.get(where={"lesson_id": lesson_id})
        if results['ids']:
            collection.delete(ids=results['ids'])
    except Exception as e:
        print(f"Error deleting lesson from vector DB: {e}")

