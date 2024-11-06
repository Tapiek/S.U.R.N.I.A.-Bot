// web-dashboard/server/controllers/characterProcessController.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Client } = require('discord.js');
const config = require('../config.json');
const rosterDB = require('../utils/database_roster');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG and PNG allowed.'));
        }
    }
});

async function assignRoles(member, department, rank) {
    try {
        // Get role IDs from config
        const departmentRoleId = config.departments[department.toLowerCase()];
        const rankRoleId = config.ranks[rank.toLowerCase()];
        const divisionRoleId = getDivisionByDepartment(department);
        const approvedRoleId = config.roles.approvedCharacter;

        // Prepare roles to assign
        const rolesToAssign = [
            departmentRoleId,
            rankRoleId,
            divisionRoleId,
            approvedRoleId
        ].filter(Boolean);

        // Assign roles
        await member.roles.add(rolesToAssign);
        return true;
    } catch (error) {
        console.error('Error assigning roles:', error);
        throw error;
    }
}

async function updateRoster(characterData, userId) {
    try {
        await rosterDB.addRosterEntry({
            characterName: characterData.Name,
            userId: userId,
            department: characterData.Department,
            rank: characterData.rank,
            position: characterData.Position,
            age: characterData.Age,
            species: characterData.Species
        });
        return true;
    } catch (error) {
        console.error('Error updating roster:', error);
        throw error;
    }
}

router.post('/submit', upload.single('image'), async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const characterData = JSON.parse(req.body.characterData);
        const userId = req.user.id;
        const guildId = config.guildId;

        // Get Discord client from app instance
        const client = req.app.get('discordClient');
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);

        // Process character image if provided
        let imagePath = null;
        if (req.file) {
            imagePath = req.file.path;
        }

        // Generate and save character document
        await generateCharacterDocument(characterData, imagePath);

        // Assign roles
        await assignRoles(member, characterData.Department, characterData.rank);

        // Update roster
        await updateRoster(characterData, userId);

        // Clean up uploaded image
        if (imagePath) {
            fs.unlinkSync(imagePath);
        }

        res.json({
            success: true,
            message: 'Character created successfully'
        });

    } catch (error) {
        console.error('Error processing character:', error);
        res.status(500).json({
            error: 'Failed to process character',
            details: error.message
        });
    }
});

function getDivisionByDepartment(department) {
    const divisions = {
        'Command': ['Command', 'Tactical', 'Intelligence', 'Diplomatic Corps'],
        'Science': ['Science', 'Medical', 'Research & Development'],
        'Operations': ['Operations', 'Engineering', 'Security']
    };

    for (const [division, departments] of Object.entries(divisions)) {
        if (departments.includes(department)) {
            return config.divisions[division.toLowerCase()];
        }
    }
    return null;
}

module.exports = router;