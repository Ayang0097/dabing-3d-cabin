/* Original stage and counter geometry, with local painted graphics over scanned materials. */
(() => {
  'use strict';

  window.makeCabinArt = function makeCabinArt(scene) {
    const T = window.THREE;
    const room = new T.Group();
    room.name = '民谣现场与酒吧';
    scene.add(room);

    let seed = 1457724;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const between = (a, b) => a + (b - a) * rand();
    const choose = (list) => list[Math.floor(rand() * list.length)];
    const serif = '"Kaiti SC","STKaiti","KaiTi","Songti SC","Noto Serif CJK SC",serif';
    const sans = '"Avenir Next","PingFang SC","Microsoft YaHei",sans-serif';
    const textures = [];

    function paint(w, h, draw) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      draw(ctx, w, h);
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      texture.anisotropy = 4;
      textures.push(texture);
      return texture;
    }
    function rect(ctx, x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    }
    function poly(ctx, points, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.fill();
    }
    function type(ctx, str, x, y, font, fill, align = 'left') {
      ctx.font = font;
      ctx.fillStyle = fill;
      ctx.textAlign = align;
      ctx.fillText(str, x, y);
    }
    function dust(ctx, w, h, count, opacity = 0.12) {
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = rand() < .55 ? 'rgba(32,25,20,' + rand() * opacity + ')' : 'rgba(255,246,214,' + rand() * opacity + ')';
        ctx.fillRect(rand() * w, rand() * h, between(.45, 3), between(.45, 2));
      }
    }
    function oval(ctx, x, y, rx, ry, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    function woven(c,w,h) {
      for (let y=0;y<h;y+=3) rect(c,0,y,w,1,'rgba(7,15,14,.12)');
      for (let x=1;x<w;x+=4) rect(c,x,0,1,h,'rgba(255,237,194,.065)');
      dust(c,w,h,25000,.26);
    }
    function floorRug(c,w,h) {
      rect(c,0,0,w,h,'#914b3a');
      const colors=['#d7b37c','#4a6662','#e1b77d','#3b3f41'];
      for(let k=0;k<5;k++){
        const m=5+k*7;
        c.lineWidth=k%2?3:5; c.strokeStyle=colors[k%4]; c.strokeRect(m,m,w-2*m,h-2*m);
      }
      for(let row=0;row<3;row++){
        for(let col=0;col<6;col++){
          const x=61+col*71,y=63+row*43;
          poly(c,[[x-20,y],[x,y-15],[x+20,y],[x,y+15]],'#d2a56b');
          poly(c,[[x-12,y],[x,y-9],[x+12,y],[x,y+9]],'#315658');
          rect(c,x-2,y-2,4,4,'#e2c090');
        }
      }
      woven(c,w,h);
    }
    function speakerCloth(c,w,h) {
      rect(c,0,0,w,h,'#30302b');
      for(let x=1;x<w;x+=4) rect(c,x,0,1,h,'#756c53');
      for(let y=1;y<h;y+=4) rect(c,0,y,w,1,'#49483f');
      for(let x=2;x<w;x+=8) rect(c,x,0,1,h,'rgba(198,161,109,.23)');
      type(c,'木 音',w-20,h-19,'italic bold 27px '+serif,'#d5b77e','right');
    }
    const wood=CabinSurfaces.wood(0xe3cdb2);
    const painted=wood.clone();painted.color.set(0xffffff);
    painted.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
        #ifdef USE_MAP
        vec4 woodSample=texture2D(map,vMapUv);
        float grainValue=clamp(dot(woodSample.rgb,vec3(.21,.68,.11))*2.35+.49,.53,1.10);
        diffuseColor.rgb*=grainValue;
        #endif
      `);
    };
    const plain=new T.MeshStandardMaterial({color:0xffffff,roughness:.84});
    const glass=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.20,metalness:0,clearcoat:.56,clearcoatRoughness:.18,envMapIntensity:.82});
    const amberShell=new T.MeshPhysicalMaterial({color:0xfcffeb,roughness:.115,metalness:0,clearcoat:1,clearcoatRoughness:.09,
      transparent:true,opacity:.39,depthWrite:false,envMapIntensity:1.0});
    amberShell.onBeforeCompile=shader=>{
      // A face-on pane transmits almost all light; its grazing edges catch the bar.
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        float rimF=pow(1.0-abs(dot(normal,normalize(vViewPosition))), 2.3);
        diffuseColor.a *= 0.14+1.48*rimF;
        #include <opaque_fragment>
      `);
    };
    const enamel=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.38,clearcoat:.63,clearcoatRoughness:.25});
    const pottery=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.46,clearcoat:.50,clearcoatRoughness:.22});
    const metal=new T.MeshStandardMaterial({color:0xffffff,roughness:.39,metalness:.73,envMapIntensity:.89});
    const cloth=CabinPropMaterials.undyedLinen(1.7,1.1);
    const lamp=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});
    lamp.userData.probeRadiance=15;
    glass.userData.cabinReflection=.83;
    amberShell.userData.cabinReflection=1.04;
    pottery.userData.cabinReflection=.58;
    const pattern=(tex,emissive=0.07)=>new T.MeshStandardMaterial({map:tex,roughness:1,emissive:0xffffff,emissiveMap:tex,emissiveIntensity:emissive,side:T.DoubleSide});
    const boxGeo=new T.BoxGeometry(1,1,1);
    const planeGeo=new T.PlaneGeometry(1,1);
    const cylinderGeo=new T.CylinderGeometry(1,1,1,14);
    const thinGeo=new T.CylinderGeometry(1,1,1,7);
    const sphereGeo=new T.SphereGeometry(1,12,9);
    const blendTex=paint(128,128,(ctx,w,h)=>{
      const g=ctx.createRadialGradient(64,64,0,64,64,64);
      g.addColorStop(0,'rgba(255,201,126,.6)');g.addColorStop(.22,'rgba(255,177,80,.22)');
      g.addColorStop(.55,'rgba(255,153,56,.055)');g.addColorStop(1,'rgba(255,153,56,0)');rect(ctx,0,0,w,h,g);
    });
    const haloMat=new T.MeshBasicMaterial({map:blendTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
    const batches=new Map();
    const stock=new T.Object3D();
    const idQuat=new T.Quaternion();
    const up=new T.Vector3(0,1,0);
    function set(g,m,x,y,z,sx,sy,sz,tint=0xffffff,rotation,quaternion) {
      stock.position.set(x,y,z);stock.scale.set(sx,sy,sz);
      if(quaternion) stock.quaternion.copy(quaternion);
      else if(rotation) stock.rotation.set(rotation[0],rotation[1],rotation[2]);
      else stock.quaternion.copy(idQuat);
      stock.updateMatrix();
      const key=g.uuid+'/'+m.uuid;
      let b=batches.get(key);
      if(!b){b={geometry:g,material:m,matrix:[],color:[]};batches.set(key,b);}
      b.matrix.push(stock.matrix.clone());b.color.push(new T.Color(tint));
    }
    const timberPieces=new Map();
    function softenedBoard(width,height,depth,radius){
      const geo=new T.BoxGeometry(1,1,1,5,5,5),pos=geo.attributes.position,norm=geo.attributes.normal;
      const dims=[width,height,depth], xyz=new T.Vector3(), core=new T.Vector3(),delta=new T.Vector3();
      for(let i=0;i<pos.count;i++){
        xyz.fromBufferAttribute(pos,i);
        for(let axis=0;axis<3;axis++){
          const half=dims[axis]/2,k=Math.round((xyz.getComponent(axis)+.5)*5);
          const edge=[-half,-half+radius*.43,-half+radius,half-radius,half-radius*.43,half][k];
          xyz.setComponent(axis,edge);
          core.setComponent(axis,T.MathUtils.clamp(edge,-half+radius,half-radius));
        }
        delta.subVectors(xyz,core).normalize();xyz.copy(core).addScaledVector(delta,radius);
        pos.setXYZ(i,xyz.x/width,xyz.y/height,xyz.z/depth);
        delta.multiply(new T.Vector3(width,height,depth)).normalize();norm.setXYZ(i,delta.x,delta.y,delta.z);
      }
      return geo;
    }
    function timberBox(x,y,z,w,h,d,c,m,r) {
      // Each rail and board has its own metre-scaled grain. Merge afterwards, preserving
      // the UVs, so the millimetres of grain under a bar top and on a stile stay comparable.
      const minDepth=m.userData.furniture ? .12 : .29;
      const edge=(d>minDepth&&w>1.1&&h<.20)?Math.min(.009,h*.10):0;
      const shape=edge?softenedBoard(w,h,d,edge):boxGeo;
      const source=shape.clone();source.userData={};
      const piece=new T.Mesh(source,m);
      piece.scale.set(w,h,d);piece.position.set(x,y,z);if(r)piece.rotation.set(...r);
      const shade=new T.Color(c);
      if(m===wood)shade.lerp(new T.Color(0xfff8e9),.48);
      piece.updateMatrix();CabinSurfaces.grain(piece);
      const g=piece.geometry;g.applyMatrix4(piece.matrix);
      const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,tone=g.attributes.color;
      const set=timberPieces.get(m)||{xyz:[],normal:[],uv:[],tint:[]};
      const index=g.index;
      for(let k=0;k<(index?index.count:p.count);k++){
        const i=index?index.getX(k):k;
        set.xyz.push(p.getX(i),p.getY(i),p.getZ(i));set.normal.push(n.getX(i),n.getY(i),n.getZ(i));
        set.uv.push(uv.getX(i),uv.getY(i));
        set.tint.push(shade.r*(tone?.getX(i)??1),shade.g*(tone?.getY(i)??1),shade.b*(tone?.getZ(i)??1));
      }
      g.dispose();if(source!==g)source.dispose();if(edge)shape.dispose();timberPieces.set(m,set);
    }
    function box(x,y,z,w,h,d,c,m=plain,r){
      if(m===wood||m===painted||m.userData.furniture){timberBox(x,y,z,w,h,d,c,m,r);return;}
      set(boxGeo,m,x,y,z,w,h,d,c,r);
    }
    const cyl=(x,y,z,rad,h,c,m=plain,r)=>set(cylinderGeo,m,x,y,z,rad,h,rad,c,r);
    const ball=(x,y,z,rx,ry,rz,c,m=plain)=>set(sphereGeo,m,x,y,z,rx,ry,rz,c);
    const plane=(x,y,z,w,h,m,r)=>set(planeGeo,m,x,y,z,w,h,1,0xffffff,r);
    function rod(a,b,r,color,mat=metal) {
      const va=new T.Vector3(...a), vb=new T.Vector3(...b), d=vb.sub(va), len=d.length();
      if(!len) return;
      const q=new T.Quaternion().setFromUnitVectors(up,d.clone().normalize());
      const p=va.addScaledVector(d,.5);
      set(thinGeo,mat,p.x,p.y,p.z,r,len,r,color,null,q);
    }
    function rope(points,diameter,color){
      const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
      const sampled=curve.getPoints(Math.max(12,points.length*4));
      for(let i=1;i<sampled.length;i++) rod(sampled[i-1].toArray(),sampled[i].toArray(),diameter,color,plain);
    }
    function flush(){
      for(const [source,set] of timberPieces){
        const geo=new T.BufferGeometry(),mat=source.userData.furniture?CabinSurfaces.furnitureWood():source.clone();
        mat.vertexColors=true;
        if(source===painted){mat.onBeforeCompile=source.onBeforeCompile;mat.customProgramCacheKey=()=>'bar-painted-timber';}
        geo.setAttribute('position',new T.Float32BufferAttribute(set.xyz,3));
        geo.setAttribute('normal',new T.Float32BufferAttribute(set.normal,3));
        geo.setAttribute('uv',new T.Float32BufferAttribute(set.uv,2));
        geo.setAttribute('color',new T.Float32BufferAttribute(set.tint,3));
        const mesh=new T.Mesh(geo,mat);mesh.receiveShadow=mesh.castShadow=true;room.add(mesh);
      }
      timberPieces.clear();
      for(const b of batches.values()){
        const mesh=new T.InstancedMesh(b.geometry,b.material,b.matrix.length);
        b.matrix.forEach((v,i)=>{mesh.setMatrixAt(i,v);mesh.setColorAt(i,b.color[i]);});
        mesh.instanceMatrix.needsUpdate=true;
        mesh.instanceColor.needsUpdate=true;
        mesh.receiveShadow=b.material.isMeshStandardMaterial===true;
        mesh.castShadow=b.material===wood||b.material===metal||b.material===enamel||b.material===pottery||b.material===glass;
        if(b.material===haloMat) mesh.renderOrder=2;
        room.add(mesh);
      }
      batches.clear();
    }
    const woodColors=['#805135','#96613d','#a67248','#875738','#ab7850','#754d37'];
    const black='#252b2a', brass='#b58b52', oldBrass='#856746', pine='#a77045';
    const frontRot=[Math.PI/2,0,0];
    const backZ=-5.6;

    // The raised stage has individual staggered boards, a woven kilim and a low threshold.
    box(-3.25,.113,-3.85,5.20,.22,3.00,'#53372b',wood);
    for(let i=0;i<13;i++) {
      const run=5.16, z=-5.34+.117+i*.23, cut=between(1.4,3.7), left=-5.83;
      box(left+cut/2,.253,z,cut-.012,.054,.223,choose(woodColors),wood);
      box(left+cut+(run-cut)/2,.253,z,run-cut-.012,.054,.223,choose(woodColors),wood);
    }
    box(-3.25,.18,-2.345,5.22,.151,.057,'#8f6242',wood);
    box(-3.25,.266,-2.329,5.23,.031,.078,'#bd9463',wood);
    box(-3.25,.048,-2.324,5.18,.033,.039,'#4a3228',wood);
    for(let x=-5.67;x<-.64;x+=.36) cyl(x,.181,-2.311,.01,.006,oldBrass,metal,frontRot);
    const carpet=CabinPropMaterials.linen(pattern(paint(480,216,floorRug),.012),9,5.5,.39);
    plane(-3.39,.284,-3.90,2.64,1.54,carpet,[-Math.PI/2,0,0]);
    for(let i=0;i<38;i++){
      const z=-4.65+i*.04;
      box(-4.736,.286,z,.089,.004,.014,'#c7ae8c',plain,[0,between(-.2,.2),0]);
      box(-2.046,.286,z,.074,.004,.014,'#b39a78',plain,[0,between(-.2,.2),0]);
    }

    // Three framed prints share the photographs already used by the story cards.
    const gallery=HouseKit.group(room);
    gallery.name='舞台照片墙';
    const wallZ=backZ+.048, frameY=2.165, frameHeight=1.078;
    const frames=[{city:'西安',x:-4.98,width:1.01},{city:'重庆',x:-3.4,width:1.67},{city:'厦门',x:-1.82,width:1.01}];
    const printHeight=512, spacing=8, margin=21, footer=41;
    let atlasWidth=spacing;
    const prints=frames.map(frame=>{
      const pixels=Math.round(frame.width*480), offset=atlasWidth;
      atlasWidth+=pixels+spacing;
      return {...frame,pixels,offset};
    });
    const printMap=paint(atlasWidth,printHeight,(ctx,w,h)=>{
      rect(ctx,0,0,w,h,'#ddcfb2');
      for(const {city,pixels,offset} of prints)type(ctx,city,offset+pixels/2,h-14,'19px '+sans,'#5d5244','center');
    });
    const ctx=printMap.image.getContext('2d');
    const printFinish=new T.MeshStandardMaterial({map:printMap,roughness:.94});
    printFinish.name='舞台照片相纸';
    const frameFinish=CabinSurfaces.wood(0x725643), loader=new T.ImageLoader();
    const stagePhotos=[];
    for(const {city,x,width,pixels,offset} of prints){
      const frame=HouseKit.rounded(gallery,x,frameY,wallZ+.03,width,frameHeight,.061,.02,frameFinish);
      CabinSurfaces.grain(frame);
      const paper=new T.PlaneGeometry(width-.073,frameHeight-.078), uv=paper.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setX(i,(offset+uv.getX(i)*pixels)/atlasWidth);
      const print=HouseKit.mesh(gallery,paper,printFinish,x,frameY,wallZ+.063);
      print.castShadow=false;
      stagePhotos.push({city,center:[x,frameY,wallZ+.03],size:[width,frameHeight,.090],parent:gallery});

      const {file}=CabinExhibitMedia[city];
      loader.load(window.CabinExhibitImages?.[file]||'exhibit-images/'+file,image=>{
        const photoWidth=pixels-2*margin, photoHeight=printHeight-margin-footer;
        const scale=Math.max(photoWidth/image.naturalWidth,photoHeight/image.naturalHeight);
        const cropWidth=photoWidth/scale, cropHeight=photoHeight/scale;
        const left=offset+margin;
        ctx.drawImage(image,(image.naturalWidth-cropWidth)/2,(image.naturalHeight-cropHeight)/2,
          cropWidth,cropHeight,left,margin,photoWidth,photoHeight);
        ctx.strokeStyle='#82765c';
        ctx.strokeRect(left,margin,photoWidth,photoHeight);
        printMap.needsUpdate=true;
      });
    }
    HouseKit.batch(gallery);
    const galleryTitle=paint(1024,156,(ctx,w,h)=>{
      ctx.textBaseline='middle';
      const font='bold 124px '+serif;
      type(ctx,'大冰的小屋',w/2+1,h*.56+3,font,'#31221ea3','center');
      type(ctx,'大冰的小屋',w/2,h*.56,font,'#4d3727','center');
    });
    plane(-3.4,2.955,wallZ+.014,2.04,.31,
      new T.MeshStandardMaterial({map:galleryTitle,transparent:true,depthWrite:false,roughness:.91}));
    const ampCloth=pattern(paint(264,172,speakerCloth),.045);
    function amp(x,y,z){
      const w=.58,h=.40,d=.32;
      box(x,y+h/2,z,w,h,d,'#282b29',plain);
      box(x,y+h*.46,z+d/2+.005,w*.91,h*.76,.012,'#61472e',wood);
      plane(x,y+h*.46,z+d/2+.015,w*.85,h*.69,ampCloth);
      box(x,y+h*.909,z+d/2+.008,w*.89,h*.102,.015,oldBrass,metal);
      for(let i=0;i<6;i++) cyl(x-w*.33+i*w*.079,y+h*.91,z+d/2+.027,.014,.021,black,metal,frontRot);
      [x-w*.475,x+w*.475].forEach(xx=>[y+h*.055,y+h*.948].forEach(yy=>box(xx,yy,z+d*.44,w*.09,h*.102,d*.17,'#655f51',metal)));
      [x-w*.18,x+w*.18].forEach(xx=>box(xx,y+h+.02,z,.035,.064,.045,'#574539',metal));
      rod([x-w*.18,y+h+.047,z],[x+w*.18,y+h+.047,z],.02,'#3d3630',plain);
    }
    amp(-5.26,.281,-3.15);
    amp(-1.14,.281,-3.00);
    CabinCraft.instruments(room);
    // The short boom reaches the singer while the tripod stays out of the center of the stage.
    const vocalSpot=[-3.33,.286,-3.43];
    const [vx,stageY,vz]=vocalSpot,mx=vx-.44,mz=vz+.31;
    const micY=stageY+.145,micZ=vz+.225,tail=[vx-.116,micY+.023,micZ+.027];
    for(let k=0;k<3;k++){
      const a=.31+k*Math.PI*2/3;
      rod([mx,stageY+.082,mz],[mx+Math.cos(a)*.26,stageY+.010,mz+Math.sin(a)*.26],.011,'#454641');
    }
    rod([mx,stageY+.028,mz],[mx,stageY+.202,mz],.014,'#4e514c');
    cyl(mx,stageY+.177,mz,.024,.052,'#252927',metal);
    rod([mx-.115,stageY+.210,mz+.032],tail,.010,'#6d6b5d');
    rod(tail,[vx-.002,micY+.002,micZ],.015,'#343736');
    ball(vx+.013,micY,micZ,.032,.026,.028,'#a8aa9d',metal);
    rope([tail,[mx+.081,stageY+.161,mz+.044],[mx-.022,stageY+.088,mz+.029],
      [mx+.032,stageY+.009,mz+.07],[vx+.36,stageY+.007,mz+.15],[-1.65,.292,-3.04],[-1.13,.293,-3.23]],.007,'#36322b');
    // A cajón with a visibly pinned, worn birch front.
    box(-.99,.535,-4.88,.34,.51,.34,'#854d36',wood);
    box(-.99,.535,-4.701,.321,.488,.014,'#cd9b67',wood);
    [-1.13,-.85].forEach(x=>[.335,.483,.697].forEach(y=>cyl(x,y,-4.688,.006,.005,black,metal,frontRot)));

    // Small incandescent festoon, visible across the room with a gentle amber bloom.
    const wirePts=[];
    const catenary=k=>[-6.30+6.55*k,3.58-.52*Math.sin(k*Math.PI),-4.88+.09*Math.sin(k*Math.PI)];
    for(let i=0;i<=48;i++)wirePts.push(catenary(i/48));
    for(let i=1;i<wirePts.length;i++)rod(wirePts[i-1],wirePts[i],.009,'#35362c',plain);
    for(let i=0;i<14;i++){
      const [x,y,z]=catenary((i+.45)/14);
      const drop=.049+(i%3)*.019;
      rod([x,y,z],[x,y-drop,z],.009,'#36382e',plain);
      cyl(x,y-drop-.015,z,.018,.03,'#5c4d37',metal);
      ball(x,y-drop-.060,z,.034,.052,.034,i%4?'#ffdba0':'#ffeec4',lamp);
      plane(x,y-drop-.058,z+.015,.28,.28,haloMat);
    }
    // A warm spot below the beam gives the band one visible key light.
    const stageLight=[-3.18,3.56,-2.08],stageAim=[-3.29,.83,-3.79];
    const aim=new T.Vector3(...stageAim).sub(new T.Vector3(...stageLight)).normalize();
    const aimRotation=new T.Quaternion().setFromUnitVectors(up,aim);
    const lampBack=new T.Vector3(...stageLight).addScaledVector(aim,-.111);
    rod([lampBack.x,3.76,-2.24],lampBack.toArray(),.018,'#474035',plain);
    set(cylinderGeo,plain,...lampBack.toArray(),.067,.185,.067,'#302c26',null,aimRotation);
    set(cylinderGeo,lamp,...stageLight,.049,.012,.049,'#ffdeae',null,aimRotation);
    // Jinan's Kuanhouli shelf: open timber bays against a whitewashed brick wall.
    seed=3695404180;
    const brickWidth=4.19, brickHeight=3.38;
    const brickMap=(channel,color=false)=>CabinSurfaces.texture('brick-'+channel+'.webp',color,brickWidth/1.92,brickHeight/1.92);
    const whiteBrick=new T.MeshStandardMaterial({
      color:0xf8eee0,map:brickMap('color',true),normalMap:brickMap('normal'),
      normalScale:new T.Vector2(.74,.74),roughnessMap:brickMap('rough'),roughness:1
    });
    whiteBrick.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
        #ifdef USE_MAP
        vec3 brick=texture2D(map,vMapUv).rgb;
        float wear=dot(brick,vec3(.2126,.7152,.0722));
        diffuseColor.rgb*=clamp(.31+1.42*wear,.33,.89);
        #endif
      `);
    };
    plane(3.655,1.81,-5.578,brickWidth,brickHeight,whiteBrick);
    box(3.655,3.494,-5.532,brickWidth+.06,.105,.084,'#4a3e32',wood);
    [1.62,5.71].forEach(x=>box(x,1.81,-5.502,.054,3.38,.104,'#4a3931',wood));

    const uprights=[1.65,2.67,4.015,5.64];
    const shelves=[.22,.61,1.01,1.40,1.80,2.23,2.64];
    const boardTop=.026;
    uprights.forEach(x=>{
      box(x,1.382,-5.26,.082,2.724,.112,'#392b24',painted);
      box(x,.073,-5.26,.097,.070,.138,'#35302b');
    });
    shelves.forEach((y,i)=>{
      const depth=i<3?.404:.366;
      box(3.645,y,-5.318,4.064,.052,depth,i===6?'#5d4333':'#584437',wood);
      box(3.645,y-.021,-5.318+depth/2,4.072,.027,.023,'#4d382e',painted);
      for(const x of uprights){
        box(x,y-.042,-5.19,.095,.045,.151,'#35302c');
        cyl(x,y-.024,-5.318+depth/2+.014,.010,.003,'#655a48',metal,frontRot);
      }
    });

    const spine=pattern(paint(256,48,(c,w,h)=>{
      const shade=c.createLinearGradient(0,0,0,h);
      shade.addColorStop(0,'#b4e1e7');shade.addColorStop(.24,'#67bcce');shade.addColorStop(1,'#378ba5');
      rect(c,0,0,w,h,shade);
      rect(c,6,3,2,h-6,'#bce3e2');
      rect(c,223,7,21,h-14,'#dbddba');
      rect(c,220,6,2,h-12,'#456b6b');
      type(c,'大冰　作品',202,32,'bold 23px '+serif,'#e3ece1','right');
      rect(c,0,h-2,w,2,'rgba(32,69,80,.49)');
      dust(c,w,h,400,.17);
    }),.12);
    const bindings=['#49c3df','#2eaacb','#3db5d0','#50b9cb'];
    function book(x,y,z,width,thickness,pale=false,upright=false){
      const cover=pale?'#7bc6d8':choose(bindings),depth=between(.174,.199);
      const angle=upright?-Math.PI/2:0, rotation=[0,0,angle], offset=thickness*.442;
      box(x,y,z-.003,width-.007,thickness*.86,depth-.009,'#d9caab',plain,rotation);
      for(const face of [-1,1]){
        const dx=upright?face*offset:0,dy=upright?0:face*offset;
        box(x+dx,y+dy,z,width,thickness*.116,depth,cover,plain,rotation);
      }
      set(planeGeo,spine,x,y,z+depth*.5+.0007,width,thickness,1,pale?'#d4fbff':'#a2eaff',rotation);
    }
    function run(from,to,level){
      for(let x=from;x<to-.028;){
        const thickness=between(.031,.045), height=between(.235,.273);
        book(x+thickness/2,level+height/2,-5.242+between(-.010,.021),height,thickness,false,true);
        x+=thickness+between(.001,.004);
      }
    }
    for(const shelf of shelves.slice(0,3)){
      run(1.733,2.61,shelf+boardTop);
      run(4.117,5.553,shelf+boardTop);
    }
    function stack(from,to,shelf,count,width,pale=false){
      const step=.027;
      for(let row=0;row<count;row++){
        const x=T.MathUtils.lerp(from,to,row/Math.max(1,count-1));
        book(x+between(-.006,.006),shelf+boardTop+(row+.5)*step,-5.223+between(-.012,.012),
          width+between(-.012,.012),step-.0008,pale);
      }
    }
    // Like the photograph, each stroke is a leaning stack interrupted by a real shelf.
    stack(1.881,2.009,shelves[4],14,.219,true);
    stack(2.459,2.347,shelves[4],14,.223,true);
    stack(2.015,2.063,shelves[5],10,.208,true);
    stack(2.347,2.293,shelves[5],10,.215,true);
    for(const x of [1.934,2.155,2.376]){
      stack(x,x,shelves[5]+.27,4,.206,true);
    }
    stack(2.177,2.145,shelves[6],6,.213,true);
    const iceStrokes=[
      [[4.145,4.336],[4.334,4.147],.198],
      [[4.409,4.583],[4.58,4.410],.200],
      [[4.814,4.814],[4.814,4.814],.228],
      [[5.396,5.085],[5.085,5.370],.229]
    ];
    for(const [lower,upper,width] of iceStrokes){
      stack(...lower,shelves[4],14,width);
      stack(...upper,shelves[5],13,width);
    }
    for(const [from,to,count] of [[4.384,4.289,4],[4.814,4.814,8],[5.197,5.316,5]]){
      stack(from,to,shelves[6],count,.219);
    }

    const jinanBadge=paint(512,512,(c,w,h)=>{
      const g=c.createLinearGradient(60,40,w-90,h-40);
      g.addColorStop(0,'#644920');g.addColorStop(.29,'#4d3d23');g.addColorStop(.62,'#332c1b');
      g.addColorStop(.85,'#69501f');g.addColorStop(1,'#9b782e');
      oval(c,w/2,h/2,254,254,g);
      for(const [r,weight,color] of [[242,4,'#e1bd64'],[231,5,'#2d2418'],[210,9,'#ecb135'],[187,2,'#efd285'],[157,2,'#a78436']]){
        c.strokeStyle=color;c.lineWidth=weight;c.beginPath();c.arc(256,256,r,0,Math.PI*2);c.stroke();
      }
      for(let i=0;i<7;i++)oval(c,256+(i-3)*33,99+Math.abs(i-3)*6,4,4,'#e7c16d');
      poly(c,[[31,198],[481,198],[467,256],[480,312],[32,312],[44,256]],'#eeb52a');
      rect(c,45,207,421,3,'#fed768');rect(c,45,299,421,4,'#9d6c23');
      type(c,'大冰的小屋',256,281,'bold 74px '+serif,'#3e2b1b','center');
      type(c,'宽 厚 里',256,372,'bold 32px '+serif,'#efca66','center');
      dust(c,w,h,3800,.2);
    });
    const badgeRadius=.320;
    cyl(3.392,2.99,-5.429,badgeRadius+.006,.049,'#80612e',metal,frontRot);
    set(new T.CircleGeometry(1,48),pattern(jinanBadge,.28),3.392,2.99,-5.401,badgeRadius,badgeRadius,1);

    const displayMap=paint(512,288,(c,w,h)=>{
      rect(c,0,0,w,h,'#081523');
      for(let i=0;i<63;i++)oval(c,between(20,w-20),between(18,h-18),between(.5,1.4),between(.5,1.4),'rgba(142,213,236,.44)');
      const flare=c.createRadialGradient(262,137,18,256,145,130);
      flare.addColorStop(0,'#159ddc');flare.addColorStop(.52,'#0e73b7');flare.addColorStop(.79,'rgba(9,78,144,.88)');flare.addColorStop(1,'rgba(7,45,80,0)');
      rect(c,0,0,w,h,flare);
      const atmosphere=c.createLinearGradient(140,39,350,235);
      atmosphere.addColorStop(0,'#178dc5');atmosphere.addColorStop(.56,'#0a5298');atmosphere.addColorStop(1,'#0ca7d4');
      oval(c,256,145,96,96,atmosphere);
      c.strokeStyle='rgba(84,208,243,.49)';c.lineWidth=2;
      c.beginPath();c.ellipse(256,145,131,33,-.26,0,Math.PI*2);c.stroke();
      c.beginPath();c.ellipse(256,145,84,62,-.26,0,Math.PI*2);c.stroke();
      c.save();c.translate(256,145);c.rotate(-.09);
      rect(c,-102,-22,204,46,'rgba(18,153,203,.42)');
      c.strokeStyle='rgba(86,217,248,.56)';c.strokeRect(-102,-22,204,46);
      type(c,'大冰的小屋 · 民谣现场',0,8,'bold 19px '+sans,'#a7eaff','center');
      c.restore();
    });
    const screenTilt=[.10,-.17,0];
    box(6.101,3.03,-5.24,1.49,.85,.078,'#18191a',plain,screenTilt);
    const screen=pattern(displayMap,.90);
    screen.userData.probeRadiance=2.6;
    plane(6.094,3.026,-5.199,1.454,.811,screen,screenTilt);
    const wallSpeaker=pattern(paint(128,90,(c,w,h)=>{
      rect(c,0,0,w,h,'#222527');
      for(let y=4;y<h-3;y+=4)for(let x=4;x<w-3;x+=4)oval(c,x,y,1.22,1.17,'#101418');
      rect(c,0,h-7,w,5,'#191c20');
    }),.014);
    for(const [x,y,z,angle] of [[1.66,3.52,-5.07,.29],[5.70,3.55,-5.00,-.13]]){
      box(x,y,z,.515,.31,.284,'#23211e',plain,[.14,angle,0]);
      plane(x+Math.sin(angle)*.146,y-.02,z+Math.cos(angle)*.146,.485,.282,wallSpeaker,[.14,angle,0]);
    }

    // Simple bottle profiles keep the silhouette legible even in the far corner.
    const bottleGeo=(shoulder,longNeck)=>new T.LatheGeometry([
      new T.Vector2(.72,0),new T.Vector2(.95,.018),new T.Vector2(1,.063),
      new T.Vector2(1,shoulder-.055),new T.Vector2(.95,shoulder),
      new T.Vector2(longNeck?.35:.47,shoulder+.105),new T.Vector2(longNeck?.31:.44,.918),
      new T.Vector2(longNeck?.38:.50,.932),new T.Vector2(longNeck?.38:.50,.967),
      new T.Vector2(longNeck?.30:.39,.982),new T.Vector2(.01,.984)
    ],16);
    const bottleShapes=[bottleGeo(.64,true),bottleGeo(.72,false),bottleGeo(.55,true)];
    const bottleColors=['#2c463b','#513627','#986b39','#52756c','#8a943d','#4c302b','#405540','#b27d3f','#242823'];
    const labelShape=new T.CylinderGeometry(1,1,1,22,1,true,-1.98,3.96);
    const labels=[
      ['山梅','PLUM WINE','#dfc9a8','#854637'],['谷酿','BATCH 07','#ccb384','#485d50'],
      ['松露','BOTANICAL','#d7d6bc','#4c6158'],['晚山','HERBAL','#c1bda3','#755144']
    ].map(([name,line,paper,ink])=>pattern(paint(240,136,(c,w,h)=>{
      rect(c,0,0,w,h,paper);c.lineWidth=2;c.strokeStyle=ink;c.strokeRect(6,5,w-12,h-10);
      c.strokeRect(11,10,w-22,h-20);type(c,name,w/2,76,'bold 46px '+serif,ink,'center');
      type(c,line,w/2,102,'bold 13px '+sans,ink,'center');dust(c,w,h,800,.21);
    }),.018));
    function bottle(x,y,z,h,rad,idx){
      const tone=choose(bottleColors), shape=idx%3;
      set(bottleShapes[shape],glass,x,y+.002,z,rad,h,rad,tone);
      const band=.28+rand()*.12, ly=y+h*(shape===2?.31:.39), twist=(rand()-.5)*.76;
      set(labelShape,labels[idx%labels.length],x,ly,z,rad*1.018,h*band,rad*1.018,0xffffff,[0,twist,0]);
      cyl(x,y+h*.973,z,rad*(shape===1?.49:.38),h*.074,choose(['#b3a17a','#8d5440','#485b53','#bfa87f']),metal);
    }
    let bottleNo=0;
    function bottles(from,to,shelf,count,hMin=.17,hMax=.31){
      const spacing=(to-from)/count;
      for(let i=0;i<count;i++){
        bottle(from+(i+.5)*spacing+between(-.013,.013),shelf+boardTop,-5.29+between(-.036,.058),
          between(hMin,hMax),Math.min(spacing*.43,between(.028,.057)),bottleNo++);
      }
    }
    bottles(1.70,2.61,shelves[3],9,.146,.28);
    bottles(2.73,3.96,shelves[3],13);
    bottles(4.08,5.56,shelves[3],11,.14,.27);
    bottles(2.73,3.95,shelves[5],11,.18,.322);
    bottles(1.70,2.049,shelves[6],4,.22,.32);
    bottles(2.32,2.91,shelves[6],5,.21,.372);
    bottles(3.96,4.29,shelves[6],3,.24,.35);
    bottles(5.425,5.62,shelves[6],2,.235,.34);
    for(const [x,h,w,tint] of [
      [2.758,.302,.108,'#61483d'],[2.89,.355,.119,'#715237'],[3.012,.382,.102,'#4a3b30'],
      [3.785,.351,.083,'#6e543d'],[3.880,.379,.086,'#564334']
    ]){
      box(x,shelves[6]+boardTop+h/2,-5.35,w,h,.162,tint);
      box(x,shelves[6]+boardTop+h*.735,-5.267,w*.71,.034,.004,'#ac8955');
    }
    for(const [x,y,w,h] of [[2.96,.405,.38,.29],[3.47,.805,.46,.29],[3.807,.405,.25,.26]]){
      box(x,y,-5.303,w,h,.31,'#745942',wood);
      box(x,y+.019,-5.141,w*.27,.045,.013,'#453d32',plain);
    }
    bottles(2.74,3.2,shelves[2],4,.135,.251);
    bottles(3.46,3.97,shelves[4],4,.14,.229);
    const collage=pattern(paint(176,120,(c,w,h)=>{
      rect(c,0,0,w,h,'#ad9b80');
      for(let iy=0;iy<3;iy++)for(let ix=0;ix<4;ix++){
        const x=7+ix*41,y=7+iy*37;
        rect(c,x,y,37,32,'#cfc0a3');
        rect(c,x+3,y+2,31,24,choose(['#66564f','#6c6b58','#5e5a52','#a08466']));
        for(let i=0;i<5;i++)oval(c,x+between(4,32),y+between(7,21),3,5,choose(['#bdb19a','#846858','#584d45']));
      }
      dust(c,w,h,650,.21);
    }),.012);
    box(3.66,1.988,-5.484,.42,.298,.025,'#4c382c',wood,[-.17,0,-.056]);
    plane(3.66,1.988,-5.469,.374,.25,collage,[-.17,0,-.056]);
    // The counter has raised panels and a worn, rounded lip.
    box(4.05,.525,-2.553,4.97,1.01,.90,'#4c4637',wood);
    for(let i=0;i<5;i++){
      const x=2.061+i*.996;
      box(x,.542,-2.082,.932,.806,.054,'#465e50',painted);
      box(x,.535,-2.048,.755,.627,.028,'#4b6757',painted);
      const ox=x-.437;
      [ox,x+.437].forEach(xx=>box(xx,.542,-2.046,.033,.798,.032,'#866c49',wood));
      [.163,.925].forEach(yy=>box(x,yy,-2.044,.893,.031,.034,'#96764d',wood));
    }
    box(4.05,.105,-2.046,5.00,.110,.088,'#5c4736',wood);
    const counterWood=CabinSurfaces.furnitureWood(0xe3cbaa);
    ['#d0b89d','#d8bfa0','#dac2a4','#cdb291'].forEach((tint,i)=>{
      box(4.05,1.044,-3.084+(i+.5)*.266,5.14,.112,.262,tint,counterWood);
    });
    box(4.05,1.017,-2.003,5.15,.046,.05,'#dbbd95',counterWood);
    box(4.05,1.071,-2.015,5.15,.018,.029,'#e4c6a3',counterWood);
    CabinSurfaces.tabletopWear(room,1.1009,[
      [2.90,-2.31,.165,.152,0,-.2],[3.59,-2.64,.178,.164,2,.57],[4.85,-2.28,.164,.156,0,.94],
      [5.44,-2.47,.159,.142,2,-.52],[2.02,-2.26,.32,.20,1,.045],[3.78,-2.16,.45,.124,3,-.02],
      [5.13,-2.85,.32,.20,1,.13]
    ]);
    // Tight occlusion under the serving pieces shares one instanced draw across the counter.
    const counterShade=new T.MeshBasicMaterial({map:paint(48,48,(ctx,w,h)=>{
      const shade=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
      shade.addColorStop(0,'rgba(27,17,12,.63)');shade.addColorStop(.48,'rgba(27,17,12,.33)');
      shade.addColorStop(1,'rgba(27,17,12,0)');rect(ctx,0,0,w,h,shade);
    }),transparent:true,depthWrite:false});
    const counterContacts=[
      [2.38,-2.69,.91,.43],[2.912,-2.548,.151,.115],[3.074,-2.516,.132,.103],
      [5.56,-2.707,.52,.49],[5.93,-2.32,.57,.52]
    ];
    counterContacts.forEach(([x,z,w,d])=>plane(x,1.101,z,w,d,counterShade,[-Math.PI/2,0,0]));
    rod([1.674,.214,-1.86],[6.409,.214,-1.86],.027,'#aa8450');
    [1.80,3.31,4.84,6.25].forEach(x=>{
      rod([x,.215,-2.02],[x,.215,-1.86],.017,'#7b674d');
      cyl(x,.215,-2.022,.042,.018,'#876d49',metal,frontRot);
    });
    // Small counter sign, a handwritten pad and a folded blue work towel.
    const tag=paint(272,120,(c,w,h)=>{
      rect(c,0,0,w,h,'#d6b888');
      type(c,'在此点单',w/2,85,'bold 56px '+serif,'#3f493c','center');dust(c,w,h,1200,.19);
    });
    box(3.75,1.126,-2.32,.48,.05,.16,'#6d4e36',wood);
    box(3.75,1.238,-2.342,.46,.229,.027,'#916848',wood,[-.10,0,0]);
    plane(3.75,1.238,-2.320,.423,.187,pattern(tag,.15),[-.10,0,0]);
    box(4.39,1.106,-2.26,.32,.013,.188,'#ddc99d',plain,[0,-.20,0]);
    for(let j=0;j<4;j++)box(4.39,1.114,-2.31+j*.023,.19,.001,.003,'#947b61',plain,[0,-.20,0]);
    rod([4.53,1.119,-2.23],[4.61,1.119,-2.40],.005,'#5f4c38');
    box(5.19,1.109,-2.50,.34,.019,.24,'#657d77',cloth,[0,.12,0]);
    box(5.20,1.122,-2.50,.31,.010,.19,'#839187',cloth,[0,.12,0]);
    // Counter tap block, curved brass neck and three distinct handles.
    box(2.36,1.116,-2.71,.69,.033,.29,'#504e44',metal);
    for(let i=0;i<8;i++)box(2.09+i*.075,1.137,-2.71,.010,.005,.23,'#79786b',metal);
    [2.15,2.39,2.63].forEach((x,i)=>{
      cyl(x,1.303,-2.74,.032,.30,'#9c825e',metal);
      cyl(x,1.137,-2.74,.067,.047,'#7e6a4d',metal);
      rod([x,1.42,-2.73],[x,1.434,-2.604],.023,'#aa8d5e');
      rod([x,1.434,-2.604],[x,1.383,-2.58],.014,'#9a835e');
      rod([x,1.44,-2.73],[x,1.59,-2.78],.012,'#836e4d');
      ball(x,1.596,-2.78,.035,.062,.031,['#a56a48','#687f68','#c0a36f'][i],wood);
    });
    const cupProfile=[[.57,0],[.66,.025],[.69,.071],[.68,.105],[.79,.23],[.98,.82],[1,.956],[.985,.99],[.926,1],[.90,.976],[.86,.83],[.68,.241],[.46,.18],[0,.16]];
    const cupgeo=new T.LatheGeometry(cupProfile.map(([x,y])=>new T.Vector2(x,y)),28);
    const handleGeo=new T.TorusGeometry(1,.16,8,24);
    function cup(x,y,z,rad,h,body,drink,handle=false){
      set(cupgeo,pottery,x,y,z,rad,h,rad,body);
      cyl(x,y+h*.855,z,rad*.885,.0016,drink,glass);
      if(handle)set(handleGeo,pottery,x+rad*.92,y+h*.54,z,rad*.51,h*.32,rad*.68,body);
    }
    cup(2.89,1.10,-2.56,.056,.133,'#d9c8a7','#473d2a',true);
    cup(3.055,1.10,-2.53,.049,.111,'#849d88','#775835',true);
    // Prepared drinks on a tray and ingredient bottles near the service end.
    cyl(5.92,1.118,-2.34,.211,.026,'#7f6850',wood);
    [[5.83,-2.32],[5.98,-2.28],[5.95,-2.43]].forEach(([x,z],i)=>{
      cup(x,1.132,z,.042,.105,['#abb6a1','#ddc4a2','#b3a580'][i],['#a77243','#633d29','#a68950'][i]);
    });
    // The big plum jar has a real tap and fruit visible in amber liquid.
    const jarX=5.57,jarY=1.156,jarZ=-2.726;
    cyl(jarX,1.129,jarZ,.194,.057,'#68523a',wood);
    const jarProfile=[[.118,0],[.150,.013],[.164,.038],[.166,.310],[.161,.340],[.148,.363],[.104,.391],[.103,.418],[.108,.425],[.099,.431],[.092,.426]];
    const jarGeom=new T.LatheGeometry(jarProfile.map(p=>new T.Vector2(...p)),48);
    const jar=new T.Mesh(jarGeom,amberShell);jar.position.set(jarX,jarY,jarZ);room.add(jar);
    const infusion=new T.MeshPhysicalMaterial({color:0xc18942,roughness:.21,transparent:true,opacity:.46,depthWrite:false,clearcoat:.55});
    cyl(jarX,jarY+.166,jarZ,.158,.301,'#dfa655',infusion);
    const meniscus=new T.Mesh(new T.TorusGeometry(.157,.0017,6,48),new T.MeshPhysicalMaterial({color:0xae763e,roughness:.17,clearcoat:.80}));
    meniscus.rotation.x=Math.PI/2;meniscus.position.set(jarX,jarY+.318,jarZ);room.add(meniscus);
    const plumMat=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.38,clearcoat:.41});
    for(let i=0;i<24;i++){
      const a=i*2.399+.3, r=(i%4===0?.045:.102)*(1+.06*Math.sin(i)),py=jarY+.053+Math.floor(i/8)*.055;
      const px=jarX+Math.cos(a)*r,pz=jarZ+Math.sin(a)*r,fr=.036+rand()*.007;
      const tall=fr*(.88+rand()*.19);
      ball(px,py,pz,fr,tall,fr*.97,choose(['#967339','#79612d','#8b8241','#b0803d']),plumMat);
      ball(px,py+tall*.96,pz,fr*.12,.0015,fr*.10,'#4d422a');
    }
    jar.renderOrder=2;
    cyl(jarX,jarY+.433,jarZ,.119,.037,'#634636',wood);
    cyl(jarX,jarY+.403,jarZ,.114,.021,'#d4ac70',plain);
    cyl(jarX,jarY+.386,jarZ,.112,.014,'#955843',plain);
    const plumLabel=paint(248,130,(c,w,h)=>{
      rect(c,0,0,w,h,'#eddbb5');c.lineWidth=3;c.strokeStyle='#996444';c.strokeRect(7,7,w-14,h-14);
      type(c,'梅子酒',w/2,87,'bold 66px '+serif,'#673c32','center');dust(c,w,h,1800,.18);
    });
    const labelGeom=new T.CylinderGeometry(.167,.167,.110,18,1,true,-.73,1.46);
    const jamLabel=new T.Mesh(labelGeom,pattern(plumLabel,.12));
    jamLabel.position.set(jarX,jarY+.249,jarZ);room.add(jamLabel);
    rod([jarX,jarY+.105,jarZ+.15],[jarX,jarY+.105,jarZ+.218],.016,brass);
    rod([jarX,jarY+.105,jarZ+.216],[jarX,jarY+.067,jarZ+.224],.011,brass);
    rod([jarX-.035,jarY+.13,jarZ+.195],[jarX+.035,jarY+.13,jarZ+.195],.010,'#796245');
    box(1.84,1.128,-2.31,.29,.048,.193,'#a9865b',wood);
    for(let i=0;i<3;i++)cyl(1.76+i*.076,1.170,-2.31,.033,.051,'#d1b889',plain);
    // The short track above the brick keeps the shelf light off the ceiling.
    const shelfLight=[3.63,3.60,-4.53];
    box(3.62,3.75,-4.55,3.79,.034,.054,'#747068');
    for(const x of [2.08,5.17]){
      rod([x,3.75,-4.55],[x,3.95,-4.55],.010,'#494237',plain);
    }
    for(const x of [2.49,shelfLight[0],4.82]){
      rod([x,3.75,-4.55],[x,3.67,-4.50],.021,'#5f5549',plain);
      cyl(x,3.641,-4.534,.037,.108,'#a29884',plain,[.58,0,0]);
      ball(x,3.604,-4.561,.027,.011,.014,'#deb17b',lamp);
    }
    // Two flared wicker shades and the straight cage above the centre.
    const barPendants=[];
    const rim=new T.TorusGeometry(1,.026,5,24);
    const ribs=[
      [[.197,0],[.274,.070],[.243,.132],[.139,.218],[.153,.327],[.071,.385]],
      [[.179,0],[.213,.042],[.218,.239],[.205,.327],[.104,.403]]
    ];
    [2.00,3.78,5.73].forEach((x,i)=>{
      const y=[3.03,3.01,3.13][i],z=[-3.09,-2.94,-3.14][i],shape=ribs[i===1?1:0];
      const top=y+shape.at(-1)[1],straw=i===1?'#a28962':'#b39b73';
      barPendants.push([x,y-.030,z]);
      rod([x,3.95,z],[x,top,z],.009,'#40322a',plain);
      cyl(x,top-.019,z,.046,.063,'#63503b',metal);
      for(const [radius,height] of [shape[0],shape[shape.length-2],shape.at(-1)]){
        set(rim,plain,x,y+height,z,radius,radius,.19,straw,frontRot);
      }
      for(let j=0;j<18;j++){
        const a=j*Math.PI/9;
        const points=shape.map(([r,h],k)=>{
          const angle=a+(i===1?0:Math.sin(k*.84+j*Math.PI)*.065);
          return [x+Math.cos(angle)*r,y+h,z+Math.sin(angle)*r];
        });
        for(let k=1;k<points.length;k++){
          rod(points[k-1],points[k],.0048,j%3?'#b19a75':'#9b8462',plain);
        }
      }
      cyl(x,y+.178,z,.030,.172,'#68503a',plain);
      ball(x,y+.084,z,.043,.057,.043,'#ffe4b2',lamp);
      plane(x,y+.086,z+.018,.41,.41,haloMat);
    });
    // Wax and tiny glass votives; grouped scintillation below affects only these flames.
    const flickers=[];
    const waxProfile=[[.85,0],[.97,.02],[1,.07],[1,.88],[.99,.96],[.93,1],[.77,1.02],[.68,.95],[.32,.90],[.02,.90]];
    const waxShape=new T.LatheGeometry(waxProfile.map(([x,y])=>new T.Vector2(x,y)),26);
    const flameGeo=new T.SphereGeometry(1,9,7);
    const flameMat=new T.MeshBasicMaterial({color:0xffdb99,toneMapped:false});
    flameMat.userData.probeRadiance=13;
    function candle(x,y,z,h,r,glassCup){
      cyl(x,y+.008,z,r*1.28,.018,'#785c3e',metal);
      if(glassCup)cyl(x,y+h*.46,z,r*1.08,h*.92,'#d9a15f',amberShell);
      const size=r*(glassCup?.81:1);
      set(waxShape,plain,x,y+.005,z,size,h,size,'#e0c399');
      for(let j=0;j<3;j++){
        const a=j*2.45+.27;
        ball(x+Math.cos(a)*size*.93,y+h*(.76+j*.022),z+Math.sin(a)*size*.93,size*.12,h*(.19-j*.032),size*.12,'#ebd6b3');
      }
      rod([x,y+h*.96,z],[x+.002,y+h+.013,z],.0018,'#3e3027',plain);
      const m=new T.Mesh(flameGeo,flameMat);m.position.set(x,y+h+.024,z);m.scale.set(.010,.026,.010);
      m.userData.flickerPhase=between(0,6.28);room.add(m);flickers.push(m);
      plane(x,y+h+.022,z+.006,.236,.236,haloMat);
    }
    candle(-5.58,.281,-2.69,.074,.030,true);
    candle(-1.33,.281,-2.56,.081,.032,true);
    candle(3.29,1.10,-2.33,.113,.033,false);
    candle(3.39,1.10,-2.37,.067,.031,true);
    flush();

    return {
      group:room,stagePhotos,vocalSpot,
      barPendants,shelfLight,stageLight,stageAim,
      stringGlow:[wirePts[24][0],wirePts[24][1]-.19,wirePts[24][2]+.57],
      update(time) {
        for(const f of flickers) {
          const p=f.userData.flickerPhase;
          const s=Math.sin(time*6.7+p)*.0025+Math.sin(time*10.6+p)*.0013;
          f.scale.y=.026+s;
          f.rotation.z=Math.sin(time*4+p)*.065;
        }
      }
    };
  };
})();
