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

function delay(ms) {
    sleep.msleep(ms);
}

// === GLOBALS & CONSTANTS ===

let dots = [];
const maxLife = 150;
const seekDistance = 6;
const olaPower = 15;
const sizeX = 15;
const sizeY = 15;

// === CLASSES ===

function Dot(x, y, team) {
    this.x = x;
    this.y = y;
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

    this.idle = function() {
        this.age++;
        // Track nearest ola
        let bestDistance = seekDistance; // Closest distance so far
        let target; // Closest tracked object so far
        let targetType; // Type of closest object
        for (let d of dots) {
            let distance = Math.sqrt((d.x - this.x)**2 + (d.y - this.y)**2); // Pythagorean distance to object
            if (distance <= seekDistance && (distance <= bestDistance || (d.team == 0 && targetType == "enemy"))) { // Logic?
                if (d.team == 0) {
                    bestDistance = distance;
                    target = d;
                    targetType = "ola";
                } else if (d.life <= (maxLife/5) && targetType != "ola" && d.team != this.team) {
                    bestDistance = distance;
                    target = d;
                    targetType = "enemy";
                }
            }
        }
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
        if (this.y >= sizeY) this.y = sizeY-1;
    }
}

// === SPECIFIC FUNCTIONS ===

function createDot(x, y, team) {
    let success = true;
    for (let i of dots) if (i.x == x && i.y == y) success = false;
    if (success) dots.push(new Dot(x, y, team));
    return success;
}

function getSpace(x, y) {
    let result;
    for (let d of dots) {
        if (d.x == x && d.y == y) result = d;
    }
    return result;
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
    /*if (Math.random() < 0.05) {
        let team = Math.floor(Math.random()*2+1);
        if (counts[team] < 3) createDot(Math.floor(Math.random()*10), Math.floor(Math.random()*10), team);
    }*/
}