// Concepts
// * Attacking units' hit points getting higher and higher
// * Game State: running, stop
/********************************************************
 * Linear interpolation between two values
 * @param v1 First value
 * @param v2 Second value
 * @param t Interpolation ratio between [0, 1] <br />
 * where t=0 return p1 and t=1 return p2
 *********************************************************/
function lerp(v1, v2, t) {
    return (1 - t) * v1 + t * v2;
} // lerp
/********************************************************
 * Euclidian distance between two 2D-points
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
     * @param type Type of tile (0: land, 1: path)
     * @param col Column coordinate in cells
     * @param ln Line coordinate in cells
     *********************************************************/
    function Tile(type, col, ln) {
        this.type = type;
        this.cell = { col: col, ln: ln };
        this.position = cellUpperLeft(this.cell);
        this.empty = true;
    } // constructor
    /**
     * Draw tile's shape in DOM.<br />
     * Tile.container must be defined.
     *********************************************************/
    Tile.prototype.draw = function () {
        var _this = this;
        this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.shape.setAttribute('x', this.position.x.toString());
        this.shape.setAttribute('y', this.position.y.toString());
        this.shape.setAttribute('width', Tile.shapeSize.toString());
        this.shape.setAttribute('height', Tile.shapeSize.toString());
        switch (this.type) {
            case 0:
                this.shape.setAttribute('class', 'tileLandEmpty');
                this.shape.addEventListener('click', function () {
                    if (Game.state === 'running' && _this.empty && Game.points >= Game.defCost) {
                        // Add a defending unit
                        var defender = new Defender(_this.cell.col, _this.cell.ln);
                        Game.defs.push(defender);
                        defender.draw();
                        _this.empty = false;
                        _this.shape.setAttribute('class', 'tileLandOccupied');
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
        Tile.container.appendChild(this.shape);
    }; // draw
    /**
     * Destroy tile's shape in DOM
     *********************************************************/
    Tile.prototype.destroy = function () {
        this.shape.parentNode.removeChild(this.shape);
    }; // destroy
    Tile.shapeSize = 40; // shape's size in pixels
    return Tile;
})(); // Tile
/********************************************************
 * Level
 *********************************************************/
var Level = (function () {
    /**
     * Constructor
     * @param layout Level's layout (0: land, 1:path)
     * @param path Waypoints
     * @param width Width in cells
     * @param height Height in cells
     *********************************************************/
    function Level(layout, path) {
        this.path = path;
        this.tiles = [];
        var width;
        var height;
        for (var i = 0, height = layout.length; i < height; i++) {
            var line = layout[i];
            for (var j = 0, width = line.length; j < width; j++) {
                var tile = new Tile(line[j], j, i);
                this.tiles.push(tile);
            }
        }
        Level.shapeWidth = width * Tile.shapeSize;
        Level.shapeHeight = height * Tile.shapeSize;
    } // constructor
    /**
     * Draw level's shape in DOM.<br />
     * Level.container must be defined.
     *********************************************************/
    Level.prototype.draw = function () {
        this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.shape.setAttribute('id', 'level');
        this.shape.setAttribute('width', Level.shapeWidth.toString());
        this.shape.setAttribute('height', Level.shapeHeight.toString());
        Tile.container = this.shape;
        for (var i = 0; i < this.tiles.length; i++) {
            var tile = this.tiles[i];
            tile.draw();
        }
        Level.container.appendChild(this.shape);
    }; // draw
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
            speed -= this.distWp;
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
        var ratio = speed / this.distWp;
        this.position.x = lerp(this.position.x, pointWp.x, ratio);
        this.position.y = lerp(this.position.y, pointWp.y, ratio);
        this.distWp -= speed;
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
     * Draw unit's shape in DOM.<br />
     * Attacker.container must be defined.
     *********************************************************/
    Attacker.prototype.draw = function () {
        this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.shape.setAttribute('class', 'attacker');
        this.shape.setAttribute('id', this.id);
        this.shape.setAttribute('cx', this.position.x.toString());
        this.shape.setAttribute('cy', this.position.y.toString());
        this.shape.setAttribute('r', (Attacker.shapeSize / 2).toString());
        Attacker.container.appendChild(this.shape);
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
    Attacker.shapeSize = 20; // shape's size in pixels
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
     * Draw unit's shape in DOM.<br />
     * Defender.container must be defined.
     *********************************************************/
    Defender.prototype.draw = function () {
        this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.shape.setAttribute('class', 'defender');
        this.shape.setAttribute('id', this.id);
        this.shape.setAttribute('x', (this.position.x - Defender.shapeSize / 2).toString());
        this.shape.setAttribute('y', (this.position.y - Defender.shapeSize / 2).toString());
        this.shape.setAttribute('width', Defender.shapeSize.toString());
        this.shape.setAttribute('height', Defender.shapeSize.toString());
        Defender.container.appendChild(this.shape);
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
    Defender.shapeSize = Tile.shapeSize * 0.75; // shape's size in pixels
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
     * Draw bullet's shape in DOM.<br />
     * Bullet.container must be defined.
     *********************************************************/
    Bullet.prototype.draw = function () {
        this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.shape.setAttribute('class', 'bullet');
        this.shape.setAttribute('id', this.id);
        this.shape.setAttribute('cx', this.position.x.toString());
        this.shape.setAttribute('cy', this.position.y.toString());
        this.shape.setAttribute('r', Bullet.shapeSize.toString());
        Bullet.container.appendChild(this.shape);
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
    Bullet.shapeSize = 3; // shape's size in pixels
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
     * Draw level's shape in DOM.<br />
     * Statusbar.container must be defined.
     *********************************************************/
    Statusbar.draw = function () {
        Statusbar.shape = document.createElement('div');
        Statusbar.shape.setAttribute('id', 'statusbar');
        Statusbar.livesDom = document.createElement('span');
        Statusbar.livesDom.setAttribute('class', 'lives');
        Statusbar.livesDom.innerHTML = 'Lives: ' + Game.lives.toString();
        Statusbar.shape.appendChild(Statusbar.livesDom);
        Statusbar.pointsDom = document.createElement('span');
        Statusbar.pointsDom.setAttribute('class', 'points');
        Statusbar.pointsDom.innerHTML = 'Points: ' + Game.points.toString();
        Statusbar.shape.appendChild(Statusbar.pointsDom);
        Statusbar.nextWaveDom = document.createElement('span');
        Statusbar.nextWaveDom.setAttribute('class', 'nextWave');
        Statusbar.nextWaveDom.innerHTML = 'Next Wave: ' + Math.round(Wave.curDelayInter / Game.fps).toString();
        Statusbar.shape.appendChild(Statusbar.nextWaveDom);
        Statusbar.container.appendChild(Statusbar.shape);
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
 *********************************************************/
var Game;
(function (Game) {
    Game.state = 'running'; // Game state: running, stop
    Game.fps = 60; // frames per second
    var timer; // timer
    var interval;
    Game.containerID = 'game'; // container ID defined in HTML document
    Game.container; // container in DOM
    Game.level; // level
    Game.atks = []; // attacking units
    Game.defs = []; // defending units
    Game.bullets = []; // bullets
    Game.lives; // lives remaining
    Game.points; // points remaining
    Game.defCost = 30; // cost in points of a defending unit
    Game.atkGain = 10; // gain in points of killing an attacking unit
    Game.wave; // wave of attacking units
    /**
     * Initialize game
     *********************************************************/
    function init() {
        Game.level = new Level([
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
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
        ]);
        Game.lives = 5;
        Game.points = 120;
        Wave.init();
        draw();
        timer = Date.now();
        interval = 1000 / Game.fps;
    }
    Game.init = init; // init
    /**
     * Draw all game's shapes
     *********************************************************/
    function draw() {
        Game.container = document.getElementById(Game.containerID);
        // Create level
        Level.container = Game.container;
        Game.level.draw();
        // Create status bar
        Statusbar.container = Game.container;
        Statusbar.draw();
        // Initialize objects' containers
        Defender.container = Game.level.shape;
        Attacker.container = Game.level.shape;
        Bullet.container = Game.level.shape;
    } // draw
    /**
     * Start game and update periodically
     *********************************************************/
    function run() {
        switch (Game.state) {
            case 'running':
                requestAnimationFrame(Game.run); // update every 16 ms, Game.fps == 60 FPS
                var now = Date.now();
                var delta = now - timer;
                if (delta > interval) {
                    timer = now - (delta % interval);
                    update();
                }
                break;
            case 'stop':
                var popup = document.createElement('div');
                popup.innerHTML = 'You lose!';
                popup.setAttribute('class', 'popup');
                Game.container.appendChild(popup);
                break;
        }
    }
    Game.run = run; // run
    /**
     * Update game within a timeframe
     *********************************************************/
    function update() {
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
    } // update
})(Game || (Game = {})); // Game
window.onload = function () {
    Game.init();
    if (!DEBUG) {
        Game.run();
    }
};
var DEBUG = false;
//# sourceMappingURL=towerdefense.js.map