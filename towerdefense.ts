// Concepts
// * States
// * Defender
// * Shots

/********************************************************
 * Point 2D
 *********************************************************/
interface Point {
  x: number;
  y: number;
} // Point

/********************************************************
 * Compute Euclidian distance between two 2D-points
 * @param p1 First point
 * @param p2 Second point
 *********************************************************/
function distance(p1: Point, p2: Point): number {
  var dx = p2.x - p1.x;
  var dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
} // distance

/********************************************************
 * Shape in DOM
 *********************************************************/
interface Shape {
  shape: Element;

  draw(): Element;
  update();
  destroy();
} // Shape

/********************************************************
 * Tile
 *********************************************************/
class Tile implements Shape {
  static ID = 0;
  id: string;

  type: number; // 0: wall, 1:path
  position: Point; // upper left corner

  shape: Element; // DOM shape
  static shapeSize = 40; // shape's size
  static shapeColorWall = '#7A7A7A'; // wall's color (lightgray)
  static shapeColorPath = '#313131'; // path's color (darkgray)

  /*-------------------------------------------------------
   * Constructor
   * @param x upper left corner coordinate in pixels
   * @param y upper left corner coordinate in pixels
   * @param type type of tile (0: wall, 1: path)
   *-------------------------------------------------------*/
  constructor(type: number, x: number, y: number) {
    this.id = 'tile.' + Tile.ID++;
    this.type = type;
    this.position = { x: x, y: y };
  } // constructor

  /*-------------------------------------------------------
   * Draw tile's shape in DOM
   *-------------------------------------------------------*/
  draw(): Element {
    this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.shape.setAttribute('class', 'tile');
    this.shape.setAttribute('id', this.id);
    this.shape.setAttribute('x', this.position.x.toString());
    this.shape.setAttribute('y', this.position.y.toString());
    this.shape.setAttribute('width', Tile.shapeSize.toString());
    this.shape.setAttribute('height', Tile.shapeSize.toString());
    switch (this.type) {
      case 0: // wall
        this.shape.setAttribute('fill', Tile.shapeColorWall);
        break;
      case 1: // path
        this.shape.setAttribute('fill', Tile.shapeColorPath);
        break;
      default:
        break;
    } // switch
    return this.shape;
  } // draw

  /*-------------------------------------------------------
   * Update tile within a timeframe
   *-------------------------------------------------------*/
  update() {
  } // update

  /*-------------------------------------------------------
   * Destroy tile's shape in DOM
   *-------------------------------------------------------*/
  destroy() {
    this.shape.parentNode.removeChild(this.shape);
  } // destroy
} // Tile

/********************************************************
 * Level
 *********************************************************/
class Level implements Shape {
  layout: number[][]; // level's layout (0: wall, 1:path)
  tiles: Tile[]; // level's tile
  path: Point[]; // waypoints

  shape: Element; // DOM shape
  static shapeWidth: number; // level's width in pixels
  static shapeHeight: number; // level's height in pixels

  /*-------------------------------------------------------
   * Constructor
   * @param layout level's layout (0: wall, 1:path)
   * @param path waypoints
   * @param width level's width in tiles
   * @param height level's height in tiles
   *-------------------------------------------------------*/
  constructor(layout: number[][], path: Point[], width: number = 20, height: number = 13) {
    this.layout = layout;
    this.path = [];
    for (var i = 0; i < path.length; i++) {
      var point = path[i];
      this.path.push({ x: (point.x + 0.5) * Tile.shapeSize, y: (point.y + 0.5) * Tile.shapeSize });
    } // for i

    this.tiles = [];
    for (var i = 0; i < layout.length; i++) {
      var col = layout[i];
      for (var j = 0; j < col.length; j++) {
        var tile = new Tile(col[j], i * Tile.shapeSize, j * Tile.shapeSize);
        this.tiles.push(tile);
      } // for j
    } // for i

    Level.shapeWidth = width * Tile.shapeSize;
    Level.shapeHeight = height * Tile.shapeSize;
  } // constructor

