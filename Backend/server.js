const express = require('express');
const https = require('https'); // Ensure https is used
const fs = require('fs');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('./db');
const { Op } = require('sequelize'); // Import Op from Sequelize
const CharacterInfo = require('./models/CharacterInfo'); // Import the CharacterInfo model
const StatsSheet = require('./models/StatsSheet'); // Import the StatsSheet model
const FamilyMembers = require('./models/FamilyMembers'); // Import the FamilyMembers model
const FriendMembers = require('./models/FriendMembers'); // Import the FriendMembers model
const ItemList = require('./models/ItemList'); // Import the ItemList model
const SkillList = require('./models/SkillList'); // Import the SkillList model
const ChatHistory = require('./models/ChatHistory'); // Import the ChatHistory model
const DMChatHistory = require('./models/DMChatHistory'); // Import the DMChatHistory model
const Note = require('./models/Note'); // Ensure the file name and path are correct
const User = require('./models/User'); // Import the User model
const Score = require('./models/Score'); // Import the Score model
const { localIP, JWT_SECRET } = require('./config'); // Import the IP address and JWT secret
const multer = require('multer');
const path = require('path');
const http = require('http'); // Import http module
const cron = require('node-cron');
const { exec } = require('child_process');

const app = express();

// Load SSL certificates
const privateKey = fs.readFileSync('d:/Coding/DungeonLair/DungeonLair/key.pem', 'utf8');
const certificate = fs.readFileSync('d:/Coding/DungeonLair/DungeonLair/cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const server = https.createServer(credentials, app); // Ensure https.createServer is used

const allowedOrigins = [
  `https://${localIP}`, // No-IP hostname without port
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"] // Add PUT method to allowed methods
}));

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8080;

let liveUsers = [];

app.use(bodyParser.json());
app.use(express.json());

// Sync the database
sequelize.sync({ force: false })
    .then(() => {
        console.log('Database synced');
    })
    .catch((error) => {
        console.error('Error syncing database:', error);
    });

// Schedule database backup
cron.schedule('0 0 * * *', () => { // This will run every day at midnight
  const backupFile = `d:/Coding/DungeonLair/DungeonLair/backup-${new Date().toISOString().slice(0, 10)}.sql`;
  const command = `mysqldump -u your_db_user -p'your_db_password' your_db_name > ${backupFile}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error creating backup: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Backup stderr: ${stderr}`);
      return;
    }
    console.log(`Database backup created successfully: ${backupFile}`);
  });
});

// Endpoint to restore database from a backup file
app.post('/restore-backup', async (req, res) => {
  const { backupFile } = req.body; // Expecting the backup file path in the request body

  if (!backupFile) {
    return res.status(400).json({ message: 'Backup file path is required' });
  }

  const command = `mysql -u your_db_user -p'your_db_password' your_db_name < ${backupFile}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error restoring backup: ${error.message}`);
      return res.status(500).json({ message: `Error restoring backup: ${error.message}` });
    }
    if (stderr) {
      console.error(`Restore stderr: ${stderr}`);
      return res.status(500).json({ message: `Restore stderr: ${stderr}` });
    }
    console.log(`Database restored successfully from: ${backupFile}`);
    res.status(200).json({ message: `Database restored successfully from: ${backupFile}` });
  });
});

