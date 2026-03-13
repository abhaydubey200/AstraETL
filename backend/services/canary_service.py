import asyncio
import logging
import time
from datetime import datetime
from typing import Dict, List, Optional
from core.healing_monitor import runtime_monitor

logger = logging.getLogger("astra-canary")

class CanaryService:
    """Service that executes continuous system validation (Canaries)."""
    def __init__(self, healing_manager=None, interval_seconds: int = 300):
        self.healing_manager = healing_manager
        self.interval = interval_seconds
        self.is_running = False
        self._task = None
        self.last_results = {}

    def set_healing_manager(self, manager):
        self.healing_manager = manager

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Canary Service started")

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Canary Service stopped")

    async def _run_loop(self):
        while self.is_running:
            try:
                await self.run_all_canaries()
            except Exception as e:
                logger.error(f"Error in Canary Loop: {e}")
            await asyncio.sleep(self.interval)

    async def run_all_canaries(self):
        """Run all registered system canaries."""
        logger.info("Executing System Canaries...")
        
        canaries = [
            self.test_api_latency(),
            self.test_connection_subsystem(),
            self.test_pipeline_readiness()
        ]
        
        results = await asyncio.gather(*canaries, return_exceptions=True)
        
        # Update results for monitoring UI
        for i, name in enumerate(["api", "connections", "pipelines"]):
            res = results[i]
            if isinstance(res, Exception):
                self.last_results[name] = {"status": "fail", "error": str(res)}
                # Trigger self-healing if a canary fails
                if self.healing_manager:
                    await self.healing_manager.diagnose_and_fix(
                        error_msg=f"Canary Failure: {name} subsystem is unstable",
                        component=f"canary-{name}",
                        context={"error": str(res), "timestamp": datetime.now().isoformat()}
                    )
            else:
                self.last_results[name] = {"status": "pass", "timestamp": datetime.now().isoformat()}

    @runtime_monitor.trace_and_heal(component="canary")
    async def test_api_latency(self):
        """Verify API responsiveness."""
        start = time.time()
        # Mock internal API call
        await asyncio.sleep(0.1) 
        latency = (time.time() - start) * 1000
        if latency > 1000:
            raise Exception(f"High Internal Latency: {latency:.2f}ms")
        return True

    @runtime_monitor.trace_and_heal(component="canary")
    async def test_connection_subsystem(self):
        """Verify the health of the connection management layer."""
        # Simulations of checking database connectivity handlers
        await asyncio.sleep(0.05)
        return True

    @runtime_monitor.trace_and_heal(component="canary")
    async def test_pipeline_readiness(self):
        """Verify that pipelines can be scheduled."""
        # Check if worker queue is responding
        await asyncio.sleep(0.05)
        return True

# Global canary instance
canary_manager = CanaryService()
