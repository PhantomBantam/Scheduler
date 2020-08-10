const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store') (session);
const { v4: uuidv4 } = require('uuid');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
var sockets = require('./socketio');


require('dotenv').config();

const app = express();
const server = http.createServer(app);
sockets.connect(server);

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true });


//set up body parser
app.use(express.urlencoded({extended:true}));
app.use(express.json());

app.use(session({
  genid: function(req){
    return uuidv4();
  },
  store: new FileStore(),
  secret: process.env.SESSION_SECRET,
  saveUninitialized:true,
  resave:false,
  maxAge: 1000*60*60*24
}));

//set up ejs engine
app.use(expressLayouts);
app.set('view engine', 'ejs');


app.use(express.static(path.join(__dirname, 'public')));

//set up router
const users = require('./public/scripts/users');
app.use('/users', users);

app.get('/', (req, res)=>{
  res.send('hi');
});

server.listen(PORT, ()=>console.log('SERVER RUNNING AT PORT: ' + PORT));
