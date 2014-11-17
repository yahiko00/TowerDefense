// Concepts
// * Attacking units' hit points getting higher and higher
// * Game State: running, stop
/********************************************************
 * Compute Euclidian distance between two 2D-points
 * @param p1 First point
 * @param p2 Second point
 *********************************************************/
function distance(p1, p2) {
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
} // distance
/********************************************************
 * Return the center point of a cell
 * @param cell Cell
 *********************************************************/
function cellCenter(cell) {
    return { x: (cell.col + 0.5) * Tile.shapeSize, y: (cell.ln + 0.5) * Tile.shapeSize };
} // cellCenter
/********************************************************
 * Return the upper left point of a cell
 * @param cell Cell
 *********************************************************/
function cellUpperLeft(cell) {
    return { x: cell.col * Tile.shapeSize, y: cell.ln * Tile.shapeSize };
} // cellUpperLeft
/********************************************************
 * Tile
 *********************************************************/
var Tile = (function () {
    /**
     * Constructor
     * @param col Column coordinate in cells
     * @param ln Line coordinate in cells
     * @param type Type of tile (0: wall, 1: path)
     *********************************************************/
    function Tile(type, col, ln) {
        this.id = 'tile.' + Tile.ID++;
        this.type = type;
        this.col = col;
        this.ln = ln;
        this.position = cellUpperLeft({ col: col, ln: ln });
        this.empty = true;
    } // constructor
    /**
     * Draw tile's shape in DOM
     *********************************************************/
    Tile.prototype.draw = function () {
        var _this = this;
        this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.shape.setAttribute('id', this.id);
        this.shape.setAttribute('x', this.position.x.toString());
        this.shape.setAttribute('y', this.position.y.toString());
        this.shape.setAttribute('width', Tile.shapeSize.toString());
        this.shape.setAttribute('height', Tile.shapeSize.toString());
        switch (this.type) {
            case 0:
                this.shape.setAttribute('class', 'tileWallEmpty');
                this.shape.addEventListener('click', function () {
                    if (Game.state === 'running' && _this.empty && Game.points >= Game.defCost) {
                        // Add a defending unit
                        var defender = new Defender(_this.col, _this.ln);
                        Game.defs.push(defender);
                        defender.draw();
                        _this.empty = false;
                        _this.shape.setAttribute('class', 'tileWallOccupied');
                        Game.points -= Game.defCost;
                    }
                });
                break;
            case 1:
                this.shape.setAttribute('class', 'tilePath');
                break;
            default:
                break;
        }
        Game.level.shape.appendChild(this.shape);
    }; // draw
    /**
     * Update tile within a timeframe
     *********************************************************/
    Tile.prototype.update = function () {
    }; // update
    /**
     * Destroy tile's shape in DOM
     *********************************************************/
    Tile.prototype.destroy = function () {
        this.shape.parentNode.removeChild(this.shape);
    }; // destroy
    Tile.ID = 0;
    Tile.shapeSize = 40; // shape's size
    return Tile;
})(); // Tile
/********************************************************
 * Level
 *********************************************************/
var Level = (function () {
    /**
     * Constructor
     * @param layout Level's layout (0: wall, 1:path)
     * @param path Waypoints
     * @param width Width in cells
     * @param height Height in cells
     *********************************************************/
    function Level(layout, path, width, height) {
        if (width === void 0) { width = 20; }
        if (height === void 0) { height = 13; }
        this.layout = layout;
        this.path = path;
        this.tiles = [];
        for (var i = 0; i < layout.length; i++) {
            var col = layout[i];
            for (var j = 0; j < col.length; j++) {
                var tile = new Tile(col[j], i, j);
                this.tiles.push(tile);
            }
        }
        Level.shapeWidth = width * Tile.shapeSize;
        Level.shapeHeight = height * Tile.shapeSize;
    } // constructor
    /**
     * Draw level's shape in DOM
     *********************************************************/
    Level.prototype.draw = function () {
        this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.shape.setAttribute('id', 'level');
        this.shape.setAttribute('width', Level.shapeWidth.toString());
        this.shape.setAttribute('height', Level.shapeHeight.toString());
        for (var i = 0; i < this.tiles.length; i++) {
            var tile = this.tiles[i];
            tile.draw();
        }
        Game.viewport = this.shape;
    }; // draw
    /**
     * Update level within a timeframe
     *********************************************************/
    Level.prototype.update = function () {
    }; // update
    /**
     * Destroy level's shape in DOM
     *********************************************************/
    Level.prototype.destroy = function () {
        this.shape.parentNode.removeChild(this.shape);
    }; // destroy
    return Level;
})(); // Level
/********************************************************
 * Attacking unit
 *********************************************************/
