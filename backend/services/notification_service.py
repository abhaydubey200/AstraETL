import os
import httpx
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        self.pagerduty_key = os.getenv("PAGERDUTY_ROUTING_KEY")

    async def send_slack_alert(self, message: str, severity: str = "info"):
        """Sends a notification to a Slack channel."""
        if not self.slack_webhook_url:
            logger.warning("Slack webhook URL not configured.")
            return

        color = "#36a64f" if severity == "info" else "#f2c744" if severity == "warning" else "#ff0000"
        
        payload = {
            "attachments": [
                {
                    "fallback": message,
                    "color": color,
                    "title": f"AstraFlow Alert: {severity.upper()}",
                    "text": message,
                    "footer": "AstraFlow Ops",
                    "ts": 123456789 # Placeholder
                }
            ]
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.slack_webhook_url, json=payload)
                response.raise_for_status()
            except Exception as e:
                logger.error(f"Failed to send Slack alert: {e}")

    async def send_webhook(self, url: str, payload: Dict[str, Any]):
        """Sends a generic webhook to an external system."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
            except Exception as e:
                logger.error(f"Failed to send external webhook: {e}")
