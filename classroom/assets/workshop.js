(() => {
  function seededRandom(seed) {
    return () => ((seed = (Math.imul(seed,1664525)+1013904223) >>> 0) / 4294967296);
  }

  function stave(ctx,x,y,width,spacing,offset=0) {
    ctx.save();
    ctx.translate(x,y);
    ctx.strokeStyle='#513b2c';
    ctx.lineWidth=1.2;
    for(let line=0;line<5;line++){
      ctx.beginPath(); ctx.moveTo(0,line*spacing); ctx.lineTo(width,line*spacing); ctx.stroke();
    }
    ctx.fillStyle='#362a21';
    ctx.font=(spacing*7.2)+'px "Times New Roman",serif';
    ctx.fillText('𝄞',4,spacing*5);
    const notes=[2,1,3,2,4,3,2,0,2,4];
    for(let i=0;i<notes.length;i++){
      const nx=width*(.16+.079*i),ny=spacing*(.4+.75*notes[(i+offset)%notes.length]);
      ctx.beginPath();ctx.ellipse(nx,ny,spacing*.64,spacing*.39,-.35,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(nx+spacing*.48,ny);ctx.lineTo(nx+spacing*.48,ny-spacing*2.75);ctx.stroke();
      if(i===3||i===6){ctx.beginPath();ctx.moveTo(nx+spacing*.45,ny-spacing*2.75);ctx.lineTo(nx+spacing*1.42,ny-spacing*2.1);ctx.stroke();}
    }
    ctx.restore();
  }

  function paper(ctx,width,height,seed) {
    const rng=seededRandom(seed);
    const tone=ctx.createLinearGradient(0,0,width,height);
    tone.addColorStop(0,'#ecdbb8');tone.addColorStop(.44,'#d5bb94');tone.addColorStop(1,'#b98e61');
    ctx.fillStyle=tone;ctx.fillRect(0,0,width,height);
    for(let i=0;i<1700;i++){
      ctx.fillStyle=rng()>.55?'#fcf0d31f':'#553b2614';
      ctx.fillRect(rng()*width,rng()*height,1+rng()*4,1+rng()*2);
    }
  }

  function chordDiagram(ctx,x,y,name,dots) {
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#48362b';ctx.font='italic 28px Georgia';ctx.fillText(name,19,-14);
    ctx.strokeStyle='#705640';ctx.lineWidth=1.7;
    ctx.strokeRect(0,0,64,70);
    for(let i=1;i<5;i++){
      ctx.beginPath();ctx.moveTo(i*12.8,0);ctx.lineTo(i*12.8,70);ctx.stroke();
      if(i<4){ctx.beginPath();ctx.moveTo(0,i*17.5);ctx.lineTo(64,i*17.5);ctx.stroke();}
    }
    for(const [fret,string] of dots){
      ctx.beginPath();ctx.arc(string*12.8,(fret-.5)*17.5,4.9,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  function beamArtwork(ctx,width,height) {
    const rng=seededRandom(46);
    ctx.strokeStyle='#4936291d';ctx.lineWidth=2;
    for(let i=0;i<380;i++){
      const x=rng()*width,y=rng()*height;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2+rng()*19,y+.8);ctx.stroke();
    }
    ctx.save();ctx.translate(130,34);ctx.rotate(-.028);
    ctx.shadowColor='#4a2d2050';ctx.shadowBlur=7;ctx.shadowOffsetY=4;
    ctx.fillStyle='#e8d7b4';ctx.beginPath();ctx.moveTo(-11,6);
    for(let x=0;x<=405;x+=15)ctx.lineTo(x,3+rng()*9);
    ctx.lineTo(410,187);
    for(let x=407;x>=0;x-=15)ctx.lineTo(x,184-rng()*10);
    ctx.closePath();ctx.fill();ctx.shadowColor='transparent';
    ctx.fillStyle='#928d7c83';ctx.fillRect(-16,15,52,20);ctx.fillRect(366,166,58,18);
    ctx.fillStyle='#593a2a';ctx.font='italic 27px Georgia';ctx.fillText('C        Am        F        G',52,47);
    stave(ctx,29,66,342,11,2);
    ctx.font='italic 22px "Kaiti SC","Songti SC",serif';ctx.fillText('改 · 把晚风写进歌里',100,151);
    ctx.restore();
    const chunks=[
      {value:'热烈欢迎',ink:'#3c2519',font:'bold 56px "Kaiti SC","STKaiti","Songti SC",serif'},
      {value:' 大冰的小屋 ',ink:'#243d54',font:'bold 70px "Kaiti SC","STKaiti","Songti SC",serif'},
      {value:'团队',ink:'#3c2519',font:'bold 56px "Kaiti SC","STKaiti","Songti SC",serif'}
    ];
    const widthOf=entry=>{ctx.font=entry.font;return ctx.measureText(entry.value).width;};
    let x=width*.504-chunks.reduce((sum,item)=>sum+widthOf(item),0)/2;
    ctx.textBaseline='alphabetic';
    for(const part of chunks){
      ctx.font=part.font;ctx.fillStyle=part.ink;ctx.fillText(part.value,x,109);
      x+=ctx.measureText(part.value).width;
    }
    ctx.fillStyle='#463024';
    ctx.font='bold 45px "Kaiti SC","STKaiti","Songti SC",serif';
    ctx.textAlign='center';ctx.fillText('来到且曼学院学习交流！',width*.504,184);ctx.textAlign='start';
    chordDiagram(ctx,1430,91,'C',[[1,4],[2,2],[3,1]]);
    chordDiagram(ctx,1531,91,'Am',[[1,4],[2,2],[2,3]]);
    chordDiagram(ctx,1632,91,'G',[[2,1],[3,0],[3,5]]);
    ctx.strokeStyle='#a14d35';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(1664,174,49,9,-.11,0,Math.PI*2);ctx.stroke();
  }

  function cityAtNight(ctx,width,height) {
    const rng=seededRandom(137);
    const sky=ctx.createLinearGradient(0,0,0,height);
    sky.addColorStop(0,'#091323');sky.addColorStop(.59,'#142743');sky.addColorStop(1,'#4c4b52');
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    for(let layer=0;layer<3;layer++){
      for(let x=-12;x<width;){
        const w=18+rng()*40, h=18+rng()*(67+layer*22), y=height*(.67+layer*.14)-h;
        ctx.fillStyle=['#222e42','#171e30','#0c1422'][layer];
        ctx.fillRect(x,y,w,h+112);
        if(h>70&&rng()>.56){ctx.fillRect(x+w*.3,y-6,w*.43,8);ctx.fillStyle='#a55045';ctx.fillRect(x+w*.5,y-8,2,1);}
        for(let f=y+6;f<Math.min(y+h+38,height);f+=5+layer){
          for(let c=x+4;c<x+w-2;c+=5){
            if(rng()<.23){
              ctx.fillStyle=['#8a735e','#8b6942','#6d8b9a','#cfaf75'][Math.floor(rng()*4)];
              ctx.fillRect(c,f,1.3+layer/2,1+layer/2);
            }
          }
        }
        x+=w+2+rng()*8;
      }
    }
    for(let i=0;i<40;i++){
      const x=rng()*width, y=height*(.69+rng()*.29),r=3+rng()*5;
      const light=ctx.createRadialGradient(x,y,0,x,y,r);
      light.addColorStop(0,'#ffc274a5');light.addColorStop(1,'#ffc27400');
      ctx.fillStyle=light;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
  }

  function buildWorkshop({
    T,plinth,box,orb,cylinder,standard,plane,canvasMap,loadMap,
    halfWidth,front,rear,wallHeight,stageFront,stageHeight,doorZ,whiteboard,lectern,televisions
  }) {
    const walls=new T.Group();
    plinth.add(walls);
    const width=halfWidth*2, depth=rear-front, center=(rear+front)/2, wallX=halfWidth-.07;
    const plasterMap=loadMap('limewash-color.webp',3.8,1.15,{saturation:.11,lift:.31});
    const plankMap=loadMap('timber-color.webp',1.8,1);
    const weave=loadMap('linen-color.webp',3,3,{saturation:.18,lift:.54});
    const warmWall=standard(0xd0b89f,{map:plasterMap,roughness:.92});
    const stageWall=standard(0xac896c,{map:plasterMap,roughness:.91});
    const ivory=standard(0xe3d5c4,{roughness:.69});
    const beamFinish=standard(0xe1c6a6,{roughness:.86});
    const oak=standard(0x9c7450,{map:plankMap,roughness:.64});
    const darkWood=standard(0x745437,{map:plankMap,roughness:.75});
    const blind=standard(0xcdb18a,{map:weave,roughness:.91});
    const linen=standard(0x9e7750,{map:weave,roughness:1});
    const black=standard(0x1b1b1d,{roughness:.74});
    const steel=standard(0xb1aea5,{roughness:.35,metalness:.42});
    const gold=standard(0xbf925c,{roughness:.40,metalness:.43});
    const bulb = new T.MeshBasicMaterial({color:0xffe5b9,toneMapped:false});
    const backBoard = standard(0xe7e2d8,{roughness:.49});

    box(width,wallHeight,.17,0,wallHeight/2,front+.065,stageWall,walls);
    for(const side of [-1,1]){
      box(.17,wallHeight,depth,side*wallX,wallHeight/2,center,warmWall,walls);
      box(.075,.075,depth,side*(wallX-.11),.044,center,darkWood,walls);
      box(.225,.044,depth,side*wallX,wallHeight+.022,center,darkWood,walls);
      box(.194,wallHeight,.042,side*wallX,wallHeight/2,rear-.021,oak,walls);
    }
    box(width,.078,.09,0,.045,front+.175,darkWood,walls);
    box(width-.37,.044,.214,0,wallHeight+.022,front+.065,darkWood,walls);

    // Keep the welcome lettering visible above the teaching equipment in the open room.
    const bannerWidth=width-.73, bannerY=2.88, bannerZ=front+.175;
    box(bannerWidth+.064,.54,.066,0,bannerY,bannerZ,darkWood,walls);
    box(bannerWidth,.496,.022,0,bannerY,bannerZ+.033,beamFinish,walls);
    plane(bannerWidth-.045,.476,0,bannerY,bannerZ+.045,standard(0xffffff,{
      map:canvasMap(1800,240,beamArtwork),transparent:true,roughness:.9,depthWrite:false
    }),walls);

    box(.18,2.29,1.18,wallX-.045,1.145,doorZ,darkWood,walls);
    box(.076,2.15,1.04,wallX-.154,1.08,doorZ,oak,walls);
    box(.06,1.68,.86,wallX-.170,1.13,doorZ,darkWood,walls);
    box(.072,.044,.153,wallX-.22,1.02,doorZ+.40,steel,walls);
    box(.20,.022,1.15,wallX-.13,.014,doorZ,oak);
    const stageDepth=stageFront-front-.17, stageZ=stageFront-stageDepth/2;
    const platformTop=.029;
    box(10.60,stageHeight-platformTop,stageDepth,0,(stageHeight-platformTop)/2,stageZ,darkWood);
    box(10.54,platformTop,stageDepth-.033,0,stageHeight-platformTop/2,stageZ,standard(0x635647)).receiveShadow=true;

    const board=new T.Group();
    board.position.set(whiteboard.x,stageHeight,whiteboard.z);
    plinth.add(board);
    box(whiteboard.width,1.46,.051,0,1.63,0,steel,board);
    box(whiteboard.width-.073,1.387,.018,0,1.63,.030,backBoard,board);
    box(whiteboard.width-.16,.037,.108,0,.904,.046,ivory,board);
    box(.142,.023,.055,.85,.934,.067,black,board);
    for(const x of [-1.08,1.08]){
      box(.045,.88,.048,x,.531,-.024,steel,board);
      box(.051,.036,.41,x,.076,.036,steel,board);
      for(const z of [-.127,.202])cylinder(.041,.028,.041,x,.041,z,black,board).rotation.z=Math.PI/2;
    }

    const screenColor=canvasMap(640,360,(ctx,w,h)=>{
      const surface=ctx.createRadialGradient(w*.37,h*.22,6,w*.46,h*.42,w*.65);
      surface.addColorStop(0,'#29313a');surface.addColorStop(.50,'#151c24');surface.addColorStop(1,'#0e1115');
      ctx.fillStyle=surface;ctx.fillRect(0,0,w,h);
      const reflection=ctx.createLinearGradient(0,h*.05,w*.38,h*.36);
      reflection.addColorStop(0,'#ffe9c91a');reflection.addColorStop(1,'#ffe9c900');
      ctx.fillStyle=reflection;ctx.fillRect(0,0,w,h);
    });
    const screenMaterial=standard(0xffffff,{map:screenColor,roughness:.51});
    const screenY=1.76;
    for(const {x,z,width,yaw} of televisions){
      const group=new T.Group();
      group.position.set(x,stageHeight,z);
      group.rotation.y=yaw;
      plinth.add(group);
      const height=width*9/16;
      box(width,height,.074,0,screenY,0,black,group).castShadow=true;
      plane(width-.053,height-.055,0,screenY+.006,.039,screenMaterial,group);
      box(.061,.009,.012,0,screenY-height/2+.014,.035,steel,group);
      const postHeight=screenY-height/2+.215;
      for(const postX of [-.29,.29]){
        box(.053,postHeight-.073,.058,postX,(postHeight+.073)/2,-.043,black,group);
        box(.051,.043,.56,postX,.072,-.03,black,group);
        for(const footZ of [-.248,.208])cylinder(.042,.034,.042,postX,.042,footZ,black,group).rotation.z=Math.PI/2;
      }
      box(.72,.029,.235,0,.60,-.007,black,group);
    }
    const podium=new T.Group();
    podium.position.set(lectern.x,stageHeight,lectern.z);
    plinth.add(podium);
    box(.82,.040,.48,0,1.227,0,steel,podium).rotation.x=-.12;
    for(const x of [-.279,.279])box(.041,1.165,.038,x,.606,-.09,steel,podium).rotation.x=.095;
    box(.62,.045,.37,0,.026,0,black,podium);
    box(.53,.032,.284,0,.743,-.088,steel,podium);
    box(.136,.016,.067,-.30,1.262,.084,black,podium);

    const night=canvasMap(1500,384,cityAtNight);
    const pot=standard(0x976141,{roughness:.85}), soil=standard(0x352b22);
    const leaves=[0x53692b,0x75833a,0x34471e,0x8a9248].map(color=>standard(color,{roughness:.52}));
    const radiator=standard(0xe0d6c6,{roughness:.62});
    const windowWall=new T.Group();
    windowWall.position.x=-wallX;
    walls.add(windowWall);
    const windowBays=[-3.82,-1.08,1.66];
    const rng=seededRandom(56);
    for(const [i,z] of windowBays.entries()){
      const panelWidth=2.49, panelY=1.79, panelHeight=1.42;
      box(.127,panelHeight+.086,panelWidth+.11,.085,panelY,z,darkWood,windowWall);
      const city=night.clone();city.needsUpdate=true;city.repeat.x=.43;city.offset.x=i*.27;
      const glass=new T.MeshBasicMaterial({map:city,toneMapped:false,color:0xcbd3e0});
      plane(panelWidth,panelHeight,.156,panelY,z,glass,windowWall).rotation.y=Math.PI/2;
      for(const offset of [-.82,0,.82]) box(.104,panelHeight,.051,.171,panelY,z+offset,darkWood,windowWall);
      box(.113,.062,panelWidth,.170,panelY-.20,z,darkWood,windowWall);
      box(.43,.073,panelWidth+.19,.224,1.033,z,ivory,windowWall);
      box(.107,.218,panelWidth+.026,.188,2.415,z,blind,windowWall);
      for(let fold=0;fold<4;fold++)box(.069,.021,panelWidth+.035,.247,2.329+fold*.043,z,blind,windowWall);
      box(.21,.048,panelWidth-.14,.16,.726,z,radiator,windowWall);
      box(.21,.048,panelWidth-.14,.16,.307,z,radiator,windowWall);
      for(let rib=0;rib<17;rib++)box(.208,.402,.079,.164,.516,z-1.07+rib*.134,radiator,windowWall);
      for(const offset of [-.64,-.17,.33]){
        const px=.273,zp=z+offset;
        cylinder(.125,.19,.116,px,1.16,zp,pot,windowWall);
        cylinder(.118,.018,.11,px,1.258,zp,soil,windowWall);
        for(let leaf=0;leaf<7;leaf++){
          const a=leaf*2.399, radius=.10+rng()*.076;
          const petal=orb(.123,.026,.066,px+Math.cos(a)*radius,1.30+rng()*.18,zp+Math.sin(a)*radius,leaves[leaf%4],windowWall);
          petal.rotation.set(.21*Math.sin(a),-a,.19+.55*rng());
        }
      }
      cylinder(.117,.048,.117,.27,1.095,z+.89,oak,windowWall);
      box(.173,.13,.178,.27,1.188,z+.89,bulb,windowWall);
      orb(.092,.089,.094,.27,1.247,z+.89,bulb,windowWall);
    }
    const air=standard(0xe3ddd1);
    for(const z of [windowBays[0],windowBays[2]]){
      box(.224,.267,1.38,.15,2.817,z,air,windowWall);
      box(.038,.044,1.18,.27,2.741,z,black,windowWall);
      box(.046,.018,1.17,.272,2.727,z,ivory,windowWall);
    }

    const musicWall=new T.Group();
    musicWall.position.set(wallX,0,.85);
    musicWall.rotation.y=Math.PI;
    musicWall.scale.z=.92;
    walls.add(musicWall);
    box(.079,1.68,2.26,.16,1.65,3.10,linen,musicWall);
    const sheets=[];
    for(let i=0;i<6;i++){
      const map=canvasMap(250,330,(ctx,w,h)=>{
        paper(ctx,w,h,23+i*39);
        ctx.fillStyle='#4c382b';
        ctx.font='23px "Kaiti SC","STKaiti","Songti SC",serif';
        ctx.fillText(['给晚风','排练记','山路','空拍','和弦','回声'][i],26,39);
        for(let row=0;row<4;row++)stave(ctx,16,63+row*58,216,5,(i+row)%6);
        ctx.font='italic 17px Georgia'; ctx.fillText(['C · Am · F · G','G · D · Em','Dm / G / C'][i%3],30,314);
      });
      sheets.push(standard(0xffffff,{map,roughness:.90}));
    }
    function pinned(z,y,w,h,index,lean){
      const sheet=plane(w,h,.209,y,z,sheets[index%sheets.length],musicWall);
      sheet.rotation.set(lean,Math.PI/2,0,'YXZ');
      box(.025,.058,.048,.213,y+h*.466,z,black,musicWall).rotation.x=lean;
    }
    for(const [z,y,w,h,index,turn] of [
      [3.74,1.91,.54,.73,0,-.12],[3.12,2.10,.49,.66,1,.08],[2.56,1.98,.58,.64,2,-.04],
      [3.77,1.21,.49,.62,3,.06],[3.20,1.43,.50,.65,5,-.09],[2.63,1.24,.44,.55,4,.13],
      [2.14,1.67,.26,.37,3,.08],[1.48,1.93,.36,.46,1,.07],[1.04,1.68,.40,.54,2,-.09],
      [.49,1.88,.42,.63,4,.06],[-.02,1.73,.32,.45,5,-.08],[-.65,1.87,.36,.55,0,.12]
    ])pinned(z,y,w,h,index,turn);
    box(.35,.059,2.06,.247,1.194,.80,darkWood,musicWall);
    for(const z of [-.018,1.61])box(.26,.17,.046,.21,1.081,z,oak,musicWall).rotation.z=-.33;
    const bookColors=[0x27384d,0x8e573a,0x8d8570,0xbfa481];
    for(let i=0;i<8;i++){
      const book=box(.042,.36+(i%3)*.054,.145,.25,1.435,.30+i*.137,standard(bookColors[i%4]),musicWall);
      book.rotation.z=-.22; book.rotation.x=.03*i;
    }
    box(.15,.135,.24,.24,1.293,1.52,ivory,musicWall);
    for(const z of [1.46,1.57])cylinder(.037,.019,.037,.324,1.296,z,black,musicWall).rotation.z=Math.PI/2;
    const shadeGeometry=new T.CylinderGeometry(.069,.151,.204,22,1,true);
    for(const z of [3.76,1.20]){
      cylinder(.079,.032,.079,.098,2.47,z,gold,musicWall).rotation.z=Math.PI/2;
      box(.212,.026,.027,.22,2.499,z,gold,musicWall);
      box(.022,.14,.022,.314,2.446,z,gold,musicWall);
      const shade=new T.Mesh(shadeGeometry,new T.MeshStandardMaterial({color:0xe6c694,roughness:.63,side:T.DoubleSide}));
      shade.position.set(.315,2.333,z);shade.rotation.z=.13;musicWall.add(shade);
      orb(.056,.060,.056,.324,2.254,z,bulb,musicWall);
    }

    const notebook=new T.Group();
    notebook.position.set(.37,.844,3.62);notebook.rotation.y=-.09;plinth.add(notebook);
    const bookPaper=standard(0xfff4d5,{map:canvasMap(480,310,(ctx,w,h)=>{
      paper(ctx,w,h,285);
      for(const x of [0,240]){
        ctx.fillStyle='#503a2c';ctx.font='24px "Kaiti SC","Songti SC",serif';ctx.fillText('民谣练习',x+25,44);
        for(let y=75;y<255;y+=49)stave(ctx,x+22,y,192,5,y%7);
      }
      const fold=ctx.createLinearGradient(213,0,267,0);
      fold.addColorStop(0,'#55402900');fold.addColorStop(.5,'#5540297a');fold.addColorStop(1,'#55402900');
      ctx.fillStyle=fold;ctx.fillRect(210,0,60,h);
    }),roughness:.92});
    box(.76,.024,.405,0,0,0,darkWood,notebook);
    box(.72,.025,.380,0,.017,-.004,ivory,notebook);
    plane(.72,.381,0,.031,-.004,bookPaper,notebook).rotation.x=-Math.PI/2;
  }
  window.BotWorkshop = {buildWorkshop};
})();
