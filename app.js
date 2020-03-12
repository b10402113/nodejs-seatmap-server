var express = require('express');
var path  = require('path')
var fs = require('fs');
var app = express();
var engine = require('ejs-locals');
var bodyParser = require('body-parser');
var admin = require("firebase-admin");
const Multer = require('multer');
const {format} = require('util');
const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // no larger than 5mb, you can change as needed.
  },
});
const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUI = require('swagger-ui-express')
const fileUpload = require('express-fileupload');
const cors = require('cors');
const morgan = require('morgan');
const _ = require('lodash');
const {Storage} = require('@google-cloud/storage');
const storage = new Storage({
   projectId: "test-a9217",
   keyFilename: './test-a9217-firebase-adminsdk-tppo7-7d982aa13e.json'
 });
 
 const bucket = storage.bucket("gs://test-a9217.appspot.com");
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.use(fileUpload({
   createParentPath: true,
   limits: { 
       fileSize: 2 * 1024 * 1024 * 1024 //2MB max file(s) size
   },
}));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));
// var multer  = require('multer')
// var upload = multer({ dest: 'upload/' });

const swaggerOptions = {
   swaggerDefinition:{
      info:{
         title:"Customer APi",
         description:"API for SeatMap",
         contact:{
            name:"andy"
         },
         servers:["http://localhost:3000"]
      }
   },
   // 
   apis:["app.js"]
}
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs',swaggerUI.serve,swaggerUI.setup(swaggerDocs));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

var serviceAccount = require("./test-a9217-firebase-adminsdk-tppo7-7d982aa13e.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://test-a9217.firebaseio.com"
});
var fireData = admin.database();



// console.log(fireData);
app.engine('ejs',engine);
app.set('views','./views');
app.set('view engine','ejs');
//增加靜態檔案的路徑
app.use(express.static('public'))

// 增加 body 解析
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extendedc:false}))

//路由

app.get('/',function(req,res){
   fireData.ref('todos').once('value',function(snapshot){
      var data = snapshot.val();
      return res.render('index',{"todolist":data})
   })    
})


// getTime function
function getTime(){
   let date_ob = new Date();

// current date
// adjust 0 before single digit date
   let date = ("0" + date_ob.getDate()).slice(-2);

// current month
   let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

// current year
   let year = date_ob.getFullYear();

// current hours
   let hours = date_ob.getHours();

// current minutes
   let minutes = date_ob.getMinutes();

// current seconds
   let seconds = date_ob.getSeconds();


// prints date & time in YYYY-MM-DD HH:MM:SS format
   let nowTime = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
   return nowTime;
}

// 溫濕度
app.post('/updateHumiture',function(req,res){
   var humidity = req.body.humidity;
   var temperature = req.body.temperature;
   var volume = req.body.ao;
   var location = req.body.location;
   // let date_ob = new Date();
   var time = getTime();
   // 更新當前溫度
   fireData.ref('/locations/'+location).update({"curHum":humidity,"curTemp":temperature});
   // 存入歷史資料
   var Ref = fireData.ref('/locations/'+location   +'/historicalTH').push();
   Ref.set({"humidity":humidity,"temperature":temperature,"time":time}).then(function(){
      fireData.ref('locations').once('value',function(snapshot){
         res.send({
            "sucess":true,
            "result":snapshot.val(),
            "message":"資料讀取成功"
         });
      })
   })
});

// 人數
app.post('/updatePersonCount',function(req,res){
   var count = req.body.count;
   var location = req.body.location;
   // let date_ob = new Date();
   var time = getTime();
   // 更新當前溫度
   fireData.ref('/locations/'+location).update({"curPersonCount":count});
   // 存入歷史資料
   var Ref = fireData.ref('/locations/'+location+'/historicalPersonCount').push();
   Ref.set({"count":count,"time":time}).then(function(){
      fireData.ref('locations').once('value',function(snapshot){
         res.send({
            "sucess":true,
            "result":snapshot.val(),
            "message":"資料讀取成功"
         });
      })
   })
});

app.get('/images/:img_name',function(req,res){
   img_path = path.resolve('./image_uploads/'+req.params.img_name+'.jpg');
   console.log(img_path)
   if(fs.existsSync(img_path)){
      res.send(img_path)
   }else{
      res.send("不存在")
   }
});

app.post('/uploadImage',multer.single('file'), (req, res, next) => {
   try {
      if(!req.files) {
          res.send({
              status: false,
              message: 'No file uploaded'
          });
      } else {
          //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
          let avatar = req.files.file;
          
          //Use the mv() method to place the file in upload directory (i.e. "uploads")
          avatar.mv('./image_uploads/' + avatar.name);

          //send response
          res.send({
              status: true,
              message: 'File is uploaded',
              data: {
                  name: avatar.name,
                  mimetype: avatar.mimetype,
                  size: avatar.size
              }
          });
      }
  } catch (err) {
      res.status(500).send(err);
  }
})

// 監聽 port
var port = process.env.PORT || 3000;
app.listen(port);