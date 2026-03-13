import os

files_to_fix = [
    'backend/api/pipeline_router.py',
    'backend/api/connection_router.py',
    'backend/api/monitoring_router.py',
    'backend/api/metadata_router.py'
]

routes_changed = 0

for file_path in files_to_fix:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # Standardize prefixes by removing trailing slashes
    content = content.replace("prefix='/pipelines/'", "prefix='/pipelines'")
    content = content.replace('prefix="/pipelines/"', 'prefix="/pipelines"')
    
    content = content.replace("prefix='/connections/'", "prefix='/connections'")
    content = content.replace('prefix="/connections/"', 'prefix="/connections"')

    content = content.replace("prefix='/monitoring/'", "prefix='/monitoring'")
    content = content.replace('prefix="/monitoring/"', 'prefix="/monitoring"')

    content = content.replace("prefix='/metadata/'", "prefix='/metadata'")
    content = content.replace('prefix="/metadata/"', 'prefix="/metadata"')
    
    # Standardize root endpoints to clear empty trailing routes
    content = content.replace("@router.get('/')", "@router.get('')")
    content = content.replace('@router.get("/")', '@router.get("")')
    content = content.replace("@router.post('/')", "@router.post('')")
    content = content.replace('@router.post("/")', '@router.post("")')

    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        routes_changed += 1

print(f"Successfully standardized {routes_changed} router prefixes.")
