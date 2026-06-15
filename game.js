import Phaser from "phaser";
// ════════════════════════════════════════════════════════════
//  MECHA KAIJU RUSH  —  Single-file Phaser 3 game
// ════════════════════════════════════════════════════════════

// ── BootScene ────────────────────────────────────────────────
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    // seed registry
    const load = (k,d) => { try { const v=localStorage.getItem('mkr_'+k); return v!==null?JSON.parse(v):d; } catch{return d;} };
    this.registry.set('highScore', load('highScore',0));
    this.registry.set('currency',  load('currency',0));
    this.registry.set('upgradeEngine', load('upgradeEngine',0));
    this.registry.set('upgradeArmor',  load('upgradeArmor',0));
    this.registry.set('upgradePlasma', load('upgradePlasma',0));
    this.scene.start('Preload');
  }
}

// ── PreloadScene ─────────────────────────────────────────────
class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  create() {
    const W=1920, H=1080;
    const mk = (key,w,h,fn) => {
      if(this.textures.exists(key)) this.textures.remove(key);
      const t=this.textures.createCanvas(key,w,h);
      fn(t.getContext(),w,h); t.refresh(); 
    };

    // sky
    mk('bg-sky',1920,860,(ctx,w,h)=>{
      const g=ctx.createLinearGradient(0,0,0,h);
      g.addColorStop(0,'#c8781a'); g.addColorStop(0.5,'#d4950a'); g.addColorStop(1,'#7a4010');
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
      const sg=ctx.createRadialGradient(1400,140,0,1400,140,80);
      sg.addColorStop(0,'#ffffcc'); sg.addColorStop(0.5,'#ffdd44'); sg.addColorStop(1,'rgba(255,180,0,0)');
      ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(1400,140,80,0,Math.PI*2); ctx.fill();
    });
    mk('bg-city',1920,860,(ctx,w,h)=>{
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle='rgba(70,44,16,0.6)';
      [[0,520,140,340],[150,480,90,380],[300,500,110,360],[480,440,80,440],[640,420,130,460],[820,460,100,400],[980,410,80,450],[1120,450,150,410],[1310,420,90,440],[1480,440,80,420],[1640,460,110,400],[1800,490,120,370]].forEach(([x,y,bw,bh])=>ctx.fillRect(x,y,bw,bh));
      ctx.fillStyle='rgba(90,58,20,0.4)';
      ctx.beginPath(); ctx.moveTo(0,860);
      [[0,700],[200,600],[500,540],[800,600],[1100,550],[1400,580],[1700,560],[1920,590],[1920,860]].forEach(([x,y])=>ctx.lineTo(x,y));
      ctx.closePath(); ctx.fill();
    });
    mk('bg-mid',1920,860,(ctx,w,h)=>{
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle='rgba(55,34,12,0.65)';
      [[0,620,50,200],[220,590,60,230],[450,605,40,215],[680,580,65,240],[920,610,40,200],[1150,570,70,240],[1380,595,55,215],[1620,600,60,210],[1820,585,100,220]].forEach(([x,y,pw,ph])=>ctx.fillRect(x,y,pw,ph));
      ctx.strokeStyle='rgba(55,34,12,0.4)'; ctx.lineWidth=4;
      for(let px=80;px<1900;px+=250){ ctx.beginPath();ctx.moveTo(px,770);ctx.lineTo(px,610);ctx.stroke(); ctx.beginPath();ctx.moveTo(px-28,625);ctx.lineTo(px+28,625);ctx.stroke(); }
    });
    mk('bg-fg',1920,860,(ctx,w,h)=>{
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle='rgba(45,26,8,0.7)';
      [[0,760,180,100],[320,770,140,90],[610,775,110,85],[870,762,170,98],[1120,770,140,90],[1370,758,160,102],[1620,768,140,92],[1840,760,80,100]].forEach(([x,y,ew,eh])=>{ ctx.beginPath();ctx.ellipse(x+ew/2,y+eh/2,ew/2,eh/2,0,0,Math.PI*2);ctx.fill(); });
    });

    // mech
    mk('mech-torso',160,110,(ctx)=>{
      ctx.fillStyle='#445566';ctx.fillRect(20,15,120,80);
      ctx.fillStyle='#2a3a4a';ctx.fillRect(35,20,90,45);
      ctx.fillStyle='#00aaff';ctx.fillRect(45,22,70,14);
      ctx.fillStyle='#334455';ctx.fillRect(8,15,18,55);ctx.fillRect(134,15,18,55);
      ctx.fillStyle='#ff4400';ctx.fillRect(10,55,12,28);
      ctx.fillStyle='rgba(150,200,255,0.2)';ctx.fillRect(20,15,120,8);
    });
    mk('mech-wheel',100,100,(ctx)=>{
      ctx.beginPath();ctx.arc(50,50,44,0,Math.PI*2);ctx.fillStyle='#222';ctx.fill();
      ctx.strokeStyle='#111';ctx.lineWidth=7;ctx.stroke();
      ctx.strokeStyle='#555';ctx.lineWidth=4;
      for(let i=0;i<4;i++){const a=i/4*Math.PI*2;ctx.beginPath();ctx.moveTo(50,50);ctx.lineTo(50+Math.cos(a)*40,50+Math.sin(a)*40);ctx.stroke();}
      ctx.beginPath();ctx.arc(50,50,10,0,Math.PI*2);ctx.fillStyle='#888';ctx.fill();
    });