  /*-------------------------------------------------------
   * Draw level's shape in DOM
   *-------------------------------------------------------*/
  draw(): Element {
    this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.shape.setAttribute('width', Level.shapeWidth.toString());
    this.shape.setAttribute('height', Level.shapeHeight.toString());

    for (var i = 0; i < this.tiles.length; i++) {
      var tile = this.tiles[i];
      this.shape.appendChild(tile.draw());
    } // for i

    return this.shape;
  } // draw

  /*-------------------------------------------------------
   * Update level within a timeframe
   *-------------------------------------------------------*/
  update() {
  } // update

  /*-------------------------------------------------------
   * Destroy level's shape in DOM
   *-------------------------------------------------------*/
  destroy() {
    this.shape.parentNode.removeChild(this.shape);
  } // destroy
} // Level

/********************************************************
 * Attacking unit
 *********************************************************/
class Attacker implements Shape {
  static ID = 0;
  id: string;
  state: string; // alive, passed, dead

  position: Point; // center
  path: Point[]; // waypoints
  hp: number; // hit points
  speed: number; // pixels per frame
  hitboxRadius: number; // hitbox's radius

  waypoint: number; // next waypoint
  distWp: number; // distance to next waypoint

  shape: Element; // DOM shape
  static shapeSize = 20; // shape's size
  static shapeColor = '#FF3333'; // shape's color (lightred)

  /*-------------------------------------------------------
   * Constructor
   * @param path Set of waypoints
   * @param hp Hit points (100)
   * @param speed pixels per second (50)
   * @param hitboxRadius Hitbox radius in pixels (10)
   *-------------------------------------------------------*/
  constructor(path: Point[], hp: number = 100, speed: number = 50, hitboxRadius: number = 10) {
    this.id = 'atk.' + Attacker.ID++;
    this.state = 'alive';
    this.position = { x: path[0].x, y: path[0].y };
    this.path = path;
    this.hp = hp;
    this.speed = speed / Game.fps; // conversion
    this.hitboxRadius = hitboxRadius;
    this.waypoint = 1;
    this.distWp = distance(this.position, this.path[this.waypoint]);
  } // constructor

  /*-------------------------------------------------------
   * Move unit within a timeframe
   *-------------------------------------------------------*/
  move() {
    var speed = this.speed;

    // Waypoint(s) reached
    // skip waypoint(s) if necessary
    while (this.distWp - speed <= 0) {
      // Carry over
      speed = speed - this.distWp;

      // Move to next waypoint
      this.position.x = this.path[this.waypoint].x;
      this.position.y = this.path[this.waypoint].y;
      this.waypoint++;

      // End of path
      if (this.waypoint > this.path.length - 1) {
        this.state = 'passed';
        this.destroy();
        return;
      }
    } // while

    var dx = this.path[this.waypoint].x - this.position.x;
    var dy = this.path[this.waypoint].y - this.position.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    var ratio = speed / distance;
    this.position.x += dx * ratio;
    this.position.y += dy * ratio;
    this.distWp = distance - speed;
  } // move

  /*-------------------------------------------------------
   * Inflict damage to unit
   *-------------------------------------------------------*/
  hit(damage: number) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.state = 'dead';
      this.destroy();
    }
  } // hit

  /*-------------------------------------------------------
   * Draw unit's shape in DOM
   *-------------------------------------------------------*/
  draw(): Element {
    this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.shape.setAttribute('class', 'attacker');
    this.shape.setAttribute('id', this.id);
    this.shape.setAttribute('cx', this.position.x.toString());
    this.shape.setAttribute('cy', this.position.y.toString());
    this.shape.setAttribute('r', (Attacker.shapeSize / 2).toString());
    this.shape.setAttribute('fill', Attacker.shapeColor);
    return this.shape;
  } // draw

  /*-------------------------------------------------------
   * Update unit within a timeframe
   *-------------------------------------------------------*/
  update() {
    if (this.state === 'alive') {
      this.move();
      this.shape.setAttribute('cx', this.position.x.toString());
      this.shape.setAttribute('cy', this.position.y.toString());
    }
  } // update

  /*-------------------------------------------------------
   * Destroy unit's shape in DOM
   *-------------------------------------------------------*/
  destroy() {
    this.shape.parentNode.removeChild(this.shape);
  } // destroy
} // Attacker