var Attacker = (function () {
    /**
     * Constructor
     * @param path Set of waypoints
     * @param hp Hit points (100)
     * @param speed Speed in pixels per second (50)
     * @param hitboxRadius Hitbox radius in pixels (10)
     *********************************************************/
    function Attacker(path, hp, speed, hitboxRadius) {
        if (hp === void 0) { hp = 100; }
        if (speed === void 0) { speed = 50; }
        if (hitboxRadius === void 0) { hitboxRadius = 10; }
        this.id = 'atk.' + Attacker.ID++;
        this.state = 'alive';
        this.position = cellCenter(path[0]);
        this.path = path;
        this.hpMax = hp;
        this.hp = hp;
        this.speed = speed / Game.fps; // conversion
        this.hitboxRadius = hitboxRadius;
        this.waypoint = 1;
        this.distWp = distance(this.position, cellCenter(this.path[this.waypoint]));
    } // constructor
    /**
     * Move unit within a timeframe
     *********************************************************/
    Attacker.prototype.move = function () {
        var speed = this.speed;
        var pointWp = cellCenter(this.path[this.waypoint]);
        while (this.distWp - speed <= 0) {
            // Carry over
            speed = speed - this.distWp;
            // Move to next waypoint
            this.position = pointWp;
            this.waypoint++;
            // End of path
            if (this.waypoint > this.path.length - 1) {
                this.distWp = 0;
                this.state = 'passed';
                this.destroy();
                Game.lives -= 1;
                if (Game.lives <= 0) {
                    Game.state = 'stop';
                }
                return;
            }
            var pointWp = cellCenter(this.path[this.waypoint]);
            this.distWp = distance(this.position, pointWp);
        }
        var dx = pointWp.x - this.position.x;
        var dy = pointWp.y - this.position.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var ratio = speed / dist;
        this.position.x += dx * ratio;
        this.position.y += dy * ratio;
        this.distWp = dist - speed;
    }; // move
    /**
     * Inflict damage to unit
     *********************************************************/
    Attacker.prototype.hit = function (damage) {
        this.hp -= damage;
        var ratio = this.hp / this.hpMax;
        if (ratio >= 0.6) {
            this.shape.setAttribute('class', 'attackerHealthy');
        }
        else if (ratio >= 0.3) {
            this.shape.setAttribute('class', 'attackerHurt');
        }
        else if (ratio > 0) {
            this.shape.setAttribute('class', 'attackerCritical');
        }
        else {
            this.state = 'dead';
            this.destroy();
            Game.points += Game.atkGain;
        }
    }; // hit
    /**
     * Draw unit's shape in DOM
     *********************************************************/
    Attacker.prototype.draw = function () {
        this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.shape.setAttribute('class', 'attacker');
        this.shape.setAttribute('id', this.id);
        this.shape.setAttribute('cx', this.position.x.toString());
        this.shape.setAttribute('cy', this.position.y.toString());
        this.shape.setAttribute('r', (Attacker.shapeSize / 2).toString());
        Game.level.shape.appendChild(this.shape);
    }; // draw
    /**
     * Update unit within a timeframe
     *********************************************************/
    Attacker.prototype.update = function () {
        if (this.state === 'alive') {
            this.move();
            this.shape.setAttribute('cx', this.position.x.toString());
            this.shape.setAttribute('cy', this.position.y.toString());
        }
    }; // update
    /**
     * Destroy unit's shape in DOM
     *********************************************************/
    Attacker.prototype.destroy = function () {
        this.shape.parentNode.removeChild(this.shape);
        for (var i = 0; i < Game.atks.length; i++) {
            var atk = Game.atks[i];
            if (atk.id === this.id) {
                Game.atks.splice(i, 1);
                break;
            }
        }
    }; // destroy
    Attacker.ID = 0;
    Attacker.shapeSize = 20; // shape's size
    return Attacker;
})(); // Attacker
/********************************************************
 * Defending unit
 *********************************************************/
