const express = require('express');
const https = require('https'); // Ensure https is used
const fs = require('fs');
const { unlink } = require('fs').promises; // Import unlink from fs.promises
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('./db');
const { Op } = require('sequelize'); // Import Op from Sequelize
const CharacterInfo = require('./models/CharacterInfo'); // Import the CharacterInfo model
const StatsSheet = require('./models/StatsSheet'); // Import the StatsSheet model
const ItemList = require('./models/ItemList'); // Import the ItemList model
const SkillList = require('./models/SkillList'); // Import the SkillList model
const ChatHistory = require('./models/ChatHistory'); // Import the ChatHistory model
const DMChatHistory = require('./models/DMChatHistory'); // Import the DMChatHistory model
const Images = require('./models/Images'); // Import the Images model
const Note = require('./models/Note'); // Ensure the file name and path are correct
const User = require('./models/User'); // Import the User model
const Score = require('./models/Score'); // Import the Score model
const MaskList = require('./models/MaskList'); // Import the MaskList model
const MaskSkills = require('./models/MaskSkills'); // Import the MaskSkills model
const ModList = require('./models/ModList'); // Import ModList model
const TimeKeeper = require('./models/TimeKeeper'); // Import TimeKeeper model
const Sound = require('./models/Sound'); // Import Sound model
const { localIP, JWT_SECRET } = require('./config'); // Import the IP address and JWT secret
const multer = require('multer');
const path = require('path');
const http = require('http'); // Import http module
const cron = require('node-cron');
const { exec } = require('child_process');
const maskRoutes = require('./routes/maskRoutes'); // Import maskRoutes

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// Load SSL certificates
const privateKey = fs.readFileSync('d:/Coding/DungeonLair/DungeonLair/certs/dungeonlair.ddns.net-key.pem', 'utf8');
const certificate = fs.readFileSync('d:/Coding/DungeonLair/DungeonLair/certs/dungeonlair.ddns.net-crt.pem', 'utf8');
const ca = fs.readFileSync('d:/Coding/DungeonLair/DungeonLair/certs/dungeonlair.ddns.net-chain-only.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate, ca: ca };

const server = https.createServer(credentials, app);
// Old CORS code (if you want to revert):
// app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
//
// const io = socketIo(server, {
//   cors: {
//     origin: 'http://localhost:3000',
//     methods: ["GET", "POST"]
//   }
// });

app.use(cors({ origin: true, credentials: true }));

const io = socketIo(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 443;

let liveUsers = [];

app.use(bodyParser.json());
app.use(express.json());

// Sync the database
sequelize.sync({ force: false })
    .then(async () => {
        console.log('Database synced');
        
        // Ensure the default skills exist in the MaskSkills table
        const defaultSkills = [
            {
                skillID: 8888,
                skillName: 'Good Boy Strike',
                description: 'Good Boy Attacks',
                mainStat: 'Attack Damage',
                mainStatPercentage: 100,
                cooldown: 0,
                amountOfStrikes: 1,
                onHitEffect: 'None',
                isMultiTarget: false,
            },
            {
                skillID: 9996,
                skillName: 'Underworld Ravage Strike',
                description: 'Strike the target dealing Attack Damage to them and bleeding them',
                mainStat: 'Attack Damage',
                mainStatPercentage: 100,
                cooldown: 0,
                amountOfStrikes: 1,
                onHitEffect: 'None',
                isMultiTarget: false,
            },
            {
                skillID: 9997,
                skillName: 'Lurk in the Shadows Dog',
                description: 'Strike the target dealing Attack Damage to them. If you are untargetable this does double damage. At the start of each cycle you have a 50% chance to become untargetable.',
                mainStat: 'Attack Damage',
                mainStatPercentage: 100,
                cooldown: 0,
                amountOfStrikes: 1,
                onHitEffect: 'None',
                isMultiTarget: false,
            },
            {
                skillID: 9998,
                skillName: 'Mounted Slash',
                description: 'Slash at the target with you sword dealing Attack Damage to them. Because you are mounted you do not need to focus on your Stance as much and can strike freely now.',
                mainStat: 'Attack Damage',
                mainStatPercentage: 750,
                cooldown: 0,
                amountOfStrikes: 1,
                onHitEffect: 'None',
                isMultiTarget: false,
            },
            {
                skillID: 9999,
                skillName: 'Ravaging Strikes',
                description: 'Now that you are transformed you have shown your true strength and you are no longer holding back. Strike the target 4 times dealing Attack Damage to it and applying bleed stacks. At the start of the cycle for each mask that is bleeding heal yourself by 20% of your missing health.',
                mainStat: 'Attack Damage',
                mainStatPercentage: 100,
                cooldown: 0,
                amountOfStrikes: 4,
                onHitEffect: 'Bleed',
                isMultiTarget: false,
            },
            {
                skillID: 10000,
                skillName: 'Dragon Blast',
                description: 'Blast Dragons',
                mainStat: 'Ability Damage',
                mainStatPercentage: 500,
                cooldown: 0,
                amountOfStrikes: 1,
                onHitEffect: 'Burn',
                isMultiTarget: false,
            },
            {
                skillID: 100000,
                skillName: 'Archer Shot',
                description: 'Blast Dragons',
                mainStat: 'Attack Damage',
                mainStatPercentage: 100,
                cooldown: 0,
                amountOfStrikes: 1,
                onHitEffect: 'None',
                isMultiTarget: false,
            },
            {
                skillID: 1000000,
                skillName: 'Warrior Strike',
                description: 'Blast Dragons',
                mainStat: 'Attack Damage',
                mainStatPercentage: 100,
                cooldown: 0,
                amountOfStrikes: 1,
                onHitEffect: 'None',
                isMultiTarget: false,
            }
        ];

        for (const skill of defaultSkills) {
            const [existingSkill, created] = await MaskSkills.findOrCreate({
                where: { skillID: skill.skillID },
                defaults: skill,
            });

            if (created) {
                console.log('Default skill added to MaskSkills table:', existingSkill.skillName);
            } else {
                console.log('Default skill already exists in MaskSkills table:', existingSkill.skillName);
            }
        }

        // Ensure the default masks exist in the MaskList table
        const defaultMasks = [
            {
                maskID: 8888,
                photo: '/assets/images/Skelly-Doggo.jpg',
                passiveSkill: 'Good Boy',
                activeSkills: [8888],
                modList: [],
                attackDamage: 10,
                abilityDamage: 10,
                magicResist: 5,
                protections: 5,
                health: 50,
                currentHealth: 50,
                speed: 100,
            },
            {
                maskID: 8686,
                photo: '/assets/images/Doggo.jpg',
                passiveSkill: 'Pack Mentality',
                activeSkills: [8888],
                modList: [],
                attackDamage: 15,
                abilityDamage: 15,
                magicResist: 10,
                protections: 10,
                health: 75,
                currentHealth: 75,
                speed: 100,
            },
            {
                maskID: 9996,
                photo: '/assets/images/UnderworldAlphaHound.jpg',
                passiveSkill: 'Pack Mentality',
                activeSkills: [9996],
                modList: [],
                attackDamage: 15,
                abilityDamage: 15,
                magicResist: 10,
                protections: 10,
                health: 75,
                currentHealth: 75,
                speed: 100,
            },
            {
                maskID: 10000,
                photo: '/assets/images/Dragon.jpg',
                passiveSkill: 'Pack Mentality',
                activeSkills: [10000],
                modList: [],
                attackDamage: 15,
                abilityDamage: 15,
                magicResist: 10,
                protections: 10,
                health: 75,
                currentHealth: 75,
                speed: 100,
            },
            {
                maskID: 100000,
                photo: '/assets/images/SkellyArcher.jpg',
                passiveSkill: 'Pack Mentality',
                activeSkills: [100000],
                modList: [],
                attackDamage: 50,
                abilityDamage: 15,
                magicResist: 10,
                protections: 10,
                health: 100,
                currentHealth: 100,
                speed: 100,
            },
            {
                maskID: 1000000,
                photo: '/assets/images/SkellyWarrior.jpg',
                passiveSkill: 'Pack Mentality',
                activeSkills: [1000000],
                modList: [],
                attackDamage: 15,
                abilityDamage: 15,
                magicResist: 10,
                protections: 10,
                health: 500,
                currentHealth: 500,
                speed: 100,
            },
            {
                maskID: 10000000,
                photo: '/assets/images/EgyptianHound.png',
                passiveSkill: 'Pack Mentality',
                activeSkills: [8888],
                modList: [],
                attackDamage: 15,
                abilityDamage: 15,
                magicResist: 10,
                protections: 10,
                health: 75,
                currentHealth: 75,
                speed: 100,
            }
        ];

        for (const mask of defaultMasks) {
            const [existingMask, created] = await MaskList.findOrCreate({
                where: { maskID: mask.maskID },
                defaults: mask,
            });

            if (created) {
                console.log('Default mask added to MaskList table:', existingMask.maskID);
            } else {
                console.log('Default mask already exists in MaskList table:', existingMask.maskID);
            }
        }
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

    // Initialize CharacterInfo with provided values
    const characterInfo = await CharacterInfo.create({
      race,
      class: characterClass,
      level,
      photo,
      familyMembers,
      friendMembers,
      itemInventory,
      skillList
    });

    // Create the user in the database
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      characterID: characterInfo.characterID // Set characterID from created CharacterInfo
    });

    // Initialize StatsSheet with 0 values for each stat
    await StatsSheet.create({
      characterID: characterInfo.characterID, // Set characterID from created CharacterInfo
      strength: 0,
      athletics: 0,
      dexterity: 0,
      acrobatics: 0,
      sleightOfHand: 0,
      stealth: 0,
      constitution: 0,
      intelligence: 0,
      history: 0,
      investigation: 0,
      nature: 0,
      wisdom: 0,
      animalHandling: 0,
      insight: 0,
      medicine: 0,
      perception: 0,
      survival: 0,
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

  // Fetch character info to get characterID
  const characterInfo = await CharacterInfo.findOne({ where: { characterID: user.characterID } });
  const characterID = characterInfo ? characterInfo.characterID : null;

  // Generate JWT including characterID
  const token = jwt.sign(
    { email: user.email, role: user.role, characterID, username: user.username },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  res.json({ token, characterID, username: user.username, role: user.role });
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
        return res.status(403).send('Token is required');
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('Invalid token')
            return res.status(401).send('Invalid token');
        }
        req.user = decoded;
        next();
    });
}

// Endpoint to fetch DM chat history
app.get('/dm-chat-history/', verifyToken, async (req, res) => {
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

app.get('/stats-sheet/:characterID', async (req, res) => {
    const { characterID } = req.params;
    try {
        const statsSheet = await StatsSheet.findOne({ where: { characterID } });
        if (!statsSheet) {
            return res.status(404).send('Stats sheet not found');
        }
        res.json(statsSheet);
    } catch (error) {
        console.error('Error fetching stats sheet:', error);
        res.status(500).send('Failed to fetch stats sheet');
    }
});

app.put('/stats-sheet/:characterID', async (req, res) => {
  const { characterID } = req.params;
  const updatedStats = req.body;

  try {
    const result = await StatsSheet.update(updatedStats, { where: { characterID } });
    if (result[0] === 0) {
      return res.status(404).json({ message: 'Stats sheet not found' });
    }
    res.json({ message: 'Stats sheet updated successfully' }); // Return valid JSON
  } catch (error) {
    console.error('Error updating stats sheet:', error);
    res.status(500).json({ message: 'Failed to update stats sheet' });
  }
});

app.get('/character-info/:characterID', async (req, res) => {
    const { characterID } = req.params;
    try {
        const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
        if (!characterInfo) {
            return res.status(404).send('Character info not found');
        }
        res.json(characterInfo);
    } catch (error) {
        console.error('Error fetching character info:', error);
        res.status(500).send('Failed to fetch character info');
    }
});

app.get('/family-member/:characterID', async (req, res) => {
  const { characterID } = req.params;
  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterID: characterID } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const familyMembers = await CharacterInfo.findAll({
      where: {
        characterID: {
          [Op.in]: characterInfo.familyMembers
        }
      }
    });

    const familyDetails = await Promise.all(
      familyMembers.map(async (family) => {
        const familyInfo = await CharacterInfo.findOne({ where: { characterID: family.characterID } });
        return familyInfo;
      })
    );

    res.json(familyDetails);
  } catch (error) {
      console.error('Error fetching family member:', error);
      res.status(500).send('Failed to fetch family member');
  }
});

app.get('/friend-member/:characterID', async (req, res) => {
  const { characterID } = req.params;
  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterID: characterID } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const friendMembers = await CharacterInfo.findAll({
      where: {
        characterID: {
          [Op.in]: characterInfo.friendMembers
        }
      }
    });

    const friendDetails = await Promise.all(
      friendMembers.map(async (friend) => {
        const friendInfo = await CharacterInfo.findOne({ where: { characterID: friend.characterID } });
        return friendInfo;
      })
    );

    res.json(friendDetails);
  } catch (error) {
      console.error('Error fetching friend member:', error);
      res.status(500).send('Failed to fetch friend member');
  }
});

app.get('/inventory-item/:characterID', async (req, res) => {
  const { characterID } = req.params;
  try {
    const characterInfo = await CharacterInfo.findOne({ 
      where: { 
        characterID: characterID 
      } 
    });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const inventoryItem = await ItemList.findAll({
      where: {
        itemID: {
          [Op.in]: characterInfo.itemInventory
        }
      }
    });

    const itemDetails = await Promise.all(
      inventoryItem.map(async (item) => {
        const itemInfo = await ItemList.findOne({ where: { itemID: item.itemID } });
        return itemInfo;
      })
    );

    res.json(itemDetails);
  } catch (error) {
      console.error('Error fetching item member:', error);
      res.status(500).send('Failed to fetch item member');
  }
});

app.get('/skill-list/:characterID', async (req, res) => {
  const { characterID } = req.params;
  try {
    const characterInfo = await CharacterInfo.findOne({ 
      where: { 
        characterID: characterID 
      } 
    });
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

    const skillDetails = await Promise.all(
      skills.map(async (skill) => {
        const skillInfo = await SkillList.findOne({ where: { skillID: skill.skillID } });
        return skillInfo;
      })
    );

    res.json(skillDetails);
  } catch (error) {
      console.error('Error fetching skill member:', error);
      res.status(500).send('Failed to fetch skill member');
  }
});

