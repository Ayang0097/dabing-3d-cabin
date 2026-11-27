/* CC0 scans: Slate Driveway (Dimitrios Savva) and Rough Linen, Poly Haven.
   https://polyhaven.com/a/slate_driveway   https://polyhaven.com/a/rough_linen */
window.CabinPropMaterials = (() => {
  const texture=CabinSurfaces.texture;
  function slate(w,h){
    const u=w/2.09,v=h/2.09;
    const arm=texture('prop-slate-arm.webp',false,u,v);
    return new THREE.MeshStandardMaterial({color:0xc9d4db,map:texture('prop-slate-color.webp',true,u,v),
      roughness:.94,roughnessMap:arm,aoMap:arm,aoMapIntensity:.54,
      normalMap:texture('prop-slate-normal.webp',false,u,v),normalScale:new THREE.Vector2(.81,.81)});
  }
  function linen(mat,u,v,strength=.30){
    mat.normalMap=texture('linen-normal.webp',false,u,v);mat.normalScale=new THREE.Vector2(strength,strength);
    mat.roughness=.96;return mat;
  }
  function undyedLinen(u,v){
    return linen(new THREE.MeshStandardMaterial({color:0xe6e1d3,map:texture('linen-color.webp',true,u,v)}),u,v,.43);
  }
  return {slate,linen,undyedLinen};
})();
