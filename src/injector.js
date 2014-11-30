/* jshint globalstrict: true */
/* global angular: false */
'use strict';

function createInjector(modulesToLoad) {
  var providerCache = {};
  var instanceCache = {};
  var loadedModules = {};
  var path = [];
  // used to parse out params from the function 
  var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
  // used to strip whitespace from stripped args
  var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
  var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;
  var INSTANTIATING = { };
  // stores key value pairs in the cashe
  // all this stuff comes from the module's invokeQueue
  var $provide = {
    constant: function(key, value) {
      // prevent overriding hasOwnProperty
      if (key === 'hasOwnProperty') {
        throw 'hasOwnProperty is not a valid constant name!';
      }
      instanceCache[key] = value;
    },
    provider: function(key, provider) {
      // invokes the provider $get, so it gets annotated as well
      // note that provider becomes the 'this'
      providerCache[key + 'Provider'] = provider; 
    }
  };

  // gets things from the cache for us
  // if its a provider, it will invoke it, and return what that function returns
  // this means that if we never get it, or ask for it in another module, it wont get instantiated 
  function getService(name) {
    if (instanceCache.hasOwnProperty(name)) {
      if (instanceCache[name] === INSTANTIATING) {
        throw new Error('Circular dependency found: ' +
          name + ' <- ' + path.join(' <- '));
      }
      return instanceCache[name];
    } else if (providerCache.hasOwnProperty(name + 'Provider')) {
      path.unshift(name);
      instanceCache[name] = INSTANTIATING;
      // this whole try finally block lets us delete INSTANTIATING on a failed instantiation
      // this makes it so next time we try it doesnt still think its in a circular dep loop
      try {
        var provider = providerCache[name + 'Provider'];
        // note: original versino does not provide provider as self (2nd argument)
        // pg 366
        var instance = instanceCache[name] = invoke(provider.$get, provider);
        return instance;
      } finally {
        path.shift();
        // basically reset intanceCache to not be INSTANTIATING on failure
        if (instanceCache[name] === INSTANTIATING) {
          delete instanceCache[name];
        }
      }
    }
  }
  // invoke function by looking up items in $inject from the cache
  function invoke(fn, self, locals) {
    // get the arguments for the fn by calling annotate.
    // which then looks up those args as keys in the cache
    // and returns those key's values as an array
    // this new array is whats actually used as the arguments when we apply the fn
    var args = _.map(annotate(fn), function(token) {
      if(_.isString(token)) {
        // this lets us override the cache value with a value of our own
        return locals && locals.hasOwnProperty(token) ?
          locals[token] :
          getService(token);
      } else {
        throw 'Incorrect injection token! Expected a string, got ' + (typeof token);
      }
    });
    // we need to do this because the fn is stored as the last value in the array 
    if (_.isArray(fn)) {
      fn = _.last(fn);
    }
    return fn.apply(self, args);
  }

  function annotate(fn) {
    // if array style annotation
    if (_.isArray(fn)) {
      return fn.slice(0, fn.length - 1);
    // if already in an array w/o fn at the end aka $inject
    } else if (fn.$inject) {
      return fn.$inject;
    } else if (!fn.length) {
      return [];
    // so we can annotate plain function definitions
    } else {
      var source = fn.toString().replace(STRIP_COMMENTS, '');
      var argDeclaration = source.match(FN_ARGS);
      return _.map(argDeclaration[1].split(','), function(argName) {
        return argName.match(FN_ARG)[2];
      });
    }
  }

  function instantiate(Type, locals) {
    var UnwrappedType = _.isArray(Type) ? _.last(Type) : Type;
    // create a new object that inherits from the Type prototype
    // this new object is then used as the 'base' when Type gets applied to it. 
    var instance = Object.create(UnwrappedType.prototype);
    invoke(Type, instance, locals);
    return instance;
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
      return instanceCache.hasOwnProperty(key) ||
        providerCache.hasOwnProperty(key + 'Provider');
    },
    get: getService,
    invoke: invoke,
    annotate: annotate,
    instantiate: instantiate
  };
}
