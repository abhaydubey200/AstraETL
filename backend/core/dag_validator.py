from typing import List, Dict, Any, Set
import collections

class DAGValidator:
    """Validator for Directed Acyclic Graphs to prevent circular dependencies."""
    
    @staticmethod
    def validate(tasks: List[str], dependencies: List[Dict[str, str]]) -> bool:
        """
        Validates if the graph is acyclic using Kahn's algorithm or DFS.
        Returns True if valid (no cycles), False otherwise.
        """
        # Build adjacency list and in-degree map
        adj = collections.defaultdict(list)
        in_degree = {task: 0 for task in tasks}
        
        for dep in dependencies:
            parent = dep.get('parent_task_id')
            child = dep.get('child_task_id')
            if parent not in in_degree or child not in in_degree:
                # If a node mentioned in dependency doesn't exist in tasks list, it's invalid
                return False
            adj[parent].append(child)
            in_degree[child] += 1
            
        # Queue for nodes with 0 in-degree
        queue = collections.deque([t for t in tasks if in_degree.get(t, 0) == 0])
        count = 0
        
        while queue:
            u = queue.popleft()
            count += 1
            for v in adj[u]:
                in_degree[v] -= 1
                if in_degree[v] == 0:
                    queue.append(v)
                    
        # If count of visited nodes equals total nodes, no cycle exists
        return count == len(tasks)

    @staticmethod
    def get_execution_order(tasks: List[str], dependencies: List[Dict[str, str]]) -> List[List[str]]:
        """
        Returns tasks grouped by execution level for parallel processing.
        Example: [[TaskA, TaskB], [TaskC], [TaskD]]
        """
        adj = collections.defaultdict(list)
        in_degree = {task: 0 for task in tasks}
        
        for dep in dependencies:
            parent = dep.get('parent_task_id')
            child = dep.get('child_task_id')
            if parent in in_degree and child in in_degree:
                adj[parent].append(child)
                in_degree[child] += 1
            
        levels = []
        current_level = [t for t in tasks if in_degree.get(t, 0) == 0]
        
        while current_level:
            levels.append(current_level)
            next_level = []
            for u in current_level:
                for v in adj[u]:
                    in_degree[v] -= 1
                    if in_degree[v] == 0:
                        next_level.append(v)
            current_level = next_level
            
        return levels
