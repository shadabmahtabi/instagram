const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL);


// Listen for the 'open' event to check if the connection is successful
mongoose.connection.once('open', () => {
  console.log('Database connected');
});

// Listen for the 'error' event to handle connection errors
mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

const userSchema = mongoose.Schema({
  username: String,
  name: String,
  email: String,
  password: String,
  bio: String,
  profileImage: String,
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "post" }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],

  resetPasswordToken: String,
  resetPasswordExpires:  Date,
});

userSchema.plugin(plm);

// Create the user model
module.exports = mongoose.model('user', userSchema);
