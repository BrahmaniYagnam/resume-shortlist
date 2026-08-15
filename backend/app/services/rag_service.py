import os
from pathlib import Path

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
try:
    from langchain_community.vectorstores import Chroma
except ImportError:
    Chroma = None

try:
    import chromadb
except ImportError:
    chromadb = None

from app.config import get_settings

settings = get_settings()


class RAGService:
    def __init__(self):
        self.persist_dir = settings.chroma_persist_dir
        Path(self.persist_dir).mkdir(parents=True, exist_ok=True)
        self._embeddings = None
        self._vectorstore = None

    @property
    def embeddings(self):
        if self._embeddings is None:
            if settings.openai_api_key:
                from langchain_openai import OpenAIEmbeddings
                self._embeddings = OpenAIEmbeddings(
                    openai_api_key=settings.openai_api_key,
                    model="text-embedding-3-small",
                )
            elif settings.gemini_api_key:
                self._embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/embedding-001",
                    google_api_key=settings.gemini_api_key,
                )
        return self._embeddings

    def get_vectorstore(self, collection_name: str = "career_knowledge") -> Chroma | None:
        if not self.embeddings or Chroma is None or chromadb is None:
            return None
        try:
            return Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                persist_directory=os.path.join(self.persist_dir, collection_name),
            )
        except (ImportError, Exception):
            return None

    def index_user_context(self, user_id: int, documents: list[str], metadatas: list[dict] | None = None):
        if not self.embeddings or not documents:
            return

        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = []
        meta_chunks = []
        for i, doc in enumerate(documents):
            for chunk in splitter.split_text(doc):
                chunks.append(chunk)
                meta = {"user_id": user_id}
                if metadatas and i < len(metadatas):
                    meta.update(metadatas[i])
                meta_chunks.append(meta)

        store = self.get_vectorstore(f"user_{user_id}")
        if store and chunks:
            store.add_texts(chunks, metadatas=meta_chunks)

    def query_context(self, user_id: int, query: str, k: int = 5) -> list[str]:
        store = self.get_vectorstore(f"user_{user_id}")
        if not store:
            return []
        results = store.similarity_search(query, k=k)
        return [doc.page_content for doc in results]


rag_service = RAGService()
