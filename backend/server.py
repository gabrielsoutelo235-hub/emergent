from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import os
import uuid
import logging
import bcrypt
import jwt as pyjwt
import random
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
from fastapi import UploadFile, File, Form
import shutil

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']

app = FastAPI(title="NEXUS OPS API")
api = APIRouter(prefix="/api")

# ---------- Helpers ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())

def create_token(user_id: str, email: str, days: int = 7) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=days)
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ClientIn(BaseModel):
    name: str
    segment: str = ""
    status: Literal["Ativo", "Em Risco", "Onboarding", "Cancelado"] = "Ativo"
    mrr: float = 0
    health: int = 80
    next_action: str = ""
    contact_email: str = ""
    notes: str = ""

class TransactionIn(BaseModel):
    client_id: Optional[str] = None
    client_name: str = ""
    description: str
    amount: float
    type: Literal["receita", "despesa"] = "receita"
    date: Optional[str] = None

class SnippetIn(BaseModel):
    title: str
    language: str = "javascript"
    code: str
    description: str = ""
    tags: List[str] = []

class ChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None
    attachments: List[dict] = []  # [{file_id, path, mime_type, name}]

class AnalyzeIn(BaseModel):
    url: str

# ---------- Auth ----------
@api.post("/auth/register")
async def register(data: RegisterIn, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": email,
        "name": data.name,
        "role": "user",
        "password_hash": hash_password(data.password),
        "accent_color": "#00e5ff",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_token(user_id, email)
    response.set_cookie("access_token", token, httponly=True, secure=False, samesite="lax", max_age=7*24*3600, path="/")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "token": token}

