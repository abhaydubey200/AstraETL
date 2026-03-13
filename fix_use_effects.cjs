const fs = require('fs');

const filesToFix = [
    'src/components/AuthProvider.tsx',
    'src/components/connections/ConnectionExplorer.tsx',
    'src/components/connections/ConnectionWizard.tsx',
    'src/components/DataLineage.tsx',
    'src/components/NotificationBell.tsx',
    'src/components/pipeline-builder/ResourcePicker.tsx',
    'src/components/pipeline-builder/SchemaSelector.tsx',
    'src/components/pipeline-builder/useCanvasState.ts',
    'src/components/ui/sidebar.tsx',
    'src/hooks/use-toast.ts',
    'src/pages/AuthPage.tsx',
    'src/pages/ResetPassword.tsx'
];

let fixedCount = 0;

filesToFix.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        // Match useEffect with a missing dependency array at the end
        // e.g. useEffect(() => { ... })  -> useEffect(() => { ... }, [])
        
        let originalContent = content;
        
        // A robust but safe regex: finds `useEffect(` followed by arguments, ending in `})` without `, [])`
        // We look for closing parenthesis without a preceding array
        content = content.replace(/useEffect\s*\([\s\S]*?}\s*\)(?!\s*;?(?:\s*\/\/.*)*\s*$)/gm, (match) => {
             if (match.endsWith('})')) {
                 return match.slice(0, -1) + '}, [])';
             }
             return match;
        });
        
        // Simpler fallback for the identified pattern
        content = content.replace(/}\s*\)(?:\s*;)?$/gm, (match, offset, string) => {
            // Only apply if we are inside a useEffect block (naive check)
            let before = string.substring(0, offset);
            let latestUseEffect = before.lastIndexOf('useEffect');
            if (latestUseEffect > -1) {
                let context = before.substring(latestUseEffect);
                if (!context.includes(', [')) {
                    return match.includes(';') ? '}, []);' : '}, [])';
                }
            }
            return match;
        });

        if (content !== originalContent) {
           fs.writeFileSync(file, content, 'utf8');
           fixedCount++;
        }
    } catch(e) {
        console.error(`Error fixing ${file}:`, e.message);
    }
});

console.log(`Successfully fixed useEffect dependency arrays in ${fixedCount} files.`);
