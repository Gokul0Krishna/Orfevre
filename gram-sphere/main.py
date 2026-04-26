from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from router import skillflow, bazaarpulse, gramlens, verification, users, gigs, merchant, recruitment
from router import skillflow, bazaarpulse, gramlens, verification, users, gramlens_map

app = FastAPI(title="YuvaShakti API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(skillflow.router,    prefix="/api")
app.include_router(bazaarpulse.router,  prefix="/api")
app.include_router(gramlens.router,     prefix="/api")
app.include_router(users.router,        prefix="/api")
app.include_router(verification.router, prefix="/api")
app.include_router(gigs.router,         prefix="/api")
app.include_router(merchant.router,     prefix="/api")
app.include_router(recruitment.router,  prefix="/api")
app.include_router(skillflow.router,     prefix="/api")
app.include_router(bazaarpulse.router,   prefix="/api")
app.include_router(gramlens.router,      prefix="/api")
app.include_router(gramlens_map.router,  prefix="/api")
app.include_router(users.router,         prefix="/api")
app.include_router(verification.router,  prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}