// Endpoint to receive registration data
app.post('/register', async (req, res) => {
  const { username, email, password, role, characterName, race, class: characterClass, level, photo, familyMembers, friendMembers, itemInventory, skillList } = req.body;

  try {
    // Check if the username or email already exists
    const existingUser = await User.findOne({ where: { [Op.or]: [{ email }, { username }] } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
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

    // Initialize CharacterInfo with provided values
    await CharacterInfo.create({
      characterName,
      race,
      class: characterClass,
      level,
      photo,
      familyMembers,
      friendMembers,
      itemInventory,
      skillList
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

    res.status(201).json({ message: 'User and character registered successfully with default entries' });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    console.error('Error in /register:', error);
    res.status(500).send(`An error occurred while registering the user: ${error.message}`);
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

// Define your other endpoints here...

// Chat history endpoints
app.get('/chat-history/', async (req, res) => {
    try {
        const chatHistory = await ChatHistory.findAll();
        if (chatHistory.length === 0) {
            return res.status(404).json({ error: 'Chat History not found' });
        }
        res.status(200).json(chatHistory);
    } catch (error) {
        console.error('Error fetching chatHistory:', error);
        res.status(500).json({ error: 'Failed to fetch chatHistory' });
    }
});

// Endpoint for adding a new chat message
app.post('/chat-history/', async (req, res) => {
    try {
        const { username, message } = req.body;

        if (!username || !message) {
            return res.status(400).json({ error: 'Username and message are required' });
        }

        const newChatMessage = await ChatHistory.create({
            username,
            message,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Emit the new message to all connected clients
        io.emit('newMessage', newChatMessage); // Broadcast the new message
        console.log('New message emitted:', newChatMessage);

        res.status(201).json(newChatMessage);
    } catch (error) {
        console.error('Error adding chat message:', error);
        res.status(500).json({ error: 'Failed to add chat message' });
    }
});

// Endpoint for adding a new DM chat message
app.post('/dm-chat-history/', async (req, res) => {
    try {
        const { username, message } = req.body;

        if (!username || !message) {
            return res.status(400).json({ error: 'Username and message are required' });
        }

        const newDMChatMessage = await DMChatHistory.create({
            username,
            message,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Emit the new DM message to all connected clients
        io.emit('newDMMessage', newDMChatMessage); // Broadcast the new DM message
        console.log('New DM message emitted:', newDMChatMessage);

        res.status(201).json(newDMChatMessage);
    } catch (error) {
        console.error('Error adding DM chat message:', error);
        res.status(500).json({ error: 'Failed to add DM chat message' });
    }
});

// Middleware to verify JWT and extract user role
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        console.log('Token Required')
        console.log('Token Required')
        console.log('Token Required')
        console.log('Token Required')
        console.log('Token Required')
        console.log('Token Required')
        console.log('Token Required')
        console.log('Token Required')
        console.log('Token Required')
        return res.status(403).send('Token is required');
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('Invalid token')
            console.log('Invalid token')
            console.log('Invalid token')
            console.log('Invalid token')
            console.log('Invalid token')
            console.log('Invalid token')
            console.log('Invalid token')
            console.log('Invalid token')
            return res.status(401).send('Invalid token');
        }
        req.user = decoded;
        next();
    });
}

// Endpoint to fetch DM chat history
app.get('/dm-chat-history/', verifyToken, async (req, res) => {
    console.log(req.user.role)
    console.log(req.user.role)
    console.log(req.user.role)
    console.log(req.user.role)
    console.log(req.user.role)
    console.log(req.user.role)
    if (req.user.role !== 'Dungeon Master') {
        return res.status(403).send('Access denied');
    }

    try {
        const dmChatHistory = await DMChatHistory.findAll();
        if (dmChatHistory.length === 0) {
            return res.status(404).json({ error: 'DM Chat History not found' });
        }
        res.status(200).json(dmChatHistory);
    } catch (error) {
        console.error('Error fetching DM chat history:', error);
        res.status(500).json({ error: 'Failed to fetch DM chat history' });
    }
});

// Endpoint to fetch live users
app.get('/api/live-users', (req, res) => {
    res.json(liveUsers.map(user => ({ username: user.username })));
});

app.get('/stats-sheet/:characterName', async (req, res) => {
    const { characterName } = req.params;
    try {
        const statsSheet = await StatsSheet.findOne({ where: { characterName } });
        if (!statsSheet) {
            return res.status(404).send('Stats sheet not found');
        }
        res.json(statsSheet);
    } catch (error) {
        console.error('Error fetching stats sheet:', error);
        res.status(500).send('Failed to fetch stats sheet');
    }
});

app.put('/stats-sheet/:characterName', async (req, res) => {
  const { characterName } = req.params;
  const updatedStats = req.body;

  try {
    const result = await StatsSheet.update(updatedStats, { where: { characterName } });
    if (result[0] === 0) {
      return res.status(404).json({ message: 'Stats sheet not found' });
    }
    res.json({ message: 'Stats sheet updated successfully' }); // Return valid JSON
  } catch (error) {
    console.error('Error updating stats sheet:', error);
    res.status(500).json({ message: 'Failed to update stats sheet' });
  }
});

app.get('/character-info/:characterName', async (req, res) => {
    const { characterName } = req.params;
    try {
        const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
        if (!characterInfo) {
            return res.status(404).send('Character info not found');
        }
        res.json(characterInfo);
    } catch (error) {
        console.error('Error fetching character info:', error);
        res.status(500).send('Failed to fetch character info');
    }
});

app.get('/family-member/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const familyMember = await FamilyMembers.findOne({ where: { id } });
        if (!familyMember) {
            return res.status(404).send('Family member not found');
        }
        res.json(familyMember);
    } catch (error) {
        console.error('Error fetching family member:', error);
        res.status(500).send('Failed to fetch family member');
    }
});

app.get('/friend-member/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const friendMember = await FriendMembers.findOne({ where: { id } });
        if (!friendMember) {
            return res.status(404).send('Friend member not found');
        }
        res.json(friendMember);
    } catch (error) {
        console.error('Error fetching friend member:', error);
        res.status(500).send('Failed to fetch friend member');
    }
});

app.get('/item-list/:itemID', async (req, res) => {
    const { itemID } = req.params;
    try {
        const item = await ItemList.findOne({ where: { itemID } });
        if (!item) {
            return res.status(404).send('Item not found');
        }
        res.json(item);
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).send('Failed to fetch item');
    }
});

app.get('/skill-list/:skillID', async (req, res) => {
    const { skillID } = req.params;
    try {
        const skill = await SkillList.findOne({ where: { skillID } });
        if (!skill) {
            return res.status(404).send('Skill not found');
        }
        res.json(skill);
    } catch (error) {
        console.error('Error fetching skill:', error);
        res.status(500).send('Failed to fetch skill');
    }
});

app.get('/character-names', async (req, res) => {
  try {
    const characterInfos = await CharacterInfo.findAll({ attributes: ['characterName', 'photo'] });
    const characterNames = characterInfos.map(info => ({
      characterName: info.characterName,
      photo: info.photo
    }));
    res.json(characterNames);
  } catch (error) {
    console.error('Error fetching character names:', error);
    res.status(500).send('Failed to fetch character names');
  }
});

// Set up storage for uploaded images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'assets/images');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Endpoint to handle image upload
app.post('/save-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const filePath = `/assets/images/${req.file.filename}`; // Adjusted file path
  const { characterName, itemName } = req.body;

  try {
    if (characterName) {
      // Update the CharacterInfo table with the new image path
      await CharacterInfo.update({ photo: filePath }, { where: { characterName } });
    } else if (itemName) {
      // Update the ItemList table with the new image path
      await ItemList.update({ photo: filePath }, { where: { itemName } });
    }
    res.json({ filePath }); // Return relative path
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).send('Failed to save image');
  }
});

