// utils/database.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the SQLite database file
const dbPath = path.join(__dirname, '..', 'data', 'characters.db');

// Initialize the database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create the characters table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId TEXT NOT NULL,
                characterName TEXT NOT NULL,
                characterAge TEXT NOT NULL,
                characterSpecies TEXT NOT NULL,
                characterPosition TEXT NOT NULL,
                characterSummary TEXT NOT NULL,
                registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating characters table:', err.message);
            } else {
                console.log('Characters table is ready.');
            }
        });
    }
});

/**
 * Adds a new character to the database.
 * @param {string} userId - Discord User ID of the character owner.
 * @param {string} name - Character Name.
 * @param {string} age - Character Age.
 * @param {string} species - Character Species.
 * @param {string} position - Character Position.
 * @param {string} summary - Character Summary.
 * @returns {Promise<number>} - Returns the ID of the newly created character.
 */
function addCharacter(userId, name, age, species, position, summary) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO characters (userId, characterName, characterAge, characterSpecies, characterPosition, characterSummary)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        db.run(sql, [userId, name, age, species, position, summary], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

/**
 * Retrieves all characters from the database, ordered by registration time.
 * @returns {Promise<Array>} - Returns an array of character objects.
 */
function getAllCharacters() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id, userId, characterName, characterAge, characterSpecies, characterPosition, characterSummary, registeredAt
            FROM characters
            ORDER BY registeredAt ASC
        `;
        db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * Retrieves a character by name or ID.
 * @param {string|number} identifier - Character Name or ID.
 * @returns {Promise<Object>} - Returns the character object if found.
 */
function getCharacterByIdentifier(identifier) {
    return new Promise((resolve, reject) => {
        let sql;
        let params;
        if (typeof identifier === 'number' || /^\d+$/.test(identifier)) {
            sql = `
                SELECT id, userId, characterName, characterAge, characterSpecies, characterPosition, characterSummary, registeredAt
                FROM characters
                WHERE id = ?
            `;
            params = [identifier];
        } else {
            sql = `
                SELECT id, userId, characterName, characterAge, characterSpecies, characterPosition, characterSummary, registeredAt
                FROM characters
                WHERE LOWER(characterName) = LOWER(?)
            `;
            params = [identifier];
        }

        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

module.exports = {
    addCharacter,
    getAllCharacters,
    getCharacterByIdentifier
};
