const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('./db'); // Import your sequelize instance
const User = require('./models/User'); // Import the User model
const CharacterInfo = require('./models/CharacterInfo'); // Import the CharacterInfo model
const StatsSheet = require('./models/StatsSheet'); // Import the StatsSheet model
const FamilyMembers = require('./models/FamilyMembers'); // Import the FamilyMembers model
const FriendMembers = require('./models/FriendMembers'); // Import the FriendMembers model
const ItemList = require('./models/ItemList'); // Import the ItemList model
const SkillList = require('./models/SkillList'); // Import the SkillList model
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your_jwt_secret'; // Use a secure secret key for JWT

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Sync the database
sequelize.sync({ force: false})
  .then(() => {
    console.log('Database synced');
  })
  .catch((error) => {
    console.error('Error syncing database:', error);
  });

// Endpoint to receive registration data
app.post('/register', async (req, res) => {
  const { username, email, password, role, characterName } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).send('User already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user in the database
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      characterName
    });

    // Initialize CharacterInfo with default values
    const newCharacterInfo = await CharacterInfo.create({
      characterName,
      race: 'Unknown',
      class: 'Unknown',
      level: 0,
      photo: null,
      statsSheet: null,
      familyMembers: [],
      friendMembers: [],
      itemInventory: [],
      skillList: []
    });

    // Initialize StatsSheet with 0 values for each stat
    await StatsSheet.create({
      characterName,
      strength: 0,
      athletics: 0,
      swordsmanship: 0,
      dexterity: 0,
      acrobatics: 0,
      sleightOfHand: 0,
      stealth: 0,
      marksmanship: 0,
      pilot: 0,
      constitution: 0,
      intelligence: 0,
      arcana: 0,
      history: 0,
      investigation: 0,
      nature: 0,
      forceStrength: 0,
      splicing: 0,
      wisdom: 0,
      animalHandling: 0,
      insight: 0,
      medicine: 0,
      perception: 0,
      survival: 0,
      forceCapacity: 0,
      mapping: 0,
      charisma: 0,
      deception: 0,
      intimidation: 0,
      performance: 0,
      persuasion: 0,
    });

    res.status(201).send('User and character registered successfully with default entries');
  } catch (error) {
    console.error('Error in /register:', error);
    res.status(500).send('An error occurred while registering the user');
  }
});

// Endpoint for login (to generate JWT)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return res.status(401).send('Invalid credentials');
  }

  // Compare hashed password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).send('Invalid credentials');
  }

  // Generate JWT including characterName
  const token = jwt.sign({ email: user.email, role: user.role, characterName: user.characterName, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Endpoint for statsSheet get
app.get('/stats-sheet/:characterName', async (req, res) => {
  const { characterName } = req.params;

  try {
    const statsSheet = await StatsSheet.findOne({ where: { characterName } });
    if (!statsSheet) {
      return res.status(404).json({ error: 'Stats sheet not found' });
    }
    res.json(statsSheet);
  } catch (error) {
    console.error('Error fetching stats sheet:', error);
    res.status(500).json({ error: 'Failed to fetch stats sheet' });
  }
});

// Endpoint for characterInfo get
app.get('/character-info/:characterName', async (req, res) => {
  const { characterName } = req.params;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).json({ error: 'Character Info not found' });
    }
    res.json(characterInfo);
  } catch (error) {
    console.error('Error fetching character info:', error);
    res.status(500).json({ error: 'Failed to fetch Character Info' });
  }
});

// Endpoint for familyMembers get
app.get('/family-member/:familyMemberID', async (req, res) => {
  
  // Extract familyMemberID from request parameters
  const { familyMemberID } = req.params;

  try {
    // Query using familyMemberID
    const familyMember = await FamilyMembers.findOne({ where: { id: familyMemberID } }); // Assuming the column name is 'id'
    
    if (!familyMember) {
      return res.status(404).json({ error: 'Character Info not found' });
    }
    
    res.json(familyMember);
  } catch (error) {
    console.error('Error fetching character info:', error);
    res.status(500).json({ error: 'Failed to fetch Character Info' });
  }
});

// Endpoint for friendMembers get
app.get('/friend-member/:friendMemberID', async (req, res) => {
  
  // Extract friendMemberID from request parameters
  const { friendMemberID } = req.params;

  try {
    // Query using friendMemberID
    const friendMember = await FriendMembers.findOne({ where: { id: friendMemberID } }); // Assuming the column name is 'id'
    
    if (!friendMember) {
      return res.status(404).json({ error: 'Character Info not found' });
    }
    
    res.json(friendMember);
  } catch (error) {
    console.error('Error fetching character info:', error);
    res.status(500).json({ error: 'Failed to fetch Character Info' });
  }
});

// Endpoint for ItemList get
app.get('/item-list/:ItemID', async (req, res) => {
  
  // Extract ItemID from request parameters
  const { ItemID } = req.params;

  try {
    // Query using ItemID
    const itemEntry = await ItemList.findOne({ where: { id: ItemID } }); // Assuming the column name is 'id'
    
    if (!itemEntry) {
      return res.status(404).json({ error: 'Character Info not found' });
    }
    
    res.json(itemEntry);
  } catch (error) {
    console.error('Error fetching character info:', error);
    res.status(500).json({ error: 'Failed to fetch Character Info' });
  }
});

// Endpoint for SkillList get
app.get('/skill-list/:SkillID', async (req, res) => {
  
  // Extract SkillID from request parameters
  const { SkillID } = req.params;

  try {
    // Query using SkillID
    const skillEntry = await SkillList.findOne({ where: { id: SkillID } }); // Assuming the column name is 'id'
    
    if (!skillEntry) {
      return res.status(404).json({ error: 'Character Info not found' });
    }
    
    res.json(skillEntry);
  } catch (error) {
    console.error('Error fetching character info:', error);
    res.status(500).json({ error: 'Failed to fetch Character Info' });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
