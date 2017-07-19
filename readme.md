[DEMO](http://me.jonathanlurie.fr/qeegmodfileparser/examples/interpreter.html)  

# What is it for?
QeegModFileParser is Javascript parser for the quantitative EEG binary (.MOD) files used in the #CCC (Canada-China-Cuba) neuroscience consortium.  
It parses file  and return an object that contains easy-to-read EEG data, though QeegModFileParser does not provide any helper or processor for these data.  

The parser is supposed to be used in browser but could be used server side. It uses ES6 and `export`but the bundle generated in **dist** is *requireable* since it uses [umd](https://github.com/umdjs/umd).

# How to use?
## The parser
An instance of QeegModFileParser can be used to parse several file (you don't need to create a QeegModFileParser instance per file to parse). The Qeeg MOD file usually have the .MOD extension, though this parser does not need the filename or its extension.  

The parser takes an `ArrayBuffer` from a file. See [examples/interpreter.html](examples/interpreter.html) to extract the `ArrayBuffer` from a file opened with a *file dialog*.

Then, instanciate a `QeegModFileParser` object, feed it with the *buffer* and launch `.parse()` to get the result object:  

```Javascript
var myEegParser = new qeegmodfileparser.QeegModFileParser();
myEegParser.setRawData( arrayBuffer );
var qeegData = myEegParser.parse();
console.log( qeegData );
```

## The interpreter
Because the `parser` outputs data that are not easily readable, `QeegModFile` comes with an interpreter that takes the output of `QeegModFileParser` as input. See `QeegModFileInterpreter` as a helper to do the query work for you.  

```Javascript
// ... instanciating a parser ...
...

// instanciating the interpreter
var interpreter = new qeegmodfileparser.QeegModFileInterpreter( qeegData );

// starting to query data
var type = interpreter.getType();
var typeCode = interpreter.getTypeCode();
var numberOfDimensionsUsed = interpreter.getNumberOfDimensionsUsed();
var dimensionSizes = interpreter.getDimensionSizes();
var dimensionsLabels = interpreter.getAllDimensionsLabel();
var startFrequency = interpreter.getStartFrequency();
var frequencyResolution = interpreter.getFrequencyResolution();
var scaleFactor = interpreter.getScaleFactor();

```
