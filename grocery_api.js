const express = require('express');
const mysql = require('mysql');

const app = express();
const port = 3001;

//Middleware Injection
const authMiddleware = require('./authMiddleware');

//Config Injection
const dbConfig = require('./config');

// MySQL connection
const db = mysql.createConnection(dbConfig);

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

// Express middleware to parse JSON
app.use(express.json());

// Admin Endpoints

app.post('/login', authMiddleware.authenticate, (req, res) => {
  res.json({ message: 'Login successful' });
});

app.post('/admin/addItem', authMiddleware.authenticate ,authMiddleware.authenticateAdmin , (req, res) => {
  const { name, price, inventory } = req.body;

  const addItemQuery = 'INSERT INTO grocery_items (name, price, inventory) VALUES (?, ?, ?)';
  
  db.query(addItemQuery, [name, price, inventory], (err, result) => {
    if (err) {
      console.error('Error adding item:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(201).json({ message: 'Item added successfully', itemId: result.insertId });
    }
  });
});

app.get('/admin/viewItems', authMiddleware.authenticate ,authMiddleware.authenticateAdmin, (req, res) => {
  const viewItemsQuery = 'SELECT * FROM grocery_items';

  db.query(viewItemsQuery, (err, result) => {
    if (err) {
      console.error('Error viewing items:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json(result);
    }
  });
});

app.delete('/admin/removeItem/:itemId' , authMiddleware.authenticate ,authMiddleware.authenticateAdmin , (req, res) => {
  const itemId = req.params.itemId;
  const removeItemQuery = 'DELETE FROM grocery_items WHERE id = ?';
  
  db.query(removeItemQuery, [itemId], (err) => {
    if (err) {
      console.error('Error removing item:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Item removed successfully' });
    }
  });
});

app.put('/admin/updateItem/:itemId' , authMiddleware.authenticate , authMiddleware.authenticateAdmin , (req, res) => {
  const itemId = req.params.itemId;
  const { name, price, inventory } = req.body;

  const updateItemQuery = 'UPDATE grocery_items SET name = ?, price = ?, inventory = ? WHERE id = ?';
  
  db.query(updateItemQuery, [name, price, inventory, itemId], (err) => {
    if (err) {
      console.error('Error updating item:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Item updated successfully' });
    }
  });
});

// User Endpoints
app.get('/user/viewItems',authMiddleware.authenticate , authMiddleware.authenticateUser , (req, res) => {
  const viewItemsQuery = 'SELECT * FROM grocery_items';
  
  db.query(viewItemsQuery, (err, result) => {
    if (err) {
      console.error('Error viewing items:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json(result);
    }
  });
});

app.post('/user/bookItems', authMiddleware.authenticate, authMiddleware.authenticateUser, (req, res) => {
  const  user_id  = req.user;
  const { items } = req.body;

  if (!user_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Invalid request format' , userss:  user_id});
  }

  // Store the booking in the orders table
  const insertOrderQuery = 'INSERT INTO orders (user_id, item_id, quantity, order_date) VALUES ?';
  console.log(insertOrderQuery);

  const orderValues = items.map(item => [user_id, item, 1, new Date()]);

  db.query(insertOrderQuery, [orderValues], (err, result) => {
    if (err) {
      console.error('Error storing booking in orders table:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // Update the inventory of grocery_items
    const bookItemsQuery = 'UPDATE grocery_items SET inventory = inventory - 1 WHERE id IN (?)';
    const itemIds = items.map(item => parseInt(item));

    db.query(bookItemsQuery, [itemIds], (err) => {
      if (err) {
        console.error('Error updating inventory:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      res.status(200).json({ message: 'Items booked successfully', orderId: result.insertId });
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});