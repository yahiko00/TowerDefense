// Concepts
// * TypeDoc
// * Unit Tests
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
 * Convert a cell into a point
 * @param cell Cell to convert
 *********************************************************/
function cell2point(cell) {
    return { x: (cell.col + 0.5) * Tile.shapeSize, y: (cell.line + 0.5) * Tile.shapeSize };
} // cell2point
/********************************************************
 * Tile
 *********************************************************/
var Tile = (function () {
    /**
     * Constructor
     * @param x upper left corner coordinate in pixels
     * @param y upper left corner coordinate in pixels
     * @param type type of tile (0: wall, 1: path)
     *********************************************************/
    function Tile(type, x, y) {
        this.id = 'tile.' + Tile.ID++;
        this.type = type;
        this.position = { x: x, y: y };
    } // constructor
    /**
     * Draw tile's shape in DOM
     *********************************************************/
    Tile.prototype.draw = function () {
        this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.shape.setAttribute('class', 'tile');
        this.shape.setAttribute('id', this.id);
        this.shape.setAttribute('x', this.position.x.toString());
        this.shape.setAttribute('y', this.position.y.toString());
        this.shape.setAttribute('width', Tile.shapeSize.toString());
        this.shape.setAttribute('height', Tile.shapeSize.toString());
        switch (this.type) {
            case 0:
                this.shape.setAttribute('fill', Tile.shapeColorWall);
                break;
            case 1:
                this.shape.setAttribute('fill', Tile.shapeColorPath);
                break;
            default:
                break;
        }
        return this.shape;
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
    Tile.shapeColorWall = '#7A7A7A'; // wall's color (lightgray)
    Tile.shapeColorPath = '#313131'; // path's color (darkgray)
    return Tile;
})(); // Tile
/********************************************************
 * Level
 *********************************************************/
var Level = (function () {
    /**
     * Constructor
     * @param layout level's layout (0: wall, 1:path)
     * @param path waypoints
     * @param width level's width in tiles
     * @param height level's height in tiles
     *********************************************************/
    function Level(layout, path, width, height) {
        if (width === void 0) { width = 20; }
        if (height === void 0) { height = 13; }
        this.layout = layout;
        this.tiles = [];
        for (var i = 0; i < layout.length; i++) {
            var col = layout[i];
            for (var j = 0; j < col.length; j++) {
                var tile = new Tile(col[j], i * Tile.shapeSize, j * Tile.shapeSize);
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
        this.shape.setAttribute('width', Level.shapeWidth.toString());
        this.shape.setAttribute('height', Level.shapeHeight.toString());
        for (var i = 0; i < this.tiles.length; i++) {
            var tile = this.tiles[i];
            this.shape.appendChild(tile.draw());
        }
        return this.shape;
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
     * @param speed pixels per second (50)
     * @param hitboxRadius Hitbox radius in pixels (10)
     *********************************************************/
    function Attacker(path, hp, speed, hitboxRadius) {
        if (hp === void 0) { hp = 100; }
        if (speed === void 0) { speed = 50; }
        if (hitboxRadius === void 0) { hitboxRadius = 10; }
        this.id = 'atk.' + Attacker.ID++;
        this.state = 'alive';
        this.position = cell2point(path[0]);
        this.path = path;
        this.hp = hp;
        this.speed = speed / Game.fps; // conversion
        this.hitboxRadius = hitboxRadius;
        this.waypoint = 1;
        this.distWp = distance(this.position, cell2point(this.path[this.waypoint]));
    } // constructor
    /**
     * Move unit within a timeframe
     *********************************************************/
    Attacker.prototype.move = function () {
        var speed = this.speed;
        var pointWp = cell2point(this.path[this.waypoint]);
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
                return;
            }
            var pointWp = cell2point(this.path[this.waypoint]);
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
        if (this.hp <= 0) {
            this.state = 'dead';
            this.destroy();
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
        this.shape.setAttribute('fill', Attacker.shapeColor);
        return this.shape;
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
    }; // destroy
    Attacker.ID = 0;
    Attacker.shapeSize = 20; // shape's size
    Attacker.shapeColor = '#FF3333'; // shape's color (lightred)
    return Attacker;
})(); // Attacker
/********************************************************
 * Defending unit
 *********************************************************/
var Defender = (function () {
    /**
     * Constructor
     * @param col column coordinate in tiles
     * @param line line coordinate in tiles
     * @param damage damage dealt to attacking units in HP (20)
     * @param range shooting range in pixels (50)
     * @param rate number of shoots per seconds (1)
     *********************************************************/
    function Defender(col, line, damage, range, rate) {
        if (damage === void 0) { damage = 20; }
        if (range === void 0) { range = 50; }
        if (rate === void 0) { rate = 1; }
        this.id = 'def.' + Defender.ID++;
        this.state = 'ready';
        this.position = cell2point({ col: col, line: line });
        this.damage = damage;
        this.range = range;
        this.rate = rate * 100 / Game.fps; // conversion
        this.delay = 100 / this.rate;
    } // constructor
    /**
     * Aim at a target among all possible attacking units
     *********************************************************/
    Defender.prototype.aim = function () {
        var minDist = Number.POSITIVE_INFINITY;
        var target;
        for (var i = 0; i < Game.atks.length; i++) {
            var atk = Game.atks[i];
            var dist = distance(this.position, atk.position);
            if (dist < minDist) {
                target = atk;
                minDist = dist;
            }
        }
        // Attacker is within range: fire!
        if (minDist <= this.range) {
            return this.shoot(target);
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
        this.shape.parentNode.appendChild(bullet.draw());
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
        this.shape.setAttribute('fill', Defender.shapeColor);
        return this.shape;
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
    Defender.shapeColor = '#0047B2'; // shape's color (blue)
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
     * @param target bullet's target
     * @param speed pixels per second
     * @param damage damage dealt to attacking units in HP (20)
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
        this.distTg = distance(this.position, this.target.position);
    } // constructor
    /**
     * Move bullet within a timeframe
     *********************************************************/
    Bullet.prototype.move = function () {
        // target reached
        if (this.distTg - this.speed <= 0) {
            this.state = 'dead';
            this.target.hit(this.damage);
            this.destroy();
            return;
        }
        var dx = this.target.position.x - this.position.x;
        var dy = this.target.position.y - this.position.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var ratio = this.speed / distance;
        this.position.x += dx * ratio;
        this.position.y += dy * ratio;
        this.distTg = distance - this.speed;
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
        this.shape.setAttribute('fill', Bullet.shapeColor);
        return this.shape;
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
    }; // destroy
    Bullet.ID = 0;
    Bullet.shapeSize = 3; // shape's size
    Bullet.shapeColor = '#FFFFFF'; // shape's color (white)
    return Bullet;
})(); // Bullet
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
        ], [{ col: -1, line: 1 }, { col: 20, line: 1 }], 20, 13);
        Game.atks.push(new Attacker(Game.level.path));
        Game.defs.push(new Defender(10, 2));
        Game.draw();
    }; // init
    /**
     * Draw all game's shapes
     *********************************************************/
    Game.draw = function () {
        Game.viewport = document.getElementById(Game.viewportID);
        Game.viewport.appendChild(Game.level.draw());
        for (var i = 0; i < Game.atks.length; i++) {
            var atk = Game.atks[i];
            Game.level.shape.appendChild(atk.draw());
        }
        for (var i = 0; i < Game.defs.length; i++) {
            var def = Game.defs[i];
            Game.level.shape.appendChild(def.draw());
        }
    }; // draw
    /**
     * Start game and update periodically
     *********************************************************/
    Game.start = function () {
        setTimeout(function () {
            requestAnimationFrame(function () {
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
                Game.start();
            });
        }, 1000 / Game.fps); // update every 20 ms, 50 FPS
    }; // start
    Game.fps = 50; // Frame per second
    Game.viewportID = 'viewport'; // viewport ID defined in HTML document
    Game.atks = []; // attacking units
    Game.defs = []; // defending units
    Game.bullets = []; // bullets
    return Game;
})(); // Game
window.onload = function () {
    if (!DEBUG) {
        Game.init();
        Game.start();
    }
};
var DEBUG = false;
//# sourceMappingURL=towerdefense.js.map