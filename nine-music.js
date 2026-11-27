// Music exhibits for the Wuhan, Changsha and Qingdao branches.
window.makeMusicExhibits = function(room,fixtures) {
  const {T,group,box,panel,rounded,mat,cylinder,stick,ell,canvas,shadow}=HouseKit;
  const surface=CabinSurfaces, wood=surface.wood(0xc9a476);
  const iron=mat(0x242b2b,{metalness:.54,roughness:.37});
  const pewter=mat(0xa3a7a3,{metalness:.74,roughness:.32});
  const rubber=mat(0x212228,{roughness:.87});
  const collar=mat(0x404651,{metalness:.38,roughness:.47});
  const lavender=mat(0xb9a1c9,{roughness:.57});
  const paper=mat(0xb7b3a0,{roughness:.88});
  const hit=(x,y,z,w,h,d)=>({center:[x,y,z],size:[w,h,d]});

  const veneer=new T.MeshStandardMaterial({map:surface.texture('music-wuhan-frame.webp',true),roughness:.78}), back=mat(0x434648,{roughness:.64});
  const nickel=mat(0xbfc1b4,{metalness:.85,roughness:.29}), pulp=mat(0xd6cbb6,{roughness:.97});
  const grain=surface.texture('music-paper-tooth.webp',false,5,7);
  function printMaterial(filename,emission,finish) {
    const print=surface.texture(filename,true);
    return new T.MeshStandardMaterial({map:print,bumpMap:grain,bumpScale:.00034,roughness:finish,
      emissive:0xffffff,emissiveMap:print,emissiveIntensity:emission,side:T.DoubleSide});
  }
  // The archive artwork remains one continuous set of UVs, including on the curved pieces.
  function paperSheet(parent,w,h,bounds,material,bend,thickness) {
    const cols=6,rows=7,geo=new T.PlaneGeometry(1,1,cols,rows);
    const positions=geo.getAttribute('position'),uv=geo.getAttribute('uv');
    const [tl,tr,br,bl]=bounds;
    for(let i=0;i<uv.count;i++){
      const u=uv.getX(i),v=1-uv.getY(i);
      const x=(tl[0]*(1-u)+tr[0]*u)*(1-v)+(bl[0]*(1-u)+br[0]*u)*v;
      const y=(tl[1]*(1-u)+tr[1]*u)*(1-v)+(bl[1]*(1-u)+br[1]*u)*v;
      positions.setXYZ(i,(u-.5)*w,(.5-v)*h,bend(u,v));
      uv.setXY(i,x,1-y);
    }
    geo.computeVertexNormals();
    const face=new T.Mesh(geo,material);face.castShadow=face.receiveShadow=true;parent.add(face);
    const loop=[];
    for(let col=0;col<=cols;col++)loop.push(col);
    for(let row=1;row<=rows;row++)loop.push(row*(cols+1)+cols);
    for(let col=cols-1;col>=0;col--)loop.push(rows*(cols+1)+col);
    for(let row=rows-1;row>0;row--)loop.push(row*(cols+1));
    const rim=[],indices=[];
    loop.forEach((index,k)=>{
      const x=positions.getX(index),y=positions.getY(index),z=positions.getZ(index);
      rim.push(x,y,z,x,y,z-thickness);
      const i=2*k,next=2*((k+1)%loop.length);
      indices.push(i,next,i+1,next,next+1,i+1);
    });
    const edge=new T.BufferGeometry();edge.setAttribute('position',new T.Float32BufferAttribute(rim,3));
    edge.setIndex(indices);edge.computeVertexNormals();parent.add(new T.Mesh(edge,pulp));
  }
  // Retypeset the photographed running order so the chalk stays legible in the room.
  const slate=group(room,-6.84,1.65,.10);
  slate.rotation.y=Math.PI/2;
  const sw=.70,sh=1.04,trim=.028;
  box(slate,0,0,.045,sw,sh,.030,back);
  for(const side of [-1,1]){
    box(slate,side*(sw-trim)/2,0,.067,trim,sh,.021,veneer);
    box(slate,0,side*(sh-trim)/2,.067,sw-2*trim,trim,.021,veneer);
    stick(slate,[side*.23,sh/2-.010,.057],[0,sh/2+.104,.044],.0034,iron,8);
  }
  cylinder(slate,0,sh/2+.104,.044,.010,.010,.015,nickel,10).rotation.x=Math.PI/2;
  box(slate,0,-sh/2,.081,sw+.016,.022,.083,wood);
  stick(slate,[-.17,-sh/2+.017,.092],[-.095,-sh/2+.017,.095],.005,pulp,8);
  const chalkboard=canvas(896,1344,(c,w,h)=>{
    const tone=c.createRadialGradient(w*.34,h*.26,48,w*.52,h*.46,h*.74);
    tone.addColorStop(0,'#292c28');tone.addColorStop(1,'#1a1f1e');
    c.fillStyle=tone;c.fillRect(0,0,w,h);
    const dust=HouseKit.seeded(42);
    c.fillStyle='#d9d5bc';
    for(let i=0;i<1700;i++){
      c.globalAlpha=.02+.08*dust();
      c.fillRect(dust()*w,dust()*h,1+dust()*2,1+dust()*2);
    }
    c.globalAlpha=1;
    c.textAlign='center';c.textBaseline='middle';
    const kai='"Kaiti SC","STKaiti","KaiTi","Songti SC",serif';
    c.fillStyle='#f4e8c9';c.font='bold 151px '+kai;
    c.fillText('演出表',w/2,146);
    c.fillStyle='#b2a688';c.fillRect(w*.08,232,w*.84,3);
    const hours=['18','19','20','21','22','23','00','01'];
    const performers=['六十','小黑','渐渐','呵呵','六十','麻子','渐渐','呵呵'];
    hours.forEach((hour,i)=>{
      const y=325+i*127;
      c.fillStyle='#eee5cf';c.font='bold 66px Georgia,serif';
      c.fillText(hour+':00–'+hour+':40',w*.34,y);
      c.fillStyle='#eb9f92';c.font='bold 85px '+kai;
      c.fillText(performers[i],w*.785,y);
    });
  });
  const inset=panel(slate,0,0,.070,sw-2*trim,sh-2*trim,chalkboard,.14);
  inset.material.bumpMap=grain;inset.material.bumpScale=.00022;

  // A small copy of the first-night poster sits in a slotted block beside the order pad.
  const keepsake=group(room,4.81,1.10,-2.29),pw=.214,ph=.321;
  keepsake.rotation.y=-.19;
  box(keepsake,0,.019,0,.249,.038,.109,wood);
  const card=group(keepsake,0,.033,-.004);card.rotation.x=-.14;
  const poster=group(card,0,ph/2,0);
  box(poster,0,0,-.003,pw+.009,ph+.009,.005,pulp);
  const posterFace=printMaterial('changsha-opening-poster.webp',.032,.88);
  paperSheet(poster,pw,ph,[[0,0],[1,0],[1,1],[0,1]],posterFace,
    (u,v)=>.0005+.002*(1-v)*(1-v)*u*u,.0007);
  function worldPoint(parent,x,y,z){
    parent.updateWorldMatrix(true,false);
    return parent.localToWorld(new T.Vector3(x,y,z)).toArray();
  }

  // A compact electronic kit: drum pads with hardware, mounted cymbals, module and two pedals.
  const origin=[-2.20,.285,-4.33],kit=group(room,...origin),kitHits=[],strikes={};
  const drumHit=(x,y,z,w,h,d)=>kitHits.push(hit(origin[0]+x,origin[1]+y,origin[2]+z,w,h,d));
  const bar=(a,b,r,m=iron)=>stick(kit,a,b,r,m,10);
  const clamp=(x,y,z,r=.036)=>cylinder(kit,x,y,z,r,r,.069,collar,14);
  const headPhoto=surface.texture('music-pad-skin.webp',true);
  const skin=new T.MeshStandardMaterial({map:headPhoto,bumpMap:surface.texture('music-pad-skin.webp'),
    bumpScale:.00044,roughness:.76});
  const cymbalRubber=new T.MeshStandardMaterial({map:surface.texture('music-cymbal-face.webp',true),
    bumpMap:surface.texture('music-cymbal-relief.webp'),bumpScale:.00135,roughness:.57,metalness:.045});
  const lacquer=mat(0x252322,{metalness:.43,roughness:.30});
  const blackChrome=mat(0x424245,{metalness:.71,roughness:.32});
  function rolledLip(parent,major,minor,y,m){
    const ring=new T.Mesh(new T.TorusGeometry(major,minor,6,56),m);
    ring.rotation.x=Math.PI/2;ring.position.y=y;ring.castShadow=ring.receiveShadow=true;parent.add(ring);
  }
  for(const x of [-.55,.55]){
    bar([x,.035,.33],[x,.67,.33],.033);
    bar([x,.04,-.12],[x,.04,.56],.029);
    for(const z of [-.12,.56])ell(kit,x,.039,z,.048,.041,.05,rubber);
    clamp(x,.56,.33);clamp(x,.084,.33);
  }
  bar([-.55,.56,.33],[.55,.56,.33],.031);bar([-.55,.435,.33],[-.73,.435,-.065],.027);
  bar([.55,.455,.33],[.71,.455,-.055],.027);
  function pad(x,y,z,r,tilt,anchor,note){
    const head=group(kit,x,y,z);head.rotation.x=tilt;
    cylinder(head,0,-.026,0,r*.96,r*.86,.105,lacquer,48);
    rolledLip(head,r*.872,.006,-.074,blackChrome);
    cylinder(head,0,.030,0,r*.991,r,.019,rubber,48);
    cylinder(head,0,.042,0,r*.937,r*.937,.009,skin,48);
    rolledLip(head,r*.949,r*.046,.047,lavender);
    for(let i=0;i<6;i++){
      const a=(i+.25)*Math.PI/3,dx=Math.cos(a),dz=Math.sin(a);
      const lug=group(head,dx*r*.96,0,dz*r*.96);
      lug.rotation.y=Math.PI/2-a;
      box(lug,0,-.027,0,.019,.030,.008,blackChrome);
      cylinder(lug,0,.003,.003,.0038,.0038,.054,pewter,6);
      cylinder(lug,0,.031,.003,.0075,.0075,.008,nickel,6);
    }
    bar(anchor,[x,y-.079,z],.018,pewter);
    clamp(anchor[0],anchor[1],anchor[2],.031);
    drumHit(x,y,z,r*1.97,.111+Math.abs(Math.sin(tilt))*2*r,r*1.9);
    if(note)strikes[note]=head.localToWorld(new T.Vector3(0,.0465,-r*.27));
  }
  pad(-.25,.675,.24,.180,-.28,[-.25,.56,.33]);
  pad(.18,.685,.25,.179,-.30,[.18,.56,.33]);
  pad(.405,.585,-.107,.218,-.18,[.63,.455,.14],'tom');
  pad(-.405,.636,-.135,.200,-.17,[-.65,.435,.10],'snare');
  function cymbal(x,y,z,r,tilt,anchor,note){
    bar(anchor,[x,y-.03,z],.014,pewter);clamp(anchor[0],anchor[1],anchor[2],.032);
    const stand=group(kit,x,y,z);stand.rotation.x=tilt;
    const profile=[[0,.035],[.035,.036],[.058,.025],[r*.38,.010]];
    // Shallow molded ridges catch moving stage highlights; the strike sector has a different grain.
    for(let i=1;i<=17;i++){
      const frac=.39+i*.034,center=r*frac,level=.010-(frac-.38)*.025;
      profile.push([center-r*.008,level],[center,level+.0009],[center+r*.008,level]);
    }
    profile.push([r,-.003],[r,-.010],[r*.91,-.015],[r*.57,-.014],[.059,.007],[0,.011]);
    const geo=new T.LatheGeometry(profile.reverse().map(([a,b])=>new T.Vector2(a,b)),64);
    // Stamp the concentric rubber grooves in a planar projection centered on the mounting hole.
    const uv=geo.getAttribute('uv'),pos=geo.getAttribute('position');
    for(let k=0;k<uv.count;k++)uv.setXY(k,.5+pos.getX(k)/(r*2.01),.5+pos.getZ(k)/(r*2.01));
    const cym=new T.Mesh(geo,cymbalRubber);cym.castShadow=cym.receiveShadow=true;stand.add(cym);
    cylinder(stand,0,.041,0,.026,.030,.013,lavender,20);
    cylinder(stand,0,.053,0,.017,.023,.014,rubber,20);
    cylinder(stand,0,.070,0,.007,.012,.028,blackChrome,12);
    const wing=box(stand,0,.078,0,.035,.008,.010,blackChrome);wing.rotation.z=.24;
    kitHits.push({parent:stand,...hit(0,.010,0,r*1.95,.050,r*1.90)});
    if(note)strikes[note]=stand.localToWorld(new T.Vector3(-r*.53,.008,-r*.26));
  }
  cymbal(-.575,.95,.36,.253,-.17,[-.55,.64,.33]);
  cymbal(.565,.91,.47,.272,-.15,[.55,.64,.33]);
  cymbal(.635,.745,-.24,.192,-.18,[.70,.455,-.03],'ride');
  const module=group(kit,.80,.70,.12);module.rotation.x=-.18;module.rotation.z=-.20;module.rotation.y=.12;
  const moduleBody=rounded(module,0,0,0,.295,.235,.065,.015,collar);
  moduleBody.rotation.x=-Math.PI/2;
  const legends=canvas(512,400,(c,w,h)=>{
    c.fillStyle='#2d3031';c.fillRect(0,0,w,h);
    c.strokeStyle='#808585';c.lineWidth=1;c.strokeRect(12,12,w-24,h-24);
    c.fillStyle='#292a2a';c.fillRect(20,182,410,174);
    c.fillStyle='#ced0c9';c.font='13px sans-serif';c.fillText('DRUM MODULE',22,32);
    c.font='10px sans-serif';
    ['KICK','SNARE','TOM 1','TOM 2','TOM 3','HIHAT','CRASH','RIDE'].forEach((t,i)=>c.fillText(t,22+i*51,189));
    c.fillText('OUTPUT',425,191);c.fillText('KIT',25,370);c.fillText('TEMPO',160,370);
    c.strokeStyle='#c6c6b6';
    for(let i=0;i<8;i++)for(let j=0;j<7;j++){
      const x=26+i*51,y=214+j*15;
      c.beginPath(); c.moveTo(x,y);c.lineTo(x+4+(j%3===0?4:0),y);c.stroke();
    }
    c.fillStyle='#0a111d';c.fillRect(149,43,166,92);
    const lcd=c.createLinearGradient(0,47,0,128);lcd.addColorStop(0,'#0e2c69');lcd.addColorStop(.62,'#1756aa');lcd.addColorStop(1,'#337dc8');
    c.fillStyle=lcd;c.fillRect(156,49,152,80);c.fillStyle='#bce0ec';c.font='14px monospace';
    c.fillText('01  STUDIO',163,73);c.font='10px monospace';c.fillText('KICK  SNARE  TOM',163,91);
    for(let i=0;i<12;i++)c.fillRect(164+i*11,114-Math.sin(1.2*i)*5,6,4+Math.sin(1.2*i)*5);
  });
  const face=panel(module,0,.033,0,.284,.223,legends,.15);face.rotation.x=-Math.PI/2;
  for(let i=0;i<8;i++){
    const x=-.114+i*.029;
    box(module,x,.034,.032,.0055,.005,.060,iron);
    box(module,x,.039,.013+((i*3)%7)*.005,.017,.009,.010,pewter);
  }
  for(const [x,z,r] of [[-.113,-.052,.012],[-.115,-.024,.010],[.111,.037,.017],[.112,-.061,.010]]){
    cylinder(module,x,.042,z,r,r,.018,iron,16);
    box(module,x,.052,z-r*.44,.002,.0018,r*.62,paper);
  }
  for(let i=0;i<4;i++)box(module,.055+(i%2)*.024,.038,-.046+Math.floor(i/2)*.018,.016,.009,.008,blackChrome);
  bar([.55,.46,.33],[.80,.656,.12],.016,pewter);drumHit(.80,.70,.12,.30,.15,.25);
  // Two independent pedals and a vertical kick pad. A short beater meets the kick head.
  const pedalPlate=mat(0x85827b,{metalness:.68,roughness:.49});
  for(const x of [.00,.56]){
    box(kit,x,.024,-.20,.12,.025,.269,iron);
    const plate=box(kit,x,.047,-.18,.079,.018,.212,pedalPlate);plate.rotation.x=-.078;
    for(let i=0;i<4;i++)box(kit,x,.058+i*.001,-.235+i*.038,.063,.004,.005,rubber);
  }
  const kick=group(kit,0,.26,.028);kick.rotation.x=Math.PI/2;
  cylinder(kick,0,0,0,.118,.121,.073,collar,30);
  cylinder(kick,0,-.038,0,.105,.105,.009,rubber,30);
  bar([0,.05,-.12],[0,.216,-.038],.009,pewter);ell(kit,0,.223,-.037,.026,.023,.019,paper);
  const stoolX=-.05, stoolZ=-.49, cushionY=.695, cushionHeight=.060;
  const vinyl=rubber.clone();
  vinyl.normalMap=surface.texture('fixture-upholstery-normal.webp');
  vinyl.normalScale.set(1.10,1.10);vinyl.roughness=.87;
  const edge=[[0,-.030],[.170,-.030],[.184,-.025],[.188,-.015],[.188,.010],
    [.185,.020],[.169,.027],[.089,.030],[0,.028]];
  const drumSeat=new T.Mesh(new T.LatheGeometry(edge.map(([r,y])=>new T.Vector2(r,y)),32),vinyl);
  drumSeat.position.set(stoolX,cushionY,stoolZ);drumSeat.castShadow=drumSeat.receiveShadow=true;kit.add(drumSeat);
  const stoolSeam=new T.Mesh(new T.TorusGeometry(.185,.0019,5,32),mat(0x333331,{roughness:.92}));
  stoolSeam.position.set(stoolX,cushionY+.017,stoolZ);stoolSeam.rotation.x=Math.PI/2;kit.add(stoolSeam);
  bar([stoolX,.026,stoolZ],[stoolX,cushionY-cushionHeight*.42,stoolZ],.022,pewter);
  cylinder(kit,stoolX,.54,stoolZ,.030,.030,.052,collar,16);
  for(let i=0;i<3;i++){
    const a=i*2*Math.PI/3;
    bar([stoolX,.17,stoolZ],[stoolX+Math.sin(a)*.218,.026,stoolZ+Math.cos(a)*.218],.012,pewter);
  }
  function lead(points){
    const curve=new T.CatmullRomCurve3(points.map(([x,y,z])=>new T.Vector3(x,y,z)));
    const wire=new T.Mesh(new T.TubeGeometry(curve,20,.005,5,false),rubber);kit.add(wire);
  }
  lead([[.78,.65,.12],[.74,.44,.10],[.56,.17,.24],[.51,.04,.33],[.04,.027,.35],[0,.16,.05]]);
  lead([[-.405,.577,-.135],[-.405,.385,.15],[-.34,.355,.28],[.25,.45,.30],[.64,.46,.20],[.80,.65,.12]]);
  fixtures.drumKit={seat:kit.localToWorld(new T.Vector3(stoolX,cushionY+cushionHeight/2,stoolZ)).toArray(),strikes};
  shadow(room,origin[0],origin[2],1.94,1.50,.292);
  return [
    {city:'青岛',item:'舞台上的黑色电子鼓',from:[-.22,-4.90],look:[-2.22,.94,-4.32],hits:kitHits},
    {city:'武汉',item:'木框演出时间牌',from:[-4.63,.52],look:worldPoint(slate,0,0,.070),hits:[
      {parent:slate,...hit(0,0,.064,sw,sh,.048)}
    ]},
    {city:'长沙',item:'蓝底「火塘酒吧」试营业海报',from:[4.65,-1.17],look:worldPoint(poster,0,0,.001),hits:[
      {parent:poster,...hit(0,0,0,pw+.009,ph+.009,.012)}
    ]}
  ];
};
