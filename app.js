const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
dotenv.config();
const secretKey = 'your-secret-key';

mongoose.connect(process.env.MONGO_URL_LOCAL)
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.log(`error occoured: ${err}`));

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
  }
}, {timestamps: true});


const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  posts: [postSchema]
})

const User = new mongoose.model('User', userSchema);

const Post = new mongoose.model('Post', postSchema); 

const _ = require('lodash');
const { Timestamp } = require("mongodb");

const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// Middleware to verify JWT and extract user information
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = user; // Attach user information to the request
    next();
  });
};

app.get('/register', (req,res) => {
  res.render('register');
});

app.post('/register', (req,res) => {
  const {username, email, password} = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if(err) console.log(err);
    const user = new User({
      username, 
      email, 
      password: hash
    });
    
    user.save().then(()=> res.redirect('/login'));
  })

})


app.get('/login', (req,res) => {
  res.render('login');
});

app.post('/login', (req,res) => {
  
  
  const {email, password} = req.body;
  
  User.findOne({email: email}).then(foundUser => {
    
    bcrypt.compare(password, foundUser.password, (err, result) => {
      if(err) console.log(err);

      if(result === true) {
        const user = {
          _id:  foundUser._id // Replace 'user-id' with the actual user's _id
        };
       
        const token = jwt.sign(user, secretKey, { expiresIn: '1h' }); // Expires in 1 hour

        res.cookie('token', token, {
          httpOnly: true, // Make the cookie accessible only via HTTP (not JavaScript)
          // Other cookie options (e.g., secure, sameSite) for security
        }).redirect('/');
      }else{
        res.redirect('/login');
      }
    })
  })
  
})

app.get('/logout', (req, res) => {
  res.clearCookie('token'); // Clear the 'token' cookie
  res.redirect('/login'); // Redirect to the login page or any other desired page
});

app.get('/', verifyToken, (req, res) => {
  // Post.find({}, (err, posts) => {



  Post.find({createdBy: req.user._id})
  .then((posts) => {
    res.render('home', {homeStartingContent: homeStartingContent, posts: posts})
  })
  .catch((err) => console.log(err))
});

app.get('/about', (req,res) => {
  res.render('about',{content: aboutContent});
});

app.get('/contact', (req,res) => {
  res.render('contact', {content: contactContent});
});

app.get('/compose',verifyToken,  (req,res) => {
  res.render('compose');
});

app.post('/compose', verifyToken, (req,res) => {
  const {title, content} = req.body;
  const userId = req.user._id; // Extracted from the JWT
  const post = new Post ({
    title: title,
    content: content,
    createdBy: userId
  });

  // posts.push(post);\
  post.save()
  .then(() => res.redirect('/'))
  .catch(err => console.log(err));
  
});


app.get('/posts/:postId',verifyToken, (req,res) => {
  const requestedPostId = req.params.postId;
  Post.findOne({_id: requestedPostId})
  .then((post) => {
      if(post){
        res.render('post',{title: post.title, content: post.content});
      }else{
        console.log("No post.");
      }
    })
  .catch(err => console.log(err))
  
});








app.listen(process.env.PORT, function() {
  console.log("Server started on port 3000");
});
