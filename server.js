const express = require('express');
const session = require('express-session');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res)=>{
  res.send('hi');
});

app.listen(PORT, ()=>console.log('SERVER RUNNING AT PORT: ' + PORT));
