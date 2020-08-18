const express = require('express');
const User = require('../../models/User');
const Reminder = require('../../models/Reminder');
const Template = require('../../models/Template');
const passport = require('passport');
const bcrypt = require("bcrypt");
const webPush = require('web-push');
const io = require('../../socketio');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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

router.get('/forgot', (req, res)=>{
  res.render('forgot');
});

router.get('/reset/:token', (req, res)=>{
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {
      user: req.user
    });
  });
});

//handle post requests
router.post('/login', async (req, res, next)=>{
  let userData = req.body;
  passport.authenticate('local', (err, user, info) => {
    if(info.message == "ok"){
      req.login(user, (err) => {    
        res.render('dashboard');
      })  
    } else{
      res.render('login', {
        email:userData.email,
        errors: [{msg: info.message}] 
      })
    }

  })(req, res, next);
});

router.post('/register', async (req, res)=>{
  let userData = req.body;
  let errors = [];


  if(userData.password1.length<6){
    errors.push({msg:"Password must be at least 6 characters long"});
  }else if(userData.password1 != userData.password2){
    errors.push({msg:"Passwords do not match!"});
  }

  let found = await User.findOne({email:userData.email});

  if(found!=null){
    errors.push({msg:"Email already in use!"});
  }

  if(errors.length==0){
    let user = new User({
      email:userData.email,
      password:userData.password1
    });

    //Password hashing is done by schema
    await user.save();
    req.flash('success_msg', 'You are registered and can now login');
    req.flash('error_msg', '');

    res.redirect("/users/login");
  }else{
    res.render('register', {
      errors,
      email: userData.email,
      password: userData.password1,
      password2: userData.password2
    });  
  }
  
});

router.post('/forgot', async (req, res)=>{
  try{
    let token = await crypto.randomBytes(8).toString('hex');
    let userInfo = req.body;
  
    let data = await User.updateOne({email:userInfo.email}, {$set:{
      resetPasswordToken:token,
      resetPasswordExpires: Date.now() + 3600000
    }})

    if(data.n===0){
      req.flash('error_msg', 'No account with that email address exists.');
      return res.redirect('./forgot');
    }

    let transporter  = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });    
    

    //ip of local host to act as a domain url
    let ip = '192.168.1.5' + ':3000';

    var mailOptions = {
      to: userInfo.email,
      from: 'thegreatman@great.the',
      subject: 'Scheduler Password Reset',
      text: 'You are receiving this because you (or someone else) have requested the reset of the password for your Scheduler account.\n\n' +
        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
        'http://' + ip + '/users/reset/' + token + '\n\n' +
        'If you did not request this, please ignore this email and your password will remain unchanged.\n'
    };

    transporter.sendMail(mailOptions, (err)=> {
      if(err){
        req.flash('error_msg', 'An error has occured.');
        res.redirect('./forgot');  

        console.log(err);
      }else{
        req.flash('success_msg', 'An e-mail has been sent to ' + userInfo.email + ' with further instructions.');
        res.redirect('./forgot');  
      }
    });    
  }catch(err){
    console.log(err);
    res.render('forgot', {errors:[{msg:'An error has occured please try again later.'}]});
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
  req.logout();
  req.flash('success_msg', 'You have logged out');

  res.redirect('/users/login');
});

//socket.io handles
io.on('connection', async socket=>{

  socket.on('start', async userInfo=>{
    //give front end all of their reminds so that they can be displayed
    let user = userInfo.user;
    let reminderArr = await Reminder.find({userEmail:user.email});
    let templateArr = await Template.find({userEmail:user.email});
    socket.emit('userReminders', {reminderArr, templateArr});
  }); 

  socket.on('createRemind', async ({title, notes, date, time, userEmail})=>{
    let found = await Reminder.findOne({userEmail: userEmail, title:title});
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
    let data = await Reminder.findOneAndDelete({userEmail:userEmail, title:title});
  });

  socket.on('deleteTemplate', async({title, userEmail})=>{
    let data = await Template.findOneAndDelete({title:title, userEmail:userEmail});

    if(data!=null){
      socket.emit('deletedTemplate', {message:'ok', title});
    }else{
      socket.emit('deletedTemplate', {message:"404"});
    }
  });

  socket.on('updateActive', async({isActive, title, userEmail})=>{
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