var Defender = (function () {
    /**
     * Constructor
     * @param col Column coordinate in cells
     * @param ln Line coordinate in cells
     * @param damage Damage dealt to attacking units in HP (20)
     * @param range Shooting range in pixels (50)
     * @param rate Number of shoots per seconds (1)
     *********************************************************/
    function Defender(col, ln, damage, range, rate) {
        if (damage === void 0) { damage = 20; }
        if (range === void 0) { range = 50; }
        if (rate === void 0) { rate = 1; }
        this.id = 'def.' + Defender.ID++;
        this.state = 'ready';
        this.position = cellCenter({ col: col, ln: ln });
        this.damage = damage;
        this.range = range;
        this.rate = rate * 100 / Game.fps; // conversion
        this.delay = 100 / this.rate;
    } // constructor
    /**
     * Aim at a target among all possible attacking units
     *********************************************************/
    Defender.prototype.aim = function () {
        var maxDist = Number.POSITIVE_INFINITY;
        // Current target is alive and
        // within range: fire!
        if (this.target && this.target.state === 'alive' && distance(this.position, this.target.position) <= this.range) {
            return this.shoot(this.target);
        }
        else {
            this.target = null;
            for (var i = 0; i < Game.atks.length; i++) {
                var atk = Game.atks[i];
                var dist = distance(this.position, atk.position);
                if (dist <= maxDist && atk.state === 'alive' && dist <= this.range) {
                    this.target = atk;
                    maxDist = dist;
                }
            }
            // A new target within range has been found: fire!
            if (this.target) {
                return this.shoot(this.target);
            }
        }
        return null;
    }; // aim
    /**
     * Shoot at a given target emitting a bullet.
     * <br />Defending unit enters in a cooldown state.
     * @param target Attacking unit
     *********************************************************/
    Defender.prototype.shoot = function (target) {
        var bullet = new Bullet(this.position.x, this.position.y, target);
        this.state = 'cooldown';
        Game.bullets.push(bullet);
        bullet.draw();
        return bullet;
    }; // shoot
    /**
     * Decrease the cooldown counter within a timeframe
     *********************************************************/
    Defender.prototype.cooldown = function () {
        this.delay--;
        if (this.delay <= 0) {
            this.state = 'ready';
            this.delay = 100 / this.rate;
        }
    }; // cooldown
    /**
     * Draw unit's shape in DOM
     *********************************************************/
    Defender.prototype.draw = function () {
        this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.shape.setAttribute('class', 'defender');
        this.shape.setAttribute('id', this.id);
        this.shape.setAttribute('x', (this.position.x - Defender.shapeSize / 2).toString());
        this.shape.setAttribute('y', (this.position.y - Defender.shapeSize / 2).toString());
        this.shape.setAttribute('width', Defender.shapeSize.toString());
        this.shape.setAttribute('height', Defender.shapeSize.toString());
        Game.level.shape.appendChild(this.shape);
    }; // draw
    /**
     * Update unit within a timeframe
     *********************************************************/
    Defender.prototype.update = function () {
        switch (this.state) {
            case 'ready':
                this.aim();
                break;
            case 'cooldown':
                this.cooldown();
                break;
            default:
                break;
        }
    }; // update
    /**
     * Destroy unit's shape in DOM
     *********************************************************/
    Defender.prototype.destroy = function () {
        this.shape.parentNode.removeChild(this.shape);
    }; // destroy
    Defender.ID = 0;
    Defender.shapeSize = Tile.shapeSize * 0.75; // shape's size
    return Defender;
})(); // Defender
/********************************************************
 * Bullet shot by defending unit
 *********************************************************/
