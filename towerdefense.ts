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
function lerp(v1: number, v2: number, t: number): number {
  return (1 - t) * v1 + t * v2;
} // lerp

/********************************************************
 * 2D Point
 *********************************************************/
interface Point {
  x: number;
  y: number;
} // Point

/********************************************************
 * Euclidian distance between two 2D-points
 * @param p1 First point
 * @param p2 Second point
 *********************************************************/
function distance(p1: Point, p2: Point): number {
  var dx = p2.x - p1.x;
  var dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
} // distance

/********************************************************
 * Layout Cell
 *********************************************************/
interface Cell {
  col: number; // column
  ln: number; // line
} // Cell

/********************************************************
 * Return the center point of a cell
 * @param cell Cell
 *********************************************************/
function cellCenter(cell: Cell): Point {
  return { x: (cell.col + 0.5) * Tile.shapeSize, y: (cell.ln + 0.5) * Tile.shapeSize }
} // cellCenter

/********************************************************
 * Return the upper left point of a cell
 * @param cell Cell
 *********************************************************/
function cellUpperLeft(cell: Cell): Point {
  return { x: cell.col * Tile.shapeSize, y: cell.ln * Tile.shapeSize }
} // cellUpperLeft

/********************************************************
 * Tile
 *********************************************************/
class Tile {
  type: number; // 0: land, 1:path
  cell: Cell; // coordinate in cells
  position: Point; // upper left corner in pixels
  empty: boolean; // empty==false when there is a defending unit on this tile, true otherwise

  shape: Element; // DOM shape
  static shapeSize = 40; // shape's size in pixels
  static container: Element; // shape's parent

  /**
   * Constructor
   * @param type Type of tile (0: land, 1: path)
   * @param col Column coordinate in cells
   * @param ln Line coordinate in cells
   *********************************************************/
  constructor(type: number, col: number, ln: number) {
    this.type = type;
    this.cell = { col: col, ln: ln };
    this.position = cellUpperLeft(this.cell);
    this.empty = true;
  } // constructor

  /**
   * Draw tile's shape in DOM.<br />
   * Tile.container must be defined.
   *********************************************************/
  draw() {
    this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.shape.setAttribute('x', this.position.x.toString());
    this.shape.setAttribute('y', this.position.y.toString());
    this.shape.setAttribute('width', Tile.shapeSize.toString());
    this.shape.setAttribute('height', Tile.shapeSize.toString());
    switch (this.type) {
      case 0: // land
        this.shape.setAttribute('class', 'tileLandEmpty');
        this.shape.addEventListener('click', () => {
          if (Game.state === 'running' && this.empty && Game.points >= Game.defCost) {
            // Add a defending unit
            var defender = new Defender(this.cell.col, this.cell.ln);
            Game.defs.push(defender);
            defender.draw();
            this.empty = false;
            this.shape.setAttribute('class', 'tileLandOccupied');
            Game.points -= Game.defCost;
          }
        });
        break;
      case 1: // path
        this.shape.setAttribute('class', 'tilePath');
        break;
      default:
        break;
    } // switch

    Tile.container.appendChild(this.shape);
  } // draw

  /**
   * Destroy tile's shape in DOM
   *********************************************************/
  destroy() {
    this.shape.parentNode.removeChild(this.shape);
  } // destroy
} // Tile

/********************************************************
 * Level
 *********************************************************/
class Level {
  tiles: Tile[]; // level's tiles
  path: Cell[]; // waypoints

  shape: Element; // DOM shape
  static shapeWidth: number; // level's width in pixels
  static shapeHeight: number; // level's height in pixels
  static container: Element; // shape's parent

  /**
   * Constructor
   * @param layout Level's layout (0: land, 1:path)
   * @param path Waypoints
   * @param width Width in cells
   * @param height Height in cells
   *********************************************************/
  constructor(layout: number[][], path: Cell[]) {
    this.path = path;

    this.tiles = [];
    var width: number;
    var height: number;
    for (var i = 0, height = layout.length; i < height; i++) {
      var line = layout[i];
      for (var j = 0, width = line.length; j < width; j++) {
        var tile = new Tile(line[j], j, i);
        this.tiles.push(tile);
      } // for j
    } // for i

    Level.shapeWidth = width * Tile.shapeSize;
    Level.shapeHeight = height * Tile.shapeSize;
  } // constructor