app.get('/character-names', async (req, res) => {
  try {
    const characterInfos = await CharacterInfo.findAll({ attributes: ['characterName', 'photo', 'maskID'] });
    const characterNames = characterInfos.map(info => ({
      characterName: info.characterName,
      photo: info.photo,
      maskID: info.maskID // Include maskID in the response
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
  const { characterID } = req.body;

  try {
    if (characterID) {
      // Update the CharacterInfo table with the new image path
      await CharacterInfo.update({ photo: filePath }, { where: { characterID } });
    }
    res.json({ filePath }); // Return relative path
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).send('Failed to save image');
  }
});

app.put('/character-info-board/:characterID/photo', async (req, res) => {
  const { characterID } = req.params;
  const { photo } = req.body;

  try {
    const result = await CharacterInfo.update({ photo }, { where: { characterID } });
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
app.use('/assets/sounds', express.static(path.join(__dirname, 'assets/sounds')));

const soundStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'assets/sounds');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const soundUpload = multer({ storage: soundStorage });

app.post('/api/upload-sound', soundUpload.single('file'), async (req, res) => {
  const { id } = req.body;
  if (!req.file || !id) {
    return res.status(400).json({ message: 'Sound ID and file are required' });
  }
  const filePath = `/assets/sounds/${req.file.filename}`;
  try {
    await Sound.create({ id, path: filePath });
    res.status(201).json({ message: 'Sound uploaded successfully', path: filePath });
  } catch (error) {
    console.error('Error uploading sound:', error);
    res.status(500).json({ message: 'Failed to upload sound' });
  }
});

// Endpoint to handle gallery image upload
app.post('/upload-gallery-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const filePath = `/assets/images/${req.file.filename}`;
  const { imageName } = req.body;

  try {
    await Images.create({ photo: filePath, imageName });
    res.json({ filePath });
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).send('Failed to save image');
  }
});

// Endpoint to handle gallery image upload
app.post('/upload-gallery-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }
  const filePath = `/assets/images/${req.file.filename}`;
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
let vcMembers = [];
let masksInBattle = {}; // Add masksInBattle object
let maskSkills = {}; // Add maskSkills object
let blindingStrikesTargets = []; // Initialize variable to track targets hit by Blinding Strikes
let blackHoleDamage = 0; // Initialize variable to track damage from Black Hole
let stormSize = 0; // Initialize variable to track storm size
let infectedByPlague = []; // Initialize variable to track infected masks
let forestsTiming = 0; // Initialize variable to track forests timing
let detachedSoul = false;

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

        // Emit the updated list of live users to all connected clients
        io.emit('liveUsersUpdate', liveUsers.map(user => ({ username: user.username })));

        // Join the user to the 'dungeonMaster' room if they are a Dungeon Master
        if (role === 'Dungeon Master') {
            socket.join('dungeonMaster');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected with socket ID:', socket.id);
        const disconnectedUser = liveUsers.find(user => user.id === socket.id);
        if (disconnectedUser) {
            vcMembers = vcMembers.filter(member => member.username !== disconnectedUser.username);
            io.emit('vcMembersUpdate', vcMembers);
        }
        liveUsers = liveUsers.filter(user => user.id !== socket.id);
        console.log('Current live users after disconnection:', liveUsers);
        broadcastUserUpdate();
    });

    // Handle incoming messages if needed
    socket.on('message', (message) => {
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

    socket.on('broadcastGalleryImage', (data) => {
        socket.broadcast.emit('galleryImage', data);
    });

    socket.on('updateVcMembers', (members) => {
      vcMembers = members;
      io.emit('vcMembersUpdate', vcMembers);
    });

    socket.on('addVcMember', (member) => {
      if (!vcMembers.some(m => m.username === member.username)) {
        vcMembers.push(member);
        io.emit('vcMembersUpdate', vcMembers);
      }
    });

    socket.on('removeVcMember', (username) => {
      vcMembers = vcMembers.filter(member => member.username !== username);
      io.emit('vcMembersUpdate', vcMembers);
    });

    socket.on('requestVcMembers', () => {
      socket.emit('vcMembersUpdate', vcMembers);
    });

    socket.on('rtcOffer', ({ username, offer }) => {
        const targetUser = liveUsers.find(user => user.username === username);
        if (targetUser) {
            io.to(targetUser.id).emit('rtcOffer', socket.username, offer);
        }
    });

    socket.on('rtcAnswer', ({ username, answer }) => {
        const targetUser = liveUsers.find(user => user.username === username);
        if (targetUser) {
            io.to(targetUser.id).emit('rtcAnswer', socket.username, answer);
        }
    });

    socket.on('rtcIceCandidate', ({ username, candidate }) => {
        const targetUser = liveUsers.find(user => user.username === username);
        if (targetUser) {
            io.to(targetUser.id).emit('rtcIceCandidate', socket.username, candidate);
        }
    });

    socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
    });

    socket.on('joinBattle', (maskID) => {
        if (masksInBattle[maskID]) {
            delete masksInBattle[maskID];
            delete maskSkills[maskID]; // Remove mask skills when leaving battle
            io.emit('masksInBattleUpdate', Object.values(masksInBattle));
        } else {
            MaskList.findOne({ where: { maskID } })
                .then(maskDetails => {
                    if (maskDetails) {
                        masksInBattle[maskID] = {
                            maskID: maskDetails.maskID,
                            attackDamage: maskDetails.attackDamage,
                            abilityDamage: maskDetails.abilityDamage,
                            protections: maskDetails.protections,
                            magicResist: maskDetails.magicResist,
                            health: maskDetails.health,
                            speed: maskDetails.speed,
                            currentHealth: maskDetails.currentHealth,
                            currentSpeed: maskDetails.speed,
                            activeSkills: maskDetails.activeSkills,
                            stunStacks: 0, // Add stunStacks field
                            burnStacks: 0, // Add burnStacks field
                            poisonStacks: 0, // Add poisonStacks field
                            bleedStacks: 0, // Add bleedStacks field
                            buffStacks: 0, // Add buffStacks field
                            untargetable: false, // Add untargetable field
                            action: false, // Add action field
                            bonusAction: false, // Add bonusAction field
                            movement: 0, // Add movement field
                            team: 'Neutral', // Add team field
                            cooldowns: {}, // Initialize cooldowns field
                            photo: maskDetails.photo // Add photo field
                        };
                        // Fetch mask skills and store them
                        MaskSkills.findAll({ where: { skillID: [...maskDetails.activeSkills, 9999] } }) // Ensure skillID 9999 is always included
                            .then(skills => {
                                maskSkills[maskID] = skills.map(skill => ({
                                    skillID: skill.skillID,
                                    skillName: skill.skillName,
                                    description: skill.description,
                                    mainStat: skill.mainStat,
                                    mainStatPercentage: skill.mainStatPercentage,
                                    cooldown: skill.cooldown,
                                    amountOfStrikes: skill.amountOfStrikes,
                                    onHitEffect: skill.onHitEffect,
                                    isMultiTarget: skill.isMultiTarget
                                }));
                                io.emit('masksInBattleUpdate', Object.values(masksInBattle)); // Broadcast the update
                            })
                            .catch(error => {
                                console.error('Error fetching mask skills:', error);
                            });
                    }
                })
                .catch(error => {
                    console.error('Error fetching mask details:', error);
                });
        }
    });

    socket.on('skillAction', (data) => {
        console.log('Skill action received:', data);
        const { maskID, skillID, targetMaskIDs } = data;

        if (!maskSkills[maskID]) {
            console.error(`No skills found for maskID: ${maskID}`);
            return; // Exit early if maskSkills[maskID] is undefined
        }

        const skill = maskSkills[maskID].find(s => s.skillID === skillID);

        if (!skill) {
            console.error(`Skill with skillID: ${skillID} not found for maskID: ${maskID}`);
            return; // Exit early if the skill is not found
        }

        const mask = masksInBattle[maskID];
        if (mask) {
            console.log(skill);
            let totalDamage = 0; // Initialize totalDamage
            let totalHeal = 0; // Initialize totalHeal
            if (skill.skillName === 'Hidden Blade') {              
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                    let damage = 0;
                    let reduction = 0;
                    damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                    reduction = targetMask.protections;

                    let finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative

                    if (targetMask.currentHealth > finalDamage) {
                      finalDamage = 0;
                      masksInBattle[mask.maskID].stunStacks += 2;
                      
                      battleMessage = `Mask ${mask.maskID} couldn't kill Mask ${targetMaskID}`; // Add message to battleMessage
                    }
                    else{
                      battleMessage = `Mask ${mask.maskID} assassinated Mask ${targetMaskID}`; // Add message to battleMessage
                    }

                    totalDamage += finalDamage; // Add finalDamage to totalDamage
                    masksInBattle[targetMaskID].currentHealth = Math.max(masksInBattle[targetMaskID].currentHealth - finalDamage, 0); // Reduce target mask's currentHealth and cap at 0

                    if (masksInBattle[targetMaskID].currentHealth === 0) {
                      masksInBattle[targetMaskID].action = false;
                      masksInBattle[targetMaskID].bonusAction = false;
                      masksInBattle[targetMaskID].movement = 0;
                      masksInBattle[targetMaskID].currentSpeed = 0;
                      masksInBattle[mask.maskID].untargetable = true;
                    }
                }
                console.log(`Total damage dealt by Mask ${maskID}: ${totalDamage}`); // Log totalDamage
                      
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              });
            }
            else if (skill.skillName === 'Shield Bash') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                    let damage = 0;
                    let reduction = 0;
                    damage = mask.protections + mask.magicResist;
                    reduction = targetMask.protections;
                    const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                    console.log(`Mask ${maskID} did ${damage} damage to Mask ${targetMaskID}, reduced by ${reduction}, final damage ${finalDamage}`);
                    totalDamage += finalDamage; // Add finalDamage to totalDamage
                    masksInBattle[targetMaskID].currentHealth = Math.max(masksInBattle[targetMaskID].currentHealth - finalDamage, 0); // Reduce target mask's currentHealth and cap at 0
                }
                console.log(`Total damage dealt by Mask ${maskID}: ${totalDamage}`); // Log totalDamage
                battleMessage = `Mask ${maskID} dealt ${totalDamage} to Mask ${targetMaskID}`; // Add message to battleMessage
                      
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              });
            }
            else if (skill.skillName === 'Ethereal Slash') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                    let damage = 0;
                    damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                    const finalDamage = Math.max(damage, 0); // Ensure damage is not negative
                    console.log(`Mask ${maskID} did ${damage} damage to Mask ${targetMaskID}, reduced by ${reduction}, final damage ${finalDamage}`);
                    totalDamage += finalDamage; // Add finalDamage to totalDamage
                    masksInBattle[targetMaskID].currentHealth = Math.max(masksInBattle[targetMaskID].currentHealth - finalDamage, 0); // Reduce target mask's currentHealth and cap at 0
                }
                console.log(`Total damage dealt by Mask ${maskID}: ${totalDamage}`); // Log totalDamage
                battleMessage = `Mask ${maskID} dealt ${totalDamage} to Mask ${targetMaskID}`; // Add message to battleMessage
                      
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              });
            }
            else if (skill.skillName === 'Gate Barrage') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                    let damage = 0;
                    damage = mask.abilityDamage * (skill.mainStatPercentage / 100);
                    reduction = targetMask.magicResist;
                    const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                    console.log(`Mask ${maskID} did ${damage} damage to Mask ${targetMaskID}, reduced by ${reduction}, final damage ${finalDamage}`);
                    totalDamage += finalDamage; // Add finalDamage to totalDamage
                    masksInBattle[targetMaskID].currentHealth = Math.max(masksInBattle[targetMaskID].currentHealth - finalDamage, 0); // Reduce target mask's currentHealth and cap at 0
                    masksInBattle[mask.maskID].untargetable = true;
                }
                console.log(`Total damage dealt by Mask ${maskID}: ${totalDamage}`); // Log totalDamage
                battleMessage = `Mask ${maskID} dealt ${totalDamage} to Mask ${targetMaskID}`; // Add message to battleMessage
                      
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              });
            }
            else if (skill.skillName === 'Cursed Strike') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                    let damage = 0;
                    damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                    reduction = targetMask.protections;
                    const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                    console.log(`Mask ${maskID} did ${damage} damage to Mask ${targetMaskID}, reduced by ${reduction}, final damage ${finalDamage} and stole Buff Stacks`);
                    totalDamage += finalDamage; // Add finalDamage to totalDamage
                    masksInBattle[targetMaskID].currentHealth = Math.max(masksInBattle[targetMaskID].currentHealth - finalDamage, 0); // Reduce target mask's currentHealth and cap at 0
                    if (masksInBattle[targetMaskID].buffStacks > 0) {
                      masksInBattle[targetMaskID].buffStacks -= 1;
                      masksInBattle[mask.maskID].buffStacks += 1; // Add 1 buff stack
                    }
                }
                masksInBattle[mask.maskID].currentHealth = Math.min(masksInBattle[mask.maskID].currentHealth + totalDamage * masksInBattle[mask.maskID].buffStacks / 5, masksInBattle[mask.maskID].health); // Heal mask by totalDamage
                console.log(`Total damage dealt by Mask ${maskID}: ${totalDamage}`); // Log totalDamage
                battleMessage = `Mask ${maskID} dealt ${totalDamage} to Mask ${targetMaskID} and healed!`; // Add message to battleMessage
                      
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              });
            }
            else if (skill.skillName === 'Evolve') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                    let damage = 0;
                    damage = mask.abilityDamage * (skill.mainStatPercentage / 100);
                    reduction = targetMask.magicResist;
                    const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                    console.log(`Mask ${mask.maskID} did ${damage} damage to Mask ${targetMaskID}, reduced by ${reduction}, final damage ${finalDamage} and stole Buff Stacks`);
                    totalDamage += finalDamage; // Add finalDamage to totalDamage
                    masksInBattle[targetMaskID].currentHealth = Math.max(masksInBattle[targetMaskID].currentHealth - finalDamage, 0); // Reduce target mask's currentHealth and cap at 0
                    if (masksInBattle[targetMaskID].currentHealth === 0) {
                      masksInBattle[mask.maskID].attackDamage += masksInBattle[targetMaskID].attackDamage * 0.5;
                      masksInBattle[mask.maskID].abilityDamage += masksInBattle[targetMaskID].abilityDamage * 0.5;
                      masksInBattle[mask.maskID].protections += masksInBattle[targetMaskID].protections * 0.5;
                      masksInBattle[mask.maskID].magicResist += masksInBattle[targetMaskID].magicResist * 0.5;
                      masksInBattle[mask.maskID].health += masksInBattle[targetMaskID].health * 0.5;
                      masksInBattle[mask.maskID].currentHealth += masksInBattle[targetMaskID].health * 0.5;
                      masksInBattle[mask.maskID].speed += masksInBattle[targetMaskID].speed * 0.5;
                      masksInBattle[mask.maskID].speed = Math.min(masksInBattle[mask.maskID].speed, 100); // Cap speed at 100

                      masksInBattle[targetMaskID].attackDamage = 0;
                      masksInBattle[targetMaskID].abilityDamage = 0;
                      masksInBattle[targetMaskID].protections = 0;
                      masksInBattle[targetMaskID].magicResist = 0;
                      masksInBattle[targetMaskID].health = 1;
                      masksInBattle[targetMaskID].currentHealth = 0;
                      masksInBattle[targetMaskID].speed = 0;                      
                    }
                }
                console.log(`Total damage dealt by Mask ${maskID}: ${totalDamage}`); // Log totalDamage
                battleMessage = `Mask ${maskID} dealt ${totalDamage} to Mask ${targetMaskID}`; // Add message to battleMessage
                      
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              });
            }
            else if (skill.skillName === 'Sharp Shooter') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                    let damage = 0;
                    damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                    reduction = targetMask.protections;
                    let finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                    console.log(`Mask ${maskID} did ${damage} damage to Mask ${targetMaskID}, reduced by ${reduction}, final damage ${finalDamage} and stole Buff Stacks`);
                    totalDamage += finalDamage; // Add finalDamage to totalDamage
                    if (masksInBattle[targetMaskID].protections > 0) {
                      masksInBattle[targetMaskID].protections -= masksInBattle[mask.maskID].attackDamage;
                      masksInBattle[targetMaskID].protections = Math.max(masksInBattle[targetMaskID].protections, 0); // cap protections at 0
                    }
                    else{
                      finalDamage = mask.attackDamage * (skill.mainStatPercentage / 100) * 10;
                      totalDamage = finalDamage;
                    }
                    masksInBattle[targetMaskID].currentHealth = Math.max(masksInBattle[targetMaskID].currentHealth - finalDamage, 0); // Reduce target mask's currentHealth and cap at 0
                }
                masksInBattle[mask.maskID].currentHealth = Math.min(masksInBattle[mask.maskID].currentHealth + totalDamage * masksInBattle[mask.maskID].buffStacks / 5, masksInBattle[mask.maskID].health); // Heal mask by totalDamage
                console.log(`Total damage dealt by Mask ${maskID}: ${totalDamage}`); // Log totalDamage
                battleMessage = `Mask ${maskID} dealt ${totalDamage} to Mask ${targetMaskID}`; // Add message to battleMessage
                      
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              });
            }
            else if (skill.skillName === 'Rupture Tendons') {
              const uniqueTargetMaskIDs = [...new Set(targetMaskIDs)]; // Ensure unique target mask IDs
              uniqueTargetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                    let damage = 0;
                    damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                    reduction = targetMask.protections;
                    const finalDamage = Math.max(damage - reduction, 0) * 10; // Ensure damage is not negative
                    console.log(`Mask ${maskID} did ${damage} damage to Mask ${targetMaskID}, reduced by ${reduction}, final damage ${finalDamage}`);
                    totalDamage += finalDamage; // Add finalDamage to totalDamage
                    masksInBattle[targetMaskID].currentHealth = Math.max(masksInBattle[targetMaskID].currentHealth - finalDamage, 0); // Reduce target mask's currentHealth and cap at 0
                    masksInBattle[targetMaskID].movement = 0; // Set movement to 0
                    masksInBattle[targetMaskID].speed = masksInBattle[targetMaskID].speed / 2; // Halve speed
                    masksInBattle[targetMaskID].bleedStacks += 10; // Add bleed stacks
                    console.log(`Total damage dealt by Mask ${maskID}: ${totalDamage}`); // Log totalDamage
                    battleMessage = `Mask ${maskID} dealt ${totalDamage} to Mask ${targetMaskID} and halved their speed!`; // Add message to battleMessage
                }
              });
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
            }
            else if (skill.skillName === 'Soul Siphon') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask && targetMask.team !== mask.team) {
                  const maxHealthReduction = targetMask.health * 0.1; // Reduce max health by 10%
                  targetMask.health -= maxHealthReduction;
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - maxHealthReduction, 0); // Decrease current health by the same amount
                  mask.health += maxHealthReduction; // Increase user's max health by the total reduced amount
                  mask.currentHealth = Math.min(mask.currentHealth + maxHealthReduction, mask.health); // Adjust current health to not exceed new max health
                  console.log(`Mask ${maskID} used Soul Siphon on all enemy Masks, reducing their  max health by 10% and giving it to himself`);
                }

              battleMessage = `Mask ${maskID} stole 10% Max Health from all enemies and gave it to himself!`; // Add message to battleMessage
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
              });
              io.emit('masksInBattleUpdate', Object.values(masksInBattle)); // Emit updated masksInBattle
            }
            else if (skill.skillName === 'Searing Wave') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask && targetMask.team !== mask.team) {
                  let damage = 0;
                  damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                  reduction = targetMask.protections;
                  const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0); // Decrease current health by the same amount
                  targetMask.burnStacks += 1; // Add burn stacks
                  console.log(`Mask ${maskID} used Searing Wave on all enemy Masks, dealing ${finalDamage} damage`);
                  totalDamage += finalDamage; // Add finalDamage to totalDamage
                  battleMessage = `Mask ${maskID} used Searing Wave on all enemy Masks, dealing ${totalDamage} damage to all enemies and burning them`; // Add message to battleMessage
                }
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
              });
              io.emit('masksInBattleUpdate', Object.values(masksInBattle)); // Emit updated masksInBattle
            }
            else if (skill.skillName === 'I am Death!') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  let damage = mask.abilityDamage * (skill.mainStatPercentage / 100);
                  const reduction = targetMask.magicResist;
                  const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
            
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0); // Reduce target's health
            
                  let healAmount = 0;
                  if (targetMask.bleedStacks > 0) {
                    healAmount = finalDamage; // Heal for 100% of the damage dealt
                    mask.currentHealth = Math.min(mask.currentHealth + healAmount, mask.health); // Cap healing at max health
                  }
                  targetMask.bleedStacks += 5; // Apply 5 bleed stacks
            
                  console.log(`Mask ${maskID} used I am Death! on Mask ${targetMaskID}, dealing ${finalDamage} damage and applying 5 bleed stacks.`);
                  if (healAmount > 0) {
                    console.log(`Mask ${maskID} healed for ${healAmount} due to attacking a bleeding target.`);
                  }
            
                  battleMessage = `Mask ${maskID} used I am Death! on Mask ${targetMaskID}, dealing ${finalDamage} damage, applying 5 bleed stacks, and healing for ${healAmount}.`;
                  if (battleMessage) {
                    console.log(battleMessage); // Log battleMessage if not empty
                    io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                  }
                }
              });
            }
            else if (skill.skillName === 'Oath Bearer') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  let damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                  const reduction = targetMask.protections;
                  const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0); // Reduce target's health
            
                  const alliesAlive = Object.values(masksInBattle).filter(
                    ally => ally.team === mask.team && ally.maskID !== mask.maskID && ally.currentHealth > 0
                  );
            
                  if (alliesAlive.length > 0) {
                    // Increase protections of all allies by 50% of the user's protections
                    alliesAlive.forEach(ally => {
                      ally.protections += mask.protections * 0.5;
                    });
                    console.log(`Mask ${maskID} used Oath Bearer, dealing ${finalDamage} damage to Mask ${targetMaskID} and increasing allies' protections.`);
                    battleMessage = `Mask ${maskID} used Oath Bearer, dealing ${finalDamage} damage to Mask ${targetMaskID} and increasing allies' protections.`;
                  } else {
                    // Increase user's attack damage by 100%
                    mask.attackDamage += mask.attackDamage;
                    console.log(`Mask ${mask.maskID} used Oath Bearer, dealing ${finalDamage} damage to Mask ${targetMaskID} and doubling its attack damage.`);
                    battleMessage = `Mask ${maskID} used Oath Bearer, dealing ${finalDamage} damage to Mask ${targetMaskID} and doubling its attack damage.`;
                  }
            
                  if (battleMessage) {
                    console.log(battleMessage); // Log battleMessage if not empty
                    io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                  }
                }
              });
            }
            else if (skill.skillName === 'Painful Breath') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                    let damage = 0;
                    damage = mask.abilityDamage * (skill.mainStatPercentage / 100);
                    reduction = targetMask.magicResist;
                    let finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                    console.log(`Mask ${maskID} did ${damage} damage to Mask ${targetMaskID}, reduced by ${reduction}, final damage ${finalDamage} and increased their poison stacks`);
                    totalDamage += finalDamage; // Add finalDamage to totalDamage

                    masksInBattle[targetMaskID].poisonStacks += 1; // Add poison stacks
                    masksInBattle[targetMaskID].poisonStacks *= 2; // Add poison stacks
                    masksInBattle[targetMaskID].currentHealth = Math.max(masksInBattle[targetMaskID].currentHealth - finalDamage, 0); // Reduce target mask's currentHealth and cap at 0
                }
                masksInBattle[mask.maskID].currentHealth = Math.min(masksInBattle[mask.maskID].currentHealth + totalDamage * masksInBattle[mask.maskID].buffStacks / 5, masksInBattle[mask.maskID].health); // Heal mask by totalDamage
                console.log(`Total damage dealt by Mask ${maskID}: ${totalDamage}`); // Log totalDamage
                battleMessage = `Mask ${maskID} dealt ${totalDamage} to Mask ${targetMaskID}`; // Add message to battleMessage
                      
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              });
            }
            else if (skill.skillName === 'Blinding Strikes') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  let damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                  const reduction = targetMask.protections;
                  const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
            
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0); // Reduce target's health
                  console.log(`Mask ${maskID} used Blinding Strikes on Mask ${targetMaskID}, dealing ${finalDamage} damage.`);
            
                  // Add targetMaskID to the tracking array
                  blindingStrikesTargets.push(targetMaskID);
            
                  // Check if 5 targets have been hit
                  if (blindingStrikesTargets.length >= 5) {
                    blindingStrikesTargets.forEach(hitMaskID => {
                      const hitMask = masksInBattle[hitMaskID];
                      if (hitMask && hitMask.currentHealth > 0) { // Ensure the mask is not dead
                        const bonusDamage = mask.attackDamage * 10; // 1000% of attack damage
                        hitMask.currentHealth = Math.max(hitMask.currentHealth - bonusDamage, 0); // Apply bonus damage
                        console.log(`Mask ${maskID} dealt ${bonusDamage} bonus damage to Mask ${hitMaskID} due to Blinding Strikes.`);
                      }
                    });
                    blindingStrikesTargets = []; // Clear the tracking array after applying bonus damage
                  }
            
                  battleMessage = `Mask ${maskID} used Blinding Strikes on Mask ${targetMaskID}, dealing ${finalDamage} damage.`;
                  if (battleMessage) {
                    console.log(battleMessage); // Log battleMessage if not empty
                    io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                  }
                }
              });
            }
            else if (skill.skillName === 'Elusive Archer') {              
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                    let damage = 0;
                    let reduction = 0;
                    damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                    reduction = targetMask.protections;

                    let finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative

                    totalDamage += finalDamage; // Add finalDamage to totalDamage
                    masksInBattle[targetMaskID].currentHealth = Math.max(masksInBattle[targetMaskID].currentHealth - finalDamage, 0); // Reduce target mask's currentHealth and cap at 0

                    if (masksInBattle[targetMaskID].currentHealth === 0) {
                      masksInBattle[targetMaskID].action = false;
                      masksInBattle[targetMaskID].bonusAction = false;
                      masksInBattle[targetMaskID].movement = 0;
                      masksInBattle[targetMaskID].currentSpeed = 0;
                      masksInBattle[mask.maskID].untargetable = true;
                    }

                    masksInBattle[mask.maskID].untargetable = true; // Set mask to untargetable
                    console.log(`Total damage dealt by Mask ${maskID}: ${totalDamage}`); // Log totalDamage
                    battleMessage = `Mask ${maskID} used Elusive Archer on Mask ${targetMaskID}, dealing ${finalDamage} damage.`;
                          
                    if (battleMessage) {
                      console.log(battleMessage); // Log battleMessage if not empty
                      io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                    }
                }
              });
            }
            else if (skill.skillName === 'Stand and Fight') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  let damage = mask.abilityDamage * (skill.mainStatPercentage / 100);
                  const reduction = targetMask.magicResist;
                  const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0); // Reduce target's health
                  console.log(`Mask ${maskID} used Stand and Fight on Mask ${targetMaskID}, dealing ${finalDamage} damage.`);
                }
              });
            
              // Check for dead allies on the same team
              const deadAllies = Object.values(masksInBattle).filter(
                ally => ally.team === mask.team && ally.currentHealth === 0
              );
            
              if (deadAllies.length > 0) {
                const allyToRevive = deadAllies[0]; // Revive the first dead ally found
                allyToRevive.currentHealth = allyToRevive.health; // Restore full health
                allyToRevive.currentSpeed = allyToRevive.speed; // Restore speed
                console.log(`Mask ${maskID} revived Mask ${allyToRevive.maskID} using Stand and Fight.`);
                io.emit('battleMessage', `Mask ${maskID} revived Mask ${allyToRevive.maskID} using Stand and Fight.`);
              }
            }
            else if (skill.skillName === 'Grounded Slash') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  let damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                  const reduction = targetMask.protections;
                  const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0); // Reduce target's heanot found for maskID:lth
                  mask.speed -= 10; // Reduce user's speed by 10
                  mask.speed = Math.max(mask.speed, 5); // Ensure speed is not less than 5
                  console.log(`Mask ${mask.maskID} used Grounded Slash on Mask ${targetMaskID}, dealing ${finalDamage} damage and reducing its own speed.`);
            
                  if (targetMask.currentHealth === 0) {
                    mask.speed = 100;
                    // Add skill with ID 9998 to the user's active skills, skill list, and maskSkills
                    if (!mask.activeSkills.includes(9998)) {
                      // set this masks photo to MountedKnight.png
                      mask.photo = '/assets/images/MountedKnight.png';
                      mask.activeSkills.push(9998);
                      if (!mask.skillList) mask.skillList = []; // Ensure skillList exists
                      mask.skillList.push(9998);

                      if (!maskSkills[maskID]) maskSkills[maskID] = [];
                      maskSkills[maskID].push({
                        skillID: 9998,
                        skillName: 'Mounted Slash',
                        description: 'Slash at the target with your sword dealing Attack Damage to them. Because you are mounted you do not need to focus on your Stance as much and can strike freely now.',
                        mainStat: 'Attack Damage',
                        mainStatPercentage: 750,
                        cooldown: 0,
                        amountOfStrikes: 1,
                        onHitEffect: 'None',
                        isMultiTarget: false,
                      });

                      console.log(`Mask ${maskID} has mounted and gained the skill with ID 9998.`);
                      io.emit('battleMessage', `Mask ${maskID} has mounted and gained the skill Mounted Slash.`);
                    }
                  }
                }
              });
            }
            else if (skill.skillName === 'Vein Slash') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  let damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                  if (targetMask.bleedStacks > 0) {
                    damage *= 2; // Double damage if target has bleed stacks
                  }
                  targetMask.bleedStacks += 2;
                  const reduction = targetMask.protections;
                  const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0); // Reduce target's health
                  console.log(`Mask ${mask.maskID} used Vein Slash on Mask ${targetMaskID}, dealing ${finalDamage} damage.`);
                }
              });
            }
            else if (skill.skillName === 'Lurk in the Shadows') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  let damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                  if (mask.untargetable > 0) {
                    damage *= 2; // Double damage if mask is untargetable
                  }
                  const reduction = targetMask.protections;
                  const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0); // Reduce target's health
                  console.log(`Mask ${maskID} used Lurk in the Shadows on Mask ${targetMaskID}, dealing ${finalDamage} damage.`);
                }
              });
            }
            else if (skill.skillName == 'Command') {
              //Set all allies action to true
              const allies = Object.values(masksInBattle).filter(mask => mask.team === masksInBattle[maskID].team && mask.maskID !== maskID);
              allies.forEach(ally => {
                ally.action = true;
                ally.bonusAction = true;
                ally.movement = 1;
                ally.currentSpeed = 100; // Reset speed to original value
              });
            }
            else if (skill.skillName === 'Black Hole') {
              // heal the user of the skill by 5 x blackHoleDamage
              mask.currentHealth = Math.min(mask.currentHealth + (blackHoleDamage * 3), mask.health); // Heal the user of the skill

            }
            else if (skill.skillName === 'The Black Plague') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  let damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                  const reduction = targetMask.protections;
                  const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0); // Reduce target mask's currentHealth and cap at 0
                  battleMessage = `Mask ${maskID} dealt ${finalDamage} damage to Mask ${targetMaskID} but did not infect it with the plague.`;

                  if (!infectedByPlague.includes(targetMaskID)) {
                    if (Math.random() < 0.5) { // 50% chance to infect
                      infectedByPlague.push(targetMaskID); // Add target mask's maskID to infectedByPlague
                      console.log(`Mask ${maskID} dealt ${finalDamage} damage to Mask ${targetMaskID} and infected it with the Black Plague.`);
                      battleMessage = `Mask ${maskID} dealt ${finalDamage} damage to Mask ${targetMaskID} and infected it with the Black Plague.`;
                    }
                  }

                  if (battleMessage) {
                    console.log(battleMessage); // Log battleMessage if not empty
                    io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                  }
                }
              });
            }
            else if (skill.skillName === 'Detached Soul') {
              if (!detachedSoul) {
              mask.magicResist *= 10;
              mask.protections *= 10;
              detachedSoul = true;
              } else {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                let damage = mask.attackDamage;
                let reduction = targetMask.protections;
                const finalDamage = Math.max(damage - reduction, 0);
                targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0);
                battleMessage = `Mask ${maskID} used Detached Soul on Mask ${targetMaskID}, dealing ${finalDamage} damage.`;
                if (battleMessage) {
                  console.log(battleMessage);
                  io.emit('battleMessage', battleMessage);
                }
                }
              });
              }
            }
            else if (skill.skillName === 'Unforseen Strike') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  // Exception: This skill deals true damage (ignores protections)
                  let damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                  const finalDamage = Math.max(damage, 0);

                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0);

                  // If the target is killed
                  if (targetMask.currentHealth === 0) {
                    mask.action = true;
                    mask.bonusAction = true;
                    mask.movement = mask.speed;
                    // Reset this skill's cooldown if it was on cooldown
                    if (mask.cooldowns[skillID] && mask.cooldowns[skillID] !== 0) {
                      mask.cooldowns[skillID] = 0;
                    }
                    console.log(mask.cooldowns);
                  }

                  battleMessage = `Mask ${maskID} used Detached Soul on Mask ${targetMaskID}, dealing ${finalDamage} true damage.`;
                  if (battleMessage) {
                    console.log(battleMessage);
                    io.emit('battleMessage', battleMessage);
                  }
                }
              });
            }
            else if (skill.onHitEffect === 'Heal') {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                    let heal = 0;
                    if (skill.mainStat === 'Ability Damage') {
                      heal = mask.abilityDamage * (skill.mainStatPercentage / 100);
                    } else if (skill.mainStat === 'Attack Damage') {
                      heal = mask.attackDamage * (skill.mainStatPercentage / 100);
                    }
                    const finalHeal = Math.max(heal, 0); // Ensure heal is not negative
                    console.log(`Mask ${maskID} healed for ${heal} to Mask ${targetMaskID}`);
                    totalHeal += finalHeal; // Add finalDamage to totalDamage
                    masksInBattle[targetMaskID].currentHealth = Math.min(masksInBattle[targetMaskID].currentHealth + finalHeal, masksInBattle[targetMaskID].health); // Reduce target mask's currentHealth and cap at 0
                }
                console.log(`Total healed by Mask ${maskID}: ${totalHeal}`); // Log totalDamage
                battleMessage = `Mask ${maskID} healed ${totalHeal} to Mask ${targetMaskID}`; // Add message to battleMessage
                      
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              });
            }
            else {
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                    let damage = 0;
                    let reduction = 0;
                    if (skill.mainStat === 'Ability Damage') {
                        damage = mask.abilityDamage * (skill.mainStatPercentage / 100);
                        reduction = targetMask.magicResist;
                    } else if (skill.mainStat === 'Attack Damage') {
                        damage = mask.attackDamage * (skill.mainStatPercentage / 100);
                        reduction = targetMask.protections;
                    }
                    const finalDamage = Math.max(damage - reduction, 0); // Ensure damage is not negative
                    console.log(`Mask ${maskID} did ${damage} damage to Mask ${targetMaskID}, reduced by ${reduction}, final damage ${finalDamage}`);
                    totalDamage += finalDamage; // Add finalDamage to totalDamage
                    masksInBattle[targetMaskID].currentHealth = Math.max(masksInBattle[targetMaskID].currentHealth - finalDamage, 0); // Reduce target mask's currentHealth and cap at 0

                    // Apply on-hit effects
                    switch (skill.onHitEffect) {
                        case 'Stun':
                            masksInBattle[targetMaskID].stunStacks += 1;
                            masksInBattle[targetMaskID].action = false;
                            masksInBattle[targetMaskID].bonusAction = false;
                            masksInBattle[targetMaskID].movement = 0;
                            break;
                        case 'Burn':
                            masksInBattle[targetMaskID].burnStacks += 1;
                            break;
                        case 'Poison':
                            masksInBattle[targetMaskID].poisonStacks += 1;
                            break;
                        case 'Bleed':
                           
                            masksInBattle[targetMaskID].bleedStacks += 1;
                            break;
                        case 'Buff Stack':
                            masksInBattle[maskID].buffStacks += 1;
                            console.log(`Mask ${maskID} gained a buff stack`);
                            break;
                    }
                    if (masksInBattle[targetMaskID].currentHealth === 0) {
                      masksInBattle[targetMaskID].action = false;
                      masksInBattle[targetMaskID].bonusAction = false;
                      masksInBattle[targetMaskID].movement = 0;
                      masksInBattle[targetMaskID].currentSpeed = 0;
                    }
                }
                console.log(`Total damage dealt by Mask ${maskID}: ${totalDamage}`); // Log totalDamage
                battleMessage = `Mask ${maskID} dealt ${totalDamage} to Mask ${targetMaskID}`; // Add message to battleMessage
                      
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              });
            }            
            // Apply cooldown to the used skill, except for Unforseen Strike
            if (skill.skillName !== 'Unforseen Strike') {
              mask.cooldowns[skillID] = skill.cooldown + 1;
            }
            mask.action = false; // Set action to false after using a skill
            io.emit('masksInBattleUpdate', Object.values(masksInBattle)); // Emit updated masksInBattle to all users
        }
    });

    socket.on('updateTeams', (teamChanges) => {
      teamChanges.forEach(change => {
        if (masksInBattle[change.maskID]) {
          masksInBattle[change.maskID].team = change.team;
        }
      });
      console.log('Updated teams:', Object.values(masksInBattle).map(mask => ({ maskID: mask.maskID, team: mask.team })));
      io.emit('masksInBattleUpdate', Object.values(masksInBattle));
    });

    socket.on('mapChange', (isUniversityMap) => {
      io.emit('mapChange', isUniversityMap);
    });

    socket.on('requestLiveUsers', () => {
      socket.emit('liveUsersUpdate', liveUsers.map(user => ({ username: user.username })));
    });

    socket.on('removeMask', (maskID) => {
        if (masksInBattle[maskID]) {
            delete masksInBattle[maskID]; // Remove the mask from masksInBattle
            console.log(`Mask ${maskID} removed from battle`);
            io.emit('masksInBattleUpdate', Object.values(masksInBattle)); // Emit updated masksInBattle to all users
        } else {
            console.log(`Mask ${maskID} not found in battle`);
        }
    });

    socket.on('removeMaskFromUser', async (maskID) => {
      try {
        const characterInfo = await CharacterInfo.findOne({ where: { maskID } });
        if (characterInfo) {
          await CharacterInfo.update({ maskID: null }, { where: { maskID } });
          console.log(`Mask ${maskID} removed from CharacterInfo`);
        } else {
          console.log(`No character found with maskID: ${maskID}`);
        }
      } catch (error) {
        console.error('Error removing mask:', error);
      }
    });

    socket.on('resetHealth', async () => {
      try {
        await MaskList.update(
          { currentHealth: sequelize.col('health') }, // Set currentHealth to the value of health
          { where: {} } // Apply to all rows
        );
        console.log('All masks have been reset to full health');
        
        
        masksInBattle = {};
        blindingStrikesTargets = []; // Clear the tracking array when the battle ends
        blackHoleDamage = 0;
        detachedSoul = false;
        stormSize = 0;
        forestsTiming = 0;

        io.emit('masksInBattleUpdate', Object.values(masksInBattle));
      } catch (error) {
        console.error('Error resetting mask health:', error);
      }
    });

});

