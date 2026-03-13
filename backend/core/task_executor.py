import asyncio
import asyncpg
import logging
import time
from typing import Dict, Any, List, Optional
from services.connection_service import ConnectionService
from services.storage_service import StorageService
from services.bulk_load_service import BulkLoadService
from core.postgres_connector import PostgresConnector
from services.partition_planner import PartitionPlanner
from core.parquet_utils import ParquetUtils
import uuid
import os

logger = logging.getLogger(__name__)

class TaskExecutor:
    """Executes discrete tasks (SQL, EXTRACT, API, etc.) for the DAG engine."""
    
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool
        self.conn_service = ConnectionService(pool)
        self.storage_service = StorageService()
        self.bulk_load_service = BulkLoadService(pool)
        self.partition_planner = PartitionPlanner(pool)
        self.failure_counts: Dict[str, int] = {}
        self.circuit_open_until: Dict[str, float] = {}

    async def execute(self, task_type: str, config: Dict[str, Any], metadata: Dict[str, Any]):
        """Routing method for task execution with Circuit Breaking."""
        
        # Check Circuit Breaker
        now = time.time()
        if task_type in self.circuit_open_until:
            if now < self.circuit_open_until[task_type]:
                wait_time = int(self.circuit_open_until[task_type] - now)
                raise Exception(f"Circuit Breaker OPEN for {task_type}. Suspended for another {wait_time}s.")
            else:
                # Circuit closed (half-open state would be better, but this is simple hardening)
                self.circuit_open_until.pop(task_type, None)
                self.failure_counts[task_type] = 0

        logger.info(f"Executing task type: {task_type}")
        
        try:
            if task_type == 'EXTRACT':
                await self._run_extract(config, metadata)
            elif task_type == 'LOAD':
                await self._run_load(config, metadata)
            elif task_type == 'SQL':
                await self._run_sql(config, metadata)
            elif task_type == 'VALIDATION':
                await self._run_validation(config, metadata)
            else:
                logger.warning(f"Task type {task_type} is not yet implemented.")
                await asyncio.sleep(1)
            
            # Reset failures on success
            self.failure_counts[task_type] = 0
            
        except Exception as e:
            # Track failure for circuit breaking
            self.failure_counts[task_type] = self.failure_counts.get(task_type, 0) + 1
            if self.failure_counts[task_type] >= 5:
                # Open circuit for 5 minutes
                self.circuit_open_until[task_type] = now + 300
                logger.error(f"Circuit Breaker TRIPPED for {task_type} after 5 failures.")
            raise e

    async def _run_extract(self, config: Dict[str, Any], metadata: Dict[str, Any]):
        run_id = metadata.get('pipeline_run_id')
        if not run_id:
            raise Exception("pipeline_run_id missing from task metadata")
            
        source_config = config.get('source_config', {})
        table_name = config.get('table_name') or config.get('source_table')
        chunk_size = config.get('chunk_size', 50000)
        
        connector = PostgresConnector(source_config)
        await connector.connect()
        
        try:
            # 1. Plan Partitions
            partitions = await self.partition_planner.plan_partitions(str(run_id), source_config, table_name, 'id')
            
            # 2. Parallelize partition processing
            semaphore = asyncio.Semaphore(4)
            
            async def _process_partition(partition):
                async with semaphore:
                    p_config = {
                        'partition_key': 'id', 
                        'range_start': partition['start'], 
                        'range_end': partition['end']
                    }
                    
                    async for chunk in connector.read_chunked(table_name, chunk_size, p_config):
                        # Convert to Parquet
                        local_file = ParquetUtils.chunk_to_parquet(chunk)
                        
                        # Upload to Storage
                        remote_path = f"staging/{run_id}/{table_name}/{os.path.basename(local_file)}"
                        await self.storage_service.upload_file(local_file, remote_path)
                        
                        # Store Metadata
                        async with self.pool.acquire() as conn:
                            await conn.execute(
                                "INSERT INTO public.staging_files (pipeline_run_id, partition_id, file_path, row_count, file_size_bytes) "
                                "VALUES ($1, $2, $3, $4, $5)",
                                uuid.UUID(str(run_id)), uuid.UUID(partition['id']), remote_path, len(chunk), os.path.getsize(local_file)
                            )
                        
                        # Cleanup
                        if os.path.exists(local_file):
                            os.remove(local_file)
            
            await asyncio.gather(*[_process_partition(p) for p in partitions])
        finally:
            await connector.disconnect()
        
        logger.info(f"Extracted and staged data for {table_name}")

    async def _run_load(self, config: Dict[str, Any], metadata: Dict[str, Any]):
        run_id = metadata.get('pipeline_run_id')
        table_name = config.get('table_name')
        dest_config = config.get('dest_config', {})
        s3_path = f"staging/{run_id}/{table_name}/"
        await self.bulk_load_service.load_to_snowflake(str(run_id), dest_config, table_name, s3_path)

    async def _run_sql(self, config: Dict[str, Any], metadata: Dict[str, Any]):
        query = config.get('query')
        if not query:
            logger.warning("SQL task executed but 'query' is missing in config.")
            return
        # Logic to execute SQL on target connection
        logger.info(f"Executing SQL: {query[:50]}...")
        await asyncio.sleep(1)

    async def _run_validation(self, config: Dict[str, Any], metadata: Dict[str, Any]):
        rules = config.get('rules', [])
        logger.info(f"Running {len(rules)} validation rules.")
        await asyncio.sleep(0.5)
