// Cloth-bound songbooks: printed spines share a single atlas in the room batch.
window.makeCabinBook=(()=>{
  const {T,canvas,group,box,mat,seeded}=HouseKit;
  const titles=['街巷笔记','山路来信','民谣采风录','木工手札','走过山塘','旧日的歌','西南行记','写给冬天','琴谱拾遗','窗前诗稿','往事小集','山河旧影'];
  const colors=['#687573','#946957','#717b58','#987e58','#58514b','#737988','#a89977','#8c5a53','#576e69','#8c876e','#6d5962','#4c565d'];
  const rand=seeded(1905),cell=76,h=278;
  const atlas=canvas(cell*titles.length,h,(c,w)=>{
    titles.forEach((title,i)=>{
      c.save();c.translate(i*cell,0);
      c.fillStyle=colors[i];c.fillRect(0,0,cell,h);
      for(let j=0;j<1300;j++){c.fillStyle=j%3?'rgba(224,215,178,.10)':'rgba(25,20,17,.11)';c.fillRect(rand()*cell,rand()*h,1+rand()*2,1);}
      c.fillStyle='#e1cfaa';c.textAlign='center';c.textBaseline='middle';c.font='bold 27px "Songti SC",serif';
      [...title].forEach((ch,k)=>c.fillText(ch,cell/2,50+k*27));
      c.fillRect(11,17,cell-22,1.4);c.fillRect(11,21,cell-22,.75);c.fillRect(14,224,cell-28,.9);
      c.font='12px serif';c.fillText(String(i+1).padStart(2,'0'),cell/2,244);
      c.fillStyle='rgba(40,34,25,.31)';c.fillRect(3,0,3,h);c.fillRect(cell-5,0,2,h);
      c.restore();
    });
  });
  const spines=new T.MeshStandardMaterial({map:atlas,roughness:.89});
  const leaf=canvas(256,96,(c,w,h)=>{
    c.fillStyle='#e7ddc3';c.fillRect(0,0,w,h);
    for(let j=0;j<w;j++){c.fillStyle='rgba(108,91,65,'+(rand()*.26)+')';c.fillRect(j,0,.75,h);}
  });
  const pages=new T.MeshStandardMaterial({map:leaf,roughness:.94});
  return function(parent,x,y,z,width,height,depth,id){
    const i=id%titles.length,g=group(parent,x,y,z),cloth=mat(colors[i],{roughness:.89});
    box(g,0,0,-.002,width-.004,height-.007,depth-.010,pages);
    for(const side of [-1,1])box(g,side*(width/2-.0015),0,0,.003,height,depth,cloth);
    box(g,0,0,depth/2-.002,width,.995*height,.004,cloth);
    const geo=new T.PlaneGeometry(width,height),uv=geo.attributes.uv;
    for(let k=0;k<uv.count;k++)uv.setX(k,(i+.006+.988*uv.getX(k))/titles.length);
    const spine=new T.Mesh(geo,spines);spine.receiveShadow=true;spine.position.z=depth/2+.0003;g.add(spine);
    return g;
  };
})();