var Bullet = (function () {
    /**
     * Constructor
     * @param x x center coordinate in pixels
     * @param y y center coordinate in pixels
     * @param target Bullet's target
     * @param speed Pixels per second
     * @param damage Damage dealt to attacking units in HP (20)
     *********************************************************/
    function Bullet(x, y, target, speed, damage) {
        if (speed === void 0) { speed = 100; }
        if (damage === void 0) { damage = 20; }
        this.id = 'bullet.' + Bullet.ID++;
        this.state = 'alive';
        this.position = { x: x, y: y };
        this.target = target;
        this.speed = speed / Game.fps;
        this.damage = damage;
        this.distTg = distance(this.position, this.target.position) - this.target.hitboxRadius;
    } // constructor
    /**
     * Move bullet within a timeframe
     *********************************************************/
    Bullet.prototype.move = function () {
        // target reached
        if (this.distTg - this.speed <= 0 && this.target.state === 'alive') {
            this.state = 'dead';
            this.target.hit(this.damage);
            this.destroy();
            return;
        }
        // target not alive: auto-destruction
        if (this.target.state != 'alive') {
            this.state = 'dead';
            this.destroy();
        }
        var dx = this.target.position.x - this.position.x;
        var dy = this.target.position.y - this.position.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var ratio = this.speed / distance;
        this.position.x += dx * ratio;
        this.position.y += dy * ratio;
        this.distTg = distance - this.speed - this.target.hitboxRadius;
    }; // move
    /**
     * Draw bullet's shape in DOM
     *********************************************************/
    Bullet.prototype.draw = function () {
        this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.shape.setAttribute('class', 'bullet');
        this.shape.setAttribute('id', this.id);
        this.shape.setAttribute('cx', this.position.x.toString());
        this.shape.setAttribute('cy', this.position.y.toString());
        this.shape.setAttribute('r', Bullet.shapeSize.toString());
        Game.level.shape.appendChild(this.shape);
    }; // draw
    /**
     * Update bullet within a timeframe
     *********************************************************/
    Bullet.prototype.update = function () {
        if (this.state === 'alive') {
            this.move();
            this.shape.setAttribute('cx', this.position.x.toString());
            this.shape.setAttribute('cy', this.position.y.toString());
        }
    }; // update
    /**
     * Destroy bullet's shape in DOM
     *********************************************************/
    Bullet.prototype.destroy = function () {
        this.shape.parentNode.removeChild(this.shape);
        for (var i = 0; i < Game.atks.length; i++) {
            var atk = Game.atks[i];
            if (atk.id === this.id) {
                Game.atks.splice(i, 1);
                break;
            }
        }
    }; // destroy
    Bullet.ID = 0;
    Bullet.shapeSize = 3; // shape's size
    return Bullet;
})(); // Bullet
/********************************************************
 * Wave of attacking units (helper class)
 * <br/>All members of this class are static.
 * <br/>This class should NOT be instanciated.
 *********************************************************/
var Wave = (function () {
    function Wave() {
    }
    /**
     * Initialize wave's parameters
     *********************************************************/
    Wave.init = function () {
        Wave.delayIntra *= Game.fps;
        Wave.delayInter *= Game.fps;
        Wave.curAtks = Wave.atks;
        Wave.curDelayIntra = Wave.delayIntra;
        Wave.curDelayInter = Wave.delayInter;
        Wave.curHpIncrease = Wave.hpIncrease;
        Wave.curHp = 100;
    }; // init
    /**
     * Update wave within a timeframe
     *********************************************************/
    Wave.update = function () {
        // Update timer between two attacking units within a wave
        Wave.curDelayIntra -= 1;
        if (Wave.curDelayIntra <= 0) {
            Wave.curDelayIntra = Wave.delayIntra;
            if (Wave.curAtks > 0) {
                var attacker = new Attacker(Game.level.path, Wave.curHp);
                attacker.draw();
                Game.atks.push(attacker);
                Wave.curAtks--;
            }
        }
        // Update timer between waves
        Wave.curDelayInter -= 1;
        if (Wave.curDelayInter <= 0) {
            Wave.curDelayInter = Wave.delayInter;
            Wave.curAtks = Wave.atks;
            Wave.curHp *= Wave.hpIncrease;
        }
    };
    Wave.atks = 6; // number of attacking unit per wave
    Wave.delayIntra = 0.75; // delay in seconds between two attacking unit in a same wave
    Wave.delayInter = 10; // delay in seconds between two waves
    Wave.hpIncrease = 1.05; // Increase coefficient on attacking units' hit points per wave
    return Wave;
})(); // Wave
/********************************************************
 * Status bar display management (helper class)
 * <br/>All members of this class are static.
 * <br/>This class should NOT be instanciated.
 *********************************************************/
