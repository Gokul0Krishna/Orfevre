from fastapi import APIRouter
from sqlalchemy import text
from lib.sql_connect import engine
import os

router = APIRouter(prefix="/gramlens-map", tags=["GramLens Map"])

# Path to the SQL file
SQL_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts", "Gramlens map queries .SQL")

def load_sql_queries():
    """Parses the SQL file and returns a dictionary of queries."""
    with open(SQL_FILE_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    
    queries = {}
    current_query = []
    current_name = None
    
    for line in content.split("\n"):
        if "-- QUERY" in line:
            if current_name and current_query:
                queries[current_name] = "\n".join(current_query).strip().replace("'Mysuru'", ":district")
            current_name = line.split("—")[1].strip().split(" ")[0] # Extracts MERCHANT, GRAPH, etc.
            current_query = []
        elif current_name:
            # Skip comments that are not part of the query logic
            if not line.startswith("--"):
                current_query.append(line)
    
    if current_name and current_query:
        queries[current_name] = "\n".join(current_query).strip().replace("'Mysuru'", ":district")
    
    return queries

QUERIES = load_sql_queries()

@router.get("/merchants")
async def get_merchants(district: str = "Mysuru"):
    """Returns Layer 1: Merchant anchor nodes."""
    query = QUERIES.get("MERCHANT")
    if not query:
        return {"error": "Query not found"}
    
    with engine.connect() as conn:
        result = conn.execute(text(query), {"district": district})
        return [dict(row._mapping) for row in result]

@router.get("/edges")
async def get_edges(district: str = "Mysuru"):
    """Returns Layer 2: Graph edges (employed users -> merchants)."""
    query = QUERIES.get("GRAPH")
    if not query:
        return {"error": "Query not found"}
    
    with engine.connect() as conn:
        result = conn.execute(text(query), {"district": district})
        return [dict(row._mapping) for row in result]

@router.get("/unemployed")
async def get_unemployed(district: str = "Mysuru"):
    """Returns Layer 3: Unemployed users (isolated nodes)."""
    query = QUERIES.get("UNEMPLOYED")
    if not query:
        return {"error": "Query not found"}
    
    with engine.connect() as conn:
        result = conn.execute(text(query), {"district": district})
        return [dict(row._mapping) for row in result]

@router.get("/summary")
async def get_summary(district: str = "Mysuru"):
    """Returns cluster summary stats."""
    query = QUERIES.get("CLUSTER")
    if not query:
        return {"error": "Query not found"}
    
    with engine.connect() as conn:
        result = conn.execute(text(query), {"district": district})
        return dict(result.fetchone()._mapping)

@router.get("/skills")
async def get_skills(district: str = "Mysuru"):
    """Returns skill distribution breakdown."""
    query = QUERIES.get("SKILL")
    if not query:
        return {"error": "Query not found"}
    
    with engine.connect() as conn:
        result = conn.execute(text(query), {"district": district})
        return [dict(row._mapping) for row in result]
