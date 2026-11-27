// The grid is cached per body radius. Moving occupants are overlaid only when planning a route.
window.createRoomPaths = function(obstacles) {
  const step=.22,xmin=-6.47,zmin=-5.12,cols=60,rows=47,size=cols*rows;
  const grids=new Map();
  const xs=Float64Array.from({length:cols},(_,i)=>xmin+i*step);
  const zs=Float64Array.from({length:rows},(_,i)=>zmin+i*step);
  const point=i=>({x:xs[i%cols],z:zs[Math.floor(i/cols)]});
  // Each route is synchronous and returns its own waypoints.
  const prev=new Int32Array(size),g=new Float32Array(size),rank=new Float64Array(size),closed=new Uint8Array(size);
  const distances=Float64Array.from({length:size},(_,i)=>Math.hypot(i%cols,Math.floor(i/cols)));
  const airborneObstacles=obstacles.flatMap(o=>o.airborneParts??o);
  const jumpSurfaces=airborneObstacles.filter(o=>o.jumpTop!==undefined);
  function clear(x,z,r=.18){
    return x>=xmin&&x<=6.47&&z>=zmin&&z<=5.08&&!obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);
  }
  function grid(radius){
    if(grids.has(radius))return grids.get(radius);
    const cells=new Uint8Array(size);
    for(let i=0;i<size;i++){const p=point(i);cells[i]=+clear(p.x,p.z,radius);}
    grids.set(radius,cells);return cells;
  }
  function nearest(x,z,valid,reachable){
    let best=-1,ds=Infinity;
    for(let i=0;i<size;i++){
      if(!valid[i])continue;const d=(xs[i%cols]-x)**2+(zs[Math.floor(i/cols)]-z)**2;
      if(d<ds&&(!reachable||reachable(point(i)))){ds=d;best=i;}
    }
    return best;
  }
  // Minimum distance to the whole movement segment, including its endpoints.
  function misses(a,b,x,z,radius){
    const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
    const t=len?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/len)):0;
    return (a.x+t*dx-x)**2+(a.z+t*dz-z)**2>=radius*radius;
  }
  // Check the swept space between two movements, including crossings away from their endpoints.
  function corridorsClear(a,b,c,d,radius){
    if(!misses(a,b,c.x,c.z,radius)||!misses(a,b,d.x,d.z,radius)||
       !misses(c,d,a.x,a.z,radius)||!misses(c,d,b.x,b.z,radius))return false;
    const ax=b.x-a.x,az=b.z-a.z,bx=d.x-c.x,bz=d.z-c.z;
    const cross=ax*bz-az*bx;
    if(Math.abs(cross)<1e-10)return true;
    const x=c.x-a.x,z=c.z-a.z;
    const first=(x*bz-z*bx)/cross,second=(x*az-z*ax)/cross;
    return first<0||first>1||second<0||second>1;
  }
  const planHit={time:1,x:0,z:0};
  function segment(a,b,radius,discs=[]){
    if(!clear(b.x,b.z,radius)||discs.some(d=>!misses(a,b,d.x,d.z,d.r)))return false;
    planHit.time=1;traceRoom(a,b.x-a.x,b.z-a.z,radius,planHit);
    return planHit.time===1;
  }
  function traceRoom(p,dx,dz,radius,hit,ignore,feet=0){
    function limit(time,x,z){
      if(time>=0&&time<hit.time){hit.time=time;hit.x=x;hit.z=z;}
    }
    if(dx>0)limit((6.47-p.x)/dx,-1,0);
    else if(dx<0)limit((xmin-p.x)/dx,1,0);
    if(dz>0)limit((5.08-p.z)/dz,0,-1);
    else if(dz<0)limit((zmin-p.z)/dz,0,1);
    for(const obstacle of feet>0?airborneObstacles:obstacles){
      if(obstacle===ignore||(ignore?.benchFootprintGroup&&obstacle.benchFootprintGroup===ignore.benchFootprintGroup))continue;
      if(feet>0&&feet>=(obstacle.jumpTop??Infinity))continue;
      const w=obstacle.w/2+radius,d=obstacle.d/2+radius;
      const left=obstacle.x-w,right=obstacle.x+w,near=obstacle.z-d,far=obstacle.z+d;
      if(dx){
        const time=((dx>0?left:right)-p.x)/dx,z=p.z+dz*time;
        if(z>=near&&z<=far)limit(time,dx>0?-1:1,0);
      }
      if(dz){
        const time=((dz>0?near:far)-p.z)/dz,x=p.x+dx*time;
        if(x>=left&&x<=right)limit(time,0,dz>0?-1:1);
      }
    }
  }
  function surfaceBelow(p,radius){
    // Land on a surface approached from above, using the same footprint as the sweep.
    let height=0;
    for(const {x,z,w,d,jumpTop} of jumpSurfaces){
      if(jumpTop>height&&jumpTop<=p.y&&Math.abs(p.x-x)<w/2+radius&&Math.abs(p.z-z)<d/2+radius)height=jumpTop;
    }
    return height;
  }
  function route(from,to,radius=.18,discs=[]){
    const fixed=grid(radius);
    let dest=to;
    if(!clear(to.x,to.z,radius)){
      const cell=nearest(to.x,to.z,fixed);if(cell<0)return null;
      dest=point(cell);
    }
    if(discs.some(d=>!misses(dest,dest,d.x,d.z,d.r)))return null;
    if(segment(from,dest,radius,discs))return [dest];
    const valid=discs.length?fixed.slice():fixed;
    for(const d of discs){
      const left=Math.max(0,Math.floor((d.x-d.r-xmin)/step)),right=Math.min(cols-1,Math.ceil((d.x+d.r-xmin)/step));
      const top=Math.max(0,Math.floor((d.z-d.r-zmin)/step)),bottom=Math.min(rows-1,Math.ceil((d.z+d.r-zmin)/step));
      for(let iz=top;iz<=bottom;iz++)for(let ix=left;ix<=right;ix++){
        if((xmin+ix*step-d.x)**2+(zmin+iz*step-d.z)**2<d.r*d.r)valid[iz*cols+ix]=0;
      }
    }
    function accessibleCell(p){
      const cell=nearest(p.x,p.z,valid);
      if(cell<0||segment(p,point(cell),radius,discs))return cell;
      return nearest(p.x,p.z,valid,q=>Math.hypot(q.x-p.x,q.z-p.z)<.7&&segment(p,q,radius,discs));
    }
    const start=accessibleCell(from),end=accessibleCell(dest);
    if(start<0||end<0)return null;
    prev.fill(-1);g.fill(Infinity);closed.fill(0);
    const ex=end%cols,ez=Math.floor(end/cols),open=[start];
    const heur=i=>distances[Math.abs(Math.floor(i/cols)-ez)*cols+Math.abs(i%cols-ex)];
    g[start]=0;rank[start]=heur(start);
    while(open.length){
      let k=0,min=Infinity;for(let j=0;j<open.length;j++){const v=rank[open[j]];if(v<min){k=j;min=v;}}
      const cur=open[k];open[k]=open[open.length-1];open.pop();if(cur===end)break;if(closed[cur])continue;closed[cur]=1;
      const cx=cur%cols,cz=Math.floor(cur/cols);
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dz)continue;const nx=cx+dx,nz=cz+dz;if(nx<0||nx>=cols||nz<0||nz>=rows)continue;const id=nz*cols+nx;
        if(!valid[id]||closed[id]||(dx&&dz&&(!valid[cz*cols+nx]||!valid[nz*cols+cx])))continue;
        const v=g[cur]+(dx&&dz?1.4142:1);if(v<g[id]){g[id]=v;rank[id]=g[id]+heur(id);prev[id]=cur;open.push(id);}
      }
    }
    if(start!==end&&prev[end]===-1)return null;
    const chain=[];
    for(let i=end;i!==-1;i=prev[i]){chain.push(point(i));if(i===start)break;}
    chain.reverse();chain.push(dest);
    const out=[];let anchor=from,k=0;
    while(k<chain.length){
      let j=k;while(j+1<chain.length&&segment(anchor,chain[j+1],radius,discs))j++;
      if(!segment(anchor,chain[j],radius,discs))return null;
      out.push(chain[j]);anchor=chain[j];k=j+1;
    }
    return out;
  }
  function roundCorners(from,path,radius,discs){
    if(path.length<2)return path;
    const rounded=[];
    for(let i=0;i<path.length-1;i++){
      const previous=i===0?from:path[i-1],corner=path[i],next=path[i+1];
      const inX=corner.x-previous.x,inZ=corner.z-previous.z;
      const outX=next.x-corner.x,outZ=next.z-corner.z;
      const approach=Math.hypot(inX,inZ),leave=Math.hypot(outX,outZ);
      const trim=Math.min(.32,approach*.38,leave*.38);
      if(trim<.04){
        rounded.push(corner);
        continue;
      }
      const alignment=(inX*outX+inZ*outZ)/(approach*leave);
      if(alignment>.98||alignment<-.95){
        rounded.push(corner);
        continue;
      }
      const entry={x:corner.x-inX*trim/approach,z:corner.z-inZ*trim/approach};
      const exit={x:corner.x+outX*trim/leave,z:corner.z+outZ*trim/leave};
      const curve=[entry];
      for(let j=1;j<=6;j++){
        const t=j/6,u=1-t;
        const point={
          x:u*u*entry.x+2*u*t*corner.x+t*t*exit.x,
          z:u*u*entry.z+2*u*t*corner.z+t*t*exit.z
        };
        // Keep the original corner in tight passages.
        if(!segment(curve[curve.length-1],point,radius,discs))break;
        curve.push(point);
      }
      if(curve.length===7)rounded.push(...curve);else rounded.push(corner);
    }
    rounded.push(path[path.length-1]);
    return rounded;
  }
  function approach(seat,radius=.18,available){
    // A tiered bench has an aisle on either side. Each row boards from its
    // own aisle, so its middle seats still work when the other row is full.
    const side=seat.approachDirection;
    const heading=side?Math.atan2(side.x,side.z):seat.yaw;
    const distances=side?[radius+.32,radius+.41,radius+.54,radius+.70]:[.70,.90];
    const angles=side?[0,.20,-.20,.42,-.42]:[0,.55,-.55,1.2,-1.2,1.95,-1.95,Math.PI];
    for(const distance of distances)for(const angle of angles){
      const x=seat.x+Math.sin(heading+angle)*distance,z=seat.z+Math.cos(heading+angle)*distance;
      if(!clear(x,z,radius))continue;
      const entry={x,z};
      if(seat.floorObstacle||seat.benchFootprintGroup){
        // Only the occupied piece of furniture is stepped onto during seating.
        const seatedRadius=Math.min(radius,seat.benchRadius??radius);
        planHit.time=1;traceRoom(entry,seat.x-x,seat.z-z,seatedRadius,planHit,seat.floorObstacle||seat);
        if(planHit.time<1)continue;
      }
      if(!available||available(entry))return entry;
    }
    if(available||side)return null;
    return point(nearest(seat.x,seat.z,grid(radius)));
  }
  return {route,roundCorners,clear,approach,misses,corridorsClear,segment,traceRoom,surfaceBelow};
};
