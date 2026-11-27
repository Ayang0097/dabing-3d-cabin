// Fine joinery and face materials for the Chengdu, Xitang and Suzhou displays.
// Lettering, chalk marks and instrument skins are rectified from the approved illustrated references.
window.CabinCraft = (() => {
  const {T,group,box,ell,mat,rounded,stick,cylinder,seeded,panel,batch}=HouseKit;
  const S=CabinSurfaces;
  const mineral=S.texture('hearth-rough.webp',false,2,2);
  const cast=new T.MeshStandardMaterial({color:0x494335,metalness:.56,roughness:.76,roughnessMap:mineral,bumpMap:mineral,bumpScale:.0018});
  const bright=mat(0xb09b72,{metalness:.74,roughness:.38});
  function skin(parent,geo,finish) {
    const obj=new T.Mesh(geo,finish);parent.add(obj);obj.castShadow=obj.receiveShadow=true;return obj;
  }
  function curve(parent,points,r,m,steps=16){
    return skin(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),steps,r,7,false),m);
  }
  function moulding(parent,x,y,z,r,t,m,axis='z'){
    const ring=skin(parent,new T.TorusGeometry(r,t,8,48),m);
    ring.position.set(x,y,z);
    if(axis==='x')ring.rotation.y=Math.PI/2;
    if(axis==='y')ring.rotation.x=Math.PI/2;
    return ring;
  }

  function writingDesk(room){
    const desk=group(room,-5.70,0,.30);desk.rotation.y=Math.PI/2;
    box(desk,0,.777,0,1.705,.057,.748,S.furnitureWood(0xc9a88c));
    const face=panel(desk,0,.807,0,1.699,.736,S.texture('chengdu-inscribed-top.webp',true));
    face.rotation.x=-Math.PI/2;face.material.roughness=.91;
    face.material.bumpMap=S.texture('chengdu-inscribed-top.webp');
    face.material.bumpScale=.00125;
    S.tabletopWear(desk,.808,[[.10,.20,.177,.163,0,.51],[-.39,-.24,.32,.121,3,-.18]]);
    for(const side of [-1,1]){
      const x=side*.639;
      box(desk,x,.730,0,.090,.024,.60,cast);
      for(const fore of [-1,1]){
        const at=(h,z,dx=0)=>[x+side*dx,h,fore*z];
        // A cast-iron treadle end is pierced between two flared, curved standards.
        curve(desk,[at(.035,.29,.035),at(.16,.245,.019),at(.36,.17),at(.54,.185),at(.718,.24)],.022,cast);
        curve(desk,[at(.053,.29,.035),at(.16,.19,.015),at(.28,.075),at(.46,.11),at(.59,.185),at(.716,.12)],.014,cast);
        curve(desk,[at(.14,.238),at(.186,.156),at(.11,.068),at(.096,.0)],.012,cast);
        curve(desk,[at(.45,.135),at(.53,.107),at(.65,.045),at(.718,.071)],.012,cast);
        const shoe=rounded(desk,x+side*.036,.024,fore*.287,.088,.073,.045,.012,cast);shoe.rotation.x=-Math.PI/2;
        ell(desk,x+side*.042,.053,fore*.286,.022,.011,.021,bright);
      }
    }
    stick(desk,[-.637,.457,-.04],[.637,.457,-.04],.021,cast);
    for(const side of [-1,1])curve(desk,[[side*.63,.148,.006],[side*.49,.277,-.01],[side*.39,.413,-.04],[side*.32,.454,-.04]],.014,cast);
    const wx=.573,wy=.432,wz=.008;
    for(const dx of [-.011,.011])moulding(desk,wx+dx,wy,wz,.211,.011,cast,'x');
    for(let i=0;i<7;i++){
      const a=i*2*Math.PI/7;
      curve(desk,[[wx,wy,wz],[wx,wy+.10*Math.cos(a+.18),wz+.10*Math.sin(a+.18)],[wx,wy+.205*Math.cos(a),wz+.205*Math.sin(a)]],.009,cast,8);
    }
    stick(desk,[wx-.062,wy,wz],[wx+.078,wy,wz],.029,cast,16);
    const pedal=group(desk,0,.129,.104);pedal.rotation.x=-.14;
    for(const z of [-.139,.139])box(pedal,0,0,z,.72,.018,.018,cast);
    for(const x of [-.351,.351])box(pedal,x,0,0,.017,.018,.287,cast);
    // A single open diamond lattice casts its own shadows onto the floor.
    for(let j=-5;j<=5;j++)for(const sign of [-1,1]){
      const x=j*.089,lo=Math.max(-.134,(-.346-x)/.87),hi=Math.min(.134,(.346-x)/.87);
      if(hi>lo)stick(pedal,[x+.87*lo,0,sign*lo],[x+.87*hi,0,sign*hi],.0057,cast,5);
    }
    stick(desk,[.34,.13,.11],[wx-.03,wy-.07,wz+.092],.008,bright);
  }

  function candleBoard(room){
    const rng=seeded(1242),g=group(room,6.50,0,-1.94);g.rotation.y=-Math.PI/2;
    const timber=S.wood(0xb4977f),mould=S.wood(0x8e7361);
    box(g,0,1.18,.14,1.68,.089,.44,S.furnitureWood(0xc6a88a));
    const easel=group(g,-.37,1.22,.154);easel.rotation.x=-.075;
    for(const side of [-1,1]){
      stick(easel,[side*.265,.006,.032],[side*.264,1.055,-.014],.024,mould,8);
      stick(easel,[side*.245,.003,-.175],[side*.245,.930,-.036],.019,timber,8);
    }
    rounded(easel,0,.595,0,.544,.879,.032,.010,mould);
    const board=panel(easel,0,.594,.018,.49,.815,S.texture('xitang-chalk.webp',true));
    board.material.roughness=.96;board.material.bumpMap=mineral;board.material.bumpScale=.0006;
    for(const x of [-.258,.258])box(easel,x,.595,.029,.028,.896,.023,timber);
    for(const y of [.16,1.028])box(easel,0,y,.032,.55,.031,.024,timber);
    for(const x of [-.255,.255])for(const y of [.163,1.025])ell(easel,x,y,.046,.006,.006,.003,bright);
    const candles=group(g,.35,1.226,.198);
    const tray=mat(0x796350,{metalness:.66,roughness:.61});
    cylinder(candles,0,.014,0,.258,.247,.027,tray,64);
    moulding(candles,0,.037,0,.250,.009,tray,'y');
    const waxes=[0xf2ce95,0xe4b97e,0xf1d6a7].map(color=>new T.MeshPhysicalMaterial({
      vertexColors:true,color,map:S.texture('xitang-wax-flow.webp',true,1,1),roughness:.48,clearcoat:.12,clearcoatRoughness:.39,
      bumpMap:S.texture('xitang-wax-flow.webp'),bumpScale:.0012,roughnessMap:mineral
    }));
    const candleMelt=mat(0xf0d9ae,{roughness:.51}), wick=mat(0x413323);
    const flame=mat(0xffdb90,{emissive:0xffa23f,emissiveIntensity:1.45}),core=mat(0xfff5cf,{emissive:0xffe7b5,emissiveIntensity:2.2});
    const stems=[[0,-.064,.705,.066],[-.096,-.046,.542,.061],[.103,-.027,.422,.058],[-.108,.087,.335,.058],[.031,.117,.243,.061],[.151,.092,.184,.041],[-.174,.015,.222,.039]];
    stems.forEach(([x,z,height,r],i)=>{
      // Each rivulet is part of the candle surface. It changes course and
      // thickens into a drop where the wax cooled, leaving visible recesses between runs.
      const column=group(candles,x,.034,z),segments=68,levels=38,positions=[],uv=[],index=[],colors=[];
      const drips=Array.from({length:14},(_,j)=>({
        angle:(j+rng()*.56)*Math.PI*2/14, width:.085+rng()*.083,
        stop:j%5===0?.030+rng()*.07:.17+rng()*.58,
        thick:r*(.12+rng()*.23),sway:.13+rng()*.26,phase:rng()*6.28
      }));
      for(let k=0;k<=levels+3;k++)for(let j=0;j<=segments;j++){
        const a=j/segments*Math.PI*2,t=Math.min(1,k/levels);
        const crest=.005*Math.sin(a*4+.58*i)+.0055*Math.cos(a*3+i)+.002*Math.sin(9*a);
        let rr=r*(1+.025*Math.sin(a*6+t*3+i)),yy=t*(height+crest);
        let relief=0;
        for(const d of drips){
          const course=d.angle+d.sway*Math.sin(t*4.9+d.phase);
          const delta=Math.atan2(Math.sin(a-course),Math.cos(a-course));
          const start=t-d.stop, gate=T.MathUtils.smoothstep(start,-.030,.035);
          const bead=Math.exp(-((start-.035)**2)/.0020);
          relief+=gate*d.thick*(.57+.55*bead+.22*Math.sin(t*12+d.phase))*Math.exp(-.60*(delta/(d.width*(1+.22*bead)))**2);
        }
        rr+=relief+.003*Math.cos(4*a+t*9)*Math.exp(-t*6);
        if(k===levels+1){rr=r*.80+relief*.30;yy=height+crest-.006;}
        if(k===levels+2){rr=r*.50;yy=height-.023+crest*.23;}
        if(k===levels+3){rr=.001;yy=height-.025;}
        const glow=relief/r, age=.93+.09*t;
        colors.push(Math.min(1,age+.25*glow),Math.min(1,.86+glow*.38+.10*t),Math.min(1,.75+glow*.52+.13*t));
        positions.push(rr*Math.cos(a),yy,rr*Math.sin(a));uv.push(j/segments,t);
        if(k<levels+3&&j<segments){const n=k*(segments+1)+j;index.push(n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2);}
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(index);geo.computeVertexNormals();
      skin(column,geo,waxes[i%3]);
      for(let j=0;j<6;j++){
        const a=2.39*j,radius=r*(.75+rng()*.29);
        const foot=ell(column,Math.cos(a)*radius,.004+rng()*.004,Math.sin(a)*radius,.019+rng()*.012,.010+rng()*.006,.022+rng()*.015,candleMelt);
        foot.rotation.y=a;
      }
      const pool=ell(candles,x,.041,z,r*1.47,.009,r*1.31,candleMelt);pool.rotation.y=i*1.9;
      if(i===0||i===1||i===3||i===5){
        stick(column,[0,height-.014,0],[.004,height+.018,0],.0024,wick,6);
        const f=skin(column,new T.LatheGeometry([[.001,0],[.010,.010],[.011,.021],[.006,.032],[.0005,.062]].map(p=>new T.Vector2(...p)),14),flame);
        f.position.set(.004,height+.010,0);f.rotation.z=-.08-.06*(i%3);
        ell(column,.004,height+.023,.005,.006,.014,.006,core);
      }else stick(column,[0,height-.015,0],[.003,height+.006,.001],.0026,wick,6);
    });
  }

  function instruments(room){
    const rack=group(room,-4.94,.293,-4.335);
    const walnut=S.wood(0xaf8a69),ivory=mat(0xe7ce9c),ebony=mat(0x352c25,{roughness:.55}),strings=mat(0xd7bd84,{metalness:.78,roughness:.33});
    for(const s of [-1,1]){
      box(rack,s*.50,.046,0,.056,.073,.37,walnut);
      box(rack,s*.50,.315,-.105,.055,.60,.058,walnut);
      curve(rack,[[s*.50,.060,.147],[s*.50,.22,.118],[s*.50,.44,.052],[s*.50,.493,-.08]],.018,walnut);
      ell(rack,s*.50,.10,.157,.010,.010,.006,bright);
    }
    for(const [y,z] of [[.087,.128],[.581,-.098]])box(rack,0,y,z,1.01,.045,.048,walnut);
    for(const x of [-.257,.257])for(const s of [-1,1])stick(rack,[x+s*.103,.080,-.064],[x+s*.103,.092,.13],.011,ebony,10);

    function instrument(x,y,z,angle){
      const parent=group(room,x,y,z);parent.rotation.set(-.075,angle,0);return parent;
    }
    const guitar=instrument(-4.68,.371,-4.33,.03);
    // Trace the approved face in its own millimetre coordinates. Keep sidewalls, rim and bore in actual depth.
    function tracedFace(parent,bounds,transform,perimeter,thickness,paint,side,hole){
      const shape=new T.Shape();
      for(const [i,p] of perimeter.entries()){
        const q=p.flatMap((value,k)=>k%2?[]:transform(value,p[k+1]));
        if(i===0)shape.moveTo(...q);
        else if(q.length===6)shape.bezierCurveTo(...q);else shape.lineTo(...q);
      }
      shape.closePath();
      if(hole){
        const bore=new T.Path();bore.absarc(hole.x,hole.y,hole.r,0,Math.PI*2,true);shape.holes.push(bore);
      }
      const sides=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelThickness:.0025,bevelSize:.0025,bevelSegments:2,curveSegments:16});
      skin(parent,sides,side);
      const face=new T.ShapeGeometry(shape,24),p=face.attributes.position,uv=face.attributes.uv;
      const origin=transform(bounds[0],bounds[1]),right=transform(bounds[2],bounds[1]),down=transform(bounds[0],bounds[3]);
      for(let i=0;i<p.count;i++){
        const v=(p.getY(i)-origin[1])/(down[1]-origin[1]);
        const u=(p.getX(i)-origin[0]-(down[0]-origin[0])*v)/(right[0]-origin[0]);
        uv.setXY(i,u,1-v);
      }
      const coating=new T.MeshPhysicalMaterial({map:S.texture(paint+'.webp',true),roughness:.57,clearcoat:.26,clearcoatRoughness:.38});
      const front=skin(parent,face,coating);front.position.z=thickness+.0028;
      return shape;
    }
    const gx=(x,y)=>[(x-244-(332-y)*.101)*.00369,(332-y)*.00369];
    const [hx,hy]=gx(251,219), ro=.049;
    const guitarEdge=[[247,331],[210,331,189,324,186,308],[180,283,196,260,202,242],[213,219,207,207,211,191],[214,177,226,172,242,172],[259,170,275,169,285,172],[302,176,304,193,302,208],[302,226,292,237,297,252],[300,266,309,286,304,305],[299,326,280,333,247,331]];
    const varnish=new T.MeshPhysicalMaterial({color:0x76472f,roughness:.41,clearcoat:.36,clearcoatRoughness:.31});
    tracedFace(guitar,[182,168,310,335],gx,guitarEdge,.093,'suzhou-spruce',varnish,{x:hx,y:hy,r:ro});
    const recess=cylinder(guitar,hx,hy,.012,ro,ro,.005,ebony,40);recess.rotation.x=Math.PI/2;
    for(const [r,t,m] of [[ro+.002,.0017,ivory],[ro+.005,.001,ebony],[ro+.008,.0013,ivory]])moulding(guitar,hx,hy,.096,r,t,m);
    const guitarX=gx(251,219)[0], bridgeY=gx(240,270)[1];
    box(guitar,guitarX,.737,.051,.058,.451,.055,varnish);
    box(guitar,guitarX,.738,.093,.059,.450,.013,ebony);
    const nutY=.925,scale=.687;
    for(let i=1;i<=19;i++){
      const y=nutY-scale*(1-Math.pow(2,-i/12));
      stick(guitar,[guitarX-.029,y,.101],[guitarX+.029,y,.101],.00135,bright,7);
      if([3,5,7,9,15].includes(i))ell(guitar,guitarX,y+.012,.101,.003,.003,.0012,ivory);
    }
    const head=rounded(guitar,guitarX,1.007,.071,.084,.162,.033,.016,walnut);head.rotation.z=-.009;
    const bridge=rounded(guitar,guitarX,bridgeY,.101,.136,.030,.012,.008,ebony);bridge.rotation.z=-.018;
    stick(guitar,[guitarX-.036,bridgeY+.005,.109],[guitarX+.036,bridgeY+.008,.109],.0028,ivory,8);
    box(guitar,guitarX,nutY,.102,.060,.006,.008,ivory);
    for(let i=0;i<6;i++){
      const low=guitarX+(i-2.5)*.011,high=guitarX+(i-2.5)*.0082,sg=i<3?-1:1,py=.965+(i<3?i:5-i)*.036;
      stick(guitar,[low,bridgeY,.112],[high,nutY,.106],.00065+(5-i)*.00012,strings,6);
      ell(guitar,low,bridgeY-.005,.110,.0022,.0022,.0022,ivory);
      stick(guitar,[high,nutY,.106],[guitarX+sg*.027,py,.092],.0009,strings,5);
      stick(guitar,[guitarX+sg*.023,py,.080],[guitarX+sg*.054,py,.080],.004,bright,10);
      ell(guitar,guitarX+sg*.055,py,.08,.006,.009,.006,bright);
    }
    const lute=instrument(-5.20,.37,-4.34,.08);
    const lx=(x,y)=>[(x-123-(336-y)*.075)*.00362,(336-y)*.00362];
    const skinEdge=[[121,335],[99,335,89,326,89,310],[86,296,88,273,96,260],[102,250,115,247,129,247],[147,247,159,253,163,270],[168,284,164,307,158,319],[150,333,141,335,121,335]];
    tracedFace(lute,[87,245,166,337],lx,skinEdge,.071,'suzhou-resonator',walnut);
    box(lute,0,.654,.028,.039,.688,.038,walnut);box(lute,0,.66,.051,.036,.69,.010,ebony);
    rounded(lute,0,1.018,.036,.053,.15,.041,.011,walnut);
    const crown=rounded(lute,0,1.100,.036,.074,.049,.040,.013,walnut);crown.rotation.z=.06;
    for(const [i,sg] of [[0,1],[1,-1],[2,1]]){
      const y=.972+i*.038;
      stick(lute,[sg*.019,y,.042],[sg*.068,y+.002,.042],.006,walnut,10);
      const key=cylinder(lute,sg*.087,y+.002,.042,.009,.015,.042,walnut,16);key.rotation.z=-sg*Math.PI/2;
      const x=(i-1)*.010;
      stick(lute,[x,.036,.085],[x,.996,.062],.00125,strings,7);
    }
    box(lute,0,.061,.083,.072,.013,.017,ivory);
    for(const inst of [rack,guitar,lute]){S.dress(inst);batch(inst);}
  }
  return {writingDesk,candleBoard,instruments};
})();
