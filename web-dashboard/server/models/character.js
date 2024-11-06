// web-dashboard/server/models/character.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config.json');

// Path to the SQLite database file
const dbPath = path.resolve(__dirname, config.databases.characters);

// Initialize the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening characters database:', err.message);
  } else {
    console.log('Connected to the characters database.');
    // Create the characters table if it doesn't exist
    db.run(
      `
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
    `,
      (err) => {
        if (err) {
          console.error('Error creating characters table:', err.message);
        } else {
          console.log('Characters table is ready.');
        }
      }
    );
  }
});

// Character model methods
module.exports = {
  // Adds a new character to the database
  addCharacter: (userId, characterName, characterAge, characterSpecies, characterPosition, characterSummary) => {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO characters (userId, characterName, characterAge, characterSpecies, characterPosition, characterSummary)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.run(
        sql,
        [userId, characterName, characterAge, characterSpecies, characterPosition, characterSummary],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              userId,
              characterName,
              characterAge,
              characterSpecies,
              characterPosition,
              characterSummary,
            });
          }
        }
      );
    });
  },

  // Retrieves all characters from the database
  getAllCharacters: () => {
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
  },

  // Retrieves a character by id
  getCharacterById: (id) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, userId, characterName, characterAge, characterSpecies, characterPosition, characterSummary, registeredAt
        FROM characters
        WHERE id = ?
      `;
      db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // Updates a character by id
  updateCharacter: (id, userId, characterName, characterAge, characterSpecies, characterPosition, characterSummary) => {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE characters
        SET userId = ?, characterName = ?, characterAge = ?, characterSpecies = ?, characterPosition = ?, characterSummary = ?
        WHERE id = ?
      `;
      db.run(
        sql,
        [userId, characterName, characterAge, characterSpecies, characterPosition, characterSummary, id],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id,
              userId,
              characterName,
              characterAge,
              characterSpecies,
              characterPosition,
              characterSummary,
            });
          }
        }
      );
    });
  },

  // Deletes a character by id
  deleteCharacter: (id) => {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM characters
        WHERE id = ?
      `;
      db.run(sql, [id], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  },
};

// Close database connection when the application exits
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing characters database:', err.message);
    } else {
      console.log('Characters database connection closed.');
    }
    process.exit(0);
  });
});
