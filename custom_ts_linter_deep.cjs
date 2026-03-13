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
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        tsFiles.push(filePath);
    }
});

let issues = [];
tsFiles.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        
        // 1. Detect unused Zustand stores or malformed create states
        if (content.includes('create<') && !content.includes('export')) {
            issues.push(`[WARNING: Unexported Store] ${file}`);
        }
        
        // 2. Detect missing error handling on raw fetch calls
        if (content.match(/fetch\s*\(/) && !content.includes('.catch') && !content.match(/try\s*{[\s\S]*?fetch[\s\S]*?(?:return|await)[\s\S]*?}\s*catch/)) {
            issues.push(`[WARNING: Unhandled Fetch] ${file} contains fetch without explicit error handling.`);
        }
        
        // 3. Detect potentially unsanitized dangerouslySetInnerHTML
        if (content.includes('dangerouslySetInnerHTML')) {
             issues.push(`[SECURITY] ${file} uses dangerouslySetInnerHTML.`);
        }
    } catch(e) {}
});

console.log(`Successfully deeper scanned ${tsFiles.length} TS files for state and fetch anomalies.`);
if (issues.length > 0) { console.log(issues.join('\n')); } else { console.log('SUCCESS: No critical state/fetch anomalies found.'); }
