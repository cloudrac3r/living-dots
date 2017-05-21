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
const moveLifeThreshold = 50;
const panicLifeThreshold = 120;
const attackLifeThreshold = 300;
const maxLife = 500;
const olaPower = 50;
const startLife = 450;

const seekDistance = 6;
const sizeX = 15;
const sizeY = 15;

const debugMessages = false;

// === CLASSES ===

function Dot(x, y, team) {
    this.x = x;
    this.y = y;
    this.id = getNewID();
    this.team = team; // Team number or 0 for ola
    this.life = maxLife;
    this.age = 0;
    this.target;

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
        // Find nearby objects
        for (let d of dots) {
            let thisAction = {id: this.id, targetid: undefined, targetTeam: undefined, priority: 0, force: false};
            let pyDistance = Math.sqrt((d.x - this.x)**2 + (d.y - this.y)**2); // Pythagorean distance to object
            let txDistance = Math.abs(d.x - this.x) + Math.abs(d.y - this.y); // Taxi distance to object
            let lifeOnArrival = this.life - (idleLifeDecrease+moveLifeDecrease)*txDistance;
            if (pyDistance <= seekDistance) {
                if (d.team == 0) {
                    thisPriority = map(lifeOnArrival, panicLifeThreshold, maxLife, 100, 10); // Map arrival life to priority
                    if (lifeOnArrival <= panicLifeThreshold) {
                        thisAction.force = true; // Try to get there even if told not to
                        thisAction.priority = 100;
                    }
                }/* else { //TODO: Deal with enemies
                    thisPriority = map(lifeOnArrival, panicLifeThreshold, maxLife, 0, 50); // Map arrival life to priority
                    thisPriority += map(d.life, moveLifeThreshold, maxLife, 50, 0); // Map enemy life to priority
                    if (lifeOnArrival <= panicLifeThreshold) {
                        thisAction.priority = 0; // If it's too dangerous, don't try
                    }
                }*/
                if (lifeOnArrival <= moveLifeThreshold) {
                    thisPriority = 0; // If it can't get there, don't try
                }
                thisAction.priority = thisPriority;
                thisAction.targetid = d.id;
                thisAction.targetTeam = d.team;
                //if (d.team != this.team) { // Hack to prevent targeting teammates
                if (d.team == 0) { //TODO: Deal with enemies
                    messages[this.team-1].push(thisAction);
                }
            }
        }
    }

    this.agree = function() {
        let sortedActions = messages[this.team-1].slice(); // Copy messages array
        for (let i = 0; i < sortedActions.length; i++) { // Sort copy of messages array
            for (let j = 0; j < sortedActions.length-1; j++) {
                if (sortedActions[j].priority < sortedActions[j+1].priority) {
                    let t = sortedActions[j];
                    sortedActions[j] = sortedActions[j+1];
                    sortedActions[j+1] = t;
                }
            }
        }
        let finalActions = {}; /* format = {4: {id: 4, targetid: 0, … }, 2: {id: 2, targetid: 5, … }}
                                           |id | action object        |  id | action object        | */
        if (debugMessages) console.log(JSON.stringify(sortedActions, null, 2));
        for (let i = 0; i < sortedActions.length; i++) {
            if (finalActions[sortedActions[i].id] == undefined) { // No action for this object yet
                let taken = false; // Has target already been taken?
                for (let f in finalActions) {
                    if (finalActions[f].targetid == sortedActions[i].targetid) taken = true;
                }
                if (!taken) { // Register target if available
                    if (debugMessages) console.log(sortedActions[i].id+": targeting "+sortedActions[i].targetid);
                    finalActions[sortedActions[i].id] = sortedActions[i];
                } else { // Log failure
                    if (debugMessages) console.log(sortedActions[i].id+": not targeting "+sortedActions[i].targetid+" (target taken)");
                }
            } else { // Object already has an action
                if (debugMessages) console.log(sortedActions[i].id+": not targeting "+sortedActions[i].targetid+" (already have action)");
            }
        }
        if (finalActions[this.id] != undefined) { // If target found,
            this.target = getDotByID(finalActions[this.id].targetid); // prepare to move to it
            if (debugMessages) console.log(JSON.stringify(this.target));
        } else { // otherwise,
            this.target = undefined; // mark no move
        }
    }

    this.act = function() {
        this.age++; // Idle stat changes
        this.life -= idleLifeDecrease;
        if (this.target != undefined && this.life >= moveLifeThreshold) { // If dot can move
            if (debugMessages) console.log(this.id+": can move ("+JSON.stringify(this.target)+")");
            let clear = false;
            let attempts = 3;
            let newPos = {x: undefined, y: undefined}; // Stores position attempted to move to
            while (!clear && attempts > 0) { // Try to move towards target
                attempts--;
                newPos = moveTowards(this.x, this.y, this.target.x, this.target.y);
                if (getSpace(newPos.x, newPos.y) == undefined || getSpace(newPos.x, newPos.y).id == this.target.id) clear = true; // Is space clear?
                if (clear) {
                    if (debugMessages) console.log(this.id+": space ("+newPos.x+", "+newPos.y+") is clear");
                } else {
                    if (debugMessages) console.log(this.id+": space is not clear, "+attempts+" attempts left");
                }
            }
            if (clear) {
                this.x = newPos.x; // Set position to target. Finally.
                this.y = newPos.y;
                if (debugMessages) console.log(this.id+": moved to ("+this.x+", "+this.y+") !!");
                this.life -= moveLifeDecrease;
                if (this.x == this.target.x && this.y == this.target.y) { // Eat object if touching
                    this.eat(this.target);
                }
            }
        } else {
            if (debugMessages) console.log(this.id+": can not move ("+this.target+", "+this.life+")");
        }
    }
}

