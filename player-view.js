window.makeCabinPlayerView = function(room){
  const T=THREE,back=1.58,shoulder=.17,eye=1.14;
  const padding=.07,feather=.43,full=Math.hypot(back,shoulder);
  const pivot=new T.Vector3(),origin=new T.Vector3(),direction=new T.Vector3(),ahead=new T.Vector3();
  const ray=new T.Ray(),hit=new T.Vector3(),sample=new T.Vector3();
  function blocker(x0,y0,z0,x1,y1,z1){
    const box=new T.Box3(new T.Vector3(x0,y0,z0),new T.Vector3(x1,y1,z1));
    return {box,nearby:box.clone().expandByScalar(feather)};
  }
  const cameraParts=room.obstacles.flatMap(o=>o.airborneParts?.filter(part=>part.cameraHeight!==undefined)??[]);
  const blockers=room.obstacles.concat(cameraParts).map(({x,z,w,d,cameraHeight=.93})=>blocker(
    x-w/2-padding,0,z-d/2-padding,x+w/2+padding,cameraHeight+padding,z+d/2+padding
  ));
  blockers.push(blocker(-6.58,0,4.94,-3.93,2.39,5.41),blocker(1.50,.91,-5.60,6.64,3.23,-4.98));
  blockers.push(blocker(-7,0,-5.7,-6.61,4.2,5.6),blocker(6.61,0,-5.7,7,4.2,5.6),blocker(-7,0,-5.7,7,4.2,-5.30));
  // Masonry ends at the jambs. The open part of the doorway has no back wall.
  blockers.push(blocker(-7,0,5.33,-1.80,3.5,5.82),blocker(1.80,0,5.33,7,3.5,5.82));
  const leaves=room.doors.map(({door,side})=>({door,bounds:side<0
    ?blocker(-.03,0,-.19,1.89,2.84,.19):blocker(-1.89,0,-.19,.03,2.84,.19)}));

  let initialized=false,orbitYaw=0,reach=0,hard=0,preferred=0,tiltBias=0;
  function probe({box,nearby}){
    if(ray.origin.y<box.min.y||ray.origin.y>box.max.y||
      box.containsPoint(ray.origin)||!ray.intersectsBox(nearby))return;
    if(ray.intersectBox(box,hit))hard=Math.min(hard,ray.origin.distanceTo(hit));
    // Ease in when the arm aims towards a corner, including near misses.
    // An arm running parallel to a nearby wall can stay at full length.
    const clearRadius=box.distanceToPoint(ray.origin),softRange=Math.min(clearRadius,feather);
    const step=full/16;
    for(let i=1;i<=16;i++){
      const at=i*step;
      if(at-step*.75>=preferred)break;
      ray.at(at,sample);
      const gap=box.distanceToPoint(sample);
      if(gap<softRange){
        const blend=T.MathUtils.smoothstep(gap,0,softRange);
        const softLimit=T.MathUtils.lerp(at-step*.75,full,blend);
        preferred=Math.min(preferred,Math.max(clearRadius,softLimit));
      }
    }
  }
  function aimArm(out,yaw){
    const sin=Math.sin(yaw),cos=Math.cos(yaw);
    out.set((back*sin+shoulder*cos)/full,0,(back*cos-shoulder*sin)/full);
  }
  function probeArm(arm){
    hard=preferred=full;
    ray.set(origin,arm);
    for(const bounds of blockers)probe(bounds);
    for(const {door,bounds} of leaves){
      const a=Math.cos(door.rotation.y),b=Math.sin(door.rotation.y);
      const dx=origin.x-door.position.x,dz=origin.z-door.position.z;
      ray.origin.set(a*dx-b*dz,origin.y-door.position.y,b*dx+a*dz);
      ray.direction.set(a*arm.x-b*arm.z,0,b*arm.x+a*arm.z);
      probe(bounds);
    }
    return Math.min(hard,preferred);
  }
  function follow(camera,bot,yaw,dt){
    const p=bot.root.position;
    const followedHeight=bot.seat!==null||bot.seatMotion?p.y:p.y*.42;
    const fresh=!initialized||(pivot.x-p.x)**2+(pivot.z-p.z)**2>1;
    let turnStep=0;
    if(fresh){
      pivot.set(p.x,followedHeight,p.z);orbitYaw=yaw;tiltBias=0;
    }else{
      pivot.x=T.MathUtils.damp(pivot.x,p.x,18,dt);
      pivot.y=T.MathUtils.damp(pivot.y,followedHeight,9,dt);
      pivot.z=T.MathUtils.damp(pivot.z,p.z,18,dt);
      const turn=Math.atan2(Math.sin(yaw-orbitYaw),Math.cos(yaw-orbitYaw));
      turnStep=turn*(1-Math.exp(-18*dt));
      orbitYaw+=turnStep;
    }
    // Probe at the camera's actual height so low furniture can pass below it.
    origin.set(pivot.x,eye+pivot.y*.55,pivot.z);
    aimArm(direction,orbitYaw);
    let target=probeArm(direction);
    const hardLimit=hard;
    const turnAhead=T.MathUtils.clamp(turnStep/dt*.17,-.40,.40);
    if(Math.abs(turnAhead)>.012){
      // When the arm sweeps across a wall, start easing in before the actual hit.
      aimArm(ahead,orbitYaw+turnAhead);
      target=Math.min(target,probeArm(ahead));
    }
    // Leave an obstruction more slowly than we approach it.
    reach=fresh?target:Math.min(hardLimit,T.MathUtils.damp(reach,target,target<reach?12:5.5,dt));
    initialized=true;
    camera.position.copy(origin).addScaledVector(direction,reach);
  }
  function bodyElevation(camera,bot){
    const p=bot.root.position;
    const depth=(camera.position.x-p.x)*Math.sin(orbitYaw)+(camera.position.z-p.z)*Math.cos(orbitYaw);
    return Math.atan2(p.y+bot.height*.5-camera.position.y,depth);
  }
  function aim(camera,bot,pitch,dt){
    const middle=bodyElevation(camera,bot),halfFov=T.MathUtils.degToRad(camera.fov*.5);
    // Keep the Bot in view when the arm pulls in near a wall.
    const target=T.MathUtils.clamp(pitch,middle-halfFov*.39,middle+halfFov*.80);
    tiltBias=T.MathUtils.damp(tiltBias,target-pitch,9,dt);
    const tilt=T.MathUtils.clamp(pitch+tiltBias,middle-halfFov*.78,middle+halfFov*.96);
    camera.rotation.set(tilt,orbitYaw,0,'YXZ');
  }
  return {follow,aim,bodyElevation,reset:()=>{initialized=false;}};
};
