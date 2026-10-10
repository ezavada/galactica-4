// Combat System for Galactica-4
// Ported from original C++ UShipUtils.cpp and AGalacticThingy.cpp
// Implements multi-target combat with damage rollover mechanics

// PDG is available globally in the PDG environment
const Common = require('./common.js');
const I18n = require('./i18n.js');

class CombatSystem {
    constructor(game) {
        this.game = game;
    }

    isStar(entity) {
        if (!entity) return false;
        if (typeof entity.isStar === 'function') {
            return entity.isStar();
        }
        return !!(this.game && this.game.factory && this.game.factory.isStar(entity));
    }

    isShip(entity) {
        return !!(entity && this.game && this.game.factory && this.game.factory.isShip(entity));
    }

    isFleet(entity) {
        if (!entity) return false;
        if (typeof entity.isFleet === 'function' && entity.isFleet()) {
            return true;
        }
        return !!(this.game && this.game.factory && this.game.factory.isFleet(entity));
    }

    isAliveCombatant(entity) {
        if (!entity) return false;
        if (entity.underConstruction && entity.underConstruction()) return false;
        if (entity.isDead && entity.isDead()) return false;
        return true;
    }

    isFriendlyTo(ownerId, entity) {
        if (!entity || !ownerId) return true;
        if (!entity.owner) return true;
        if (entity.owner === ownerId) return true;
        if (entity.isAllyOf && entity.isAllyOf(ownerId)) return true;
        if (this.game && this.game.isOwnerAlliedWith) {
            return this.game.isOwnerAlliedWith(ownerId, entity.owner);
        }
        return false;
    }

    isEnemyOf(ownerId, entity) {
        return !!(entity && entity.owner > 0 && !this.isFriendlyTo(ownerId, entity));
    }

    uniqueEntities(entities) {
        const unique = [];
        for (const entity of entities || []) {
            if (entity && !unique.includes(entity)) {
                unique.push(entity);
            }
        }
        return unique;
    }

    getCombatants(entity) {
        if (!entity) return [];

        while(entity.fleet)entity=entity.fleet;
        if (this.isFleet(entity)) {
            return this.uniqueEntities(entity.getLeafShips ? entity.getLeafShips() : entity.ships || []).filter(ship => this.isAliveCombatant(ship));
        }

        if (entity.fleet && this.isFleet(entity.fleet)) {
            return this.uniqueEntities(entity.fleet.getLeafShips ? entity.fleet.getLeafShips() : entity.fleet.ships || []).filter(ship => this.isAliveCombatant(ship));
        }

        return this.isAliveCombatant(entity) ? [entity] : [];
    }

    collectSpaceDefenders(destination, attackerOwner, attackerCombatants) {
        const attackers = new Set(attackerCombatants);
        const defenders = [];
        const addDefender = (entity) => {
            if (!entity || attackers.has(entity) || !this.isAliveCombatant(entity)) {
                return;
            }
            if (this.isFleet(entity)) {
                for (const member of this.getCombatants(entity)) addDefender(member);
            } else if (this.isEnemyOf(attackerOwner, entity)) {
                defenders.push(entity);
            }
        };

        if (this.isStar(destination)) {
            for (const ship of destination.getLeafShips ? destination.getLeafShips() : destination.ships || []) {
                addDefender(ship);
            }
            for (const satellite of destination.defenseSatellites || []) {
                addDefender(satellite);
            }
        } else if (this.isFleet(destination)) {
            for (const ship of this.getCombatants(destination)) {
                addDefender(ship);
            }
        } else {
            const destinationFleet = destination && destination.fleet;
            if (destinationFleet && this.isFleet(destinationFleet)) {
                for (const ship of this.getCombatants(destinationFleet)) {
                    addDefender(ship);
                }
            } else {
                addDefender(destination);
            }
        }

        return this.uniqueEntities(defenders);
    }

