// === EXTERNALS ===

let sleep = require("sleep");

// === GENERIC FUNCTIONS ===

function pad(string, length, filler) {
    if (typeof(string) == "number") string = string.toString();
    return string+yes(filler, length-string.length);
}

function yes(character, count) {
    let string = "";
    for (let i = 0; i < count; i++) {
        string += character;
    }
    return string;
}

function map(value, inMin, inMax, outMin, outMax) {
    return (value-inMin) * (outMax-outMin) / (inMax-inMin) + outMin;
}

function delay(ms) {
    sleep.msleep(ms);
}

function genSuperArray(size) { // An array of arrays.
    let array = [];
    for (let i = 0; i < size; i++) {
        array.push([]);
    }
    return array;
}

// === GLOBALS & CONSTANTS ===

let nextID = 0;
let teams = 2;
let dots = [];
let messages = genSuperArray(teams);

const idleLifeDecrease = 1;
const moveLifeDecrease = 10;
const moveLifeThreshold = 150;
const panicLifeThreshold = 220;
const maxLife = 500;
const olaPower = 50;

const seekDistance = 6;
const sizeX = 15;
const sizeY = 15;

// === CLASSES ===

function Dot(x, y, team) {
    this.x = x;
    this.y = y;
    this.id = getNewID();
    this.team = team; // Team number or 0 for ola
    this.life = maxLife;
    this.age = 0;

    this.eat = function(ola) { // Supply function with ola to eat
        this.life = (this.life+olaPower > maxLife ? maxLife : this.life+olaPower); // Restore olaPower life, do not exceed maxLife
        ola.delete();
    }
    this.delete = function() {
        dots.splice(dots.indexOf(this), 1); // Find this in dots array, remove by splicing
    }
    this.die = function() {
        this.team = 0;
    }

    this.prepare = function() {
        let action = {ola: {object: undefined, priority: 0, force: false}, enemy: {object: undefined, priority: 0, force: false}};
        // Find nearest ola
        let bestDistance = seekDistance*2; // Closest distance so far
        for (let d of dots) {
            let pyDistance = Math.sqrt((d.x - this.x)**2 + (d.y - this.y)**2); // Pythagorean distance to object
            let txDistance = Math.abs(d.x - this.x) + Math.abs(d.y - this.y); // Taxi distance to object
            if (pyDistance <= seekDistance && txDistance <= bestDistance && d.team == 0) { // If an ola is close enough
                bestDistance = txDistance;
                action.ola.object = d;
            }
        }
        if (!action.ola.object) { // If an ola was found
            let lifeOnArrival = this.life - (idleLifeDecrease+moveLifeDecrease)*bestDistance;
            action.ola.priority = map(this.life, panicLifeThreshold, maxLife, 100, 10);
            if (lifeOnArrival <= moveLifeThreshold) {
                action.ola.priority = 0;
            } else if (lifeOnArrival <= panicLifeThreshold) {
                action.ola.force = true;
                action.ola.priority = 100;
            }
        }

        /* === OLD CODE ===

        if (targetType == "ola" || targetType == "enemy") { //TODO: Replace IF with desicion CASE
            this.life--; // Subtract life due to movement
            let newX = this.x;
            let newY = this.y;
            if (Math.random() < 0.5 && target.x != newX) { // "Randomise" movement
                if (newX > target.x) { // Try x first (maybe)
                    newX--;
                } else {
                    newX++;
                }
            } else {
                if (newY > target.y) { // Try y instead
                    newY--;
                } else if (newY < target.y) {
                    newY++;
                } else {
                    if (newX > target.x) { // X fallback
                        newX--;
                    } else {
                        newX++;
                    }
                }
            }
            if (newX == target.x && newY == target.y) { // Eat object if touching
                this.eat(target);
            }
            if (getSpace(newX, newY) == undefined) {
                this.x = newX;
                this.y = newY;
            }
        } else if (this.life > maxLife/6) { // Random movement if strong enough
            if (Math.random() < 2*this.life/maxLife) {
                let newPos = convertDirection(this.x, this.y, Math.floor(Math.random()*4));
                if (getSpace(newPos.x, newPos.y) == undefined) {
                    this.life--; // Subtract life due to movemen
                    this.x = newPos.x;
                    this.y = newPos.y;
                }
            }
        }
        if (this.x < 0) this.x = 0; // Prevent moving out of bounds
        if (this.x >= sizeX) this.x = sizeX-1;
        if (this.y < 0) this.y = 0;
        if (this.y >= sizeY) this.y = sizeY-1; */
    }
    this.act() {
        this.age++;
        this.life -= idleLifeDecrease;
    }
}

// === SPECIFIC FUNCTIONS ===

function createDot(x, y, team) {
    let success = true;
    for (let i of dots) if (i.x == x && i.y == y) success = false;
    if (success) dots.push(new Dot(x, y, team));
    return success;
}

function convertDirection(x, y, direction) {
    let result = {x: x, y: y};
    switch (direction) {
    case 0:
        result.y--;
        break;
    case 1:
        result.x++;
        break;
    case 2:
        result.y++;
        break;
    case 3:
        result.x--;
        break;
    }
    return result;
}

function getDotByID(id) { // Get a dot object by its ID
    let result;
    for (let d of dots) {
        if (d.id == id) result = id;
    }
    return result;
}

function getNewID() { // Call to get a unique ID for any object
    id++;
    return id;
}

function getSpace(x, y) { // Get the contents of a grid square
    let result;
    for (let d of dots) {
        if (d.x == x && d.y == y) result = d;
    }
    return result;
}

function printBoard() {
    let output = "+"+yes("--", sizeX)+"+\n";
    for (let i = 0; i < sizeY; i++) {
        output += "|";
        for (let j = 0; j < sizeX; j++) {
            let index = -1;
            let char = "??";
            let found = false;
            for (let d of dots) {
                if (d.x == j && d.y == i) {
                    found = true;
                    if (d.team == 0) {
                        char = "♯ ";
                    } else if (d.team == 1) {
                        char = pad(Math.floor(d.life/(maxLife/10)), 2, ".");
                    } else if (d.team == 2) {
                        char = pad(Math.floor(d.life/(maxLife/10)), 2, "@");
                    }
                }
            }
            if (!found) {
                char = "  ";
            }
            output += char;
        }
        output += "|\n";
    }
    output += "+"+yes("--", sizeX)+"+";
    console.log(output);
}

// === START ===

createDot(1, 1, 1);
createDot(2, 1, 1);
createDot(1, 2, 1);
createDot(13, 13, 2);
createDot(12, 13, 2);
createDot(13, 12, 2);
createDot(3, 3, 0);
createDot(5, 5, 0);
createDot(7, 7, 0);
createDot(9, 9, 0);
createDot(11, 11, 0);
while (true) {
    printBoard();
    delay(1500);
    let counts = [0, 0, 0];
    for (let d of dots) {
        if (d.team != 0) d.idle();
    }
    if (Math.random() < 0.33) createDot(Math.floor(Math.random()*sizeX), Math.floor(Math.random()*sizeY), 0);
}