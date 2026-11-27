/* Reusable shapes and painted surfaces for the little folk house. Units are metres. */
window.HouseKit = (() => {
  const T = THREE;
  const cube = new T.BoxGeometry(1,1,1);
  const ball = new T.SphereGeometry(1,16,10);
  const smallBall = new T.SphereGeometry(1,10,6);
  const materials = new Map(), geometries = new Map();
  const mat = (color, props = {}) => {
    const key = color + JSON.stringify(props);
    if (!materials.has(key)) materials.set(key,new T.MeshStandardMaterial({color,roughness:.79,...props}));
    return materials.get(key);
  };
  function seeded(seed=73678) { return () => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296); }
  function canvas(w,h,paint,repeat=false) {
    const c=document.createElement('canvas'); c.width=w;c.height=h;paint(c.getContext('2d'),w,h);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;
    if(repeat) t.wrapS=t.wrapT=T.RepeatWrapping;
    return t;
  }
  function group(parent,x=0,y=0,z=0) {const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g;}
  function mesh(p,geo,m,x,y,z,w=1,h=1,d=1) {
    const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;
  }
  const box=(p,x,y,z,w,h,d,m)=>mesh(p,cube,m,x,y,z,w,h,d);
  const ell=(p,x,y,z,w,h,d,m)=>mesh(p,Math.max(w,h,d)<=.035?smallBall:ball,m,x,y,z,w,h,d);
  function cylinder(p,x,y,z,top,base,h,m,n=16) {
    const key=[top,base,h,n].join('/');if(!geometries.has(key))geometries.set(key,new T.CylinderGeometry(top,base,h,n));
    return mesh(p,geometries.get(key),m,x,y,z);
  }
  function stick(p,a,b,r,m,n=9) {
    const A=new T.Vector3(...a), B=new T.Vector3(...b),delta=B.clone().sub(A);
    const o=cylinder(p,0,0,0,r,r,1,m,n);
    o.position.copy(A.add(B).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());o.scale.y=delta.length();return o;
  }
  function panel(p,x,y,z,w,h,texture,emission=0) {
    const m=new T.MeshStandardMaterial({map:texture,roughness:.92,emissive:emission?0xffffff:0x000000,emissiveMap:emission?texture:null,emissiveIntensity:emission});
    const o=new T.Mesh(new T.PlaneGeometry(w,h),m);o.receiveShadow=true;o.position.set(x,y,z);p.add(o);return o;
  }
  function rounded(p,x,y,z,w,h,d,r,m) {
    const key=['round',w,h,d,r].join('/');
    if(!geometries.has(key)){
      const s=new T.Shape(), a=w/2-r,b=h/2-r,q=Math.min(r*.65,d*.2),zDepth=d-2*q;
      s.moveTo(-a,-h/2);s.lineTo(a,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-b);s.lineTo(w/2,b);s.quadraticCurveTo(w/2,h/2,a,h/2);s.lineTo(-a,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,b);s.lineTo(-w/2,-b);s.quadraticCurveTo(-w/2,-h/2,-a,-h/2);
      const g=new T.ExtrudeGeometry(s,{depth:zDepth,bevelEnabled:true,bevelSegments:r<=.009?2:3,steps:1,bevelSize:q,bevelThickness:q,curveSegments:r<=.009?2:5});g.translate(0,0,-zDepth/2);geometries.set(key,g);
    }
    return mesh(p,geometries.get(key),m,x,y,z);
  }
  const shadowTex=canvas(96,96,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,2,w/2,h/2,w/2);g.addColorStop(0,'rgba(15,11,9,.7)');g.addColorStop(.5,'rgba(15,11,9,.35)');g.addColorStop(1,'rgba(15,11,9,0)');c.fillStyle=g;c.fillRect(0,0,w,h)});
  const shadowMat=new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false});
  function shadow(p,x,z,w,d,y=.012){const o=new T.Mesh(new T.PlaneGeometry(w,d),shadowMat);o.rotation.x=-Math.PI/2;o.position.set(x,y,z);o.renderOrder=1;p.add(o);return o;}
  // Static stage dressing can share draw calls without sharing coordinates or texture UVs.
  function batch(root) {
    root.updateMatrixWorld(true);const buckets=new Map(),inv=new T.Matrix4().copy(root.matrixWorld).invert();
    root.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&!o.material.transparent&&!o.userData.dynamic){
      const k=[o.material.uuid,o.castShadow,o.receiveShadow].join(':');if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(o);
    }});
    for(const objects of buckets.values()){
      if(objects.length<3)continue;
      const geo=new T.BufferGeometry(), transform=new T.Matrix4();
      const vertices=objects.reduce((sum,o)=>sum+o.geometry.attributes.position.count,0);
      const indexed=objects.some(o=>o.geometry.index);
      let indices;
      if(indexed){
        const count=objects.reduce((sum,o)=>sum+(o.geometry.index?.count??o.geometry.attributes.position.count),0);
        indices=vertices>=65535?new Uint32Array(count):new Uint16Array(count);
        geo.setIndex(new T.BufferAttribute(indices,1));
      }
      for(const [name,width] of [['position',3],['normal',3],['uv',2],['color',3]]){
        if(objects.every(o=>o.geometry.hasAttribute(name))){
          geo.setAttribute(name,new T.BufferAttribute(new Float32Array(vertices*width),width));
        }
      }
      let vertex=0,element=0;
      const normalMatrix=new T.Matrix3();
      for(const o of objects){
        const src=o.geometry,count=src.attributes.position.count;
        transform.multiplyMatrices(inv,o.matrixWorld);
        normalMatrix.getNormalMatrix(transform);
        for(const [name,dst] of Object.entries(geo.attributes)){
          // Transform a view of the final buffer. The source may also be used by other meshes.
          const offset=vertex*dst.itemSize, end=offset+count*dst.itemSize;
          const slice=dst.array.subarray(offset,end);
          slice.set(src.attributes[name].array);
          if(name==='position')new T.BufferAttribute(slice,3).applyMatrix4(transform);
          if(name==='normal')new T.BufferAttribute(slice,3).applyNormalMatrix(normalMatrix);
        }
        if(indexed){
          const old=src.index?.array, length=old?old.length:count;
          for(let i=0;i<length;i++)indices[element++]=vertex+(old?old[i]:i);
        }
        vertex+=count;o.removeFromParent();
      }
      geo.computeBoundingBox();
      const o=new T.Mesh(geo,objects[0].material);o.castShadow=objects[0].castShadow;o.receiveShadow=objects[0].receiveShadow;root.add(o);
    }
  }
  return {T,mat,seeded,canvas,group,mesh,box,ell,cylinder,stick,panel,rounded,shadow,batch};
})();
