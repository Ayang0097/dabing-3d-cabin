window.CabinCharacters = (() => {
  const {T,group,mat,box,ell,cylinder,rounded,batch,shadow}=HouseKit;
  const art=CabinBotArt;
  const {palette}=art;
  const accessories=CabinBotAccessories;
  const characterScale = 2 / 3;
  const guestScale = .85;
  const band = new Set(['singer', 'beat', 'vocal']);
  const shellFootprints=new Map();
  const vertex=new T.Vector3(),fromAccessory=new T.Matrix4();
  // 阿弦 keeps the original ID used by saved outfits and the guitar-and-vocals guest preset.
  const roles = [
    {id:'singer',name:'阿弦',job:'吉他手',short:'琴',shape:'orb',color:palette.red,scale:0.6,x:-4.43,z:-3.67,base:.286,yaw:.22,guitarOnly:true,
      tool:'弹段吉他',about:'在舞台左边抱着一把木吉他，点它就能听一段扫弦。',
      guest:{job:'吉他手兼驻唱',tool:'弹段吉他',about:'抱着一把木吉他，会弹一段小曲，也能替你点歌。'}},
    {id:'bar',name:'老陶',job:'酒保',short:'酒',shape:'tile',color:palette.orange,scale:0.6,x:4.75,z:-3.51,base:1.08,yaw:-.37,tool:'看酒单',about:'记着各地小屋的饮品，也留了一瓶不含酒精的豆奶。'},
    {id:'letter',name:'阿笺',job:'写信人',short:'信',shape:'cloud',color:palette.pink,scale:0.435,x:-4.11,z:.41,yaw:-.85,tool:'写张明信片',about:'告诉它要写给谁，留一句心里话，它替你排成一张可以带走的明信片。'},
    {id:'clip',name:'拾音',job:'录音剪辑师',short:'剪',shape:'pebble',color:palette.blue,scale:0.53,x:.92,z:-.92,yaw:.5,tool:'挑几个片段',about:'带时间码的逐字稿交给它，从原文里拣出三段值得重听的话。'},
    {id:'road',name:'小渡',job:'巡演向导',short:'路',shape:'drop',color:palette.teal,scale:0.485,x:2.28,z:1.36,yaw:-1.05,tool:'翻巡演手记',about:'它随身带着小屋沿途的手记，知道哪件旧物来自哪座城。'},
    {id:'host',name:'阿栈',job:'看座人',short:'席',shape:'badge',color:palette.yellow,scale:0.53,x:-.36,z:2.10,yaw:.12,tool:'替我找座',about:'想靠近舞台、坐到窗边或找个高脚凳，跟它说就好。'},
    {id:'rhyme',name:'小麦',job:'押韵搭子',short:'韵',shape:'bloom',color:palette.lime,scale:0.455,x:3.43,z:-.66,yaw:-.58,tool:'找个押韵词',about:'写民谣卡住时，给它一句词，它替你翻一翻自己的韵脚本。'},
    {id:'beat',name:'阿拍',job:'架子鼓手',short:'鼓',shape:'star',color:palette.violet,scale:0.48,yaw:.04,tool:'打段架子鼓',about:'坐在舞台的电子鼓后面，用底鼓、军鼓和镲片打四拍子。',
      guest:{job:'手鼓乐手',tool:'敲个节拍',about:'用手鼓陪你练四拍子。'}},
    {id:'vocal',name:'阿禾',job:'主唱',short:'唱',shape:'cloud',color:palette.green,scale:0.58,yaw:.035,
      tool:'点一首歌',about:'站在舞台中央的麦克风前。点一首歌，听小屋歌手的录音。',
      guest:{job:'主唱',tool:'点一首歌',about:'点一首歌，听小屋歌手的录音。'}}
  ].map(role => ({
    ...role, scale: role.scale * characterScale * (band.has(role.id) ? 1 : guestScale),
  }));
  const wood=CabinSurfaces.wood(0xffdfac), edge=mat(0xedc78d), walnut=CabinSurfaces.wood(0x9d7257);
  const brass=mat(0xcaab72,{metalness:.4,roughness:.45}), ivory=mat(0xf6e5ba);
  function mitten(p,x,y,z,tint){
    return ell(p,x,y,z,.071,.060,.055,art.material(tint));
  }
  function singingMouth(frame,body){
    const [left,right]=body.eyes.map(eye=>eye.geometry.attributes.position);
    const x=(left.getX(0)+right.getX(0))*.5-.013;
    const y=(left.getY(0)+right.getY(0))*.5-.177;
    const rest=[x,y,body.front(x,y)+.008],open=rest.slice(),indices=[];
    for(let i=0;i<24;i++){
      const angle=i*Math.PI/12,side=Math.cos(angle),vertical=Math.sin(angle);
      const rx=x+.073*side,ry=y+.012*vertical+.018*side*side;
      const ox=x+.064*side,oy=y+.078*vertical;
      rest.push(rx,ry,body.front(rx,ry)+.008);
      open.push(ox,oy,body.front(ox,oy)+.008);
      indices.push(0,i+1,(i+1)%24+1);
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(rest,3));
    geo.morphAttributes.position=[new T.Float32BufferAttribute(open,3)];
    geo.setIndex(indices);
    const mouth=new T.Mesh(geo,new T.MeshBasicMaterial({color:0x542b2d}));
    frame.add(mouth);
    return mouth;
  }
  const armVector=new T.Vector3(),armUp=new T.Vector3(0,1,0);
  const guitarWrist=new T.Vector3(),guitarElbow=new T.Vector3(),pickOffset=new T.Vector3();
  const pickTip=new T.Vector3(.033,-.035,0);
  const stringsZ=.044;
  const pickOutline=new T.Shape();
  pickOutline.moveTo(.033,-.035);
  pickOutline.quadraticCurveTo(-.032,-.009,-.024,.017);
  pickOutline.quadraticCurveTo(.011,.053,.029,.014);
  pickOutline.quadraticCurveTo(.038,-.011,.033,-.035);
  const pickGeometry=new T.ShapeGeometry(pickOutline,6);
  const pickFinish=mat(0xffcf79,{roughness:.45,side:T.DoubleSide});
  function guitar(frame,tint,blob){
    // The guitar back clears the shell even when the neck turns up for a seat.
    const g=group(frame,-.23,-.255,blob.depth+.047);g.rotation.z=-1.01;
    const outline=new T.Shape();
    outline.moveTo(0,-.168);
    outline.bezierCurveTo(-.133,-.169,-.188,-.077,-.174,.013);
    outline.bezierCurveTo(-.167,.083,-.097,.099,-.115,.164);
    outline.bezierCurveTo(-.146,.251,-.074,.282,0,.282);
    outline.bezierCurveTo(.074,.282,.146,.251,.115,.164);
    outline.bezierCurveTo(.097,.099,.167,.083,.174,.013);
    outline.bezierCurveTo(.188,-.077,.133,-.169,0,-.168);
    const sides=new T.ExtrudeGeometry(outline,{depth:.056,bevelEnabled:true,bevelSize:.005,bevelThickness:.006,bevelSegments:3,curveSegments:16});
    const body=new T.Mesh(sides,wood);CabinSurfaces.grain(body);body.material=[wood,walnut];body.position.z=-.035;g.add(body);
    ell(g,0,.132,.028,.052,.052,.008,edge);
    ell(g,0,.132,.037,.041,.041,.005,mat(0x4d372c));
    rounded(g,0,-.042,.036,.096,.020,.018,.006,walnut);
    box(g,0,.391,.013,.052,.457,.028,walnut);
    rounded(g,0,.635,.010,.079,.102,.039,.012,wood);
    for(let j=0;j<7;j++)box(g,0,.235+j*.046,.031,.05,.003,.003,brass);
    for(let j=0;j<6;j++){
      box(g,-.020+.008*j,.283,stringsZ,.002,.66,.002,ivory);
      ell(g,j%2?.049:-.049,.61+Math.floor(j/2)*.027,.013,.012,.009,.008,ivory);
    }
    CabinSurfaces.dress(g);batch(g);
    const skin=art.material(tint);
    const strum=group(g),fret=group(g);
    ell(strum,-.010,.004,.005,.057,.049,.036,skin);
    ell(strum,.030,.010,-.007,.032,.025,.028,skin);
    const pick=new T.Mesh(pickGeometry,pickFinish);
    pick.position.set(.036,-.016,-.044);pick.rotation.x=.25;strum.add(pick);
    const tip=pickTip.clone().applyQuaternion(pick.quaternion).add(pick.position);
    ell(fret,.006,0,0,.048,.058,.034,skin);
    for(const [x,y] of [[-.030,-.028],[-.039,0],[-.032,.027]]){
      ell(fret,x,y,-.026,.036,.013,.014,skin);
    }
    batch(strum);batch(fret);
    const arms=[strum,fret].map((hand,index)=>{
      const x=.76*(index?blob.bounds.max.x:blob.bounds.min.x),y=index?-.085:-.04;
      const shoulder=new T.Vector3(x,y,blob.front(x,y)-.024);
      const arm=group(frame);
      const upper=ell(arm,0,0,0,.037,1,.035,skin);
      const forearm=ell(arm,0,0,0,.033,1,.031,skin);
      const joint=ell(arm,0,0,0,.033,.033,.034,skin);
      return {hand,shoulder,arm,upper,forearm,joint};
    });
    const rig={g,strum,fret,tip,arms,sweep:-.78,grip:.25};
    poseGuitar(rig,null,0,0,0);
    return rig;
  }
  function poseArmSegment(mesh,from,to){
    armVector.subVectors(to,from);
    mesh.position.copy(from).addScaledVector(armVector,.5);
    mesh.scale.y=armVector.length()*.5+.020;
    mesh.quaternion.setFromUnitVectors(armUp,armVector.normalize());
  }
  function poseGuitar(rig,cue,benchMix,breathe,dt){
    const {g,strum,fret}=rig;
    rig.sweep=cue?cue.sweep:T.MathUtils.damp(rig.sweep,-.78,12,dt);
    rig.grip=cue?cue.grip:T.MathUtils.damp(rig.grip,.25,8,dt);
    const sweep=rig.sweep,grip=rig.grip;
    g.rotation.z=-1.01+.66*benchMix+.017*(cue?sweep:breathe);
    g.position.x=-.23+.12*benchMix;
    // Set the pick tip on the string plane. The wrist follows it from above.
    strum.rotation.set(.08+.10*sweep,.10*sweep,-.18+.41*sweep);
    pickOffset.copy(rig.tip).applyQuaternion(strum.quaternion);
    strum.position.set(.126*sweep,.125+.022*sweep,stringsZ+.016*sweep*sweep).sub(pickOffset);
    fret.position.set(.059,.349+.166*grip,.087);
    fret.rotation.set(.03,.045,-.12+.22*grip);
    g.updateMatrix();
    for(const {hand,shoulder,upper,forearm,joint} of rig.arms){
      // Pass around the edge of the guitar before approaching its front.
      if(hand===strum)guitarElbow.set(-.230,.100+.018*sweep,.105);
      else guitarElbow.set(.141,hand.position.y+.052,.106);
      guitarElbow.applyMatrix4(g.matrix);
      guitarWrist.copy(hand.position).applyMatrix4(g.matrix);
      joint.position.copy(guitarElbow);
      poseArmSegment(upper,shoulder,guitarElbow);
      poseArmSegment(forearm,guitarElbow,guitarWrist);
    }
  }
  function handDrum(frame,tint){
    const g=group(frame,0,-.205,.347);g.rotation.x=.20;
    cylinder(g,0,0,0,.18,.125,.18,wood,28);
    cylinder(g,0,.096,0,.182,.182,.018,ivory,28);
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4;
      HouseKit.stick(g,[.177*Math.cos(a),.074,.177*Math.sin(a)],[.128*Math.cos(a+.18),-.079,.128*Math.sin(a+.18)],.005,walnut,6);
    }
    CabinSurfaces.dress(g);batch(g);
    return {g,mallets:[mitten(g,-.125,.122,.018,tint),mitten(g,.125,.122,.026,tint)]};
  }
  function drumSticks(root,tint,kit){
    const birch=mat(0xd8bb8d,{roughness:.63}),length=.327,gripEnd=-.047;
    const sticks=[-1,1].map(side=>{
      const wrist=group(root);
      ell(wrist,0,0,0,.029,.035,.028,art.material(tint));
      const taper=length-.075;
      cylinder(wrist,0,(gripEnd+taper)/2,0,.0057,.0075,taper-gripEnd,birch,10);
      cylinder(wrist,0,(taper+length-.011)/2,0,.0036,.0057,length-.011-taper,birch,10);
      ell(wrist,0,length-.006,0,.005,.006,.005,birch);
      const ready=new T.Vector3(side*.133,.150,.123);
      const upstroke=new T.Vector3(side*.35,.78,.42).normalize();
      return {wrist,ready,upstroke};
    });
    const points={};
    for(const [note,contact] of Object.entries(kit.strikes)){
      const tip=root.worldToLocal(contact.clone());
      const direction=new T.Vector3(tip.x,-.17,tip.z).normalize();
      points[note]={grip:tip.clone().addScaledVector(direction,-length),direction};
    }
    const rig={sticks,points,target:new T.Vector3(),rotation:new T.Quaternion(),toward:new T.Vector3(),up:new T.Vector3(0,1,0),length};
    poseDrumSticks(rig,null,0);
    return rig;
  }
  function poseDrumSticks(rig,cue,breathe,dt=0){
    const amount=cue?1-T.MathUtils.smoothstep(Math.abs(cue.offset),0,cue.reach):0;
    const settle=cue||!dt?1:1-Math.exp(-21*dt);
    for(let i=0;i<rig.sticks.length;i++){
      const {wrist,ready,upstroke}=rig.sticks[i],strike=rig.points[cue?.notes[i]];
      rig.target.copy(ready);
      rig.target.y+=breathe*.013;
      rig.toward.copy(upstroke);
      if(strike){
        rig.target.lerp(strike.grip,amount);
        rig.toward.lerp(strike.direction,amount).normalize();
      }
      wrist.position.lerp(rig.target,settle);
      wrist.quaternion.slerp(rig.rotation.setFromUnitVectors(rig.up,rig.toward),settle);
    }
  }
  function cupAndPaw(frame,tint,vessel){
    const g=group(frame,.34,-.105,.365);
    if(vessel){
      cylinder(g,0,0,0,.076,.056,.144,ivory,20);
      cylinder(g,0,.074,0,.066,.066,.004,mat(0x955a31),24);
    }
    mitten(g,-.050,-.042,.023,tint);g.visible=false;
    return g;
  }
  function shaker(frame,tint){
    const g=group(frame,.39,-.035,.385), tin=mat(0xb9c6c5,{metalness:.52,roughness:.36});
    cylinder(g,0,.035,0,.058,.048,.16,tin,20);
    cylinder(g,0,.135,0,.033,.058,.045,tin,20);
    cylinder(g,0,.17,0,.032,.032,.025,brass,20);
    mitten(g,-.035,-.032,.024,tint);g.visible=false;return g;
  }
  function make(scene,d,ix,kit) {
    const root=group(scene,d.x,d.base||0,d.z), model=group(root);
    root.rotation.y=d.yaw;model.scale.setScalar(d.scale);
    const motion=group(model), frame=group(motion);
    const body=art.make(frame,d.shape,d.color),{eyes,bounds,depth}=body;
    frame.position.y=-bounds.min.y;
    const height=(bounds.max.y-bounds.min.y)*d.scale, width=(bounds.max.x-bounds.min.x)*d.scale;
    const shade=shadow(root,0,0,width*1.12,depth*d.scale*2.2,.014);
    const props={},skill=d.skill||d.id;
    if(skill==='singer')props.guitar=guitar(frame,d.color,body);
    if(skill==='vocal'||(skill==='singer'&&!d.guitarOnly))props.voice=singingMouth(frame,body);
    if(kit)props.kit=drumSticks(root,d.color,kit);
    else if(skill==='beat')props.drum=handDrum(frame,d.color);
    if(skill==='bar')props.shaker=shaker(frame,d.color);
    if(d.id==='bar'){
      // The little bartender stands on a wooden step behind the metre-high counter.
      const step=group(scene,d.x,0,d.z);
      box(step,0,d.base-.035,0,.75,.07,.67,walnut);
      for(const x of [-.28,.28])for(const z of [-.24,.24])box(step,x,(d.base-.07)/2,z,.07,d.base-.07,.07,walnut);
      CabinSurfaces.dress(step);batch(step);
    }
    const phase=ix*1.55+.65;
    const bot={...d,ix,root,model,motion,frame,body,eyes,props,cup:cupAndPaw(frame,d.color,d.id!=='you'),shade,
      width,height,depth:depth*2*d.scale,faceHeight:(frame.position.y+.06)*d.scale,
      phase,walkPhase:phase,walkSpeed:.72+(ix%3)*.09,speed:0,
      status:ix===0?'候场':ix===1?'照看吧台':'在屋里闲逛',
      get standingRadius(){return this.hasCup?this.cupRadius:this.bodyRadius;},
      get radius(){
        const r=this.standingRadius;
        return r+this.benchMix*(Math.min(r,this.benchLimit)-r);
      },
      benchMix:0,benchLimit:Infinity,seatedHeightScale:1,
      seat:null,seatMotion:null,hold:null,walk:null,sitMix:0,stride:0,hasCup:false};
    const outfit=accessories.normalize(d.outfit);
    dress(bot,outfit,accessories.build(d.shape,body,outfit));
    return bot;
  }
  function meshFootprint(mesh,height,transform){
    const positions=mesh.geometry.attributes.position;
    let reach=0;
    for(let i=0;i<positions.count;i++){
      vertex.fromBufferAttribute(positions,i);
      if(transform)vertex.applyMatrix4(transform);
      const radius=Math.hypot(vertex.x,vertex.z),rise=Math.abs(height+vertex.y);
      // Walking and sitting have different limits for squash and lean.
      reach=Math.max(reach,1.036*radius+.135*rise,1.058*radius+.122*rise);
    }
    return reach;
  }
  function bodyRadius(bot,outfit){
    // Plain blobs rock around their middle; instrument players pivot at their feet.
    const middle=(bot.body.bounds.max.y+bot.body.bounds.min.y)/2;
    bot.rockPivot=Object.keys(bot.props).length?0:bot.frame.position.y+middle;
    const height=bot.frame.position.y-bot.rockPivot;
    const footprintKey=bot.shape+(bot.rockPivot?'-middle':'-base');
    if(!shellFootprints.has(footprintKey)){
      const meshes=[bot.body.shell,...bot.eyes];
      shellFootprints.set(footprintKey,Math.max(...meshes.map(mesh=>meshFootprint(mesh,height))));
    }
    let reach=shellFootprints.get(footprintKey);
    if(outfit.children.length){
      outfit.updateWorldMatrix(true,true);
      const toOutfit=outfit.matrixWorld.clone().invert();
      outfit.traverse(mesh=>{
        if(!mesh.isMesh)return;
        fromAccessory.multiplyMatrices(toOutfit,mesh.matrixWorld);
        reach=Math.max(reach,meshFootprint(mesh,height,fromAccessory));
      });
    }
    return reach*bot.scale+.002;
  }
  function dress(b,outfit,accessoryModel){
    const bounds=new T.Box3().setFromObject(accessoryModel);
    const extraY=Math.max(0,bounds.max.y-b.body.bounds.max.y)*b.scale;
    const reachX=Math.max(bounds.max.x,-bounds.min.x)*2*b.scale;
    const reachZ=Math.max(bounds.max.z,-bounds.min.z)*2*b.scale;
    b.accessoryModel?.removeFromParent();
    b.accessoryModel=accessoryModel;b.outfit=outfit;
    if(accessoryModel.children.length)b.frame.add(accessoryModel);
    b.outfitHeight=b.height+extraY;
    updateVisualHeight(b);
    b.pickSize=[Math.max(b.width,reachX)+.04,b.outfitHeight+.04,Math.max(b.depth,reachZ)+.04];
  }
  function updateVisualHeight(b){
    b.visualHeight=b.motion.position.y*b.model.scale.y+b.outfitHeight*b.motion.scale.y*b.seatedHeightScale;
  }
  function animate(b,t,dt,guitarCue,serving,beating,kitCue,voiceCue) {
    const pace=b.speed/b.walkSpeed;
    const seatPose=b.seatMotion?.seated??(b.seat==null&&!b.props.kit?0:1);
    b.stride=T.MathUtils.damp(b.stride,pace,11,dt);
    b.sitMix=T.MathUtils.damp(b.sitMix,seatPose,12,dt);
    b.walkPhase+=dt*7.1*b.stride;
    const walkPhase=b.walkPhase,jump=(1-Math.cos(walkPhase))*.5;
    const breathe=Math.sin(t*1.95+b.phase), step=b.stride, seated=b.sitMix;
    const stretch=.010*breathe+.060*step*(2*jump-1)-.105*seated;
    const impact=b.impact||0;
    // Only a shape or accessory wider than its cushion needs to tuck in.
    // A smaller drop in height keeps the seated blob from looking overly thin.
    const foldedReach=b.hasCup?Math.max(b.benchEnvelope,.65*b.scale+.010):b.benchEnvelope;
    const tuck=b.benchMix ? b.benchMix*(1-Math.min(1,b.benchLimit/foldedReach)) : 0;
    const seatedScale=1-tuck;
    b.seatedHeightScale=Math.sqrt(seatedScale);
    b.model.scale.set(b.scale*seatedScale,b.scale*b.seatedHeightScale,b.scale*seatedScale);
    if(b.props.guitar)b.model.position.z=-.045*b.scale*b.benchMix;
    if(b.hit){b.hit.scale.x=1-tuck;b.hit.scale.z=1-tuck;}
    b.motion.position.y=step*.148*jump;
    b.motion.scale.set(1-.50*stretch,1+stretch-.068*impact,1-.47*stretch);
    b.motion.rotation.z=.018*breathe+.072*step*Math.sin(walkPhase*.5);
    b.motion.rotation.x=.028*step+(b.seatMotion?.lean??0);
    if(impact>.001){
      const yaw=b.root.rotation.y,cos=Math.cos(yaw),sin=Math.sin(yaw);
      b.motion.rotation.z-=.039*impact*(b.impactX*cos-b.impactZ*sin);
      b.motion.rotation.x+=.039*impact*(b.impactX*sin+b.impactZ*cos);
    }
    b.impact=impact*Math.exp(-dt*9);
    if(b.rockPivot){
      const pivot=b.rockPivot*b.motion.scale.y;
      b.motion.position.x=pivot*Math.sin(b.motion.rotation.z);
      b.motion.position.z=-pivot*Math.cos(b.motion.rotation.z)*Math.sin(b.motion.rotation.x);
    }
    const swayAmplitude=b.listening||b.seatMotion?.seated>.02 ? .045 : .13;
    const sway=swayAmplitude*Math.sin(t*.77+b.phase);
    b.frame.rotation.y=T.MathUtils.damp(b.frame.rotation.y,sway,10,dt);
    updateVisualHeight(b);
    const footprint=(1-.20*jump*step)*(1-.56*seated);
    b.shade.scale.set(footprint,footprint,1);
    const blinkPhase=(t+b.phase*1.7)%4.8, blink=Math.max(0,1-Math.abs(blinkPhase-.105)/.105);
    for(const eye of b.eyes)eye.morphTargetInfluences[0]=blink*blink*(3-2*blink);
    if(b.props.voice){
      const mouth=b.props.voice.morphTargetInfluences;
      mouth[0]=T.MathUtils.damp(mouth[0],voiceCue??0,20,dt);
      if(voiceCue!=null){
        b.motion.rotation.x+=.037*mouth[0];
        b.motion.rotation.z+=Math.sin(t*2.3)*.029;
      }
    }
    b.cup.visible=b.hasCup;
    if(b.hasCup){
      const sip=b.sipMix??seated*Math.pow((1+Math.sin(t*1.75+b.phase))/2,3);
      b.cup.position.set(.34-sip*.088-.10*b.benchMix,-.105+sip*.185,.365+sip*.10);
      b.cup.rotation.z=-.10+sip*.35;
    }
    if(b.props.guitar){
      poseGuitar(b.props.guitar,guitarCue,b.benchMix,breathe,dt);
      b.frame.rotation.z=T.MathUtils.damp(b.frame.rotation.z,guitarCue?-.022*guitarCue.sweep:0,12,dt);
    }
    if(b.props.shaker){
      const g=b.props.shaker;g.visible=serving;
      g.position.y=-.038+.052*Math.sin(t*9);g.rotation.z=.48+.28*Math.sin(t*9);
    }
    if(b.props.drum){
      const {g,mallets}=b.props.drum;g.visible=!b.hasCup;
      mallets.forEach((m,i)=>{m.position.y=.13+(beating?.102*Math.max(0,Math.sin(t*10+i*Math.PI)):0);});
    }
    if(b.props.kit)poseDrumSticks(b.props.kit,kitCue,breathe,dt);
  }
  return {roles,guestScale,make,dress,animate,bodyRadius,portrait:accessories.portrait};
})();
