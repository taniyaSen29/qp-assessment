const mysql = require('mysql');

//Config Injection
const dbConfig = require('./config');

// MySQL connection
const db = mysql.createConnection(dbConfig);


db.connect(err => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

const authenticate = (req, res, next) => {
  const { username, password } = req.headers;

  // Check if username and password are provided
  if (!username || !password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Check credentials against the database
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length === 1) {
      req.userRole = results[0].role;
      req.user = results[0].id;
      next();
    } else {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  });
};

// Middleware to authenticate Admin
const authenticateAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access forbidden for admin' });
  }
  next();
};

// Middleware to authenticate User
const authenticateUser = (req, res, next) => {
  if (req.userRole !== 'user') {
    return res.status(403).json({ message: 'Access forbidden for user' });
  }
  next();
};

module.exports = { authenticate, authenticateAdmin, authenticateUser };