var Statusbar = (function () {
    function Statusbar() {
    }
    /**
     * Draw level's shape in DOM
     *********************************************************/
    Statusbar.draw = function () {
        Game.statusbar = document.createElement('div');
        Game.statusbar.setAttribute('id', 'statusbar');
        Statusbar.livesDom = document.createElement('span');
        Statusbar.livesDom.setAttribute('class', 'lives');
        Statusbar.livesDom.innerHTML = 'Lives: ' + Game.lives.toString();
        Game.statusbar.appendChild(Statusbar.livesDom);
        Statusbar.pointsDom = document.createElement('span');
        Statusbar.pointsDom.setAttribute('class', 'points');
        Statusbar.pointsDom.innerHTML = 'Points: ' + Game.points.toString();
        Game.statusbar.appendChild(Statusbar.pointsDom);
        Statusbar.nextWaveDom = document.createElement('span');
        Statusbar.nextWaveDom.setAttribute('class', 'nextWave');
        Statusbar.nextWaveDom.innerHTML = 'Next Wave: ' + Math.round(Wave.curDelayInter / Game.fps).toString();
        Game.statusbar.appendChild(Statusbar.nextWaveDom);
    }; // draw
    /**
     * Update level within a timeframe
     *********************************************************/
    Statusbar.update = function () {
        Statusbar.livesDom.innerHTML = 'Lives: ' + Game.lives.toString();
        Statusbar.pointsDom.innerHTML = 'Points: ' + Game.points.toString();
        Statusbar.nextWaveDom.innerHTML = 'Next Wave: ' + Math.round(Wave.curDelayInter / Game.fps).toString();
    }; // update
    return Statusbar;
})(); // Statusbar
/********************************************************
 * Game
 * <br/>All members of this class are static.
 * <br/>This class should NOT be instanciated.
 *********************************************************/
var Game = (function () {
    function Game() {
    }
    /**
     * Initialize game
     *********************************************************/
    Game.init = function () {
        Game.level = new Level([
            [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ], [
            { col: -1, ln: 1 },
            { col: 18, ln: 1 },
            { col: 18, ln: 4 },
            { col: 1, ln: 4 },
            { col: 1, ln: 7 },
            { col: 18, ln: 7 },
            { col: 18, ln: 10 },
            { col: 1, ln: 10 },
            { col: 1, ln: 13 }
        ], 20, 13);
        Game.lives = 5;
        Game.points = 120;
        Wave.init();
        Game.draw();
    }; // init
    /**
     * Draw all game's shapes
     *********************************************************/
    Game.draw = function () {
        Game.container = document.getElementById(Game.containerID);
        // Create level
        Game.level.draw();
        Game.container.appendChild(Game.viewport);
        // Create status bar
        Statusbar.draw();
        Game.container.appendChild(Game.statusbar);
    }; // draw
    /**
     * Start game and update periodically
     *********************************************************/
    Game.run = function () {
        switch (Game.state) {
            case 'running':
                setTimeout(function () {
                    // Update wave
                    Wave.update();
                    for (var i = 0; i < Game.atks.length; i++) {
                        var atk = Game.atks[i];
                        atk.update();
                    }
                    for (var i = 0; i < Game.defs.length; i++) {
                        var def = Game.defs[i];
                        def.update();
                    }
                    for (var i = 0; i < Game.bullets.length; i++) {
                        var bullet = Game.bullets[i];
                        bullet.update();
                    }
                    // Update status bar informations
                    Statusbar.update();
                    Game.run();
                }, 1000 / Game.fps); // update every 16 ms, Game.fps == 60 FPS
                break;
            case 'stop':
                var popup = document.createElement('div');
                popup.innerHTML = 'You lose!';
                popup.setAttribute('class', 'popup');
                Game.container.appendChild(popup);
                break;
        }
    }; // start
    Game.state = 'running'; // Game state: running, stop
    Game.fps = 60; // frame per second
    Game.containerID = 'game'; // container ID defined in HTML document
    Game.atks = []; // attacking units
    Game.defs = []; // defending units
    Game.bullets = []; // bullets
    Game.defCost = 30; // cost in points of a defending unit
    Game.atkGain = 10; // gain in points of killing an attacking unit
    return Game;
})(); // Game
window.onload = function () {
    Game.init();
    if (!DEBUG) {
        Game.run();
    }
};
var DEBUG = false;
//# sourceMappingURL=towerdefense.js.map