app.post('/save-image-board', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const filePath = `/assets/images/${req.file.filename}`; // Adjusted file path
  const { characterName } = req.body;

  try {
    if (characterName) {
      // Update the CharacterInfo table with the new image path
      await CharacterInfo.update({ photo: filePath }, { where: { characterName } });
    }
    res.json({ filePath }); // Return relative path
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).send('Failed to save image');
  }
});

app.put('/character-info-board/:characterName/photo', async (req, res) => {
  const { characterName } = req.params;
  const { photo } = req.body;

  try {
    const result = await CharacterInfo.update({ photo }, { where: { characterName } });
    if (result[0] === 0) {
      return res.status(404).json({ message: 'Character info not found' });
    }
    res.json({ message: 'Character photo updated successfully' });
  } catch (error) {
    console.error('Error updating character photo:', error);
    res.status(500).json({ message: 'Failed to update character photo' });
  }
});

app.use('/assets/images', express.static(path.join(__dirname, 'assets/images')));

// Endpoint to handle gallery image upload
app.post('/upload-gallery-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }
  const filePath = `/assets/images/${req.file.filename}`;
  console.log('Gallery image uploaded:', filePath);
  res.json({ filePath });
});

app.post('/character-info/:characterName/family-member', async (req, res) => {
  const { characterName } = req.params;
  const { characterName: newFamilyMemberName, age, race, photo } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const newFamilyMember = await FamilyMembers.create({
      characterID: characterInfo.id,
      characterName: newFamilyMemberName, // Use the provided character name for the new family member
      age,
      race,
      photo
    });
    res.status(201).json(newFamilyMember);
  } catch (error) {
    console.error('Error saving family member:', error);
    res.status(500).send('Failed to save family member');
  }
});

