/* Interior finishes. CC0 photographs and PBR maps from Poly Haven:
   https://polyhaven.com/a/wood_floor         — Dimitrios Savva
   https://polyhaven.com/a/wood_table_001     — Dimitrios Savva, Rico Cilliers
   https://polyhaven.com/a/plastered_wall_03
   https://polyhaven.com/a/rock_face_03
   https://polyhaven.com/a/brick_wall_08      — Amal Kumar
   https://polyhaven.com/a/rough_linen        — colormass, Rico Cilliers
   The kilim ornament was drawn for this room and combined with the scanned weave.
   Colour grading, brick occlusion, board cuts and UVs are specific to the installation. */
window.CabinSurfaces = (() => {
  const T=THREE, loader=new T.ImageLoader(), sources=new Map(), textures=new Map(), finishes=new Map();
  function texture(file, color=false, repeatX=1, repeatY=1, wrap=T.RepeatWrapping) {
    const key=[file,color,repeatX,repeatY,wrap].join(':');
    if(textures.has(key))return textures.get(key);
    let asset=sources.get(file);
    if(!asset){
      asset={source:new T.Source(),pending:[]};
      sources.set(file,asset);
      loader.load(window.CabinSurfaceImages?.[file]||'textures/'+file, bitmap=>{
        asset.source.data=bitmap;
        for(const variant of asset.pending)variant.needsUpdate=true;
        asset.pending=null;
      });
    }
    // UV transforms belong to each material, but identical pixels and sampler settings
    // can use the same GPU texture. Keep color and linear sampling distinct.
    const variant=new T.Texture();
    variant.source=asset.source;
    variant.wrapS=variant.wrapT=wrap;
    variant.repeat.set(repeatX,repeatY);
    variant.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;
    variant.anisotropy=8;
    if(asset.pending)asset.pending.push(variant);else variant.needsUpdate=true;
    textures.set(key,variant);
    return variant;
  }
  function finish(name,color=0xffffff) {
    const key=name+':'+color;
    if(finishes.has(key))return finishes.get(key);
    const normalStrength={floor:.46,timber:.60,limewash:.54,hearth:.82,linen:.60,brick:.93}[name];
    const m=new T.MeshStandardMaterial({
      color,map:texture(name+'-color.webp',true),roughness:1,
      normalMap:texture(name+'-normal.webp'),normalScale:new T.Vector2(normalStrength,normalStrength),
      roughnessMap:name==='linen'?null:texture(name+'-rough.webp')
    });
    m.name='cabin-'+key;m.userData.surface=name;
    finishes.set(key,m);return m;
  }
  const wood=(color=0xffffff)=>finish('timber',color);
  function furnitureWood(color=0xffffff){
    const key='furniture:'+color;
    if(!finishes.has(key)){
      const m=wood(color).clone();
      m.name='家具旧木';
      m.userData.furniture=true;
      m.vertexColors=true;
      m.normalScale.set(2.15,2.15);
      m.onBeforeCompile=shader=>{
        shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * .92 + .25, .56, .96);');
      };
      finishes.set(key,m);
    }
    return finishes.get(key);
  }
  function furnitureTone(point,normal,half,along,seed,tint){
    const distance=point[along]/Math.max(.001,half[along]);
    const eased=normal.filter(value=>Math.abs(value)>.16).length>1;
    // Eased edges expose lighter fibres; the cut ends of legs pick up dust near the floor.
    const heel=along===1?Math.max(0,-distance-.68)*.28:0;
    const value=.985+Math.sin(distance*2.9+seed*4.1)*.037+(eased?.115:0)-heel;
    return [value*tint.r,value*tint.g*(eased?.982:1),value*tint.b*(eased?.954:1)];
  }
  function grain(mesh) {
    if(!mesh?.isMesh||mesh.geometry.userData.cabinMapped)return mesh;
    const geo=mesh.geometry.clone(), pos=geo.attributes.position, norm=geo.attributes.normal;
    geo.computeBoundingBox();const size=geo.boundingBox.getSize(new T.Vector3()).multiply(mesh.scale);
    const axes=[0,1,2].sort((a,b)=>size.getComponent(b)-size.getComponent(a));
    const material=mesh.material.userData.surface;
    const furniture=mesh.material.userData.furniture,tint=mesh.material.color;
    const cell=material==='limewash'?2.75:material==='linen'?.33:material==='hearth'?.86:1.44;
    const salt=Math.sin(mesh.position.x*13.97+mesh.position.y*5.61+mesh.position.z*9.15)*362.37;
    const shift=salt-Math.floor(salt), uvs=new Float32Array(pos.count*2);
    const tones=furniture?new Float32Array(pos.count*3):null;
    const half=furniture?size.toArray().map(value=>value*.5):null;
    const grainCenter=mesh.userData.grainCenter??shift;
    const p=new T.Vector3(),n=new T.Vector3();
    for(let i=0;i<pos.count;i++){
      p.fromBufferAttribute(pos,i).multiply(mesh.scale);
      n.fromBufferAttribute(norm,i);
      let face=0;if(Math.abs(n.y)>Math.abs(n.x))face=1;if(Math.abs(n.z)>Math.abs(n.getComponent(face)))face=2;
      if(material==='brick'){
        // Keep the mortar courses level right across the windows and around the jambs.
        p.add(mesh.position);
        uvs[i*2]=(face===0?p.z:p.x+mesh.parent.position.x)/1.92;
        uvs[i*2+1]=(face===1?p.z:p.y)/1.92;
      }else{
        const along=axes.find(axis=>axis!==face), across=3-face-along;
        uvs[i*2]=p.getComponent(across)/(furniture?.74:cell)+grainCenter;
        uvs[i*2+1]=p.getComponent(along)/(furniture?1.27:cell)+shift*.76;
      }
      if(tones)tones.set(furnitureTone(p.toArray(),n.toArray(),half,axes[0],shift,tint),i*3);
    }
    geo.setAttribute('uv',new T.BufferAttribute(uvs,2));
    if(tones){
      // Bake the board's tint into its vertices so all the furniture can share one draw material.
      geo.setAttribute('color',new T.BufferAttribute(tones,3));
      mesh.material=furnitureWood();
    }
    geo.userData={...mesh.geometry.userData,cabinMapped:true};
    mesh.geometry=geo;return mesh;
  }
  // Each floorboard uses one strip from a nine-board scan, with independent end cuts.
  // Board edges are real, shallow chamfers, lit by the room rather than painted on.
  function floor(parent,w,d){
    const rand=HouseKit.seeded(7483), positions=[],uv=[],colors=[],indices=[];
    const rows=Math.round(w/.206), boardWidth=w/rows;
    for(let row=0;row<rows;row++){
      const left=-w/2+row*boardWidth+.0012,right=left+boardWidth-.0024;
      let end=-d/2,first=true;
      while(end<d/2-.001){
        const start=end;end=Math.min(d/2,start+(first?.55+rand()*1.95:1.42+rand()*1.52));first=false;
        if(end-start<.008)break;
        const front=end-.0008,back=start+.0008, margin=.0025, plank=Math.floor(rand()*9);
        const u=(plank+.035)/9,v=rand(), du=.928/9, dv=(front-back)/2.25;
        const tone=.93+rand()*.115, y=.006+rand()*.0013, id=positions.length/3;
        for(let ring=0;ring<2;ring++){
          const k=ring?margin:0, yLevel=ring?y:y-.0025;
          const coords=[[left+k,front-k],[right-k,front-k],[right-k,back+k],[left+k,back+k]];
          for(const [x,z] of coords) {
            positions.push(x,yLevel,z);
            uv.push(u+du*(x-left)/(right-left),v+dv*(front-z)/(front-back));
            const ambient=.76+.24*Math.min(1,Math.min(w/2-Math.abs(x),d/2-Math.abs(z))/.78);
            const shade=tone*ambient*(ring?1:.68);
            colors.push(shade,shade,shade);
          }
        }
        for(let j=0;j<4;j++){const k=(j+1)%4;indices.push(id+j,id+k,id+4+k,id+j,id+4+k,id+4+j);}
        indices.push(id+4,id+5,id+6,id+4,id+6,id+7);
      }
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
    const material=finish('floor',0xf2f5fb).clone();material.vertexColors=true;
    material.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.92, 0.31);');
    };
    const o=new T.Mesh(g,material);o.receiveShadow=true;o.name='榫接橡木地板';parent.add(o);return o;
  }
  function floorContacts(surfaces,footprints,width,depth){
    // One world-aligned occlusion map couples the feet to wood and cloth alike.
    const ao=HouseKit.canvas(512,416,(ctx,w,h)=>{
      ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
      for(const [x0,y0,x1,y1] of [[0,0,20,0],[w,0,w-20,0],[0,0,0,20],[0,h,0,h-20]]){
        const edge=ctx.createLinearGradient(x0,y0,x1,y1);
        edge.addColorStop(0,'rgba(0,0,0,.36)');edge.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=edge;ctx.fillRect(0,0,w,h);
      }
      ctx.translate(w/2,h/2);ctx.scale(w/width,h/depth);
      for(const {x,z,w:span,d,opacity} of footprints){
        ctx.save();ctx.translate(x,z);ctx.scale(span/2,d/2);
        const shade=ctx.createRadialGradient(0,0,0,0,0,1);
        shade.addColorStop(0,`rgba(0,0,0,${opacity})`);
        shade.addColorStop(.38,`rgba(0,0,0,${opacity*.64})`);
        shade.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=shade;ctx.fillRect(-1,-1,2,2);ctx.restore();
      }
    });
    ao.colorSpace=T.NoColorSpace;ao.channel=1;
    const pos=new T.Vector3();
    for(const mesh of surfaces){
      mesh.updateWorldMatrix(true,false);
      const vertices=mesh.geometry.attributes.position,uv=new Float32Array(vertices.count*2);
      for(let i=0;i<vertices.count;i++){
        pos.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
        uv[i*2]=.5+pos.x/width;uv[i*2+1]=.5-pos.z/depth;
      }
      mesh.geometry.setAttribute('uv1',new T.BufferAttribute(uv,2));
      mesh.material.aoMap=ao;mesh.material.aoMapIntensity=.88;
    }
  }
  const endFinishes=new Map();
  // Saw cuts expose growth rings. Side faces retain the longitudinal scan and
  // meet across a narrow bevel so worn board edges catch the room lights.
  function milledBoard(mesh){
    if(mesh.geometry.type!=='BoxGeometry'||mesh.geometry.userData.cabinMapped)return false;
    if(mesh.geometry.parameters.width!==1||mesh.geometry.parameters.height!==1||mesh.geometry.parameters.depth!==1)return false;
    const dims=mesh.scale.toArray(),axes=[0,1,2].sort((a,b)=>dims[b]-dims[a]);
    if(dims[axes[0]]<.31||dims[axes[1]]<.046||dims[axes[2]]<.019)return false;
    const furniture=mesh.material.userData.furniture,tint=mesh.material.color;
    const radius=Math.min(furniture?.0055:.004,dims[axes[2]]*(furniture?.092:.077));
    const seed=Math.sin(mesh.position.x*5.6+mesh.position.z*8.5+mesh.position.y*2.1);
    const grainCenter=mesh.userData.grainCenter??seed;
    const halves=dims.map(n=>n/2),side={v:[],n:[],u:[],c:[]},end={v:[],n:[],u:[],c:[]}, order=axes[0];
    function polygon(out,pts,n){
      const dominant=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs)));
      const len=axes.find(i=>i!==dominant),cross=3-len-dominant;
      for(let i=1;i<pts.length-1;i++)for(const p of [pts[0],pts[i],pts[i+1]]){
        out.v.push(...p.map((v,k)=>v/dims[k]));
        const norm=n.map((v,k)=>v*dims[k]),normLength=Math.hypot(...norm);out.n.push(...norm.map(v=>v/normLength));
        if(out===end)out.u.push(p[cross]/.55+.5+seed*.19,p[len]/.55+.45+seed*.13);
        else out.u.push(p[cross]/(furniture?.74:1.44)+grainCenter,p[len]/(furniture?1.27:1.44)+seed*.76);
        if(furniture)out.c.push(...furnitureTone(p,n,halves,order,seed,tint));
      }
    }
    // The winding is derived from the outward face normal for all six faces, twelve edges and eight corners.
    function outward(out,verts,normal){
      const p=verts.map(v=>new T.Vector3(...v)),cross=new T.Vector3().subVectors(p[1],p[0]).cross(new T.Vector3().subVectors(p[2],p[0]));
      polygon(out,cross.dot(new T.Vector3(...normal))<0?verts.reverse():verts,normal);
    }
    for(let a=0;a<3;a++)for(const sign of [-1,1]){
      const b=(a+1)%3,c=(a+2)%3,n=[0,0,0];n[a]=sign;
      const face=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([j,k])=>{const p=[0,0,0];p[a]=sign*halves[a];p[b]=j*(halves[b]-radius);p[c]=k*(halves[c]-radius);return p;});
      outward(a===order?end:side,face,n);
    }
    for(let a=0;a<3;a++)for(const j of [-1,1])for(const k of [-1,1]){
      const b=(a+1)%3,c=(a+2)%3,n=[0,0,0];n[b]=j;n[c]=k;
      const edge=[[-1,0],[1,0],[1,1],[-1,1]].map(([s,h])=>{const p=[0,0,0];p[a]=s*(halves[a]-radius);p[b]=j*(halves[b]-(h?0:radius));p[c]=k*(halves[c]-(h?radius:0));return p;});
      outward(side,edge,n);
    }
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
      const n=[x,y,z],corner=[0,1,2].map(i=>halves.map((d,k)=>n[k]*(d-(i===k?0:radius))));
      outward(side,corner,n);
    }
    function surfaceGeo(data){
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data.v,3));geo.setAttribute('normal',new T.Float32BufferAttribute(data.n,3));geo.setAttribute('uv',new T.Float32BufferAttribute(data.u,2));
      if(furniture)geo.setAttribute('color',new T.Float32BufferAttribute(data.c,3));
      geo.userData.cabinMapped=true;return geo;
    }
    mesh.geometry=surfaceGeo(side);
    const tone=furniture?0xffffff:tint.getHex(),key=[tone,!!furniture].join(':');
    if(furniture)mesh.material=furnitureWood();
    if(!endFinishes.has(key)){
      const material=new T.MeshStandardMaterial({color:tone,map:texture('wood-crosscut.webp',true),roughness:.78,vertexColors:!!furniture});
      material.bumpMap=texture('wood-crosscut.webp');material.bumpScale=furniture?.00115:.00075;
      endFinishes.set(key,material);
    }
    const caps=new T.Mesh(surfaceGeo(end),endFinishes.get(key));
    caps.receiveShadow=mesh.receiveShadow;caps.castShadow=mesh.castShadow;
    caps.position.copy(mesh.position);caps.quaternion.copy(mesh.quaternion);caps.scale.copy(mesh.scale);
    mesh.parent.add(caps);return true;
  }
  function dress(root){
    root.traverse(mesh=>{
      const finish=mesh.material?.userData?.surface;
      if(finish==='timber'&&milledBoard(mesh))return;
      if(['timber','limewash','linen','hearth','brick'].includes(finish))grain(mesh);
    });
  }
  function furnitureLeg(parent,foot,top,width,depth,material){
    const a=new T.Vector3(...foot),b=new T.Vector3(...top),line=b.clone().sub(a),mid=a.lerp(b,.5);
    const leg=HouseKit.box(parent,...mid.toArray(),width,line.length(),depth,material);
    leg.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),line.normalize());
    return leg;
  }

  const fabrics=new Map(),thread=new T.MeshStandardMaterial({vertexColors:true,roughness:.98});
  let weaveMap;
  function seatFabric(color){
    if(fabrics.has(color))return fabrics.get(color);
    if(!weaveMap)weaveMap=HouseKit.canvas(252,252,(ctx,w,h)=>{
      const rand=HouseKit.seeded(6134),pitch=7;
      ctx.fillStyle='#a9a39a';ctx.fillRect(0,0,w,h);
      for(let iy=0;iy<h/pitch;iy++)for(let ix=0;ix<w/pitch;ix++){
        const x=ix*pitch,y=iy*pitch,vertical=(ix+iy)%2===0;
        const slub=12*Math.sin(ix*.84+iy*.18)+8*Math.sin(iy*.92);
        const gray=Math.round(190+slub+(rand()-.5)*38);
        ctx.fillStyle=`rgb(${gray},${gray},${gray})`;
        ctx.fillRect(x+(vertical?0:1),y+(vertical?1:0),vertical?7:6,vertical?6:7);
        ctx.fillStyle='rgba(233,222,206,.24)';
        ctx.fillRect(x+2,y+1,vertical?1:4,vertical?5:1);
        ctx.fillStyle='rgba(51,43,35,.18)';
        ctx.fillRect(x+(vertical?6:1),y+(vertical?1:6),vertical?1:5,vertical?5:1);
      }
    },true);
    const fabric=new T.MeshStandardMaterial({color,map:weaveMap,vertexColors:true,roughness:.98,
      normalMap:texture('linen-normal.webp'),normalScale:new T.Vector2(1.16,1.16)});
    fabric.name='长椅粗纺布';
    fabrics.set(color,fabric);
    return fabric;
  }
  function seatCushion(parent,x,top,width,depth,material,seed,thickness=.026){
    const base=top-thickness,segments=28;
    const pos=[],uv=[],indices=[],colors=[],stitchPos=[],stitchNormals=[],stitchColors=[];
    const random=HouseKit.seeded(seed),phase=random()*Math.PI*2,shade=.93+random()*.13,offset=random()*3;
    const rings=[
      [0, .86, 1.04],[.43,1,1.04],[.77,.94,.99],[.91,.76,.92],[.969,.58,.82],
      [.994,.49,1.10],[1,.37,.91],[.97,.12,.77],[.89,0,.71],[0,0,.69]
    ];
    function point(a,radius,level){
      const c=Math.cos(a),s=Math.sin(a);
      const gathering=(.0013*Math.cos(a*9+phase)+.0008*Math.sin(a*17-phase))*radius**3;
      return [x+Math.sign(c)*Math.abs(c)**.39*radius*width/2,
        base+level*thickness+gathering,Math.sign(s)*Math.abs(s)**.39*radius*depth/2];
    }
    for(let ring=0;ring<rings.length;ring++){
      const [radius,level,brightness]=rings[ring];
      for(let j=0;j<segments;j++){
        const a=j/segments*Math.PI*2,p=point(a,radius,level);
        pos.push(...p);
        uv.push((p[0]-x)/.142+offset,p[2]/.142+level*.075+offset*.79);
        const value=brightness*shade*(1+.045*Math.cos(a*5+phase)*radius);
        colors.push(value,value,value);
        if(ring<rings.length-1){
          const i=ring*segments+j,next=ring*segments+(j+1)%segments;
          if(radius>0)indices.push(i,next,next+segments);
          if(rings[ring+1][0]>0)indices.push(i,next+segments,i+segments);
        }
      }
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    HouseKit.mesh(parent,geometry,material,0,0,0);

    const tint=material.color.clone().lerp(new T.Color(0xccb190),.28);
    for(let i=0;i<56;i++){
      const a=i*Math.PI/28,b=a+.047,inner=.907,outer=.915;
      for(const [angle,radius] of [[a,inner],[b,inner],[b,outer],[a,inner],[b,outer],[a,outer]]){
        const p=point(angle,radius,.76);
        p[1]+=.0009;
        stitchPos.push(...p);stitchNormals.push(0,1,0);stitchColors.push(tint.r,tint.g,tint.b);
      }
    }
    const stitches=new T.BufferGeometry();
    stitches.setAttribute('position',new T.Float32BufferAttribute(stitchPos,3));
    stitches.setAttribute('normal',new T.Float32BufferAttribute(stitchNormals,3));
    stitches.setAttribute('color',new T.Float32BufferAttribute(stitchColors,3));
    HouseKit.mesh(parent,stitches,thread,0,0,0).castShadow=false;
  }

  let wearMaterial;
  function tabletopWear(parent,y,marks){
    if(!wearMaterial){
      const map=HouseKit.canvas(512,128,(ctx,w,h)=>{
        const rand=HouseKit.seeded(5681);
        // Cup rings are broken at the dry parts of the rim, with occasional pooled droplets.
        for(const tile of [0,2]){
          const x=tile*128+64;
          for(let i=0;i<24;i++){
            const a=i/24*Math.PI*2;
            if(rand()<.22)continue;
            ctx.beginPath();
            ctx.ellipse(x+rand()*1.8,64+rand()*1.5,43+(rand()-.5)*4,44+(rand()-.5)*4,0,a,a+.11+rand()*.26);
            ctx.lineWidth=1.6+rand()*4.3;
            ctx.strokeStyle=tile===0?`rgba(53,32,19,${.21+rand()*.32})`:`rgba(166,134,89,${.15+rand()*.27})`;
            ctx.stroke();
          }
          for(let i=0;i<74;i++){
            const a=rand()*Math.PI*2,r=38+rand()*12;
            ctx.fillStyle=`rgba(73,47,27,${rand()*.24})`;
            ctx.fillRect(x+Math.cos(a)*r,64+Math.sin(a)*r,1+rand()*1.7,1+rand()*1.5);
          }
        }
        for(const tile of [1,3]){
          const x=tile*128+14;
          for(let i=0;i<23;i++){
            const start=x+rand()*75,length=5+rand()*38,y=29+rand()*70;
            ctx.beginPath();ctx.moveTo(start,y);ctx.lineTo(Math.min(x+104,start+length),y+(rand()-.5)*6);
            ctx.lineWidth=.7+rand()*1.2;
            ctx.strokeStyle=i%3?`rgba(198,163,119,${.10+rand()*.28})`:`rgba(66,46,27,${.08+rand()*.24})`;
            ctx.stroke();
          }
        }
      });
      wearMaterial=new T.MeshStandardMaterial({map,transparent:true,alphaTest:.025,depthWrite:false,roughness:.91,
        polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
      wearMaterial.name='桌面杯印与细磨痕';
    }
    const positions=[],uv=[],indices=[];
    for(const [x,z,width,depth,tile,turn] of marks){
      const c=Math.cos(turn),s=Math.sin(turn),index=positions.length/3;
      for(const [u,v] of [[0,0],[0,1],[1,1],[1,0]]){
        const dx=(u-.5)*width,dz=(v-.5)*depth;
        positions.push(x+dx*c-dz*s,y,z+dx*s+dz*c);
        uv.push((tile*128+2+124*u)/512,.018+.964*v);
      }
      indices.push(index,index+1,index+2,index,index+2,index+3);
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geo.setIndex(indices);geo.computeVertexNormals();
    HouseKit.mesh(parent,geo,wearMaterial,0,0,0).castShadow=false;
  }
  return {wood,furnitureWood,furnitureLeg,seatFabric,seatCushion,tabletopWear,finish,texture,grain,dress,floor,floorContacts};
})();
