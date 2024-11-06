// utils/database_roster.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config.json');

// Path to the SQLite roster database file
const dbPath = path.join(__dirname, '..', config.databases.roster);

// Initialize the roster database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening SQLite roster database:', err.message);
    } else {
        console.log('Connected to the SQLite roster database.');
        // Create the roster table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS roster (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                characterName TEXT NOT NULL,
                department TEXT NOT NULL,
                userId TEXT NOT NULL,
                rank TEXT NOT NULL,
                position TEXT NOT NULL,
                age TEXT NOT NULL,
                species TEXT NOT NULL,
                registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating roster table:', err.message);
            } else {
                console.log('Roster table is ready.');
            }
        });
    }
});

/**
 * Adds a new entry to the roster.
 */
function addRosterEntry(characterName, department, userId, rank, position, age, species) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO roster (characterName, department, userId, rank, position, age, species)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(sql, [characterName, department, userId, rank, position, age, species], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

/**
 * Retrieves roster entries, optionally filtered by division.
 */
function getRosterEntries(division = null) {
    return new Promise((resolve, reject) => {
        let sql = `
            SELECT r.*, 
                   datetime(r.registeredAt, 'localtime') as localRegisteredAt
            FROM roster r
        `;
        
        const params = [];
        
        if (division) {
            sql += ` WHERE LOWER(r.department) IN (
                SELECT LOWER(d.name)
                FROM json_each(?) AS d
                WHERE json_extract(d.value, '$.division') = LOWER(?)
            )`;
            
            // Get departments for the specified division
            const departmentsInDivision = DEPARTMENTS.filter(dept => 
                getDivisionByDepartment(dept.name).toLowerCase() === division.toLowerCase()
            ).map(dept => dept.name);
            
            params.push(JSON.stringify(departmentsInDivision), division);
        }
        
        sql += ` ORDER BY r.department ASC, r.rank ASC, r.characterName ASC`;
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Close database connection when the application exits
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing roster database:', err.message);
        } else {
            console.log('Roster database connection closed.');
        }
        process.exit(0);
    });
});

module.exports = {
    addRosterEntry,
    getRosterEntries
};