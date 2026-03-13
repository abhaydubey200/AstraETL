from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from services.metadata_service import MetadataService
from api.dependencies import get_metadata_service

router = APIRouter(prefix="/metadata", tags=["metadata"])

@router.get("/{connection_id}")
async def get_metadata(
    connection_id: str,
    service: MetadataService = Depends(get_metadata_service)
):
    return await service.get_connection_metadata(connection_id)

@router.get("/search")
async def search_metadata(
    q: str,
    service: MetadataService = Depends(get_metadata_service)
):
    return await service.search_metadata(q)

@router.put("/tables/{table_id}/metadata")
async def update_table_metadata(
    table_id: str, 
    payload: Dict[str, Any],
    service: MetadataService = Depends(get_metadata_service)
):
    return await service.update_table_metadata(
        table_id, 
        payload.get('tags', []), 
        payload.get('owner'), 
        payload.get('description')
    )

@router.post("/tables/{table_id}/detect-pii")
async def detect_pii(
    table_id: str,
    service: MetadataService = Depends(get_metadata_service)
):
    return await service.detect_pii(table_id)
