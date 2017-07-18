
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
    }
    
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
    
    var offset = this._getOffset( measureIndex, durationIndex, firstSpaceIndex, secondSpaceIndex )
    
    return this._qeegModObj.data[ offset ];
  }
  
  
  /**
  * Get an array of values
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
  
  
  getSpectrumByName( measureName = -1, durationName = -1, firstSpaceName = -1 ){
    // TODO
  }
  
  /**
  * Return the labels of a given spectrum as a hierarchical cascade.
  */
  getSpectrumLabels( measureIndex = -1, durationIndex = -1, firstSpaceIndex = -1 ){
    var sizes = this._qeegModObj.metadata.sizes;
    var info = this._qeegModObj.metadata.informationList;
    var arrayOfLabels = []
    
    // get the whole data labels
    if( measureIndex == -1 && 
        durationIndex == -1 &&
        firstSpaceIndex == -1 )
    {
      if( info[0].labels )
        arrayOfLabels.push( info[0].labels.slice() )
        
      if( info[1].labels )
        arrayOfLabels.push( info[1].labels.slice() )
        
      if( info[2].labels )  
        arrayOfLabels.push( info[2].labels.slice() )
        
      if( info[3].labels )
        arrayOfLabels.push( info[3].labels.slice() )
        
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
        arrayOfLabels.push( info[0].labels[ measureIndex ] )
      
      if( info[1].labels )
        arrayOfLabels.push( info[1].labels.slice() )
        
      if( info[2].labels )  
        arrayOfLabels.push( info[2].labels.slice() )
        
      if( info[3].labels )
        arrayOfLabels.push( info[3].labels.slice() )
      
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
        arrayOfLabels.push( info[0].labels[ measureIndex ] )
        
      if( info[1].labels &&  info[1].labels.length > durationIndex )
        arrayOfLabels.push( info[1].labels[ durationIndex ] )
      
      if( info[2].labels )  
        arrayOfLabels.push( info[2].labels.slice() )
        
      if( info[3].labels )
        arrayOfLabels.push( info[3].labels.slice() )
      
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
        arrayOfLabels.push( info[0].labels[ measureIndex ] )
        
      if( info[1].labels &&  info[1].labels.length > durationIndex )
        arrayOfLabels.push( info[1].labels[ durationIndex ] )
      
      if( info[2].labels &&  info[2].labels.length > firstSpaceIndex )
        arrayOfLabels.push( info[2].labels[ firstSpaceIndex ] )
        
      if( info[3].labels )
        arrayOfLabels.push( info[3].labels.slice() )
        
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

export { QeegModFileInterpreter }
