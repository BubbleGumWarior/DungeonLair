const path = require('path');
process.chdir(path.join(__dirname));
console.log('Working directory:', process.cwd());
console.log('Starting server...');
try {
  require('./server.js');
} catch (error) {
  console.error('Server startup error:', error);
  process.exit(1);
}
