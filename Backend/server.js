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
                            currentHealth: maskDetails.health,
                            currentSpeed: maskDetails.speed,
                            activeSkills: maskDetails.activeSkills,
                            stunStacks: 0, // Add stunStacks field
                            burnStacks: 0, // Add burnStacks field
                            poisonStacks: 0, // Add poisonStacks field
                            bleedStacks: 0, // Add bleedStacks field
                            buffStacks: 0, // Add buffStacks field
                            action: false, // Add action field
                            bonusAction: false, // Add bonusAction field
                            movement: 0, // Add movement field
                            team: 'Neutral' // Add team field
                        };
                        // Fetch mask skills and store them
                        MaskSkills.findAll({ where: { skillID: maskDetails.activeSkills } })
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
        const mask = masksInBattle[maskID];
        const skill = maskSkills[maskID].find(s => s.skillID === skillID);

        if (mask && skill) {
            let totalDamage = 0; // Initialize totalDamage
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
                    console.log(`Updated Mask ${targetMaskID} values:`, masksInBattle[targetMaskID]); // Log updated mask values

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
            });
            console.log(`Total damage dealt by Mask ${maskID}: ${totalDamage}`); // Log totalDamage
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

});

// Function to broadcast user updates
function broadcastUserUpdate() {
    const userUpdateMessage = { type: 'userUpdate', users: liveUsers.map(user => ({ username: user.username, role: user.role })) };
    io.emit('userUpdate', userUpdateMessage);
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
    console.error('Error fetching character ID:', error);
    res.status(500).send('Failed to fetch character ID');
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

    const updatedNoteList = [...userInfo.noteList, newNote.noteID];
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

  try {
    const userInfo = await User.findOne({ where: { username: username } });
    if (!userInfo) {
      return res.status(404).send('User info not found');
    }

    await Note.update({ title, description }, { where: { noteID: noteId } });

    res.status(200).json({ message: 'Note updated successfully' });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).send('Failed to update note');
  }
});