app.put('/character-info/:characterName/family-members', async (req, res) => {
  const { characterName } = req.params;
  const { familyMemberId } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).json({ message: 'Character info not found' });
    }

    const updatedFamilyMembers = [...characterInfo.familyMembers, familyMemberId];
    await CharacterInfo.update({ familyMembers: updatedFamilyMembers }, { where: { characterName } });

    res.json({ message: 'Character family members updated successfully' }); // Return valid JSON
  } catch (error) {
    console.error('Error updating character family members:', error);
    res.status(500).json({ message: 'Failed to update character family members' });
  }
});

app.get('/character-info/:characterName/family-members', async (req, res) => {
  const { characterName } = req.params;
  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const familyMembers = await FamilyMembers.findAll({ where: { characterID: characterInfo.id } });
    res.json(familyMembers);
  } catch (error) {
    console.error('Error fetching family members:', error);
    res.status(500).send('Failed to fetch family members');
  }
});

app.post('/character-info/:characterName/friend-member', async (req, res) => {
  const { characterName } = req.params;
  const { characterName: newFriendMemberName, age, race, photo } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const newFriendMember = await FriendMembers.create({
      characterID: characterInfo.id,
      characterName: newFriendMemberName, // Use the provided character name for the new friend member
      age,
      race,
      photo // Ensure the photo path is saved
    });
    res.status(201).json(newFriendMember);
  } catch (error) {
    console.error('Error saving friend member:', error);
    res.status(500).send('Failed to save friend member');
  }
});

app.put('/character-info/:characterName/friend-members', async (req, res) => {
  const { characterName } = req.params;
  const { friendMemberId } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).json({ message: 'Character info not found' });
    }

    const updatedFriendMembers = [...characterInfo.friendMembers, friendMemberId];
    await CharacterInfo.update({ friendMembers: updatedFriendMembers }, { where: { characterName } });

    res.json({ message: 'Character friend members updated successfully' }); // Return valid JSON
  } catch (error) {
    console.error('Error updating character friend members:', error);
    res.status(500).json({ message: 'Failed to update character friend members' });
  }
});

app.get('/character-info/:characterName/friend-members', async (req, res) => {
  const { characterName } = req.params;
  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const friendMembers = await FriendMembers.findAll({ where: { characterID: characterInfo.id } });
    res.json(friendMembers);
  } catch (error) {
    console.error('Error fetching friend members:', error);
    res.status(500).send('Failed to fetch friend members');
  }
});

app.get('/character-info/:characterName/inventory-items', async (req, res) => {
  const { characterName } = req.params;
  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const inventoryItems = await ItemList.findAll({
      where: {
        itemID: {
          [Op.in]: characterInfo.itemInventory
        }
      }
    });
    res.json(inventoryItems);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).send('Failed to fetch inventory items');
  }
});

app.post('/character-info/:characterName/inventory-item', async (req, res) => {
  const { characterName } = req.params;
  const { itemName, type, mainStat, description, damage, photo } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const newItem = await ItemList.create({
      itemName,
      type,
      mainStat,
      description,
      damage,
      photo
    });

    const updatedInventoryItems = [...characterInfo.itemInventory, newItem.itemID];
    await CharacterInfo.update({ itemInventory: updatedInventoryItems }, { where: { characterName } });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error saving inventory item:', error);
    res.status(500).send('Failed to save inventory item');
  }
});

app.put('/character-info/:characterName/inventory-items', async (req, res) => {
  const { characterName } = req.params;
  const { itemId } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).json({ message: 'Character info not found' });
    }

    const updatedInventoryItems = [...characterInfo.itemInventory, itemId];
    await CharacterInfo.update({ itemInventory: updatedInventoryItems }, { where: { characterName } });

    res.json({ message: 'Character inventory items updated successfully' }); // Return valid JSON
  } catch (error) {
    console.error('Error updating character inventory items:', error);
    res.status(500).json({ message: 'Failed to update character inventory items' });
  }
});

app.get('/character-info/:characterName/skills', async (req, res) => {
  const { characterName } = req.params;
  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const skills = await SkillList.findAll({
      where: {
        skillID: {
          [Op.in]: characterInfo.skillList
        }
      }
    });
    res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).send('Failed to fetch skills');
  }
});

app.post('/character-info/:characterName/skill', async (req, res) => {
  const { characterName } = req.params;
  const { skillName, mainStat, description, diceRoll } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const newSkill = await SkillList.create({
      skillName,
      mainStat,
      description,
      diceRoll
    });

    const updatedSkillList = [...characterInfo.skillList, newSkill.skillID];
    await CharacterInfo.update({ skillList: updatedSkillList }, { where: { characterName } });

    res.status(201).json(newSkill);
  } catch (error) {
    console.error('Error saving skill:', error);
    res.status(500).send('Failed to save skill');
  }
});