    isEnemyOwnedStar(destination, attackerOwner) {
        if (!this.isStar(destination)) {
            return false;
        }
        if (destination.owner > 0) {
            return this.isEnemyOf(attackerOwner, destination);
        }
        return !!(destination.isOwned && destination.isOwned() &&
            (!destination.isAllyOf || !destination.isAllyOf(attackerOwner)));
    }

    shouldResolveCombat(attacker, destination) {
        if (!attacker || !destination || !attacker.owner) {
            return false;
        }

        const attackerCombatants = this.getCombatants(attacker);
        if (attackerCombatants.length === 0) {
            return false;
        }

        if (this.collectSpaceDefenders(destination, attacker.owner, attackerCombatants).length > 0) {
            return true;
        }

        return this.isEnemyOwnedStar(destination, attacker.owner);
    }

    // Main combat resolution loop - ported from UShipUtils.cpp:205-275
    attackLoop(attackers, attackersReserves, defenders, defendersReserves) {
        let done = false;
        let haveWinner = false;
        let attacker;
        let defender;
        let numDefenders = defenders.filter(entity => this.isAliveCombatant(entity)).length +
            defendersReserves.filter(entity => this.isAliveCombatant(entity)).length;
        let iterationCount = 0;
        const maxIterations = 100; // Prevent infinite loops
        
        // Choose attacker source (regular forces or reserves)
        let attackerSource = attackers.some(entity => this.isAliveCombatant(entity)) ? attackers : attackersReserves;
        let attackerIndex = 0;
        
        if (!attackerSource.some(entity => this.isAliveCombatant(entity))) {
            console.log("No attackers remain");
            return true; // No attackers, battle must be over
        }

        if (numDefenders <= 0) {
            return true;
        }
        
        let defenderIndex = 0;
        let reserveDefenderIndex = 0;

        const nextAliveDefender = () => {
            if (defenders.some(entity => this.isAliveCombatant(entity))) {
                for (let attempts = 0; attempts < defenders.length; attempts++) {
                    if (defenderIndex >= defenders.length) {
                        defenderIndex = 0; // Wrap around
                        console.log("Attacked all defenders, wrapping around");
                    }
                    const candidate = defenders[defenderIndex];
                    defenderIndex++;
                    if (this.isAliveCombatant(candidate)) {
                        console.log("Taking defender from regular forces");
                        return candidate;
                    }
                }
            }

            if (defendersReserves.some(entity => this.isAliveCombatant(entity))) {
                for (let attempts = 0; attempts < defendersReserves.length; attempts++) {
                    if (reserveDefenderIndex >= defendersReserves.length) {
                        reserveDefenderIndex = 0; // Wrap around
                        console.log("Attacked all defending reserves, wrapping around");
                    }
                    const candidate = defendersReserves[reserveDefenderIndex];
                    reserveDefenderIndex++;
                    if (this.isAliveCombatant(candidate)) {
                        console.log("Taking defender from reserves forces");
                        return candidate;
                    }
                }
            }

            return null;
        };
        
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
            if (!this.isAliveCombatant(attacker)) {
                continue;
            }
            
            if (!done) {
                let extraDamage = 0;
                // Ships can hit number of targets equal to 1/2 their tech level
                let targets = Math.floor((attacker.techLevel || 1) / 2);
                // If targets is zero, ship still gets 1 attack
                if (!Number.isFinite(targets) || targets < 1) targets = 1;
                
                console.log(`${attacker.type} attacking up to ${targets} targets`);
                
                do {
                    defender = nextAliveDefender();
                    if (!defender) {
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
            if (this.isFriendlyTo(ownerId, entity)) {
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

    runBattle(attackingForces, defendingForces, options = {}) {
        const attackers = this.uniqueEntities(attackingForces).filter(entity => this.isAliveCombatant(entity));
        const defenders = this.uniqueEntities(defendingForces).filter(entity => this.isAliveCombatant(entity));
        const initialAttackers = [...attackers];
        const initialDefenders = [...defenders, ...(options.extraDefenderReserves || [])];
        const attackersReserves = [];
        const defendersReserves = [];
        const attackersFleets = [];
        const defendersFleets = [];

        this.sortOutReserves(attackers, attackersReserves, attackersFleets);
        this.sortOutReserves(defenders, defendersReserves, defendersFleets);

        for (const reserve of options.extraDefenderReserves || []) {
            if (this.isAliveCombatant(reserve) && !defendersReserves.includes(reserve)) {
                defendersReserves.push(reserve);
            }
        }

        let done = false;
        let count = 100;
        const defendersCount = defenders.length + defendersReserves.length;

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
        }

        const attackerSurvivors = initialAttackers.filter(entity => this.isAliveCombatant(entity));
        const defenderSurvivors = initialDefenders.filter(entity => this.isAliveCombatant(entity));

        return {
            attackerSurvivors,
            defenderSurvivors,
            attackersLost: initialAttackers.length - attackerSurvivors.length,
            defendersLost: initialDefenders.length - defenderSurvivors.length,
            attackerFleets: attackersFleets,
            defenderFleets: defendersFleets
        };
    }

    cleanupDeadEntities(entities, opponentOwner) {
        let removed = 0;
        for (const entity of this.uniqueEntities(entities)) {
            if (!entity || !entity.isDead || !entity.isDead()) {
                continue;
            }

            if (this.isShip(entity)) {
                if (this.game && this.game.removeDestroyedShip) {
                    if (this.game.removeDestroyedShip(entity, opponentOwner)) {
                        removed++;
                    }
                } else if (entity.destroyedInCombat) {
                    entity.destroyedInCombat(opponentOwner);
                    removed++;
                }
            } else if (this.isFleet(entity)) {
                if (this.game && this.game.removeDestroyedFleet && this.game.removeDestroyedFleet(entity, opponentOwner)) {
                    removed++;
                }
            }
        }
        return removed;
    }

    cleanupEmptyFleets(opponentOwner, opponentsByOwner = null) {
        if (!this.game || !this.game.allFleets) {
            return;
        }

        for (const fleet of [...this.game.allFleets]) {
            if (fleet.removeDeadShips) {
                fleet.removeDeadShips();
            }
            if (fleet.isEmpty && fleet.isEmpty()) {
                this.game.removeDestroyedFleet(fleet, opponentsByOwner && opponentsByOwner.has(fleet.owner)
                    ? opponentsByOwner.get(fleet.owner) : opponentOwner);
            } else if (fleet.calculateFleetStats) {
                fleet.calculateFleetStats();
            }
        }
    }

    getCombatLocationLabel(destination) {
        if (!destination) {
            return I18n.getString(639, 'target');
        }
        if (destination.name) {
            return destination.name;
        }
        if (this.isFleet(destination)) {
            return I18n.formatString(560, 'Fleet {0}', destination.id || '');
        }
        if (destination.x !== undefined && destination.y !== undefined) {
            return `(${Math.round(destination.x)}, ${Math.round(destination.y)})`;
        }
        return I18n.getString(639, 'target');
    }

    getCombatOutcome(destination, attackerOwner, attackerSurvivors, defenderSurvivors) {
        const attackersAlive = attackerSurvivors.length > 0;
        const defendersAlive = defenderSurvivors.length > 0;

        if (this.isStar(destination)) {
            const destinationStillEnemy = this.isEnemyOwnedStar(destination, attackerOwner);
            if (attackersAlive && !destinationStillEnemy) {
                return {
                    attackersWon: true,
                    defendersWon: false,
                    label: I18n.getString(648, 'attacker victory')
                };
            }
            if (destinationStillEnemy || (!attackersAlive && defendersAlive)) {
                return {
                    attackersWon: false,
                    defendersWon: true,
                    label: I18n.getString(649, 'defender victory')
                };
            }
        } else {
            if (attackersAlive && !defendersAlive) {
                return {
                    attackersWon: true,
                    defendersWon: false,
                    label: I18n.getString(648, 'attacker victory')
                };
            }
            if (!attackersAlive && defendersAlive) {
                return {
                    attackersWon: false,
                    defendersWon: true,
                    label: I18n.getString(649, 'defender victory')
                };
            }
        }

        return {
            attackersWon: false,
            defendersWon: false,
            label: I18n.getString(650, 'inconclusive')
        };
    }

    dislodgeAttackersFromHostileStar(destination, attackerOwner, attackerSurvivors) {
        if (!this.isStar(destination) || !this.isEnemyOwnedStar(destination, attackerOwner)) {
            return;
        }

        for (const entity of attackerSurvivors) {
            if (this.isShip(entity) && entity.star === destination) {
                destination.removeShip(entity);
                entity.star = null;
                entity.x = destination.x;
                entity.y = destination.y;
                if (entity.updateSpatialLocation) {
                    entity.updateSpatialLocation();
                }
            }
        }
    }

    recordCombatSummary(destination, outcome, forces, casualties) {
        if (!this.game || typeof this.game.recordEvent !== 'function') return;
        const location=this.getCombatLocationLabel(destination);
        for(const [owner,force] of forces) {
            const won=force.side==='attacker'?outcome.attackersWon:outcome.defendersWon;
            const lost=force.side==='attacker'?outcome.defendersWon:outcome.attackersWon;
            const ownLosses=casualties.filter(ship=>ship.owner===owner).length;
            const enemyLosses=casualties.filter(ship=>force.side==='attacker'?ship.owner!==owner:ship.owner===force.attackerOwner).length;
            const event=this.game.recordEvent(I18n.getString(607,'Combat'),
                I18n.formatString(won?926:lost?927:928,'',location,force.name,ownLosses,enemyLosses),
                {type:Common.EventType.BATTLE_RESOLVED,recipient:owner,subject:force.subject,position:destination});
            // Retain the battle-time figures, independent of later repairs, grouping or destruction.
            event.combat={side:force.side,result:won?'won':lost?'lost':'inconclusive',forceName:force.name,
                ownShipsLost:ownLosses,enemyShipsLost:enemyLosses,location};
            if(typeof this.game.queueReport==='function')this.game.queueReport(event);
        }
    }

    // Resolve combat between attackers and defenders
    resolveCombat(attacker, destination) {
        if (!attacker || !destination) {
            return null;
        }

        console.log(`Resolving combat for ${attacker.type || 'fleet'} at ${destination.name || 'location'}`);

        const attackerOwner = attacker.owner;
        const originalDestinationOwner = destination.owner || 0;
        const attackerCombatants = this.getCombatants(attacker);
        const spaceDefenders = this.collectSpaceDefenders(destination, attackerOwner, attackerCombatants);

        if (attackerCombatants.length === 0) {
            return {
                attackersWon: false,
                defendersWon: spaceDefenders.length > 0,
                attackersLost: 0,
                defendersLost: 0,
                hasColony: false,
                canColonize: false
            };
        }

        const forces=new Map();
        const addForce=(owner,subject,side)=>{
            if(owner>0&&!forces.has(owner))forces.set(owner,{subject,side,attackerOwner,
                name:subject.name || (typeof this.game.getObjectDisplayName==='function'?this.game.getObjectDisplayName(subject):this.getCombatLocationLabel(subject))});
        };
        addForce(attackerOwner,attacker,'attacker');
        if(this.isEnemyOf(attackerOwner,destination))addForce(originalDestinationOwner,destination,'defender');
        for(const ship of spaceDefenders) {
            let root=ship;while(root.fleet)root=root.fleet;
            addForce(ship.owner,root,'defender');
        }

        // Preserve opposing owners before casualties detach ships from their fleets.
        const opponentsByOwner = new Map();
        opponentsByOwner.set(attackerOwner, spaceDefenders.length > 0
            ? spaceDefenders[0].owner : originalDestinationOwner);
        for (const ship of spaceDefenders) opponentsByOwner.set(ship.owner, attackerOwner);

        let spaceResult;
        if (spaceDefenders.length > 0) {
            spaceResult = this.runBattle(attackerCombatants, spaceDefenders);
            this.cleanupDeadEntities(attackerCombatants, spaceDefenders[0] ? spaceDefenders[0].owner : 0);
            this.cleanupDeadEntities(spaceDefenders, attackerOwner);
        } else {
            console.log(`${destination.name || 'Destination'} is undefended, skipping space battle`);
            spaceResult = {
                attackerSurvivors: attackerCombatants.filter(entity => this.isAliveCombatant(entity)),
                defenderSurvivors: [],
                attackersLost: 0,
                defendersLost: 0
            };
        }

        let attackerSurvivors = spaceResult.attackerSurvivors.filter(entity => this.isAliveCombatant(entity));
        let defenderSurvivors = spaceResult.defenderSurvivors.filter(entity => this.isAliveCombatant(entity));
        let groundResult = null;
        let starNeutralized = false;
        let populationCasualties = 0;

        if (attackerSurvivors.length > 0 &&
                defenderSurvivors.length === 0 &&
                this.isEnemyOwnedStar(destination, attackerOwner)) {
            const startingPopulation = destination.population || 0;
            console.log(`Resolving ground combat at ${destination.name}`);
            opponentsByOwner.set(attackerOwner, destination.owner || originalDestinationOwner);
            groundResult = this.runBattle(attackerSurvivors, [], { extraDefenderReserves: [destination] });
            this.cleanupDeadEntities(attackerSurvivors, destination.owner || originalDestinationOwner);

            const defeatedPopulation = Math.max(0, startingPopulation - Math.max(0, destination.population || 0));
            if (defeatedPopulation > 0) {
                const casualties = Math.floor(defeatedPopulation / 10) + 1;
                populationCasualties = casualties;
                destination.population = Math.max(0, startingPopulation - casualties);
            }

            if (groundResult.defenderSurvivors.length === 0 || destination.owner === 0) {
                destination.owner = 0;
                starNeutralized = true;
                if (destination.clearDefaultDestination) {
                    destination.clearDefaultDestination();
                }
            }

            attackerSurvivors = groundResult.attackerSurvivors.filter(entity => this.isAliveCombatant(entity));
            defenderSurvivors = groundResult.defenderSurvivors.filter(entity => this.isAliveCombatant(entity));
        }

        const casualties=[...attackerCombatants,...spaceDefenders].filter(entity=>this.isShip(entity)&&!this.isAliveCombatant(entity));

        if (starNeutralized && this.game && this.game.recordOccupationReports)
            this.game.recordOccupationReports(destination, attackerOwner, originalDestinationOwner, 'defendersLost');

        const survivingColony = attackerSurvivors.find(entity => entity.type === 'colony');
        const canColonize = !!(survivingColony && this.isStar(destination) && destination.owner === 0);
        if (canColonize && this.game && this.game.colonizeStar) {
            this.game.colonizeStar(destination, survivingColony, originalDestinationOwner);
        }

        this.dislodgeAttackersFromHostileStar(destination, attackerOwner, attackerSurvivors);
        this.cleanupEmptyFleets(attackerOwner, opponentsByOwner);

        const attackersLost = spaceResult.attackersLost + (groundResult ? groundResult.attackersLost : 0);
        const defendersLost = spaceResult.defendersLost + (groundResult ? groundResult.defendersLost : 0);
        const finalOutcome = this.getCombatOutcome(destination, attackerOwner, attackerSurvivors, defenderSurvivors);
        this.recordCombatSummary(destination, finalOutcome, forces, casualties);

        if (this.game && typeof this.game.updatePlayerPieceCounts === 'function') {
            this.game.updatePlayerPieceCounts();
        }

        console.log("Finished Combat");

        return {
            attackersWon: finalOutcome.attackersWon,
            defendersWon: finalOutcome.defendersWon,
            attackersLost,
            defendersLost,
            hasColony: !!survivingColony,
            canColonize,
            destinationOwner: destination.owner,
            starNeutralized,
            populationCasualties
        };
    }
}

module.exports = CombatSystem;
