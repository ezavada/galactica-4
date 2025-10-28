// Combat System for Galactica-4
// Ported from original C++ UShipUtils.cpp and AGalacticThingy.cpp
// Implements multi-target combat with damage rollover mechanics

// PDG is available globally in the PDG environment

class CombatSystem {
    constructor(game) {
        this.game = game;
    }
    
    // Main combat resolution loop - ported from UShipUtils.cpp:205-275
    attackLoop(attackers, attackersReserves, defenders, defendersReserves) {
        let done = false;
        let haveWinner = false;
        let attacker;
        let defender;
        let numDefenders = defenders.length + defendersReserves.length;
        let iterationCount = 0;
        const maxIterations = 100; // Prevent infinite loops
        
        // Choose attacker source (regular forces or reserves)
        let attackerSource = attackers.length > 0 ? attackers : attackersReserves;
        let attackerIndex = 0;
        
        if (attackerSource.length === 0) {
            console.log("No attackers remain");
            return true; // No attackers, battle must be over
        }
        
        let defenderIndex = 0;
        let reserveDefenderIndex = 0;
        
        while (!done && iterationCount < maxIterations) {
            iterationCount++;
            console.log(`Start Battle Loop, Iteration ${iterationCount}`);
            
            // Get next attacker
            if (attackerIndex >= attackerSource.length) {
                console.log("Completed Attack Loop");
                done = true;
                continue;
            }
            
            attacker = attackerSource[attackerIndex];
            attackerIndex++;
            
            if (!done) {
                let extraDamage = 0;
                // Ships can hit number of targets equal to 1/2 their tech level
                let targets = Math.floor(attacker.techLevel / 2);
                // If targets is zero, ship still gets 1 attack
                if (targets === 0) targets = 1;
                
                console.log(`${attacker.type} attacking up to ${targets} targets`);
                
                do {
                    // Get next defender
                    if (defenders.length > 0) {
                        console.log("Taking defender from regular forces");
                        if (defenderIndex >= defenders.length) {
                            defenderIndex = 0; // Wrap around
                            console.log("Attacked all defenders, wrapping around");
                        }
                        defender = defenders[defenderIndex];
                        defenderIndex++;
                    } else if (defendersReserves.length > 0) {
                        console.log("Taking defender from reserves forces");
                        if (reserveDefenderIndex >= defendersReserves.length) {
                            reserveDefenderIndex = 0; // Wrap around
                            console.log("Attacked all defending reserves, wrapping around");
                        }
                        defender = defendersReserves[reserveDefenderIndex];
                        reserveDefenderIndex++;
                    } else {
                        done = true;
                        haveWinner = true;
                        console.log("Defenders are wiped out");
                        break;
                    }
                    
                    if (!done) {
                        // Do battle
                        const wasDead = defender.isDead ? defender.isDead() : false;
                        console.log(`${defender.type} defending against ${attacker.type}`);
                        
                        extraDamage = this.defendAgainst(attacker, defender, 100, extraDamage);
                        
                        if (!wasDead && (defender.isDead ? defender.isDead() : false)) {
                            numDefenders--;
                            console.log(`${defender.type} was killed by ${attacker.type}, ${numDefenders} remain`);
                            if (numDefenders <= 0) {
                                done = true;
                                haveWinner = true;
                                console.log("Defenders are wiped out");
                            }
                        }
                        targets--;
                    }
                } while (!done && extraDamage > 0 && targets > 0);
            }
        }
        
        if (iterationCount >= maxIterations) {
            console.log("Combat loop exceeded maximum iterations, ending battle");
        }
        
        console.log("Finished Combat");
        return haveWinner;
    }
    
    // Damage calculation and application - ported from AGalacticThingy.cpp:818-845
    defendAgainst(attacker, defender, weighting = 100, rolloverDamage = 0) {
        if (!attacker || !defender) {
            return 0;
        }
        
        let damage;
        if (rolloverDamage > 0) {
            // Use rollover damage from previous attack
            damage = rolloverDamage;
        } else {
            // Calculate new attack damage
            damage = Math.floor((attacker.getOneAttackAgainst(defender) * weighting) / 100);
        }
        
        if (damage < 0) {
            console.log("Attacker did negative damage!");
            damage = 0;
        }
        
        if (defender.isDead && defender.isDead()) {
            return damage;
        }
        
        const extraDamage = defender.takeDamage ? defender.takeDamage(damage) : 0;
        
        console.log(`${defender.type} took ${damage} damage from ${attacker.type}; ${extraDamage} points will rollover`);
        
        if (defender.getDefenseStrength && defender.getDefenseStrength() < 0) {
            // Defender was killed
            if (defender.destroyedInCombat) {
                defender.destroyedInCombat(attacker.owner);
            }
        }
        
        return extraDamage;
    }
    
    // Sort out reserves - ported from UShipUtils.cpp:181-202
    sortOutReserves(forces, reserves, fleets) {
        const regularForces = [];
        const reserveForces = [];
        const fleetForces = [];
        
        for (const entity of forces) {
            if (entity.type === 'scout' || entity.type === 'colony') {
                console.log(`Put ${entity.type} on reserve`);
                reserveForces.push(entity);
            } else if (entity.isFleet && entity.isFleet()) {
                console.log(`Removing ${entity.type} from forces`);
                if (entity.recordCombatInfo) {
                    entity.recordCombatInfo();
                }
                fleetForces.push(entity);
            } else {
                regularForces.push(entity);
            }
        }
        
        // Update the arrays
        forces.length = 0;
        forces.push(...regularForces);
        
        reserves.length = 0;
        reserves.push(...reserveForces);
        
        fleets.length = 0;
        fleets.push(...fleetForces);
    }
    
