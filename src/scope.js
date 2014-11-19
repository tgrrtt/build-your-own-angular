/* jshint globalstrict: true */
'use strict';

function initWatchVal() {}

function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
}

// Takes a watchFn, which takes the scope and returns a property of that scope
// and a listenerFn (oldVal, newVal, scope)
Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function() {},
    valueEq: !!valueEq,
    last: initWatchVal
  };

  this.$$watchers.push(watcher);
  this.$$lastDirtyWatch = null;
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
    if (!self.$$areEqual(newValue, oldValue, watcher.valueEq)) {
      self.$$lastDirtyWatch = watcher;
      // set it either to a value, or deep copy.
      watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
      watcher.listenerFn(newValue,
        // if the old value is init watch value, return the new value (actual orignal value)
        // this keeps us from sending initWatchVal out of the scope
        (oldValue === initWatchVal ? newValue : oldValue),
        self);
      // set dirty to true so the digest keeps checking it.
      // I think this is the correct chain of events:
      // if the item is initialized, the digest runs once, and sets oldvalue to initialized value
      // it then runs once more because dirty was set to true, but then it sees that the new vaues are the same, and exits
      dirty = true;
    } else if (self.$$lastDirtyWatch === watcher) {
      // exit it out of the loop, and return dirty, which is unefined.
      return false;
    }
  });

  return dirty;
};

// run the digest loop, looping until dirty isnt true, or if over 10 iterations is reached. 
Scope.prototype.$digest = function() {
  var ttl = 10;
  var dirty;
  this.$$lastDirtyWatch = null;
  do {
    dirty = this.$$digestOnce();
    if (dirty && !(ttl--)) {
      throw "10 digest iterations reached";
    }
  } while (dirty);
};

// use this to check equality. If looking for deep equals, it will handle it appropriately.
Scope.prototype.$$areEqual = function(newValue, oldValue, valueEq) {
  if (valueEq) {
    return _.isEqual(newValue, oldValue);
  } else {
    return newValue === oldValue ||
      (typeof newValue === 'number' && typeof oldValue === 'number' &&
        isNaN(newValue) && isNaN(oldValue));
  }
};