    // obstacles
    mk('obs-car',164,72,(ctx)=>{
      ctx.fillStyle='#5577aa';ctx.fillRect(10,26,144,40);
      ctx.fillStyle='#446688';ctx.fillRect(40,8,80,24);
      ctx.fillStyle='rgba(180,220,255,0.5)';ctx.fillRect(44,10,34,18);ctx.fillRect(82,10,34,18);
      ctx.fillStyle='#222';
      ctx.beginPath();ctx.arc(30,60,13,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(134,60,13,0,Math.PI*2);ctx.fill();
    });
    mk('obs-barrel',52,62,(ctx)=>{
      ctx.fillStyle='#7a5c2e';ctx.fillRect(8,4,36,54);
      ctx.strokeStyle='#5a3c0e';ctx.lineWidth=3;
      [15,30,46].forEach(y=>{ctx.beginPath();ctx.moveTo(8,y);ctx.lineTo(44,y);ctx.stroke();});
    });
    mk('obs-building',100,200,(ctx)=>{
      ctx.fillStyle='#445533';ctx.fillRect(5,5,90,195);
      ctx.fillStyle='#222';
      for(let r=0;r<4;r++) for(let c=0;c<2;c++) ctx.fillRect(12+c*44,20+r*44,28,26);
    });

    // particles
    mk('spark',16,16,(ctx)=>{
      const g=ctx.createRadialGradient(8,8,0,8,8,8);
      g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.4,'rgba(255,220,80,0.9)');g.addColorStop(1,'rgba(255,100,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,16,16);
    });
    mk('smoke',32,32,(ctx)=>{
      const g=ctx.createRadialGradient(16,16,0,16,16,16);
      g.addColorStop(0,'rgba(100,100,100,0.7)');g.addColorStop(1,'rgba(50,50,50,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,32,32);
    });
    mk('debris',20,14,(ctx)=>{ ctx.fillStyle='#886644';ctx.fillRect(0,0,20,14); });

    this.scene.start('MainMenu');
  }
}

// ── MainMenuScene ─────────────────────────────────────────────
class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create() {
    const W=this.scale.width, H=this.scale.height;

    // parallax bg
    this._layers = [
      this.add.tileSprite(0,0,W,H,'bg-sky').setOrigin(0,0),
      this.add.tileSprite(0,0,W,H,'bg-city').setOrigin(0,0),
      this.add.tileSprite(0,0,W,H,'bg-mid').setOrigin(0,0),
    ];

    // dark overlay
    this.add.rectangle(W/2,H/2,W,H,0x000000,0.45);

    // title
    this.add.text(W/2, 200, 'MECHA KAIJU RUSH', {
      fontFamily:'Impact,Arial Black,sans-serif', fontSize:'110px',
      color:'#ff4d00', stroke:'#000', strokeThickness:8,
      shadow:{blur:50,color:'#ff4d0066',fill:true}
    }).setOrigin(0.5);

    this.add.text(W/2, 360, 'CRUSH  ·  SMASH  ·  SURVIVE', {
      fontFamily:'monospace', fontSize:'30px', color:'#ffcc00'
    }).setOrigin(0.5);

    // PLAY button
    this._makeBtn(W/2, 520, 'PLAY', 0xff4d00, ()=>{
      this.cameras.main.fadeOut(300,0,0,0);
      this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('Game'));
    });

    // GARAGE button
    this._makeBtn(W/2, 640, 'GARAGE / UPGRADES', 0x1e3a8a, ()=>{
      this.cameras.main.fadeOut(250,0,0,0);
      this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('Garage'));
    });

    // high score
    const hs=this.registry.get('highScore')??0;
    const cu=this.registry.get('currency')??0;
    this.add.text(W/2,H-56,`HIGH SCORE: ${hs.toLocaleString()} m   ⚙ SCRAP: ${cu.toLocaleString()}`,{
      fontFamily:'monospace',fontSize:'24px',color:'#445566'
    }).setOrigin(0.5);

    this.add.text(20,H-20,'SPACE: jump   SHIFT: boost   ESC: pause',{
      fontFamily:'monospace',fontSize:'17px',color:'#2a3a4a'
    }).setOrigin(0,1);

    this.cameras.main.fadeIn(400,0,0,0);
  }

  update(_,delta){
    const dt=delta/1000;
    if(this._layers){
      this._layers[0].tilePositionX+=12*dt;
      this._layers[1].tilePositionX+=35*dt;
      this._layers[2].tilePositionX+=70*dt;
    }
  }

  _makeBtn(x,y,label,color,cb){
    const bg=this.add.rectangle(x,y,420,82,color,0.9)
      .setStrokeStyle(2,0xffffff,0.4).setInteractive({useHandCursor:true});
    const txt=this.add.text(x,y,label,{
      fontFamily:'Impact,Arial Black,sans-serif',fontSize:'38px',color:'#fff'
    }).setOrigin(0.5);
    bg.on('pointerover',()=>this.tweens.add({targets:[bg,txt],scaleX:1.05,scaleY:1.05,duration:70}));
    bg.on('pointerout', ()=>this.tweens.add({targets:[bg,txt],scaleX:1,scaleY:1,duration:70}));
    bg.on('pointerup',  ()=>cb());
  }
}

