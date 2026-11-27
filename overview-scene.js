window.makeCabinOverview = function(scene) {
  const {T,group,box,rounded,batch}=HouseKit;
  const stage=group(scene),background=new T.Color('#202424');
  stage.name='全屋俯瞰背景';
  stage.visible=false;

  const width=14.12,depth=11.58,groundY=-.289,yardSize=104;
  const slate=CabinPropMaterials.slate(yardSize,yardSize);
  slate.color.set(0xa9a89d);
  slate.normalScale.set(.56,.56);
  slate.fog=false;
  // The stone keeps its real texture and shadows. Only its far edge and the light from the door are graded.
  slate.onBeforeCompile=shader=>{
    shader.uniforms.courtyardDusk={value:background};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nvarying vec2 courtyardPoint;').replace('#include <project_vertex>',
      '#include <project_vertex>\ncourtyardPoint = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying vec2 courtyardPoint;\nuniform vec3 courtyardDusk;').replace('#include <tonemapping_fragment>',`
        vec2 wallDistance = max(abs(courtyardPoint) - vec2(7.06, 5.79), 0.0);
        float outside = length(wallDistance);
        float outFromDoor = max(0.0, courtyardPoint.y - 5.72);
        float doorSpread = 1.9 + 0.24 * outFromDoor;
        float spill = (1.0 - smoothstep(0.55, 1.11, abs(courtyardPoint.x) / doorSpread))
          * exp(-0.13 * outFromDoor * outFromDoor) * smoothstep(5.58, 5.78, courtyardPoint.y);
        float footShadow = mix(0.49, 0.91, smoothstep(0.0, 1.08, outside));
        vec3 courtyardLight = vec3(0.32, 0.37, 0.35) * footShadow + spill * vec3(1.44, 0.75, 0.33);
        gl_FragColor.rgb = gl_FragColor.rgb * footShadow + diffuseColor.rgb * courtyardLight;
        #include <tonemapping_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, courtyardDusk, smoothstep(2.1, 17.5, outside));
      `);
  };
  const pavement=new T.PlaneGeometry(yardSize,yardSize);
  pavement.setAttribute('uv1',pavement.attributes.uv);
  const ground=new T.Mesh(pavement,slate);
  ground.name='全屋石板院地';
  ground.position.y=groundY;ground.rotation.x=-Math.PI/2;
  ground.receiveShadow=true;stage.add(ground);

  // The low footing sits flush below the walls. Two worn stone treads continue the doorway to the yard.
  const foundation=CabinSurfaces.finish('hearth',0x756e60);
  CabinSurfaces.grain(box(stage,0,-.201,0,width,.178,depth,foundation));
  const threshold=CabinSurfaces.wood(0xcbb39a);
  CabinSurfaces.grain(box(stage,0,-.067,5.724,3.98,.134,.283,threshold));
  const tread=CabinSurfaces.finish('hearth',0x9c9180).clone();
  tread.normalScale.set(.52,.52);
  tread.emissive.set(0xedb57d);tread.emissiveMap=tread.map;tread.emissiveIntensity=.13;
  for(const {top,z,depth,cuts} of [
    {top:-.101,z:6.044,depth:.47,cuts:[-2.08,-.79,.63,2.08]},
    {top:-.194,z:6.420,depth:.39,cuts:[-2.20,-.49,.56,2.20]}
  ]){
    const height=top-groundY;
    for(let i=1;i<cuts.length;i++){
      const a=cuts[i-1],b=cuts[i];
      CabinSurfaces.grain(rounded(stage,(a+b)/2,groundY+height/2,z,b-a-.012,height,depth,.014,tread));
    }
  }
  batch(stage);

  // View from the doorway centreline with enough elevation to see both tiers of seats.
  const position=new T.Vector3(0,15.8,21.5),target=new T.Vector3(0,.62,.48);
  const facing=new T.Matrix4().lookAt(position,target,T.Object3D.DEFAULT_UP);
  const orientation=new T.Quaternion().setFromRotationMatrix(facing);
  const cameraSpace=facing.setPosition(position).invert();
  let halfWidth=0,lowest=Infinity,highest=-Infinity;
  const corner=new T.Vector3();
  for(const side of [-1,1])for(const [x,y,z] of [
    [width/2,groundY,depth/2],[width/2,groundY,-depth/2],
    [7.06,4.10,5.75],[7.06,4.10,-5.76]
  ]){
    corner.set(side*x,y,z).applyMatrix4(cameraSpace);
    halfWidth=Math.max(halfWidth,Math.abs(corner.x/corner.z));
    const slope=corner.y/-corner.z;
    lowest=Math.min(lowest,slope);
    highest=Math.max(highest,slope);
  }
  function frameCamera(camera){
    camera.position.copy(position);
    camera.quaternion.copy(orientation);
  }
  function fitCamera(camera,w,h,dockTop){
    const aspect=w/h, portrait=aspect<1;
    // Match the reference composition while keeping the floor above the dock.
    const top=Math.max(.047,8/h);
    const bottom=T.MathUtils.clamp((dockTop-5)/h,top+.36,.898);
    const widthFraction=T.MathUtils.lerp(.94,.824,T.MathUtils.smoothstep(aspect,1.38,1.80));
    const field=Math.max(halfWidth/(aspect*widthFraction),(highest-lowest)/(2*(bottom-top)));
    const centreY=(top+bottom)/2;
    const projectedY=.5-(highest+lowest)/(4*field);
    camera.fov=T.MathUtils.radToDeg(2*Math.atan(field));
    // Shift the lens without turning the camera off the doorway centreline.
    camera.setViewOffset(w,h,portrait?0:w*.013,h*(projectedY-centreY),w,h);
  }
  return {stage,background,frameCamera,fitCamera};
};
