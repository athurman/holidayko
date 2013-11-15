var express = require('express');
var mongoose = require('mongoose');
var __ = require('lodash');

// model definitions
require('require-dir')('./models');
var Game = mongoose.model('Game');

// route definitions
var home = require('./routes/home');

var app = express();
var RedisStore = require('connect-redis')(express);
mongoose.connect('mongodb://localhost/multiplayer');

// configure express
require('./config').initialize(app, RedisStore);

// routes
app.get('/', home.index);

// start server & socket.io
var common = require('./sockets/common');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server, {log: true, 'log level': 2});
server.listen(app.get('port'));
io.of('/app').on('connection', common.connection);

var sockets = io.namespaces['/app'].sockets;

setInterval(function(){
  var length = __.sample(__.range(10));
  Game.find().populate('players').exec(function(err,games){
    var potions = [];
    for(var i = 0; i < length; i++){
      var potion = {};
      potion.x = __.sample(__.range(10));
      potion.y = __.sample(__.range(10));
      potion.healthBoost = __.sample(__.range(1,101));
      potion.isPickedUp = false;
      potions.push(potion);
    }
    for(var x = 0; x < games.length; x++){
      games[x].potions = potions;
      games[x].markModified('potions');
      games[x].save(function(err,game){
      });
    }

    for(var j = 0; j < games.length; j++){
      for(var i = 0; i < games[j].players.length; i++){
        if(sockets[games[j].players[i].socketId]){
          sockets[games[j].players[i].socketId].emit('potionsReady', {potions:potions});
        }
      }
    }
  });
},30000);