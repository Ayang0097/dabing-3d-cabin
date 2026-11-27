// Stage-up interior plan in the same (x,z) metres used by the room and its paths.
window.drawCabinPlan = function drawCabinPlan(ctx, room, compact) {
  const ink = '#715c43', wood = '#d3b089', paper = '#f2e6ca';
  const fine = compact ? .075 : .043;
  const captions=[],cushions=[];

  function block(x, z, width, depth, fill, line = ink) {
    ctx.fillStyle = fill;
    ctx.fillRect(x-width/2, z-depth/2, width, depth);
    if (line) {
      ctx.strokeStyle = line;
      ctx.lineWidth = fine;
      ctx.strokeRect(x-width/2, z-depth/2, width, depth);
    }
  }
  function line(points, tone, weight) {
    ctx.beginPath();
    for (let i=0; i<points.length; i++) {
      const [x,z] = points[i];
      if (i===0) ctx.moveTo(x,z);
      else ctx.lineTo(x,z);
    }
    ctx.strokeStyle = tone;
    ctx.lineWidth = weight;
    ctx.stroke();
  }
  function disk(x, z, r, tone, stroke) {
    ctx.beginPath();
    ctx.arc(x, z, r, 0, Math.PI*2);
    ctx.fillStyle = tone;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = fine;
      ctx.stroke();
    }
  }
  function label(text, x, z, size, tone, halo) {
    ctx.font = '600 '+size+'px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (halo) {
      ctx.strokeStyle = halo;
      ctx.lineWidth = .12;
      ctx.strokeText(text,x,z);
    }
    ctx.fillStyle = tone;
    ctx.fillText(text,x,z);
    if(!compact)captions.push({x,z,rx:ctx.measureText(text).width/2,rz:size*.55});
  }

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  block(0,-.04,13.9,11.24,'#f7ecd5',null);

  // Fixed furniture footprints in room coordinates.
  block(-3.25,-3.85,5.20,3,'#71877b');
  line([[-5.82,-2.51],[-.68,-2.51]],'#c4d0ae',.06);
  block(4.05,-2.55,5.14,1.06,wood);
  block(4.07,-5.25,4.95,.39,'#c1a887');
  block(-5.70,.30,.76,1.72,wood);
  block(-5.14,4.10,3.18,2.62,'#dfc4a1');
  line([[-6.73,3.35],[-3.55,3.35]],'#b59370',fine);
  line([[-6.73,3.82],[-3.55,3.82]],'#b59370',fine);
  block(-5.04,4.16,2.11,.75,wood);
  block(-5.25,5.15,2.5,.31,'#be9a72');
  block(4.42,1.32,1.98,.85,wood);
  for(const table of room.listeningTables)block(table.x,table.z,table.w,table.d,wood);
  const bench=room.listeningBench;
  for (const {radius,depth} of bench?.tiers ?? []) {
    const start=Math.PI/2-bench.end, end=Math.PI/2-bench.start;
    ctx.beginPath();
    ctx.arc(bench.x,bench.z,radius+depth/2,start,end);
    ctx.arc(bench.x,bench.z,radius-depth/2,end,start,true);
    ctx.closePath();
    ctx.fillStyle = '#d1af8b';
    ctx.fill();
    ctx.strokeStyle = '#aa8867';
    ctx.lineWidth = fine;
    ctx.stroke();
  }
  const [hearthX,,hearthZ]=room.fixtures.hearthEmbers;
  disk(hearthX,hearthZ,.78,'#b29774',ink);
  disk(hearthX,hearthZ,.50,'#ab6b47');
  block(5.61,4.57,2.30,1.86,'#e0e2c4',null);
  for (const [x,z,r] of [[6.15,3.93,.23],[6.38,4.95,.27],[5.40,5.03,.17],[6.17,4.48,.14]]) {
    disk(x,z,r,'#86936c','#6a785c');
  }

  if (!compact) {
    block(-2.97,5.32,1.57,.19,'#b89a77');
    block(2.84,4.97,.84,.58,'#ddcbb1');
    block(-5.26,-3.15,.76,.37,'#65766d');
    block(-1.14,-3.0,.64,.35,'#65766d');
    for (const [x,z,r] of [[-2.39,-4.07,.17],[-1.97,-4.09,.16],[-2.67,-4.33,.21],[-1.67,-4.63,.23]]) {
      disk(x,z,r,'#8a9a8c','#62746b');
    }
    line([[1.70,-1.86],[6.41,-1.86]],'#ab875f',.045);
  }

  for (const bench of room.benches ?? []) {
    ctx.save();
    ctx.translate(bench.x,bench.z);
    ctx.rotate(-bench.yaw);
    block(0,0,bench.length,bench.depth,bench.floorMat ? '#a88d73' : '#bd956d',bench.floorMat ? null : ink);
    ctx.restore();
  }
  for (const seat of room.seats) {
    ctx.save();
    ctx.translate(seat.x,seat.z);
    ctx.rotate(-seat.yaw);
    if (seat.padSize) {
      const [width,depth]=seat.padSize;
      // The plan preserves the space between adjacent cushions, even when
      // the available canvas is only a few pixels wider than a seat row.
      if (seat.roundPad) {
        disk(0,0,width/2,'#f0d8b8');
      } else {
        block(0,0,width,depth,'#edcfaa',null);
      }
      if (!compact) {
        const cos=Math.abs(Math.cos(seat.yaw)),sin=Math.abs(Math.sin(seat.yaw));
        const rx=seat.roundPad?width/2:(cos*width+sin*depth)/2;
        const rz=seat.roundPad?depth/2:(sin*width+cos*depth)/2;
        cushions.push({x:seat.x,z:seat.z,rx,rz});
      }
    } else if (seat.stool) {
      disk(0,0,seat.pickSize ? .17 : .21,'#d5b891',ink);
    } else if (seat.backrest) {
      block(0,0,.49,.45,'#d0b58e');
      line([[-.24,-.24],[.24,-.24]],ink,compact ? .095 : .068);
    } else {
      block(0,0,.62,.365,'#dfc4a0');
    }
    ctx.restore();
  }
  // Continuous perimeter, with the main entrance between the door jambs.
  line([[-1.91,5.58],[-6.97,5.58],[-6.97,-5.68],[6.97,-5.68],[6.97,5.58],[1.91,5.58]],ink,compact ? .23 : .145);
  block(0,5.94,3.82,.56,'#dfcba9',null);
  line([[-1.91,6.22],[1.91,6.22]],'#b0936c',fine);
  if (!compact) {
    for (const side of [-1,1]) {
      const x = side*1.91;
      line([[x,5.55],[x-side*1.29,6.42]],'#aa8962',.058);
    }
    // The two leaves of the reading window share a single opening.
    line([[-6.97,2.34],[-6.97,4.90]],paper,.106);
    line([[-6.875,2.34],[-6.875,4.90]],ink,.034);
  }

  label('舞台',-3.44,-3.89,compact ? 1.04 : .61,'#fff4d9');
  label('吧台',4.1,-2.52,compact ? .91 : .57,'#493e30');
  if (!compact) {
    label('火塘',hearthX,hearthZ,.43,'#493421','#efce9e');
    label('阅读角',-4.78,4.17,.43,'#514c38', '#e2c99f');
    label('阳台',5.3,3.88,.45,'#576548','#e0e2c4');
  }
  ctx.restore();
  return {captions,cushions};
};