app.put('/character-info/:characterName/skills', async (req, res) => {
  const { characterName } = req.params;
  const { skillId } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).json({ message: 'Character info not found' });
    }

    const updatedSkillList = [...characterInfo.skillList, skillId];
    await CharacterInfo.update({ skillList: updatedSkillList }, { where: { characterName } });

    res.json({ message: 'Character skills updated successfully' }); // Return valid JSON
  } catch (error) {
    console.error('Error updating character skills:', error);
    res.status(500).json({ message: 'Failed to update character skills' });
  }
});

app.delete('/character-info/:characterName/skill/:skillID', async (req, res) => {
  const { characterName, skillID } = req.params;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    await SkillList.destroy({ where: { skillID } });

    const updatedSkillList = characterInfo.skillList.filter(id => id !== parseInt(skillID));
    await CharacterInfo.update({ skillList: updatedSkillList }, { where: { characterName } });

    res.status(200).json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).send('Failed to delete skill');
  }
});

app.delete('/character-info/:characterName/inventory-item/:itemID', async (req, res) => {
  const { characterName, itemID } = req.params;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    await ItemList.destroy({ where: { itemID } });

    const updatedInventoryItems = characterInfo.itemInventory.filter(id => id !== parseInt(itemID));
    await CharacterInfo.update({ itemInventory: updatedInventoryItems }, { where: { characterName } });

    res.status(200).json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).send('Failed to delete inventory item');
  }
});

// Endpoint to add a new note
app.post('/character-info/:characterName/note', async (req, res) => {
  const { characterName } = req.params;
  const { title, description } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const newNote = await Note.create({
      title,
      description,
    });

    const updatedNoteList = [...characterInfo.noteList, newNote.id];
    await CharacterInfo.update({ noteList: updatedNoteList }, { where: { characterName } });

    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).send(`Failed to save note: ${error.message}`);
  }
});

// Endpoint to delete a note
app.delete('/character-info/:characterName/note/:noteId', async (req, res) => {
  const { characterName, noteId } = req.params;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    // Remove the note ID from the noteList array
    const updatedNoteList = characterInfo.noteList.filter(id => id !== parseInt(noteId));
    await CharacterInfo.update({ noteList: updatedNoteList }, { where: { characterName } });

    // Delete the note from the Note table
    await Note.destroy({ where: { id: noteId } });

    res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).send('Failed to delete note');
  }
});

// Endpoint to fetch notes for a user
app.get('/character-info/:username/notes', async (req, res) => {
  const { username } = req.params;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName: username } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const notes = await Note.findAll({ where: { id: characterInfo.noteList } });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).send('Failed to fetch notes');
  }
});

// Endpoint to add a new note
app.post('/character-info/:username/note', async (req, res) => {
  const { username } = req.params;
  const { title, description } = req.body;

  try {
    console.log(`Adding note for username: ${username}`); // Log the username
    const characterInfo = await CharacterInfo.findOne({ where: { characterName: username } });
    if (!characterInfo) {
      console.log(`Character info not found for username: ${username}`); // Log if character info is not found
      return res.status(404).send('Character info not found');
    }

    const newNote = await Note.create({
      title,
      description,
    });

    const updatedNoteList = [...characterInfo.noteList, newNote.id];
    await CharacterInfo.update({ noteList: updatedNoteList }, { where: { characterName: username } });

    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).send(`Failed to save note: ${error.message}`);
  }
});

// Endpoint to delete a note
app.delete('/character-info/:username/note/:noteId', async (req, res) => {
  const { username, noteId } = req.params;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName: username } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    await Note.destroy({ where: { id: noteId } });

    const updatedNoteList = characterInfo.noteList.filter(id => id !== parseInt(noteId));
    await CharacterInfo.update({ noteList: updatedNoteList }, { where: { characterName: username } });

    res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).send('Failed to delete note');
  }
});

// Endpoint to update a note
app.put('/character-info/:username/note/:noteId', async (req, res) => {
  const { username, noteId } = req.params;
  const { title, description } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName: username } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    await Note.update({ title, description }, { where: { id: noteId } });

    res.status(200).json({ message: 'Note updated successfully' });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).send('Failed to update note');
  }
});

