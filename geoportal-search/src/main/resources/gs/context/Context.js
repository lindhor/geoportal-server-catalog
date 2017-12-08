/* See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * Esri Inc. licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function(){
  
  gs.context.Context = gs.Object.create(gs.Proto,{
    
    indentXml: {value: function(task,xml) {
      return xml;
    }},
    
    newCounter: {value: function() {
      return gs.Object.create(gs.context.Counter);
    }},
    
    newPromise: {value: function(name) {
      if (typeof name === "string") {
        return gs.Object.create(gs.context.SimplePromise).mixin({name: name});
      }
      return gs.Object.create(gs.context.SimplePromise);
    }},
    
    newPromiseAll: {value: function(promises) {
      return gs.context.SimplePromise.all(promises,this.newCounter());
    }},
    
    newXmlInfo: {value: function(task,xmlString,nsmap) {
      return null;
    }},
    
    newStringBuilder: {value: function() {
      return gs.Object.create(gs.base.StringBuilder).init();
    }},
  
    newXmlBuilder: {value: function(task) {
      return gs.Object.create(gs.base.XmlBuilder).init(this.newStringBuilder());
    }},
  
    readResourceFile: {value: function(path,charset) {
      return null;
    }},
  
    removeAllButFilter: {value: function(xml) {
      return xml;
    }},
  
    sendHttpRequest: {value: function(task,url,data,dataContentType) {
      return null;
    }}
  
  });
  
  gs.context.Counter = gs.Object.create(gs.Proto,{
    count: {writable: true, value: 0},
    
    get: {value: function() {
      return this.count;
    }},
    
    incrementAndGet: {value: function() {
      this.count++;
      return this.count;
    }}
    
  });
  
  /* ============================================================================================== */
  
  gs.context.SimplePromise = gs.Object.create(gs.Proto,{
    
    isSimplePromise: {writable: true, value: true},
    name: {writable: true, value: null},
    
    _callbacks: {writable: true, value: null},
    _errbacks: {writable: true, value: null},
    
    _result: {writable: true, value: null},
    _error: {writable: true, value: null},
    
    _wasResolveCalled: {writable: true, value: false},
    _wasResolved: {writable: true, value: false},
    _wasRejected: {writable: true, value: false},
    _wasFulfilled: {writable: true, value: false},
    
    all: {value: function(promises,counter) {
      var dfds = Array.prototype.slice.call(promises);
      var promise = gs.Object.create(gs.context.SimplePromise);
      var i, results = [];
      
      var num = dfds.length;
      if (num === 0) {
        promise.resolve([]);
        return promise;
      }
      for (i = 0; i < num; i++) results.push(null);
      
      var handle = function(dfd,index) {
        dfd.then(function(result){
          results[index] = result;
          if (counter.incrementAndGet() >= num) {
            if (!promise._wasFulfilled) {
              promise.resolve(results);
            }
          }
        })["catch"](function(ex){
          results[index] = ex;
          console.error("Error",ex); // TODO temporary ?
          if (counter.incrementAndGet() >= num) {
            //promise.reject(ex); //TODO reject?
            if (!promise._wasFulfilled) {
              promise.resolve(results);
            }
          }
        });
      };
     
      for (i = 0; i < num; i++) handle(dfds[i],i);
      return promise;
    }},
    
    "catch": {value: function(errback) {
      if (!this._errbacks) this._errbacks = [];
      this._errbacks.push(errback);
      if (this._wasRejected) {
        errback(this._error);
      }
      //this._checkErrback();
      return this;
    }},
    
    otherwise: {value: function(errback) {
      return this["catch"](errback);
    }},
    
    reject: {value: function(error) {
      if (!this._wasFulfilled) {
        this._wasFulfilled = this._wasRejected = true;
        this._error = error;
        this._checkErrback();
      }
    }},
    
    resolve: {value: function(result) {
      this._wasResolveCalled = true;
      if (!this._wasFulfilled) {
        this._wasFulfilled = this._wasResolved = true;
        this._result = result;
        this._checkCallback(this._result);
      }
    }},
    
    then: {value: function(callback,errback) {
      if (!this._callbacks) this._callbacks = [];
      this._callbacks.push(callback);
      if (errback) this["catch"](errback);
      this._checkCallback(this._result);
      return this;
    }},
    
    _checkCallback: {value: function(result) {
      if (this._wasResolved && this._callbacks && this._callbacks.length > 0) {
        var self = this, callback;
        while (this._callbacks.length > 0) {
          callback = this._callbacks.shift();
          var obj; 
          try {
            obj = callback(result);
          } catch(ex) {
            //console.log("Auto rejecting promise",ex); // TODO
            self._wasResolved = self._wasFulfilled = false; // TODO??
            self.reject(ex);
            break; // TODO flag the stop?
          }
          if (typeof obj !== "undefined" && obj !== self) {
            if (typeof obj === "object" && obj !== null && obj.isSimplePromise) {
              // chain
              //self._result = null;
              self._error = null;
              self._wasResolved = false;
              self._wasRejected = false;
              self._wasFulfilled = false;
              obj.then(function(result2){
                self._wasResolved = self._wasFulfilled = true;
                self._checkCallback(result2)
              })["catch"](function(error2){
                if (obj._wasResolveCalled) {
                  self.resolve(obj._result);  // TODO??
                  //self._wasResolved = self._wasFulfilled = true;
                  //self._checkCallback(obj._result)
                }
              });
              break;
            } else {
              result = obj;
            }
          }
        }
        
      }
    }},
    
    _checkErrback: {value: function() {
      if (this._wasRejected && this._errbacks && this._errbacks.length > 0) {
        var error = this._error;
        this._errbacks.forEach(function(errback){
          errback(error);
        });
      }
    }}
  
  });
  
}());

