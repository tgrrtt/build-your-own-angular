/* jshint globalstrict: true */
'use strict';

function setupModuleLoader(window) {
  // function to ensure that we create an object only once
  var ensure = function(obj, name, factory) {
    return obj[name] || (obj[name] = factory());
  };
  var angular =  ensure(window, 'angular', Object);

  // creates an actual module
  var createModule = function(name, requires, modules) {
    if (name === 'hasOwnProperty') {
      throw 'hasOwnProperty is not a valid module name';
    }

    // allows us to easily invoke module components later,
    // returns moduleInstance so we can chain registrations together
    var invokeLater = function(method) {
      return function() {
        moduleInstance._invokeQueue.push([method, arguments]);
        return moduleInstance;
      };
    };

    var moduleInstance = {
      name: name,
      requires: requires,
      constant: invokeLater('constant'),
      provider: invokeLater('provider'),
      // essentially a task list to be run through when loaded
      _invokeQueue: []
    };
    modules[name] = moduleInstance;
    return moduleInstance;
  };
  var getModule = function(name, modules) {
    if (modules.hasOwnProperty(name)) {
      return modules[name];
    } else {
      throw 'Module' + name + ' is not available!';
    }
  };
  // creates an angular module function
  // this function cannot be overwritten. the modules it creates can be though.
  ensure(angular, 'module', function() {
    // we instantiate modules here, and pass it in
    // it's a private variable that can be accessed by the functions we pass it into
    var modules = {};
    return function(name, requires) {
      // allows get/set pattern
      if (requires) {
        return createModule(name, requires, modules);
      } else {
        return getModule(name, modules);
      }
    };
  });
}
