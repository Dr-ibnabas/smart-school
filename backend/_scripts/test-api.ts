import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function testEndpoints() {
    console.log('--- Diagnostic des points de terminaison ---');
    
    const endpoints = [
        '/students',
        '/classes',
        '/subjects',
        '/settings',
        '/grades',
        '/users'
    ];

    const token = (process.env.TEST_JWT || '');

    for (const ep of endpoints) {
        try {
            console.log(`Checking ${ep}...`);
            const res = await axios.get(`${API_URL}${ep}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log(`  ${ep}: SUCCESS (${res.status})`);
        } catch (err: any) {
            console.log(`  ${ep}: ${err.response?.status || 'ERROR'} - ${JSON.stringify(err.response?.data || err.message)}`);
        }
    }
}

testEndpoints();
