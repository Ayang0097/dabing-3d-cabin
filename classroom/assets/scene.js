(() => {
  const halfWidth = 5.9, front = -6.18, rear = 7.15, wallHeight = 3.18;
  const roomWidth = halfWidth * 2, roomDepth = rear - front, roomCenter = (rear + front) / 2;
  const deskWidth = 2.32, deskDepth = .74, chairOffset = .71, seatSpacing = .60;
  const stageFront = -4.63, doorZ = -3.74;
  const stageHeight = .16;
  const whiteboard = {x:1.47,z:-5.83,width:2.56};
  const lectern = {x:-.62,z:-5.36};
  const televisions = [
    {x:-3.61,z:-5.34,width:2.22,yaw:.095},
    {x:3.94,z:-5.34,width:2.22,yaw:-.095}
  ];
  const tableBanks = [-3.43, 0, 3.43];
  const tables = Array.from({length:7}, (_, row) => {
    // Append the rear center desk so seats 37–40 keep their original positions.
    const banks = row === 6 ? [tableBanks[0], tableBanks[2], tableBanks[1]] : tableBanks;
    return banks.map(x => ({x,z:-3.78 + row * 1.48}));
  }).flat();
  const seatPositions = tables.flatMap(({x,z}) => [-seatSpacing,seatSpacing].map(offset => ({
    x:x + offset, z:z + chairOffset
  })));
  const botArt = window.CabinBotArt;
  const botStyles = [
    ['orb','green'], ['tile','blue'], ['cloud','pink'], ['pebble','teal'],
    ['drop','orange'], ['badge','violet'], ['bloom','yellow'], ['orb','red']
  ].map(([shape,color]) => ({shape,tint:botArt?.palette[color] ?? color}));
  const botStyleIndex = index => (index+Math.floor(index/6)*3)%botStyles.length;

  function makeFlatClassroom(canvas, marker) {
    const frame = canvas.parentElement;
    frame.classList.add('flat-fallback');
    const context = canvas.getContext('2d');
    const portraits = botArt && botStyles.map(({shape,tint})=>{
      const image=new Image();
      image.addEventListener('load',draw,{once:true});
      image.src=botArt.portrait(shape,tint);
      return image;
    });
    function draw() {
      const w = frame.clientWidth, h = frame.clientHeight;
      if (!w || !h) return;
      const unit = Math.min((w - 20) / roomWidth,(h - 20) / roomDepth);
      const left = (w - roomWidth * unit) / 2, top = (h - roomDepth * unit) / 2;
      const screenX = x => left + (x + halfWidth) * unit;
      const screenY = z => top + (z - front) * unit;
      if (context) {
        canvas.width = w; canvas.height = h;
        const fill = (x,z,width,depth,color) => {
          context.fillStyle = color;
          context.fillRect(screenX(x),screenY(z),width*unit,depth*unit);
        };
        fill(-halfWidth,front,roomWidth,roomDepth,'#987453');
        fill(-5.2,front+.12,10.4,stageFront-front-.12,'#5b4535');
        fill(halfWidth-.18,doorZ-.6,.18,1.2,'#865946');
        fill(whiteboard.x-whiteboard.width/2,whiteboard.z-.06,whiteboard.width,.12,'#f5efe1');
        fill(lectern.x-.41,lectern.z-.24,.82,.48,'#c7b095');
        context.fillStyle='#232324';
        for (const {x,z,width,yaw} of televisions) {
          context.save();
          context.translate(screenX(x),screenY(z));
          context.rotate(-yaw);
          context.fillRect(-width*unit/2,-.07*unit,width*unit,.14*unit);
          context.restore();
        }
        for (const {x,z} of tables) fill(x-deskWidth/2,z-deskDepth/2,deskWidth,deskDepth,'#f9f8f3');
        const iconSize=.59*unit;
        for (const [index,{x,z}] of seatPositions.entries()) {
          fill(x-.33,z-.27,.66,.54,'#a95532');
          const styleIndex=botStyleIndex(index), icon=portraits?.[styleIndex];
          if(icon?.naturalWidth) {
            context.drawImage(icon,screenX(x)-iconSize/2,screenY(z-.09)-iconSize/2,iconSize,iconSize);
          } else {
            context.fillStyle=botStyles[styleIndex].tint;
            context.beginPath();
            context.arc(screenX(x),screenY(z-.09),.23*unit,0,Math.PI*2);
            context.fill();
            fill(x-.095,z-.16,.055,.09,'#fff0d2');
            fill(x+.04,z-.16,.055,.09,'#fff0d2');
          }
        }
      }
      seatPositions.forEach(({x,z},i) => marker(i+1,screenX(x)*100/w,screenY(z+.25)*100/h));
    }
    new ResizeObserver(draw).observe(frame);
  }

  function makeClassroom(canvas, marker) {
    const T = window.THREE;
    const frame = canvas.parentElement;
    let renderer;
    if (T && botArt) {
      try { renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:true}); }
      catch { /* Seat controls remain available without a GPU. */ }
    }
    if (!renderer) return makeFlatClassroom(canvas,marker);

    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.07;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate=false;
    renderer.shadowMap.needsUpdate=true;
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(45,1,.2,75);
    const seatAnchors = [];
    const cast = new T.HemisphereLight(0xfff2df,0xbfae9c,1.13);
    const sun = new T.DirectionalLight(0xffecd5,1.35);
    const rim = new T.DirectionalLight(0xc5d6ea,.43);
    sun.position.set(-6,10,3); rim.position.set(7,5,-6);
    scene.add(cast, sun, rim);
    const key = new T.SpotLight(0xffe2af,25,10,1.06,.78,2);
    key.position.set(-3.05,4.65,2.4);key.target.position.set(-.7,0,.6);
    key.castShadow=true;key.shadow.mapSize.set(1024,1024);
    key.shadow.bias=-.00022;key.shadow.normalBias=.016;
    scene.add(key,key.target);
    for (const [x,z,intensity] of [[2.74,2.21,13],[.22,-3.85,18]]) {
      const fill=new T.SpotLight(0xffe1b7,intensity,8,1.08,.77,2);
      fill.position.set(x,3.02,z);fill.target.position.set(x,.12,z-.35);
      scene.add(fill,fill.target);
    }
    for (const [x,y,z,intensity,distance] of [
      [5.48,2.14,-2.60,2.25,2.6],[5.48,2.15,-.25,1.7,2.8],[-5.45,1.39,2.55,1.55,2.2]
    ]) {
      const lamp=new T.PointLight(0xffca89,intensity,distance,2);
      lamp.position.set(x,y,z);scene.add(lamp);
    }
    const standard = (color, extra={}) => new T.MeshStandardMaterial({color,roughness:.74,...extra});
    const anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const loader = new T.TextureLoader();
    function loadMap(file,x=1,y=1,{color=true,saturation=1,lift=0}={}) {
      const texture=loader.load('./assets/finishes/'+file,loaded=>{
        if(saturation!==1||lift){
          const scan=loaded.image, toned=document.createElement('canvas');
          toned.width=scan.width;toned.height=scan.height;
          const ctx=toned.getContext('2d');ctx.filter='saturate('+saturation+')';
          ctx.drawImage(scan,0,0);
          ctx.filter='none';ctx.fillStyle='#fff';ctx.globalAlpha=lift;
          ctx.fillRect(0,0,toned.width,toned.height);
          loaded.image=toned;loaded.needsUpdate=true;
        }
        queueDraw();
      });
      texture.wrapS=texture.wrapT=T.RepeatWrapping;
      texture.repeat.set(x,y);texture.anisotropy=anisotropy;
      if(color)texture.colorSpace=T.SRGBColorSpace;
      return texture;
    }
    function canvasMap(width,height,paint) {
      const image=document.createElement('canvas');image.width=width;image.height=height;
      paint(image.getContext('2d'),width,height);
      const map=new T.CanvasTexture(image);
      map.colorSpace=T.SRGBColorSpace;map.anisotropy=anisotropy;
      return map;
    }
    // The wood, plaster and linen scans are shared with the cabin's Poly Haven finishes.
    const floor=standard(0xb9a58e,{
      map:loadMap('floor-color.webp',2.5,2.55,{saturation:.21}),
      normalMap:loadMap('floor-normal.webp',2.5,2.55,{color:false}),
      normalScale:new T.Vector2(.27,.27),roughness:.62
    });
    const base=standard(0x38261c), baseEdge=standard(0x705034);
    const tableTop=standard(0xeee7da,{roughness:.52}),enamel=standard(0xd9d0c2);
    const chairWhite=standard(0xeae5db,{roughness:.57}),chairOrange=standard(0xca5627,{roughness:.61});
    const chrome=standard(0xaea7a0,{metalness:.35,roughness:.40});
    const boxGeometry = new T.BoxGeometry(1,1,1);
    const sphereGeometry = new T.SphereGeometry(1,14,9);
    const planeGeometry = new T.PlaneGeometry(1,1);
    const cylinderGeometry = new T.CylinderGeometry(1,1,1,18);
    const plinth = new T.Group();
    scene.add(plinth);

    function mesh(geometry, dimensions, position, material, parent = plinth) {
      const object = new T.Mesh(geometry,material);
      object.position.set(...position); object.scale.set(...dimensions); parent.add(object);
      return object;
    }
    const box = (w,h,d,x,y,z,m,p) => mesh(boxGeometry,[w,h,d],[x,y,z],m,p);
    const orb = (w,h,d,x,y,z,m,p) => mesh(sphereGeometry,[w,h,d],[x,y,z],m,p);
    const cylinder = (w,h,d,x,y,z,m,p) => mesh(cylinderGeometry,[w,h,d],[x,y,z],m,p);
    box(roomWidth+.42,.105,roomDepth+.42,0,-.292,roomCenter,base);
    box(roomWidth+.34,.028,roomDepth+.34,0,-.226,roomCenter,baseEdge);
    box(roomWidth+.28,.112,roomDepth+.28,0,-.156,roomCenter,base);
    box(roomWidth,.10,roomDepth,0,-.05,roomCenter,floor).receiveShadow=true;
    const plane = (w,h,x,y,z,material,parent) => mesh(planeGeometry,[w,h,1],[x,y,z],material,parent);
    window.BotWorkshop.buildWorkshop({
      T,plinth,box,orb,cylinder,standard,plane,canvasMap,loadMap,
      halfWidth,front,rear,wallHeight,stageFront,stageHeight,doorZ,
      whiteboard,lectern,televisions
    });

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width=shadowCanvas.height=64;
    const shadowPaint=shadowCanvas.getContext('2d');
    const falloff=shadowPaint.createRadialGradient(32,32,6,32,32,32);
    falloff.addColorStop(0,'#22170ea3'); falloff.addColorStop(.56,'#22170e58');
    falloff.addColorStop(1,'#22170e00');
    shadowPaint.fillStyle=falloff; shadowPaint.fillRect(0,0,64,64);
    const shadowMap=new T.CanvasTexture(shadowCanvas);
    const shadow=new T.MeshBasicMaterial({map:shadowMap,transparent:true,opacity:.53,depthWrite:false});
    const floorShadow=new T.MeshBasicMaterial({map:shadowMap,transparent:true,opacity:.98,depthWrite:false,toneMapped:false});
    mesh(planeGeometry,[roomWidth+8,roomDepth+7,1],[0,-.353,roomCenter+.45],floorShadow).rotation.x=-Math.PI/2;
    function contactShade(width,depth,parent) {
      mesh(planeGeometry,[width,depth,1],[0,.006,0],shadow,parent).rotation.x=-Math.PI/2;
    }

    // Repeated desks and chairs share geometry while their positions follow the same seat plan.
    function instanceFurniture(template, locations) {
      template.updateMatrixWorld(true);
      const transform = new T.Matrix4();
      template.traverse(part => {
        if (!part.isMesh) return;
        const copies = new T.InstancedMesh(part.geometry,part.material,locations.length);
        locations.forEach(({x,z},index) => {
          transform.makeTranslation(x,0,z).multiply(part.matrixWorld);
          copies.setMatrixAt(index,transform);
        });
        copies.castShadow=part.geometry!==planeGeometry;
        copies.receiveShadow=part.geometry!==planeGeometry;
        plinth.add(copies);
      });
    }
    const desk = new T.Group();
    contactShade(deskWidth+.32,deskDepth+.46,desk);
    const topOutline = new T.Shape();
    const topX=deskWidth/2-.007, topZ=deskDepth/2-.007, corner=.038;
    topOutline.moveTo(-topX+corner,-topZ);
    topOutline.lineTo(topX-corner,-topZ);
    topOutline.quadraticCurveTo(topX,-topZ,topX,-topZ+corner);
    topOutline.lineTo(topX,topZ-corner);
    topOutline.quadraticCurveTo(topX,topZ,topX-corner,topZ);
    topOutline.lineTo(-topX+corner,topZ);
    topOutline.quadraticCurveTo(-topX,topZ,-topX,topZ-corner);
    topOutline.lineTo(-topX,-topZ+corner);
    topOutline.quadraticCurveTo(-topX,-topZ,-topX+corner,-topZ);
    const desktop=new T.ExtrudeGeometry(topOutline,{
      depth:.032,bevelSize:.007,bevelThickness:.007,bevelSegments:2,curveSegments:5
    });
    mesh(desktop,[1,1,1],[0,.795,0],tableTop,desk).rotation.x=-Math.PI/2;
    box(deskWidth-.077,.051,deskDepth-.036,0,.763,0,enamel,desk);
    for (const x of [-1.069,1.069]) {
      for (const z of [-.289,.289]) box(.055,.745,.055,x,.373,z,enamel,desk);
      box(.052,.038,.608,x,.055,0,enamel,desk);
    }
    box(2.10,.065,.053,0,.683,-.28,enamel,desk);
    instanceFurniture(desk,tables);

    const chair = new T.Group();
    const cushionY=.486,cushionThickness=.030;
    contactShade(.98,.83,chair);
    box(.64,.059,.528,0,.444,0,chairWhite,chair);
    box(.602,cushionThickness,.484,0,cushionY,-.01,chairOrange,chair);
    const back = new T.Shape();
    back.moveTo(-.275,0); back.quadraticCurveTo(-.30,.02,-.30,.07);
    back.quadraticCurveTo(-.25,.24,-.326,.454);
    back.quadraticCurveTo(-.345,.50,-.293,.512);
    back.quadraticCurveTo(0,.544,.293,.512);
    back.quadraticCurveTo(.345,.50,.326,.454);
    back.quadraticCurveTo(.25,.24,.30,.07);
    back.quadraticCurveTo(.30,.02,.275,0); back.lineTo(-.275,0);
    const handle = new T.Path();
    handle.absellipse(0,.447,.118,.027,0,Math.PI*2,false);
    back.holes.push(handle);
    const backGeometry = new T.ExtrudeGeometry(back,{depth:.024,bevelEnabled:true,bevelSize:.008,bevelThickness:.007,bevelSegments:2,curveSegments:10});
    const backrest=mesh(backGeometry,[1,1,1],[0,.442,.205],chairWhite,chair);
    backrest.rotation.x=.12;
    for(let rib=0;rib<5;rib++){
      const y=.112+rib*.032;
      const ridge=orb(.183+rib*.008,.005,.009,0,y,.030,chairWhite,backrest);
      ridge.scale.z=.006;
    }
    const runnerPath = new T.CurvePath();
    const runnerPoints = [[0,.44,-.217],[0,.055,-.252],[0,.025,-.224],[0,.025,.250],[0,.059,.275],[0,.59,.219]]
      .map(point => new T.Vector3(...point));
    for (let i=1;i<runnerPoints.length;i++) runnerPath.add(new T.LineCurve3(runnerPoints[i-1],runnerPoints[i]));
    const runner = new T.TubeGeometry(runnerPath,20,.015,7,false);
    for (const x of [-.25,.25]) mesh(runner,[1,1,1],[x,0,0],chrome,chair);
    box(.52,.027,.030,0,.105,.251,chrome,chair);
    instanceFurniture(chair,seatPositions);

    const botBounds=new T.Box3();
    for (const [i,{x,z}] of seatPositions.entries()) {
      const bot = new T.Group();
      const {shape,tint}=botStyles[botStyleIndex(i)];
      const body=botArt.make(bot,shape,tint);
      botArt.setDetail({shape,body,eyes:body.eyes},true);
      body.shell.castShadow=true;
      bot.scale.setScalar(.47);
      // Settle each shell on its cushion and tip its eyes toward the whole-room camera.
      bot.rotation.set(-.67,(i%3-1)*.13,0,'YXZ');
      botBounds.setFromObject(bot,true);
      bot.position.set(x,cushionY+cushionThickness/2-botBounds.min.y,z-.070);
      plinth.add(bot);
      seatAnchors.push(new T.Vector3(x,.81,z+.22));
    }

    const roomCorners = [-halfWidth-.23,halfWidth+.23].flatMap(x =>
      [front-.23,rear+.23].flatMap(z =>
        [-.35,wallHeight+.05].map(y => new T.Vector3(x,y,z))));
    let width=0, height=0, drawPending=false;
    const projected=new T.Vector3(), cameraCorner=new T.Vector3();
    function fitCamera(w,h) {
      // Give wide screens a closer, lower view. The steeper portrait angle keeps rows legible.
      const wide=T.MathUtils.clamp((w/h-.82)/.78,0,1);
      camera.position.set(0,T.MathUtils.lerp(21.8,15.4,wide),T.MathUtils.lerp(23.2,22.5,wide));
      camera.lookAt(0,.9,roomCenter);
      camera.updateMatrixWorld();
      let halfWidthSlope=0, bottom=Infinity, top=-Infinity;
      for(const corner of roomCorners){
        cameraCorner.copy(corner).applyMatrix4(camera.matrixWorldInverse);
        const depth=-cameraCorner.z, vertical=cameraCorner.y/depth;
        halfWidthSlope=Math.max(halfWidthSlope,Math.abs(cameraCorner.x/depth));
        bottom=Math.min(bottom,vertical);
        top=Math.max(top,vertical);
      }
      const insetX=Math.min(34,w*.028), insetY=Math.min(22,h*.036);
      const field=Math.max(halfWidthSlope*h/(w-2*insetX),(top-bottom)*h/(2*(h-2*insetY)));
      camera.fov=T.MathUtils.radToDeg(2*Math.atan(field));
      camera.setViewOffset(w,h,0,-h*(top+bottom)/(4*field),w,h);
    }
    function draw() {
      const w=frame.clientWidth,h=frame.clientHeight;
      if(!w||!h)return;
      if(w!==width||h!==height){
        width=w;height=h;
        renderer.setSize(w,h,false);
        fitCamera(w,h);
        seatAnchors.forEach((anchor,index)=>{
          projected.copy(anchor).project(camera);
          marker(index+1,(1+projected.x)*50,(1-projected.y)*50);
        });
      }
      renderer.render(scene,camera);
    }
    function queueDraw() {
      if(drawPending)return;
      drawPending=true;
      requestAnimationFrame(()=>{
        drawPending=false;
        draw();
      });
    }
    new ResizeObserver(queueDraw).observe(frame);
    queueDraw();
  }
  window.BotRoomScene = {makeClassroom,seatCount:seatPositions.length};
})();
