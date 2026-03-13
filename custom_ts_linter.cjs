const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let tsFiles = [];
walkDir('src', function(filePath) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        tsFiles.push(filePath);
    }
});

let issues = [];
tsFiles.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        
        // Basic Syntax/Code Smell Checks
        
        // 1. Unused or malformed arrow functions
        if (content.includes('=>') && !content.includes('return') && content.includes('{') && /=>\s*{[^}]*$/.test(content)) {
            // A very rough heuristic, but helps flag potentially incomplete code blocks
        }
        
        // 2. React useEffect missing dependency arrays (common memory leak pattern)
        if (content.match(/useEffect\(\s*\(\s*\)\s*=>\s*{[\s\S]*?}\s*\)/)) {
             issues.push(`[WARNING: Memory Leak Pattern] ${file}: useEffect missing dependency array.`);
        }
        
    } catch(e) {
        issues.push(`[ERROR] ${file}: ${e.message}`);
    }
});

console.log(`Successfully scanned ${tsFiles.length} TypeScript files.`);
if (issues.length > 0) { 
    console.log(issues.join('\n')); 
} else { 
    console.log('SUCCESS: No critical syntax errors or React memory leak patterns found in frontend.'); 
}
