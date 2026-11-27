window.CabinBotDIY = (() => {
  const {T,mat,group,mesh,ell,stick,rounded,cylinder,canvas,seeded} = HouseKit;

  const Vec = (x,y,z) => new T.Vector3(x,y,z);
  const tube = (parent, points, radius, material) => {
    const path = new T.CatmullRomCurve3(points.map(point => Vec(...point)));
    return mesh(parent,new T.TubeGeometry(path,48,radius,10,false),material,0,0,0);
  };
  const gold = mat(0xbd9252,{metalness:.48,roughness:.34});
  const leather = mat(0x4b2920,{roughness:.86});
  const rim = mat(0x7c5235,{metalness:.28,roughness:.52});

  function sprout(parent,body) {
    const root=body.surface(-.45,1.43,Vec());
    const stem=group(parent,root.x,root.y-.010,root.z);
    const mid=Vec(.020,.143,.025);
    tube(stem,[[0,0,0],[.018,.071,.014],mid.toArray(),[.031,.192,.035]],.015,mat(0x3b6534));
    const leaf = (end,width,color) => {
      const tip=Vec(...end);
      const direction=tip.clone().sub(mid);
      const sideways=Vec(-direction.y,direction.x,.03).normalize();
      const positions=[],indices=[];
      for(let row=0;row<=20;row++){
        const t=row/20;
        const center=mid.clone().lerp(tip,t);
        center.y+=.038*Math.sin(Math.PI*t);
        for(let col=0;col<=8;col++){
          const s=col/4-1;
          const vertex=center.clone().addScaledVector(sideways,s*width*Math.sin(Math.PI*t)**.92);
          vertex.z+=(1-s*s)*.024*Math.sin(Math.PI*t);
          positions.push(...vertex.toArray());
          const i=row*9+col;
          if(row<20&&col<8)indices.push(i,i+1,i+9,i+1,i+10,i+9);
        }
      }
      const geometry=new T.BufferGeometry();
      geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      mesh(stem,geometry,mat(color,{side:T.DoubleSide,roughness:.56}),0,0,0);
      const vein = mid.clone().lerp(tip,.52);
      vein.y+=.036;vein.z+=.025;
      tube(stem,[mid.toArray(),vein.toArray(),mid.clone().lerp(tip,.84).add(Vec(0,.018,.014)).toArray()],.0039,mat(0x77974e));
    };
    leaf([-.214,.267,.078],.061,0x72a144);
    leaf([.249,.305,.060],.080,0x9aab49);
  }
  function headphones(parent,body) {
    const espresso=mat(0x3b2928,{roughness:.7});
    const orange=mat(0xde7e3c,{metalness:.2,roughness:.4});
    const ivory=mat(0xeccfa3,{roughness:.55});
    const points=Array.from({length:25},(_,i)=>{
      const sweep=i/24*Math.PI;
      const side=sweep<Math.PI/2?1:-1;
      const point=body.surface(side*Math.PI/2,Math.min(sweep,Math.PI-sweep),Vec());
      return [point.x+.043*Math.cos(sweep),point.y+.024+.052*Math.sin(sweep),.028];
    });
    tube(parent,points,.033,espresso);
    tube(parent,points.slice(3,-3).map(([x,y,z])=>[x,y+.016,z+.019]),.012,ivory);
    for(const side of [-1,1]){
      const support=body.surface(side*Math.PI/2,-.14,Vec());
      const cup=group(parent,support.x+side*.008,support.y,.052);
      cup.rotation.y=-side*.13;
      ell(cup,side*.021,0,0,.060,.148,.127,espresso);
      ell(cup,side*.064,0,0,.059,.138,.118,orange);
      ell(cup,side*.100,0,0,.035,.105,.087,ivory);
      ell(cup,side*.126,0,0,.016,.071,.061,orange);
      stick(parent,[support.x+side*.039,.078,.028],[cup.position.x+side*.056,cup.position.y,.052],.022,gold);
    }
  }
  function plaque(parent,body,labelText) {
    const label=canvas(512,300,(ctx,w,h)=>{
      const shade=ctx.createLinearGradient(0,0,w,h);
      shade.addColorStop(0,'#cda473');shade.addColorStop(1,'#9c6744');
      ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
      for (let i=0;i<40;i++){
        ctx.beginPath();ctx.strokeStyle=i%2?'rgba(94,51,28,.15)':'rgba(255,220,172,.16)';
        const y=i*8;ctx.moveTo(0,y);ctx.bezierCurveTo(w*.44,y+Math.sin(i)*12,w*.71,y+8,w,y-5);ctx.stroke();
      }
      ctx.strokeStyle='#63412e';ctx.lineWidth=3;
      ctx.roundRect(14,19,w-28,h-39,25);ctx.stroke();
      ctx.fillStyle='#39251c';ctx.font='600 123px "PingFang SC",sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(labelText,w/2,h*.51,w-74);
    });
    const y=body.bounds.min.y*.46,x=-.058,z=body.front(x,y);
    const tag=group(parent,x,y,z+.016);tag.rotation.x=.43;tag.rotation.y=-.12;tag.rotation.z=-.10;
    rounded(tag,0,0,0,.377,.224,.058,.036,mat(0x9c6445));
    const face=mesh(tag,new T.PlaneGeometry(.352,.201),new T.MeshStandardMaterial({map:label,roughness:.83}),0,0,.031);
    face.castShadow=false;
    const knot=body.surface(-.30,-.21,Vec());
    tube(parent,[knot.toArray(),[x-.095,y+.151,z+.067],[x+.102,y+.101,z+.065]],.012,leather);
    for(const px of [-.089,.091])ell(tag,px,.063,.038,.012,.012,.007,gold);
  }
  const woven = canvas(128,128,(ctx,width,height)=>{
    const random=seeded(147);
    ctx.fillStyle='#e4ded5';
    ctx.fillRect(0,0,width,height);
    for(let y=0;y<height;y+=2){
      ctx.fillStyle=y%4?'#77725f25':'#ffffff35';
      ctx.fillRect(0,y,width,1);
      for(let x=0;x<width;x+=3){
        ctx.fillStyle=random()>.5?'#80776825':'#ffffff2a';
        ctx.fillRect(x+(y%4?1:0),y,1,2);
      }
    }
  });

  function hatMount(parent,body,lean,yaw){
    const hat=group(parent,-.035,body.bounds.max.y-.117,-.010);
    hat.rotation.z=lean;
    hat.rotation.y=yaw;
    return hat;
  }

  function lathe(parent,profile,material){
    const geometry=new T.LatheGeometry(profile.map(([radius,y])=>new T.Vector2(radius,y)),72);
    return mesh(parent,geometry,material,0,0,0);
  }

  function baseball(parent,body){
    const hat=hatMount(parent,body,.13,-.19);
    const denim=new T.MeshStandardMaterial({color:0x36536c,map:woven,roughness:.91,bumpMap:woven,bumpScale:.006,side:T.DoubleSide});
    const seam=mat(0x52738b);
    const piping=mat(0x203c51);
    const crown=[
      [0,-.006],[.304,-.006],[.336,.014],[.344,.050],[.330,.119],
      [.292,.179],[.235,.221],[.166,.246],[.086,.259],[0,.262]
    ];
    lathe(hat,crown,denim);
    ell(hat,0,.266,0,.036,.014,.037,piping);
    for(let i=0;i<6;i++){
      const angle=(i+.5)*Math.PI/3;
      const line=crown.slice(2,-1).map(([radius,y])=>[
        (radius+.0015)*Math.sin(angle),y,(radius+.0015)*Math.cos(angle)
      ]);
      tube(hat,line,.0024,seam);
    }
    const positions=[],indices=[],edge=[];
    for(let i=0;i<=40;i++){
      const t=i/40,angle=(t-.5)*2.16;
      const extension=.185*Math.sin(t*Math.PI)**.79;
      for(const side of [0,1]){
        const radius=.320+side*(.022+extension);
        const point=[Math.sin(angle)*radius,.012-.018*side-.023*t**2,Math.cos(angle)*radius];
        positions.push(...point);
        if(side)edge.push(point);
      }
      if(i<40){const start=i*2;indices.push(start,start+1,start+2,start+1,start+3,start+2);}
    }
    const visor=new T.BufferGeometry();
    visor.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    visor.setIndex(indices);
    visor.computeVertexNormals();
    mesh(hat,visor,denim,0,0,0);
    tube(hat,edge,.010,piping);
    const embroidery=mat(0xe3cfa9,{roughness:.85});
    tube(hat,[[-.045,.097,.336],[0,.129,.332],[.045,.098,.338]],.007,embroidery);
    tube(hat,[[-.032,.080,.340],[0,.101,.337],[.033,.080,.340]],.005,embroidery);
  }

  function sailor(parent,body){
    const hat=hatMount(parent,body,-.095,.12);
    const canvasCloth=new T.MeshStandardMaterial({color:0xebdcba,map:woven,roughness:.94});
    const boundEdge=mat(0xece1c4);
    const navy=mat(0x35495a);
    lathe(hat,[[0,-.006],[.317,-.006],[.330,.018],[.314,.097],[.270,.170],[.213,.197],[.11,.205],[0,.205]],canvasCloth);
    const rim=[[.302,-.012],[.326,-.007],[.355,.024],[.386,.083],[.393,.102],[.390,.117],[.378,.122],[.367,.112],[.346,.053],[.311,.002],[.302,-.012]];
    lathe(hat,rim,canvasCloth);
    lathe(hat,[[.361,.040],[.365,.044],[.374,.061],[.372,.062]],navy);
    lathe(hat,[[.378,.119],[.386,.124],[.394,.118],[.394,.109]],boundEdge);
  }

  function traveler(parent,body){
    const hat=hatMount(parent,body,.10,-.22);
    const felt=new T.MeshStandardMaterial({color:0x947052,map:woven,roughness:1});
    const trim=mat(0x544135,{roughness:.84});
    const brim=mesh(hat,new T.SphereGeometry(1,60,20),felt,0,-.008,0,.489,.023,.451);
    brim.rotation.x=.045;
    lathe(hat,[[0,-.004],[.334,-.004],[.337,.030],[.319,.101],[.291,.182],[.263,.214],[.217,.224],[.145,.215],[0,.204]],felt);
    lathe(hat,[[.335,.016],[.342,.020],[.337,.049],[.327,.066],[.323,.066]],trim);
    rounded(hat,-.120,.046,.315,.055,.037,.015,.007,gold).rotation.y=-.31;
    rounded(hat,-.120,.046,.324,.034,.016,.008,.004,trim).rotation.y=-.31;
  }

  function strawHat(parent,body){
    const hat=hatMount(parent,body,.16,-.26);
    const straw=new T.MeshStandardMaterial({color:0xd4af6f,map:woven,roughness:.94,bumpMap:woven,bumpScale:.008});
    const binding=mat(0xa77d46,{roughness:.88});
    const ribbon=mat(0x88483d,{roughness:.93});
    const brim=lathe(hat,[[0,-.003],[.318,-.003],[.360,-.013],[.458,-.041],[.513,-.039],[.532,-.022],[.523,-.009],[.450,-.004],[.357,.017],[0,.021]],straw);
    const positions=brim.geometry.attributes.position;
    const rimPath=[];
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i),radius=Math.hypot(x,z);
      const lift=Math.max(0,radius-.31)*.21*Math.cos(Math.atan2(x,z)*2+.45);
      positions.setY(i,positions.getY(i)+lift);
    }
    positions.needsUpdate=true;
    brim.geometry.computeVertexNormals();
    for(let i=0;i<=48;i++){
      const angle=i/48*Math.PI*2;
      rimPath.push([.53*Math.sin(angle),-.023+.22*.21*Math.cos(2*angle+.45),.53*Math.cos(angle)]);
    }
    tube(hat,rimPath,.007,binding);
    lathe(hat,[[0,.005],[.313,.005],[.333,.033],[.322,.084],[.300,.138],[.267,.177],[.192,.196],[.078,.202],[0,.202]],straw);
    lathe(hat,[[.331,.034],[.336,.040],[.323,.088],[.318,.092]],ribbon);
    ell(hat,-.238,.072,.233,.044,.024,.017,ribbon).rotation.z=.2;
  }

  function flightFlap(parent,body,side,material,inset){
    const points=[],indices=[],segments=12;
    for(let row=0;row<=segments;row++){
      const t=row/segments;
      for(let column=0;column<=segments;column++){
        const u=2*column/segments-1;
        const width=(.27-inset)*(.82+.18*Math.sin(Math.PI*t));
        const angle=side*(1.50+u*width-.08*t);
        const bottom=.35+inset*1.65+.26*u*u;
        const latitude=T.MathUtils.lerp(1.04-inset*.3,bottom,t);
        const point=body.surface(angle,latitude,Vec());
        point.addScaledVector(point.clone().normalize(),.019+inset*.25+.010*Math.sin(Math.PI*t));
        points.push(point.x,point.y,point.z);
        if(row<segments&&column<segments){
          const a=row*(segments+1)+column,b=a+segments+1;
          indices.push(a,b,a+1,b,b+1,a+1);
        }
      }
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    mesh(parent,geometry,material,0,0,0);
  }

  function aviator(parent,body){
    const hat=hatMount(parent,body,-.035,.04);
    const suede=new T.MeshStandardMaterial({color:0x9d6343,map:woven,roughness:.87,side:T.DoubleSide});
    const fleece=mat(0xdbc59c,{roughness:.96,side:T.DoubleSide});
    const buckle=mat(0x694735);
    const lenses=mat(0x526f75,{metalness:.28,roughness:.29});
    lathe(hat,[[0,-.011],[.293,-.011],[.343,.012],[.353,.090],[.325,.153],[.278,.210],[.204,.234],[.110,.249],[0,.253]],suede);
    lathe(hat,[[.332,.011],[.348,.012],[.355,.034],[.351,.048]],fleece);
    for(const side of [-1,1]){
      flightFlap(parent,body,side,fleece,0);
      flightFlap(parent,body,side,suede,.05);
      const lens=group(hat,side*.112,.116,.319);
      lens.rotation.y=side*.24;
      lens.rotation.z=side*.10;
      rounded(lens,0,0,0,.196,.131,.040,.038,buckle);
      rounded(lens,0,0,.025,.166,.103,.023,.032,gold);
      rounded(lens,0,0,.044,.137,.076,.013,.021,lenses);
      tube(hat,[[side*.199,.122,.298],[side*.278,.118,.210],[side*.332,.105,.095]],.018,buckle);
    }
    tube(hat,[[-.035,.120,.331],[0,.133,.358],[.035,.120,.331]],.012,buckle);
  }

  function cookHat(parent,body){
    const hat=hatMount(parent,body,.085,-.15);
    const linen=new T.MeshStandardMaterial({color:0xf1e7d1,map:woven,roughness:.94});
    const warmWhite=mat(0xd7c6a5,{roughness:.94});
    lathe(hat,[[0,-.007],[.319,-.007],[.335,.005],[.335,.108],[.325,.123],[.302,.119]],linen);
    lathe(hat,[[.334,.008],[.338,.014],[.338,.022],[.334,.026]],warmWhite);
    const top=lathe(hat,[[0,.084],[.305,.084],[.347,.126],[.384,.185],[.390,.250],[.364,.300],
      [.314,.336],[.218,.357],[.105,.362],[0,.361]],linen);
    const positions=top.geometry.attributes.position;
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const pleat=Math.sin(Math.atan2(x,z)*9);
      const fold=1+.053*pleat*Math.sin(Math.PI*T.MathUtils.clamp((y-.11)/.26,0,1));
      positions.setXYZ(i,x*fold,y+.009*pleat*Math.hypot(x,z)/.39,z*fold);
    }
    positions.needsUpdate=true;
    top.geometry.computeVertexNormals();
  }

  const headwear={
    baseball,sailor,traveler,sprout,headphones,strawHat,aviator,cookHat
  };

  function caseStrap(parent,body,housing){
    const route = [
      [3.44,.685],[3.98,.75],[4.57,.66],
      [5.06,.53],[5.50,.18],[5.97,-.20],[6.43,-.43],
      [6.91,-.61],[7.39,-.64],[7.85,-.61],[8.34,-.60],
      [8.79,-.58],[9.20,-.58]
    ];
    const curve=new T.CatmullRomCurve3(route.map(([azimuth,elevation])=>Vec(azimuth,elevation,0)));
    const rail=Array.from({length:73},(_,i)=>{
      const {x:azimuth,y:elevation}=curve.getPoint(i/72);
      return body.surface(azimuth,elevation,Vec()).multiplyScalar(1.027);
    });
    housing.updateWorldMatrix(true,false);
    const anchor=(x,y,z)=>parent.worldToLocal(housing.localToWorld(Vec(x,y,z)));
    const top=anchor(.012,.293,-.044),bottom=anchor(.081,-.344,-.073);
    const path=[top,...rail,bottom];
    const strapMaterial=mat(0x593b31,{roughness:.78,side:T.DoubleSide});
    const strapEdge=mat(0x9a765a,{roughness:.85});
    const positions=[],indices=[];
    const smoothPath=new T.CatmullRomCurve3(path);
    const left=[],right=[];
    for(let i=0;i<=124;i++){
      const t=i/124,center=smoothPath.getPoint(t),forward=smoothPath.getTangent(t);
      const normal=center.clone().normalize();
      const across=new T.Vector3().crossVectors(normal,forward).normalize();
      const width=.040;
      for(const side of [-1,1]){
        const point=center.clone().addScaledVector(across,width*side);
        positions.push(...point.toArray());
        (side===-1?left:right).push(point.toArray());
      }
      if(i<124){
        const start=i*2;indices.push(start,start+1,start+2,start+2,start+1,start+3);
      }
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    mesh(parent,geometry,strapMaterial,0,0,0);
    tube(parent,left,.0032,strapEdge);
    tube(parent,right,.0032,strapEdge);

    const buckleOnBody=body.surface(5.27,.37,Vec());
    const buckle=group(parent,...buckleOnBody.multiplyScalar(1.044).toArray());
    buckle.rotation.y=-.95;
    buckle.rotation.z=.56;
    for(const dy of [-.041,0,.041])
      rounded(buckle,0,dy,0,.090,.010,.016,.004,gold);
    for(const dx of [-.041,.041])
      rounded(buckle,dx,0,0,.011,.088,.015,.004,gold);
  }

  function guitarCase(parent,body){
    const housing=group(parent,.015,.070,-body.depth-.062);
    housing.rotation.z=-.38;
    housing.rotation.y=Math.PI;
    housing.rotation.x=.035;
    const outline=new T.Shape();
    outline.moveTo(0,-.524);
    outline.bezierCurveTo(-.156,-.519,-.197,-.421,-.173,-.293);
    outline.bezierCurveTo(-.155,-.181,-.093,-.169,-.075,-.081);
    outline.lineTo(-.056,.373);
    outline.bezierCurveTo(-.054,.484,.048,.485,.061,.386);
    outline.lineTo(.079,-.099);
    outline.bezierCurveTo(.102,-.162,.158,-.208,.173,-.299);
    outline.bezierCurveTo(.200,-.454,.136,-.522,0,-.524);
    const leatherShell=mat(0x76523e,{roughness:.76});
    const lid=mat(0x946a4d,{roughness:.71});
    const bevel={bevelEnabled:true,bevelSize:.012,bevelThickness:.015,bevelSegments:4,curveSegments:20};
    mesh(housing,new T.ExtrudeGeometry(outline,{...bevel,depth:.099}),leatherShell,0,0,-.061);
    mesh(housing,new T.ExtrudeGeometry(outline,{...bevel,depth:.017}),lid,0,0,.046,.92,.94,1);
    const edge=outline.getPoints(20).map(({x,y})=>[x*.961,y*.97,.057]);
    const track=new T.CatmullRomCurve3(edge.slice(0,-1).map(point=>Vec(...point)),true);
    mesh(housing,new T.TubeGeometry(track,96,.0055,8,true),mat(0xc0956c,{roughness:.85}),0,0,0);
    for(const [x,y] of [[.088,-.207],[.054,.217],[-.111,-.416]]){
      rounded(housing,x,y,.078,.040,.025,.014,.006,gold).rotation.z=.24;
    }
    tube(housing,[[.082,-.091,.019],[.143,-.100,.021],[.156,-.166,.025],[.123,-.194,.023]],.011,leather);
    rounded(housing,.013,-.315,.084,.085,.041,.012,.010,mat(0xd2ac7c)).rotation.z=-.16;
    caseStrap(parent,body,housing);
  }
  function lantern(parent,body) {
    const grip=body.surface(-1.01,.09,Vec());
    const light=group(parent,grip.x-.153,grip.y-.251,grip.z+.105);
    const iron=mat(0x4e3f34,{metalness:.32,roughness:.47});
    const glass=new T.MeshStandardMaterial({color:0xf0be69,emissive:0xff932d,emissiveIntensity:.51,roughness:.36});
    const paw=ell(parent,grip.x-.064,grip.y,grip.z+.075,.090,.053,.052,mat(body.shell.material.color.getHex()));
    paw.rotation.z=.29;
    tube(light,[[-.097,.110,0],[-.101,.207,0],[0,.253,0],[.101,.207,0],[.097,.110,0]],.011,iron);
    cylinder(light,0,-.092,0,.107,.102,.046,iron,8);
    cylinder(light,0,.010,0,.088,.084,.140,glass,8);
    cylinder(light,0,.094,0,.066,.112,.045,iron,8);
    cylinder(light,0,.124,0,.051,.069,.023,rim,8);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3+.28,x=.082*Math.cos(a),z=.082*Math.sin(a);
      stick(light,[x,-.074,z],[x*1.02,.084,z*1.02],.008,iron);
    }
  }
  const haloTexture=canvas(128,128,(ctx,w,h)=>{
    const halo=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    halo.addColorStop(0,'rgba(255,243,147,.93)');
    halo.addColorStop(.22,'rgba(255,212,92,.55)');
    halo.addColorStop(.56,'rgba(255,184,44,.17)');
    halo.addColorStop(1,'rgba(255,181,42,0)');
    ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
  });
  function fireflies(parent) {
    const positions=[[-.67,.06,.25,.023],[-.47,.34,.19,.015],[.56,.36,.36,.024],[.63,-.05,.15,.018],[-.37,-.29,.44,.014]];
    for(const [x,y,z,r] of positions){
      const glow=new T.Sprite(new T.SpriteMaterial({map:haloTexture,transparent:true,opacity:.94,depthWrite:false}));
      glow.position.set(x,y,z);glow.scale.setScalar(r*11);parent.add(glow);
      const core=new T.MeshBasicMaterial({color:0xffec9a,toneMapped:false});
      ell(parent,x,y,z+.013,r*.68,r*.68,r*.68,core);
      for(const side of [-1,1]){
        const wing=ell(parent,x+side*r*.75,y+r*.55,z,r*.85,r*.33,r*.32,mat(0xf9dd9b,{transparent:true,opacity:.78}));
        wing.rotation.z=side*.55;
      }
    }
  }
  function expression(parent,body,style) {
    const white=new T.MeshBasicMaterial({color:0xfffffc,toneMapped:false});
    body.eyes.forEach((eye,index)=>{
      const center=new T.Box3().setFromBufferAttribute(eye.geometry.attributes.position).getCenter(Vec());
      const x=center.x,y=center.y;
      const offset=style==='curious'?(index?.042:-.013):0;
      const depth=body.front(x,y+offset);
      const pose=group(parent,x,y+offset,depth);
      if(style==='curious'){
        const radius=index?.041:.053;
        ell(pose,0,0,.007,radius,radius,.017,white);
        return;
      }
      const points=Array.from({length:9},(_,i)=>{
        const k=i/4-1, dx=k*.058,dy=.028*(1-k*k)+.013*k;
        return [dx,dy,body.front(x+dx,y+dy)-depth+.014];
      });
      tube(pose,points,.018,white);
      for(const end of [points[0],points.at(-1)])ell(pose,...end,.018,.018,.016,white);
    });
  }

  return {headwear,plaque,guitarCase,lantern,fireflies,expression};
  })();