// ── GarageScene ──────────────────────────────────────────────
class GarageScene extends Phaser.Scene {
  constructor(){super('Garage');}
  create(){
    const W=this.scale.width,H=this.scale.height;
    this.add.tileSprite(0,0,W,H,'bg-sky').setOrigin(0,0).setTint(0x884422);
    this.add.rectangle(W/2,H/2,W,H,0x000000,0.72);
    this.add.text(W/2,70,'GARAGE',{fontFamily:'Impact',fontSize:'96px',color:'#ffcc00',stroke:'#000',strokeThickness:6}).setOrigin(0.5);

    const UPGRADES=[
      {key:'upgradeEngine',label:'ENGINE CORE',color:0xff4d00,icon:'⚡',perks:['+ Speed','+ Accel','+ Top speed','++ Boost','OVERDRIVE']},
      {key:'upgradeArmor', label:'ARMOR',       color:0x2255bb,icon:'🛡',perks:['+ Resist','+ Pool','+ Shield','++ Barrier','TITAN']},
      {key:'upgradePlasma',label:'PLASMA',      color:0xaa22cc,icon:'☢',perks:['+ Heat cap','+ Blast','+ Rate','++ Burst','SINGULARITY']},
    ];
    const COSTS=[500,1200,2500,5000,10000];
    const scrap=this.registry.get('currency')??0;
    this.add.text(W/2,160,`⚙ SCRAP: ${scrap.toLocaleString()}`,{fontFamily:'monospace',fontSize:'34px',color:'#ffdd88'}).setOrigin(0.5);

    const pw=480,ph=500,gap=70,total=UPGRADES.length*(pw)+(UPGRADES.length-1)*gap;
    const sx=W/2-total/2+pw/2;
    UPGRADES.forEach((upg,i)=>{
      const cx=sx+i*(pw+gap),cy=H/2+60,lvl=this.registry.get(upg.key)??0;
      const hex='#'+upg.color.toString(16).padStart(6,'0');
      const g=this.add.graphics();
      g.fillStyle(0x080c18,0.94);g.fillRoundedRect(cx-pw/2,cy-ph/2,pw,ph,14);
      g.lineStyle(2,upg.color,lvl>0?1:0.35);g.strokeRoundedRect(cx-pw/2,cy-ph/2,pw,ph,14);
      this.add.text(cx,cy-ph/2+38,`${upg.icon}  ${upg.label}`,{fontFamily:'Impact',fontSize:'30px',color:hex}).setOrigin(0.5);
      // pips
      for(let j=0;j<5;j++){
        const px2=cx-(4*36)/2+j*36,py2=cy-ph/2+88;
        this.add.rectangle(px2,py2,28,20,j<lvl?upg.color:0x1a2233).setStrokeStyle(1,j<lvl?0xffffff:0x334455,0.4);
      }
      this.add.text(cx,cy-50,lvl===0?'NOT UPGRADED':upg.perks[lvl-1],{fontFamily:'monospace',fontSize:'22px',color:'#aabbcc'}).setOrigin(0.5);
      if(lvl<5){
        const cost=COSTS[lvl],can=scrap>=cost;
        const btn=this.add.rectangle(cx,cy+ph/2-65,pw-60,60,can?0x1a5c28:0x2a2a2a,0.95)
          .setStrokeStyle(2,can?0x44cc66:0x444444).setInteractive({useHandCursor:can});
        this.add.text(cx,cy+ph/2-65,can?`UPGRADE ⚙${cost.toLocaleString()}`:`NEED ⚙${cost.toLocaleString()}`,
          {fontFamily:'monospace',fontSize:'21px',color:can?'#fff':'#555'}).setOrigin(0.5);
        if(can) btn.on('pointerup',()=>{
          this.registry.set('currency',scrap-cost);
          this.registry.set(upg.key,lvl+1);
          try{localStorage.setItem('mkr_currency',JSON.stringify(scrap-cost));localStorage.setItem('mkr_'+upg.key,JSON.stringify(lvl+1));}catch{}
          this.cameras.main.flash(120,255,200,0);
          this.time.delayedCall(140,()=>this.scene.restart());
        });
      } else {
        this.add.text(cx,cy+ph/2-65,'✓ MAX LEVEL',{fontFamily:'Impact',fontSize:'26px',color:'#ffcc00'}).setOrigin(0.5);
      }
    });

    const back=this.add.text(70,H-55,'← BACK',{fontFamily:'Impact',fontSize:'40px',color:'#aabbcc'})
      .setOrigin(0,0.5).setInteractive({useHandCursor:true});
    back.on('pointerover',()=>back.setColor('#ffcc00'));
    back.on('pointerout', ()=>back.setColor('#aabbcc'));
    back.on('pointerup',  ()=>{ this.cameras.main.fadeOut(250,0,0,0); this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('MainMenu')); });
    this.cameras.main.fadeIn(300,0,0,0);
  }
}

// ── GameScene ─────────────────────────────────────────────────
class GameScene extends Phaser.Scene {
  constructor(){super({key:'Game'});}

  create(){
    const W=this.scale.width, H=this.scale.height;
    this.W=W; this.H=H;
    this.HUD=220;
    this.GAME_H=H-this.HUD;
    this.LEVEL_LEN=20000;

    this._energy=100; this._heat=0; this._dead=false; this._paused=false;
    this._camX=0; this._distance=0;

    // engine upgrade: faster base speed
    const engLvl=this.registry.get('upgradeEngine')??0;
    this.BASE_SPEED=6+engLvl*0.8;
    this.MAX_SPEED=13+engLvl*1.2;

    this._buildBg();
    this._buildTerrain();
    this._buildPlayer();
    this._buildObstacles();
    this._buildHUD();
    this._buildInput();

    this.cameras.main.fadeIn(500,0,0,0);
  }

  // ── Background ──────────────────────────────────────────────
  _buildBg(){
    this._bg=[
      this.add.tileSprite(0,0,this.W,this.GAME_H,'bg-sky').setOrigin(0,0).setScrollFactor(0).setDepth(0),
      this.add.tileSprite(0,0,this.W,this.GAME_H,'bg-city').setOrigin(0,0).setScrollFactor(0).setDepth(1),
      this.add.tileSprite(0,0,this.W,this.GAME_H,'bg-mid').setOrigin(0,0).setScrollFactor(0).setDepth(2),
    ];
  }

  // ── Terrain ──────────────────────────────────────────────────
  _buildTerrain(){
    // Generate ground heights using simple noise
    const SEG=80, COUNT=Math.ceil(this.LEVEL_LEN/SEG)+10;
    this._heights=[];
    const BASE=this.GAME_H-90;
    let h=BASE;
    for(let i=0;i<COUNT;i++){
      if(i<8){this._heights.push(BASE);continue;}
      const r=Math.random();
      if(r<0.2) h=Phaser.Math.Clamp(h,BASE-20,BASE+20);
      else if(r<0.6) h=Phaser.Math.Clamp(h+(Math.random()-0.5)*60,BASE-220,BASE+50);
      else if(r<0.85) h=Phaser.Math.Clamp(h-Phaser.Math.Between(30,180),BASE-250,BASE);
      else h=Phaser.Math.Clamp(h+Phaser.Math.Between(20,60),BASE-250,BASE+60);
      this._heights.push(h);
    }
    this._SEG=SEG;

    // Draw terrain graphics
    this._terrainGfx=this.add.graphics().setDepth(5);
    this._drawTerrain(0, COUNT);

    // Build Matter bodies — one rotated rect per segment
    for(let i=0;i<COUNT-1;i++){
      const x0=i*SEG, x1=x0+SEG;
      const y0=this._heights[i], y1=this._heights[i+1];
      const mx=(x0+x1)/2, my=(y0+y1)/2+200;
      const angle=Math.atan2(y1-y0,SEG);
      const len=Math.sqrt(SEG*SEG+(y1-y0)**2);
      const body=this.matter.add.rectangle(mx,my,len,400,{isStatic:true,angle,friction:0.9,restitution:0.01,label:'terrain'});
    }
  }

