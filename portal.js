/* Wall-mounted tree hollow. The illuminated passage and its inscription are separate targets. */
window.makeCabinPortal=function(room){
  const {T,canvas,group,mesh}=HouseKit;
  const door=group(room,.42,1.08,-5.597);
  door.name='传送门';
  door.visible=false;
  const width=1.94,height=1.84;
  const opening=new T.Vector2(.521,.467);
  const openingRadii=new T.Vector2(.224,.228);
  const plaqueSource=new T.Vector2(.564,.763);
  const point=(u,v,z)=>[(u-.5)*width,(v-.5)*height,z];

  const geometry=new T.PlaneGeometry(width,height,28,28);
  const positions=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<positions.count;i++){
    const x=(uv.getX(i)-opening.x)/openingRadii.x;
    const y=(uv.getY(i)-opening.y)/openingRadii.y;
    const distance=Math.hypot(x,y);
    // The rim has shallow relief, and the outer roots flatten against the wall.
    const bark=Math.exp(-((distance-1.21)**2)/.235);
    positions.setZ(i,.010+.076*bark);
  }

  const tree=new T.Texture();
  tree.colorSpace=T.SRGBColorSpace;
  tree.anisotropy=4;
  const surface=new T.ShaderMaterial({
    transparent:true,
    depthWrite:false,
    toneMapped:false,
    uniforms:{
      tree:{value:tree},time:{value:0},opening:{value:opening},
      radii:{value:openingRadii},plaqueSource:{value:plaqueSource}
    },
    vertexShader:`
      varying vec2 texCoord;
      varying vec2 viewOffset;
      void main(){
        texCoord=uv;
        vec3 center=(modelMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
        viewOffset=normalize(cameraPosition-center).xy;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader:`
      uniform sampler2D tree;
      uniform float time;
      uniform vec2 opening;
      uniform vec2 radii;
      uniform vec2 plaqueSource;
      varying vec2 texCoord;
      varying vec2 viewOffset;

      float mote(vec2 p,vec2 center){
        vec2 delta=p-center;
        return exp(-dot(delta,delta)*135000.0);
      }

      float driftingMote(vec2 p,float phaseOffset,float height){
        float phase=fract(time*.064+phaseOffset);
        vec2 center=vec2(.405+.236*phase,height+.012*sin(phase*5.0+phaseOffset));
        float fade=smoothstep(.04,.24,phase)*(1.0-smoothstep(.68,.96,phase));
        return mote(p,center)*fade;
      }

      void main(){
        float apertureDistance=length((texCoord-opening)/radii);
        float depth=1.0-smoothstep(.24,.99,apertureDistance);
        vec2 parallax=-viewOffset*.024*depth;
        vec2 shimmer=.0019*depth*vec2(sin(time*.43+texCoord.y*17.0),
                                      cos(time*.34+texCoord.x*14.0));
        vec2 plaqueOffset=texCoord-vec2(opening.x,plaqueSource.y);
        // Recenter the carved panel, tapering the shift into the nearby bark.
        float plaqueShift=(1.0-smoothstep(.186,.254,abs(plaqueOffset.x)))*
                          smoothstep(.656,.705,texCoord.y)*
                          (1.0-smoothstep(.822,.878,texCoord.y));
        vec2 barkUV=texCoord+vec2((plaqueSource.x-opening.x)*plaqueShift,0.0);
        vec4 bark=texture2D(tree,barkUV);
        // Reverse the passage within the dark lip.
        vec2 passageUV=texCoord+parallax+shimmer;
        passageUV.x=2.0*opening.x-passageUV.x;
        vec3 passage=texture2D(tree,passageUV).rgb;
        float recessed=1.0-smoothstep(.80,1.055,apertureDistance);

        vec2 rootPosition=(texCoord-vec2(.514,.492))/vec2(.485,.500);
        float grain=.019*sin(texCoord.x*43.0+texCoord.y*26.0)+
                    .014*sin(texCoord.y*57.0-texCoord.x*22.0);
        float engraving=(1.0-smoothstep(.15,.22,abs(plaqueOffset.x)))*
                         (1.0-smoothstep(.043,.087,abs(plaqueOffset.y)));
        float wallBlend=smoothstep(.63,1.03,length(rootPosition)+grain)*(1.0-engraving*.94);
        float alpha=smoothstep(.19,.92,bark.a)*(1.0-.94*wallBlend);
        if(alpha<.004)discard;

        float exposedBark=smoothstep(.94,1.18,apertureDistance)*(1.0-.83*engraving);
        vec3 barkColor=bark.rgb*mix(vec3(1.0),vec3(.84,.79,.75),exposedBark);
        vec2 wick=(texCoord-vec2(.586,.464))*vec2(6.7,5.1);
        float light=exp(-dot(wick,wick))*depth;
        float pulse=.058*sin(time*.81)+.021*sin(time*1.56+.7);
        vec3 color=mix(barkColor,passage*(1.0+pulse*light),recessed);
        vec2 dust=texCoord+parallax;
        float sparks=driftingMote(dust,.18,.524)+.76*driftingMote(dust,.57,.576)+
                     .55*driftingMote(dust,.84,.420);
        color+=vec3(.57,.26,.060)*sparks*depth;
        gl_FragColor=vec4(color,alpha);
        #include <colorspace_fragment>
      }
    `
  });

  const softShadow=canvas(128,128,()=>{});
  const shadow=mesh(door,new T.PlaneGeometry(width*1.025,height*1.025),new T.MeshBasicMaterial({
    map:softShadow,transparent:true,opacity:.32,depthWrite:false,toneMapped:false
  }),.013,-.018,.005);
  shadow.castShadow=shadow.receiveShadow=false;

  const face=mesh(door,geometry,surface,0,0,0);
  face.castShadow=face.receiveShadow=false;
  face.renderOrder=shadow.renderOrder+1;

  const preview=document.createElement('canvas');
  preview.width=576;preview.height=222;
  const filename='portal-tree-rim.webp';
  new T.ImageLoader().load(window.CabinSurfaceImages?.[filename]||'textures/'+filename,image=>{
    tree.image=image;
    tree.needsUpdate=true;
    const mask=softShadow.image.getContext('2d');
    mask.filter='blur(4px)';
    mask.drawImage(image,0,0,128,128);
    mask.filter='none';
    const wallFalloff=mask.createRadialGradient(65,65,34,65,65,65);
    wallFalloff.addColorStop(0,'#000');
    wallFalloff.addColorStop(.58,'rgba(0,0,0,.55)');
    wallFalloff.addColorStop(1,'rgba(0,0,0,0)');
    mask.globalCompositeOperation='destination-in';
    mask.fillStyle=wallFalloff;
    mask.fillRect(0,0,128,128);
    mask.globalCompositeOperation='source-in';
    mask.fillStyle='#22160e';
    mask.fillRect(0,0,128,128);
    softShadow.needsUpdate=true;

    const ctx=preview.getContext('2d'),side=image.width;
    ctx.fillStyle='#39271b';
    ctx.fillRect(0,0,preview.width,preview.height);
    ctx.drawImage(image,side*.362,side*.158,side*.395,side*.153,0,0,preview.width,preview.height);
    door.visible=true;
  });

  const plaqueCenter=point(opening.x,plaqueSource.y,.126);
  const badge={
    city:'成都玉林',mapLabel:'玉林',item:'且曼学院题字',
    from:[door.position.x,-3.78],
    look:plaqueCenter.map((value,axis)=>value+door.position.getComponent(axis)),
    frame:[.73,.28],preview,
    hits:[{size:[.69,.22,.046],center:plaqueCenter,parent:door}]
  };
  const hitRadii=[width*.208,height*.215];
  const hit={parent:door,size:[hitRadii[0]*2,hitRadii[1]*2,0],center:point(opening.x,opening.y,.118),
    geometry:new T.CircleGeometry(1,64).scale(...hitRadii,1)};
  return {badge,hit,update:time=>{surface.uniforms.time.value=time;}};
};
