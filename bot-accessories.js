window.CabinBotAccessories = (() => {
  const {T,mat,mesh,batch}=HouseKit;
  const options={
    scarf:{name:'围巾',styles:{knit:'砖红针织',stripe:'松绿条纹',kerchief:'姜黄方巾'}},
    glasses:{name:'眼镜',styles:{round:'复古圆框',square:'靛蓝方框',amber:'琥珀细框'}},
    hat:{name:'帽子',styles:{beanie:'毛球针织帽',beret:'橄榄贝雷帽',bucket:'焦糖渔夫帽'}},
    hair:{name:'发型',styles:{side:'斜刘海',curl:'小卷毛',bun:'丸子头'}}
  };
  const categories=Object.keys(options);
  const templates=new Map(),portraits=new Map(),turn=Math.PI*2;
  const normalize = raw => Object.fromEntries(categories.map(key => {
    const style=raw?.[key];
    return [key,typeof style==='string'&&Object.hasOwn(options[key].styles,style)?style:'none'];
  }));

  const cloth=mat(0xffffff,{roughness:.91,vertexColors:true,side:T.DoubleSide});
  const hairMaterial=mat(0xffffff,{roughness:.69,vertexColors:true,side:T.DoubleSide});
  const halfPi=Math.PI/2, clamp=T.MathUtils.clamp, lerp=T.MathUtils.lerp;
  const profileCache=new Map();

  function faceProfile(body){
    const strokes=body.eyes.map(eye=>eye.geometry.attributes.position);
    const centres=strokes.map(points=>new T.Box3().setFromBufferAttribute(points).getCenter(new T.Vector3()));
    const slope=clamp(Math.atan2(centres[1].y-centres[0].y,centres[1].x-centres[0].x),-.30,.30);
    const axis=new T.Vector2(Math.cos(slope),Math.sin(slope)),up=new T.Vector2(-axis.y,axis.x);
    let top=0,left=Infinity,right=-Infinity;
    const outlines=strokes.map(points=>{
      const bound=new T.Box2();
      const uv=new T.Vector2();
      for(let i=0;i<points.count;i++){
        const x=points.getX(i),y=points.getY(i),z=points.getZ(i),azimuth=Math.atan2(x,z);
        bound.expandByPoint(uv.set(axis.x*x+axis.y*y,up.x*x+up.y*y));
        top=Math.max(top,Math.atan2(y,Math.hypot(x,z)));
        left=Math.min(left,azimuth);right=Math.max(right,azimuth);
      }
      return {center:bound.getCenter(new T.Vector2()),size:bound.getSize(new T.Vector2())};
    });
    return {top,azimuth:(left+right)*.5,axis,up,outlines};
  }
  function forehead(face,angle,back,clearance){
    const relative=Math.atan2(Math.sin(angle-face.azimuth),Math.cos(angle-face.azimuth));
    const front=1-T.MathUtils.smootherstep(Math.abs(relative),.55,1.30);
    return back+Math.max(0,face.top+clearance-back)*front;
  }

  function fitSurface(body,point,angle,elevation,relief){
    body.surface(angle,elevation,point);
    point.multiplyScalar(1+relief/point.length());
    return point;
  }

  function fabricPatch(g,material,steps,rows,wrap,sample){
    const points=[],colors=[],indices=[],point=new T.Vector3(),color=new T.Color();
    const columns=steps+(wrap?0:1);
    for(let row=0;row<=rows;row++){
      for(let col=0;col<columns;col++){
        sample(col/steps,row/rows,point,color);
        points.push(point.x,point.y,point.z);colors.push(color.r,color.g,color.b);
        if(row===rows||col===steps)continue;
        const a=row*columns+col,b=row*columns+(col+1)%columns;
        indices.push(a,b,a+columns,b,b+columns,a+columns);
      }
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    const part=new T.Mesh(geometry,material);part.receiveShadow=true;g.add(part);
  }

  function softDetail(g,material,center,scale,tint,yaw=0,texture=0){
    const geometry=new T.SphereGeometry(1,20,14),positions=geometry.attributes.position,colors=[];
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const angle=Math.atan2(x,z),groove=Math.cos(angle*7+y*4.9)*Math.cos(y*8.2);
      const radius=1+texture*groove*(1-y*y);
      positions.setXYZ(i,x*radius,y*radius,z*radius);
      const shade=.90+.10*y+.055*groove;
      colors.push(tint.r*shade,tint.g*shade,tint.b*shade);
    }
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
    const detail=mesh(g,geometry,material,center.x,center.y,center.z,...scale);
    detail.rotation.y=yaw;
    return detail;
  }

  function scarf(g,body,style){
    const palette={
      knit:[0xa95240,0xdeaa85,0x713e32],
      stripe:[0x537b63,0xe0be88,0x304f43],
      kerchief:[0xc08a4f,0xf0c68c,0x895a38]
    };
    const [base,trim,seam]=palette[style].map(value=>new T.Color(value));
    const bandTop=a=>-.235+.043*Math.cos(a+.32)+.078*Math.sin(a-.60);
    const knotAngle={knit:-.98,stripe:-2.26,kerchief:.98}[style];
    const bandDepth=style==='kerchief'?.22:.31;
    fabricPatch(g,cloth,72,16,true,(u,t,point,color)=>{
      const a=u*turn,top=bandTop(a);
      const drop=style==='kerchief'?.38*Math.max(0,Math.cos(a-.14))**8:.065*(1+Math.cos(a+.26))*.5;
      const fold=Math.sin(Math.PI*t),rib=Math.cos(a*36)*.003*fold;
      const turnOfCloth=.007*Math.sin(t*turn+a*.56)*fold;
      const relief=-.007+(.039+Math.sin(a+.56)*.008)*fold**.68+rib+turnOfCloth;
      fitSurface(body,point,a,top-(1-t)*(bandDepth+drop),relief);
      color.copy(base);
      if(style==='stripe'){
        const stripe=Math.max(1-T.MathUtils.smoothstep(Math.abs(t-.27),.025,.087),1-T.MathUtils.smoothstep(Math.abs(t-.72),.022,.069));
        color.lerp(trim,stripe*.81);
      }else if(style==='kerchief'){
        color.lerp(trim,(1-T.MathUtils.smoothstep(Math.abs(t-.15),.006,.078))*.63);
      }
      const edge=1-T.MathUtils.smoothstep(Math.min(t,1-t),.018,.19);
      color.lerp(seam,edge*.46).multiplyScalar(1+.042*Math.cos(a*36)+.024*Math.cos(t*turn*4+a));
    });
    const neckline=bandTop(knotAngle)-bandDepth*.43;
    const knot=fitSurface(body,new T.Vector3(),knotAngle,neckline,.030);
    softDetail(g,cloth,knot,[.093,.055,.033],base,knotAngle,.12).rotation.z=.19;
    if(style==='kerchief'){
      softDetail(g,cloth,fitSurface(body,new T.Vector3(),knotAngle-.11,neckline-.078,.019),
        [.061,.037,.026],base,knotAngle,.08);
      return;
    }
    const proportion=clamp((body.bounds.max.y-body.bounds.min.y)/.96,.80,1.08);
    for(const [angle,length,span] of [[knotAngle-.075,.41,.24],[knotAngle+.14,.30,.18]]){
      fabricPatch(g,cloth,12,18,false,(u,t,point,color)=>{
        const fold=Math.cos((u-.52)*Math.PI),edge=Math.max(0,1-2*Math.abs(u-.5));
        const a=angle+(u-.5)*span*lerp(.68,1.12,t)-.13*t;
        const hem=t**5*Math.abs(u-.5)**2*.16;
        const latitude=neckline-t*length*proportion+hem;
        fitSurface(body,point,a,latitude,.016+.023*fold+.014*Math.sin(Math.PI*t)+.014*t*t);
        const line=1-T.MathUtils.smoothstep(Math.abs(t-.85),.022,.072);
        color.copy(base).lerp(trim,line*(style==='stripe'?.82:.29)).lerp(seam,(1-edge)*.16+t**12*.16);
      });
    }
  }

  function glasses(g,body,style,face){
    const palette={round:0x604339,square:0x46576b,amber:0x9b6244};
    const finish=mat(palette[style],{roughness:.46,metalness:style==='amber'?.34:.16});
    const radius={round:.0105,square:.011,amber:.0078}[style];
    const profile={round:.79,square:.49,amber:.67}[style];
    const {axis,up,outlines}=face;
    const keyPoint=(u,v,depth=.022)=>{
      const x=axis.x*u+up.x*v,y=axis.y*u+up.y*v;
      return new T.Vector3(x,y,body.front(x,y)+depth);
    };
    const rx=(outlines[0].size.x+outlines[1].size.x)*.25+.012;
    const ry=Math.max(...outlines.map(o=>o.size.y))*.5+.019;
    const tube=(path,r,loop=false,steps=14)=>g.add(new T.Mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(path,loop),steps,r,6,loop),finish));
    const rim=(center,a)=>{
      const c=Math.cos(a),s=Math.sin(a);
      return keyPoint(center.x+rx*Math.sign(c)*Math.abs(c)**profile,center.y+ry*Math.sign(s)*Math.abs(s)**profile);
    };
    const centres=outlines.map(o=>o.center);
    for(const center of centres)tube(Array.from({length:32},(_,i)=>rim(center,i/32*turn)),radius,true,36);
    const a=centres[0],b=centres[1],lift=ry*.42;
    const innerLeft=keyPoint(a.x+rx*.95,a.y+lift),innerRight=keyPoint(b.x-rx*.95,b.y+lift);
    const bridge=keyPoint((a.x+b.x)*.5,(a.y+b.y)*.5+lift+.010,.025);
    tube([innerLeft,bridge,innerRight],radius*.84,false,10);
    for(const [i,sign] of [[0,-1],[1,1]]){
      const center=centres[i],start=keyPoint(center.x+sign*rx*.945,center.y+ry*.49);
      const startAngle=Math.atan2(start.x,start.z),startY=Math.atan2(start.y,Math.hypot(start.x,start.z));
      const side=[start];
      for(let j=1;j<=10;j++){
        const t=j/10,angle=lerp(startAngle,sign*1.71,t),rise=.085*Math.sin(Math.PI*t)-.145*t*t;
        side.push(fitSurface(body,new T.Vector3(),angle,startY+rise,.012-.023*t**3));
      }
      tube(side,radius*.63,false,18);
    }
  }

  const capProfiles={
    beanie:{edge:.58,clearance:.28,rise:.053,body:0xa15546,trim:0xd99074,seam:0x774237},
    beret:{edge:.68,clearance:.24,rise:.030,body:0x60705a,trim:0x839478,seam:0x455744},
    bucket:{edge:.63,clearance:.31,rise:.035,body:0xb78d61,trim:0xcb9b71,seam:0x846046}
  };
  function capEdge(face,style,angle){
    const profile=capProfiles[style];
    const lean=style==='beret'?.105*Math.sin(angle+.47):.036*Math.sin(angle-.38);
    return forehead(face,angle,profile.edge+lean,profile.clearance);
  }
  function hat(g,body,style,face){
    const spec=capProfiles[style],edge=a=>capEdge(face,style,a);
    const base=new T.Color(spec.body),trim=new T.Color(spec.trim),seam=new T.Color(spec.seam);
    fabricPatch(g,cloth,72,22,true,(u,t,point,color)=>{
      const a=u*turn,foot=T.MathUtils.smoothstep(t,0,.075),dome=Math.sin(Math.PI*t);
      const rib=style==='beanie'?.006*Math.cos(a*18)*(1-t*t):0;
      const puff=style==='beret'?.055*dome:.019*dome;
      const relief=-.007+foot*(.028+puff+rib);
      fitSurface(body,point,a,lerp(edge(a),halfPi-.0004,t),relief);
      point.y+=spec.rise*t*t;
      if(style==='beret')point.x+=.044*T.MathUtils.smoothstep(t,.12,1);
      const cuff=1-T.MathUtils.smoothstep(t,.16,.29);
      const join=(1-T.MathUtils.smoothstep(t,.018,.12));
      color.copy(base).lerp(trim,cuff*.37).lerp(seam,join*.61);
      if(style==='beanie')color.multiplyScalar(1+.068*Math.cos(a*18)*(.48+.52*cuff));
    });
    if(style==='bucket'){
      fabricPatch(g,cloth,72,10,true,(u,t,point,color)=>{
        const a=u*turn,flare=Math.sin(Math.PI*t)**.78;
        fitSurface(body,point,a,edge(a)+.020-.105*t,.004+.078*flare);
        point.y-=.021*flare;
        const hem=1-T.MathUtils.smoothstep(Math.abs(t-.51),.025,.165);
        color.copy(base).lerp(seam,t*.38+hem*.23).lerp(trim,(1-t)*.29);
      });
    }else{
      const top=fitSurface(body,new T.Vector3(),-.52,1.50,.023);
      top.y+=spec.rise+(style==='beanie'?.031:.007);
      if(style==='beanie'){
        softDetail(g,cloth,top,[.060,.058,.061],trim,-.18,.13);
      }else{
        top.x+=.039;
        softDetail(g,cloth,top,[.021,.024,.022],seam,0,.03);
      }
    }
  }

  function hair(g,body,style,face,cap){
    const base=new T.Color(style==='curl'?0x64473d:0x67473b);
    const shine=new T.Color(style==='curl'?0x936d53:0x9b7359),shadow=new T.Color(0x4d352d);
    const covered=cap!=='none';
    const low=a=>{
      const wave=style==='curl'?.066*Math.cos(a*8-.72):.085*Math.sin(a-.42)+.027*Math.sin(a*3+.32);
      const hairline=forehead(face,a,.43+wave,style==='side'?.14:.16);
      if(!covered)return hairline;
      return Math.max(forehead(face,a,.36,.128),Math.min(hairline,capEdge(face,cap,a)-.105));
    };
    fabricPatch(g,hairMaterial,76,24,true,(u,t,point,color)=>{
      const a=u*turn,edge=low(a),rim=covered?capEdge(face,cap,a):halfPi;
      const end=covered?Math.min(halfPi-.0004,rim+.085):halfPi-.0004;
      const latitude=lerp(edge,end,t);
      const phase=style==='side'?a*5+2.6*t:style==='curl'?a*9-3.9*t:a*9+.44*t;
      const fade=Math.sin(Math.PI*t)**.68;
      const ridge=Math.cos(phase),small=Math.cos(phase*2-.36);
      const curl=style==='curl'?(.51+.49*ridge)*.020*fade:0;
      const taper=T.MathUtils.smoothstep(t,0,.12);
      const underRim=covered?1-T.MathUtils.smoothstep(latitude,rim-.035,rim+.062):1;
      fitSurface(body,point,a,latitude,-.006+taper*underRim*(.029+(.006*ridge+.002*small)*fade+curl));
      const contact=(1-T.MathUtils.smoothstep(t,.01,.135))*.49;
      color.copy(base).lerp(shine,(.18+.13*ridge)*fade).lerp(shadow,contact);
    });
    if(style!=='bun')return;
    const azimuth=covered?-1.99:-.59,altitude=covered?.59:1.46;
    const tie=fitSurface(body,new T.Vector3(),azimuth,altitude,.034);
    const clasp=new T.Color(0xaa7b5f);
    if(!covered)tie.y+=.021;
    softDetail(g,hairMaterial,tie,[.079,.058,.073],clasp,azimuth,.033);
    const knot=tie.clone().addScaledVector(tie.clone().normalize(),covered?.044:.060);
    const radius=covered?.092:.105;
    softDetail(g,hairMaterial,knot,[radius,radius*.86,radius*.94],base,azimuth,.095);
  }

  const makers={scarf,glasses,hat,hair};
  function build(shape,body,outfit) {
    const group=new T.Group();
    for(const key of categories){
      const style=outfit[key];
      if(style==='none')continue;
      const cap=key==='hair'?outfit.hat:'none';
      const id=[shape,key,style,cap].join('/');
      if(!templates.has(id)){
        if(!profileCache.has(shape))profileCache.set(shape,faceProfile(body));
        const model=new T.Group();
        makers[key](model,body,style,profileCache.get(shape),cap);
        model.traverse(o=>{if(o.isMesh)o.castShadow=false;});
        batch(model);
        templates.set(id,model);
      }
      const item=templates.get(id).clone(true);
      item.name=key;group.add(item);
    }
    return group;
  }

  let preview;
  function previewResources() {
    const size=176,scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,10);
    const target=new T.WebGLRenderTarget(size,size,{samples:4});
    const pixels=new Uint8Array(size*size*4),container=new T.Group();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d'),output=ctx.createImageData(size,size);
    const sun=new T.DirectionalLight(0xffefd6,1.45);sun.position.set(-3,4,5);
    const rim=new T.DirectionalLight(0xbddeff,.6);rim.position.set(2,2,-4);
    scene.add(container,sun,rim,new T.HemisphereLight(0xf8ffee,0xa49a82,1.20));
    const gamma=Uint8Array.from({length:256},(_,i)=>{
      const linear=i/255;
      return Math.round(255*(linear<=.0031308?12.92*linear:1.055*linear**(1/2.4)-.055));
    });
    return {size,scene,camera,target,pixels,container,ctx,output,gamma};
  }

  function portrait(shape,tint,raw) {
    const outfit=normalize(raw),styles=Object.values(outfit),renderer=window.Cabin?.renderer;
    if(!renderer||styles.every(style=>style==='none'))return CabinBotArt.portrait(shape,tint);
    const key=[shape,tint,...styles].join('/');
    if(portraits.has(key))return portraits.get(key);
    preview??=previewResources();
    const {size,scene,camera,target,pixels,container,ctx,output,gamma}=preview;
    container.clear();
    const body=CabinBotArt.make(container,shape,tint);
    container.add(build(shape,body,outfit));
    const bounds=new T.Box3().setFromObject(container),center=bounds.getCenter(new T.Vector3());
    const extent=bounds.getSize(new T.Vector3()),half=Math.max(extent.y,extent.x)*.608;
    camera.left=camera.bottom=-half;camera.right=camera.top=half;
    camera.position.copy(center).add(new T.Vector3(.74,.36,3));camera.lookAt(center);camera.updateProjectionMatrix();

    const oldTarget=renderer.getRenderTarget(),oldColor=renderer.getClearColor(new T.Color()),oldAlpha=renderer.getClearAlpha();
    const shadowPending=renderer.shadowMap.needsUpdate;
    try{
      renderer.setRenderTarget(target);renderer.setClearColor(0,0);renderer.shadowMap.needsUpdate=false;
      renderer.render(scene,camera);
      renderer.readRenderTargetPixels(target,0,0,size,size,pixels);
    }finally{
      renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldColor,oldAlpha);renderer.shadowMap.needsUpdate=shadowPending;
      container.clear();
    }
    for(let row=0;row<size;row++)for(let col=0;col<size;col++){
      const src=((size-row-1)*size+col)*4,dst=(row*size+col)*4,alpha=pixels[src+3];
      output.data[dst+3]=alpha;
      if(!alpha)continue;
      for(let channel=0;channel<3;channel++){
        output.data[dst+channel]=gamma[Math.min(255,Math.round(pixels[src+channel]*255/alpha))];
      }
    }
    ctx.putImageData(output,0,0);
    const url=ctx.canvas.toDataURL();
    if(portraits.size>=48)portraits.delete(portraits.keys().next().value);
    portraits.set(key,url);
    return url;
  }
  return {options,normalize,build,portrait};
})();
