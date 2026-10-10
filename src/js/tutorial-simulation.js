// Scripted production used by the original tutorial, never by ordinary games.
// Sources: GalacticaSingleDoc::DoEndTurn, CStar::EndOfTurn/BuildNewShip.
class TutorialSimulation {
    beforeEndTurn(game) {
        if (game.turn < 2 || game.turn >= 14) return;
        const home=game.stars.find(star=>star.id===2);
        if (!home) return;
        for (const [key,value] of [['growth',33.4],['shipBuilding',33.3],['research',33.3]]) {
            home[key].value=value;
            home[key].desired=value;
        }
    }

    prepareShipPayment(star, amount) {
        if (!(amount>0) || !star.currentShip) return;
        const turn=star.game.turn;
        if (star.id===2 && [3,4,8].includes(turn) || star.id===9 && turn===8) {
            // The source guarantees the selected hull, not a hard-coded type.
            star.paidTowardShipBuilding=star.currentShip.cost+0.1;
        }
    }

    chooseNextComputerHull() {
        return 'battleship';
    }
}
module.exports=TutorialSimulation;
