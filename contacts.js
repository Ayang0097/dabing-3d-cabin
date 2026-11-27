// Continuous floor contact for the player and the roaming Bots.
window.makeCabinContacts=function(nav,bots,player){
  const padding=.003,brakePadding=.005;
  const forecast={time:1,x:0,z:0,bot:null,distance:0},sideProbe={};
  const fixedRoles=new Set(['singer','beat','vocal','bar']);
  const maxPushDepth=5;
  const sweepHits=Array.from({length:maxPushDepth+1},()=>({}));
  const pushChain=new Set();
  function canYield(b){
    return b!==player&&b.seat==null&&!b.seatMotion&&!fixedRoles.has(b.id);
  }
  function landingRadius(b){
    const motion=b.seatMotion;
    return motion?.rising&&motion.seat?.bench?b.standingRadius:b.radius;
  }
  // Bin by floor position. The extent includes the space swept on the way to a seat.
  const bands=new Map(),bandWidth=1;
  let maxReach=0,maxSpeedX=0;
  function track(b,reset=false){
    const x=b.root.position.x,index=Math.floor(x/bandWidth);
    if(reset||index!==b.contactBand){
      const previous=bands.get(b.contactBand);
      if(!reset&&previous){
        const slot=previous.indexOf(b);
        if(slot>=0)previous.splice(slot,1);
      }
      if(!bands.has(index))bands.set(index,[]);
      bands.get(index).push(b);b.contactBand=index;
    }
    const seatReach=b.seatMotion?Math.abs(x-b.seatMotion.destination.x):0;
    maxReach=Math.max(maxReach,seatReach+Math.max(b.radius,b.cupRadius||0,landingRadius(b)));
    maxSpeedX=Math.max(maxSpeedX,Math.abs(b.vx||0));
  }

  function circle(from,dx,dz,centre,radius,limit){
    const x=from.x-centre.x,z=from.z-centre.z;
    const inward=x*dx+z*dz,speed=dx*dx+dz*dz;
    if(inward>=0||speed<1e-12)return false;
    const distance=x*x+z*z-radius*radius;
    const discriminant=inward*inward-speed*distance;
    if(discriminant<=0)return false;
    const time=distance<=0?0:distance/(-inward+Math.sqrt(discriminant));
    if(time>=limit.time)return false;
    const nx=x+dx*time,nz=z+dz*time,length=Math.hypot(nx,nz);
    limit.time=time;limit.x=nx/length;limit.z=nz/length;
    return true;
  }

  function seatCorridor(from,dx,dz,centre,end,radius,limit){
    let found=circle(from,dx,dz,end,radius,limit);
    const ax=end.x-centre.x,az=end.z-centre.z,length=Math.hypot(ax,az);
    if(length<1e-6)return found;
    const ux=ax/length,uz=az/length,nx=-uz,nz=ux;
    const x=from.x-centre.x,z=from.z-centre.z;
    const normalPosition=x*nx+z*nz,normalSpeed=dx*nx+dz*nz;
    const side=Math.sign(normalPosition);
    if(normalSpeed*side>=0)return found;
    const time=Math.max(0,(side*radius-normalPosition)/normalSpeed);
    if(time>=limit.time)return found;
    const along=(x+dx*time)*ux+(z+dz*time)*uz;
    if(along<0||along>length)return found;
    limit.time=time;limit.x=side*nx;limit.z=side*nz;
    return true;
  }

  function reset(limit){limit.time=1;limit.x=limit.z=0;limit.bot=null;}
  function eachContact(b,dx,dz,limit,horizon,hardOnly=false){
    const from=b.root.position;
    const margin=b.radius+maxReach+maxSpeedX*horizon+brakePadding;
    const left=Math.floor((from.x+Math.min(0,dx)-margin)/bandWidth);
    const right=Math.floor((from.x+Math.max(0,dx)+margin)/bandWidth);
    for(let index=left;index<=right;index++){
      const neighbours=bands.get(index);
      if(!neighbours)continue;
      for(const other of neighbours){
        if(other===b||(hardOnly&&canYield(other)))continue;
        const centre=other.root.position,end=other.seatMotion?.destination;
        const clearance=b.radius+(horizon?brakePadding:padding),range=clearance+other.radius;
        const endRange=end?clearance+landingRadius(other):range;
        // Compare both travel directions, so following someone at their pace needs no brake.
        const relX=dx-(end?0:(other.vx||0)*horizon),relZ=dz-(end?0:(other.vz||0)*horizon);
        const zExtent=Math.max(range,endRange)+Math.abs(relZ)+(end?Math.abs(end.z-centre.z):0);
        if(Math.abs(from.z-centre.z)>zExtent)continue;
        const front=circle(from,relX,relZ,centre,range,limit);
        const seat=end&&seatCorridor(from,dx,dz,centre,end,range,limit);
        // Leave room to unfold at the exit, even when the seated body and
        // its passage between neighbouring cushions are still compact.
        const standingExit=endRange>range&&circle(from,dx,dz,end,endRange,limit);
        if(front||seat||standingExit)limit.bot=other;
      }
    }
  }

  function ahead(b,vx,vz,horizon,includeYielding=false){
    if(horizon<=0||(!vx&&!vz))return null;
    reset(forecast);
    eachContact(b,vx*horizon,vz*horizon,forecast,horizon,!includeYielding);
    if(!forecast.bot)return null;
    forecast.distance=forecast.time*horizon*Math.hypot(vx,vz);
    return forecast;
  }

  function sideSpace(peer,dx,dz){
    reset(sideProbe);
    nav.traceRoom(peer.root.position,dx,dz,Math.max(peer.routeRadius,peer.radius),sideProbe);
    eachContact(peer,dx,dz,sideProbe,0,true);
    return sideProbe.time;
  }
  // Press out along the collision normal and step to the side. At a wall
  // compare both shoulders before choosing one, then sweep the peer's move
  // through the same walls, bodies and active seat transitions as a walk.
  function makeSpace(peer,dx,dz,nx,nz,dt,depth){
    const length=Math.hypot(dx,dz),pressure=Math.max(0,-(nx*dx+nz*dz));
    const budget=Math.max(0,dt*2.9-(peer.yieldTravel||0));
    if(pressure<1e-7||budget<.00001)return false;
    let sideX=dz/length,sideZ=-dx/length;
    if(nx*sideX+nz*sideZ>.025){sideX=-sideX;sideZ=-sideZ;}
    const look=peer.radius+.15,space=sideSpace(peer,sideX*look,sideZ*look);
    if(space<.75&&sideSpace(peer,-sideX*look,-sideZ*look)>space+.12){
      sideX=-sideX;sideZ=-sideZ;
    }
    const across=pressure*.96;
    let px=-nx*pressure+sideX*across,pz=-nz*pressure+sideZ*across;
    const scale=Math.min(1,budget/(Math.hypot(px,pz)||1));
    px*=scale;pz*=scale;
    const position=peer.root.position,oldX=position.x,oldZ=position.z;
    sweep(peer,px,pz,dt,true,depth);
    const moved=Math.hypot(position.x-oldX,position.z-oldZ);
    peer.yieldTravel=(peer.yieldTravel||0)+moved;
    return moved>.000001;
  }

  function sweep(b,dx,dz,dt,slide,depth){
    const position=b.root.position;
    const hit=sweepHits[depth];
    const wallRadius=Math.max(b.routeRadius,b.radius);
    let obstacle=null,lastPushed=null,slides=0;
    pushChain.add(b);
    for(let pass=0;pass<6;pass++){
      const length=Math.hypot(dx,dz);
      if(length<1e-7)break;
      reset(hit);nav.traceRoom(position,dx,dz,wallRadius,hit,undefined,b===player?position.y:0);
      eachContact(b,dx,dz,hit,0);
      if(hit.time===1){position.x+=dx;position.z+=dz;break;}
      const safe=Math.max(0,hit.time-.00018/length);
      position.x+=dx*safe;position.z+=dz*safe;
      track(b);
      obstacle=hit.bot||obstacle;
      const inward=dx*hit.x+dz*hit.z;
      if(pass===0&&b.touching!==hit.bot&&hit.bot){
        const strength=Math.min(.82,-inward/dt*.53);
        b.impact=Math.max(b.impact||0,strength);
        b.impactX=hit.x;b.impactZ=hit.z;
        const peer=hit.bot;
        if(!peer.seatMotion){
          peer.impact=Math.max(peer.impact||0,strength*.54);peer.impactX=-hit.x;peer.impactZ=-hit.z;
        }
      }
      const remaining=1-safe;
      const peer=hit.bot;
      if(peer&&depth<maxPushDepth&&peer!==lastPushed&&canYield(peer)&&!pushChain.has(peer)){
        lastPushed=peer;
        if(makeSpace(peer,dx*remaining,dz*remaining,hit.x,hit.z,dt,depth+1)){
          dx*=remaining;dz*=remaining;continue;
        }
      }
      if(!slide||inward>=0||++slides>2)break;
      dx=(dx-hit.x*inward)*remaining;dz=(dz-hit.z*inward)*remaining;
    }
    if(obstacle||!b.touching||Math.hypot(position.x-b.touching.root.position.x,position.z-b.touching.root.position.z)>b.radius+b.touching.radius+.034){
      b.touching=obstacle;
    }
    track(b);
    pushChain.delete(b);
    return obstacle;
  }
  function move(b,dx,dz,dt,slide=false){return sweep(b,dx,dz,dt,slide,0);}

  function startFrame(b){
    b.frameStartX=b.root.position.x;b.frameStartZ=b.root.position.z;b.yieldTravel=0;
    b.vx=b.travelX||0;b.vz=b.travelZ||0;track(b,true);
  }
  function sync(){
    for(const band of bands.values())band.length=0;
    maxReach=0;maxSpeedX=0;
    for(const b of bots)startFrame(b);
    if(player.root.visible)startFrame(player);
  }
  return {ahead,move,sync,track,padding,canYield};
};
