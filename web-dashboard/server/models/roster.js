// web-dashboard/server/models/roster.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config.json'); // Ensure this file exists and has the correct path

// Path to your roster database
const dbPath = path.resolve(__dirname, config.databases.roster);

// Open the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening roster database:', err.message);
    } else {
        console.log('Connected to the roster database.');
    }
});

// Roster model methods
module.exports = {
    /**
     * Retrieve all roster entries
     * @returns {Promise<Array>}
     */
    getAllRosterEntries: () => {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM roster ORDER BY department, rank, characterName';
            db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    /**
     * Retrieve a specific roster entry by ID
     * @param {number} id
     * @returns {Promise<Object>}
     */
    getRosterEntryById: (id) => {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM roster WHERE id = ?';
            db.get(query, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    /**
     * Add a new roster entry
     * @param {Object} entry
     * @returns {Promise<Object>}
     */
    addRosterEntry: (entry) => {
        const { characterName, userId, department, rank, position, age, species } = entry;
        return new Promise((resolve, reject) => {
            const query = `INSERT INTO roster (characterName, userId, department, rank, position, age, species)
                           VALUES (?, ?, ?, ?, ?, ?, ?)`;
            db.run(query, [characterName, userId, department, rank, position, age, species], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...entry });
                }
            });
        });
    },

    /**
     * Update a roster entry by ID
     * @param {number} id
     * @param {Object} entry
     * @returns {Promise<Object>}
     */
    updateRosterEntry: (id, entry) => {
        const { characterName, userId, department, rank, position, age, species } = entry;
        return new Promise((resolve, reject) => {
            const query = `UPDATE roster
                           SET characterName = ?, userId = ?, department = ?, rank = ?, position = ?, age = ?, species = ?
                           WHERE id = ?`;
            db.run(query, [characterName, userId, department, rank, position, age, species, id], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, ...entry });
                }
            });
        });
    },

    /**
     * Delete a roster entry by ID
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    deleteRosterEntry: (id) => {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM roster WHERE id = ?';
            db.run(query, [id], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        });
    }
};