  /**
   * Draw level's shape in DOM.<br />
   * Level.container must be defined.
   *********************************************************/
  draw() {
    this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.shape.setAttribute('id', 'level');
    this.shape.setAttribute('width', Level.shapeWidth.toString());
    this.shape.setAttribute('height', Level.shapeHeight.toString());

    Tile.container = this.shape;

    for (var i = 0; i < this.tiles.length; i++) {
      var tile = this.tiles[i];
      tile.draw();
    } // for i

    Level.container.appendChild(this.shape);
  } // draw

  /**
   * Destroy level's shape in DOM
   *********************************************************/
  destroy() {
    this.shape.parentNode.removeChild(this.shape);
  } // destroy
} // Level

/********************************************************
 * Attacking unit
 *********************************************************/
class Attacker {
  static ID = 0;
  id: string;
  state: string; // alive, passed, dead

  position: Point; // center
  path: Cell[]; // waypoints
  hpMax: number // max hit points
  hp: number; // hit points
  speed: number; // pixels per frame
  hitboxRadius: number; // hitbox's radius

  waypoint: number; // next waypoint
  distWp: number; // distance to next waypoint

  shape: Element; // DOM shape
  static shapeSize = 20; // shape's size in pixels
  static container: Element; // shape's parent

  /**
   * Constructor
   * @param path Set of waypoints
   * @param hp Hit points (100)
   * @param speed Speed in pixels per second (50)
   * @param hitboxRadius Hitbox radius in pixels (10)
   *********************************************************/
  constructor(path: Cell[], hp: number = 100, speed: number = 50, hitboxRadius: number = 10) {
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
  move() {
    var speed = this.speed;
    var pointWp = cellCenter(this.path[this.waypoint]);

    // Waypoint(s) reached
    // skip waypoint(s) if necessary
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
    } // while

    var ratio = speed / this.distWp;
    this.position.x = lerp(this.position.x, pointWp.x, ratio);
    this.position.y = lerp(this.position.y, pointWp.y, ratio);
    this.distWp -= speed;
  } // move

  /**
   * Inflict damage to unit
   *********************************************************/
  hit(damage: number) {
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
  } // hit

  /**
   * Draw unit's shape in DOM.<br />
   * Attacker.container must be defined.
   *********************************************************/
  draw() {
    this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.shape.setAttribute('class', 'attacker');
    this.shape.setAttribute('id', this.id);
    this.shape.setAttribute('cx', this.position.x.toString());
    this.shape.setAttribute('cy', this.position.y.toString());
    this.shape.setAttribute('r', (Attacker.shapeSize / 2).toString());
    Attacker.container.appendChild(this.shape);
  } // draw

  /**
   * Update unit within a timeframe
   *********************************************************/
  update() {
    if (this.state === 'alive') {
      this.move();
      this.shape.setAttribute('cx', this.position.x.toString());
      this.shape.setAttribute('cy', this.position.y.toString());
    }
  } // update

  /**
   * Destroy unit's shape in DOM
   *********************************************************/
  destroy() {
    this.shape.parentNode.removeChild(this.shape);

    // Remove attacking unit from memory
    for (var i = 0; i < Game.atks.length; i++) {
      var atk = Game.atks[i];
      if (atk.id === this.id) {
        Game.atks.splice(i, 1);
        break;
      }
    } // for i
  } // destroy
} // Attacker

/********************************************************
 * Defending unit
 *********************************************************/
class Defender {
  static ID = 0;
  id: string;
  state: string; // ready, cooldown

  position: Point; // center
  damage: number; // damage per hit
  range: number; // shooting range in pixels
  rate: number; // number of shoots per 100 frames
  delay: number; // number of frames before another shot
  target: Attacker; // current target

  shape: Element; // DOM shape
  static shapeSize = Tile.shapeSize * 0.75; // shape's size in pixels
  static container: Element; // shape's parent