// Function to broadcast user updates
function broadcastUserUpdate() {
    const userUpdateMessage = { type: 'userUpdate', users: liveUsers.map(user => ({ username: user.username, role: user.role })) };
    io.emit('userUpdate', userUpdateMessage);
    io.emit('liveUsersUpdate', liveUsers.map(user => ({ username: user.username }))); // Emit live users update
}

// Redirect HTTP to HTTPS
// const httpApp = express();
// httpApp.use((req, res) => {
//   res.redirect(`https://${req.headers.host}${req.url}`);
// });
// const httpServer = http.createServer(httpApp);
// httpServer.listen(80, '0.0.0.0', () => {
//   console.log('HTTP server is running on port 80 and redirecting to HTTPS');
// });

const httpApp = express();
httpApp.use('/.well-known/acme-challenge', express.static(path.join(__dirname, '.well-known/acme-challenge')));
const httpServer = http.createServer(httpApp);
httpServer.listen(80, '0.0.0.0', () => {
  console.log('HTTP server is running on port 80 for ACME challenge');
});

// Start the server
server.listen(PORT, '0.0.0.0', () => { // Ensure it listens on all interfaces
    console.log(`Server is running on https://${localIP}:${PORT}`);
});

app.get('/images', async (req, res) => {
  try {
    const images = await Images.findAll();
    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).send('Failed to fetch images');
  }
});

