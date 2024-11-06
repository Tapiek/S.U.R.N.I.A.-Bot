// web-dashboard/server/controllers/characterController.js

const express = require('express');
const router = express.Router();
const characterModel = require('../models/character');

// GET /api/characters - Retrieve all characters
router.get('/', async (req, res) => {
  try {
    const characters = await characterModel.getAllCharacters();
    res.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/characters/:id - Retrieve a specific character by ID
router.get('/:id', async (req, res) => {
  try {
    const character = await characterModel.getCharacterById(req.params.id);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.json(character);
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/characters - Create a new character
router.post('/', async (req, res) => {
  try {
    const { userId, characterName, characterAge, characterSpecies, characterPosition, characterSummary } = req.body;
    if (!userId || !characterName || !characterAge || !characterSpecies || !characterPosition || !characterSummary) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const newCharacter = await characterModel.addCharacter(
      userId,
      characterName,
      characterAge,
      characterSpecies,
      characterPosition,
      characterSummary
    );
    res.status(201).json(newCharacter);
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/characters/:id - Update a specific character
router.put('/:id', async (req, res) => {
  try {
    const { userId, characterName, characterAge, characterSpecies, characterPosition, characterSummary } = req.body;
    if (!userId || !characterName || !characterAge || !characterSpecies || !characterPosition || !characterSummary) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const updatedCharacter = await characterModel.updateCharacter(
      req.params.id,
      userId,
      characterName,
      characterAge,
      characterSpecies,
      characterPosition,
      characterSummary
    );
    if (!updatedCharacter) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.json(updatedCharacter);
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/characters/:id - Delete a character
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await characterModel.deleteCharacter(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error deleting character:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