  /**
   * Constructor
   * @param col Column coordinate in cells
   * @param ln Line coordinate in cells
   * @param damage Damage dealt to attacking units in HP (20)
   * @param range Shooting range in pixels (50)
   * @param rate Number of shoots per seconds (1)
   *********************************************************/
  constructor(col: number, ln: number, damage: number = 20, range: number = 50, rate: number = 1) {
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
  aim() {
    var maxDist = Number.POSITIVE_INFINITY;

    // Current target is alive and
    // within range: fire!
    if (
      this.target &&
      this.target.state === 'alive' &&
      distance(this.position, this.target.position) <= this.range) {

      return this.shoot(this.target);
    }
    // Get the nearest alive attacker within range
    // if there is no current target or
    // if the current target is not alive or
    // if the current target is alive but out of range
    else {
      this.target = null;

      for (var i = 0; i < Game.atks.length; i++) {
        var atk = Game.atks[i];
        var dist = distance(this.position, atk.position);
        if (dist <= maxDist && atk.state === 'alive' && dist <= this.range) {
          this.target = atk;
          maxDist = dist;
        }
      } // for i

      // A new target within range has been found: fire!
      if (this.target) {
        return this.shoot(this.target);
      }
    }

    return null;
  } // aim

  /**
   * Shoot at a given target emitting a bullet.
   * <br />Defending unit enters in a cooldown state.
   * @param target Attacking unit
   *********************************************************/
  shoot(target: Attacker): Bullet {
    var bullet = new Bullet(this.position.x, this.position.y, target);
    this.state = 'cooldown';
    Game.bullets.push(bullet);
    bullet.draw();
    return bullet;
  } // shoot

  /**
   * Decrease the cooldown counter within a timeframe
   *********************************************************/
  cooldown() {
    this.delay--;

    if (this.delay <= 0) {
      this.state = 'ready'
      this.delay = 100 / this.rate;
    }
  } // cooldown

  /**
   * Draw unit's shape in DOM.<br />
   * Defender.container must be defined.
   *********************************************************/
  draw() {
    this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.shape.setAttribute('class', 'defender');
    this.shape.setAttribute('id', this.id);
    this.shape.setAttribute('x', (this.position.x - Defender.shapeSize / 2).toString());
    this.shape.setAttribute('y', (this.position.y - Defender.shapeSize / 2).toString());
    this.shape.setAttribute('width', Defender.shapeSize.toString());
    this.shape.setAttribute('height', Defender.shapeSize.toString());
    Defender.container.appendChild(this.shape);
  } // draw

  /**
   * Update unit within a timeframe
   *********************************************************/
  update() {
    switch (this.state) {
      case 'ready':
        this.aim();
        break;
      case 'cooldown':
        this.cooldown();
        break;
      default:
        break;
    } // switch
  } // update

  /**
   * Destroy unit's shape in DOM
   *********************************************************/
  destroy() {
    this.shape.parentNode.removeChild(this.shape);
  } // destroy
} // Defender

/********************************************************
 * Bullet shot by defending unit
 *********************************************************/
class Bullet {
  static ID = 0;
  id: string;
  state: string; // alive, dead

  position: Point; // center
  target: Attacker; // bullet's target
  speed: number; // pixels per frame
  damage: number; // damage per hit
  distTg: number; // distance to target's hitbox

  shape: Element; // DOM shape
  static shapeSize = 3; // shape's size in pixels
  static container: Element; // shape's parent

  /**
   * Constructor
   * @param x x center coordinate in pixels
   * @param y y center coordinate in pixels
   * @param target Bullet's target
   * @param speed Pixels per second
   * @param damage Damage dealt to attacking units in HP (20)
   *********************************************************/
  constructor(x: number, y: number, target: Attacker, speed: number = 100, damage: number = 20) {
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
  move() {
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
  } // move

  /**
   * Draw bullet's shape in DOM.<br />
   * Bullet.container must be defined.
   *********************************************************/
  draw() {
    this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.shape.setAttribute('class', 'bullet');
    this.shape.setAttribute('id', this.id);
    this.shape.setAttribute('cx', this.position.x.toString());
    this.shape.setAttribute('cy', this.position.y.toString());
    this.shape.setAttribute('r', Bullet.shapeSize.toString());
    Bullet.container.appendChild(this.shape);
  } // draw

  /**
   * Update bullet within a timeframe
   *********************************************************/
  update() {
    if (this.state === 'alive') {
      this.move();
      this.shape.setAttribute('cx', this.position.x.toString());
      this.shape.setAttribute('cy', this.position.y.toString());
    }
  } // update

  /**
   * Destroy bullet's shape in DOM
   *********************************************************/
  destroy() {
    this.shape.parentNode.removeChild(this.shape);

    // Remove bullet from memory
    for (var i = 0; i < Game.atks.length; i++) {
      var atk = Game.atks[i];
      if (atk.id === this.id) {
        Game.atks.splice(i, 1);
        break;
      }
    } // for i
  } // destroy
} // Bullet

/********************************************************
 * Wave of attacking units (helper class)
 * <br/>All members of this class are static.
 * <br/>This class should NOT be instanciated.
 *********************************************************/
class Wave {
  static atks = 6; // number of attacking unit per wave
  static delayIntra = 0.75; // delay in seconds between two attacking unit in a same wave
  static delayInter = 10; // delay in seconds between two waves
  static hpIncrease = 1.05; // Increase coefficient on attacking units' hit points per wave

