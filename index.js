const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

// Basic Configuration
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB Atlas successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Set up the models
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    
    // Make sure username exists
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Create new user
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    
    // Return the user object
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    // Find all users
    const users = await User.find({});
    
    // Return array of users
    res.json(users.map(user => ({
      username: user.username,
      _id: user._id
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    let { description, duration, date } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate inputs
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    if (!duration) {
      return res.status(400).json({ error: 'Duration is required' });
    }
    
    // Convert duration to number
    duration = Number(duration);
    if (isNaN(duration)) {
      return res.status(400).json({ error: 'Duration must be a number' });
    }
    
    // Create date object (default to current date if not provided)
    let dateObj;
    if (date) {
      dateObj = new Date(date);
      if (dateObj.toString() === 'Invalid Date') {
        return res.status(400).json({ error: 'Invalid date format' });
      }
    } else {
      dateObj = new Date();
    }
    
    // Create and save the exercise
    const newExercise = new Exercise({
      userId: userId,
      description: description,
      duration: duration,
      date: dateObj
    });
    
    await newExercise.save();
    
    // Return the user object with the exercise fields
    res.json({
      _id: user._id,
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Set up filter for exercises
    let dateFilter = { userId: userId };
    
    if (from || to) {
      dateFilter.date = {};
      
      if (from) {
        dateFilter.date.$gte = new Date(from);
      }
      
      if (to) {
        dateFilter.date.$lte = new Date(to);
      }
    }
    
    // Find exercises for the user
    let exercises = await Exercise.find(dateFilter).exec();
    
    // Apply limit if provided
    if (limit) {
      exercises = exercises.slice(0, Number(limit));
    }
    
    // Format the exercise logs
    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));
    
    // Return the full log
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: log
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});