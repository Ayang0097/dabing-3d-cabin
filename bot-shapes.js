/* Front outlines and the two eye strokes are sampled from the supplied Grok Bot icons.
   The outline goes counterclockwise from the right. Eye values are two endpoints and a radius. */
window.CabinBotArt = (() => {
  const T = THREE, TAU = Math.PI * 2, unit = .0051;
  const palette = Object.freeze({
    green:'#27d875', blue:'#438bff', red:'#f74b55', orange:'#ff953b',
    yellow:'#ffd14d', teal:'#15cbbb', violet:'#ad65f4', pink:'#fa6da6',
    lime:'#91d94a', brown:'#a4724d', gray:'#4b5054', black:'#151515'
  });
  const shapes = [
    {name:'圆球', value:'orb'}, {name:'方糖', value:'tile'},
    {name:'云朵', value:'cloud'}, {name:'卵石', value:'pebble'},
    {name:'水滴', value:'drop'}, {name:'徽章', value:'badge'},
    {name:'花朵', value:'bloom'}, {name:'星星', value:'star'}
  ];
  const colors = [
    {name:'薄荷绿', value:palette.green}, {name:'晴空蓝', value:palette.blue},
    {name:'草莓红', value:palette.red}, {name:'橘子橙', value:palette.orange},
    {name:'柠檬黄', value:palette.yellow}, {name:'海盐青', value:palette.teal},
    {name:'葡萄紫', value:palette.violet}, {name:'莓果粉', value:palette.pink},
    {name:'青苹果绿', value:palette.lime}, {name:'栗棕', value:palette.brown},
    {name:'墨灰', value:palette.gray}, {name:'墨黑', value:palette.black}
  ];
  const color = palette.green;
  const forms = {
    orb: {depth:0.49, eyes:[[18,22,2,45,14], [68,39,47,69,10]],
      outline:[100]},
    tile: {depth:0.41, eyes:[[5,-11,-8,11,10], [39,-2,28,21,10]],
      outline:[85,80,78,76,76,78,81,86,92,96,94,89,85,82,81,82,84,88,94,101,105,106,101,92,85,80,78,76,76,78,81,86,92,96,94,89,85,82,81,82,84,88,94,101,105,106,101,92]},
    cloud: {depth:0.42, eyes:[[11,-10,-2,14,10], [45,0,33,23,11]],
      outline:[100,94,87,79,86,91,94,94,93,90,83,82,90,97,101,101,99,95,92,89,93,96,100,101,100,94,87,79,86,91,94,94,93,90,83,82,90,97,101,101,99,95,92,89,93,96,100,101]},
    pebble: {depth:0.41, eyes:[[10,8,-3,34,11], [61,24,49,48,11]],
      outline:[100,101,103,102,101,98,96,93,89,84,81,76,73,71,70,71,72,76,80,84,89,93,95,98,100,101,103,102,101,98,96,93,89,84,81,76,73,71,70,71,72,76,80,84,89,93,95,98]},
    drop: {depth:0.43, eyes:[[22,10,10,31,12], [62,17,48,45,9]],
      outline:[89,88,87,85,84,84,82,81,80,80,80,83,87,93,101,108,111,107,100,94,90,88,87,87,89,89,92,93,95,96,97,98,98,99,100,100,100,101,100,100,99,98,96,96,94,93,92,89]},
    badge: {depth:0.44, eyes:[[-4,-10,-17,14,10], [35,1,22,25,10]],
      outline:[85,81,79,78,78,79,79,80,80,80,80,81,85,91,98,104,105,102,98,96,94,94,96,99,98,96,93,92,92,93,96,102,106,104,98,92,87,85,84,85,87,91,96,102,105,106,102,92]},
    bloom: {depth:0.40, eyes:[[4,1,-8,23,9], [39,11,28,33,9]],
      outline:[98,99,95,86,78,70,64,62,67,74,82,90,97,101,97,90,84,78,71,68,73,79,85,91,98,99,95,86,78,70,64,62,67,74,82,90,97,101,97,90,84,78,71,68,73,79,85,91]},
    star: {depth:0.39, eyes:[[6,-13,-5,9,10], [43,-3,31,20,9]],
      outline:[95,80,70,67,69,79,90,92,88,75,67,68,76,88,100,102,99,93,84,77,87,94,99,101,95,80,70,67,69,79,90,92,88,75,67,68,76,88,100,102,99,93,84,77,87,94,99,101]}
  };
  for(const form of Object.values(forms)){
    form.core=unit*form.outline.reduce((a,b)=>a+b,0)/form.outline.length;
  }
  const cache = new Map(), portraits = new Map();
  const materials=new Map();
  function material(tint){
    if(!materials.has(tint)){
      materials.set(tint,new T.MeshPhysicalMaterial({
        color:tint,roughness:.39,clearcoat:.36,clearcoatRoughness:.23,
        emissive:tint,emissiveIntensity:.22,envMapIntensity:.46,userData:{botShell:true}
      }));
    }
    return materials.get(tint);
  }
  const white = new T.MeshBasicMaterial({color:0xfffffc, toneMapped:false});
  function radiusAt(form, theta) {
    const samples=form.outline, count=samples.length, step=(theta/TAU+1)*count;
    const n=Math.floor(step), t=step-n;
    const a=samples[(n-1+count)%count], b=samples[n%count], c=samples[(n+1)%count], d=samples[(n+2)%count];
    return unit*(b+.5*t*(c-a+t*(2*a-5*b+4*c-d+t*(3*(b-c)+d-a))));
  }
  function frontZ(form,x,y) {
    const edge=radiusAt(form,Math.atan2(y,x)), r=Math.hypot(x,y), delta=edge-form.core;
    let t=Math.min(1,r/edge);
    for(let i=0;i<4;i++){
      const bulge=delta*t*t;
      t=T.MathUtils.clamp(t-(t*(form.core+bulge)-r)/(form.core+3*bulge),0,1);
    }
    return form.depth*Math.sqrt(Math.max(0,1-t*t));
  }
  function surfacePoint(form,azimuth,elevation,point) {
    const c=Math.cos(elevation),x=c*Math.sin(azimuth),y=Math.sin(elevation),z=c*Math.cos(azimuth);
    const xy=Math.hypot(x,y),axial=Math.abs(z)/form.depth,edge=radiusAt(form,Math.atan2(y,x));
    let inside=0,outside=Math.max(edge,form.core,form.depth)+.001;
    for(let i=0;i<17;i++){
      const mid=(inside+outside)*.5,cross=Math.sqrt(Math.max(0,1-(mid*axial)**2));
      const radius=cross*(form.core+(edge-form.core)*cross*cross);
      if(mid*axial<=1&&mid*xy<=radius)inside=mid;else outside=mid;
    }
    return point.set(x*inside,y*inside,z*inside);
  }
  function shellGeometry(form,sectors=96,rings=36) {
    const points=[0,0,form.depth], indices=[];
    for(let row=1;row<rings;row++){
      const phi=Math.PI*row/rings, sin=Math.sin(phi), z=form.depth*Math.cos(phi);
      for(let col=0;col<sectors;col++){
        const theta=TAU*col/sectors, r=sin*(form.core+(radiusAt(form,theta)-form.core)*sin*sin);
        points.push(r*Math.cos(theta),r*Math.sin(theta),z);
      }
    }
    const back=points.length/3;
    points.push(0,0,-form.depth);
    for(let col=0;col<sectors;col++){
      const j=(col+1)%sectors;
      indices.push(0,1+col,1+j);
      for(let row=1;row<rings-1;row++){
        const a=1+(row-1)*sectors, b=a+sectors;
        indices.push(a+col,b+col,b+j,a+col,b+j,a+j);
      }
      const last=1+(rings-2)*sectors;
      indices.push(last+col,back,last+j);
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(points,3));
    geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingBox();
    return geo;
  }
  function eyeGeometry(form,stroke,distant=false) {
    const [x0,y0,x1,y1,rawRadius]=stroke.map(v=>v*unit);
    const cx=(x0+x1)*.43, cy=(y0+y1)*.43+.058, dx=x1-x0, dy=y1-y0;
    const axis=Math.hypot(dx,dy), len=axis*.91, r=.74*rawRadius+.009;
    const vx=dx/axis, vy=dy/axis, ux=vy, uy=-vx;
    // Lay a constant-width stroke over the curved cheek without stretching its outer eye.
    const e=.002,gx=(frontZ(form,cx+e,cy)-frontZ(form,cx-e,cy))/(2*e);
    const gy=(frontZ(form,cx,cy+e)-frontZ(form,cx,cy-e))/(2*e), slope=gx*gx+gy*gy;
    const shrink=slope>0?(1-1/Math.sqrt(1+slope))/slope:0;
    const rim=[], p=[], closed=[], indices=[];
    const capSteps=distant?6:16;
    for(const end of [1,-1]){
      for(let i=0;i<=capSteps;i++){
        const a=(end===1?0:Math.PI)+Math.PI*i/capSteps;
        rim.push([r*Math.cos(a),end*len/2+r*Math.sin(a)]);
      }
      for(let j=1;j<6;j++)rim.push([-end*r,end*len*(.5-j/6)]);
    }
    function wrap(target,u,v,relief){
      const x=ux*u+vx*v,y=uy*u+vy*v,k=(x*gx+y*gy)*shrink;
      const px=cx+x-gx*k, py=cy+y-gy*k;
      target.push(px,py,frontZ(form,px,py)+relief);
    }
    function vertex(u,v,relief){
      wrap(p,u,v,relief);wrap(closed,u,v*.12,relief);
    }
    vertex(0,0,.008);
    const bands=distant?[.4,.77,1]:[.22,.45,.67,.86,1];
    bands.forEach((f,band)=>{
      const start=1+band*rim.length;
      for(let i=0;i<rim.length;i++){
        const [u,v]=rim[i], j=(i+1)%rim.length;
        vertex(u*f,v*f,.005+.004*(1-f*f));
        if(!band) indices.push(0,start+i,start+j);
        else {
          const prev=start-rim.length;
          indices.push(prev+i,start+i,start+j,prev+i,start+j,prev+j);
        }
      }
    });
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(p,3));
    geo.morphAttributes.position=[new T.Float32BufferAttribute(closed,3)];
    geo.setIndex(indices);return geo;
  }
  function make(parent,shape,tint=color) {
    if(!cache.has(shape)){
      const form=forms[shape];
      cache.set(shape,{body:shellGeometry(form),eyes:form.eyes.map(stroke=>eyeGeometry(form,stroke))});
    }
    const geo=cache.get(shape), shell=new T.Mesh(geo.body,material(tint));
    parent.add(shell);
    const eyes=geo.eyes.map(g=>{const e=new T.Mesh(g,white);parent.add(e);return e;});
    const form=forms[shape];
    return {shell,eyes,bounds:geo.body.boundingBox,depth:form.depth,front:(x,y)=>frontZ(form,x,y),
      surface:(azimuth,elevation,point)=>surfacePoint(form,azimuth,elevation,point)};
  }
  const distantMeshes=new Map();
  function setDetail(bot,distant){
    if(!!bot.distantMesh===distant)return;
    bot.distantMesh=distant;
    const form=forms[bot.shape];
    if(distant&&!distantMeshes.has(bot.shape)){
      distantMeshes.set(bot.shape,{body:shellGeometry(form,40,16),eyes:form.eyes.map(stroke=>eyeGeometry(form,stroke,true))});
    }
    const geo=(distant?distantMeshes:cache).get(bot.shape);
    bot.body.shell.geometry=geo.body;
    bot.eyes.forEach((eye,index)=>{eye.geometry=geo.eyes[index];});
  }
  function portrait(shape,tint=color) {
    const key=shape+tint;
    if(portraits.has(key))return portraits.get(key);
    const form=forms[shape], canvas=document.createElement('canvas'), size=144;
    canvas.width=canvas.height=size;
    const c=canvas.getContext('2d');
    c.translate(size/2,size/2);c.scale(118,-118);
    c.beginPath();
    for(let i=0;i<120;i++){
      const a=TAU*i/120,r=radiusAt(form,a),x=r*Math.cos(a),y=r*Math.sin(a);
      if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
    }
    c.closePath();
    const light=c.createRadialGradient(-.18,.27,.012,-.11,.17,.77);
    const base=new T.Color(tint);
    const mixed=(hex,t)=>'#'+base.clone().lerp(new T.Color(hex),t).getHexString();
    light.addColorStop(0,mixed('#fffdf7',.69));
    light.addColorStop(.15,mixed('#fffdf7',.23));
    light.addColorStop(.43,mixed('#ffffff',.045));
    light.addColorStop(.64,tint);
    light.addColorStop(1,'#'+base.clone().multiplyScalar(.52).getHexString());
    c.fillStyle=light;c.fill();
    c.strokeStyle='#fffffc';c.lineCap='round';
    for(const [x0,y0,x1,y1,r] of form.eyes){
      c.beginPath();c.moveTo(x0*unit,y0*unit);c.lineTo(x1*unit,y1*unit);
      c.lineWidth=2*r*unit;c.stroke();
    }
    const url=canvas.toDataURL();portraits.set(key,url);return url;
  }
  return {palette,shapes,colors,material,make,portrait,setDetail};
})();
