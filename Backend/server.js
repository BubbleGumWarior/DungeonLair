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
const { localIP, JWT_SECRET } = require('./config'); // Import the IP address and JWT secret
const User = require('./models/User'); // Import the User model

const app = express();

// Load SSL certificates
const privateKey = fs.readFileSync('d:/Coding/DungeonLair/DungeonLair/key.pem', 'utf8');
const certificate = fs.readFileSync('d:/Coding/DungeonLair/DungeonLair/cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const server = https.createServer(credentials, app); // Ensure https.createServer is used

const allowedOrigins = [
  `https://${localIP}:4200`,
  'https://102.182.41.110:4200' // Public IP address
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST"]
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

app.get('/item-list/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const item = await ItemList.findOne({ where: { id } });
        if (!item) {
            return res.status(404).send('Item not found');
        }
        res.json(item);
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).send('Failed to fetch item');
    }
});

app.get('/skill-list/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const skill = await SkillList.findOne({ where: { id } });
        if (!skill) {
            return res.status(404).send('Skill not found');
        }
        res.json(skill);
    } catch (error) {
        console.error('Error fetching skill:', error);
        res.status(500).send('Failed to fetch skill');
    }
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected');

    // Add the new user to the liveUsers array
    socket.on('registerUser', (username) => {
        const newUser = { id: socket.id, username };
        liveUsers.push(newUser);
        broadcastUserUpdate();
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        liveUsers = liveUsers.filter(user => user.id !== socket.id);
        broadcastUserUpdate();
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

    // Handle incoming audio data
    socket.on('audio', (audioData) => {
        console.log('Received audio chunk from client:', audioData.buffer);
        console.log('Audio MIME type:', audioData.type); // Log the MIME type of the received audio data
        socket.broadcast.emit('audio', audioData); // Broadcast audio data with MIME type to other clients
    });

    socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
    });
});

// Function to broadcast user updates
function broadcastUserUpdate() {
    const userUpdateMessage = { type: 'userUpdate', users: liveUsers.map(user => ({ username: user.username })) };
    io.emit('userUpdate', userUpdateMessage);
}

// Start the server
server.listen(PORT, '0.0.0.0', () => { // Ensure it listens on all interfaces
    console.log(`Server is running on https://${localIP}:${PORT}`);
});