// === SPECIFIC FUNCTIONS ===

function createDot(x, y, team) {
    let success = true;
    for (let i of dots) if (i.x == x && i.y == y) success = false;
    if (success) dots.push(new Dot(x, y, team));
    return success;
}

function convertDirection(x, y, direction) { // Converts a number from 0-3 to coordinates
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
        if (d.id == id) result = d;
    }
    return result;
}

function getNewID() { // Call to get a unique ID for any object
    nextID++;
    return nextID;
}

function getSpace(x, y) { // Get the contents of a grid square
    let result;
    for (let d of dots) {
        if (d.x == x && d.y == y) result = d;
    }
    return result;
}

function moveTowards(currentX, currentY, targetX, targetY) { // Return a position one space away from the origin, in the direction of the target
    if (debugMessages) console.log("trying to get from ("+currentX+", "+currentY+") to ("+targetX+", "+targetY+")");
    let newPos = {x: currentX, y: currentY};
    if (Math.random() < 0.5 && targetX != newPos.x) { // "Randomise" movement
        if (newPos.x > targetX) { // Try x first (maybe)
            newPos.x--;
        } else {
            newPos.x++;
        }
    } else {
        if (newPos.y > targetY) { // Try y instead
            newPos.y--;
        } else if (newPos.y < targetY) {
            newPos.y++;
        } else {
            if (newPos.x > targetX) { // x fallback
                newPos.x--;
            } else {
                newPos.x++;
            }
        }
    }
    return newPos;
}

function printBoard() { //TODO: Make a better way of displaying stuff
    let output = "\n+"+yes("--", sizeX)+"+\n";
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

/*
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
*/

createDot(4, 6, 0);
createDot(5, 5, 0);
createDot(4, 3, 1);
createDot(6, 2, 1);

while (true) {
    printBoard();
    delay(1500);
    let messages = genSuperArray(teams);
    for (let d of dots) {
        if (d.team != 0) d.prepare();
    }
    for (let d of dots) {
        if (d.team != 0) d.agree();
    }
    for (let d of dots) {
        if (d.team != 0) d.act();
    }
    if (Math.random() < 0.20) createDot(Math.floor(Math.random()*sizeX), Math.floor(Math.random()*sizeY), 0);
}