// The audience side of the Chongqing bench follows the curve back toward the stage.
window.makeChongqingSeats=function({room,obstacle,seats}){
  const {T,group,box,mat}=HouseKit, su=CabinSurfaces;
  const cx=-2.80,cz=-4.60,lo=-.425,hi=.425;
  const tiers=[
    {radius:3.77,depth:.43,height:.305,label:'前排',side:-1,count:10},
    {radius:4.22,depth:.45,height:.506,label:'后排',side:1,count:11}
  ];
  const padTopOffset=.021+.026+.023;
  const bench=group(room,cx,0,cz),benchFootprintGroup='chongqing-bench';
  const point=(r,a)=>[r*Math.sin(a),r*Math.cos(a)];
  const satin=new T.MeshStandardMaterial({color:0xc0a184,map:su.texture('timber-color.webp',true),
    normalMap:su.texture('timber-normal.webp'),normalScale:new T.Vector2(1.9,1.9),roughness:.82});
  const apron=new T.MeshStandardMaterial({map:su.texture('fixture-chongqing-apron.webp',true),
    normalMap:su.texture('timber-normal.webp'),normalScale:new T.Vector2(1.18,1.18),roughness:.85});
  const recessed=su.wood(0x927b67),cutTimber=su.texture('timber-color.webp',true);
  const returnBoard=new T.MeshStandardMaterial({color:0xf0d9b9,map:cutTimber,roughness:.80,
    normalMap:su.texture('timber-normal.webp'),normalScale:new T.Vector2(.91,.91),
    emissive:0xffffff,emissiveMap:cutTimber,emissiveIntensity:.08});
  const lipEnd=returnBoard.clone();
  lipEnd.color.set(0xd3b393);
  lipEnd.map=su.texture('wood-crosscut.webp',true);
  lipEnd.emissiveMap=null;lipEnd.emissiveIntensity=0;lipEnd.normalMap=null;
  lipEnd.bumpMap=su.texture('wood-crosscut.webp');lipEnd.bumpScale=.0012;
  // Revolved strips keep the nosing continuous. The original distressed, vertical staves wrap below it.
  function rail(r,profile,material,{facade=false}={}){
    const pos=[],uv=[],idx=[],segments=72;
    for(let j=0;j<=segments;j++){
      const a=lo+(hi-lo)*j/segments;
      for(let k=0;k<profile.length;k++){
        const [off,y]=profile[k],[x,z]=point(r+off,a);pos.push(x,y,z);
        if(facade)uv.push(j/segments*2.3,y/(profile[0][1]||1));
        else uv.push((off+.5)*1.8,k*.012+j/segments*3.13);
        if(j&&k){const D=j*profile.length+k,B=D-profile.length,C=D-1,A=B-1;idx.push(A,B,C,B,D,C);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const mesh=new T.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;bench.add(mesh);
  }
  function tier(r,depth,h){
    const half=depth/2;
    const front=half-.012,back=-half+.005;
    const lip=[[-half-.006,h-.012],[-half-.011,h+.013],[-half-.003,h+.023],
      [half-.001,h+.023],[half+.010,h+.018],[half+.014,h+.009],[half+.014,h-.007],[half+.008,h-.014],[front,h-.018]];
    const body=[[back,.009],[half-.025,.009],[half-.025,.034],[front,.042],[front,h-.018],
      [-half-.006,h-.012],[back,h-.014]];
    rail(r,[[front,h-.018],[front,.042]],apron,{facade:true});
    rail(r,[[back,.009],[back,h-.014],[-half-.006,h-.012]],recessed);
    rail(r,[[front,.042],[half-.025,.034],[half-.025,.009],[back,.009]],recessed);
    rail(r,lip,satin);
    // Close the actual nosing and recessed toe profile at both radial cuts. A rectangular block
    // ends below the curved lip and leaves a slit at a grazing angle.
    function endCap(a,profile,material){
      const outline=profile.map(([off,y])=>new T.Vector2(off,y));
      const positions=[],texcoords=[],normals=[],triangles=[];
      const outward=a===lo?-1:1,tx=outward*Math.cos(a),tz=-outward*Math.sin(a);
      for(const [off,y] of profile){
        const [x,z]=point(r+off,a);positions.push(x,y,z);normals.push(tx,0,tz);
        texcoords.push((off+half)*1.92+.13,y*1.42+.22);
      }
      for(const [i,j,k] of T.ShapeUtils.triangulateShape(outline,[])){
        const A=outline[i],B=outline[j],C=outline[k];
        const area=(B.x-A.x)*(C.y-A.y)-(C.x-A.x)*(B.y-A.y);
        triangles.push(...(area*outward<0?[i,j,k]:[i,k,j]));
      }
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
      g.setAttribute('uv',new T.Float32BufferAttribute(texcoords,2));
      g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setIndex(triangles);
      const cap=new T.Mesh(g,material);cap.castShadow=cap.receiveShadow=true;bench.add(cap);
    }
    for(const a of [lo,hi]){
      endCap(a,body,returnBoard);
      endCap(a,lip,lipEnd);
    }
    for(let j=1;j<5;j++){
      const a=lo+(hi-lo)*j/5+(r-4)*.012,[x,z]=point(r,a);
      const joint=box(bench,x,h+.023,z,.0018,.0009,depth-.005,recessed);joint.rotation.y=a;
    }
    const sections=20;
    for(let j=0;j<sections;j++){
      const a=lo+j*(hi-lo)/sections,b=lo+(j+1)*(hi-lo)/sections;
      const corners=[point(r-half,a),point(r+half,a),point(r-half,b),point(r+half,b)];
      const xs=corners.map(p=>p[0]),zs=corners.map(p=>p[1]);
      const left=Math.min(...xs),right=Math.max(...xs),back=Math.min(...zs),front=Math.max(...zs);
      const top=h+padTopOffset;
      obstacle(cx+(left+right)/2,cz+(back+front)/2,right-left,front-back,top,top).benchFootprintGroup=benchFootprintGroup;
    }
  }
  for(const row of tiers)tier(row.radius,row.depth,row.height);

  const yarn=su.texture('fixture-upholstery.webp',true);
  const fabric=new T.MeshPhysicalMaterial({color:0xe3d6d3,map:yarn,roughness:.97,sheen:.26,sheenColor:0xc2a69e,sheenRoughness:.86,
    normalMap:su.texture('fixture-upholstery-normal.webp'),normalScale:new T.Vector2(1.14,1.14)});
  const piping=mat(0x927a70,{roughness:.87});
  const cushionProfile=[[0,-.023],[.140,-.024],[.161,-.020],[.173,-.012],[.175,.004],[.169,.014],
    [.160,.018],[.150,.020],[.132,.022],[.100,.023],[.075,.022],[.038,.020],[0,.020]];
  const cushionGeo=new T.LatheGeometry(cushionProfile.map(([r,y])=>new T.Vector2(r,y)),80);
  const pos=cushionGeo.attributes.position,uv=cushionGeo.attributes.uv;
  for(let i=0;i<pos.count;i++){
    const ring=i%cushionProfile.length,x=pos.getX(i),z=pos.getZ(i),r=Math.hypot(x,z),a=Math.atan2(x,z);
    const feather=Math.exp(-(((r-.151)/.020)**2));
    const gathering=Math.sin(a*13+.55*Math.sin(3*a))**8*.0009+Math.sin(a*7+.68)**8*.0008;
    if(ring>=5){
      pos.setY(i,pos.getY(i)-gathering*feather);
      uv.setXY(i,x/.33+.5,z/.33+.5);
    }else{
      uv.setXY(i,uv.getX(i)*3.17,(pos.getY(i)+.024)/.33);
    }
  }
  cushionGeo.computeVertexNormals();
  // A running stitch just inside the rounded edge draws the upper fabric into its sewn welt.
  const thread=mat(0xb3988c,{roughness:.95}),threadPos=[],threadNormal=[];
  for(let i=0;i<152;i++){
    const a=i*2*Math.PI/152,b=a+.020,inner=.1575,outer=.1583;
    const y=.0189-Math.sin(a*13+.55*Math.sin(3*a))**8*.0008-Math.sin(a*7+.68)**8*.0007;
    for(const [ang,radius] of [[a,inner],[a,outer],[b,inner],[a,outer],[b,outer],[b,inner]]){
      threadPos.push(Math.sin(ang)*radius,y,Math.cos(ang)*radius);threadNormal.push(0,1,0);
    }
  }
  const stitches=new T.BufferGeometry();stitches.setAttribute('position',new T.Float32BufferAttribute(threadPos,3));
  stitches.setAttribute('normal',new T.Float32BufferAttribute(threadNormal,3));
  const weltGeo=new T.TorusGeometry(.173,.0028,6,50);
  function pad(r,a,top,diameter){
    const [x,z]=point(r,a),p=group(bench,x,top+.026,z);
    p.scale.set(diameter/.35,1,diameter/.35);
    p.rotation.y=Math.sin(a*17+r*3.2)*1.9;
    const skin=new T.Mesh(cushionGeo,fabric);skin.castShadow=skin.receiveShadow=true;p.add(skin);
    p.add(new T.Mesh(stitches,thread));
    const welt=new T.Mesh(weltGeo,piping);
    welt.rotation.x=Math.PI/2;welt.position.y=-.006;p.add(welt);
    return {x:cx+x,z:cz+z};
  }
  for(const row of tiers){
    const angularPitch=(hi-lo)/row.count;
    // Radial boarding has slightly less clearance than the chord between cushion centres.
    const pitch=row.radius*Math.sin(angularPitch),benchRadius=pitch/2-.006;
    const diameter=pitch-.045,top=row.height+.021,y=top+.026;
    for(let i=0;i<row.count;i++){
      const a=lo+(i+.5)*angularPitch,p=pad(row.radius,a,top,diameter);
      seats.push({id:seats.length,...p,y,surfaceY:row.height+padTopOffset,stool:true,yaw:a+Math.PI,
        bench:true,benchRadius,benchFootprintGroup,padSize:[diameter,diameter],roundPad:true,
        rowName:'重庆围座'+row.label,placeNumber:i+1,label:'重庆围座'+row.label+(i+1)+'席',
        approachDirection:{x:row.side*Math.sin(a),z:row.side*Math.cos(a)},
        pickSize:[diameter+.012,.042,diameter+.012],pickY:y+.012,occupied:null,reserved:null});
    }
  }
  const hits=[];
  for(const {radius:r,height:h,depth:d} of tiers){
    const sections=14;
    for(let j=0;j<sections;j++){
      const a=lo+(j+.5)*(hi-lo)/sections,[x,z]=point(r,a);
      // Keep the cushion tops free for seating interaction.
      hits.push({center:[cx+x,h*.50,cz+z],size:[.42,h-.015,d*.84]});
    }
  }
  const plan={x:cx,z:cz,start:lo,end:hi,tiers};
  return {exhibit:{city:'重庆',item:'两层弧形木围座',from:[-.12,.53],look:[cx,.42,cz+tiers[0].radius],hits},plan};
};

window.makeNineFixtures=function({room,roofAndFront,doors,obstacle}){
  const {T,group,box,ell,mat,canvas,panel,seeded}=HouseKit;
  const surface=CabinSurfaces,rand=seeded(9541);
  const darkWood=surface.wood(0x907763);
  const iron=mat(0x3a3530,{metalness:.64,roughness:.64});
  const exhibits=[], hit=(x,y,z,w,h,d)=>({center:[x,y,z],size:[w,h,d]});
  function register(city,item,from,look,hits){exhibits.push({city,item,from,look,hits});}

  // Honey-coloured leaves and three forged straps match the Xi'an day photograph.
  // Keep each half's hardware in its own hinge-local group, including the folded hasp.
  const doorHits=[];
  const agedIron=new T.MeshStandardMaterial({map:surface.texture('fixture-iron-patina.webp',true),
    normalMap:surface.texture('fixture-iron-normal.webp'),roughnessMap:surface.texture('fixture-iron-rough.webp'),
    normalScale:new T.Vector2(.41,.41),color:0xe0d9d0,metalness:.32,roughness:.86});
  const headMetal=agedIron.clone();headMetal.color.set(0xffead0);headMetal.roughness=.63;
  const nailSeat=mat(0x77644f,{roughness:.58,metalness:.42});
  const plank=new T.MeshPhysicalMaterial({map:surface.texture('fixture-xian-plank.webp',true),
    normalMap:surface.texture('timber-normal.webp'),normalScale:new T.Vector2(.36,.36),
    roughnessMap:surface.texture('timber-rough.webp'),roughness:.92,clearcoat:.09,clearcoatRoughness:.67});
  function fittings(parent,points,z,thickness,material){
    const outline=new T.Shape();points.forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));outline.closePath();
    const geo=new T.ExtrudeGeometry(outline,{depth:thickness,bevelEnabled:true,bevelSegments:2,bevelThickness:.0025,bevelSize:.0025,steps:1,curveSegments:5});
    const m=new T.Mesh(geo,material);m.position.z=z;m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  for(const {door,side} of doors){
    for(const face of [-1,1]){
      const faceGroup=group(door,0,0,face*.148);faceGroup.rotation.y=face<0?Math.PI:0;
      const dir=-side*face;
      const skin=group(faceGroup,dir*.909,0,0);
      for(let j=0;j<8;j++){
        const g=new T.BoxGeometry(.220+(j%3)*.001,2.71,.022),uv=g.attributes.uv;
        for(let k=0;k<uv.count;k++){
          const u=uv.getX(k),v=uv.getY(k);
          uv.setXY(k,.247*u+(j*.169+face*.281),v*.87+(j%3)*.07);
        }
        const board=new T.Mesh(g,plank);board.position.set((j-3.5)*.224,1.385,-.010);
        board.castShadow=board.receiveShadow=true;skin.add(board);
      }
      for(const y of [.62,1.33,2.00]){
        const h=.043;
        fittings(skin,[[-.891,y-h],[.886,y-h+.004],[.890,y+h-.003],
          [.54,y+h+.001],[.15,y+h-.004],[-.35,y+h+.002],[-.89,y+h]],.003,.014,agedIron);
        for(let j=0;j<6;j++){
          const x=-.755+j*.299;
          ell(skin,x,y,.018,.036,.036,.009,nailSeat);
          ell(skin,x,y+.001,.027,.030,.030,.022,headMetal);
        }
      }
      // Scalloped spade tips grow from a single kick plate, with matching ironwork at the head.
      for(const top of [false,true]){
        const yy=v=>top?2.735-v:v+.021;
        const shape=[[-.888,yy(.008)],[.888,yy(.008)],[.888,yy(.177)]];
        const pitch=1.776/10;
        for(let j=0;j<10;j++){
          const x=.888-j*pitch;
          shape.push([x-pitch*.12,yy(.149)],[x-pitch*.32,yy(.190)],[x-pitch*.5,yy(.231)],
            [x-pitch*.68,yy(.188)],[x-pitch*.88,yy(.149)],[x-pitch,yy(.177)]);
        }
        fittings(skin,shape,.003,.018,agedIron);
        for(let j=0;j<8;j++)ell(skin,-.78+j*.222,yy(.069),.032,.025,.025,.019,headMetal);
      }
      const handle=group(skin,dir*.52,2.04,.019);
      fittings(handle,[[-.106,.105],[-.069,.150],[-.042,.153],[0,.195],[.037,.152],[.073,.144],
        [.107,.105],[.076,.076],[.072,-.032],[.034,-.063],[-.034,-.063],[-.076,-.032],[-.079,.065]],0,.012,agedIron);
      ell(handle,0,.046,.027,.030,.030,.027,headMetal);
      const ring=new T.Mesh(new T.TorusGeometry(.076,.010,8,36),headMetal);
      ring.position.set(0,-.024,.054);ring.rotation.x=.17;ring.castShadow=true;handle.add(ring);
      const staple=group(skin,dir*.70,1.55,.016);
      HouseKit.rounded(staple,0,0,.009,.121,.08,.015,.014,agedIron);
      if(side===1){
        const hasp=HouseKit.rounded(staple,-dir*.095,.008,.041,.228,.031,.012,.009,headMetal);hasp.rotation.z=.078;
        ell(staple,0,0,.035,.018,.018,.017,headMetal);
      }else{
        const bow=new T.Mesh(new T.TorusGeometry(.030,.006,6,20),headMetal);
        bow.rotation.y=.55;bow.scale.x=.64;bow.position.z=.035;staple.add(bow);
      }
    }
    // The complete leaf still moves as one rigid object. Batch its many small fasteners now.
    surface.dress(door);HouseKit.batch(door);
    door.traverse(o=>{if(o.isMesh&&o.material?.userData.surface)o.geometry.userData.cabinMapped=true;});
    doorHits.push({...hit(-side*.91,1.43,0,1.78,2.67,.35),parent:door});
  }
  register('西安','铁带铆钉双扇木门',[.03,3.06],[0,1.36,6.06],doorHits);

  // Rectified Xiamen brushwork and restored Fuzhou enamel use the photos in each city’s source notes.
  const sign=group(roofAndFront,-.99,2.57,5.15);sign.rotation.y=Math.PI;
  const arrowPoints=[[-.78,0],[-.48,.153],[.72,.153],[.72,-.153],[-.48,-.153]];
  const blackPaint=new T.MeshPhysicalMaterial({color:0x332c2a,roughness:.75,clearcoat:.05,
    normalMap:surface.texture('timber-normal.webp'),normalScale:new T.Vector2(.10,.10)});
  fittings(sign,arrowPoints,0,.033,blackPaint);
  const arrowInk=surface.texture('fixture-xiamen-script.webp',true);
  const lettering=panel(sign,.118,0,.037,1.187,.293,arrowInk,.13);
  lettering.material.roughness=.81;
  for(const x of [-.32,.49]){
    const mount=box(sign,x,.316,-.028,.050,.59,.035,agedIron);mount.rotation.z=.009;
    ell(sign,x,.107,.04,.008,.008,.004,headMetal);
  }
  register('厦门','曾厝垵巷口的左转指路箭头',[-1.15,3.71],[-.99,2.57,5.11],
    [{...hit(-.99,2.57,5.12,1.46,.34,.09),parent:roofAndFront}]);

  const blue=group(roofAndFront,2.47,2.15,5.45);blue.rotation.y=Math.PI;
  const bracket=mat(0x786955,{metalness:.41,roughness:.84});
  for(const x of [-.40,.40])box(blue,x,0,-.023,.05,.30,.044,bracket);
  HouseKit.rounded(blue,0,0,-.004,.966,.363,.018,.010,bracket);
  const enamelMap=surface.texture('fixture-fuzhou-enamel.webp',true);
  const plate=panel(blue,0,0,.009,.958,.352,enamelMap,.105);
  plate.material=new T.MeshPhysicalMaterial({map:enamelMap,color:0xffffff,roughness:.55,metalness:.08,
    clearcoat:.24,clearcoatRoughness:.50,emissiveMap:enamelMap,emissive:0xffffff,emissiveIntensity:.105,
    normalMap:surface.texture('fixture-iron-normal.webp'),normalScale:new T.Vector2(.13,.13)});
  for(const x of [-.457,.454])for(const y of [-.153,.154]){
    ell(blue,x,y,.012,.008,.008,.004,bracket);
    const slit=box(blue,x,y,.016,.007,.0016,.001,iron);slit.rotation.z=.44;
  }
  register('福州','佛寺巷蓝底街巷牌',[1.64,3.82],[2.47,2.15,5.43],
    [{...hit(2.47,2.15,5.42,.966,.363,.07),parent:roofAndFront}]);

  // Individual souvenir prints face out behind transparent, screw-mounted retaining strips.
  const rack=group(room,-2.97,.82,5.33);rack.rotation.y=Math.PI;
  const cols=6,rows=3,cellW=.245,cellH=.30,width=cols*cellW;
  const honey=surface.wood(0xffcf87),bevel=surface.wood(0xf0bc80);
  box(rack,0,.54,-.067,width+.11,1.09,.075,honey);
  for(let j=0;j<=cols;j++)box(rack,-width/2+j*cellW,.54,.029,.023,.94,.158,honey);
  for(let j=0;j<=rows;j++)box(rack,0,.11+j*cellH,.035,width+.055,.027,.181,honey);
  for(const x of [-width/2-.021,width/2+.021])box(rack,x,.555,.033,.039,1.09,.191,bevel);
  box(rack,0,.03,.021,width+.115,.075,.21,honey);box(rack,0,1.085,.018,width+.115,.065,.225,honey);
  for(const x of [-.64,.64])box(rack,x,-.39,-.015,.063,.81,.074,darkWood);
  const sheet=surface.texture('fixture-lhasa-prints.webp',true);
  const print=new T.MeshStandardMaterial({map:sheet,roughness:.67,emissiveMap:sheet,emissive:0xffffff,emissiveIntensity:.115});
  const ivory=mat(0xe4d8bc,{roughness:.87}),paperEdge=mat(0xbab19a,{roughness:.96});
  const printNumbers=[1,3,8,5,7,2, 6,1,10,3,9,7, 0,4,11,2,5,8];
  for(let i=0;i<cols*rows;i++){
    const col=i%cols,row=Math.floor(i/cols),x=-width/2+cellW*(col+.5),y=.133+row*cellH;
    const pile=group(rack,x+(rand()-.5)*.019,y+.093,.069);
    pile.rotation.x=-.14-rand()*.13;pile.rotation.z=(rand()-.5)*.115;
    const w=.13+rand()*.048,h=.15+rand()*.055;
    for(let j=0;j<3;j++){
      const d=.008+j*.004,card=box(pile,(rand()-.5)*.01,j*.005+.013*(2-j),-.032+j*.015,
        w*(.97+rand()*.05),h*(.99+rand()*.05),d,j===1?paperEdge:ivory);
      card.rotation.z=(rand()-.5)*.09;
    }
    const geo=new T.PlaneGeometry(w-.002,h-.002),uv=geo.attributes.uv,n=printNumbers[i];
    for(let k=0;k<uv.count;k++)uv.setXY(k,((n%4)+.008+uv.getX(k)*.984)/4,
      (2-Math.floor(n/4)+.008+uv.getY(k)*.984)/3);
    const front=new T.Mesh(geo,print);front.position.set(0,.009,.009);front.receiveShadow=true;pile.add(front);
  }
  const acrylic=new T.MeshPhysicalMaterial({color:0xd8e5dc,metalness:.08,roughness:.22,
    clearcoat:.60,clearcoatRoughness:.19,transparent:true,opacity:.075,depthWrite:false});
  const polishedEdge=mat(0xbac5ad,{metalness:.40,roughness:.34});
  for(let j=0;j<rows;j++){
    const y=.140+j*cellH,lip=box(rack,0,y+.032,.128,width+.026,.065,.004,acrylic);
    lip.castShadow=false;
    box(rack,0,y+.064,.129,width+.026,.0028,.005,polishedEdge);
    for(let k=0;k<=cols;k++){
      const x=-width*.5+k*cellW;ell(rack,x,y+.014,.133,.006,.006,.003,headMetal);
    }
  }
  obstacle(-2.97,5.32,1.57,.28);
  register('拉萨','可以抽取的木格明信片墙',[-2.31,3.70],[-2.97,1.43,5.24],[hit(-2.97,1.38,5.28,1.57,1.10,.19)]);

  // The narrow ladder rests against the shelf's left upright, clear of the books.
  const rails=group(room),foot=[1.72,.052,-4.66],top=[1.72,2.708,-5.129];
  const stileMat=surface.wood(0x9f876c),rungMat=surface.wood(0xb09774),endGrain=surface.wood(0x927c64);
  const heel=mat(0x484843,{roughness:.83}),ladderAxis=new T.Vector3(...top).sub(new T.Vector3(...foot));
  const slope=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),ladderAxis.clone().normalize());
  function ladderPoint(t,s){
    return [foot[0]+(top[0]-foot[0])*t+s,(top[1]-foot[1])*t+foot[1],foot[2]+(top[2]-foot[2])*t];
  }
  const ladderHits=[];
  for(const offset of [-.131,.131]){
    const p=ladderPoint(.5,offset),s=HouseKit.rounded(rails,...p,.064,ladderAxis.length(),.084,.012,stileMat);s.quaternion.copy(slope);
    const f=HouseKit.rounded(rails,...ladderPoint(.007,offset),.071,.059,.092,.008,heel);f.quaternion.copy(slope);
    const tip=HouseKit.rounded(rails,...ladderPoint(.987,offset),.069,.042,.089,.008,heel);tip.quaternion.copy(slope);
    for(let k=0;k<7;k++)ladderHits.push(hit(...ladderPoint((k+.5)/7,offset),.15,.43,.17));
  }
  for(let j=1;j<=8;j++){
    const t=j/9.25,p=ladderPoint(t,0);
    const rung=HouseKit.cylinder(rails,...p,.023,.023,.287,rungMat,16);
    rung.rotation.z=Math.PI/2;rung.scale.x=.85;rung.scale.z=1.30;
    for(const side of [-1,1]){
      const tenon=HouseKit.cylinder(rails,p[0]+side*.156,p[1],p[2],.015,.015,.009,endGrain,14);
      tenon.rotation.z=Math.PI/2;
    }
    ladderHits.push(hit(...p,.29,.064,.068));
  }
  obstacle(1.72,-4.82,.36,.46);
  ladderHits.push(hit(3.645,1.45,-5.11,4.12,2.59,.11),hit(3.392,2.99,-5.404,.64,.64,.07),
    hit(6.09,3.03,-5.19,1.41,.81,.25));
  register('济南','宽厚里书酒架',[1.14,-2.82],[3.97,1.91,-5.29],ladderHits);
  return exhibits;
};
