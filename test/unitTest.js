/// <reference path="../towerdefense.ts" />
/// <reference path="qunit.d.ts" />
var DEBUG = true;
Game.viewport = document.getElementById('viewport');
Game.level = new Level([
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
], [{ col: -1, ln: 1 }, { col: 20, ln: 1 }], 20, 13);
Game.level.draw();
QUnit.test('Attacker.constructor', function (assert) {
    var path = [{ col: -1, ln: 1 }, { col: 10, ln: 1 }];
    var att = new Attacker(path, 44);
    var begin = cellCenter(path[0]);
    var end = cellCenter(path[1]);
    assert.ok(att.position.x === begin.x && att.position.y === begin.y && att.path.equals(path) && att.hp === 44 && att.speed === 1 && att.hitboxRadius === 10 && att.waypoint === 1 && att.distWp === distance(begin, end) && att.state === 'alive', 'Passed!');
});
QUnit.test('Attacker.move1', function (assert) {
    var path = [{ col: -1, ln: 1 }, { col: 10, ln: 1 }];
    var att = new Attacker(path, 44, 250);
    var begin = cellCenter(path[0]);
    var end = cellCenter(path[1]);
    att.move();
    assert.ok(att.position.x === begin.x + att.speed && att.position.y === begin.y && att.speed === 5 && att.waypoint === 1 && att.distWp === distance(begin, end) - att.speed && att.state === 'alive', 'Passed!');
});
QUnit.test('Attacker.move2', function (assert) {
    var path = [{ col: 2, ln: 1 }, { col: 3, ln: 1 }, { col: 10, ln: 1 }];
    var att = new Attacker(path, 44, 2500);
    var p0 = cellCenter(path[0]);
    var p1 = cellCenter(path[1]);
    var p2 = cellCenter(path[2]);
    att.move();
    assert.ok(att.position.x === p0.x + att.speed && att.position.y === p0.y && att.speed === 50 && att.waypoint === 2 && att.distWp === distance(p1, p2) - (att.speed - distance(p0, p1)) && att.state === 'alive', 'Passed!');
});
QUnit.test('Attacker.movePassed', function (assert) {
    var path = [{ col: 9, ln: 1 }, { col: 10, ln: 1 }];
    var att = new Attacker(path, 100, 2500);
    var begin = cellCenter(path[0]);
    var end = cellCenter(path[1]);
    att.draw();
    att.move();
    assert.ok(att.position.x === end.x && att.position.y === end.y && att.speed === 50 && att.waypoint === 2 && att.distWp === 0 && att.state === 'passed', 'Passed!');
});
QUnit.test('Attacker.hitAlive', function (assert) {
    var path = [{ col: -1, ln: 1 }, { col: 10, ln: 1 }];
    var att = new Attacker(path, 100, 50);
    att.draw();
    att.hit(50);
    Game.level.shape.removeChild(att.shape);
    assert.ok(att.hp === 50 && att.state === 'alive', 'Passed!');
});
QUnit.test('Attacker.hitDead', function (assert) {
    var path = [{ col: -1, ln: 1 }, { col: 10, ln: 1 }];
    var att = new Attacker(path, 100, 50);
    att.draw();
    att.hit(150);
    assert.ok(att.hp === -50 && att.state === 'dead', 'Passed!');
});
QUnit.test('Attacker.hitDead.destroyBullets', function (assert) {
    var path = [{ col: 5, ln: 1 }, { col: 10, ln: 1 }];
    var att = new Attacker(path, 100, 50);
    var bullet = new Bullet(5.5 * Tile.shapeSize, 2.5 * Tile.shapeSize, att);
    att.draw();
    bullet.draw();
    bullet.move();
    att.hit(150);
    bullet.move();
    assert.ok(att.hp === -50 && att.state === 'dead' && bullet.state === 'dead', 'Passed!');
});
QUnit.test('Defender.constructor', function (assert) {
    var def = new Defender(5, 2, 20, 50, 1);
    assert.ok(def.position.x === 5.5 * Tile.shapeSize && def.position.y === 2.5 * Tile.shapeSize && def.damage === 20 && def.range === 50 && def.rate === 1 * 100 / Game.fps && def.state === 'ready', 'Passed!');
});
QUnit.test('Defender.shoot', function (assert) {
    var path = [{ col: 5, ln: 1 }, { col: 10, ln: 1 }];
    var att = new Attacker(path, 100, 50);
    var def = new Defender(5, 2, 20, 50, 1);
    def.draw();
    var bullet = def.shoot(att);
    Game.level.shape.removeChild(def.shape);
    Game.level.shape.removeChild(bullet.shape);
    assert.ok(def.state === 'cooldown' && bullet.position.x === def.position.x && bullet.position.y === def.position.y && bullet.target.id === att.id && bullet.state === 'alive' && bullet.speed === 2 && bullet.damage === 20 && bullet.distTg === distance(bullet.position, att.position), 'Passed!');
});
QUnit.test('Defender.aimOk1', function (assert) {
    var path = [{ col: 5, ln: 1 }, { col: 10, ln: 1 }];
    var att = new Attacker(path, 100, 50);
    var def = new Defender(5, 2, 20, 50, 1);
    def.draw();
    Game.bullets = [];
    Game.atks = [att];
    def.aim();
    var bullet = Game.bullets[0];
    Game.level.shape.removeChild(def.shape);
    Game.level.shape.removeChild(bullet.shape);
    assert.ok(def.state === 'cooldown' && bullet && bullet.position.x === def.position.x && bullet.position.y === def.position.y && bullet.target && bullet.target.id === att.id && bullet.state === 'alive' && bullet.speed === 2 && bullet.damage === 20 && bullet.distTg === distance(bullet.position, att.position), 'Passed!');
});
QUnit.test('Bullet.constructor', function (assert) {
    var path = [{ col: 5, ln: 1 }, { col: 10, ln: 1 }];
    var att = new Attacker(path, 100, 50);
    var bullet = new Bullet(5.5 * Tile.shapeSize, 2.5 * Tile.shapeSize, att, 100, 20);
    assert.ok(bullet.position.x === 5.5 * Tile.shapeSize && bullet.position.y === 2.5 * Tile.shapeSize && bullet.target && bullet.target.id === att.id && bullet.speed === 100 / Game.fps && bullet.damage === 20 && bullet.distTg === distance(bullet.position, att.position) && bullet.state === 'alive', 'Passed!');
});
QUnit.test('Bullet.move', function (assert) {
    var path = [{ col: 5, ln: 1 }, { col: 10, ln: 1 }];
    var begin = cellCenter(path[0]);
    var att = new Attacker(path, 100, 50);
    var bullet = new Bullet(5.5 * Tile.shapeSize, 2.5 * Tile.shapeSize, att, 100, 20);
    bullet.move();
    assert.ok(bullet.position.x === begin.x && bullet.position.y === 2.5 * Tile.shapeSize - bullet.speed && bullet.speed === 100 / Game.fps && bullet.distTg === distance(att.position, bullet.position) && bullet.state === 'alive' && att.hp === 100, 'Passed!');
});
QUnit.test('Bullet.moveHit', function (assert) {
    var path = [{ col: 5, ln: 1 }, { col: 10, ln: 1 }];
    var begin = cellCenter(path[0]);
    var att = new Attacker(path, 100, 50);
    var bullet = new Bullet(5.5 * Tile.shapeSize, 1.5 * Tile.shapeSize + 2, att, 100, 20);
    bullet.draw();
    bullet.move();
    assert.ok(bullet.state === 'dead' && att.hp === 80, 'Passed!');
});
/**
 * Attach the .equals method to Array's prototype to call it on any array
 */
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
};
//# sourceMappingURL=unitTest.js.map