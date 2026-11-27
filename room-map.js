/* A north-up plan uses the same x/z coordinates as the floor, seats and exhibit tour. */
window.makeRoomMap=function(room,visit,clearKeys){
  const $=id=>document.getElementById(id),toggle=$('miniMapToggle'),dialog=$('roomMapDialog');
  const mini=$('miniPlan'),large=$('largePlan'),pins=$('mapPins'),selection=$('mapSelection'),go=$('mapGo');
  const width=15.2,height=12.7,xMin=-7.6,zMin=-6.1;
  let selected=null,lastPose='';
  const markers=room.exhibits.map(exhibit=>{
    const button=document.createElement('button');
    button.type='button';button.className='map-pin';button.dataset.mapCity=exhibit.city;
    button.textContent=exhibit.mapLabel??exhibit.city;button.title=exhibit.item;
    button.setAttribute('aria-label',exhibit.city+' · '+exhibit.item);button.setAttribute('aria-pressed','false');
    button.onclick=()=>choose(exhibit);
    pins.append(button);
    return {exhibit,button};
  });
  function choose(exhibit){
    selected=exhibit;
    for(const marker of markers)marker.button.setAttribute('aria-pressed',String(marker.exhibit===exhibit));
    const city=document.createElement('strong');city.textContent=exhibit.city;
    selection.replaceChildren(city,document.createTextNode(exhibit.item));go.hidden=false;
  }
  function draw(canvas,compact){
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    const dpr=Math.min(window.devicePixelRatio||1,2.5);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const ctx=canvas.getContext('2d'),sx=w/width,sz=h/height;
    ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
    ctx.fillStyle='#f2e6ca';ctx.fillRect(0,0,w,h);ctx.save();
    ctx.scale(sx,sz);ctx.translate(-xMin,-zMin);
    const plan=drawCabinPlan(ctx,room,compact);
    ctx.restore();
    if(!compact)placeLabels(ctx,w,h,sx,sz,plan);
  }

  // Some objects share a wall or a table. Keep each label near its actual anchor
  // and give neighbouring touch targets enough room on a narrow screen.
  function placeLabels(ctx,w,h,sx,sz,plan){
    // Prefer open floor so both the bench cushions and the region names remain readable.
    function area({x,z,rx,rz}){
      return {x:(x-xMin)*sx,y:(z-zMin)*sz,rx:rx*sx+1,ry:rz*sz+1};
    }
    const cushions=plan.cushions.map(area),regions=plan.captions.map(area);
    const labels=[];
    const pad=w<230?1:2,step=w<260?2:4;
    ctx.strokeStyle='#776249';ctx.fillStyle='#725936';ctx.lineWidth=1;
    for(const {exhibit,button} of markers){
      const originX=(exhibit.look[0]-xMin)*sx,originY=(exhibit.look[2]-zMin)*sz;
      const rx=button.offsetWidth/2,ry=button.offsetHeight/2;
      let best=null,overCaption=null,nearCushion=null;
      const baseX=Math.max(rx+pad,Math.min(w-rx-pad,originX));
      const baseY=Math.max(ry+pad,Math.min(h-ry-pad,originY));
      function consider(x,y){
        if(x<rx+pad||x>w-rx-pad||y<ry+pad||y>h-ry-pad)return;
        const cost=(x-originX)**2+(y-originY)**2;
        if(best&&cost>=best.cost)return;
        const overlaps=p=>Math.abs(p.x-x)<p.rx+rx&&Math.abs(p.y-y)<p.ry+ry;
        if(labels.some(overlaps))return;
        if(cushions.some(overlaps)){
          if(!nearCushion||cost<nearCushion.cost)nearCushion={x,y,cost,rx,ry};
        }else if(regions.some(overlaps)){
          if(!overCaption||cost<overCaption.cost)overCaption={x,y,cost,rx,ry};
        }else best={x,y,cost,rx,ry};
      }
      consider(baseX,baseY);
      if(!best){
        for(let y=ry+pad;y<=h-ry-pad;y+=step)
          for(let x=rx+pad;x<=w-rx-pad;x+=step)consider(x,y);
      }
      const target=best||overCaption||nearCushion||{x:baseX,y:baseY,rx,ry};
      labels.push({x:target.x,y:target.y,rx:rx+pad,ry:ry+pad});
      button.style.left=target.x+'px';button.style.top=target.y+'px';
      if(Math.abs(target.x-originX)>rx||Math.abs(target.y-originY)>ry){
        ctx.beginPath();ctx.moveTo(originX,originY);ctx.lineTo(target.x,target.y);ctx.stroke();
        ctx.beginPath();ctx.arc(originX,originY,2,0,2*Math.PI);ctx.fill();
      }
    }
  }

  const arrows=[mini.nextElementSibling,large.parentElement.querySelector('.map-position')];
  let lastX,lastZ,lastYaw;
  function update(pos,yaw){
    if(pos.x===lastX&&pos.z===lastZ&&yaw===lastYaw)return;
    lastX=pos.x;lastZ=pos.z;lastYaw=yaw;
    // The street is outside the printed plan. Show the visitor just beyond
    // the threshold until they enter the building.
    const xPct=Math.max(2,Math.min(98,100*(pos.x-xMin)/width));
    const yPct=Math.max(3,Math.min(96,100*(pos.z-zMin)/height));
    const left=xPct.toFixed(2)+'%',top=yPct.toFixed(2)+'%';
    const rotate=(-yaw*180/Math.PI).toFixed(1);
    const pose=left+top+'/'+rotate;
    if(pose===lastPose)return;lastPose=pose;
    for(const arrow of arrows){
      arrow.style.left=left;arrow.style.top='clamp(8px,'+top+',calc(100% - 8px))';
      arrow.style.transform='translate(-50%,-50%) rotate('+rotate+'deg)';
    }
  }
  toggle.hidden=false;
  toggle.onclick=()=>{
    clearKeys();dialog.showModal();toggle.setAttribute('aria-expanded','true');draw(large,false);
  };
  $('mapClose').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>toggle.setAttribute('aria-expanded','false'));
  dialog.addEventListener('click',e=>{
    if(e.target!==dialog)return;
    const rect=dialog.getBoundingClientRect();
    if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();
  });
  go.onclick=()=>{
    if(!selected)return;
    dialog.close();visit(selected.city);
  };
  const resize=new ResizeObserver(entries=>{
    for(const entry of entries){
      if(entry.target===mini.parentElement)draw(mini,true);
      else if(dialog.open)draw(large,false);
    }
  });
  resize.observe(mini.parentElement);resize.observe(large.parentElement);draw(mini,true);
  return {update};
};
