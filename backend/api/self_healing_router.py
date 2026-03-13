from fastapi import APIRouter, Request, HTTPException
from typing import List, Dict, Any
from services.self_healing_service import self_healing_manager

router = APIRouter(prefix="/self-healing", tags=["Self-Healing"])

@router.get("/logs", response_model=List[Dict[str, Any]])
async def get_healing_logs():
    """Returns the list of recent self-healing actions."""
    return self_healing_manager.get_logs()

@router.post("/diagnose")
async def manual_diagnose(request: Request):
    """Manually trigger a diagnostic check from a provided error message."""
    data = await request.json()
    error_msg = data.get("error_msg")
    context = data.get("context", "manual")
    
    if not error_msg:
        raise HTTPException(status_code=400, detail="error_msg is required")

    component = "manual"
    if isinstance(context, dict):
        component = context.get("component", "manual")
    elif isinstance(context, str):
        component = context

    fixed = await self_healing_manager.diagnose_and_fix(error_msg, component=component, context=context)
    return {"status": "success", "fixed": fixed}

@router.get("/status")
async def get_healing_status():
    """Returns the current status of the self-healing engine."""
    return self_healing_manager.get_status()
