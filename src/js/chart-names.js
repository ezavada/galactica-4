// Public star-chart labels are independent of ownership/economy visibility.
const Common=require('./common.js'),I18n=require('./i18n.js');
const charts=new WeakMap();
function isHome(game,star) {
    return game.players.some(player=>player&&player.homeStarId===star.id);
}
function undiscoveredHome(game,star,viewer) {
    return viewer && !game.config.omniscient && star.owner!==viewer && !star.isAllyOf(viewer) &&
        isHome(game,star) && star.getVisibilityTo(viewer)===Common.VisibilityLevel.NONE && star.getLastSeen(viewer)===0;
}
function alias(game,star) {
    let chart=charts.get(game);
    if(!chart) {
        chart={names:new Map(),pool:[...new Set(I18n.getString(100,'Star').split('|'))].filter(Boolean),
            numerals:[...new Set(I18n.getString(200,'I|II|III|IV|V').split('|'))].filter(Boolean)};
        if(!chart.pool.length)chart.pool=['Star'];
        charts.set(game,chart);
    }
    if(chart.names.has(star.id))return chart.names.get(star.id);
    // Allocate in homeworld order, so the result never depends on draw/click order.
    const homes=game.players.filter(p=>p&&p.homeStarId).map(p=>game.stars.find(s=>s.id===p.homeStarId)).filter(Boolean);
    const used=new Set([...game.stars.map(s=>s.name),...chart.names.values()]);
    const homeNames=new Set(homes.map(s=>s.name));
    for(const home of homes) {
        if(chart.names.has(home.id))continue;
        const start=(Math.imul((home.x/1024)|0,2654435761)^Math.imul((home.y/1024)|0,2246822519))>>>0;
        let candidate;
        for(let attempt=0;;attempt++) {
            const base=chart.pool[(start+attempt)%chart.pool.length],round=Math.floor(attempt/chart.pool.length);
            candidate=round===0?base:`${base} ${chart.numerals[round]||round+1}`;
            // Never reuse a real label, a homeworld's base name or another alias.
            if(!homeNames.has(base)&&!used.has(candidate))break;
            // A tiny resource pool may consist entirely of homeworld names.
            if(attempt>=chart.pool.length*(chart.numerals.length+1)) {
                candidate=I18n.formatString(725,'S-{0}',1000000+home.id);
                while(used.has(candidate))candidate+='0';
                break;
            }
        }
        chart.names.set(home.id,candidate);used.add(candidate);
    }
    return chart.names.get(star.id);
}
function displayName(game,star,viewer) {
    if(undiscoveredHome(game,star,viewer))return alias(game,star);
    if(!viewer||game.config.omniscient||star.owner===viewer||star.isAllyOf(viewer)||star.namedStar||isHome(game,star)||
        star.getVisibilityTo(viewer)>=Common.VisibilityLevel.CLASS)return star.name;
    return I18n.formatString(725,'S-{0}',star.id);
}
module.exports={isHome,undiscoveredHome,displayName};
