var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/User');
const bcrypt = require("bcrypt");

passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {    
    const user = await User.findOne({email:email});

    if(user!=null){
      bcrypt.compare(password, user.password, function(err, result) {
        if (result){
          return done(null, user, {message:'ok'})
        }else {
          return done(null, false, { message: 'Incorrect password.' });
        }
      });
    }else{
      return done(null, false, { message: 'Email not found.' });
    }
  }
));

// tell passport how to serialize the user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// tell passport how to deserialize the user
passport.deserializeUser(async (id, done) => {
  await User.findById(id, (err, user)=>{
    done(err, user);
  });
});

