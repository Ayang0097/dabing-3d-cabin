/* Indoor branch signs. */
window.CabinBranchBadges = (() => {
  const {T, canvas, cylinder, group, mat, mesh, seeded, stick} = HouseKit;
  const lettering = '"Kaiti SC","STKaiti","Songti SC",serif';

  function paintFuzhouBadge() {
    return canvas(512,512,(ctx,w,h)=>{
      const mid=w/2,rand=seeded(891);
      const ring=(radius,color,weight)=>{
        ctx.beginPath();
        ctx.arc(mid,mid,radius,0,Math.PI*2);
        ctx.strokeStyle=color;
        ctx.lineWidth=weight;
        ctx.stroke();
      };
      const write=(label,y,size,color)=>{
        ctx.font='bold '+size+'px '+lettering;
        ctx.fillStyle=color;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(label,mid,y);
      };
      ctx.save();
      ctx.beginPath();
      ctx.arc(mid,mid,mid,0,Math.PI*2);
      ctx.clip();
      const base=ctx.createLinearGradient(75,12,w-34,h);
      base.addColorStop(0,'#f5e9cb');
      base.addColorStop(.55,'#e6d6b6');
      base.addColorStop(1,'#c6af88');
      ctx.fillStyle=base;
      ctx.fillRect(0,0,w,h);
      ring(243,'#35322b',5);
      ring(223,'#35322b',4);
      ctx.fillStyle='#252824';
      ctx.fillRect(0,181,w,115);
      write('大冰的小屋',244,74,'#f1e5cb');
      write('福 州',363,61,'#282923');
      // Tiny abrasions break up the enamel and the printed ink.
      for(let i=0;i<4200;i++){
        const x=rand()*w,y=rand()*h;
        ctx.fillStyle=i%3?'rgba(56,37,24,.063)':'rgba(255,249,231,.12)';
        ctx.fillRect(x,y,.7+rand()*1.8,.7+rand()*1.3);
      }
      ctx.restore();
    });
  }

  function mountBadge(parent,y,z,radius,texture,emission){
    const rim=cylinder(parent,0,y,z,radius,radius,.018,mat(0x39332a,{metalness:.42,roughness:.68}),48);
    rim.rotation.x=Math.PI/2;
    const faceMaterial=new T.MeshStandardMaterial({map:texture,emissive:0xffffff,
      emissiveMap:texture,emissiveIntensity:emission,roughness:.58});
    const face=mesh(parent,new T.CircleGeometry(radius-.004,48),faceMaterial,0,y,z+.0095);
    face.castShadow=false;
  }

  function fuzhouSign(room){
    const placement=group(room,6.872,2.03,3.45);
    const radius=.257;
    placement.name='福州分舵圆徽';
    placement.rotation.y=-Math.PI/2;
    const badge=paintFuzhouBadge();
    mountBadge(placement,0,.022,radius,badge,.25);
    const cord=mat(0x594433,{roughness:.98});
    for(const x of [-.117,.117]){
      stick(placement,[x,.217,.021],[0,.344,.017],.0055,cord,8);
    }
    const peg=cylinder(placement,0,.344,.013,.010,.011,.029,mat(0x4c3a28,{metalness:.34}),12);
    peg.rotation.x=Math.PI/2;
    return {
      city:'福州',item:placement.name,
      from:[4.20,3.49],look:[6.837,2.085,3.45],frame:[.53,.63],
      hits:[{size:[radius*2,radius*2,.055],center:[0,0,.024],parent:placement}],preview:badge.image
    };
  }

  return {makeFuzhou:fuzhouSign};
})();