  _drawTerrain(from,to){
    const g=this._terrainGfx;
    const SEG=this._SEG, H2=this.H+400;
    g.fillStyle(0x5c3d1e,1);
    g.beginPath();
    g.moveTo(from*SEG, H2);
    for(let i=from;i<to&&i<this._heights.length;i++) g.lineTo(i*SEG, this._heights[i]);
    g.lineTo((to-1)*SEG, H2);
    g.closePath(); g.fillPath();
    g.lineStyle(3,0x8b6534,0.9);
    g.beginPath();
    for(let i=from;i<to&&i<this._heights.length;i++){
      i===from ? g.moveTo(i*SEG,this._heights[i]) : g.lineTo(i*SEG,this._heights[i]);
    }
    g.strokePath();
  }

  _groundY(worldX){
    const i=Math.floor(worldX/this._SEG);
    if(i<0) return this._heights[0]??this.GAME_H-90;
    if(i>=this._heights.length-1) return this._heights[this._heights.length-1]??this.GAME_H-90;
    const t=(worldX-i*this._SEG)/this._SEG;
    return Phaser.Math.Linear(this._heights[i],this._heights[i+1],t);
  }

  // ── Player ───────────────────────────────────────────────────
  _buildPlayer(){
    const sx=300, sy=this._groundY(300)-200;
    const M=Phaser.Physics.Matter.Matter;

    // Wheel body
    this._wheel=this.matter.add.circle(sx,sy+80,40,{
      density:0.014,friction:0.98,frictionAir:0.01,restitution:0.02,label:'mechWheel',
      collisionFilter:{category:0x0001,mask:0x0004|0x0002}
    });

    // Torso body (rotation locked)
    this._torso=M.Bodies.rectangle(sx,sy,110,70,{
      density:0.008,friction:0.05,frictionAir:0.015,restitution:0.03,label:'mechTorso',
      inertia:Infinity,inverseInertia:0,
      collisionFilter:{category:0x0001,mask:0x0004|0x0002}
    });
    this.matter.world.add(this._torso);

    // Suspension constraint
    this._susp=M.Constraint.create({
      bodyA:this._torso, bodyB:this._wheel,
      pointA:{x:0,y:40}, pointB:{x:0,-44},
      stiffness:0.12, damping:0.65, length:80
    });
    this.matter.world.add(this._susp);

    // Sprites
    this._torsoSpr=this.add.image(sx,sy,'mech-torso').setDisplaySize(140,100).setDepth(20);
    this._wheelSpr=this.add.image(sx,sy+80,'mech-wheel').setDisplaySize(88,88).setDepth(19);

    // Thruster FX
    this._thrusterGfx=this.add.graphics().setDepth(18).setBlendMode(Phaser.BlendModes.ADD);
    this._boostFlash=0;

    // Initial velocity
    M.Body.setVelocity(this._torso,{x:this.BASE_SPEED,y:0});
    M.Body.setVelocity(this._wheel,{x:this.BASE_SPEED,y:0});

    this._grounded=false;
    this._lastJump=0;

    // Collision events
    this.matter.world.on('collisionstart',(evt)=>{
      evt.pairs.forEach(pair=>{
        const {bodyA,bodyB}=pair;
        const isWheel=bodyA.label==='mechWheel'||bodyB.label==='mechWheel';
        const isTerrain=bodyA.label==='terrain'||bodyB.label==='terrain';
        if(isWheel&&isTerrain) this._grounded=true;

        // Obstacle hit
        const isMech=['mechWheel','mechTorso'];
        const isObs=b=>b.label&&b.label.startsWith('obs_');
        if((isMech.includes(bodyA.label)&&isObs(bodyB))||(isMech.includes(bodyB.label)&&isObs(bodyA))){
          const ob=isObs(bodyA)?bodyA:bodyB;
          const depth=pair.collision?.depth??1;
          this.time.delayedCall(0,()=>this._destroyObstacle(ob,depth*150));
        }
      });
    });
    this.matter.world.on('collisionend',(evt)=>{
      const stillOn=evt.pairs.some(p=>{
        const {bodyA,bodyB}=p;
        return (bodyA.label==='mechWheel'||bodyB.label==='mechWheel')&&(bodyA.label==='terrain'||bodyB.label==='terrain');
      });
      if(!stillOn) this.time.delayedCall(80,()=>this._checkGrounded());
    });
  }

  _checkGrounded(){
    const M=Phaser.Physics.Matter.Matter;
    const wp=this._wheel.position;
    const hits=M.Query.region(this.matter.world.getAllBodies(),
      {min:{x:wp.x-40,y:wp.y+34},max:{x:wp.x+40,y:wp.y+50}});
    this._grounded=hits.some(b=>b.isStatic&&b.label==='terrain');
  }

  jump(){
    if(this._dead||!this._grounded) return;
    const now=this.time.now;
    if(now-this._lastJump<380) return;
    this._lastJump=now;
    Phaser.Physics.Matter.Matter.Body.setVelocity(this._torso,{x:this._torso.velocity.x,y:-28});
    this.cameras.main.shake(80,0.004);
  }

  boost(){
    if(this._dead) return;
    const armorLvl=this.registry.get('upgradeArmor')??0;
    const heatCap=100+armorLvl*10;
    if(this._heat>=heatCap) return;
    const vx=Math.min(this._torso.velocity.x+7,this.MAX_SPEED);
    Phaser.Physics.Matter.Matter.Body.setVelocity(this._torso,{x:vx,y:this._torso.velocity.y});
    this._heat=Math.min(this._heat+14,heatCap);
    this._boostFlash=8;
    this._spawnParticles(this._torso.position.x-60,this._torso.position.y,6,'spark',true);
  }

  // ── Obstacles ─────────────────────────────────────────────────
  _buildObstacles(){
    this._obstacles=[];
    this._nextObsX=800;
    this._rng=new Phaser.Math.RandomDataGenerator(['mkr-obs']);
  }

