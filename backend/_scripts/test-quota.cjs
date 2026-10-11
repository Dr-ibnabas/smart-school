const https = require('https');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const apiKey = process.env.GOOGLE_GENAI_API_KEY;

const models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.0-pro'
];

async function testModel(modelName) {
    return new Promise((resolve) => {
        const body = JSON.stringify({ contents: [{ parts: [{ text: "Bonjour" }] }] });
        const req = https.request(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode === 200) {
                        console.log(`✅ [${modelName}] Fonctionne ! (Status 200)`);
                        resolve(true);
                    } else if (res.statusCode === 429) {
                        console.log(`🚫 [${modelName}] Limite de quota (429) - Limit: ${json.error?.message?.includes('limit: 0') ? '0 (Bloqué)' : 'Dépassé'}`);
                        resolve(false);
                    } else if (res.statusCode === 404) {
                        console.log(`❌ [${modelName}] Modèle introuvable (404)`);
                        resolve(false);
                    } else {
                        console.log(`⚠️ [${modelName}] Erreur inconnue (${res.statusCode})`);
                        resolve(false);
                    }
                } catch(e) {
                    console.log(`⚠️ [${modelName}] Erreur de parsing`);
                    resolve(false);
                }
            });
        });
        req.on('error', () => { console.log(`⚠️ [${modelName}] Erreur réseau`); resolve(false); });
        req.write(body);
        req.end();
    });
}

async function runAll() {
    console.log("🔍 Démarrage du test de quota...\n");
    for (const m of models) {
        await testModel(m);
    }
    console.log("\n✅ Test terminé.");
}

runAll();