    // Remove dead entities - ported from UShipUtils.cpp:278-287
    removeDead(forces) {
        const aliveForces = forces.filter(entity => {
            const isDead = entity.isDead ? entity.isDead() : false;
            if (isDead) {
                console.log(`${entity.type} is dead, removed from forces`);
            }
            return !isDead;
        });
        
        forces.length = 0;
        forces.push(...aliveForces);
    }
    
    // Remove allies from forces - ported from UShipUtils.cpp:289-308
    removeAllies(forces, ownerId) {
        let numAllies = 0;
        let defender = 0;
        
        const enemyForces = forces.filter(entity => {
            if (entity.owner === 0 || (entity.isAllyOf && entity.isAllyOf(ownerId))) {
                console.log(`${entity.type} is an ally of player ${ownerId}, removed from forces`);
                numAllies++;
                return false;
            } else {
                defender = entity.owner;
                console.log(`${entity.type} is an enemy of player ${ownerId}`);
                return true;
            }
        });
        
        console.log(`Removed ${numAllies} allies of player ${ownerId} from defense forces`);
        
        forces.length = 0;
        forces.push(...enemyForces);
        
        return defender;
    }
    
    // Check if forces contain a specific ship class
    hasShipClass(forces, shipClass) {
        if (!forces) return false;
        
        return forces.some(entity => {
            if (entity.type === shipClass) {
                console.log(`${entity.type} is of the desired class (${shipClass})`);
                return true;
            }
            return false;
        });
    }
    
    // Finalize losses in fleets - ported from UShipUtils.cpp:398-429
    finalizeLosses(fleets, opponentPlayerNum) {
        let numDead = 0;
        
        for (const fleet of fleets) {
            if (fleet.isFleet && fleet.isFleet()) {
                console.log(`Removing dead sub-fleets from ${fleet.type}`);
                
                if (fleet.removeDead) {
                    fleet.removeDead();
                }
                
                if (fleet.recordCombatResults) {
                    fleet.recordCombatResults();
                }
                
                const startingShips = fleet.getSize ? fleet.getSize() : 0;
                const remainingShips = fleet.getSize ? fleet.getSize() : 0;
                numDead -= (startingShips - remainingShips);
                
                if (remainingShips < 1) {
                    // Fleet is destroyed
                    if (fleet.destroyedInCombat) {
                        fleet.destroyedInCombat(opponentPlayerNum);
                    }
                }
            }
        }
        
        return numDead;
    }
    
    // Resolve combat between attackers and defenders
    resolveCombat(attacker, destination) {
        console.log(`Resolving combat for ${attacker.type} at ${destination.name || 'location'}`);
        
        // Create combat participant lists
        const attackers = [];
        const defenders = [];
        const attackersReserves = [];
        const defendersReserves = [];
        const attackersFleets = [];
        const defendersFleets = [];
        
        // Add attacker to attackers list
        attackers.push(attacker);
        
        // Add defenders from destination
        if (destination.ships) {
            defenders.push(...destination.ships);
        }
        
        // Remove allies from defenders
        const defenderOwner = this.removeAllies(defenders, attacker.owner);
        
        // Sort out reserves and fleets
        this.sortOutReserves(attackers, attackersReserves, attackersFleets);
        this.sortOutReserves(defenders, defendersReserves, defendersFleets);
        
        const defendersCount = defenders.length + defendersReserves.length;
        
        // Resolve space combat
        let done = false;
        let count = 100; // Prevent infinite loops
        
        if (defendersCount > 0) {
            while (!done && count-- > 0) {
                console.log(`Start Battle Loop, Iteration ${100 - count}`);
                const done1 = this.attackLoop(attackers, attackersReserves, defenders, defendersReserves);
                const done2 = this.attackLoop(defenders, defendersReserves, attackers, attackersReserves);
                done = (done1 || done2);
                
                this.removeDead(attackers);
                this.removeDead(defenders);
                this.removeDead(attackersReserves);
                this.removeDead(defendersReserves);
            }
        } else {
            console.log(`${destination.name || 'Destination'} is undefended, skipping space battle`);
        }
        
        // Handle ground combat if attacking a star
        let hasColony = false;
        if ((attackers.length + attackersReserves.length) > 0 && 
            destination.isStar && destination.isStar() && 
            destination.isOwned && destination.isOwned() && 
            !destination.isAllyOf(attacker.owner)) {
            
            hasColony = this.hasShipClass(attackersReserves, 'colony');
            // TODO: Implement ground combat vs population
        }
        
        // Finalize fleet losses
        const attackersInFleetLosses = this.finalizeLosses(attackersFleets, defenderOwner);
        const defendersInFleetLosses = this.finalizeLosses(defendersFleets, attacker.owner);
        
        console.log("Finished Combat");
        
        // Return combat result
        return {
            attackersWon: (attackers.length + attackersReserves.length) > 0,
            defendersWon: (defenders.length + defendersReserves.length) > 0,
            attackersLost: attackersInFleetLosses,
            defendersLost: defendersInFleetLosses,
            hasColony: hasColony,
            canColonize: hasColony && !destination.isOwned()
        };
    }
}

module.exports = CombatSystem;
