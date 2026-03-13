import ast
import os
import glob

def analyze_python_files(directory):
    files = glob.glob(os.path.join(directory, "**/*.py"), recursive=True)
    issues = []
    
    for filepath in files:
        if "node_modules" in filepath or "venv" in filepath or "__pycache__" in filepath:
            continue
            
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
                
            tree = ast.parse(content)
            
            # Simple Dead Code Analysis (Functions defined but never called/exported)
            # This is very basic, a real AST walker would be more complex
            defined_funcs = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
            called_funcs = [node.func.id for node in ast.walk(tree) if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)]
            
            # Note: In a web framework, many functions are routers/endpoints, so they are "dead" to AST but alive to FastAPI.
            # We skip generic dead-code for FastAPI routes but can check for syntax.
            
        except SyntaxError as e:
            issues.append(f"[SYNTAX ERROR] {filepath}: {e}")
        except Exception as e:
            issues.append(f"[ERROR] {filepath}: {e}")
            
    return issues

if __name__ == "__main__":
    issues = analyze_python_files("backend")
    if not issues:
        print("SUCCESS: 0 Syntax errors found across all Python files.")
    else:
        for issue in issues:
            print(issue)
