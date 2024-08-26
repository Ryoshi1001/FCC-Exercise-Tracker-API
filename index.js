const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

const uri = process.env.MONGO_URI;
mongoose
  .connect(uri)
  .then(() => console.log('Connected to MongoDB database'))
  .catch((error) => console.error('Failed to connect to database:', error));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);



app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  try {
    const user = new User({ username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  console.log('post exercises can be working')
  const userId = req.params._id; 
  console.log('userparam id working')

  let { description, duration, date } = req.body; 

  // if(!date){
  //   date = new Date()
  // } else {
  //   date = new Date(date)
  // }

  //changing returns to date =  and removing const dateChecker fixed: 
  // #8 The response returned from POST /api/users/:_id/exercises will be the user object with the exercise fields added.
    if (!date || date === 'undefined') {
        date = (new Date(Date.now())).toDateString();
    } else {
        const parts = date.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const utcDate = new Date(Date.UTC(year, month, day));
        date =  new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000).toDateString();
    }

    
  let foundUser = await User.findById(userId); 
 

  const newExercise = new Exercise({
    username: foundUser.username, 
    description, 
    duration: Number(duration),
    date:  date ? new Date(date) : new Date(),
    userId: userId, 
  })

  await newExercise.save()

  res.json({
    _id: foundUser._id,
    username: foundUser.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: newExercise.date.toDateString(),
  })
})



app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let dateObj = {};
    if (from) dateObj['$gte'] = new Date(from);
    if (to) dateObj['$lte'] = new Date(to);
    
    let filter = { userId: user._id };
    if (from || to) filter.date = dateObj;

    let exercises = await Exercise.find(filter).limit(Number(limit) || 0);
    

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: log
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});



// #15 Fix for localhost build:  The date property of any object in the log array that is returned from GET /api/users/:_id/logs should be a string. Use the dateString format of the Date API.
// // If testing on freeCodeCamp website check date in chrome inspector/network/log/headers/date and then also changed date on local computer to match date in network before running and pressing the "completed this challenge" btn  
