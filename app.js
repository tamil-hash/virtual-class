const express = require('express')
const app = express();
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true
});
const { v4: uuidV4 } = require('uuid')

app.use('/peerjs', peerServer);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:false}));
app.use(session({
  secret:"A small little secret!",
  resave: false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://tamil:tAmIl0oo0@webdevelopment.dzan1.mongodb.net/vclassDB?retryWrites=true&w=majority",{useNewUrlParser:true,useUnifiedTopology:true});
mongoose.set("useCreateIndex",true);

const usersSchema = new mongoose.Schema({
  email: String,
  password:String
});

usersSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",usersSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);});
passport.deserializeUser(function(user, done) {
  done(null, user);});


app.get('/',function(req,res){
  res.render('home');
});
app.get('/login',function(req,res){
  res.render('login');

});
app.get('/register',function(req,res){
  res.render('register');
});

app.get('/:id', (req, res) => {
  if(req.isAuthenticated()){
    console.log(req.params.id);
    res.render('room', { roomId: req.params.id });
  }
  else{
    res.redirect('/login');
  }

});
app.post("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});

app.post('/register',function(req,res){

  User.register({username:req.body.username},req.body.password,function(err,user){
    if(!err){
      passport.authenticate("local")(req,res,function(){
        res.redirect(`/${uuidV4()}`);
      });

    }
    else{
      res.redirect('/register');
    }
  });
});
app.post('/login',function(req,res){
  const user = new User({
    username:req.body.username,
    password:req.body.password
  })
  req.login(user, function(err){
    if(!err){
      passport.authenticate("local")(req,res,function(){
        res.redirect(`/${uuidV4()}`);
      });
    }
    else{
      res.redirect("/login");
    }
  })
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId);
    // messages
    socket.on('message', (message) => {
      //send message to the same room
      io.to(roomId).emit('createMessage', message)
  });

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    });
  });
});

server.listen(process.env.PORT||3000);
