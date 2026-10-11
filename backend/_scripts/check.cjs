const https = require('https');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const apiKey = process.env.GOOGLE_GENAI_API_KEY;
https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, (res) => {
    let d = '';
    res.on('data', (c) => d += c);
    res.on('end', () => {
        const r = JSON.parse(d);
        if (r.models) r.models.forEach(m => console.log(m.name.split('/')[1]));
        else console.log(JSON.stringify(r));
    });
});
