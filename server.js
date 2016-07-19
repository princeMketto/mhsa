var express = require('express');
var app = express();
var mysql = require('mysql');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs')
var tm = new Date().toISOString().replace(/T/,' ').replace(/\..+/, '');
var SerialPort = require("serialport").SerialPort
var mvalue;
var verification= false;
var port = process.env.PORT || 3000;
var text='';
var isConnect = false;
var conn = mysql.createConnection({
  host:     'localhost',
  user:     'root',
  password: 'heartbeat',
  database: 'mhsa'
});
var wstream = fs.createWriteStream('mylog.txt');
server.listen(port, function () {
  console.log('Server listening at port %d', port);
  wstream.write('['+tm+']'+'\t\tSERVER STARTED SUCCESSFULLY \r\n');

});

// Routing
// app.use(express.static(__dirname + '/public'));

app.use('/', express.static(__dirname + '/public'))

//Setup the serial port to talk and listen to arduino's
var arduino = new SerialPort("COM4", {  ///dev/ttyACM0
        baudrate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        flowControl: false
})

arduino.on('open', function() {
    // arduino.write('on')
    // arduino.write("4", function() {
    //   console.log('Port opened!');
    // });
var isConnect = true;
});


io.on('connection', function (socket) {
        console.log('New connection');
        wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t New connection from \t\t'+socket.id+'\r\n');
        var buff='';
        var decoded='';
        var loginfo='';
        var userName='';
        var passWord='';
        if(!isConnect){
          wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+"Micro-controller is connected"+'\r\n');
        }
        arduino.on('data', function(data) {
            //    var decoded = arrayBufferTostring(data);
            buff += data.toString('utf8');
            if(buff.indexOf('B') >= 0 && buff.indexOf('A') >=0){
              decoded = buff.substring(buff.indexOf('A')+1, buff.indexOf('B'));
              buff='';
            //  io.sockets.emit('message', decoded);
            socket.broadcast.emit('message', {
              message:decoded
            });

          } else if (buff.indexOf('Y') >= 0 && buff.indexOf('X') >= 0) {
            decoded = buff.substring(buff.indexOf('X')+1, buff.indexOf('Y'));
            buff='';
            socket.broadcast.emit('sync', {
              message:decoded
            });

          }
          //  decoded=buff;
            //buff='';
            //socket.broadcast.emit('message', {
            //  message:decoded
          //  });

          //  socket.emit('incoming', {message:decoded}); // second attempt
            console.log(decoded);
            wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+decoded+'\r\n');
          });
            //*****************
            socket.on('logme', function(data){
                var userdata =data.toString();
                name = userdata.substring(userdata.indexOf('/')+1, userdata.indexOf('//'));
                pass = userdata.substring(userdata.indexOf('//')+2, userdata.indexOf('#'));
                // QUERY..........
                console.log(name);
                conn.connect();
                console.log('CONNECTED TO MHSA DB');
                wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'CONNECTED to database'+'\r\n');

                var sql = 'SELECT * FROM userlogin WHERE username = '+conn.escape(name);
                conn.query(sql, function(err,results){
                    console.log(results);
                    var username = results[0].username;
                    var password = results[0].password;
                    console.log(username);
                    console.log(password);
                    var userinfo = '/'+username+'//'+password+'#';
                    console.log(userinfo);
                    //CHECK IF THERE IS Error
                    if(!err){
                        if (name == username && pass == password) {
                          var info ='VERIFIED';
                          verification=true;
                          console.log('VERIFIED');
                          wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'sign in successfully'+'\r\n');

                          socket.broadcast.emit('logintel', {
                            message:userinfo
                          });
                        }else {
                          var info ='DENIED';
                          verification=false;
                          //console.log('DENIED');
                            wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'sign in Failed'+'\r\n');
                          socket.broadcast.emit('logintel', {
                            message:userinfo
                          });

                        }
                    }else {
                      console.log('ERROR');
                    }
                });
                  //CLOSE connection
                  conn.end();

            });
            //********************8
        socket.on('lightOn', function (data) {

                    mvalue = (data);
                  //  console.log("Value passed = "+mvalue);
                    arduino.write(mvalue, function() {
                      console.log("Value passed = "+mvalue);
                        wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'light on'+'\r\n');
            });
            /*************
            arduino.on('data', function(data) {
                //    var decoded = arrayBufferTostring(data);
                var decoded = data.toString('utf8').trim();
            // we tell the client to execute 'new message'
            socket.broadcast.emit('state', {
              message:decoded  //'lightOn'
            });
          });*/
        });
        socket.on('mastOn', function (data) {

                    mvalue = 'm';
                  //  console.log("Value passed = "+mvalue);
                    arduino.write(mvalue, function() {
                      console.log("Value passed = "+mvalue);
                        wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'Master switch on'+'\r\n');
            });

        });
        socket.on('mastOff', function (data) {

                    mvalue = 'n';
                  //  console.log("Value passed = "+mvalue);
                    arduino.write(mvalue, function() {
                      console.log("Value passed = "+mvalue);
                        wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'light on'+'\r\n');
            });

        });


        // == Turn Off light
        socket.on('lightOff', function (data) {
          mvalue = (data);
          var send;
          switch (mvalue.charAt(0)) {
            case 'G':
              send ='0';
              break;
              case 'C':
                send ='1';
                break;
                case 'F':
                  send ='2';
                  break;
                  case 'B':
                    send ='3';
                    break;
                    case 'L':
                      send ='5';
                      break;
            default:

          }
            arduino.write(send, function() {
             console.log('Value passed = '+send);
               wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'light off'+'\r\n');

            });
            /*************
            arduino.on('data', function(data) {
                //    var decoded = arrayBufferTostring(data);
                var decoded = data.toString('utf8').trim();
            // we tell the client to execute 'new message'
            socket.broadcast.emit('state', {
              message:decoded  //'lightOff'
            });
          });*/
        });
        socket.on('sync', function (data) {
          mvalue = (data);
            wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'Request synchronization'+'\r\n');
            arduino.write(mvalue, function() {


            });

            // we tell the client to execute 'new message'

        });
        //**** sensor distance2
        socket.on('distOn', function (data) {
          mvalue = data;
            wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'Distance sensor Activated'+'\r\n');
            arduino.write(mvalue, function() {
              console.log(mvalue);
            });


        });
        socket.on('distOff', function (data) {
          mvalue = data;
            wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'Distance sensor Deactivated'+'\r\n');
            arduino.write(mvalue, function() {
                console.log(mvalue);
            });


        });
        //=====
        socket.on('autoOn', function (data) {
          mvalue = data;
            wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'Automatic lighting Ativated'+'\r\n');
            arduino.write(mvalue, function() {
              console.log(mvalue);
            });


        });
        socket.on('autoOff', function (data) {
          mvalue = data;
            wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'Automatic lighting Ativated Deactivated'+'\r\n');
            arduino.write(mvalue, function() {
                console.log(mvalue);
            });


        });
        //******
if(verification==true){
  var info ='VERIFIED';
  console.log('VERIFIED');
  socket.broadcast.emit('logintel', {
    message:info
  });
}else if (verification ==false) {
  var info ='DENIED';
  console.log('DENIED');
  socket.broadcast.emit('logintel', {
    message:info
  });
}


        //when client disconnect
        socket.on('disconnect', function(){
          console.log("client left");
            wstream.write('['+new Date().toISOString().replace(/T/,' ').replace(/\..+/, '')+']'+'\t\t'+'User left'+'\r\n');
          //  wstream.end();
        });

    });

// Array to buffer
function arrayBufferTostring(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}
