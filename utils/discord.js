// utils/discord.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dataDir, 'discord.db');

// Initialize the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening Discord database:', err.message);
  } else {
    console.log('Connected to the Discord database.');
    // Create the discord-related tables
    db.serialize(() => {
      // Members table
      db.run(`
        CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          discriminator TEXT NOT NULL,
          nickname TEXT,
          avatarUrl TEXT,
          joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Roles table
      db.run(`
        CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          color INTEGER NOT NULL DEFAULT 0,
          position INTEGER NOT NULL DEFAULT 0,
          permissions TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Member roles junction table
      db.run(`
        CREATE TABLE IF NOT EXISTS member_roles (
          memberId TEXT NOT NULL,
          roleId TEXT NOT NULL,
          assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (memberId, roleId),
          FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE,
          FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE
        )
      `);

      // Moderation logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS moderation_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          moderatorId TEXT NOT NULL,
          action TEXT NOT NULL,
          duration INTEGER,
          reason TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES members(id),
          FOREIGN KEY (moderatorId) REFERENCES members(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating tables:', err.message);
        } else {
          console.log('Discord database tables are ready.');
        }
      });
    });
  }
});

// Database methods
const methods = {
  // Member methods
  getAllMembers: () => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT m.*,
          json_group_array(mr.roleId) as roles
        FROM members m
        LEFT JOIN member_roles mr ON m.id = mr.memberId
        GROUP BY m.id
        ORDER BY m.username
      `;
      db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parse the JSON array of roles
          rows.forEach(row => {
            row.roles = JSON.parse(row.roles).filter(role => role !== null);
          });
          resolve(rows);
        }
      });
    });
  },

  updateMemberRoles: (memberId, roles) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        const deleteStmt = db.prepare('DELETE FROM member_roles WHERE memberId = ?');
        const insertStmt = db.prepare('INSERT INTO member_roles (memberId, roleId) VALUES (?, ?)');

        db.run('BEGIN TRANSACTION');

        try {
          deleteStmt.run(memberId);
          roles.forEach(roleId => {
            insertStmt.run(memberId, roleId);
          });

          db.run('COMMIT', (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(true);
            }
          });
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }

        deleteStmt.finalize();
        insertStmt.finalize();
      });
    });
  },

  // Role methods
  getAllRoles: () => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, name, color, position
        FROM roles
        ORDER BY position DESC
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

  // Moderation methods
  logModeration: (userId, type, duration = null, moderatorId) => {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO moderation_logs (userId, action, duration, moderatorId)
        VALUES (?, ?, ?, ?)
      `;
      db.run(sql, [userId, type, duration, moderatorId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            userId,
            type,
            duration,
            moderatorId,
            timestamp: new Date()
          });
        }
      });
    });
  }
};

module.exports = methods;