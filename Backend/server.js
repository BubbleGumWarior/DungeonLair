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
const MaskCollection = require('./models/MaskCollection'); // Import MaskCollection model
const { localIP, JWT_SECRET } = require('./config'); // Import the IP address and JWT secret
const multer = require('multer');
const path = require('path');
const http = require('http'); // Import http module
const cron = require('node-cron');
const { exec } = require('child_process');
const maskRoutes = require('./routes/maskRoutes'); // Import maskRoutes

const app = express();
// Serve static files from public (including .well-known for ACME HTTP-01)
app.use(express.static(path.join(__dirname, 'public')));

// Explicitly serve ACME challenge files for Let's Encrypt HTTP-01 validation
app.use('/.well-known/acme-challenge', express.static(path.join(__dirname, 'public', '.well-known', 'acme-challenge')));

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
                maskID: 9997,
                photo: '/assets/images/ShadowDoggo.jpg',
                passiveSkill: 'Pack Mentality',
                activeSkills: [9997],
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
            },
            {
                maskID: 90000,
                name: 'The Mirror King',
                photo: '/assets/images/MirrorKing.png',
                passiveSkill: 'None',
                activeSkills: [900000, 900001],
                modList: [],
                attackDamage: 3000000000000,
                abilityDamage: 10,
                magicResist: 2000000000000,
                protections: 2000000000000,
                health: 50000000000000,
                currentHealth: 50000000000000,
                speed: 100,
            },
            {
                maskID: 90001,
                name: 'Pale Reaper',
                photo: '/assets/images/Summon1.png',
                passiveSkill: 'None',
                activeSkills: [900002, 900003],
                modList: [],
                attackDamage: 1500000000,
                abilityDamage: 1000000000,
                magicResist: 800000000,
                protections: 800000000,
                health: 12000000000,
                currentHealth: 12000000000,
                speed: 100,
            },
            {
                maskID: 90002,
                name: 'Ember Fang',
                photo: '/assets/images/Summon2.png',
                passiveSkill: 'None',
                activeSkills: [900004, 900005],
                modList: [],
                attackDamage: 1200000000,
                abilityDamage: 1200000000,
                magicResist: 700000000,
                protections: 700000000,
                health: 10000000000,
                currentHealth: 10000000000,
                speed: 100,
            },
            {
                maskID: 90003,
                name: 'Stormbound Sentinel',
                photo: '/assets/images/Summon3.png',
                passiveSkill: 'None',
                activeSkills: [900006, 900007],
                modList: [],
                attackDamage: 1400000000,
                abilityDamage: 800000000,
                magicResist: 600000000,
                protections: 600000000,
                health: 900000000,
                currentHealth: 900000000,
                speed: 100,
            },
            {
                maskID: 90004,
                name: 'Plagueborne Warden',
                photo: '/assets/images/Summon4.png',
                passiveSkill: 'None',
                activeSkills: [900008, 900009],
                modList: [],
                attackDamage: 1000000000,
                abilityDamage: 1000000000,
                magicResist: 1200000000,
                protections: 1200000000,
                health: 1500000000,
                currentHealth: 1500000000,
                speed: 80,
            },
            {
                maskID: 90005,
                name: 'Veil Walker',
                photo: '/assets/images/Summon5.png',
                passiveSkill: 'None',
                activeSkills: [900020, 900021],
                modList: [],
                attackDamage: 1100000000,
                abilityDamage: 1500000000,
                magicResist: 500000000,
                protections: 500000000,
                health: 800000000,
                currentHealth: 800000000,
                speed: 100,
            },
            {
                maskID: 90006,
                name: 'Blighted Champion',
                photo: '/assets/images/Summon6.png',
                passiveSkill: 'None',
                activeSkills: [900022, 900023],
                modList: [],
                attackDamage: 1300000000,
                abilityDamage: 1300000000,
                magicResist: 900000000,
                protections: 900000000,
                health: 1100000000,
                currentHealth: 1100000000,
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

  // Check if temporary password has expired
  if (user.isTemporaryPassword && user.temporaryPasswordExpires && new Date() > user.temporaryPasswordExpires) {
    return res.status(401).json({ message: 'Temporary password has expired. Please contact your Dungeon Master.' });
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
  
  res.json({ 
    token, 
    characterID, 
    username: user.username, 
    role: user.role,
    isTemporaryPassword: user.isTemporaryPassword || false,
    temporaryPasswordExpires: user.temporaryPasswordExpires
  });
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

// Global skillNames object for hardcoded boss skills
const skillNames = {
  // Mirror King Phase 1 skills
  900000: "King's Decree",
  900001: "Commanding Presence",
  // Summon 1 skills
  900002: "Soul Harvest",
  900003: "Reaper's Touch",
  // Summon 2 skills
  900004: "Infernal Bite",
  900005: "Flame Burst",
  // Summon 3 skills
  900006: "Thunderous Strike",
  900007: "Storm Shield",
  // Summon 4 skills
  900008: "Toxic Cloud",
  900009: "Plague Strike",
  // Summon 5 skills
  900020: "Shadow Step",
  900021: "Veil of Darkness",
  // Summon 6 skills
  900022: "Blight Slash",
  900023: "Corruption Aura",
  // Mirror King Phase 2 skills
  900010: "Cataclysmic Reflection",
  900011: "Royal Restoration",
  9999: "Basic Attack"
};

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

    socket.on('updateVcMemberStatus', ({ username, isMuted }) => {
      const member = vcMembers.find(m => m.username === username);
      if (member) {
        member.isMuted = isMuted;
        io.emit('vcMembersUpdate', vcMembers);
      }
    });

    socket.on('requestVcMembers', () => {
      socket.emit('vcMembersUpdate', vcMembers);
    });

    socket.on('rtcOffer', ({ username, offer }) => {
        const targetUser = liveUsers.find(user => user.username === username);
        const senderUser = liveUsers.find(user => user.id === socket.id);
        if (targetUser && senderUser) {
            console.log(`Forwarding RTC offer from ${senderUser.username} to ${username}`);
            io.to(targetUser.id).emit('rtcOffer', senderUser.username, offer);
        } else {
            console.warn('Could not forward RTC offer:', { targetUser: !!targetUser, senderUser: !!senderUser });
        }
    });

    socket.on('rtcAnswer', ({ username, answer }) => {
        const targetUser = liveUsers.find(user => user.username === username);
        const senderUser = liveUsers.find(user => user.id === socket.id);
        if (targetUser && senderUser) {
            console.log(`Forwarding RTC answer from ${senderUser.username} to ${username}`);
            io.to(targetUser.id).emit('rtcAnswer', senderUser.username, answer);
        } else {
            console.warn('Could not forward RTC answer:', { targetUser: !!targetUser, senderUser: !!senderUser });
        }
    });

    socket.on('rtcIceCandidate', ({ username, candidate }) => {
        const targetUser = liveUsers.find(user => user.username === username);
        const senderUser = liveUsers.find(user => user.id === socket.id);
        if (targetUser && senderUser) {
            console.log(`Forwarding ICE candidate from ${senderUser.username} to ${username}`);
            io.to(targetUser.id).emit('rtcIceCandidate', senderUser.username, candidate);
        } else {
            console.warn('Could not forward ICE candidate:', { targetUser: !!targetUser, senderUser: !!senderUser });
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
            // Find the user making this request to determine their role
            const user = liveUsers.find(u => u.id === socket.id);
            const isDungeonMaster = user && user.role === 'Dungeon Master';
            
            MaskList.findOne({ where: { maskID } })
                .then(maskDetails => {
                    if (maskDetails) {
                        masksInBattle[maskID] = {
                            maskID: maskDetails.maskID,
                            name: maskDetails.name, // Add name field
                            attackDamage: maskDetails.attackDamage,
                            abilityDamage: maskDetails.abilityDamage,
                            protections: maskDetails.protections,
                            magicResist: maskDetails.magicResist,
                            health: maskDetails.health,
                            speed: maskDetails.speed,
                            currentHealth: maskDetails.currentHealth,
                            currentSpeed: 0,
                            activeSkills: maskDetails.activeSkills,
                            stunStacks: 0, // Add stunStacks field
                            burnStacks: 0, // Add burnStacks field
                            poisonStacks: 0, // Add poisonStacks field
                            bleedStacks: 0, // Add bleedStacks field
                            buffStacks: 0, // Add buffStacks field
                            untargetable: 0, // Add untargetable field (0 = targetable, >0 = untargetable for N turns)
                            action: false, // Add action field
                            bonusAction: false, // Add bonusAction field
                            movement: 0, // Add movement field
                            team: isDungeonMaster ? 'Enemy' : 'Ally', // Assign team based on user role
                            cooldowns: {}, // Initialize cooldowns field
                            photo: maskDetails.photo // Add photo field
                        };
                        
                        // If Mirror King joins battle, automatically spawn all 6 summons
                        if (maskID === 90000) {
                            const summonIDs = [90001, 90002, 90003, 90004, 90005, 90006];
                            summonIDs.forEach(summonID => {
                                MaskList.findOne({ where: { maskID: summonID } })
                                    .then(summonDetails => {
                                        if (summonDetails && !masksInBattle[summonID]) {
                                            masksInBattle[summonID] = {
                                                maskID: summonDetails.maskID,
                                                name: summonDetails.name,
                                                attackDamage: summonDetails.attackDamage,
                                                abilityDamage: summonDetails.abilityDamage,
                                                protections: summonDetails.protections,
                                                magicResist: summonDetails.magicResist,
                                                health: summonDetails.health,
                                                speed: summonDetails.speed,
                                                currentHealth: summonDetails.currentHealth,
                                                currentSpeed: 0,
                                                activeSkills: summonDetails.activeSkills,
                                                stunStacks: 0,
                                                burnStacks: 0,
                                                poisonStacks: 0,
                                                bleedStacks: 0,
                                                buffStacks: 0,
                                                untargetable: 0,
                                                action: false,
                                                bonusAction: false,
                                                movement: 0,
                                                team: isDungeonMaster ? 'Enemy' : 'Ally',
                                                cooldowns: {},
                                                photo: summonDetails.photo
                                            };
                                            
                                            // Load skills for this summon
                                            maskSkills[summonID] = [...summonDetails.activeSkills, 9999].map(skillID => ({
                                                skillID: skillID,
                                                skillName: skillNames[skillID] || 'Unknown Skill',
                                                description: 'Hardcoded skill',
                                                mainStat: 'abilityDamage',
                                                mainStatPercentage: 100,
                                                cooldown: 0,
                                                amountOfStrikes: 1,
                                                onHitEffect: null,
                                                isMultiTarget: false
                                            }));
                                        }
                                    })
                                    .catch(error => {
                                        console.error(`Error fetching summon ${summonID} details:`, error);
                                    });
                            });
                        }
                        
                        // Fetch mask skills and store them
                        // For default masks (90000-90006), use hardcoded skills instead of database
                        if (maskID >= 90000 && maskID <= 90006) {
                            console.log(`Loading skills for default mask ${maskID}`);
                            console.log(`Active skills array:`, maskDetails.activeSkills);
                            maskSkills[maskID] = [...maskDetails.activeSkills, 9999].map(skillID => ({
                                skillID: skillID,
                                skillName: skillNames[skillID] || 'Unknown Skill',
                                description: 'Hardcoded skill',
                                mainStat: 'abilityDamage',
                                mainStatPercentage: 100,
                                cooldown: 0,
                                amountOfStrikes: 1,
                                onHitEffect: null,
                                isMultiTarget: false
                            }));
                            console.log(`Skills loaded for mask ${maskID}:`, maskSkills[maskID]);
                            // Delay the emit to allow summons to be added
                            setTimeout(() => {
                                io.emit('masksInBattleUpdate', Object.values(masksInBattle));
                            }, 100);
                        } else {
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
                                    // Delay the emit to allow summons to be added
                                    setTimeout(() => {
                                        io.emit('masksInBattleUpdate', Object.values(masksInBattle));
                                    }, 100);
                                })
                                .catch(error => {
                                    console.error('Error fetching mask skills:', error);
                                });
                        }
                    }
                })
                .catch(error => {
                    console.error('Error fetching mask details:', error);
                });
        }
    });

    socket.on('skillAction', (data) => { // This is called active skills that are cast by players
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
            // CRITICAL SERVER-SIDE VALIDATION: Prevent skill usage exploits
            
            // 1. Mask must be alive to use skills
            if (mask.currentHealth <= 0) {
                console.error(`Dead mask ${maskID} attempted to use skill ${skillID}`);
                return;
            }
            
            // 2. Mask must have an available action
            if (!mask.action) {
                console.error(`Mask ${maskID} has no action available, cannot use skill ${skillID}`);
                return;
            }
            
            // 3. Mask must be at full speed (ready for their turn)
            if (mask.currentSpeed < 100) {
                console.error(`Mask ${maskID} is not ready (speed: ${mask.currentSpeed}/100), cannot use skill ${skillID}`);
                return;
            }
            
            // 4. Mask must not be stunned
            if (mask.stunStacks > 0) {
                console.error(`Stunned mask ${maskID} attempted to use skill ${skillID}`);
                return;
            }
            
            // 5. Skill must not be on cooldown
            if (mask.cooldowns && mask.cooldowns[skillID] && mask.cooldowns[skillID] > 0) {
                console.error(`Skill ${skillID} is on cooldown (${mask.cooldowns[skillID]} turns remaining) for mask ${maskID}`);
                return;
            }
            
            console.log(`Mask ${maskID} using skill ${skill.skillName} - validation passed`);
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
              mask.currentHealth = Math.min(mask.currentHealth + (blackHoleDamage * 2), mask.health); // Heal the user of the skill

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
            else if (skill.skillName === 'Void Convergence') {
              // Reality tears open as cosmic energy erupts from the void crown
              const voidPower = mask.abilityDamage * 2.5 + (mask.buffStacks * 50);
              let totalDamage = 0;
              
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  // Primary target takes full void damage (ignores all resistances - reality manipulation)
                  const primaryDamage = voidPower;
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - primaryDamage, 0);
                  totalDamage += primaryDamage;
                  
                  // Apply reality distortion effects
                  targetMask.stunStacks += 2;
                  targetMask.magicResist = Math.max(targetMask.magicResist - (mask.abilityDamage * 0.1), 0);
                  targetMask.protections = Math.max(targetMask.protections - (mask.abilityDamage * 0.1), 0);
                  
                  console.log(`Mask ${maskID} used Void Convergence on Mask ${targetMaskID}, dealing ${primaryDamage} reality damage and distorting their defenses!`);
                }
              });
              
              // Void energy spreads to nearby enemies (splash effect)
              const allEnemies = Object.values(masksInBattle).filter(targetMask => 
                targetMask.team !== mask.team && 
                targetMask.currentHealth > 0 && 
                !targetMaskIDs.includes(targetMask.maskID.toString())
              );
              
              allEnemies.forEach(enemyMask => {
                const splashDamage = Math.max(voidPower * 0.4 - enemyMask.magicResist, 0);
                enemyMask.currentHealth = Math.max(enemyMask.currentHealth - splashDamage, 0);
                enemyMask.poisonStacks += 1; // Void corruption
                totalDamage += splashDamage;
              });
              
              // Empower the caster with cosmic energy
              mask.buffStacks += 3;
              mask.abilityDamage += totalDamage * 0.05; // Grows stronger with each use
              
              battleMessage = `Reality tears apart as Mask ${maskID} channels Void Convergence! Total cosmic devastation: ${Math.round(totalDamage)} damage!`;
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
            }
            else if (skill.skillName === 'Infernal Rampage') {
              // The demon's rage reaches critical mass, erupting in hellfire and fury
              const rageMultiplier = 1 + (mask.buffStacks * 0.25); // 25% more damage per rage stack
              const baseDamage = mask.attackDamage * 3; // 300% attack damage base
              let totalDamage = 0;
              let killCount = 0;
              
              // Primary assault - devastating strikes on all targets
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  let rampageDamage = baseDamage * rageMultiplier;
                  const reduction = targetMask.protections;
                  const finalDamage = Math.max(rampageDamage - reduction, 0);
                  
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0);
                  totalDamage += finalDamage;
                  
                  // Apply hellfire burns and intimidation
                  targetMask.burnStacks += 3;
                  targetMask.stunStacks += 1; // Overwhelmed by the rampage
                  
                  if (targetMask.currentHealth === 0) {
                    killCount++;
                  }
                  
                  console.log(`Mask ${maskID} rampages against Mask ${targetMaskID}, dealing ${finalDamage} hellfire damage!`);
                }
              });
              
              // Berserker momentum - each kill fuels more destruction
              if (killCount > 0) {
                mask.action = true; // Can act again this turn!
                mask.bonusAction = true;
                mask.attackDamage += killCount * 20; // Permanent growth from bloodlust
                
                // Mark that this mask earned an extra action to prevent it from being removed
                mask.earnedExtraAction = true;
                
                // Reset skill cooldown - the berserker's rage is renewed by bloodshed
                if (!mask.cooldowns) {
                  mask.cooldowns = {};
                }
                mask.cooldowns[skillID] = 0;
                // Mark that this skill's cooldown was reset to prevent it from being applied later
                mask.skillCooldownReset = true;
                
                // Chain reaction - hellfire spreads to nearby enemies
                const nearbyEnemies = Object.values(masksInBattle).filter(targetMask => 
                  targetMask.team !== mask.team && 
                  targetMask.currentHealth > 0 && 
                  !targetMaskIDs.includes(targetMask.maskID.toString())
                );
                
                nearbyEnemies.forEach(enemyMask => {
                  const chainDamage = Math.max((baseDamage * 0.5) - enemyMask.magicResist, 0);
                  enemyMask.currentHealth = Math.max(enemyMask.currentHealth - chainDamage, 0);
                  enemyMask.burnStacks += 2;
                  totalDamage += chainDamage;
                });
              }
              
              // Consume rage stacks for power, but build toward next rampage
              mask.buffStacks = Math.max(mask.buffStacks - 2, 0);
              mask.currentHealth = Math.min(mask.currentHealth + (totalDamage * 0.1), mask.health); // Heals from carnage
              
              battleMessage = `Mask ${maskID} erupts in INFERNAL RAMPAGE! Hellfire and fury deal ${Math.round(totalDamage)} damage! ${killCount > 0 ? `Berserker bloodlust grants another action!` : ''}`;
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
            }
            else if (skill.skillName === 'Phantom Strike') {
              // The spectral warrior dissolves into ethereal mist and phases through reality
              const spectralPower = mask.attackDamage * (1 + mask.speed * 0.05) + (mask.speed * mask.speed * 0.5); // Speed has quadratic scaling
              let totalDamage = 0;
              let criticalHits = 0;
              
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  // Phantom teleportation - appears behind target for surprise attack
                  let phantomDamage = spectralPower;
                  
                  // Critical strike chance based on target's current speed (slower = easier to surprise)
                  const critChance = Math.max(60 - targetMask.currentSpeed, 20); // 20-60% crit chance
                  const isCritical = Math.random() * 100 < critChance;
                  let critMultiplier = 1; // Default multiplier
                  
                  if (isCritical) {
                    // Critical multiplier scales with speed (faster = deadlier backstabs)
                    critMultiplier = 2 + (mask.speed * 0.02); // 2.0x to 4.0x crit multiplier
                    phantomDamage *= critMultiplier;
                    criticalHits++;
                    targetMask.stunStacks += 2; // Overwhelmed by surprise
                  }
                  
                  // Spectral damage partially ignores protections (penetration scales with speed)
                  const penetration = 0.3 + (mask.speed * 0.007); // 30% to 100% armor penetration
                  const reduction = targetMask.protections * (1 - penetration);
                  const finalDamage = Math.max(phantomDamage - reduction, phantomDamage * 0.7); // Minimum 70% damage
                  
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0);
                  totalDamage += finalDamage;
                  
                  // Spectral chill - slows the target (effect scales with speed)
                  const speedReduction = 15 + (mask.speed * 0.2);
                  targetMask.speed = Math.max(targetMask.speed - speedReduction, 10);
                  targetMask.poisonStacks += 1; // Ghostly toxin from otherworldly contact
                  
                  console.log(`Mask ${maskID} phantom strikes Mask ${targetMaskID} for ${finalDamage} spectral damage! ${isCritical ? `CRITICAL BACKSTAB (${critMultiplier.toFixed(1)}x)!` : ''}`);
                }
              });
              
              // Ethereal escape - become untargetable briefly
              mask.untargetable = true;
              mask.speed = Math.min(mask.speed + 10, 99); // Gains speed from successful strikes (capped at 99 to avoid speed reset)
              
              // Shadow step - can act again if critical hits were scored
              if (criticalHits > 0) {
                mask.bonusAction = true;
                mask.movement = Math.min(mask.movement + 50, 100);
              }
              
              battleMessage = `Mask ${maskID} dissolves into spectral mist and strikes from the shadows! ${Math.round(totalDamage)} phantom damage with ${criticalHits} critical backstabs!`;
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
            }
            else if (skill.skillName === 'Soul Harvest') {
              // The agile reaper executes wounded enemies and grows stronger with each soul claimed
              const soulStacks = mask.buffStacks || 0;
              
              let totalDamage = 0;
              let soulsCollected = 0;
              let executionKills = 0;
              
              // Process each target for execution or damage
              targetMaskIDs.forEach(targetMaskID => {
                const targetMask = masksInBattle[targetMaskID];
                if (targetMask) {
                  const healthPercent = targetMask.currentHealth / targetMask.health;
                  
                  // EXECUTION: Instantly kill enemies at 25% health or less
                  if (healthPercent <= 0.25) {
                    const previousHealth = targetMask.currentHealth;
                    targetMask.currentHealth = 0;
                    totalDamage += previousHealth;
                    executionKills++;
                    soulsCollected++;
                    
                    console.log(`Mask ${maskID} EXECUTES Mask ${targetMaskID}! Death's scythe claims a soul (25% health threshold)`);
                  } else {
                    // NORMAL ATTACK: Powerful scythe strike with soul stack scaling
                    const baseDamage = mask.attackDamage * 2.0 + (mask.speed * mask.speed * 0.25);
                    const stackMultiplier = 1 + (soulStacks * 0.15); // 15% more damage per stack
                    let harvestDamage = baseDamage * stackMultiplier;
                    
                    // Speed-based armor penetration (agile reapers slice through defenses)
                    const penetration = Math.min(0.3 + (mask.speed * 0.007), 0.85);
                    const reduction = targetMask.protections * (1 - penetration);
                    const finalDamage = Math.max(harvestDamage - reduction, harvestDamage * 0.8);
                    
                    targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0);
                    totalDamage += finalDamage;
                    
                    // Check if normal attack killed the target
                    if (targetMask.currentHealth === 0) {
                      soulsCollected++;
                    }
                    
                    // Mark targets with death energy
                    targetMask.poisonStacks += 1;
                    targetMask.bleedStacks += 1;
                    
                    console.log(`Mask ${maskID} reaps soul energy from Mask ${targetMaskID}, dealing ${Math.round(finalDamage)} death damage!`);
                  }
                }
              });
              
              // Soul collection rewards (from any kill - execution or damage)
              if (soulsCollected > 0) {
                mask.action = true; // Death grants another action
                mask.bonusAction = true;
                mask.earnedExtraAction = true; // Prevent action removal
                
                // Grant untargetability (1 turn per kill, max 3)
                mask.untargetable = Math.min(mask.untargetable + soulsCollected, 3);
                
                // Permanent percentage-based growth (3% per kill, more balanced)
                const killGrowth = soulsCollected * 0.03;
                mask.attackDamage *= (1 + killGrowth);
                mask.speed = Math.min(mask.speed * (1 + killGrowth), 100);
                
                // Add soul stacks (reduced from 3 to 2 base, bonus if untargetable)
                const baseStacks = soulsCollected * 2;
                const bonusStacks = mask.untargetable > 0 ? soulsCollected : 0;
                mask.buffStacks += baseStacks + bonusStacks;
              }
              
              // Stack consumption option for extra protection (10+ stacks)
              if (mask.buffStacks >= 10) {
                mask.buffStacks -= 10;
                mask.untargetable = Math.min(mask.untargetable + 1, 3);
                mask.stackConsumptionActive = true; // Flag for bonus stacks on kill
              }
              
              // Bonus stacks if untargetable from consumption and got kills (reduced to +5)
              if (mask.stackConsumptionActive && soulsCollected > 0) {
                mask.buffStacks += 5;
                mask.stackConsumptionActive = false; // Reset flag
              }
              
              // Soul energy healing (percentage-based, slightly reduced)
              const healPercent = 0.01 + (soulStacks * 0.001); // 1% + 0.1% per stack
              const healAmount = mask.health * healPercent;
              mask.currentHealth = Math.min(mask.currentHealth + healAmount, mask.health);
              
              // Battle message
              let message = `Mask ${maskID} unleashes SOUL HARVEST! `;
              if (executionKills > 0) {
                message += `${executionKills} execution${executionKills > 1 ? 's' : ''} claimed! `;
              }
              message += `Total damage: ${Math.round(totalDamage)}! `;
              if (soulsCollected > 0) {
                message += `${soulsCollected} soul${soulsCollected > 1 ? 's' : ''} harvested - REAPER'S ASCENSION!`;
              } else {
                message += `${soulStacks} soul stacks empower the harvest.`;
              }
              
              battleMessage = message;
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
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
                    // Mark that this mask earned an extra action to prevent it from being removed
                    mask.earnedExtraAction = true;
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
            // Apply cooldown to the used skill, except for Unforseen Strike and skills that had their cooldown reset
            if (skill.skillName !== 'Unforseen Strike' && !mask.skillCooldownReset) {
              mask.cooldowns[skillID] = skill.cooldown + 1;
            }
            // Clear the cooldown reset flag for next use
            mask.skillCooldownReset = false;
            
            // Only remove action if the mask hasn't earned another action (like from berserker kills)
            if (!mask.earnedExtraAction) {
              mask.action = false; // Set action to false after using a skill
            }
            // Clear the extra action flag for next use
            mask.earnedExtraAction = false;
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

    socket.on('assign-mask-to-character', async (data) => {
      try {
        const { characterID, maskID } = data;
        console.log(`Assigning mask ${maskID} to character ${characterID}`);
        
        // Verify character exists
        const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
        if (!characterInfo) {
          console.error(`Character with ID ${characterID} not found`);
          return;
        }

        // Verify mask exists (optional, but good for data integrity)
        if (maskID !== null) {
          const maskExists = await MaskList.findOne({ where: { maskID } });
          if (!maskExists) {
            console.error(`Mask with ID ${maskID} not found`);
            return;
          }
        }

        // Update character's mask assignment
        await CharacterInfo.update({ maskID }, { where: { characterID } });
        console.log(`Successfully assigned mask ${maskID} to character ${characterID}`);
        
        // Optionally broadcast the update to other clients
        io.emit('maskAssignmentUpdated', { characterID, maskID });
      } catch (error) {
        console.error('Error assigning mask to character:', error);
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

// DELETE endpoint for removing family members
app.delete('/character-info/:characterID/family/:familyMemberID', async (req, res) => {
  const { characterID, familyMemberID } = req.params;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    // Remove the family member ID from the array
    const updatedFamilyMembers = characterInfo.familyMembers.filter(
      id => id != familyMemberID // Use != instead of !== to handle string/number conversion
    );
    
    await CharacterInfo.update({ familyMembers: updatedFamilyMembers }, { where: { characterID } });

    res.status(200).json({ message: 'Family member removed successfully' });
  } catch (error) {
    console.error('Error removing family member:', error);
    res.status(500).send('Failed to remove family member');
  }
});

// DELETE endpoint for removing friend members
app.delete('/character-info/:characterID/friend/:friendMemberID', async (req, res) => {
  const { characterID, friendMemberID } = req.params;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    // Remove the friend member ID from the array
    const updatedFriendMembers = characterInfo.friendMembers.filter(
      id => id != friendMemberID // Use != instead of !== to handle string/number conversion
    );
    
    await CharacterInfo.update({ friendMembers: updatedFriendMembers }, { where: { characterID } });

    res.status(200).json({ message: 'Friend member removed successfully' });
  } catch (error) {
    console.error('Error removing friend member:', error);
    res.status(500).send('Failed to remove friend member');
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

    // Remove the item ID from the character's inventory array (but don't delete the actual item)
    const updatedInventoryItems = characterInfo.itemInventory.filter(
      id => id != itemID // Use != instead of !== to handle string/number conversion
    );
    await CharacterInfo.update({ itemInventory: updatedInventoryItems }, { where: { characterID } });

    // Note: We're NOT deleting the actual item from ItemList table
    // The item remains in the database and can be re-assigned to other characters

    res.status(200).json({ message: 'Inventory item removed from character successfully' });
  } catch (error) {
    console.error('Error removing inventory item from character:', error);
    res.status(500).send('Failed to remove inventory item from character');
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

// Global endpoints for fetching all skills and items
app.get('/all-skills', async (req, res) => {
  try {
    const skills = await SkillList.findAll({
      order: [['skillName', 'ASC']]
    });
    res.json(skills);
  } catch (error) {
    console.error('Error fetching all skills:', error);
    res.status(500).send('Failed to fetch all skills');
  }
});

app.get('/all-items', async (req, res) => {
  try {
    const items = await ItemList.findAll({
      order: [['itemName', 'ASC']]
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching all items:', error);
    res.status(500).send('Failed to fetch all items');
  }
});

// Global endpoints for creating skills and items
app.post('/skills', async (req, res) => {
  const { skillName, mainStat, description, diceRoll } = req.body;

  try {
    const newSkill = await SkillList.create({
      skillName,
      mainStat,
      description,
      diceRoll
    });

    res.status(201).json(newSkill);
  } catch (error) {
    console.error('Error creating global skill:', error);
    res.status(500).send('Failed to create global skill');
  }
});

app.post('/items', async (req, res) => {
  const { itemName, type, mainStat, description, damage, photo } = req.body;

  try {
    const newItem = await ItemList.create({
      itemName,
      type,
      mainStat,
      description,
      damage,
      photo: photo || ''
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating global item:', error);
    res.status(500).send('Failed to create global item');
  }
});

// Global endpoints for deleting skills and items
app.delete('/skills/:skillID', async (req, res) => {
  const { skillID } = req.params;

  try {
    const skill = await SkillList.findOne({ where: { skillID } });
    if (!skill) {
      return res.status(404).send('Skill not found');
    }

    await SkillList.destroy({ where: { skillID } });
    res.status(200).json({ message: 'Global skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting global skill:', error);
    res.status(500).send('Failed to delete global skill');
  }
});

app.delete('/items/:itemID', async (req, res) => {
  const { itemID } = req.params;

  try {
    const item = await ItemList.findOne({ where: { itemID } });
    if (!item) {
      return res.status(404).send('Item not found');
    }

    await ItemList.destroy({ where: { itemID } });
    res.status(200).json({ message: 'Global item deleted successfully' });
  } catch (error) {
    console.error('Error deleting global item:', error);
    res.status(500).send('Failed to delete global item');
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

// Admin endpoint to get all users (DM only)
app.get('/admin/users', verifyToken, async (req, res) => {
  if (req.user.role !== 'Dungeon Master') {
    return res.status(403).json({ message: 'Access denied. Dungeon Master role required.' });
  }

  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'isTemporaryPassword', 'temporaryPasswordExpires'],
      where: {
        role: { [Op.ne]: 'Dungeon Master' } // Exclude other DMs
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Admin endpoint to reset user password (DM only)
app.post('/admin/reset-password', verifyToken, async (req, res) => {
  if (req.user.role !== 'Dungeon Master') {
    return res.status(403).json({ message: 'Access denied. Dungeon Master role required.' });
  }

  const { userId } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'Dungeon Master') {
      return res.status(400).json({ message: 'Cannot reset password for another Dungeon Master' });
    }

    // Generate temporary password (8 characters, readable)
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);
    
    // Set expiration to 7 days from now
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);

    await user.update({
      password: hashedTempPassword,
      isTemporaryPassword: true,
      temporaryPasswordExpires: expirationDate
    });

    res.json({ 
      message: 'Password reset successfully',
      temporaryPassword: tempPassword,
      username: user.username,
      expiresAt: expirationDate
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Endpoint for users to change their password (especially after temporary login)
app.post('/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long' });
  }

  try {
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear temporary password flags
    await user.update({
      password: hashedNewPassword,
      isTemporaryPassword: false,
      temporaryPasswordExpires: null
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password' });
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

// New endpoint for creating masks without assigning to characters
app.post('/masks', async (req, res) => {
  const { photo, passiveSkill, activeSkills, attackDamage, abilityDamage, magicResist, protections, health, speed } = req.body;

  try {
    const relativePhotoPath = photo ? photo.replace(`https://${localIP}:443`, '') : '';

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

    res.status(201).json(newMask);
  } catch (error) {
    console.error('Error creating mask:', error);
    res.status(500).send('Failed to create mask');
  }
});

// New endpoint for assigning mask to character
app.put('/character-info/:characterID/assign-mask', async (req, res) => {
  const { characterID } = req.params;
  const { maskID } = req.body;

  try {
    const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
    if (!characterInfo) {
      return res.status(404).send('Character info not found');
    }

    // Verify mask exists
    if (maskID !== null) {
      const maskExists = await MaskList.findOne({ where: { maskID } });
      if (!maskExists) {
        return res.status(404).send('Mask not found');
      }
    }

    await CharacterInfo.update({ maskID }, { where: { characterID } });
    res.status(200).json({ message: 'Mask assignment updated successfully' });
  } catch (error) {
    console.error('Error assigning mask:', error);
    res.status(500).send('Failed to assign mask');
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

// Update existing mask
app.put('/masks/:maskID', async (req, res) => {
  const { maskID } = req.params;
  const { photo, passiveSkill, activeSkills, attackDamage, abilityDamage, magicResist, protections, health, speed } = req.body;

  try {
    const mask = await MaskList.findByPk(maskID);
    if (!mask) {
      return res.status(404).json({ error: 'Mask not found' });
    }

    const relativePhotoPath = photo ? photo.replace(`https://${localIP}:443`, '') : mask.photo;

    await mask.update({
      photo: relativePhotoPath,
      passiveSkill: passiveSkill || mask.passiveSkill,
      activeSkills: activeSkills || mask.activeSkills,
      attackDamage: attackDamage !== undefined ? attackDamage : mask.attackDamage,
      abilityDamage: abilityDamage !== undefined ? abilityDamage : mask.abilityDamage,
      magicResist: magicResist !== undefined ? magicResist : mask.magicResist,
      protections: protections !== undefined ? protections : mask.protections,
      health: health !== undefined ? health : mask.health,
      currentHealth: health !== undefined ? health : mask.currentHealth, // Update currentHealth if health is updated
      speed: speed !== undefined ? speed : mask.speed
    });

    res.json(mask);
  } catch (error) {
    console.error('Error updating mask:', error);
    res.status(500).send('Failed to update mask');
  }
});

// Delete existing mask
app.delete('/masks/:maskID', async (req, res) => {
  const { maskID } = req.params;

  try {
    const mask = await MaskList.findByPk(maskID);
    if (!mask) {
      return res.status(404).json({ error: 'Mask not found' });
    }

    // Check if mask is currently assigned to any character
    const CharacterInfo = require('./models/CharacterInfo');
    const assignedCharacters = await CharacterInfo.findAll({
      where: { maskID: maskID }
    });

    if (assignedCharacters.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete mask as it is currently assigned to one or more characters',
        assignedCharacters: assignedCharacters.map(char => char.characterName)
      });
    }

    await mask.destroy();
    res.json({ message: 'Mask deleted successfully' });
  } catch (error) {
    console.error('Error deleting mask:', error);
    res.status(500).send('Failed to delete mask');
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
  let battleMessage = ''; // Initialize battleMessage

  // Fetch all skills once and store them in the global skillNames dictionary
  const skills = await MaskSkills.findAll();
  skills.forEach(skill => {
    skillNames[skill.skillID] = skill.skillName;
  });
  
  // Mirror King and Summon skill names are already in global skillNames object

  const defaultMaskIDs = [8888, 8686, 10000, 90000, 90001, 90002, 90003, 90004, 90005, 90006]; // Extract maskIDs from defaultMasks

  // Mirror King immortality and phase transition logic
  const mirrorKing = masksInBattle[90000];
  if (mirrorKing && mirrorKing.currentHealth <= 0) {
    const summons = [90001, 90002, 90003, 90004, 90005, 90006];
    const allSummonsDead = summons.every(id => !masksInBattle[id] || masksInBattle[id].currentHealth === 0);
    
    if (!allSummonsDead) {
      // Mirror King cannot die while summons are alive - heal to full
      mirrorKing.currentHealth = mirrorKing.health;
      battleMessage = `The Mirror King cannot be slain while his reflections persist!`;
      console.log(battleMessage);
      io.emit('battleMessage', battleMessage);
    } else if (!mirrorKing.phase2Active) {
      // All summons dead and not in phase 2 yet - trigger phase 2 transformation
      mirrorKing.phase2Active = true;
      mirrorKing.attackDamage *= 2;
      mirrorKing.abilityDamage *= 2;
      mirrorKing.magicResist *= 2;
      mirrorKing.protections *= 2;
      mirrorKing.health *= 2;
      mirrorKing.currentHealth = mirrorKing.health;
      mirrorKing.activeSkills = [900010, 900011]; // Phase 2 skills
      mirrorKing.photo = "/assets/images/MirrorKing.png"; // Can change to phase 2 image if you have one
      
      // Resummon all summons with 2x stats
      summons.forEach((summonID, index) => {
        const originalStats = {
          90001: { atk: 1500000000, abil: 1000000000, prot: 800000000, mr: 800000000, hp: 12000000000, skills: [900002, 900003], photo: "/assets/images/Summon1.png", name: "Pale Reaper" },
          90002: { atk: 1200000000, abil: 1200000000, prot: 700000000, mr: 700000000, hp: 10000000000, skills: [900004, 900005], photo: "/assets/images/Summon2.png", name: "Ember Fang" },
          90003: { atk: 1400000000, abil: 800000000, prot: 600000000, mr: 600000000, hp: 900000000, skills: [900006, 900007], photo: "/assets/images/Summon3.png", name: "Stormbound Sentinel" },
          90004: { atk: 1000000000, abil: 1000000000, prot: 1200000000, mr: 1200000000, hp: 1500000000, skills: [900008, 900009], photo: "/assets/images/Summon4.png", name: "Plagueborne Warden" },
          90005: { atk: 1100000000, abil: 1500000000, prot: 500000000, mr: 500000000, hp: 800000000, skills: [900020, 900021], photo: "/assets/images/Summon5.png", name: "Veil Walker" },
          90006: { atk: 1300000000, abil: 1300000000, prot: 900000000, mr: 900000000, hp: 1100000000, skills: [900022, 900023], photo: "/assets/images/Summon6.png", name: "Blighted Champion" }
        };
        
        const stats = originalStats[summonID];
        masksInBattle[summonID] = {
          maskID: summonID,
          name: stats.name,
          attackDamage: stats.atk * 2,
          abilityDamage: stats.abil * 2,
          protections: stats.prot * 2,
          magicResist: stats.mr * 2,
          health: stats.hp * 2,
          speed: 100,
          currentHealth: stats.hp * 2,
          currentSpeed: 0,
          activeSkills: stats.skills,
          stunStacks: 0,
          burnStacks: 0,
          poisonStacks: 0,
          bleedStacks: 0,
          buffStacks: 0,
          action: false,
          bonusAction: false,
          movement: 0,
          team: mirrorKing.team,
          cooldowns: {},
          photo: stats.photo
        };
      });
      
      battleMessage = `The Mirror King shatters reality itself! Phase 2 begins - all reflections return, stronger than before!`;
      console.log(battleMessage);
      io.emit('battleMessage', battleMessage);
    }
  }
  
  // Mirror King healing while summons alive
  if (mirrorKing && mirrorKing.currentHealth > 0 && mirrorKing.currentHealth < mirrorKing.health) {
    const summons = [90001, 90002, 90003, 90004, 90005, 90006];
    const anySummonsAlive = summons.some(id => masksInBattle[id] && masksInBattle[id].currentHealth > 0);
    
    if (anySummonsAlive) {
      mirrorKing.currentHealth = mirrorKing.health;
      if (Math.random() < 0.3) { // 30% chance to show message to avoid spam
        battleMessage = `The Mirror King's reflections restore him to full health!`;
        console.log(battleMessage);
        io.emit('battleMessage', battleMessage);
      }
    }
  }

  Object.values(masksInBattle).forEach(mask => {
  
    // Decrement untargetable turns if it's a number, otherwise reset to false
    if (typeof mask.untargetable === 'number' && mask.untargetable > 0) {
      mask.untargetable = Math.max(mask.untargetable - 1, 0);
    } else if (mask.untargetable === true) {
      mask.untargetable = false; // Reset boolean untargetable to false
    }
    mask.action = false; // Reset action to false
    mask.bonusAction = false; // Reset bonusAction to false
    mask.movement = 0; // Reset movement to 0
    // Dead masks will now stay in battle until reset health or end battle is pressed
    
    
    if (mask.currentHealth <= 0) {
      mask.currentHealth = 0; // Ensure currentHealth is set to 0 if mask is dead
      mask.action = false; // Reset action to false
      mask.bonusAction = false; // Reset bonusAction to false
      mask.movement = 0; // Reset movement to 0
      mask.currentSpeed = 0;
      mask.activeSkills.forEach(skillID => { //This is cycle skills while dead)
        const skillName = skillNames[skillID];
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
                    // Deal damage to all enemies, reduced by their magicResist
                    const damage = Math.max(mask.health - targetMask.magicResist, 0);
                    targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
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
      // If mask.activeSkills contains a skillID, find the skill name and run the if statements (This is called cycle skills while alive)
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
            mask.health += deadMasksCount * 0.2 * mask.attackDamage; // Increase max health by 20% of attack damage for each dead mask
            mask.currentHealth += deadMasksCount * 0.2 * mask.attackDamage; // Heal for 20% of attack damage for each dead mask
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
          if (skillName === "Blind leading the Blind") {
            console.log(`Mask ${mask.maskID} has skill: Blind leading the Blind`);
            Object.values(masksInBattle).forEach(targetMask => {
              if (
                targetMask.team !== mask.team &&
                targetMask.currentHealth > 0 &&
                targetMask.currentSpeed > mask.currentSpeed
              ) {
                targetMask.stunStacks += 1;
                console.log(`Increased stun stacks of mask ${targetMask.maskID} by 1 due to higher currentSpeed`);
              }
            });
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

            blackHoleDamage += mask.abilityDamage * 0.05; // Increase blackHoleDamage by 5% of mask.abilityDamage
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
                const reducedDamage = Math.max(damage - targetMask.magicResist, 0);
                targetMask.currentHealth = Math.max(targetMask.currentHealth - reducedDamage, 0); // Deal reduced damage and cap at 0
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
            mask.buffStacks =+ 1; // Increase buffStacks by 1
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team);
            enemies.forEach(targetMask => {
              const damage = Math.max(mask.abilityDamage * 0.05 * mask.buffStacks - targetMask.magicResist, 0);
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
              masksInBattle[targetMask.maskID] = targetMask; // Ensure the updated targetMask is added to masksInBattle
            });
            battleMessage = `Mask ${mask.maskID} used Screw the Haters and dealt damage to all enemies (reduced by their magicResist)`;
                      
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
              const reduction = targetMask.protections || 0;
              const finalDamage = Math.max(damage - reduction, 0);
              targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0); // Deal damage and cap at 0
              }
            });
            battleMessage = `Mask ${mask.maskID} used Pick a Weapon and dealt ${damage} (reduced by protections) damage to all enemies`;
                      
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
                let damage = mask.attackDamage * 0.25;
                const reduction = targetMask.protections || 0;
                damage = Math.max(damage - reduction, 0); // Reduce damage by protections, ensure not negative
                targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
                masksInBattle[targetMask.maskID] = targetMask; // Ensure the updated targetMask is added to masksInBattle
                battleMessage = `Mask ${mask.maskID} used Blinded Rage and dealt ${damage} damage to ally Mask ${targetMask.maskID}`;
                      
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
                const damage = Math.max(mask.abilityDamage * 0.1 - targetMask.magicResist, 0);
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
                let damage = targetMask.health * 0.075;
                damage = Math.max(damage - targetMask.magicResist, 0); // Reduce by magicResist, not below 0
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
                let damage = mask.attackDamage * 0.5;
                const reduction = targetMask.protections || 0;
                damage = Math.max(damage - reduction, 0); // Reduce damage by protections, ensure not negative
                targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
                const heal = damage * 0.5; // Heal for 50% of damage dealt
                totalHeal += heal;
                console.log(`Dealt ${damage} damage to mask ${targetMask.maskID}, healed for ${heal}`);
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
                const reduction = targetMask.protections || 0;
                const finalDamage = Math.max(damage - reduction, 0); // Reduce by protections, not below 0
                targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0); // Deal damage and cap at 0
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
          if (skillName === "Magic Missiles") {
          mask.buffStacks += 1;
            if (mask.buffStacks >= 10) {
              mask.buffStacks = 0;
              const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
              if (enemies.length > 0) {
                for (let i = 0; i < 25; i++) {
                  const randomIndex = Math.floor(Math.random() * enemies.length);
                  const targetMask = enemies[randomIndex];
                  const damage = Math.max(mask.abilityDamage * 0.5 - targetMask.magicResist, 0);
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
                  targetMask.burnStacks += 1;
                  battleMessage = `Mask ${mask.maskID} used Magic Missiles and dealt ${damage} damage to mask ${targetMask.maskID} and applied a burn stack.`;
                  if (battleMessage) {
                    console.log(battleMessage);
                    io.emit('battleMessage', battleMessage);
                  }
                }
              }
            }
          }
            if (skillName === "Hack the Matrix") {
            console.log(`Mask ${mask.maskID} has skill: Hack the Matrix`);
            const increase = mask.abilityDamage * 0.1;
            mask.attackDamage += increase;
            mask.abilityDamage += increase;
            mask.magicResist += increase;
            mask.protections += increase;
            mask.health += increase;
            mask.currentHealth += increase;
            mask.speed += increase;
            battleMessage = `Mask ${mask.maskID} used Hack the Matrix and increased all stats by 10% of Ability Damage.`;
            if (battleMessage) {
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
            }

          if (skillName === "Too old for this") {
            console.log(`Mask ${mask.maskID} has skill: Too old for this`);
            let totalDecreasedHealth = 0;
            let enemyCombinedHealthBefore = 0;

            // Calculate combined enemy health BEFORE any modifications
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team !== mask.team && targetMask.currentHealth > 0) {
                enemyCombinedHealthBefore += Number(targetMask.health);
              }
            });
            
            // Store original mask health for comparison
            const originalMaskHealth = Number(mask.health);

            // Loop through all enemy masks
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team !== mask.team && Number(targetMask.currentHealth) > 0) {
                const originalHealth = Number(targetMask.health);
                const decreaseAmount = originalHealth * 0.005; // Decrease health by 0.5%
                const newHealth = Math.max(originalHealth - decreaseAmount, 0);
                
                console.log(`Draining from ${targetMask.name || targetMask.maskID}: ${originalHealth} -> ${newHealth} (drained ${decreaseAmount})`);
                
                targetMask.health = newHealth;
                targetMask.currentHealth = Math.min(Number(targetMask.currentHealth), newHealth);
                totalDecreasedHealth += decreaseAmount;
              }
            });

            // Add the total decreased amount to this mask's health and current health
            const newMaskHealth = Number(mask.health) + totalDecreasedHealth;
            const newMaskCurrentHealth = Number(mask.currentHealth) + totalDecreasedHealth;
            
            console.log(`Mask ${mask.maskID} gained ${totalDecreasedHealth} health: ${mask.health} -> ${newMaskHealth}`);
            
            mask.health = newMaskHealth;
            mask.currentHealth = Math.min(newMaskCurrentHealth, newMaskHealth);

            // Check using ORIGINAL values before modifications (harder condition)
            if (enemyCombinedHealthBefore * 4 < originalMaskHealth) {
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
              const reduction = targetMask.protections || 0;
              const finalDamage = Math.max(damage - reduction, 0);
              targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0);
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
              const damage = Math.max(mask.attackDamage * 1 - targetMask.protections, 0);
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
              const stacks = ['stunStacks', 'burnStacks', 'poisonStacks', 'bleedStacks'];
              const randomStack = stacks[Math.floor(Math.random() * stacks.length)];
              targetMask[randomStack] += 2;
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
          if (skillName === "Poisoned Stone") {
            console.log(`Mask ${mask.maskID} has skill: Poisoned Stone`);
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team !== mask.team && targetMask.stunStacks > 0) {
                targetMask.poisonStacks += 1;
                console.log(`Increased poison stacks of mask ${targetMask.maskID} by 1 due to having stun stacks`);
              }
            });
            battleMessage = `Mask ${mask.maskID} used Poisoned Stone and increased poison stacks by 1 for each enemy with stun stacks.`;
            if (battleMessage) {
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          if (skillName === "Redemption") {
            console.log(`Mask ${mask.maskID} has skill: Redemption`);
            for (let i = 0; i < mask.buffStacks; i++) {
              const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
              if (enemies.length > 0) {
                const randomIndex = Math.floor(Math.random() * enemies.length);
                const targetMask = enemies[randomIndex];
                const damage = Math.max(mask.abilityDamage * 0.20 - targetMask.magicResist, 0);
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
            mask.health += mask.health * (mask.buffStacks / 100);
            mask.currentHealth += mask.health * (mask.buffStacks / 100);
            battleMessage = `Mask ${mask.maskID} used Commander's Rage and increased it's Max Health by ${mask.buffStacks}%`;
            if (battleMessage) {
              console.log(battleMessage); // Log battleMessage if not empty
              io.emit('battleMessage', battleMessage); // Emit battleMessage if not empty
            }
          } 
          if (skillName === "Lurk in the Shadows") {
            console.log(`Mask ${mask.maskID} has skill: Lurk in the Shadows`);
            if (!masksInBattle[9997]) {
              const dogStats = {
              maskID: 9997,
              attackDamage: mask.abilityDamage * 0.25,
              abilityDamage: mask.abilityDamage * 0.25,
              protections: mask.abilityDamage * 0.1,
              magicResist: mask.abilityDamage * 0.1,
              health: mask.abilityDamage * 5,
              speed: 100,
              currentHealth: mask.abilityDamage * 5,
              currentSpeed: 0,
              activeSkills: [9997],
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
              photo: "/assets/images/ShadowDoggo.jpg"
              };
              masksInBattle[9997] = dogStats;
              console.log(`A good boy was summoned!`);
              battleMessage = `Mask ${mask.maskID} used Lurk in the Shadows and summoned a good boy!`;
              if (battleMessage) {
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
              }
            }

            if (Math.random() < 0.5) {
              mask.untargetable = true;
              const stealthMessage = `Mask ${mask.maskID} entered stealth!`;
              console.log(stealthMessage);
              io.emit('battleMessage', stealthMessage);
            }
          }
          if (skillName === "Lurk in the Shadows Dog") {

            if (Math.random() < 0.5) {
              mask.untargetable = true;
              const stealthMessage = `Mask ${mask.maskID} entered stealth!`;
              console.log(stealthMessage);
              io.emit('battleMessage', stealthMessage);
            }

            console.log(`Mask ${mask.maskID} has skill: Lurk in the Shadows Dog`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              let damage;
                if (mask.untargetable) {
                damage = Math.max(mask.attackDamage * 2 - targetMask.protections, 0);
                battleMessage = `Mask ${mask.maskID} is currently invisible and performed a stealth attack, dealing ${damage} damage to mask ${targetMask.maskID}.`;
                } else {
                damage = Math.max(mask.attackDamage * 1 - targetMask.protections, 0);
                battleMessage = `Mask ${mask.maskID} is targetable and attacked mask ${targetMask.maskID}, dealing ${damage} damage.`;
                }
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
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
                    const reduction = targetMask.magicResist || 0;
                    damage = Math.max(damage - reduction, 0);
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
                const damage = Math.max(mask.attackDamage * 5 - targetMask.protections, 0);
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
              let damage = mask.abilityDamage * 0.1;
              damage = Math.max(damage - targetMask.magicResist, 0);
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
              let damage = mask.abilityDamage * 0.5;
              const reduction = targetMask.magicResist || 0;
              damage = Math.max(damage - reduction, 0);
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
          
          if (skillName === "Void Convergence") {
            console.log(`Mask ${mask.maskID} has skill: Void Convergence`);
            
            // Void energy passively emanates from this cosmic being
            mask.buffStacks += 1;
            
            // Every 3 turns, reality distorts around all enemies
            if (mask.buffStacks % 3 === 0) {
              const voidPulse = mask.abilityDamage * 0.3;
              let affectedEnemies = 0;
              
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.team !== mask.team && targetMask.currentHealth > 0) {
                  // Cosmic void slowly erodes reality around enemies
                  const voidDamage = Math.max(voidPulse, 1);
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - voidDamage, 0);
                  
                  // Reality becomes unstable - reduce maximum stats slightly
                  targetMask.health = Math.max(targetMask.health - (mask.abilityDamage * 0.01), targetMask.health * 0.9);
                  targetMask.currentHealth = Math.min(targetMask.currentHealth, targetMask.health);
                  
                  // 25% chance per enemy to gain a debuff from cosmic exposure
                  if (Math.random() < 0.25) {
                    const debuffs = ['stunStacks', 'poisonStacks', 'burnStacks'];
                    const randomDebuff = debuffs[Math.floor(Math.random() * debuffs.length)];
                    targetMask[randomDebuff] += 1;
                  }
                  affectedEnemies++;
                }
              });
              
              // The cosmic entity grows stronger as reality bends to their will
              mask.abilityDamage += affectedEnemies * 2;
              mask.magicResist += affectedEnemies;
              
              battleMessage = `Cosmic void pulses around Mask ${mask.maskID}! Reality distorts, affecting ${affectedEnemies} enemies and strengthening the void entity!`;
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
            } else {
              // Minor cosmic energy buildup each turn
              mask.abilityDamage += 1;
              const subtleMessage = `Dark energy swirls around Mask ${mask.maskID} as cosmic power builds... (${mask.buffStacks}/3)`;
              console.log(subtleMessage);
              io.emit('battleMessage', subtleMessage);
            }
          }
          
          if (skillName === "Infernal Rampage") {
            console.log(`Mask ${mask.maskID} has skill: Infernal Rampage`);
            
            // Rage builds as the demon takes damage or deals damage
            const healthPercent = (mask.currentHealth / mask.health);
            const rageGain = healthPercent < 0.5 ? 2 : 1; // More rage when injured
            mask.buffStacks += rageGain;
            
            // Passive hellfire aura damages nearby enemies
            if (mask.buffStacks >= 2) {
              let auraDamage = 0;
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.team !== mask.team && targetMask.currentHealth > 0) {
                  const fireDamage = Math.max((mask.attackDamage * 0.05 * mask.buffStacks) - targetMask.magicResist, 0);
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - fireDamage, 0);
                  auraDamage += fireDamage;
                  
                  // 15% chance to apply burn from hellfire proximity
                  if (Math.random() < 0.15) {
                    targetMask.burnStacks += 1;
                  }
                }
              });
              
              if (auraDamage > 0) {
                battleMessage = `Hellfire radiates from Mask ${mask.maskID}'s fury! Aura deals ${Math.round(auraDamage)} damage (Rage: ${mask.buffStacks})`;
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
            }
            
            // At maximum rage, gain combat bonuses
            if (mask.buffStacks >= 8) {
              mask.attackDamage += 5; // Permanent growth from sustained fury
              mask.speed = Math.min(mask.speed + 2, 100); // Becomes faster in rage
              
              // Intimidating presence - enemies near max-rage demon get debuffed
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.team !== mask.team && targetMask.currentHealth > 0) {
                  if (Math.random() < 0.3) { // 30% chance per enemy
                    targetMask.stunStacks += 1;
                  }
                }
              });
              
              const rageMessage = `Mask ${mask.maskID} reaches MAXIMUM FURY! Hellish presence terrorizes enemies!`;
              console.log(rageMessage);
              io.emit('battleMessage', rageMessage);
            } else {
              const buildupMessage = `Hellish rage builds within Mask ${mask.maskID}... (${mask.buffStacks}/8 fury)`;
              console.log(buildupMessage);
              io.emit('battleMessage', buildupMessage);
            }
          }
          
          if (skillName === "Phantom Strike") {
            console.log(`Mask ${mask.maskID} has skill: Phantom Strike`);
            
            // Spectral form allows periodic phasing (scales significantly with speed)
            const phaseChance = Math.min(5 + (mask.speed * 0.5), 55); // 5-55% chance based on speed
            if (Math.random() * 100 < phaseChance) {
              mask.untargetable = true;
              const phaseMessage = `Mask ${mask.maskID} phases into spectral form, becoming untargetable!`;
              console.log(phaseMessage);
              io.emit('battleMessage', phaseMessage);
            }
            
            // Ghostly presence chills nearby enemies (damage scales with speed^1.5)
            let chillEffect = 0;
            const spectralAura = mask.abilityDamage * 0.02 * Math.pow(mask.speed / 100, 1.5); // Speed has 1.5 power scaling
            
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.team !== mask.team && targetMask.currentHealth > 0) {
                // Spectral chill damage increases dramatically with speed
                const chillDamage = Math.max(spectralAura + (mask.speed * 0.1) - targetMask.magicResist, 0);
                targetMask.currentHealth = Math.max(targetMask.currentHealth - chillDamage, 0);
                chillEffect += chillDamage;
                
                // Speed-based debuff chance (20% base + speed/5)
                const debuffChance = 20 + (mask.speed / 5); // 20-40% chance
                if (Math.random() * 100 < debuffChance) {
                  const speedLoss = 3 + (mask.speed * 0.05); // 3-8 speed loss
                  targetMask.speed = Math.max(targetMask.speed - speedLoss, 10);
                  targetMask.poisonStacks += 1; // Spectral toxin
                }
              }
            });
            
            // Ethereal mobility - gains speed from spectral nature
            mask.speed = Math.min(mask.speed + 1, 99); // Capped at 99 to avoid speed reset
            mask.currentSpeed = Math.min(mask.currentSpeed + 5, 100);
            
            // Feed on fear - grows stronger when enemies are debuffed (speed amplifies this effect)
            const debuffedEnemies = Object.values(masksInBattle).filter(targetMask => 
              targetMask.team !== mask.team && 
              (targetMask.stunStacks > 0 || targetMask.poisonStacks > 0 || targetMask.burnStacks > 0 || targetMask.bleedStacks > 0)
            );
            
            if (debuffedEnemies.length > 0) {
              // Speed multiplies the fear feeding effect
              const speedMultiplier = 1 + (mask.speed * 0.01); // 1.0x to 2.0x multiplier
              const fearGain = debuffedEnemies.length * speedMultiplier;
              
              mask.attackDamage += fearGain;
              mask.abilityDamage += fearGain;
              
              const fearMessage = `Spectral energy around Mask ${mask.maskID} feeds on ${debuffedEnemies.length} debuffed enemies (${speedMultiplier.toFixed(1)}x speed bonus), growing stronger!`;
              console.log(fearMessage);
              io.emit('battleMessage', fearMessage);
            }
            
            if (chillEffect > 0) {
              const chillMessage = `Ghostly mist emanates from Mask ${mask.maskID}, dealing ${Math.round(chillEffect)} spectral chill damage!`;
              console.log(chillMessage);
              io.emit('battleMessage', chillMessage);
            }
          }
          
          if (skillName === "Soul Harvest") {
            console.log(`Mask ${mask.maskID} has skill: Soul Harvest`);
            
            // Count dead masks for soul stack accumulation
            const deadMasks = Object.values(masksInBattle).filter(m => m.currentHealth === 0);
            const currentDeadCount = deadMasks.length;
            
            // Initialize buff stacks if needed
            if (!mask.buffStacks) {
              mask.buffStacks = 0;
            }
            
            // Initialize turn counter for Soul Harvest
            if (!mask.soulHarvestTurnCounter) {
              mask.soulHarvestTurnCounter = 0;
            }
            
            // Increment turn counter
            mask.soulHarvestTurnCounter += 1;
            
            // Gain 1 stack for every 2 dead masks, but only every 2 turns
            if (currentDeadCount > 0 && mask.soulHarvestTurnCounter % 2 === 0) {
              const stacksToGain = Math.floor(currentDeadCount / 2);
              if (stacksToGain > 0) {
                mask.buffStacks += stacksToGain;
              }
            }
            
            // Percentage-based growth from soul stacks
            if (mask.buffStacks > 0) {
              const stackCount = mask.buffStacks;
              const growthRate = stackCount * 0.01; // 1% per stack per cycle (reduced from 2%)
              
              // Apply percentage growth to core stats
              mask.speed = Math.min(mask.speed * (1 + growthRate), 100);
              mask.attackDamage *= (1 + growthRate);
              mask.magicResist *= (1 + growthRate);
              mask.protections *= (1 + growthRate);
              
              // Soul aura damage (percentage-based)
              let auralDamage = 0;
              const auraPercent = stackCount * 0.0025; // 0.25% per stack (reduced from 0.5%)
              
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.team !== mask.team && targetMask.currentHealth > 0) {
                  const soulDamage = targetMask.health * auraPercent;
                  const finalDamage = Math.max(soulDamage - (targetMask.magicResist * 0.3), soulDamage * 0.5);
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - finalDamage, 0);
                  auralDamage += finalDamage;
                  
                  // Death mark - chance to apply stacks based on soul stacks
                  const markChance = Math.min(3 + (stackCount * 1), 25); // 3-25% chance (reduced from 5-40%)
                  if (Math.random() * 100 < markChance) {
                    targetMask.poisonStacks += 1;
                    if (stackCount >= 20) {
                      targetMask.bleedStacks += 1; // Extra effect with 20+ stacks (increased from 15)
                    }
                  }
                }
              });
              
              // Percentage-based healing
              const healPercent = stackCount * 0.0025; // 0.25% per stack (reduced from 0.5%)
              const healAmount = mask.health * healPercent;
              mask.currentHealth = Math.min(mask.currentHealth + healAmount, mask.health);
              
              if (auralDamage > 0) {
                const auraMessage = `Soul energy radiates from Mask ${mask.maskID}! Aura deals ${Math.round(auralDamage)} damage (${stackCount} soul stacks: +${(growthRate * 100).toFixed(1)}% stats)`;
                console.log(auraMessage);
                io.emit('battleMessage', auraMessage);
              }
              
              // Stack consumption for untargetability (if not already done this cycle)
              if (mask.buffStacks >= 10 && !mask.consumedStacksThisCycle) {
                mask.buffStacks -= 10;
                mask.untargetable = Math.min(mask.untargetable + 2, 4);
                mask.consumedStacksThisCycle = true;
                
                const consumeMessage = `Mask ${mask.maskID} consumes 10 soul stacks to become untargetable!`;
                console.log(consumeMessage);
                io.emit('battleMessage', consumeMessage);
              }
              
              // Reset consumption flag for next cycle
              if (mask.consumedStacksThisCycle) {
                mask.consumedStacksThisCycle = false;
              }
              
              // High stack benefits
              if (stackCount >= 20) {
                mask.attackDamage *= 1.02; // Extra 2% growth at high stacks (reduced from 5%)
                mask.untargetable = Math.min(mask.untargetable + 1, 3);
                
                const transcendMessage = `Mask ${mask.maskID} transcends mortality! ${stackCount} soul stacks grant terrifying power!`;
                console.log(transcendMessage);
                io.emit('battleMessage', transcendMessage);
              } else if (stackCount >= 5) {
                const powerMessage = `Soul energy swirls around Mask ${mask.maskID}... (${stackCount} stacks: +${(growthRate * 100).toFixed(1)}% growth)`;
                console.log(powerMessage);
                io.emit('battleMessage', powerMessage);
              }
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
                  let damage = mask.abilityDamage * 5;
                  const reduction = targetMask.magicResist || 0;
                  damage = Math.max(damage - reduction, 0);
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

          if (skillName === "Death Cleaver" && mask.currentSpeed === 100) {
            // 50-50 chance: true = SkellyArcher, false = SkellyWarrior
            const isArcher = Math.random() < 0.5;
            let baseID = isArcher ? 100000 : 1000000;
            let photo = isArcher ? "/assets/images/SkellyArcher.jpg" : "/assets/images/SkellyWarrior.jpg";
            let skillID = isArcher ? 100000 : 1000000;
            let maskType = isArcher ? "SkellyArcher" : "SkellyWarrior";

            // Find next available maskID for this type
            let newID = baseID;
            while (masksInBattle[newID]) {
            newID++;
            }

            // Scale stats based on mask.attackDamage
            let attackDamage, health;
            if (isArcher) {
              attackDamage = mask.attackDamage * 0.2;
              health = mask.attackDamage * 2.5;
              currentHealth = mask.attackDamage * 2.5;
            } else {
              attackDamage = mask.attackDamage * 0.1;
              health = mask.attackDamage * 5;
              currentHealth = mask.attackDamage * 5;
            }
            const abilityDamage = attackDamage;
            const protections = mask.attackDamage * 0.2;
            const magicResist = mask.attackDamage * 0.2;
            const speed = 100;

            const skellyStats = {
              maskID: newID,
              attackDamage,
              abilityDamage,
              protections,
              magicResist,
              health,
              speed,
              currentHealth: health,
              currentSpeed: 0,
              activeSkills: [skillID],
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
              photo
            };
            masksInBattle[newID] = skellyStats;
            console.log(`A ${maskType} was summoned with ID ${newID}!`);
            battleMessage = `Mask ${mask.maskID} used Death Cleaver and summoned a ${maskType}!`;
            if (battleMessage) {
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }

          if (skillName === "Archer Shot" || skillName === "Warrior Strike") {
            // Deal 100% attack damage to a random enemy
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = Math.max(mask.attackDamage * 1 - targetMask.protections, 0);
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              battleMessage = `Mask ${mask.maskID} (${skillName}) attacked mask ${targetMask.maskID} for ${damage} damage.`;
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
            }
          }

          if (skillName === "Septic Strike") {
            // Find all enemies with poison stacks > 0
            const poisonedEnemies = Object.values(masksInBattle).filter(
              targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0 && targetMask.poisonStacks > 0
            );
            if (poisonedEnemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * poisonedEnemies.length);
              const targetMask = poisonedEnemies[randomIndex];
              let damage = mask.attackDamage * 1.5;
              const reduction = targetMask.protections || 0;
              damage = Math.max(damage - reduction, 0);
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              // Heal for 10% * poisonStacks of the damage dealt
              const healAmount = damage * 0.1 * targetMask.poisonStacks;
              mask.currentHealth = Math.min(mask.currentHealth + healAmount, mask.health);
              battleMessage = `Mask ${mask.maskID} used Septic Strike on mask ${targetMask.maskID}, dealt ${damage} damage and healed for ${healAmount}.`;
              if (battleMessage) {
                console.log(battleMessage);
                io.emit('battleMessage', battleMessage);
              }
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

            if (skillName === "Life of the Party") {
            console.log(`Mask ${mask.maskID} has skill: Life of the Party`);
            // At the start of each cycle, revive all dead team members and multiply their stats by this mask's abilityDamage
            const deadTeamMembers = Object.values(masksInBattle).filter(targetMask => targetMask.team === mask.team && targetMask.currentHealth === 0);
            deadTeamMembers.forEach(deadMask => {
              deadMask.currentHealth = deadMask.health;
              deadMask.attackDamage *= mask.abilityDamage;
              deadMask.abilityDamage *= mask.abilityDamage;
              deadMask.magicResist *= mask.abilityDamage;
              deadMask.protections *= mask.abilityDamage;
              deadMask.speed *= mask.abilityDamage;
              battleMessage = `Mask ${deadMask.maskID} was revived by Life of the Party and all stats multiplied by ${mask.abilityDamage}.`;
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            });
            }

          if (skillName === "Dragon Blast" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Dragon Blast`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = Math.max(mask.attackDamage * 1 - targetMask.protections, 0);
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
      
      // Mirror King and Summon Skills
      mask.activeSkills.forEach(skillID => {
        const skillName = skillNames[skillID];
        if (skillName) {
          // Mirror King Phase 1 Skills
          if (skillName === "King's Decree" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: King's Decree`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0 && !targetMask.untargetable);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = Math.max(mask.attackDamage * 3 - targetMask.protections, mask.attackDamage * 2);
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              masksInBattle[targetMask.maskID] = targetMask;
              battleMessage = `The Mirror King unleashes a devastating King's Decree, dealing ${Math.round(damage)} damage to ${targetMask.name || 'Mask ' + targetMask.maskID}`;
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          if (skillName === "Commanding Presence") {
            console.log(`Mask ${mask.maskID} has skill: Commanding Presence`);
            const summons = Object.values(masksInBattle).filter(targetMask => targetMask.team === mask.team && targetMask.maskID !== mask.maskID && targetMask.currentHealth > 0);
            if (summons.length > 0) {
              summons.forEach(summon => {
                summon.attackDamage += mask.abilityDamage * 0.2;
                summon.abilityDamage += mask.abilityDamage * 0.1;
              });
              battleMessage = `The Mirror King's Commanding Presence empowers all reflections!`;
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          // Mirror King Phase 2 Skills
          if (skillName === "Cataclysmic Reflection" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Cataclysmic Reflection`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            enemies.forEach(enemy => {
              const damage = Math.max(mask.abilityDamage * 2 - enemy.magicResist, mask.abilityDamage);
              enemy.currentHealth = Math.max(enemy.currentHealth - damage, 0);
              enemy.stunStacks += 2;
              enemy.burnStacks += 3;
              console.log(`${enemy.name || 'Mask ' + enemy.maskID} took ${Math.round(damage)} damage and gained 2 stun stacks and 3 burn stacks!`);
            });
            battleMessage = `The Mirror King shatters reality with Cataclysmic Reflection, devastating all enemies!`;
            console.log(battleMessage);
            io.emit('battleMessage', battleMessage);
          }
          
          if (skillName === "Royal Restoration") {
            console.log(`Mask ${mask.maskID} has skill: Royal Restoration`);
            const summons = Object.values(masksInBattle).filter(targetMask => targetMask.team === mask.team && targetMask.maskID !== mask.maskID && targetMask.currentHealth > 0);
            if (summons.length > 0) {
              summons.forEach(summon => {
                const healing = mask.abilityDamage * 2;
                summon.currentHealth = Math.min(summon.currentHealth + healing, summon.health);
                summon.protections += mask.abilityDamage * 0.3;
                summon.magicResist += mask.abilityDamage * 0.3;
                console.log(`${summon.name || 'Mask ' + summon.maskID} healed for ${Math.round(healing)} and gained defenses!`);
              });
              battleMessage = `The Mirror King channels Royal Restoration, healing and empowering all reflections!`;
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          // Summon 1 (Shattered Reflection) Skills
          if (skillName === "Mirror Shards" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Mirror Shards`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0 && !targetMask.untargetable);
            const hitCount = Math.min(3, enemies.length);
            for (let i = 0; i < hitCount; i++) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = Math.max(mask.attackDamage * 0.8 - targetMask.protections, mask.attackDamage * 0.4);
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              targetMask.bleedStacks += 2;
            }
            battleMessage = `${mask.name || 'Mask ' + mask.maskID} launches Mirror Shards at multiple enemies!`;
            console.log(battleMessage);
            io.emit('battleMessage', battleMessage);
          }
          
          if (skillName === "Reflective Barrier") {
            console.log(`Mask ${mask.maskID} has skill: Reflective Barrier`);
            const allies = Object.values(masksInBattle).filter(targetMask => targetMask.team === mask.team && targetMask.currentHealth > 0);
            allies.forEach(ally => {
              ally.protections += mask.abilityDamage * 0.2;
              ally.magicResist += mask.abilityDamage * 0.2;
            });
            battleMessage = `${mask.name || 'Mask ' + mask.maskID} creates a Reflective Barrier, protecting all allies!`;
            console.log(battleMessage);
            io.emit('battleMessage', battleMessage);
          }
          
          // Summon 2 (Fractured Echo) Skills
          if (skillName === "Echo Strike" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Echo Strike`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0 && !targetMask.untargetable);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = Math.max(mask.attackDamage * 1.2 - targetMask.protections, mask.attackDamage * 0.6);
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              
              // Echo effect - 50% chance to hit again
              if (Math.random() < 0.5) {
                const echoDamage = Math.max(damage * 0.7, 0);
                targetMask.currentHealth = Math.max(targetMask.currentHealth - echoDamage, 0);
                battleMessage = `${mask.name || 'Mask ' + mask.maskID}'s Echo Strike resonates, hitting twice for ${Math.round(damage + echoDamage)} total damage!`;
              } else {
                battleMessage = `${mask.name || 'Mask ' + mask.maskID}'s Echo Strike deals ${Math.round(damage)} damage!`;
              }
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          if (skillName === "Reverberating Wounds") {
            console.log(`Mask ${mask.maskID} has skill: Reverberating Wounds`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            enemies.forEach(enemy => {
              enemy.poisonStacks += 3;
              enemy.bleedStacks += 2;
            });
            battleMessage = `${mask.name || 'Mask ' + mask.maskID} inflicts Reverberating Wounds on all enemies!`;
            console.log(battleMessage);
            io.emit('battleMessage', battleMessage);
          }
          
          // Summon 3 (Lightning Knight) Skills
          if (skillName === "Phantom Slice" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Phantom Slice`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0 && !targetMask.untargetable);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = Math.max(mask.attackDamage * 1.5 - targetMask.protections, mask.attackDamage * 0.7);
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              targetMask.stunStacks += 2;
              battleMessage = `${mask.name || 'Mask ' + mask.maskID}'s lightning strike deals ${Math.round(damage)} damage and stuns the enemy with electrical shock!`;
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          if (skillName === "Vanish") {
            console.log(`Mask ${mask.maskID} has skill: Vanish`);
            if (!mask.untargetable) {
              mask.untargetable = 2;
              battleMessage = `${mask.name || 'Mask ' + mask.maskID} vanishes into shadows!`;
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          // Summon 4 (Poison Winged Knight) Skills
          if (skillName === "Crystal Crush" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Crystal Crush`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0 && !targetMask.untargetable);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = Math.max(mask.attackDamage * 1.3 - targetMask.protections, mask.attackDamage * 0.6);
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              targetMask.stunStacks += 1;
              targetMask.poisonStacks += 3;
              battleMessage = `${mask.name || 'Mask ' + mask.maskID} crashes down with toxic force, dealing ${Math.round(damage)} damage, stunning and poisoning the target!`;
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          if (skillName === "Fortify") {
            console.log(`Mask ${mask.maskID} has skill: Fortify`);
            const allies = Object.values(masksInBattle).filter(targetMask => targetMask.team === mask.team && targetMask.currentHealth > 0);
            allies.forEach(ally => {
              ally.protections += mask.abilityDamage * 0.3;
              ally.magicResist += mask.abilityDamage * 0.15;
            });
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            enemies.forEach(enemy => {
              enemy.poisonStacks += 2;
            });
            battleMessage = `${mask.name || 'Mask ' + mask.maskID} spreads toxic miasma, fortifying allies and poisoning enemies!`;
            console.log(battleMessage);
            io.emit('battleMessage', battleMessage);
          }
          
          // Summon 5 (Prismatic Shadow) Skills
          if (skillName === "Shadow Bolt" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Shadow Bolt`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0 && !targetMask.untargetable);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = Math.max(mask.abilityDamage * 1.8 - targetMask.magicResist, mask.abilityDamage * 0.9);
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              battleMessage = `${mask.name || 'Mask ' + mask.maskID} fires a Shadow Bolt, dealing ${Math.round(damage)} magic damage!`;
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          if (skillName === "Drain Essence") {
            console.log(`Mask ${mask.maskID} has skill: Drain Essence`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            let totalDrained = 0;
            enemies.forEach(enemy => {
              const drain = Math.max(mask.abilityDamage * 0.3 - enemy.magicResist * 0.5, mask.abilityDamage * 0.15);
              enemy.currentHealth = Math.max(enemy.currentHealth - drain, 0);
              totalDrained += drain;
            });
            mask.currentHealth = Math.min(mask.currentHealth + totalDrained, mask.health);
            battleMessage = `${mask.name || 'Mask ' + mask.maskID} drains ${Math.round(totalDrained)} essence from all enemies!`;
            console.log(battleMessage);
            io.emit('battleMessage', battleMessage);
          }
          
          // Summon 6 (Refracted Soul) Skills
          if (skillName === "Soul Rend" && mask.currentSpeed === 100) {
            console.log(`Mask ${mask.maskID} has skill: Soul Rend`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0 && !targetMask.untargetable);
            if (enemies.length > 0) {
              const randomIndex = Math.floor(Math.random() * enemies.length);
              const targetMask = enemies[randomIndex];
              const damage = Math.max(mask.abilityDamage * 1.6 - targetMask.magicResist, mask.abilityDamage * 0.8);
              targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0);
              // Reduce target's magic resist
              targetMask.magicResist = Math.max(targetMask.magicResist * 0.8, 0);
              battleMessage = `${mask.name || 'Mask ' + mask.maskID}'s Soul Rend tears through defenses, dealing ${Math.round(damage)} damage!`;
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
          
          if (skillName === "Corruption Aura") {
            console.log(`Mask ${mask.maskID} has skill: Corruption Aura`);
            const enemies = Object.values(masksInBattle).filter(targetMask => targetMask.team !== mask.team && targetMask.currentHealth > 0);
            if (enemies.length > 0) {
              // Apply 1 poison stack to all enemies and reduce their protections by 5%
              enemies.forEach(enemy => {
                if (!enemy.poisonStacks) enemy.poisonStacks = 0;
                enemy.poisonStacks += 1;
                
                const protectionReduction = Math.floor(enemy.protections * 0.05);
                enemy.protections = Math.max(0, enemy.protections - protectionReduction);
              });
              battleMessage = `${mask.name || 'Mask ' + mask.maskID} emanates a corruption aura, poisoning and weakening all enemies!`;
              console.log(battleMessage);
              io.emit('battleMessage', battleMessage);
            }
          }
        }
      });

      if (mask.burnStacks > 0) {
        // Burn: More meaningful damage per stack, scales with stacks
        const burnDamage = mask.health * (0.015 + (mask.burnStacks * 0.005)); // 1.5% base + 0.5% per stack
        mask.currentHealth -= burnDamage;
        
        // Special burn threshold: High stacks cause additional burst damage
        if (mask.burnStacks >= 20) {
          const burstDamage = mask.health * 0.1; // 10% max health burst
          mask.currentHealth -= burstDamage;
          console.log(`Mask ${mask.maskID} took ${Math.round(burstDamage)} burst damage from severe burns!`);
          io.emit('battleMessage', `Mask ${mask.maskID} suffered severe burn damage!`);
        }
        
        mask.burnStacks = Math.max(mask.burnStacks - 1, 0);
        mask.currentHealth = Math.max(mask.currentHealth, 0);
        
        if (burnDamage > 0) {
          console.log(`Mask ${mask.maskID} took ${Math.round(burnDamage)} burn damage (${mask.burnStacks} stacks)`);
        }
      }
      
      if (mask.poisonStacks > 0) {
        // Poison: Higher base damage but slower growth
        const poisonDamage = mask.health * 0.01 * mask.poisonStacks; // 1% per stack
        mask.currentHealth -= poisonDamage;
        
        // Poison spreads slower but with more impact per stack
        mask.poisonStacks = Math.ceil(mask.poisonStacks * 1.1); // 10% growth instead of 25%
        
        // Execute threshold: More reasonable execution condition
        if (mask.currentHealth <= mask.health * 0.15 && mask.poisonStacks >= 10) {
          mask.currentHealth = 0;
          console.log(`Mask ${mask.maskID} succumbed to severe poisoning!`);
          io.emit('battleMessage', `Mask ${mask.maskID} succumbed to severe poisoning!`);
        }
        
        mask.currentHealth = Math.max(mask.currentHealth, 0);
        
        if (poisonDamage > 0) {
          console.log(`Mask ${mask.maskID} took ${Math.round(poisonDamage)} poison damage (${mask.poisonStacks} stacks)`);
        }
      }
      
      if (mask.bleedStacks > 0) {
        // Bleed: Reduced damage to be less overpowered
        const bleedDamage = mask.health * 0.002 * mask.bleedStacks; // 0.2% per stack (down from 0.5%)
        mask.currentHealth -= bleedDamage;
        
        // More reasonable execution: requires higher stacks relative to health
        const healthPercent = (mask.currentHealth / mask.health) * 100;
        const requiredBleedStacks = Math.ceil(healthPercent * 5); // Requires 5x health percentage (up from 2x)
        
        if (mask.bleedStacks >= requiredBleedStacks && mask.currentHealth <= mask.health * 0.1) {
          mask.currentHealth = 0;
          console.log(`Mask ${mask.maskID} bled out from severe wounds!`);
          io.emit('battleMessage', `Mask ${mask.maskID} bled out from severe wounds!`);
        }
        
        // Bleed stacks decay slowly over time
        if (mask.bleedStacks > 10) {
          mask.bleedStacks = Math.max(mask.bleedStacks - 1, 10); // Excess stacks decay
        }
        
        mask.currentHealth = Math.max(mask.currentHealth, 0);
        
        if (bleedDamage > 0) {
          console.log(`Mask ${mask.maskID} took ${Math.round(bleedDamage)} bleed damage (${mask.bleedStacks} stacks)`);
        }
      }
      if (mask.stunStacks > 0) {
        mask.stunStacks -= 1;
        mask.action = false; // Reset action to true
        mask.bonusAction = false; // Reset bonusAction to true
        if (mask.stunStacks === 0) {
            if (!defaultMaskIDs.includes(mask.maskID)) {
              mask.action = true; // Reset action to true
              mask.bonusAction = true; // Reset bonusAction to true
              // Decrease cooldowns
              Object.keys(mask.cooldowns).forEach(skillID => {
                  if (mask.cooldowns[skillID] > 0) {
                      mask.cooldowns[skillID] -= 1;
                  }
              });
            }
        }
        return;
      } else {
        if (mask.currentSpeed === 100) {
          // Track if this mask just reached 100 speed this turn
          if (!mask.turnStarted) {
            // First time reaching 100 - mark turn as started and give actions
            mask.turnStarted = true;
            mask.action = true;
            mask.bonusAction = true;
            mask.movement = mask.speed;
          } else {
            // Turn already started previously - now force reset to prevent infinite holding
            mask.currentSpeed = 0; // Reset currentSpeed to 0
            mask.action = false;
            mask.bonusAction = false; // Reset bonusAction to false
            mask.movement = 0; // Reset movement to 0
            mask.turnStarted = false; // Reset turn tracking
            // Decrease cooldowns
            Object.keys(mask.cooldowns).forEach(skillID => {
              if (mask.cooldowns[skillID] > 0) {
                mask.cooldowns[skillID] -= 1;
              }
            });
          }
        } else {
          // Reset turn tracking when not at 100 speed
          mask.turnStarted = false;
          
          mask.currentSpeed += mask.speed; // Increase currentSpeed by speed value
          if (mask.currentSpeed >= 100) {
            mask.currentSpeed = 100; // Ensure currentSpeed is capped at 100
            mask.action = true;
            mask.bonusAction = true; // Set bonusAction to true
            mask.movement = mask.speed; // Set movement to mask.speed
            mask.turnStarted = true; // Mark that this mask's turn just started
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
  res.status(200).json({ message: 'Continue request received' });
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
  const { modType, modRarity, description, modCategory, statType } = req.body;
  try {
    const newMod = await ModList.create({ 
      modType, 
      modRarity, 
      description, 
      modCategory: modCategory || 'skill',
      statType: statType || null
    });
    res.status(201).json(newMod);
  } catch (error) {
    console.error('Error creating mod:', error);
    res.status(500).send('Failed to create mod');
  }
});

// Endpoint to update an existing mod
app.put('/mods/:modID', async (req, res) => {
  const { modID } = req.params;
  const { modType, modRarity, description, modCategory, statType } = req.body;
  
  try {
    const mod = await ModList.findByPk(modID);
    if (!mod) {
      return res.status(404).json({ error: 'Mod not found' });
    }

    await mod.update({
      modType: modType || mod.modType,
      modRarity: modRarity !== undefined ? modRarity : mod.modRarity,
      description: description || mod.description,
      modCategory: modCategory || mod.modCategory,
      statType: statType !== undefined ? statType : mod.statType
    });

    res.json(mod);
  } catch (error) {
    console.error('Error updating mod:', error);
    res.status(500).send('Failed to update mod');
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

// Helper function to calculate stat bonus from mod
function calculateStatBonus(modRarity, statType) {
  const statBonusValues = {
    'Attack Damage': { 1: 50, 2: 200, 3: 400, 4: 650, 5: 950 },
    'Ability Damage': { 1: 50, 2: 200, 3: 400, 4: 650, 5: 950 },
    'Protections': { 1: 50, 2: 200, 3: 400, 4: 650, 5: 950 },
    'Magic Resist': { 1: 50, 2: 200, 3: 400, 4: 650, 5: 950 },
    'Health': { 1: 500, 2: 5000, 3: 10000, 4: 25000, 5: 50000 },
    'Speed': { 1: 5, 2: 15, 3: 25, 4: 35, 5: 50 }
  };
  
  return statBonusValues[statType] ? statBonusValues[statType][modRarity] : 0;
}

// Helper function to get mask stat field name from stat type
function getStatFieldName(statType) {
  const fieldMap = {
    'Attack Damage': 'attackDamage',
    'Ability Damage': 'abilityDamage',
    'Protections': 'protections',
    'Magic Resist': 'magicResist',
    'Health': 'health',
    'Speed': 'speed'
  };
  
  return fieldMap[statType];
}

// Endpoint to add a mod to a mask
app.put('/masks/:maskID/add-mod', async (req, res) => {
  const { maskID } = req.params;
  const { modID } = req.body;
  try {
    const mask = await MaskList.findOne({ where: { maskID } });
    if (!mask) {
      return res.status(404).send('Mask not found');
    }
    
    // Get the mod details to check if it's a stat mod
    const mod = await ModList.findByPk(modID);
    if (!mod) {
      return res.status(404).send('Mod not found');
    }
    
    const updatedModList = mask.modList ? [...mask.modList, modID] : [modID];
    
    // If it's a stat mod, apply the stat bonus
    let updateData = { modList: updatedModList.filter(mod => mod !== null) };
    
    if (mod.modCategory === 'stat' && mod.statType) {
      const statBonus = calculateStatBonus(mod.modRarity, mod.statType);
      const statField = getStatFieldName(mod.statType);
      
      if (statField) {
        updateData[statField] = mask[statField] + statBonus;
        
        // Also update currentHealth if health was modified
        if (statField === 'health') {
          updateData.currentHealth = mask.currentHealth + statBonus;
        }
      }
    }
    
    await MaskList.update(updateData, { where: { maskID } });
    res.status(200).json({ message: 'Mod added to mask successfully' });
  } catch (error) {
    console.error('Error adding mod to mask:', error);
    res.status(500).send('Failed to add mod to mask');
  }
});

// Endpoint to remove a mod from a mask
app.put('/masks/:maskID/remove-mod', async (req, res) => {
  const { maskID } = req.params;
  const { modID } = req.body;
  try {
    const mask = await MaskList.findOne({ where: { maskID } });
    if (!mask) {
      return res.status(404).send('Mask not found');
    }
    
    // Get the mod details to check if it's a stat mod
    const mod = await ModList.findByPk(modID);
    if (!mod) {
      return res.status(404).send('Mod not found');
    }
    
    const updatedModList = mask.modList ? mask.modList.filter(id => id !== modID) : [];
    
    // If it's a stat mod, remove the stat bonus
    let updateData = { modList: updatedModList };
    
    if (mod.modCategory === 'stat' && mod.statType) {
      const statBonus = calculateStatBonus(mod.modRarity, mod.statType);
      const statField = getStatFieldName(mod.statType);
      
      if (statField) {
        updateData[statField] = Math.max(0, mask[statField] - statBonus);
        
        // Also update currentHealth if health was modified, but don't exceed max health
        if (statField === 'health') {
          const newMaxHealth = updateData[statField];
          updateData.currentHealth = Math.min(mask.currentHealth, newMaxHealth);
        }
      }
    }
    
    await MaskList.update(updateData, { where: { maskID } });
    res.status(200).json({ message: 'Mod removed from mask successfully' });
  } catch (error) {
    console.error('Error removing mod from mask:', error);
    res.status(500).send('Failed to remove mod from mask');
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

app.post('/click-character-id', async (req, res) => {
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
    console.error('Error in /click-character-id:', error);
    res.status(500).json({ message: 'Failed to log character ID' });
  }
});

// Endpoint to get equipped item details for a character
app.get('/equipped-item-details/:characterID', async (req, res) => {
  const { characterID } = req.params;
  
  try {
    // Get character info
    const characterInfo = await CharacterInfo.findOne({ where: { characterID } });
    if (!characterInfo) {
      return res.status(404).json({ message: 'Character not found' });
    }

    // Find equipped item in the character's inventory
    if (Array.isArray(characterInfo.itemInventory) && characterInfo.itemInventory.length > 0) {
      const equippedItem = await ItemList.findOne({
        where: {
          itemID: { [Op.in]: characterInfo.itemInventory },
          equipped: true
        }
      });
      
      if (equippedItem) {
        res.json(equippedItem);
      } else {
        res.status(404).json({ message: 'No equipped item found' });
      }
    } else {
      res.status(404).json({ message: 'Character has no inventory' });
    }
  } catch (error) {
    console.error('Error getting equipped item details:', error);
    res.status(500).json({ message: 'Failed to get equipped item details' });
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

// API endpoint to get current time and day
app.get('/api/time', async (req, res) => {
  try {
    const tk = await TimeKeeper.findOne();
    res.json({ 
      time: tk ? tk.time : '00:00',
      day: tk ? tk.day : 'monday'
    });
  } catch (err) {
    res.status(500).json({ time: '00:00', day: 'monday' });
  }
});

// API endpoint to increment hour
const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

app.post('/api/time/increment', async (req, res) => {
  try {
    const tk = await TimeKeeper.findOne();
    let [hour, minute] = (tk?.time || '00:00').split(':').map(Number);
    let dayIndex = daysOfWeek.indexOf((tk?.day || 'monday').toLowerCase());
    if (dayIndex === -1) dayIndex = 0;

    hour += 1;
    if (hour >= 24) {
      hour = 0;
      dayIndex = (dayIndex + 1) % daysOfWeek.length;
    }
    const newTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const newDay = daysOfWeek[dayIndex];

    await TimeKeeper.update({ time: newTime, day: newDay }, { where: {} });
    io.emit('timeUpdate', { time: newTime, day: newDay });
    res.json({ time: newTime, day: newDay });
  } catch (err) {
    console.error('Error incrementing time:', err);
    res.status(500).json({ message: 'Failed to increment time' });
  }
});

// API endpoint to decrement hour
app.post('/api/time/decrement', async (req, res) => {
  try {
    const tk = await TimeKeeper.findOne();
    let [hour, minute] = (tk?.time || '00:00').split(':').map(Number);
    let dayIndex = daysOfWeek.indexOf((tk?.day || 'monday').toLowerCase());
    if (dayIndex === -1) dayIndex = 0;

    hour -= 1;
    if (hour < 0) {
      hour = 23;
      dayIndex = (dayIndex - 1 + daysOfWeek.length) % daysOfWeek.length;
    }
    const newTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const newDay = daysOfWeek[dayIndex];

    await TimeKeeper.update({ time: newTime, day: newDay }, { where: {} });
    io.emit('timeUpdate', { time: newTime, day: newDay });
    res.json({ time: newTime, day: newDay });
  } catch (err) {
    console.error('Error decrementing time:', err);
    res.status(500).json({ message: 'Failed to decrement time' });
  }
});

// Mask Collection routes
app.get('/api/mask-collection', async (req, res) => {
  try {
    const maskCollection = await MaskCollection.findAll();
    console.log('Mask collection data:', JSON.stringify(maskCollection, null, 2));
    res.json(maskCollection);
  } catch (error) {
    console.error('Error fetching mask collection:', error);
    res.status(500).send('Failed to fetch mask collection');
  }
});

app.post('/api/mask-collection', async (req, res) => {
  try {
    const { maskID } = req.body;
    
    if (!maskID || typeof maskID !== 'number') {
      return res.status(400).json({ error: 'Valid maskID is required' });
    }

    // Check if the mask exists in MaskList
    const maskExists = await MaskList.findOne({ where: { maskID } });
    if (!maskExists) {
      return res.status(404).json({ error: `Mask with ID ${maskID} does not exist` });
    }

    // Check if the mask is already in the collection
    const existingMask = await MaskCollection.findOne({ where: { maskID } });
    if (existingMask) {
      return res.status(409).json({ error: `Mask ${maskID} is already in your collection` });
    }

    const newMask = await MaskCollection.create({ maskID });
    
    // Emit WebSocket event to all clients to refresh mask collection
    io.emit('maskCollectionUpdate', { action: 'added', maskID, maskData: newMask });
    console.log(`WebSocket event emitted: maskCollectionUpdate for added mask ${maskID}`);
    
    res.status(201).json(newMask);
  } catch (error) {
    console.error('Error adding mask to collection:', error);
    res.status(500).json({ error: 'Failed to add mask to collection' });
  }
});

app.delete('/api/mask-collection/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`DELETE request for mask collection ID: ${id}`);
    
    // First check if the record exists
    const existingRecord = await MaskCollection.findByPk(parseInt(id, 10));
    console.log(`Record found:`, existingRecord);
    
    if (!existingRecord) {
      console.log(`No record found with ID ${id}`);
      return res.status(404).json({ error: 'Mask not found in collection' });
    }
    
    const deletedRows = await MaskCollection.destroy({ where: { id: parseInt(id, 10) } });
    console.log(`Deleted rows: ${deletedRows}`);
    
    if (deletedRows === 0) {
      return res.status(404).json({ error: 'Mask not found in collection' });
    }
    
    // Emit WebSocket event to all clients to refresh mask collection
    io.emit('maskCollectionUpdate', { action: 'removed', maskID: existingRecord.maskID, recordId: id });
    console.log(`WebSocket event emitted: maskCollectionUpdate for removed mask ${existingRecord.maskID}`);
    
    res.status(200).json({ message: 'Mask removed from collection successfully' });
  } catch (error) {
    console.error('Error removing mask from collection:', error);
    res.status(500).json({ error: 'Failed to remove mask from collection' });
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

// Catch-all route must be last, after all static/file/asset routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});