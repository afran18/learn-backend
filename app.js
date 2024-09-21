const path = require('path');
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const errorController = require('./controllers/error');
const User = require('./models/user'); // Ensure this path is correct

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

// Import routes
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to attach user to the request object
app.use((req, res, next) => {
  User.findById('66eeb2a25bd7629316fc143f') // Replace with a valid user ID or handle errors
    .then(user => {
      if (user) {
        req.user = user; // Use the existing user directly
      } else {
        req.user = null; // Handle the case when user is not found
      }
      next();
    })
    .catch(err => console.log(err));
});

// Set up routes
app.use('/admin', adminRoutes);
app.use(shopRoutes);

// Error handling
app.use(errorController.get404);

// Database connection and user creation
mongoose
  .connect(process.env.MONGODB_URI)
  .then(result => {
    console.log('Connected to Database');
    return User.findOne(); // Return the promise
  })
  .then(user => {
    if (!user) {
      // Create a new user if one doesn't exist
      const user = new User({
        name: "Afran",
        email: "afran@email.com",
        cart: {
          items: []
        }
      });
      return user.save(); // Return the promise
    }
  })
  .then(() => {
    // Start the server after the user check
    app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  })
  .catch(err => {
    console.log(err);
  });
