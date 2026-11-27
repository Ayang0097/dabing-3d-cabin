/* The practical lamps, side window and hearth light the interior in metres. */
window.installCabinLights=function(scene,renderer,fixtures,stage){
  const T=THREE;
  // The bundled r160 light loop computes the full BRDF even outside a lamp's reach.
  // Its visibility flag already accounts for range and intensity at this fragment.
  T.ShaderChunk.lights_fragment_begin=T.ShaderChunk.lights_fragment_begin.replaceAll(
    '\t\tRE_Direct( directLight,','\t\tif ( directLight.visible ) RE_Direct( directLight,'
  );
  renderer.toneMappingExposure=1.115;
  scene.fog.density=.009;
  scene.add(new T.HemisphereLight(0xcfd7df,0xa1876d,.69));
  const foyer=new T.DirectionalLight(0xc9d5e1,.29);
  foyer.position.set(.55,5.2,9.2);scene.add(foyer);

  function lamp(name,position,color,power,reach){
    const light=new T.PointLight(color,power,reach,2);
    light.name=name;
    light.position.fromArray(position);scene.add(light);
    return light;
  }
  function cone(name,position,target,color,power,reach,angle,penumbra){
    const light=new T.SpotLight(color,power,reach,angle,penumbra,2);
    light.name=name;light.position.fromArray(position);light.target.position.fromArray(target);
    scene.add(light,light.target);
    return light;
  }
  function soften(light,resolution,radius,normalBias=.005){
    // The static maps are refreshed when the roof or doors change.
    light.castShadow=true;light.shadow.mapSize.set(resolution,resolution);light.shadow.radius=radius;
    light.shadow.camera.near=.12;light.shadow.bias=-.00013;light.shadow.normalBias=normalBias;
  }

  const [wx,wy,wz]=fixtures.window;
  const windowLight=cone('大理窗暮光',[wx-1.88,wy+.40,wz-.07],[-3.68,.66,3.82],0xbfd3eb,34,9.6,.55,.86);
  soften(windowLight,1024,4.1,.007);
  const hearth=cone('火塘吊灯',fixtures.hearthLamp,[-2.58,.27,1.81],0xffd8af,30,7.4,.94,.86);
  soften(hearth,1280,3.5);
  // Diffuse spill from the hearth lamp off the window-side plaster and ceiling.
  lamp('左侧暖白回光',[-4.89,2.78,2.36],0xffe7d1,3.6,5.5);
  const stageLight=cone('舞台暖白主灯',stage.stageLight,stage.stageAim,0xffdfba,21,5.9,.81,.88);
  soften(stageLight,1024,3.9,.005);

  // The main pool falls over the order counter; it also casts the small prop shadows.
  const barPools=[
    {offsetX:.24,offsetZ:.38,color:0xffd5aa,power:9.2,angle:.69},
    {offsetX:-.02,offsetZ:.43,color:0xffdfbf,power:17.9,angle:.76},
    {offsetX:-.13,offsetZ:.40,color:0xffd3a3,power:8.8,angle:.71}
  ];
  const bar=stage.barPendants.map((position,i)=>{
    const [x,,z]=position,{offsetX,offsetZ,color,power,angle}=barPools[i];
    const pendant=cone('吧台吊灯 '+(i+1),position,[x+offsetX,1.10,z+offsetZ],color,power,4.7,angle,.84);
    if(i===1)soften(pendant,1024,3.2,.004);
    return pendant;
  });
  const shelves=cone('宽厚里书架射灯',stage.shelfLight,[3.44,2.23,-5.48],0xffe1c4,11.4,4.0,.90,.83);
  soften(shelves,768,2.9,.004);
  lamp('驻唱灯串',stage.stringGlow,0xffc892,5.8,4.8);

  const [tx,ty,tz]=fixtures.tableGlobe;
  const table=cone('点歌长桌吊灯',[tx,ty-.17,tz],[4.24,.42,1.68],0xffdeb8,10.6,4.9,.88,.83);
  soften(table,768,3.4,.004);
  lamp('乳玻璃吊灯漫射',fixtures.tableGlobe,0xffe0bc,3.2,3.7);
  lamp('长桌方灯',fixtures.tableLamp,0xffc184,.46,1.42);
  cone('阅读台灯',fixtures.readingLamp,fixtures.readingPage,0xffd6a9,.73,1.28,.80,.86);
  lamp('吧台烛光',[3.29,1.24,-2.325],0xffb365,.17,.83);
  const embers=lamp('火塘余烬',fixtures.hearthEmbers,0xffaa6d,.39,1.65);
  lamp('树洞边缘余光',fixtures.portalBounce,0xffae65,.23,1.1);

  const keys=[hearth,stageLight,bar[1],table,windowLight];
  return {
    update(time){
      embers.intensity=.39+.041*Math.sin(time*3.6)+.019*Math.sin(time*6.8+.8);
    },
    contactShadow({root,shade,seat,seatMotion,props}){
      const p=root.position,seated=seatMotion?.seated??(seat==null&&!props.kit?0:1);
      const stride=1-seated;
      let x=0,z=0,total=.65;
      for(const light of keys){
        const dx=p.x-light.position.x,dz=p.z-light.position.z;
        const dy=Math.max(.68,light.position.y-p.y);
        const radius=Math.max(0,1-(dx*dx+dz*dz)/(light.distance*light.distance));
        const distance=dx*dx+dz*dz+dy*dy+1;
        const weight=light.intensity*radius*radius/(distance*Math.sqrt(distance));
        x+=dx/dy*weight;z+=dz/dy*weight;total+=weight;
      }
      const reach=Math.min(1.35,Math.hypot(x,z)/total)*stride;
      const aim=Math.atan2(x,z)-root.rotation.y;
      const shift=.030*reach;
      shade.position.set(Math.sin(aim)*shift,p.y<.035?.023:.015,Math.cos(aim)*shift);
      shade.rotation.set(-Math.PI/2,aim,0,'YXZ');
      shade.scale.y*=1+.52*reach;
    }
  };
};

