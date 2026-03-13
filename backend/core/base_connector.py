from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseConnector(ABC):
    def __init__(self, config: Dict[str, Any]):
        self.config = config

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to the data source/destination."""
        raise NotImplementedError()

    @abstractmethod
    async def health_check(self) -> bool:
        """Verify the connection is healthy."""
        raise NotImplementedError()

    @abstractmethod
    async def discover_schema(self) -> List[Dict[str, Any]]:
        """Discover the schema of the source system (tables, columns, types)."""
        raise NotImplementedError()

    @abstractmethod
    async def read_records(self, table_name: str, sync_mode: str, cursor: Optional[Any] = None) -> List[Dict[str, Any]]:
        """Read records from the source system."""
        raise NotImplementedError()

    @abstractmethod
    async def write_records(self, table_name: str, records: List[Dict[str, Any]]) -> bool:
        """Write records to the destination system."""
        raise NotImplementedError()

    @abstractmethod
    async def read_chunked(self, table_name: str, chunk_size: int, partition_config: Optional[Dict[str, Any]] = None):
        """Yields chunks of records from the source system."""
        raise NotImplementedError()

    @abstractmethod
    async def disconnect(self):
        """Close the connection."""
        pass
