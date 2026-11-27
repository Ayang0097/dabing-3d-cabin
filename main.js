(() => {
  const $=s=>document.getElementById(s),T=THREE,K=HouseKit,canvas=$('world'),main=$('house'),hoverTag=$('hoverTag');
  const publicSite=Boolean(window.CabinPublication);
  const cabinMark=$('cabinMark');
  cabinMark.src=CabinBotArt.portrait('badge');
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});}
  catch(e){$('unsupported').hidden=false;return;}
  const treeLink=$('treeSceneLink'),classroomDialog=$('treeClassroom'),classroomBack=$('treeClassroomBack');
  const classroomURL=new URL(treeLink.href);
  classroomURL.searchParams.set('from','cabin');
  let classroomFrame=null,returningFromClassroom=false;
  let openingReady=false,openingShown=false;
  // Initial room textures, photo prints and reflections use the same loader.
  const openingImages=new Promise(resolve=>{T.DefaultLoadingManager.onLoad=resolve;});
  Promise.all([openingImages,cabinMark.decode().catch(()=>{})]).then(()=>{openingReady=true;});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  const scene=new T.Scene(); scene.background=new T.Color(0x435760);scene.fog=new T.FogExp2(0x594b43,.023);
  const camera=new T.PerspectiveCamera(63,1,.045,75);camera.rotation.order='YXZ';
  const room=buildFolkRoom(scene),art=makeCabinArt(scene),nav=createRoomPaths(room.obstacles);
  const leadSinger=CabinCharacters.roles.find(role=>role.id==='vocal');
  room.loftHide.push(...makeCabinStreet(scene,leadSinger.name));
  const roomLights=installCabinLights(scene,renderer,room.fixtures,art);
  const cutaway=makeCabinOverview(scene);
  function roofEnd(z){
    const positions=[],uv=[],indices=[],boards=78,w=13.98/boards;
    const top=x=>4.98-1.10*Math.abs(x)/6.99;
    for(let j=0;j<boards;j++){
      const x=-6.99+j*w+.0012,right=x+w-.0024,start=positions.length/3,offset=(j*.618)%1;
      for(const [px,py] of [[x,3.88],[right,3.88],[right,top(right)],[x,top(x)]]){
        positions.push(px,py,z);uv.push(offset+(px-x)/1.44,(py-3.88)/1.44+offset*.47);
      }
      indices.push(start,start+1,start+2,start,start+2,start+3);
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const finish=CabinSurfaces.wood(0xb4a38d).clone();finish.side=T.DoubleSide;
    const end=new T.Mesh(geo,finish);end.receiveShadow=true;scene.add(end);room.loftHide.push(end);
  }
  roofEnd(-5.64);roofEnd(5.59);
  const capacity=100; // Residents include the house band. The player has a separate avatar.
  const bots=[],residents=new Map(),byId=id=>residents.get(id);
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  const opening={position:new T.Vector3(.62,1.60,11.44),yaw:.07,pitch:.060,fov:59};
  const roomZoom=64,arrivalYaw=.10,arrivalPitch=-.20,landing=new T.Vector3(.45,0,3.58);
  const player=CabinCharacters.make(scene,{id:'you',name:'你',shape:'orb',color:CabinBotArt.palette.black,scale:.385*CabinCharacters.guestScale,
    x:landing.x,z:landing.z,yaw:Math.PI+arrivalYaw},8);
  player.walkSpeed=2.16;fitCollision(player);player.root.name='玩家 Bot';player.root.visible=false;
  player.root.traverse(object=>{if(object.isMesh)object.castShadow=false;});
  const pos=player.root.position.copy(opening.position),velocity=new T.Vector3(),playerView=makeCabinPlayerView(room);
  const jumpApex=.90,idleJumpRise=.30,jumpGravity=8.8;
  let jumpSpeed=null;
  const contacts=makeCabinContacts(nav,bots,player);
  let entered=false,entering=false,doorShadowDirty=false,afterSeatMotion=null,elapsed=0,tNow=0,grokArrival=null;
  let yaw=opening.yaw,pitch=opening.pitch,zoom=roomZoom,openingFov=opening.fov,doorProgress=0;
  let interactiveUntil=0,lastEvent=-10,toastTimer,drawerMode=null,selectedId=null;
  const keys=new Set();
  const moveKeys=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown'];
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const movePoint=new T.Mesh(new T.RingGeometry(.095,.125,26),new T.MeshBasicMaterial({color:0xf7d99f,side:T.DoubleSide,transparent:true,opacity:0,depthWrite:false}));movePoint.rotation.x=-Math.PI/2;scene.add(movePoint);
  const partM=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  const proxies=[],makeProxy=(w,h,d,x,y,z,data,parent=scene,geometry=new T.BoxGeometry(w,h,d))=>{const o=new T.Mesh(geometry,partM);o.position.set(x,y,z);o.visible=false;o.userData=data;parent.add(o);proxies.push(o);return o;};
  function routeRadius(def){return ((def.skill||def.id)==='singer'?.87:.73)*def.scale+.018;}
  function fitCollision(bot,body=CabinCharacters.bodyRadius(bot,bot.accessoryModel)){
    const radius=collisionRadius(bot,body);
    bot.routeRadius=routeRadius(bot);
    bot.bodyRadius=radius;
    // The walking envelope includes room to swing an instrument sideways.
    // In the listening rows the guitarist holds it upright; the head and
    // accessories keep their own measured envelope.
    const heldReach=bot.props.guitar||bot.props.shaker ? .68 : .62;
    bot.benchEnvelope=Object.keys(bot.props).length
      ?Math.max(body,heldReach*bot.scale+.012)
      :radius;
    bot.cupRadius=Math.max(radius,.662*bot.scale+.012);
    bot.routeRadius=Math.max(bot.routeRadius,bot.cupRadius);
  }
  function collisionRadius(bot,body){
    return Object.keys(bot.props).length?Math.max(routeRadius(bot),body):body;
  }
  function registerBot(b){
    if(b.root.parent!==scene)scene.add(b.root);
    b.frameStartX=b.root.position.x;b.frameStartZ=b.root.position.z;
    b.root.traverse(o=>{if(o.isMesh)o.castShadow=false;});
    if(b.bodyRadius===undefined)fitCollision(b);
    contacts.track(b);
    b.hit=makeProxy(...b.pickSize,b.x,b.root.position.y+b.outfitHeight/2,b.z,{kind:'bot',bot:b});
    b.hit.rotation.y=b.root.rotation.y;b.hit.updateMatrixWorld();
    bots.push(b);residents.set(b.id,b);
    $('botCount').textContent=String(bots.length).padStart(2,'0');
    return b;
  }
  for(const role of CabinCharacters.roles){
    const outfit=CabinBotCatalog.roleOutfit(role.id);
    const kit=role.id==='beat'?room.fixtures.drumKit:null;
    const spot=kit?.seat??(role===leadSinger?art.vocalSpot:null);
    const placement=spot?{x:spot[0],base:spot[1],z:spot[2]}:{};
    registerBot(CabinCharacters.make(scene,{...role,...placement,outfit},bots.length,kit));
  }
  for(const s of room.seats){
    const size=s.pickSize||[.60,.91,.56];
    s.hit=makeProxy(...size,s.x,s.pickY??.47,s.z,{kind:'seat',seat:s});
    if(s.bench){s.hit.rotation.y=s.yaw;s.hit.updateMatrixWorld();}
  }
  for(const l of room.landmarks){
    const counter=l.action==='bar';
    const size=l.pickSize??(counter?[4.9,1.1,.44]:[1.3,1,.44]);
    makeProxy(...size,l.x,l.y-(counter?.50:0),l.z,{kind:'station',station:l});
  }
  for(const exhibit of room.exhibits){
    for(const {size,center,parent,hint} of exhibit.hits){
      makeProxy(...size,...center,{kind:'exhibit',exhibit,hint},parent);
    }
  }
  const portalHit=room.portal.hit;
  makeProxy(...portalHit.size,...portalHit.center,{kind:'portal',hint:'树洞 · 进入且曼教室'},portalHit.parent,portalHit.geometry);
  for(const {city,size,center,parent} of art.stagePhotos){
    const exhibit=room.exhibits.find(item=>item.city===city);
    if(exhibit)makeProxy(...size,...center,{kind:'exhibit',exhibit,hint:city+' · 小屋照片　看故事'},parent);
  }
  const cardSpots={singer:{x:-4.33,z:-2.04},vocal:{x:-2.3,z:-1.61},beat:{x:-.13,z:-3.20},bar:{x:3.7,z:-1.2}};
  function toast(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
  function notify(msg,force=false){if(!entered||(!force&&elapsed-lastEvent<5))return;$('ambientEvent').textContent=msg;lastEvent=elapsed;}
  const barOrders=new Map(),barSpots=[{x:3.39,z:-1.39},{x:4.49,z:-1.39}];
  let nextDrinkTrip=0;
  const inStageAisle=({x,z})=>x>-.78&&x<1.65&&z>-3.12&&z<1.10;
  function crossesOccupant(other,from,to,radius,margin){
    const p=other.root.position,clearance=radius+other.radius+margin,motion=other.seatMotion;
    if(!motion)return !nav.misses(from,to,p.x,p.z,clearance);
    const end=motion.destination;
    if(!nav.corridorsClear(from,to,p,end,clearance))return true;
    // The walker unfolds at the exit of a tightly spaced bench.
    return motion.rising&&other.standingRadius>other.radius&&
      !nav.misses(from,to,end.x,end.z,radius+other.standingRadius+margin);
  }
  function blocker(b,from,to,clearanceRadius=b.radius,margin=contacts.padding+.004){
    const inTheWay=other=>other!==b&&crossesOccupant(other,from,to,clearanceRadius,margin);
    if(player.root.visible&&inTheWay(player))return player;
    return bots.find(inTheWay);
  }
  function canPass(b,from,to){return !blocker(b,from,to);}
  function takeCup(bot){
    const point=bot.root.position;
    const reach=T.MathUtils.lerp(bot.cupRadius,Math.min(bot.cupRadius,bot.benchLimit),bot.benchMix);
    if(reach>bot.radius&&blocker(bot,point,point,reach,contacts.padding))return false;
    bot.hasCup=true;return true;
  }
  let lastPlanFrame=-1,agentPlans=0;
  function plan(b,goal,pass){
    const from=b.root.position;
    function clearance(other){
      const p=other.root.position,reach=b.radius+other.radius+contacts.padding;
      // Leave a little steering room except when already standing just beside this bot.
      const room=Math.max(0,Math.hypot(from.x-p.x,from.z-p.z)-reach-.001);
      return {x:p.x,z:p.z,r:reach+Math.min(b===player?.004:.014,room)};
    }
    // Walkers can make room locally. Plan around a particular walker only
    // if actual contact showed that there was no space to displace it.
    const discs=[];
    for(const other of bots){
      if(other!==b&&(other===pass?.other||!contacts.canYield(other)))discs.push(clearance(other));
    }
    if(player.root.visible&&b!==player)discs.push(clearance(player));
    const radius=b.routeRadius;
    if(bots.length>=24&&b!==player){
      if(!pass&&nav.segment(from,goal,radius,discs))return [goal];
      // Stagger expensive routes in a crowd. Player input always has an immediate route.
      if(lastPlanFrame!==elapsed){lastPlanFrame=elapsed;agentPlans=0;}
      if(agentPlans>=2)return null;
      agentPlans++;
    }
    if(pass?.x!==undefined&&Math.hypot(goal.x-from.x,goal.z-from.z)>.62){
      const {other,x,z}=pass,p=other.root.position,offset=b.radius+other.radius+.065;
      for(const side of [1,-1]){
        // Each Bot first tries its right. Facing Bots therefore choose opposite sides.
        const rightX=z*side*offset,rightZ=-x*side*offset;
        const approach={x:p.x+rightX-x*offset*.72,z:p.z+rightZ-z*offset*.72};
        const exit={x:p.x+rightX+x*offset*.57,z:p.z+rightZ+z*offset*.57};
        if(!nav.segment(from,approach,radius,discs)||!nav.segment(approach,exit,radius,discs))continue;
        const onward=nav.route(exit,goal,radius,discs);
        if(onward)return nav.roundCorners(from,[approach,exit,...onward],radius,discs);
      }
    }
    if(pass?.localOnly)return null;
    const path=nav.route(from,goal,radius,discs);
    return path&&nav.roundCorners(from,path,radius,discs);
  }
  function walk(b,goal,done,status,path=plan(b,goal)){
    if(!path)return false;
    b.walk={path,goal:path[path.length-1],done,blockedAt:null,retryAt:0};
    b.speed=0;b.status=status;b.hold=null;return true;
  }
  function yawDelta(from,to){
    const angle=to-from;
    return Math.atan2(Math.sin(angle),Math.cos(angle));
  }
  function turnTo(b,yaw,dt){
    const turn=yawDelta(b.root.rotation.y,yaw)*(1-Math.exp(-8*dt));
    b.root.rotation.y+=T.MathUtils.clamp(turn,-4.8*dt,4.8*dt);
  }
  function seatPoint(b,s){
    const forward=s.stool?0:Math.max(.04,b.depth*.5-.235);
    return {x:s.x+Math.sin(s.yaw)*forward,z:s.z+Math.cos(s.yaw)*forward};
  }
  function clearSeatPassage(b,s,entry,target){
    if(!s.bench)return canPass(b,entry,target);
    // Tuck in at the aisle before sliding onto the cushion. On the return,
    // the full walking footprint must fit at the same landing.
    return !blocker(b,entry,entry,b.standingRadius)&&
      !blocker(b,entry,target,Math.min(b.standingRadius,s.benchRadius));
  }
  function seatEntrance(b,s,reachable){
    const target=seatPoint(b,s);
    const forwardX=Math.sin(s.yaw),forwardZ=Math.cos(s.yaw);
    return nav.approach(s,b.routeRadius,p=>{
      const front=(p.x-s.x)*forwardX+(p.z-s.z)*forwardZ;
      return (!s.backrest||front>.18)&&clearSeatPassage(b,s,p,target)&&(!reachable||reachable(p));
    });
  }
  function seatRoute(b,s){
    let path;
    // In a narrow aisle, a clear landing can still be cut off from the
    // walker. Try the other suitable landings before giving up.
    seatEntrance(b,s,p=>{path=plan(b,p);return !!path;});
    return path;
  }
  function settleInSeat(b,s){
    const centre=seatPoint(b,s);
    b.benchLimit=s.benchRadius??Infinity;b.benchMix=s.bench?1:0;
    s.occupied=b.id;s.reserved=null;b.targetSeat=null;b.returnSeat=null;b.seat=s.id;
    b.root.position.set(centre.x,s.surfaceY-.014,centre.z);
    b.root.rotation.y+=yawDelta(b.root.rotation.y,s.yaw);
    b.speed=0;b.walk=null;b.status=b.hasCup?'坐着慢慢喝':'坐着听歌';
    if(b===player){
      $('seatBadge').hidden=false;
      targetLook(pos.x+Math.sin(s.yaw)*2,pos.y+.65,pos.z+Math.cos(s.yaw)*2);
      notify('你坐在'+s.label,true);
      finishPlayerSeatMotion();return;
    }
    holdSeat(b);
    notify(b.name+' 在'+s.label+'坐下了');
  }
  function holdSeat(b){
    const duration=b.hasCup?18+Math.random()*10:150+Math.random()*90;
    b.hold={kind:'seat',until:elapsed+duration};
  }
  function startSeatMotion(b,seat,entry,rising){
    const centre=seatPoint(b,seat),height=seat.surfaceY-.014;
    const distance=Math.hypot(centre.x-entry.x,centre.z-entry.z);
    const fromYaw=b.root.rotation.y;
    const finalYaw=rising?Math.atan2(entry.x-centre.x,entry.z-centre.z):seat.yaw;
    b.benchLimit=seat.benchRadius??Infinity;
    b.seatMotion={seat,entry,centre,height,rising,destination:rising?entry:centre,
      time:0,duration:.91+distance*.36+height*.24,fromYaw,turn:yawDelta(fromYaw,finalYaw),
      seated:rising?1:0,lean:0};
    contacts.track(b);
    b.speed=0;b.walk=null;b.hold=null;
    b.status=rising?'正在起身':'正在坐下';
  }
  function beginSitting(b,s){
    if((s.occupied&&s.occupied!==b.id)||s.reserved!==b.id)return false;
    const {x,z}=b.root.position;
    if(!clearSeatPassage(b,s,b.root.position,seatPoint(b,s)))return false;
    startSeatMotion(b,s,{x,z},false);
    return true;
  }
  function beginDrinkTrip(b,sound){
    b.hold={kind:'seat',until:Math.max(elapsed,nextDrinkTrip)+18+Math.random()*22};
    if(!entered||elapsed<nextDrinkTrip||barOrders.size||sound?.singing()||sound?.isServing('bar')||
      !openGuestSeats().length)return;
    const seat=room.seats[b.seat],entry=seatEntrance(b,seat);
    const spot=barSpots.find(p=>canPass(b,p,p));
    if(!entry||!spot)return;
    b.returnSeat=seat;
    barOrders.set(b.id,spot);
    nextDrinkTrip=elapsed+90;
    startSeatMotion(b,seat,entry,true);
  }
  function advanceSeatMotion(b,dt){
    const motion=b.seatMotion,{seat,entry,centre,height,rising}=motion;
    motion.time=Math.min(motion.duration,motion.time+dt);
    const t=motion.time/motion.duration,intoSeat=rising?1-t:t;
    const ease=T.MathUtils.smootherstep;
    const bench=!!seat.approachDirection;
    b.benchMix=bench?ease(intoSeat,0,.32):0;
    const across=ease(intoSeat,bench ? .34 : .16,.92);
    // Lift the base above the seat rim before the horizontal path reaches it.
    const clearance=Math.min(.05,height*.35);
    const lift=(height+clearance)*ease(intoSeat,.08,bench ? .44 : .55)-clearance*ease(intoSeat,.70,1);
    b.root.position.set(T.MathUtils.lerp(entry.x,centre.x,across),lift,
      T.MathUtils.lerp(entry.z,centre.z,across));
    contacts.track(b);
    b.root.rotation.y=motion.fromYaw+motion.turn*ease(t,0,.71);
    motion.seated=ease(intoSeat,.67,1);
    motion.lean=.090*Math.sin(Math.PI*across);
    if(t<1)return;

    b.seatMotion=null;
    if(!rising){
      settleInSeat(b,seat);
      return;
    }
    seat.occupied=null;
    b.seat=null;b.benchMix=0;b.benchLimit=Infinity;
    if(b===player){finishPlayerSeatMotion();return;}
    seat.reserved=b.id;
    order(b);
  }
  function releaseTripReservations(b){
    // A blocked return route keeps the Bot's original seat reserved.
    if(b.targetSeat?.reserved===b.id&&b.targetSeat!==b.returnSeat)b.targetSeat.reserved=null;
    b.targetSeat=null;barOrders.delete(b.id);
  }
  function abandon(b){
    if(b===player){cancelPath();toast('过道有点挤，换个落脚点试试');return;}
    releaseTripReservations(b);b.walk=null;b.speed=0;
    b.status='等旁边的伙伴先过';b.hold={kind:'idle',until:elapsed+.55+Math.random()};
  }
  function openGuestSeats(near){
    const free=room.seats.filter(s=>!s.occupied&&!s.reserved);
    // Keep a seat near the entrance available for the player.
    if(free.length&&player.seat===null&&!player.targetSeat){
      const distance=s=>(s.x-landing.x)**2+(s.z-landing.z)**2;
      const closest=free.reduce((best,s)=>distance(s)<distance(best)?s:best);
      free.splice(free.indexOf(closest),1);
    }
    if(near){
      const distance=s=>(s.x-near.x)**2+(s.z-near.z)**2;
      free.sort((a,c)=>distance(a)-distance(c));
    }
    return free;
  }
  function findSeat(b){
    const free=b.returnSeat?[b.returnSeat]:openGuestSeats(b.root.position);
    const attempts=bots.length>=24?Math.min(4,free.length):free.length;
    for(let i=0;i<attempts;i++){
      const s=free[i],path=seatRoute(b,s);
      if(!path)continue;
      const status=b.returnSeat?'回原来的座位':'去'+s.label;
      if(walk(b,path.at(-1),()=>{if(!beginSitting(b,s))abandon(b);},status,path)){
        s.reserved=b.id;b.targetSeat=s;return;
      }
    }
    b.status=free.length?'等过道空一点':'在旁边等座';
    b.hold={kind:'idle',until:elapsed+4+Math.random()*4};
  }
  function alreadyHeadingThere(b,goal){
    return bots.some(o=>o!==b&&o.walk&&Math.hypot(o.walk.goal.x-goal.x,o.walk.goal.z-goal.z)<b.radius+o.radius+.08);
  }
  function order(b){
    if(walk(b,barOrders.get(b.id),()=>{
      b.status='在吧台点单';b.hold={kind:'ordering',until:elapsed+2.8};
      notify(b.name+' 到吧台点了一杯'+['梅子酒','豆奶','果汁气泡'][b.ix%3]);
    },'走向吧台'))return;
    barOrders.delete(b.id);
    findSeat(b);
  }
  function isTalking(b){
    return ((drawerMode==='bot'||drawerMode==='outfit')&&selectedId===b.id)||b.waitForGuestUntil>elapsed;
  }
  function walkingPeer(b,other){
    return !!other?.walk?.path.length&&contacts.canYield(b)&&contacts.canYield(other)&&!isTalking(other);
  }
  function tryPassing(b,other,x,z){
    const trip=b.walk;
    if(elapsed<trip.retryAt||other?.walk?.yielding?.other===b)return false;
    trip.retryAt=elapsed+.65+Math.min(.20,b.ix*.022);
    const peer=walkingPeer(b,other)&&!other.walk.yielding;
    let detour=plan(b,trip.goal,other?{other,x,z,localOnly:peer}:null);
    if(!detour&&peer){
      // When a shoulder is too narrow, let just one walker clear the lane.
      const lowerPriority=(b.ix-other.ix||b.id.localeCompare(other.id))>0;
      const first=lowerPriority?b:other,second=lowerPriority?other:b;
      if(yieldPath(first,second)||yieldPath(second,first))return true;
      if(lowerPriority)detour=plan(b,trip.goal,{other});
    }
    if(!detour)return false;
    trip.path=detour;return true;
  }
  function clearStep(b,from,to){
    // Allow a Bot that is already shoulder-to-shoulder to move outward.
    return nav.segment(from,to,b.routeRadius)&&!blocker(b,from,to,b.radius,contacts.padding);
  }
  function findSideStep(b,from,heading,passer){
    let nearby=null;
    const distances=passer?[.46,.72,1.16,1.65]:[.72,1.16,1.65,.45];
    for(const distance of distances){
      for(const turn of [-Math.PI/2,Math.PI/2,-2.38,2.38,Math.PI]){
        const goal={x:from.x+Math.sin(heading+turn)*distance,z:from.z+Math.cos(heading+turn)*distance};
        if(!clearStep(b,from,goal)||alreadyHeadingThere(b,goal))continue;
        if(passer&&!routeClearOf(goal,passer.root.position,passer.walk.path,b.radius+passer.radius+.04))continue;
        if(passer||!inStageAisle(goal))return goal;
        nearby??=goal;
      }
    }
    return nearby;
  }
  function yieldPath(b,other){
    const from=b.root.position,trip=b.walk,next=trip.path[0];
    const heading=Math.atan2(next.x-from.x,next.z-from.z);
    const x=Math.sin(heading),z=Math.cos(heading);
    const path=[];
    let side=findSideStep(b,from,heading,other);
    if(!side){
      // Back up along the lane to a gap between pieces of furniture.
      for(const distance of [.50,.92,1.42]){
        const behind={x:from.x-x*distance,z:from.z-z*distance};
        if(!clearStep(b,from,behind))break;
        side=findSideStep(b,behind,heading,other);
        if(side){path.push(behind);break;}
      }
    }
    if(!side)return false;
    path.push(side);
    trip.yielding={other,x,z,status:b.status};
    trip.path=path;trip.blockedAt=null;trip.retryAt=0;
    b.speed=0;b.status='往旁边让路';
    return true;
  }
  function resumeAfterYield(b,trip){
    if(elapsed<trip.retryAt)return;
    const {other,x,z,until,status}=trip.yielding;
    const from=b.root.position,p=other.root.position,clearance=b.radius+other.radius+.08;
    if(elapsed<until&&walkingPeer(b,other)&&
      (p.x-from.x)*x+(p.z-from.z)*z>-clearance&&
      !routeClearOf(from,p,other.walk.path,clearance+.48))return;
    const path=plan(b,trip.goal);
    if(!path){
      if(elapsed>=until+3)abandon(b);
      else trip.retryAt=elapsed+.28;
      return;
    }
    trip.path=path;trip.yielding=null;trip.blockedAt=null;trip.retryAt=0;b.status=status;
  }
  function stepAside(b,x,z){
    const sidestep=findSideStep(b,b.root.position,Math.atan2(x,z));
    if(!sidestep)return false;
    releaseTripReservations(b);
    return walk(b,sidestep,()=>{
      const inPassage=inStageAisle(b.root.position);
      b.status=inPassage?'等过道空一点':'在旁边歇一会儿';
      b.hold={kind:'idle',until:elapsed+(inPassage?.65:2.7)+Math.random()*(inPassage?.60:2.4)};
    },'往旁边让路',[sidestep]);
  }
  function waitForPassage(b,other,x,z){
    const trip=b.walk;
    const from=b.root.position;
    if(trip.blockedAt===null){
      trip.blockedAt=elapsed;trip.blockedX=from.x;trip.blockedZ=from.z;
    }
    const waited=elapsed-trip.blockedAt;
    if(trip.yielding){
      if(waited>.45){trip.path.length=0;trip.yielding.until=elapsed+.78;b.speed=0;}
      return;
    }
    if(b===player){
      if(waited>4&&(!other||(!contacts.canYield(other)&&!other.seatMotion))){abandon(b);return;}
    }else{
      // Stagger retreats so one Bot can clear space for the others.
      const patience=inStageAisle(from)?1.25+(b.ix%5)*.19:3.8+(b.ix%5)*.19;
      if(waited>=patience&&elapsed>=(trip.nextYieldAt??0)){
        trip.nextYieldAt=elapsed+.45;
        if(stepAside(b,x,z))return;
        if(waited>=patience+1.1){abandon(b);return;}
      }
    }
    tryPassing(b,other,x,z);
  }
  function advance(b,dt){
    const trip=b.walk,p=b.root.position,cruise=b.walkSpeed;
    if(!trip.path.length){resumeAfterYield(b,trip);return;}
    const horizon=b===player?.54:.81;
    let path=trip.path;
    const vx=path[0].x-p.x,vz=path[0].z-p.z,headingLength=Math.hypot(vx,vz);
    const alongX=vx/(headingLength||1),alongZ=vz/(headingLength||1);
    const firstHorizon=path.length===1?Math.min(horizon,headingLength/cruise):horizon;
    const risk=!trip.yielding&&contacts.ahead(b,alongX*cruise,alongZ*cruise,firstHorizon,contacts.canYield(b));
    if(risk){
      const other=risk.bot,flow=other.vx*alongX+other.vz*alongZ;
      if(flow<cruise*.35||trip.blockedAt!==null){
        if(tryPassing(b,other,alongX,alongZ))path=trip.path;
      }
    }
    const next=path[0],after=path[1];
    const dx=next.x-p.x,dz=next.z-p.z,distance=Math.hypot(dx,dz);
    const acceleration=b===player?5.2:2.1,braking=b===player?6.5:2.35;
    let remaining=distance;
    for(let i=1;i<path.length&&remaining<cruise*cruise/(2*braking);i++){
      remaining+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);
    }
    // Allow for the next frame's travel when braking, with room for the final short step.
    const brakingDistance=Math.max(remaining*.55,remaining-b.speed*dt);
    let targetSpeed=Math.min(cruise,Math.sqrt(2*braking*brakingDistance));
    let traffic=null;
    if(distance>.001){
      const remainingHorizon=after?horizon:Math.min(horizon,distance/cruise);
      traffic=contacts.ahead(b,dx/distance*cruise,dz/distance*cruise,remainingHorizon);
      if(traffic){
        const lead=Math.max(0,(traffic.bot.vx*dx+traffic.bot.vz*dz)/distance);
        targetSpeed=Math.min(targetSpeed,lead+Math.sqrt(2*braking*Math.max(0,traffic.distance-.004)));
      }
      const heading=Math.atan2(dx,dz);
      let facing=heading;
      if(after){
        const bend=yawDelta(heading,Math.atan2(after.x-next.x,after.z-next.z));
        const cornerSpeed=cruise*(.24+.76*Math.max(0,Math.cos(bend)));
        targetSpeed=Math.min(targetSpeed,Math.sqrt(cornerSpeed*cornerSpeed+2*braking*distance));
        facing+=bend*.62*(1-T.MathUtils.smoothstep(distance,0,.28));
      }
      turnTo(b,facing,dt);
      targetSpeed*=.48+.52*Math.max(0,Math.cos(yawDelta(b.root.rotation.y,heading)));
    }
    const previous=b.speed;
    b.speed+=T.MathUtils.clamp(targetSpeed-b.speed,-braking*dt,acceleration*dt);
    let travel=(previous+b.speed)*.5*dt;
    if(travel<.0001&&traffic){
      waitForPassage(b,traffic.bot,dx/distance,dz/distance);return;
    }
    while(path.length){
      const waypoint=path[0],x=waypoint.x-p.x,z=waypoint.z-p.z,length=Math.hypot(x,z);
      const arrived=length<=travel;
      const wanted=arrived?length:travel;
      const oldX=p.x,oldZ=p.z;
      const other=contacts.move(b,length?x*wanted/length:0,length?z*wanted/length:0,dt);
      const moved=Math.hypot(p.x-oldX,p.z-oldZ);
      // Contact can move a Bot a few millimetres without actually clearing the queue.
      if(b!==player&&trip.blockedAt!==null&&Math.hypot(p.x-trip.blockedX,p.z-trip.blockedZ)>.24)trip.blockedAt=null;
      if(moved+.00008<wanted){
        b.speed=Math.min(b.speed,moved/dt);
        waitForPassage(b,other,x/length,z/length);return;
      }
      if(b===player)trip.blockedAt=null;
      if(!arrived||(b===player&&path.length===1&&p.y>0))return;
      path.shift();
      travel-=length;
    }
    b.speed=0;
    if(trip.yielding){trip.yielding.until=elapsed+1.05;return;}
    b.walk=null;trip.done?.();
  }
  function routeClearOf(point,start,path,clearance){
    let last=start;
    for(const next of path||[]){
      if(!nav.misses(last,next,point.x,point.z,clearance))return false;
      last=next;
    }
    return true;
  }
  // Fill the room in a dispersed order. Keep a clear aisle from the front door
  // and leave standing room at the counter, stage and exhibit viewing points.
  const arrivalPoints=[];
  const visitPoints=[...Object.values(cardSpots),...barSpots,...room.exhibits.map(e=>({x:e.from[0],z:e.from[1]}))];
  function reservedFloor(x,z){
    return (Math.abs(x-landing.x)<.58&&z>-.8)||visitPoints.some(p=>Math.hypot(p.x-x,p.z-z)<.52);
  }
  for(let row=0,z=-4.95;z<5;row++,z+=.46){
    for(let x=-6.26+(row%2)*.24;x<6.3;x+=.48){
      if(reservedFloor(x,z))continue;
      if(nav.clear(x,z,.12))arrivalPoints.push({x,z});
    }
  }
  const mix=K.seeded(719);
  for(let i=arrivalPoints.length-1;i>0;i--){
    const j=Math.floor(mix()*(i+1));
    [arrivalPoints[i],arrivalPoints[j]]=[arrivalPoints[j],arrivalPoints[i]];
  }
  let nextArrivalPoint=0;

  function guestSpawn(guest,nearby){
    const radius=guest.bodyRadius,walkRadius=Math.max(radius,guest.routeRadius);
    const visitor=entered?pos:landing;
    function canSpawn(p){
      if(!nav.clear(p.x,p.z,walkRadius)||Math.hypot(visitor.x-p.x,visitor.z-p.z)<radius+.58)return false;
      if(Math.abs(p.x-landing.x)<.58&&p.z>-.8)return false;
      if(!routeClearOf(p,pos,player.walk?.path,radius+player.radius+.02))return false;
      if(player.seatMotion&&crossesOccupant(player,p,p,radius,.02))return false;
      for(const b of bots){
        const centre=b.root.position,clearance=radius+b.radius+.018;
        if(crossesOccupant(b,p,p,radius,.018))return false;
        if(b.walk&&!nav.misses(centre,{x:centre.x+(b.vx||0)*.35,z:centre.z+(b.vz||0)*.35},p.x,p.z,clearance))return false;
      }
      return !!nav.route(p,landing,walkRadius);
    }
    if(nearby){
      const direction=entered?yaw:0;
      for(const distance of [2.2,1.6,2.9])for(const turn of [0,.45,-.45,.9,-.9,1.65,-1.65,Math.PI]){
        const p={x:visitor.x-Math.sin(direction+turn)*distance,z:visitor.z-Math.cos(direction+turn)*distance};
        if(canSpawn(p))return p;
      }
    }
    for(let i=0;i<arrivalPoints.length;i++){
      const p=arrivalPoints[nextArrivalPoint];
      nextArrivalPoint=(nextArrivalPoint+1)%arrivalPoints.length;
      if(canSpawn(p))return p;
    }
    // A walkable gap between dressed guests can fall between two regular
    // arrival points. Only pay for a closer search if the first pass is full.
    for(let z=-5;z<5.04;z+=.14){
      for(let x=-6.32;x<6.38;x+=.14){
        if(!reservedFloor(x,z)&&canSpawn({x,z}))return {x,z};
      }
    }
    return null;
  }
  function seatArrivingGuest(guest,preferNearest=false){
    const open=openGuestSeats(preferNearest?guest.root.position:null);
    const start=preferNearest?0:bots.length;
    for(let i=0;i<open.length;i++){
      const seat=open[(start+i)%open.length],centre=seatPoint(guest,seat);
      if(blocker(guest,centre,centre,Math.min(guest.standingRadius,seat.benchRadius??Infinity)))continue;
      settleInSeat(guest,seat);
      guest.x=centre.x;guest.z=centre.z;guest.sitMix=1;
      return true;
    }
    return false;
  }
  function discardArrival(guest){
    if(guest.seat!=null)room.seats[guest.seat].occupied=null;
    guest.shade.geometry.dispose();
  }
  function makeGuest(record,nearby=false){
    if(bots.length>=capacity)return null;
    const def=CabinBotCatalog.definition(record);
    const guest=CabinCharacters.make(new T.Group(),{...def,x:0,z:0},bots.length);
    fitCollision(guest);
    // Let the player meet a new arrival before it takes a seat.
    if(!nearby&&seatArrivingGuest(guest))return guest;
    const point=guestSpawn(guest,nearby);
    if(!point){
      if(nearby&&seatArrivingGuest(guest))return guest;
      discardArrival(guest);return null;
    }
    const visitor=entered?pos:landing;
    guest.x=point.x;guest.z=point.z;guest.root.position.set(point.x,0,point.z);
    guest.root.rotation.y=Math.atan2(visitor.x-point.x,visitor.z-point.z);
    guest.status='刚到小屋';guest.hold={kind:'idle',until:elapsed+2+Math.random()*4};
    return guest;
  }
  function createBot(raw){
    const checked=CabinBotCatalog.prepare(raw);
    if(!checked.ok)return checked;
    if(bots.length>=capacity)return {ok:false,error:'小屋已满员，同时最多容纳 '+capacity+' 位 Bot。'};
    const b=makeGuest(checked.record,true);
    if(!b)return {ok:false,error:'小屋过道暂时挤满了，等伙伴走开一点再试。'};
    try{CabinBotCatalog.save(checked.record);}
    catch{discardArrival(b);return {ok:false,error:'浏览器没能保存这位伙伴，请检查本地存储权限或剩余空间后再试。'};}
    return {ok:true,bot:registerBot(b)};
  }
  async function importGrok(raw){
    const checked=await CabinBotCatalog.prepareGrok(raw);
    if(!checked.ok)return checked;
    const record=checked.record,existing=byId(record.id);
    if(existing)return {ok:true,bot:existing,existed:true};
    if(waitingGuests.some(b=>b.id===record.id))return {ok:true,record,waiting:true};
    const guest=makeGuest(record,true);
    try{CabinBotCatalog.save(record);}
    catch{if(guest)discardArrival(guest);return {ok:false,error:'小屋未能保存这位伙伴。请在允许本地存储的浏览器打开。'};}
    if(guest)return {ok:true,bot:registerBot(guest)};
    waitingGuests.push(record);
    return {ok:true,record,waiting:true};
  }
  function showImportedBot(id){
    if(entered)greetArrival(id);
    else{grokArrival=id;enter();}
  }
  function greetArrival(id){
    const bot=byId(id);
    if(!bot)return;
    if(bot.community){
      if(overview)setOverview(false);
      cancelPath();
      const point=bot.root.position;
      targetLook(point.x,point.y+bot.faceHeight,point.z);
    }
    openPanel('bot',id);
  }
  function removeGuest(bot){
    for(const seat of room.seats){
      if(seat.occupied===bot.id)seat.occupied=null;
      if(seat.reserved===bot.id)seat.reserved=null;
    }
    barOrders.delete(bot.id);
    if(lastHover?.bot===bot)clearHover();
    bot.root.removeFromParent();
    bot.shade.geometry.dispose();
    bot.hit.removeFromParent();
    bot.hit.geometry.dispose();
    proxies.splice(proxies.indexOf(bot.hit),1);
    bots.splice(bots.indexOf(bot),1);residents.delete(bot.id);
  }
  function makeRoomForVisit(){
    if(bots.length<capacity)return true;
    const lastGuest=bots.slice().reverse().find(b=>(b.community||b.id.startsWith('guest-'))&&b.id!==selectedId&&
      !window.CabinWork?.singing(b.id)&&!window.CabinWork?.playingGuitar(b.id)&&!window.CabinWork?.isBeating(b.id));
    if(!lastGuest)return false;
    if(!lastGuest.community){
      const saved=CabinBotCatalog.all().find(r=>r.id===lastGuest.id);
      if(!saved)return false;
      waitingGuests.push(saved);
    }
    removeGuest(lastGuest);
    $('botCount').textContent=String(bots.length).padStart(2,'0');
    return true;
  }
  function visitWaitingGuest(id){
    const record=waitingGuests.find(r=>r.id===id);
    if(!record||!makeRoomForVisit())return;
    const guest=makeGuest(record,true);
    if(!guest){toast('过道暂时拥挤，稍后可以再进场');return;}
    waitingGuests.splice(waitingGuests.indexOf(record),1);
    registerBot(guest);
    showImportedBot(id);
  }
  function syncCommunityBots(profiles,featuredId){
    const desired=new Map();
    const privateGuests=bots.filter(b=>!b.community);
    let limit=capacity-privateGuests.length;
    // Visiting a named public Bot also works in a room filled entirely with
    // saved residents. Keep the displaced resident in the normal admission queue.
    if(limit===0&&featuredId&&profiles[0]?.id===featuredId&&makeRoomForVisit())limit++;
    if(featuredId&&limit>0){
      const record=CabinBotCatalog.fromCommunity(profiles[0]);
      if(record?.id===featuredId)desired.set(record.id,record);
    }
    const reading=byId(selectedId);
    if(reading?.community&&desired.size<limit)desired.set(reading.id,reading);
    for(const raw of profiles){
      if(desired.size>=limit)break;
      if(desired.has(raw.id))continue;
      const record=byId(raw.id)||CabinBotCatalog.fromCommunity(raw);
      if(record?.community)desired.set(record.id,record);
    }
    let changed=false;
    for(const bot of bots.slice()){
      if(bot.community&&!desired.has(bot.id)){removeGuest(bot);changed=true;}
    }
    for(const record of desired.values()){
      if(byId(record.id))continue;
      const guest=makeGuest(record,record.id===featuredId);
      if(guest){registerBot(guest);changed=true;}
    }
    if(changed){
      $('botCount').textContent=String(bots.length).padStart(2,'0');
      if(drawerMode==='roster')window.CabinWork?.render('roster');
    }
  }
  function setBotOutfit(id,raw){
    const b=byId(id);
    if(!b)return {ok:false,error:'找不到这位伙伴。'};
    const outfit=CabinBotAccessories.normalize(raw);
    if(Object.keys(outfit).every(key=>outfit[key]===b.outfit[key]))return {ok:true};
    const model=CabinBotAccessories.build(b.shape,b.body,outfit),previousSize=b.pickSize;
    const body=CabinCharacters.bodyRadius(b,model),radius=collisionRadius(b,body),point=b.root.position;
    const reach=T.MathUtils.lerp(radius,Math.min(radius,b.benchLimit),b.benchMix);
    if(reach>b.radius&&blocker(b,point,point,reach,contacts.padding))
      return {ok:false,error:'身边有伙伴，等它让出一点空间再换装。'};
    try{CabinBotCatalog.saveOutfit(id,outfit);}
    catch{return {ok:false,error:'浏览器未能保存装饰，稍后可以再试。'};}
    CabinCharacters.dress(b,outfit,model);
    fitCollision(b,body);
    if(b.pickSize.some((size,i)=>size!==previousSize[i])){
      b.hit.geometry.dispose();b.hit.geometry=new T.BoxGeometry(...b.pickSize);
    }
    return {ok:true};
  }
  for(const seat of room.seats){
    if(seat.initialGuest)settleInSeat(byId(seat.initialGuest),seat);
  }
  for(const b of bots){
    if(cardSpots[b.id]||b.seat!=null)continue;
    if(!seatArrivingGuest(b,true))b.hold={kind:'idle',until:1.5+b.ix*.8};
  }
  const waitingGuests=publicSite?[]:CabinBotCatalog.all();
  function admitSavedGuests(){
    while(waitingGuests.length&&bots.length<capacity){
      const b=makeGuest(waitingGuests[0]);
      if(!b)break;
      registerBot(b);waitingGuests.shift();
    }
  }
  admitSavedGuests();
  let nextAdmission=8;
  function tickAgents(dt){
    if(waitingGuests.length&&elapsed>=nextAdmission){admitSavedGuests();nextAdmission=elapsed+8;}
    const snd=window.CabinWork;
    for(const b of bots){const talking=isTalking(b);
      if(b.seatMotion)advanceSeatMotion(b,dt);
      else if(!talking&&b.walk)advance(b,dt);
      else if(!talking&&b.hold&&elapsed>b.hold.until){
        const kind=b.hold.kind;b.hold=null;
        if(kind==='ordering'){
          takeCup(b);barOrders.delete(b.id);findSeat(b);
        }else if(kind==='seat'){
          if(b.hasCup){
            b.hasCup=false;b.status='坐着听歌';holdSeat(b);
          }else beginDrinkTrip(b,snd);
        }else findSeat(b);
      }
      b.listening=talking||b.walk?.blockedAt!=null;
      if(talking)b.speed=0;
      if(!b.seatMotion&&talking&&b.seat==null&&!cardSpots[b.id])turnTo(b,Math.atan2(pos.x-b.root.position.x,pos.z-b.root.position.z),dt);
      else if(b.hold?.kind==='ordering')turnTo(b,Math.PI,dt);
      CabinCharacters.animate(b,tNow,dt,b.props.guitar?snd?.guitarCue(b.id):null,
        (b.id==='bar'&&barOrders.size>0)||!!snd?.isServing(b.id),!!snd?.isBeating(b.id),
        b.props.kit?snd?.kitCue(b.id):null,b.props.voice?snd?.vocalCue(b.id):null);
    }
    // A later walker may have nudged an earlier one. Use the final positions
    // for both next frame's motion prediction and this frame's click targets.
    for(const b of bots){
      const p=b.root.position;
      b.travelX=(p.x-b.frameStartX)/dt;b.travelZ=(p.z-b.frameStartZ)/dt;
      const liftY=b.motion.position.y*b.model.scale.y;
      b.hit.position.set(p.x,p.y+(b.visualHeight+liftY)/2,p.z);
      b.hit.rotation.y=b.root.rotation.y;b.hit.scale.y=b.motion.scale.y*b.seatedHeightScale;b.hit.updateMatrixWorld();
      roomLights.contactShadow(b);
    }
    byId('singer').status=snd?.playingGuitar('singer')?'正在弹吉他':'抱琴候场';
    byId('vocal').status=snd?.singing('vocal')?'正在演唱':'麦克风前候场';
    byId('beat').status=snd?.followingMusic('beat')?'随音乐跟拍':snd?.isBeating('beat')?'正在打架子鼓':'鼓凳上候场';
    byId('bar').status=barOrders.size||snd?.isServing('bar')?'正在调饮':'照看吧台';
  }
  const ray=new T.Raycaster(),mouse=new T.Vector2(),ground=new T.Plane(new T.Vector3(0,1,0),0),floorHit=new T.Vector3();
  function cast(e){
    const {left,top,width,height}=canvasBox;
    mouse.set((e.clientX-left)/width*2-1,1-(e.clientY-top)/height*2);
    ray.setFromCamera(mouse,camera);
  }
  function visibleSceneTarget(hit){
    // Leave room for trim and accessories on the object being picked.
    const previousFar=ray.far,blockers=[];
    ray.far=Math.max(0,hit.distance-.16);
    scene.traverseVisible(o=>{
      if(!blockers.length&&o.isMesh&&o.material.visible&&!o.material.transparent){
        ray.intersectObject(o,false,blockers);
      }
    });
    ray.far=previousFar;
    return !blockers.length;
  }
  function pick(e,hover=false){
    cast(e);
    // A door leaf moves during entry and disappears with the roof in cutaway view.
    const active=proxies.filter(proxy=>{
      if(proxy.parent===scene)return true;
      for(let p=proxy.parent;p;p=p.parent)if(!p.visible)return false;
      proxy.updateWorldMatrix(true,false);
      return true;
    });
    const hits=ray.intersectObjects(active,false);
    const first=hits[0];
    if(!first||(!overview&&first.distance>16.5))return null;
    // A work station covers a whole desk. Its tabletop or song board has its own story.
    if(first.object.userData.kind==='station'){
      const detail=hits.find(h=>h.distance-first.distance<.65&&h.object.userData.kind==='exhibit');
      if(detail&&visibleSceneTarget(detail))return detail.object.userData;
    }
    const target=first.object.userData;
    if((target.exhibit||target.kind==='portal'||(hover&&target.bot))&&!visibleSceneTarget(first))return null;
    return target;
  }
  function finishPlayerSeatMotion(){
    const action=afterSeatMotion;afterSeatMotion=null;action?.();
  }
  function stand(silent=false,after=null){
    if(player.seatMotion){
      afterSeatMotion=player.seatMotion.rising?after:()=>stand(silent,after);
      return true;
    }
    if(player.seat==null)return false;
    const seat=room.seats[player.seat],entry=seatEntrance(player,seat);
    if(!entry){toast('等旁边的伙伴让出过道再起身');return false;}
    afterSeatMotion=after;desiredLook=null;
    startSeatMotion(player,seat,entry,true);$('seatBadge').hidden=true;
    if(!silent)toast('正在起身');
    return true;
  }
  function cancelPath(){
    if(player.walk){player.walk=null;player.speed=0;}
    afterSeatMotion=null;
    if(!player.seatMotion&&player.targetSeat){player.targetSeat.reserved=null;player.targetSeat=null;}
  }
  function jumpPlayer(){
    if(!entered||document.hidden||jumpSpeed!==null||overview||drawerMode||mapDialog.open||classroomDialog.open)return;
    if(player.seat!==null||player.seatMotion){stand(true,jumpPlayer);return;}
    cancelPath();
    desiredLook=null;framedExhibit=null;
    const maximumRise=Math.max(.16,jumpApex-pos.y);
    const rise=moveKeys.some(key=>keys.has(key))?maximumRise:Math.min(idleJumpRise,maximumRise);
    jumpSpeed=Math.sqrt(2*jumpGravity*rise);
  }
  function pathPlayer(target,done,path){
    clearKeys();cancelPath();framedExhibit=null;desiredLook=null;
    if(player.seat!=null||player.seatMotion)return stand(true,()=>pathPlayer(target,done));
    if(!walk(player,target,done,'在屋里走动',path)){toast('那里走不过去，请换一个落脚点');return false;}
    const end=player.walk.goal;
    movePoint.position.set(end.x,.032,end.z);movePoint.material.opacity=.88;
    return true;
  }
  function chooseSeat(s){
    if(overview)setOverview(false);
    if(s.occupied===player.id){stand();return;}
    if(s.occupied||s.reserved){toast('这个座位已经有人选了');return;}
    close();cancelPath();
    if(player.seat!=null||player.seatMotion){stand(true,()=>chooseSeat(s));return;}
    const path=seatRoute(player,s);
    if(!path){toast('通往这个座位的过道暂时被挡住了');return;}
    if(!pathPlayer(path.at(-1),()=>{if(!beginSitting(player,s)){cancelPath();toast('这个位置暂时坐不下');}},path))return;
    s.reserved=player.id;player.targetSeat=s;toast('去'+s.label+'坐下');
  }
  const roomCanvasHint=canvas.getAttribute('aria-label'),roomMotionHint=$('motionHelp').textContent;
  let desiredLook=null,overview=false,indoorFov=roomZoom;
  function setOverview(next){
    if(!entered&&next)return;
    overview=next;
    for(const o of room.loftHide)o.visible=!next;
    releaseCanvasPointer();clearHover();
    const toggle=$('overviewBtn');
    toggle.lastChild.textContent=next?'回屋内':'全屋';toggle.setAttribute('aria-pressed',String(next));
    main.classList.toggle('overview',next);
    $('motionHelp').textContent=next?'点 Bot 互动 · 点物件看故事 · 点地板回屋内':roomMotionHint;
    canvas.setAttribute('aria-label',next?'小屋全景。点机器人互动，点物件查看故事，点地板走进屋内。':roomCanvasHint);
    cutaway.stage.visible=next;
    scene.background.set(next?cutaway.background:0x435760);renderer.shadowMap.needsUpdate=true;
    interactiveUntil=elapsed+.45;
    if(next){
      indoorFov=camera.fov;
      desiredLook=null;framedExhibit=null;clearKeys();cancelPath();close();fitOverview();
    }else{
      camera.fov=indoorFov;
      camera.clearViewOffset();
    }
    canvas.focus({preventScroll:true});
  }
  $('overviewBtn').onclick=()=>setOverview(!overview);

  function targetLook(x,y,z){interactiveUntil=elapsed+.85;desiredLook={x,y,z};}
  function playerRouteBeside(bot,angle,extraClearance){
    const p=bot.root.position,gap=player.radius+bot.radius+contacts.padding+.008;
    for(const extra of extraClearance)for(const offset of [0,.45,-.45,.90,-.90,1.48,-1.48,2.25,-2.25,Math.PI]){
      const heading=angle+offset,distance=gap+extra;
      const goal={x:p.x+Math.sin(heading)*distance,z:p.z+Math.cos(heading)*distance};
      if(!nav.clear(goal.x,goal.z,player.routeRadius)||!canPass(player,goal,goal))continue;
      const path=plan(player,goal);
      if(path)return path;
    }
    return null;
  }
  function goFloor(destination){
    if(player.seat!=null||player.seatMotion){stand(true,()=>goFloor(destination));return;}
    let path=plan(player,destination);
    if(!path){
      const near=blocker(player,destination,destination);
      if(near&&!near.seatMotion){
        const centre=near.root.position;
        const from=Math.hypot(destination.x-centre.x,destination.z-centre.z)>.02?destination:pos;
        path=playerRouteBeside(near,Math.atan2(from.x-centre.x,from.z-centre.z),[0,.10]);
      }
    }
    pathPlayer(destination,undefined,path);
  }
  function goBot(id){
    if(overview)setOverview(false);
    const b=byId(id);if(!b)return;
    close();b.waitForGuestUntil=elapsed+10;
    const greet=()=>{targetLook(b.root.position.x,b.root.position.y+b.faceHeight,b.root.position.z);openPanel('bot',id);};
    if(cardSpots[id]){pathPlayer(cardSpots[id],greet);return;}
    if(player.seat!=null||player.seatMotion){stand(true,()=>goBot(id));return;}
    clearKeys();cancelPath();
    const p=b.root.position,dx=pos.x-p.x,dz=pos.z-p.z;
    if(Math.hypot(dx,dz)<player.radius+b.radius+.048){greet();return;}
    const path=playerRouteBeside(b,Math.atan2(dx,dz),[0,.10,.26,.53]);
    if(path)pathPlayer(path.at(-1),greet,path);else toast('它身边暂时没有落脚点');
  }
  // Width and height in metres of the group a visitor came to inspect.
  // Portrait and landscape use the same framing without cropping the subject.
  const objectFrame={
    丽江:[3.75,1.86],大理:[3.05,2.32],成都:[2.34,1.58],西塘:[1.79,1.20],苏州:[1.42,1.56],
    阳朔:[2.95,2.95],贵阳:[.64,.54],郑州:[3.4,2.86],临沂:[2.12,1.96],合肥:[1.09,1.14],
    重庆:[3.85,1.75],西安:[3.90,3.08],厦门:[1.91,.82],拉萨:[2.08,1.67],
    济南:[5.35,3.32],青岛:[2.05,1.85],武汉:[.88,1.26],长沙:[.52,.53]
  };
  let entranceExhibit=null,framedExhibit=null,inspectionZoom=0;
  function frameExhibit(exhibit){
    framedExhibit=exhibit;inspectionZoom=0;targetLook(...exhibit.look);
    notify(exhibit.city+' · '+exhibit.item+'　点物件看故事',true);
  }
  function visitExhibit(city){
    const exhibit=room.exhibits?.find(item=>item.city===city);
    if(!exhibit)return;
    close();
    if(!entered){
      entranceExhibit=city;
      enter();
      return;
    }
    if(overview)setOverview(false);
    clearKeys();
    const [x,z]=exhibit.from;
    desiredLook=null;
    if(pathPlayer({x,z},()=>frameExhibit(exhibit))){
      toast('去看'+exhibit.city+'的'+exhibit.item);
    }
    canvas.focus({preventScroll:true});
  }
  const exhibitDialog=$('exhibitDialog');
  const paperGrain=window.CabinSurfaceImages?.['exhibit-aged-paper.webp']||'textures/exhibit-aged-paper.webp';
  exhibitDialog.style.setProperty('--book-grain',`url("${paperGrain}")`);
  const indexGrain=window.CabinSurfaceImages?.['music-paper-tooth.webp']||'textures/music-paper-tooth.webp';
  $('drawer').style.setProperty('--index-grain',`url("${indexGrain}")`);
  const drawerWood=window.CabinSurfaceImages?.['timber-color.webp']||'textures/timber-color.webp';
  $('drawer').style.setProperty('--drawer-wood',`url("${drawerWood}")`);
  let exhibitReturn=null;
  function openPanel(which,id){
    if(publicSite&&['creator','exchange','outfit'].includes(which))return;
    if(!entered&&which!=='origins'&&which!=='exhibit'&&which!=='exchange')return;
    if(which==='exhibit'&&!room.exhibits.some(e=>e.city===id))return;
    clearKeys();clearHover();
    if(which==='exhibit'){
      if(drawerMode!=='exhibit'){
        exhibitReturn=drawerMode==='origins'?{city:id,scroll:$('drawerBody').scrollTop}:null;
      }
      cancelPath();
      $('drawer').hidden=true;
      $('drawerBody').replaceChildren();
    }else{
      if(exhibitDialog.open)exhibitDialog.close();
      exhibitReturn=null;
      $('drawer').hidden=false;
    }
    drawerMode=which;selectedId=id||null;main.classList.add('panel-open');
    window.CabinWork?.render(which,id);
    if(which==='exhibit'){
      if(!exhibitDialog.open)exhibitDialog.showModal();
      exhibitDialog.querySelector('.exhibit-scroll').scrollTop=0;
      $('exhibitClose').focus({preventScroll:true});
    }else{
      $('drawerBody').scrollTop=0;$('closeDrawer').focus({preventScroll:true});
    }
  }
  function close(){
    if(exhibitDialog.open)exhibitDialog.close();
    exhibitReturn=null;drawerMode=null;selectedId=null;
    $('drawer').hidden=true;main.classList.remove('panel-open');
  }
  function dismissExhibit(){
    const previous=exhibitReturn;
    close();
    if(previous){
      openPanel('origins');
      $('drawerBody').scrollTop=previous.scroll;
      $('drawerBody').querySelector('[data-story="'+previous.city+'"]')?.focus({preventScroll:true});
    }else{
      (entered?canvas:$('uploadBot')).focus({preventScroll:true});
    }
  }
  $('exhibitClose').onclick=dismissExhibit;
  exhibitDialog.addEventListener('cancel',e=>{e.preventDefault();dismissExhibit();});
  function outsideCard(e){
    const box=exhibitDialog.getBoundingClientRect();
    return e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom;
  }
  let backdropPress=false;
  exhibitDialog.addEventListener('pointerdown',e=>{backdropPress=e.target===exhibitDialog&&outsideCard(e);});
  exhibitDialog.addEventListener('click',e=>{
    if(backdropPress&&e.target===exhibitDialog&&outsideCard(e))dismissExhibit();
    backdropPress=false;
  });
  function enter(){
    if(entering||entered)return;
    const spawn=[landing,...[-.62,.62,-1.12,1.12].map(offset=>new T.Vector3(landing.x+offset,0,landing.z)),
      new T.Vector3(landing.x,0,landing.z+.32)].find(point=>nav.clear(point.x,point.z,player.routeRadius)&&canPass(player,point,point));
    if(!spawn){toast('门口有点挤，等伙伴走开再进屋');return;}
    releaseCanvasPointer();
    pos.copy(spawn);yaw=arrivalYaw;pitch=arrivalPitch;player.root.rotation.y=Math.PI+yaw;
    player.root.visible=true;playerView.reset();
    entering=true;doorProgress=0;doorShadowDirty=true;
    main.classList.add('entered');$('enter').disabled=true;$('entry').setAttribute('inert','');
    canvas.focus({preventScroll:true});
  }
  const pointer={id:null,x:0,y:0,lx:0,ly:0,moved:false};
  let hoverPoint=null,hoverDirty=false,lastHover=null,lastHoverTime=-Infinity,touchTap=null;
  function releaseCanvasPointer(){
    const id=pointer.id;
    pointer.id=null;canvas.classList.remove('drag');
    if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  }
  function clearHover(){
    hoverPoint=null;hoverDirty=false;lastHover=null;lastHoverTime=-Infinity;
    hoverTag.hidden=true;canvas.classList.remove('picking');
  }
  function updateHover(now,sceneMoving){
    if(!hoverPoint||(!hoverDirty&&!sceneMoving)||now-lastHoverTime<55)return;
    lastHoverTime=now;
    const h=pick(hoverPoint,true);
    const reposition=hoverDirty||h!==lastHover;
    hoverDirty=false;lastHover=h;
    canvas.classList.toggle('picking',!!h);
    if(!h){hoverTag.hidden=true;return;}
    const botLabel=h.bot?.job?`${h.bot.name} · ${h.bot.job}`:h.bot?.name;
    const label=h.hint??botLabel??(h.exhibit?h.exhibit.city+' · '+h.exhibit.item+'　看故事':h.seat?(h.seat.occupied||h.seat.reserved?'有人 · ':'落座 · ')+h.seat.label:h.station.name);
    if(!reposition&&hoverTag.textContent===label)return;
    const {left,top,width,height}=canvasBox;
    hoverTag.textContent=label;hoverTag.hidden=false;
    hoverTag.style.left=Math.max(8,Math.min(width-hoverTag.offsetWidth-7,hoverPoint.clientX-left+13))+'px';
    hoverTag.style.top=Math.max(4,Math.min(height-hoverTag.offsetHeight-4,hoverPoint.clientY-top+16))+'px';
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0||entering)return;
    if(pointer.id!==null){
      if((!entered||overview)&&e.pointerType==='touch')pointer.moved=true;
      return;
    }
    touchTap=null;clearHover();
    pointer.id=e.pointerId;pointer.x=pointer.lx=e.clientX;pointer.y=pointer.ly=e.clientY;
    pointer.moved=false;canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});
  });
  canvas.addEventListener('pointermove',e=>{
    if(pointer.id===null){
      if(e.pointerType==='mouse'&&entered&&!drawerMode){
        hoverPoint={clientX:e.clientX,clientY:e.clientY};hoverDirty=true;
      }
      return;
    }
    if(pointer.id!==e.pointerId)return;
    const dx=e.clientX-pointer.lx,dy=e.clientY-pointer.ly;pointer.lx=e.clientX;pointer.ly=e.clientY;
    if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>4)pointer.moved=true;
    if(!entered||overview||!pointer.moved)return;
    desiredLook=null;framedExhibit=null;interactiveUntil=elapsed+.35;canvas.classList.add('drag');
    yaw+=dx*.0041;pitch=T.MathUtils.clamp(pitch+dy*.0034,-1.04,.60);
  });
  function useTarget(hit){
    if(hit.exhibit){cancelPath();openPanel('exhibit',hit.exhibit.city);}
    else if(hit.kind==='portal')openClassroom();
    else if(hit.bot)openPanel('bot',hit.bot.id);
    else if(hit.seat)chooseSeat(hit.seat);
    else if(hit.station)openPanel('bot',hit.station.action);
  }
  function tap(e){
    if(drawerMode){close();return;}
    if(!entered){enter();return;}
    const h=pick(e);if(h){useTarget(h);return;}
    cast(e);if(!ray.ray.intersectPlane(ground,floorHit)||(!overview&&floorHit.distanceTo(camera.position)>17))return;
    if(Math.abs(floorHit.x)>6.80||floorHit.z>5.12||floorHit.z< -5.23)return;const destination=floorHit.clone();if(overview)setOverview(false);goFloor(destination);
  }
  canvas.addEventListener('pointerup',e=>{
    if(pointer.id!==e.pointerId)return;
    const single=!pointer.moved;releaseCanvasPointer();
    if(!single)return;
    if(e.pointerType==='touch')touchTap={clientX:e.clientX,clientY:e.clientY};
    else tap(e);
  });
  // A touch can send its click to a control that appeared under the finger on pointerup.
  canvas.addEventListener('click',e=>{
    if(!e.detail||!touchTap)return;
    const point=touchTap;touchTap=null;tap(point);
  });
  for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{
    if(pointer.id===e.pointerId)releaseCanvasPointer();
  });
  canvas.addEventListener('pointerleave',clearHover);
  canvas.addEventListener('wheel',e=>{
    if(drawerMode)return;
    e.preventDefault();
    if(!entered||overview)return;
    interactiveUntil=elapsed+.65;
    if(framedExhibit)inspectionZoom=T.MathUtils.clamp(inspectionZoom+Math.sign(e.deltaY)*2,-22,38);
    else zoom=T.MathUtils.clamp(zoom+Math.sign(e.deltaY)*2.1,46,83);
  },{passive:false});
  function clearKeys(){keys.clear();velocity.set(0,0,0);}
  window.addEventListener('blur',()=>{clearKeys();clearHover();});
  function showClassroom(){
    if(classroomFrame)return;
    releaseCanvasPointer();touchTap=null;
    returningFromClassroom=false;
    classroomBack.hidden=false;
    classroomFrame=document.createElement('iframe');
    classroomFrame.title=classroomDialog.getAttribute('aria-label');
    classroomFrame.src=classroomURL.href;
    classroomDialog.append(classroomFrame);
    classroomDialog.showModal();
    syncRoomFrames();
    window.CabinWork?.setPaused(true);
  }
  function hideClassroom(){
    if(!classroomFrame)return;
    classroomFrame.remove();classroomFrame=null;
    classroomDialog.close();
    if(openingShown&&!document.hidden)renderer.render(scene,camera);
    syncRoomFrames();
    window.CabinWork?.setPaused(false);
  }
  function openClassroom(){
    if(classroomFrame)return;
    // One history entry for the classroom, with the live cabin below it.
    history.pushState({...history.state,cabinClassroom:true},'');
    showClassroom();
  }
  function returnFromClassroom(){
    if(!classroomFrame||returningFromClassroom)return;
    returningFromClassroom=true;
    hideClassroom();
    if(history.state?.cabinClassroom)history.back();
  }
  classroomBack.onclick=returnFromClassroom;
  classroomDialog.addEventListener('cancel',event=>{event.preventDefault();returnFromClassroom();});
  treeLink.addEventListener('click',event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
    event.preventDefault();
    openClassroom();
  });
  window.addEventListener('message',event=>{
    if(!classroomFrame||event.source!==classroomFrame.contentWindow||event.origin!==classroomURL.origin)return;
    if(event.data==='cabin-classroom-ready'){
      if(document.activeElement===classroomBack)classroomFrame.focus();
      classroomBack.hidden=true;
    }
    else if(event.data==='cabin-classroom-return')returnFromClassroom();
  });
  window.addEventListener('popstate',event=>{
    if(event.state?.cabinClassroom)showClassroom();
    else hideClassroom();
  });
  function backToDoor(){
    if(overview)setOverview(false);
    close();
    if(player.seat!==null)room.seats[player.seat].occupied=null;
    player.seat=null;player.seatMotion=null;player.benchMix=0;player.benchLimit=Infinity;cancelPath();$('seatBadge').hidden=true;
    player.root.visible=false;player.speed=player.stride=player.sitMix=0;playerView.reset();
    player.travelX=player.travelZ=player.impact=0;player.touching=null;jumpSpeed=null;
    releaseCanvasPointer();clearKeys();
    entered=false;entering=false;framedExhibit=null;entranceExhibit=null;grokArrival=null;doorProgress=0;
    pos.copy(opening.position);yaw=opening.yaw;pitch=opening.pitch;zoom=roomZoom;desiredLook=null;interactiveUntil=0;
    clearHover();
    main.classList.remove('entered','in-room');$('entry').hidden=false;$('entry').removeAttribute('inert');$('enter').disabled=false;$('playUI').hidden=true;$('player-location').hidden=true;
    for(const {door,side} of room.doors)door.rotation.y=side*1.37;
    doorShadowDirty=false;renderer.shadowMap.needsUpdate=true;
    window.CabinWork?.leave?.();$('enter').focus({preventScroll:true});}

  document.addEventListener('keydown',e=>{
    if(classroomDialog.open||$('roomMapDialog').open||exhibitDialog.open)return;
    if(e.code==='Escape'){if(drawerMode)close();else if(overview)setOverview(false);else if(player.seat!=null||player.seatMotion)stand();else cancelPath();clearKeys();return;}
    const focused=document.activeElement;
    if(focused?.matches('input,textarea,select')||focused?.isContentEditable||drawerMode)return;
    if(!entered){if(e.code==='Enter'&&focused===canvas)enter();return;}
    if(e.code==='Space'){
      if(overview||focused?.closest('a,button,summary,[role="button"]')||e.altKey||e.ctrlKey||e.metaKey)return;
      e.preventDefault();
      if(!e.repeat)jumpPlayer();
      return;
    }
    const moveKey=moveKeys.includes(e.code);
    if(moveKey||e.code==='ArrowLeft'||e.code==='ArrowRight'){
      e.preventDefault();if(overview||keys.has(e.code))return;
      keys.add(e.code);
      if(afterSeatMotion===jumpPlayer)return;
      cancelPath();
      if(moveKey&&(player.seat!==null||player.seatMotion))stand(true);
    }
  });document.addEventListener('keyup',e=>keys.delete(e.code));
  $('enter').onclick=enter;$('closeDrawer').onclick=close;$('standBtn').onclick=()=>stand();
  for(const b of document.querySelectorAll('[data-open]'))b.onclick=()=>openPanel(b.dataset.open);
  let last=performance.now(),raf=0,nextFrame=0,previousRate=0,botMotionUntil=0;
  const locationLabel=$('loc-text'),ambientEvent=$('ambientEvent'),mapDialog=$('roomMapDialog'),dock=main.querySelector('.dock');
  const renderScales=[1,.85,.72,.60];
  let baseRatio=1,loadLevel=0,scaleLevel=0,sampleTime=0,slowTime=0,settledAt=0;
  let canvasBox;
  function setResolution(level){
    scaleLevel=level;
    const ratio=Math.min(baseRatio,Math.max(.70,baseRatio*renderScales[level]));
    renderer.setDrawingBufferSize(canvasBox.width,canvasBox.height,ratio);
  }
  function fitOverview(){
    const {width,height,top}=canvasBox;
    cutaway.fitCamera(camera,width,height,dock.getBoundingClientRect().top-top);
  }
  function size(){
    const previous=canvasBox;
    canvasBox=canvas.getBoundingClientRect();
    if(hoverPoint&&previous!==undefined&&
      (previous.left!==canvasBox.left||previous.top!==canvasBox.top||
        previous.width!==canvasBox.width||previous.height!==canvasBox.height))hoverDirty=true;
    const {width:w,height:h}=canvasBox;
    if(!w||!h)return;
    const zoom=window.visualViewport?.scale||1;
    const ratio=Math.min((devicePixelRatio||1)*zoom,(w<800?1.65:1.50)*zoom,Math.sqrt(2200000/(w*h)));
    if(previous?.width===w&&previous.height===h&&ratio===baseRatio)return;
    baseRatio=ratio;
    sampleTime=slowTime=0;setResolution(scaleLevel);
    camera.aspect=w/h;
    // Keep the same sightline on narrow screens while fitting both entrance lanterns.
    const lanternFov=T.MathUtils.radToDeg(2*Math.atan(.54/camera.aspect));
    openingFov=T.MathUtils.clamp(lanternFov,opening.fov,106);
    if(overview)fitOverview();
    else camera.updateProjectionMatrix();
  }
  function fitViewport(){
    // HUD anchors and ray picking share the visible rectangle when a browser
    // pans a magnified page or the on-screen keyboard reduces the usable height.
    const view=window.visualViewport,root=document.documentElement;
    const bounds={left:view?.offsetLeft??0,top:view?.offsetTop??0,
      width:view?.width??root.clientWidth,height:view?.height??root.clientHeight};
    bounds.right=Math.max(0,root.clientWidth-bounds.left-bounds.width);
    bounds.bottom=Math.max(0,root.clientHeight-bounds.top-bounds.height);
    for(const [edge,length] of Object.entries(bounds)){
      const key='--view-'+edge,value=length+'px';
      if(root.style.getPropertyValue(key)!==value)root.style.setProperty(key,value);
    }
    size();
  }
  // Measure actual presentation intervals only during continuous full-rate motion.
  // A single slow frame, a reading panel or a background tab shouldn't lower image quality.
  function paceResolution(time,delta,rate,continuing){
    if(rate!==60){
      sampleTime=slowTime=0;
      if(scaleLevel&&time-settledAt>1100)setResolution(0);
      return;
    }
    settledAt=time;
    if(continuing){
      const sample=Math.min(delta,100);
      sampleTime+=sample;
      if(delta>23)slowTime+=sample;
      if(sampleTime>=480&&slowTime>sampleTime*.55&&loadLevel<renderScales.length-1){
        loadLevel++;sampleTime=slowTime=0;
      }else if(sampleTime>=2400){
        if(slowTime<sampleTime*.06&&loadLevel>0)loadLevel--;
        sampleTime=slowTime=0;
      }
    }
    if(scaleLevel!==loadLevel)setResolution(loadLevel);
  }
  fitViewport();
  window.addEventListener('resize',fitViewport);
  window.visualViewport?.addEventListener('resize',fitViewport);
  window.visualViewport?.addEventListener('scroll',fitViewport);
  new ResizeObserver(size).observe(canvas);
  const projection=new T.Vector3();
  function hasVisibleBotMotion(){
    const {width,height}=canvasBox;
    return bots.some(bot=>{
      const animated=bot.stride>.025||bot.seatMotion||(bot.hasCup&&bot.seat!==null)||bot.props.shaker?.visible;
      if(!animated)return false;
      projection.copy(bot.root.position);
      projection.y+=bot.visualHeight+.105;
      projection.project(camera);
      if(projection.z>=1||projection.z<=-1)return false;
      const x=(projection.x*.5+.5)*width,y=(.5-projection.y*.5)*height;
      return x>-36&&x<width+36&&y>-36&&y<height+36;
    });
  }
  function steerPlayer(dt){
    if(!keys.size&&velocity.lengthSq()<=.0001){player.speed=0;return;}
    const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
    const side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
    const speed=player.walkSpeed*(jumpSpeed===null?1:1.7)/(Math.hypot(forward,side)||1);
    const sin=Math.sin(yaw),cos=Math.cos(yaw);
    let x=(-sin*forward+cos*side)*speed,z=(-cos*forward-sin*side)*speed;
    const traffic=contacts.ahead(player,x,z,.46);
    if(traffic){
      const pace=Math.hypot(x,z),lead=Math.max(0,(traffic.bot.vx*x+traffic.bot.vz*z)/(pace||1));
      const gap=Math.max(0,traffic.distance-.002);
      const limit=lead+Math.max(.072,Math.min(Math.sqrt(8.4*gap),9*gap));
      const inward=Math.max(0,-(x*traffic.x+z*traffic.z));
      const correction=inward*(1-Math.min(1,limit/(pace||1)));
      x+=traffic.x*correction;z+=traffic.z*correction;
    }
    const response=traffic?17:forward||side?12:22;
    velocity.x=T.MathUtils.damp(velocity.x,x,response,dt);
    velocity.z=T.MathUtils.damp(velocity.z,z,response,dt);
    const oldX=pos.x,oldZ=pos.z,dx=velocity.x*dt,dz=velocity.z*dt;
    contacts.move(player,dx,dz,dt,true);
    velocity.x=(pos.x-oldX)/dt;velocity.z=(pos.z-oldZ)/dt;
    const pace=Math.hypot(pos.x-oldX,pos.z-oldZ)/dt;
    player.speed=jumpSpeed===null?Math.min(player.walkSpeed,pace):0;
    if(pace>.055)turnTo(player,Math.atan2(pos.x-oldX,pos.z-oldZ),dt);
  }
  function advancePlayerLift(dt){
    const support=nav.surfaceBelow(pos,Math.max(player.routeRadius,player.radius));
    if(jumpSpeed===null&&pos.y===support)return;
    const previousSpeed=jumpSpeed??0;
    const height=pos.y+(previousSpeed-jumpGravity*dt*.5)*dt;
    const nextSpeed=previousSpeed-jumpGravity*dt;
    if(nextSpeed<=0&&height<=support){
      pos.y=support;jumpSpeed=null;
      player.impact=Math.max(player.impact||0,Math.min(.84,-nextSpeed*.16));
      player.impactX=player.impactZ=0;
    }else{
      pos.y=height;jumpSpeed=nextSpeed;
    }
  }
  function advancePlayerJump(dt){
    // Use shorter collision steps when rendering slows down near an edge.
    const steps=Math.ceil(dt/.025),step=dt/steps;
    for(let i=0;i<steps&&jumpSpeed!==null;i++){
      steerPlayer(step);
      advancePlayerLift(step);
    }
  }
  function updatePlayer(dt){
    const beforeX=pos.x,beforeZ=pos.z;
    if(entering){
      doorProgress=Math.min(1,doorProgress+dt*(reduceMotion?3:.44));
      const progress=T.MathUtils.smootherstep(doorProgress,0,1);
      for(const {door,side} of room.doors)door.rotation.y=side*(1.37+progress*.52);
      if(doorProgress>=1){
        entering=false;entered=true;main.classList.add('in-room');
        $('entry').hidden=true;$('playUI').hidden=false;$('player-location').hidden=false;
        if(grokArrival){const id=grokArrival;grokArrival=null;greetArrival(id);}
        else if(entranceExhibit){const city=entranceExhibit;entranceExhibit=null;visitExhibit(city);}
        else notify('黑色圆球就是你。点地板走动，按空格跳跃。',true);
      }
    }else if(entered){
      for(const {door,side} of room.doors)door.rotation.y=T.MathUtils.damp(door.rotation.y,side*.78,2.3,dt);
      if(doorShadowDirty&&room.doors.every(({door,side})=>Math.abs(door.rotation.y-side*.78)<.025)){
        doorShadowDirty=false;renderer.shadowMap.needsUpdate=true;
      }
      if(keys.size){
        yaw+=(Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')))*dt*1.55;
        desiredLook=null;framedExhibit=null;
      }
      if(player.seatMotion)advanceSeatMotion(player,dt);
      else if(jumpSpeed!==null)advancePlayerJump(dt);
      else if(player.seat===null){
        if(player.walk)advance(player,dt);else steerPlayer(dt);
        if(pos.y>0)advancePlayerLift(dt);
      }
      else player.speed=0;

      const seat=player.seat==null?null:room.seats[player.seat];
      const label=overview?'全屋俯瞰':seat?seat.label:pos.z>3?'门厅':pos.x< -1.1?(pos.z<-.9?'舞台边':'火塘边'):pos.x>2.1?(pos.z<0?'吧台边':'临窗席'):'小屋中央';
      if(locationLabel.textContent!==label)locationLabel.textContent=label;
      if(desiredLook){
        const heading=Math.atan2(pos.x-desiredLook.x,pos.z-desiredLook.z);
        yaw+=yawDelta(yaw,heading)*(1-Math.exp(-6*dt));
        if(player.seat==null&&!player.seatMotion&&!player.walk)turnTo(player,heading+Math.PI,dt);
      }
    }
    player.travelX=(pos.x-beforeX)/dt;player.travelZ=(pos.z-beforeZ)/dt;
    if(player.root.visible){
      CabinCharacters.animate(player,tNow,dt,null,false,false);
      roomLights.contactShadow(player);
      if(player.seat===null&&!player.seatMotion&&pos.y>0){
        const lift=pos.y-nav.surfaceBelow(pos,0);
        player.shade.position.y-=lift;
        player.shade.scale.x*=1+.42*lift;
        player.shade.scale.y*=1+.42*lift;
      }
    }
  }
  function updateLens(fov,dt,snap){
    const change=fov-camera.fov;
    if(Math.abs(change)<=.015)return;
    const step=change*(1-Math.exp(-7*dt)),maxStep=48*dt;
    camera.fov=snap?fov:camera.fov+T.MathUtils.clamp(step,-maxStep,maxStep);
    camera.updateProjectionMatrix();
  }
  function updateCamera(dt){
    if(overview){
      cutaway.frameCamera(camera);
    }else if(!player.root.visible){
      camera.position.copy(opening.position);camera.rotation.set(opening.pitch,opening.yaw,0,'YXZ');
      updateLens(openingFov,dt,true);
    }else{
      playerView.follow(camera,player,yaw,dt);
      const portrait=camera.aspect<1;
      let fov=zoom+(portrait?12:0);
      let lookTilt=pitch;
      if(desiredLook){
        const {x,y,z}=desiredLook;
        lookTilt=Math.atan2(y-camera.position.y,Math.hypot(x-camera.position.x,z-camera.position.z));
        pitch=T.MathUtils.damp(pitch,lookTilt,6,dt);
      }
      if(framedExhibit){
        const [w,h]=framedExhibit.frame??objectFrame[framedExhibit.city],[x,y,z]=framedExhibit.look;
        const distance=Math.hypot(x-camera.position.x,y-camera.position.y,z-camera.position.z);
        const fit=T.MathUtils.radToDeg(2*Math.atan(Math.max(h,w/camera.aspect)/(2*distance)));
        const separation=Math.abs(lookTilt-playerView.bodyElevation(camera,player));
        const sharedFov=T.MathUtils.radToDeg(separation*1.85);
        fov=T.MathUtils.clamp(Math.max(fit+inspectionZoom,sharedFov),portrait?68:50,102);
      }
      const progress=T.MathUtils.smootherstep(doorProgress,0,1);
      updateLens(T.MathUtils.lerp(openingFov,fov,progress),dt,!entered);
      playerView.aim(camera,player,pitch,dt);
      if(!entered){
        camera.position.lerp(opening.position,1-progress);
        camera.rotation.set(T.MathUtils.lerp(opening.pitch,camera.rotation.x,progress),
          T.MathUtils.lerp(opening.yaw,yaw,progress),0,'YXZ');
      }
    }
    camera.updateMatrixWorld();
  }
  const api={capacity,waitingGuests,visitWaitingGuest,overview:()=>overview,backToDoor,bots,byId,createBot,importGrok,showImportedBot,syncCommunityBots,setBotOutfit,player,room,scene,renderer,camera,open:openPanel,close,toast,notify,chooseSeat,goBot,visitExhibit,takeCup,entered:()=>entered,drawer:()=>drawerMode,selected:()=>selectedId,seat:()=>player.seat,position:()=>pos,roomTime:()=>elapsed*1000,serving:()=>barOrders.size>0,refresh:()=>drawerMode&&window.CabinWork?.render(drawerMode,selectedId)};
  window.Cabin=api;
  installCabinReflection(scene);
  const map=makeRoomMap(room,visitExhibit,clearKeys);
  map.update(pos,yaw);
  let nextDetailUpdate=0;
  function updateCrowdDetail(){
    if(elapsed<nextDetailUpdate)return;
    nextDetailUpdate=elapsed+.24;
    const focalPixels=canvasBox.height/(2*Math.tan(T.MathUtils.degToRad(camera.fov*.5)));
    for(const bot of bots){
      const distance=camera.position.distanceTo(bot.root.position);
      const pixels=bot.width*focalPixels/Math.max(.1,distance);
      CabinBotArt.setDetail(bot,bots.length>=32&&pixels<(bot.distantMesh?62:48));
    }
  }
  function frame(n){
    if(document.hidden||classroomDialog.open)return;
    raf=requestAnimationFrame(frame);
    if(!openingReady||!window.CabinWork){last=n;return;}
    // Full-rate input and travel; the visible room keeps moving quietly behind a reading panel.
    const reading=exhibitDialog.open||mapDialog.open;
    const movingBots=!drawerMode&&entered&&elapsed<botMotionUntil;
    const active=entering||player.walk||player.seatMotion||jumpSpeed!==null||player.stride>.03||keys.size||
      (entered&&!overview&&pointer.id!==null)||elapsed<interactiveUntil||
      movingBots||window.CabinWork?.singing()||window.CabinWork?.playingGuitar()||window.CabinWork?.isBeating();
    const rate=reading?15:active?60:30,period=1000/rate;
    const continuing=rate===previousRate;
    if(!continuing){nextFrame=n;previousRate=rate;}
    if(n+.5<nextFrame)return;
    nextFrame+=period;
    if(nextFrame<=n+.5)nextFrame=n+period;
    paceResolution(n,n-last,rate,continuing);
    const dt=Math.min(.09,Math.max(.001,(n-last)/1000));last=n;elapsed+=dt;tNow+=dt;
    contacts.sync();updatePlayer(dt);updateCamera(dt);map.update(pos,player.root.visible?player.root.rotation.y-Math.PI:yaw);tickAgents(dt);art.update(tNow);
    movePoint.material.opacity=Math.max(0,movePoint.material.opacity-dt*.55);movePoint.visible=movePoint.material.opacity>.01;
    if(elapsed-lastEvent>9&&ambientEvent.textContent)ambientEvent.textContent='';
    if(entered&&!drawerMode&&!reading){
      const visibleMotion=hasVisibleBotMotion();
      if(visibleMotion)botMotionUntil=elapsed+.28;
      updateHover(n,active||visibleMotion);
    }else if(hoverPoint)clearHover();
    const ambientTime=reduceMotion?0:tNow;
    room.portal.update(ambientTime);roomLights.update(ambientTime);
    updateCrowdDetail();window.CabinWork?.tick(dt);renderer.render(scene,camera);
    if(!openingShown){
      openingShown=true;main.removeAttribute('data-loading');
    }
  }
  function syncRoomFrames(){
    cancelAnimationFrame(raf);
    if(document.hidden||classroomDialog.open){clearKeys();clearHover();return;}
    last=performance.now();previousRate=0;raf=requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',syncRoomFrames);
  if(history.state?.cabinClassroom)showClassroom();
  else syncRoomFrames();
})();