  _spawnObstaclesAhead(camX){
    const target=camX+this.W+1800;
    while(this._nextObsX<target){
      const gap=this._rng.between(400,900);
      this._nextObsX+=gap;
      const dist=this._nextObsX/4;
      let type, w, h, key;
      if(dist<80||this._rng.frac()<0.4){type='barrel';w=52;h=62;key='obs-barrel';}
      else if(dist<350||this._rng.frac()<0.6){type='car';w=164;h=72;key='obs-car';}
      else{type='building';w=100;h=200;key='obs-building';}

      const gy=this._groundY(this._nextObsX);
      const wx=this._nextObsX, wy=gy-h/2-2;

      const body=this.matter.add.rectangle(wx,wy,w,h,{
        isStatic:false,density:0.003,friction:0.5,restitution:0.2,
        label:'obs_'+type,collisionFilter:{category:0x0002,mask:0x0001|0x0004}
      });
      const spr=this.add.image(wx,wy,key).setDisplaySize(w,h).setDepth(15);
      this._obstacles.push({body,spr,type});
    }
  }

  _destroyObstacle(body,force){
    const idx=this._obstacles.findIndex(o=>o.body===body);
    if(idx===-1) return;
    const {spr,type}=this._obstacles.splice(idx,1)[0];

    // Camera shake + energy drain
    const intensity=Phaser.Math.Clamp(force*0.00015,0.003,0.022);
    this.cameras.main.shake(280,intensity);
    const armorMult=1-(this.registry.get('upgradeArmor')??0)*0.12;
    this._energy=Phaser.Math.Clamp(this._energy-force*0.04*armorMult,0,100);
    this._heat=Phaser.Math.Clamp(this._heat+force*0.025,0,100);

    // Scrap reward
    const scrapMap={barrel:15,car:30,building:80};
    const cur=(this.registry.get('currency')??0)+(scrapMap[type]??20);
    this.registry.set('currency',cur);

    // Particles
    this._spawnParticles(spr.x,spr.y,16,'spark',true);
    this._spawnParticles(spr.x,spr.y,8,'smoke',false);

    // Remove
    try{this.matter.world.remove(body);}catch{}
    spr.destroy();
  }

  _spawnParticles(x,y,count,key,additive){
    const emitter=this.add.particles(x,y,key,{
      speed:{min:80,max:380},angle:{min:0,max:360},
      scale:{start:0.8,end:0},alpha:{start:1,end:0},
      lifespan:500,blendMode:additive?'ADD':'NORMAL',
      emitting:false
    }).setDepth(26);
    emitter.explode(count);
    this.time.delayedCall(600,()=>emitter.destroy());
  }

