// web-dashboard/server/controllers/rosterController.js

const express = require('express');
const router = express.Router();
const rosterModel = require('../models/roster');

/**
 * GET /api/roster
 * Retrieve all roster entries
 */
router.get('/', async (req, res) => {
    try {
        const entries = await rosterModel.getAllRosterEntries();
        res.status(200).json(entries);
    } catch (error) {
        console.error('Error fetching roster entries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/roster/:id
 * Retrieve a specific roster entry by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const entry = await rosterModel.getRosterEntryById(id);
        if (entry) {
            res.status(200).json(entry);
        } else {
            res.status(404).json({ error: 'Roster entry not found' });
        }
    } catch (error) {
        console.error('Error fetching roster entry by ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/roster
 * Add a new roster entry
 */
router.post('/', async (req, res) => {
    try {
        const { characterName, userId, department, rank, position, age, species } = req.body;

        // Basic validation
        if (
            !characterName ||
            !userId ||
            !department ||
            !rank ||
            !position ||
            !age ||
            !species
        ) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const newEntry = { characterName, userId, department, rank, position, age, species };
        const addedEntry = await rosterModel.addRosterEntry(newEntry);
        res.status(201).json(addedEntry);
    } catch (error) {
        console.error('Error adding roster entry:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/roster/:id
 * Update a roster entry by ID
 */
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { characterName, userId, department, rank, position, age, species } = req.body;

        // Basic validation
        if (
            !characterName ||
            !userId ||
            !department ||
            !rank ||
            !position ||
            !age ||
            !species
        ) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const updatedEntry = { characterName, userId, department, rank, position, age, species };
        const result = await rosterModel.updateRosterEntry(id, updatedEntry);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error updating roster entry:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/roster/:id
 * Delete a roster entry by ID
 */
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const result = await rosterModel.deleteRosterEntry(id);
        if (result) {
            res.status(200).json({ message: 'Roster entry deleted successfully' });
        } else {
            res.status(404).json({ error: 'Roster entry not found' });
        }
    } catch (error) {
        console.error('Error deleting roster entry:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