// Endpoint to handle gallery image upload
app.post('/upload-gallery-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }
  const filePath = `/assets/images/${req.file.filename}`;
  console.log('Gallery image uploaded:', filePath);
  res.json({ filePath });
});

// Endpoint to fetch scores
app.get('/api/scores', async (req, res) => {
  try {
    const scores = await Score.findAll({
      order: [['characterName', 'ASC']] // Sort alphabetically by characterName
    });
    res.json(scores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).send('Failed to fetch scores');
  }
});

app.put('/api/scores/:characterName', async (req, res) => {
  const { characterName } = req.params;
  const { field, value } = req.body;

  try {
    const score = await Score.findOne({ where: { characterName } });
    if (!score) {
      return res.status(404).json({ message: 'Score not found' });
    }

    score[field] = value;
    await score.save();

    res.json({ message: 'Score updated successfully' });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ message: 'Failed to update score' });
  }
});

// Socket.IO connection
let activeBattleUsers = [];
let userPositions = []; // Add variable to store user positions

io.on('connection', (socket) => {
    console.log('A user connected with socket ID:', socket.id);

    // Handle user login
    socket.on('loginUser', (data) => {
        const { username, role } = data;
        console.log('Logging in user:', username, 'with role:', role);
        const existingUser = liveUsers.find(user => user.username === username);
        if (existingUser) {
            console.log('Updating socket ID for user:', username);
            existingUser.id = socket.id;
        } else {
            const newUser = { id: socket.id, username, role };
            liveUsers.push(newUser);
        }

        // Log the username and socket ID after login
        console.log('User logged in:', username, 'with socket ID:', socket.id);
        console.log('Current live users:', liveUsers);

        // Join the user to the 'dungeonMaster' room if they are a Dungeon Master
        if (role === 'Dungeon Master') {
            socket.join('dungeonMaster');
        }

        broadcastUserUpdate();
        // Send active battle users and their positions to the newly connected user
        socket.emit('activeBattleUsers', activeBattleUsers);
        socket.emit('userPositions', userPositions);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected with socket ID:', socket.id);
        liveUsers = liveUsers.filter(user => user.id !== socket.id);
        activeBattleUsers = activeBattleUsers.filter(user => user.id !== socket.id);
        userPositions = userPositions.filter(p => p.username !== socket.username);
        console.log('Current live users after disconnection:', liveUsers);
        broadcastUserUpdate();
        broadcastActiveBattleUsers();
    });

    // Handle battle start
    socket.on('startBattle', () => {
        io.emit('battleStarted');
    });

    // Handle battle end
    socket.on('endBattle', () => {
        io.emit('battleEnded');
        activeBattleUsers = []; // Clear the array
        userPositions = []; // Clear user positions
        broadcastActiveBattleUsers(); // Emit the updated empty array
    });

    socket.on('joinBattle', async (user) => {
      try {
        if (user.isNPC) { // Check if the user is an NPC
          const userWithPhoto = {
            ...user,
            photo: user.photo || '' // Use provided photo or empty string
          };
          if (!activeBattleUsers.some(u => u.username === user.username)) {
            activeBattleUsers.push(userWithPhoto);
            activeBattleUsers.sort((a, b) => b.initiative.final - a.initiative.final); // Sort by final initiative value
            console.log('NPC joined battle:', user.characterName, 'with initiative', user.initiative);
            broadcastActiveBattleUsers();
          }
        } else {
          const characterInfo = await CharacterInfo.findOne({ where: { characterName: user.characterName } });
          if (characterInfo) {
            const userWithPhoto = {
              ...user,
              photo: characterInfo.photo ? `https://${localIP}:8080${characterInfo.photo}` : ''
            };
            if (!activeBattleUsers.some(u => u.username === user.username)) {
              activeBattleUsers.push(userWithPhoto);
              activeBattleUsers.sort((a, b) => b.initiative.final - a.initiative.final); // Sort by final initiative value
              console.log('User joined battle:', user.characterName, 'with initiative', user.initiative);
              broadcastActiveBattleUsers();
            }
          }
        }
      } catch (error) {
        console.error('Error fetching character info:', error);
      }
    });

    socket.on('leaveBattle', (user) => {
        activeBattleUsers = activeBattleUsers.filter(u => u.username !== user.username);
        userPositions = userPositions.filter(p => p.username !== user.username); // Remove user position
        console.log('User left battle:', user.characterName);
        broadcastActiveBattleUsers();
    });

    socket.on('getActiveBattleUsers', () => {
        socket.emit('activeBattleUsers', activeBattleUsers);
        socket.emit('userPositions', userPositions); // Send user positions
    });

    socket.on('sendInitiativePrompt', (username) => {
        console.log('Received request to send initiative prompt to:', username);
        console.log('Current live users:', liveUsers);
        const userSocket = liveUsers.find(user => user.username === username);
        if (userSocket) {
            console.log('Sending initiative prompt to socket ID:', userSocket.id);
            io.to(userSocket.id).emit('initiativePrompt');
        } else {
            console.log('User not found:', username);
        }
    });

    socket.on('getAllCharacterNames', async () => {
        try {
            const characterInfos = await CharacterInfo.findAll({ attributes: ['characterName'] });
            const characterNames = characterInfos.map(info => ({ characterName: info.characterName }));
            socket.emit('allCharacterNames', characterNames);
        } catch (error) {
            console.error('Error fetching character names:', error);
        }
    });

    // Handle incoming messages if needed
    socket.on('message', (message) => {
        console.log('Received:', message);
        if (message.type === 'userUpdate') {
            liveUsers = message.users;
            broadcastUserUpdate();
        }
        // Broadcast the message to all connected clients
        io.emit('message', message);
    });

    // Handle incoming DM messages
    socket.on('newDMMessage', (message) => {
        const user = liveUsers.find(user => user.id === socket.id);
        if (user && user.role === 'Dungeon Master') {
            io.to('dungeonMaster').emit('newDMMessage', message); // Broadcast the new DM message only to DMs
        }
    });

    // Handle incoming audio data
    socket.on('audio', (audioData) => {
        console.log('Received audio chunk from client:', audioData.buffer);
        console.log('Audio MIME type:', audioData.type); // Log the MIME type of the received audio data
        socket.broadcast.emit('audio', audioData); // Broadcast audio data with MIME type to other clients
    });

    socket.on('updateHealth', (user) => {
        user.currentHealth = Math.max(0, user.currentHealth); // Ensure health is not less than 0
        console.log('Health update received for:', user.characterName);
        console.log('New health:', user.currentHealth);
        console.log('New shield:', user.shield); // Log the shield value
        const battleUser = activeBattleUsers.find(u => u.username === user.username);
        if (battleUser) {
            battleUser.currentHealth = user.currentHealth;
            battleUser.shield = user.shield;
        }
        io.emit('healthUpdate', user);
        io.emit('userPositions', userPositions); // Emit user positions after health update
    });

    socket.on('updateTurnIndex', (index) => {
        console.log('Turn index update received:', index);
        io.emit('turnIndexUpdate', index);
        io.emit('userPositions', userPositions); // Emit user positions after turn index update
    });

    socket.on('broadcastGalleryImage', (data) => {
        console.log('Broadcasting gallery image:', data);
        socket.broadcast.emit('galleryImage', data);
        io.emit('userPositions', userPositions); // Emit user positions after gallery image broadcast
    });

    socket.on('updateUserPosition', (position) => {
      const existingPosition = userPositions.find(p => p.username === position.username);
      if (existingPosition) {
        existingPosition.topRatio = position.topRatio;
        existingPosition.leftRatio = position.leftRatio;
      } else {
        userPositions.push(position);
      }
      io.emit('userPositionUpdate', position);
      io.emit('userPositions', userPositions); // Emit user positions after position update
    });

    socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
    });
});

// Function to broadcast user updates
function broadcastUserUpdate() {
    const userUpdateMessage = { type: 'userUpdate', users: liveUsers.map(user => ({ username: user.username, role: user.role })) };
    io.emit('userUpdate', userUpdateMessage);
}

// Function to broadcast active battle users
function broadcastActiveBattleUsers() {
    io.emit('activeBattleUsers', activeBattleUsers);
    io.emit('userPositions', userPositions); // Ensure positions are broadcasted
}

// Redirect HTTP to HTTPS
const httpApp = express();
httpApp.use((req, res) => {
  res.redirect(`https://${req.headers.host}${req.url}`);
});
const httpServer = http.createServer(httpApp);
httpServer.listen(80, '0.0.0.0', () => {
  console.log('HTTP server is running on port 80 and redirecting to HTTPS');
});

// Start the server
server.listen(PORT, '0.0.0.0', () => { // Ensure it listens on all interfaces
    console.log(`Server is running on https://${localIP}:${PORT}`);
});
