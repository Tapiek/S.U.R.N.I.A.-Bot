// utils/database_audit.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config.json');

const db = new sqlite3.Database(path.join(__dirname, '..', 'data', 'audit.db'));


// Create the audit log table
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS command_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT NOT NULL,
            username TEXT NOT NULL,
            commandName TEXT NOT NULL,
            options TEXT,
            status TEXT NOT NULL,
            error TEXT,
            executedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            guildId TEXT,
            channelId TEXT
        )
    `);
});

const auditLogger = {
    logCommand: async (interaction, status = 'success', error = null) => {
        return new Promise((resolve, reject) => {
            const options = interaction.options?._hoistedOptions?.map(opt => ({
                name: opt.name,
                value: opt.value,
                type: opt.type
            }));

            const sql = `
                INSERT INTO command_audit (
                    userId, username, commandName, options, status, 
                    error, guildId, channelId
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.run(sql, [
                interaction.user.id,
                interaction.user.username,
                interaction.commandName,
                JSON.stringify(options || []),
                status,
                error,
                interaction.guildId,
                interaction.channelId
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    },

    getAuditLogs: async (filters = {}) => {
        let sql = `SELECT * FROM command_audit`;
        const params = [];
        const conditions = [];

        if (filters.userId) {
            conditions.push('userId = ?');
            params.push(filters.userId);
        }

        if (filters.commandName) {
            conditions.push('commandName = ?');
            params.push(filters.commandName);
        }

        if (filters.status) {
            conditions.push('status = ?');
            params.push(filters.status);
        }

        if (filters.startDate) {
            conditions.push('executedAt >= ?');
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            conditions.push('executedAt <= ?');
            params.push(filters.endDate);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }

        sql += ` ORDER BY executedAt DESC LIMIT ? OFFSET ?`;
        params.push(filters.limit || 50, filters.offset || 0);

        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
};

module.exports = auditLogger;