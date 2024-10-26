const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('./db'); // Import your sequelize instance
const User = require('./models/User'); // Import the User model

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your_jwt_secret'; // Use a secure secret key for JWT

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Sync the database
sequelize.sync()
  .then(() => {
    console.log('Database synced');
  })
  .catch((error) => {
    console.error('Error syncing database:', error);
  });

// Endpoint to receive registration data
app.post('/register', async (req, res) => {
  const { username, email, password, role, characterName } = req.body;

  // Check if the user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(400).send('User already exists');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the user in the database
  await User.create({ username, email, password: hashedPassword, role, characterName });
  res.status(201).send('User registered successfully');
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
