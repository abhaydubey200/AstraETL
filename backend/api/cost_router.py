from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from services.cost_service import CostService
from api.dependencies import get_cost_service

router = APIRouter(prefix="/cost")

@router.get("/summary")
async def get_cost_summary(service: CostService = Depends(get_cost_service)):
    try:
        return await service.get_total_spend_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/expensive-pipelines")
async def get_expensive_pipelines(limit: int = 5, service: CostService = Depends(get_cost_service)):
    try:
        return await service.get_expensive_pipelines(limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
