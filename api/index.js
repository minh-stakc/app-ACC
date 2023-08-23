const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User.js");
const TestCrops = require('./models/TestCrops.js');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { default: axios } = require("axios");
const {spawn} = require('child_process');
const app = express();
const bcryptSalt =  bcrypt.genSaltSync(10);
const jwtSecret = 'f8u230f20u203f20i3o';
const APIkey = 'd19a1eac74129a54df64265af607e433';


require("dotenv").config();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: ['http://127.0.0.1:5500'],
}));
// console.log(process.env.MONGOOSE_URL);

mongoose.connect(process.env.MONGOOSE_URL);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
});

function predict(inputdata, callback) {
  const childPython = spawn('python', inputdata);
  let prediction = '';
  childPython.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
    prediction += data;});
  childPython.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);});
  childPython.on('close', (code) => {
    console.log(`exited with code ${code}`);
    callback(prediction.trim());});
}


app.post('/api/register', async (req, res) => {
    const {firstname, lastname, address, email, password} = req.body
    try{
      const userDoc = await User.create({
        firstname,
        lastname,
        address,
        email,
        password:bcrypt.hashSync(password, bcryptSalt),
      })
      // console.log(req.body)
      res.json(userDoc)
    } catch (e) {
      res.status(422).json(e);
    }
})

app.post('/api/login', async (req, res) => {
  const {email, password} = req.body;
  const userDoc = await User.findOne({email});
  // console.log(userDoc)
  if (userDoc){
    const pass0k = bcrypt.compareSync(password, userDoc.password);
    // console.log(pass0k)
    if (pass0k){
      jwt.sign({
        email:userDoc.email, 
        id:userDoc._id, 
        firstname:userDoc.firstname,
        lastname:userDoc.lastname,
        address:userDoc.address}, 
        jwtSecret, {}, (err, token) => {
        if (err) throw err;
        res.cookie('token', token).json(userDoc)
      })
    } else{
      res.status(422).json('pass not ok')
    }
  } else{
    res.status(404).json('Not found!')
  }
})

app.get('/api/profile', (req, res) => {
  const {token} = req.cookies
  if(token){
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const {firstname, lastname, email, _id} = await User.findById(userData.id);
      res.json({firstname, lastname, email, _id});
      // console.log({firstname, lastname, email, _id});
    })
  } else{
    res.json(null)
  }
})

app.post('/api/logout', (req, res) => {
  res.cookie('token', '').json(true);
})

//function of the web



app.post('/api/tests/crops', async (req, res) => {
  const { token } = req.cookies;
  console.log(token);
  const {temperature, moisture, pH, N,P,K, soiltype, croptype, humidity, rainfall} = req.body
  if(token){
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      //going through an AI model
      predict(['fertilizer.py', temperature,humidity ,moisture,soiltype,croptype,N,P,K], (prediction) => {
        console.log('Prediction:', prediction);
        recommendation = prediction;
        TestCrops.create({
          temperature,
          humidity,
          rainfall,
          moisture,
          soiltype,
          croptype,
          pH,
          N,
          P,
          K,
          recommendation,
          author: userData.id,
        }).catch((err) => {
          console.error(err);
          res.status(500).json({ error: 'An error occurred while creating the test document' });
        });
        res.json(recommendation)
      });
    });  
  } else{
    res.json(null)}
});

app.post('/api/getweather', (req, res) => {
  const { token } = req.cookies;
  console.log(token);
  const {temperature, pH, N,P,K} = req.body
  if(token){
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      axios
        .get(
          `https://api.openweathermap.org/data/2.5/weather?q=${userData.address}&appid=${APIkey}`
        )
        .then((response) => {
          let rainfall = response.data.rain*4 ? response.data.rain["1h"]*4 || 0 : 0;
          let humidity = response.data.main.humidity;
          console.log(response.data.main.temp);
          let recommendation
          predict(['crop.py', N,P,K,temperature,humidity,pH,rainfall], (prediction) => {
            console.log('Prediction:', prediction);
            recommendation = prediction;
            res.json([rainfall, humidity, recommendation])
          });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ error: 'An error occurred while fetching weather data' });
        });
    });
  } else{
  res.json(null)}
});

app.get('/api/user-testcrops-uploaded', (req,res) => {
  const {token} = req.cookies;
  if(token){
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      const {id} = userData;
      res.json( await TestCrops.find({author:id}) );
    });
  } else{
  res.json(null)}
});


// app.get('/api/tests/search', async (req,res) => {
//   const {title} = req.body.trim();
//   const response = await Test.find({title:{$regex: new RegExp('^'+title+'.*','i')}}).exec();
//   res.json(response);
// })

app.listen(4000);
