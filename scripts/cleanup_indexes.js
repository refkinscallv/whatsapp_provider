'use strict'

const mysql = require('mysql2/promise');

async function cleanup() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'whatsapp'
    });

    try {
        const [rows] = await connection.execute('SHOW INDEX FROM message_history');
        const indexesToDrop = rows
            .filter(row => row.Key_name.startsWith('token_') || row.Key_name === 'idx_msg_history_token')
            .map(row => row.Key_name);

        // Remove duplicates from the list (SHOW INDEX returns one row per column in composite index)
        const uniqueIndexesToDrop = [...new Set(indexesToDrop)];

        console.log(`Found ${uniqueIndexesToDrop.length} redundant indexes to drop.`);

        for (const indexName of uniqueIndexesToDrop) {
            console.log(`Dropping index: ${indexName}`);
            await connection.execute(`ALTER TABLE message_history DROP INDEX ${indexName}`);
        }

        console.log('Cleanup complete.');
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await connection.end();
    }
}

cleanup();
