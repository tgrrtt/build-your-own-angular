/* jshint globalstrict: true */
'use strict';

function initWatchVal() {}

function Scope() {
  this.$$watchers = [];
}

// Takes a watchFn, which takes the scope and returns a property of that scope
// and a listenerFn (oldVal, newVal, scope)
Scope.prototype.$watch = function(watchFn, listenerFn) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function() {},
    last: initWatchVal
  };

  this.$$watchers.push(watcher);
};


// digest runs through all watchers
// checks their values, and calls the listenerFn if there are changes, or its the first time run.
Scope.prototype.$$digestOnce = function() {
  var self = this;
  var newValue, oldValue, dirty;

  _.forEach(this.$$watchers, function(watcher) {
    newValue = watcher.watchFn(self);
    oldValue = watcher.last;
    // dirty check
    if (newValue !== oldValue) {
      watcher.last = newValue;
      watcher.listenerFn(newValue,
        // if the old value is init watch value, return the new value (actual orignal value)
        // this keeps us from sending initWatchVal out of the scope
        (oldValue === initWatchVal ? newValue : oldValue),
        self);
      dirty = true;
    }
  });
  return dirty;
};

Scope.prototype.$digest = function() {
  var dirty;
  do {
    dirty = this.$$digestOnce();
  } while (dirty);
};
