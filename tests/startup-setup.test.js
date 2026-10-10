const test=require('./test-framework.js'),Setup=require('../src/js/startup-setup.js'),Config=require('../src/js/game-config.js');
const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js');
module.exports=()=>{
    test.describe('Computer advantage setup',()=>{
        test.it('offers exactly the seven v3 choices in menu order and highlights the default zero',()=>{
            const config=new Config(),regions=Setup.advantageRegions(Setup.panelRect(800,600),config);
            test.assertEqual(regions.map(r=>r.value).join(','),'3,2,1,0,-1,-2,-3');test.assertEqual(regions.map(r=>r.label).join(','),'+3,+2,+1,0,-1,-2,-3');
            test.assertEqual(regions.filter(r=>r.active).length,1);test.assertEqual(regions.find(r=>r.active).value,0);
        });
        test.it('selects every choice through its click region without changing other setup options',()=>{
            const config=new Config(),panel=Setup.panelRect(800,600),skill=config.compSkill,players=config.totalPlayers;
            for(const region of Setup.advantageRegions(panel,config)){
                test.assertTrue(Setup.clickAdvantage(config,panel,region.rect.x+region.rect.width/2,region.rect.y+10));test.assertEqual(config.compAdvantage,region.value);
                test.assertEqual(config.compSkill,skill);test.assertEqual(config.totalPlayers,players);
            }
        });
        test.it('ignores clicks outside choices and in the spacing between buttons',()=>{
            const config=new Config(),panel=Setup.panelRect(800,600),regions=Setup.advantageRegions(panel,config);
            test.assertFalse(Setup.clickAdvantage(config,panel,regions[0].rect.x+regions[0].rect.width+3,regions[0].rect.y+10));
            test.assertFalse(Setup.clickAdvantage(config,panel,0,0));test.assertEqual(config.compAdvantage,0);
        });
        test.it('cycles all seven choices with wraparound and returns to the original value',()=>{
            const config=new Config(),seen=[];for(let i=0;i<7;i++){Setup.cycleAdvantage(config);seen.push(config.compAdvantage);}
            test.assertEqual(seen.join(','),'-1,-2,-3,3,2,1,0');
        });
        test.it('keeps every button within the setup panel at supported desktop widths',()=>{
            for(const width of [480,640,800,1280]){const panel=Setup.panelRect(width,600),regions=Setup.advantageRegions(panel,new Config());
                for(const {rect:r} of regions){test.assertTrue(r.width>=40);test.assertTrue(r.x>=panel.x&&r.x+r.width<=panel.x+panel.width);test.assertTrue(r.y>=panel.y&&r.y+r.height<=panel.y+panel.height);}
            }
        });
        test.it('fits the choices and panel in a shorter setup viewport',()=>{
            const panel=Setup.panelRect(480,400);test.assertTrue(panel.y+panel.height<=400);
            for(const {rect:r} of Setup.advantageRegions(panel,new Config()))test.assertTrue(r.y+r.height<panel.y+panel.height);
        });
        test.it('validates only integer advantages in the v3 range without silently normalizing invalid input',()=>{
            for(const value of Setup.advantages)test.assertEqual(new Config({compAdvantage:value}).validate().length,0);
            for(const value of [-4,4,1.5,NaN,Infinity,null,'2']){const config=new Config({compAdvantage:value});test.assertTrue(config.validate().some(e=>e.includes('compAdvantage')));test.assertFalse(Setup.setAdvantage(new Config(),value));}
        });
        test.it('carries every selected value into AI players and production while leaving humans unaffected',()=>{
            for(const value of Setup.advantages){const config=new Config({numHumans:1,numComputers:2,skipMapGeneration:true});Setup.setAdvantage(config,value);
                const game=new Game(new Factory(),new Rules(false),config);
                for(const owner of [2,3]){test.assertEqual(game.players[owner].compAdvantage,value);test.assertApproximately(game.applyComputerAdvantageToProduction(owner,100),100+value*20,.0001);}
                test.assertEqual(game.applyComputerAdvantageToProduction(1,100),100);test.assertEqual(game.applyComputerAdvantageToProduction(0,100),100);
            }
        });
    });
    test.describe('Stellar density setup',()=>{
        test.it('offers every v3 density and selects it without altering other options',()=>{
            const config=new Config(),panel=Setup.panelRect(800,600);
            test.assertEqual(Setup.densityRegions(panel,config).map(r=>r.value).join(','),'1,2,3,4,5,6,7,8,9,10');
            for(const {value,rect:r} of Setup.densityRegions(panel,config)){
                test.assertTrue(Setup.clickDensity(config,panel,r.x+r.width/2,r.y+r.height/2));test.assertEqual(config.density,value);
                test.assertEqual(Setup.densityRegions(panel,config).filter(c=>c.active).length,1);test.assertEqual(config.compAdvantage,0);test.assertEqual(config.sectorSize,1);
                test.assertEqual(config.toMapGeneratorConfig().density,value);
            }
        });
        test.it('cycles the complete density range, wraps and ignores gaps',()=>{
            const config=new Config(),seen=[],panel=Setup.panelRect(800,600),r=Setup.densityRegions(panel,config)[0].rect;
            for(let i=0;i<10;i++){Setup.cycleDensity(config);seen.push(config.density);}
            test.assertEqual(seen.join(','),'2,3,4,5,6,7,8,9,10,1');
            test.assertFalse(Setup.clickDensity(config,panel,r.x+r.width+2,r.y+10));test.assertFalse(Setup.clickDensity(config,panel,0,0));
        });
        test.it('rejects non-integer and out-of-range density without silently replacing it',()=>{
            for(const value of Setup.densities)test.assertEqual(new Config({density:value}).validate().length,0);
            for(const value of [0,-1,11,1.5,NaN,Infinity,null,'2']){
                test.assertTrue(new Config({density:value}).validate().some(e=>e.includes('density')));test.assertFalse(Setup.setDensity(new Config(),value));
            }
        });
        test.it('keeps all ten choices within short and narrow setup panels',()=>{
            for(const [w,h] of [[800,600],[480,600],[480,400]]){const panel=Setup.panelRect(w,h);
                for(const {rect:r} of Setup.densityRegions(panel,new Config())){test.assertTrue(r.width>=33);test.assertTrue(r.x>=panel.x&&r.x+r.width<=panel.x+panel.width);test.assertTrue(r.y+r.height<panel.y+panel.height);}
            }
        });
    });
};
