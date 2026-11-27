window.makeCabinStreet = function(scene, vocalistName) {
  const {T,mat,canvas,group,box,ell,cylinder,stick,panel,rounded,seeded,batch,shadow}=HouseKit;
  const world=group(scene), rand=seeded(185),wood=CabinSurfaces.wood(0x92765e);
  const brass=mat('#98754a',{roughness:.47,metalness:.66}),iron=mat('#353b36',{roughness:.71,metalness:.46});
  const yard=new T.Mesh(new T.PlaneGeometry(33,13.8),CabinPropMaterials.slate(33,13.8));
  yard.geometry.setAttribute('uv1',yard.geometry.attributes.uv);yard.position.set(0,-.109,10.5);yard.rotation.x=-Math.PI/2;
  yard.receiveShadow=true;world.add(yard);
  const awning=box(world,0,3.73,5.97,14.25,.13,1.23,wood);awning.rotation.x=.23;box(world,0,3.55,6.56,14.32,.15,.14,wood);
  const roofMats=['#475452','#454c49','#52605a','#50594e'].map(c=>mat(c,{roughness:.89}));
  const tileGeo=new T.CylinderGeometry(.10,.11,.69,14,1,true,0,Math.PI);
  for(let j=0;j<2;j++)for(let i=0;i<80;i++){
    const o=new T.Mesh(tileGeo,roofMats[(i+j*3)%4]);o.rotation.order='YXZ';o.rotation.x=Math.PI/2+.21;o.position.set(-7.1+i*.18,3.88-j*.14,5.71+j*.55);world.add(o);o.castShadow=true;
  }
  for(let x of [-6.25,-2.20,2.22,6.25])stick(world,[x,3.14,5.57],[x,3.55,6.48],.065,wood);
  function artPanel(p,x,y,z,w,h,paint,light=.13){return panel(p,x,y,z,w,h,canvas(768,Math.round(768*h/w),paint),light);}
  const sign=group(world,0,3.28,5.83);
  box(sign,0,0,0,3.89,.65,.13,wood);
  artPanel(sign,0,0,.072,3.79,.58,(c,w,h)=>{
    c.fillStyle='#253b38';c.fillRect(0,0,w,h);for(let j=0;j<2600;j++){c.fillStyle=rand()>.45?'rgba(120,139,112,.12)':'rgba(8,30,26,.14)';c.fillRect(rand()*w,rand()*h,1+rand()*12,1);}
    c.strokeStyle='#baa577';c.lineWidth=2;c.strokeRect(8,8,w-16,h-16);c.fillStyle='#ead6a5';c.font='bold 84px "Kaiti SC","STKaiti","Songti SC",serif';c.textAlign='center';c.textBaseline='middle';c.fillText('大 冰 的 小 屋',w*.50,h*.48);for(let a of [20,w-20])for(let b of [19,h-19]){c.fillStyle='#b7a878';c.beginPath();c.arc(a,b,3,0,7);c.fill();}
  },.28);
  const glowTex=canvas(100,100,(c,w,h)=>{const g=c.createRadialGradient(50,50,0,50,50,50);g.addColorStop(0,'rgba(255,195,111,.28)');g.addColorStop(.27,'rgba(249,158,82,.15)');g.addColorStop(1,'rgba(247,150,68,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
  const lanternMap=canvas(512,256,(c,w,h)=>{
    const light=c.createLinearGradient(0,0,0,h);
    light.addColorStop(0,'#723829');light.addColorStop(.24,'#be603d');light.addColorStop(.51,'#e99357');
    light.addColorStop(.77,'#c7653f');light.addColorStop(1,'#813e2c');c.fillStyle=light;c.fillRect(0,0,w,h);
    for(let x=0;x<w;x+=32){c.fillStyle='rgba(80,36,29,.28)';c.fillRect(x,0,2,h);}
    for(let y=0;y<h;y+=3){c.fillStyle='rgba(66,32,26,.11)';c.fillRect(0,y,w,1);}
    for(let j=0;j<5000;j++){c.fillStyle=rand()>.5?'#ffffff0c':'#150d060c';c.fillRect(rand()*w,rand()*h,2,1);}
  });
  const lampRed=CabinPropMaterials.linen(new T.MeshStandardMaterial({map:lanternMap,emissiveMap:lanternMap,emissive:0xffaf74,emissiveIntensity:.62}),3,1.7,.11);
  function lantern(x,y,z,r=.23){
    const g=group(world,x,y,z);stick(g,[0,.02,0],[0,.40,0],.012,iron);
    const pts=[[.09,-.31],[.19,-.25],[.24,-.14],[.25,.04],[.232,.18],[.18,.26],[.095,.29]].map(([a,b])=>new T.Vector2(a*r/.23,b));
    const shell=new T.Mesh(new T.LatheGeometry(pts,32),lampRed);g.add(shell);
    cylinder(g,0,.306,0,.116,.12,.044,iron,24);cylinder(g,0,-.313,0,.110,.12,.033,brass,24);
    for(let k=0;k<12;k++){
      const y=-.237+k*.043, j=pts.findIndex(p=>p.y>y), lo=pts[j-1],hi=pts[j];
      const rr=lo.x+(hi.x-lo.x)*(y-lo.y)/(hi.y-lo.y);
      const ring=new T.Mesh(new T.TorusGeometry(rr+.001,.0025,5,40),mat('#a86945',{roughness:.82}));
      ring.rotation.x=Math.PI/2;ring.position.y=y;g.add(ring);
    }
    for(let k=0;k<9;k++){const a=k*2.399;stick(g,[0,-.34,0],[Math.cos(a)*.027,-.54-rand()*.025,Math.sin(a)*.027],.004,mat('#ab5b3e'),5);}
    const halo=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xffac66,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));halo.scale.set(1.09,1.2,1);g.add(halo);
  }
  lantern(-2.25,2.96,6.10);lantern(2.26,2.96,6.10);
  const leafMap=canvas(160,384,(c,w,h)=>{
    const fill=c.createLinearGradient(0,0,w,h*.1);
    fill.addColorStop(0,'#63894d');fill.addColorStop(.48,'#9caf7b');fill.addColorStop(.515,'#bbc794');fill.addColorStop(1,'#768f59');c.fillStyle=fill;c.fillRect(0,0,w,h);
    c.strokeStyle='rgba(68,89,45,.25)';c.lineWidth=1.15;
    for(let y=22;y<h;y+=17)for(const side of [-1,1]){c.beginPath();c.moveTo(w*.5,y);c.bezierCurveTo(w*(.5+side*.14),y-8,w*(.5+side*.43),y-39,w*(.5+side*.51),y-67);c.stroke();}
    for(let i=0;i<2400;i++){c.fillStyle=rand()>.55?'#f2dcb91b':'#162c2319';c.fillRect(rand()*w,rand()*h,1,2);}
  });
  const leafSkin=['#769061','#808e56','#8f9f68','#657c55'].map(color=>new T.MeshStandardMaterial({color,map:leafMap,roughness:.63,side:T.DoubleSide}));
  function blade(curve){
    const pos=[],uv=[],faces=[],steps=12;
    for(let i=0;i<=steps;i++){const t=i/steps,w=.122*Math.pow(Math.sin(Math.PI*t),.76),bend=t*t*curve;
      for(let j=-1;j<=1;j++){pos.push(t*t*.06+j*w,t-.34*t*t,bend+.056*Math.sin(t*Math.PI)*(1-Math.abs(j)));uv.push((j+1)/2,t);}
      if(i<steps)for(let j=0;j<2;j++){const k=i*3+j;faces.push(k,k+1,k+3,k+1,k+4,k+3);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(faces);geo.computeVertexNormals();return geo;
  }
  const blades=[blade(.20),blade(.38),blade(.54)];
  const potGrain=canvas(256,128,(c,w,h)=>{c.fillStyle='#d7d4cb';c.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=2){c.fillStyle='rgba(90,67,51,'+(rand()*.09)+')';c.fillRect(0,y,w,1);}
    for(let i=0;i<6000;i++){c.fillStyle=rand()>.52?'#86726062':'#ffffff43';c.fillRect(rand()*w,rand()*h,rand()*2,rand()*2);}
  });
  const potMats=[0x6c765d,0x9d6c4d].map(color=>new T.MeshStandardMaterial({color,map:potGrain,bumpMap:potGrain,bumpScale:.0014,roughness:.84}));
  const terra=CabinSurfaces.texture('garden-terracotta.webp',true);
  const gardenPots=[0xe5d5be,0xf2decd].map(color=>new T.MeshStandardMaterial({map:terra,color,roughness:.87,bumpMap:potGrain,bumpScale:.0018}));
  const potLip=mat('#9a8670',{roughness:.77}),soil=mat('#39372d',{roughness:.99});
  function plant(x,y,z,size,leafHue=0,parent=world,bladesCount=25){
    const g=group(parent,x,y,z);g.scale.setScalar(size);
    const profile=[[.135,0],[.158,.012],[.165,.052],[.231,.353],[.246,.362],[.251,.383],[.244,.403],[.222,.404],[.215,.37]].map(([r,y])=>new T.Vector2(r,y));
    const pot=new T.Mesh(new T.LatheGeometry(profile,36),parent===world?potMats[leafHue]:gardenPots[leafHue]);pot.receiveShadow=true;pot.castShadow=true;g.add(pot);
    cylinder(g,0,.028,0,.161,.158,.015,potLip,28);cylinder(g,0,.372,0,.225,.217,.017,soil,30);
    for(let j=0;j<bladesCount;j++){
      const a=j*2.399+rand()*.27,r=.12+rand()*.20,h=.14+rand()*.39,ex=Math.cos(a)*r,ez=Math.sin(a)*r;
      stick(g,[ex*.07,.365,ez*.07],[ex,.375+h,ez],.004+rand()*.004,leafSkin[j%4],5);
      const leaf=new T.Mesh(blades[j%3],leafSkin[j%4]);leaf.position.set(ex,.375+h,ez);
      leaf.rotation.order='YXZ';leaf.rotation.y=Math.atan2(ex,ez);leaf.rotation.x=.18+rand()*.81;
      leaf.rotation.z=(rand()-.5)*.66;leaf.scale.setScalar(.30+rand()*.37);leaf.castShadow=true;leaf.receiveShadow=true;g.add(leaf);
    }
    shadow(parent,x,z,size*.91,size*.82,y+.013);
  }
  plant(-2.50,.01,6.24,1.05);plant(2.62,-.07,6.30,1.32,1);plant(5.03,1.08,5.83,.71);plant(6.60,-.08,6.18,1.46);
  const garden=group(scene);garden.name='临沂花园阳台盆栽';
  plant(6.15,.027,3.93,.91,1,garden);plant(6.38,.027,4.95,1.17,0,garden,0);
  plant(5.40,.027,5.03,.71,1,garden);plant(6.18,.82,4.49,.43,1,garden);
  // Small sprays of flowers catch side light above the deeper green balcony pots.
  const petals=['#bd5d71','#ce8a8b','#dbc297'].map(color=>mat(color,{roughness:.85}));
  const stemM=mat('#567149'),pollen=mat('#bb8c4b');
  function sprays(x,y,z,n,spread){
    for(let j=0;j<n;j++){
      const a=j*2.399+rand()*.48,reach=spread*(.35+rand()*.65),xx=x+Math.cos(a)*reach,zz=z+Math.sin(a)*reach,yy=y+.33+rand()*.42;
      stick(garden,[x+(xx-x)*.24,y,z+(zz-z)*.26],[xx,yy,zz],.0045,stemM,5);
      const off=rand()*Math.PI*2,flower=group(garden,xx,yy,zz);flower.rotation.set(.61+rand()*.8,a,.3);
      for(let k=0;k<5;k++){
        const t=2*Math.PI*k/5+off,lobe=ell(flower,Math.cos(t)*.029,Math.sin(t)*.029,.0,.025,.017,.010,petals[j%3]);
        lobe.rotation.z=t;
      }
      ell(flower,0,0,.006,.012,.012,.009,pollen);
    }
  }
  sprays(6.15,.37,3.93,14,.27);sprays(6.18,.99,4.49,9,.19);
  function stalk(points,r,material){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const stem=new T.Mesh(new T.TubeGeometry(curve,points.length*4,r,6,false),material);
    stem.castShadow=true;garden.add(stem);return curve;
  }
  function foliage(point,length,breadth,direction,tilt,kind){
    const leaf=new T.Mesh(blades[kind%3],leafSkin[kind%4]);
    leaf.position.copy(point);leaf.scale.set(breadth,length,length);
    leaf.rotation.order='YXZ';leaf.rotation.set(tilt,direction,(kind%5-2)*.14,'YXZ');
    leaf.castShadow=leaf.receiveShadow=true;garden.add(leaf);
  }
  const bark=CabinSurfaces.wood(0xc7b09b),twigs=mat(0x70583f,{roughness:.87});
  const olive=[6.38,.46,4.95], crown=[6.38,1.02,4.94];
  stalk([olive,[6.34,.64,4.96],[6.41,.84,4.94],crown],.021,bark);
  for(let i=0;i<11;i++){
    const a=i*2.399, reach=.22+rand()*.16,h=.22+rand()*.23;
    const curve=stalk([[crown[0],crown[1]-.16+rand()*.12,crown[2]],
      [crown[0]+Math.sin(a)*reach*.5,crown[1]+h*.30,crown[2]+Math.cos(a)*reach*.5],
      [crown[0]+Math.sin(a)*reach,crown[1]+h,crown[2]+Math.cos(a)*reach]],.005+rand()*.002,twigs);
    for(let j=1;j<8;j++)for(const side of [-1,1])foliage(curve.getPoint(j/8),.105+rand()*.055,.092,a+side*.94,.48+.07*j,j+i);
  }
  const bracts=[0xba3d5f,0xe85e78,0xd05173].map(color=>new T.MeshStandardMaterial({color,roughness:.68,side:T.DoubleSide}));
  const petal=new T.Shape();petal.moveTo(0,0);petal.bezierCurveTo(-.012,.010,-.024,.026,-.013,.035);
  petal.quadraticCurveTo(-.004,.042,.004,.046);petal.bezierCurveTo(.018,.032,.026,.013,0,0);
  const petalGeom=new T.ShapeGeometry(petal,4),petalPos=petalGeom.attributes.position;
  for(let i=0;i<petalPos.count;i++)petalPos.setZ(i,Math.abs(petalPos.getX(i))*.31+petalPos.getY(i)*petalPos.getY(i)*4);
  petalGeom.computeVertexNormals();
  const anther=new T.IcosahedronGeometry(.0055,0);
  for(let arm=0;arm<4;arm++){
    const start=[6.47,.16,3.85+arm*.07],top=1.47+.16*arm;
    const vine=stalk([start,[6.57,.59,3.89+arm*.06],[6.66,1,3.86+arm*.075],[6.64,top-.14,3.88+arm*.105],[6.61,top,4.15+arm*.12],[6.61,top-.06,4.29+arm*.12]],.005+arm*.0009,twigs);
    for(let j=1;j<=15;j++){
      const q=vine.getPoint(j/16),a=2.39*j+arm;
      foliage(q,.105+rand()*.055,.19,a,.67,j+arm);
      if(j<7||rand()<.28)continue;
      q.x-=.032+rand()*.06;q.z+=.045*Math.cos(a);q.y+=rand()*.043;
      const flower=group(garden,q.x,q.y,q.z);flower.rotation.y=a;flower.rotation.z=.3+rand();
      const mid=new T.Mesh(anther,pollen);mid.position.y=.011;flower.add(mid);
      for(let k=0;k<3;k++){
        const bract=new T.Mesh(petalGeom,bracts[(j+k)%3]);bract.rotation.order='YXZ';bract.rotation.set(.78+rand()*.24,k*Math.PI*2/3,0,'YXZ');flower.add(bract);
      }
    }
  }
  CabinSurfaces.dress(garden);
  batch(garden);
  // An A-frame set list, hand lettered at the foot of the entrance.
  const board=group(world,2.27,0,6.90);board.rotation.y=-.21;board.rotation.z=.025;
  for(let sign of [-1,1]){stick(board,[sign*.36,-.06,.13],[sign*.31,1.13,-.04],.040,wood,8);stick(board,[sign*.36,-.06,-.45],[sign*.31,1.13,-.04],.040,wood,8);}
  const frame=group(board,0,.65,.02);frame.rotation.x=-.135;box(frame,0,0,0,.73,.89,.045,wood);
  artPanel(frame,0,0,.026,.65,.80,(c,w,h)=>{c.fillStyle='#32413d';c.fillRect(0,0,w,h);c.fillStyle='#e6c995';c.textAlign='center';c.font='37px monospace';c.fillText('TONIGHT',w/2,119);c.fillRect(95,160,w-190,3);
    c.font='bold 145px "Kaiti SC","Songti SC",serif';c.fillText('有歌',w/2,360);c.font='67px "Songti SC",serif';c.fillText(vocalistName+'  驻唱',w/2,535);c.font='35px monospace';c.fillText('ACOUSTIC SET',w/2,669);c.fillText('↗',w/2,803);});
  // A worn tour case rides inside the door under a few overlapping gig tickets.
  const travel=group(world,-6.12,.04,-2.20);travel.rotation.y=.34;
  rounded(travel,0,.28,0,.97,.51,.37,.049,mat('#6b6e50'));for(let x of [-.31,.31]){box(travel,x,.281,.201,.047,.51,.025,mat('#8d6541'));box(travel,x,.534,0,.047,.016,.38,mat('#8d6541'));}stick(travel,[-.12,.60,0],[.12,.60,0],.021,wood);
  function sticker(x,y,z,w,h,n,back){artPanel(travel,x,y,z,w,h,(c,cw,ch)=>{c.fillStyle=back;c.fillRect(0,0,cw,ch);c.strokeStyle='#d8bd8c';c.lineWidth=12;c.strokeRect(16,16,cw-32,ch-32);c.fillStyle='#ede0bd';c.textAlign='center';c.textBaseline='middle';c.font='bold '+(ch*.58)+'px serif';c.fillText(n,cw/2,ch/2);});}
  sticker(-.16,.30,.208,.26,.15,'济南','#964e3f');sticker(.16,.21,.209,.21,.13,'西塘','#49655e');
  const evening=canvas(640,256,(ctx,w,h)=>{
    const sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#152331');sky.addColorStop(.43,'#526674');
    sky.addColorStop(.52,'#809090');sky.addColorStop(1,'#46514c');
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    for(const [level,tint] of [[.468,'#626f70'],[.489,'#52605d']]){
      ctx.beginPath();ctx.moveTo(0,h);
      for(let x=0;x<=w;x+=2){
        const angle=x/w*2*Math.PI;
        ctx.lineTo(x,h*(level+.010*Math.sin(3*angle)+.005*Math.cos(7*angle+level*10)));
      }
      ctx.lineTo(w,h);ctx.closePath();ctx.fillStyle=tint;ctx.fill();
    }
  });
  const sky=new T.Mesh(new T.SphereGeometry(60,40,16),new T.MeshBasicMaterial({
    map:evening,side:T.BackSide,fog:false,toneMapped:false
  }));
  scene.add(sky);
  // Let the unlit ground recede into the same dusk as the far ridge.
  const ground=new T.PlaneGeometry(126,126,18,18),vertices=ground.attributes.position;
  const colors=new Float32Array(vertices.count*3);
  const near=new T.Color('#232924'),far=new T.Color('#52605d'),shade=new T.Color();
  for(let i=0;i<vertices.count;i++){
    const distance=Math.hypot(vertices.getX(i),vertices.getY(i));
    shade.lerpColors(near,far,T.MathUtils.smoothstep(distance,16,51)).toArray(colors,i*3);
  }
  ground.setAttribute('color',new T.BufferAttribute(colors,3));
  const earth=new T.Mesh(ground,new T.MeshBasicMaterial({vertexColors:true,toneMapped:false,fog:false}));
  earth.position.y=-.13;earth.rotation.x=-Math.PI/2;world.add(earth);
  world.traverse(o=>{if(o.isMesh&&o.material===wood&&o.geometry.type==='BoxGeometry')CabinSurfaces.grain(o);});
  batch(world);
  const dusk=new T.DirectionalLight(0x9ab6cd,.24);dusk.position.set(-3,7,12);dusk.target.position.set(0,1.8,5.8);scene.add(dusk,dusk.target);
  for(const x of [-2.25,2.26]){const light=new T.PointLight(0xffb57b,6.8,4.5,2);light.position.set(x,2.74,6.17);scene.add(light);}
  return [world,sky];
};