@api.post("/auth/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    token = create_token(user["id"], email)
    response.set_cookie("access_token", token, httponly=True, secure=False, samesite="lax", max_age=7*24*3600, path="/")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

@api.patch("/auth/profile")
async def update_profile(data: dict, user=Depends(get_current_user)):
    allowed = {k: v for k, v in data.items() if k in ["name", "role_title", "company", "accent_color"]}
    if allowed:
        await db.users.update_one({"id": user["id"]}, {"$set": allowed})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated

# ---------- Clients ----------
@api.get("/clients")
async def list_clients(user=Depends(get_current_user)):
    docs = await db.clients.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return docs

@api.post("/clients")
async def create_client(data: ClientIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.clients.insert_one(doc)
    doc.pop("_id", None)
    await db.activity.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "cliente_criado",
        "description": f"Cliente '{doc['name']}' criado",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return doc

@api.put("/clients/{cid}")
async def update_client(cid: str, data: ClientIn, user=Depends(get_current_user)):
    res = await db.clients.update_one({"id": cid, "user_id": user["id"]}, {"$set": data.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    doc = await db.clients.find_one({"id": cid}, {"_id": 0})
    return doc

@api.delete("/clients/{cid}")
async def delete_client(cid: str, user=Depends(get_current_user)):
    doc = await db.clients.find_one({"id": cid, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    await db.clients.delete_one({"id": cid, "user_id": user["id"]})
    await db.activity.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "cliente_deletado",
        "description": f"Cliente '{doc['name']}' removido",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}

# ---------- Transactions / Financial ----------
@api.get("/transactions")
async def list_transactions(user=Depends(get_current_user)):
    docs = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs

@api.post("/transactions")
async def create_transaction(data: TransactionIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["date"] = doc.get("date") or datetime.now(timezone.utc).isoformat()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.transactions.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/transactions/{tid}")
async def delete_transaction(tid: str, user=Depends(get_current_user)):
    await db.transactions.delete_one({"id": tid, "user_id": user["id"]})
    return {"ok": True}

# ---------- Code Hub ----------
@api.get("/snippets")
async def list_snippets(user=Depends(get_current_user)):
    docs = await db.snippets.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs

@api.post("/snippets")
async def create_snippet(data: SnippetIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.snippets.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/snippets/{sid}")
async def delete_snippet(sid: str, user=Depends(get_current_user)):
    await db.snippets.delete_one({"id": sid, "user_id": user["id"]})
    return {"ok": True}

# ---------- KPIs / Overview ----------
@api.get("/overview")
async def overview(user=Depends(get_current_user)):
    clients = await db.clients.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    transactions = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    activity = await db.activity.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(20)

    active_clients = [c for c in clients if c.get("status") == "Ativo"]
    at_risk = [c for c in clients if c.get("status") == "Em Risco"]
    mrr = sum(c.get("mrr", 0) for c in active_clients)
    avg_health = round(sum(c.get("health", 0) for c in clients) / len(clients)) if clients else 0
    revenue = sum(t.get("amount", 0) for t in transactions if t.get("type") == "receita")
    expenses = sum(t.get("amount", 0) for t in transactions if t.get("type") == "despesa")

    # segments breakdown
    segments = {}
    for c in clients:
        s = c.get("segment") or "Outros"
        segments[s] = segments.get(s, 0) + 1

    # health distribution
    dist = {"excelente": 0, "bom": 0, "atencao": 0, "critico": 0}
    for c in clients:
        h = c.get("health", 0)
        if h >= 80: dist["excelente"] += 1
        elif h >= 60: dist["bom"] += 1
        elif h >= 40: dist["atencao"] += 1
        else: dist["critico"] += 1

    return {
        "total_clients": len(clients),
        "active_clients": len(active_clients),
        "at_risk": len(at_risk),
        "mrr": mrr,
        "avg_health": avg_health,
        "revenue": revenue,
        "expenses": expenses,
        "profit": revenue - expenses,
        "segments": segments,
        "health_distribution": dist,
        "activity": activity[:10],
    }

# ---------- Coach IA ----------
UPLOAD_DIR = Path("/tmp/nexus_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@api.post("/coach/upload")
async def coach_upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    file_id = str(uuid.uuid4())
    ext = Path(file.filename or "file").suffix or ""
    save_path = UPLOAD_DIR / f"{file_id}{ext}"
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {
        "file_id": file_id,
        "name": file.filename,
        "path": str(save_path),
        "mime_type": file.content_type or "application/octet-stream",
        "size": save_path.stat().st_size,
    }

@api.post("/coach/chat")
async def coach_chat(data: ChatIn, user=Depends(get_current_user)):
    session_id = data.session_id or f"coach_{user['id']}"

    # Build context from user's data
    clients = await db.clients.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    mrr = sum(c.get("mrr", 0) for c in clients if c.get("status") == "Ativo")
    at_risk = [c["name"] for c in clients if c.get("status") == "Em Risco"]

    system_msg = f"""Você é o Coach NEXUS, um assistente especialista em operações, customer success e crescimento de SaaS, falando português do Brasil.
Seja direto, prático e use bullet points quando útil. Você analisa dados de clientes e dá recomendações estratégicas.

Contexto atual do usuário:
- Total de clientes: {len(clients)}
- MRR: R$ {mrr:.2f}
- Clientes em risco: {', '.join(at_risk) if at_risk else 'nenhum'}

Sempre responda de forma objetiva, baseada em dados, com tom profissional e cyberpunk leve."""

    try:
        # Switch to Gemini when attachments are present (GPT does not support file_contents in this lib)
        has_attachments = bool(data.attachments)
        provider, model = ("gemini", "gemini-2.5-flash") if has_attachments else ("openai", "gpt-5.2")

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_msg,
        ).with_model(provider, model)

        # Replay last 6 messages for context
        history = await db.chat_messages.find(
            {"user_id": user["id"], "session_id": session_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(6)
        history.reverse()

        msg_kwargs = {"text": data.message}
        if data.attachments:
            file_contents = []
            for att in data.attachments:
                p = att.get("path")
                mt = att.get("mime_type") or "application/octet-stream"
                if p and Path(p).exists():
                    file_contents.append(FileContentWithMimeType(mime_type=mt, file_path=p))
            if file_contents:
                msg_kwargs["file_contents"] = file_contents
        msg = UserMessage(**msg_kwargs)
        response_text = await chat.send_message(msg)

        # Persist
        now = datetime.now(timezone.utc).isoformat()
        att_names = [a.get("name") for a in (data.attachments or [])]
        await db.chat_messages.insert_many([
            {"id": str(uuid.uuid4()), "user_id": user["id"], "session_id": session_id,
             "role": "user", "content": data.message, "attachments": att_names, "created_at": now},
            {"id": str(uuid.uuid4()), "user_id": user["id"], "session_id": session_id,
             "role": "assistant", "content": response_text, "created_at": now},
        ])
        return {"response": response_text, "session_id": session_id}
    except Exception as e:
        logger.error(f"Coach chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao consultar Coach IA: {str(e)}")

@api.get("/coach/history")
async def coach_history(user=Depends(get_current_user)):
    session_id = f"coach_{user['id']}"
    msgs = await db.chat_messages.find(
        {"user_id": user["id"], "session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return msgs

# ---------- Site Analyzer ----------
@api.post("/analyze")
async def analyze_site(data: AnalyzeIn, user=Depends(get_current_user)):
    # Mock realistic analysis (real lighthouse would need PSI API key)
    url = data.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL inválida")

    # Generate deterministic-ish scores from URL
    seed = sum(ord(c) for c in url)
    random.seed(seed)
    perf = random.randint(55, 95)
    seo = random.randint(70, 99)
    sec = random.randint(60, 95)
    ux = random.randint(65, 95)

    lcp = random.randint(1200, 3500)
    fid = random.randint(50, 350)
    cls = round(random.uniform(0.05, 0.35), 3)
    ttfb = random.randint(200, 900)

    result = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "url": url,
        "scores": {"performance": perf, "seo": seo, "security": sec, "ux": ux},
        "vitals": {"lcp": lcp, "fid": fid, "cls": cls, "ttfb": ttfb},
        "recommendations": [
            "Otimizar imagens com formatos modernos (WebP/AVIF)" if perf < 80 else "Performance excelente",
            "Adicionar meta tags Open Graph completas" if seo < 90 else "SEO bem configurado",
            "Habilitar HSTS e CSP headers" if sec < 85 else "Segurança adequada",
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.analyses.insert_one(result.copy())
    result.pop("_id", None)
    return result

@api.get("/analyses")
async def list_analyses(user=Depends(get_current_user)):
    docs = await db.analyses.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return docs

@api.get("/")
async def root():
    return {"message": "NEXUS OPS API online"}

# Include router
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.clients.create_index("user_id")
    await db.transactions.create_index("user_id")
    await db.snippets.create_index("user_id")
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@nexus.ops")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin NEXUS",
            "role": "admin",
            "password_hash": hash_password(admin_password),
            "accent_color": "#00e5ff",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin seeded: {admin_email}")

@app.on_event("shutdown")
async def shutdown():
    client.close()