// Endpoint to fetch character ID by character name
app.get('/character-id/:characterName', async (req, res) => {
  const { characterName } = req.params;
  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }
    res.json({ characterID: characterInfo.characterID, maskID: characterInfo.maskID });
  } catch (error) {
    console.error('Error fetching character with that Name:', error);
    res.status(500).send('Failed to fetch character with that Name');
  }
});

app.get('/all-characters', async (req, res) => {
  try {
    const characters = await CharacterInfo.findAll({ attributes: ['characterName', 'characterID', 'photo'] }); // Include 'photo' attribute
    res.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).send('Failed to fetch characters');
  }
});

app.post('/create-character', upload.single('image'), async (req, res) => {
  const { characterName, race, class: characterClass, level, familyMembers, friendMembers, itemInventory, skillList } = req.body;
  const photo = `/assets/images/${req.file.filename}`; // Ensure correct photo path

  try {
    const newCharacter = await CharacterInfo.create({
      characterName,
      race,
      class: characterClass,
      level: parseInt(level, 10),
      photo,
      familyMembers: JSON.parse(familyMembers),
      friendMembers: JSON.parse(friendMembers),
      itemInventory: JSON.parse(itemInventory),
      skillList: JSON.parse(skillList)
    });

    // Initialize StatsSheet with 0 values for each stat
    await StatsSheet.create({
      characterID: newCharacter.characterID,
      strength: 0,
      athletics: 0,
      dexterity: 0,
      acrobatics: 0,
      sleightOfHand: 0,
      stealth: 0,
      constitution: 0,
      intelligence: 0,
      history: 0,
      investigation: 0,
      nature: 0,
      wisdom: 0,
      animalHandling: 0,
      insight: 0,
      medicine: 0,
      perception: 0,
      survival: 0,
      charisma: 0,
      deception: 0,
      intimidation: 0,
      performance: 0,
      persuasion: 0,
    });

    res.status(201).json({ message: 'Character created successfully', character: newCharacter });
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).send('Failed to create character');
  }
});

app.put('/character-info/:characterName/family-members', async (req, res) => {
  const { characterName } = req.params;
  const { familyMemberId } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const updatedFamilyMembers = [...characterInfo.familyMembers, familyMemberId];
    await CharacterInfo.update({ familyMembers: updatedFamilyMembers }, { where: { characterName } });

    res.status(200).json({ message: 'Family member added successfully' });
  } catch (error) {
    console.error('Error adding family member:', error);
    res.status(500).send('Failed to add family member');
  }
});

app.put('/character-info/:characterName/friend-members', async (req, res) => {
  const { characterName } = req.params;
  const { friendMemberId } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const updatedFriendMembers = [...characterInfo.friendMembers, friendMemberId];
    await CharacterInfo.update({ friendMembers: updatedFriendMembers }, { where: { characterName } });

    res.status(200).json({ message: 'Friend member added successfully' });
  } catch (error) {
    console.error('Error adding friend member:', error);
    res.status(500).send('Failed to add friend member');
  }
});

app.put('/character-info/:characterName/inventory-items', async (req, res) => {
  const { characterName } = req.params;
  const { itemId } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterName } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const updatedInventoryItems = [...characterInfo.itemInventory, itemId];
    await CharacterInfo.update({ itemInventory: updatedInventoryItems }, { where: { characterName } });

    res.status(200).json({ message: 'Inventory item added successfully' });
  } catch (error) {
    console.error('Error adding inventory item:', error);
    res.status(500).send('Failed to add inventory item');
  }
});

app.post('/character-info/:characterID/inventory-item', async (req, res) => {
  const { characterID } = req.params;
  const { itemName, type, mainStat, description, damage, photo } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
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
    await CharacterInfo.update({ itemInventory: updatedInventoryItems }, { where: { characterID } });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding inventory item:', error);
    res.status(500).send('Failed to add inventory item');
  }
});

app.delete('/character-info/:characterID/inventory-item/:itemID', async (req, res) => {
  const { characterID, itemID } = req.params;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const updatedInventoryItems = characterInfo.itemInventory.filter(id => id !== parseInt(itemID));
    await CharacterInfo.update({ itemInventory: updatedInventoryItems }, { where: { characterID } });

    await ItemList.destroy({ where: { itemID } });

    res.status(200).json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).send('Failed to delete inventory item');
  }
});

app.post('/character-info/:characterID/skill', async (req, res) => {
  const { characterID } = req.params;
  const { skillName, mainStat, description, diceRoll } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
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
    await CharacterInfo.update({ skillList: updatedSkillList }, { where: { characterID } });

    res.status(201).json(newSkill);
  } catch (error) {
    console.error('Error adding skill:', error);
    res.status(500).send('Failed to add skill');
  }
});

app.delete('/character-info/:characterID/skill/:skillID', async (req, res) => {
  const { characterID, skillID } = req.params;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const updatedSkillList = characterInfo.skillList.filter(id => id !== parseInt(skillID));
    await CharacterInfo.update({ skillList: updatedSkillList }, { where: { characterID } });

    await SkillList.destroy({ where: { skillID } });

    res.status(200).json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).send('Failed to delete skill');
  }
});

