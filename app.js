var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res)
{
  res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started.")

/*
I dont understand this lol. ^^^ (vaguely)
*/

var SOCKET_LIST = {};

var tileSize = 20;
var width = 1000/tileSize;
var height = 500/tileSize;

var Player = function(id, x, y){
  var self = {
    id:id,
    body:[],
    direction:0
  };

  self.reinit = function()
  {
    var x = Math.floor(Math.random()*100)%width;
    var y = Math.floor(Math.random()*100)%(height-2);

    outerloop:
    while(true)
    {
      x = Math.floor(Math.random()*100)%width;
      y = Math.floor(Math.random()*100)%(height-2);
      head = {x:x,y:y};

      for(var i in Player.list)
      {
        player = Player.list[i];
        // console.log(player.body + " " + player.body.includes(head));
        if(player.body.includes({x:x,y:y}))
        {
          continue outerloop;
        }
      }
      break;
    }

    self.body = [head, {x:x,y:y}, {x:x,y:y}];
    self.direction = 0;
  }

  self.updatePosition = function()
  {
    var newX = self.body[0].x;
    var newY = self.body[0].y;
    if(self.direction === 1) newY--;
    else if(self.direction === 3) newY++;
    else if(self.direction === 2) newX++;
    else if(self.direction === 4) newX--;

    if(self.direction != undefined && self.direction != 0)
    {
      var head = {x:newX,y:newY};

      if(head.x < 0 || head.y < 0 || head.x >= width || head.y >= height)
      {
        self.reinit();
      }

      for(var i in Player.list)
      {
        var p = Player.list[i];
        for(var j in p.body)
        {
          part = p.body[j];
          if(part.x == newX && part.y == newY)
          {
            self.reinit();
            break;
          }
        }
      }
    }

    if(self.direction != undefined && self.direction != 0)
    {
      self.body.unshift({x:newX,y:newY});
      var tail = self.body.pop();

      if(head.x === fruitX && head.y === fruitY)
      {
        fruitX = Math.floor(Math.random()*width);
        fruitY = Math.floor(Math.random()*height);
        self.body.push(tail);
        self.body.push({x:tail.x, y:tail.y});
        self.body.push({x:tail.x, y:tail.y});
      }
    }
  }


  Player.list[id] = self;
  return self;
}

Player.list = {};

var fruitX = Math.floor(Math.random()*width);
var fruitY = Math.floor(Math.random()*height);

var io = require('socket.io')(serv, []);
io.sockets.on('connection', function(socket)
{
  socket.id = Math.random()*100;
  SOCKET_LIST[socket.id] = socket;
  console.log(socket.id + " has connected.");

  var player = Player(socket.id);
  player.reinit();

  socket.on('disconnect',function(){
    delete SOCKET_LIST[socket.id];
    delete Player.list[socket.id];
    console.log(socket.id + " has disconnected.");
  });

  socket.on('directionChange',function(data){
    var currD = Player.list[socket.id].direction;
    if(currD == 0 || (currD - 2 != data.direction && data.direction - 2 != currD))
    {
      Player.list[socket.id].direction = data.direction;
    }
  });
});

setInterval(function(){

  // draw
  var pack = {snakes:[], fruit:{}};

  for(var i in Player.list)
  {
    var player = Player.list[i];
    player.updatePosition();
    pack.snakes.push({
      id:player.id,
      body:player.body,
      direction:player.direction
    });
  }

  pack.fruit.x = fruitX;
  pack.fruit.y = fruitY;

  for(var i in SOCKET_LIST)
  {
    var socket = SOCKET_LIST[i];
    socket.emit('draw', pack);
  }
}, 100);