  static curAtks: number; // current remaning attacking unit to produce
  static curDelayIntra: number; // current wave intra delay
  static curDelayInter: number; // current wave inter delay
  static curHpIncrease: number;
  static curHp: number; // current attacking unit hit points

  /**
   * Initialize wave's parameters
   *********************************************************/
  static init() {
    Wave.delayIntra *= Game.fps;
    Wave.delayInter *= Game.fps;

    Wave.curAtks = Wave.atks;
    Wave.curDelayIntra = Wave.delayIntra;
    Wave.curDelayInter = Wave.delayInter;
    Wave.curHpIncrease = Wave.hpIncrease;
    Wave.curHp = 100;
  } // init

  /**
   * Update wave within a timeframe
   *********************************************************/
  static update() {
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
  }
} // Wave

/********************************************************
 * Status bar display management (helper class)
 * <br/>All members of this class are static.
 * <br/>This class should NOT be instanciated.
 *********************************************************/
class Statusbar {
  static livesDom: HTMLElement;
  static pointsDom: HTMLElement;
  static nextWaveDom: HTMLElement;

  static shape: Element; // DOM shape
  static container: Element; // shape's parent

  /**
   * Draw level's shape in DOM.<br />
   * Statusbar.container must be defined.
   *********************************************************/
  static draw() {
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
  } // draw

  /**
   * Update level within a timeframe
   *********************************************************/
  static update() {
    Statusbar.livesDom.innerHTML = 'Lives: ' + Game.lives.toString();
    Statusbar.pointsDom.innerHTML = 'Points: ' + Game.points.toString();
    Statusbar.nextWaveDom.innerHTML = 'Next Wave: ' + Math.round(Wave.curDelayInter / Game.fps).toString();
  } // update
} // Statusbar

/********************************************************
 * Game
 *********************************************************/
module Game {
  export var state = 'running'; // Game state: running, stop
  export var fps = 60; // frames per second
  var timer: number; // timer
  var interval: number;
  export var containerID = 'game'; // container ID defined in HTML document
  export var container: Element; // container in DOM
  export var level: Level; // level
  export var atks: Attacker[] = []; // attacking units
  export var defs: Defender[] = []; // defending units
  export var bullets: Bullet[] = []; // bullets
  export var lives: number; // lives remaining
  export var points: number; // points remaining
  export var defCost = 30; // cost in points of a defending unit
  export var atkGain = 10; // gain in points of killing an attacking unit

  export var wave: Wave; // wave of attacking units

  /**
   * Initialize game
   *********************************************************/
  export function init() {
    Game.level = new Level(
      [
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
      ],
      [
        { col: -1, ln: 1 }, { col: 18, ln: 1 }, { col: 18, ln: 4 }, { col: 1, ln: 4 },
        { col: 1, ln: 7 }, { col: 18, ln: 7 }, { col: 18, ln: 10 }, { col: 1, ln: 10 },
        { col: 1, ln: 13 }
      ]);

    Game.lives = 5;
    Game.points = 120;

    Wave.init();

    draw();

    timer = Date.now();
    interval = 1000 / Game.fps;
  } // init

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
  export function run() {
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
    } // switch
  } // run

  /**
   * Update game within a timeframe
   *********************************************************/
  function update() {
    // Update wave
    Wave.update();

    // Update attacking units
    for (var i = 0; i < Game.atks.length; i++) {
      var atk = Game.atks[i];
      atk.update();
    } // for i

    // Update defending units
    for (var i = 0; i < Game.defs.length; i++) {
      var def = Game.defs[i];
      def.update();
    } // for i

    // Update bullets
    for (var i = 0; i < Game.bullets.length; i++) {
      var bullet = Game.bullets[i];
      bullet.update();
    } // for i

    // Update status bar informations
    Statusbar.update();
  } // update
} // Game

window.onload = () => {
  Game.init();
  if (!DEBUG) {
    Game.run();
  }
}

var DEBUG = false;
