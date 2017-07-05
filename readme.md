[DEMO](http://me.jonathanlurie.fr/qeegmodfileparser/examples/test.html)  

# What is it for?
QeegModFileParser is Javascript parser for the quantitative EEG binary (.MOD) files used in the #CCC (Canada-China-Cuba) neuroscience consortium.  
It parses file  and return an object that contains easy-to-read EEG data, though QeegModFileParser does not provide any helper or processor for these data.  

The parser is supposed to be used in browser but could be used server side. It uses ES6 and `export`but the bundle generated in **dist** is *requireable* since it uses [umd](https://github.com/umdjs/umd).

# How to use?
An instance of QeegModFileParser can be used to parse several file (you don't need to create a QeegModFileParser instance per file to parse). The Qeeg MOD file usually have the .MOD extension, though this parser does not need the filename or its extension.  

The parser takes an `ArrayBuffer` from a file. See [examples/test.html](examples/test.html) to extract the `ArrayBuffer` from a file opened with a *file dialog*.

Then, instanciate a `QeegModFileParser` object, feed it with the *buffer* and launch `.parse()` to get the result object:  

```Javascript
var myEegParser = new qeegmodfileparser.QeegModFileParser();
myEegParser.setRawData( arrayBuffer );
var qeegData = myEegParser.parse();
console.log( qeegData );
```