// The room probe is baked at the same origin as 烘焙反射.js.
// Correct the sampling direction at shiny surfaces so nearby walls and lights stay in place.
function cabinReflectionParallax(material){
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);
    shader.vertexShader='#ifdef USE_ENVMAP\nvarying vec3 cabinWorldPos;\n#endif\n'+shader.vertexShader.replace('#include <worldpos_vertex>',`
      #include <worldpos_vertex>
      #ifdef USE_ENVMAP
        cabinWorldPos=worldPosition.xyz;
      #endif
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>',THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
      'vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );',`
        const vec3 roomMin=vec3(-7.14,.01,-5.58);
        const vec3 roomMax=vec3(6.89,3.91,5.50);
        vec3 from=clamp(cabinWorldPos,roomMin+.001,roomMax-.001);
        vec3 edge=mix(roomMin,roomMax,step(vec3(0.0),reflectVec));
        vec3 travel=abs(edge-from)/max(abs(reflectVec),vec3(.0001));
        vec3 corrected=from+reflectVec*min(travel.x,min(travel.y,travel.z))-vec3(.15,1.65,-.60);
        float inside=1.0-smoothstep(.012,.38,length(cabinWorldPos-from));
        float influence=inside*(1.0-smoothstep(.22,.86,roughness));
        vec4 envMapColor=textureCubeUV(envMap,normalize(mix(reflectVec,normalize(corrected),influence)),roughness);
      `
    ));
    shader.fragmentShader='#ifdef USE_ENVMAP\nvarying vec3 cabinWorldPos;\n#endif\n'+shader.fragmentShader;
  };
  material.customProgramCacheKey=()=>key+'|cabin-box-probe';
}

// The offline atlas is the original half-float PMREM, stored losslessly in two RGB planes.
// Install its final mapping before the first draw so materials only compile one shader variant.
window.installCabinReflection=function(scene){
  const T=THREE,atlas=new T.DataTexture(null,384,512,T.RGBAFormat,T.HalfFloatType);
  atlas.mapping=T.CubeUVReflectionMapping;
  atlas.minFilter=atlas.magFilter=T.LinearFilter;
  atlas.colorSpace=T.LinearSRGBColorSpace;
  atlas.needsUpdate=true;
  scene.environment=atlas;
  const tuned=new Set();
  scene.traverse(obj=>{
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    for(const m of materials){
      if(!m?.isMeshStandardMaterial||m.userData.botShell||tuned.has(m))continue;
      const glazing=m.userData.cabinGlazing;
      const floor=m.userData.surface==='floor';
      const defaultStrength=(floor ? .28 : .20)+.78*m.metalness+.29*(1-m.roughness);
      m.envMapIntensity=glazing ? .94 : (m.userData.cabinReflection??defaultStrength);
      if(glazing||((m.metalness>.38||m.clearcoat>.22)&&m.roughness<.63))cabinReflectionParallax(m);
      tuned.add(m);
    }
  });
  const file='room-reflections.png';
  new T.ImageLoader().load(window.CabinSurfaceImages?.[file]||'textures/'+file,image=>{
    const w=image.width/2,h=image.height;
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=h;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(image,0,0);
    const bytes=ctx.getImageData(0,0,canvas.width,h).data,pixels=new Uint16Array(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const out=(y*w+x)*4,hi=(y*2*w+x)*4,lo=hi+w*4;
      for(let c=0;c<3;c++)pixels[out+c]=(bytes[hi+c]<<8)|bytes[lo+c];
      pixels[out+3]=0x3c00;
    }
    atlas.image={data:pixels,width:w,height:h};atlas.needsUpdate=true;
  });
};
