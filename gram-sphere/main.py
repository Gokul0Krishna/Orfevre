from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import skillflow, creditweb, bazaarpulse, gramlens

app = FastAPI(title="GramSphere API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # tighten this after hackathon
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(skillflow.router,   prefix="/api")
app.include_router(creditweb.router,   prefix="/api")
app.include_router(bazaarpulse.router, prefix="/api")
app.include_router(gramlens.router,    prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}