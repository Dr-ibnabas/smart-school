const https = require('https');

const apiKey = process.env.GOOGLE_API_KEY;
const projectId = "smartschoolnew-6ebee";
const uid = "qtKCEamLjSRvXOV7WhhmaarMbPm2";

const data = JSON.stringify({
    fields: {
        uid: { stringValue: uid },
        role: { stringValue: "ADMIN" },
        name: { stringValue: "Admin Smart School" },
        email: { stringValue: "admin-001@smartschool.internal" },
        managedClassIds: { arrayValue: { values: [] } },
        createdAt: { integerValue: Date.now().toString() }
    }
});

const options = {
    hostname: 'firestore.googleapis.com',
    port: 443,
    path: `/v1/projects/${projectId}/databases/(default)/documents/users?documentId=${uid}&key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log("🚀 Tentative d'attribution des droits Admin via API REST...");

const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', (d) => { responseData += d; });
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log("✅ SUCCÈS ! Votre compte est maintenant ADMIN.");
            console.log("Vous pouvez maintenant vous connecter sur l'application.");
        } else {
            console.error("❌ ERREUR :", res.statusCode);
            console.error(responseData);
        }
    });
});

req.on('error', (error) => {
    console.error("❌ Erreur réseau :", error);
});

req.write(data);
req.end();
