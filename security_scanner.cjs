const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (dirPath.includes('node_modules') || dirPath.includes('.git') || dirPath.includes('.next') || dirPath.includes('dist') || dirPath.includes('__pycache__') || dirPath.includes('.venv')) return;
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const patterns = {
    // Looks for explicit hardcoded secrets
    hardcodedSecrets: /(api_key|password|jwt_secret|aws_secret_access_key|auth_token|access_key|secret_key|api_token|client_secret)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{10,}['"]/i,
    // Looks for raw SQL execution with string interpolation or f-strings (prone to SQL injection)
    sqlInjection: /(?:execute|query|fetch|fetchrow|fetchval)\(\s*(?:f["'].*?\{.*?\}|["'].*?%.*?["']\s*%)|["'].*?\+.*?["']/i, 
    // Looks for storing sensitive info in localStorage
    insecureStorage: /localStorage\.setItem\(['"](token|password|session|auth)['"]/i 
};

let issues = [];

walkDir('.', function(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.py') && !filePath.endsWith('.env')) return;
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        Object.entries(patterns).forEach(([key, regex]) => {
            if (content.match(regex)) {
                issues.push(`[SECURITY RISK: ${key}] Found in ${filePath}`);
            }
        });

    } catch(e) {}
});

if (issues.length > 0) {
    console.log(issues.join('\n'));
} else {
    console.log('SUCCESS: No exposed secrets, raw SQLi string interpolations, or insecure localStorage usages found.');
}
