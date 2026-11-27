window.buildFolkRoom = function(scene) {
  const {T,mat,canvas,group,box,ell,cylinder,stick,panel,rounded,seeded,batch}=HouseKit;
  const room=group(scene), roofAndFront=group(scene), rand=seeded(485), obstacles=[],seats=[],benches=[],doors=[],landmarks=[], wallNotes=[];
  const floorWidth=13.8,floorDepth=11.2,rugs=[],footprints=[],fixtures={};
  const contact=(x,z,w,d,opacity)=>footprints.push({x,z,w,d,opacity});
  const surface=CabinSurfaces;
  const timber=surface.wood(0xbca28f), dark=surface.wood(0x8c7769), wood=surface.wood(), oak=surface.wood(0xe4cbb4);
  const plaster=surface.finish('limewash',0xf3f5f7), brass=mat(0xb3955c,{metalness:.68,roughness:.38});
  const iron=mat(0x53534a,{metalness:.50,roughness:.59}), cream=mat(0xe9d8b6), teal=mat(0x496d63,{roughness:.40});
  function obstacle(x,z,w,d,cameraHeight,jumpTop){
    const footprint={x,z,w,d,cameraHeight,jumpTop};
    obstacles.push(footprint);
    return footprint;
  }
  function plaque(p,x,y,z,w,h,lines,bg='#263c38',fg='#ecdcaf',size=1){
    const tx=canvas(768,Math.round(768*h/w),(c,cw,ch)=>{c.fillStyle=bg;c.fillRect(0,0,cw,ch);c.strokeStyle=fg;c.globalAlpha=.45;c.lineWidth=3;c.strokeRect(12,12,cw-24,ch-24);c.globalAlpha=1;c.textAlign='center';lines.forEach((l,i)=>{const fs=Math.min(ch*.58/lines.length*size,cw*.85/l.length);c.font='bold '+fs+'px "Songti SC","Noto Serif CJK SC",serif';c.fillStyle=fg;c.textBaseline='middle';c.fillText(l,cw/2,ch*(i+.5)/lines.length);});});
    return panel(p,x,y,z,w,h,tx,.07);
  }
  function makeRug(p,x,z,w,d,variant=0){
    const image=surface.texture('kilim-'+(variant?'indigo':'madder')+'.webp',true);
    const cloth=new T.MeshStandardMaterial({map:image,roughness:.97,side:T.DoubleSide});
    const normal=surface.texture('linen-normal.webp',false,w/.39,d/.39);
    cloth.normalMap=normal;cloth.normalScale.set(.4,.4);
    const geo=new T.PlaneGeometry(w,d,40,28), verts=geo.attributes.position;
    for(let i=0;i<verts.count;i++){
      const xx=verts.getX(i),yy=verts.getY(i),edge=Math.max(Math.abs(xx)/(w/2),Math.abs(yy)/(d/2));
      verts.setZ(i,edge>.90?.004*(1+Math.sin(xx*6+yy*7)):0);
    }
    geo.computeVertexNormals();const rug=new T.Mesh(geo,cloth);
    rug.position.set(x,.019,z);rug.rotation.x=-Math.PI/2;rug.receiveShadow=true;p.add(rug);rugs.push(rug);
    const fringe=[];const count=Math.ceil(d/.020);
    for(let side of [-1,1])for(let i=1;i<count;i++){
      const sz=z-d/2+i*d/count, sx=x+side*(w/2-.006);
      const ex=sx+side*(.026+rand()*.050),ez=sz+.013*(rand()-.5),r=.0022+rand()*.0025;
      fringe.push(sx,.020,sz-r, sx,.020,sz+r, ex,.010,ez+r*.33, sx,.020,sz-r, ex,.010,ez+r*.33, ex,.010,ez-r*.33);
    }
    const threads=new T.BufferGeometry();threads.setAttribute('position',new T.Float32BufferAttribute(fringe,3));threads.computeVertexNormals();
    const trim=new T.Mesh(threads,new T.MeshStandardMaterial({color:0xb6a185,roughness:1,side:T.DoubleSide}));p.add(trim);
  }
  function lamp(p,x,y,z,shade='#35594d',len=.36){
    const l=group(p,x,y,z);cylinder(l,0,-len/2,0,.014,.014,len,iron);
    cylinder(l,0,-len-.11,0,.13,.32,.22,mat(shade),28);
    const reflector=mat(0xffdfa9,{emissive:0xffbd82,emissiveIntensity:.63});
    const bulb=mat(0xffdea6,{emissive:0xffbc78,emissiveIntensity:1.22});
    reflector.userData.probeRadiance=5;
    bulb.userData.probeRadiance=17;
    cylinder(l,0,-len-.222,0,.30,.29,.014,reflector,28).castShadow=false;
    ell(l,0,-len-.25,0,.08,.095,.08,bulb).castShadow=false;
    return [x,y-len-.32,z];
  }
  function candle(p,x,y,z,r=.055){
    cylinder(p,x,y+.085,z,r,r*1.08,.17,cream,12);cylinder(p,x,y+.012,z,r*1.35,r*1.28,.024,brass,12);
    ell(p,x,y+.205,z,r*.35,r*.80,r*.32,mat(0xfff1b4,{emissive:0xffaa41,emissiveIntensity:2.1}));
  }
  // Structural shell: an old timber room, with the street just above the listening floor.
  box(room,0,-.09,0,floorWidth,.18,floorDepth,dark);
  const boards=surface.floor(room,floorWidth,floorDepth);
  box(room,0,2.0,-5.68,13.95,4.2,.16,plaster);
  box(room,0,.065,-5.568,13.76,.13,.069,dark);
  const windowZ=3.62,windowY=2.18,windowWidth=2.56,windowHeight=1.38;
  for(let sign of [-1,1]){
    if(sign<0){
      const left=windowZ-windowWidth/2,right=windowZ+windowWidth/2;
      const sill=windowY-windowHeight/2,head=windowY+windowHeight/2;
      for(const [z0,z1] of [[-5.75,left],[right,5.75]])
        box(room,-6.97,2,(z0+z1)/2,.18,4.18,z1-z0,plaster);
      for(const [y0,y1] of [[-.09,sill],[head,4.09]])
        box(room,-6.97,(y0+y1)/2,windowZ,.18,y1-y0,windowWidth,plaster);
    }
    else box(room,6.97,2.0,0,.18,4.18,11.5,plaster);
    box(room,sign*6.84,.48,0,.12,.95,11.18,oak);
    box(room,sign*6.75,.99,0,.14,.11,11.18,timber);
    for(let z=-5.4;z<5.6;z+=.38)box(room,sign*6.76,.45,z,.055,.92,.027,dark);
    if(sign<0){
      const casement=group(room,-6.88,windowY,windowZ);
      casement.rotation.y=Math.PI/2;
      const windowTimber=surface.furnitureWood(0xbca28f);
      for(const x of [-windowWidth/2,windowWidth/2])
        box(casement,x,0,-.10,.074,windowHeight+.08,.27,windowTimber);
      box(casement,0,0,-.19,.050,windowHeight,.064,windowTimber);
      box(casement,0,windowHeight/2,-.10,windowWidth+.12,.075,.27,windowTimber);
      box(casement,0,-windowHeight/2,-.018,windowWidth+.17,.090,.42,surface.furnitureWood(0xf1dcc0));
      // One landscape spans both panes. The wall and the wooden reveal mask its edges.
      const pane=new T.MeshBasicMaterial({
        map:surface.texture('dali-window.webp',true,1,1,T.ClampToEdgeWrapping),fog:false,toneMapped:false
      });
      pane.onBeforeCompile=shader=>{
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
          #include <map_fragment>
          vec2 panePoint=vMapUv*2.0-1.0;
          float edge=max(abs(panePoint.x),abs(panePoint.y));
          float gray=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
          vec3 dusk=mix(vec3(gray),diffuseColor.rgb,.68)*vec3(.73,.81,.89);
          diffuseColor.rgb=dusk*(1.0-.14*smoothstep(.67,1.0,edge));
        `);
      };
      const windowPane=new T.PlaneGeometry(windowWidth+.16,windowHeight+.16);
      const view=new T.Mesh(windowPane,pane);
      view.name='大理·苍山洱海窗景';view.position.z=-.244;casement.add(view);
      const glaze=new T.MeshStandardMaterial({
        color:0xc5c6bc,metalness:1,roughness:.26,transparent:true,depthWrite:false,fog:false
      });
      glaze.userData.cabinGlazing=true;
      glaze.onBeforeCompile=shader=>{
        shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
          float graze=1.0-saturate(dot(normalize(vViewPosition),normal));
          diffuseColor.a=.029+.46*graze*graze*graze;
          #include <opaque_fragment>
        `);
      };
      const reflection=new T.Mesh(windowPane,glaze);
      reflection.name='大理窗玻璃反射';reflection.position.z=-.242;casement.add(reflection);
      fixtures.window=[casement.position.x-.39,windowY+.10,windowZ+.10];
    }
    for(let z of [-5.43,-2.03,1.58,5.38])box(room,sign*6.72,1.98,z,.24,3.99,.21,timber);
  }
  const ridge=4.89,eave=3.84;
  for(let side of [-1,1]){
    const roof=box(roofAndFront,side*3.48,(ridge+eave)/2+.052,-.05,7.04,.13,11.55,oak);roof.rotation.z=-side*Math.atan((ridge-eave)/6.96);
    // Separate boards continue underneath the exterior roof. A narrow shadow joint
    // and an offset butt joint break up the long grain between adjacent planks.
    const boards=31, width=6.98/boards;
    const ceilingWoods=[0xd2ccc0,0xc7bfb3,0xd0c6b8,0xddd1c3].map(c=>surface.wood(c));
    for(let j=0;j<boards;j++){
      const x=side*(j+.5)*width;let end=-5.72;
      while(end<5.70-.005){
        const start=end;end=Math.min(5.70,start+2.55+rand()*2.15);
        const plank=box(roofAndFront,x,ridge-Math.abs(x)*.15-.027,(start+end)/2,width-.005,.037,end-start-.004,ceilingWoods[Math.floor(rand()*ceilingWoods.length)]);
        plank.rotation.z=-side*Math.atan((ridge-eave)/6.96);
      }
    }
    for(const z of [-5.48,-2.25,1.43,5.35]){const beam=box(roofAndFront,side*3.45,(ridge+eave)/2-.10,z,7.0,.17,.22,timber);beam.rotation.z=-side*.151;stick(roofAndFront,[side*6.64,3.18,z],[side*5.93,3.95,z],.075,timber,8);}
  }
  box(roofAndFront,0,4.79,0,.20,.24,11.5,dark);
  for(let z of [-5.47,-2.25,1.43,5.36])box(roofAndFront,0,3.82,z,13.8,.20,.21,timber);
  fixtures.hearthLamp=lamp(roofAndFront,-3.34,3.78,1.48,'#507463',.26);
  // A wide threshold, a pair of sun-worn doors and brick jambs.
  for(let side of [-1,1]){
    const p=group(roofAndFront,side*4.43,0,5.58), masonry=surface.finish('brick');
    box(p,0,.50,0,4.94,1.00,.19,masonry);box(p,0,3.26,0,4.94,1.06,.19,masonry);
    for(let k of [-1,1])box(p,k*1.98,1.86,0,.98,1.74,.19,masonry);
    for(let k of [-1,1])box(p,k*1.50,1.86,.05,.14,1.84,.24,timber);
    for(let yy of [1.02,2.34,2.76])box(p,0,yy,.08,3.10,.11,.25,timber);
    for(let k of [-1,1])box(p,k*.51,1.86,.08,.063,1.67,.13,timber);
    box(p,0,.99,.14,3.25,.095,.42,wood);
    if(side<0){
      // The book gallery backs onto this bay. Closed shutters below and ribbed
      // oiled paper above keep the street silhouettes out of the reading room.
      const amberPaper=mat(0xbca585,{roughness:.96,emissive:0x69492b,emissiveIntensity:.12});
      box(p,0,2.30,-.018,3.02,.79,.043,amberPaper);
      for(let j=0;j<2;j++)box(p,-.51+j*1.02,2.30,-.050,.013,.78,.016,dark);
      for(let j=0;j<12;j++)box(p,-1.375+j*.25,1.50,-.026,.246,.89,.043,j%4===1?oak:wood);
      for(const y of [1.13,1.90,1.96,2.70])box(p,0,y,-.050,3.05,.046,.058,dark);
    }
    box(roofAndFront,side*1.97,1.85,5.55,.20,3.77,.30,dark);
    const door=group(scene,side*1.91,0,5.55);doors.push({door,side});
    box(door,-side*.92,1.4,0,1.82,2.77,.10,oak);
    for(let k=0;k<6;k++)box(door,-side*(.17+.30*k),1.4,-.07,.27,2.55,.035,wood);
    for(let y of [.26,1.18,2.58])box(door,-side*.91,y,-.1,1.83,.105,.085,timber);
    for(let j=0;j<7;j++)box(door,-side*(.146+j*.255),1.38,.065,.244,2.60,.03,j%3===1?oak:wood);
    door.rotation.y=side*1.37;
  }
  box(roofAndFront,0,3.19,5.57,4.02,.32,.28,dark);

  box(roofAndFront,0,.09,6.05,4.0,.18,1.1,oak);
  const treadStone=surface.finish('hearth').clone();treadStone.normalScale.set(.40,.40);
  for(let row=0;row<3;row++){
    let end=-2.34;
    while(end<2.339){
      const start=end;end=Math.min(2.34,start+.65+rand()*.76);
      if(end-start<.025)break;
      const tread=rounded(roofAndFront,(start+end)/2,.038-row*.065,6.77+row*.38,
        end-start-.006,.15+row*.025,.443+rand()*.013,.017,treadStone);
      tread.rotation.y=(rand()-.5)*.004;
    }
  }
  makeRug(room,-2.08,1.66,4.39,3.05);makeRug(room,4.21,1.31,3.20,2.2,1);
  const hx=-2.57,hz=1.78;
  contact(hx,hz,2.17,2.19,.65);
  fixtures.hearthEmbers=[hx,.37,hz];
  const hearth=group(room,hx,0,hz);
  cylinder(hearth,0,.093,0,.76,.79,.177,surface.finish('hearth',0xbeb5a8),28);
  const stones=[0xf4eee1,0xd0cbbb,0xe1d9cb,0xc9c8bd].map(c=>surface.finish('hearth',c));
  const stoneCount=13;
  for(let i=0;i<stoneCount;i++){
    const a=i*2*Math.PI/stoneCount+.008,b=(i+1)*2*Math.PI/stoneCount-.008;
    const outer=.77+.035*rand(),inner=.55+.022*rand(),h=.157+.028*rand();
    const path=new T.Shape(), polar=(r,t)=>[r*Math.cos(t),r*Math.sin(t)];
    path.moveTo(...polar(inner,a));path.lineTo(...polar(outer-.019,a));path.lineTo(...polar(outer,a+.035));
    path.lineTo(...polar(outer+.012,(a+b)*.5));path.lineTo(...polar(outer,b-.032));
    path.lineTo(...polar(outer-.025,b));path.lineTo(...polar(inner,b));path.lineTo(...polar(inner-.012,(a+b)*.5));path.closePath();
    const geo=new T.ExtrudeGeometry(path,{depth:h,bevelEnabled:true,bevelSegments:2,steps:1,bevelThickness:.014,bevelSize:.010});
    const block=new T.Mesh(geo,stones[i%stones.length]);block.position.y=.171;block.rotation.x=-Math.PI/2;
    block.receiveShadow=block.castShadow=true;hearth.add(block);
  }
  cylinder(hearth,0,.274,0,.571,.56,.10,surface.finish('hearth',0x7b7970),32);
  const char=surface.finish('hearth',0x635d55);
  for(let k=0;k<24;k++){
    const a=k*2.39,r=.075+rand()*.42;const coal=ell(hearth,Math.cos(a)*r,.332+rand()*.014,Math.sin(a)*r,.057+rand()*.044,.032+rand()*.040,.070,char);
    coal.rotation.y=a;
    if(k%4===0){const ember=ell(hearth,coal.position.x,.349,coal.position.z,.048,.008,.015,mat(0x7e3221,{emissive:0xac3214,emissiveIntensity:.49}));ember.rotation.y=a;}
  }
  const kettle=group(hearth,.015,.372,-.006);
  const castIron=new T.MeshStandardMaterial({color:0x464440,metalness:.52,roughness:.52,
    roughnessMap:surface.texture('hearth-rough.webp'),normalMap:surface.texture('hearth-normal.webp'),normalScale:new T.Vector2(.09,.09)});
  const profile=[[.105,0],[.162,.012],[.202,.041],[.224,.113],[.231,.177],[.225,.239],[.206,.274],[.171,.298],[.136,.305],[.131,.316]];
  const pot=new T.Mesh(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),48),castIron);
  pot.castShadow=pot.receiveShadow=true;kettle.add(pot);
  for(const [y,r] of [[.055,.210],[.274,.207],[.302,.146]]){
    const lip=new T.Mesh(new T.TorusGeometry(r,.004,6,40),castIron);lip.rotation.x=Math.PI/2;lip.position.y=y;kettle.add(lip);
  }
  ell(kettle,0,.31,0,.147,.031,.147,castIron);ell(kettle,0,.358,0,.032,.024,.031,brass);
  const handle=new T.Mesh(new T.TorusGeometry(.176,.013,8,32,Math.PI),castIron);kettle.add(handle);handle.position.y=.27;
  for(const side of [-1,1])ell(kettle,side*.178,.269,0,.035,.032,.030,brass);
  const spout=new T.CatmullRomCurve3([new T.Vector3(.179,.118,0),new T.Vector3(.228,.127,0),new T.Vector3(.267,.179,0),new T.Vector3(.296,.252,0),new T.Vector3(.331,.289,0)]);
  kettle.add(new T.Mesh(new T.TubeGeometry(spout,15,.033,14,false),castIron));
  const hearthFootprint=obstacle(hx,hz,1.6,1.6,.831);
  const kettleX=hx+kettle.position.x,kettleZ=hz+kettle.position.z;
  // Keep the pathing footprint, but check the stone rim and kettle separately in a jump.
  hearthFootprint.airborneParts=[
    {x:hx,z:hz,w:1.6,d:1.6,jumpTop:.374},
    {x:hx,z:hz,w:1.14,d:1.14,jumpTop:.411},
    {x:kettleX,z:kettleZ,w:.47,d:.47,jumpTop:.754},
    {x:kettleX,z:kettleZ,w:.378,d:.026,jumpTop:.831},
    {x:kettleX+.255,z:kettleZ,w:.220,d:.070,jumpTop:.697}
  ];
  // Seat rows board from the open aisle. Local +Z is the seated visitor's gaze.
  const seatTimber=surface.furnitureWood(0xe3d1b6),furnitureFrame=surface.furnitureWood(0xc6a88a);
  const furnitureLegs=surface.furnitureWood(0xa78a72);
  const furniturePeg=mat(0x795d44,{roughness:.88});
  const benchCloth={
    table:surface.seatFabric(0x7a8c77),
    bar:surface.seatFabric(0x657c6d),tea:surface.seatFabric(0xb59d77)
  };
  function seatRow(name,x,z,yaw,length,height,cloth,count,baseCloth){
    const depth=.34,cos=Math.cos(yaw),sin=Math.sin(yaw);
    const floorMat=!!baseCloth;
    const pitch=(length-.06)/count;
    const padSize=floorMat ? [pitch-.013,.309] : [pitch-.036,.25];
    const g=group(room,x,0,z);g.rotation.y=yaw;g.name=name;
    const seed=Math.round((x+7)*1643+(z+6)*613);
    if(floorMat){
      // The stitched backing sits on top of the carpet, under the stuffed pads.
      surface.seatCushion(g,0,.047,length,depth,baseCloth,seed-137);
    }else{
      const seatBoard=rounded(g,0,height-.058,0,length,depth,.065,.017,seatTimber);
      seatBoard.rotation.x=-Math.PI/2;
      seatBoard.userData.grainCenter=.47+.18*Math.sin(x*3.65+z*4.93);
      const end=length/2-.13,inset=depth/2-.073;
      for(const side of [-1,1]){
        box(g,0,height-.139,side*inset,length-.22,.095,.031,furnitureFrame);
        box(g,side*end,height-.136,0,.064,.106,depth-.105,furnitureFrame);
        for(const front of [-1,1]){
          const foot=[side*(end+.040),.020,front*(inset+.035)];
          surface.furnitureLeg(g,foot,[side*end,height-.085,front*inset],.062,.062,furnitureLegs);
          cylinder(g,side*(end-.046),height-.139,front*(inset+.0165),.008,.008,.0024,furniturePeg,10).rotation.x=Math.PI/2;
          contact(x+foot[0]*cos+foot[2]*sin,z-foot[0]*sin+foot[2]*cos,.19,.19,.50);
        }
        if(height>.55)stick(g,[-end,.215,side*(inset+.019)],[end,.215,side*(inset+.019)],.014,brass,10);
      }
      box(g,0,.14,0,2*end,.046,.035,furnitureFrame);
    }
    const w=Math.abs(cos)*length+Math.abs(sin)*depth,d=Math.abs(sin)*length+Math.abs(cos)*depth;
    const floorObstacle=obstacle(x,z,w,d,height,height);
    const contactSpread=floorMat ? .13 : .23;
    contact(x,z,w+contactSpread,d+contactSpread,floorMat ? .38 : .27);
    const bench={name,x,z,yaw,length,depth,height,floorMat,seats:[]};
    for(let i=0;i<count;i++){
      const along=(i-(count-1)/2)*pitch;
      surface.seatCushion(g,along,height,...padSize,cloth,seed+i*137,floorMat ? .046 : undefined);
      const seat={id:seats.length,label:name+' · '+(i+1)+'号座',rowName:name,placeNumber:i+1,
        x:x+along*cos,z:z-along*sin,y:height-.013,surfaceY:height,yaw,stool:true,
        bench:true,benchRadius:pitch*.5-.009,floorObstacle,approachDirection:{x:-sin,z:-cos},padSize,
        pickSize:[pitch-.016,.046,padSize[1]+.018],pickY:height-.005,occupied:null,reserved:null};
      seats.push(seat);bench.seats.push(seat);
    }
    benches.push(bench);
    return bench;
  }
  const hearthCloth=surface.seatFabric(0xc19e77),hearthBacking=surface.seatFabric(0x89705b);
  const hearthWest=seatRow('火塘西地铺',-3.89,1.84,Math.PI/2,1.33,.089,hearthCloth,5,hearthBacking);
  hearthWest.seats[2].initialGuest='letter';
  seatRow('火塘东地铺',-1.22,1.82,-Math.PI/2,1.33,.089,hearthCloth,5,hearthBacking);
  seatRow('火塘南地铺',-2.60,2.99,Math.PI,1.33,.089,hearthCloth,5,hearthBacking);
  const chongqing=makeChongqingSeats({room,obstacle,seats});
  const songInner=seatRow('点歌长桌里侧长椅',4.42,.42,0,1.79,.435,benchCloth.table,7);
  songInner.seats[2].initialGuest='rhyme';
  seatRow('点歌长桌外侧长椅',4.27,2.15,Math.PI,1.79,.435,benchCloth.table,7);
  seatRow('吧台西长椅',2.11,-1.37,Math.PI,1.33,.585,benchCloth.bar,5);
  seatRow('吧台东长椅',5.91,-1.37,Math.PI,1.33,.585,benchCloth.bar,5);
  obstacle(4.05,-2.535,5.00,1.03);obstacle(-3.25,-3.9,5.28,3.05);
  obstacle(3.645,-5.32,4.12,.43,2.72);
  CabinCraft.writingDesk(room);obstacle(-5.7,.3,.79,1.73,.807,.807);
  contact(4.05,-2.54,5.55,1.57,.55);
  contact(-3.25,-3.90,5.80,3.55,.47);
  contact(3.645,-5.31,4.48,.91,.46);
  for(const x of [-5.98,-5.42])for(const z of [-.34,.94])contact(x,z,.26,.27,.53);
  // Book shelves with cloth spines; the upper room at Dali supplied the reading-room reference.
  const shelf=group(room,-6.62,0,-1.17);shelf.rotation.y=Math.PI/2;
  for(let j=0;j<3;j++){const yy=1.06+j*.40;box(shelf,0,yy,0,1.54,.06,.31,wood);let x=-.68;
    for(let i=0;i<22;i++){
      const w=.029+rand()*.035,h=.19+rand()*.11,angle=(i+j*2)%7===2?-.16:0;
      const gap=Math.abs(Math.sin(angle))*h;
      if(x+w+gap>.74)break;
      const book=makeCabinBook(shelf,x+(w+gap)/2,yy+.03+h/2,.02+rand()*.023,w,h,.14+rand()*.06,i+4*j);
      book.rotation.z=angle;x+=w+gap+.002+rand()*.007;
    }
  }
  CabinCraft.candleBoard(room);
  const exhibits=makeAcceptedRoom({room,obstacle,seats,landmarks,contact,fixtures});
  const listeningTables=[
    {name:'书角茶案',x:-3.14,z:4.49,w:.50,d:1.08,height:.59},
    {name:'听歌拼桌',x:2.01,z:.08,w:1.27,d:.63,height:.64},
    {name:'彩旗边桌',x:6.46,z:2.96,w:.48,d:1.46,height:.63}
  ];
  const tableBoards=[0xe5cea9,0xcbb092,0xebd3b8].map(surface.furnitureWood);
  for(const {name,x,z,w,d,height} of listeningTables){
    const table=group(room,x,0,z),length=Math.max(w,d),width=Math.min(w,d);
    table.name=name;
    if(d>w)table.rotation.y=Math.PI/2;
    const top=height-.035;
    tableBoards.forEach((material,i)=>{
      const board=box(table,0,top,(i-1)*width/3,length,.070,width/3-.004,material);
      board.userData.grainCenter=[.17,.49,.81][i]+Math.sin(x*3.4+z)*.039;
    });
    const end=length/2-.105,side=width/2-.075;
    for(const i of [-1,1]){
      box(table,i*end,height-.14,0,.055,.11,width-.10,furnitureFrame);
      box(table,0,height-.13,i*side,length-.14,.105,.055,furnitureFrame);
      for(const j of [-1,1]){
        surface.furnitureLeg(table,[i*(end+.025),.02,j*(side+.022)],[i*end,top,j*side],.056,.057,furnitureLegs);
        cylinder(table,i*end,height-.128,j*(side+.029),.0085,.0085,.0024,furniturePeg,10).rotation.x=Math.PI/2;
      }
    }
    box(table,0,.175,0,length-.20,.056,.042,furnitureFrame);
    for(const i of [-1,1])box(table,i*end,.175,0,.053,.060,width-.08,furnitureFrame);
    surface.tabletopWear(table,height+.0009,[
      [-length*.30,-width*.21,.131,.125,0,.30+x*.12],
      [length*.28,width*.22,.117,.108,2,-.32],
      [length*.08,-width*.27,.235,.095,1,.073+z*.011],
      [-length*.21,width*.30,.19,.085,3,.045]
    ]);
    const clay=mat(0x88644d,{roughness:.82});
    for(const [cx,cz] of [[-length*.22,.045],[length*.17,-.065]]){
      cylinder(table,cx,height+.044,cz,.047,.034,.088,clay,16);
      cylinder(table,cx,height+.088,cz,.037,.037,.002,mat(0x553c29),16);
      const cupX=x+(d>w?cz:cx),cupZ=z+(d>w?-cx:cz);
      obstacle(cupX,cupZ,.094,.094,height+.089,height+.089);
    }
    obstacle(x,z,w,d,height+.089,height);
    contact(x,z,w+.36,d+.36,.34);
  }
  seatRow('书角茶案长椅',-2.31,4.47,-Math.PI/2,.87,.388,benchCloth.tea,3);
  seatRow('听歌拼桌长椅',2.01,.79,Math.PI,1.33,.388,benchCloth.tea,5);
  seatRow('彩旗边桌长椅',5.52,3.06,Math.PI/2,1.27,.388,benchCloth.tea,5);
  exhibits.push(chongqing.exhibit,...makeNineFixtures({room,roofAndFront,doors,obstacle}),...makeMusicExhibits(room,fixtures));
  const fuzhou=CabinBranchBadges.makeFuzhou(room);
  const fuzhouIndex=exhibits.findIndex(exhibit=>exhibit.city==='福州');
  const streetSign=exhibits[fuzhouIndex];
  fuzhou.hits.push(...streetSign.hits.map(hit=>({...hit,hint:'福州 · '+streetSign.item+'　看故事'})));
  exhibits[fuzhouIndex]=fuzhou;
  const portal=makeCabinPortal(room);
  exhibits.push(portal.badge);
  const portalPosition=portal.hit.parent.position;
  fixtures.portalBounce=[portalPosition.x+.14,portalPosition.y-.06,portalPosition.z+.40];
  landmarks.push(
    {name:'留言桌',x:-5.7,z:.30,y:.81,action:'letter',pickSize:[.77,.16,1.71]},
    {name:'点酒台',x:3.55,z:-2.35,y:1.16,action:'bar'},
    {name:'今夜歌单',x:6.28,z:-1.94,y:2.13,action:'vocal'},
    {name:'巡演手记',x:-6.26,z:-1.23,y:1.73,action:'road'}
  );
  surface.floorContacts([boards,...rugs],footprints,floorWidth,floorDepth);
  surface.dress(room);surface.dress(roofAndFront);for(const {door} of doors)surface.dress(door);
  batch(room);batch(roofAndFront);
  return {seats,benches,obstacles,doors,landmarks,exhibits,portal,fixtures,listeningTables,listeningBench:chongqing.plan,plaque,wood,brass,teal,loftHide:[roofAndFront,...doors.map(d=>d.door)]};
};