app.delete('/delete-note/:username/:noteId', async (req, res) => {
  const { username, noteId } = req.params;

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

    const relativePhotoPath = photo.replace(`https://${localIP}:8080`, '');

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
    await MaskList.update({ activeSkills: updatedActiveSkills }, { where: { maskID } });
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

app.post('/continue', async (req, res) => {
  console.log('Continuing');
  const skillNames = {};

  // Fetch all skills once and store them in a dictionary
  const skills = await MaskSkills.findAll();
  skills.forEach(skill => {
    skillNames[skill.skillID] = skill.skillName;
  });

  Object.values(masksInBattle).forEach(mask => {
    if (mask.currentHealth === 0) {
      mask.action = false; // Reset action to false
      mask.bonusAction = false; // Reset bonusAction to false
      mask.movement = 0; // Reset movement to 0
      mask.currentSpeed = 0;
      return;
    } else {
      // If mask.activeSkills contains a skillID, find the skill name and run the if statements
      mask.activeSkills.forEach(skillID => {
        const skillName = skillNames[skillID];
        if (skillName) {
          if (skillName === "Bide") {
            console.log(`Mask ${mask.maskID} has skill: Bide`);
            if (mask.currentHealth < mask.health) {
              mask.currentHealth += mask.health * 0.1;
              mask.currentHealth = Math.min(mask.currentHealth, mask.health);
            }
          }
          if (skillName === "Momentum") {
            console.log(`Mask ${mask.maskID} has skill: Momentum`);
            if (mask.currentHealth < mask.health) {
              mask.currentHealth += mask.health * 0.1;
              mask.currentSpeed += mask.speed;
              mask.currentHealth = Math.min(mask.currentHealth, mask.health);
              if (mask.currentSpeed >= 100) {
                mask.currentSpeed = 99;
              }
            }
          }
          if (skillName === "Thick Coat") {
            console.log(`Mask ${mask.maskID} has skill: Thick Coat`);
            mask.currentHealth += (mask.health - mask.currentHealth) * 0.3;
          }
          if (skillName === "Welcome the Dead") {
            console.log(`Mask ${mask.maskID} has skill: Welcome the Dead`);
            const deadMasksCount = Object.values(masksInBattle).filter(m => m.currentHealth === 0).length;
            mask.currentHealth += mask.health * 0.03 * deadMasksCount;
            mask.currentHealth = Math.min(mask.currentHealth, mask.health);
          }
          if (skillName === "Blinding Speed") {
            console.log(`Mask ${mask.maskID} has skill: Blinding Speed`);
            mask.currentSpeed += mask.speed * 2;
            if (mask.currentSpeed >= 100) {
              mask.currentSpeed = 99;
            }
          }
          if (skillName === "Petal Storm") {
            console.log(`Mask ${mask.maskID} has skill: Petal Storm`);
            if (mask.buffStacks > 0) {
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.team === mask.team) {
                  const heal = targetMask.health * 0.02 * mask.buffStacks;
                  targetMask.currentHealth = Math.min(targetMask.currentHealth + heal, targetMask.health); // Heal mask and cap at mask.health
                }
              });
            }
          }
          if (skillName === "Black Hole") {
            console.log(`Mask ${mask.maskID} has skill: Black Hole`);
            if (mask.buffStacks > 0) {
              const damage = mask.abilityDamage * 0.25;
              const heal = mask.abilityDamage * 0.125;
              Object.values(masksInBattle).forEach(targetMask => {
                if (targetMask.maskID !== mask.maskID) {
                  targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
                  mask.currentHealth = Math.min(mask.currentHealth + heal, mask.health); // Heal mask and cap at mask.health
                }
              });
            }
          }
          if (skillName === "Nightmare") {
            console.log(`Mask ${mask.maskID} has skill: Nightmare`);
            const damage = mask.abilityDamage * 0.5 * mask.buffStacks;
            Object.values(masksInBattle).forEach(targetMask => {
              if (targetMask.maskID !== mask.maskID) {
                targetMask.currentHealth = Math.max(targetMask.currentHealth - damage, 0); // Deal damage and cap at 0
                const roll = Math.floor(Math.random() * 20) + 1;
                if (roll < mask.buffStacks) {
                  targetMask.stunStacks += 3;
                  console.log(`Mask ${targetMask.maskID} was feared by Nightmare`);
                }
              }
            });
          }
        }
      });

      if (mask.burnStacks > 0) {
        mask.currentHealth -= mask.currentHealth * 0.1;
        mask.burnStacks -= 1;
      }
      if (mask.poisonStacks > 0) {
        mask.currentHealth -= (mask.currentHealth * 0.02) * mask.poisonStacks;
        mask.poisonStacks += 1;
      }
      if (mask.bleedStacks > 0) {
        mask.currentHealth -= (mask.health * 0.05);
        mask.bleedStacks -= 1;
        if(mask.currentHealth / mask.health * 100 <= mask.bleedStacks * 2) {
          mask.currentHealth = 0;
        }
      }
      if (mask.stunStacks > 0) {
        mask.stunStacks -= 1;
        if (mask.stunStacks === 0) {
          mask.action = true; // Reset action to false
          mask.bonusAction = true; // Reset bonusAction to false
          mask.movement = mask.speed; // Reset movement to 0
        }
        return;
      }
      else {
        if (mask.currentSpeed >= 100) {
          mask.currentSpeed = mask.speed; // Ensure currentSpeed is capped at 100
          mask.action = true; // Set action to true
          mask.bonusAction = true; // Set bonusAction to true
          mask.movement = mask.speed; // Set movement to mask.speed
          mask.action = false; // Reset action to false
          mask.bonusAction = false; // Reset bonusAction to false
          mask.movement = 0; // Reset movement to 0
        } else {
          mask.currentSpeed += mask.speed;
          if (mask.currentSpeed >= 100) {
            mask.currentSpeed = 100; // Ensure currentSpeed is capped at 100
            mask.action = true; // Set action to true
            mask.bonusAction = true; // Set bonusAction to true
            mask.movement = mask.speed; // Set movement to mask.speed
          } else {
            mask.action = false; // Reset action to false
            mask.bonusAction = false; // Reset bonusAction to false
            mask.movement = 0; // Reset movement to 0
          }
        }
      }   
    }     
  });
  // console.log('Updated masksInBattle:', masksInBattle);
  io.emit('masksInBattleUpdate', Object.values(masksInBattle)); // Emit updated masksInBattle
  res.status(200).send('Continue request received');
});