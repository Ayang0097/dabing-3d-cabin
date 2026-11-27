// Build asset after changing lights, fixtures or windows. In the freshly opened source page,
// run this file in DevTools, then: (await bakeCabinReflections(Cabin)).toBlob(blob => {
//   const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
//   a.download = 'room-reflections.png'; a.click(); }); Save in textures/ and rebuild the HTML.
async function bakeCabinReflections({scene, renderer, bots, player, overview}) {
  if(overview())throw Error('请先回到屋内视角');
  const T=THREE,previous=scene.environment,hidden=bots.map(b=>b.root),emitters=new Map();
  if(player)hidden.push(player.root);
  scene.traverse(o=>{
    const material=o.material;
    if(material?.userData?.cabinGlazing)hidden.push(o);
    if(material?.userData?.probeRadiance&&!emitters.has(material)){
      emitters.set(material,material.emissive?material.emissiveIntensity:material.color.clone());
    }
  });
  const visible=hidden.map(o=>o.visible);
  const cube=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});
  const camera=new T.CubeCamera(.12,55,cube),filter=new T.PMREMGenerator(renderer);
  let atlas;
  try {
    scene.environment=null;
    hidden.forEach(o=>{o.visible=false;});
    // A visible lamp can stay softly exposed while the HDR probe keeps its true bright core.
    for(const [material,value] of emitters){
      if(material.emissive)material.emissiveIntensity=value*material.userData.probeRadiance;
      else material.color.multiplyScalar(material.userData.probeRadiance);
    }
    camera.position.set(.15,1.65,-.60);
    camera.update(renderer,scene);
    atlas=filter.fromCubemap(cube.texture);
    const {width:w,height:h}=atlas;
    const pixels=new Uint16Array(w*h*4);
    renderer.readRenderTargetPixels(atlas,0,0,w,h,pixels);
    if(!pixels.some((value,i)=>i%4!==3&&value!==0))throw Error('无法读取反射贴图');
    const canvas=document.createElement('canvas');canvas.width=2*w;canvas.height=h;
    const ctx=canvas.getContext('2d'),image=ctx.createImageData(2*w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const src=(y*w+x)*4,hi=(y*2*w+x)*4,lo=hi+w*4;
      for(let c=0;c<3;c++){image.data[hi+c]=pixels[src+c]>>>8;image.data[lo+c]=pixels[src+c]&255;}
      image.data[hi+3]=image.data[lo+3]=255;
    }
    ctx.putImageData(image,0,0);return canvas;
  }finally{
    scene.environment=previous;hidden.forEach((o,i)=>{o.visible=visible[i];});
    for(const [material,value] of emitters){
      if(material.emissive)material.emissiveIntensity=value;
      else material.color.copy(value);
    }
    atlas?.dispose();cube.dispose();filter.dispose();
  }
}
