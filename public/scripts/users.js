const express = require('express');
const User = require('../../models/User');
const Reminder = require('../../models/Reminder');
const Template = require('../../models/Template');
const passport = require('passport');
const bcrypt = require("bcrypt");
const webPush = require('web-push');
const io = require('../../socketio');

const saltRounds = 10;

let router = express.Router();

//These keys identify who sends the push notifications
const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

webPush.setVapidDetails('mailto: test@test.test', publicVapidKey, privateVapidKey);

router.post('/subscribe', (req, res)=>{
  //Get subscription object
  const subscription = req.body.subscription;
  const message = req.body.message;
  console.log(req.body);
  res.status(201).json({});

  const payload = JSON.stringify({title: message});

  webPush.sendNotification(subscription, payload)
    .catch(err=>{console.log(err);});
});

router.use(passport.initialize());
router.use(passport.session());

//handle get requests
router.get('/', (req, res)=>{
  res.render('login');

});
router.get('/login', (req, res)=>{
  res.render('login');
});

router.get('/register', (req, res)=>{
  res.render('register');
});

router.get('/archives', (req, res)=>{
  if(req.isAuthenticated()){
    res.render('archives');
  } else {
    res.render('login');
  }
});

router.get('/dashboard', (req, res)=>{
  if(req.isAuthenticated()){
    res.render('dashboard');
  } else {
    res.render('login');
  }
});

//handle post requests
router.post('/login', async (req, res, next)=>{
  let userData = req.body;
  passport.authenticate('local', (err, user, info) => {
    if(info.message == "ok"){
      req.login(user, (err) => {    
        return res.render('dashboard');
      })  
    } else{
      return res.send(info.message);
    }

  })(req, res, next);
});

router.post('/register', async (req, res)=>{
  let userData = req.body;
  if(userData.password1.length<6){
    res.send('Error: Password must be at least 6 characters long');
  }else if(userData.password1 != userData.password2){
    res.send('Error: Passwords do not match!');

  }else{

    let found = await User.findOne({email:userData.email});
    if(found==null){
      bcrypt.genSalt(saltRounds, (err, salt) => {
        bcrypt.hash(userData.password1, salt, async (err, hash) => {
            // Now we can store the password hash in db.
          let user = new User({
            email:userData.email,
            password:hash
          });
          let data = await user.save();

          res.redirect("/users/login");
        });
      });  
    }else{
      res.send('Error: Email already in use!');
    }
  }
});

router.get('/api/user_data', (req, res)=>{
  if(req.user === undefined){
    res.json({});
  }else{
    res.json({
      user: req.user
    });
  }
});

router.get('/logout', (req, res)=>{
  req.session.destroy();
  req.logout();
  res.redirect('/users/login');
});


//socket.io handles
io.on('connection', async socket=>{

  socket.on('start', async userInfo=>{
    //give front end all of their reminds so that they can be displayed
    let user = userInfo.user;
    console.log('start');
    let reminderArr = await Reminder.find({userEmail:user.email});
    let templateArr = await Template.find({userEmail:user.email});
    socket.emit('userReminders', {reminderArr, templateArr});
  }); 

  socket.on('createRemind', async ({title, notes, date, time, userEmail})=>{
    let found = await Reminder.findOne({userEmail: userEmail, title:title});
    console.log('create');
    if(found == null){
      let reminder;
      if(date != ''){
        let d;
        if(time != ''){
          let fullDate = date + "|" + time;

          let dateTimeSep = fullDate.split('|');
          let dateSep = dateTimeSep[0].split('-');
          let timeSep = dateTimeSep[1].split(':');
      
          d = new Date(dateSep[0], dateSep[1]-1, dateSep[2], timeSep[0], timeSep[1], 0, 0);
        } else {
          let dateSep = date.split('-');
          console.log(dateSep);
          d = new Date(dateSep[0], (dateSep[1]-1), dateSep[2], 0, 0, 0, 0);
        }

        reminder = new Reminder({
          userEmail: userEmail,
          title:title,
          notes: notes,
          remindDate: d
        });    

      }else{
        reminder = new Reminder({
          userEmail: userEmail,
          title:title,
          notes: notes,
        });  
      }

      reminder.save()
        .then(data=>{
          socket.emit('createdReminder', {message: 'ok', reminder});
        })
        .catch(err=>{
          socket.emit('createdReminder', {message: err.message});
        });
    }else{
      socket.emit('createdReminder', {message: 'already exists'});
    }
  });

  socket.on('createTemplate', async ({title, notes, userEmail})=>{
    let found = await Template.findOne({userEmail: userEmail, title:title});
    console.log('create Temp');

    if(found == null){
      let template = new Template({
        userEmail: userEmail,
        title:title,
        notes: notes,
      });  

      template.save()
        .then(data=>{
          socket.emit('createdTemplate', {message: 'ok', template});
        })
        .catch(err=>{
          socket.emit('createdTemplate', {message: err.message});
        });
    }else{
      socket.emit('createdTemplate', {message: 'already exists'});
    }
  });

  socket.on('deleteRemind', async({title, userEmail})=>{
    console.log('del');
    let data = await Reminder.findOneAndDelete({userEmail:userEmail, title:title});
  });

  socket.on('deleteTemplate', async({title, userEmail})=>{
    console.log('del temp');

    let data = await Template.findOneAndDelete({title:title, userEmail:userEmail});

    if(data!=null){
      socket.emit('deletedTemplate', {message:'ok', title});
    }else{
      socket.emit('deletedTemplate', {message:"404"});
    }
  });

  socket.on('updateActive', async({isActive, title, userEmail})=>{
    console.log('up act');
    let data = await Reminder.updateOne({title:title, userEmail:userEmail}, {$set: {
      isActive:isActive}
    });

    if(data){
      socket.emit('updatedActive', {message:'ok', title, isActive});
    } else {
      socket.emit('updatedActive', {message:'err'});
    }
  });

  socket.on('updateStarred', async({isStarred, title, userEmail})=>{
    console.log('up star');
    let data = await Reminder.updateOne({title:title, userEmail:userEmail}, {$set: {
      isStarred:isStarred
    }});
    if(data){
      socket.emit('updatedStarred', {message:'ok', title, isStarred});
    } else {
      socket.emit('updatedStarred', {message:'err'});
    }
  });
});

module.exports = router;

