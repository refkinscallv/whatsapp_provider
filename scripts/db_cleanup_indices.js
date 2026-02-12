'use strict';

/**
 * Emergency Database Index Cleanup Script
 * Use this if you continue to encounter "Too many keys specified" errors.
 * This script identifies redundant indices (especially those created by alter:true) and drops them.
 */

require('module-alias/register');
const Database = require('@core/database.core');
const Logger = require('@core/logger.core');

async function cleanupIndices() {
    try {
        console.log('--- Starting Index Cleanup ---');
        await Database.init(); // Initialize to get sequelize instance

        const sequelize = Database.getInstance();
        const [results] = await sequelize.query(`
            SELECT 
                TABLE_NAME, 
                INDEX_NAME, 
                GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            GROUP BY TABLE_NAME, INDEX_NAME
        `);

        // Tables to check specifically
        const targetTables = ['auto_reply_rules', 'message_history'];

        for (const table of targetTables) {
            console.log(`\nChecking table: ${table}`);
            const tableIndices = results.filter(r => r.TABLE_NAME === table);

            // Find duplicates (same column sets)
            const columnSets = {};
            const toDrop = [];

            for (const idx of tableIndices) {
                if (idx.INDEX_NAME === 'PRIMARY') continue;

                if (columnSets[idx.COLUMNS]) {
                    console.log(`  [REDUNDANT] ${idx.INDEX_NAME} (Columns: ${idx.COLUMNS}) matches ${columnSets[idx.COLUMNS]}`);
                    toDrop.push(idx.INDEX_NAME);
                } else {
                    columnSets[idx.COLUMNS] = idx.INDEX_NAME;
                }
            }

            if (toDrop.length > 0) {
                console.log(`  Dropping ${toDrop.length} redundant indices...`);
                for (const idxName of toDrop) {
                    try {
                        await sequelize.query(`ALTER TABLE ${table} DROP INDEX \`${idxName}\``);
                        console.log(`  - Dropped index: ${idxName}`);
                    } catch (e) {
                        console.error(`  - Failed to drop ${idxName}: ${e.message}`);
                    }
                }
            } else {
                console.log('  No redundant indices found.');
            }
        }

        console.log('\n--- Cleanup Finished ---');
        process.exit(0);
    } catch (err) {
        console.error('Cleanup failed:', err);
        process.exit(1);
    }
}

cleanupIndices();
