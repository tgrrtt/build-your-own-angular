/* jshint globalstrict: true */
/* global angular: false */
'use strict';

function createInjector(modulesToLoad) {
  var cache = {};
  var loadedModules = {};
  var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
  var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
  var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;
  var $provide = {
    constant: function(key, value) {
      // prevent overriding hasOwnProperty
      if (key === 'hasOwnProperty') {
        throw 'hasOwnProperty is not a valid constant name!';
      }
      cache[key] = value;
    }
  };
  // invoke function by looking up items in $inject from the cache
  function invoke(fn, self, locals) {
    var args = _.map(fn.$inject, function(token) {
      if(_.isString(token)) {
        return locals && locals.hasOwnProperty(token) ?
          locals[token] :
          cache[token];
      } else {
        throw 'Incorrect injection token! Expected a string, got ' + (typeof token);
      }
    });
    return fn.apply(self, args);
  }

  function annotate(fn) {
    if (_.isArray(fn)) {
      return fn.slice(0, fn.length - 1);
    } else if (fn.$inject) {
      return fn.$inject;
    } else if (!fn.length) {
      return [];
    } else {
      var source = fn.toString().replace(STRIP_COMMENTS, '');
      var argDeclaration = source.match(FN_ARGS);
      return _.map(argDeclaration[1].split(','), function(argName) {
        return argName.match(FN_ARG)[2];
      });
    }
  }

  // iterate through all modules and store what its supposed to do in the cache
  _.forEach(modulesToLoad, function loadModule(moduleName) {
    var module = angular.module(moduleName);
    if (!loadedModules.hasOwnProperty(moduleName)) {
     loadedModules[moduleName] = true; 
      _.forEach(module.requires, loadModule);
      _.forEach(module._invokeQueue, function(invokeArgs) {
        var method = invokeArgs[0];
        var args = invokeArgs[1];
        $provide[method].apply($provide, args);
      });
    }
  });
  
  return {
    has: function(key) {
      return cache.hasOwnProperty(key);
    },
    get: function(key) {
      return cache[key];
    },
    invoke: invoke,
    annotate: annotate
  };
}