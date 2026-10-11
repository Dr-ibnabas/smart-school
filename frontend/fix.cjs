const fs = require('fs');
const path = require('path');
function fixDir(d) {
    fs.readdirSync(d).forEach(f => {
        let p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) {
            fixDir(p);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            let c = fs.readFileSync(p, 'utf8');
            let orig = c;
            c = c.replace(/‘/g, "'");
            c = c.replace(/’(?=[,)} \n;])/g, "'");
            
            if (c !== orig) {
                fs.writeFileSync(p, c);
                console.log('Fixed', p);
            }
        }
    });
}
fixDir('./src');