/********************************************************
 * Defending unit
 *********************************************************/
class Defender implements Shape {
  static ID = 0;
  id: string;
  state: string; // ready, cooldown

  position: Point; // center
  damage: number; // damage per hit
  range: number; // shooting range in pixels
  rate: number; // number of shoots per 100 frames
  delay: number; // number of frames before another shot

  shape: Element; // DOM shape
  static shapeSize = Tile.shapeSize * 0.75; // shape's size
  static shapeColor = '#0047B2'; // shape's color (blue)

  /*-------------------------------------------------------
   * Constructor
   * @param x x center coordinate in pixels
   * @param y y center coordinate in pixels
   * @param damage damage dealt to attacking units in HP (20)
   * @param range shooting range in pixels (50)
   * @param rate number of shoots per seconds
   *-------------------------------------------------------*/
  constructor(x: number, y: number, damage: number = 20, range: number = 50, rate: number = 1) {
    this.id = 'def.' + Defender.ID++;
    this.state = 'ready';
    this.position = { x: x, y: y };
    this.damage = damage;
    this.range = range;
    this.rate = rate * 100 / Game.fps; // conversion
    this.delay = 100 / this.rate;
  } // constructor

  /*-------------------------------------------------------
   * Aim at a target among all possible attacking units
   *-------------------------------------------------------*/
  aim() {
    var minDist = Number.POSITIVE_INFINITY;
    var target: Attacker;

    // Get the nearest attacker
    for (var i = 0; i < Game.atks.length; i++) {
      var atk = Game.atks[i];
      var dist = distance(this.position, atk.position);
      if (dist < minDist) {
        target = atk;
        minDist = dist;
      }
    } // for i

    // Attacker is within range: fire!
    if (minDist <= this.range) {
      this.shoot(target);
    }
  } // aim

  /*-------------------------------------------------------
   * Shoot at a target among all possible attacking units
   * emitting a bullet
   * @param target Attacking unit
   *-------------------------------------------------------*/
  shoot(target: Attacker) {
    var bullet = new Bullet(this.position.x, this.position.y, target);
    this.shape.parentNode.appendChild(bullet.draw());
    Game.bullets.push(bullet);
    this.state = 'cooldown';
  } // shoot

  /*-------------------------------------------------------
   * Decrease the cooldown counter within a timeframe
   *-------------------------------------------------------*/
  cooldown() {
    this.delay--;

    if (this.delay <= 0) {
      this.state = 'ready'
      this.delay = 100 / this.rate;
    }
  } // cooldown

  /*-------------------------------------------------------
   * Draw unit's shape in DOM
   *-------------------------------------------------------*/
  draw(): Element {
    this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.shape.setAttribute('class', 'defender');
    this.shape.setAttribute('id', this.id);
    this.shape.setAttribute('x', (this.position.x + (Tile.shapeSize - Defender.shapeSize) / 2).toString());
    this.shape.setAttribute('y', (this.position.y + (Tile.shapeSize - Defender.shapeSize) / 2).toString());
    this.shape.setAttribute('width', Defender.shapeSize.toString());
    this.shape.setAttribute('height', Defender.shapeSize.toString());
    this.shape.setAttribute('fill', Defender.shapeColor);
    return this.shape;
  } // draw

  /*-------------------------------------------------------
   * Update unit within a timeframe
   *-------------------------------------------------------*/
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

  /*-------------------------------------------------------
   * Destroy unit's shape in DOM
   *-------------------------------------------------------*/
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
  distTg: number; // distance to target

  shape: Element; // DOM shape
  static shapeSize = 3; // shape's size
  static shapeColor = '#FFFFFF'; // shape's color (white)

