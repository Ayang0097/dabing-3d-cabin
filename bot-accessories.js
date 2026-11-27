window.CabinBotAccessories = (() => {
  const {T,mat,mesh,batch}=HouseKit;
  const diy=CabinBotDIY;
  const {options,categories,normalize} = CabinOutfit;
  const templates=new Map(),portraits=new Map(),turn=Math.PI*2;

  function mountOutfitControls(panel,prefix,initial){
    const fields=Object.entries(options).map(([key,{name,styles}])=>{
      const field=document.createElement('div'),label=document.createElement('label'),select=document.createElement('select');
      select.id=prefix+'-'+key;select.name='outfit-'+key;
      label.htmlFor=select.id;label.textContent=name;
      select.add(new Option(key==='eyes'?'默认':'无','none'));
      for(const [id,title] of Object.entries(styles))select.add(new Option(title,id));
      field.append(label,select);panel.append(field);
      return [key,select];
    });
    const set=raw=>{
      const outfit=normalize(raw);
      for(const [key,select] of fields)select.value=outfit[key];
    };
    set(initial);
    return {set,read:()=>Object.fromEntries(fields.map(([key,select])=>[key,select.value]))};
  }

  const cloth=mat(0xffffff,{roughness:.91,vertexColors:true,side:T.DoubleSide});
  const clamp=T.MathUtils.clamp, lerp=T.MathUtils.lerp;
  const profileCache=new Map();

  function faceProfile(body){
    const strokes=body.eyes.map(eye=>eye.geometry.attributes.position);
    const centres=strokes.map(points=>new T.Box3().setFromBufferAttribute(points).getCenter(new T.Vector3()));
    const slope=clamp(Math.atan2(centres[1].y-centres[0].y,centres[1].x-centres[0].x),-.30,.30);
    const axis=new T.Vector2(Math.cos(slope),Math.sin(slope)),up=new T.Vector2(-axis.y,axis.x);
    const outlines=strokes.map(points=>{
      const bound=new T.Box2();
      const uv=new T.Vector2();
      for(let i=0;i<points.count;i++){
        const x=points.getX(i),y=points.getY(i);
        bound.expandByPoint(uv.set(axis.x*x+axis.y*y,up.x*x+up.y*y));
      }
      return {center:bound.getCenter(new T.Vector2()),size:bound.getSize(new T.Vector2())};
    });
    return {axis,up,outlines};
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

  const glassesStyles={
    round:{color:0x604339,radius:.0105,profile:.79},
    square:{color:0x46576b,radius:.011,profile:.49},
    amber:{color:0x9b6244,radius:.0078,profile:.67,metalness:.34},
    blackSun:{color:0x25252a,radius:.014,profile:.47,width:.140,height:.094,spacing:.165,lens:[0x151822,0x46515e]},
    teaSun:{color:0xa76738,radius:.0125,profile:1,width:.116,height:.116,spacing:.150,lens:[0x33201c,0x86563c]}
  };
  const tintedGlass=new T.MeshPhysicalMaterial({
    color:0xffffff,vertexColors:true,roughness:.20,metalness:.24,clearcoat:1,clearcoatRoughness:.12,
    envMapIntensity:.45,side:T.DoubleSide
  });

  function tintedLens(g,pointAt,tones){
    const segments=40,bands=6;
    const positions=[],colors=[],indices=[];
    const dark=new T.Color(tones[0]),light=new T.Color(tones[1]),color=new T.Color();
    const addPoint=(angle,scale)=>{
      const depth=.008*(1-scale*scale);
      const point=pointAt(angle,scale,depth);
      positions.push(point.x,point.y,point.z);
      const across=Math.cos(angle)*scale,height=Math.sin(angle)*scale;
      const reflection=Math.exp(-((across+.38-height*.90)**2)*23);
      color.copy(dark).lerp(light,.14+.30*(height+1)*.5+.20*reflection);
      colors.push(color.r,color.g,color.b);
    };
    addPoint(0,0);
    for(let band=1;band<=bands;band++){
      const start=1+(band-1)*segments;
      for(let i=0;i<segments;i++){
        addPoint(i/segments*turn,band/bands);
        const a=start+i,b=start+(i+1)%segments;
        if(band===1)indices.push(0,a,b);
        else indices.push(a-segments,a,b,a-segments,b,b-segments);
      }
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const lens=new T.Mesh(geometry,tintedGlass);
    lens.name='tinted-lens';
    g.add(lens);
  }

  function frameLine(g,finish,points,radius,closed=false,steps=20,sides=8){
    const path=new T.CatmullRomCurve3(points,closed);
    g.add(new T.Mesh(new T.TubeGeometry(path,steps,radius,sides,closed),finish));
  }

  function sunglasses(g,body,face,spec){
    const {color,radius,profile,lens,width,height,spacing}=spec;
    const scale=clamp((body.bounds.max.x-body.bounds.min.x)/1.02,.79,1.06);
    const rx=width*scale,ry=height*scale,offset=spacing*scale;
    const y=face.outlines.reduce((sum,{center})=>sum+face.axis.y*center.x+face.up.y*center.y,0)*.5-.024;
    const finish=mat(color,{roughness:.31,metalness:.21});
    const pointOnFrame=(centre,angle,factor,z)=>{
      const c=Math.cos(angle),s=Math.sin(angle);
      return new T.Vector3(centre+rx*factor*Math.sign(c)*Math.abs(c)**profile,
        y+ry*factor*Math.sign(s)*Math.abs(s)**profile,z);
    };

    // A common front plane preserves both lens outlines. Fit its depth to the shell.
    let z=body.front(0,y+.036);
    for(const centre of [-offset,offset]){
      for(const factor of [0,.45,.75,1]){
        for(let i=0;i<24;i++){
          const point=pointOnFrame(centre,i/24*turn,factor,0);
          z=Math.max(z,body.front(point.x,point.y));
        }
      }
    }
    z+=.021;
    for(const side of [-1,1]){
      const centre=side*offset;
      const outline=(angle,factor=1,depth=0)=>pointOnFrame(centre,angle,factor,z+depth);
      const frame=Array.from({length:48},(_,i)=>outline(i/48*turn));
      frameLine(g,finish,frame,radius,true,52);
      tintedLens(g,outline,lens);

      const corner=outline(side>0?.22:Math.PI-.22);
      const elbow=new T.Vector3(corner.x+side*.022,corner.y,z-.047);
      const elevation=Math.atan2(corner.y,Math.hypot(corner.x,corner.z));
      const arm=[corner,elbow];
      for(const [angle,drop,clearance] of [[1.04,.015,.029],[1.42,.070,.017],[1.81,.129,.008]]){
        arm.push(fitSurface(body,new T.Vector3(),side*angle,elevation-drop,clearance));
      }
      frameLine(g,finish,arm,radius*.72,false,32);
    }

    const bridgeX=offset-rx*.965;
    frameLine(g,finish,[
      new T.Vector3(-bridgeX,y+.027*scale,z),
      new T.Vector3(0,y+.046*scale,z+.005),
      new T.Vector3(bridgeX,y+.027*scale,z)
    ],radius*.81,false,14);
  }

  function glasses(g,body,style,face){
    const spec=glassesStyles[style];
    if(spec.lens){
      sunglasses(g,body,face,spec);
      return;
    }
    const {color,radius,profile,metalness=.16}=spec;
    const finish=mat(color,{roughness:.46,metalness});
    const {axis,up,outlines}=face;
    const keyPoint=(u,v,depth=.022)=>{
      const x=axis.x*u+up.x*v,y=axis.y*u+up.y*v;
      return new T.Vector3(x,y,body.front(x,y)+depth);
    };
    const rx=(outlines[0].size.x+outlines[1].size.x)*.25+.012;
    const ry=Math.max(...outlines.map(o=>o.size.y))*.5+.019;
    const tube=(path,r,loop=false,steps=14)=>frameLine(g,finish,path,r,loop,steps,6);
    const centres=outlines.map(o=>o.center);
    for(const center of centres){
      const outline=(angle,scale=1,depth=.022)=>{
        const c=Math.cos(angle),s=Math.sin(angle);
        return keyPoint(center.x+rx*scale*Math.sign(c)*Math.abs(c)**profile,
          center.y+ry*scale*Math.sign(s)*Math.abs(s)**profile,depth);
      };
      tube(Array.from({length:32},(_,i)=>outline(i/32*turn)),radius,true,36);
    }
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

  const makers={
    scarf,glasses,
    hat(model,body,style){diy.headwear[style](model,body);},
    eyes:diy.expression,
    sign(model,body,style,face,name){
      diy.plaque(model,body,style==='name'?name||'Bot':style==='note'?'♫':'小屋');
    },
    back:diy.guitarCase,
    carry:diy.lantern,
    effect:diy.fireflies
  };
  function build(shape,body,outfit,name='') {
    const group=new T.Group();
    for(const key of categories){
      const style=outfit[key];
      if(style==='none'||(key==='eyes'&&style==='wink'))continue;
      let variant='';
      if(key==='sign'&&style==='name')variant=name;
      if(key==='carry')variant=body.shell.material.color.getHexString();
      const id=JSON.stringify([shape,key,style,variant]);
      if(!templates.has(id)){
        if(!profileCache.has(shape))profileCache.set(shape,faceProfile(body));
        const model=new T.Group();
        makers[key](model,body,style,profileCache.get(shape),name);
        model.traverse(o=>{if(o.isMesh)o.castShadow=false;});
        if(key!=='eyes'&&key!=='effect')batch(model);
        templates.set(id,model);
        if(templates.size>256)templates.delete(templates.keys().next().value);
      }
      const item=templates.get(id).clone(true);
      item.name=key;group.add(item);
    }
    return group;
  }

  const obscuresEyes=style=>Boolean(glassesStyles[style]?.lens);

  function poseEyes(eyes,expression,style,blink,wink=blink,covered=false){
    const standard=style!=='happy'&&style!=='curious';
    eyes.forEach((eye,index)=>{
      eye.visible=standard&&!covered;
      eye.morphTargetInfluences[0]=blink;
      if(style==='wink')eye.morphTargetInfluences[0]=index===0?wink:blink*(1-wink);
    });
    if(expression){
      expression.visible=!covered;
      expression.children.forEach(eye=>{eye.scale.y=1-.82*blink;});
    }
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

  function portrait(shape,tint,raw,name='',rear=false,renderer=window.Cabin?.renderer) {
    const outfit=normalize(raw),styles=Object.values(outfit);
    if(!renderer||styles.every(style=>style==='none'))return CabinBotArt.portrait(shape,tint);
    const key=JSON.stringify([shape,tint,styles,outfit.sign==='name'?name:'',rear]);
    if(portraits.has(key))return portraits.get(key);
    preview??=previewResources();
    const {size,scene,camera,target,pixels,container,ctx,output,gamma}=preview;
    container.clear();
    const body=CabinBotArt.make(container,shape,tint);
    const model=build(shape,body,outfit,name);
    container.add(model);
    poseEyes(body.eyes,model.getObjectByName('eyes'),outfit.eyes,0,1,obscuresEyes(outfit.glasses));
    const bounds=new T.Box3().setFromObject(container),center=bounds.getCenter(new T.Vector3());
    const extent=bounds.getSize(new T.Vector3()),half=Math.max(extent.y,extent.x)*.608;
    camera.left=camera.bottom=-half;camera.right=camera.top=half;
    camera.position.copy(center).add(new T.Vector3(.74,.36,rear?-3:3));camera.lookAt(center);camera.updateProjectionMatrix();

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
  return {options,normalize,build,portrait,poseEyes,obscuresEyes,mountOutfitControls};
})();