app.get('/get-notes/:username', async (req, res) => {
  const { username } = req.params;

  try {
    if (username === "Dungeon Master") {
      // Fetch all notes if the user is Dungeon Master
      const notes = await Note.findAll();
      return res.json(notes);
    }

    const userInfo = await User.findOne({ where: { username: username } });
    if (!userInfo) {
      return res.status(404).send('User info not found');
    }

    const notes = await Note.findAll({ where: { noteID: userInfo.noteList } });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).send('Failed to fetch notes');
  }
});

// Endpoint to add a new note
app.post('/add-note/:username', async (req, res) => {
  const { username } = req.params;
  const { title, description } = req.body;

  try {
    const userInfo = await User.findOne({ where: { username: username } });
    if (!userInfo) {
      return res.status(404).send('User info not found');
    }

    const newNote = await Note.create({
      title,
      description,
    });

    const currentNoteList = Array.isArray(userInfo.noteList) ? userInfo.noteList : [];
    const updatedNoteList = [...currentNoteList, newNote.noteID];
    await User.update({ noteList: updatedNoteList }, { where: { username: username } });

    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).send(`Failed to save note: ${error.message}`);
  }
});

app.put('/update-note/:username/:noteId', async (req, res) => {
  const { username, noteId } = req.params;
  const { title, description } = req.body;
  const parsedNoteId = parseInt(noteId, 10);

  if (isNaN(parsedNoteId)) {
    return res.status(400).send('Invalid noteId');
  }

  // If Dungeon Master, do not update, just return 200
  if (username === "Dungeon Master") {
    return res.status(200).json({ message: 'Note update skipped for Dungeon Master' });
  }

  try {
    const userInfo = await User.findOne({ where: { username: username } });
    if (!userInfo) {
      return res.status(404).send('User info not found');
    }

    await Note.update({ title, description }, { where: { noteID: parsedNoteId } });

    res.status(200).json({ message: 'Note updated successfully' });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).send('Failed to update note');
  }
});

app.delete('/delete-note/:username/:noteId', async (req, res) => {
  const { username, noteId } = req.params;

  // If Dungeon Master, do not update, just return 200
  if (username === "Dungeon Master") {
    return res.status(200).json({ message: 'Note delete skipped for Dungeon Master' });
  }

  try {
    const userInfo = await User.findOne({ where: { username: username } });
    if (!userInfo) {
      return res.status(404).send('User info not found');
    }

    await Note.destroy({ where: { noteID: noteId } });

    const updatedNoteList = userInfo.noteList.filter(noteID => noteID !== parseInt(noteId));
    await User.update({ noteList: updatedNoteList }, { where: { username: username } });

    res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).send('Failed to delete note');
  }
});

app.post('/update-character-name', async (req, res) => {
  const { characterName, email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await CharacterInfo.update({ characterName }, { where: { characterID: user.characterID } });
    await StatsSheet.update({ characterName }, { where: { characterID: user.characterID } });

    res.status(200).json({ message: 'Character name updated successfully' });
  } catch (error) {
    console.error('Error updating character name:', error);
    res.status(500).json({ message: 'Failed to update character name' });
  }
});

app.get('/mask-details/:maskID', async (req, res) => {
  const { maskID } = req.params;
  try {
    const maskDetails = await MaskList.findOne({ where: { maskID } });
    if (!maskDetails) {
      return res.status(200).json({}); // Return an empty object if no mask is found
    }
    res.json(maskDetails);
  } catch (error) {
    console.error('Error fetching mask details:', error);
    res.status(500).send('Failed to fetch mask details');
  }
});

app.post('/character-info/:characterID/mask', async (req, res) => {
  const { characterID } = req.params;
  const { photo, passiveSkill, activeSkills, attackDamage, abilityDamage, magicResist, protections, health, speed } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    const relativePhotoPath = photo.replace(`https://${localIP}:443`, '');

    if (characterInfo.maskID) {
      // Update existing mask
      await MaskList.update(
        { photo: relativePhotoPath, passiveSkill, activeSkills, attackDamage, abilityDamage, magicResist, protections, health, speed },
        { where: { maskID: characterInfo.maskID } }
      );
      const updatedMask = await MaskList.findOne({ where: { maskID: characterInfo.maskID } });
      res.status(200).json(updatedMask);
    } else {
      // Create new mask
      const newMask = await MaskList.create({
        photo: relativePhotoPath,
        passiveSkill,
        activeSkills,
        attackDamage,
        abilityDamage,
        magicResist,
        protections,
        health,
        currentHealth: health, // Explicitly set currentHealth to health
        speed
      });
      await CharacterInfo.update({ maskID: newMask.maskID }, { where: { characterID } });
      res.status(201).json(newMask);
    }
  } catch (error) {
    console.error('Error adding/updating mask:', error);
    res.status(500).send('Failed to add/update mask');
  }
});

app.get('/mask-skill-details/:skillID', async (req, res) => {
  const { skillID } = req.params;
  try {
    const skillDetails = await MaskSkills.findOne({ where: { skillID } });
    if (!skillDetails) {
      return res.status(404).send('Skill details not found');
    }
    res.json(skillDetails);
  } catch (error) {
    console.error('Error fetching skill details:', error);
    res.status(500).send('Failed to fetch skill details');
  }
});

app.post('/populate-mask-skills', async (req, res) => {
  const skills = [
    { skillName: 'Skill 1', description: 'Description for Skill 1', mainStat: 'Strength', mainStatPercentage: 0.5, cooldown: 10 },
    { skillName: 'Skill 2', description: 'Description for Skill 2', mainStat: 'Dexterity', mainStatPercentage: 0.7, cooldown: 8 },
    // Add more skills as needed
  ];

  try {
    await MaskSkills.bulkCreate(skills);
    res.status(201).json({ message: 'Mask skills populated successfully' });
  } catch (error) {
    console.error('Error populating mask skills:', error);
    res.status(500).send('Failed to populate mask skills');
  }
});

app.get('/masks', async (req, res) => {
  try {
    const masks = await MaskList.findAll();
    res.json(masks);
  } catch (error) {
    console.error('Error fetching masks:', error);
    res.status(500).send('Failed to fetch masks');
  }
});

app.post('/mask-skills', async (req, res) => {
  const { skillName, description, mainStat, mainStatPercentage, cooldown, amountOfStrikes, onHitEffect, isMultiTarget } = req.body;
  try {
    const newSkill = await MaskSkills.create({ 
      skillName, 
      description, 
      mainStat, 
      mainStatPercentage, 
      cooldown,
      amountOfStrikes, // Add amountOfStrikes
      onHitEffect, // Add onHitEffect
      isMultiTarget // Add isMultiTarget
    });
    res.status(201).json(newSkill);
  } catch (error) {
    console.error('Error creating mask skill:', error);
    res.status(500).send('Failed to create mask skill');
  }
});

app.put('/masks/:maskID/add-skill', async (req, res) => {
  const { maskID } = req.params;
  const { skillID } = req.body;
  try {
    const mask = await MaskList.findOne({ where: { maskID } });
    if (!mask) {
      return res.status(404).send('Mask not found');
    }
    const updatedActiveSkills = mask.activeSkills ? [...mask.activeSkills, skillID] : [skillID];
    await MaskList.update({ activeSkills: updatedActiveSkills.filter(skill => skill !== null) }, { where: { maskID } });
    res.status(200).json({ message: 'Skill added to mask successfully' });
  } catch (error) {
    console.error('Error adding skill to mask:', error);
    res.status(500).send('Failed to add skill to mask');
  }
});

// Endpoint to fetch mask skills by maskID
app.get('/mask-skills/:maskID', async (req, res) => {
  const { maskID } = req.params;
  try {
    const skills = maskSkills[maskID];
    if (!skills) {
      return res.status(404).send('Mask skills not found');
    }
    res.json(skills);
  } catch (error) {
    console.error('Error fetching mask skills:', error);
    res.status(500).send('Failed to fetch mask skills');
  }
});

// Endpoint to fetch mask skills by a list of skill IDs
app.get('/mask-skills', async (req, res) => {
  const { skillIDs } = req.query;
  if (!skillIDs) {
    return res.status(400).send('skillIDs query parameter is required');
  }

  const skillIDArray = skillIDs.split(',').map(id => parseInt(id, 10));
  try {
    const skills = await MaskSkills.findAll({
      where: {
        skillID: {
          [Op.in]: skillIDArray
        }
      }
    });
    res.json(skills);
  } catch (error) {
    console.error('Error fetching mask skills:', error);
    res.status(500).send('Failed to fetch mask skills');
  }
});

