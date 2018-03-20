const fs = require('fs');
const qeegmodfile = require("../dist/qeegmodfile.cjs.js");

var buffer = fs.readFileSync("data/AVE-BBSP-A-0.MOD").buffer;


fs.readFile("data/AVE-BBSP-A-0.MOD", null, function (err, nb) {

  var arrBuff = nb.buffer;

  var myEegParser = new qeegmodfile.QeegModFileParser();
  myEegParser.setRawData( arrBuff );

  // qeegData contains metadata and raw data that are still hard to read
  var qeegData = myEegParser.parse();
  console.log( qeegData );

});