  // ── HUD ──────────────────────────────────────────────────────
  _buildHUD(){
    const W=this.W, H=this.H, HUD=this.HUD;
    const hudY=H-HUD;

    // Panel background
    const pg=this.add.graphics().setScrollFactor(0).setDepth(48);
    pg.fillStyle(0x080c18,0.96); pg.fillRect(0,hudY,W,HUD);
    pg.lineStyle(3,0x1e3a6e,0.9); pg.lineBetween(0,hudY+1,W,hudY+1);

    // 3 dials
    this._dialGfx=this.add.graphics().setScrollFactor(0).setDepth(54);
    const cx=W/2, dialY=hudY+HUD*0.52;
    this._dialCenters={energy:{x:cx-460,y:dialY},speed:{x:cx,y:dialY},heat:{x:cx+460,y:dialY}};
    this._drawDialFaces();

    // Needle angles
    this._na={e:-Math.PI*0.75,s:-Math.PI*0.75,h:-Math.PI*0.75};

    // Value texts
    const ts={fontFamily:"'Courier New',monospace",fontSize:'26px',color:'#aabbff'};
    this._eTxt=this.add.text(cx-460,dialY-95,'100%',ts).setOrigin(0.5,1).setScrollFactor(0).setDepth(57);
    this._sTxt=this.add.text(cx,dialY-115,'0 km/h',{...ts,fontSize:'32px',color:'#fff'}).setOrigin(0.5,1).setScrollFactor(0).setDepth(57);
    this._hTxt=this.add.text(cx+460,dialY-95,'0%',ts).setOrigin(0.5,1).setScrollFactor(0).setDepth(57);

    const lbls={fontFamily:'monospace',fontSize:'18px',color:'#556699'};
    this.add.text(cx-460,dialY+97,'ENERGY',lbls).setOrigin(0.5,0).setScrollFactor(0).setDepth(51);
    this.add.text(cx,dialY+117,'SPEED',lbls).setOrigin(0.5,0).setScrollFactor(0).setDepth(51);
    this.add.text(cx+460,dialY+97,'PLASMA',lbls).setOrigin(0.5,0).setScrollFactor(0).setDepth(51);

    // Hub circles
    const hg=this.add.graphics().setScrollFactor(0).setDepth(56);
    [[cx-460,8],[cx,10],[cx+460,8]].forEach(([hx,r])=>{
      hg.fillStyle(0xaabbcc,1);hg.fillCircle(hx,dialY,r);
      hg.lineStyle(2,0x334466,1);hg.strokeCircle(hx,dialY,r);
    });

    // Progress bar (top)
    this._progGfx=this.add.graphics().setScrollFactor(0).setDepth(101);
    const bg2=this.add.graphics().setScrollFactor(0).setDepth(100);
    bg2.fillStyle(0x111111,0.75);bg2.fillRoundedRect(60,20,W-280,18,9);
    bg2.lineStyle(1,0x334466,0.9);bg2.strokeRoundedRect(60,20,W-280,18,9);
    this._distTxt=this.add.text(60,42,'0 m',{fontFamily:'monospace',fontSize:'17px',color:'#667799'}).setScrollFactor(0).setDepth(101);

    // Pause button
    const pb=this.add.rectangle(W-55,34,56,44,0x223355,0.9)
      .setStrokeStyle(2,0x4466aa).setScrollFactor(0).setDepth(102).setInteractive({useHandCursor:true});
    const pbg=this.add.graphics().setScrollFactor(0).setDepth(103);
    pbg.fillStyle(0xaabbcc,1);pbg.fillRect(W-68,20,9,28);pbg.fillRect(W-54,20,9,28);
    pb.on('pointerup',()=>this._togglePause());

    // Pause overlay
    this._pauseOverlay=this.add.container(W/2,H/2).setScrollFactor(0).setDepth(200).setVisible(false);
    const ovBg=this.add.rectangle(0,0,W,H,0x000000,0.6);
    const ovPanel=this.add.rectangle(0,0,580,400,0x0a0c18,0.97).setStrokeStyle(2,0x223366);
    const ovTitle=this.add.text(0,-140,'PAUSED',{fontFamily:'Impact',fontSize:'72px',color:'#ffcc00'}).setOrigin(0.5);
    const rBtn=this._makePauseBtn(0,-30,'RESUME',()=>this._togglePause());
    const mBtn=this._makePauseBtn(0,80,'MAIN MENU',()=>{
      this._cleanup();
      this.cameras.main.fadeOut(300,0,0,0);
      this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('MainMenu'));
    });
    this._pauseOverlay.add([ovBg,ovPanel,ovTitle,rBtn.bg,rBtn.txt,mBtn.bg,mBtn.txt]);
  }

  _makePauseBtn(x,y,label,cb){
    const bg=this.add.rectangle(x,y,340,68,0x1a2244,0.95).setStrokeStyle(2,0x3355aa).setInteractive({useHandCursor:true});
    const txt=this.add.text(x,y,label,{fontFamily:'Impact',fontSize:'36px',color:'#fff'}).setOrigin(0.5);
    bg.on('pointerover',()=>bg.setFillStyle(0x223366,1));
    bg.on('pointerout', ()=>bg.setFillStyle(0x1a2244,0.95));
    bg.on('pointerup',  cb);
    return{bg,txt};
  }

  _drawDialFaces(){
    const g=this.add.graphics().setScrollFactor(0).setDepth(50);
    const MIN=-Math.PI*0.75, MAX=Math.PI*0.75, ARC=MAX-MIN;
    const drawFace=(cx,cy,R,glowC)=>{
      g.lineStyle(6,glowC,0.12); g.strokeCircle(cx,cy,R+8);
      g.lineStyle(3,0x334466,0.9); g.strokeCircle(cx,cy,R);
      g.fillStyle(0x05080f,1); g.fillCircle(cx,cy,R-2);
      g.lineStyle(1,0x1a2860,0.5); g.strokeCircle(cx,cy,R-10);
      // ticks
      for(let t=0;t<=20;t++){
        const frac=t/20, angle=MIN+frac*ARC;
        const isMaj=t%4===0;
        const tl=isMaj?14:6, tw=isMaj?2:1, tc=isMaj?0x6688bb:0x334466;
        const sinA=Math.sin(angle),cosA=Math.cos(angle);
        g.lineStyle(tw,tc,isMaj?0.9:0.5);
        g.lineBetween(cx+sinA*(R-4),cy-cosA*(R-4),cx+sinA*(R-4-tl),cy-cosA*(R-4-tl));
      }
    };
    const {energy,speed,heat}=this._dialCenters;
    drawFace(energy.x,energy.y,82,0x0055ff);
    drawFace(speed.x,speed.y,102,0xffffff);
    drawFace(heat.x,heat.y,82,0xff4400);
    // danger zones
    const drawArc=(cx,cy,R,from,to,col)=>{
      const MIN2=-Math.PI*0.75,ARC2=Math.PI*1.5;
      g.lineStyle(8,col,0.45);g.beginPath();
      for(let i=0;i<=15;i++){const a=MIN2+(from+(i/15)*(to-from))*ARC2;g.lineTo(cx+Math.sin(a)*R,cy-Math.cos(a)*R);}
      g.strokePath();
    };
    drawArc(energy.x,energy.y,72,0,0.22,0xff2200);
    drawArc(heat.x,heat.y,72,0.78,1.0,0xff2200);
  }

  _updateHUD(){
    const MIN=-Math.PI*0.75, ARC=Math.PI*1.5;
    const LERP=0.09;
    const {energy,speed,heat}=this._dialCenters;
    const vel=this._torso.velocity.x;
    const en=Phaser.Math.Clamp(this._energy/100,0,1);
    const sn=Phaser.Math.Clamp(vel/this.MAX_SPEED,0,1);
    const hn=Phaser.Math.Clamp(this._heat/100,0,1);

    this._na.e=Phaser.Math.Linear(this._na.e,MIN+en*ARC,LERP);
    this._na.s=Phaser.Math.Linear(this._na.s,MIN+sn*ARC,LERP);
    this._na.h=Phaser.Math.Linear(this._na.h,MIN+hn*ARC,LERP);

    const g=this._dialGfx; g.clear();
    const drawNeedle=(cx,cy,len,angle,col)=>{
      const sinA=Math.sin(angle),cosA=Math.cos(angle);
      g.lineStyle(5,col,0.15);g.lineBetween(cx-sinA*len*0.2,cy+cosA*len*0.2,cx+sinA*len,cy-cosA*len);
      g.lineStyle(3,col,1);g.lineBetween(cx-sinA*len*0.2,cy+cosA*len*0.2,cx+sinA*len,cy-cosA*len);
      g.lineStyle(2,0xffffff,0.6);g.lineBetween(cx+sinA*(len*0.7),cy-cosA*(len*0.7),cx+sinA*len,cy-cosA*len);
    };
    drawNeedle(energy.x,energy.y,66,this._na.e,0x33ddaa);
    drawNeedle(speed.x,speed.y,82,this._na.s,0xffffff);
    // heat color
    const hcol=hn<0.5
      ?Phaser.Display.Color.GetColor(Math.round(Phaser.Math.Linear(0x33,0xff,hn*2)),Math.round(Phaser.Math.Linear(0xee,0xcc,hn*2)),0)
      :Phaser.Display.Color.GetColor(0xff,Math.round(Phaser.Math.Linear(0xcc,0x22,(hn-0.5)*2)),0);
    drawNeedle(heat.x,heat.y,66,this._na.h,hcol);

    // hub dots on top
    const hg2=this._dialGfx;
    [[energy.x,8],[speed.x,10],[heat.x,8]].forEach(([hx,r])=>{
      hg2.fillStyle(0xaabbcc,1);hg2.fillCircle(hx,energy.y,r);
    });

    // texts (dirty check)
    const re=Math.round(this._energy);
    if(this._eTxt.text!==re+'%'){this._eTxt.setText(re+'%');this._eTxt.setColor(re<20?'#ff2200':'#aabbff');}
    const rs=Math.round(vel*3.6);
    if(this._sTxt.text!==rs+' km/h') this._sTxt.setText(rs+' km/h');
    const rh=Math.round(this._heat);
    if(this._hTxt.text!==rh+'%'){this._hTxt.setText(rh+'%');this._hTxt.setColor(rh>80?'#ff3300':'#aabbff');}

    // progress bar
    const BAR_X=60,BAR_Y=20,BAR_W=this.W-280,BAR_H=18,R2=9;
    const ratio=Phaser.Math.Clamp(this._distance/(this.LEVEL_LEN/4),0,1);
    this._progGfx.clear();
    if(ratio>0.01){
      this._progGfx.fillStyle(0xff4d00,1);
      this._progGfx.fillRoundedRect(BAR_X,BAR_Y,BAR_W*ratio,BAR_H,R2);
    }
    this._distTxt.setText(Math.floor(this._distance)+' m');
  }

  // ── Input ─────────────────────────────────────────────────────
  _buildInput(){
    const kb=this.input.keyboard;
    this._keys={
      jump:kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      jump2:kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      boost:kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      boost2:kb.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      pause:kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      pause2:kb.addKey(Phaser.Input.Keyboard.KeyCodes.P),
    };
    this._keys.jump.on('down', ()=>{if(!this._paused&&!this._dead)this.jump();});
    this._keys.jump2.on('down',()=>{if(!this._paused&&!this._dead)this.jump();});
    this._keys.boost.on('down',()=>{if(!this._paused&&!this._dead)this.boost();});
    this._keys.boost2.on('down',()=>{if(!this._paused&&!this._dead)this.boost();});
    this._keys.pause.on('down',()=>this._togglePause());
    this._keys.pause2.on('down',()=>this._togglePause());
    this.input.on('pointerdown',(ptr)=>{
      if(this._paused||this._dead)return;
      if(ptr.y<this.GAME_H/2) this.jump(); else if(ptr.y<this.GAME_H) this.boost();
    });
  }

  // ── Update ───────────────────────────────────────────────────
  update(time,delta){
    if(this._dead||this._paused) return;
    const dt=delta/1000;
    const M=Phaser.Physics.Matter.Matter;

    // Motor — maintain base speed
    const vx=this._torso.velocity.x;
    if(vx<this.BASE_SPEED) M.Body.applyForce(this._torso,this._torso.position,{x:(this.BASE_SPEED-vx)*0.05*this._torso.mass,y:0});
    if(vx>this.MAX_SPEED) M.Body.setVelocity(this._torso,{x:this.MAX_SPEED,y:vx});

    // Sync sprites
    const tp=this._torso.position, wp=this._wheel.position;
    this._torsoSpr.setPosition(tp.x,tp.y);
    this._wheelSpr.setPosition(wp.x,wp.y);
    this._wheelSpr.setRotation(this._wheel.angle);
    // Torso tilt
    const tilt=Phaser.Math.Clamp(Math.atan2(this._torso.velocity.y,Math.max(Math.abs(vx),0.1))*0.35,-0.38,0.38);
    this._torsoSpr.setRotation(Phaser.Math.Linear(this._torsoSpr.rotation,tilt,0.1));

    // Thruster
    if(this._boostFlash>0){
      this._boostFlash--;
      const g=this._thrusterGfx; g.clear();
      const i2=1-this._boostFlash/8;
      const tx=tp.x-60, ty=tp.y+4, len=40+i2*50, wid=10+i2*12;
      g.fillStyle(0xffffff,0.85*i2);g.fillEllipse(tx-len*0.1,ty,len*0.25,wid*0.4);
      g.fillStyle(0xff8800,0.7*i2);g.fillEllipse(tx-len*0.4,ty,len*0.5,wid*0.7);
      g.fillStyle(0xff3300,0.45*i2);g.fillEllipse(tx-len*0.7,ty,len*0.45,wid);
    } else this._thrusterGfx.clear();

    // Camera follow
    const lookAhead=Phaser.Math.Clamp(vx*16,0,300);
    const targetX=tp.x+lookAhead-this.W*0.28;
    this._camX=Phaser.Math.Linear(this._camX,targetX,0.06);
    this.cameras.main.scrollX=Math.max(0,this._camX);
    const targetY=tp.y-this.H*0.45;
    this.cameras.main.scrollY=Phaser.Math.Linear(this.cameras.main.scrollY,Phaser.Math.Clamp(targetY,0,400),0.04);

    // Parallax
    const sx=this.cameras.main.scrollX;
    this._bg[0].tilePositionX=sx*0.10;
    this._bg[1].tilePositionX=sx*0.30;
    this._bg[2].tilePositionX=sx*0.60;

    // Resources
    const armorBonus=(this.registry.get('upgradeArmor')??0)*0.08;
    this._energy=Phaser.Math.Clamp(this._energy-1.0*(1-armorBonus)*dt,0,100);
    if(!this._keys.boost?.isDown&&!this._keys.boost2?.isDown)
      this._heat=Phaser.Math.Clamp(this._heat-5*dt,0,100);

    // Obstacles spawn/cull
    this._spawnObstaclesAhead(sx);
    for(let i=this._obstacles.length-1;i>=0;i--){
      const o=this._obstacles[i];
      o.spr.setPosition(o.body.position.x,o.body.position.y);
      o.spr.setRotation(o.body.angle);
      if(o.body.position.x<sx-400){
        try{this.matter.world.remove(o.body);}catch{}
        o.spr.destroy();
        this._obstacles.splice(i,1);
      }
    }

    // Distance
    this._distance=Math.max(this._distance,(tp.x-300)/4);

    // HUD
    this._updateHUD();

    // Death checks
    if(this._energy<=0) this._die('ENERGY DEPLETED');
    if(this._distance>=this.LEVEL_LEN/4) this._die('LEVEL COMPLETE!',true);
    if(tp.y>this.H+300) this._die('FELL INTO THE VOID');
  }

  _togglePause(){
    this._paused=!this._paused;
    if(this._paused){this.matter.world.pause();this._pauseOverlay.setVisible(true);}
    else{this.matter.world.resume();this._pauseOverlay.setVisible(false);}
  }

  _die(reason,win=false){
    if(this._dead) return;
    this._dead=true;
    if(!win){
      Phaser.Physics.Matter.Matter.Body.setVelocity(this._torso,{x:this._torso.velocity.x*0.3,y:-18});
      this.cameras.main.shake(400,0.02);
    }
    const dist=Math.floor(this._distance);
    const prev=this.registry.get('highScore')??0;
    if(dist>prev){this.registry.set('highScore',dist);try{localStorage.setItem('mkr_highScore',JSON.stringify(dist));}catch{}}
    const cur=this.registry.get('currency')??0;
    try{localStorage.setItem('mkr_currency',JSON.stringify(cur));}catch{}
    this.time.delayedCall(win?1200:1800,()=>{
      this.cameras.main.fadeOut(500,0,0,0);
      this.cameras.main.once('camerafadeoutcomplete',()=>{
        this._cleanup();
        this.scene.start('GameOver',{distance:dist,win,reason,currency:cur});
      });
    });
  }

  _cleanup(){
    try{this.matter.world.remove(this._torso);}catch{}
    try{this.matter.world.remove(this._wheel);}catch{}
    try{this.matter.world.removeConstraint(this._susp);}catch{}
    this._obstacles.forEach(o=>{try{this.matter.world.remove(o.body);}catch{}o.spr.destroy();});
    this._obstacles=[];
  }
}

