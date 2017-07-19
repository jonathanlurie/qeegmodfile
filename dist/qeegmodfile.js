(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.qeegmodfile = global.qeegmodfile || {})));
}(this, (function (exports) { 'use strict';

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
* License   MIT
* Link      https://github.com/jonathanlurie/es6module
* Lab       MCIN - http://mcin.ca/ - Montreal Neurological Institute
*/


/**
* An instance of QeegModFileParser can be used to parse several file
* (you don't need to create a QeegModFileParser instance per file to parse).
* The Qeeg MOD file usually have the .MOD extension, though this parser does not
* need the filename or the extension.
*
*/
class QeegModFileParser {
  constructor(){
    this._rawData = null;
  }
  
  /**
  * Feed the parser with raw data to be parsed
  * @param {ArrayBuffer} data - the raw data
  */
  setRawData( data ){
    this._rawData = data;
  }
  
  
  /**
  * Launch the parsing of the ArrayBuffer that was given with the method setRawData
  * @return {Object} - the MOD file data in a readable format
  */
  parse(){
    var qeegData = null;
    try{
      qeegData = this._parseNoException();
    }catch(e){
      //console.error( e );
      console.warn("This file is not compatible.");
    }
    
    return qeegData;
  }
  
  
  /**
  * [PRIVATE]
  * This method parses the data without caring of potential exception to be raised,
  * it does not handle them. Thus, this method is unsafe to use as is and should
  * no be used directly.
  * @return {Object} - the MOD file data in a readable format
  */
  _parseNoException(){
    if( !this._rawData ){
      console.warn("The input buffer is null. Nothing to be parsed here.");
      return null;
    }
    
    var inputBuffer = this._rawData;
    
    var view = new DataView( inputBuffer );
    var littleEndian = true;
    
    // ------------- DECODING HEADER -------------------
    
    var header = {};
    
    // Protection Mask
    // Offset: 0, length: 2
    header.protectionMask = view.getUint16(0, littleEndian);
    
    // Comment (first byte is the real length)
    // Offset: 2, length: 81
    var commentRealLength = view.getUint8(2);
    var commentBytes = new Uint8Array(inputBuffer, 3, commentRealLength);
    header.comment = String.fromCharCode.apply(String, commentBytes);
    
    // Measure (M) Size
    // Offset: 83, length: 2
    header.measureSize = view.getUint16(83, littleEndian);
    
    // Duration (D) Size
    // Offset: 85, length: 2
    header.durationSize = view.getUint16(85, littleEndian);
    
    // First space (F) Size
    // Offset: 87, length: 2
    header.firstSpaceSize = view.getUint16(87, littleEndian);
    
    // Second space (S) Size
    // Offset: 89, length: 2
    header.secondSpaceSize = view.getUint16(89, littleEndian);
    
    // Reserved bytes
    // Offset: 91, length: 2
    header.reservedBytes = view.getUint16(91, littleEndian);
    
    // Data size
    // Offset: 93, length: 2
    header.dataSize = view.getUint16(93, littleEndian);
    
    // ------------- DECODING MATRIX -------------------
    var matrixOffset = 95;
    
    var matrixSizeElements =  header.measureSize * 
                              header.durationSize * 
                              header.firstSpaceSize * 
                              header.secondSpaceSize;
                              
    var matrixSizeBytes = matrixSizeElements * header.dataSize;
                          
    var matrixData = new Float32Array(matrixSizeElements);
    
    for(var i=0; i<matrixSizeElements; i++){
      matrixData[i] = view.getFloat32(matrixOffset + i * header.dataSize, littleEndian); 
    }
    
    // ------------- DECODING RESERVED BYTE SECTION -------------------
    var reservedBytesSectionOffset = matrixOffset + matrixSizeBytes;
    // we dont care about this section - we wont use it
    
    // ------------- DECODING INFO SECTION -------------------
    // This info section is lways corrupted - we wont use it
    var infoSectionOffset = reservedBytesSectionOffset + header.reservedBytes;
    var infoRealLength = view.getUint8(infoSectionOffset);
    var infoBytes = new Uint8Array(inputBuffer, infoSectionOffset+1, infoRealLength);
    var info = String.fromCharCode.apply(String, infoBytes);
    
    // ------------- DECODING HEADER OF LIST SECTION -------------------
    var headerOfListOffset = infoSectionOffset + 9;
    
    var listSize = 8;
    var offsetByteSize = 4;
    var totalByteSize = 2;
    var headerOfList = new Array(listSize);
    
    for(var i=0; i<listSize; i++){
      var record = {
        // !! IMPORTANT !! there is a known BUG in the offset value
        //offset: view.getInt16(headerOfListOffset + i * (offsetByteSize+totalByteSize), littleEndian),
        total: view.getUint16(headerOfListOffset + i * (offsetByteSize+totalByteSize) + offsetByteSize, littleEndian),
        labels: null
      };
      headerOfList[i] = record;
    }
    
    headerOfList[0].description = "list of labels for measure dimension";
    headerOfList[1].description = "list of labels for duration dimension";
    headerOfList[2].description = "list of labels for first space dimension";
    headerOfList[3].description = "list of labels for second space dimension";
    headerOfList[4].description = "list of scales";
    headerOfList[5].description = "list of units";
    headerOfList[6].description = "list of transformations";
    headerOfList[7].description = "list of contexts";
    
    var infoSection2Offset = headerOfListOffset + 48;
    var localOffset = infoSection2Offset;

    // list 1 to 6 (0 to 5 on out 0-indexed array)
    for(var i=0; i<headerOfList.length - 2; i++){
      var nbOfElem = headerOfList[i].total;
      
      headerOfList[i].labels = nbOfElem ? new Array( nbOfElem ).fill("") : 0;
      
      for(var j=0; j<nbOfElem; j++){
        var strByteLength = view.getUint8(localOffset);
        
        if( strByteLength ){
          var strBytes = new Uint8Array(inputBuffer, localOffset+1, strByteLength );
          //var str = String.fromCharCode.apply(String, strBytes);
          var str = String.fromCharCode(...strBytes);
          // some ASCII charcode are wrong, hopefully always in the same way
          headerOfList[i].labels[j] = str.replace("æ", "µ").replace("ý", "²"); 
        }
        
        localOffset += strByteLength + 1;
      }
      
    }

    // particular case for list 7 (6 on our 0-indexed array) -- the transformations
    // the total value is not the length but the actual value to consider
    var transformation = view.getUint8(localOffset);
    headerOfList[6].labels = transformation;
    localOffset += headerOfList[6].total*(transformation + 1);
    
    // ------------- DECODING THE LIST OF CONTEXT -------------------
    
    // parsing the list of contexts
    var listOfContexts = headerOfList[ headerOfList.length - 1];
    listOfContexts.contextsByteLength = new Array( listOfContexts.total );
    listOfContexts.types = new Array( listOfContexts.total );
    listOfContexts.values = new Array( listOfContexts.total );
    
    const regexTypeDetection = /[a-zA-Z ]*\:{1}([a-zA-Z]*)[\[]?\d*[\]]?/;
    
    listOfContexts.labels = new Array( listOfContexts.total ).fill("");
    
    for(var iCtx=0; iCtx<listOfContexts.total; iCtx++){
      var strByteLength = view.getUint8(localOffset);
      var strBytes = new Uint8Array(inputBuffer, localOffset+1, strByteLength );
      var str = String.fromCharCode.apply(String, strBytes);
      listOfContexts.labels[iCtx] = str.split(":")[0];
      listOfContexts.contextsByteLength[iCtx] = view.getUint16(localOffset + strByteLength + 1, littleEndian);
      
      var typeMatch = regexTypeDetection.exec( str );
      if(typeMatch){
        listOfContexts.types[iCtx] = typeMatch[1].toLowerCase();
      }else{
        listOfContexts.types[iCtx] = null;
      }
      
      localOffset += strByteLength + 3;
    }
    
    // getting the values for the contexts
    for(var iCtx=0; iCtx<listOfContexts.total; iCtx++){
      var value = null;
      if( listOfContexts.types[iCtx] === "single" ){
        // single precision floats are on 4 bytes
        value = view.getFloat32(localOffset, littleEndian);
        
      }else if(listOfContexts.types[iCtx] === "boolean"){
        value = new Array(listOfContexts.contextsByteLength[iCtx]);
        for(var b=0; b<value.length; b++){
          value[b] = !!view.getUint8(localOffset + b);
        }
        
      }else if(listOfContexts.types[iCtx] === "string"){
        var strByteLength = view.getUint8(localOffset);
        var strBytes = new Uint8Array(inputBuffer, localOffset+1, strByteLength );
        value = String.fromCharCode.apply(String, strBytes);
      }
      
      localOffset += listOfContexts.contextsByteLength[iCtx];
      listOfContexts.values[ iCtx ] = value;
    }
    
    // ------------- CLEANING HEADER OF LIST -------------------
    
    for(var i=0; i<headerOfList.length; i++){
      delete headerOfList[i].total;
    }
    
    delete headerOfList[7].contextsByteLength;
    delete headerOfList[7].types;
    
    var modEeg = {
      metadata: {
        comment: header.comment,
        sizes: {
          measure: header.measureSize,
          duration: header.durationSize,
          firstSpace: header.firstSpaceSize,
          secondSpace: header.secondSpaceSize,
        },
        informationList: headerOfList
      },
      
      data: matrixData
    };
    
    return modEeg;
  }
  
  
} /* END of QeegModFileParser */

class QeegModFileInterpreter {
  
  constructor( qeegModObj = null ){
    this._qeegModObj = null;
    this._typeCode = null;
    
    this._typeCodeMap = {
      "Z Electrical Tomography for Cortex and Basal Ganglia": "ZETCBG",
      "Z Electrical Tomography for Cortex": "ZETC",
      "Z Cross Spectrum": "ZCROSS",
      "Z Broad Band": "ZBBSP",
      "Phase": "PHA",
      "Electrical Tomography for Cortex and Basal Ganglia": "ETCBG",
      "Electrical Tomography for Cortex": "ETC",
      "Cross Spectrum": "CROSS",
      "Correlation": "COR",
      "Coherence": "COH",
      "Broad Band": "BBSP",
      // "Raw Electrical Tomography Individual": "ET" // no file of this type to check if it's the correct string
    };
    
    this.setQeegModObj( qeegModObj );
  }
  
  
  /**
  * [PRIVATE]
  * find the typecode by correspondance with the `comment` metadata
  */
  _defineTypeCode(){
    var type = this.getType();
    
    if( type in this._typeCodeMap ){
      this._typeCode = this._typeCodeMap[ type ];
    }
  }
  
  
  /**
  * In case the qeeg MOD object from the parser is not set in the constructor, it can be set here.
  * @param {Object} qeegModObj - output of a QeegModFileParser instance
  */
  setQeegModObj( qeegModObj = null ){
    if( !qeegModObj )
      return;
      
    this._qeegModObj = qeegModObj;
    this._defineTypeCode();
  }
  
  
  /**
  * Get the qeeg type from the object comment
  * @return {String} the type
  */
  getType(){
    return this._qeegModObj.metadata.comment;
  }
  
  
  /**
  * Get the type code of the data. Can be 'CROSS', 'ZCROSS', 'BBSP', 'ZBBSP',
  * 'ETC', 'ZETC', 'ETCBG', 'ZETCBG', 'ET', 'COR', 'COH', 'PHA'
  * @return {string} the type code or null if it was impossible to determine
  */
  getTypeCode(){
    return this._typeCode;
  }
  
  
  /**
  * Get all the measure labels
  * @return {Array} array of strings
  */
  getMeasureLabels(){
    return this._qeegModObj.metadata.informationList[0].labels;
  }
  
  
  /**
  * Get all the duration labels
  * @return {Array} array of strings
  */
  getDurationsLabels(){
    return this._qeegModObj.metadata.informationList[1].labels;
  }
  
  
  /**
  * Get all the first-space labels
  * @return {Array} array of strings
  */
  getFirstSpacelabels(){
    return this._qeegModObj.metadata.informationList[2].labels;
  }
  
  
  /**
  * Get all the second-space labels
  * @return {Array} array of strings
  */
  getSecondSpacelabels(){
    return this._qeegModObj.metadata.informationList[3].labels;
  }
  
  
  /**
  * Get all the unit labels
  * @return {Array} array of strings
  */
  getUnitsLabels(){
    return this._qeegModObj.metadata.informationList[5].labels;
  }
  
  
  /**
  * Get the size of the measure dimension
  * @return {Number} the size
  */
  getMeasureSize(){
    return this._qeegModObj.metadata.sizes.measure;
  }
  
  
  /**
  * Get the size of the duration dimension
  * Note: the name "duration" is missleading, take it as a sort of measure,
  *       aka. just another dimension
  * @return {Number} the size
  */
  getDurationSize(){
    return this._qeegModObj.metadata.sizes.duration;
  }
  
  
  /**
  * Get the size of the first-space dimension
  * @return {Number} the size
  */
  getFirstSpaceSize(){
    return this._qeegModObj.metadata.sizes.firstSpace;
  }
  
  
  /**
  * Get the size of the second-space dimension
  * @return {Number} the size
  */
  getSecondSpaceSize(){
    return this._qeegModObj.metadata.sizes.secondSpace;
  }
  
  
  /**
  * Get the size of the dimensions, in the order of varying speed
  * (the last varies faster)
  * @return {Array} the dimensions
  */
  getDimensionSizes(){
    return [
      this._qeegModObj.metadata.sizes.measure,
      this._qeegModObj.metadata.sizes.duration,
      this._qeegModObj.metadata.sizes.firstSpace,
      this._qeegModObj.metadata.sizes.secondSpace
    ]
  }
  
  
  /**
  * Get the number of dimensions actually used in this dataset.
  * Note: the second-space is not used by all files and even the first-space
  * for some other. No matter the number of dimensions used,
  * they are always the first N dim in the sens that they are always the
  * first N slowest varying dim.
  * @return {Number} the 
  */
  getNumberOfDimensionsUsed(){
    var sizes = this.getDimensionSizes();
    
    for(var i=sizes.length-1; i>=0; i--){
      if( sizes[i] > 1){
        return i + 1;
      }
    }
    return 0;
  }
  
  
  /**
  * Get the transformation applied to the data.
  *   0 => no transformation
  *   3 => natural logarithm (log e) 
  */
  getTranformation(){
    return this._qeegModObj.metadata.informationList[6].labels;
  }
  
  
  /**
  * Get a context by its index
  * @param {Number} n - index of the context
  * @return {Object} context object in the form { label: String, value: Number/Array }
  */
  getContext( n ){
    if( n < 0 || n >= this._qeegModObj.metadata.informationList[7].labels.length ){
      console.warn( "The context index is out of range" );
      return null;
    }
    
    return {
      label: this._qeegModObj.metadata.informationList[7].labels[ n ],
      value: this._qeegModObj.metadata.informationList[7].values[ n ],
    }
  }
  
  
  /**
  * get all the context as an array of pairs { label: String, value: Number/Array }
  * @return {Array} the list of contexts
  */
  getAllContexts(){
    var ctx = this._qeegModObj.metadata.informationList[7];
    
    if( ctx.labels.length != ctx.values.length ){
      console.warn("The contexts is corrupted. Inequal amount of values/labels.");
      return null;
    }
    
    var allContexts = [];
    
    for(var i=0; i<ctx.labels.length; i++){
      allContexts.push({
        label: ctx.labels[ i ],
        value: ctx.values[ i ]
      });
    }
    
    return allContexts;
  }
  
  
  /**
  * Get the start Frequency
  * @return {Number} the start frequency as a float
  */
  getStartFrequency(){
    var ctx = this._qeegModObj.metadata.informationList[7];
    return ctx[0].value;
  }
  
  
  /**
  * Get the frequency resolution
  * @return {Number} the resolution as a float
  */
  getFrequencyResolution(){
    var ctx = this._qeegModObj.metadata.informationList[7];
    return ctx[1].value;
  }
  
  
  /**
  * Get the scale factor
  * @return {Number} the factor as a float
  */
  getScaleFactor(){
    var ctx = this._qeegModObj.metadata.informationList[7];
    return ctx[2].value;
  }
  
  
  /**
  * Get an array of boolean informing of the measure has to be scaled with the scale factor
  * @return {Array} the booleans
  */
  getScaleIfScaleMeasures(){
    var ctx = this._qeegModObj.metadata.informationList[7];
    return ctx[3].value;
  }
  
  
  /**
  * Get the actual label for the "measure" dimension
  * @return {String} the label 
  */
  getMeasureLabel(){
    var ctx = this._qeegModObj.metadata.informationList[7];
    return ctx[4].value;
  }
  
  
  /**
  * Get the actual label for the "duration" dimension
  * @return {String} the label 
  */
  getDurationLabel(){
    var ctx = this._qeegModObj.metadata.informationList[7];
    return ctx[5].value;
  }
  
  
  /**
  * Get the actual label for the "first-space" dimension
  * @return {String} the label 
  */
  getFirstSpaceLabel(){
    var ctx = this._qeegModObj.metadata.informationList[7];
    return ctx[6].value;
  }
  
  
  /**
  * Get the actual label for the "second-space" dimension
  * @return {String} the label 
  */
  getSecondSpaceLabel(){
    var ctx = this._qeegModObj.metadata.informationList[7];
    return ctx[7].value;
  }
  
  
  /**
  * Get the actual label for the "second-space" dimension
  * @return {String} the label 
  */
  getSecondSpaceLabel(){
    var ctx = this._qeegModObj.metadata.informationList[7];
    return ctx[7].value;
  }
  
  
  /**
  * Get a single value, given some indexes
  * @param {Number} measureIndex - index among the "measure" dimension
  * @param {Number} durationIndex - index among the "duration" dimension
  * @param {Number} firstSpaceIndex - index among the "first space" dimension
  * @param {Number} secondSpaceIndex - index among the "second space" dimension
  * @return {Number} the value
  */
  getValue( measureIndex, durationIndex, firstSpaceIndex, secondSpaceIndex ){
    var sizes = this._qeegModObj.metadata.sizes;
    
    if( measureIndex < 0 || measureIndex >= sizes.measure ){
      console.warn( "measureIndex is out of range.");
      return null;
    }
    
    if( durationIndex < 0 || durationIndex >= sizes.duration ){
      console.warn( "durationIndex is out of range.");
      return null;
    }
    
    if( firstSpaceIndex < 0 || firstSpaceIndex >= sizes.firstSpace ){
      console.warn( "firstSpaceIndex is out of range.");
      return null;
    }
    
    if( secondSpaceIndex < 0 || secondSpaceIndex >= sizes.secondSpace ){
      console.warn( "secondSpaceIndex is out of range.");
      return null;
    }
    
    var offset = this._getOffset( measureIndex, durationIndex, firstSpaceIndex, secondSpaceIndex );
    return this._qeegModObj.data[ offset ];
  }
  
  
  /**
  * Get an array of values for such measureIndex, durationIndex and firstSpaceIndex.
  * These 3 arguments are optional but the unused ones must be on the right.
  * If using no argument, or only measureIndex, or only measureIndex and durationIndex,
  * then a larger array corresponding o broarder range of data will be returned
  * @param {Number} measureIndex - the  index within the "measure" dimension
  * @param {Number} durationIndex - the  index within the "duration" dimension
  * @param {Number} firstSpaceIndex - the  index within the "first-space" dimension
  * @return {Array} the data, or null
  */
  getSpectrum( measureIndex = -1, durationIndex = -1, firstSpaceIndex = -1){
    var sizes = this._qeegModObj.metadata.sizes;
    var data = this._qeegModObj.data;
    
    // get the whole data
    if( measureIndex == -1 && 
        durationIndex == -1 &&
        firstSpaceIndex == -1 )
    {
      return data.slice();
    }
    
    // get spectrum at a given measureIndex
    if( measureIndex >=0 && measureIndex < sizes.measure &&
        durationIndex == -1 &&
        firstSpaceIndex == -1 )
    {
      var startIndex = this._getOffset( measureIndex, 0, 0, 0 );
      var endIndex = this._getOffset( measureIndex+1, 0, 0, 0 );
      
      return data.slice(startIndex, endIndex);
    }
    
    // get spectrum at a given measureIndex and a durationIndex
    if( measureIndex >=0 && measureIndex < sizes.measure &&
        durationIndex >=0 && durationIndex < sizes.duration &&
        firstSpaceIndex == -1 )
    {
      var startIndex = this._getOffset( measureIndex, durationIndex, 0, 0 );
      var endIndex = this._getOffset( measureIndex, durationIndex+1, 0, 0 );
      
      return data.slice(startIndex, endIndex);
    }
    
    // get spectrum at a given measureIndex, a durationIndex and a firstSpaceIndex
    if( measureIndex >=0 && measureIndex < sizes.measure &&
        durationIndex >=0 && durationIndex < sizes.duration &&
        firstSpaceIndex >= 0 && firstSpaceIndex < sizes.firstSpace )
    {
      var startIndex = this._getOffset( measureIndex, durationIndex, firstSpaceIndex, 0 );
      var endIndex = this._getOffset( measureIndex, durationIndex, firstSpaceIndex+1, 0 );
      
      return data.slice(startIndex, endIndex);
    }
    
    return null;
  }
  
  
  /**
  * Instead of using indexes among each dimension, it can be easier to call values by their names.
  * Does the same as `.getSpectrum()` but uses names instead of indexes.
  * @param {String} measureLabel - the desired label within the 'measure' dimension (optional)
  * @param {String} durationLabel - the desired label within the 'duration' dimension (optional)
  * @param {String} firstSpaceLabel - the desired label within the 'first-space' dimension (optional)
  * @return {Array} matched data, or null if using a non-existing label
  */
  getSpectrumByLabels( measureLabel = null, durationLabel = null, firstSpaceLabel = null ){
    var info = this._qeegModObj.metadata.informationList;
    var measureIndex = info[0].labels.indexOf( measureLabel );
    var durationIndex = info[1].labels.indexOf( durationLabel );
    var firstSpaceIndex = info[2].labels.indexOf( firstSpaceLabel );
    
    if( measureLabel && measureIndex == -1 ){
      console.warn("The measure label " + measureLabel + " could not be found.");
      return null
    }
    
    if( durationLabel && durationIndex == -1 ){
      console.warn("The duration label " + durationLabel + " could not be found.");
      return null
    }
    
    if( firstSpaceLabel && firstSpaceIndex == -1 ){
      console.warn("The first-space label " + firstSpaceLabel + " could not be found.");
      return null
    }
    
    return this.getSpectrum( measureIndex, durationIndex, firstSpaceIndex );
  }
  
  
  /**
  * Get all the labels as a hierarchical cascade. For examples, if you feel
  * the 3 arguments for a dataset that have a second-space dimension of size
  * greater than 1, it will return an array [ "the measure label",
  * "the duration label", "the first space label", ["1st label of 2nd sp"
  * "2nd label of 2nd sp", "3rd label of 2nd sp"]]. Only the last argument
  * (the array) is not already given in argument but this sort of repeat is so
  * that the returned values has all the cascade.
  * @param {String} measureLabel - the desired label within the 'measure' dimension (optional)
  * @param {String} durationLabel - the desired label within the 'duration' dimension (optional)
  * @param {String} firstSpaceLabel - the desired label within the 'first-space' dimension (optional)
  * @return {Array} contains the hierarchical cascade of labels, the last element being an array
  */
  getSpectrumLabelsByLabels( measureLabel = null, durationLabel = null, firstSpaceLabel = null ){
    var info = this._qeegModObj.metadata.informationList;
    var measureIndex = info[0].labels.indexOf( measureLabel );
    var durationIndex = info[1].labels.indexOf( durationLabel );
    var firstSpaceIndex = info[2].labels.indexOf( firstSpaceLabel );
    
    if( measureLabel && measureIndex == -1 ){
      console.warn("The measure label " + measureLabel + " could not be found.");
      return null
    }
    
    if( durationLabel && durationIndex == -1 ){
      console.warn("The duration label " + durationLabel + " could not be found.");
      return null
    }
    
    if( firstSpaceLabel && firstSpaceIndex == -1 ){
      console.warn("The first-space label " + firstSpaceLabel + " could not be found.");
      return null
    }
    
    return this.getSpectrumLabels( measureIndex, durationIndex, firstSpaceIndex );
  }
  
  
  /**
  * Does like getSpectrumLabelsByLabels but uses the indexes among each dimension
  * rather than their labels.
  * @param {Number} measureIndex - the  index within the "measure" dimension
  * @param {Number} durationIndex - the  index within the "duration" dimension
  * @param {Number} firstSpaceIndex - the  index within the "first-space" dimension
  * @return {Array} contains the hierarchical cascade of labels, the last element being an array
  */
  getSpectrumLabels( measureIndex = -1, durationIndex = -1, firstSpaceIndex = -1 ){
    var sizes = this._qeegModObj.metadata.sizes;
    var info = this._qeegModObj.metadata.informationList;
    var arrayOfLabels = [];
    
    // get the whole data labels
    if( measureIndex == -1 && 
        durationIndex == -1 &&
        firstSpaceIndex == -1 )
    {
      if( info[0].labels )
        arrayOfLabels.push( info[0].labels.slice() );
        
      if( info[1].labels )
        arrayOfLabels.push( info[1].labels.slice() );
        
      if( info[2].labels )  
        arrayOfLabels.push( info[2].labels.slice() );
        
      if( info[3].labels )
        arrayOfLabels.push( info[3].labels.slice() );
        
      return arrayOfLabels;
    }
    
    // get spectrum labels starting from a given measureIndex
    if( measureIndex >=0 && measureIndex < sizes.measure &&
        durationIndex == -1 &&
        firstSpaceIndex == -1 )
    {
      var startIndex = this._getOffset( measureIndex, 0, 0, 0 );
      var endIndex = this._getOffset( measureIndex+1, 0, 0, 0 );
      
      if( info[0].labels &&  info[0].labels.length > measureIndex )
        arrayOfLabels.push( info[0].labels[ measureIndex ] );
      
      if( info[1].labels )
        arrayOfLabels.push( info[1].labels.slice() );
        
      if( info[2].labels )  
        arrayOfLabels.push( info[2].labels.slice() );
        
      if( info[3].labels )
        arrayOfLabels.push( info[3].labels.slice() );
      
      return arrayOfLabels;
    }
    
    // get spectrum at a given measureIndex and a durationIndex
    if( measureIndex >=0 && measureIndex < sizes.measure &&
        durationIndex >=0 && durationIndex < sizes.duration &&
        firstSpaceIndex == -1 )
    {
      var startIndex = this._getOffset( measureIndex, durationIndex, 0, 0 );
      var endIndex = this._getOffset( measureIndex, durationIndex+1, 0, 0 );
      
      if( info[0].labels &&  info[0].labels.length > measureIndex )
        arrayOfLabels.push( info[0].labels[ measureIndex ] );
        
      if( info[1].labels &&  info[1].labels.length > durationIndex )
        arrayOfLabels.push( info[1].labels[ durationIndex ] );
      
      if( info[2].labels )  
        arrayOfLabels.push( info[2].labels.slice() );
        
      if( info[3].labels )
        arrayOfLabels.push( info[3].labels.slice() );
      
      return arrayOfLabels;
    }
    
    // get spectrum at a given measureIndex, a durationIndex and a firstSpaceIndex
    if( measureIndex >=0 && measureIndex < sizes.measure &&
        durationIndex >=0 && durationIndex < sizes.duration &&
        firstSpaceIndex >= 0 && firstSpaceIndex < sizes.firstSpace )
    {
      var startIndex = this._getOffset( measureIndex, durationIndex, firstSpaceIndex, 0 );
      var endIndex = this._getOffset( measureIndex, durationIndex, firstSpaceIndex+1, 0 );
      
      if( info[0].labels &&  info[0].labels.length > measureIndex )
        arrayOfLabels.push( info[0].labels[ measureIndex ] );
        
      if( info[1].labels &&  info[1].labels.length > durationIndex )
        arrayOfLabels.push( info[1].labels[ durationIndex ] );
      
      if( info[2].labels &&  info[2].labels.length > firstSpaceIndex )
        arrayOfLabels.push( info[2].labels[ firstSpaceIndex ] );
        
      if( info[3].labels )
        arrayOfLabels.push( info[3].labels.slice() );
        
      return arrayOfLabels;
    }
    
    return null;
  }
  
  
  /**
  * [PRIVATE]
  * Get the offset of the querried data withing the 1D array
  */
  _getOffset( measureIndex, durationIndex, firstSpaceIndex, secondSpaceIndex ){
    var sizes = this._qeegModObj.metadata.sizes;
    return ( measureIndex * sizes.duration * sizes.firstSpace + durationIndex * sizes.firstSpace + firstSpaceIndex ) * sizes.secondSpace + secondSpaceIndex;
  }
  
  
  
  
} /* END of class QeegModFileInterpreter */

exports.QeegModFileParser = QeegModFileParser;
exports.QeegModFileInterpreter = QeegModFileInterpreter;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=qeegmodfile.js.map
