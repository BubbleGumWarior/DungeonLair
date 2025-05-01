const express = require('express');
const router = express.Router();
const MaskList = require('../models/MaskList');

let masksInBattle = []; // In-memory array to store masks in battle

router.get('/mask-list', async (req, res) => {
  try {
    const masks = await MaskList.findAll();
    res.json(masks);
  } catch (error) {
    console.error('Error fetching mask list:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/add-mask-to-battle', async (req, res) => {
  const { maskID } = req.body;

  try {
    const mask = await MaskList.findByPk(maskID); // Fetch mask details from the database
    if (!mask) {
      return res.status(404).json({ error: 'Mask not found' });
    }

    // Add the mask to the in-memory array
    masksInBattle.push(mask);

    res.status(200).json({ message: 'Mask added to battle successfully' });
  } catch (error) {
    console.error('Error adding mask to battle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
