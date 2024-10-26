const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your_jwt_secret'; // Use a secure secret key for JWT

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(bodyParser.json()); // Parse JSON requests

// In-memory user storage for demonstration
const users = [];

// Endpoint to receive registration data
app.post('/register', async (req, res) => {
  const { username, email, password, role, characterName } = req.body;

  // Check if the user already exists
  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
    return res.status(400).send('User already exists');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Store the user in the in-memory array (replace this with a database in production)
  users.push({ username, email, password: hashedPassword, role, characterName });
  res.status(201).send('User registered successfully');
  console.log(users)
});

// Endpoint for login (to generate JWT)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
  
    if (!user) {
      return res.status(401).send('Invalid credentials');
    }
  
    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send('Invalid credentials');
    }
  
    // Generate JWT including characterName
    const token = jwt.sign({ email: user.email, role: user.role, characterName: user.characterName }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