app.post('/continue', async (req, res) => {
  console.log('Continuing');
  const skillNames = {};
  let battleMessage = ''; // Initialize battleMessage

  // Fetch all skills once and store them in a dictionary
  const skills = await MaskSkills.findAll();
  skills.forEach(skill => {
    skillNames[skill.skillID] = skill.skillName;
  });

  const defaultMaskIDs = [8888, 8686, 10000]; // Extract maskIDs from defaultMasks

  Object.values(masksInBattle).forEach(mask => {
  
    mask.untargetable = false; // Reset untargetable to false
    mask.action = false; // Reset action to false
    mask.bonusAction = false; // Reset bonusAction to false
    mask.movement = 0; // Reset movement to 0
    // If a default mask is dead, remove it from masksInBattle
    if (defaultMaskIDs.includes(mask.maskID) && mask.currentHealth === 0) {
      delete masksInBattle[mask.maskID]; // Remove the mask from masksInBattle
    }
    
    //Remove all masks with maskID higher than 9999 if they are dead
    if (mask.maskID > 9999 && mask.currentHealth === 0) {
      delete masksInBattle[mask.maskID]; // Remove the mask from masksInBattle
    }
    
    
    if (mask.currentHealth === 0) {
      mask.action = false; // Reset action to false
      mask.bonusAction = false; // Reset bonusAction to false
      mask.movement = 0; // Reset movement to 0
      mask.currentSpeed = 0;
      mask.activeSkills.forEach(skillID => {
        const skillName = skillNames[skillID]; // Correctly reference skillID
        if (skillName) {
          if (skillName === "Unkillable") {
            console.log(`Mask ${mask.maskID} has skill: Unkillable`);
            if (mask.currentHealth === 0) {
              const teamMembersAlive = Object.values(masksInBattle).some(targetMask => targetMask.team === mask.team && targetMask.currentHealth > 0);
              if (teamMembersAlive) {
                mask.attackDamage *= 2;
                mask.abilityDamage *= 2;
                mask.magicResist *= 2;
                mask.protections *= 2;
                mask.health *= 2;
                mask.currentHealth = mask.health;
                console.log(`Mask ${mask.maskID} has been revived with doubled stats`);
                battleMessage = `Mask ${mask.maskID} has been revived with doubled stats`;
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              }
            }
          }
          if (skillName === "Rise") {
            console.log(`Mask ${mask.maskID} has skill: Rise`);
            if (mask.currentHealth === 0) {
              const teamMembersAlive = Object.values(masksInBattle).some(targetMask => targetMask.team === mask.team && targetMask.currentHealth > 0);
              if (teamMembersAlive) {                
                Object.values(masksInBattle).forEach(targetMask => {
                  if (targetMask.team !== mask.team) {
                    targetMask.currentHealth = Math.max(targetMask.currentHealth - mask.health, 0); // Deal damage to all enemies
                  }
                });
                mask.health = mask.health + (mask.abilityDamage * 5);
                mask.currentHealth = mask.health;
                battleMessage = `Mask ${mask.maskID} has exploded their old corpse and was reborn.`;
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              }
            }
          }
        }
      });
      return;
    } else {
      // If mask.activeSkills contains a skillID, find the skill name and run the if statements
      mask.activeSkills.forEach(skillID => {
        const skillName = skillNames[skillID]; // Correctly reference skillID
        if (skillName) {
          if (skillName === "Bide") {
            console.log(`Mask ${mask.maskID} has skill: Bide`);
            if (mask.currentHealth < mask.health) {
              mask.currentHealth += mask.health * 0.1;
              mask.currentHealth = Math.min(mask.currentHealth, mask.health);
              battleMessage = `Mask ${mask.maskID} used Bide and healed for 10% of its max health`;
                      
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
            }
          }
          if (skillName === "Momentum") {
            console.log(`Mask ${mask.maskID} has skill: Momentum`);
            let speedDiff = 0;
            mask.speed += 18;
            if (mask.speed > 100) {
              speedDiff = mask.speed - 100;
              mask.speed = 100;

              mask.attackDamage += speedDiff;
              mask.abilityDamage += speedDiff;
              mask.magicResist += speedDiff;
              mask.protections += speedDiff;
            }
          }
          if (skillName === "Thick Coat") {
            console.log(`Mask ${mask.maskID} has skill: Thick Coat`);
            mask.currentHealth += (mask.health - mask.currentHealth) * 0.3;
            battleMessage = `Mask ${mask.maskID} used Thick Coat and healed for 30% of its missing health`;
                      
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Welcome the Dead") {
            console.log(`Mask ${mask.maskID} has skill: Welcome the Dead`);
            const deadMasksCount = Object.values(masksInBattle).filter(m => m.currentHealth === 0).length;
            mask.health += deadMasksCount * 0.2 * mask.attackDamage; // Increase max health by 25% of attack damage for each dead mask
            mask.currentHealth += deadMasksCount * 0.2 * mask.attackDamage; // Heal for 25% of attack damage for each dead mask
            mask.currentHealth = Math.min(mask.currentHealth, mask.health); // Cap current health at max health
            mask.currentHealth += mask.health * 0.03 * deadMasksCount;
            mask.currentHealth = Math.min(mask.currentHealth, mask.health);
            battleMessage = `Mask ${mask.maskID} used Welcome the Dead and healed for 3% of its max health and increased it's Max Health for each dead mask`;
                      
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Blinding Speed") {
            console.log(`Mask ${mask.maskID} has skill: Blinding Speed`);
            // Increase mask Attack Damage by 10% of mask.speed
            mask.attackDamage += 0.1 * mask.speed; // Increase attack damage by 10% of speed
            battleMessage = `Mask ${mask.maskID} used Blinding Speed and increased its attack damage by 10% of its speed`;
                      
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Petal Storm") {
            console.log(`Mask ${mask.maskID} has skill: Petal Storm`);
            if (mask.buffStacks >= 10) {
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.team !== mask.team) {
                  const damage = targetMask.health * 0.3;
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Heal mask and cap at mask.health
                }
              });
              mask.buffStacks = 0;
              battleMessage = `Mask ${mask.maskID} used Petal Storm and dealt damage to all enemies`;
                      
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
            }
            if (mask.buffStacks > 0) {
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.team === mask.team && targetMask.currentHealth > 0) { // Ensure target is on the same team and is alive
                  const heal = targetMask.health * 0.005 * mask.buffStacks;
                  targetMask.currentHealth = Math.min(targetMask.currentHealth + heal, targetMask.health); // Heal mask and cap at mask.health
                }
              });
              battleMessage = `Mask ${mask.maskID} used Petal Storm and healed allies for 0.5% of their max health per buff stack`;
                      
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
            }
          }
          if (skillName === "Black Hole") {
            console.log(`Mask ${mask.maskID} has skill: Black Hole`);
            // Deal blackHoleDamage to all enemies and heal mask for the same amount
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team !== mask.team && targetMask.currentHealth > 0) { // Ensure target is not on the same team and is alive
                const damage = blackHoleDamage;
                targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
                mask.currentHealth = Math.min(mask.currentHealth + (damage / 4), mask.health); // Heal mask and cap at mask.health
              }
            });
            // Cap blackHoleDamage at 100% of mask.abilityDamage

            blackHoleDamage += mask.abilityDamage * 0.025; // Increase blackHoleDamage by 5% of mask.abilityDamage
            blackHoleDamage = Math.min(mask.abilityDamage, blackHoleDamage);
            battleMessage = `Black Hole Damage: ${blackHoleDamage}`;
                      
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Nightmare") {
            console.log(`Mask ${mask.maskID} has skill: Nightmare`);
            const damage = mask.abilityDamage * 0.5 * mask.buffStacks;
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.maskID !== mask.maskID && targetMask.team !== mask.team) { // Ensure target is not on the same team
                targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
                const roll = Math.floor(Math.random() * 50) + 1;
                if (roll < mask.buffStacks) {
                  targetMask.stunStacks += 3;
                  battleMessage = `Mask ${mask.maskID} used Nightmare and feared ${targetMask.maskID}`;
                      
                  if (battleMessage) {
                    console.log(battleMessage); // Log battleMessage if not empty
                    io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                  }
                }
              }
            });
            
            battleMessage = `Mask ${mask.maskID} used Nightmare and dealt ${damage} damage to all enemies`;
                      
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }          
          if (skillName === "Oven Baked") {
            console.log(`Mask ${mask.maskID} has skill: Oven Baked`);
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team !== mask.team) {
                targetMask.burnStacks =+ 1;
              }
            });
            battleMessage = `Mask ${mask.maskID} used Oven Baked and applied burn stacks to all enemies`;
                      
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Screw the Haters") {
            console.log(`Mask ${mask.maskID} has skill: Screw the Haters`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team);
            const damage = mask.abilityDamage * 0.05 * mask.buffStacks * enemies.length;
            enemies.forEach(targetMask => {
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
              masksInBattle[targetMask.maskID] = targetMask; // Ensure the updated targetMask is added to masksInBattle
            });
            battleMessage = `Mask ${mask.maskID} used Screw the Haters and dealt ${damage} damage to all enemies`;
                      
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Balance To All") {
            console.log(`Mask ${mask.maskID} has skill: Balance To All`);
            const healAmount = (mask.speed / 100) * mask.abilityDamage / 2;
            mask.currentHealth = Math.min(mask.currentHealth + healAmount, mask.health); // Heal mask and cap at mask.health
            battleMessage = `Mask ${mask.maskID} used Balance To All and healed for ${healAmount}`;
                      
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Pick a Weapon") {
            console.log(`Mask ${mask.maskID} has skill: Pick a Weapon`);
            const damage = mask.attackDamage * 0.25;
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.maskID !== mask.maskID && targetMask.team !== mask.team) {
                targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
              }
            });
            battleMessage = `Mask ${mask.maskID} used Pick a Weapon and dealt ${damage} damage to all enemies`;
                      
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
            if (skillName === "Toxic Atmosphere") {
            console.log(`Mask ${mask.maskID} has skill: Toxic Atmosphere`);
            const uniqueEnemiesWithPoison = Object.values(masksInBattle).filter(
              targetMask => targetMask.team !== mask.team && targetMask.poisonStacks > 1
            );
            const healAmount = uniqueEnemiesWithPoison.length * 0.0025 * mask.health;
            mask.currentHealth = Math.min(mask.currentHealth + healAmount, mask.health); // Heal mask and cap at mask.health
            battleMessage = `Mask ${mask.maskID} used Toxic Atmosphere and healed for ${healAmount} based on unique enemies with poison stacks`;

            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
            }
          if (skillName === "Blinded Rage") {
            console.log(`Mask ${mask.maskID} has skill: Blinded Rage`);
            const teamMembers = Object.values(masksInBattle).filter(targetMask => targetMask.team === mask.team && targetMask.maskID !== mask.maskID);
            if (teamMembers.length > 0) {
              const randomIndex = Math.floor(Math.random() * teamMembers.length);
              const targetMask = teamMembers[randomIndex];
              const damage = mask.attackDamage * 0.25;
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
              masksInBattle[targetMask.maskID] = targetMask; // Ensure the updated targetMask is added to masksInBattle
              battleMessage = `Mask ${mask.maskID} used Blinded Rage and dealt ${damage} damage to a ally Mask ${targetMask.maskID}`;
                      
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
            }
          }
          if (skillName === "Radiant Protection") {
            console.log(`Mask ${mask.maskID} has skill: Radiant Protection`);
            mask.stunStacks = Math.max(mask.stunStacks - 3, 0);
            mask.burnStacks = Math.max(mask.burnStacks - 3, 0);
            mask.poisonStacks = Math.max(mask.poisonStacks - 3, 0);
            mask.bleedStacks = Math.max(mask.bleedStacks - 3, 0);
            battleMessage = `Mask ${mask.maskID} used Radiant Protection and reduced malicious stacks`;
                      
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Omen of Death") {
            console.log(`Mask ${mask.maskID} has skill: Omen of Death`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            let totalDamage = 0;
            if (enemies.length > 0) {
              for (let i = 0; i < mask.buffStacks; i++) {
                const randomIndex = Math.floor(Math.random() * enemies.length);
                const targetMask = enemies[randomIndex];
                const damage = mask.abilityDamage * 0.1;;
                targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
                totalDamage += damage;
                battleMessage = `Mask ${mask.maskID} used Omen of Death, dealt ${damage} damage to mask ${targetMask.maskID}`;
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              }
              console.log(totalDamage)
              mask.health += totalDamage; // Increase the max health by the total damage dealt
              mask.currentHealth = Math.min(mask.currentHealth + totalDamage, mask.health); // Heal the user by the total damage dealt
            }
          }
          if (skillName === "Stormrage") {
            console.log(`Mask ${mask.maskID} has skill: Stormrage`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            for (let i = 0; i < mask.buffStacks; i++) {
              if (enemies.length > 0) {
                const randomIndex = Math.floor(Math.random() * enemies.length);
                const targetMask = enemies[randomIndex];
                const damage = targetMask.health * 0.075;
                targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
                battleMessage = `Mask ${mask.maskID} used Stormrage and dealt ${damage} damage to mask ${targetMask.maskID}`;
                      
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              }
            }
            mask.buffStacks = 0; // Reset buffStacks after attacks
          }
          if (skillName === "Shackle Bearer") {
            console.log(`Mask ${mask.maskID} has skill: Shackle Bearer`);

            // Find the two enemy masks with the highest currentHealth
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            const sortedEnemies = enemies.sort((a, b) => b.currentHealth - a.currentHealth).slice(0, 2);

            // Increase stun stacks of the two enemy masks with the highest currentHealth
            sortedEnemies.forEach(targetMask => {
              targetMask.stunStacks += 1;
              console.log(`Increased stun stacks of mask ${targetMask.maskID} by 1`);
            });

            // Deal 50% of mask.AttackDamage as damage to all enemy masks that are currently stunned
            let totalHeal = 0;
            enemies.forEach(targetMask => {
              if (targetMask.stunStacks > 0) {
                const damage = mask.attackDamage * 0.5;
                targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
                totalHeal += mask.attackDamage * 0.25; // Heal for 25% of mask.AttackDamage
                console.log(`Dealt ${damage} damage to mask ${targetMask.maskID}`);
              }
            });

            // Heal the mask for the total heal amount
            mask.currentHealth = Math.min(mask.currentHealth + totalHeal, mask.health);
            console.log(`Mask ${mask.maskID} healed for ${totalHeal}`);

            battleMessage = `Mask ${mask.maskID} used Shackle Bearer, dealt damage to stunned enemies, and healed for ${totalHeal}`;
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Growing Knowledge") {
            mask.abilityDamage += 15;
            
            battleMessage = `Mask ${mask.maskID} used Growing Knowledge and grew it's ability power.`;
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }          
          if (skillName === "Thunderstrike") {
            console.log(`Mask ${mask.maskID} has skill: Thunderstrike`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              let damage = mask.attackDamage * 0.5;
              if (targetMask.stunStacks > 0) {
                damage = mask.attackDamage * 1.5;
              }
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
              masksInBattle[targetMask.maskID] = targetMask; // Ensure the updated targetMask is added to masksInBattle
              battleMessage = `Mask ${mask.maskID} used Thunderstrike and dealt ${damage} damage to mask ${targetMask.maskID}`;
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
            }
          }
          if (skillName === "Transform") {
            if (mask.currentHealth > 0 && mask.currentHealth <= mask.health * 0.50) {
              console.log(mask)
              mask.attackDamage = mask.attackDamage * 4;
              mask.abilityDamage = mask.abilityDamage * 4;
              mask.magicResist = mask.magicResist * 4;
              mask.protections = mask.protections * 4;
              mask.health = mask.health * 4;
              mask.speed = mask.speed * 4;
              mask.currentHealth = mask.health;
              mask.activeSkills = [9999];
              mask.photo = "/assets/images/Wolfy.png"
              
              battleMessage = `Mask ${mask.maskID} has transformed and gained more stats!`;
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
            }
          }
          if (skillName === "Ravaging Strikes") {
            console.log(`Mask ${mask.maskID} has skill: Ravaging Strikes`);
            const masksBleeding = Object.values(masksInBattle).filter(targetMask => targetMask.bleedStacks > 0);
            const healAmount = (mask.health - mask.currentHealth) * 0.2 * masksBleeding.length;
            mask.currentHealth = Math.min(mask.currentHealth + healAmount, mask.health); // Heal mask and cap at mask.health
            battleMessage = `Mask ${mask.maskID} used Ravaging Strikes and healed for ${healAmount} based on bleeding masks`;
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
            if (skillName === "The Black Plague") {
            infectedByPlague.forEach(maskID => {
              const infectedMask = masksInBattle[maskID];
              if (infectedMask) {
              const damage = infectedMask.health * 0.1; // 10% of health as damage
              infectedMask.currentHealth = Math.max(infectedMask.currentHealth - damage, 0); // Reduce currentHealth and cap at 0
              infectedMask.stunStacks += 1; // Increase stun stacks
              console.log(`Mask ${maskID} took ${damage} damage from Black Plague.`);
              }
            });

            //Attempt ot sprea dthe plague to other masks
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team !== mask.team && !infectedByPlague.includes(targetMask.maskID)) {
                const roll = Math.floor(Math.random() * 100) + 1; // Random number between 1 and 100
                if (roll <= 10) { // 25% chance to infect
                  infectedByPlague.push(targetMask.maskID);
                  console.log(`Mask ${targetMask.maskID} has been infected by the plague.`);
                  battleMessage = `Mask ${mask.maskID} used The Black Plague and infected ${targetMask.maskID}`;
                }
                if (battleMessage) { 
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              }
            });
            
          }
          if (skillName === "Destroy Magic") {
            console.log(`Mask ${mask.maskID} has skill: Destroy Magic`);
            let totalReduced = 0;
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team !== mask.team) {
                const reduction = targetMask.abilityDamage * 0.1;
                targetMask.abilityDamage -= reduction;
                totalReduced += reduction;
              }
            });
            mask.abilityDamage += totalReduced;
            battleMessage = `Mask ${mask.maskID} used Destroy Magic, reduced enemies' Ability Damage by 10%, and gained ${totalReduced} Ability Damage`;
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Too old for this") {
            console.log(`Mask ${mask.maskID} has skill: Too old for this`);
            let totalDecreasedHealth = 0;
            let enemyCombinedHealth = 0;

            // Loop through all enemy masks
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team !== mask.team && targetMask.currentHealth > 0) {
                const decreaseAmount = targetMask.health * 0.01; // Decrease health by 1%
                targetMask.health = Math.max(targetMask.health - decreaseAmount, 0); // Reduce current health and cap at 0
                targetMask.currentHealth = Math.min(targetMask.currentHealth, targetMask.health); // Ensure current health is not more than max health
                totalDecreasedHealth += decreaseAmount; // Add to total decreased health
                enemyCombinedHealth += targetMask.health; // Add to combined enemy health
              }
            });

            // Add the total decreased amount to this mask's health and current health
            mask.health += totalDecreasedHealth;
            mask.currentHealth = Math.min(mask.currentHealth + totalDecreasedHealth, mask.health); // Cap current health at max health

            // Check if the entire enemy team's combined health is less than this mask's health
            if (enemyCombinedHealth < mask.health) {
              // Kill all enemy masks
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.team !== mask.team) {
                  targetMask.currentHealth = 0;
                }
              });

              // Set all friendly masks' current health to their max health
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.team === mask.team) {
                  targetMask.currentHealth = targetMask.health;
                }
              });

              battleMessage = `Mask ${mask.maskID} is fighting against a bunch of todlers and has reaped their souls and gave it to his allies!`;
            } else {
              battleMessage = `Mask ${mask.maskID} used Too old for this, decreasing enemy health and healing itself.`;
            }

            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "I choose who lives") {
            console.log(`Mask ${mask.maskID} has skill: I choose who lives`);
            let healAmount = 0;
            
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team !== mask.team) {
                if (targetMask.currentHealth > 0 && targetMask.currentHealth < targetMask.health * 0.10) {
                  targetMask.currentHealth = 0;
                  healAmount += targetMask.health * 0.50;
                }
              }
            });
            mask.currentHealth += healAmount;
            mask.currentHealth = Math.min(mask.currentHealth, mask.health);
            battleMessage = `Mask ${mask.maskID} used I choose who lives and executed enemies and healed for ${healAmount}`;
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Discipline") {
            mask.abilityDamage += 10;
            
            battleMessage = `Mask ${mask.maskID} used Discipline and grew it's Attack Damage.`;
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Good Boy") {
            console.log(`Mask ${mask.maskID} has skill: Good Boy`);
            if (!masksInBattle[8888]) {
              const dogStats = {
                maskID: 8888,
                attackDamage: mask.abilityDamage * 0.25,
                abilityDamage: mask.abilityDamage * 0.25,
                protections: mask.abilityDamage * 0.1,
                magicResist: mask.abilityDamage * 0.1,
                health: mask.abilityDamage * 5,
                speed: 100,
                currentHealth: mask.abilityDamage * 5,
                currentSpeed: 0,
                activeSkills: [8888],
                stunStacks: 0,
                burnStacks: 0,
                poisonStacks: 0,
                bleedStacks: 0,
                buffStacks: 0,
                action: false,
                bonusAction: false,
                movement: 0,
                team: mask.team,
                cooldowns: {},
                photo: "/assets/images/Skelly-Doggo.jpg"
              };
              masksInBattle[8888] = dogStats;
              console.log(`A good boy was summoned!`);
              battleMessage = `Mask ${mask.maskID} used Good Boy`;
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
            }
            else {
              if (masksInBattle[8888].currentHealth > 0) {
                const healAmount = (mask.health - mask.currentHealth) / 2;
                mask.currentHealth = mask.health;
                masksInBattle[8888].currentHealth = Math.max(masksInBattle[8888].currentHealth - healAmount, 0);
              }
              else {
                const statIncrease = mask.abilityDamage * 0.05;
                mask.abilityDamage += statIncrease;
              }
            }
          }       
          if (skillName === "Pack Mentality") {
            console.log(`Mask ${mask.maskID} has skill: Pack Mentality`);
            if (!masksInBattle[8686]) {
              const dogStats = {
                maskID: 8686,
                attackDamage: mask.attackDamage * 0.25,
                abilityDamage: mask.attackDamage * 0.25,
                protections: mask.attackDamage * 0.1,
                magicResist: mask.attackDamage * 0.1,
                health: mask.attackDamage * 5,
                speed: 100,
                currentHealth: mask.attackDamage * 5,
                currentSpeed: 0,
                activeSkills: [8888],
                modList: [],
                stunStacks: 0,
                burnStacks: 0,
                poisonStacks: 0,
                bleedStacks: 0,
                buffStacks: 0,
                action: false,
                bonusAction: false,
                movement: 0,
                team: mask.team,
                cooldowns: {},
                photo: "/assets/images/Doggo.jpg"
              };
              masksInBattle[8686] = dogStats;
              console.log(`A Wolf Companion was summoned!`);
              battleMessage = `Mask ${mask.maskID} used Pack Mentality`;
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
            }
            else {
              if (masksInBattle[8686].currentHealth > 0) {
                const statIncrease = mask.abilityDamage * 0.1;
                mask.health += statIncrease * 2.5;
                mask.currentHealth += statIncrease * 2.5;
                mask.attackDamage += statIncrease;
                mask.currentHealth = Math.min(mask.currentHealth + statIncrease, mask.health);
                masksInBattle[8686].health += statIncrease * 2.5;
                masksInBattle[8686].currentHealth += statIncrease * 2.5;
                masksInBattle[8686].attackDamage += statIncrease;
                masksInBattle[8686].currentHealth = Math.min(masksInBattle[8686].currentHealth + statIncrease, masksInBattle[8686].health);
              }
              else {
                const statIncrease = mask.abilityDamage * 0.2;
                mask.health += statIncrease;
                mask.currentHealth += statIncrease;
                mask.attackDamage += statIncrease;
                mask.currentHealth = Math.min(mask.currentHealth + statIncrease, mask.health);
              }
            }
          }
          if (skillName === "Lord of The Undead") {
            console.log(`Mask ${mask.maskID} has skill: Lord of The Undead`);
            if (!masksInBattle[9996]) {
              const dogStats = {
                maskID: 9996,
                attackDamage: mask.attackDamage * 1,
                abilityDamage: mask.attackDamage * 1,
                protections: mask.attackDamage * 0.1,
                magicResist: mask.attackDamage * 0.1,
                health: mask.attackDamage * 5,
                speed: 100,
                currentHealth: mask.attackDamage * 5,
                currentSpeed: 0,
                activeSkills: [9996],
                stunStacks: 0,
                burnStacks: 0,
                poisonStacks: 0,
                bleedStacks: 0,
                buffStacks: 0,
                action: false,
                bonusAction: false,
                movement: 0,
                team: mask.team,
                cooldowns: {},
                photo: "/assets/images/UnderworldAlphaHound.jpg"
              };
              masksInBattle[9996] = dogStats;
              console.log(`A good boy was summoned!`);
              battleMessage = `Mask ${mask.maskID} used Lord of The Undead`;
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
            }
          }          
          if (skillName === "Underworld Ravage Strike" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Underworld Ravage Strike`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = mask.attackDamage * 1;
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              targetMask.bleedStacks += 3;
              masksInBattle[targetMask.maskID] = targetMask;
              battleMessage = `Mask ${mask.maskID} used Underworld Ravage Strike and dealt ${damage} damage to mask ${targetMask.maskID}, increasing their bleed stacks by 3`;
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
            }
          }             
          if (skillName === "Good Boy Strike" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Good Boy Strike`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = mask.attackDamage * 1;
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
              masksInBattle[targetMask.maskID] = targetMask; // Ensure the updated targetMask is added to masksInBattle
              battleMessage = `Mask ${mask.maskID} used Good Boy Strike and dealt ${damage} damage to mask ${targetMask.maskID}`;
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
            }
          }        
          if (skillName === "All Knowing Sight") {
            console.log(`Mask ${mask.maskID} has skill: All Knowing Sight`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            enemies.forEach(targetMask => {
              const stacks = ['stunStacks', 'burnStacks', 'poisonStacks', 'bleedStacks', 'buffStacks'];
              const randomStack = stacks[Math.floor(Math.random() * stacks.length)];
              targetMask[randomStack] += 1;
              console.log(`Mask ${mask.maskID} increased ${randomStack} of mask ${targetMask.maskID}`);
            });
          }      
          if (skillName === "Burning Bright") {
            console.log(`Mask ${mask.maskID} has skill: Burning Bright`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            if (enemies.length > 0) {
              const burnStacksPerEnemy = Math.ceil(mask.buffStacks / enemies.length);
              enemies.forEach(targetMask => {
                targetMask.burnStacks += burnStacksPerEnemy;
                console.log(`Mask ${mask.maskID} increased burn stacks of mask ${targetMask.maskID} by ${burnStacksPerEnemy}`);
              });
              battleMessage = `Mask ${mask.maskID} used Burning Bright and increased burn stacks of all enemies by ${burnStacksPerEnemy}`;
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
            }
          }                  
          if (skillName === "Yoink!") {
            console.log(`Mask ${mask.maskID} has skill: Yoink!`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            if (enemies.length > 0) {
              const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
              const stats = ['attackDamage', 'abilityDamage', 'protections', 'magicResist', 'health', 'speed'];
              const randomStat = stats[Math.floor(Math.random() * stats.length)];
              console.log(`Mask ${mask.maskID} is comparing ${randomStat} with mask ${randomEnemy.maskID}`);
              if (randomEnemy[randomStat] > mask[randomStat]) {
                const temp = mask[randomStat];
                mask[randomStat] = randomEnemy[randomStat];
                randomEnemy[randomStat] = temp;
                if (randomStat === 'health') {
                  const tempCurrentHealth = mask.currentHealth;
                  mask.currentHealth = randomEnemy.currentHealth;
                  randomEnemy.currentHealth = tempCurrentHealth;
                }
                console.log(`Swapped ${randomStat} between mask ${mask.maskID} and mask ${randomEnemy.maskID}`);
                battleMessage = `Mask ${mask.maskID} used Yoink! and stole ${randomStat} from mask ${randomEnemy.maskID}`;
              } else {
                randomEnemy.bleedStacks += 1;
                console.log(`Applied a bleed stack to mask ${randomEnemy.maskID}`);
                battleMessage = `Mask ${mask.maskID} used Yoink! and applied a bleed stack to mask ${randomEnemy.maskID}`;
              }
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
            }
          }
          if (skillName === "Great Oak Strike") {
            console.log(`Mask ${mask.maskID} has skill: Great Oak Strike`);
            mask.magicResist += 5;
            mask.protections += 5;
            battleMessage = `Mask ${mask.maskID} used Great Oak Strike and grew it's Magic Resist and Protections.`;
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          }
          if (skillName === "Scale Up") {
            console.log(`Mask ${mask.maskID} has skill: Scale Up`);
            if (mask.magicResist >= 100 && mask.protections >= 200) {
              mask.magicResist = 20;
              mask.protections = 20;
              mask.attackDamage = mask.attackDamage * 2;
              mask.currentHealth += mask.attackDamage * 2;
              mask.currentHealth = Math.min(mask.currentHealth, mask.health);
              battleMessage = `Mask ${mask.maskID} used Scale Up and doubled it's Attack Damage.`;
            }
            else {
              mask.magicResist += 20;
              mask.protections += 20;
              battleMessage = `Mask ${mask.maskID} used Scale Up and grew it's Magic Resist and Protections.`;
            }
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          } 
          if (skillName === "Redemption") {
            console.log(`Mask ${mask.maskID} has skill: Redemption`);
            for (let i = 0; i < mask.buffStacks; i++) {
              const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
              if (enemies.length > 0) {
                const randomIndex = Math.floor(Math.random() * enemies.length);
                const targetMask = enemies[randomIndex];
                const damage = mask.abilityDamage * 0.20;
                targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
                battleMessage = `Mask ${mask.maskID} used Redemption and dealt ${damage} damage to mask ${targetMask.maskID} and healed itself!`;
                if (battleMessage) {
                  console.log(battleMessage); // Log battleMessage if not empty
                  io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
                }
              }
            }
            mask.currentHealth += mask.health * mask.buffStacks * 0.01;
          } 
          if (skillName === "Commander's Rage") {
            console.log(`Mask ${mask.maskID} has skill: Commander's Rage`);
            mask.health += 50 * mask.buffStacks;
            mask.currentHealth += 50 * mask.buffStacks;
            battleMessage = `Mask ${mask.maskID} used Commander's Rage and increased it's Max Health by ${50 * mask.buffStacks}`;
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          } 
          if (skillName === "Living Forge") {
            console.log(`Mask ${mask.maskID} has skill: Living Forge`);
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team === mask.team) {
                targetMask.attackDamage = Math.max(targetMask.attackDamage * 1.05, targetMask.attackDamage + 5);
                targetMask.abilityDamage = Math.max(targetMask.abilityDamage * 1.05, targetMask.abilityDamage + 5);
              }
            });
            battleMessage = `Mask ${mask.maskID} used Living Forge and increased Attack Damage and Ability Damage of all allies by 5`;
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          } 
          if (skillName === "Golden Punch") {
            console.log(`Mask ${mask.maskID} has skill: Golden Punch`);
            mask.buffStacks += 1;
          }
          if (skillName === "Protect Me Old Friend") {
            console.log(`Mask ${mask.maskID} has skill: Protect Me Old Friend`);
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team === mask.team) {
                targetMask.speed = Math.min(targetMask.speed + 2, 100);
              }
            });
          }
          if (skillName === "Blood Siphon") {
            console.log(`Mask ${mask.maskID} has skill: Blood Siphon`);
            let damage = 0;
            let heal = 0;

            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.maskID !== mask.maskID && targetMask.team !== mask.team) {
                targetMask.bleedStacks = targetMask.bleedStacks + 4;
              }
            });

            if (mask.currentSpeed >= 100) {
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.maskID !== mask.maskID && targetMask.team !== mask.team) {
                  damage = targetMask.bleedStacks * 0.5 * mask.abilityDamage;
                  targetMask.currentHealth -= damage;
                  targetMask.currentHealth = Math.max(targetMask.currentHealth, 0);
                  heal += damage;
                }
              });
            }

            mask.currentHealth += heal;
            mask.currentHealth = Math.min(mask.currentHealth, mask.health);
            battleMessage = `Mask ${mask.maskID} used Blood Siphon and applied bleed stacks to all enemies and healed for ${heal}`;
            if (battleMessage) {
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          if (skillName === "Shield Bash") {
            mask.protections += 10;
            mask.magicResist += 10;
          }
          
          if (skillName === "Inferior Being") {
            mask.currentHealth += mask.health * 0.50;
            mask.currentHealth = Math.min(mask.currentHealth, mask.health); // Heal mask and cap at mask.health
          }
          
            if (skillName === "Ice Hammer") {
            console.log(`Mask ${mask.maskID} has skill: Ice Hammer`);
            stormSize += mask.attackDamage;
            battleMessage = `Mask ${mask.maskID} used Ice Hammer and increased storm size by ${mask.attackDamage}.`;
            if (stormSize > 2500) {
              stormSize = 0;
              const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
              enemies.forEach(targetMask => {
              targetMask.stunStacks += 5;
              const damage = mask.attackDamage * 5;
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              });
              battleMessage += ` The storm erupts! All enemies are stunned for 5 turns and take ${mask.attackDamage * 5} damage.`;
            }
            if (battleMessage) {
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          if (skillName === "What a joke") {
            console.log(`Mask ${mask.maskID} has skill: What a joke`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0 && targetMask.poisonStacks > 0);
            let totalHeal = 0;
            enemies.forEach(targetMask => {
              const damage = mask.abilityDamage * 0.1;
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              totalHeal += damage;
            });
            mask.currentHealth = Math.min(mask.currentHealth + totalHeal, mask.health);
            battleMessage = `Mask ${mask.maskID} used What a joke, dealt ${totalHeal} damage and healed for the same amount`;
            if (battleMessage) {
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          if (skillName === "Tentacle Swarm") {
            console.log(`Mask ${mask.maskID} has skill: Tentacle Swarm`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            let totalDamage = 0;
            let totalStuns = 0;
            for (let i = 0; i < mask.buffStacks; i++) {
              if (enemies.length === 0) break;
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = mask.abilityDamage * 0.5;
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              totalDamage += damage;
              // Calculate stun chance: X = speed / 2
              const stunChance = mask.speed / 2;
              if (Math.random() * 100 < stunChance) {
                targetMask.stunStacks += 1;
                totalStuns += 1;
              }
            }
            battleMessage = `Mask ${mask.maskID} used Tentacle Swarm, dealt ${totalDamage} damage and applied ${totalStuns} stun stacks.`;
            if (battleMessage) {
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          if (skillName === "Do not anger the Forest") {
            console.log(`Mask ${mask.maskID} has skill: Do not anger the Forest`);
            forestsTiming = (forestsTiming || 0) + 1;
            if (forestsTiming > 20) {
              mask.speed = 100;
              battleMessage = `Mask ${mask.maskID} used Do not anger the Forest: Forests have grown wild, speed set to 100!`;
            } else {
              mask.health *= 1.1;
              mask.currentHealth *= 1.1;
              mask.attackDamage *= 1.1;
              mask.abilityDamage *= 1.1;
              mask.magicResist *= 1.1;
              mask.protections *= 1.1;
              battleMessage = `Mask ${mask.maskID} used Do not anger the Forest: stats increased by 10%. Forests timing: ${forestsTiming}`;
            }
            if (battleMessage) {
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          if (skillName === "Chivalry") {
            console.log(`Mask ${mask.maskID} has skill: Chivalry`);
            let totalHealed = 0;
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team === mask.team && targetMask.currentHealth > 0) {
              const healAmount = targetMask.health - targetMask.currentHealth;
              if (healAmount > 0) {
                targetMask.currentHealth = targetMask.health;
                totalHealed += healAmount;
              }
              }
            });
            const selfDamage = totalHealed * 0.5;
            mask.currentHealth = Math.max(mask.currentHealth - selfDamage, 0);
            if (mask.currentHealth > 0) {
              mask.currentHealth = Math.min(mask.currentHealth + mask.attackDamage, mask.health);
            }
            battleMessage = `Mask ${mask.maskID} used Chivalry: healed allies for ${totalHealed}, took ${selfDamage} self-damage, and healed self for ${mask.currentHealth > 0 ? mask.attackDamage : 0}.`;
            if (battleMessage) {
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          if (skillName === "Crashing Wave") {
            if (mask.buffStacks > 4) {
              mask.buffStacks = 0;
              // Heal all allies for 250% of ability damage
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.team === mask.team && targetMask.currentHealth > 0) {
                  const healAmount = mask.abilityDamage * 2.5;
                  targetMask.currentHealth = Math.min(targetMask.currentHealth + healAmount, targetMask.health);
                }
              });
              // Deal damage to all enemies for 500% of ability damage and increase their stunStacks by 3
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.team !== mask.team && targetMask.currentHealth > 0) {
                  const damage = mask.abilityDamage * 5;
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
                  targetMask.stunStacks += 3;
                }
              });
              battleMessage = `Mask ${mask.maskID} used Crashing Wave: healed allies for 250% ability damage, damaged enemies for 500% ability damage, and stunned them.`;
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
            }
          }

          if (skillName === "Call the Dragons" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Call the Dragons`);
            let dragonID = 10000;
            while (masksInBattle[dragonID]) {
              dragonID++;
            }
            const dragonStats = {
              maskID: dragonID,
              attackDamage: mask.abilityDamage * 10,
              abilityDamage: mask.abilityDamage * 10,
              protections: mask.abilityDamage * 10,
              magicResist: mask.abilityDamage * 10,
              health: mask.abilityDamage * 1000,
              speed: 100,
              currentHealth: mask.abilityDamage * 1000,
              currentSpeed: 0,
              activeSkills: [10000],
              stunStacks: 0,
              burnStacks: 0,
              poisonStacks: 0,
              bleedStacks: 0,
              buffStacks: 0,
              action: false,
              bonusAction: false,
              movement: 0,
              team: mask.team,
              cooldowns: {},
              photo: "/assets/images/Dragon.jpg"
            };
            masksInBattle[dragonID] = dragonStats;
            console.log(`A Dragon was summoned with ID ${dragonID}!`);
            battleMessage = `Mask ${mask.maskID} used Call the Dragons`;
            if (battleMessage) {
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }  

          if (skillName === "Army of Dogs" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Army of Dogs`);
            let dogID = 10000000;
            while (masksInBattle[dogID]) {
              dogID++;
            }
            const dogStats = {
              maskID: dogID,
              attackDamage: mask.abilityDamage * 0.5,
              abilityDamage: mask.abilityDamage * 0.5,
              protections: mask.abilityDamage * 0.1,
              magicResist: mask.abilityDamage * 0.1,
              health: mask.abilityDamage * 5,
              speed: 100,
              currentHealth: mask.abilityDamage * 5,
              currentSpeed: 0,
              activeSkills: [8888],
              stunStacks: 0,
              burnStacks: 0,
              poisonStacks: 0,
              bleedStacks: 0,
              buffStacks: 0,
              action: false,
              bonusAction: false,
              movement: 0,
              team: mask.team,
              cooldowns: {},
              photo: "/assets/images/EgyptianHound.png"
            };
            masksInBattle[dogID] = dogStats;
            console.log(`An Eqyptian Dog was summoned with ID ${dogID}!`);
            battleMessage = `Mask ${mask.maskID} used Army of Dogs`;
            if (battleMessage) {
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }  

          if (skillName === "Dragon Blast" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Dragon Blast`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = mask.attackDamage * 1;
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
              masksInBattle[targetMask.maskID] = targetMask; // Ensure the updated targetMask is added to masksInBattle
              battleMessage = `Mask ${mask.maskID} used Dragon Blast and dealt ${damage} damage to mask ${targetMask.maskID}`;
              if (battleMessage) {
                console.log(battleMessage); // Log battleMessage if not empty
                io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
              }
            }
          }   
        }
      });

      if (mask.burnStacks > 0) {
        if (mask.burnStacks >= 50) {
          mask.currentHealth -= 20 * mask.burnStacks;
          mask.currentHealth = Math.max(mask.currentHealth, 0);
        }
        mask.currentHealth -= mask.health * 0.025;
        mask.burnStacks -= 1;
      }
      if (mask.poisonStacks > 0) {
        mask.currentHealth -= mask.health * 0.0001 * mask.poisonStacks;
        mask.poisonStacks = Math.ceil(mask.poisonStacks * 1.25);
        if (mask.currentHealth < mask.poisonStacks / 10) {
          mask.currentHealth = 0;
        }
      }
      if (mask.bleedStacks > 0) {
        mask.currentHealth -= (mask.health * 0.005 * mask.bleedStacks);
        if(mask.currentHealth / mask.health * 100 <= mask.bleedStacks) {
          mask.currentHealth = 0;
        }
      }
      if (mask.stunStacks > 0) {
        mask.stunStacks -= 1;
        if (mask.stunStacks === 0) {
            if (!defaultMaskIDs.includes(mask.maskID)) {
                mask.action = true; // Reset action to true
            }
            mask.bonusAction = true; // Reset bonusAction to true
            mask.movement = mask.speed; // Reset movement to speed
            // Decrease cooldowns
            Object.keys(mask.cooldowns).forEach(skillID => {
                if (mask.cooldowns[skillID] > 0) {
                    mask.cooldowns[skillID] -= 1;
                }
            });
        }
        return;
      } else {
        if (mask.currentSpeed === 100) {
          mask.currentSpeed = 0; // Reset currentSpeed to 0
          mask.action = false;
          mask.bonusAction = false; // Reset bonusAction to false
          mask.movement = 0; // Reset movement to 0
          // Decrease cooldowns
          Object.keys(mask.cooldowns).forEach(skillID => {
            if (mask.cooldowns[skillID] > 0) {
              mask.cooldowns[skillID] -= 1;
            }
          });
        } else {
          mask.currentSpeed += mask.speed; // Increase currentSpeed by speed value
          if (mask.currentSpeed >= 100) {
            mask.currentSpeed = 100; // Ensure currentSpeed is capped at 100
            if (!defaultMaskIDs.includes(mask.maskID)) {
              mask.action = true; // Set action to true
            }
            mask.bonusAction = true; // Set bonusAction to true
            mask.movement = mask.speed; // Set movement to mask.speed
            // Decrease cooldowns
            Object.keys(mask.cooldowns).forEach(skillID => {
              if (mask.cooldowns[skillID] > 0) {
                mask.cooldowns[skillID] -= 1;
              }
            });
          } else {
            mask.action = false; // Reset action to false
            mask.bonusAction = false; // Reset bonusAction to false
            mask.movement = 0; // Reset movement to 0
          }
        }
      }
    } 
  });
  io.emit('masksInBattleUpdate', Object.values(masksInBattle)); // Emit updated masksInBattle
  res.status(200).send('Continue request received');
});

app.post('/end-battle', async (req, res) => {
  try {
    // Save currentHealth fields to the database
    const maskUpdates = Object.values(masksInBattle).map(mask => {
      return MaskList.update(
        { currentHealth: Math.floor(mask.currentHealth) },
        { where: { maskID: mask.maskID } }
      );
    });
    await Promise.all(maskUpdates); // Wait for all updates to complete

    // Clear masksInBattle and related variables
    masksInBattle = {};
    blindingStrikesTargets = []; // Clear the tracking array when the battle ends
    blackHoleDamage = 0;
    detachedSoul = false;
    infectedByPlague = [];
    stormSize = 0;
    forestsTiming = 0;

    io.emit('masksInBattleUpdate', Object.values(masksInBattle));
    res.status(200).send('Battle ended, masksInBattle saved, and cleared');
  } catch (error) {
    console.error('Error saving masksInBattle:', error);
    res.status(500).send('Failed to save masksInBattle');
  }
});

// Endpoint to fetch the current state of masksInBattle
app.get('/masks-in-battle', (req, res) => {
  res.json(Object.values(masksInBattle));
});

// Endpoint to fetch character ID by username
app.get('/character-id-username/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.json({ characterID: user.characterID });
  } catch (error) {
    console.error('Error fetching character ID:', error);
    res.status(500).send('Failed to fetch character ID');
  }
});

// Endpoint to fetch all mods
app.get('/mods', async (req, res) => {
  try {
    const mods = await ModList.findAll();
    res.json(mods);
  } catch (error) {
    console.error('Error fetching mods:', error);
    res.status(500).send('Failed to fetch mods');
  }
});

// Endpoint to create a new mod
app.post('/mods', async (req, res) => {
  const { modType, modRarity, description } = req.body;
  try {
    const newMod = await ModList.create({ modType, modRarity, description });
    res.status(201).json(newMod);
  } catch (error) {
    console.error('Error creating mod:', error);
    res.status(500).send('Failed to create mod');
  }
});

// Endpoint to fetch mods by a list of mod IDs
app.get('/mods-by-ids', async (req, res) => {
  const { modIDs } = req.query;
  if (!modIDs) {
    return res.status(400).send('modIDs query parameter is required');
  }

  const modIDArray = modIDs.split(',').map(id => parseInt(id, 10));
  try {
    const mods = await ModList.findAll({
      where: {
        modID: {
          [Op.in]: modIDArray
        }
      }
    });
    res.json(mods);
  } catch (error) {
    console.error('Error fetching mods:', error);
    res.status(500).send('Failed to fetch mods');
  }
});

// Endpoint to add a mod to a mask
app.put('/masks/:maskID/add-mod', async (req, res) => {
  const { maskID } = req.params;
  const { modID } = req.body;
  try {
    const mask = await MaskList.findOne({ where: { maskID } });
    if (!mask) {
      return res.status(404).send('Mask not found');
    }
    const updatedModList = mask.modList ? [...mask.modList, modID] : [modID];
    await MaskList.update({ modList: updatedModList.filter(mod => mod !== null) }, { where: { maskID } });
    res.status(200).json({ message: 'Mod added to mask successfully' });
  } catch (error) {
    console.error('Error adding mod to mask:', error);
    res.status(500).send('Failed to add mod to mask');
  }
});

// Endpoint to fetch mods for a specific mask
app.get('/masks/:maskID/mods', async (req, res) => {
  const { maskID } = req.params;
  try {
    const mask = await MaskList.findOne({ where: { maskID } });
    if (!mask) {
      return res.status(404).send('Mask not found');
    }
    const mods = await ModList.findAll({
      where: {
        modID: {
          [Op.in]: mask.modList
        }
      }
    });
    res.json(mods);
  } catch (error) {
    console.error('Error fetching mods for mask:', error);
    res.status(500).send('Failed to fetch mods for mask');
  }
});

app.use(maskRoutes); // Use maskRoutes

app.post('/reset-health', async (req, res) => {
  try {
    // Update currentHealth in the database
    await MaskList.update(
      { currentHealth: sequelize.col('health') }, // Set currentHealth to the value of health
      { where: {} } // Apply to all rows
    );
    masksInBattle = {};
    blindingStrikesTargets = []; // Clear the tracking array when the battle ends
    blackHoleDamage = 0;
    detachedSoul = false;
    infectedByPlague = [];
    stormSize = 0;
    forestsTiming = 0;

    io.emit('masksInBattleUpdate', Object.values(masksInBattle));

    res.status(200).send('All masks have been reset to full health');
  } catch (error) {
    console.error('Error resetting mask health:', error);
    res.status(500).send('Failed to reset mask health');
  }
});

app.post('/equip-item', async (req, res) => {
  const { characterID, itemID } = req.body;

  if (!characterID || !itemID) {
    return res.status(400).json({ message: 'characterID and itemID are required' });
  }

  try {
    // Get the character's itemInventory (array of itemIDs)
    const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
    if (!characterInfo || !Array.isArray(characterInfo.itemInventory)) {
      return res.status(404).json({ message: 'Character or item inventory not found' });
    }

    // Set all items in the inventory to equipped: false
    await ItemList.update(
      { equipped: false },
      { where: { itemID: characterInfo.itemInventory } }
    );

    // Set the selected item to equipped: true
    await ItemList.update(
      { equipped: true },
      { where: { itemID } }
    );

    res.status(200).json({ message: 'Item equipped successfully' });
  } catch (error) {
    console.error('Error equipping item:', error);
    res.status(500).json({ message: 'Failed to equip item' });
  }
});

app.post('/hover-character-id', async (req, res) => {
  const { characterID } = req.body;
  if (!characterID) {
    return res.status(400).json({ message: 'characterID is required' });
  }

  try {
    // Get character info
    const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
    if (!characterInfo) {
      return res.status(404).send('Character not found');
    }

    // Find equipped item in the character's inventory

    let equippedItemPath = null;
    if (Array.isArray(characterInfo.itemInventory) && characterInfo.itemInventory.length > 0) {
      const equippedItem = await ItemList.findOne({
      where: {
        itemID: { [Op.in]: characterInfo.itemInventory },
        equipped: true
      }
      });
      if (equippedItem) {
      equippedItemPath = equippedItem.photo; // Get the path (photo) value
      } else {
      console.log('No equipped item found for character.');
      }
    } else {
      console.log('Character has no itemInventory or it is empty.');
    }

    res.json({
      characterName: characterInfo.characterName,
      photo: characterInfo.photo,
      equippedItemPath
    });
    } catch (error) {
    console.error('Error in /hover-character-id:', error);
    res.status(500).json({ message: 'Failed to log character ID' });
  }
});

// Ensure a row exists in time_keeper table
TimeKeeper.findOrCreate({
  where: {},
  defaults: { time: '00:00' }
}).then(() => {
  console.log('TimeKeeper initialized');
}).catch(err => {
  console.error('Error initializing TimeKeeper:', err);
});

// API endpoint to get current time
app.get('/api/time', async (req, res) => {
  try {
    const tk = await TimeKeeper.findOne();
    res.json({ time: tk ? tk.time : '00:00' });
  } catch (err) {
    res.status(500).json({ time: '00:00' });
  }
});

// API endpoint to increment hour
app.post('/api/time/increment', async (req, res) => {
  try {
    const tk = await TimeKeeper.findOne();
    let [hour, minute] = (tk?.time || '00:00').split(':').map(Number);
    hour = (hour + 1) % 24;
    const newTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    await TimeKeeper.update({ time: newTime }, { where: {} });
    io.emit('timeUpdate', newTime);
    res.json({ time: newTime });
  } catch (err) {
    res.status(500).json({ message: 'Failed to increment time' });
  }
});

// API endpoint to decrement hour
app.post('/api/time/decrement', async (req, res) => {
  try {
    const tk = await TimeKeeper.findOne();
    let [hour, minute] = (tk?.time || '00:00').split(':').map(Number);
    hour = (hour - 1 + 24) % 24;
    const newTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    await TimeKeeper.update({ time: newTime }, { where: {} });
    io.emit('timeUpdate', newTime);
    res.json({ time: newTime });
  } catch (err) {
    res.status(500).json({ message: 'Failed to decrement time' });
  }
});

app.get('/api/sounds', async (req, res) => {
  try {
    const sounds = await Sound.findAll();
    res.json(sounds);
  } catch (error) {
    console.error('Error fetching sounds:', error);
    res.status(500).send('Failed to fetch sounds');
  }
});

app.post('/api/play-sound', (req, res) => {
  const soundDetails = req.body;
  // Emit the playSound event with the path and id to all connected clients
  io.emit('playSound', {
    id: soundDetails.id,
    path: soundDetails.path
  });
  res.status(200).json({ message: 'Sound event emitted' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});