// ── GameOverScene ─────────────────────────────────────────────
class GameOverScene extends Phaser.Scene {
  constructor(){super('GameOver');}
  init(data){this._data={distance:0,win:false,reason:'DESTROYED',currency:0,...data};this._adWatched=false;}
  create(){
    const W=this.scale.width,H=this.scale.height;
    const {win,reason,distance,currency}=this._data;
    this.add.tileSprite(0,0,W,H,'bg-sky').setOrigin(0,0).setTint(win?0xffffff:0x661111);
    this.add.rectangle(W/2,H/2,W,H,win?0x001122:0x110000,0.78);

    const bc=win?'#ffcc00':'#ff2200';
    const bt=win?'MISSION COMPLETE!':'MECH DESTROYED';
    const banner=this.add.text(W/2,140,bt,{fontFamily:'Impact',fontSize:'100px',color:bc,stroke:'#000',strokeThickness:7,shadow:{blur:50,color:bc+'66',fill:true}}).setOrigin(0.5);
    banner.setAlpha(0).setScale(1.3);
    this.tweens.add({targets:banner,alpha:1,scaleX:1,scaleY:1,duration:450,ease:'Back.Out'});
    if(!win) this.add.text(W/2,258,reason,{fontFamily:'monospace',fontSize:'30px',color:'#ff6655'}).setOrigin(0.5);

    const hs=this.registry.get('highScore')??0;
    const isNew=distance>=hs&&distance>0;
    const g=this.add.graphics();
    g.fillStyle(0x000000,0.72);g.fillRoundedRect(W/2-370,300,740,320,16);
    g.lineStyle(2,0x334466,0.8);g.strokeRoundedRect(W/2-370,300,740,320,16);
    [[`DISTANCE`,`${distance.toLocaleString()} m`,'#aabbff'],
     [`SCRAP EARNED`,`⚙ ${currency.toLocaleString()}`,'#ffdd88'],
     [`HIGH SCORE`,`${hs.toLocaleString()} m${isNew?' 🏆 NEW!':''}`,isNew?'#ffcc00':'#667799']
    ].forEach(([lbl,val,col],i)=>{
      const ry=380+i*82;
      this.add.text(W/2-300,ry,lbl,{fontFamily:'monospace',fontSize:'26px',color:'#445566'}).setOrigin(0,0.5);
      this.add.text(W/2+300,ry,val,{fontFamily:'Impact',fontSize:'32px',color:col}).setOrigin(1,0.5);
    });

    this._makeBtn(W/2-230,H-210,'PLAY AGAIN',0xff4d00,()=>{this.cameras.main.fadeOut(280,0,0,0);this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('Game'));});
    this._makeBtn(W/2+230,H-210,'MAIN MENU',0x1e3a8a,()=>{this.cameras.main.fadeOut(280,0,0,0);this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('MainMenu'));});

    const offer=this.add.text(W/2,H-108,'📺 Watch ad to DOUBLE your scrap!',{fontFamily:'monospace',fontSize:'26px',color:'#ffdd44'}).setOrigin(0.5).setInteractive({useHandCursor:true});
    offer.on('pointerover',()=>offer.setColor('#fff'));
    offer.on('pointerout',()=>offer.setColor('#ffdd44'));
    offer.on('pointerup',async()=>{
      if(this._adWatched)return;
      offer.setText('⏳ Simulating ad...').disableInteractive().setColor('#888');
      await new Promise(r=>setTimeout(r,2000));
      this._adWatched=true;
      const nc=currency*2;
      this.registry.set('currency',nc);
      try{localStorage.setItem('mkr_currency',JSON.stringify(nc));}catch{}
      offer.setText(`✓ Scrap doubled! ⚙ ${nc.toLocaleString()}`).setColor('#44ff88');
    });
    this.cameras.main.fadeIn(350,0,0,0);
  }
  _makeBtn(x,y,label,color,cb){
    const bg=this.add.rectangle(x,y,380,82,color,0.9).setStrokeStyle(2,0xffffff,0.4).setInteractive({useHandCursor:true});
    const txt=this.add.text(x,y,label,{fontFamily:'Impact',fontSize:'40px',color:'#fff'}).setOrigin(0.5);
    bg.on('pointerover',()=>this.tweens.add({targets:[bg,txt],scaleX:1.05,scaleY:1.05,duration:70}));
    bg.on('pointerout', ()=>this.tweens.add({targets:[bg,txt],scaleX:1,scaleY:1,duration:70}));
    bg.on('pointerup',  cb);
  }
}

// ════════════════════════════════════════════════════════════
//  PHASER CONFIG
// ════════════════════════════════════════════════════════════
const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  backgroundColor: '#0a0a0f',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080,
    min: { width: 320, height: 180 }
  },
  physics: {
    default: 'matter',
    matter: { gravity: { y: 3.5 }, debug: false }
  },
  scene: [BootScene, PreloadScene, MainMenuScene, GarageScene, GameScene, GameOverScene]
};

const game = new Phaser.Game(config);
document.getElementById("fallback")?.classList.add("hidden");
