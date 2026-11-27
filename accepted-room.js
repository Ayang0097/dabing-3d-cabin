// Permanent fittings in the listening room. Distances, furniture and the visit viewpoints share world coordinates.
window.makeAcceptedRoom=function({room,obstacle,seats,landmarks,contact,fixtures}){
  const {T,box,ell,group,canvas,mat,panel,rounded,stick,cylinder,seeded}=HouseKit;
  const surface=CabinSurfaces,wood=surface.wood(0xd7bfaa),oak=surface.wood(0xefdbc2),dark=surface.wood(0x9d816c);
  const oldOak=surface.furnitureWood(0xdac0a3),tableFrame=surface.furnitureWood(0xc6a88a),legs=surface.furnitureWood(0xa78a72);
  const iron=mat(0x514e44,{roughness:.72,metalness:.42}),brass=mat(0xb4925f,{roughness:.47,metalness:.54});
  const rand=seeded(2211);
  function mesh(parent,geometry,material,x=0,y=0,z=0){
    const result=new T.Mesh(geometry,material);result.position.set(x,y,z);
    result.receiveShadow=result.castShadow=true;parent.add(result);return result;
  }
  function turned(parent,x,y,z,points,material,segments=28){
    return mesh(parent,new T.LatheGeometry(points.map(([r,h])=>new T.Vector2(r,h)),segments),material,x,y,z);
  }
  // Rounded long edges catch the window reflection between adjacent boards.
  function board(parent,x,y,z,width,height,depth,material,r=.009){
    const plank=rounded(parent,x,y,z,width,depth,height,r,material);plank.rotation.x=-Math.PI/2;return plank;
  }
  const exhibits=[];
  function hit(x,y,z,w,h,d){return {center:[x,y,z],size:[w,h,d]};}
  function exhibit(city,item,from,look,hits){exhibits.push({city,item,from,look,hits});}

  // The reading gallery and its brick listening steps use the deep window bay together.
  const mortar=surface.finish('limewash',0x8d745f);
  const clay=[0xca886c,0xda997a,0xb9826a,0xbe7864,0xd39672,0xc38973].map(color=>{
    const m=surface.finish('limewash',color).clone();m.normalScale.set(.46,.46);return m;
  });
  const brick=surface.finish('brick',0xebba96);
  function masonry(x,z,width,depth,top){
    const count=Math.max(2,Math.round(top/.087)),row=top/count;
    box(room,x,top/2,z,width-.013,top-.004,depth-.022,mortar);
    for(let j=0;j<count;j++){
      let left=x-width/2;
      while(left<x+width/2-.003){
        const half=j%2&&left===x-width/2;
        const right=Math.min(x+width/2,left+(half?.126:.239)+rand()*.035),bw=right-left;
        if(bw>.027){
          const b=rounded(room,(left+right)/2,row*(j+.5),z,bw-.006,row-.006,depth-.005+rand()*.009,.006,clay[Math.floor(rand()*clay.length)]);
          b.rotation.z=(rand()-.5)*.009;
        }
        left=right;
      }
    }
    return {x,z,w:width,d:depth,jumpTop:top};
  }
  const readingObstacles=[masonry(-5.14,3.07,3.18,.56,.30),masonry(-5.14,3.59,3.18,.47,.57)];
  box(room,-5.14,.29,4.57,3.18,.58,1.67,brick);
  for(let k=0;k<12;k++)box(room,-5.14,.604,3.80+k*.139,3.19,.056,.137,k%3?oldOak:tableFrame);
  readingObstacles.push({x:-5.14,z:4.57,w:3.19,d:1.67,jumpTop:.632});
  const brickSteps=obstacle(-5.14,4.1,3.18,2.62);
  brickSteps.airborneParts=readingObstacles;
  const cover=CabinPropMaterials.linen(new T.MeshStandardMaterial({
    map:surface.texture('accepted-woven-cushions.webp',true),side:T.DoubleSide}),1.4,.9,.74);
  const welt=mat(0x91735a,{roughness:.96});
  function pillow(x,y,z,w,d,h,print,angle=0){
    const g=group(room,x,y,z);g.rotation.x=angle;
    const pts=[],coords=[],faces=[],perimeter=[],segments=52;
    const rings=[[.008,.95],[.24,1.0],[.53,.94],[.76,.85],[.92,.70],[.982,.52],[1,.34],[.98,.17],[.90,.056],[.025,.032]];
    rings.forEach(([radius,level],j)=>{
      for(let k=0;k<segments;k++){
        const a=k*Math.PI*2/segments,c=Math.cos(a),si=Math.sin(a);
        const px=Math.sign(c)*Math.abs(c)**.42*radius,pz=Math.sign(si)*Math.abs(si)**.42*radius;
        const gather=(Math.cos(a*12+print*.7)+.4*Math.cos(a*21))*.019*radius**3;
        const xx=px*w*.5,zz=pz*d*.5,yy=h*(level+gather);
        pts.push(xx,yy,zz);coords.push((print+.506+px*.482)/4,.50-pz*.48);
        if(j===5)perimeter.push(new T.Vector3(xx,yy,zz));
        if(j+1<rings.length){const lo=j*segments,hi=lo+segments,next=(k+1)%segments;faces.push(lo+k,hi+next,hi+k,lo+k,lo+next,hi+next);}
      }
    });
    const form=new T.BufferGeometry();form.setAttribute('position',new T.Float32BufferAttribute(pts,3));form.setAttribute('uv',new T.Float32BufferAttribute(coords,2));form.setIndex(faces);form.computeVertexNormals();mesh(g,form,cover);
    mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(perimeter,true),segments,.0021,5,true),welt);
    return {x,z,w,d,jumpTop:y+h};
  }
  const stepSeats=6,stepPitch=.37,stepPad=[.304,.30];
  for(let i=0;i<stepSeats;i++){
    const x=-5.215+(i-(stepSeats-1)/2)*stepPitch,z=3.075;
    readingObstacles.push(pillow(x,.305,z,...stepPad,.08,[0,3,1,0,2,3][i]));
    seats.push({id:seats.length,x,z,y:.365,surfaceY:.385,stool:true,yaw:Math.PI,
      label:'丽江砖阶'+(i+1)+'席',rowName:'丽江砖阶听歌席',placeNumber:i+1,padSize:stepPad,
      bench:true,benchRadius:stepPitch*.5-.012,floorObstacle:brickSteps,approachDirection:{x:0,z:-1},
      pickSize:[stepPitch-.025,.062,.33],pickY:.365,occupied:null,reserved:null});
  }
  // Matte ochre end wall and a short return keep the galleries visually joined.
  readingObstacles.push(
    masonry(-6.49,4.24,.40,.96,.76),
    masonry(-6.535,3.47,.38,1.27,.57),
    pillow(-5.86,.573,3.61,.49,.31,.078,1,-.055),
    pillow(-4.55,.573,3.63,.43,.31,.084,2,-.04),
    {x:-6.62,z:4.55,w:.13,d:1.55,cameraHeight:1.475}
  );
  box(room,-6.62,1.03,4.55,.13,.89,1.55,surface.finish('limewash',0xf3c078));
  const library=group(room,-5.25,.63,5.16);library.rotation.y=Math.PI;
  box(library,0,.84,-.09,2.49,1.67,.07,dark);
  for(const x of [-1.24,.14,1.24])box(library,x,.84,.018,.057,1.69,.25,wood);
  for(let row=0;row<4;row++){
    const y=.11+row*.42;
    board(library,0,y,.02,2.53,.048,.31,oak);
    let x=-1.18;
    for(let j=0;j<31;j++){
      if(x>.04&&x<.22)x=.22;
      const w=.041+rand()*.052,height=.21+rand()*.12,depth=.13+rand()*.08;
      if(x+w>1.20)break;
      const book=makeCabinBook(library,x+w/2,y+.024+height/2,.053,w,height,depth,row*6+j);
      book.rotation.z=j%9===3?-.095:0;x+=w+.013+(j%8===2?.06:0);
    }
  }
  box(library,0,1.70,.03,2.57,.06,.34,dark);
  readingObstacles.push({x:library.position.x,z:library.position.z-.03,w:2.57,d:.34,cameraHeight:2.36});
  const reading=group(room,-5.04,.635,4.16);
  readingObstacles.push({x:reading.position.x,z:reading.position.z,w:2.11,d:.75,cameraHeight:1.43});
  for(const x of [-.88,.88])for(const z of [-.25,.25])box(reading,x,.35,z,.063,.70,.061,legs);
  for(const z of [-.23,.23])box(reading,0,.65,z,1.88,.11,.055,tableFrame);
  for(let k=0;k<3;k++){
    const plank=box(reading,0,.752,-.251+k*.251,2.11,.085,.247,k===0?tableFrame:oldOak);
    plank.userData.grainCenter=[.22,.47,.81][k];
  }
  for(const x of [-.86,.86]){
    box(reading,x,.20,0,.055,.077,.54,tableFrame);
    for(const z of [-.258,.258])ell(reading,x,.651,z,.009,.009,.003,iron);
  }
  surface.tabletopWear(reading,.7958,[
    [-.29,-.24,.132,.123,0,.73],[.57,.173,.155,.138,2,-.21],
    [-.77,.24,.25,.10,1,-.09],[.22,-.31,.31,.093,3,.03]
  ]);
  function bookStack(parent,x,y,z,count){
    for(let k=0;k<count;k++){
      const b=makeCabinBook(parent,x,y+.025+k*.046,z,.044,.30-k*.011,.208,k+3);
      b.rotation.order='YXZ';b.rotation.z=Math.PI/2;b.rotation.y=k*.080-.08;
    }
  }
  bookStack(reading,-.70,.798,.01,3);
  const leaves=canvas(640,420,(c,w,h)=>{
    c.fillStyle='#dfcba9';c.fillRect(0,0,w,h);c.textBaseline='top';c.fillStyle='#554c41';
    const lines=['夜色刚刚落下，窗边的书还翻在那一页。','门前的脚步声慢下来，有人在木桌旁坐下。','从巷口走过，听见有人轻轻弹起了琴。','翻过山口以后，天光照在屋檐上。'];
    for(const [k,x] of [27,350].entries()){
      c.font='bold 24px "Kaiti SC",serif';c.fillText(k?'窗边手记':'山路来信',x,34);
      c.font='14px "Songti SC",serif';c.fillStyle='#655947';
      for(let j=0;j<12;j++)c.fillText(lines[(j+k*2)%lines.length],x,86+j*23,246);
      c.font='12px Georgia';c.fillText(k?'48':'47',x+110,387);
    }
    const fold=c.createLinearGradient(276,0,352,0);fold.addColorStop(0,'#7d644500');fold.addColorStop(.49,'#6c513b66');fold.addColorStop(1,'#8b705400');c.fillStyle=fold;c.fillRect(276,0,76,h);
  });
  const bookBase=group(reading,.045,.809,.002);bookBase.rotation.y=.15;
  fixtures.readingPage=reading.position.clone().add(bookBase.position).add(new T.Vector3(.085,.026,-.015)).toArray();
  board(bookBase,0,0,0,.475,.015,.308,dark,.005);
  const leafMaterial=new T.MeshStandardMaterial({map:leaves,roughness:.94,side:T.DoubleSide});
  const geo=new T.PlaneGeometry(.461,.295,30,8),verts=geo.attributes.position;
  geo.rotateX(-Math.PI/2);
  for(let k=0;k<verts.count;k++){
    const u=Math.abs(verts.getX(k))/.231;
    verts.setY(k,.012+.021*Math.sin(Math.PI*u)+.004*Math.cos(verts.getZ(k)*13)*u*u);
  }
  geo.computeVertexNormals();mesh(bookBase,geo,leafMaterial);
  // The green shade, its yoke and glazed tea mug leave a readable silhouette around the open book.
  const taskLamp=group(reading,.57,.799,-.12),verdigris=new T.MeshPhysicalMaterial({color:0x5b7752,clearcoat:.53,roughness:.36,metalness:.16});
  turned(taskLamp,0,0,0,[[.062,0],[.084,.008],[.079,.023],[.057,.03],[.03,.044],[.023,.054]],brass);
  const neckPoints=[[0,.036,0],[.025,.14,0],[.026,.24,0],[-.015,.309,0],[-.095,.327,0],[-.128,.296,0]].map(p=>new T.Vector3(...p));
  mesh(taskLamp,new T.TubeGeometry(new T.CatmullRomCurve3(neckPoints),18,.008,8,false),brass);
  const lampHead=group(taskLamp,-.13,.259,0);lampHead.rotation.z=-.26;
  ell(lampHead,0,0,0,.120,.064,.078,verdigris);
  const lampDiffuser=mat(0xe2c693,{emissive:0xffca80,emissiveIntensity:.55});
  lampDiffuser.userData.probeRadiance=9;
  ell(lampHead,0,-.024,.004,.116,.031,.076,lampDiffuser).castShadow=false;
  const bulbOffset=new T.Vector3(0,-.058,.004).applyQuaternion(lampHead.quaternion);
  fixtures.readingLamp=reading.position.clone().add(taskLamp.position).add(lampHead.position).add(bulbOffset).toArray();
  const glaze=canvas(512,180,(c,w,h)=>{
    c.fillStyle='#e1d9c3';c.fillRect(0,0,w,h);
    for(let i=0;i<1700;i++){c.fillStyle=i%3?'#fcf0d333':'#5f655e24';c.fillRect(rand()*w,rand()*h,1,1);}
    c.fillStyle='#4e6d86';for(const y of [21,26,148,155])c.fillRect(0,y,w,2);
    c.strokeStyle='#617e95';c.lineWidth=2.3;
    for(let j=0;j<5;j++){
      const x=48+j*104,y=86+(j%2)*11;c.beginPath();c.moveTo(x-39,y+22);c.quadraticCurveTo(x,y+17,x+28,y-20);c.stroke();
      for(let k=0;k<3;k++){const dx=x-24+k*15,dy=y+18-k*6;c.beginPath();c.ellipse(dx,dy-6,4,8,-.6,0,Math.PI*2);c.fill();}
      for(let k=0;k<5;k++){const a=k*2*Math.PI/5;c.beginPath();c.ellipse(x+22+8*Math.cos(a),y-18+8*Math.sin(a),4.1,7.5,a-Math.PI/2,0,Math.PI*2);c.fill();}
    }
  });
  const porcelain=new T.MeshPhysicalMaterial({map:glaze,roughness:.25,clearcoat:.49});
  const cobalt=mat(0x42647b,{roughness:.39});
  turned(reading,.369,.797,.125,[[.028,0],[.047,.005],[.046,.017],[.052,.099],[.052,.106],[.047,.106],[.045,.095],[.032,.022]],porcelain);
  for(const y of [.813,.890])turned(reading,.369,y,.125,[[.044,0],[.050,.002],[.050,.004]],cobalt);
  const loop=mesh(reading,new T.TorusGeometry(.031,.006,7,20),porcelain,.423,.85,.125);loop.scale.y=1.16;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;ell(reading,.369+Math.cos(a)*.048,.852,.125+Math.sin(a)*.048,.006,.010,.006,cobalt);}
  const readingChair=group(reading,.57,0,.545);
  readingObstacles.push({x:reading.position.x+readingChair.position.x,z:reading.position.z+readingChair.position.z+.009,
    w:.34,d:.35,cameraHeight:1.46});
  for(const x of [-.126,.126])for(const z of [-.12,.12])box(readingChair,x,.20,z,.033,.40,.033,dark);
  for(const x of [-.12,.12])box(readingChair,x,.58,.135,.033,.48,.037,dark);
  box(readingChair,0,.75,.138,.275,.135,.036,dark);
  board(readingChair,0,.416,0,.338,.045,.326,wood,.021);
  for(const x of [-.119,.119])box(readingChair,x,.184,0,.023,.030,.261,wood);
  for(const y of [.61,.69])box(readingChair,0,y,.135,.241,.033,.029,wood);
  const plaid=canvas(192,256,(c,w,h)=>{
    c.fillStyle='#a87f6a';c.fillRect(0,0,w,h);
    for(let i=0;i<w;i+=42){c.fillStyle='#885357';c.fillRect(i,0,15,h);c.fillStyle='#c6b398';c.fillRect(i+16,0,4,h);}
    for(let j=0;j<h;j+=46){c.fillStyle='#61393766';c.fillRect(0,j,w,16);c.fillStyle='#e4c7a588';c.fillRect(0,j+19,w,4);}
  });
  const scarfMat=CabinPropMaterials.linen(new T.MeshStandardMaterial({map:plaid,side:T.DoubleSide}),1.8,3,.42);
  const clothGeo=new T.PlaneGeometry(.147,.421,8,18),clothPos=clothGeo.attributes.position;
  for(let j=0;j<clothPos.count;j++){
    const x=clothPos.getX(j),v=.50-clothPos.getY(j)/.421;
    clothPos.setXYZ(j,x,.817-.394*v,.127+.047*Math.sin(Math.min(1,v/.23)*Math.PI/2)+.011*Math.cos(x*124)*(.4+.6*v));
  }
  clothGeo.computeVertexNormals();mesh(readingChair,clothGeo,scarfMat,-.041,0,0);
  const tassel=mat(0xa58868);
  for(let k=0;k<12;k++){const x=-.11+k*.012;stick(readingChair,[x,.429,.177],[x+.003*Math.sin(k),.393+.009*(k%3),.179],.0021,tassel,5);}
  // Lattice shades, terracotta crock, and a trailing pothos fill the upper shelf as in the selected study.
  const fern=group(library,-.91,1.735,.025);
  turned(fern,0,0,0,[[.064,0],[.11,.022],[.139,.13],[.146,.138],[.148,.153],[.134,.157],[.125,.132]],porcelain);
  const soil=mat(0x44372d);cylinder(fern,0,.14,0,.129,.129,.016,soil);
  for(const y of [.043,.114,.135])turned(fern,0,y,0,[[y>.1?.138:.117,0],[y>.1?.139:.119,.003]],cobalt);
  const leafMap=canvas(160,230,(c,w,h)=>{
    const light=c.createLinearGradient(0,0,w,h);light.addColorStop(0,'#91a96f');light.addColorStop(.5,'#9bb879');light.addColorStop(1,'#47623c');c.fillStyle=light;c.fillRect(0,0,w,h);
    c.strokeStyle='#bfcc9299';c.lineWidth=1.6;c.beginPath();c.moveTo(80,0);c.quadraticCurveTo(91,106,80,230);c.stroke();
    for(let k=0;k<9;k++)for(const sign of [-1,1]){
      const y=11+k*21;c.strokeStyle='#b8ca8a8a';c.lineWidth=1.35;c.beginPath();c.moveTo(82,y+38);c.quadraticCurveTo(81+sign*32,y+32,80+sign*77,y-5);c.stroke();
    }
    for(let i=0;i<1600;i++){c.fillStyle=i%2?'#525d3d25':'#dfd69532';c.fillRect(rand()*w,rand()*h,1.2,1);}
  });
  const foliage=[0xbbc381,0x9fb37f,0xd2ca8b].map(color=>new T.MeshStandardMaterial({color,map:leafMap,roughness:.58,side:T.DoubleSide}));
  const leafGeo=new T.PlaneGeometry(1,1,6,10),bladePos=leafGeo.attributes.position,bladeUV=leafGeo.attributes.uv;
  for(let j=0;j<bladePos.count;j++){
    const u=bladeUV.getX(j)*2-1,v=1-bladeUV.getY(j),width=.047*Math.pow(Math.sin(Math.PI*Math.pow(v,.61)),.88);
    bladePos.setXYZ(j,u*width,-.116*v+.006*(1-v)*Math.abs(u),.012*Math.sin(v*Math.PI)*(1-Math.abs(u))-.015*v*v);
  }
  leafGeo.computeVertexNormals();
  const vines=mat(0x697546);
  for(let j=0;j<6;j++){
    const points=[],side=j%2?1:-1;
    for(let k=0;k<=8;k++){
      const f=k/8;
      const pt=[side*(.035+Math.sin(f*2.3)*(.14+.05*j)),.16+.16*Math.sin(Math.PI*f)-f*f*(j===2?.77:.12+j*.045),.02+f*.17+.028*Math.sin(f*6+j)];
      points.push(new T.Vector3(...pt));
      if(k>0){const leaf=mesh(fern,leafGeo,foliage[(k+j)%3],...pt);leaf.rotation.set(.21+rand()*.48,rand()*1.4-.7,(k%2?1:-1)*(.45+rand()*.53));leaf.scale.setScalar(.68+rand()*.43);}
    }
    mesh(fern,new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.0034,5,false),vines);
  }
  bookStack(library,.42,1.73,.02,3);
  // The story is on the brick risers below the separate seat targets.
  exhibit('丽江','贴墙砖阶围座',[-4.95,1.29],[-5.24,.49,3.27],[
    hit(-5.14,.459,3.593,3.18,.286,.448),
    hit(-5.14,.151,2.803,3.18,.288,.035)
  ]);
  exhibit('大理','阳光阁楼的图书长桌',[-4.50,1.00],[-5.17,1.48,4.56],[
    hit(-5.04,1.392,4.16,2.115,.095,.754),hit(-5.74,1.498,4.17,.31,.146,.22),
    hit(-5.25,1.526,5.115,2.57,1.677,.31)
  ]);
  exhibit('成都','缝纫机脚留言桌',[-4.63,1.76],[-5.77,.60,.25],[
    hit(-5.70,.777,.30,.764,.102,1.725),
    hit(-5.70,.388,-.31,.55,.69,.22),hit(-5.70,.388,.91,.55,.69,.22),
    hit(-5.72,.147,.30,.35,.076,1.51)
  ]);
  exhibit('西塘','蜡泪与小黑板',[4.89,-.83],[6.32,1.70,-1.94],[
    hit(6.34,1.84,-2.31,.17,1.05,.58),hit(6.30,1.65,-1.57,.35,.86,.63),hit(6.32,1.18,-1.94,.44,.10,1.68)
  ]);
  exhibit('苏州','评弹三弦与吉他',[-4.33,-2.04],[-4.95,.98,-4.30],[
    hit(-4.68,.64,-4.24,.54,.65,.27),hit(-4.68,1.21,-4.30,.18,.59,.20),
    hit(-5.20,.62,-4.29,.30,.48,.19),hit(-5.20,1.20,-4.32,.19,.78,.17)
  ]);

  // A shared song-request table, with turned opal pendants and the separate, square Guiyang table light.
  const table=group(room,4.42,0,1.32);
  for(const x of [-.81,.81])for(const z of [-.28,.28]){
    box(table,x,.364,z,.065,.716,.068,legs);
    contact(table.position.x+x,table.position.z+z,.29,.29,.58);
  }
  for(const z of [-.287,.287])box(table,0,.611,z,1.79,.132,.046,tableFrame);
  for(const x of [-.79,.79])box(table,x,.228,0,.045,.060,.59,tableFrame);
  const songPlanks=[0xbd9574,0xdcb895,0xcba886,0xc39876].map(surface.furnitureWood);
  songPlanks.forEach((material,k)=>{
    const plank=box(table,0,.721,-.319+k*.213,1.98,.078,.209,material);
    plank.userData.grainCenter=[.22,.53,.74,.92][k];
  });
  for(const x of [-.81,.81])for(const z of [-.28,.28]){
    ell(table,x,.760,z,.009,.0018,.009,mat(0x70533d,{roughness:.91}));
    box(table,x,.103,z,.069,.015,.070,legs);
  }
  box(table,0,.219,-.278,1.62,.054,.050,tableFrame);
  surface.tabletopWear(table,.7610,[
    [-.59,.20,.170,.152,0,.29],[.25,-.26,.168,.147,2,.80],[.77,.226,.126,.117,0,1.1],
    [-.74,.32,.245,.115,3,.037],[-.22,-.27,.36,.165,1,-.19],[.36,.21,.26,.126,1,.084]
  ]);
  obstacle(4.42,1.32,1.98,.852,undefined,.761);contact(4.42,1.32,2.64,1.47,.32);
  const tag=canvas(352,192,(c,w,h)=>{
    c.fillStyle='#ded0b3';c.fillRect(0,0,w,h);c.strokeStyle='#876f55';c.lineWidth=2;c.strokeRect(10,10,w-20,h-20);
    c.fillStyle='#74513e';c.textAlign='center';c.font='bold 53px "Kaiti SC",serif';c.fillText('想听的歌',w/2,77);
    for(let i=0;i<3;i++){c.fillStyle='#ac9875';c.fillRect(35,103+22*i,279,2);}
  });
  for(let k=0;k<3;k++){const slip=panel(table,-.41+k*.025,.763+k*.0019,.15,.22,.12,tag);slip.rotation.order='YXZ';slip.rotation.x=-Math.PI/2;slip.rotation.y=.07+k*.075;}
  stick(table,[-.16,.773,.20],[-.02,.773,.03],.006,iron,6);
  const bulb=new T.MeshPhysicalMaterial({color:0xffdfab,emissive:0xffc16d,emissiveIntensity:.80,
    roughness:.35,clearcoat:.27,clearcoatRoughness:.26});
  bulb.userData.probeRadiance=15;
  const wire=mat(0x51483c),blackened=mat(0x544537,{roughness:.50,metalness:.52});
  box(room,4.42,3.70,1.32,2.36,.132,.128,dark);
  for(const [i,dx] of [-.78,0,.78].entries()){
    const x=4.42+dx,y=i===1?2.66:2.76;
    if(i===1)fixtures.tableGlobe=[x,y,1.32];
    stick(room,[x,3.64,1.32],[x,y+.16,1.32],.007,wire);
    turned(room,x,3.62,1.32,[[.014,0],[.025,.012],[.048,.020],[.051,.028]],blackened);
    turned(room,x,y,1.32,[[.044,.105],[.050,.113],[.048,.133],[.032,.142],[.029,.174],[.017,.181]],brass);
    for(const k of [.144,.152,.160])cylinder(room,x,y+k,1.32,.032,.032,.0026,blackened,20);
    turned(room,x,y,1.32,[[.001,-.148],[.053,-.138],[.091,-.110],[.122,-.064],[.137,-.009],[.131,.047],[.108,.085],[.075,.108],[.047,.118]],bulb,36);
  }
  const lamp=group(table,.62,.764,-.12);
  obstacle(table.position.x+lamp.position.x,table.position.z+lamp.position.z,.222,.222,1.013,1.013);
  fixtures.tableLamp=table.position.clone().add(lamp.position).add(new T.Vector3(0,.145,0)).toArray();
  const opal=surface.texture('accepted-lantern-pane.webp',true);
  const mica=new T.MeshPhysicalMaterial({map:opal,emissive:0xffdeb3,emissiveMap:opal,emissiveIntensity:.93,
    roughness:.39,clearcoat:.33,clearcoatRoughness:.27,side:T.DoubleSide});
  mica.userData.probeRadiance=7;
  board(lamp,0,.011,0,.220,.018,.220,dark,.004);
  board(lamp,0,.027,0,.214,.013,.214,blackened,.003);
  for(let i=0;i<4;i++){
    const wall=group(lamp);wall.rotation.y=i*Math.PI*.5;
    const face=new T.PlaneGeometry(.187,.202),uv=face.attributes.uv;
    for(let j=0;j<uv.count;j++)uv.setX(j,(i+.013+.974*uv.getX(j))/4);
    const pane=mesh(wall,face,mica,0,.143,.095);pane.castShadow=false;
    for(const h of [.038,.245])box(wall,0,h,.097,.203,.007,.009,blackened);
    box(wall,-.098,.143,.097,.007,.211,.009,blackened);
    for(const x of [-.090,.090])ell(wall,x,.041,.102,.0032,.0032,.0018,brass);
  }
  const lid=new T.PlaneGeometry(.189,.189),lidUv=lid.attributes.uv;
  for(let j=0;j<lidUv.count;j++)lidUv.setX(j,(2.02+.96*lidUv.getX(j))/4);
  const shadeLid=mesh(lamp,lid,mica,0,.244,0);shadeLid.rotation.x=-Math.PI/2;
  // Five independent hem profiles and knots follow the selected blue, saffron, cream, red and green pennants.
  stick(room,[6.30,3.31,-.38],[6.30,3.31,2.82],.020,oak);
  for(const z of [-.40,2.84])ell(room,6.30,3.31,z,.034,.034,.055,brass);
  for(const z of [-.34,2.78]){
    stick(room,[6.84,3.34,z],[6.30,3.31,z],.010,iron,8);
    stick(room,[6.84,3.12,z],[6.52,3.32,z],.008,iron,8);
  }
  const flagHits=[],bindings=mat(0xb2976f,{roughness:.94});
  const flagPrint=surface.texture('accepted-embroidered-flags.webp',true);
  const cloth=CabinPropMaterials.linen(new T.MeshStandardMaterial({map:flagPrint,side:T.DoubleSide}),1.5,3.1,.42);
  const hems=[[.88,.81,.75,.86,.97],[1,.95,.86,.82,.80],[.80,.87,.96,.87,.81],[.99,.91,.83,.89,.96],[.96,.88,.80,.73,.80]];
  hems.forEach((hem,i)=>{
    const z=-.008+i*.628,w=.500,top=3.247,height=.97;
    const geo=new T.PlaneGeometry(w,height,22,29),pos=geo.attributes.position,uv=geo.attributes.uv;
    for(let j=0;j<pos.count;j++){
      const u=uv.getX(j),v=1-uv.getY(j),segment=Math.min(3,Math.floor(u*4)),mix=u*4-segment;
      const edge=hem[segment]*(1-mix)+hem[segment+1]*mix,span=Math.sin(u*Math.PI);
      const hemFray=(.003*Math.sin(u*184+i*3)+.002*Math.sin(u*319)) * v**9;
      pos.setXYZ(j,(u-.5)*w+.010*v*Math.sin(i+v*2+u*5),
        -height*edge*v-.028*span*(1-v)+hemFray,
        (.011+.017*v)*Math.sin(u*13+i*.9)+.029*v*Math.sin(u*6-v*2+i));
      uv.setXY(j,(i+.004+.992*u)/5,1-v);
    }
    geo.computeVertexNormals();const flag=mesh(room,geo,cloth,6.30,top,z);
    flag.rotation.y=-Math.PI/2+.023*Math.cos(i);
    flagHits.push(hit(6.30,top-.45,z,.155,.98,.526));
    for(const a of [-1,1]){
      const tip=z+a*(w*.5-.018);
      mesh(room,new T.TorusGeometry(.028,.005,6,16),bindings,6.30,3.307,tip);
      stick(room,[6.30,3.303,tip],[6.303,top-.008,tip+a*.006],.005,bindings,6);
      stick(room,[6.30,3.279,tip],[6.29,3.235,tip+a*.036],.0038,bindings,5);
    }
  });
  exhibit('阳朔','圆吊灯下的点歌长桌',[2.18,3.05],[4.40,1.60,1.32],[
    hit(4.42,.714,1.32,1.982,.095,.853),
    hit(3.64,2.77,1.32,.304,.367,.304),hit(4.42,2.67,1.32,.304,.367,.304),hit(5.20,2.77,1.32,.304,.367,.304)
  ]);
  exhibit('贵阳','木桌上的方灯',[5.77,1.11],[5.00,.91,1.20],[hit(5.04,.896,1.20,.237,.266,.237)]);
  exhibit('郑州','绿椅上方的彩色字旗',[2.01,2.50],[6.29,2.72,1.20],flagHits);
  landmarks.push({name:'点歌长桌',x:4.03,y:.82,z:1.50,action:'vocal'});

  // The garden exhibit shares the east wall panelling and has its own listening stool.
  for(let i=0;i<14;i++)box(room,5.61,.033,3.72+i*.127,2.30,.052,.123,i%3===1?oak:wood);
  for(const z of [-.13,0,.13])box(room,6.17,.80,4.48+z,.47,.058,.127,z?tableFrame:oldOak);
  surface.tabletopWear(room,.830,[[6.29,4.51,.14,.127,0,.55],[6.04,4.55,.11,.095,1,-.45]]);
  for(const x of [6.03,6.31])for(const z of [4.36,4.61])stick(room,[x,.06,z],[x,.79,z],.018,iron);
  for(const [x,z,r] of [[6.15,3.93,.41],[6.38,4.95,.49],[5.40,5.03,.32],[6.17,4.48,.46]])obstacle(x,z,r,r);
  const stool=group(room,5.06,0,4.71);cylinder(stool,0,.397,0,.195,.184,.047,oldOak,32);
  for(let k=0;k<3;k++){
    const a=k*2*Math.PI/3,c=Math.cos(a),s=Math.sin(a);
    stick(stool,[c*.154,.034,s*.154],[c*.115,.377,s*.115],.021,legs);
    cylinder(stool,c*.116,.421,s*.116,.0065,.0065,.0016,mat(0x77583e,{roughness:.88}),10);
  }
  surface.tabletopWear(stool,.4213,[[-.026,.013,.15,.11,1,.22],[.047,-.032,.132,.121,2,1.1]]);
  const stoolFootprint=obstacle(5.06,4.71,.39,.39,.421,.421);
  seats.push({id:seats.length,x:5.06,z:4.71,y:.397,surfaceY:.421,stool:true,yaw:-Math.PI*.66,
    label:'花园阳台小凳',bench:true,benchRadius:.145,floorObstacle:stoolFootprint,
    approachDirection:{x:-1,z:0},roundPad:true,padSize:[.39,.39],pickSize:[.388,.060,.388],pickY:.401,
    occupied:null,reserved:null});
  exhibit('临沂','花园小阳台',[4.24,3.67],[6.07,.85,4.55],[
    hit(6.15,.496,3.93,.48,.96,.45),hit(6.38,.62,4.95,.58,1.21,.52),
    hit(6.18,1.11,4.49,.39,.62,.34)
  ]);

  // An illustrated route card in a wood and brass sloping frame beside the entrance.
  const guide=group(room,2.84,0,4.97);guide.rotation.y=Math.PI-.26;
  box(guide,0,.53,0,.135,1.04,.115,dark);box(guide,0,.081,0,.77,.11,.50,dark);
  const mount=group(guide,0,1.13,.055);mount.rotation.x=-.29;
  rounded(mount,0,0,0,.88,.89,.055,.025,dark);
  for(const x of [-.420,.420])box(mount,x,0,.031,.025,.857,.017,wood);
  for(const y of [-.424,.424])box(mount,0,y,.032,.858,.024,.016,wood);
  // Map the ink face of the approved illustration onto a curled sheet; the frame stays three-dimensional.
  const mapTexture=surface.texture('accepted-hefei-ink.webp',true);
  const mapStock=new T.MeshStandardMaterial({map:mapTexture,roughness:.93,side:T.DoubleSide,
    emissive:0xffffff,emissiveMap:mapTexture,emissiveIntensity:.075});
  const leaf=new T.PlaneGeometry(.758,.786,44,38),paperPos=leaf.attributes.position,puv=leaf.attributes.uv;
  for(let k=0;k<paperPos.count;k++){
    const u=puv.getX(k),v=puv.getY(k),edge=Math.max(Math.abs(2*u-1),Math.abs(2*v-1))**13;
    const worn=.003*Math.sin(v*53+u*15)+.002*Math.sin(v*83-u*77);
    // Lower-right corner lifts away from the backing; a faint old horizontal fold crosses the page.
    const curl=.029*u**7*(1-v)**5+.010*(1-u)**9*v**9;
    const ridge=.0036*Math.exp(-Math.pow((v-.51)*31,2)); 
    paperPos.setXYZ(k,paperPos.getX(k)+edge*worn,paperPos.getY(k)+edge*.003*Math.sin(u*91-v*16),.038+curl+ridge);
  }
  leaf.computeVertexNormals();mesh(mount,leaf,mapStock);
  for(const [x,y] of [[-.347,.360],[.346,.360],[-.348,-.355]]){
    cylinder(mount,x,y,.044,.007,.008,.006,brass,10).rotation.x=Math.PI/2;
  }
  obstacle(2.84,4.97,.84,.58);
  // Use bands so the inclined board follows the actual panel and leaves the air in front of the stand free.
  mount.updateWorldMatrix(true,false);
  const mapHits=[];
  for(let j=0;j<3;j++){
    const lo=-.445+j*.89/3,hi=lo+.89/3;
    const bounds=new T.Box3(new T.Vector3(-.44,lo,-.0275),new T.Vector3(.44,hi,.032)).applyMatrix4(mount.matrixWorld);
    mapHits.push({center:bounds.getCenter(new T.Vector3()).toArray(),size:bounds.getSize(new T.Vector3()).toArray()});
  }
  exhibit('合肥','手绘到店地图',[2.47,3.59],[2.84,1.17,4.97],mapHits);
  return exhibits;
};
