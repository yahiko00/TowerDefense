/// <reference path="../towerdefense.ts" />
/// <reference path="qunit.d.ts" />

QUnit.test('Attacker.constructor', function (assert) {
  var path = [{ x: -1, y: 1 }, { x: 10, y: 1 }];
  var att = new Attacker(path, 44);

  assert.ok(
    /*att.id === 'att.0' &&*/
    att.position.x === -1 &&
    att.position.y === 1 &&
    att.path.equals(path) &&
    att.hp === 44 &&
    att.speed === 1 &&
    att.hitboxRadius === 5 &&
    att.waypoint === 1 &&
    att.distWp === 11
    , 'Passed!');
});

QUnit.test('Attacker.move1', function (assert) {
  var path = [{ x: -1, y: 1 }, { x: 10, y: 1 }];
  var att = new Attacker(path, 44, 5);
  att.move();

  assert.ok(
    att.position.x === 4 &&
    att.position.y === 1 &&
    att.speed === 5 &&
    att.waypoint === 1 &&
    att.distWp === 6
    , 'Passed!');
});

QUnit.test('Attacker.move2', function (assert) {
  var path = [{ x: -1, y: 1 }, { x: 3, y: 1 }, { x: 10, y: 1 }];
  var att = new Attacker(path, 44, 5);
  att.move();

  console.log(att);

  assert.ok(
    att.position.x === 4 &&
    att.position.y === 1 &&
    att.speed === 5 &&
    att.waypoint === 2 &&
    att.distWp === 6
    , 'Passed!');
});

interface Array<T> {
  equals(array: Array<T>): boolean;
}

// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
  // if the other array is a falsy value, return
  if (!array)
    return false;

  // compare lengths - can save a lot of time 
  if (this.length != array.length)
    return false;

  for (var i = 0, l = this.length; i < l; i++) {
    // Check if we have nested arrays
    if (this[i] instanceof Array && array[i] instanceof Array) {
      // recurse into the nested arrays
      if (!this[i].equals(array[i]))
        return false;
    }
    else if (this[i] != array[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false;
    }
  }
  return true;
}   