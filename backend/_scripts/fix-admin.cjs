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

console.log("🚀 Tentative d'attribution des droits Admin (Version CJS)...");

const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', (d) => { responseData += d; });
    res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
            console.log("\n✅ SUCCÈS ! Votre compte (UID: " + uid + ") est maintenant ADMIN dans Firestore.");
            console.log("Vous pouvez maintenant vous connecter à l'application.");
        } else {
            console.error("\n❌ ERREUR : Status " + res.statusCode);
            console.error(responseData);
        }
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error("\n❌ Erreur réseau :", error);
    process.exit(1);
});

req.write(data);
req.end();