  /*-------------------------------------------------------
   * Constructor
   * @param x x center coordinate in pixels
   * @param y y center coordinate in pixels
   * @param target bullet's target
   * @param speed pixels per second
   * @param damage damage dealt to attacking units in HP (20)
   *-------------------------------------------------------*/
  constructor(x: number, y: number, target: Attacker, speed: number = 100, damage: number = 20) {
    this.id = 'bullet.' + Bullet.ID++;
    this.state = 'alive';
    this.position = { x: x, y: y };
    this.target = target;
    this.speed = speed / Game.fps;
    this.damage = damage;
    this.distTg = distance(this.position, this.target.position);
  } // constructor

  /*-------------------------------------------------------
   * Move bullet within a timeframe
   *-------------------------------------------------------*/
  move() {
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
  } // move

  /*-------------------------------------------------------
   * Draw bullet's shape in DOM
   *-------------------------------------------------------*/
  draw(): Element {
    this.shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.shape.setAttribute('class', 'bullet');
    this.shape.setAttribute('id', this.id);
    this.shape.setAttribute('cx', this.position.x.toString());
    this.shape.setAttribute('cy', this.position.y.toString());
    this.shape.setAttribute('r', Bullet.shapeSize.toString());
    this.shape.setAttribute('fill', Bullet.shapeColor);
    return this.shape;
  } // draw

  /*-------------------------------------------------------
   * Update bullet within a timeframe
   *-------------------------------------------------------*/
  update() {
    if (this.state === 'alive') {
      this.move();
      this.shape.setAttribute('cx', this.position.x.toString());
      this.shape.setAttribute('cy', this.position.y.toString());
    }
  } // update

  /*-------------------------------------------------------
   * Destroy bullet's shape in DOM
   *-------------------------------------------------------*/
  destroy() {
    this.shape.parentNode.removeChild(this.shape);
  } // destroy
} // Bullet

/********************************************************
 * Game
 *********************************************************/
class Game {
  static fps = 50;
  static viewportID = 'viewport';
  static viewport: Element;
  static level: Level;
  static atks: Attacker[] = [];
  static defs: Defender[] = [];
  static bullets: Bullet[] = [];

  /*-------------------------------------------------------
   * Initialize game
   *-------------------------------------------------------*/
  static init() {
    Game.level = new Level(
      [
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
      ],
      [{ x: -1, y: 1 }, { x: 20, y: 1 }],
      20, 13);
    Game.atks.push(new Attacker(Game.level.path));
    Game.defs.push(new Defender(10 * Tile.shapeSize, 2 * Tile.shapeSize));

    Game.draw();
  } // init

  /*-------------------------------------------------------
   * Draw all game's shapes
   *-------------------------------------------------------*/
  static draw() {
    Game.viewport = document.getElementById(Game.viewportID);
    Game.viewport.appendChild(Game.level.draw());

    for (var i = 0; i < Game.atks.length; i++) {
      var atk = Game.atks[i];
      Game.level.shape.appendChild(atk.draw());
    } // for i

    for (var i = 0; i < Game.defs.length; i++) {
      var def = Game.defs[i];
      Game.level.shape.appendChild(def.draw());
    } // for i
  } // draw

  /*-------------------------------------------------------
   * Start game and update periodically
   *-------------------------------------------------------*/
  static start() {
    setTimeout(() => {
      requestAnimationFrame(() => {
        for (var i = 0; i < Game.atks.length; i++) {
          var atk = Game.atks[i];
          atk.update();
        } // for i

        for (var i = 0; i < Game.defs.length; i++) {
          var def = Game.defs[i];
          def.update();
        } // for i

        for (var i = 0; i < Game.bullets.length; i++) {
          var bullet = Game.bullets[i];
          bullet.update();
        } // for i

        Game.start();
      });
    }, 1000 / Game.fps); // update every 20 ms, 50 FPS
  } // start
} // Game

window.onload = () => {
  Game.init();
  Game.start();
}